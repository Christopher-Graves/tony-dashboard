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

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const body = await request.json();
    const { category_id, create_rule } = body;
    const transactionId = params.id;

    if (!category_id) {
      return NextResponse.json({ error: 'Missing category_id' }, { status: 400 });
    }

    // Get transaction details first
    const txnResult = await pool.query(
      'SELECT name, merchant_name FROM transactions WHERE id = $1',
      [transactionId]
    );

    if (txnResult.rows.length === 0) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    const transaction = txnResult.rows[0];

    // Update the transaction
    await pool.query(
      'UPDATE transactions SET category_id = $1, updated_at = NOW() WHERE id = $2',
      [category_id, transactionId]
    );

    // If create_rule is true, create a categorization rule
    let rule = null;
    if (create_rule) {
      // Use merchant_name if available, otherwise use the transaction name
      const pattern = transaction.merchant_name || transaction.name;
      
      const ruleResult = await pool.query(`
        INSERT INTO category_rules (merchant_pattern, category_id)
        VALUES ($1, $2)
        ON CONFLICT (merchant_pattern, category_id) DO NOTHING
        RETURNING *
      `, [pattern.trim(), category_id]);

      rule = ruleResult.rows[0] || null;
    }

    return NextResponse.json({
      success: true,
      transaction_id: transactionId,
      category_id,
      rule: rule
    });
  } catch (error) {
    console.error('Error categorizing transaction:', error);
    return NextResponse.json({ error: 'Failed to categorize transaction' }, { status: 500 });
  }
}