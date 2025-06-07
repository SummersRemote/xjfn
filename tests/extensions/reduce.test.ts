/**
 * Tests for reduce() functional operation
 * 
 * Tests data aggregation into a single value.
 * Reduce is a terminal operation that returns a value instead of this.
 */

import { XJFN } from '../../src/XJFN';
import { 
  XNode, 
  XNodeType, 
  createCollection, 
  createRecord, 
  createField, 
  addChild,
  addAttribute,
  hasAttributes 
} from '../../src/core/xnode';

// Import extension to register methods
import '../../src/extensions/functional';

describe('reduce() operation', () => {
  let xjfn: XJFN;

  beforeEach(() => {
    xjfn = new XJFN();
  });

  // Helper to create test tree structure
  function createTestTree(): XNode {
    const root = createCollection('sales');
    
    const sale1 = createRecord('sale');
    addAttribute(sale1, 'id', '1');
    addChild(sale1, createField('product', 'Widget'));
    addChild(sale1, createField('amount', '299.99'));
    addChild(sale1, createField('quantity', '3'));
    addChild(sale1, createField('region', 'North'));
    
    const sale2 = createRecord('sale');
    addAttribute(sale2, 'id', '2');
    addChild(sale2, createField('product', 'Gadget'));
    addChild(sale2, createField('amount', '149.50'));
    addChild(sale2, createField('quantity', '2'));
    addChild(sale2, createField('region', 'South'));
    
    const sale3 = createRecord('sale');
    addAttribute(sale3, 'id', '3');
    addChild(sale3, createField('product', 'Widget'));
    addChild(sale3, createField('amount', '599.98'));
    addChild(sale3, createField('quantity', '6'));
    addChild(sale3, createField('region', 'North'));
    
    addChild(root, sale1);
    addChild(root, sale2);
    addChild(root, sale3);
    
    return root;
  }

  describe('basic reduction', () => {
    it('should count all nodes', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      const count = xjfn.reduce((acc, node) => acc + 1, 0);
      
      expect(count).toBe(16); // 1 root + 3 sales + 12 fields
      expect(typeof count).toBe('number');
    });

    it('should count nodes by type', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      const typeCounts = xjfn.reduce((acc, node) => {
        acc[node.type] = (acc[node.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      expect(typeCounts[XNodeType.COLLECTION]).toBe(1);
      expect(typeCounts[XNodeType.RECORD]).toBe(3);
      expect(typeCounts[XNodeType.FIELD]).toBe(12);
    });

    it('should sum numeric values', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      const totalAmount = xjfn.reduce((acc, node) => {
        if (node.name === 'amount' && typeof node.value === 'string') {
          return acc + Number(node.value);
        }
        return acc;
      }, 0);
      
      expect(totalAmount).toBeCloseTo(1049.47); // 299.99 + 149.50 + 599.98
    });

    it('should collect values into array', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      const products = xjfn.reduce((acc, node) => {
        if (node.name === 'product') {
          acc.push(node.value as string);
        }
        return acc;
      }, [] as string[]);
      
      expect(products).toEqual(['Widget', 'Gadget', 'Widget']);
      expect(products.length).toBe(3);
    });
  });

  describe('complex reduction', () => {
    it('should build summary object', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      const summary = xjfn.reduce((acc, node) => {
        acc.totalNodes++;
        
        if (node.type === XNodeType.FIELD) {
          acc.fieldCount++;
          
          if (node.name === 'amount') {
            acc.totalRevenue += Number(node.value);
          }
          
          if (node.name === 'quantity') {
            acc.totalQuantity += Number(node.value);
          }
        }
        
        if (hasAttributes(node)) {
          acc.nodesWithAttributes++;
        }
        
        return acc;
      }, {
        totalNodes: 0,
        fieldCount: 0,
        totalRevenue: 0,
        totalQuantity: 0,
        nodesWithAttributes: 0
      });
      
      expect(summary.totalNodes).toBe(16);
      expect(summary.fieldCount).toBe(12);
      expect(summary.totalRevenue).toBeCloseTo(1049.47);
      expect(summary.totalQuantity).toBe(11); // 3 + 2 + 6
      expect(summary.nodesWithAttributes).toBe(3); // 3 sale records
    });

    it('should group data by attribute', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      const salesByRegion = xjfn.reduce((acc, node) => {
        if (node.name === 'region') {
          const region = node.value as string;
          if (!acc[region]) {
            acc[region] = [];
          }
          
          // Find the parent sale record
          let parent = node.parent;
          while (parent && parent.name !== 'sale') {
            parent = parent.parent;
          }
          
          if (parent) {
            const idAttr = parent.attributes?.find(attr => attr.name === 'id');
            if (idAttr) {
              acc[region].push(idAttr.value);
            }
          }
        }
        return acc;
      }, {} as Record<string, any[]>);
      
      expect(salesByRegion.North).toEqual(['1', '3']);
      expect(salesByRegion.South).toEqual(['2']);
    });

    it('should calculate weighted averages', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      interface SaleData {
        amount: number;
        quantity: number;
        saleId?: string;
      }
      
      const saleData = xjfn.reduce((acc, node) => {
        if (node.name === 'sale' && node.type === XNodeType.RECORD) {
          const idAttr = node.attributes?.find(attr => attr.name === 'id');
          const saleId = idAttr?.value as string;
          
          if (saleId) {
            acc[saleId] = { amount: 0, quantity: 0, saleId };
          }
        }
        
        if ((node.name === 'amount' || node.name === 'quantity') && node.parent) {
          // Find the sale ID from parent
          let parent = node.parent;
          while (parent && parent.name !== 'sale') {
            parent = parent.parent;
          }
          
          if (parent) {
            const idAttr = parent.attributes?.find(attr => attr.name === 'id');
            const saleId = idAttr?.value as string;
            
            if (saleId && acc[saleId]) {
              if (node.name === 'amount') {
                acc[saleId].amount = Number(node.value);
              } else if (node.name === 'quantity') {
                acc[saleId].quantity = Number(node.value);
              }
            }
          }
        }
        
        return acc;
      }, {} as Record<string, SaleData>);
      
      // Calculate average price per unit
      const avgPrice = Object.values(saleData).reduce((total, sale) => {
        return total + (sale.amount / sale.quantity);
      }, 0) / Object.keys(saleData).length;
      
      expect(avgPrice).toBeCloseTo(91.66); // Average of 99.997, 74.75, 99.997
    });
  });

  describe('edge cases', () => {
    it('should handle empty tree', () => {
      const emptyTree = createCollection('empty');
      xjfn.xnode = emptyTree;
      
      const count = xjfn.reduce((acc, node) => acc + 1, 0);
      
      expect(count).toBe(1); // Just the empty collection
    });

    it('should handle single node tree', () => {
      const singleNode = createField('test', 'value');
      xjfn.xnode = singleNode;
      
      const result = xjfn.reduce((acc, node) => {
        acc.name = node.name;
        acc.value = node.value;
        return acc;
      }, {} as any);
      
      expect(result.name).toBe('test');
      expect(result.value).toBe('value');
    });

    it('should handle different return types', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      // String accumulator
      const nodeNames = xjfn.reduce((acc, node) => {
        return acc + node.name + ',';
      }, '');
      
      expect(typeof nodeNames).toBe('string');
      expect(nodeNames).toContain('sales,');
      expect(nodeNames).toContain('sale,');
      expect(nodeNames).toContain('product,');
      
      // Boolean accumulator
      const hasWidget = xjfn.reduce((acc, node) => {
        return acc || (node.value === 'Widget');
      }, false);
      
      expect(hasWidget).toBe(true);
      
      // Set accumulator
      const uniqueNames = xjfn.reduce((acc, node) => {
        acc.add(node.name);
        return acc;
      }, new Set<string>());
      
      expect(uniqueNames.has('sales')).toBe(true);
      expect(uniqueNames.has('sale')).toBe(true);
      expect(uniqueNames.has('product')).toBe(true);
      expect(uniqueNames.size).toBe(6); // sales, sale, product, amount, quantity, region
    });
  });

  describe('error handling', () => {
    it('should throw if no source is set', () => {
      expect(() => {
        xjfn.reduce((acc, node) => acc + 1, 0);
      }).toThrow('No source set');
    });

    it('should propagate reducer errors (fail fast)', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      expect(() => {
        xjfn.reduce((acc, node) => {
          throw new Error('Reducer error');
        }, 0);
      }).toThrow('Reducer error');
    });

    it('should validate reducer is a function', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      expect(() => {
        (xjfn as any).reduce('not a function', 0);
      }).toThrow();
    });
  });

  describe('terminal operation behavior', () => {
    it('should return value directly (not XJFN instance)', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      const result = xjfn.reduce((acc, node) => acc + 1, 0);
      
      expect(result).toBe(16);
      expect(result).not.toBeInstanceOf(XJFN);
      expect(typeof result).toBe('number');
    });

    it('should not be chainable', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      const result = xjfn.reduce((acc, node) => acc + 1, 0);
      
      // Result should not have XJFN methods
      expect((result as any).filter).toBeUndefined();
      expect((result as any).map).toBeUndefined();
      expect((result as any).reduce).toBeUndefined();
    });

    it('should work at end of chain', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      const count = xjfn
        .filter(node => node.type === XNodeType.FIELD)
        .filter(node => node.name === 'amount')
        .reduce((acc, node) => acc + 1, 0);
      
      expect(count).toBe(3); // Three amount fields
    });
  });

  describe('integration with other operations', () => {
    it('should work after filter', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      const totalAmount = xjfn
        .filter(node => node.name === 'amount')
        .reduce((acc, node) => acc + Number(node.value), 0);
      
      expect(totalAmount).toBeCloseTo(1049.47);
    });

    it('should work after map', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      const processedCount = xjfn
        .map(node => ({ ...node, processed: true }))
        .reduce((acc, node) => {
          return (node as any).processed ? acc + 1 : acc;
        }, 0);
      
      expect(processedCount).toBe(16); // All nodes should be processed
    });

    it('should work after select', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      const selectedCount = xjfn
        .select(node => node.name === 'product')
        .reduce((acc, node) => acc + 1, 0);
      
      expect(selectedCount).toBe(4); // 3 product fields + 1 results container
    });

    it('should work after branch/merge', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      const modifiedAmounts = xjfn
        .branch(node => node.name === 'amount')
        .map(node => ({ ...node, value: Number(node.value) * 1.1 }))
        .merge()
        .reduce((acc, node) => {
          if (node.name === 'amount') {
            acc.push(Number(node.value));
          }
          return acc;
        }, [] as number[]);
      
      expect(modifiedAmounts.length).toBe(3);
      expect(modifiedAmounts[0]).toBeCloseTo(329.989); // 299.99 * 1.1
      expect(modifiedAmounts[1]).toBeCloseTo(164.45);  // 149.50 * 1.1
      expect(modifiedAmounts[2]).toBeCloseTo(659.978); // 599.98 * 1.1
    });
  });
});