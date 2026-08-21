# 🧺 WashGo — Complete System Documentation & User Manual

> **WashGo** is an enterprise multi-tenant, on-demand laundry operations and delivery platform built with **Next.js 16 (App Router)**, **Supabase (PostgreSQL + RLS + Realtime)**, **Mapbox GL JS**, and **PayMongo**.

---

## 📑 Table of Contents
1. [🔐 System Login Credentials](#-system-login-credentials)
2. [🏗️ System Architecture & Portals](#️-system-architecture--portals)
3. [👑 Superadmin Portal (`/admin`)](#-superadmin-portal-admin)
4. [🏢 Branch Manager Portal (`/manager`)](#-branch-manager-portal-manager)
5. [🧺 Facility Staff Workstation (`/staff`)](#-facility-staff-workstation-staff)
6. [🛵 Delivery Rider Mobile Cockpit (`/rider`)](#-delivery-rider-mobile-cockpit-rider)
7. [👤 Customer Mobile Web App (`/customer`)](#-customer-mobile-web-app-customer)
8. [🔄 End-to-End Order Status Machine](#-end-to-end-order-status-machine)
9. [💳 Payment Methods & Settlement](#-payment-methods--settlement)
10. [⚙️ Environment Variables & Setup](#️-environment-variables--setup)
11. [🚀 Deployment Guide](#-deployment-guide)

---

## 🔐 System Login Credentials

The system comes pre-seeded with 5 distinct role accounts for testing and evaluation.

> **Universal Password for all test accounts:** `password123`  
> **Central Login Page:** `https://gowashgo.vercel.app/login` (or `/login` on localhost)

| Role | Email | Password | Landing Page | Primary Responsibilities |
| :--- | :--- | :--- | :--- | :--- |
| **👑 Superadmin** | `admin@washgo.ph` | `password123` | `/admin` | System-wide oversight, interactive branch pin-picker & manager provisioning |
| **🏢 Branch Manager** | `manager@washgo.ph` | `password123` | `/manager` | Team management, staff/rider invite generation, pricing & revenue analytics |
| **🧺 Facility Staff** | `staff@washgo.ph` | `password123` | `/staff` | Counter weigh scale intake, AI wash care recommendation & machine stage progression |
| **🛵 Delivery Rider** | `rider@washgo.ph` | `password123` | `/rider` | Mobile cockpit, live Mapbox GPS telemetry, bag photo proof & delivery handover |
| **👤 Customer** | `customer@washgo.ph` | `password123` | `/customer` | 2-step booking, on-screen QR pickup pass, live scooter tracking & GCash payment |

To re-seed or verify these test accounts in the PostgreSQL database:
```bash
node scripts/seed-auth-users.mjs
```

---

## 🏗️ System Architecture & Portals

```
                         ┌─────────────────────────────┐
                         │   Next.js 16 Full-Stack     │
                         │   (Vercel Single Deploy)    │
                         └──────────────┬──────────────┘
                                        │
        ┌───────────────────────────────┼──────────────────────────────┐
        │                               │                              │
┌───────▼────────┐             ┌────────▼────────┐            ┌────────▼────────┐
│ Desktop Portal │             │   Mobile PWA    │            │ Serverless APIs │
│ /admin         │             │ /customer       │            │ app/api/**      │
│ /manager       │             │ /rider          │            │ (17 Endpoints)  │
│ /staff         │             │                 │            │                 │
└───────┬────────┘             └────────┬────────┘            └────────┬────────┘
        │                               │                              │
        └───────────────────────────────┼──────────────────────────────┘
                                        │
                ┌───────────────────────┼───────────────────────┐
                │                       │                       │
        ┌───────▼───────┐       ┌───────▼───────┐       ┌───────▼───────┐
        │ Supabase Auth │       │ Mapbox GL JS  │       │  PayMongo API │
        │ PostgreSQL+RLS│       │ Live Routing  │       │ GCash / Maya  │
        └───────────────┘       └───────────────┘       └───────────────┘
```

---

## 👑 Superadmin Portal (`/admin`)

The Superadmin (Platform Admin) has system-wide visibility across all branch operations, revenue streams, and tenant accounts.

### Key Capabilities:
1. **Interactive Branch Pin-Picker (`/admin/branches/new`):**
   * Pan and drop a pin on the Mapbox interactive map (centered around San Juan, Batangas and beyond).
   * Reverse-geocodes street address automatically.
   * Sets default `₱/kg` rate and processing turnaround time.
2. **Instant Branch Manager Provisioning:**
   * One-click creation of the initial Branch Manager account directly inside the branch creation form.
3. **Multi-Branch Overview (`/admin/branches`):**
   * Real-time metrics per branch: active loads, daily revenue, active riders, machine utilization.
4. **Global User Management (`/admin/users`):**
   * View, filter, activate, or deactivate accounts across all roles.

---

## 🏢 Branch Manager Portal (`/manager`)

The Branch Manager is the operational lead of a specific branch facility.

### Key Capabilities:
1. **Team Onboarding & Invites (`/manager/invites`):**
   * Generates secure, single-use or reusable invite links for **Staff** and **Riders**.
   * Link format: `https://gowashgo.vercel.app/invite/[code]`.
   * Onboarding staff/riders simply click the link, enter their name/password, and are instantly registered and linked to the manager's branch.
2. **Live Order Dispatching (`/manager/orders`):**
   * Assign incoming customer orders to available branch riders.
3. **Custom Pricing Configuration (`/manager/pricing`):**
   * Customize base price per kilogram (`₱/kg`) and special garment rates (delicates, bedsheets, heavy jackets).
4. **Cash Settlement & Revenue Checklist:**
   * Audit rider COD collections and reconcile daily cash drawers.
   * Export branch order and revenue summaries to CSV.

---

## 🧺 Facility Staff Workstation (`/staff`)

Designed for branch counter tablets and desktop workstations.

### Key Capabilities:
1. **Digital Scale Intake Modal:**
   * Upon rider bag dropoff, staff inputs the exact weighed scale weight in kilograms (e.g., `4.2 kg`).
   * Automatically calculates total customer bill based on branch rate tables.
2. **AI-Assisted Wash Care Recommendation:**
   * Analyzes fabric load types and recommends:
     - Optimal water temperature (Cold / Warm / Hot)
     - Spin cycle & agitation level
     - Detergent & softener dosage
3. **One-Click Machine Progression:**
   * Staff advances order stages with a single click:
     $$\text{At Facility} \longrightarrow \text{Washing} \longrightarrow \text{Drying} \longrightarrow \text{Folding} \longrightarrow \text{Ready for Delivery}$$

---

## 🛵 Delivery Rider Mobile Cockpit (`/rider`)

Optimized for smartphones and mounted motorcycle navigation brackets.

### Key Capabilities:
1. **Live GPS Telemetry Broadcasting:**
   * High-accuracy device GPS tracking emits real-time coordinate pings every 6 seconds.
   * Built-in Screen Wake Lock prevents phone display from turning off while driving.
   * Offline ping queue saves coordinates during cellular dead-zones and flushes upon reconnection.
2. **Interactive Mapbox Street Navigation:**
   * Live road navigation route lines dynamically drawn from rider to customer location.
   * Dynamic ETA and remaining distance calculation.
3. **Mandatory Bag Pickup Photo (`picked_up`):**
   * In-app camera captures the customer's laundry bag tag at pickup.
4. **Payment Verification & Proof of Delivery Handover (`delivered`):**
   * Shows whether the order is already paid online (GCash/Card) or requires COD cash collection.
   * Captures handover delivery photo proof before completing the job.

---

## 👤 Customer Mobile Web App (`/customer`)

Fast, friction-free mobile web experience with zero garment-counting hassle.

### Key Capabilities:
1. **2-Step Booking (`/customer/book`):**
   * Device GPS auto-detects pickup address or allows pin adjustment on Mapbox.
   * Choose laundry service category and preferred pickup window.
2. **On-Screen QR Pickup Pass:**
   * Dynamic QR pass displayed on customer's phone for rider verification during bag collection.
3. **Real-Time Live Rider Telemetry:**
   * Live vector map displaying the courier scooter icon smoothly gliding on the street map in real time.
4. **Online Settlement via PayMongo:**
   * Pay instantly via GCash, Maya, GrabPay, or Credit/Debit Card.
5. **Rating & Feedback (`/customer/orders/[id]`):**
   * Submit 1–5 star rating and review for rider and branch quality.

---

## 🔄 End-to-End Order Status Machine

```mermaid
stateDiagram-v2
    [*] --> pending: Customer Books Pickup
    pending --> confirmed: Manager / Staff Confirms
    confirmed --> rider_assigned: Rider Assigned
    rider_assigned --> pickup_en_route: Rider Accepts Trip
    pickup_en_route --> picked_up: Bag Photo Captured
    picked_up --> at_facility: Arrived at Branch
    at_facility --> washing: Scale Weighed (₱/kg calculated)
    washing --> drying: Wash Cycle Complete
    drying --> folding: Drying Complete
    folding --> ready_for_delivery: Packed & Tagged
    ready_for_delivery --> delivery_en_route: Rider Starts Delivery
    delivery_en_route --> delivered: Handover Photo & Payment
    delivered --> completed: Customer Rating & Archived
    completed --> [*]
```

### Transition Permissions Matrix:
| Transition | Allowed Roles | Required Action / Payload |
| :--- | :--- | :--- |
| `pending` &rarr; `confirmed` | `branch_manager`, `staff` | Order review |
| `confirmed` &rarr; `rider_assigned` | `branch_manager`, `staff` | Select rider ID |
| `rider_assigned` &rarr; `pickup_en_route` | `rider` | Tap "Accept & Start Pickup" |
| `pickup_en_route` &rarr; `picked_up` | `rider` | **Mandatory Bag Photo Proof** |
| `picked_up` &rarr; `at_facility` | `rider`, `staff` | Facility dropoff |
| `at_facility` &rarr; `washing` | `staff`, `branch_manager` | **Input Scale Weight (kg)** |
| `washing` &rarr; `drying` | `staff`, `branch_manager` | Advance cycle |
| `drying` &rarr; `folding` | `staff`, `branch_manager` | Advance cycle |
| `folding` &rarr; `ready_for_delivery` | `staff`, `branch_manager` | Bag tagging |
| `ready_for_delivery` &rarr; `delivery_en_route` | `rider` | Tap "Start Delivery" |
| `delivery_en_route` &rarr; `delivered` | `rider` | **Handover Photo + COD Check** |
| `delivered` &rarr; `completed` | `customer`, `staff`, `admin` | Rating submitted |

---

## 💳 Payment Methods & Settlement

* **Cash on Delivery (COD):** Rider collects exact cash upon delivery; checkbox confirmation required in rider handover modal.
* **GCash / Maya / Card:** Integrated via PayMongo API with automated webhook callbacks (`/api/webhooks/paymongo`) marking payment rows as `paid`.

---

## ⚙️ Environment Variables & Setup

Create a `.env.local` file in your root project directory:

```env
# Supabase Database & Auth
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres

# Mapbox GL JS Vector Maps & Geocoding
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1IjoieW91ci11c2VyIi...

# PayMongo Online Payments (Phase 4)
PAYMONGO_SECRET_KEY=sk_test_...
PAYMONGO_PUBLIC_KEY=pk_test_...
PAYMONGO_WEBHOOK_SECRET=whsec_...

# App Config
NEXT_PUBLIC_APP_URL=https://gowashgo.vercel.app
NEXT_PUBLIC_APP_NAME=WashGo
VAPID_SUBJECT=mailto:admin@washgo.app
```

---

## 🚀 Deployment Guide

### Deploying to Vercel (1-Click Zero Config):
1. Push your repository to GitHub: `git push origin main`.
2. Go to **[vercel.com/new](https://vercel.com/new)** and import `Nowell222/gowashgo`.
3. Paste your `.env.local` variables into Vercel's **Environment Variables** panel.
4. Click **Deploy**. Both the Next.js frontend and all 17 `/api/**` routes deploy automatically to your live `.vercel.app` URL.
