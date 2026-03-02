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
        t.id,
        t.name,
        t.merchant_name,
        t.amount,
        t.date,
        t.pending,
        c.name as category,
        c.icon as category_icon
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.category_id IS NULL 
        OR t.category_id = (SELECT id FROM categories WHERE name = 'Other' LIMIT 1)
      ORDER BY t.date DESC
      LIMIT 100
    `);

    return NextResponse.json({
      count: result.rows.length,
      transactions: result.rows
    });
  } catch (error) {
    console.error('Error fetching uncategorized transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch uncategorized transactions' }, { status: 500 });
  }
}
