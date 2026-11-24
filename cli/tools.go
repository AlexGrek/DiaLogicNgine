package main

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

type kind int

const (
	kStr  kind = iota
	kText      // string; "@file" reads a file, "-" reads stdin
	kInt
	kBool
	kJSON // JSON value; inline, "@file" or "-"
)

type param struct {
	name string
	kind kind
	req  bool
	pos  bool // accepted as a positional argument (in table order)
	help string
}

// tool describes one MCP tool: same name, same parameters, as the server.
type tool struct {
	server string // "editor" | "play"
	name   string
	help   string
	params []param
	image  bool // has an include_image parameter (set by -image / -o)
	shows  bool // the result is an image (preview_image, view_image)
}

func req(name string, help string) param         { return param{name, kStr, true, true, help} }
func opt(name string, k kind, help string) param { return param{name, k, false, false, help} }

var tools = []tool{
	// ── editor (/mcp) ───────────────────────────────────────────────
	{server: "editor", name: "list_projects", help: "Games owned by this account, 10 per page", params: []param{opt("page", kInt, "1-based page")}},
	{server: "editor", name: "create_project", help: "Create a new empty game (never overwrites)", params: []param{req("project", "name, 1-64 chars"), opt("title", kStr, ""), opt("description", kStr, "")}},
	{server: "editor", name: "editor_planes", help: "Plane → field map"},
	{server: "editor", name: "browse_field", help: "Children, JSON Pointers and the field revision", params: []param{req("project", ""), req("plane", ""), req("field", ""), opt("path", kStr, "JSON Pointer"), opt("offset", kInt, ""), opt("limit", kInt, "1-50")}},
	{server: "editor", name: "read_fragment", help: "Read ≤12 KB at a pointer; page long strings with -text_offset", params: []param{req("project", ""), req("plane", ""), req("field", ""), opt("path", kStr, "JSON Pointer"), opt("text_offset", kInt, "")}},
	{server: "editor", name: "patch_field", help: "Atomic RFC 6902 batch (paths relative to the field root)", params: []param{req("project", ""), req("plane", ""), req("field", ""), req("revision", "from browse_field"), {"operations", kJSON, true, true, "JSON array, @file or - for stdin"}}},
	{server: "editor", name: "editor_help", help: "group = link | script | schema; omit topic for the list", params: []param{req("group", "link|script|schema"), {"topic", kStr, false, true, ""}}},
	{server: "editor", name: "list_images", help: "Project image filenames", params: []param{req("project", ""), opt("offset", kInt, ""), opt("limit", kInt, "1-50")}},
	{server: "editor", name: "preview_image", help: "Download a 256px thumbnail (-o FILE)", params: []param{req("project", ""), req("filename", "")}, shows: true},
	{server: "editor", name: "upload_image", help: "Upload or replace an image (≤8 MiB): upload_image PROJECT FILE [-as NAME]"}, // special-cased
	{server: "editor", name: "delete_image", help: "Remove an image and its thumbnail", params: []param{req("project", ""), req("filename", "")}},
	{server: "editor", name: "remove_background", help: "Cut the person out of an image into a new transparent WebP (character looks); prints the new reference", params: []param{req("project", ""), req("filename", ""), opt("model", kStr, "")}},

	// ── play (/play-mcp) ────────────────────────────────────────────
	{server: "play", name: "list_available_games", help: "Playable games (published + your own)", params: []param{opt("search", kStr, ""), opt("page", kInt, ""), opt("limit", kInt, "")}},
	{server: "play", name: "list_saved_games", help: "Games you have saved sessions for"},
	{server: "play", name: "list_recently_played", help: "Most recent sessions", params: []param{opt("limit", kInt, "")}},
	{server: "play", name: "start_game", help: "New session → session_code + opening scene", params: []param{req("project", ""), opt("title", kStr, "")}, image: true},
	{server: "play", name: "list_sessions", help: "Your saved sessions, newest first", params: []param{opt("project", kStr, ""), opt("offset", kInt, ""), opt("limit", kInt, "")}},
	{server: "play", name: "resume_session", help: "Continue a saved session", params: []param{req("session_code", "")}, image: true},
	{server: "play", name: "delete_session", help: "Delete a session and its checkpoints", params: []param{req("session_code", "")}},
	{server: "play", name: "save_checkpoint", help: "Named manual save", params: []param{req("session_code", ""), req("name", "")}},
	{server: "play", name: "list_checkpoints", help: "Named saves (+ previous autosave)", params: []param{req("session_code", "")}},
	{server: "play", name: "load_checkpoint", help: "Restore a checkpoint or -use_previous_autosave", params: []param{req("session_code", ""), opt("name", kStr, ""), opt("use_previous_autosave", kBool, "")}, image: true},
	{server: "play", name: "delete_checkpoint", help: "Delete a named save", params: []param{req("session_code", ""), req("name", "")}},
	{server: "play", name: "get_state", help: "Current scene without advancing", params: []param{req("session_code", "")}, image: true},
	{server: "play", name: "act", help: "One move: choose_link|continue|travel|click_zone|discuss|use_item", params: []param{req("session_code", ""), req("action", "choose_link|continue|travel|click_zone|discuss|use_item"), {"index", kInt, false, true, "link/route/zone index"}, opt("target_id", kStr, "location/zone/item/topic uid"), opt("topic_type", kStr, "char|fact|item|loc (discuss)")}, image: true},
	{server: "play", name: "inspect", help: "inventory|facts|people|places|objectives|history|summary", params: []param{req("session_code", ""), {"section", kStr, false, true, ""}}},
	{server: "play", name: "view_image", help: "Download a session image (-o FILE)", params: []param{req("session_code", ""), {"target", kStr, false, true, "scene|avatar|stage|item|route|pac_annotated"}, opt("target_id", kStr, "")}, shows: true},
	{server: "play", name: "debug_start_game", help: "Own games: start at any position with prepared state", params: []param{req("project", ""), opt("position", kJSON, `{"kind":"window","dialog":..,"window":..}`), opt("operations", kJSON, "RFC 6902 on raw State"), opt("script", kText, "JS body; @file or -"), opt("run_entry", kBool, "default true"), opt("title", kStr, "")}, image: true},
	{server: "play", name: "debug_read_state", help: "Own games: read raw State by JSON Pointer", params: []param{req("session_code", ""), {"path", kStr, false, true, "JSON Pointer, \"\" = all"}}},
	{server: "play", name: "debug_edit_state", help: "Own games: patch state / run script / teleport", params: []param{req("session_code", ""), opt("operations", kJSON, ""), opt("script", kText, ""), opt("position", kJSON, ""), opt("run_entry", kBool, "")}, image: true},
}

func findTool(server, name string) *tool {
	name = strings.ReplaceAll(name, "-", "_")
	for i := range tools {
		if tools[i].server == server && tools[i].name == name {
			return &tools[i]
		}
	}
	return nil
}

func (t *tool) usage() string {
	var b strings.Builder
	fmt.Fprintf(&b, "dialogic %s %s", t.server, t.name)
	if t.name == "upload_image" {
		b.WriteString(" PROJECT FILE [-as NAME]\n  " + t.help + "\n")
		return b.String()
	}
	for _, p := range t.params {
		switch {
		case p.pos && p.req:
			fmt.Fprintf(&b, " <%s>", p.name)
		case p.pos:
			fmt.Fprintf(&b, " [%s]", p.name)
		}
	}
	b.WriteString(" [flags]\n  " + t.help + "\n")
	for _, p := range t.params {
		label := "-" + p.name
		if p.pos {
			label = p.name + " (or -" + p.name + ")"
		}
		fmt.Fprintf(&b, "    %-28s %s\n", label, p.help)
	}
	if t.image {
		b.WriteString("    -image                 include the scene image (saved to -o FILE)\n")
	}
	if t.image || t.shows {
		b.WriteString("    -o FILE                where to write image output\n")
	}
	return b.String()
}

// ── argument parsing ────────────────────────────────────────────────────────

type parsed struct {
	pos   []string
	flags map[string]string
}

func normFlag(s string) string {
	return strings.ReplaceAll(strings.TrimLeft(s, "-"), "-", "_")
}

// parseArgs splits args into positionals and flags, interleaved. bools lists
// flags that take no value ("-image", or "-flag=false"). A lone "-" is a
// positional (stdin marker).
func parseArgs(args []string, bools map[string]bool, known map[string]bool) (*parsed, error) {
	p := &parsed{flags: map[string]string{}}
	for i := 0; i < len(args); i++ {
		a := args[i]
		if a == "--" {
			p.pos = append(p.pos, args[i+1:]...)
			break
		}
		if len(a) < 2 || a[0] != '-' {
			p.pos = append(p.pos, a)
			continue
		}
		name, val, hasVal := strings.Cut(a, "=")
		name = normFlag(name)
		if known != nil && !known[name] && name != "h" && name != "help" {
			return nil, fmt.Errorf("unknown flag -%s", name)
		}
		switch {
		case hasVal:
			p.flags[name] = val
		case bools[name] || name == "h" || name == "help":
			p.flags[name] = "true"
		case i+1 < len(args):
			i++
			p.flags[name] = args[i]
		default:
			return nil, fmt.Errorf("flag -%s needs a value", name)
		}
	}
	return p, nil
}

func readText(v string) (string, error) {
	switch {
	case v == "-":
		b, err := io.ReadAll(os.Stdin)
		return string(b), err
	case strings.HasPrefix(v, "@"):
		b, err := os.ReadFile(v[1:])
		return string(b), err
	}
	return v, nil
}

func convert(p param, v string) (any, error) {
	switch p.kind {
	case kInt:
		n, err := strconv.Atoi(v)
		if err != nil {
			return nil, fmt.Errorf("-%s: not an integer: %q", p.name, v)
		}
		return n, nil
	case kBool:
		b, err := strconv.ParseBool(v)
		if err != nil {
			return nil, fmt.Errorf("-%s: not a boolean: %q", p.name, v)
		}
		return b, nil
	case kText:
		return readText(v)
	case kJSON:
		s, err := readText(v)
		if err != nil {
			return nil, err
		}
		var j any
		if err := json.Unmarshal([]byte(s), &j); err != nil {
			return nil, fmt.Errorf("-%s: invalid JSON: %v", p.name, err)
		}
		return j, nil
	}
	return v, nil
}

// buildArgs maps parsed positionals/flags onto the tool's parameters.
func (t *tool) buildArgs(pa *parsed) (map[string]any, error) {
	args := map[string]any{}
	var positional []param
	for _, p := range t.params {
		if p.pos {
			positional = append(positional, p)
		}
	}
	if len(pa.pos) > len(positional) {
		return nil, fmt.Errorf("unexpected argument %q\n%s", pa.pos[len(positional)], t.usage())
	}
	set := func(p param, v string) error {
		x, err := convert(p, v)
		if err != nil {
			return err
		}
		args[p.name] = x
		return nil
	}
	for i, v := range pa.pos {
		if err := set(positional[i], v); err != nil {
			return nil, err
		}
	}
	for _, p := range t.params {
		if v, ok := pa.flags[p.name]; ok {
			if _, dup := args[p.name]; dup {
				return nil, fmt.Errorf("%s given twice", p.name)
			}
			if err := set(p, v); err != nil {
				return nil, err
			}
		}
		if _, ok := args[p.name]; !ok && p.req {
			return nil, fmt.Errorf("missing %s\n%s", p.name, t.usage())
		}
	}
	return args, nil
}

// ── running ─────────────────────────────────────────────────────────────────

func (t *tool) flagSet() (bools, known map[string]bool) {
	bools = map[string]bool{"raw": true}
	known = map[string]bool{"raw": true, "o": true, "server": true}
	for _, p := range t.params {
		known[p.name] = true
		if p.kind == kBool {
			bools[p.name] = true
		}
	}
	if t.image {
		bools["image"], known["image"] = true, true
	}
	if t.name == "upload_image" {
		known["as"] = true
	}
	return
}

func runTool(t *tool, rest []string) error {
	bools, known := t.flagSet()
	pa, err := parseArgs(rest, bools, known)
	if err != nil {
		return fmt.Errorf("%v\n%s", err, t.usage())
	}
	if _, h := pa.flags["h"]; h {
		fmt.Print(t.usage())
		return nil
	}
	if _, h := pa.flags["help"]; h {
		fmt.Print(t.usage())
		return nil
	}

	var args map[string]any
	if t.name == "upload_image" {
		if args, err = uploadArgs(pa); err != nil {
			return err
		}
	} else if args, err = t.buildArgs(pa); err != nil {
		return err
	}
	out := pa.flags["o"]
	if t.image {
		// CLI default is "no image": a terminal can't show it. -image or -o opts in.
		_, wantImg := pa.flags["image"]
		args["include_image"] = wantImg || out != ""
	}
	return invoke(t.server, t.name, args, out, pa.flags["raw"] == "true")
}

func uploadArgs(pa *parsed) (map[string]any, error) {
	if len(pa.pos) != 2 {
		return nil, errors.New("usage: dialogic editor upload_image PROJECT FILE [-as NAME]")
	}
	data, err := os.ReadFile(pa.pos[1])
	if err != nil {
		return nil, err
	}
	name := pa.flags["as"]
	if name == "" {
		name = filepath.Base(pa.pos[1])
	}
	return map[string]any{"project": pa.pos[0], "filename": name, "data_base64": base64.StdEncoding.EncodeToString(data)}, nil
}

func newClient(server string) (*mcpClient, error) {
	cfg, err := loadConfig()
	if err != nil {
		return nil, err
	}
	base, err := cfg.serverURL("")
	if err != nil {
		return nil, err
	}
	key := cfg.apiKey()
	if key == "" {
		return nil, errors.New("no API key: run `dialogic login -key K` or set DIALOGIC_API_KEY")
	}
	path := "/mcp"
	if server == "play" {
		path = "/play-mcp"
	}
	return newMCP(base, path, key), nil
}

func invoke(server, name string, args map[string]any, out string, raw bool) error {
	c, err := newClient(server)
	if err != nil {
		return err
	}
	res, err := c.callTool(name, args)
	if err != nil {
		return err
	}
	return render(name, res, out, raw)
}

var imgExt = map[string]string{"image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp", "image/gif": ".gif"}

// render prints text/structured content to stdout, writes images to files and
// reports them on stderr (so stdout stays machine-readable). Tool errors exit 1.
func render(name string, res *toolResult, out string, raw bool) error {
	var texts []string
	var images []mcpContent
	for _, c := range res.Content {
		switch c.Type {
		case "text":
			texts = append(texts, c.Text)
		case "image":
			images = append(images, c)
		}
	}
	if res.IsError {
		return errors.New(strings.Join(texts, "\n"))
	}
	body := strings.Join(texts, "\n")
	if len(res.StructuredContent) > 0 && string(res.StructuredContent) != "null" && body == "" {
		body = string(res.StructuredContent)
	}
	if body != "" {
		fmt.Println(prettyJSON(body, raw))
	}
	for i, img := range images {
		data, err := base64.StdEncoding.DecodeString(img.Data)
		if err != nil {
			return fmt.Errorf("image %d: bad base64: %w", i+1, err)
		}
		ext := imgExt[img.MimeType]
		if ext == "" {
			ext = ".bin"
		}
		path := out
		switch {
		case path == "":
			path = fmt.Sprintf("%s-%d%s", name, time.Now().UnixNano()/1e6, ext)
		case len(images) > 1:
			path = strings.TrimSuffix(out, filepath.Ext(out)) + "-" + strconv.Itoa(i+1) + filepath.Ext(out)
		}
		if err := os.WriteFile(path, data, 0o644); err != nil {
			return err
		}
		fmt.Fprintf(os.Stderr, "saved image: %s (%d bytes)\n", path, len(data))
	}
	return nil
}

func prettyJSON(s string, raw bool) string {
	if raw {
		return s
	}
	var v any
	if json.Unmarshal([]byte(s), &v) != nil {
		return s
	}
	b, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return s
	}
	return string(b)
}

func toolList(server string) string {
	var b strings.Builder
	var ts []tool
	for _, t := range tools {
		if t.server == server {
			ts = append(ts, t)
		}
	}
	for _, t := range ts {
		fmt.Fprintf(&b, "  %-22s %s\n", t.name, t.help)
	}
	return b.String()
}
