package httpserver

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestHealthEndpoint(t *testing.T) {
	r := NewRouter()
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	if ct := rec.Header().Get("Content-Type"); !strings.Contains(ct, "application/json") {
		t.Fatalf("expected application/json, got %s", ct)
	}
}

func TestCTEInvariantJSON(t *testing.T) {
	r := NewRouter()
	req := httptest.NewRequest(http.MethodGet, "/cte/invariant", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("/cte/invariant expected 200, got %d", rec.Code)
	}
	body, _ := io.ReadAll(rec.Body)
	if !strings.Contains(string(body), "\"invariant\"") {
		t.Fatalf("missing invariant in response: %s", string(body))
	}
}

func TestCTEMarkdown(t *testing.T) {
	r := NewRouter()
	req := httptest.NewRequest(http.MethodGet, "/cte/markdown", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("/cte/markdown expected 200, got %d", rec.Code)
	}
	if ct := rec.Header().Get("Content-Type"); !strings.Contains(ct, "text/markdown") {
		t.Fatalf("expected text/markdown, got %s", ct)
	}
	body, _ := io.ReadAll(rec.Body)
	if !strings.Contains(string(body), "```mermaid") {
		t.Fatalf("markdown missing mermaid block")
	}
}
