import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export const runtime = 'nodejs';

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
      const result = await client.query(`
        SELECT 
          transaction_id,
          account_id,
          account_name,
          amount,
          merchant,
          date,
          reason,
          severity
        FROM detect_unusual_transactions()
        ORDER BY 
          CASE severity
            WHEN 'ALERT' THEN 1
            WHEN 'WARNING' THEN 2
            ELSE 3
          END,
          date DESC
        LIMIT 20
      `);

      return NextResponse.json(result.rows.map(row => ({
        transaction_id: row.transaction_id,
        account_name: row.account_name,
        amount: parseFloat(row.amount),
        merchant: row.merchant,
        date: row.date,
        reason: row.reason,
        severity: row.severity
      })));
      
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
    const { transaction_id } = await request.json();

    if (!transaction_id) {
      return NextResponse.json({ error: 'transaction_id required' }, { status: 400 });
    }

    const client = await pool.connect();
    
    try {
      await client.query(`
        INSERT INTO unusual_transactions (transaction_id, reason, severity, acknowledged, acknowledged_at)
        VALUES ($1, 'User acknowledged', 'INFO', TRUE, NOW())
        ON CONFLICT (transaction_id) 
        DO UPDATE SET acknowledged = TRUE, acknowledged_at = NOW()
      `, [transaction_id]);

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
