# gowashgo

**WashGo** is a multi-tenant on-demand laundry delivery & facility operations platform with real-time Mapbox rider GPS tracking, digital scale weigh-after-pickup pricing, AI-assisted wash care programs, and PayMongo / GCash online settlement.

---

## 🌟 Key Features

- **2-Step Customer Booking**: Fast pickup booking with Mapbox reverse-geocoding, device GPS auto-detection, upfront weight-based price estimates, and zero garment-counting friction.
- **Counter Weigh Intake & Scale Calculation**: Staff logs verified scale weight (`₱/kg`) and fabric tags at facility intake to calculate accurate billings.
- **Real-Time Mapbox GL Live Telemetry**: Dynamic vector map tracking rider movement, branch facilities, and delivery routes with device GPS broadcasts.
- **Payment-Gated Completion**: Single delivery handover verification enforcing paid online settlement or rider cash collection with mandatory photo proof attachments.
- **Multi-Tenant Operations Portals**:
  - **Platform Admin (`/admin`)**: Interactive branch pin-picker (focused on San Juan, Batangas) + instant branch manager account provisioning.
  - **Branch Manager (`/manager`)**: Local staff and rider team management, order dispatching, custom ₱/kg pricing, and revenue analytics.
  - **Counter Staff (`/staff`)**: Scale weighing modal, machine workflow status advancement (*Washing* $\rightarrow$ *Drying* $\rightarrow$ *Folding* $\rightarrow$ *Ready*).
  - **Delivery Rider (`/rider`)**: Mobile cockpit with GPS telemetry broadcasting, pickup navigation, and in-app photo handover proof modal.
  - **Customer (`/customer`)**: Live order status timeline, realtime scooter tracking, and GCash/Maya/Card online checkout.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router) + TypeScript
- **Database & Auth**: Supabase (PostgreSQL with Row-Level Security)
- **Maps & Geocoding**: Mapbox GL JS
- **Payment Gateway**: PayMongo API (GCash, Maya, Card)
- **Styling**: Vanilla CSS Design System with Sky Blue / Fresh Laundry aesthetic

---

## 🚀 Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables in .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token

# 3. Start development server
npm run dev
```
