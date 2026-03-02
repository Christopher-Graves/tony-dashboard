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
    console.log('=== UPDATING STATEMENT CLOSE DAY TO 22 ===');
    const result = await pool.query(`
      UPDATE account_metadata
      SET statement_close_day = 22
      WHERE account_id = 30
      RETURNING *
    `);
    console.log('Updated:', JSON.stringify(result.rows[0], null, 2));

    console.log('\n=== VERIFYING STATEMENT PERIOD ===');
    const period = await pool.query(`
      SELECT * FROM get_current_statement_period(
        (SELECT statement_close_day FROM account_metadata WHERE account_id = 30)
      )
    `);
    console.log('Period:', JSON.stringify(period.rows[0], null, 2));

    console.log('\n=== CHECKING CURRENT STATEMENT TRANSACTIONS ===');
    const txns = await pool.query(`
      SELECT COUNT(*) as total,
             COUNT(*) FILTER (WHERE NOT pending) as non_pending,
             SUM(ABS(amount)) FILTER (WHERE amount < 0 AND NOT pending) as total_spent
      FROM current_amex_statement
    `);
    console.log('Stats:', JSON.stringify(txns.rows[0], null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

fix();

