-- ============================================================
-- SEED DATA for local development
-- ============================================================

-- 1. Create a test branch
INSERT INTO branches (id, name, address, latitude, longitude, phone, email, base_processing_minutes)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'WashGo — UP Diliman',
  'Katipunan Ave, Diliman, Quezon City, 1105 Metro Manila',
  14.6538,
  121.0685,
  '+639171234567',
  'updiliman@washgo.app',
  120
);

-- 2. Insert default pricing for the branch
INSERT INTO price_configs (branch_id, clothing_type, base_price) VALUES
  ('00000000-0000-0000-0000-000000000001', 'shirt', 3500),       -- ₱35.00
  ('00000000-0000-0000-0000-000000000001', 'pants', 5000),       -- ₱50.00
  ('00000000-0000-0000-0000-000000000001', 'underwear', 2000),   -- ₱20.00
  ('00000000-0000-0000-0000-000000000001', 'socks', 1500),       -- ₱15.00
  ('00000000-0000-0000-0000-000000000001', 'bedsheet', 8000),    -- ₱80.00
  ('00000000-0000-0000-0000-000000000001', 'towel', 4500),       -- ₱45.00
  ('00000000-0000-0000-0000-000000000001', 'jacket', 7500),      -- ₱75.00
  ('00000000-0000-0000-0000-000000000001', 'delicate', 10000),   -- ₱100.00
  ('00000000-0000-0000-0000-000000000001', 'other', 4000);       -- ₱40.00

-- Note: User records (admin, manager, etc.) are created through Supabase Auth signup,
-- not direct inserts, because they need matching auth.users rows.
-- Use the app's registration/invite flow to create test users.
