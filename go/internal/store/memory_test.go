package store

import (
	"context"
	"testing"

	"github.com/ISRAEL-DUFF/cte-ctel-engine/go/internal/cte"
)

func TestMemoryRepo_RoundtripSample2(t *testing.T) {
	repo := NewMemoryRepo()
	ctx := context.Background()
	if err := repo.Init(ctx); err != nil { t.Fatalf("init err: %v", err) }

	root := cte.CreateSample2()
	inv := root.ValidateInvariant()
	if !inv.Ok { t.Fatalf("pre-save invariant should hold for sample2: %+v", inv) }

	if err := repo.SaveTree(ctx, "sample2", 1, root); err != nil {
		t.Fatalf("save tree err: %v", err)
	}

	loaded, linv, err := repo.LoadTree(ctx, "sample2", 1)
	if err != nil { t.Fatalf("load tree err: %v", err) }
	if !linv.Ok { t.Fatalf("loaded invariant should hold: %+v", linv) }
	if len(loaded.Children) == 0 { t.Fatalf("loaded tree should have children") }
}
