// Quick DB investigation script
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'tony',
  database: 'tony_brain',
  password: 'TZW1nOJn2Ye-jAXddn-QxfbeKJZ74Uwq',
});

async function investigate() {
  try {
    console.log('=== TABLES ===');
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    console.log(tables.rows.map(r => r.table_name));

    console.log('\n=== ACCOUNTS ===');
    const accounts = await pool.query('SELECT * FROM accounts');
    console.log(JSON.stringify(accounts.rows, null, 2));

    console.log('\n=== CATEGORIES ===');
    const categories = await pool.query('SELECT * FROM categories');
    console.log(JSON.stringify(categories.rows, null, 2));

    console.log('\n=== TRANSACTIONS (sample 10) ===');
    const transactions = await pool.query('SELECT * FROM transactions ORDER BY date DESC LIMIT 10');
    console.log(JSON.stringify(transactions.rows, null, 2));

    console.log('\n=== TRANSACTION COUNT BY CATEGORY ===');
    const catCount = await pool.query(`
      SELECT category_id, COUNT(*) 
      FROM transactions 
      WHERE category_id IS NOT NULL 
      GROUP BY category_id
    `);
    console.log(JSON.stringify(catCount.rows, null, 2));

    console.log('\n=== AMEX ACCOUNTS ===');
    const amex = await pool.query(`SELECT * FROM accounts WHERE name ILIKE '%amex%' OR name ILIKE '%american express%'`);
    console.log(JSON.stringify(amex.rows, null, 2));

    console.log('\n=== BUDGET TABLE CHECK ===');
    try {
      const budgets = await pool.query('SELECT * FROM budgets');
      console.log(JSON.stringify(budgets.rows, null, 2));
    } catch (e) {
      console.log('No budgets table:', e.message);
    }

    console.log('\n=== STATEMENT PERIOD TRANSACTIONS (Feb 22 - Mar 21, 2026) ===');
    const stmtTxns = await pool.query(`
      SELECT t.*, c.name as category_name, a.name as account_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN accounts a ON t.account_id = a.id
      WHERE t.date >= '2026-02-22' AND t.date <= '2026-03-21'
      ORDER BY t.date DESC
    `);
    console.log(`Found ${stmtTxns.rows.length} transactions`);
    console.log(JSON.stringify(stmtTxns.rows, null, 2));

    console.log('\n=== AMEX STATEMENT SPENDING (Feb 22 - Mar 21) ===');
    const amexSpend = await pool.query(`
      SELECT 
        SUM(t.amount) as total_spend,
        COUNT(*) as transaction_count
      FROM transactions t
      JOIN accounts a ON t.account_id = a.id
      WHERE (a.name ILIKE '%amex%' OR a.name ILIKE '%american express%')
        AND t.date >= '2026-02-22' 
        AND t.date <= '2026-03-21'
        AND t.amount < 0
    `);
    console.log(JSON.stringify(amexSpend.rows, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

investigate();

