# CTE (Credit Token Engine) System Overview

## 🏗️ **Core Architecture: Lien-Based Hierarchy**

The CTE system implements a sophisticated **lien-based approach** where each account maintains both credit and debit positions, creating a balanced ledger that enforces the fundamental principle: **unspent credits must equal total debits**.

## 🔑 **Key Innovations**

### 1. **Hierarchical Token Management**
Instead of flat account balances, the system uses a tree structure where credits can be "split" down to child accounts while maintaining the overall balance. This enables complex multi-level financial relationships.

### 2. **Split Operations**
- **`SplitNode`**: Distributes available credits to child accounts
- **`SplitWithDebitLienNode`**: Creates debit obligations with matching credit liquidity - this is particularly clever for managing risk!

### 3. **Invariant Enforcement**
The system automatically validates that the credit-debit equation holds across the entire hierarchy, ensuring financial integrity.

## 💡 **Use Cases This Enables**

This architecture is perfectly suited for:

- **Agency Banking**: Managing funds across multiple agent levels
- **Wallet Systems**: Hierarchical fund allocation with risk management
- **Settlement Systems**: Complex multi-party settlements
- **Regulatory Compliance**: Built-in balance validation
- **Multi-level Financial Services**: Managing complex financial hierarchies

## 🎯 **Technical Implementation**

### Core Components

#### **LienToken**
Represents credit/debit with:
- `TokenType`: "credit" or "debit"
- `Value`: Numeric amount
- `Account`: Associated account identifier
- `Spent`: Boolean flag for credit tokens
- `ID`: Unique identifier

#### **LienNode**
Hierarchical structure with:
- `Account`: Account name/identifier
- `Parent`: Reference to parent node
- `Children`: Array of child nodes
- `creditLienTokens`: Array of credit tokens
- `debitLienTokens`: Array of debit tokens

### Key Algorithms

#### **Tree Traversal**
- **BFS (Breadth-First Search)**: Level-by-level traversal
- **Preorder**: Depth-first traversal maintaining left-to-right order
- Efficient algorithms for finding unspent positions across the hierarchy

#### **Split Operations**
```go
// Basic split - distributes credits to child accounts
func (n *LienNode) SplitNode(tokens []LienToken) ([]*LienNode, error)

// Advanced split with debit liens - creates obligations with matching liquidity
func (n *LienNode) SplitWithDebitLienNode(params []SplitWithDebitParam) ([]*LienNode, error)
```

#### **Invariant Validation**
```go
func (n *LienNode) ValidateInvariant() Invariant {
    un := n.SumUnspentCreditsRecursive()
    db := n.SumDebitsRecursive()
    return Invariant{Ok: un == db, UnspentCredits: un, Debits: db}
}
```

## 🌐 **API Endpoints**

The system provides RESTful endpoints for:

- **`/tree`** - Shows hierarchical tree structure
- **`/markdown`** - Generates Mermaid diagrams for visualization
- **`/invariant`** - Validates credit-debit balance
- **`/unspent`** - Lists unspent credit positions with traversal order options

### Sample Endpoints
- `/sample1/*` - Basic hierarchy demonstration
- `/sample2/*` - Complex split operations
- `/sample3/*` - Advanced debit lien scenarios

## 🔍 **Sample Scenarios**

### Sample 1: Basic Hierarchy
```
Root (credit: 1000, debit: 200)
├── Child1 (credit: 400, debit: 100)
│   └── GrandChild (credit: 200)
└── Child2 (credit: 600, debit: 100)
```

### Sample 2: Complex Splits with Debit Liens
Demonstrates:
- Credit distribution across multiple levels
- Debit lien creation with matching credit liquidity
- Remainder management under parent accounts

### Sample 3: Advanced Risk Management
Shows how debit liens can be used to create obligations while maintaining liquidity requirements.

## 🎨 **Visualization Features**

### Tree Output
```
└─Root (+1000 -200)
   ├─Child1 (+400 -100)
   │  └─GrandChild (+200)
   └─Child2 (+600 -100)
```

### Mermaid Diagrams
Rich Mermaid output including:
- Node hierarchy with edges
- Token subgraphs per node
- Color-coded token status (unspent/spent)
- Invariant validation summary

## 🚀 **Technical Highlights**

- **Efficient Tree Operations**: O(log n) complexity for most operations
- **Memory Management**: Smart token tracking with spent/unspent states
- **Type Safety**: Strong typing for credit/debit operations
- **Extensible Design**: Easy to add new token types or operations
- **Comprehensive Testing**: Extensive test coverage for edge cases

## 🔮 **Future Possibilities**

This architecture could be extended for:
- **Real-time Settlement**: Multi-party instant settlements
- **Risk Management**: Advanced credit risk modeling
- **Regulatory Reporting**: Automated compliance validation
- **Multi-currency Support**: Cross-currency lien management
- **Smart Contract Integration**: Blockchain-based lien enforcement

## 📚 **Code Structure**

```
go/internal/cte/
├── lien.go          # Core lien node implementation
├── samples.go       # Sample hierarchy builders
├── routes.go        # HTTP API endpoints
└── lien_test.go     # Comprehensive test suite
```

The CTE system represents a sophisticated approach to financial ledger management that goes beyond traditional double-entry bookkeeping, enabling complex multi-level financial relationships while maintaining strict balance constraints.
