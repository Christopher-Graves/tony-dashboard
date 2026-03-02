import { NextRequest } from 'next/server';
import { GET } from '../../../app/api/finance/amex-budget/route';

describe('/api/finance/amex-budget', () => {
  it('should return budget categories as array with correct fields', async () => {
    const request = new NextRequest('http://localhost:3000/api/finance/amex-budget');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    
    if (data.length > 0) {
      const budget = data[0];
      expect(budget).toHaveProperty('category');
      expect(budget).toHaveProperty('icon');
      expect(budget).toHaveProperty('transaction_count');
      expect(budget).toHaveProperty('spent');
      expect(budget).toHaveProperty('monthly_budget');
      expect(budget).toHaveProperty('remaining');
      expect(budget).toHaveProperty('percent_used');
      expect(budget).toHaveProperty('status');
      
      // Check data types
      expect(typeof budget.category).toBe('string');
      expect(typeof budget.icon).toBe('string');
      expect(typeof budget.transaction_count).toBe('number');
      expect(typeof budget.spent).toBe('number');
      expect(typeof budget.monthly_budget).toBe('number');
      expect(typeof budget.remaining).toBe('number');
      expect(typeof budget.percent_used).toBe('number');
      expect(['OK', 'WARNING', 'OVER_BUDGET']).toContain(budget.status);
    }
  });
});
