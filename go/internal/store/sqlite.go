package store

import (
	"context"
	"database/sql"
	"fmt"

	_ "github.com/mattn/go-sqlite3"
	"github.com/ISRAEL-DUFF/cte-ctel-engine/go/internal/cte"
)

// SQLiteRepo implements Repository backed by SQLite.
type SQLiteRepo struct {
	db *sql.DB
}

// NewSQLiteRepo opens/creates a SQLite database at dsn (use ":memory:" for tests).
func NewSQLiteRepo(dsn string) (*SQLiteRepo, error) {
	db, err := sql.Open("sqlite3", dsn)
	if err != nil { return nil, err }
	// Reasonable pragmas for tests/dev; callers may tune further.
	if _, err := db.Exec(`PRAGMA foreign_keys = ON;`); err != nil { return nil, err }
	return &SQLiteRepo{db: db}, nil
}

func (r *SQLiteRepo) Init(ctx context.Context) error {
	schema := `
CREATE TABLE IF NOT EXISTS nodes (
    tree_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    id TEXT NOT NULL,
    account TEXT NOT NULL,
    parent_id TEXT,
    PRIMARY KEY (tree_id, version, id)
);
CREATE TABLE IF NOT EXISTS tokens (
    tree_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    node_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('credit','debit')),
    value INTEGER NOT NULL,
    account TEXT NOT NULL,
    spent INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (tree_id, version, node_id) REFERENCES nodes(tree_id, version, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_tokens_node ON tokens(tree_id, version, node_id);
CREATE TABLE IF NOT EXISTS totals (
    tree_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    unspent_credits INTEGER NOT NULL,
    debits INTEGER NOT NULL,
    PRIMARY KEY (tree_id, version)
);
`
	_, err := r.db.ExecContext(ctx, schema)
	return err
}

func (r *SQLiteRepo) SaveSnapshot(ctx context.Context, treeID string, version int, snap Snapshot) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil { return err }
	defer func(){ if err != nil { _ = tx.Rollback() } }()

	// Delete existing snapshot if present (idempotent upsert behavior)
	if _, err = tx.ExecContext(ctx, `DELETE FROM tokens WHERE tree_id=? AND version=?`, treeID, version); err != nil { return err }
	if _, err = tx.ExecContext(ctx, `DELETE FROM nodes WHERE tree_id=? AND version=?`, treeID, version); err != nil { return err }
	if _, err = tx.ExecContext(ctx, `DELETE FROM totals WHERE tree_id=? AND version=?`, treeID, version); err != nil { return err }

	// Insert nodes
	stmtNode, err := tx.PrepareContext(ctx, `INSERT INTO nodes(tree_id, version, id, account, parent_id) VALUES(?,?,?,?,?)`)
	if err != nil { return err }
	defer stmtNode.Close()
	for _, n := range snap.Nodes {
		if _, err = stmtNode.ExecContext(ctx, treeID, version, n.ID, n.Account, n.ParentID); err != nil { return err }
	}
	// Insert tokens
	stmtTok, err := tx.PrepareContext(ctx, `INSERT INTO tokens(tree_id, version, node_id, type, value, account, spent) VALUES(?,?,?,?,?,?,?)`)
	if err != nil { return err }
	defer stmtTok.Close()
	for _, t := range snap.Tokens {
		spent := 0
		if t.Spent { spent = 1 }
		if _, err = stmtTok.ExecContext(ctx, treeID, version, t.NodeID, t.Type, t.Value, t.Account, spent); err != nil { return err }
	}
	// Insert totals
	if _, err = tx.ExecContext(ctx, `INSERT INTO totals(tree_id, version, unspent_credits, debits) VALUES(?,?,?,?)`, treeID, version, snap.Totals.UnspentCredits, snap.Totals.Debits); err != nil { return err }

	err = tx.Commit()
	return err
}

func (r *SQLiteRepo) LoadSnapshot(ctx context.Context, treeID string, version int) (Snapshot, error) {
	s := Snapshot{}
	rows, err := r.db.QueryContext(ctx, `SELECT id, account, parent_id FROM nodes WHERE tree_id=? AND version=? ORDER BY id`, treeID, version)
	if err != nil { return s, err }
	defer rows.Close()
	for rows.Next() {
		var n NodeRow
		if err := rows.Scan(&n.ID, &n.Account, &n.ParentID); err != nil { return s, err }
		s.Nodes = append(s.Nodes, n)
	}
	if err := rows.Err(); err != nil { return s, err }

	rows2, err := r.db.QueryContext(ctx, `SELECT node_id, type, value, account, spent FROM tokens WHERE tree_id=? AND version=?`, treeID, version)
	if err != nil { return s, err }
	defer rows2.Close()
	for rows2.Next() {
		var t TokenRow
		var spent int
		if err := rows2.Scan(&t.NodeID, &t.Type, &t.Value, &t.Account, &spent); err != nil { return s, err }
		t.Spent = spent != 0
		s.Tokens = append(s.Tokens, t)
	}
	if err := rows2.Err(); err != nil { return s, err }

	var un, db int
	err = r.db.QueryRowContext(ctx, `SELECT unspent_credits, debits FROM totals WHERE tree_id=? AND version=?`, treeID, version).Scan(&un, &db)
	if err != nil { return s, err }
	s.Totals = TotalsRow{UnspentCredits: un, Debits: db}
	return s, nil
}

func (r *SQLiteRepo) SaveTree(ctx context.Context, treeID string, version int, root *cte.LienNode) error {
	snap := FromTree(root)
	return r.SaveSnapshot(ctx, treeID, version, snap)
}

func (r *SQLiteRepo) LoadTree(ctx context.Context, treeID string, version int) (*cte.LienNode, cte.Invariant, error) {
	s, err := r.LoadSnapshot(ctx, treeID, version)
	if err != nil { return nil, cte.Invariant{}, err }
	root := ToTree(s)
	if root == nil { return nil, cte.Invariant{}, fmt.Errorf("empty snapshot") }
	return root, root.ValidateInvariant(), nil
}
