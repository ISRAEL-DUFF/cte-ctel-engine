# Lien Node Visualization Tool

A web-based visualization tool and API for exploring and validating Lien Node hierarchies, built with TypeScript, Node.js, and Express.

## Features

- Interactive visualization of Lien Node hierarchies using Mermaid.js
- Spent/unspent tracking for immutable credit/debit tokens (per node)
- Debit liens introduce matching unspent credit liquidity into the tree
- Tree-wide invariant validation (double-entry): SUM(Unspent Credits) == SUM(Debits)
- Real-time rendering of node relationships and token balances with status
- Sample data generation for testing and demonstration
- Responsive web interface for desktop and mobile

## Project Structure

```
cte/
├── public/                 # Static files and frontend assets
│   └── index.html          # Main web interface
├── src/
│   ├── index.ts            # Express server setup and configuration
│   ├── routes/
│   │   ├── ctel.ts         # CTE (Credit Token Engine) routes
│   │   └── health.ts        # Health check endpoint
│   └── services/
│       └── ctel.ts         # Core LienNode class and business logic
├── .env.example           # Example environment variables
├── package.json           # Project dependencies and scripts
└── tsconfig.json          # TypeScript configuration
```

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- TypeScript 4.7+

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and configure if needed

### Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3001`

### Building for Production

```bash
npm run build
npm start
```

## API Endpoints

- `GET /` — Serves the web interface
- `GET /health` — Health check endpoint
- `GET /cte` — Get complete node hierarchy (legacy endpoint)
- `GET /cte/tree` — Get node hierarchy as JSON (includes `invariant` summary)
- `GET /cte/markdown` — Get default sample as Mermaid markdown
- `GET /cte/invariant` — Invariant summary for default sample (JSON)
- `GET /cte/sample2/markdown` — Get sample hierarchy 2 as Mermaid markdown
- `GET /cte/sample2/invariant` — Invariant summary for sample 2 (JSON)
- `GET /cte/sample3/markdown` — Get sample hierarchy 3 as Mermaid markdown
- `GET /cte/sample3/invariant` — Invariant summary for sample 3 (JSON)

Example:

```bash
curl http://localhost:3001/cte/invariant
curl -H 'Accept: text/markdown' http://localhost:3001/cte/sample3/markdown
```

## Working Principles

This engine models a hierarchical lien-token ledger with strict immutability and a global accounting invariant. The same principles apply in both implementations: TypeScript (`src/services/ctel.ts`) and Go (`go/internal/cte/lien.go`).

### Core Entities

- __LienToken__
  - Types: `credit` or `debit`.
  - Fields: `value`, `account`, `spent` (credits only), `id` (TS), and immutable once created.
  - Debit tokens are never “spent” by operations; they represent external ledger liens.
- __LienNode__
  - Fields: `account`, `parent`, `children`, `creditLienTokens[]`, `debitLienTokens[]`.
  - Methods include splitting, traversal, invariant checks, and rendering.

### Immutability & Spawn‑Not‑Mutate

- __Tokens are immutable__: Values and types never change after creation.
- __Splits do not mutate parent tokens__: When a node performs a split:
  - All of the parent’s current credit tokens are marked as `spent`.
  - New child nodes are created for each target credit allocation.
  - Any leftover (remainder) credit is represented as a new child under the parent’s own account. The parent’s direct credits remain spent forever.
- Result: Every split leaves a clear historical trail. No token’s value is edited; instead, new tokens are spawned.

### Debit Lien Liquidity

- When placing a debit lien for a child (via `splitWithDebitLienNode`):
  - A __debit token__ is added on that child, representing externally held funds.
  - A __matching credit token__ is also created on that child, introducing unspent liquidity that mirrors the lien.
  - Parent credits are only spent by the explicit split amounts, not by the lien amount.

### Global Invariant (Tree‑Wide)

- The ledger enforces: `SUM(UNSPENT CREDIT TOKENS) == SUM(DEBIT TOKENS)` across the entire tree.
- Rationale:
  - Unspent credits represent available liquidity.
  - Debits represent liens/obligations held externally.
  - Every operation (splits, debit liens) must preserve this equality.
- Helpers:
  - TS: `validateInvariant()`, `sumUnspentCreditsRecursive()`, `sumDebitsRecursive()` on `LienNode`.
  - Go: `ValidateInvariant()`, `SumUnspentCreditsRecursive()`, `SumDebitsRecursive()` on `LienNode`.

### Spent/Unspent Semantics

- __Credit tokens__ can be spent (when the node performs a split). Spent credits remain recorded but are excluded from unspent sums.
- __Debit tokens__ are not spent by the system (they reflect the external ledger). All debit values contribute to the invariant’s right-hand side.

### Child Management

- Children are always added via splits.
- Convenience lookups:
  - TS: `getChildNode(account)`
  - Go: `FindChild(account)` and `EnsureChild(account, tokens...)`

### Traversal of Unspent Nodes

- The system exposes fast traversal to list nodes that still hold unspent credit:
  - Orders supported: `preorder` and `bfs`.
  - TS: `collectUnspentNodes(order)`; Go: `CollectUnspentNodes(order)`.
  - API endpoints surface serialized paths for display.

### Rendering

- __Tree text__: `printTree(showSpent?)` (TS) and `PrintTree(showSpent bool)` (Go) aggregate per-node token totals.
- __Mermaid Markdown__: `printMarkdown()` (TS) and `PrintMarkdown()` (Go) render:
  - Node graph (parent → child edges).
  - Per-node token subgraphs, each token labeled with `+value/-value (account) spent|unspent` and styled via classes.
  - Legend and invariant summary accompany the diagram.

### API Parity (Node & Go)

- Both backends expose:
  - `/cte/tree` — text tree + invariant.
  - `/cte/markdown` — Mermaid diagram.
  - `/cte/invariant` — JSON invariant.
  - `/cte/unspent?order=preorder|bfs` — unspent nodes listing with paths.
  - Sample variants: `/cte/sample1/*`, `/cte/sample2/*`, `/cte/sample3/*`.
- Frontend (`public/index.html`) can toggle backend base URL to compare outputs.

### Error Handling & Validation

- Splits validate that requested credit allocations do not exceed available unspent credits at the splitting node.
- Debit lien amounts should be chosen consistently with liquidity expectations; routes may respond with 400/500 on invalid inputs.

### Testing & Determinism

- TS includes Jest tests validating splits, debit liens, remainder behavior, spent/unspent correctness, and the invariant.
- Go aims to mirror these tests. Deterministic token IDs are not required for invariant correctness; visual outputs focus on values and status.

### Design Guarantees

- __Auditability__: Every split converts parent credits to `spent` and spawns new tokens, preserving history.
- __Consistency__: The global invariant is upheld after every operation.
- __Extensibility__: New operations should adhere to immutability and preserve the invariant, introducing matching debits/credits as needed.

## LienNode Class

The core `LienNode` class represents a node in the hierarchy with immutable tokens and spent/unspent flags:

- `account`: String identifier for the node
- `debitLienTokens`: Array of debit tokens
- `creditLienTokens`: Array of credit tokens
- `children`: Array of child `LienNode`
- `parent`: Reference to parent `LienNode` (if any)
- Spent/unspent getters:
  - `unspentCreditTokens`, `spentCreditTokens`
  - `unspentDebitTokens`, `spentDebitTokens`
  - `allCreditTokens`, `allDebitTokens`

### Key Methods

- `splitNode(params)`: Split credits out of the node into child nodes.
  - Parent node’s original credit tokens are always marked as spent.
  - Any leftover credit is spawned as a new child under the parent account (spawn-not-mutate).
- `splitWithDebitLienNode(params)`: Split credits and optionally place a debit lien for a child.
  - Spends only the credits specified for the splits.
  - If `debitLien` is set, creates a debit token and a matching credit token on the child (introduces unspent credit liquidity); parent credits are not consumed by the lien amount.
  - Always spawns a remainder child under the parent for leftover credit.
- `getChildNode(account)`: Find a child node by account name.
- `printTree(showSpent?)`: Text representation including token totals. Each token shows `spent` or `unspent`.
- `printMarkdown()`: Mermaid diagram with token subgraphs. Tokens are labeled with `spent`/`unspent` and styled distinctly for credit/debit.
- Invariant helpers: `validateInvariant()`, `sumUnspentCreditsRecursive()`, `sumDebitsRecursive()`.

### Accounting Model

- __Spawn-not-mutate__: Splits never mutate existing tokens. Parent tokens become spent; remainder credits are represented as a new child under the parent account.
- __Debit-lien liquidity__: Every debit lien introduces a matching credit token on the same child, representing unspent liquidity mirrored by the lien; this does not spend parent credits.
- __Invariant (tree-wide)__: `SUM(UNSPENT CREDIT TOKENS) == SUM(DEBIT TOKENS)`.

## Visualizing the Hierarchy

The web interface (`public/index.html`) provides an interactive way to visualize and validate:

1. Load different samples (Default, Sample 2, Sample 3).
2. Mermaid diagram renders the hierarchy and token subgraphs.
3. Invariant panel shows real-time status (OK/FAIL) with totals for Unspent Credits and Debits.
4. Download the markdown representation of the current view via the footer link.

Legend (also present in Markdown output):

- Green border: credit token (unspent)
- Gray border: credit token (spent)
- Red border: debit token (unspent)
- Dark red border: debit token (spent)

## Testing

Run tests with Jest:

```bash
npm test
```

Coverage includes initialization, splitting, debit liens, spent/unspent correctness, edge cases, and invariant validation.

## License

This project is open source and available under the [MIT License](LICENSE).