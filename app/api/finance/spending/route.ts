import { NextResponse } from 'next/server';
import { Pool } from 'pg';

export const runtime = 'nodejs';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'tony_brain',
  user: process.env.DB_USER || 'tony',
  password: process.env.DB_PASSWORD,
});

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT 
        category,
        icon,
        total_spent,
        transaction_count
      FROM monthly_spending
      WHERE month = DATE_TRUNC('month', CURRENT_DATE)
      ORDER BY total_spent DESC
    `);

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching spending:', error);
    return NextResponse.json({ error: 'Failed to fetch spending' }, { status: 500 });
  }
}
