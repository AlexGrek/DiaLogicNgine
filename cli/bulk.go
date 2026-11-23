package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/textproto"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
)

const workers = 4

var mimeByExt = map[string]string{
	".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
	".webp": "image/webp", ".gif": "image/gif", ".svg": "image/svg+xml",
}

// each runs fn over items with a small worker pool and joins all failures.
func each[T any](items []T, fn func(T) error) error {
	var (
		mu   sync.Mutex
		errs []error
		wg   sync.WaitGroup
		ch   = make(chan T)
	)
	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for it := range ch {
				if err := fn(it); err != nil {
					mu.Lock()
					errs = append(errs, err)
					mu.Unlock()
				}
			}
		}()
	}
	for _, it := range items {
		ch <- it
	}
	close(ch)
	wg.Wait()
	return errors.Join(errs...)
}

// ── game.json ───────────────────────────────────────────────────────────────

func gameGet(r *rest, project string, compact bool) ([]byte, error) {
	data, err := r.bytes("GET", projectPath(project)+"/game")
	if err != nil {
		return nil, err
	}
	if compact {
		return data, nil
	}
	var buf bytes.Buffer
	if err := json.Indent(&buf, data, "", "  "); err != nil {
		return nil, fmt.Errorf("server returned invalid JSON: %w", err)
	}
	buf.WriteByte('\n')
	return buf.Bytes(), nil
}

// gamePut validates and minifies the JSON (the editor saves it compact) and
// replaces the whole remote game.
func gamePut(r *rest, project string, data []byte) error {
	var g map[string]any
	if err := json.Unmarshal(data, &g); err != nil {
		return fmt.Errorf("not a JSON object: %w", err)
	}
	if v, _ := g["engineVersion"].(string); v == "" {
		return errors.New(`refusing to upload: no "engineVersion" (the loader rejects such a file)`)
	}
	var buf bytes.Buffer
	if err := json.Compact(&buf, data); err != nil {
		return err
	}
	resp, err := r.do("PUT", projectPath(project)+"/game", &buf, "application/json")
	if err != nil {
		return err
	}
	resp.Body.Close()
	return nil
}

// ── images ──────────────────────────────────────────────────────────────────

func assetList(r *rest, project string) ([]string, error) {
	data, err := r.bytes("GET", projectPath(project)+"/images")
	if err != nil {
		return nil, err
	}
	var out struct {
		Images []string `json:"images"`
	}
	if err := json.Unmarshal(data, &out); err != nil {
		return nil, err
	}
	return out.Images, nil
}

func assetGet(r *rest, project, name, dir string) (int, error) {
	if !validFilename(name) {
		return 0, fmt.Errorf("skipping unsafe remote filename %q", name)
	}
	data, err := r.bytes("GET", imagePath(project, name))
	if err != nil {
		return 0, fmt.Errorf("%s: %w", name, err)
	}
	return len(data), writeAtomic(filepath.Join(dir, name), data)
}

func writeAtomic(path string, data []byte) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	tmp := path + ".part"
	if err := os.WriteFile(tmp, data, 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, path)
}

func assetPut(r *rest, project, file, as string) error {
	data, err := os.ReadFile(file)
	if err != nil {
		return err
	}
	if as == "" {
		as = filepath.Base(file)
	}
	return assetPutBytes(r, project, as, data)
}

func assetPutBytes(r *rest, project, as string, data []byte) error {
	if !validFilename(as) {
		return fmt.Errorf("bad remote filename %q", as)
	}
	ctype := mimeByExt[strings.ToLower(filepath.Ext(as))]
	if ctype == "" {
		return fmt.Errorf("%s: unsupported extension (png, jpg, webp, gif, svg)", as)
	}
	var body bytes.Buffer
	mw := multipart.NewWriter(&body)
	h := textproto.MIMEHeader{}
	h.Set("Content-Disposition", fmt.Sprintf(`form-data; name="file"; filename=%q`, as))
	h.Set("Content-Type", ctype)
	part, err := mw.CreatePart(h)
	if err != nil {
		return err
	}
	part.Write(data)
	mw.Close()
	resp, err := r.do("PUT", imagePath(project, as), &body, mw.FormDataContentType())
	if err != nil {
		return fmt.Errorf("%s: %w", as, err)
	}
	io.Copy(io.Discard, resp.Body)
	resp.Body.Close()
	return nil
}

func assetDelete(r *rest, project, name string) error {
	resp, err := r.do("DELETE", imagePath(project, name), nil, "")
	if err != nil {
		return fmt.Errorf("%s: %w", name, err)
	}
	resp.Body.Close()
	return nil
}

func assetsPull(r *rest, project, dir string, names []string) error {
	if len(names) == 0 {
		var err error
		if names, err = assetList(r, project); err != nil {
			return err
		}
	}
	var mu sync.Mutex
	total := 0
	err := each(names, func(n string) error {
		size, err := assetGet(r, project, n, dir)
		mu.Lock()
		total += size
		mu.Unlock()
		return err
	})
	fmt.Fprintf(os.Stderr, "downloaded %d image(s), %d bytes → %s\n", len(names), total, dir)
	return err
}

// localImages returns the regular files of dir (one level) with a known image extension.
func localImages(dir string) ([]string, error) {
	ents, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}
	var out []string
	for _, e := range ents {
		if e.Type().IsRegular() && mimeByExt[strings.ToLower(filepath.Ext(e.Name()))] != "" && validFilename(e.Name()) {
			out = append(out, filepath.Join(dir, e.Name()))
		}
	}
	sort.Strings(out)
	return out, nil
}

func assetsPush(r *rest, project string, files []string, prune bool, keepDir string) error {
	err := each(files, func(f string) error { return assetPut(r, project, f, "") })
	if err != nil {
		return err // nothing is pruned after a failed upload
	}
	fmt.Fprintf(os.Stderr, "uploaded %d image(s)\n", len(files))
	if !prune {
		return nil
	}
	remote, err := assetList(r, project)
	if err != nil {
		return err
	}
	keep := map[string]bool{}
	for _, f := range files {
		keep[filepath.Base(f)] = true
	}
	var stale []string
	for _, n := range remote {
		if !keep[n] {
			stale = append(stale, n)
		}
	}
	err = each(stale, func(n string) error { return assetDelete(r, project, n) })
	fmt.Fprintf(os.Stderr, "pruned %d remote image(s) not in %s\n", len(stale), keepDir)
	return err
}

// ── whole project ───────────────────────────────────────────────────────────

func pull(r *rest, project, dir string, game, images bool) error {
	if game {
		data, err := gameGet(r, project, false)
		if err != nil {
			return err
		}
		if err := writeAtomic(filepath.Join(dir, "game.json"), data); err != nil {
			return err
		}
		fmt.Fprintf(os.Stderr, "wrote %s (%d bytes)\n", filepath.Join(dir, "game.json"), len(data))
	}
	if images {
		return assetsPull(r, project, filepath.Join(dir, "images"), nil)
	}
	return nil
}

func push(r *rest, project, dir string, game, images, prune bool) error {
	if game {
		data, err := os.ReadFile(filepath.Join(dir, "game.json"))
		if err != nil {
			return err
		}
		if err := gamePut(r, project, data); err != nil {
			return err
		}
		fmt.Fprintf(os.Stderr, "uploaded game.json (%d bytes)\n", len(data))
	}
	if images {
		imgDir := filepath.Join(dir, "images")
		files, err := localImages(imgDir)
		if err != nil {
			return err
		}
		return assetsPush(r, project, files, prune, imgDir)
	}
	return nil
}

// clone copies game.json and every image of src into the new project dst
// (owned by the logged-in account). It refuses an existing dst unless force.
func clone(r *rest, src, dst string, force bool, title string) error {
	if src == dst {
		return errors.New("source and destination are the same project")
	}
	if !force {
		_, err := r.bytes("GET", projectPath(dst)+"/game")
		var se *statusError
		switch {
		case err == nil:
			return fmt.Errorf("project %q already exists (use -force to overwrite it)", dst)
		case errors.As(err, &se) && se.Status == 404:
		default:
			return fmt.Errorf("cannot use %q as a destination: %w", dst, err)
		}
	}
	data, err := r.bytes("GET", projectPath(src)+"/game")
	if err != nil {
		return fmt.Errorf("source game: %w", err)
	}
	if title != "" {
		var g map[string]any
		if err := json.Unmarshal(data, &g); err != nil {
			return err
		}
		if gen, ok := g["general"].(map[string]any); ok {
			gen["name"] = title
		}
		if data, err = json.Marshal(g); err != nil {
			return err
		}
	}
	names, err := assetList(r, src)
	if err != nil {
		return err
	}
	err = each(names, func(n string) error {
		if !validFilename(n) {
			return fmt.Errorf("skipping unsafe remote filename %q", n)
		}
		img, err := r.bytes("GET", imagePath(src, n))
		if err != nil {
			return fmt.Errorf("%s: %w", n, err)
		}
		return assetPutBytes(r, dst, n, img)
	})
	if err != nil {
		return err // game.json is written last, so a failed clone leaves no half-playable game
	}
	if err := gamePut(r, dst, data); err != nil {
		return err
	}
	fmt.Fprintf(os.Stderr, "cloned %s → %s (game.json + %d image(s))\n", src, dst, len(names))
	return nil
}
