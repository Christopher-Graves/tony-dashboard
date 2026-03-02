const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'tony',
  database: 'tony_brain',
  password: 'TZW1nOJn2Ye-jAXddn-QxfbeKJZ74Uwq',
});

async function check() {
  try {
    console.log('=== AMEX_BUDGET_PROGRESS VIEW DEFINITION ===');
    const viewDef = await pool.query(`
      SELECT pg_get_viewdef('amex_budget_progress', true) as definition
    `);
    console.log(viewDef.rows[0].definition);

    console.log('\n=== CATEGORY SPENDING (MANUAL CALC) ===');
    const manual = await pool.query(`
      SELECT 
        c.name as category,
        c.icon,
        COUNT(*) as transaction_count,
        SUM(t.amount) as total_spent
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.account_id = 30
        AND t.date >= '2026-02-22'
        AND t.date <= '2026-03-21'
        AND t.amount > 0
        AND NOT t.pending
      GROUP BY c.name, c.icon
      ORDER BY total_spent DESC
    `);
    console.log(JSON.stringify(manual.rows, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

check();

