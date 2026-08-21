# gowashgo

**WashGo** is a multi-tenant on-demand laundry delivery & facility operations platform with real-time Mapbox rider GPS tracking, digital scale weigh-after-pickup pricing, AI-assisted wash care programs, and PayMongo / GCash online settlement.

---

## 🔐 System Login Credentials

> **Login URL:** `/login`  
> **Universal Password for all seeded accounts:** `password123`

| Role | Email | Password | Landing Portal | Description |
| :--- | :--- | :--- | :--- | :--- |
| **👑 Superadmin** | `admin@washgo.ph` | `password123` | `/admin` | System-wide oversight, branch pin-picker & manager provisioning |
| **🏢 Branch Manager** | `manager@washgo.ph` | `password123` | `/manager` | Team management, staff/rider invites, pricing & revenue analytics |
| **🧺 Facility Staff** | `staff@washgo.ph` | `password123` | `/staff` | Counter weigh scale intake, AI wash care & machine stage progression |
| **🛵 Delivery Rider** | `rider@washgo.ph` | `password123` | `/rider` | Mobile cockpit, live GPS broadcasting, navigation & photo handover |
| **👤 Customer** | `customer@washgo.ph` | `password123` | `/customer` | 2-step booking, live scooter GPS tracking & GCash/Maya payment |

To re-seed or verify these test accounts in your Supabase database:
```bash
node scripts/seed-auth-users.mjs
```

---

## 🔄 End-to-End System Workflow

### 1. 👑 Superadmin (Platform Setup)
1. Log in as Superadmin at `/login` &rarr; opens `/admin`.
2. Go to **Branches &rarr; New Branch** (`/admin/branches/new`).
3. Pin the branch location on the Mapbox interactive map (e.g., San Juan, Batangas).
4. Enter branch contact details and default `₱/kg` rate.
5. Check **"Create Initial Branch Manager Account"**, enter credentials, and save.

### 2. 🏢 Branch Manager (Team Creation & Management)
1. Log in as Branch Manager at `/login` &rarr; opens `/manager`.
2. Go to **Invites** (`/manager/invites`).
3. Select role (**Staff** or **Rider**) and click **Generate Invite Link**.
4. Send the invite URL (`/invite/[code]`) to employees to self-onboard to your branch.

### 3. 🧺 Complete Order Lifecycle (Customer &rarr; Delivery)
1. **Customer Booking (`/customer/book`)**: Customer sets pickup address via GPS auto-detect/map, picks laundry type and time slot, and confirms booking (`pending`).
2. **Rider Assignment & Pickup (`/rider`)**: Manager/Staff assigns a rider (`rider_assigned`). Rider accepts trip, navigates to customer, collects laundry (`picked_up`), and transports to branch (`at_facility`).
3. **Facility Counter Scale Intake (`/staff`)**: Staff logs verified scale weight (`kg`) in the intake modal. System calculates total price based on branch `₱/kg` rate. AI recommends optimal wash cycle parameters.
4. **Machine Operations (`/staff`)**: Staff advances order through washing stages: *Washing* &rarr; *Drying* &rarr; *Folding* &rarr; *Ready for Delivery*.
5. **Rider Delivery & Live GPS (`/rider` + `/customer`)**: Rider starts delivery (`delivery_en_route`). Customer tracks the rider's live scooter movement in real time on Mapbox.
6. **Handover, Payment & Rating**: Customer pays via PayMongo (GCash / Maya / Card) or Cash on Delivery. Rider captures handover photo proof. Order completes (`completed`), and customer submits a 1–5 star rating.

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

# 3. Seed default test accounts (optional)
node scripts/seed-auth-users.mjs

# 4. Start development server
npm run dev
```
