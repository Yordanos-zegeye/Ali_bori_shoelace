# Ali Bori Shoe Lace Factory ERP - Supabase Backend Setup Guide

The Ali Bori Shoe Lace Factory ERP backend has been completely transitioned to **Supabase** (PostgreSQL, Supabase Auth, Row-Level Security, RPC Database Functions, and the `@supabase/supabase-js` client SDK).

---

## Architecture Summary

```mermaid
graph TB
    subgraph Frontend ["Frontend (React 19 + TypeScript + Vite)"]
        UI[21 Factory UI Pages]
        AuthCtx[Supabase AuthContext]
        Client[Supabase Client & RPC Adapter Layer]
    end

    subgraph Supabase ["Supabase Backend Platform"]
        Auth[Supabase Auth (JWT & Roles)]
        PostgREST[PostgREST REST API]
        RPC[PostgreSQL Stored Procedures]
        Tables[(28+ Relational Schema Tables)]
        RLS[Row Level Security Policies]
    end

    UI --> Client
    UI --> AuthCtx
    AuthCtx --> Auth
    Client --> PostgREST
    Client --> RPC
    PostgREST --> Tables
    RPC --> Tables
    RLS -. Enforces Security .-> Tables
```

---

## 3-Step Setup

### Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. Click **New Project**, choose an organization and name (e.g., `ali-bori-erp`), and select your preferred region.
3. Save your database password safely.

---

### Step 2: Initialize Database Schema & Business Logic

1. In the Supabase Dashboard, click on **SQL Editor** in the left navigation.
2. Click **New query**.
3. Open [`supabase/schema.sql`](./supabase/schema.sql), copy its entire content, paste it into the SQL Editor, and click **Run**.
   - *This creates all 28+ tables, types, check constraints, foreign keys, RLS policies, and all 9 business RPC functions (`create_production_batch`, `move_batch_to_b2`, `weigh_and_store_batch`, `create_dispatch_order`, `collect_order_payment`, `calculate_payroll_period`, `bulk_mark_attendance`, `get_dashboard_analytics`, `toggle_user_active`).*
4. Next, open [`supabase/seed_data.sql`](./supabase/seed_data.sql), paste it into the SQL Editor, and click **Run**.
   - *This seeds the initial colors, thicknesses, products, machines, spare parts, inventory, customers, employees, and payroll policy.*

---

### Step 3: Configure Frontend Environment Variables

1. In the Supabase Dashboard, navigate to **Project Settings** $\rightarrow$ **API**.
2. Copy your **Project URL** and **anon public key**.
3. Open [`frontend/.env`](./frontend/.env) and set the values:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-anon-key
```

4. Start the frontend:

```bash
cd frontend
npm run dev
```

---

## Business Logic Enforced in Supabase

| Feature | Supabase Implementation |
|---|---|
| **Sequential Batch Numbering** | `create_production_batch` RPC (`BATCH-YYYY-XXXXX`) |
| **Automatic Stock Requests** | Linked request creation (`REQ-YYYY-XXXXX`) & stock deduction |
| **Phase 1 $\rightarrow$ Phase 2 WIP Transfer** | `move_batch_to_b2` RPC with weight check constraints |
| **Finished Bag Weight Boundary** | `CHECK (weight_kg >= 25.00 AND weight_kg <= 40.00)` on `store_finished_product_bags` |
| **Automatic Bag Barcoding** | `weigh_and_store_batch` RPC (`ABSL-YYYY-XXXXXX`) |
| **Single-Dispatch Lock** | Bags marked `DISPATCHED` are locked against double-dispatch in `create_dispatch_order` |
| **Customer Credit Limit Guard** | Deliveries blocked if `current_outstanding + order > credit_limit` |
| **Threshold Alerts** | Automatic warning notification generated when customer utilizes $\ge 80\%$ credit |
| **Receivables & Payments** | `collect_order_payment` updates status: `PENDING` $\rightarrow$ `PARTIAL` $\rightarrow$ `SETTLED` |
| **Payroll Engine** | `calculate_payroll_period` calculates absence deductions, 1.5x overtime, Saturday rates, allowances |
| **Real-time Analytics** | `get_dashboard_analytics` aggregates all 9 metric sectors in single high-performance query |

---

## Demo Accounts (Instant Offline / Online Access)

| Role | Email | Password | Access Scope |
|---|---|---|---|
| **Super Admin** | `admin@alibori.com` | `admin123` | Full access to all 21 pages and system settings |
| **Factory Monitor** | `monitor@alibori.com` | `monitor123` | Production, Machines, Inventory, Workforce |
| **Store / Shop** | `store@alibori.com` | `store123` | Store bags, customer dispatches, receivables |
