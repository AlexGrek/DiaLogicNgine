package main

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"strings"
)

const configName = ".dialogic-cli.json"

// Config is the on-disk login state (mode 0600).
//
//	Key   — MCP API key (server env MCP_API_KEYS), used by `editor` / `play` / `call`.
//	Token — REST session cookie from username+password, used by pull / push / game / assets.
type Config struct {
	Server string `json:"server"`
	Key    string `json:"key,omitempty"`
	User   string `json:"user,omitempty"`
	Token  string `json:"token,omitempty"`
}

func configFile() (string, error) {
	if p := os.Getenv("DIALOGIC_CONFIG"); p != "" {
		return p, nil
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, configName), nil
}

func loadConfig() (*Config, error) {
	path, err := configFile()
	if err != nil {
		return nil, err
	}
	cfg := &Config{}
	data, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		return cfg, nil
	}
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(data, cfg); err != nil {
		return nil, err
	}
	return cfg, nil
}

func saveConfig(cfg *Config) error {
	path, err := configFile()
	if err != nil {
		return err
	}
	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}
	if err := os.WriteFile(path, data, 0o600); err != nil {
		return err
	}
	return os.Chmod(path, 0o600) // WriteFile keeps the mode of a pre-existing file
}

// serverURL precedence: explicit override (-server) → DIALOGIC_URL → saved config
// → DIALOGIC_MCP_URL. The last is only a fallback so an ambient variable meant
// for other tools can never silently outrank a server you logged in to.
// There is deliberately no built-in default host.
func (c *Config) serverURL(override string) (string, error) {
	for _, s := range []string{override, os.Getenv("DIALOGIC_URL"), c.Server, os.Getenv("DIALOGIC_MCP_URL")} {
		if s != "" {
			return strings.TrimRight(s, "/"), nil
		}
	}
	return "", errors.New("no server: run `dialogic login -server URL` or set DIALOGIC_URL")
}

func (c *Config) apiKey() string {
	if k := os.Getenv("DIALOGIC_API_KEY"); k != "" {
		return k
	}
	return c.Key
}
