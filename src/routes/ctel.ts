import { Router, Request, Response } from 'express';
import { LienNode } from '../services/ctel';

const router = Router();

// Helper function to create a sample node hierarchy
function createSampleHierarchy() {
    // Create root node
    const root = new LienNode({
        account: "Root",
        tokens: [
            { tokenType: 'credit', value: 1000, account: 'Root' },
            { tokenType: 'debit', value: 200, account: 'Root' }
        ]
    });

    // Create child nodes
    const child1 = new LienNode({
        account: "Child1",
        tokens: [
            { tokenType: 'credit', value: 400, account: 'Child1' },
            { tokenType: 'debit', value: 100, account: 'Child1' }
        ]
    });

    const child2 = new LienNode({
        account: "Child2",
        tokens: [
            { tokenType: 'credit', value: 600, account: 'Child2' },
            { tokenType: 'debit', value: 100, account: 'Child2' }
        ]
    });

    // Add children to root
    root.children = [child1, child2];

    // Add a grandchild
    const grandChild = new LienNode({
        account: "GrandChild",
        tokens: [
            { tokenType: 'credit', value: 200, account: 'GrandChild' }
        ]
    });
    child1.children = [grandChild];

    return root;
}

async function createSampleHierarchy2() {
    // Create root node
    const root = new LienNode({
        account: "A",
        tokens: [
            { tokenType: 'credit', value: 1000, account: 'A' },
            { tokenType: 'debit', value: 1000, account: 'A' }
        ]
    });

    await root.splitNode({
        tokens: [
            { tokenType: 'credit', value: 300, account: 'B' },
        ]
    })
    const bNode = await root.getChildNode('B')

    if(!bNode) {
        throw new Error('Unable to find nodeeee B')
    }

    await bNode.splitNode({
        tokens: [
            { tokenType: 'credit', value: 200, account: 'E' },
        ]
    })
    const childBNode = await bNode.getChildNode('B')

    if(!childBNode) {
        throw new Error('Unable to find node child node B')
    }

    const c = await childBNode.splitWithDebitLienNode({
        tokens: [
            {
                token: { tokenType: 'credit', value: 40, account: 'B' },
                // Ensure lien does not exceed available unspent credit (100 at this point)
                debitLien: 80
            },
            {
                token: { tokenType: 'credit', value: 60, account: 'B' },
            }
        ]
    })
    // const c = await childBNode.splitNode({
    //     tokens: [
    //         { tokenType: 'credit', value: 100, account: 'B' },
    //     ]
    // })
    // console.log("C:",c.length, c[0].printTree(), c[0].creditLienTokens, c[0].debitLienTokens)

    const childChildBNode = await childBNode.getChildNode('B')

    if(!childChildBNode) {
        throw new Error('Unable to find node B')
    }

    await childChildBNode.splitNode({
        tokens: [
            { tokenType: 'credit', value: 100, account: 'G' },
        ]
    });

    return root;
}

async function createSampleHierarchy3() {
    // Create root node
    const root = new LienNode({
        account: "A",
        tokens: [
            { tokenType: 'credit', value: 1000, account: 'A' },
            { tokenType: 'debit', value: 1000, account: 'A' }
        ]
    });

    await root.splitNode({
        tokens: [
            { tokenType: 'credit', value: 300, account: 'B' },
        ]
    })
    const bNode = await root.getChildNode('B')

    if(!bNode) {
        throw new Error('Unable to find nodeeee B')
    }

    await bNode.splitNode({
        tokens: [
            { tokenType: 'credit', value: 200, account: 'E' },
        ]
    })
    const childBNode = await bNode.getChildNode('B')

    if(!childBNode) {
        throw new Error('Unable to find node child node B')
    }

    const c = await childBNode.splitWithDebitLienNode({
        tokens: [
            {
                token: { tokenType: 'credit', value: 100, account: 'B' },
                // Ensure lien does not exceed available unspent credit (100 at this point)
                debitLien: 500
            }
            // ,
            // {
            //     token: { tokenType: 'credit', value: 600, account: 'B' },
            // }
        ]
    })
    // const c = await childBNode.splitNode({
    //     tokens: [
    //         { tokenType: 'credit', value: 100, account: 'B' },
    //     ]
    // })
    // console.log("C:",c.length, c[0].printTree(), c[0].creditLienTokens, c[0].debitLienTokens)

    const childChildBNode = await childBNode.getChildNode('B')

    if(!childChildBNode) {
        throw new Error('Unable to find node B')
    }

    await childChildBNode.splitNode({
        tokens: [
            { tokenType: 'credit', value: 600, account: 'G' },
        ]
    });

    return root;
}

// Endpoint to get the tree representation
router.get('/tree', (req: Request, res: Response) => {
    try {
        const rootNode = createSampleHierarchy();
        const treeOutput = rootNode.printTree();
        const invariant = rootNode.validateInvariant();
        
        res.json({
            status: 'ok',
            tree: treeOutput,
            node: rootNode,
            invariant
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: error instanceof Error ? error.message : 'Unknown error occurred' 
        });
    }
});

// Endpoint to get the markdown representation with Mermaid diagram
router.get('/markdown', (req: Request, res: Response) => {
    try {
        const rootNode = createSampleHierarchy();
        const markdownOutput = rootNode.printMarkdown();
        
        // Set content type to markdown
        res.setHeader('Content-Type', 'text/markdown');
        res.send(markdownOutput);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: error instanceof Error ? error.message : 'Unknown error occurred' 
        });
    }
});

// Endpoint for the second sample
router.get('/sample2/markdown', async (req: Request, res: Response) => {
    try {
        const rootNode = await createSampleHierarchy2();
        const markdownOutput = rootNode.printMarkdown();
        
        // Set content type to markdown
        res.setHeader('Content-Type', 'text/markdown');
        res.send(markdownOutput);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: error instanceof Error ? error.message : 'Unknown error occurred' 
        });
    }
});

router.get('/sample3/markdown', async (req: Request, res: Response) => {
    try {
        const rootNode = await createSampleHierarchy3();
        const markdownOutput = rootNode.printMarkdown();
        
        // Set content type to markdown
        res.setHeader('Content-Type', 'text/markdown');
        res.send(markdownOutput);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: error instanceof Error ? error.message : 'Unknown error occurred' 
        });
    }
});

// Invariant endpoints
router.get('/invariant', (req: Request, res: Response) => {
    try {
        const rootNode = createSampleHierarchy();
        const inv = rootNode.validateInvariant();
        res.json({ status: 'ok', invariant: inv });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown error occurred'
        });
    }
});

router.get('/sample2/invariant', async (req: Request, res: Response) => {
    try {
        const rootNode = await createSampleHierarchy2();
        const inv = rootNode.validateInvariant();
        res.json({ status: 'ok', invariant: inv });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown error occurred'
        });
    }
});

router.get('/sample3/invariant', async (req: Request, res: Response) => {
    try {
        const rootNode = await createSampleHierarchy3();
        const inv = rootNode.validateInvariant();
        res.json({ status: 'ok', invariant: inv });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown error occurred'
        });
    }
});

// Legacy endpoint that returns both (for backward compatibility)
router.get('/', (req: Request, res: Response) => {
    try {
        const rootNode = createSampleHierarchy();
        
        res.json({
            status: 'ok',
            tree: rootNode.printTree(),
            markdown: rootNode.printMarkdown(),
            node: rootNode
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: error instanceof Error ? error.message : 'Unknown error occurred' 
        });
    }
});

export default router;
