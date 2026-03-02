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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { merchant_pattern, category_id } = body;

    if (!merchant_pattern || !category_id) {
      return NextResponse.json({ error: 'Missing merchant_pattern or category_id' }, { status: 400 });
    }

    // Insert the rule (or ignore if it already exists due to unique constraint)
    const result = await pool.query(`
      INSERT INTO category_rules (merchant_pattern, category_id)
      VALUES ($1, $2)
      ON CONFLICT (merchant_pattern, category_id) DO NOTHING
      RETURNING *
    `, [merchant_pattern.trim(), category_id]);

    return NextResponse.json({
      success: true,
      rule: result.rows[0] || null,
      message: result.rows.length > 0 ? 'Rule created' : 'Rule already exists'
    });
  } catch (error) {
    console.error('Error creating category rule:', error);
    return NextResponse.json({ error: 'Failed to create category rule' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT 
        cr.id,
        cr.merchant_pattern,
        cr.category_id,
        c.name as category_name,
        c.icon as category_icon,
        cr.created_at
      FROM category_rules cr
      JOIN categories c ON cr.category_id = c.id
      ORDER BY cr.created_at DESC
    `);

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching category rules:', error);
    return NextResponse.json({ error: 'Failed to fetch category rules' }, { status: 500 });
  }
}
