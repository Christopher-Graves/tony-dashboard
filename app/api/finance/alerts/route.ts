import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'tony_brain',
  user: process.env.DB_USER || 'tony',
  password: process.env.DB_PASSWORD,
});

export async function GET(request: NextRequest) {
  try {
    const client = await pool.connect();
    
    try {
      // Detect and insert new unusual transactions
      await client.query(`
        INSERT INTO unusual_transactions (transaction_id, reason, severity)
        SELECT 
          transaction_id,
          reason,
          severity
        FROM detect_unusual_transactions()
        ON CONFLICT (transaction_id) DO NOTHING
      `);
      
      // Get unacknowledged alerts
      const result = await client.query(`
        SELECT 
          ut.id,
          ut.transaction_id,
          ut.reason,
          ut.severity,
          ut.created_at,
          t.date as transaction_date,
          t.name as transaction_name,
          t.merchant_name,
          t.amount,
          a.name as account_name,
          a.mask as account_mask
        FROM unusual_transactions ut
        JOIN transactions t ON ut.transaction_id = t.id
        JOIN accounts a ON t.account_id = a.id
        WHERE NOT ut.acknowledged
        ORDER BY ut.created_at DESC, ut.severity DESC
        LIMIT 50
      `);
      
      return NextResponse.json({
        alerts: result.rows.map(row => ({
          id: row.id,
          transactionId: row.transaction_id,
          reason: row.reason,
          severity: row.severity,
          createdAt: row.created_at,
          transaction: {
            date: row.transaction_date,
            name: row.transaction_name,
            merchantName: row.merchant_name,
            amount: parseFloat(row.amount),
            accountName: row.account_name,
            accountMask: row.account_mask
          }
        }))
      });
      
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { alertId } = body;
    
    if (!alertId) {
      return NextResponse.json({ error: 'Alert ID required' }, { status: 400 });
    }
    
    const client = await pool.connect();
    
    try {
      await client.query(`
        UPDATE unusual_transactions
        SET acknowledged = TRUE, acknowledged_at = NOW()
        WHERE id = $1
      `, [alertId]);
      
      return NextResponse.json({ success: true });
      
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    return NextResponse.json(
      { error: 'Failed to acknowledge alert' },
      { status: 500 }
    );
  }
}
