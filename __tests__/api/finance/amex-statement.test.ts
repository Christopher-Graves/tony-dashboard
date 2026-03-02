import { NextRequest } from 'next/server';
import { GET } from '../../../app/api/finance/amex-statement/route';

// Integration test - connects to real database
describe('/api/finance/amex-statement', () => {
  it('should return statement summary with correct snake_case fields', async () => {
    const request = new NextRequest('http://localhost:3000/api/finance/amex-statement');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('summary');
    expect(data).toHaveProperty('transactions');
    
    // Check snake_case field names
    expect(data.summary).toHaveProperty('account_name');
    expect(data.summary).toHaveProperty('start_date');
    expect(data.summary).toHaveProperty('end_date');
    expect(data.summary).toHaveProperty('total_spent');
    expect(data.summary).toHaveProperty('budget_target');
    expect(data.summary).toHaveProperty('remaining');
    expect(data.summary).toHaveProperty('percent_used');
    
    // Should NOT have camelCase
    expect(data.summary).not.toHaveProperty('accountName');
    expect(data.summary).not.toHaveProperty('startDate');
    expect(data.summary).not.toHaveProperty('totalSpent');
    
    // Check data types
    expect(typeof data.summary.account_name).toBe('string');
    expect(typeof data.summary.total_spent).toBe('number');
    expect(typeof data.summary.budget_target).toBe('number');
    expect(typeof data.summary.remaining).toBe('number');
    expect(typeof data.summary.percent_used).toBe('number');
    
    // Check transactions structure
    expect(Array.isArray(data.transactions)).toBe(true);
    if (data.transactions.length > 0) {
      const txn = data.transactions[0];
      expect(txn).toHaveProperty('id');
      expect(txn).toHaveProperty('name');
      expect(txn).toHaveProperty('merchant_name');
      expect(txn).toHaveProperty('amount');
      expect(txn).toHaveProperty('date');
      expect(txn).toHaveProperty('category');
      expect(txn).toHaveProperty('icon');
      
      expect(typeof txn.amount).toBe('number');
    }
  });
});
