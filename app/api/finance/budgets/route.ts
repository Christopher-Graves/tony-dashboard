import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'tony_brain',
  user: process.env.DB_USER || 'tony',
  password: process.env.DB_PASSWORD,
});

export async function GET() {
  try {
    // Get current month's budgets
    const result = await pool.query(`
      SELECT 
        category,
        icon,
        target_amount,
        spent,
        remaining,
        percent_used,
        status
      FROM budget_alerts
      WHERE month = DATE_TRUNC('month', CURRENT_DATE)
      ORDER BY percent_used DESC
    `);

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching budgets:', error);
    return NextResponse.json({ error: 'Failed to fetch budgets' }, { status: 500 });
  }
}
