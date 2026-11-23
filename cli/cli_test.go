package main

import (
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func mockMCP(t *testing.T, sse bool, handler func(name string, args map[string]any) any) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("X-API-Key") != "k" {
			http.Error(w, `{"error":"unauthorized"}`, 401)
			return
		}
		var req struct {
			ID     int    `json:"id"`
			Method string `json:"method"`
			Params struct {
				Name      string         `json:"name"`
				Arguments map[string]any `json:"arguments"`
			} `json:"params"`
		}
		_ = json.NewDecoder(r.Body).Decode(&req)
		msg, _ := json.Marshal(map[string]any{"jsonrpc": "2.0", "id": req.ID, "result": handler(req.Params.Name, req.Params.Arguments)})
		if sse {
			w.Header().Set("Content-Type", "text/event-stream")
			w.Write([]byte("event: message\ndata: {\"jsonrpc\":\"2.0\",\"id\":999,\"result\":{}}\n\ndata: " + string(msg) + "\n\n"))
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write(msg)
	}))
}

func textResult(s string) any {
	return map[string]any{"content": []map[string]any{{"type": "text", "text": s}}}
}

func TestCallToolJSONAndSSE(t *testing.T) {
	for _, sse := range []bool{false, true} {
		srv := mockMCP(t, sse, func(name string, args map[string]any) any {
			return textResult(name + ":" + args["project"].(string))
		})
		res, err := newMCP(srv.URL, "/mcp", "k").callTool("browse_field", map[string]any{"project": "p"})
		srv.Close()
		if err != nil || len(res.Content) != 1 || res.Content[0].Text != "browse_field:p" {
			t.Fatalf("sse=%v: %+v %v", sse, res, err)
		}
	}
}

func TestUnauthorizedMessage(t *testing.T) {
	srv := mockMCP(t, false, func(string, map[string]any) any { return nil })
	defer srv.Close()
	_, err := newMCP(srv.URL, "/mcp", "wrong").callTool("x", nil)
	if err == nil || !strings.Contains(err.Error(), "MCP_API_KEYS") {
		t.Fatalf("want actionable 401 error, got %v", err)
	}
}

func TestBuildArgs(t *testing.T) {
	tl := findTool("editor", "patch-field") // kebab-case resolves
	if tl == nil {
		t.Fatal("kebab-case lookup failed")
	}
	bools, known := tl.flagSet()
	pa, err := parseArgs([]string{"p", "dialog", "dialogs", "rev", `[{"op":"test","path":"","value":1}]`}, bools, known)
	if err != nil {
		t.Fatal(err)
	}
	args, err := tl.buildArgs(pa)
	if err != nil {
		t.Fatal(err)
	}
	if ops, ok := args["operations"].([]any); !ok || len(ops) != 1 {
		t.Fatalf("operations should decode to a JSON array, got %#v", args["operations"])
	}

	act := findTool("play", "act")
	bools, known = act.flagSet()
	pa, _ = parseArgs([]string{"S", "travel", "-target_id", "beach", "-index=2"}, bools, known)
	a, err := act.buildArgs(pa)
	if err != nil || a["index"] != 2 || a["target_id"] != "beach" || a["action"] != "travel" {
		t.Fatalf("%v %#v", err, a)
	}

	if _, err := tl.buildArgs(&parsed{pos: []string{"p"}, flags: map[string]string{}}); err == nil {
		t.Fatal("missing required params must fail client-side")
	}
	if _, err := parseArgs([]string{"-nope", "1"}, bools, known); err == nil {
		t.Fatal("unknown flag must fail")
	}
	if _, err := act.buildArgs(&parsed{pos: []string{"S", "continue"}, flags: map[string]string{"index": "x"}}); err == nil {
		t.Fatal("non-integer index must fail")
	}
}

func TestIncludeImageDefaultsOff(t *testing.T) {
	var got map[string]any
	srv := mockMCP(t, false, func(_ string, args map[string]any) any { got = args; return textResult("{}") })
	defer srv.Close()
	t.Setenv("DIALOGIC_CONFIG", filepath.Join(t.TempDir(), "c.json"))
	t.Setenv("DIALOGIC_URL", srv.URL)
	t.Setenv("DIALOGIC_API_KEY", "k")
	if err := runTool(findTool("play", "get_state"), []string{"S"}); err != nil {
		t.Fatal(err)
	}
	if got["include_image"] != false {
		t.Fatalf("include_image should default to false, got %v", got["include_image"])
	}
}

func TestRenderWritesImage(t *testing.T) {
	png := []byte("\x89PNG-fake")
	res := &toolResult{Content: []mcpContent{{Type: "image", Data: base64.StdEncoding.EncodeToString(png), MimeType: "image/png"}}}
	out := filepath.Join(t.TempDir(), "p.png")
	if err := render("preview_image", res, out, false); err != nil {
		t.Fatal(err)
	}
	if b, _ := os.ReadFile(out); string(b) != string(png) {
		t.Fatalf("image bytes differ: %q", b)
	}
}

func TestToolErrorIsAnError(t *testing.T) {
	res := &toolResult{IsError: true, Content: []mcpContent{{Type: "text", Text: "Field changed."}}}
	if err := render("patch_field", res, "", false); err == nil || err.Error() != "Field changed." {
		t.Fatalf("got %v", err)
	}
}

// An ambient DIALOGIC_MCP_URL (meant for other tools) must not outrank a server
// you explicitly logged in to — that once sent a login to the wrong host.
func TestServerPrecedence(t *testing.T) {
	t.Setenv("DIALOGIC_URL", "")
	t.Setenv("DIALOGIC_MCP_URL", "https://ambient.example")
	cfg := &Config{Server: "http://localhost:1/"}
	if s, _ := cfg.serverURL(""); s != "http://localhost:1" {
		t.Fatalf("config must beat DIALOGIC_MCP_URL, got %s", s)
	}
	if s, _ := cfg.serverURL("http://flag"); s != "http://flag" {
		t.Fatalf("flag must win, got %s", s)
	}
	if s, _ := (&Config{}).serverURL(""); s != "https://ambient.example" {
		t.Fatalf("DIALOGIC_MCP_URL is the last-resort fallback, got %s", s)
	}
	t.Setenv("DIALOGIC_MCP_URL", "")
	if _, err := (&Config{}).serverURL(""); err == nil {
		t.Fatal("no built-in default host: must error")
	}
}

func TestValidFilename(t *testing.T) {
	for _, bad := range []string{"", "..", "a/b", `a\b`, ".hidden", "../x"} {
		if validFilename(bad) {
			t.Errorf("%q must be rejected", bad)
		}
	}
	if !validFilename("room.jpg") {
		t.Error("room.jpg must be accepted")
	}
}

func TestGamePutRequiresEngineVersion(t *testing.T) {
	if err := gamePut(nil, "p", []byte(`{"a":1}`)); err == nil || !strings.Contains(err.Error(), "engineVersion") {
		t.Fatalf("got %v", err)
	}
	if err := gamePut(nil, "p", []byte(`[1]`)); err == nil {
		t.Fatal("non-object must fail")
	}
}

func TestCloneRefusesSameProject(t *testing.T) {
	if err := clone(nil, "a", "a", false, ""); err == nil {
		t.Fatal("cloning onto itself must fail before any request")
	}
}
