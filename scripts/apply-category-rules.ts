import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'tony_brain',
  user: process.env.DB_USER || 'tony',
  password: process.env.DB_PASSWORD,
});

async function applyCategoryRules() {
  console.log('Starting auto-categorization based on rules...\n');

  try {
    // Get all category rules
    const rulesResult = await pool.query(`
      SELECT id, merchant_pattern, category_id
      FROM category_rules
      ORDER BY created_at DESC
    `);

    console.log(`Found ${rulesResult.rows.length} category rules\n`);

    let totalUpdated = 0;

    // Apply each rule
    for (const rule of rulesResult.rows) {
      const result = await pool.query(`
        UPDATE transactions
        SET category_id = $1, updated_at = NOW()
        WHERE (category_id IS NULL OR category_id = (SELECT id FROM categories WHERE name = 'Other' LIMIT 1))
          AND (merchant_name ILIKE $2 OR name ILIKE $2)
      `, [rule.category_id, `%${rule.merchant_pattern}%`]);

      if (result.rowCount !== null && result.rowCount > 0) {
        console.log(`? Rule "${rule.merchant_pattern}" ? category ${rule.category_id}: ${result.rowCount} transactions updated`);
        totalUpdated += result.rowCount || 0;
      }
    }

    console.log(`\n? Auto-categorization complete! ${totalUpdated} transactions updated.\n`);

    // Show summary of remaining uncategorized
    const uncategorizedResult = await pool.query(`
      SELECT COUNT(*)
      FROM transactions
      WHERE category_id IS NULL 
        OR category_id = (SELECT id FROM categories WHERE name = 'Other' LIMIT 1)
    `);

    console.log(`?? Remaining uncategorized transactions: ${uncategorizedResult.rows[0].count}\n`);

  } catch (error) {
    console.error('Error applying category rules:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applyCategoryRules();


