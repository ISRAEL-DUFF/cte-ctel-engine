package store

import (
	"context"
	"fmt"
	"sync"

	"github.com/ISRAEL-DUFF/cte-ctel-engine/go/internal/cte"
)

// MemoryRepo is an in-memory implementation of Repository for dev/tests.
type MemoryRepo struct {
	mu   sync.RWMutex
	data map[string]map[int]Snapshot // treeID -> version -> snapshot
}

func NewMemoryRepo() *MemoryRepo {
	return &MemoryRepo{data: make(map[string]map[int]Snapshot)}
}

func (m *MemoryRepo) Init(ctx context.Context) error { return nil }

func (m *MemoryRepo) SaveSnapshot(ctx context.Context, treeID string, version int, snap Snapshot) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, ok := m.data[treeID]; !ok {
		m.data[treeID] = make(map[int]Snapshot)
	}
	m.data[treeID][version] = snap
	return nil
}

func (m *MemoryRepo) LoadSnapshot(ctx context.Context, treeID string, version int) (Snapshot, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	vers, ok := m.data[treeID]
	if !ok {
		return Snapshot{}, fmt.Errorf("tree not found: %s", treeID)
	}
	s, ok := vers[version]
	if !ok {
		return Snapshot{}, fmt.Errorf("version not found: %d", version)
	}
	return s, nil
}

func (m *MemoryRepo) SaveTree(ctx context.Context, treeID string, version int, root *cte.LienNode) error {
	snap := FromTree(root)
	return m.SaveSnapshot(ctx, treeID, version, snap)
}

func (m *MemoryRepo) LoadTree(ctx context.Context, treeID string, version int) (*cte.LienNode, cte.Invariant, error) {
	s, err := m.LoadSnapshot(ctx, treeID, version)
	if err != nil {
		return nil, cte.Invariant{}, err
	}
	root := ToTree(s)
	return root, root.ValidateInvariant(), nil
}
