package store

import (
	"fmt"
	"github.com/ISRAEL-DUFF/cte-ctel-engine/go/internal/cte"
)

// FromTree converts an in-memory LienNode tree into a flat Snapshot.
func FromTree(root *cte.LienNode) Snapshot {
	nodes := []NodeRow{}
	tokens := []TokenRow{}
	// deterministic preorder IDs to avoid account-path collisions
	idc := 0
	var dfs func(cur *cte.LienNode, parentID string)
	dfs = func(cur *cte.LienNode, parentID string) {
		idc++
		id := fmt.Sprintf("n%d", idc)
		nodes = append(nodes, NodeRow{ID: id, Account: cur.Account, ParentID: parentID})
		for _, t := range cur.AllCreditTokens() {
			tokens = append(tokens, TokenRow{NodeID: id, Type: "credit", Value: t.Value, Account: t.Account, Spent: t.Spent})
		}
		for _, t := range cur.AllDebitTokens() {
			tokens = append(tokens, TokenRow{NodeID: id, Type: "debit", Value: t.Value, Account: t.Account, Spent: false})
		}
		for _, ch := range cur.Children {
			dfs(ch, id)
		}
	}
	dfs(root, "")
	inv := root.ValidateInvariant()
	return Snapshot{
		Nodes: nodes,
		Tokens: tokens,
		Totals: TotalsRow{UnspentCredits: inv.UnspentCredits, Debits: inv.Debits},
	}
}

// ToTree materializes a LienNode tree from a Snapshot.
func ToTree(s Snapshot) *cte.LienNode {
	// Group tokens by node
	tkByNode := map[string][]TokenRow{}
	for _, tk := range s.Tokens {
		tkByNode[tk.NodeID] = append(tkByNode[tk.NodeID], tk)
	}
	// Build nodes with tokens
	nodeByID := map[string]*cte.LienNode{}
	for _, n := range s.Nodes {
		trs := tkByNode[n.ID]
		ctes := make([]cte.LienToken, 0, len(trs))
		for _, tr := range trs {
			if tr.Type == "credit" {
				ctes = append(ctes, cte.LienToken{TokenType: "credit", Value: tr.Value, Account: tr.Account, Spent: tr.Spent})
			} else {
				ctes = append(ctes, cte.LienToken{TokenType: "debit", Value: tr.Value, Account: tr.Account})
			}
		}
		nodeByID[n.ID] = cte.NewLienNode(n.Account, ctes)
	}
	// Wire parents/children
	var root *cte.LienNode
	for _, n := range s.Nodes {
		cur := nodeByID[n.ID]
		if n.ParentID == "" {
			root = cur
			continue
		}
		par := nodeByID[n.ParentID]
		cur.Parent = par
		par.Children = append(par.Children, cur)
	}
	return root
}

func joinPath(parts []string) string {
	res := ""
	for i, p := range parts {
		if i > 0 { res += "/" }
		res += p
	}
	return res
}
