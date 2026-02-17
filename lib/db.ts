// PostgreSQL client
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432'),
  user: process.env.PGUSER || 'tony',
  database: process.env.PGDATABASE || 'tony',
  password: process.env.PGPASSWORD || '',
  // Don't hang if DB is unreachable
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
});

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text: text.slice(0, 100), duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error', { text: text.slice(0, 100), error });
    throw error;
  }
}

export async function getTables() {
  const result = await query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);
  return result.rows.map((row: any) => row.table_name);
}

export async function getTableSchema(tableName: string) {
  const result = await query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position
  `, [tableName]);
  return result.rows;
}

export async function getTableData(tableName: string, limit: number = 50) {
  const tables = await getTables();
  if (!tables.includes(tableName)) {
    throw new Error('Invalid table name');
  }
  const result = await query(`SELECT * FROM "${tableName}" LIMIT $1`, [limit]);
  return result.rows;
}

export default pool;
