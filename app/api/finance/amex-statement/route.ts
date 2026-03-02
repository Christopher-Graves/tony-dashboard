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
      // Get current statement summary
      const summaryResult = await client.query(`
        WITH amex_account AS (
          SELECT a.id, a.name, a.mask, am.statement_close_day
          FROM accounts a
          JOIN account_metadata am ON a.id = am.account_id
          WHERE am.is_primary_amex = TRUE
          LIMIT 1
        ),
        statement_period AS (
          SELECT * FROM get_current_statement_period((SELECT statement_close_day FROM amex_account))
        ),
        spending AS (
          SELECT 
            COUNT(*) as transaction_count,
            COALESCE(SUM(ABS(amount)), 0) as total_spent
          FROM transactions t
          CROSS JOIN statement_period sp
          CROSS JOIN amex_account aa
          WHERE t.account_id = aa.id
            AND t.date >= sp.start_date
            AND t.date <= sp.end_date
            AND t.amount < 0
            AND NOT t.pending
        )
        SELECT 
          aa.name as account_name,
          aa.mask as account_mask,
          sp.start_date,
          sp.end_date,
          s.transaction_count,
          s.total_spent,
          2500.00 as budget,
          2500.00 - s.total_spent as remaining,
          ROUND((s.total_spent / 2500.00) * 100, 2) as percent_used
        FROM amex_account aa
        CROSS JOIN statement_period sp
        CROSS JOIN spending s
      `);
      
      if (summaryResult.rows.length === 0) {
        return NextResponse.json({ error: 'No primary Amex card configured' }, { status: 404 });
      }
      
      const summary = summaryResult.rows[0];
      
      // Get recent transactions for current statement
      const transactionsResult = await client.query(`
        SELECT 
          t.id,
          t.date,
          t.name,
          t.merchant_name,
          t.amount,
          t.pending,
          c.name as category,
          c.icon as category_icon
        FROM current_amex_statement t
        LEFT JOIN categories c ON t.category_id = c.id
        ORDER BY t.date DESC, t.id DESC
        LIMIT 100
      `);
      
      return NextResponse.json({
        summary: {
          accountName: summary.account_name,
          accountMask: summary.account_mask,
          statementStart: summary.start_date,
          statementEnd: summary.end_date,
          transactionCount: parseInt(summary.transaction_count),
          totalSpent: parseFloat(summary.total_spent),
          budget: parseFloat(summary.budget),
          remaining: parseFloat(summary.remaining),
          percentUsed: parseFloat(summary.percent_used),
          status: summary.percent_used >= 100 ? 'OVER_BUDGET' : 
                  summary.percent_used >= 90 ? 'WARNING' : 'OK'
        },
        transactions: transactionsResult.rows.map(row => ({
          id: row.id,
          date: row.date,
          name: row.name,
          merchantName: row.merchant_name,
          amount: parseFloat(row.amount),
          pending: row.pending,
          category: row.category,
          categoryIcon: row.category_icon
        }))
      });
      
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching Amex statement:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Amex statement' },
      { status: 500 }
    );
  }
}
