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
    console.log('=== ACCOUNT METADATA ===');
    const metadata = await pool.query('SELECT * FROM account_metadata');
    console.log(JSON.stringify(metadata.rows, null, 2));

    console.log('\n=== GET_CURRENT_STATEMENT_PERIOD FUNCTION CHECK ===');
    try {
      const period = await pool.query('SELECT * FROM get_current_statement_period(22)');
      console.log(JSON.stringify(period.rows, null, 2));
    } catch (e) {
      console.log('Function error:', e.message);
    }

    console.log('\n=== CURRENT_AMEX_STATEMENT VIEW CHECK ===');
    try {
      const stmt = await pool.query('SELECT COUNT(*) FROM current_amex_statement');
      console.log('Row count:', stmt.rows[0].count);
    } catch (e) {
      console.log('View error:', e.message);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

check();

