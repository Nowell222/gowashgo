-- ============================================================
-- Migration 002: Operational Gaps & Growth Features (Addendum 2)
-- ============================================================

-- 1. Add new operational columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS picked_up_proof_url TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS intake_discrepancy_note TEXT;

-- 2. Customer Order Ratings Table
CREATE TABLE IF NOT EXISTS order_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE UNIQUE,
  customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  stars INTEGER NOT NULL CHECK (stars >= 1 AND stars <= 5),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_ratings_branch ON order_ratings(branch_id);
CREATE INDEX IF NOT EXISTS idx_order_ratings_customer ON order_ratings(customer_id);

-- 3. Customer Saved Addresses Table
CREATE TABLE IF NOT EXISTS customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  label TEXT NOT NULL, -- e.g. "Home", "Dorm", "Apartment"
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_addresses_user ON customer_addresses(customer_id);

-- 4. Rider Cash Shift Settlements
CREATE TABLE IF NOT EXISTS rider_cash_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID REFERENCES users(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  shift_date DATE NOT NULL DEFAULT CURRENT_DATE,
  orders_count INTEGER NOT NULL DEFAULT 0,
  is_settled BOOLEAN DEFAULT false,
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rider_cash_settlements_rider ON rider_cash_settlements(rider_id);
CREATE INDEX IF NOT EXISTS idx_rider_cash_settlements_branch ON rider_cash_settlements(branch_id);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE order_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE rider_cash_settlements ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for order_ratings
DO $$ BEGIN
  DROP POLICY IF EXISTS "Public can view ratings" ON order_ratings;
  DROP POLICY IF EXISTS "Customers can insert own rating" ON order_ratings;
  DROP POLICY IF EXISTS "Service role full access on ratings" ON order_ratings;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Public can view ratings"
  ON order_ratings FOR SELECT
  USING (true);

CREATE POLICY "Customers can insert own rating"
  ON order_ratings FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Service role full access on ratings"
  ON order_ratings FOR ALL
  USING (true)
  WITH CHECK (true);

-- 7. RLS Policies for customer_addresses
DO $$ BEGIN
  DROP POLICY IF EXISTS "Customers can manage own addresses" ON customer_addresses;
  DROP POLICY IF EXISTS "Service role full access on customer_addresses" ON customer_addresses;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Customers can manage own addresses"
  ON customer_addresses FOR ALL
  USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Service role full access on customer_addresses"
  ON customer_addresses FOR ALL
  USING (true)
  WITH CHECK (true);

-- 8. RLS Policies for rider_cash_settlements
DO $$ BEGIN
  DROP POLICY IF EXISTS "Staff and Managers can manage cash settlements" ON rider_cash_settlements;
  DROP POLICY IF EXISTS "Riders can view own cash settlements" ON rider_cash_settlements;
  DROP POLICY IF EXISTS "Service role full access on rider_cash_settlements" ON rider_cash_settlements;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Staff and Managers can manage cash settlements"
  ON rider_cash_settlements FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Riders can view own cash settlements"
  ON rider_cash_settlements FOR SELECT
  USING (auth.uid() = rider_id);

CREATE POLICY "Service role full access on rider_cash_settlements"
  ON rider_cash_settlements FOR ALL
  USING (true)
  WITH CHECK (true);
