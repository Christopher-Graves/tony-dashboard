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
          category,
          icon,
          transaction_count,
          spent,
          monthly_budget,
          remaining,
          percent_used,
          status
        FROM amex_budget_progress
        ORDER BY spent DESC
      `);

      return NextResponse.json(result.rows.map(row => ({
        category: row.category,
        icon: row.icon,
        transaction_count: parseInt(row.transaction_count),
        spent: parseFloat(row.spent),
        monthly_budget: parseFloat(row.monthly_budget),
        remaining: parseFloat(row.remaining),
        percent_used: parseFloat(row.percent_used),
        status: row.status
      })));
      
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching Amex budget:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Amex budget' },
      { status: 500 }
    );
  }
}
