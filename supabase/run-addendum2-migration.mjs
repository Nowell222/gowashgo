import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const config = {
  host: 'db.siubnwyzuwejxnfwpkbd.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'go.wash_go-database@2026',
  ssl: { rejectUnauthorized: false },
};

async function run() {
  const pg = await import('pg');
  const { Client } = pg.default || pg;
  const client = new Client(config);

  try {
    console.log('Connecting to Supabase Postgres...');
    await client.connect();
    console.log('Connected!');

    const sqlPath = join(__dirname, 'migrations', '002_addendum2_schema.sql');
    const sql = readFileSync(sqlPath, 'utf-8');

    console.log('Applying migration 002...');
    await client.query(sql);
    console.log('✅ Migration 002 applied successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await client.end();
  }
}

run();
