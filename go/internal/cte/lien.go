package cte

import (
	"fmt"
	"strings"
)

type LienToken struct {
	TokenType string // "credit" | "debit"
	Value     int
	Account   string
	Spent     bool
	ID        string
}

type LienNode struct {
	Account          string
	Parent           *LienNode
	Children         []*LienNode
	creditLienTokens []LienToken
	debitLienTokens  []LienToken
}

func NewLienNode(account string, tokens []LienToken, children ...*LienNode) *LienNode {
	n := &LienNode{Account: account}
	for _, t := range tokens {
		if t.TokenType == "credit" {
			n.creditLienTokens = append(n.creditLienTokens, t)
		} else {
			n.debitLienTokens = append(n.debitLienTokens, t)
		}
	}
	for _, c := range children {
		if c != nil {
			c.Parent = n
			n.Children = append(n.Children, c)
		}
	}
	return n
}

// ----- Child helpers -----
// FindChild returns the first direct child with the given account, or nil if not found.
func (n *LienNode) FindChild(account string) *LienNode {
	for _, ch := range n.Children {
		if ch.Account == account {
			return ch
		}
	}
	return nil
}

// EnsureChild returns an existing child with account or creates one (with optional tokens) and returns it.
func (n *LienNode) EnsureChild(account string, tokens ...LienToken) *LienNode {
	if existing := n.FindChild(account); existing != nil {
		return existing
	}
	child := NewLienNode(account, tokens)
	child.Parent = n
	n.Children = append(n.Children, child)
	return child
}

// ----- Token getters -----
func (n *LienNode) UnspentCreditTokens() []LienToken {
	res := make([]LienToken, 0, len(n.creditLienTokens))
	for _, t := range n.creditLienTokens {
		if !t.Spent {
			res = append(res, t)
		}
	}
	return res
}

func (n *LienNode) AllDebitTokens() []LienToken {
	res := make([]LienToken, 0, len(n.debitLienTokens))
	res = append(res, n.debitLienTokens...)
	return res
}

// AllCreditTokens returns all credit tokens (spent and unspent).
func (n *LienNode) AllCreditTokens() []LienToken {
	res := make([]LienToken, 0, len(n.creditLienTokens))
	res = append(res, n.creditLienTokens...)
	return res
}

// ----- Invariant helpers -----
func (n *LienNode) SumUnspentCreditsRecursive() int {
	sum := 0
	var dfs func(*LienNode)
	dfs = func(cur *LienNode) {
		for _, t := range cur.creditLienTokens {
			if !t.Spent {
				sum += t.Value
			}
		}
		for _, ch := range cur.Children {
			dfs(ch)
		}
	}
	dfs(n)
	return sum
}

func (n *LienNode) SumDebitsRecursive() int {
	sum := 0
	var dfs func(*LienNode)
	dfs = func(cur *LienNode) {
		for _, t := range cur.debitLienTokens {
			sum += t.Value
		}
		for _, ch := range cur.Children {
			dfs(ch)
		}
	}
	dfs(n)
	return sum
}

func (n *LienNode) ValidateInvariant() Invariant {
	un := n.SumUnspentCreditsRecursive()
	db := n.SumDebitsRecursive()
	return Invariant{Ok: un == db, UnspentCredits: un, Debits: db}
}

// ----- Split helpers -----
func (n *LienNode) totalUnspentCredits() int {
	sum := 0
	for _, t := range n.creditLienTokens {
		if !t.Spent {
			sum += t.Value
		}
	}
	return sum
}

func (n *LienNode) markAllCreditsSpent(reason string) {
	// Reason is currently unused; kept for parity with TS
	for i := range n.creditLienTokens {
		n.creditLienTokens[i].Spent = true
	}
}

// SplitNode spends all parent's credits and creates children for requested credits, plus a remainder child under parent account.
func (n *LienNode) SplitNode(tokens []LienToken) ([]*LienNode, error) {
	// Validate inputs
	req := 0
	for _, t := range tokens {
		if t.TokenType != "credit" || t.Value <= 0 {
			return nil, fmt.Errorf("invalid token in split: must be positive credit")
		}
		req += t.Value
	}

	total := n.totalUnspentCredits()
	if req > total {
		return nil, fmt.Errorf("requested split %d exceeds available unspent %d", req, total)
	}

	n.markAllCreditsSpent("split")

	// Create children for each requested credit
	created := make([]*LienNode, 0, len(tokens)+1)
	for _, t := range tokens {
		child := NewLienNode(t.Account, []LienToken{{TokenType: "credit", Value: t.Value, Account: t.Account}})
		child.Parent = n
		n.Children = append(n.Children, child)
		created = append(created, child)
	}

	// Remainder child
	rem := total - req
	if rem > 0 {
		remainder := NewLienNode(n.Account, []LienToken{{TokenType: "credit", Value: rem, Account: n.Account}})
		remainder.Parent = n
		n.Children = append(n.Children, remainder)
		created = append(created, remainder)
	}

	return created, nil
}

type SplitWithDebitParam struct {
	Token     LienToken
	DebitLien int // if > 0, create debit+matching credit on the child
}

// SplitWithDebitLienNode implements spawn-not-mutate; debit liens introduce matching credit on the target child.
func (n *LienNode) SplitWithDebitLienNode(params []SplitWithDebitParam) ([]*LienNode, error) {
	req := 0
	for _, p := range params {
		if p.Token.TokenType != "credit" || p.Token.Value <= 0 {
			return nil, fmt.Errorf("invalid token in splitWithDebit: must be positive credit")
		}
		req += p.Token.Value
	}

	total := n.totalUnspentCredits()
	if req > total {
		return nil, fmt.Errorf("requested split %d exceeds available unspent %d", req, total)
	}

	n.markAllCreditsSpent("splitWithDebit")

	created := make([]*LienNode, 0, len(params)+1)
	for _, p := range params {
		// Child with the credit split
		child := NewLienNode(p.Token.Account, []LienToken{{TokenType: "credit", Value: p.Token.Value, Account: p.Token.Account}})
		if p.DebitLien > 0 {
			// Add debit lien and matching credit liquidity to the same child
			child.debitLienTokens = append(child.debitLienTokens, LienToken{TokenType: "debit", Value: p.DebitLien, Account: p.Token.Account})
			child.creditLienTokens = append(child.creditLienTokens, LienToken{TokenType: "credit", Value: p.DebitLien, Account: p.Token.Account})
		}
		child.Parent = n
		n.Children = append(n.Children, child)
		created = append(created, child)
	}

	rem := total - req
	if rem > 0 {
		remainder := NewLienNode(n.Account, []LienToken{{TokenType: "credit", Value: rem, Account: n.Account}})
		remainder.Parent = n
		n.Children = append(n.Children, remainder)
		created = append(created, remainder)
	}

	return created, nil
}

// ----- Traversal -----
func (n *LienNode) CollectUnspentNodes(order string) []*LienNode {
	if order == "bfs" {
		return n.collectBFS()
	}
	return n.collectPreorder()
}

func (n *LienNode) collectPreorder() []*LienNode {
	res := []*LienNode{}
	stack := []*LienNode{n}
	for len(stack) > 0 {
		last := stack[len(stack)-1]
		stack = stack[:len(stack)-1]
		if len(last.UnspentCreditTokens()) > 0 {
			res = append(res, last)
		}
		for i := len(last.Children) - 1; i >= 0; i-- { // preserve left-to-right
			stack = append(stack, last.Children[i])
		}
	}
	return res
}

func (n *LienNode) collectBFS() []*LienNode {
	res := []*LienNode{}
	q := []*LienNode{n}
	for len(q) > 0 {
		cur := q[0]
		q = q[1:]
		if len(cur.UnspentCreditTokens()) > 0 {
			res = append(res, cur)
		}
		q = append(q, cur.Children...)
	}
	return res
}

// ----- Rendering -----
func (n *LienNode) PrintTree(showSpent bool) string {
	var b strings.Builder
	var dfs func(node *LienNode, indent string, last bool)
	dfs = func(node *LienNode, indent string, last bool) {
		prefix := "├─"
		nextIndent := indent + "│  "
		if last {
			prefix = "└─"
			nextIndent = indent + "   "
		}
		credits := 0
		for _, t := range node.creditLienTokens {
			if showSpent || !t.Spent {
				credits += t.Value
			}
		}
		debits := 0
		for _, t := range node.debitLienTokens {
			debits += t.Value
		}
		fmt.Fprintf(&b, "%s%s %s (+%d -%d)\n", indent, prefix, node.Account, credits, debits)
		for i, ch := range node.Children {
			dfs(ch, nextIndent, i == len(node.Children)-1)
		}
	}
	dfs(n, "", true)
	return b.String()
}

func (n *LienNode) PrintMarkdown() string { 
    // Rich Mermaid output mirroring TS: nodes/edges, token subgraphs, classes, legend, invariant
    var b strings.Builder
    b.WriteString("# Lien Node Hierarchy\n\n")
    b.WriteString("```mermaid\n")
    b.WriteString("flowchart TD\n")

    // Map nodes to IDs
    id := 0
    nodeMap := map[*LienNode]string{}
    var ensureID func(*LienNode) string
    ensureID = func(cur *LienNode) string {
        if v, ok := nodeMap[cur]; ok {
            return v
        }
        id++
        nid := fmt.Sprintf("N%d", id)
        nodeMap[cur] = nid
        return nid
    }

    // Edges and ensure IDs
    var walk func(*LienNode)
    walk = func(cur *LienNode) {
        _ = ensureID(cur)
        for _, ch := range cur.Children {
            chID := ensureID(ch)
            fmt.Fprintf(&b, "    %s[%q] --> %s[%q]\n", nodeMap[cur], cur.Account, chID, ch.Account)
            walk(ch)
        }
    }
    walk(n)

    // Token subgraphs per node
    for node, nid := range nodeMap {
        if len(node.creditLienTokens) == 0 && len(node.debitLienTokens) == 0 {
            continue
        }
        subgraphID := "subgraph" + nid
        fmt.Fprintf(&b, "    subgraph %s[ ]\n", subgraphID)
        // Credits
        for i, t := range node.creditLienTokens {
            tokID := fmt.Sprintf("%sTc%d", nid, i)
            status := "unspent"
            class := "token-unspent"
            if t.Spent {
                status = "spent"
                class = "token-spent"
            }
            label := fmt.Sprintf("+%d (%s) %s", t.Value, t.Account, status)
            fmt.Fprintf(&b, "        %s[\"%s\"]:::%s\n", tokID, label, class)
            fmt.Fprintf(&b, "        %s --> %s\n", nid, tokID)
        }
        // Debits
        for i, t := range node.debitLienTokens {
            tokID := fmt.Sprintf("%sTd%d", nid, i)
            status := "unspent"
            class := "token-debit-unspent"
            if t.Spent {
                status = "spent"
                class = "token-debit-spent"
            }
            label := fmt.Sprintf("-%d (%s) %s", t.Value, t.Account, status)
            fmt.Fprintf(&b, "        %s[\"%s\"]:::%s\n", tokID, label, class)
            fmt.Fprintf(&b, "        %s --> %s\n", nid, tokID)
        }
        b.WriteString("    end\n")
    }

    // Styles similar to TS
    b.WriteString("    classDef token-unspent fill:#eaffea,stroke:#2a7,stroke-width:1px;\n")
    b.WriteString("    classDef token-spent fill:#ffefef,stroke:#c44,stroke-width:1px,stroke-dasharray: 3 3;\n")
    b.WriteString("    classDef token-debit-unspent fill:#e6f0ff,stroke:#36c,stroke-width:1px;\n")
    b.WriteString("    classDef token-debit-spent fill:#f0e6ff,stroke:#63c,stroke-width:1px,stroke-dasharray: 3 3;\n")

    b.WriteString("```\n")

    // Invariant summary
    inv := n.ValidateInvariant()
    fmt.Fprintf(&b, "\n- Invariant OK: %t (Unspent Credits: %d, Debits: %d)\n", inv.Ok, inv.UnspentCredits, inv.Debits)
    return b.String()
}

func buildPath(n *LienNode) []string {
    path := []string{}
    for cur := n; cur != nil; cur = cur.Parent {
        path = append(path, cur.Account)
    }
    // reverse
    for i, j := 0, len(path)-1; i < j; i, j = i+1, j-1 {
        path[i], path[j] = path[j], path[i]
    }
    return path
}

func serializeUnspent(root *LienNode, order string) []UnspentItem {
    nodes := root.CollectUnspentNodes(order)
    items := make([]UnspentItem, 0, len(nodes))
    for _, n := range nodes {
        un := 0
        for _, t := range n.UnspentCreditTokens() {
            un += t.Value
        }
        items = append(items, UnspentItem{Account: n.Account, Unspent: un, Path: buildPath(n)})
    }
    return items
}
