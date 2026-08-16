-- Enable PostGIS extension for distance calculations
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM (
  'platform_admin',
  'branch_manager',
  'staff',
  'rider',
  'customer'
);

CREATE TYPE invite_status AS ENUM (
  'pending',
  'used',
  'expired'
);

CREATE TYPE order_status AS ENUM (
  'pending',
  'confirmed',
  'rider_assigned',
  'pickup_en_route',
  'picked_up',
  'at_facility',
  'washing',
  'drying',
  'folding',
  'ready_for_delivery',
  'delivery_en_route',
  'delivered',
  'completed',
  'cancelled'
);

CREATE TYPE clothing_type AS ENUM (
  'shirt',
  'pants',
  'underwear',
  'socks',
  'bedsheet',
  'towel',
  'jacket',
  'delicate',
  'other'
);

CREATE TYPE fabric_type AS ENUM (
  'cotton',
  'polyester',
  'silk',
  'wool',
  'linen',
  'denim',
  'synthetic_blend',
  'unknown'
);

CREATE TYPE color_category AS ENUM (
  'white',
  'light',
  'dark',
  'colored',
  'mixed'
);

CREATE TYPE payment_status AS ENUM (
  'pending',
  'processing',
  'paid',
  'failed',
  'refunded'
);

CREATE TYPE notification_channel AS ENUM (
  'web_push',
  'sms',
  'email'
);

CREATE TYPE notification_status AS ENUM (
  'pending',
  'sent',
  'failed'
);


-- ============================================================
-- TABLES
-- ============================================================

-- Branches (laundry shop locations)
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  phone TEXT,
  email TEXT,
  base_processing_minutes INTEGER NOT NULL DEFAULT 120,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Users (profile table linked to auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  phone TEXT,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'customer',
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT branch_required_for_roles CHECK (
    (role IN ('customer', 'platform_admin') AND branch_id IS NULL)
    OR (role IN ('branch_manager', 'staff', 'rider') AND branch_id IS NOT NULL)
  )
);

-- Invites (invite-based account creation for staff/rider/manager)
CREATE TABLE invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  status invite_status NOT NULL DEFAULT 'pending',
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  used_by UUID REFERENCES users(id) ON DELETE SET NULL,
  email TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT invite_role_check CHECK (role IN ('branch_manager', 'staff', 'rider'))
);

CREATE INDEX idx_invites_code ON invites(code);
CREATE INDEX idx_invites_branch_id ON invites(branch_id);

-- Orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  rider_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status order_status NOT NULL DEFAULT 'pending',
  pickup_address TEXT NOT NULL,
  pickup_latitude DOUBLE PRECISION NOT NULL,
  pickup_longitude DOUBLE PRECISION NOT NULL,
  delivery_address TEXT NOT NULL,
  delivery_latitude DOUBLE PRECISION NOT NULL,
  delivery_longitude DOUBLE PRECISION NOT NULL,
  pickup_scheduled_at TIMESTAMPTZ,
  delivery_estimated_at TIMESTAMPTZ,
  special_instructions TEXT,
  subtotal INTEGER NOT NULL DEFAULT 0,
  delivery_fee INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_branch_id ON orders(branch_id);
CREATE INDEX idx_orders_rider_id ON orders(rider_id);
CREATE INDEX idx_orders_status ON orders(status);

-- Order Items
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  clothing_type clothing_type NOT NULL,
  fabric_type fabric_type NOT NULL DEFAULT 'unknown',
  color_category color_category NOT NULL DEFAULT 'mixed',
  quantity INTEGER NOT NULL DEFAULT 1,
  has_stains BOOLEAN NOT NULL DEFAULT false,
  stain_description TEXT,
  wash_recommendation JSONB,
  unit_price INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- Order Status Events (audit trail)
CREATE TABLE order_status_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status order_status NOT NULL,
  changed_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_status_events_order_id ON order_status_events(order_id);

-- Payments
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  paymongo_payment_intent_id TEXT NOT NULL,
  paymongo_payment_id TEXT,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'PHP',
  status payment_status NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_order_id ON payments(order_id);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  channel notification_channel NOT NULL DEFAULT 'web_push',
  status notification_status NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);

-- Rider Locations (GPS pings for real-time tracking)
CREATE TABLE rider_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  recorded_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rider_locations_rider_id ON rider_locations(rider_id);
CREATE INDEX idx_rider_locations_order_id ON rider_locations(order_id);
CREATE INDEX idx_rider_locations_recorded_at ON rider_locations(recorded_at DESC);

-- Price Configs (per-branch pricing)
CREATE TABLE price_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  clothing_type clothing_type NOT NULL,
  base_price INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(branch_id, clothing_type)
);

CREATE INDEX idx_price_configs_branch_id ON price_configs(branch_id);


-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_branches_updated_at
  BEFORE UPDATE ON branches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_price_configs_updated_at
  BEFORE UPDATE ON price_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE rider_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_configs ENABLE ROW LEVEL SECURITY;

-- Helper function: get user role
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS user_role AS $$
  SELECT role FROM users WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: get user branch_id
CREATE OR REPLACE FUNCTION get_user_branch_id(user_id UUID)
RETURNS UUID AS $$
  SELECT branch_id FROM users WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- BRANCHES policies
CREATE POLICY "Branches are viewable by everyone"
  ON branches FOR SELECT
  USING (true);

CREATE POLICY "Platform admin can manage branches"
  ON branches FOR ALL
  USING (get_user_role(auth.uid()) = 'platform_admin');


-- USERS policies
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Platform admin can view all users"
  ON users FOR SELECT
  USING (get_user_role(auth.uid()) = 'platform_admin');

CREATE POLICY "Branch managers can view their branch users"
  ON users FOR SELECT
  USING (
    get_user_role(auth.uid()) = 'branch_manager'
    AND branch_id = get_user_branch_id(auth.uid())
  );

CREATE POLICY "Staff can view their branch riders"
  ON users FOR SELECT
  USING (
    get_user_role(auth.uid()) = 'staff'
    AND branch_id = get_user_branch_id(auth.uid())
    AND role IN ('rider', 'staff')
  );

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Service role can insert users"
  ON users FOR INSERT
  WITH CHECK (true);


-- INVITES policies
CREATE POLICY "Managers can view their branch invites"
  ON invites FOR SELECT
  USING (
    get_user_role(auth.uid()) IN ('branch_manager', 'platform_admin')
    AND (
      get_user_role(auth.uid()) = 'platform_admin'
      OR branch_id = get_user_branch_id(auth.uid())
    )
  );

CREATE POLICY "Managers can create invites for their branch"
  ON invites FOR INSERT
  WITH CHECK (
    get_user_role(auth.uid()) IN ('branch_manager', 'platform_admin')
    AND (
      get_user_role(auth.uid()) = 'platform_admin'
      OR branch_id = get_user_branch_id(auth.uid())
    )
  );


-- ORDERS policies
CREATE POLICY "Customers can view their own orders"
  ON orders FOR SELECT
  USING (customer_id = auth.uid());

CREATE POLICY "Branch staff can view their branch orders"
  ON orders FOR SELECT
  USING (
    get_user_role(auth.uid()) IN ('branch_manager', 'staff', 'rider')
    AND branch_id = get_user_branch_id(auth.uid())
  );

CREATE POLICY "Platform admin can view all orders"
  ON orders FOR SELECT
  USING (get_user_role(auth.uid()) = 'platform_admin');

CREATE POLICY "Customers can create orders"
  ON orders FOR INSERT
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Branch staff can update their branch orders"
  ON orders FOR UPDATE
  USING (
    get_user_role(auth.uid()) IN ('branch_manager', 'staff')
    AND branch_id = get_user_branch_id(auth.uid())
  );

CREATE POLICY "Riders can update orders assigned to them"
  ON orders FOR UPDATE
  USING (
    get_user_role(auth.uid()) = 'rider'
    AND rider_id = auth.uid()
  );


-- ORDER ITEMS policies
CREATE POLICY "Order items viewable by order viewers"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND (
        orders.customer_id = auth.uid()
        OR (
          get_user_role(auth.uid()) IN ('branch_manager', 'staff', 'rider')
          AND orders.branch_id = get_user_branch_id(auth.uid())
        )
        OR get_user_role(auth.uid()) = 'platform_admin'
      )
    )
  );

CREATE POLICY "Order items insertable by order owner"
  ON order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.customer_id = auth.uid()
    )
  );


-- ORDER STATUS EVENTS policies
CREATE POLICY "Status events viewable by order viewers"
  ON order_status_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_status_events.order_id
      AND (
        orders.customer_id = auth.uid()
        OR (
          get_user_role(auth.uid()) IN ('branch_manager', 'staff', 'rider')
          AND orders.branch_id = get_user_branch_id(auth.uid())
        )
        OR get_user_role(auth.uid()) = 'platform_admin'
      )
    )
  );

CREATE POLICY "Staff and riders can insert status events"
  ON order_status_events FOR INSERT
  WITH CHECK (changed_by = auth.uid());


-- PAYMENTS policies
CREATE POLICY "Customers can view their payment records"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = payments.order_id
      AND orders.customer_id = auth.uid()
    )
  );

CREATE POLICY "Branch staff can view their branch payments"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = payments.order_id
      AND orders.branch_id = get_user_branch_id(auth.uid())
      AND get_user_role(auth.uid()) IN ('branch_manager', 'staff')
    )
  );

CREATE POLICY "Platform admin can view all payments"
  ON payments FOR SELECT
  USING (get_user_role(auth.uid()) = 'platform_admin');


-- NOTIFICATIONS policies
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());


-- RIDER LOCATIONS policies
CREATE POLICY "Rider can insert their own locations"
  ON rider_locations FOR INSERT
  WITH CHECK (rider_id = auth.uid());

CREATE POLICY "Rider locations viewable for active order tracking"
  ON rider_locations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = rider_locations.order_id
      AND (
        orders.customer_id = auth.uid()
        OR rider_locations.rider_id = auth.uid()
        OR (
          get_user_role(auth.uid()) IN ('branch_manager', 'staff')
          AND orders.branch_id = get_user_branch_id(auth.uid())
        )
        OR get_user_role(auth.uid()) = 'platform_admin'
      )
    )
  );


-- PRICE CONFIGS policies
CREATE POLICY "Price configs viewable by everyone"
  ON price_configs FOR SELECT
  USING (true);

CREATE POLICY "Branch managers can manage their branch pricing"
  ON price_configs FOR ALL
  USING (
    get_user_role(auth.uid()) IN ('branch_manager', 'platform_admin')
    AND (
      get_user_role(auth.uid()) = 'platform_admin'
      OR branch_id = get_user_branch_id(auth.uid())
    )
  );


-- ============================================================
-- ENABLE REALTIME on tables that need live updates
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE rider_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE order_status_events;
