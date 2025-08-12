# Lien Node Visualization Tool

A web-based visualization tool for exploring and understanding Lien Node hierarchies, built with TypeScript, Node.js, and Express.

## Features

- Interactive visualization of Lien Node hierarchies using Mermaid.js
- Real-time rendering of node relationships and token balances
- Support for both credit and debit tokens
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

- `GET /` - Serves the web interface
- `GET /health` - Health check endpoint
- `GET /cte` - Get complete node hierarchy (legacy endpoint)
- `GET /cte/tree` - Get node hierarchy as JSON
- `GET /cte/markdown` - Get node hierarchy as Mermaid markdown
- `GET /cte/sample2/markdown` - Get sample hierarchy 2 as Mermaid markdown

## LienNode Class

The core `LienNode` class represents a node in the hierarchy with the following properties:

- `account`: String identifier for the node
- `debitLienTokens`: Array of debit tokens
- `creditLienTokens`: Array of credit tokens
- `children`: Array of child LienNodes
- `parent`: Reference to parent LienNode (if any)

### Key Methods

- `splitNode()`: Split the node with new tokens
- `splitWithDebitLienNode()`: Split with specific debit lien configuration
- `getChildNode()`: Find a child node by account name
- `printTree()`: Generate a text representation of the node hierarchy
- `printMarkdown()`: Generate a Mermaid diagram of the node hierarchy

## Visualizing the Hierarchy

The web interface provides an interactive way to visualize the node hierarchy:

1. Load different sample hierarchies using the provided buttons
2. View the Mermaid diagram of the node relationships
3. Download the markdown representation of the current view

## License

This project is open source and available under the [MIT License](LICENSE).