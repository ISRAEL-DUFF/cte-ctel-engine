package cte

// CreateSample1 mirrors the TS createSampleHierarchy():
// Root("Root") with tokens: credit 1000, debit 200
// Children: Child1(credit 400, debit 100) with GrandChild(credit 200), and Child2(credit 600, debit 100)
func CreateSample1() *LienNode {
    root := NewLienNode("Root", []LienToken{
        {TokenType: "credit", Value: 1000, Account: "Root"},
        {TokenType: "debit", Value: 200, Account: "Root"},
    })

    child1 := NewLienNode("Child1", []LienToken{
        {TokenType: "credit", Value: 400, Account: "Child1"},
        {TokenType: "debit", Value: 100, Account: "Child1"},
    })
    child2 := NewLienNode("Child2", []LienToken{
        {TokenType: "credit", Value: 600, Account: "Child2"},
        {TokenType: "debit", Value: 100, Account: "Child2"},
    })

    grandChild := NewLienNode("GrandChild", []LienToken{
        {TokenType: "credit", Value: 200, Account: "GrandChild"},
    })
    child1.Children = append(child1.Children, grandChild)
    grandChild.Parent = child1

    root.Children = append(root.Children, child1, child2)
    child1.Parent = root
    child2.Parent = root

    return root
}

// CreateSample2 mirrors the TS createSampleHierarchy2() sequence exactly.
func CreateSample2() *LienNode {
    // Root A with credit 1000, debit 1000
    root := NewLienNode("A", []LienToken{
        {TokenType: "credit", Value: 1000, Account: "A"},
        {TokenType: "debit", Value: 1000, Account: "A"},
    })

    // root.splitNode -> 300 to B
    _, _ = root.SplitNode([]LienToken{{TokenType: "credit", Value: 300, Account: "B"}})
    bNode := root.FindChild("B")
    if bNode == nil { return root }

    // bNode.splitNode -> 200 to E, remainder B under B
    _, _ = bNode.SplitNode([]LienToken{{TokenType: "credit", Value: 200, Account: "E"}})
    childBNode := bNode.FindChild("B")
    if childBNode == nil { return root }

    // childBNode.splitWithDebitLienNode -> {40 to B with debitLien 80}, {60 to B}
    _, _ = childBNode.SplitWithDebitLienNode([]SplitWithDebitParam{
        {Token: LienToken{TokenType: "credit", Value: 40, Account: "B"}, DebitLien: 80},
        {Token: LienToken{TokenType: "credit", Value: 60, Account: "B"}},
    })

    // childChildBNode = childBNode.getChildNode('B'), then splitNode 100 to G
    childChildBNode := childBNode.FindChild("B")
    if childChildBNode != nil {
        _, _ = childChildBNode.SplitNode([]LienToken{{TokenType: "credit", Value: 100, Account: "G"}})
    }

    return root
}

// CreateSample3 mirrors the TS createSampleHierarchy3() sequence exactly.
func CreateSample3() *LienNode {
    // Root A with credit 1000, debit 1000
    root := NewLienNode("A", []LienToken{
        {TokenType: "credit", Value: 1000, Account: "A"},
        {TokenType: "debit", Value: 1000, Account: "A"},
    })

    // root.splitNode -> 300 to B
    _, _ = root.SplitNode([]LienToken{{TokenType: "credit", Value: 300, Account: "B"}})
    bNode := root.FindChild("B")
    if bNode == nil { return root }

    // bNode.splitNode -> 200 to E, remainder B under B
    _, _ = bNode.SplitNode([]LienToken{{TokenType: "credit", Value: 200, Account: "E"}})
    childBNode := bNode.FindChild("B")
    if childBNode == nil { return root }

    // childBNode.splitWithDebitLienNode -> {100 to B with debitLien 500}
    _, _ = childBNode.SplitWithDebitLienNode([]SplitWithDebitParam{
        {Token: LienToken{TokenType: "credit", Value: 100, Account: "B"}, DebitLien: 500},
    })

    // childChildBNode = childBNode.getChildNode('B'), then splitNode 600 to G
    childChildBNode := childBNode.FindChild("B")
    if childChildBNode != nil {
        _, _ = childChildBNode.SplitNode([]LienToken{{TokenType: "credit", Value: 600, Account: "G"}})
    }

    return root
}
