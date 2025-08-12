interface LienToken {
    tokenType: 'credit' | 'debit'
    value: number;
    account: string;
}

export class LienNode {
    constructor(config: {
        account: string,
        childrdren?: LienNode[],
        parent?: LienNode,
        tokens: LienToken[]
    }) {
        // TODO: validate this account
        this.account = config.account;
        this.parent = config.parent;

        for(const token of config.tokens) {
            if(token.tokenType === 'credit') {
                // TODO: validate
                this.creditLienTokens.push(token);
            } else {
                // TODO: confirm if this debit lien was actually placed.
                this.debitLienTokens.push(token);
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

    children: LienNode[] = []
    debitLienTokens: LienToken[] = []
    creditLienTokens: LienToken[] = []
    account: string;
    parent: LienNode | null | undefined;


    async splitNode(params: {
        tokens: LienToken [],
    }) {
        // const totalCreditToken = this.creditLienTokens.reduce((prevToken, currToken) => {
        //     prevToken.value += currToken.value
        //     return prevToken;
        // })
        let totalCreditTokens = 0
        for(const t of this.creditLienTokens) {
            totalCreditTokens += t.value;
        }
        let totalSplitAmount = 0;

        // validation
        for(const token of params.tokens) {
            if(token.tokenType === 'debit') {
                throw new Error('Only Credit tokens can be split')   /// only credit tokens can be splited
            }

            totalSplitAmount += token.value;

            if(totalSplitAmount > totalCreditTokens) {
                throw new Error('Total tokens to split must not be larger than parent credit token')
            }
        }

        // split
        const amountDiff = totalCreditTokens - totalSplitAmount;
        for(const token of params.tokens) {
            // console.log("Token:",token, token.account)
            this.children.push(new LienNode({
                account: token.account,
                parent: this,
                tokens: [{
                    tokenType: 'credit',
                    account: token.account,
                    value: token.value
                }]
            }))
        }

        // if there's token left, redirect it back to this parent account
        if(amountDiff > 0) {
            console.log('Amount diff:', amountDiff, 'parent:', this.account)
            this.children.push(new LienNode({
                account: this.account,
                parent: this,
                tokens: [
                    {
                        tokenType: 'credit',
                        account: this.account,
                        value: amountDiff
                    }
                ]
            }))
        }

        return this.children;
    }

    

    async splitWithDebitLienNode(params: {
        tokens: {
            token: LienToken, 
            debitLien?: number  // when this is given, it means that this account should be placed on-lien using the specified amount
        } [],
    }) {
        const children: LienNode[] = []
        for(const t of params.tokens) {
            if(t.debitLien && t.debitLien > 0) {
                const success = await this.placeLien(t.debitLien);
                if(!success) {
                    throw new Error('Unable to place lien')
                }

                const node = await this.generateDebitNode({
                    tokens: [{
                        tokenType: 'credit',
                        account: this.account,
                        value: t.debitLien
                    },
                    {
                        tokenType: 'debit',
                        account: this.account,
                        value: t.debitLien
                    },
                    {
                        tokenType: 'credit',
                        account: this.account,
                        value: t.token.value
                    }
                    ]
                })
                // console.log("NODE:",node.printTree())
                children.push(node)
            } else {
                children.push(new LienNode({
                    account: t.token.account,
                    parent: this,
                    tokens: [
                        t.token
                    ]
                }))
            }
        }

        this.children = [...this.children, ...children];
        // console.log("TREE:", {
        //     parent: this.printTree(),
        //     pCredits: this.creditLienTokens.reduce((sum, t) => sum + t.value, 0),
        //     pDebits: this.debitLienTokens.reduce((sum, t) => sum + t.value, 0),
        //     child: children[0].printTree(),
        //     cCredits: children[0].creditLienTokens.reduce((sum, t) => sum + t.value, 0),
        //     cDebits: children[0].debitLienTokens.reduce((sum, t) => sum + t.value, 0),
        // })
        return this.children;
    }

    async getChildNode(account: string) {
        return this.children.find(child => child.account === account)
    }

    private async generateDebitNode(params: {
        tokens: LienToken [],
    }) {
        // validation
        if(params.tokens.length !== 3) {
            throw new Error('Debit Node must not be have token length other than 3')
        }

        // create node
        const node = new LienNode({
                account: this.account,
                parent: this,
                tokens: params.tokens
            })

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
            console.log('Placing lien of...', amount)
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
    printTree(indent: string = '', last: boolean = true): string {
        // Build the current node's representation
        let result = indent;
        result += last ? '└── ' : '├── ';
        result += `[${this.account}] `;
        
        // Add token information
        const creditTotal = this.creditLienTokens.reduce((sum, t) => sum + t.value, 0);
        const debitTotal = this.debitLienTokens.reduce((sum, t) => sum + t.value, 0);
        result += `(Credits: ${creditTotal}, Debits: ${debitTotal})`;
        
        // Add detailed token info if any tokens exist
        if (this.creditLienTokens.length > 0 || this.debitLienTokens.length > 0) {
            result += '\n';
            const tokenIndent = indent + (last ? '    ' : '│   ');
            
            // Print credit tokens
            this.creditLienTokens.forEach((token, i) => {
                const isLast = i === this.creditLienTokens.length - 1 && this.debitLienTokens.length === 0;
                result += tokenIndent + (isLast ? '└── ' : '├── ');
                result += `+${token.value} (${token.account})`;
                if (i < this.creditLienTokens.length - 1 || this.debitLienTokens.length > 0) {
                    result += '\n';
                }
            });
            
            // Print debit tokens
            this.debitLienTokens.forEach((token, i) => {
                const isLast = i === this.debitLienTokens.length - 1;
                result += (i === 0 && this.creditLienTokens.length > 0 ? '\n' : '') + 
                         tokenIndent + (isLast ? '└── ' : '├── ');
                result += `-${token.value} (${token.account})`;
                if (i < this.debitLienTokens.length - 1) {
                    result += '\n';
                }
            });
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
        
        // Add token details as subgraphs
        nodeMap.forEach((id, node) => {
            const tokens = [
                ...node.creditLienTokens.map(t => `+${t.value} (${t.account})`),
            ];
            const debitTokens = [
                ...node.debitLienTokens.map(t => `-${t.value} (${t.account})`)
            ];
            
            if (tokens.length > 0 || debitTokens.length > 0) {
                const subgraphId = `subgraph${id}`;
                mermaidCode += `    subgraph ${subgraphId}[ ]\n`;
                tokens.forEach((token, i) => {
                    const tokenId = `${id}T${i}`;
                    mermaidCode += `        ${tokenId}["${token}"]:::token\n`;
                    mermaidCode += `        ${id} --> ${tokenId}\n`;
                });
                debitTokens.forEach((token, i) => {
                    const tokenId = `${id}T${i}-debit`;
                    mermaidCode += `        ${tokenId}["${token}"]:::token-debit\n`;
                    mermaidCode += `        ${id} --> ${tokenId}\n`;
                });
                mermaidCode += '    end\n';
            }
        });
        
        // Add styles
        mermaidCode += '    classDef token fill:#f9f9f9,stroke:#666,stroke-width:1px,font-size:10px;\n';
        mermaidCode += '    classDef token-debit fill:#f9f9f9,stroke:#666,stroke-width:1px,font-size:10px,stroke:#ff0000;\n';
        mermaidCode += '```';
        
        // Create the markdown with a title and the mermaid diagram
        return `# Lien Node Hierarchy\n\n${mermaidCode}\n\n` +
               `## Details\n` +
               `- **Total Nodes**: ${nodeId}\n` +
               `- **Root Account**: ${this.account}\n`;
    }
}