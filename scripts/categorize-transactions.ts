#!/usr/bin/env ts-node
/**
 * Categorize uncategorized transactions
 * 
 * This script finds transactions without a category and applies
 * the categorization logic from finance-tracker.
 * 
 * Usage: 
 *   With env vars: DB_HOST=localhost DB_PASSWORD=... npx ts-node scripts/categorize-transactions.ts
 *   Or set env vars first and then run
 */

import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'tony_brain',
  user: process.env.DB_USER || 'tony',
  password: process.env.DB_PASSWORD,
});

// Merchant keyword patterns
const MERCHANT_PATTERNS: Record<string, RegExp[]> = {
  'Groceries': [
    /whole foods/i, /trader joe/i, /publix/i, /kroger/i, /safeway/i,
    /walmart.*grocery/i, /target.*grocery/i, /aldi/i, /food lion/i,
  ],
  'Dining': [
    /restaurant/i, /cafe/i, /coffee/i, /starbucks/i, /dunkin/i,
    /mcdonald/i, /burger/i, /pizza/i, /chipotle/i,
    /doordash/i, /uber.*eats/i, /grubhub/i, /postmates/i,
  ],
  'Gas': [
    /shell/i, /chevron/i, /exxon/i, /bp gas/i, /mobil/i, /sunoco/i,
    /wawa.*fuel/i, /circle.*k.*gas/i, /speedway/i,
  ],
  'Subscriptions': [
    /netflix/i, /spotify/i, /apple.*subscription/i, /amazon.*prime/i,
    /hulu/i, /disney.*plus/i, /hbo.*max/i, /youtube.*premium/i,
    /adobe/i, /microsoft.*365/i, /github/i, /dropbox/i, /icloud/i,
  ],
  'Utilities': [
    /electric/i, /power/i, /water.*utility/i, /internet.*service/i,
    /comcast/i, /verizon/i, /at&t/i, /spectrum/i, /xfinity/i,
  ],
  'Entertainment': [
    /cinema/i, /theater/i, /amc/i, /regal/i, /bowling/i,
    /concert/i, /ticketmaster/i, /steam/i, /playstation/i, /xbox/i,
  ],
  'Transportation': [
    /uber(?!.*eats)/i, /lyft/i, /parking/i, /toll/i, /metro/i, /taxi/i,
  ],
  'Healthcare': [
    /pharmacy/i, /cvs/i, /walgreens/i, /doctor/i, /hospital/i, /medical/i, /dental/i,
  ],
  'Travel': [
    /airline/i, /hotel/i, /airbnb/i, /booking\.com/i, /expedia/i,
    /delta.*air/i, /american.*airlines/i, /southwest/i,
  ],
  'Home': [
    /home.*depot/i, /lowes/i, /ikea/i, /furniture/i, /hardware/i,
  ],
  'Shopping': [
    /amazon(?!.*prime)/i, /target(?!.*grocery)/i, /walmart(?!.*grocery)/i,
    /best.*buy/i, /kohls/i, /macys/i,
  ],
};

// Plaid category mappings
const PLAID_CATEGORY_MAP: Record<string, string[]> = {
  'Groceries': ['Groceries', 'Supermarkets'],
  'Dining': ['Restaurants', 'Fast Food', 'Coffee Shop', 'Bar'],
  'Gas': ['Gas Stations'],
  'Travel': ['Airlines', 'Lodging', 'Car Service', 'Taxi'],
  'Shopping': ['Clothing', 'Electronics', 'Sporting Goods'],
  'Entertainment': ['Arts and Entertainment', 'Gyms', 'Music, Video'],
  'Healthcare': ['Pharmacies', 'Healthcare Services'],
  'Utilities': ['Utilities', 'Telecommunication Services', 'Cable'],
  'Transfer': ['Transfer', 'Deposit', 'Wire', 'ACH'],
  'Income': ['Payroll', 'Income'],
};

function matchMerchantPattern(merchant: string): string | null {
  const lowerMerchant = merchant.toLowerCase();
  
  for (const [category, patterns] of Object.entries(MERCHANT_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(lowerMerchant)) {
        return category;
      }
    }
  }
  
  return null;
}

function matchPlaidCategories(plaidCategories: string[]): string | null {
  if (!plaidCategories || plaidCategories.length === 0) {
    return null;
  }
  
  for (const plaidCat of plaidCategories) {
    for (const [ourCategory, plaidSubcats] of Object.entries(PLAID_CATEGORY_MAP)) {
      for (const subcat of plaidSubcats) {
        if (plaidCat.toLowerCase().includes(subcat.toLowerCase())) {
          return ourCategory;
        }
      }
    }
  }
  
  return null;
}

async function categorizeTransaction(transaction: any, categories: Map<string, number>): Promise<number | null> {
  const merchant = (transaction.merchant_name || transaction.name || '').toLowerCase();
  const plaidCats = transaction.plaid_category || [];
  const amount = parseFloat(transaction.amount || 0);
  
  // Handle income/transfers
  if (amount > 0) {
    if (plaidCats.some((cat: string) => /payroll|income/i.test(cat))) {
      return categories.get('Income') || null;
    }
    if (plaidCats.some((cat: string) => /transfer|deposit/i.test(cat))) {
      return categories.get('Transfer') || null;
    }
  }
  
  // Try merchant patterns first
  const merchantCategory = matchMerchantPattern(merchant);
  if (merchantCategory && categories.has(merchantCategory)) {
    return categories.get(merchantCategory)!;
  }
  
  // Fall back to Plaid categories
  const plaidCategory = matchPlaidCategories(plaidCats);
  if (plaidCategory && categories.has(plaidCategory)) {
    return categories.get(plaidCategory)!;
  }
  
  // Default to "Other"
  return categories.get('Other') || null;
}

async function main() {
  console.log('🔄 Starting transaction categorization...\n');
  
  try {
    // Load categories
    console.log('📋 Loading categories...');
    const categoriesResult = await pool.query('SELECT id, name FROM categories');
    const categories = new Map<string, number>();
    categoriesResult.rows.forEach(row => {
      categories.set(row.name, row.id);
    });
    console.log(`   Found ${categories.size} categories\n`);
    
    // Find uncategorized transactions
    console.log('🔍 Finding uncategorized transactions...');
    const uncategorizedResult = await pool.query(`
      SELECT 
        id,
        name,
        merchant_name,
        amount,
        plaid_category
      FROM transactions
      WHERE category_id IS NULL
      ORDER BY date DESC
    `);
    
    const uncategorized = uncategorizedResult.rows;
    console.log(`   Found ${uncategorized.length} uncategorized transactions\n`);
    
    if (uncategorized.length === 0) {
      console.log('✅ All transactions are already categorized!');
      await pool.end();
      return;
    }
    
    // Categorize each transaction
    console.log('🏷️  Categorizing transactions...');
    let categorized = 0;
    let failed = 0;
    
    for (const transaction of uncategorized) {
      const categoryId = await categorizeTransaction(transaction, categories);
      
      if (categoryId) {
        await pool.query(
          'UPDATE transactions SET category_id = $1, updated_at = NOW() WHERE id = $2',
          [categoryId, transaction.id]
        );
        categorized++;
      } else {
        failed++;
      }
    }
    
    console.log(`\n✅ Categorization complete!`);
    console.log(`   ✓ ${categorized} transactions categorized`);
    if (failed > 0) {
      console.log(`   ⚠ ${failed} transactions could not be categorized (defaulting to Other)`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
