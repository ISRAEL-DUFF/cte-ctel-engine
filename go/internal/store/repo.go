package store

import (
	"context"

	"github.com/ISRAEL-DUFF/cte-ctel-engine/go/internal/cte"
)

// NodeRow represents a persisted node in a snapshot.
// ID is unique within (treeID, version). A simple choice is the materialized path.
// ParentID is empty for the root.
type NodeRow struct {
	ID       string
	Account  string
	ParentID string
}

// TokenRow represents a token belonging to a node in a snapshot.
// Spent only applies to credit tokens.
type TokenRow struct {
	NodeID    string
	Type      string // "credit" | "debit"
	Value     int
	Account   string
	Spent     bool
}

// TotalsRow stores snapshot-level aggregates for fast invariant reads.
type TotalsRow struct {
	UnspentCredits int
	Debits         int
}

// Snapshot holds a full tree snapshot in row form.
type Snapshot struct {
	Nodes  []NodeRow
	Tokens []TokenRow
	Totals TotalsRow
}

// Repository defines storage operations for immutable tree snapshots.
// This interface is storage-agnostic; implementations may be in-memory, SQLite, Postgres, etc.
type Repository interface {
	Init(ctx context.Context) error
	SaveSnapshot(ctx context.Context, treeID string, version int, snap Snapshot) error
	LoadSnapshot(ctx context.Context, treeID string, version int) (Snapshot, error)

	// Convenience helpers to work directly with cte.LienNode if desired
	SaveTree(ctx context.Context, treeID string, version int, root *cte.LienNode) error
	LoadTree(ctx context.Context, treeID string, version int) (*cte.LienNode, cte.Invariant, error)
}
