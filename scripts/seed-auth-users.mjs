import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgresql://postgres:go.wash_go-database@2026@db.siubnwyzuwejxnfwpkbd.supabase.co:5432/postgres';

const SEED_USERS = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    email: 'admin@washgo.ph',
    password: 'password123',
    full_name: 'Platform Admin',
    role: 'platform_admin',
    branch_id: null,
    phone: '+639170000001',
  },
  {
    id: 'a0000000-0000-0000-0000-000000000002',
    email: 'manager@washgo.ph',
    password: 'password123',
    full_name: 'Maria Santos (Manager)',
    role: 'branch_manager',
    branch_id: '00000000-0000-0000-0000-000000000001',
    phone: '+639170000002',
  },
  {
    id: 'a0000000-0000-0000-0000-000000000003',
    email: 'staff@washgo.ph',
    password: 'password123',
    full_name: 'Juan Dela Cruz (Staff)',
    role: 'staff',
    branch_id: '00000000-0000-0000-0000-000000000001',
    phone: '+639170000003',
  },
  {
    id: 'a0000000-0000-0000-0000-000000000004',
    email: 'rider@washgo.ph',
    password: 'password123',
    full_name: 'Kuya Jobert (Rider)',
    role: 'rider',
    branch_id: '00000000-0000-0000-0000-000000000001',
    phone: '+639170000004',
  },
  {
    id: 'a0000000-0000-0000-0000-000000000005',
    email: 'customer@washgo.ph',
    password: 'password123',
    full_name: 'Katrina Reyes (Customer)',
    role: 'customer',
    branch_id: null,
    phone: '+639170000005',
  },
];

async function run() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL database.');

    // Enable pgcrypto
    await client.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

    for (const u of SEED_USERS) {
      console.log(`Seeding user: ${u.email} (${u.role})...`);

      // 1. Insert/Update auth.users with bcrypt hashed password
      const authUserQuery = `
        INSERT INTO auth.users (
          id,
          instance_id,
          aud,
          role,
          email,
          encrypted_password,
          email_confirmed_at,
          raw_app_meta_data,
          raw_user_meta_data,
          created_at,
          updated_at,
          confirmation_token,
          email_change,
          email_change_token_new,
          recovery_token
        ) VALUES (
          $1,
          '00000000-0000-0000-0000-000000000000',
          'authenticated',
          'authenticated',
          $2,
          crypt($3, gen_salt('bf')),
          NOW(),
          '{"provider":"email","providers":["email"]}',
          json_build_object('full_name', $4::text, 'role', $5::text),
          NOW(),
          NOW(),
          '',
          '',
          '',
          ''
        )
        ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email,
          encrypted_password = EXCLUDED.encrypted_password,
          email_confirmed_at = NOW(),
          raw_user_meta_data = EXCLUDED.raw_user_meta_data,
          updated_at = NOW();
      `;

      await client.query(authUserQuery, [
        u.id,
        u.email,
        u.password,
        u.full_name,
        u.role,
      ]);

      // 2. Insert/Update public.users profile
      const publicUserQuery = `
        INSERT INTO public.users (
          id,
          email,
          full_name,
          role,
          branch_id,
          phone,
          is_active,
          created_at,
          updated_at
        ) VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          true,
          NOW(),
          NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email,
          full_name = EXCLUDED.full_name,
          role = EXCLUDED.role,
          branch_id = EXCLUDED.branch_id,
          phone = EXCLUDED.phone,
          is_active = true,
          updated_at = NOW();
      `;

      await client.query(publicUserQuery, [
        u.id,
        u.email,
        u.full_name,
        u.role,
        u.branch_id,
        u.phone,
      ]);

      // 3. Ensure auth.identities exists so Supabase Auth recognizes email provider
      const identityQuery = `
        INSERT INTO auth.identities (
          id,
          user_id,
          identity_data,
          provider,
          provider_id,
          last_sign_in_at,
          created_at,
          updated_at
        ) VALUES (
          $1::uuid,
          $1::uuid,
          json_build_object('sub', $1::text, 'email', $2::text),
          'email',
          $1::text,
          NOW(),
          NOW(),
          NOW()
        )
        ON CONFLICT (id) DO NOTHING;
      `;
      await client.query(identityQuery, [u.id, u.email]);
    }

    console.log('\n========================================');
    console.log('✅ All 5 Test Users seeded successfully!');
    console.log('========================================');
  } catch (err) {
    console.error('Error seeding test users:', err);
  } finally {
    await client.end();
  }
}

run();
