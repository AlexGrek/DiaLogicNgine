package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// mcpClient speaks stateless Streamable-HTTP MCP (JSON-RPC 2.0 over POST) to
// the editor (/mcp) or player (/play-mcp) endpoint.
type mcpClient struct {
	url  string
	key  string
	http *http.Client
	id   int
}

type mcpContent struct {
	Type     string `json:"type"`
	Text     string `json:"text,omitempty"`
	Data     string `json:"data,omitempty"`
	MimeType string `json:"mimeType,omitempty"`
}

type toolResult struct {
	Content           []mcpContent    `json:"content"`
	StructuredContent json.RawMessage `json:"structuredContent,omitempty"`
	IsError           bool            `json:"isError"`
}

type rpcResponse struct {
	ID     json.RawMessage `json:"id"`
	Result json.RawMessage `json:"result"`
	Error  *struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

func newMCP(base, path, key string) *mcpClient {
	return &mcpClient{url: base + path, key: key, http: &http.Client{Timeout: 5 * time.Minute}}
}

func (c *mcpClient) rpc(method string, params any) (json.RawMessage, error) {
	c.id++
	body, err := json.Marshal(map[string]any{"jsonrpc": "2.0", "id": c.id, "method": method, "params": params})
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequest("POST", c.url, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json, text/event-stream")
	req.Header.Set("X-API-Key", c.key)
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized {
		return nil, errors.New("unauthorized — the API key is wrong or missing (`dialogic login -key K`, or DIALOGIC_API_KEY); the server needs it in MCP_API_KEYS")
	}
	msg, err := readRPC(resp, c.id)
	if err != nil {
		return nil, err
	}
	if msg.Error != nil {
		return nil, fmt.Errorf("mcp error %d: %s", msg.Error.Code, msg.Error.Message)
	}
	if resp.StatusCode >= 300 {
		return nil, fmt.Errorf("HTTP %d", resp.StatusCode)
	}
	return msg.Result, nil
}

// readRPC accepts either a plain JSON body or an SSE stream and returns the
// message answering request id.
func readRPC(resp *http.Response, id int) (*rpcResponse, error) {
	if !strings.HasPrefix(resp.Header.Get("Content-Type"), "text/event-stream") {
		var m rpcResponse
		data, err := io.ReadAll(resp.Body)
		if err != nil {
			return nil, err
		}
		if err := json.Unmarshal(data, &m); err != nil {
			return nil, fmt.Errorf("HTTP %d: unexpected response %.200q", resp.StatusCode, data)
		}
		return &m, nil
	}
	sc := bufio.NewScanner(resp.Body)
	sc.Buffer(make([]byte, 1<<20), 64<<20) // image results are megabytes of base64
	want := fmt.Sprint(id)
	for sc.Scan() {
		line := sc.Text()
		if !strings.HasPrefix(line, "data:") {
			continue
		}
		var m rpcResponse
		if json.Unmarshal([]byte(strings.TrimSpace(line[5:])), &m) == nil && string(m.ID) == want {
			return &m, nil
		}
	}
	if err := sc.Err(); err != nil {
		return nil, err
	}
	return nil, errors.New("stream ended without a response")
}

func (c *mcpClient) callTool(name string, args map[string]any) (*toolResult, error) {
	if args == nil {
		args = map[string]any{}
	}
	raw, err := c.rpc("tools/call", map[string]any{"name": name, "arguments": args})
	if err != nil {
		return nil, err
	}
	var res toolResult
	if err := json.Unmarshal(raw, &res); err != nil {
		return nil, err
	}
	return &res, nil
}

func (c *mcpClient) listTools() ([]struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}, error) {
	raw, err := c.rpc("tools/list", map[string]any{})
	if err != nil {
		return nil, err
	}
	var out struct {
		Tools []struct {
			Name        string `json:"name"`
			Description string `json:"description"`
		} `json:"tools"`
	}
	return out.Tools, json.Unmarshal(raw, &out)
}
