package main

import (
	"bufio"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"golang.org/x/term"
)

const usage = `dialogic — command-line client for the DiaLogicNgine editor and player MCPs

Setup (credentials are stored in ~/.dialogic-cli.json, mode 0600):
  dialogic login [-server URL] [-key MCP_API_KEY] [-user NAME] [-password PW]
  dialogic whoami
    The API key (server env MCP_API_KEYS) powers 'editor', 'play' and 'call'.
    The account login (username+password) powers 'pull', 'push', 'game', 'assets'.
    Env: DIALOGIC_URL (or DIALOGIC_MCP_URL), DIALOGIC_API_KEY, DIALOGIC_USER,
         DIALOGIC_PASSWORD, DIALOGIC_CONFIG.

MCP tools — same names and parameters as the MCP servers
(snake_case or kebab-case; positionals are the required parameters, rest are -flags):
  dialogic editor [TOOL ARGS]     editor MCP (/mcp)
  dialogic play   [TOOL ARGS]     player MCP (/play-mcp)
  dialogic <editor|play> TOOL -h  parameters of one tool
  dialogic tools [editor|play]    live tools/list from the server (spots tools the CLI lacks)
  dialogic call <editor|play> TOOL [JSON|@file|-]    raw call with a JSON arguments object

Whole-game transfer (REST, owner login):
  dialogic pull PROJECT [-o DIR] [-no-game] [-no-images]    game.json + images/ → DIR (default ./PROJECT)
  dialogic push PROJECT [-from DIR] [-no-game] [-no-images] [-prune]
                                    DIR/game.json + DIR/images/* → server (replaces the whole game)
  dialogic clone SRC DST [-title NAME] [-force]             copy a whole game (JSON + images) to a new project
  dialogic scripts dump PROJECT [-o DIR]                    every script → readable .js files + scripts.json
  dialogic scripts list PROJECT                             script paths
  dialogic scripts status PROJECT [-from DIR]               which files you changed / remote conflicts
  dialogic scripts push PROJECT [-from DIR] [-dry-run] [-force] [-no-check]
  dialogic scripts set PROJECT PATH FILE|-                  patch one script (PATH from 'scripts list')
  dialogic game get PROJECT [-o FILE] [-compact]            full game JSON (stdout by default)
  dialogic game put PROJECT FILE|-                          replace the whole game JSON
  dialogic assets list PROJECT
  dialogic assets pull PROJECT [NAME ...] [-o DIR]          original-resolution files
  dialogic assets push PROJECT FILE ... [-as NAME]          -as only with a single file
  dialogic assets delete PROJECT NAME ...

Play tools default to no image (a terminal can't show one); add -image, or -o FILE
to save it. Output is JSON on stdout; messages go to stderr.
`

func main() {
	if err := run(os.Args[1:]); err != nil {
		fmt.Fprintln(os.Stderr, "error:", err)
		os.Exit(1)
	}
}

func run(args []string) error {
	if len(args) == 0 || args[0] == "help" || args[0] == "-h" || args[0] == "--help" {
		fmt.Print(usage)
		return nil
	}
	cmd, rest := args[0], args[1:]
	switch cmd {
	case "login":
		return cmdLogin(rest)
	case "whoami":
		return cmdWhoami()
	case "editor", "play":
		if len(rest) == 0 {
			fmt.Printf("dialogic %s tools:\n%s", cmd, toolList(cmd))
			return nil
		}
		t := findTool(cmd, rest[0])
		if t == nil {
			return fmt.Errorf("unknown %s tool %q (try `dialogic %s`; `dialogic tools %s` lists what the server has)", cmd, rest[0], cmd, cmd)
		}
		return runTool(t, rest[1:])
	case "tools":
		return cmdTools(rest)
	case "call":
		return cmdCall(rest)
	case "pull":
		return cmdPull(rest)
	case "push":
		return cmdPush(rest)
	case "scripts":
		return cmdScripts(rest)
	case "clone":
		return cmdClone(rest)
	case "game":
		return cmdGame(rest)
	case "assets":
		return cmdAssets(rest)
	}
	return fmt.Errorf("unknown command %q\n\n%s", cmd, usage)
}

// ── login / whoami ──────────────────────────────────────────────────────────

func prompt(label string, secret bool) (string, error) {
	fmt.Fprint(os.Stderr, label)
	if secret && term.IsTerminal(int(os.Stdin.Fd())) {
		b, err := term.ReadPassword(int(os.Stdin.Fd()))
		fmt.Fprintln(os.Stderr)
		return string(b), err
	}
	s, err := bufio.NewReader(os.Stdin).ReadString('\n')
	if err != nil && s == "" {
		return "", err
	}
	return strings.TrimSpace(s), nil
}

func cmdLogin(args []string) error {
	pa, err := parseArgs(args, nil, map[string]bool{"server": true, "key": true, "user": true, "password": true})
	if err != nil {
		return err
	}
	cfg, err := loadConfig()
	if err != nil {
		return err
	}
	base, err := cfg.serverURL(pa.flags["server"])
	if err != nil {
		if base, err = prompt("Server URL: ", false); err != nil || base == "" {
			return errors.New("a server URL is required")
		}
		base = strings.TrimRight(base, "/")
	}
	cfg.Server = base

	key, user, password := pa.flags["key"], pa.flags["user"], pa.flags["password"]
	interactive := key == "" && user == ""
	if interactive {
		key, _ = prompt("MCP API key (blank to skip): ", true)
		user, _ = prompt("Account username (blank to skip): ", false)
	}
	if user != "" && password == "" {
		if password = os.Getenv("DIALOGIC_PASSWORD"); password == "" {
			if password, err = prompt("Password: ", true); err != nil {
				return err
			}
		}
	}

	var problems []error
	if key != "" {
		cfg.Key = key
		probe := newMCP(base, "/mcp", key)
		if _, err := probe.callTool("list_projects", nil); err != nil {
			problems = append(problems, fmt.Errorf("API key rejected: %w", err))
			cfg.Key = ""
		} else {
			fmt.Fprintln(os.Stderr, "API key OK")
		}
	}
	if user != "" {
		tok, err := restLogin(base, user, password)
		if err != nil {
			problems = append(problems, err)
		} else {
			cfg.User, cfg.Token = user, tok
			fmt.Fprintf(os.Stderr, "logged in as %s\n", user)
		}
	}
	if len(problems) > 0 && cfg.Key == "" && cfg.Token == "" {
		return errors.Join(problems...)
	}
	if err := saveConfig(cfg); err != nil {
		return err
	}
	path, _ := configFile()
	fmt.Fprintf(os.Stderr, "saved to %s\n", path)
	return errors.Join(problems...)
}

func cmdWhoami() error {
	cfg, err := loadConfig()
	if err != nil {
		return err
	}
	base, err := cfg.serverURL("")
	if err != nil {
		return err
	}
	fmt.Printf("server:  %s\n", base)
	if key := cfg.apiKey(); key == "" {
		fmt.Println("api key: not set")
	} else if res, err := newMCP(base, "/mcp", key).callTool("list_projects", nil); err != nil {
		fmt.Printf("api key: set, but failing: %v\n", err)
	} else {
		var out struct{ Total int }
		if len(res.Content) > 0 {
			_ = json.Unmarshal([]byte(res.Content[0].Text), &out)
		}
		fmt.Printf("api key: OK (%d projects)\n", out.Total)
	}
	r, err := newREST()
	if err != nil {
		fmt.Println("session: not logged in")
		return nil
	}
	if data, err := r.bytes("GET", "/auth/me"); err != nil {
		fmt.Printf("session: stored but failing: %v\n", err)
	} else {
		var me struct{ Username string }
		_ = json.Unmarshal(data, &me)
		fmt.Printf("session: logged in as %s\n", me.Username)
	}
	return nil
}

// ── tools / call ────────────────────────────────────────────────────────────

func cmdTools(args []string) error {
	servers := []string{"editor", "play"}
	if len(args) > 0 {
		servers = args[:1]
	}
	for _, s := range servers {
		if s != "editor" && s != "play" {
			return errors.New("usage: dialogic tools [editor|play]")
		}
		c, err := newClient(s)
		if err != nil {
			return err
		}
		live, err := c.listTools()
		if err != nil {
			return err
		}
		fmt.Printf("%s:\n", s)
		onServer := map[string]bool{}
		for _, t := range live {
			onServer[t.Name] = true
			note := ""
			if findTool(s, t.Name) == nil {
				note = "   (not in this CLI's table — use `dialogic call`)"
			}
			fmt.Printf("  %s%s\n", t.Name, note)
		}
		for _, t := range tools {
			if t.server == s && !onServer[t.name] {
				fmt.Printf("  %s   (in this CLI but not on this server — version skew)\n", t.name)
			}
		}
	}
	return nil
}

func cmdCall(args []string) error {
	pa, err := parseArgs(args, map[string]bool{"raw": true}, map[string]bool{"o": true, "raw": true})
	if err != nil {
		return err
	}
	if len(pa.pos) < 2 || len(pa.pos) > 3 || (pa.pos[0] != "editor" && pa.pos[0] != "play") {
		return errors.New("usage: dialogic call <editor|play> TOOL [JSON|@file|-]")
	}
	var a map[string]any
	if len(pa.pos) == 3 {
		s, err := readText(pa.pos[2])
		if err != nil {
			return err
		}
		if err := json.Unmarshal([]byte(s), &a); err != nil {
			return fmt.Errorf("arguments must be a JSON object: %w", err)
		}
	}
	return invoke(pa.pos[0], pa.pos[1], a, pa.flags["o"], pa.flags["raw"] == "true")
}

// ── bulk commands ───────────────────────────────────────────────────────────

func cmdPull(args []string) error {
	pa, err := parseArgs(args, map[string]bool{"no_game": true, "no_images": true}, map[string]bool{"o": true, "no_game": true, "no_images": true})
	if err != nil {
		return err
	}
	if len(pa.pos) != 1 {
		return errors.New("usage: dialogic pull PROJECT [-o DIR] [-no-game] [-no-images]")
	}
	dir := pa.flags["o"]
	if dir == "" {
		dir = pa.pos[0]
	}
	r, err := newREST()
	if err != nil {
		return err
	}
	return pull(r, pa.pos[0], dir, !flagOn(pa, "no_game"), !flagOn(pa, "no_images"))
}

func cmdPush(args []string) error {
	pa, err := parseArgs(args, map[string]bool{"no_game": true, "no_images": true, "prune": true},
		map[string]bool{"from": true, "no_game": true, "no_images": true, "prune": true})
	if err != nil {
		return err
	}
	if len(pa.pos) != 1 {
		return errors.New("usage: dialogic push PROJECT [-from DIR] [-no-game] [-no-images] [-prune]")
	}
	dir := pa.flags["from"]
	if dir == "" {
		dir = pa.pos[0]
	}
	r, err := newREST()
	if err != nil {
		return err
	}
	return push(r, pa.pos[0], dir, !flagOn(pa, "no_game"), !flagOn(pa, "no_images"), flagOn(pa, "prune"))
}

func cmdGame(args []string) error {
	if len(args) < 2 {
		return errors.New("usage: dialogic game get PROJECT [-o FILE] [-compact] | game put PROJECT FILE|-")
	}
	sub := args[0]
	pa, err := parseArgs(args[1:], map[string]bool{"compact": true}, map[string]bool{"o": true, "compact": true})
	if err != nil {
		return err
	}
	r, err := newREST()
	if err != nil {
		return err
	}
	switch sub {
	case "get":
		if len(pa.pos) != 1 {
			return errors.New("usage: dialogic game get PROJECT [-o FILE] [-compact]")
		}
		data, err := gameGet(r, pa.pos[0], flagOn(pa, "compact"))
		if err != nil {
			return err
		}
		if out := pa.flags["o"]; out != "" {
			return writeAtomic(out, data)
		}
		_, err = os.Stdout.Write(data)
		return err
	case "put":
		if len(pa.pos) != 2 {
			return errors.New("usage: dialogic game put PROJECT FILE|-")
		}
		var data []byte
		if pa.pos[1] == "-" {
			data, err = io.ReadAll(os.Stdin)
		} else {
			data, err = os.ReadFile(pa.pos[1])
		}
		if err != nil {
			return err
		}
		if err := gamePut(r, pa.pos[0], data); err != nil {
			return err
		}
		fmt.Fprintln(os.Stderr, "game replaced")
		return nil
	}
	return fmt.Errorf("unknown game subcommand %q", sub)
}

func cmdAssets(args []string) error {
	const u = "usage: dialogic assets list|pull|push|delete PROJECT ..."
	if len(args) < 2 {
		return errors.New(u)
	}
	sub := args[0]
	pa, err := parseArgs(args[1:], nil, map[string]bool{"o": true, "as": true, "prune": true})
	if err != nil {
		return err
	}
	if len(pa.pos) < 1 {
		return errors.New(u)
	}
	project, names := pa.pos[0], pa.pos[1:]
	r, err := newREST()
	if err != nil {
		return err
	}
	switch sub {
	case "list":
		list, err := assetList(r, project)
		for _, n := range list {
			fmt.Println(n)
		}
		return err
	case "pull":
		dir := pa.flags["o"]
		if dir == "" {
			dir = filepath.Join(project, "images")
		}
		return assetsPull(r, project, dir, names)
	case "push":
		if len(names) == 0 {
			return errors.New("usage: dialogic assets push PROJECT FILE ... [-as NAME]")
		}
		if as := pa.flags["as"]; as != "" {
			if len(names) != 1 {
				return errors.New("-as works with exactly one file")
			}
			return assetPut(r, project, names[0], as)
		}
		return assetsPush(r, project, names, false, "")
	case "delete":
		if len(names) == 0 {
			return errors.New("usage: dialogic assets delete PROJECT NAME ...")
		}
		return each(names, func(n string) error { return assetDelete(r, project, n) })
	}
	return errors.New(u)
}

func flagOn(p *parsed, name string) bool { return p.flags[name] == "true" }

func cmdClone(args []string) error {
	pa, err := parseArgs(args, map[string]bool{"force": true}, map[string]bool{"title": true, "force": true})
	if err != nil {
		return err
	}
	if len(pa.pos) != 2 {
		return errors.New("usage: dialogic clone SRC DST [-title NAME] [-force]")
	}
	r, err := newREST()
	if err != nil {
		return err
	}
	return clone(r, pa.pos[0], pa.pos[1], flagOn(pa, "force"), pa.flags["title"])
}

func cmdScripts(args []string) error {
	const u = "usage: dialogic scripts dump|list|status|push|set PROJECT ..."
	if len(args) < 2 {
		return errors.New(u)
	}
	sub := args[0]
	pa, err := parseArgs(args[1:], map[string]bool{"force": true, "dry_run": true, "no_check": true},
		map[string]bool{"o": true, "from": true, "force": true, "dry_run": true, "no_check": true})
	if err != nil {
		return err
	}
	if len(pa.pos) < 1 {
		return errors.New(u)
	}
	project := pa.pos[0]
	dir := pa.flags["o"]
	if dir == "" {
		dir = pa.flags["from"]
	}
	if dir == "" {
		dir = project + "-scripts"
	}
	r, err := newREST()
	if err != nil {
		return err
	}
	switch sub {
	case "dump":
		n, err := scriptsDump(r, project, dir)
		if err == nil {
			fmt.Fprintf(os.Stderr, "dumped %d script(s) → %s\n", n, dir)
		}
		return err
	case "list":
		return scriptsList(r, project)
	case "status":
		return scriptsStatus(r, project, dir)
	case "push":
		return scriptsPush(r, project, dir, flagOn(pa, "force"), flagOn(pa, "dry_run"), flagOn(pa, "no_check"))
	case "set":
		if len(pa.pos) != 3 {
			return errors.New("usage: dialogic scripts set PROJECT PATH FILE|-")
		}
		var src []byte
		if pa.pos[2] == "-" {
			src, err = io.ReadAll(os.Stdin)
		} else {
			src, err = os.ReadFile(pa.pos[2])
		}
		if err != nil {
			return err
		}
		return scriptsSet(r, project, pa.pos[1], src, flagOn(pa, "no_check"))
	}
	return errors.New(u)
}
