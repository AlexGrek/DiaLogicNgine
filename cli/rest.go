package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

const sessionCookie = "dln_session"

// rest talks to /api/v1 with the cookie session. The API key does not work
// here — the backend only honours it on the MCP endpoints.
type rest struct {
	base  string
	token string
	http  *http.Client
}

var errNoSession = errors.New("no login session: run `dialogic login -user NAME` (REST commands need the account password, not the API key)")

func newREST() (*rest, error) {
	cfg, err := loadConfig()
	if err != nil {
		return nil, err
	}
	base, err := cfg.serverURL("")
	if err != nil {
		return nil, err
	}
	r := &rest{base: base, token: cfg.Token, http: &http.Client{Timeout: 5 * time.Minute}}
	// Scripts/CI: DIALOGIC_USER + DIALOGIC_PASSWORD log in on the fly.
	if u, p := os.Getenv("DIALOGIC_USER"), os.Getenv("DIALOGIC_PASSWORD"); u != "" && p != "" {
		if r.token, err = restLogin(base, u, p); err != nil {
			return nil, err
		}
	}
	if r.token == "" {
		return nil, errNoSession
	}
	return r, nil
}

func restLogin(base, user, password string) (string, error) {
	body, _ := json.Marshal(map[string]string{"username": user, "password": password})
	resp, err := (&http.Client{Timeout: time.Minute}).Post(base+"/api/v1/auth/login", "application/json", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("login failed: %w", restError(resp))
	}
	for _, c := range resp.Cookies() {
		if c.Name == sessionCookie {
			return c.Value, nil
		}
	}
	return "", errors.New("login succeeded but the server set no session cookie")
}

// statusError is a non-2xx REST response.
type statusError struct {
	Status int
	Msg    string
}

func (e *statusError) Error() string { return e.Msg }

func restError(resp *http.Response) error {
	err := restErrorMsg(resp)
	return &statusError{Status: resp.StatusCode, Msg: err.Error()}
}

func restErrorMsg(resp *http.Response) error {
	var b struct {
		Detail any `json:"detail"`
	}
	_ = json.NewDecoder(resp.Body).Decode(&b)
	switch {
	case b.Detail != nil:
		return fmt.Errorf("HTTP %d: %v", resp.StatusCode, b.Detail)
	case resp.StatusCode == http.StatusUnauthorized:
		return errors.New("HTTP 401: session expired — run `dialogic login -user NAME` again")
	}
	return fmt.Errorf("HTTP %d", resp.StatusCode)
}

func (r *rest) do(method, path string, body io.Reader, ctype string) (*http.Response, error) {
	req, err := http.NewRequest(method, r.base+"/api/v1"+path, body)
	if err != nil {
		return nil, err
	}
	if ctype != "" {
		req.Header.Set("Content-Type", ctype)
	}
	req.AddCookie(&http.Cookie{Name: sessionCookie, Value: r.token})
	resp, err := r.http.Do(req)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		defer resp.Body.Close()
		return nil, restError(resp)
	}
	return resp, nil
}

func (r *rest) bytes(method, path string) ([]byte, error) {
	resp, err := r.do(method, path, nil, "")
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	return io.ReadAll(resp.Body)
}

func projectPath(project string) string { return "/projects/" + url.PathEscape(project) }

func imagePath(project, name string) string {
	return projectPath(project) + "/images/" + url.PathEscape(name)
}

func validFilename(n string) bool {
	return n != "" && n != "." && n != ".." && !strings.ContainsAny(n, "/\\\x00") && !strings.HasPrefix(n, ".")
}
