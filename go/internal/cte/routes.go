package cte

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
)

type Invariant struct {
	Ok             bool `json:"ok"`
	UnspentCredits int  `json:"unspentCredits"`
	Debits         int  `json:"debits"`
}

type UnspentItem struct {
	Account string   `json:"account"`
	Unspent int      `json:"unspent"`
	Path    []string `json:"path"`
}

type UnspentResponse struct {
	Status string        `json:"status"`
	Order  string        `json:"order"`
	Items  []UnspentItem `json:"items"`
}

type TreeResponse struct {
	Status    string    `json:"status"`
	Tree      string    `json:"tree"`
	Invariant Invariant `json:"invariant"`
}

type MarkdownResponse string

func Routes() http.Handler {
	r := chi.NewRouter()

	// Default endpoints (used by frontend as /cte/*)
	r.Get("/tree", func(w http.ResponseWriter, r *http.Request) {
		root := CreateSample1()
		inv := root.ValidateInvariant()
		resp := TreeResponse{Status: "ok", Tree: root.PrintTree(false), Invariant: inv}
		writeJSON(w, http.StatusOK, resp)
	})
	r.Get("/markdown", func(w http.ResponseWriter, r *http.Request) {
		root := CreateSample1()
		w.Header().Set("Content-Type", "text/markdown")
		w.Write([]byte(root.PrintMarkdown()))
	})
	r.Get("/invariant", func(w http.ResponseWriter, r *http.Request) {
		root := CreateSample1()
		inv := root.ValidateInvariant()
		writeJSON(w, http.StatusOK, map[string]any{"status": "ok", "invariant": inv})
	})
	r.Get("/unspent", func(w http.ResponseWriter, r *http.Request) {
		root := CreateSample1()
		order := r.URL.Query().Get("order")
		if order != "bfs" {
			order = "preorder"
		}
		items := serializeUnspent(root, order)
		writeJSON(w, http.StatusOK, UnspentResponse{Status: "ok", Order: order, Items: items})
	})

	r.Route("/sample1", func(r chi.Router) {
		r.Get("/tree", func(w http.ResponseWriter, r *http.Request) {
			root := CreateSample1()
			inv := root.ValidateInvariant()
			resp := TreeResponse{Status: "ok", Tree: root.PrintTree(false), Invariant: inv}
			writeJSON(w, http.StatusOK, resp)
		})

		r.Get("/markdown", func(w http.ResponseWriter, r *http.Request) {
			root := CreateSample1()
			w.Header().Set("Content-Type", "text/markdown")
			w.Write([]byte(root.PrintMarkdown()))
		})

		r.Get("/invariant", func(w http.ResponseWriter, r *http.Request) {
			root := CreateSample1()
			inv := root.ValidateInvariant()
			writeJSON(w, http.StatusOK, map[string]any{"status": "ok", "invariant": inv})
		})

		r.Get("/unspent", func(w http.ResponseWriter, r *http.Request) {
			root := CreateSample1()
			order := r.URL.Query().Get("order")
			if order != "bfs" {
				order = "preorder"
			}
			items := serializeUnspent(root, order)
			writeJSON(w, http.StatusOK, UnspentResponse{Status: "ok", Order: order, Items: items})
		})
	})

	r.Route("/sample2", func(r chi.Router) {
		r.Get("/tree", func(w http.ResponseWriter, r *http.Request) {
			root := CreateSample2()
			inv := root.ValidateInvariant()
			resp := TreeResponse{Status: "ok", Tree: root.PrintTree(false), Invariant: inv}
			writeJSON(w, http.StatusOK, resp)
		})

		r.Get("/markdown", func(w http.ResponseWriter, r *http.Request) {
			root := CreateSample2()
			w.Header().Set("Content-Type", "text/markdown")
			w.Write([]byte(root.PrintMarkdown()))
		})

		r.Get("/invariant", func(w http.ResponseWriter, r *http.Request) {
			root := CreateSample2()
			inv := root.ValidateInvariant()
			writeJSON(w, http.StatusOK, map[string]any{"status": "ok", "invariant": inv})
		})

		r.Get("/unspent", func(w http.ResponseWriter, r *http.Request) {
			root := CreateSample2()
			order := r.URL.Query().Get("order")
			if order != "bfs" {
				order = "preorder"
			}
			items := serializeUnspent(root, order)
			writeJSON(w, http.StatusOK, UnspentResponse{Status: "ok", Order: order, Items: items})
		})
	})

	r.Route("/sample3", func(r chi.Router) {
		r.Get("/tree", func(w http.ResponseWriter, r *http.Request) {
			root := CreateSample3()
			inv := root.ValidateInvariant()
			resp := TreeResponse{Status: "ok", Tree: root.PrintTree(false), Invariant: inv}
			writeJSON(w, http.StatusOK, resp)
		})

		r.Get("/markdown", func(w http.ResponseWriter, r *http.Request) {
			root := CreateSample3()
			w.Header().Set("Content-Type", "text/markdown")
			w.Write([]byte(root.PrintMarkdown()))
		})

		r.Get("/invariant", func(w http.ResponseWriter, r *http.Request) {
			root := CreateSample3()
			inv := root.ValidateInvariant()
			writeJSON(w, http.StatusOK, map[string]any{"status": "ok", "invariant": inv})
		})

		r.Get("/unspent", func(w http.ResponseWriter, r *http.Request) {
			root := CreateSample3()
			order := r.URL.Query().Get("order")
			if order != "bfs" {
				order = "preorder"
			}
			items := serializeUnspent(root, order)
			writeJSON(w, http.StatusOK, UnspentResponse{Status: "ok", Order: order, Items: items})
		})
	})

	return r
}

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}
