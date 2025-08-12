interface LienToken {
    tokenType: 'credit' | 'debit';
    value: number;
    account: string;
    spent?: boolean;  // Tracks if token has been spent
    spentOn?: string; // Optional: tracks what operation spent this token
    id?: string;      // Unique identifier for each token
}

export class LienNode {
    // Track all tokens (both spent and unspent)
    private creditLienTokens: LienToken[] = [];
    private debitLienTokens: LienToken[] = [];
    
    // Getters for spent tokens (computed properties)

    constructor(config: {
        account: string,
        childrdren?: LienNode[],
        parent?: LienNode,
        tokens: LienToken[]
    }) {
        // TODO: validate this account
        this.account = config.account;
        this.parent = config.parent;

        // Initialize tokens with unique IDs and mark as unspent
        for(const token of config.tokens) {
            const tokenWithId = {
                ...token,
                id: token.id || `token_${Math.random().toString(36).substr(2, 9)}`,
                spent: false
            };

            if(token.tokenType === 'credit') {
                this.creditLienTokens.push(tokenWithId);
            } else {
                this.debitLienTokens.push(tokenWithId);
            }
        }

        /* TODO: validate each childrdren to ensure they:
            1. won't create cyclic link
            2. isn't a child of another node
        */
        if(config.childrdren) {
            this.children = config.childrdren.map(child => {
                child.parent = this;
                return child;
            })  
        }
    }

    children: LienNode[] = [];
    account: string;

    // Getter for unspent credit tokens
    get unspentCreditTokens(): LienToken[] {
        return this.creditLienTokens.filter(t => !t.spent);
    }

    // Getter for spent credit tokens
    get spentCreditTokens(): LienToken[] {
        return this.creditLienTokens.filter(t => t.spent);
    }

    // Getter for unspent debit tokens
    get unspentDebitTokens(): LienToken[] {
        return this.debitLienTokens.filter(t => !t.spent);
    }

    // Getter for spent debit tokens
    get spentDebitTokens(): LienToken[] {
        return this.debitLienTokens.filter(t => t.spent);
    }

    // Get all tokens (including spent ones)
    get allCreditTokens(): LienToken[] {
        // Return a copy of all credit tokens (both spent and unspent)
        return [...this.creditLienTokens];
    }

    get allDebitTokens(): LienToken[] {
        return [...this.debitLienTokens, ...this.spentDebitTokens];
    }

    // Helper to mark tokens as spent
    private markTokensAsSpent(tokens: LienToken[], reason: string = 'split'): void {
        tokens.forEach(token => {
            // Find and update the token in the appropriate array
            if (token.tokenType === 'credit') {
                const tokenToUpdate = this.creditLienTokens.find(t => t.id === token.id);
                if (tokenToUpdate) {
                    tokenToUpdate.spent = true;
                    tokenToUpdate.spentOn = reason;
                }
            } else {
                const tokenToUpdate = this.debitLienTokens.find(t => t.id === token.id);
                if (tokenToUpdate) {
                    tokenToUpdate.spent = true;
                    tokenToUpdate.spentOn = reason;
                }
            }
        });
    }

    // Helper to get tokens to spend based on amount needed
    private getTokensToSpend(amount: number, tokenType: 'credit' | 'debit'): {tokens: LienToken[], remaining: number} {
        const tokens: LienToken[] = [];
        let remaining = amount;
        const sourceTokens = tokenType === 'credit' ? this.unspentCreditTokens : this.unspentDebitTokens;

        for (const token of sourceTokens) {
            if (remaining <= 0) break;
            
            const amountToTake = Math.min(remaining, token.value);
            if (amountToTake > 0) {
                tokens.push({
                    ...token,
                    value: amountToTake
                });
                remaining -= amountToTake;
            }
        }

        return { tokens, remaining };
    }
    parent: LienNode | null | undefined;


    async splitNode(params: {
        tokens: LienToken [],
    }) {
        // Calculate total available unspent credits
        const availableCredits = this.unspentCreditTokens.reduce((sum, t) => sum + t.value, 0);
        let totalSplitAmount = 0;

        // Validate the split request
        for(const token of params.tokens) {
            if(token.tokenType === 'debit') {
                throw new Error('Only Credit tokens can be split');
            }

            totalSplitAmount += token.value;

            if(totalSplitAmount > availableCredits) {
                throw new Error('Total tokens to split must not be larger than available unspent credit tokens');
            }
        }

        // Get the tokens that will be spent in this split
        const { tokens: tokensToSpend } = this.getTokensToSpend(totalSplitAmount, 'credit');
        
        // Mark the spent tokens
        this.markTokensAsSpent(tokensToSpend, 'split');

        // Clear existing children to prevent duplicates
        this.children = [];

        // Create new child nodes with the split amounts
        for(const token of params.tokens) {
            this.children.push(new LienNode({
                account: token.account,
                parent: this,
                tokens: [{
                    tokenType: 'credit',
                    account: token.account,
                    value: token.value,
                    id: `split_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
                }]
            }));
        }

        // Only add remainder if not zero
        const remainingAmount = availableCredits - totalSplitAmount;
        if(remainingAmount > 0) {
            this.children.push(new LienNode({
                account: this.account,
                parent: this,
                tokens: [{
                    tokenType: 'credit',
                    account: this.account,
                    value: remainingAmount,
                    id: `remainder_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
                }]
            }));
        }

        return this.children;
    }

    

    async splitWithDebitLienNode(params: {
        tokens: {
            token: LienToken, 
            debitLien?: number  // when this is given, it means that this account should be placed on-lien using the specified amount
        } [],
    }) {
        const children: LienNode[] = [];

        // 1) Determine how much credit to split OUT of the parent (sum of child credit tokens only)
        const totalSplitCredits = params.tokens.reduce((sum, entry) => sum + (entry.token?.value || 0), 0);
        const availableCredits = this.unspentCreditTokens.reduce((sum, t) => sum + t.value, 0);
        if (totalSplitCredits > availableCredits) {
            throw new Error(`Total tokens to split must not be larger than available unspent credit tokens`);
        }

        // 2) Spend parent's credits equal to totalSplitCredits (spawn-not-mutate model)
        if (totalSplitCredits > 0) {
            const { tokens: toSpend } = this.getTokensToSpend(totalSplitCredits, 'credit');
            this.markTokensAsSpent(toSpend, 'split_with_debit_lien');
        }

        // 3) Create child nodes for each requested split
        for (const entry of params.tokens) {
            const childTokens: LienToken[] = [];
            // The split credit for this child (unspent)
            childTokens.push({
                tokenType: 'credit',
                account: entry.token.account,
                value: entry.token.value,
                id: entry.token.id || `token_${Date.now()}_${Math.random().toString(36).substr(2,6)}`,
                spent: false,
            });

            // If a debit lien is specified, reflect ledger-withheld funds by adding a debit and a matching credit
            if (entry.debitLien && entry.debitLien > 0) {
                childTokens.push({
                    tokenType: 'debit',
                    account: entry.token.account,
                    value: entry.debitLien,
                    id: `lien_debit_${Date.now()}_${Math.random().toString(36).substr(2,6)}`,
                    spent: false,
                });
                childTokens.push({
                    tokenType: 'credit',
                    account: entry.token.account,
                    value: entry.debitLien,
                    id: `lien_credit_${Date.now()}_${Math.random().toString(36).substr(2,6)}`,
                    spent: false,
                });
            }

            const child = new LienNode({
                account: entry.token.account,
                parent: this,
                tokens: childTokens,
            });
            children.push(child);
        }

        // 4) Spawn remainder back to the parent account as a new child (unspent)
        const remainder = availableCredits - totalSplitCredits;
        if (remainder > 0) {
            const remainderNode = new LienNode({
                account: this.account,
                parent: this,
                tokens: [{ tokenType: 'credit', account: this.account, value: remainder }],
            });
            children.push(remainderNode);
        }

        // Attach new children
        this.children = [...this.children, ...children];
        return this.children;
    }

    async getChildNode(account: string) {
        return this.children.find(child => child.account === account)
    }

    // ----- Tree-wide invariant helpers -----
    private sumUnspentCreditsRecursive(): number {
        const here = this.unspentCreditTokens.reduce((sum, t) => sum + t.value, 0);
        const children = this.children.reduce((sum, c) => sum + c.sumUnspentCreditsRecursive(), 0);
        return here + children;
    }

    private sumDebitsRecursive(): number {
        const here = this.allDebitTokens.reduce((sum, t) => sum + t.value, 0);
        const children = this.children.reduce((sum, c) => sum + c.sumDebitsRecursive(), 0);
        return here + children;
    }

    validateInvariant(): { ok: boolean; unspentCredits: number; debits: number } {
        const unspentCredits = this.sumUnspentCreditsRecursive();
        const debits = this.sumDebitsRecursive();
        return { ok: unspentCredits === debits, unspentCredits, debits };
    }

    private async generateDebitNode(params: {
        tokens: LienToken[];
        account?: string;
    }): Promise<LienNode> {
        const node = new LienNode({
            account: params.account || this.account,
            parent: this,
            tokens: params.tokens
        });
        return node;
    }


    private async placeLien(amount: number): Promise<boolean> {
        // Step 1: Grab user's ledger account represented by this.account
        // Step 2: Check user's account balance (that also includes previous debit liens)
        // Step 3: 
        //      IF user has enough funds to cover up for the lien, then go ahead to create a debit lien transaction in the db
        //      ELSE return an error
        

        // Step 4: Create a corresponding credit lien for this account
        // Step 5: return the credit lien as a token


        // MOCK this function for now
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // after Steps 1 through 3, this is what happens
                // this.debitLienTokens.push({
                //     tokenType: 'debit',
                //     value: amount,
                //     account: this.account
                // })

                // Steps 4 and 5
                resolve(true)
            }, 100)
        })
    }

    /**
     * Prints a tree representation of the LienNode hierarchy
     * @param indent - Used internally for indentation, do not provide
     * @param last - Used internally to determine tree structure, do not provide
     */
    printTree(indent: string = '', last: boolean = true, showSpent: boolean = false): string {
        // Build the current node's representation
        let result = indent;
        result += last ? '└── ' : '├── ';
        result += `[${this.account}] `;
        
        // Get all token information
        const unspentCredits = this.unspentCreditTokens;
        const unspentDebits = this.unspentDebitTokens;
        const spentCredits = this.spentCreditTokens;
        const spentDebits = this.spentDebitTokens;
        
        // Calculate token totals
        const unspentCreditTotal = unspentCredits.reduce((sum, t) => sum + t.value, 0);
        const unspentDebitTotal = unspentDebits.reduce((sum, t) => sum + t.value, 0);
        
        // Display unspent tokens
        result += `(Unspent: +${unspentCreditTotal}/-${unspentDebitTotal}`;
        
        // Optionally display spent tokens
        if (showSpent) {
            const spentCreditTotal = spentCredits.reduce((sum, t) => sum + t.value, 0);
            const spentDebitTotal = spentDebits.reduce((sum, t) => sum + t.value, 0);
            result += `, Spent: +${spentCreditTotal}/-${spentDebitTotal}`;
        }
        
        result += ')';
        
        // Add detailed token info if any tokens exist
        const hasTokens = this.creditLienTokens.length > 0 || this.debitLienTokens.length > 0 || 
                         spentCredits.length > 0 || spentDebits.length > 0;
        
        if (hasTokens) {
            result += ' [';
            
            // Helper function to format token list
            const formatTokens = (tokens: LienToken[], prefix: string) => {
                return tokens
                    .filter(token => showSpent || !token.spent)
                    .map(t => {
                        let tokenStr = `${prefix}${t.value}(${t.account}`;
                        if (t.id) tokenStr += `#${t.id.substring(0, 4)}`;
                        if (t.spent) {
                            tokenStr += ',spent';
                        } else {
                            tokenStr += ',unspent';
                        }
                        if (t.spentOn) tokenStr += `,${t.spentOn}`;
                        return tokenStr + ')';
                    });
            };
            
            // Avoid duplication: include all credit/debit tokens once; spent visibility
            // is controlled by the showSpent flag in the filter above.
            const tokenStrings = [
                ...formatTokens(this.creditLienTokens, '+'),
                ...formatTokens(this.debitLienTokens, '-')
            ];
            
            result += tokenStrings.join(', ');
            result += ']';
        }
        
        // Add children
        if (this.children.length > 0) {
            const childIndent = indent + (last ? '    ' : '│   ');
            result += '\n';
            this.children.forEach((child, i) => {
                const isLast = i === this.children.length - 1;
                result += child.printTree(childIndent, isLast);
                if (i < this.children.length - 1) {
                    result += '\n';
                }
            });
        }
        
        return result;
    }

    /**
     * Generates a Mermaid diagram in Markdown format to visualize the node hierarchy
     * @returns Markdown string with Mermaid diagram
     */
    printMarkdown(): string {
        let nodeId = 0;
        const nodeMap = new Map<LienNode, string>();
        let mermaidCode = '```mermaid\ngraph TD\n';
        
        // Generate unique IDs for each node and build the node definitions
        const processNode = (node: LienNode, parentId: string | null = null) => {
            // Generate a unique ID for this node if it doesn't have one
            if (!nodeMap.has(node)) {
                const id = `N${++nodeId}`;
                const creditTotal = node.creditLienTokens.reduce((sum, t) => sum + t.value, 0);
                const debitTotal = node.debitLienTokens.reduce((sum, t) => sum + t.value, 0);
                
                // Create a label with account name and token summaries
                const label = [
                    `**${node.account}**`,
                    creditTotal > 0 ? `+${creditTotal}` : '',
                    // debitTotal > 0 ? `-${debitTotal}` : ''
                ].filter(Boolean).join(' ');
                
                // Add the node definition
                mermaidCode += `    ${id}["${label}"]\n`;
                nodeMap.set(node, id);
                
                // Process all children
                node.children.forEach(child => processNode(child, id));
            }
            
            // Add the edge if this is not the root node
            const currentNodeId = nodeMap.get(node)!;
            if (parentId) {
                mermaidCode += `    ${parentId} --> ${currentNodeId}\n`;
            }
        };
        
        // Start processing from the root node
        processNode(this);
        
        // Add token details as subgraphs with spent/unspent annotations
        nodeMap.forEach((id, node) => {
            const creditTokens = node.creditLienTokens;
            const debitTokens = node.debitLienTokens;

            if (creditTokens.length > 0 || debitTokens.length > 0) {
                const subgraphId = `subgraph${id}`;
                mermaidCode += `    subgraph ${subgraphId}[ ]\n`;

                creditTokens.forEach((t, i) => {
                    const tokenId = `${id}Tc${i}`;
                    const status = t.spent ? 'spent' : 'unspent';
                    const label = `+${t.value} (${t.account}) ${status}`;
                    const klass = t.spent ? 'token-spent' : 'token-unspent';
                    mermaidCode += `        ${tokenId}["${label}"]:::${klass}\n`;
                    mermaidCode += `        ${id} --> ${tokenId}\n`;
                });

                debitTokens.forEach((t, i) => {
                    const tokenId = `${id}Td${i}`;
                    const status = t.spent ? 'spent' : 'unspent';
                    const label = `-${t.value} (${t.account}) ${status}`;
                    const klass = t.spent ? 'token-debit-spent' : 'token-debit-unspent';
                    mermaidCode += `        ${tokenId}["${label}"]:::${klass}\n`;
                    mermaidCode += `        ${id} --> ${tokenId}\n`;
                });

                mermaidCode += '    end\n';
            }
        });
        
        // Add styles (distinct for spent/unspent and debit/credit)
        mermaidCode += '    classDef token-unspent fill:#f0fff4,stroke:#2f855a,stroke-width:1px,font-size:10px;\n';
        mermaidCode += '    classDef token-spent fill:#f7fafc,stroke:#a0aec0,stroke-width:1px,font-size:10px;\n';
        mermaidCode += '    classDef token-debit-unspent fill:#fff5f5,stroke:#c53030,stroke-width:1px,font-size:10px;\n';
        mermaidCode += '    classDef token-debit-spent fill:#f7fafc,stroke:#e53e3e,stroke-width:1px,font-size:10px;\n';
        mermaidCode += '```';
        
        // Invariant summary
        const inv = this.validateInvariant();

        // Create the markdown with a title and the mermaid diagram
        return `# Lien Node Hierarchy\n\n${mermaidCode}\n\n` +
               `## Details\n` +
               `- **Total Nodes**: ${nodeId}\n` +
               `- **Root Account**: ${this.account}\n` +
               `- **Invariant OK**: ${inv.ok} (Unspent Credits: ${inv.unspentCredits}, Debits: ${inv.debits})\n\n` +
               `## Legend\n` +
               `- Green border: credit token (unspent)\n` +
               `- Gray border: credit token (spent)\n` +
               `- Red border: debit token (unspent)\n` +
               `- Dark red border: debit token (spent)\n`;
    }
}