-- ==============================================================================
-- ALI BORI SHOE LACE FACTORY ERP - COMPLETE SUPABASE SCHEMA & STORED FUNCTIONS
-- ==============================================================================
-- This script sets up all tables, foreign keys, indexes, triggers, sequence
-- generators, RPC business logic functions, and Row-Level Security (RLS) policies.
-- Run this script in the Supabase SQL Editor.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. ENUMS & DOMAINS
-- ==============================================================================
DO $$ BEGIN
    CREATE TYPE user_role_enum AS ENUM ('super_admin', 'factory_monitor', 'store');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE machine_health_enum AS ENUM ('NORMAL', 'NEEDS_SERVICE', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE machine_status_enum AS ENUM ('ACTIVE', 'MAINTENANCE', 'OFFLINE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE bag_status_enum AS ENUM ('IN_STORE', 'RESERVED', 'DISPATCHED', 'RETURNED', 'DAMAGED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE batch_status_enum AS ENUM ('PLANNED', 'IN_PROGRESS', 'PHASE_1_COMPLETE', 'TRANSFERRED', 'PHASE_2_IN_PROGRESS', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE payment_mode_enum AS ENUM ('CASH', 'CREDIT');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE order_status_enum AS ENUM ('PENDING', 'PARTIAL', 'SETTLED', 'OVERDUE', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE stock_request_status_enum AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PARTIALLY_ISSUED', 'ISSUED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE attendance_status_enum AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'LEAVE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE payroll_period_status_enum AS ENUM ('DRAFT', 'CALCULATED', 'APPROVED', 'PAID');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE absence_deduction_method_enum AS ENUM ('DAILY_RATE', 'PERCENTAGE_OF_SALARY', 'FIXED_AMOUNT');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ==============================================================================
-- 3. CORE RELATIONAL TABLES
-- ==============================================================================

-- 3.1 SALES & CUSTOMERS (Created early for FK references)
CREATE TABLE IF NOT EXISTS sales_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    customer_type VARCHAR(50) DEFAULT 'WHOLESALER',
    phone VARCHAR(50),
    address TEXT,
    contact_person VARCHAR(150),
    credit_limit NUMERIC(14,2) NOT NULL DEFAULT 0.00 CHECK (credit_limit >= 0),
    current_outstanding NUMERIC(14,2) NOT NULL DEFAULT 0.00 CHECK (current_outstanding >= 0),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.2 USER PROFILES (Links to Supabase auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255),
    full_name VARCHAR(255),
    role user_role_enum NOT NULL DEFAULT 'store',
    phone_number VARCHAR(50),
    store_name VARCHAR(150),
    department VARCHAR(100),
    customer_id UUID REFERENCES sales_customers(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.3 CATALOG
CREATE TABLE IF NOT EXISTS catalog_colors (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    code VARCHAR(20),
    hex_code VARCHAR(20) DEFAULT '#888888',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS catalog_thicknesses (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    value_mm NUMERIC(6,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS catalog_products (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(50) DEFAULT 'SHOE_LACE',
    unit VARCHAR(20) DEFAULT 'KG',
    remark TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS catalog_product_variants (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES catalog_products(id) ON DELETE CASCADE,
    serial_code VARCHAR(100) UNIQUE NOT NULL,
    color_id BIGINT REFERENCES catalog_colors(id) ON DELETE SET NULL,
    thickness_id BIGINT REFERENCES catalog_thicknesses(id) ON DELETE SET NULL,
    specification TEXT,
    unit_price NUMERIC(12,2) NOT NULL DEFAULT 150.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS catalog_product_stocks (
    id BIGSERIAL PRIMARY KEY,
    variant_id BIGINT UNIQUE NOT NULL REFERENCES catalog_product_variants(id) ON DELETE CASCADE,
    daily_product NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    in_qty NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    out_qty NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    st_v NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    calculated_stock NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    remark TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.4 ASSETS & MACHINES
CREATE TABLE IF NOT EXISTS assets_machine_types (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    maintenance_interval_days INT NOT NULL DEFAULT 30,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS assets_machines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    machine_type_id BIGINT REFERENCES assets_machine_types(id) ON DELETE SET NULL,
    building VARCHAR(50) NOT NULL DEFAULT 'Building 1',
    room VARCHAR(50) DEFAULT 'Braiding Floor',
    product_type VARCHAR(100),
    place VARCHAR(100),
    health machine_health_enum NOT NULL DEFAULT 'NORMAL',
    most_frequent_issue TEXT,
    service_time VARCHAR(100),
    last_service_date DATE,
    next_service_date DATE,
    performance_score NUMERIC(5,2) NOT NULL DEFAULT 100.00,
    performance_percent INT NOT NULL DEFAULT 100,
    total INT NOT NULL DEFAULT 1,
    status machine_status_enum NOT NULL DEFAULT 'ACTIVE',
    remark TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS assets_spare_parts (
    id BIGSERIAL PRIMARY KEY,
    part_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    place VARCHAR(100),
    room VARCHAR(50),
    shelf VARCHAR(50),
    quantity NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    minimum_stock NUMERIC(10,2) NOT NULL DEFAULT 5.00,
    unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    remark TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS assets_machine_type_spare_part_compatibilities (
    id BIGSERIAL PRIMARY KEY,
    machine_type_id BIGINT NOT NULL REFERENCES assets_machine_types(id) ON DELETE CASCADE,
    spare_part_id BIGINT NOT NULL REFERENCES assets_spare_parts(id) ON DELETE CASCADE,
    UNIQUE(machine_type_id, spare_part_id)
);

CREATE TABLE IF NOT EXISTS assets_spare_part_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spare_part_id BIGINT NOT NULL REFERENCES assets_spare_parts(id) ON DELETE CASCADE,
    machine_id UUID REFERENCES assets_machines(id) ON DELETE SET NULL,
    transaction_type VARCHAR(30) NOT NULL DEFAULT 'CONSUMPTION',
    quantity_changed NUMERIC(10,2) NOT NULL,
    balance_after NUMERIC(10,2) NOT NULL,
    technician VARCHAR(150),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS assets_utilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    equipment_type VARCHAR(100),
    assigned_location VARCHAR(100),
    status VARCHAR(50) DEFAULT 'OPERATIONAL',
    last_inspected DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS assets_utility_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    utility_id UUID REFERENCES assets_utilities(id) ON DELETE CASCADE,
    expense_type VARCHAR(100) NOT NULL,
    amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    receipt_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.5 INVENTORY & RAW MATERIALS
CREATE TABLE IF NOT EXISTS inventory_storage_locations (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    building VARCHAR(50) NOT NULL DEFAULT 'Building 1',
    room VARCHAR(50),
    description TEXT
);

CREATE TABLE IF NOT EXISTS inventory_raw_material_types (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    unit VARCHAR(20) DEFAULT 'KG'
);

CREATE TABLE IF NOT EXISTS inventory_raw_materials (
    id BIGSERIAL PRIMARY KEY,
    material_type_id BIGINT NOT NULL REFERENCES inventory_raw_material_types(id) ON DELETE CASCADE,
    color_name VARCHAR(100) NOT NULL DEFAULT 'Natural',
    code VARCHAR(100) UNIQUE NOT NULL,
    minimum_stock_kg NUMERIC(12,2) NOT NULL DEFAULT 100.00,
    unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS inventory_raw_material_stocks (
    id BIGSERIAL PRIMARY KEY,
    variant_id BIGINT NOT NULL REFERENCES inventory_raw_materials(id) ON DELETE CASCADE,
    storage_location_id BIGINT REFERENCES inventory_storage_locations(id) ON DELETE SET NULL,
    available_kg NUMERIC(14,2) NOT NULL DEFAULT 0.00 CHECK (available_kg >= 0),
    reserved_kg NUMERIC(14,2) NOT NULL DEFAULT 0.00 CHECK (reserved_kg >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(variant_id, storage_location_id)
);

CREATE TABLE IF NOT EXISTS inventory_raw_material_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id BIGINT NOT NULL REFERENCES inventory_raw_materials(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL,
    quantity_kg NUMERIC(14,2) NOT NULL,
    balance_after_kg NUMERIC(14,2) NOT NULL,
    reference_batch_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS inventory_stock_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_number VARCHAR(100) UNIQUE NOT NULL,
    requester_name VARCHAR(150) NOT NULL,
    department VARCHAR(100) NOT NULL DEFAULT 'PRODUCTION',
    reason TEXT,
    status stock_request_status_enum NOT NULL DEFAULT 'PENDING',
    approved_by VARCHAR(150),
    approved_at TIMESTAMPTZ,
    issued_by VARCHAR(150),
    issued_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS inventory_stock_request_items (
    id BIGSERIAL PRIMARY KEY,
    stock_request_id UUID NOT NULL REFERENCES inventory_stock_requests(id) ON DELETE CASCADE,
    item_type VARCHAR(50) NOT NULL DEFAULT 'RAW_MATERIAL',
    raw_material_id BIGINT REFERENCES inventory_raw_materials(id) ON DELETE SET NULL,
    spare_part_id BIGINT REFERENCES assets_spare_parts(id) ON DELETE SET NULL,
    item_description TEXT,
    requested_quantity NUMERIC(12,2) NOT NULL DEFAULT 1.00,
    approved_quantity NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    issued_quantity NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    unit VARCHAR(20) NOT NULL DEFAULT 'KG',
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING'
);

-- 3.6 PRODUCTION & MANUFACTURING
CREATE TABLE IF NOT EXISTS production_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_number VARCHAR(100) UNIQUE NOT NULL,
    product_variant_id BIGINT NOT NULL REFERENCES catalog_product_variants(id) ON DELETE RESTRICT,
    raw_material_yarn_id BIGINT REFERENCES inventory_raw_materials(id) ON DELETE SET NULL,
    yarn_batch_count INT NOT NULL DEFAULT 1,
    raw_yarn_input_kg NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (raw_yarn_input_kg >= 0),
    acetone_used NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    film_roll_variant_id BIGINT REFERENCES inventory_raw_materials(id) ON DELETE SET NULL,
    film_roll_used NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    braided_output_kg NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (braided_output_kg >= 0),
    phase1_waste_kg NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (phase1_waste_kg >= 0),
    tipping_input_kg NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (tipping_input_kg >= 0),
    finished_output_kg NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (finished_output_kg >= 0),
    phase2_waste_kg NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (phase2_waste_kg >= 0),
    total_waste_kg NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (total_waste_kg >= 0),
    yield_percentage NUMERIC(6,2) NOT NULL DEFAULT 0.00,
    waste_percentage NUMERIC(6,2) NOT NULL DEFAULT 0.00,
    status batch_status_enum NOT NULL DEFAULT 'PLANNED',
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    completion_date DATE,
    supervisor VARCHAR(150),
    stock_request_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS production_phase1_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID UNIQUE NOT NULL REFERENCES production_batches(id) ON DELETE CASCADE,
    machine_id UUID REFERENCES assets_machines(id) ON DELETE SET NULL,
    raw_material_variant_id BIGINT REFERENCES inventory_raw_materials(id) ON DELETE SET NULL,
    building VARCHAR(50) NOT NULL DEFAULT 'Building 1',
    room VARCHAR(50) NOT NULL DEFAULT 'B1',
    operator VARCHAR(150),
    input_weight_kg NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    output_weight_kg NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    waste_kg NUMERIC(12,2) GENERATED ALWAYS AS (GREATEST(0, input_weight_kg - output_weight_kg)) STORED,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS production_wip_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES production_batches(id) ON DELETE CASCADE,
    source_building VARCHAR(50) NOT NULL DEFAULT 'Building 1',
    source_room VARCHAR(50) NOT NULL DEFAULT 'Braiding Floor',
    destination_building VARCHAR(50) NOT NULL DEFAULT 'Building 2',
    destination_room VARCHAR(50) NOT NULL DEFAULT 'Tipping Department',
    weight_kg NUMERIC(12,2) NOT NULL CHECK (weight_kg > 0),
    sender VARCHAR(150),
    receiver VARCHAR(150),
    transfer_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    status VARCHAR(50) NOT NULL DEFAULT 'RECEIVED',
    notes TEXT
);

CREATE TABLE IF NOT EXISTS production_phase2_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID UNIQUE NOT NULL REFERENCES production_batches(id) ON DELETE CASCADE,
    machine_id UUID REFERENCES assets_machines(id) ON DELETE SET NULL,
    operator VARCHAR(150),
    input_weight_kg NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    finished_output_kg NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    waste_kg NUMERIC(12,2) GENERATED ALWAYS AS (GREATEST(0, input_weight_kg - finished_output_kg)) STORED,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS production_batch_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES production_batches(id) ON DELETE CASCADE,
    raw_material_variant_id BIGINT NOT NULL REFERENCES inventory_raw_materials(id) ON DELETE RESTRICT,
    quantity NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    unit VARCHAR(20) NOT NULL DEFAULT 'KG',
    phase VARCHAR(50) NOT NULL DEFAULT 'PHASE_1',
    notes TEXT
);

-- 3.7 STORE & FINISHED GOODS
CREATE TABLE IF NOT EXISTS store_finished_product_bags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bag_id VARCHAR(50) UNIQUE NOT NULL,
    batch_id UUID REFERENCES production_batches(id) ON DELETE SET NULL,
    product_variant_id BIGINT NOT NULL REFERENCES catalog_product_variants(id) ON DELETE RESTRICT,
    weight_kg NUMERIC(8,2) NOT NULL CHECK (weight_kg >= 25.00 AND weight_kg <= 40.00),
    store_location VARCHAR(100) NOT NULL DEFAULT 'Finished Goods Store 1',
    status bag_status_enum NOT NULL DEFAULT 'IN_STORE',
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    dispatched_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS store_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bag_id UUID NOT NULL REFERENCES store_finished_product_bags(id) ON DELETE CASCADE,
    movement_type VARCHAR(50) NOT NULL,
    from_location VARCHAR(100),
    to_location VARCHAR(100),
    reference_order VARCHAR(100),
    notes TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.8 SALES ORDERS & RECEIVABLES
CREATE TABLE IF NOT EXISTS sales_dispatch_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES sales_customers(id) ON DELETE RESTRICT,
    payment_mode payment_mode_enum NOT NULL DEFAULT 'CASH',
    total_kg NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    amount_paid NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    outstanding_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    due_date DATE,
    status order_status_enum NOT NULL DEFAULT 'PENDING',
    notes TEXT,
    created_by VARCHAR(150) DEFAULT 'Sales Dispatcher',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS sales_dispatch_order_items (
    id BIGSERIAL PRIMARY KEY,
    dispatch_order_id UUID NOT NULL REFERENCES sales_dispatch_orders(id) ON DELETE CASCADE,
    bag_id UUID NOT NULL REFERENCES store_finished_product_bags(id) ON DELETE RESTRICT,
    weight_kg NUMERIC(8,2) NOT NULL,
    price_per_kg NUMERIC(10,2) NOT NULL,
    subtotal NUMERIC(14,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS sales_receivables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispatch_order_id UUID UNIQUE NOT NULL REFERENCES sales_dispatch_orders(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES sales_customers(id) ON DELETE CASCADE,
    original_amount NUMERIC(14,2) NOT NULL,
    amount_paid NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    remaining_amount NUMERIC(14,2) NOT NULL,
    due_date DATE,
    status order_status_enum NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS sales_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receivable_id UUID NOT NULL REFERENCES sales_receivables(id) ON DELETE CASCADE,
    amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'CASH',
    reference VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.9 WORKFORCE, ATTENDANCE & PAYROLL
CREATE TABLE IF NOT EXISTS workforce_employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    age INT,
    gender VARCHAR(10) DEFAULT 'FEMALE',
    work_hours_per_day INT NOT NULL DEFAULT 8,
    work_room VARCHAR(50) DEFAULT 'Room 1',
    base_salary NUMERIC(12,2) NOT NULL DEFAULT 5000.00,
    performance_score NUMERIC(5,2) NOT NULL DEFAULT 100.00,
    employment_status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    remark TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS workforce_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES workforce_employees(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status attendance_status_enum NOT NULL DEFAULT 'PRESENT',
    check_in TIME,
    check_out TIME,
    overtime_hours NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    is_saturday BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(employee_id, date)
);

CREATE TABLE IF NOT EXISTS workforce_additional_payment_types (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    target_group VARCHAR(100),
    default_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00
);

CREATE TABLE IF NOT EXISTS workforce_employee_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES workforce_employees(id) ON DELETE CASCADE,
    payment_type_id BIGINT NOT NULL REFERENCES workforce_additional_payment_types(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS workforce_payroll_configs (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL DEFAULT 'Standard Monthly Policy',
    salary_period VARCHAR(50) NOT NULL DEFAULT 'MONTHLY',
    working_days_per_period INT NOT NULL DEFAULT 26,
    absence_deduction_method absence_deduction_method_enum NOT NULL DEFAULT 'DAILY_RATE',
    absence_deduction_rate NUMERIC(10,4) NOT NULL DEFAULT 1.0000,
    overtime_hourly_multiplier NUMERIC(6,2) NOT NULL DEFAULT 1.50,
    saturday_rate NUMERIC(10,2) NOT NULL DEFAULT 500.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS workforce_payroll_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_code VARCHAR(50) UNIQUE NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    working_days INT NOT NULL DEFAULT 26,
    status payroll_period_status_enum NOT NULL DEFAULT 'DRAFT',
    total_gross_salary NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    total_deductions NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    total_net_salary NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    config_snapshot JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS workforce_payroll_slips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_period_id UUID NOT NULL REFERENCES workforce_payroll_periods(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES workforce_employees(id) ON DELETE CASCADE,
    base_salary NUMERIC(12,2) NOT NULL,
    working_days INT NOT NULL,
    present_days INT NOT NULL DEFAULT 0,
    absent_days INT NOT NULL DEFAULT 0,
    late_days INT NOT NULL DEFAULT 0,
    leave_days INT NOT NULL DEFAULT 0,
    overtime_hours NUMERIC(6,2) NOT NULL DEFAULT 0.00,
    overtime_pay NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    saturday_pay NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    additional_allowances NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    absence_deduction NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    other_deductions NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    net_salary NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    calculation_details JSONB,
    status VARCHAR(50) NOT NULL DEFAULT 'CALCULATED',
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(payroll_period_id, employee_id)
);

-- 3.10 DOCUMENTS, AUDIT & NOTIFICATIONS
CREATE TABLE IF NOT EXISTS documents_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'GENERAL',
    file_path TEXT,
    file_type VARCHAR(50),
    file_size_bytes BIGINT,
    description TEXT,
    created_by VARCHAR(150),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient VARCHAR(150) NOT NULL DEFAULT 'all',
    notification_type VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
    title VARCHAR(250) NOT NULL,
    message TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'INFO',
    related_model VARCHAR(100),
    related_object_id VARCHAR(100),
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    target_model VARCHAR(100),
    target_id VARCHAR(100),
    details JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS universal_movement_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_category VARCHAR(50) NOT NULL,
    item_reference VARCHAR(150) NOT NULL,
    movement_type VARCHAR(50) NOT NULL,
    quantity NUMERIC(12,2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    from_location VARCHAR(100),
    to_location VARCHAR(100),
    performed_by VARCHAR(150),
    notes TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 4. BUSINESS LOGIC STORED PROCEDURES / RPC FUNCTIONS
-- ==============================================================================

-- 4.1 Create Production Batch (with auto sequence and stock request)
CREATE OR REPLACE FUNCTION create_production_batch(
    p_product_variant_id BIGINT,
    p_raw_yarn_input_kg NUMERIC,
    p_yarn_batch_count INT DEFAULT 1,
    p_raw_material_yarn_id BIGINT DEFAULT NULL,
    p_acetone_used NUMERIC DEFAULT 0.00,
    p_film_roll_variant_id BIGINT DEFAULT NULL,
    p_film_roll_used NUMERIC DEFAULT 0.00,
    p_supervisor VARCHAR DEFAULT 'Production Supervisor',
    p_notes TEXT DEFAULT ''
) RETURNS JSONB AS $$
DECLARE
    v_year INT := EXTRACT(YEAR FROM CURRENT_DATE);
    v_count INT;
    v_batch_num VARCHAR(100);
    v_req_num VARCHAR(100);
    v_req_id UUID;
    v_batch_id UUID;
    v_result JSONB;
BEGIN
    SELECT COUNT(*) + 1 INTO v_count FROM production_batches WHERE EXTRACT(YEAR FROM created_at) = v_year;
    v_batch_num := 'BATCH-' || v_year || '-' || LPAD(v_count::TEXT, 5, '0');
    WHILE EXISTS (SELECT 1 FROM production_batches WHERE batch_number = v_batch_num) LOOP
        v_count := v_count + 1;
        v_batch_num := 'BATCH-' || v_year || '-' || LPAD(v_count::TEXT, 5, '0');
    END LOOP;

    SELECT COUNT(*) + 1 INTO v_count FROM inventory_stock_requests WHERE EXTRACT(YEAR FROM created_at) = v_year;
    v_req_num := 'REQ-' || v_year || '-' || LPAD(v_count::TEXT, 5, '0');
    WHILE EXISTS (SELECT 1 FROM inventory_stock_requests WHERE request_number = v_req_num) LOOP
        v_count := v_count + 1;
        v_req_num := 'REQ-' || v_year || '-' || LPAD(v_count::TEXT, 5, '0');
    END LOOP;

    INSERT INTO inventory_stock_requests (
        request_number, requester_name, department, reason, status
    ) VALUES (
        v_req_num, p_supervisor, 'PRODUCTION',
        'Raw materials requested for production run ' || v_batch_num || ' (' || p_yarn_batch_count || ' yarn batches = ' || p_raw_yarn_input_kg || ' KG)',
        'APPROVED'
    ) RETURNING id INTO v_req_id;

    IF p_raw_material_yarn_id IS NOT NULL THEN
        INSERT INTO inventory_stock_request_items (
            stock_request_id, item_type, raw_material_id, requested_quantity, approved_quantity, issued_quantity, unit, status
        ) VALUES (
            v_req_id, 'RAW_MATERIAL', p_raw_material_yarn_id, p_raw_yarn_input_kg, p_raw_yarn_input_kg, p_raw_yarn_input_kg, 'KG', 'ISSUED'
        );

        UPDATE inventory_raw_material_stocks
        SET available_kg = GREATEST(0, available_kg - p_raw_yarn_input_kg),
            updated_at = NOW()
        WHERE variant_id = p_raw_material_yarn_id;
    END IF;

    INSERT INTO production_batches (
        batch_number, product_variant_id, raw_material_yarn_id, yarn_batch_count,
        raw_yarn_input_kg, acetone_used, film_roll_variant_id, film_roll_used,
        stock_request_number, supervisor, notes, status
    ) VALUES (
        v_batch_num, p_product_variant_id, p_raw_material_yarn_id, p_yarn_batch_count,
        p_raw_yarn_input_kg, p_acetone_used, p_film_roll_variant_id, p_film_roll_used,
        v_req_num, p_supervisor, p_notes, 'IN_PROGRESS'
    ) RETURNING id INTO v_batch_id;

    SELECT to_jsonb(b) INTO v_result FROM production_batches b WHERE id = v_batch_id;
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4.2 Move Batch to B2 (WIP Transfer)
CREATE OR REPLACE FUNCTION move_batch_to_b2(
    p_batch_id UUID,
    p_braided_output_kg NUMERIC,
    p_transferred_by VARCHAR DEFAULT 'Braiding Supervisor',
    p_notes TEXT DEFAULT ''
) RETURNS JSONB AS $$
DECLARE
    v_batch RECORD;
    v_result JSONB;
BEGIN
    SELECT * INTO v_batch FROM production_batches WHERE id = p_batch_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Production batch not found';
    END IF;

    IF p_braided_output_kg <= 0 THEN
        RAISE EXCEPTION 'Processed lace weight must be greater than 0 KG';
    END IF;

    IF v_batch.raw_yarn_input_kg > 0 AND p_braided_output_kg > v_batch.raw_yarn_input_kg THEN
        RAISE EXCEPTION 'Braided lace (%) cannot exceed initial raw yarn input (%)', p_braided_output_kg, v_batch.raw_yarn_input_kg;
    END IF;

    UPDATE production_batches
    SET braided_output_kg = p_braided_output_kg,
        tipping_input_kg = p_braided_output_kg,
        phase1_waste_kg = GREATEST(0, raw_yarn_input_kg - p_braided_output_kg),
        status = 'TRANSFERRED',
        notes = CASE WHEN p_notes <> '' THEN COALESCE(notes, '') || E'\n[Move to B2]: ' || p_notes ELSE notes END,
        updated_at = NOW()
    WHERE id = p_batch_id;

    INSERT INTO production_wip_transfers (
        batch_id, source_building, source_room, destination_building, destination_room,
        weight_kg, sender, status, notes
    ) VALUES (
        p_batch_id, 'Building 1', 'Braiding Floor', 'Building 2', 'Tipping Department',
        p_braided_output_kg, p_transferred_by, 'RECEIVED',
        'Weighed lace moved from B1 to B2 for run ' || v_batch.batch_number
    );

    SELECT to_jsonb(b) INTO v_result FROM production_batches b WHERE id = p_batch_id;
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4.3 Weigh and Store Batch (Finished Sacks + Barcode Generation)
CREATE OR REPLACE FUNCTION weigh_and_store_batch(
    p_batch_id UUID,
    p_finished_output_kg NUMERIC,
    p_sack_weights NUMERIC[],
    p_store_location VARCHAR DEFAULT 'Finished Goods Store 1'
) RETURNS JSONB AS $$
DECLARE
    v_batch RECORD;
    v_total_sacks NUMERIC := 0;
    v_w NUMERIC;
    v_year INT := EXTRACT(YEAR FROM CURRENT_DATE);
    v_barcode_count INT;
    v_barcode VARCHAR(50);
    v_bag_id UUID;
    v_sacks_created TEXT[] := ARRAY[]::TEXT[];
    v_tot_waste NUMERIC;
    v_yield_pct NUMERIC;
    v_waste_pct NUMERIC;
    v_result JSONB;
BEGIN
    SELECT * INTO v_batch FROM production_batches WHERE id = p_batch_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Production batch not found';
    END IF;

    IF p_finished_output_kg <= 0 THEN
        RAISE EXCEPTION 'Finished shoelaces weight must be greater than 0 KG';
    END IF;

    IF array_length(p_sack_weights, 1) > 0 THEN
        FOREACH v_w IN ARRAY p_sack_weights LOOP
            v_total_sacks := v_total_sacks + v_w;
        END LOOP;
        IF v_total_sacks > p_finished_output_kg THEN
            RAISE EXCEPTION 'Total packed sack weight (%) cannot exceed finished shoelaces (%)', v_total_sacks, p_finished_output_kg;
        END IF;
    END IF;

    v_tot_waste := GREATEST(0, (v_batch.raw_yarn_input_kg - p_finished_output_kg));
    IF v_batch.raw_yarn_input_kg > 0 THEN
        v_yield_pct := ROUND((p_finished_output_kg / v_batch.raw_yarn_input_kg) * 100, 2);
        v_waste_pct := ROUND((v_tot_waste / v_batch.raw_yarn_input_kg) * 100, 2);
    ELSE
        v_yield_pct := 100.00;
        v_waste_pct := 0.00;
    END IF;

    UPDATE production_batches
    SET finished_output_kg = p_finished_output_kg,
        phase2_waste_kg = GREATEST(0, tipping_input_kg - p_finished_output_kg),
        total_waste_kg = v_tot_waste,
        yield_percentage = v_yield_pct,
        waste_percentage = v_waste_pct,
        status = 'COMPLETED',
        completion_date = CURRENT_DATE,
        updated_at = NOW()
    WHERE id = p_batch_id;

    IF array_length(p_sack_weights, 1) > 0 THEN
        FOREACH v_w IN ARRAY p_sack_weights LOOP
            IF v_w > 0 THEN
                SELECT COUNT(*) + 1 INTO v_barcode_count FROM store_finished_product_bags WHERE EXTRACT(YEAR FROM created_at) = v_year;
                v_barcode := 'ABSL-' || v_year || '-' || LPAD(v_barcode_count::TEXT, 6, '0');
                WHILE EXISTS (SELECT 1 FROM store_finished_product_bags WHERE bag_id = v_barcode) LOOP
                    v_barcode_count := v_barcode_count + 1;
                    v_barcode := 'ABSL-' || v_year || '-' || LPAD(v_barcode_count::TEXT, 6, '0');
                END LOOP;

                INSERT INTO store_finished_product_bags (
                    bag_id, batch_id, product_variant_id, weight_kg, store_location, status, entry_date, notes
                ) VALUES (
                    v_barcode, p_batch_id, v_batch.product_variant_id, v_w, p_store_location, 'IN_STORE', CURRENT_DATE,
                    'Weighed from run ' || v_batch.batch_number || ' into store'
                ) RETURNING id INTO v_bag_id;

                INSERT INTO store_movements (
                    bag_id, movement_type, from_location, to_location, notes
                ) VALUES (
                    v_bag_id, 'STORE_ENTRY', 'Production Run ' || v_batch.batch_number || ' (Tipping)', p_store_location,
                    'Entry from production batch ' || v_batch.batch_number
                );

                v_sacks_created := array_append(v_sacks_created, v_barcode);
            END IF;
        END LOOP;
    END IF;

    SELECT to_jsonb(b) INTO v_result FROM production_batches b WHERE id = p_batch_id;
    v_result := jsonb_set(v_result, '{sacks_created}', to_jsonb(v_sacks_created));
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4.4 Create Dispatch Order (Credit Limit Guard & Double-Dispatch Lock)
CREATE OR REPLACE FUNCTION create_dispatch_order(
    p_customer_id UUID,
    p_items JSONB,
    p_payment_mode payment_mode_enum DEFAULT 'CASH',
    p_amount_paid NUMERIC DEFAULT 0.00,
    p_due_date DATE DEFAULT NULL,
    p_notes TEXT DEFAULT '',
    p_created_by VARCHAR DEFAULT 'Sales Dispatcher'
) RETURNS JSONB AS $$
DECLARE
    v_cust RECORD;
    v_item JSONB;
    v_bag RECORD;
    v_price NUMERIC;
    v_subtotal NUMERIC;
    v_total_kg NUMERIC := 0.00;
    v_total_amount NUMERIC := 0.00;
    v_outstanding NUMERIC;
    v_available_credit NUMERIC;
    v_credit_requested NUMERIC;
    v_year INT := EXTRACT(YEAR FROM CURRENT_DATE);
    v_order_count INT;
    v_order_num VARCHAR(50);
    v_order_id UUID;
    v_order_status order_status_enum;
    v_rec_id UUID;
    v_result JSONB;
BEGIN
    SELECT * INTO v_cust FROM sales_customers WHERE id = p_customer_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Customer not found';
    END IF;

    IF jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Order must include at least one finished product bag';
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        SELECT * INTO v_bag FROM store_finished_product_bags
        WHERE id::TEXT = (v_item->>'bag_id') OR bag_id = (v_item->>'bag_id')
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Finished product bag % not found', (v_item->>'bag_id');
        END IF;

        IF v_bag.status = 'DISPATCHED' THEN
            RAISE EXCEPTION 'Bag % has already been dispatched. Double-dispatch is prohibited.', v_bag.bag_id;
        END IF;

        v_price := COALESCE((v_item->>'price_per_kg')::NUMERIC, 150.00);
        v_subtotal := v_bag.weight_kg * v_price;
        v_total_kg := v_total_kg + v_bag.weight_kg;
        v_total_amount := v_total_amount + v_subtotal;
    END LOOP;

    v_outstanding := GREATEST(0, v_total_amount - p_amount_paid);

    IF p_payment_mode = 'CREDIT' THEN
        v_available_credit := v_cust.credit_limit - v_cust.current_outstanding;
        v_credit_requested := v_outstanding;
        IF (v_cust.current_outstanding + v_credit_requested) > v_cust.credit_limit THEN
            RAISE EXCEPTION 'Credit limit exceeded. Available credit: % ETB, Requested credit: % ETB.',
                v_available_credit, v_credit_requested;
        END IF;
    END IF;

    SELECT COUNT(*) + 1 INTO v_order_count FROM sales_dispatch_orders WHERE EXTRACT(YEAR FROM created_at) = v_year;
    v_order_num := 'DISP-' || v_year || '-' || LPAD(v_order_count::TEXT, 5, '0');
    WHILE EXISTS (SELECT 1 FROM sales_dispatch_orders WHERE order_number = v_order_num) LOOP
        v_order_count := v_order_count + 1;
        v_order_num := 'DISP-' || v_year || '-' || LPAD(v_order_count::TEXT, 5, '0');
    END LOOP;

    v_order_status := CASE
        WHEN v_outstanding <= 0 THEN 'SETTLED'::order_status_enum
        WHEN p_amount_paid > 0 THEN 'PARTIAL'::order_status_enum
        ELSE 'PENDING'::order_status_enum
    END;

    INSERT INTO sales_dispatch_orders (
        order_number, customer_id, payment_mode, total_kg, total_amount,
        amount_paid, outstanding_amount, due_date, status, notes, created_by
    ) VALUES (
        v_order_num, p_customer_id, p_payment_mode, v_total_kg, v_total_amount,
        p_amount_paid, v_outstanding, p_due_date, v_order_status, p_notes, p_created_by
    ) RETURNING id INTO v_order_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        SELECT * INTO v_bag FROM store_finished_product_bags
        WHERE id::TEXT = (v_item->>'bag_id') OR bag_id = (v_item->>'bag_id');

        v_price := COALESCE((v_item->>'price_per_kg')::NUMERIC, 150.00);
        v_subtotal := v_bag.weight_kg * v_price;

        INSERT INTO sales_dispatch_order_items (
            dispatch_order_id, bag_id, weight_kg, price_per_kg, subtotal
        ) VALUES (
            v_order_id, v_bag.id, v_bag.weight_kg, v_price, v_subtotal
        );

        UPDATE store_finished_product_bags
        SET status = 'DISPATCHED', dispatched_date = CURRENT_DATE, updated_at = NOW()
        WHERE id = v_bag.id;

        INSERT INTO store_movements (
            bag_id, movement_type, from_location, reference_order, notes
        ) VALUES (
            v_bag.id, 'DISPATCH', v_bag.store_location, v_order_num,
            'Dispatched to customer ' || v_cust.name || ' on order ' || v_order_num
        );
    END LOOP;

    IF p_payment_mode = 'CREDIT' OR v_outstanding > 0 THEN
        UPDATE sales_customers
        SET current_outstanding = current_outstanding + v_outstanding,
            updated_at = NOW()
        WHERE id = p_customer_id;

        INSERT INTO sales_receivables (
            dispatch_order_id, customer_id, original_amount, amount_paid,
            remaining_amount, due_date, status
        ) VALUES (
            v_order_id, p_customer_id, v_total_amount, p_amount_paid,
            v_outstanding, p_due_date, v_order_status
        ) RETURNING id INTO v_rec_id;

        IF p_amount_paid > 0 THEN
            INSERT INTO sales_payments (
                receivable_id, amount, payment_date, payment_method, notes
            ) VALUES (
                v_rec_id, p_amount_paid, CURRENT_DATE, 'CASH', 'Upfront payment on dispatch'
            );
        END IF;

        IF v_cust.credit_limit > 0 AND ((v_cust.current_outstanding + v_outstanding) / v_cust.credit_limit) >= 0.80 THEN
            INSERT INTO notifications (
                recipient, notification_type, title, message, severity, related_model, related_object_id
            ) VALUES (
                'sales_manager', 'CREDIT_LIMIT_WARNING',
                'Credit Limit Warning: ' || v_cust.name,
                'Customer ' || v_cust.name || ' has utilized ' ||
                ROUND(((v_cust.current_outstanding + v_outstanding) / v_cust.credit_limit) * 100, 1) || '% of their credit limit.',
                'WARNING', 'Customer', p_customer_id::TEXT
            );
        END IF;
    END IF;

    SELECT to_jsonb(o) INTO v_result FROM sales_dispatch_orders o WHERE id = v_order_id;
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4.5 Collect Payment on Order
CREATE OR REPLACE FUNCTION collect_order_payment(
    p_order_id UUID,
    p_amount NUMERIC,
    p_payment_method VARCHAR DEFAULT 'CASH',
    p_reference VARCHAR DEFAULT '',
    p_notes TEXT DEFAULT ''
) RETURNS JSONB AS $$
DECLARE
    v_order RECORD;
    v_rec RECORD;
    v_new_rem NUMERIC;
    v_new_paid NUMERIC;
    v_new_status order_status_enum;
    v_result JSONB;
BEGIN
    SELECT * INTO v_order FROM sales_dispatch_orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Dispatch order not found';
    END IF;

    SELECT * INTO v_rec FROM sales_receivables WHERE dispatch_order_id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No open receivable associated with this order';
    END IF;

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Payment amount must be greater than zero';
    END IF;

    IF p_amount > v_rec.remaining_amount THEN
        RAISE EXCEPTION 'Payment (%) exceeds remaining debt (%)', p_amount, v_rec.remaining_amount;
    END IF;

    v_new_rem := v_rec.remaining_amount - p_amount;
    v_new_paid := v_rec.amount_paid + p_amount;
    v_new_status := CASE WHEN v_new_rem <= 0 THEN 'SETTLED'::order_status_enum ELSE 'PARTIAL'::order_status_enum END;

    INSERT INTO sales_payments (
        receivable_id, amount, payment_date, payment_method, reference, notes
    ) VALUES (
        v_rec.id, p_amount, CURRENT_DATE, p_payment_method, p_reference, p_notes
    );

    UPDATE sales_receivables
    SET remaining_amount = v_new_rem,
        amount_paid = v_new_paid,
        status = v_new_status,
        updated_at = NOW()
    WHERE id = v_rec.id;

    UPDATE sales_dispatch_orders
    SET outstanding_amount = v_new_rem,
        amount_paid = amount_paid + p_amount,
        status = v_new_status,
        updated_at = NOW()
    WHERE id = p_order_id;

    UPDATE sales_customers
    SET current_outstanding = GREATEST(0, current_outstanding - p_amount),
        updated_at = NOW()
    WHERE id = v_order.customer_id;

    SELECT to_jsonb(o) INTO v_result FROM sales_dispatch_orders o WHERE id = p_order_id;
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4.6 Calculate Payroll Period
CREATE OR REPLACE FUNCTION calculate_payroll_period(
    p_period_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_period RECORD;
    v_cfg RECORD;
    v_emp RECORD;
    v_working_days NUMERIC;
    v_present INT;
    v_absent INT;
    v_late INT;
    v_half INT;
    v_leave INT;
    v_saturday INT;
    v_ot NUMERIC;
    v_eff_absent NUMERIC;
    v_daily_rate NUMERIC;
    v_abs_deduct NUMERIC;
    v_formula TEXT;
    v_hourly_base NUMERIC;
    v_ot_pay NUMERIC;
    v_sat_pay NUMERIC;
    v_allowances NUMERIC;
    v_gross NUMERIC;
    v_net NUMERIC;
    v_tot_gross NUMERIC := 0.00;
    v_tot_deduct NUMERIC := 0.00;
    v_tot_net NUMERIC := 0.00;
    v_calc_details JSONB;
    v_result JSONB;
BEGIN
    SELECT * INTO v_period FROM workforce_payroll_periods WHERE id = p_period_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payroll period not found';
    END IF;

    SELECT * INTO v_cfg FROM workforce_payroll_configs WHERE is_active = true LIMIT 1;
    IF NOT FOUND THEN
        SELECT * INTO v_cfg FROM workforce_payroll_configs LIMIT 1;
    END IF;

    v_working_days := COALESCE(v_period.working_days, v_cfg.working_days_per_period, 26);

    DELETE FROM workforce_payroll_slips WHERE payroll_period_id = p_period_id;

    FOR v_emp IN SELECT * FROM workforce_employees WHERE employment_status = 'ACTIVE' LOOP
        SELECT
            COUNT(*) FILTER (WHERE status = 'PRESENT'),
            COUNT(*) FILTER (WHERE status = 'ABSENT'),
            COUNT(*) FILTER (WHERE status = 'LATE'),
            COUNT(*) FILTER (WHERE status = 'HALF_DAY'),
            COUNT(*) FILTER (WHERE status = 'LEAVE'),
            COUNT(*) FILTER (WHERE is_saturday = true AND status = 'PRESENT'),
            COALESCE(SUM(overtime_hours), 0.00)
        INTO v_present, v_absent, v_late, v_half, v_leave, v_saturday, v_ot
        FROM workforce_attendance
        WHERE employee_id = v_emp.id
          AND date >= v_period.start_date
          AND date <= v_period.end_date;

        v_eff_absent := v_absent + (v_half * 0.5);

        IF v_cfg.absence_deduction_method = 'DAILY_RATE' THEN
            v_daily_rate := CASE WHEN v_working_days > 0 THEN v_emp.base_salary / v_working_days ELSE 0 END;
            v_abs_deduct := ROUND(v_daily_rate * v_eff_absent, 2);
            v_formula := 'Daily Rate (' || v_emp.base_salary || ' / ' || v_working_days || ') * ' || v_eff_absent || ' days';
        ELSIF v_cfg.absence_deduction_method = 'PERCENTAGE_OF_SALARY' THEN
            v_abs_deduct := ROUND(v_emp.base_salary * v_cfg.absence_deduction_rate * v_eff_absent, 2);
            v_formula := 'Percentage (' || v_emp.base_salary || ' * ' || (v_cfg.absence_deduction_rate * 100) || '% * ' || v_eff_absent || ' days)';
        ELSE
            v_abs_deduct := ROUND(v_cfg.absence_deduction_rate * v_eff_absent, 2);
            v_formula := 'Fixed (' || v_cfg.absence_deduction_rate || ' ETB * ' || v_eff_absent || ' days)';
        END IF;

        v_hourly_base := CASE WHEN v_working_days > 0 THEN v_emp.base_salary / (v_working_days * 8.0) ELSE 0 END;
        v_ot_pay := ROUND(v_hourly_base * v_cfg.overtime_hourly_multiplier * v_ot, 2);
        v_sat_pay := CASE WHEN v_saturday > 0 THEN ROUND(v_saturday * (v_cfg.saturday_rate / 4.0), 2) ELSE 0 END;

        SELECT COALESCE(SUM(amount), 0.00) INTO v_allowances
        FROM workforce_employee_payments
        WHERE employee_id = v_emp.id AND active = true;

        v_gross := v_emp.base_salary + v_ot_pay + v_sat_pay + v_allowances;
        v_net := GREATEST(0, v_gross - v_abs_deduct);

        v_tot_gross := v_tot_gross + v_gross;
        v_tot_deduct := v_tot_deduct + v_abs_deduct;
        v_tot_net := v_tot_net + v_net;

        v_calc_details := jsonb_build_object(
            'base_salary', v_emp.base_salary,
            'working_days', v_working_days,
            'present_days', v_present,
            'absent_days', v_absent,
            'effective_absent_days', v_eff_absent,
            'deduction_method', v_cfg.absence_deduction_method,
            'deduction_formula', v_formula,
            'absence_deduction', v_abs_deduct,
            'overtime_hours', v_ot,
            'overtime_pay', v_ot_pay,
            'saturday_worked_days', v_saturday,
            'saturday_pay', v_sat_pay,
            'additional_allowances', v_allowances,
            'net_salary', v_net
        );

        INSERT INTO workforce_payroll_slips (
            payroll_period_id, employee_id, base_salary, working_days, present_days,
            absent_days, late_days, leave_days, overtime_hours, overtime_pay, saturday_pay,
            additional_allowances, absence_deduction, other_deductions, net_salary,
            calculation_details, status
        ) VALUES (
            p_period_id, v_emp.id, v_emp.base_salary, v_working_days, v_present,
            v_absent, v_late, v_leave, v_ot, v_ot_pay, v_sat_pay,
            v_allowances, v_abs_deduct, 0.00, v_net,
            v_calc_details, 'CALCULATED'
        );
    END LOOP;

    UPDATE workforce_payroll_periods
    SET total_gross_salary = v_tot_gross,
        total_deductions = v_tot_deduct,
        total_net_salary = v_tot_net,
        status = 'CALCULATED',
        config_snapshot = to_jsonb(v_cfg),
        updated_at = NOW()
    WHERE id = p_period_id;

    SELECT to_jsonb(p) INTO v_result FROM workforce_payroll_periods p WHERE id = p_period_id;
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4.7 Bulk Mark Daily Attendance
CREATE OR REPLACE FUNCTION bulk_mark_attendance(
    p_date DATE,
    p_records JSONB
) RETURNS JSONB AS $$
DECLARE
    v_item JSONB;
    v_count INT := 0;
BEGIN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_records) LOOP
        INSERT INTO workforce_attendance (
            employee_id, date, status, overtime_hours, is_saturday, notes
        ) VALUES (
            (v_item->>'employee_id')::UUID,
            p_date,
            COALESCE((v_item->>'status')::attendance_status_enum, 'PRESENT'::attendance_status_enum),
            COALESCE((v_item->>'overtime_hours')::NUMERIC, 0.00),
            COALESCE((v_item->>'is_saturday')::BOOLEAN, false),
            COALESCE(v_item->>'notes', '')
        )
        ON CONFLICT (employee_id, date) DO UPDATE SET
            status = EXCLUDED.status,
            overtime_hours = EXCLUDED.overtime_hours,
            is_saturday = EXCLUDED.is_saturday,
            notes = EXCLUDED.notes;

        v_count := v_count + 1;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'marked_count', v_count, 'date', p_date);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4.8 Get Real-time Dashboard Analytics
CREATE OR REPLACE FUNCTION get_dashboard_analytics()
RETURNS JSONB AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
    v_raw_total NUMERIC;
    v_raw_low INT;
    v_today_p1 RECORD;
    v_today_p2 RECORD;
    v_p_input NUMERIC;
    v_p_braided NUMERIC;
    v_p_output NUMERIC;
    v_p_waste NUMERIC;
    v_p_yield NUMERIC;
    v_p_batches INT;
    v_wip_b1 NUMERIC;
    v_wip_b2 NUMERIC;
    v_bags_count INT;
    v_bags_kg NUMERIC;
    v_today_disp_count INT;
    v_today_sales NUMERIC;
    v_total_sales NUMERIC;
    v_total_rec NUMERIC;
    v_overdue_rec NUMERIC;
    v_credit_limits NUMERIC;
    v_outstanding_all NUMERIC;
    v_credit_util NUMERIC;
    v_m_total INT;
    v_m_norm INT;
    v_m_serv INT;
    v_m_crit INT;
    v_emp_total INT;
    v_emp_present INT;
    v_emp_absent INT;
    v_today_ot NUMERIC;
    v_crit_alerts INT;
    v_pending_reqs INT;
    v_low_spares INT;
BEGIN
    SELECT COALESCE(SUM(available_kg), 0.00) INTO v_raw_total FROM inventory_raw_material_stocks;
    SELECT COUNT(*) INTO v_raw_low FROM inventory_raw_materials m
    WHERE (SELECT COALESCE(SUM(available_kg), 0.00) FROM inventory_raw_material_stocks s WHERE s.variant_id = m.id) <= m.minimum_stock_kg;

    SELECT COALESCE(SUM(input_weight_kg), 0.00) as inp, COALESCE(SUM(output_weight_kg), 0.00) as out, COALESCE(SUM(waste_kg), 0.00) as waste
    INTO v_today_p1 FROM production_phase1_records WHERE date = v_today;

    SELECT COALESCE(SUM(finished_output_kg), 0.00) as out, COALESCE(SUM(waste_kg), 0.00) as waste
    INTO v_today_p2 FROM production_phase2_records WHERE date = v_today;

    v_p_input := v_today_p1.inp;
    v_p_braided := v_today_p1.out;
    v_p_output := v_today_p2.out;
    v_p_waste := v_today_p1.waste + v_today_p2.waste;
    v_p_yield := CASE WHEN v_p_input > 0 THEN ROUND((v_p_output / v_p_input) * 100, 1) ELSE 94.0 END;
    SELECT COUNT(*) INTO v_p_batches FROM production_batches WHERE start_date = v_today OR completion_date = v_today;

    SELECT COALESCE(SUM(braided_output_kg), 0.00) INTO v_wip_b1 FROM production_batches WHERE status = 'PHASE_1_COMPLETE';
    SELECT COALESCE(SUM(weight_kg), 0.00) INTO v_wip_b2 FROM production_wip_transfers WHERE status = 'RECEIVED';

    SELECT COUNT(*), COALESCE(SUM(weight_kg), 0.00) INTO v_bags_count, v_bags_kg FROM store_finished_product_bags WHERE status = 'IN_STORE';

    SELECT COUNT(*), COALESCE(SUM(total_amount), 0.00) INTO v_today_disp_count, v_today_sales FROM sales_dispatch_orders WHERE created_at::DATE = v_today;
    SELECT COALESCE(SUM(total_amount), 0.00) INTO v_total_sales FROM sales_dispatch_orders;

    SELECT COALESCE(SUM(remaining_amount), 0.00), COALESCE(SUM(CASE WHEN due_date < v_today THEN remaining_amount ELSE 0 END), 0.00)
    INTO v_total_rec, v_overdue_rec FROM sales_receivables WHERE remaining_amount > 0;

    SELECT COALESCE(SUM(credit_limit), 0.00), COALESCE(SUM(current_outstanding), 0.00) INTO v_credit_limits, v_outstanding_all FROM sales_customers;
    v_credit_util := CASE WHEN v_credit_limits > 0 THEN ROUND((v_outstanding_all / v_credit_limits) * 100, 1) ELSE 0.0 END;

    SELECT COUNT(*),
           COUNT(*) FILTER (WHERE health = 'NORMAL'),
           COUNT(*) FILTER (WHERE health = 'NEEDS_SERVICE'),
           COUNT(*) FILTER (WHERE health = 'CRITICAL')
    INTO v_m_total, v_m_norm, v_m_serv, v_m_crit FROM assets_machines;

    SELECT COUNT(*) INTO v_emp_total FROM workforce_employees WHERE employment_status = 'ACTIVE';
    SELECT COUNT(*) FILTER (WHERE status = 'PRESENT'),
           COUNT(*) FILTER (WHERE status = 'ABSENT'),
           COALESCE(SUM(overtime_hours), 0.00)
    INTO v_emp_present, v_emp_absent, v_today_ot FROM workforce_attendance WHERE date = v_today;

    SELECT COUNT(*) INTO v_crit_alerts FROM notifications WHERE is_read = false AND severity = 'CRITICAL';
    SELECT COUNT(*) INTO v_pending_reqs FROM inventory_stock_requests WHERE status = 'PENDING';
    SELECT COUNT(*) INTO v_low_spares FROM assets_spare_parts WHERE quantity <= minimum_stock;

    RETURN jsonb_build_object(
        'raw_materials', jsonb_build_object('total_kg', v_raw_total, 'low_stock_count', v_raw_low),
        'production', jsonb_build_object(
            'today_input_kg', v_p_input,
            'today_braided_output_kg', v_p_braided,
            'today_output_kg', v_p_output,
            'today_waste_kg', v_p_waste,
            'waste_percentage', CASE WHEN v_p_input > 0 THEN ROUND((v_p_waste / v_p_input) * 100, 1) ELSE 6.0 END,
            'yield_percentage', v_p_yield,
            'today_batch_count', v_p_batches
        ),
        'wip', jsonb_build_object('building_1_kg', v_wip_b1, 'building_2_kg', v_wip_b2),
        'finished_goods', jsonb_build_object('available_bags', v_bags_count, 'available_kg', v_bags_kg),
        'sales', jsonb_build_object('today_dispatches', v_today_disp_count, 'today_sales_etb', v_today_sales, 'total_sales_etb', v_total_sales),
        'credit', jsonb_build_object('total_receivables_etb', v_total_rec, 'overdue_etb', v_overdue_rec, 'credit_utilization_percent', v_credit_util),
        'machines', jsonb_build_object('total', v_m_total, 'normal', v_m_norm, 'needs_service', v_m_serv, 'critical', v_m_crit),
        'workforce', jsonb_build_object('total_employees', v_emp_total, 'present_today', COALESCE(v_emp_present, v_emp_total), 'absent_today', v_emp_absent, 'overtime_hours', v_today_ot),
        'alerts', jsonb_build_object('critical_count', v_crit_alerts, 'pending_stock_requests', v_pending_reqs, 'low_spares_count', v_low_spares)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4.9 Toggle User Active (Admin function)
CREATE OR REPLACE FUNCTION toggle_user_active(
    p_profile_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_prof RECORD;
    v_new_active BOOLEAN;
BEGIN
    SELECT * INTO v_prof FROM user_profiles WHERE id = p_profile_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User profile not found';
    END IF;

    v_new_active := NOT v_prof.is_active;

    UPDATE user_profiles
    SET is_active = v_new_active,
        updated_at = NOW()
    WHERE id = p_profile_id;

    RETURN jsonb_build_object('status', 'success', 'is_active', v_new_active, 'id', p_profile_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_dispatch_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_receivables ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_finished_product_bags ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE workforce_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE workforce_payroll_periods ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION current_user_role() RETURNS user_role_enum AS $$
    SELECT role FROM user_profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION current_user_customer_id() RETURNS UUID AS $$
    SELECT customer_id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE POLICY "Allow authenticated read on operational tables" ON sales_customers
    FOR SELECT TO authenticated USING (
        current_user_role() IN ('super_admin', 'factory_monitor') OR id = current_user_customer_id()
    );

CREATE POLICY "Allow super_admin and factory_monitor modifications on customers" ON sales_customers
    FOR ALL TO authenticated USING (
        current_user_role() IN ('super_admin', 'factory_monitor')
    );

CREATE POLICY "Allow customers to view only their dispatch orders" ON sales_dispatch_orders
    FOR SELECT TO authenticated USING (
        current_user_role() IN ('super_admin', 'factory_monitor') OR customer_id = current_user_customer_id()
    );

CREATE POLICY "Allow factory managers to manage dispatch orders" ON sales_dispatch_orders
    FOR ALL TO authenticated USING (
        current_user_role() IN ('super_admin', 'factory_monitor')
    );

CREATE POLICY "Allow customers to view only their receivables" ON sales_receivables
    FOR SELECT TO authenticated USING (
        current_user_role() IN ('super_admin', 'factory_monitor') OR customer_id = current_user_customer_id()
    );

CREATE POLICY "Allow authenticated access to user profiles" ON user_profiles
    FOR ALL TO authenticated USING (
        current_user_role() = 'super_admin' OR user_id = auth.uid()
    );
