const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'tony',
  database: 'tony_brain',
  password: 'TZW1nOJn2Ye-jAXddn-QxfbeKJZ74Uwq',
});

async function testFinanceEndpoints() {
  try {
    console.log('=== TESTING FINANCE DATABASE VIEWS/FUNCTIONS ===\n');

    // Test 1: Check if current_amex_statement view exists
    console.log('1. Testing current_amex_statement view...');
    try {
      const stmt = await pool.query('SELECT * FROM current_amex_statement LIMIT 5');
      console.log(`✓ View exists. Found ${stmt.rows.length} rows`);
      if (stmt.rows.length > 0) {
        console.log('Sample row:', JSON.stringify(stmt.rows[0], null, 2));
      }
    } catch (err) {
      console.error('✗ Error:', err.message);
    }

    // Test 2: Check if amex_budget_progress view exists
    console.log('\n2. Testing amex_budget_progress view...');
    try {
      const budget = await pool.query('SELECT * FROM amex_budget_progress');
      console.log(`✓ View exists. Found ${budget.rows.length} rows`);
      if (budget.rows.length > 0) {
        console.log('Sample rows:', JSON.stringify(budget.rows, null, 2));
      }
    } catch (err) {
      console.error('✗ Error:', err.message);
    }

    // Test 3: Check if get_current_statement_period function exists
    console.log('\n3. Testing get_current_statement_period function...');
    try {
      const period = await pool.query('SELECT * FROM get_current_statement_period(21)');
      console.log(`✓ Function exists. Result:`, JSON.stringify(period.rows[0], null, 2));
    } catch (err) {
      console.error('✗ Error:', err.message);
    }

    // Test 4: Check if detect_unusual_transactions function exists
    console.log('\n4. Testing detect_unusual_transactions function...');
    try {
      const alerts = await pool.query('SELECT * FROM detect_unusual_transactions() LIMIT 5');
      console.log(`✓ Function exists. Found ${alerts.rows.length} rows`);
      if (alerts.rows.length > 0) {
        console.log('Sample rows:', JSON.stringify(alerts.rows, null, 2));
      }
    } catch (err) {
      console.error('✗ Error:', err.message);
    }

    // Test 5: Check primary Amex account
    console.log('\n5. Checking for primary Amex account...');
    try {
      const amex = await pool.query(`
        SELECT a.id, a.name, am.statement_close_day, am.is_primary_amex
        FROM accounts a
        JOIN account_metadata am ON a.id = am.account_id
        WHERE am.is_primary_amex = TRUE
      `);
      console.log(`✓ Found ${amex.rows.length} primary Amex accounts`);
      if (amex.rows.length > 0) {
        console.log('Account:', JSON.stringify(amex.rows[0], null, 2));
      }
    } catch (err) {
      console.error('✗ Error:', err.message);
    }

    // Test 6: Manual query for current statement
    console.log('\n6. Manual query for current statement summary...');
    try {
      const summary = await pool.query(`
        WITH amex_account AS (
          SELECT a.id, a.name, am.statement_close_day
          FROM accounts a
          JOIN account_metadata am ON a.id = am.account_id
          WHERE am.is_primary_amex = TRUE
          LIMIT 1
        ),
        statement_period AS (
          SELECT * FROM get_current_statement_period((SELECT statement_close_day FROM amex_account))
        ),
        total_spend AS (
          SELECT COALESCE(SUM(ABS(amount)), 0) as total
          FROM transactions t
          CROSS JOIN amex_account aa
          CROSS JOIN statement_period sp
          WHERE t.account_id = aa.id
            AND t.date >= sp.start_date
            AND t.date <= sp.end_date
            AND t.amount < 0
            AND NOT t.pending
        )
        SELECT 
          aa.name as account_name,
          sp.start_date,
          sp.end_date,
          ts.total as total_spent,
          2500.00 as budget_target,
          2500.00 - ts.total as remaining,
          ROUND((ts.total / 2500.00) * 100, 2) as percent_used
        FROM amex_account aa
        CROSS JOIN statement_period sp
        CROSS JOIN total_spend ts
      `);
      console.log('✓ Summary:', JSON.stringify(summary.rows[0], null, 2));
    } catch (err) {
      console.error('✗ Error:', err.message);
    }

  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await pool.end();
  }
}

testFinanceEndpoints();
