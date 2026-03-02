const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'tony',
  database: 'tony_brain',
  password: 'TZW1nOJn2Ye-jAXddn-QxfbeKJZ74Uwq',
});

async function fix() {
  try {
    console.log('=== DROPPING OLD VIEW ===');
    await pool.query('DROP VIEW IF EXISTS amex_budget_progress');
    
    console.log('=== CREATING FIXED VIEW ===');
    await pool.query(`
      CREATE VIEW amex_budget_progress AS
      WITH amex_account AS (
        SELECT a.id, am.statement_close_day
        FROM accounts a
        JOIN account_metadata am ON a.id = am.account_id
        WHERE am.is_primary_amex = TRUE
        LIMIT 1
      ),
      statement_period AS (
        SELECT * FROM get_current_statement_period((SELECT statement_close_day FROM amex_account))
      ),
      spending_by_category AS (
        SELECT 
          c.name AS category,
          c.icon,
          COUNT(*) AS transaction_count,
          COALESCE(SUM(t.amount), 0) AS spent
        FROM transactions t
        CROSS JOIN statement_period sp
        CROSS JOIN amex_account aa
        JOIN categories c ON t.category_id = c.id
        WHERE t.account_id = aa.id
          AND t.date >= sp.start_date
          AND t.date <= sp.end_date
          AND t.amount > 0
          AND NOT t.pending
        GROUP BY c.name, c.icon
      )
      SELECT 
        category,
        icon,
        transaction_count,
        spent,
        2500.00 AS monthly_budget,
        2500.00 - spent AS remaining,
        ROUND((spent / 2500.00) * 100, 2) AS percent_used,
        CASE
          WHEN spent >= 2500.00 THEN 'OVER_BUDGET'
          WHEN spent >= 2250.00 THEN 'WARNING'
          ELSE 'OK'
        END AS status
      FROM spending_by_category
      ORDER BY spent DESC
    `);
    
    console.log('=== VERIFYING FIXED VIEW ===');
    const result = await pool.query('SELECT * FROM amex_budget_progress');
    console.log(JSON.stringify(result.rows, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

fix();

