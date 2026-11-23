package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

const sample = `{
 "engineVersion":"0.21",
 "dialogs":[{"name":"main","windows":[
   {"uid":"start","entryScript":"rt.props.a = 1 < 2;","links":[{"text":"go","actionCode":"addX(1)","isVisible":"return true"}]},
   {"uid":"dup","entryScript":"x"},{"uid":"dup","entryScript":"y"}]}],
 "functions":[{"name":"addX","args":"n","body":"rt.props.a += n"}],
 "hooks":[{"name":"Reward","hook":"FACTS::DISCOVERED::f","body":"rt.props.a = 5"}],
 "uiElements":{"meters":[{"uid":"hope","name":"Hope","value":"return rt.props.a"}]},
 "props":[{"name":"a","datatype":"number","defaultValue":0,"description":"not a script"}]
}`

func refsByPath(t *testing.T) (map[string]scriptRef, any) {
	g, err := parseGame([]byte(sample))
	if err != nil {
		t.Fatal(err)
	}
	m := map[string]scriptRef{}
	for _, s := range collectScripts(g) {
		m[s.Path] = s
	}
	return m, g
}

func TestCollectScriptsNamesAndPointers(t *testing.T) {
	m, _ := refsByPath(t)
	want := map[string]string{
		"dialogs/main/windows/start/entryScript":        "/dialogs/0/windows/0/entryScript",
		"dialogs/main/windows/start/links/0/actionCode": "/dialogs/0/windows/0/links/0/actionCode",
		"dialogs/main/windows/start/links/0/isVisible":  "/dialogs/0/windows/0/links/0/isVisible",
		"functions/addX/body":                           "/functions/0/body",
		"hooks/Reward/body":                             "/hooks/0/body",
		"uiElements/meters/hope/value":                  "/uiElements/meters/0/value",
		"dialogs/main/windows/1/entryScript":            "/dialogs/0/windows/1/entryScript", // duplicate uid → index
		"dialogs/main/windows/2/entryScript":            "/dialogs/0/windows/2/entryScript",
	}
	for p, ptr := range want {
		if m[p].Pointer != ptr {
			t.Errorf("%s: pointer %q, want %q", p, m[p].Pointer, ptr)
		}
	}
	if len(m) != len(want) {
		t.Errorf("found %d scripts, want %d (hook string / defaultValue / description must not count)", len(m), len(want))
	}
	if m["functions/addX/body"].Params != "n" {
		t.Errorf("function body must be checked with its own args, got %q", m["functions/addX/body"].Params)
	}
}

func TestSetScriptAndEncodeKeepsAngleBrackets(t *testing.T) {
	m, g := refsByPath(t)
	if err := setScript(g, m["hooks/Reward/body"].Pointer, "if (a < b && c > d) {}"); err != nil {
		t.Fatal(err)
	}
	out, err := encodeGame(g)
	if err != nil {
		t.Fatal(err)
	}
	s := string(out)
	if strings.Contains(s, "\\"+"u003c") || !strings.Contains(s, "a < b && c > d") {
		t.Fatalf("scripts must not be HTML-escaped: %s", s)
	}
	if !strings.Contains(s, `"defaultValue":0`) {
		t.Fatal("numbers must survive the round trip")
	}
	if err := setScript(g, "/dialogs/0/name", "x"); err == nil {
		t.Fatal("setting a non-script field must fail")
	}
}

func TestPlanDetectsEditsAndConflicts(t *testing.T) {
	m, g := refsByPath(t)
	dir := t.TempDir()
	man := &manifest{Project: "p", Files: map[string]manifestEntry{}}
	for path, s := range m {
		f := path + ".js"
		man.Files[f] = manifestEntry{Pointer: s.Pointer, SHA: sum(s.Src)}
		os.MkdirAll(filepath.Dir(filepath.Join(dir, f)), 0o755)
		os.WriteFile(filepath.Join(dir, f), []byte(s.Src+"\n"), 0o644) // trailing newline from an editor ≠ edit
	}
	p := makePlan(man, dir, g, false)
	if len(p.changed) != 0 || len(p.conflicts) != 0 || p.unchanged != len(m) {
		t.Fatalf("pristine files must be unchanged: %+v", p)
	}

	os.WriteFile(filepath.Join(dir, "hooks/Reward/body.js"), []byte("rt.props.a = 6\n"), 0o644)
	if p = makePlan(man, dir, g, false); len(p.changed) != 1 || p.changed[0].newSrc != "rt.props.a = 6" {
		t.Fatalf("edit not detected: %+v", p)
	}

	// someone else changed the same script remotely after our dump
	_ = setScript(g, "/hooks/0/body", "rt.props.a = 99")
	if p = makePlan(man, dir, g, false); len(p.conflicts) != 1 || len(p.changed) != 0 {
		t.Fatalf("conflict not detected: %+v", p)
	}
	if p = makePlan(man, dir, g, true); len(p.changed) != 1 {
		t.Fatalf("-force must override: %+v", p)
	}
}

func TestSyntaxCheck(t *testing.T) {
	skipped, err := syntaxCheck(defaultParams, "return rt.props.a > 1;")
	if skipped {
		t.Skip("node not installed")
	}
	if err != nil {
		t.Fatalf("valid script rejected: %v", err)
	}
	if _, err := syntaxCheck(defaultParams, "if (rt.props.a {\n}"); err == nil || !strings.Contains(err.Error(), "<script>:1") || strings.Contains(err.Error(), "/private") {
		t.Fatalf("broken script must fail with a line number matching the file, got %v", err)
	}
}
