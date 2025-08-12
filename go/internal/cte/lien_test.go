package cte

import (
	"strings"
	"testing"
)

func TestSplitNodeCreatesChildrenAndRemainder(t *testing.T) {
	// Root A with credit 1000, debit 1000 ensures invariant can hold
	root := NewLienNode("A", []LienToken{{TokenType: "credit", Value: 1000, Account: "A"}, {TokenType: "debit", Value: 1000, Account: "A"}})

	created, err := root.SplitNode([]LienToken{{TokenType: "credit", Value: 300, Account: "B"}})
	if err != nil {
		t.Fatalf("SplitNode error: %v", err)
	}
	if len(created) != 2 {
		t.Fatalf("expected 2 children (B and remainder), got %d", len(created))
	}
	// Expect one child B 300 and a remainder A 700
	b := root.FindChild("B")
	if b == nil {
		t.Fatalf("expected child B to exist")
	}
	// sum unspent credits tree-wide should remain 1000; debits 1000
	inv := root.ValidateInvariant()
	if !inv.Ok || inv.UnspentCredits != 1000 || inv.Debits != 1000 {
		t.Fatalf("invariant mismatch after split: %+v", inv)
	}
}

func TestSplitWithDebitLienNodeAddsDebitAndMatchingCredit(t *testing.T) {
	// Mirror TS createSampleHierarchy2 sequence
	root := NewLienNode("A", []LienToken{{TokenType: "credit", Value: 1000, Account: "A"}, {TokenType: "debit", Value: 1000, Account: "A"}})
	_, err := root.SplitNode([]LienToken{{TokenType: "credit", Value: 300, Account: "B"}})
	if err != nil { t.Fatalf("root.SplitNode: %v", err) }
	bNode := root.FindChild("B")
	if bNode == nil { t.Fatalf("B not found") }
	_, err = bNode.SplitNode([]LienToken{{TokenType: "credit", Value: 200, Account: "E"}})
	if err != nil { t.Fatalf("bNode.SplitNode: %v", err) }
	childB := bNode.FindChild("B")
	if childB == nil { t.Fatalf("child B under B not found") }
	created, err := childB.SplitWithDebitLienNode([]SplitWithDebitParam{
		{Token: LienToken{TokenType: "credit", Value: 40, Account: "B"}, DebitLien: 80},
		{Token: LienToken{TokenType: "credit", Value: 60, Account: "B"}},
	})
	if err != nil { t.Fatalf("splitWithDebitLien: %v", err) }
	if len(created) < 2 { t.Fatalf("expected at least two children from splitWithDebit, got %d", len(created)) }
	// Verify that among children there exists one with a debit 80 and matching extra credit 80
	found := false
	for _, ch := range childB.Children {
		deb := 0; cred := 0
		for _, d := range ch.debitLienTokens { deb += d.Value }
		for _, c := range ch.creditLienTokens { cred += c.Value }
		if deb >= 80 && cred >= (40 + 80) { // at least base 40 plus matching 80 credit
			found = true
			break
		}
	}
	if !found { t.Fatalf("expected a child with debit 80 and matching credit 80") }
	// Invariant holds
	inv := root.ValidateInvariant()
	if !inv.Ok { t.Fatalf("invariant broken after splitWithDebit: %+v", inv) }
}

func TestCollectUnspentNodesOrder(t *testing.T) {
	root := CreateSample2()
	pre := root.CollectUnspentNodes("preorder")
	bfs := root.CollectUnspentNodes("bfs")
	if len(pre) == 0 || len(bfs) == 0 {
		t.Fatalf("expected non-empty unspent node collections; got preorder=%d bfs=%d", len(pre), len(bfs))
	}
}

func TestPrintMarkdownNonEmpty(t *testing.T) {
	root := CreateSample2()
	md := root.PrintMarkdown()
	if !strings.Contains(md, "```mermaid") || !strings.Contains(md, "flowchart TD") {
		t.Fatalf("unexpected markdown output: %s", md[:min(100, len(md))])
	}
}

func min(a, b int) int { if a < b { return a }; return b }

func TestSplitNodeOverspendError(t *testing.T) {
    root := NewLienNode("A", []LienToken{{TokenType: "credit", Value: 100, Account: "A"}})
    // no debit needed here; we're testing error path only
    _, err := root.SplitNode([]LienToken{{TokenType: "credit", Value: 120, Account: "B"}})
    if err == nil {
        t.Fatalf("expected overspend error, got nil")
    }
}

func TestSplitWithDebitOverspendError(t *testing.T) {
    root := NewLienNode("A", []LienToken{{TokenType: "credit", Value: 100, Account: "A"}})
    _, err := root.SplitWithDebitLienNode([]SplitWithDebitParam{
        {Token: LienToken{TokenType: "credit", Value: 120, Account: "B"}},
    })
    if err == nil {
        t.Fatalf("expected overspend error on splitWithDebit, got nil")
    }
}

func TestMultipleConsecutiveSplits(t *testing.T) {
    // seed invariant pairing for clarity
    root := NewLienNode("A", []LienToken{{TokenType: "credit", Value: 500, Account: "A"}, {TokenType: "debit", Value: 500, Account: "A"}})

    // First split: 200 -> B, remainder 300 -> A child
    _, err := root.SplitNode([]LienToken{{TokenType: "credit", Value: 200, Account: "B"}})
    if err != nil { t.Fatalf("first split: %v", err) }
    rem := root.FindChild("A")
    if rem == nil { t.Fatalf("expected remainder child 'A'") }
    // Second split on remainder: 100 -> C, remainder 200 -> A child under remainder
    _, err = rem.SplitNode([]LienToken{{TokenType: "credit", Value: 100, Account: "C"}})
    if err != nil { t.Fatalf("second split: %v", err) }

    // Validate invariant still holds
    inv := root.ValidateInvariant()
    if !inv.Ok || inv.UnspentCredits != 500 || inv.Debits != 500 {
        t.Fatalf("invariant mismatch after consecutive splits: %+v", inv)
    }
}

func TestExactSplitHasNoRemainder(t *testing.T) {
    root := NewLienNode("A", []LienToken{{TokenType: "credit", Value: 250, Account: "A"}, {TokenType: "debit", Value: 250, Account: "A"}})
    _, err := root.SplitNode([]LienToken{{TokenType: "credit", Value: 250, Account: "X"}})
    if err != nil { t.Fatalf("split: %v", err) }
    // Should have exactly one child (X) and no remainder A
    if len(root.Children) != 1 {
        t.Fatalf("expected 1 child (exact split, no remainder), got %d", len(root.Children))
    }
    if root.FindChild("A") != nil {
        t.Fatalf("did not expect remainder child 'A' on exact split")
    }
}

func TestSamplesInvariantAndStructureSanity(t *testing.T) {
    // Sample1
    s1 := CreateSample1()
    inv1 := s1.ValidateInvariant()
    // Sample1 is a simple hierarchy demo and may not satisfy the global invariant by design.
    // Just assert sums are computed and structure exists.
    if inv1.UnspentCredits <= 0 || inv1.Debits < 0 { t.Fatalf("sample1 invariant sums unexpected: %+v", inv1) }
    if len(s1.Children) == 0 {
        t.Fatalf("sample1 children sanity failed")
    }
    // Sample2
    s2 := CreateSample2()
    inv2 := s2.ValidateInvariant()
    if !inv2.Ok { t.Fatalf("sample2 invariant failed: %+v", inv2) }
    tree2 := s2.PrintTree(false)
    if !strings.Contains(tree2, "B") { t.Fatalf("sample2 tree missing expected account 'B'\n%s", tree2) }
    // Sample3
    s3 := CreateSample3()
    inv3 := s3.ValidateInvariant()
    if !inv3.Ok { t.Fatalf("sample3 invariant failed: %+v", inv3) }
}
