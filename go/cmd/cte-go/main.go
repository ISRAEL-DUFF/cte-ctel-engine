package main

import (
	"log"
	"net/http"
	"os"

	"github.com/ISRAEL-DUFF/cte-ctel-engine/go/internal/httpserver"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "4001"
	}

	r := httpserver.NewRouter()
	log.Printf("Go server running on http://localhost:%s", port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}
