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