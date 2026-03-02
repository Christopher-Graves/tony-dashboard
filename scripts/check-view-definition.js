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
    console.log('=== VIEW DEFINITION ===');
    const viewDef = await pool.query(`
      SELECT pg_get_viewdef('current_amex_statement', true) as definition
    `);
    console.log(viewDef.rows[0].definition);

    console.log('\n=== SAMPLE TRANSACTIONS FROM VIEW ===');
    const sample = await pool.query(`
      SELECT date, name, amount, pending
      FROM current_amex_statement
      ORDER BY date DESC
      LIMIT 10
    `);
    console.log(JSON.stringify(sample.rows, null, 2));

    console.log('\n=== MANUAL CALCULATION FOR FEB 22 - MAR 21 ===');
    const manual = await pool.query(`
      SELECT 
        COUNT(*) as count,
        SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as debits,
        SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as credits,
        SUM(ABS(amount)) FILTER (WHERE amount < 0) as total_spent
      FROM transactions
      WHERE account_id = 30
        AND date >= '2026-02-22'
        AND date <= '2026-03-21'
        AND NOT pending
    `);
    console.log(JSON.stringify(manual.rows[0], null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

check();

