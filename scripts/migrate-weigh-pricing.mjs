import pg from 'pg';
const { Client } = pg;

async function migrate() {
  const client = new Client({
    connectionString: 'postgresql://postgres:go.wash_go-database@2026@db.siubnwyzuwejxnfwpkbd.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('Connected to Supabase PostgreSQL...');

  // 1. Add price_per_kg to branches
  await client.query(`ALTER TABLE branches ADD COLUMN IF NOT EXISTS price_per_kg INTEGER NOT NULL DEFAULT 3500;`);
  await client.query(`UPDATE branches SET price_per_kg = 3500 WHERE price_per_kg IS NULL;`);

  // 2. Add columns to orders
  await client.query(`
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'online',
    ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(5, 2),
    ADD COLUMN IF NOT EXISTS cash_collected BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS delivery_proof_url TEXT;
  `);

  console.log('Migration completed successfully!');
  await client.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
