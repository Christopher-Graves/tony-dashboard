import { NextRequest } from 'next/server';
import { GET, POST } from '../../../app/api/finance/alerts/route';

describe('/api/finance/alerts', () => {
  it('should return alerts as array with correct fields', async () => {
    const request = new NextRequest('http://localhost:3000/api/finance/alerts');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    
    if (data.length > 0) {
      const alert = data[0];
      expect(alert).toHaveProperty('transaction_id');
      expect(alert).toHaveProperty('account_name');
      expect(alert).toHaveProperty('amount');
      expect(alert).toHaveProperty('merchant');
      expect(alert).toHaveProperty('date');
      expect(alert).toHaveProperty('reason');
      expect(alert).toHaveProperty('severity');
      
      // Check data types
      expect(typeof alert.transaction_id).toBe('number');
      expect(typeof alert.account_name).toBe('string');
      expect(typeof alert.amount).toBe('number');
      expect(typeof alert.merchant).toBe('string');
      expect(typeof alert.reason).toBe('string');
      expect(['INFO', 'WARNING', 'ALERT']).toContain(alert.severity);
    }
  });

  it('should allow dismissing alerts', async () => {
    // First get an alert
    const getRequest = new NextRequest('http://localhost:3000/api/finance/alerts');
    const getResponse = await GET(getRequest);
    const alerts = await getResponse.json();
    
    if (alerts.length > 0) {
      const alertId = alerts[0].transaction_id;
      
      // Dismiss it
      const postRequest = new NextRequest('http://localhost:3000/api/finance/alerts', {
        method: 'POST',
        body: JSON.stringify({ transaction_id: alertId }),
        headers: { 'Content-Type': 'application/json' }
      });
      
      const postResponse = await POST(postRequest);
      const result = await postResponse.json();
      
      expect(postResponse.status).toBe(200);
      expect(result).toHaveProperty('success');
      expect(result.success).toBe(true);
    }
  });

  it('should return 400 if transaction_id missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/finance/alerts', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' }
    });
    
    const response = await POST(request);
    const data = await response.json();
    
    expect(response.status).toBe(400);
    expect(data).toHaveProperty('error');
  });
});
