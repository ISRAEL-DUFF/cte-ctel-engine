package store

import (
	"context"
	"testing"

	"github.com/ISRAEL-DUFF/cte-ctel-engine/go/internal/cte"
)

func TestSQLiteRepo_RoundtripSample3(t *testing.T) {
	repo, err := NewSQLiteRepo(":memory:")
	if err != nil { t.Fatalf("new sqlite repo: %v", err) }
	ctx := context.Background()
	if err := repo.Init(ctx); err != nil { t.Fatalf("init err: %v", err) }

	root := cte.CreateSample3()
	inv := root.ValidateInvariant()
	if !inv.Ok { t.Fatalf("pre-save invariant should hold for sample3: %+v", inv) }

	if err := repo.SaveTree(ctx, "sample3", 1, root); err != nil {
		t.Fatalf("save tree err: %v", err)
	}

	loaded, linv, err := repo.LoadTree(ctx, "sample3", 1)
	if err != nil { t.Fatalf("load tree err: %v", err) }
	if !linv.Ok { t.Fatalf("loaded invariant should hold: %+v", linv) }
	if len(loaded.Children) == 0 { t.Fatalf("loaded tree should have children") }
}
