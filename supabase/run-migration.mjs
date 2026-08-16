/**
 * Migration runner — executes SQL migration files against Supabase Postgres.
 * Run with: node supabase/run-migration.mjs
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Connection string with password containing @
// We construct it manually to handle the special characters
const config = {
  host: 'db.siubnwyzuwejxnfwpkbd.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'go.wash_go-database@2026',
  ssl: { rejectUnauthorized: false },
};

async function runMigration() {
  // Dynamic import to handle ESM
  const pg = await import('pg');
  const { Client } = pg.default || pg;

  const client = new Client(config);

  try {
    console.log('Connecting to Supabase Postgres...');
    await client.connect();
    console.log('Connected!');

    // Read the migration file
    const migrationPath = join(__dirname, 'migrations', '001_initial_schema.sql');
    const sql = readFileSync(migrationPath, 'utf-8');

    console.log('Running migration...');
    await client.query(sql);
    console.log('✅ Migration completed successfully!');

    // Run seed data
    const seedPath = join(__dirname, 'seed.sql');
    const seedSql = readFileSync(seedPath, 'utf-8');

    console.log('Running seed data...');
    await client.query(seedSql);
    console.log('✅ Seed data inserted successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.detail) console.error('Detail:', error.detail);
    if (error.hint) console.error('Hint:', error.hint);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
