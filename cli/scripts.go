package main

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
)

// Script fields mirror .claude/skills/game_json/scripts/validate_game.py
// (SCRIPT_KEYS plus any key ending in "Script").
var scriptKeys = map[string]bool{
	"actionCode": true, "isVisible": true, "isEnabled": true, "useAlternativeWhen": true,
	"textProcessingCode": true, "body": true, "onComplete": true, "onFail": true, "onOpen": true, "value": true,
}

func isScriptKey(k string) bool { return scriptKeys[k] || strings.HasSuffix(k, "Script") }

const defaultParams = "rt, state, props, ch, facts, objectives, situation, items, context"

const manifestName = "scripts.json"

type scriptRef struct {
	Path    string // readable relative path without ".js", e.g. dialogs/main/windows/start/entryScript
	Pointer string // RFC 6901 pointer into game.json
	Src     string
	Params  string // parameter list for syntax checking
}

type manifestEntry struct {
	Pointer string `json:"pointer"`
	SHA     string `json:"sha256"` // of the script, trailing newlines ignored
	Params  string `json:"params,omitempty"`
}

type manifest struct {
	Project string                   `json:"project"`
	Files   map[string]manifestEntry `json:"files"` // keyed by "<path>.js"
}

func norm(s string) string { return strings.TrimRight(s, "\n") }

func sum(s string) string {
	h := sha256.Sum256([]byte(norm(s)))
	return hex.EncodeToString(h[:])
}

func escTok(s string) string { return strings.NewReplacer("~", "~0", "/", "~1").Replace(s) }

var safeName = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$`)

// elementNames picks a readable, unique, filename-safe name per array element
// (uid, id or name), falling back to the index when that is not possible.
func elementNames(arr []any) []string {
	names := make([]string, len(arr))
	seen := map[string]int{}
	for i, el := range arr {
		names[i] = strconv.Itoa(i)
		m, ok := el.(map[string]any)
		if !ok {
			continue
		}
		for _, k := range []string{"uid", "id", "name"} {
			if s, ok := m[k].(string); ok && safeName.MatchString(s) && !strings.HasSuffix(s, ".js") {
				names[i] = s
				break
			}
		}
		seen[names[i]]++
	}
	for i := range names { // duplicates → all fall back to the index
		if seen[names[i]] > 1 {
			names[i] = strconv.Itoa(i)
		}
	}
	return names
}

// collectScripts walks the game in document order.
func collectScripts(game any) []scriptRef {
	var out []scriptRef
	var walk func(v any, ptr, path string)
	walk = func(v any, ptr, path string) {
		switch x := v.(type) {
		case map[string]any:
			keys := make([]string, 0, len(x))
			for k := range x {
				keys = append(keys, k)
			}
			sort.Strings(keys)
			for _, k := range keys {
				child := x[k]
				p, pa := ptr+"/"+escTok(k), path+"/"+k
				if s, ok := child.(string); ok {
					if isScriptKey(k) && strings.TrimSpace(s) != "" && safeName.MatchString(k) {
						params := defaultParams
						if a, ok := x["args"].(string); ok && k == "body" {
							params = a
						}
						out = append(out, scriptRef{Path: strings.TrimPrefix(pa, "/"), Pointer: p, Src: s, Params: params})
					}
					continue
				}
				walk(child, p, pa)
			}
		case []any:
			names := elementNames(x)
			for i, el := range x {
				walk(el, ptr+"/"+strconv.Itoa(i), path+"/"+names[i])
			}
		}
	}
	walk(game, "", "")
	return out
}

func parseGame(data []byte) (any, error) {
	dec := json.NewDecoder(bytes.NewReader(data))
	dec.UseNumber() // keep numbers exactly as written
	var g any
	if err := dec.Decode(&g); err != nil {
		return nil, err
	}
	return g, nil
}

// encodeGame writes compact JSON without HTML escaping (scripts are full of < and >).
func encodeGame(g any) ([]byte, error) {
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false)
	if err := enc.Encode(g); err != nil {
		return nil, err
	}
	return bytes.TrimRight(buf.Bytes(), "\n"), nil
}

func ptrTokens(ptr string) []string {
	parts := strings.Split(strings.TrimPrefix(ptr, "/"), "/")
	for i, p := range parts {
		parts[i] = strings.NewReplacer("~1", "/", "~0", "~").Replace(p)
	}
	return parts
}

// ptrParent resolves everything but the last token.
func ptrParent(g any, ptr string) (parent any, last string, err error) {
	toks := ptrTokens(ptr)
	cur := g
	for _, t := range toks[:len(toks)-1] {
		switch c := cur.(type) {
		case map[string]any:
			cur = c[t]
		case []any:
			i, e := strconv.Atoi(t)
			if e != nil || i < 0 || i >= len(c) {
				return nil, "", fmt.Errorf("pointer %s: bad index %q", ptr, t)
			}
			cur = c[i]
		default:
			return nil, "", fmt.Errorf("pointer %s no longer resolves", ptr)
		}
	}
	return cur, toks[len(toks)-1], nil
}

func getScript(g any, ptr string) (string, bool) {
	p, last, err := ptrParent(g, ptr)
	if err != nil {
		return "", false
	}
	m, ok := p.(map[string]any)
	if !ok {
		return "", false
	}
	s, ok := m[last].(string)
	return s, ok
}

func setScript(g any, ptr, val string) error {
	p, last, err := ptrParent(g, ptr)
	if err != nil {
		return err
	}
	if !isScriptKey(last) {
		return fmt.Errorf("pointer %s is not a script field; refusing to write", ptr)
	}
	m, ok := p.(map[string]any)
	if !ok {
		return fmt.Errorf("pointer %s no longer resolves", ptr)
	}
	if _, ok := m[last].(string); !ok {
		return fmt.Errorf("pointer %s is no longer a script", ptr)
	}
	m[last] = val
	return nil
}

// syntaxCheck compiles the script as a function body with node. The wrapper
// shares line 1 with the script so reported line numbers match the .js file.
// Returns skipped=true when node is not installed.
func syntaxCheck(params, src string) (skipped bool, err error) {
	node, lerr := exec.LookPath("node")
	if lerr != nil {
		return true, nil
	}
	f, err := os.CreateTemp("", "dialogic-syntax-*.js")
	if err != nil {
		return false, err
	}
	defer os.Remove(f.Name())
	f.WriteString("(function(" + params + "){" + norm(src) + "\n})\n")
	f.Close()
	out, cerr := exec.Command(node, "--check", f.Name()).CombinedOutput()
	if cerr != nil {
		msg := string(out)
		names := []string{f.Name()}
		if real, e := filepath.EvalSymlinks(f.Name()); e == nil && real != f.Name() {
			names = []string{real, f.Name()} // macOS reports /private/var/... for /var/...; longest first
		}
		for _, n := range names {
			msg = strings.ReplaceAll(msg, n, "<script>")
		}
		var keep []string
		for _, l := range strings.Split(msg, "\n") {
			if strings.HasPrefix(l, "    at ") || strings.HasPrefix(l, "Node.js v") {
				continue // node's internal stack is noise
			}
			keep = append(keep, l)
		}
		return false, errors.New(strings.TrimSpace(strings.Join(keep, "\n")))
	}
	return false, nil
}

// ── commands' engines ───────────────────────────────────────────────────────

func scriptsDump(r *rest, project, dir string) (int, error) {
	data, err := gameGet(r, project, true)
	if err != nil {
		return 0, err
	}
	g, err := parseGame(data)
	if err != nil {
		return 0, err
	}
	refs := collectScripts(g)
	man := manifest{Project: project, Files: map[string]manifestEntry{}}
	for _, s := range refs {
		file := s.Path + ".js"
		body := s.Src
		if !strings.HasSuffix(body, "\n") {
			body += "\n"
		}
		if err := writeAtomic(filepath.Join(dir, filepath.FromSlash(file)), []byte(body)); err != nil {
			return 0, err
		}
		e := manifestEntry{Pointer: s.Pointer, SHA: sum(s.Src)}
		if s.Params != defaultParams {
			e.Params = s.Params
		}
		man.Files[file] = e
	}
	mb, _ := json.MarshalIndent(man, "", "  ")
	return len(refs), writeAtomic(filepath.Join(dir, manifestName), append(mb, '\n'))
}

func readManifest(dir string) (*manifest, error) {
	b, err := os.ReadFile(filepath.Join(dir, manifestName))
	if err != nil {
		return nil, fmt.Errorf("%w (run `dialogic scripts dump` first)", err)
	}
	var m manifest
	if err := json.Unmarshal(b, &m); err != nil {
		return nil, err
	}
	return &m, nil
}

type change struct {
	file, pointer, params, newSrc string
}

type plan struct {
	changed   []change
	conflicts []string
	missing   []string
	unchanged int
}

// makePlan compares the working files with the manifest and the live game.
func makePlan(man *manifest, dir string, game any, force bool) *plan {
	p := &plan{}
	files := make([]string, 0, len(man.Files))
	for f := range man.Files {
		files = append(files, f)
	}
	sort.Strings(files)
	for _, f := range files {
		e := man.Files[f]
		b, err := os.ReadFile(filepath.Join(dir, filepath.FromSlash(f)))
		if err != nil {
			p.missing = append(p.missing, f)
			continue
		}
		newSrc := norm(string(b))
		if sum(newSrc) == e.SHA {
			p.unchanged++
			continue
		}
		cur, ok := getScript(game, e.Pointer)
		switch {
		case !ok:
			p.conflicts = append(p.conflicts, f+" (script no longer exists remotely)")
		case norm(cur) == newSrc:
			p.unchanged++ // already applied remotely
		case sum(cur) != e.SHA && !force:
			p.conflicts = append(p.conflicts, f+" (changed remotely since the dump)")
		default:
			p.changed = append(p.changed, change{f, e.Pointer, e.Params, newSrc})
		}
	}
	return p
}

func loadPlan(r *rest, project, dir string, force bool) (*manifest, any, *plan, error) {
	man, err := readManifest(dir)
	if err != nil {
		return nil, nil, nil, err
	}
	if man.Project != "" && man.Project != project {
		return nil, nil, nil, fmt.Errorf("%s was dumped from project %q, not %q", dir, man.Project, project)
	}
	data, err := gameGet(r, project, true)
	if err != nil {
		return nil, nil, nil, err
	}
	g, err := parseGame(data)
	if err != nil {
		return nil, nil, nil, err
	}
	return man, g, makePlan(man, dir, g, force), nil
}

func scriptsStatus(r *rest, project, dir string) error {
	_, _, p, err := loadPlan(r, project, dir, false)
	if err != nil {
		return err
	}
	for _, c := range p.changed {
		fmt.Println("M ", c.file)
	}
	for _, c := range p.conflicts {
		fmt.Println("C ", c)
	}
	for _, m := range p.missing {
		fmt.Println("D ", m, "(file deleted locally — ignored)")
	}
	fmt.Fprintf(os.Stderr, "%d modified, %d conflicts, %d unchanged\n", len(p.changed), len(p.conflicts), p.unchanged)
	return nil
}

func scriptsPush(r *rest, project, dir string, force, dry, noCheck bool) error {
	man, g, p, err := loadPlan(r, project, dir, force)
	if err != nil {
		return err
	}
	if len(p.conflicts) > 0 {
		return fmt.Errorf("not pushing — conflicts (re-dump, merge, or pass -force to overwrite):\n  %s", strings.Join(p.conflicts, "\n  "))
	}
	if len(p.changed) == 0 {
		fmt.Fprintf(os.Stderr, "nothing to push (%d unchanged)\n", p.unchanged)
		return nil
	}
	if !noCheck {
		var bad []string
		skipped := false
		for _, c := range p.changed {
			params := c.params
			if params == "" {
				params = defaultParams
			}
			sk, err := syntaxCheck(params, c.newSrc)
			skipped = skipped || sk
			if err != nil {
				bad = append(bad, fmt.Sprintf("%s:\n%s", c.file, err))
			}
		}
		if len(bad) > 0 {
			return fmt.Errorf("syntax errors, nothing pushed (-no-check to skip):\n%s", strings.Join(bad, "\n"))
		}
		if skipped {
			fmt.Fprintln(os.Stderr, "note: node not found, syntax not checked")
		}
	}
	for _, c := range p.changed {
		fmt.Println("M ", c.file)
	}
	if dry {
		fmt.Fprintf(os.Stderr, "dry run: %d script(s) would be pushed\n", len(p.changed))
		return nil
	}
	for _, c := range p.changed {
		if err := setScript(g, c.pointer, c.newSrc); err != nil {
			return err
		}
	}
	data, err := encodeGame(g)
	if err != nil {
		return err
	}
	if err := gamePut(r, project, data); err != nil {
		return err
	}
	for _, c := range p.changed { // the working copy is now the baseline
		e := man.Files[c.file]
		e.SHA = sum(c.newSrc)
		man.Files[c.file] = e
	}
	mb, _ := json.MarshalIndent(man, "", "  ")
	if err := writeAtomic(filepath.Join(dir, manifestName), append(mb, '\n')); err != nil {
		return err
	}
	fmt.Fprintf(os.Stderr, "pushed %d script(s)\n", len(p.changed))
	return nil
}

func scriptsList(r *rest, project string) error {
	data, err := gameGet(r, project, true)
	if err != nil {
		return err
	}
	g, err := parseGame(data)
	if err != nil {
		return err
	}
	for _, s := range collectScripts(g) {
		fmt.Println(s.Path)
	}
	return nil
}

// scriptsSet patches one script, addressed by its `scripts list` path.
func scriptsSet(r *rest, project, path string, src []byte, noCheck bool) error {
	path = strings.TrimSuffix(strings.Trim(path, "/"), ".js")
	data, err := gameGet(r, project, true)
	if err != nil {
		return err
	}
	g, err := parseGame(data)
	if err != nil {
		return err
	}
	for _, s := range collectScripts(g) {
		if s.Path != path {
			continue
		}
		if !noCheck {
			if _, err := syntaxCheck(s.Params, string(src)); err != nil {
				return fmt.Errorf("syntax error, nothing pushed:\n%w", err)
			}
		}
		if err := setScript(g, s.Pointer, norm(string(src))); err != nil {
			return err
		}
		out, err := encodeGame(g)
		if err != nil {
			return err
		}
		if err := gamePut(r, project, out); err != nil {
			return err
		}
		fmt.Fprintf(os.Stderr, "patched %s\n", path)
		return nil
	}
	return fmt.Errorf("no script %q (see `dialogic scripts list %s`)", path, project)
}
