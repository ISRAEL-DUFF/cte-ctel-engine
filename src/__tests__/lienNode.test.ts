import { describe } from 'node:test';
import { LienNode } from '../services/ctel';

describe('LienNode Token Management', () => {
  let rootNode: LienNode;
  
  beforeEach(() => {
    // Create a fresh root node for each test
    rootNode = new LienNode({
      account: 'Root',
      tokens: [
        { tokenType: 'credit', account: 'Root', value: 1000 },
        { tokenType: 'debit', account: 'Root', value: 200 }
      ]
    });
  });

  describe('Initial State', () => {
    it('should initialize with correct unspent tokens', () => {
      expect(rootNode.unspentCreditTokens.length).toBe(1);
      expect(rootNode.unspentCreditTokens[0].value).toBe(1000);
      expect(rootNode.unspentDebitTokens.length).toBe(1);
      expect(rootNode.unspentDebitTokens[0].value).toBe(200);
      
      // Initially, no tokens should be spent
      expect(rootNode.spentCreditTokens.length).toBe(0);
      expect(rootNode.spentDebitTokens.length).toBe(0);
    });
  });

  describe('Token Splitting', () => {
    it('should mark tokens as spent when splitting', async () => {
      await rootNode.splitNode({
        tokens: [
          { tokenType: 'credit', account: 'ChildA', value: 400 },
          { tokenType: 'credit', account: 'ChildB', value: 300 }
        ]
      });

      // Should have 3 children (2 splits + 1 remainder)
      expect(rootNode.children.length).toBe(3);
      
      // Check spent status
      const spentTokens = rootNode.spentCreditTokens;
      expect(spentTokens.length).toBe(1);
      expect(spentTokens[0].value).toBe(1000); // Original token was spent
      
      // Check unspent remainder
      const unspentTokens = rootNode.unspentCreditTokens;
      expect(unspentTokens.length).toBe(0); // All credits were either spent or split
      
      // Check that we have a remainder node
      const remainderNode = rootNode.children.find(c => c.account === 'Root');
      expect(remainderNode).toBeDefined();
      expect(remainderNode?.unspentCreditTokens[0].value).toBe(300); // 1000 - 400 - 300 = 300 remaining
    });

    it('should handle splitting with debit liens', async () => {
      await rootNode.splitWithDebitLienNode({
        tokens: [
          { 
            token: { tokenType: 'credit', account: 'ChildWithLien', value: 500 },
            debitLien: 300
          },
          { 
            token: { tokenType: 'credit', account: 'ChildWithoutLien', value: 200 }
          }
        ]
      });

      // Should have 2 children (the two splits)
      expect(rootNode.children.length).toBe(2);
      
      // Check spent status on root - the original 1000 credit should be spent
      const spentCredits = rootNode.spentCreditTokens;
      expect(spentCredits.length).toBe(1);
      expect(spentCredits[0].value).toBe(1000);
      
      // Check unspent - should be none left at the root
      const unspentCredits = rootNode.unspentCreditTokens;
      expect(unspentCredits.length).toBe(0);
      
      // Debug: Log all children accounts
      console.log('Children accounts:', rootNode.children.map(c => c.account));
      
      // Check the child with lien
      const childWithLien = rootNode.children.find(c => c.account === 'ChildWithLien');
      console.log('ChildWithLien found:', childWithLien);
      expect(childWithLien).toBeDefined();
      // It should have an unspent credit token of 500 (do not assume ordering)
      const childWithLienCredits = childWithLien?.unspentCreditTokens || [];
      expect(childWithLienCredits.some(t => t.value === 500)).toBe(true);
      
      // Check the child without lien
      const childWithoutLien = rootNode.children.find(c => c.account === 'ChildWithoutLien');
      expect(childWithoutLien).toBeDefined();
      expect(childWithoutLien?.unspentCreditTokens[0].value).toBe(200);
      
      // Verify the debit lien was created in the child with lien
      const debitTokens = childWithLien?.allDebitTokens || [];
      expect(debitTokens.length).toBe(1);
      expect(debitTokens[0].value).toBe(300);
    });
  });

  describe('Token Querying', () => {
    it('should correctly report all tokens', async () => {
      // First split
      await rootNode.splitNode({
        tokens: [
          { tokenType: 'credit', account: 'ChildA', value: 400 },
          { tokenType: 'credit', account: 'ChildB', value: 300 }
        ]
      });

      // All tokens on the root should include only the original (spent) token; remainder lives in a child node
      const allCredits = rootNode.allCreditTokens;
      
      expect(allCredits.length).toBe(1);
      
      const spentCredits = allCredits.filter(t => t.spent);
      const unspentCredits = allCredits.filter(t => !t.spent);
      
      // The original token is spent; no unspent credit remains on the root
      expect(spentCredits.length).toBe(1);
      expect(unspentCredits.length).toBe(0);
      
      // The spent token should be the original 1000
      expect(spentCredits[0].value).toBe(1000);
      
      // The remainder node should have the unspent token
      const remainderNode = rootNode.children.find(c => c.account === 'Root');
      expect(remainderNode).toBeDefined();
      expect(remainderNode?.unspentCreditTokens[0].value).toBe(300);
    });
  });

  describe('Edge Cases', () => {
    it('should handle splitting exact amounts', async () => {
      await rootNode.splitNode({
        tokens: [
          { tokenType: 'credit', account: 'ChildA', value: 1000 }
        ]
      });

      // All credits should be spent in the root node
      expect(rootNode.unspentCreditTokens.length).toBe(0);
      expect(rootNode.spentCreditTokens.length).toBe(1);
      expect(rootNode.spentCreditTokens[0].value).toBe(1000);
      
      // Should have one child with the full amount
      expect(rootNode.children.length).toBe(1);
      expect(rootNode.children[0].account).toBe('ChildA');
      expect(rootNode.children[0].unspentCreditTokens[0].value).toBe(1000);
    });

    it('should throw when trying to spend more than available', async () => {
      await expect(
        rootNode.splitNode({
          tokens: [
            { tokenType: 'credit', account: 'ChildA', value: 1500 }
          ]
        })
      ).rejects.toThrow('Total tokens to split must not be larger than available unspent credit tokens');
    });
  });
});
