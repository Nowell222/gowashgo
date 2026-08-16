/* ============================================================
   WashGo — Shared TypeScript Types
   Mirrors the database schema for type safety across the app.
   ============================================================ */

// ---- Enums ----

export type UserRole = 'platform_admin' | 'branch_manager' | 'staff' | 'rider' | 'customer';
export type InviteStatus = 'pending' | 'used' | 'expired';
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'rider_assigned'
  | 'pickup_en_route'
  | 'picked_up'
  | 'at_facility'
  | 'washing'
  | 'drying'
  | 'folding'
  | 'ready_for_delivery'
  | 'delivery_en_route'
  | 'delivered'
  | 'completed'
  | 'cancelled';

export type ClothingType = 'shirt' | 'pants' | 'underwear' | 'socks' | 'bedsheet' | 'towel' | 'jacket' | 'delicate' | 'other';
export type FabricType = 'cotton' | 'polyester' | 'silk' | 'wool' | 'linen' | 'denim' | 'synthetic_blend' | 'unknown';
export type ColorCategory = 'white' | 'light' | 'dark' | 'colored' | 'mixed';
export type PaymentMethod = 'online' | 'cash';
export type PaymentStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'refunded';
export type NotificationChannel = 'web_push' | 'sms' | 'email';
export type NotificationStatus = 'pending' | 'sent' | 'failed';

// ---- Database Row Types ----

export interface Branch {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  email: string | null;
  base_processing_minutes: number;
  price_per_kg: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  phone: string | null;
  full_name: string;
  role: UserRole;
  branch_id: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Invite {
  id: string;
  code: string;
  branch_id: string;
  role: UserRole;
  status: InviteStatus;
  created_by: string;
  used_by: string | null;
  email: string | null;
  expires_at: string;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  branch_id: string;
  rider_id: string | null;
  status: OrderStatus;
  payment_method: PaymentMethod;
  weight_kg: number | null;
  cash_collected: boolean;
  delivery_proof_url: string | null;
  picked_up_proof_url: string | null;
  cancellation_reason: string | null;
  intake_discrepancy_note: string | null;
  pickup_address: string;
  pickup_latitude: number;
  pickup_longitude: number;
  delivery_address: string;
  delivery_latitude: number;
  delivery_longitude: number;
  pickup_scheduled_at: string | null;
  delivery_estimated_at: string | null;
  special_instructions: string | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  created_at: string;
  updated_at: string;
}

export interface OrderRating {
  id: string;
  order_id: string;
  customer_id: string;
  branch_id: string;
  stars: number;
  note: string | null;
  created_at: string;
}

export interface CustomerAddress {
  id: string;
  customer_id: string;
  label: string;
  address: string;
  latitude: number;
  longitude: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface RiderCashSettlement {
  id: string;
  rider_id: string;
  branch_id: string;
  manager_id: string | null;
  amount: number;
  shift_date: string;
  orders_count: number;
  is_settled: boolean;
  settled_at: string | null;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  clothing_type: ClothingType;
  fabric_type: FabricType;
  color_category: ColorCategory;
  quantity: number;
  has_stains: boolean;
  stain_description: string | null;
  wash_recommendation: WashRecommendation | null;
  unit_price: number;
  created_at: string;
}

export interface OrderStatusEvent {
  id: string;
  order_id: string;
  status: OrderStatus;
  changed_by: string;
  note: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  order_id: string;
  paymongo_payment_intent_id: string;
  paymongo_payment_id: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  payment_method: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  order_id: string | null;
  title: string;
  body: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  sent_at: string | null;
  read_at: string | null;
  created_at: string;
}

export interface RiderLocation {
  id: string;
  rider_id: string;
  order_id: string | null;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  recorded_at: string;
  created_at: string;
}

export interface PriceConfig {
  id: string;
  branch_id: string;
  clothing_type: ClothingType;
  base_price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ---- AI Feature Types ----

export interface WashRecommendation {
  wash_program: 'normal' | 'delicate' | 'heavy_duty' | 'hand_wash' | 'dry_clean_only';
  water_temp: 'cold' | 'warm' | 'hot';
  special_handling: string[];
  confidence: 'rule_based';
  notes: string;
}

export interface DeliveryEstimate {
  estimated_delivery_at: string;
  breakdown: {
    processing_min: number;
    queue_min: number;
    driving_min: number;
    buffer_min: number;
    total_min: number;
  };
}

// ---- API Response Types ----

export interface ApiResponse<T> {
  data: T;
}

export interface ApiListResponse<T> {
  data: T[];
  count: number;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

// ---- Extended types with joins ----

export interface OrderWithItems extends Order {
  order_items: OrderItem[];
}

export interface OrderWithDetails extends Order {
  order_items: OrderItem[];
  payments?: Payment[];
  ratings?: OrderRating[];
  customer: Pick<User, 'id' | 'full_name' | 'email' | 'phone' | 'avatar_url'>;
  rider: Pick<User, 'id' | 'full_name' | 'phone' | 'avatar_url'> | null;
  branch: Pick<Branch, 'id' | 'name' | 'address' | 'latitude' | 'longitude'>;
  status_events: OrderStatusEvent[];
}

export interface InviteWithCreator extends Invite {
  creator: Pick<User, 'id' | 'full_name' | 'email'>;
  branch: Pick<Branch, 'id' | 'name'>;
}
