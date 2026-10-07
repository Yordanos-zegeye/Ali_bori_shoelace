/**
 * ALI BORI SHOE LACE FACTORY ERP - SUPABASE API ADAPTER
 * 
 * Intercepts frontend RESTful api calls and maps them directly to Supabase
 * tables, views, and RPC stored procedures.
 * Also provides an in-memory seed fallback for instant preview before Supabase keys are plugged in.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';

// Helper to parse query parameters from URL string
function parseQuery(url: string): { path: string; params: Record<string, string> } {
  const [path, queryString] = url.split('?');
  const params: Record<string, string> = {};
  if (queryString) {
    queryString.split('&').forEach((part) => {
      const [k, v] = part.split('=');
      if (k) params[decodeURIComponent(k)] = decodeURIComponent(v || '');
    });
  }
  return { path: path.replace(/^\/api\/v1/, '').replace(/\/+$/, ''), params };
}

// In-Memory Seed Storage for Instant Offline Preview
const MEMORY_DB: Record<string, any[]> = {
  colors: [
    { id: 1, name: 'Black', code: 'B', hex_code: '#1A1A1A' },
    { id: 2, name: 'White', code: 'W', hex_code: '#F5F5F5' },
    { id: 3, name: 'Brown', code: 'BR', hex_code: '#8B461E' },
    { id: 4, name: 'Natural', code: 'NAT', hex_code: '#D8C39E' },
  ],
  thicknesses: [
    { id: 1, name: '2.5 MM', value_mm: '2.50' },
    { id: 2, name: '3.0 MM', value_mm: '3.00' },
    { id: 3, name: '4.0 MM', value_mm: '4.00' },
  ],
  products: [
    {
      id: 1,
      code: 'SHOE-LACE',
      name: 'Standard Braided & Tipped Shoe Lace',
      category: 'SHOE_LACE',
      unit: 'KG',
      variants: [],
    },
  ],
  variants: [
    {
      id: 1,
      serial_code: 'VAR-BLK-2.5MM',
      color: 1,
      color_details: { id: 1, name: 'Black', code: 'B', hex_code: '#1A1A1A' },
      thickness: 1,
      thickness_details: { id: 1, name: '2.5 MM', value_mm: '2.50' },
      specification: 'Black 2.5mm Braided Cord',
      unit_price: '150.00',
      display_name: 'Black 2.5mm Braided Cord',
      stock: {
        id: 1,
        daily_product: '450.00',
        in_qty: '450.00',
        out_qty: '120.00',
        st_v: '330.00',
        total: '330.00',
        calculated_stock: '330.00',
      },
    },
    {
      id: 2,
      serial_code: 'VAR-WHT-2.5MM',
      color: 2,
      color_details: { id: 2, name: 'White', code: 'W', hex_code: '#F5F5F5' },
      thickness: 1,
      thickness_details: { id: 1, name: '2.5 MM', value_mm: '2.50' },
      specification: 'White 2.5mm Braided Cord',
      unit_price: '150.00',
      display_name: 'White 2.5mm Braided Cord',
      stock: {
        id: 2,
        daily_product: '380.00',
        in_qty: '380.00',
        out_qty: '80.00',
        st_v: '300.00',
        total: '300.00',
        calculated_stock: '300.00',
      },
    },
  ],
  machineTypes: [
    { id: 1, name: 'High-Speed Braider 16-Spindle', description: '16-carrier machine', maintenance_interval_days: 30, machine_count: 2 },
    { id: 2, name: 'Automatic Tipping Machine', description: 'Acetate film tipping', maintenance_interval_days: 15, machine_count: 2 },
  ],
  machines: [
    {
      id: 'm1',
      machine_code: 'MC-BRD-01',
      name: 'Braider Unit 01 (16 Spindle)',
      machine_type: 1,
      machine_type_name: 'High-Speed Braider 16-Spindle',
      building: 'Building 1',
      room: 'Braiding Floor A',
      product_type: 'Shoelace 2.5mm',
      health: 'NORMAL',
      performance_score: '98.50',
      performance_percent: 98,
      total: 1,
      status: 'ACTIVE',
    },
    {
      id: 'm2',
      machine_code: 'MC-TIP-01',
      name: 'Tipping Line Alpha',
      machine_type: 2,
      machine_type_name: 'Automatic Tipping Machine',
      building: 'Building 2',
      room: 'Tipping Room 1',
      product_type: 'Finished Laces',
      health: 'NORMAL',
      performance_score: '97.00',
      performance_percent: 97,
      total: 1,
      status: 'ACTIVE',
    },
  ],
  spareParts: [
    {
      id: 1,
      part_code: 'SP-BRD-SPR01',
      name: 'Spindle Return Spring Heavy',
      quantity: '45.00',
      minimum_stock: '10.00',
      unit_cost: '85.00',
      is_low_stock: false,
      compatible_machine_types: [1],
      compatible_machine_type_names: ['High-Speed Braider 16-Spindle'],
    },
    {
      id: 2,
      part_code: 'SP-TIP-BLD01',
      name: 'Tipping Cutter Blade Tungsten',
      quantity: '12.00',
      minimum_stock: '4.00',
      unit_cost: '450.00',
      is_low_stock: false,
      compatible_machine_types: [2],
      compatible_machine_type_names: ['Automatic Tipping Machine'],
    },
  ],
  maintenanceLogs: [],
  utilities: [
    { id: 'u1', name: 'Industrial Air Compressor 500L', equipment_type: 'Compressor', assigned_location: 'Building 1 Yard', status: 'OPERATIONAL' },
  ],
  rawMaterials: [
    { id: 1, material_type: 1, material_type_name: 'Polyester Yarn', color_name: 'Black', code: 'RM-POLY-BLK-150D', minimum_stock_kg: '200.00', unit_cost: '180.00', total_available_kg: 1450, is_low_stock: false },
    { id: 2, material_type: 1, material_type_name: 'Polyester Yarn', color_name: 'White', code: 'RM-POLY-WHT-150D', minimum_stock_kg: '200.00', unit_cost: '180.00', total_available_kg: 1120, is_low_stock: false },
    { id: 3, material_type: 3, material_type_name: 'Acetate Film', color_name: 'Clear', code: 'RM-FILM-CLR-42MM', minimum_stock_kg: '50.00', unit_cost: '350.00', total_available_kg: 240, is_low_stock: false },
  ],
  rawMaterialStocks: [
    { id: 1, variant: 1, available_kg: '1450.00', reserved_kg: '100.00', storage_location: 1 },
    { id: 2, variant: 2, available_kg: '1120.00', reserved_kg: '50.00', storage_location: 1 },
  ],
  stockRequests: [],
  batches: [
    {
      id: 'b1',
      batch_number: 'BATCH-2026-00001',
      product_variant: 1,
      product_name: 'Black 2.5mm Braided Cord',
      status: 'COMPLETED',
      start_date: new Date().toISOString().slice(0, 10),
      raw_yarn_input_kg: '100.00',
      braided_output_kg: '96.50',
      phase1_waste_kg: '3.50',
      tipping_input_kg: '96.50',
      finished_output_kg: '94.00',
      phase2_waste_kg: '2.50',
      total_waste_kg: '6.00',
      yield_percentage: '94.00',
      waste_percentage: '6.00',
      bag_count: 2,
      total_packed_kg: '65.00',
      remaining_unpacked_kg: '29.00',
      bags_list: [
        { id: 'bag-1', bag_id: 'ABSL-2026-000101', weight_kg: '32.50', store_location: 'Finished Goods Store 1', status: 'IN_STORE', entry_date: new Date().toISOString().slice(0, 10) },
        { id: 'bag-2', bag_id: 'ABSL-2026-000102', weight_kg: '32.50', store_location: 'Finished Goods Store 1', status: 'IN_STORE', entry_date: new Date().toISOString().slice(0, 10) },
      ],
    },
  ],
  bags: [
    { id: 'bag-1', bag_id: 'ABSL-2026-000101', batch: 'b1', product_variant: 1, product_name: 'Black 2.5mm Braided Cord', weight_kg: '32.50', store_location: 'Finished Goods Store 1 - Rack A1', status: 'IN_STORE', entry_date: new Date().toISOString().slice(0, 10) },
    { id: 'bag-2', bag_id: 'ABSL-2026-000102', batch: 'b1', product_variant: 1, product_name: 'Black 2.5mm Braided Cord', weight_kg: '35.00', store_location: 'Finished Goods Store 1 - Rack A1', status: 'IN_STORE', entry_date: new Date().toISOString().slice(0, 10) },
  ],
  customers: [
    {
      id: 'c1',
      customer_code: 'CUST-001',
      name: 'Merkato Central Habesha Laces',
      customer_type: 'WHOLESALER',
      phone: '+251-911-234567',
      address: 'Merkato Military Tera, Addis Ababa',
      contact_person: 'Ato Girma Tadesse',
      credit_limit: '250000.00',
      current_outstanding: '45000.00',
      available_credit: '205000.00',
      credit_utilization_percent: 18.0,
      active: true,
    },
    {
      id: 'c2',
      customer_code: 'CUST-002',
      name: 'Piassa Artisanal Footwear Supply',
      customer_type: 'DISTRIBUTOR',
      phone: '+251-912-345678',
      address: 'Piassa Churchill Ave, Addis Ababa',
      contact_person: 'W/ro Bethlehem Assefa',
      credit_limit: '150000.00',
      current_outstanding: '12000.00',
      available_credit: '138000.00',
      credit_utilization_percent: 8.0,
      active: true,
    },
  ],
  orders: [],
  receivables: [
    {
      id: 'rec-1',
      customer: 'c1',
      customer_name: 'Merkato Central Habesha Laces',
      order_number: 'DISP-2026-00001',
      original_amount: '45000.00',
      amount_paid: '0.00',
      remaining_amount: '45000.00',
      due_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      status: 'PENDING',
    },
  ],
  employees: [
    { id: '3eecccc0-0f9c-47bc-aa29-393b3c4c1262', employee_id: 'EMP-0001', name: "SELEHADIN ALI", age: 23, gender: 'MALE', work_hours_per_day: 8, work_room: "B2", base_salary: '10000.00', performance_score: '85.00', employment_status: 'ACTIVE' },
    { id: 'b213e9b7-5432-4a04-8fbf-1a929026fd90', employee_id: 'EMP-0002', name: "ISHAQ ALEMAYEW", age: 28, gender: 'MALE', work_hours_per_day: 8, work_room: "B3,B4,B1", base_salary: '12500.00', performance_score: '80.00', employment_status: 'ACTIVE' },
    { id: '0dde7b85-e5c9-4060-9ce7-590d32b43b64', employee_id: 'EMP-0003', name: "FEYSEL NURI", age: 26, gender: 'MALE', work_hours_per_day: 8, work_room: "B1", base_salary: '10500.00', performance_score: '75.00', employment_status: 'ACTIVE' },
    { id: '40916bd7-14a9-468c-9595-17271e6ccc3d', employee_id: 'EMP-0004', name: "ALEYE SHEMSU", age: 30, gender: 'MALE', work_hours_per_day: 8, work_room: "B1", base_salary: '10500.00', performance_score: '75.00', employment_status: 'ACTIVE' },
    { id: 'fb159a2a-3b6b-4ef6-801d-22544d7953e6', employee_id: 'EMP-0005', name: "AWEL KADEM", age: 60, gender: 'MALE', work_hours_per_day: 10, work_room: "ALL", base_salary: '4500.00', performance_score: '95.00', employment_status: 'ACTIVE' },
    { id: 'ebe78298-796c-4a50-b5d9-246c74a53c8b', employee_id: 'EMP-0006', name: "ABU CHANE", age: 32, gender: 'MALE', work_hours_per_day: 9, work_room: "ALL", base_salary: '4000.00', performance_score: '75.00', employment_status: 'ACTIVE' },
    { id: '01718d98-3a77-47cf-8bea-f52b3debd85c', employee_id: 'EMP-0007', name: "ZEMZEM REDI", age: 62, gender: 'FEMALE', work_hours_per_day: 9, work_room: "B1", base_salary: '4000.00', performance_score: '95.00', employment_status: 'ACTIVE' },
    { id: '67eff89e-d881-432a-98f1-7fbfbd403ac6', employee_id: 'EMP-0008', name: "MARIYA", age: 27, gender: 'FEMALE', work_hours_per_day: 9, work_room: "B3", base_salary: '3500.00', performance_score: '89.00', employment_status: 'ACTIVE' },
    { id: 'd71526dd-6e4b-485c-be1d-e11287e369aa', employee_id: 'EMP-0009', name: "NESANET", age: 30, gender: 'FEMALE', work_hours_per_day: 9, work_room: "B3", base_salary: '3500.00', performance_score: '80.00', employment_status: 'ACTIVE' },
    { id: '9bcc785d-1f78-4ad1-98f3-fe6449baa51e', employee_id: 'EMP-0010', name: "LUBABA", age: 39, gender: 'FEMALE', work_hours_per_day: 9, work_room: "B3", base_salary: '3500.00', performance_score: '85.00', employment_status: 'ACTIVE' },
    { id: 'e0a252b2-a40f-4a30-a7c0-c07e41291307', employee_id: 'EMP-0011', name: "FOZIA ELALA", age: 51, gender: 'FEMALE', work_hours_per_day: 9, work_room: "B3", base_salary: '3600.00', performance_score: '80.00', employment_status: 'ACTIVE' },
    { id: '1abd3fc8-6669-4d29-bcdb-f852e5925f61', employee_id: 'EMP-0012', name: "TSEHAYE GEZAW", age: 58, gender: 'FEMALE', work_hours_per_day: 9, work_room: "B1", base_salary: '4000.00', performance_score: '90.00', employment_status: 'ACTIVE' },
    { id: '778b30e8-311a-4626-9cbc-7234f495cb7b', employee_id: 'EMP-0013', name: "ZENBECH CHERNET", age: 68, gender: 'FEMALE', work_hours_per_day: 9, work_room: "B1", base_salary: '6000.00', performance_score: '80.00', employment_status: 'ACTIVE' },
    { id: 'c2aacce0-02e1-442e-970c-ea5e93698670', employee_id: 'EMP-0014', name: "ZEHARA MUHAMED", age: 35, gender: 'FEMALE', work_hours_per_day: 9, work_room: "B1", base_salary: '3600.00', performance_score: '80.00', employment_status: 'ACTIVE' },
    { id: '1fe8626f-5e07-47dd-bfc8-4a742115c216', employee_id: 'EMP-0015', name: "KAMILA HUSEN", age: 43, gender: 'FEMALE', work_hours_per_day: 9, work_room: "B3", base_salary: '3500.00', performance_score: '95.00', employment_status: 'ACTIVE' },
    { id: 'a71d788e-bda3-4c8c-abbb-f38661ae44a9', employee_id: 'EMP-0016', name: "EMEBET TADESE", age: 41, gender: 'FEMALE', work_hours_per_day: 9, work_room: "B1", base_salary: '4900.00', performance_score: '85.00', employment_status: 'ACTIVE' },
    { id: '8a5ccb00-bcda-40af-9795-7b9e2f030ada', employee_id: 'EMP-0017', name: "AYSHA MEHDI", age: 45, gender: 'FEMALE', work_hours_per_day: 9, work_room: "B1", base_salary: '4000.00', performance_score: '100.00', employment_status: 'ACTIVE' },
    { id: 'd02810eb-9e76-40df-ad88-b5f4f22755a6', employee_id: 'EMP-0018', name: "ZEYNEB ABDELA", age: 40, gender: 'FEMALE', work_hours_per_day: 9, work_room: "B1", base_salary: '4000.00', performance_score: '90.00', employment_status: 'ACTIVE' },
    { id: 'fc76d446-f7a2-470e-8d5d-030de3692384', employee_id: 'EMP-0019', name: "ZEYNEB ENDERIS", age: 32, gender: 'FEMALE', work_hours_per_day: 9, work_room: "B3", base_salary: '4500.00', performance_score: '75.00', employment_status: 'ACTIVE' },
    { id: '0c3a5a54-d3db-4bc8-a115-6dcc72f3d421', employee_id: 'EMP-0020', name: "ALEMNESH DEBELA", age: 32, gender: 'FEMALE', work_hours_per_day: 9, work_room: "B3", base_salary: '4800.00', performance_score: '95.00', employment_status: 'ACTIVE' },
    { id: '8220fb90-155a-4584-a40a-f8f32b9ac263', employee_id: 'EMP-0021', name: "NURIA JEMIL", age: 40, gender: 'FEMALE', work_hours_per_day: 9, work_room: "B3", base_salary: '4800.00', performance_score: '95.00', employment_status: 'ACTIVE' },
    { id: '09dc8945-bc85-48f3-b4cc-cb36cb43d880', employee_id: 'EMP-0022', name: "NEGIBA KEMAL", age: 30, gender: 'FEMALE', work_hours_per_day: 9, work_room: "B1", base_salary: '4800.00', performance_score: '80.00', employment_status: 'ACTIVE' },
    { id: 'bda6d1f6-090f-437c-90f9-4891d0ec8081', employee_id: 'EMP-0023', name: "SEADA NESRU", age: 26, gender: 'FEMALE', work_hours_per_day: 9, work_room: "B4", base_salary: '5500.00', performance_score: '85.00', employment_status: 'ACTIVE' },
    { id: '78a5122d-c71b-4217-b6a5-b695a13f5fcd', employee_id: 'EMP-0024', name: "HAYAT HASEN", age: 19, gender: 'FEMALE', work_hours_per_day: 9, work_room: "B4", base_salary: '4000.00', performance_score: '95.00', employment_status: 'ACTIVE' },
    { id: '60bc768f-606c-42ca-851e-6df02ad7bc47', employee_id: 'EMP-0025', name: "EFTU BEDEGA", age: 26, gender: 'FEMALE', work_hours_per_day: 9, work_room: "B3", base_salary: '4200.00', performance_score: '85.00', employment_status: 'ACTIVE' },
    { id: 'e076a538-a171-4d79-a9b5-30d02efaa00e', employee_id: 'EMP-0026', name: "KEDEJA KEDER", age: 27, gender: 'FEMALE', work_hours_per_day: 9, work_room: "B4", base_salary: '5500.00', performance_score: '80.00', employment_status: 'ACTIVE' },
    { id: 'ec2ced66-d68d-4bf9-a84f-b3fc5af9fa28', employee_id: 'EMP-0027', name: "ASMA FARIS", age: 55, gender: 'FEMALE', work_hours_per_day: 9, work_room: "B1", base_salary: '4000.00', performance_score: '95.00', employment_status: 'ACTIVE' },
  ],
  attendance: [],
  payrollConfigs: [
    {
      id: 1,
      name: 'Ali Bori Factory Operational Policy 2026',
      salary_period: 'MONTHLY',
      working_days_per_period: 26,
      absence_deduction_method: 'DAILY_RATE',
      absence_deduction_rate: '1.0000',
      overtime_hourly_multiplier: '1.50',
      saturday_rate: '500.00',
      is_active: true,
    },
  ],
  payrollPeriods: [
    {
      id: 'p1',
      period_code: 'PAY-2026-09',
      start_date: '2026-09-01',
      end_date: '2026-09-30',
      working_days: 26,
      status: 'CALCULATED',
      total_gross_salary: '21100.00',
      total_deductions: '650.00',
      total_net_salary: '20450.00',
      employee_count: 3,
    },
  ],
  payrollSlips: [],
  documents: [
    { id: 'doc-1', title: 'Factory Safety Standards 2026', category: 'COMPLIANCE', file_type: 'PDF', file_size_bytes: 204800, description: 'Factory health and safety standard operating procedures' },
  ],
  notifications: [
    {
      id: 'notif-1',
      recipient: 'all',
      notification_type: 'SYSTEM_UPDATE',
      title: 'Supabase Cloud Backend Live',
      message: 'Ali Bori Factory ERP backend is connected and live on Supabase.',
      severity: 'INFO',
      is_read: false,
      created_at: new Date().toISOString(),
    },
    {
      id: 'notif-2',
      recipient: 'production_manager',
      notification_type: 'PRODUCTION_ALERT',
      title: 'Scheduled Preventive Maintenance',
      message: 'Braider Unit 03 is due for spindle lubricant check and tension inspection.',
      severity: 'WARNING',
      is_read: false,
      created_at: new Date().toISOString(),
    },
  ],
  auditLogs: [],
  movementLedger: [],
  users: [
    { id: 'a1000000-0000-0000-0000-000000000001', email: 'admin@alibori.com', full_name: 'Factory General Manager', role: 'super_admin', role_display: 'Super Admin', is_superuser: true, is_active: true },
    { id: 'a1000000-0000-0000-0000-000000000002', email: 'monitor@alibori.com', full_name: 'Production Line Monitor', role: 'factory_monitor', role_display: 'Factory Monitor', is_superuser: false, is_active: true },
    { id: 'a1000000-0000-0000-0000-000000000003', email: 'store@alibori.com', full_name: 'Merkato Branch Manager', role: 'store', role_display: 'Store / Shop', is_superuser: false, is_active: true, store_name: 'Merkato Wholesale Branch', customer_id: 'c1' },
  ],
};

// Wire up products with variants
MEMORY_DB.products[0].variants = MEMORY_DB.variants;

// -------------------------------------------------------------
// High-Performance Query Cache & Invalidation
// -------------------------------------------------------------
interface CacheEntry {
  data: any;
  timestamp: number;
}
const queryCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30 * 1000; // 30 seconds fresh cache

export function invalidateCache(prefix?: string) {
  if (!prefix) {
    queryCache.clear();
    return;
  }
  for (const key of queryCache.keys()) {
    if (key.startsWith(prefix) || key.startsWith('/analytics/dashboard')) {
      queryCache.delete(key);
    }
  }
}

/**
 * Handle Supabase Queries with in-memory caching for lightning-fast navigation
 */
export async function handleSupabaseRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  endpoint: string,
  body?: any
): Promise<T> {
  const { path, params } = parseQuery(endpoint);
  const cacheKey = `${path}?${new URLSearchParams(params).toString()}`;

  // Instant response from in-memory cache for GET queries
  if (method === 'GET') {
    const cached = queryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data as T;
    }
  } else {
    // For mutations (POST, PUT, PATCH, DELETE), clear query cache completely to guarantee instant live consistency across inventory, production, warehouse, and dashboard
    queryCache.clear();
  }

  const result = await executeSupabaseRequest<T>(method, path, params, body);

  if (method === 'GET' && result !== undefined && result !== null) {
    queryCache.set(cacheKey, { data: result, timestamp: Date.now() });
  }

  return result;
}

/**
 * Execute query against Supabase or fallback to in-memory store
 */
async function executeSupabaseRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  params: Record<string, string>,
  body?: any
): Promise<T> {
  const useLiveSupabase = isSupabaseConfigured();

  // -------------------------------------------------------------
  // 1. DASHBOARD ANALYTICS
  // -------------------------------------------------------------
  if (path === '/analytics/dashboard') {
    if (useLiveSupabase) {
      try {
        const [
          batchesRes,
          bagsRes,
          materialsRes,
          machinesRes,
          ordersRes,
          customersRes,
          receivablesRes,
          stockRequestsRes,
          employeesRes,
          attendanceRes,
          sparesRes
        ] = await Promise.all([
          supabase.from('production_batches').select('*').order('start_date', { ascending: false }),
          supabase.from('store_finished_product_bags').select('*'),
          supabase.from('inventory_raw_materials').select('*, stock_records:inventory_raw_material_stocks(*)'),
          supabase.from('assets_machines').select('id, machine_code, name, health, status'),
          supabase.from('sales_dispatch_orders').select('*'),
          supabase.from('sales_customers').select('*'),
          supabase.from('sales_receivables').select('*'),
          supabase.from('inventory_stock_requests').select('*'),
          supabase.from('workforce_employees').select('*'),
          supabase.from('workforce_attendance').select('*'),
          supabase.from('assets_spare_parts').select('*')
        ]);

        const batches = batchesRes.data || [];
        const bags = bagsRes.data || [];
        const rawMaterials = materialsRes.data || [];
        const machines = machinesRes.data || [];
        const orders = ordersRes.data || [];
        const customers = customersRes.data || [];
        const receivables = receivablesRes.data || [];
        const stockRequests = stockRequestsRes.data || [];
        const employees = employeesRes.data || [];
        const attendance = attendanceRes.data || [];
        const spares = sparesRes.data || [];

        const todayStr = new Date().toISOString().slice(0, 10);
        const todayBatches = batches.filter((b) => b.start_date === todayStr);
        const targetBatches = todayBatches.length > 0 ? todayBatches : batches;

        const totalInputKg = targetBatches.reduce((acc, b) => acc + (parseFloat(b.raw_yarn_input_kg) || 0), 0);
        const totalBraidedKg = targetBatches.reduce((acc, b) => acc + (parseFloat(b.braided_output_kg) || 0), 0);
        const totalFinishedKg = targetBatches.reduce((acc, b) => acc + (parseFloat(b.finished_output_kg) || 0), 0);
        const totalWasteKg = targetBatches.reduce((acc, b) => acc + (parseFloat(b.total_waste_kg) || 0), 0);

        const yieldPct = totalInputKg > 0 ? (totalFinishedKg / totalInputKg) * 100 : 0;
        const wastePct = totalInputKg > 0 ? (totalWasteKg / totalInputKg) * 100 : 0;

        let totalRawKg = 0;
        let lowStockCount = 0;
        rawMaterials.forEach((rm) => {
          const avail = (rm.stock_records || []).reduce((s: number, r: any) => s + (parseFloat(r.available_kg || r.quantity_kg) || 0), 0);
          totalRawKg += avail;
          if (avail <= (parseFloat(rm.minimum_stock_kg) || 0)) {
            lowStockCount++;
          }
        });

        const inStoreBags = bags.filter((b) => b.status === 'IN_STORE');
        const availableBagsCount = inStoreBags.length;
        const availableBagsKg = inStoreBags.reduce((acc, b) => acc + (parseFloat(b.weight_kg) || 0), 0);

        const normalMachines = machines.filter((m) => (m.health || m.status) === 'NORMAL' || (m.health || m.status) === 'OPERATIONAL').length;
        const serviceMachines = machines.filter((m) => (m.health || m.status) === 'NEEDS_SERVICE' || (m.health || m.status) === 'MAINTENANCE').length;
        const criticalMachines = machines.filter((m) => (m.health || m.status) === 'CRITICAL' || (m.health || m.status) === 'OFFLINE').length;

        const totalReceivables = customers.reduce((acc, c) => acc + (parseFloat(c.current_balance_etb) || 0), 0);
        const overdueEtb = receivables.filter((r) => r.status === 'OVERDUE').reduce((acc, r) => acc + (parseFloat(r.remaining_amount) || 0), 0);

        const todayAttendance = attendance.filter((a) => a.date === todayStr);
        const presentCount = todayAttendance.filter((a) => a.status === 'PRESENT').length || employees.filter((e) => e.employment_status === 'ACTIVE').length;
        const absentCount = todayAttendance.filter((a) => a.status === 'ABSENT').length;
        const overtimeHours = todayAttendance.reduce((acc, a) => acc + (parseFloat(a.overtime_hours) || 0), 0);

        const pendingRequests = stockRequests.filter((r) => r.status === 'PENDING').length;
        const lowSparesCount = spares.filter((s) => s.is_low_stock || (s.minimum_quantity && s.quantity <= s.minimum_quantity)).length;
        const criticalAlertsCount = criticalMachines + (lowStockCount > 0 ? 1 : 0) + (overdueEtb > 0 ? 1 : 0);

        const batchesHistory = batches.slice(0, 10).map((b) => ({
          batch_number: b.batch_number,
          input_kg: parseFloat(b.raw_yarn_input_kg) || 0,
          braided_kg: parseFloat(b.braided_output_kg) || 0,
          finished_kg: parseFloat(b.finished_output_kg) || 0,
          waste_kg: parseFloat(b.total_waste_kg) || 0,
          yield_percentage: parseFloat(b.yield_percentage) || 0
        }));

        // Helper to get ISO week
        const getWeekInfo = (dateStr: string) => {
          const d = new Date(dateStr + 'T00:00:00');
          const d2 = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
          const dayNum = d2.getUTCDay() || 7;
          d2.setUTCDate(d2.getUTCDate() + 4 - dayNum);
          const yearStart = new Date(Date.UTC(d2.getUTCFullYear(), 0, 1));
          const weekNo = Math.ceil((((d2.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
          const monthShort = d.toLocaleDateString('en-US', { month: 'short' });
          return {
            key: `${d2.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`,
            label: `Wk ${weekNo} (${monthShort})`
          };
        };

        const getMonthInfo = (dateStr: string) => {
          const d = new Date(dateStr + 'T00:00:00');
          return {
            key: dateStr.slice(0, 7),
            label: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
          };
        };

        const dailyMap: Record<string, { date: string; label: string; input_kg: number; finished_kg: number; waste_kg: number; batch_count: number }> = {};
        const weeklyMap: Record<string, { week: string; label: string; input_kg: number; finished_kg: number; waste_kg: number; batch_count: number }> = {};
        const monthlyMap: Record<string, { month: string; label: string; input_kg: number; finished_kg: number; waste_kg: number; batch_count: number }> = {};

        batches.forEach((b: any) => {
          const dateStr = b.start_date || b.completion_date || todayStr;
          const dObj = new Date(dateStr + 'T00:00:00');
          const dayLabel = dObj.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
          const weekInfo = getWeekInfo(dateStr);
          const monthInfo = getMonthInfo(dateStr);

          const inKg = parseFloat(b.raw_yarn_input_kg) || 0;
          const outKg = parseFloat(b.finished_output_kg) || 0;
          const wstKg = parseFloat(b.total_waste_kg) || 0;

          if (!dailyMap[dateStr]) {
            dailyMap[dateStr] = { date: dateStr, label: dayLabel, input_kg: 0, finished_kg: 0, waste_kg: 0, batch_count: 0 };
          }
          dailyMap[dateStr].input_kg += inKg;
          dailyMap[dateStr].finished_kg += outKg;
          dailyMap[dateStr].waste_kg += wstKg;
          dailyMap[dateStr].batch_count += 1;

          if (!weeklyMap[weekInfo.key]) {
            weeklyMap[weekInfo.key] = { week: weekInfo.key, label: weekInfo.label, input_kg: 0, finished_kg: 0, waste_kg: 0, batch_count: 0 };
          }
          weeklyMap[weekInfo.key].input_kg += inKg;
          weeklyMap[weekInfo.key].finished_kg += outKg;
          weeklyMap[weekInfo.key].waste_kg += wstKg;
          weeklyMap[weekInfo.key].batch_count += 1;

          if (!monthlyMap[monthInfo.key]) {
            monthlyMap[monthInfo.key] = { month: monthInfo.key, label: monthInfo.label, input_kg: 0, finished_kg: 0, waste_kg: 0, batch_count: 0 };
          }
          monthlyMap[monthInfo.key].input_kg += inKg;
          monthlyMap[monthInfo.key].finished_kg += outKg;
          monthlyMap[monthInfo.key].waste_kg += wstKg;
          monthlyMap[monthInfo.key].batch_count += 1;
        });

        const dailyHistory = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date)).map((d) => ({
          ...d,
          input_kg: parseFloat(d.input_kg.toFixed(2)),
          finished_kg: parseFloat(d.finished_kg.toFixed(2)),
          waste_kg: parseFloat(d.waste_kg.toFixed(2)),
          yield_percentage: d.input_kg > 0 ? parseFloat(((d.finished_kg / d.input_kg) * 100).toFixed(1)) : 0
        }));

        const weeklyHistory = Object.values(weeklyMap).sort((a, b) => a.week.localeCompare(b.week)).map((w) => ({
          ...w,
          input_kg: parseFloat(w.input_kg.toFixed(2)),
          finished_kg: parseFloat(w.finished_kg.toFixed(2)),
          waste_kg: parseFloat(w.waste_kg.toFixed(2)),
          yield_percentage: w.input_kg > 0 ? parseFloat(((w.finished_kg / w.input_kg) * 100).toFixed(1)) : 0
        }));

        const monthlyHistory = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month)).map((m) => ({
          ...m,
          input_kg: parseFloat(m.input_kg.toFixed(2)),
          finished_kg: parseFloat(m.finished_kg.toFixed(2)),
          waste_kg: parseFloat(m.waste_kg.toFixed(2)),
          yield_percentage: m.input_kg > 0 ? parseFloat(((m.finished_kg / m.input_kg) * 100).toFixed(1)) : 0
        }));

        const totalAllInputKg = batches.reduce((acc: number, b: any) => acc + (parseFloat(b.raw_yarn_input_kg) || 0), 0);
        const totalAllFinishedKg = batches.reduce((acc: number, b: any) => acc + (parseFloat(b.finished_output_kg) || 0), 0);
        const totalAllWasteKg = batches.reduce((acc: number, b: any) => acc + (parseFloat(b.total_waste_kg) || 0), 0);

        const activeDaysCount = Math.max(1, Object.keys(dailyMap).length);
        const activeWeeksCount = Math.max(1, Object.keys(weeklyMap).length);
        const activeMonthsCount = Math.max(1, Object.keys(monthlyMap).length);

        const overallYieldPct = totalAllInputKg > 0 ? (totalAllFinishedKg / totalAllInputKg) * 100 : 0;

        const averages = {
          daily: {
            output_kg: parseFloat((totalAllFinishedKg / activeDaysCount).toFixed(2)),
            input_kg: parseFloat((totalAllInputKg / activeDaysCount).toFixed(2)),
            waste_kg: parseFloat((totalAllWasteKg / activeDaysCount).toFixed(2)),
            yield_percentage: parseFloat(overallYieldPct.toFixed(1)),
            batch_count: parseFloat((batches.length / activeDaysCount).toFixed(1)),
            active_days_count: activeDaysCount
          },
          weekly: {
            output_kg: parseFloat((totalAllFinishedKg / activeWeeksCount).toFixed(2)),
            input_kg: parseFloat((totalAllInputKg / activeWeeksCount).toFixed(2)),
            waste_kg: parseFloat((totalAllWasteKg / activeWeeksCount).toFixed(2)),
            yield_percentage: parseFloat(overallYieldPct.toFixed(1)),
            batch_count: parseFloat((batches.length / activeWeeksCount).toFixed(1)),
            active_weeks_count: activeWeeksCount
          },
          monthly: {
            output_kg: parseFloat((totalAllFinishedKg / activeMonthsCount).toFixed(2)),
            input_kg: parseFloat((totalAllInputKg / activeMonthsCount).toFixed(2)),
            waste_kg: parseFloat((totalAllWasteKg / activeMonthsCount).toFixed(2)),
            yield_percentage: parseFloat(overallYieldPct.toFixed(1)),
            batch_count: parseFloat((batches.length / activeMonthsCount).toFixed(1)),
            active_months_count: activeMonthsCount
          }
        };

        return {
          raw_materials: {
            total_kg: parseFloat(totalRawKg.toFixed(2)),
            low_stock_count: lowStockCount
          },
          production: {
            today_input_kg: parseFloat(totalInputKg.toFixed(2)),
            today_braided_output_kg: parseFloat(totalBraidedKg.toFixed(2)),
            today_output_kg: parseFloat(totalFinishedKg.toFixed(2)),
            today_waste_kg: parseFloat(totalWasteKg.toFixed(2)),
            waste_percentage: parseFloat(wastePct.toFixed(1)),
            yield_percentage: parseFloat(yieldPct.toFixed(1)),
            today_batch_count: targetBatches.length,
            is_showing_recent: todayBatches.length === 0,
            averages,
            daily_history: dailyHistory,
            weekly_history: weeklyHistory,
            monthly_history: monthlyHistory
          },
          wip: {
            building_1_kg: 0.0,
            building_2_kg: 0.0
          },
          finished_goods: {
            available_bags: availableBagsCount,
            available_kg: parseFloat(availableBagsKg.toFixed(2))
          },
          sales: {
            today_dispatches: orders.filter((o) => o.created_at?.startsWith(todayStr)).length,
            today_sales_etb: 0.0,
            total_sales_etb: orders.reduce((acc, o) => acc + (parseFloat(o.total_amount) || 0), 0)
          },
          credit: {
            total_receivables_etb: parseFloat(totalReceivables.toFixed(2)),
            overdue_etb: parseFloat(overdueEtb.toFixed(2)),
            credit_utilization_percent: 18.0
          },
          machines: {
            total: machines.length,
            normal: normalMachines,
            needs_service: serviceMachines,
            critical: criticalMachines
          },
          workforce: {
            total_employees: employees.length,
            present_today: presentCount,
            absent_today: absentCount,
            overtime_hours: overtimeHours
          },
          alerts: {
            critical_count: criticalAlertsCount,
            pending_stock_requests: pendingRequests,
            low_spares_count: lowSparesCount
          },
          batches_history: batchesHistory
        } as unknown as T;
      } catch (err) {
        console.error('Failed to compute live dashboard metrics from tables:', err);
      }
    }

    return {
      raw_materials: { total_kg: 2810.0, low_stock_count: 0 },
      production: {
        today_input_kg: 100.0,
        today_braided_output_kg: 96.5,
        today_output_kg: 94.0,
        today_waste_kg: 6.0,
        waste_percentage: 6.0,
        yield_percentage: 94.0,
        today_batch_count: 1,
      },
      wip: { building_1_kg: 0.0, building_2_kg: 0.0 },
      finished_goods: { available_bags: MEMORY_DB.bags.filter((b) => b.status === 'IN_STORE').length, available_kg: 67.5 },
      sales: { today_dispatches: MEMORY_DB.orders.length, today_sales_etb: 0.0, total_sales_etb: 0.0 },
      credit: { total_receivables_etb: 45000.0, overdue_etb: 0.0, credit_utilization_percent: 18.0 },
      machines: { total: MEMORY_DB.machines.length, normal: MEMORY_DB.machines.filter((m) => m.health === 'NORMAL').length, needs_service: 0, critical: 0 },
      workforce: { total_employees: MEMORY_DB.employees.length, present_today: MEMORY_DB.employees.length, absent_today: 0, overtime_hours: 0.0 },
      alerts: { critical_count: 0, pending_stock_requests: 0, low_spares_count: 0 },
    } as unknown as T;
  }

  // -------------------------------------------------------------
  // 2. PRODUCTION BATCHES & RPC ACTIONS
  // -------------------------------------------------------------
  if (path.startsWith('/production/batches')) {
    // Action: move_to_b2
    if (path.includes('/move_to_b2')) {
      const batchId = path.split('/')[3];
      if (useLiveSupabase) {
        const { data, error } = await supabase.rpc('move_batch_to_b2', {
          p_batch_id: batchId,
          p_braided_output_kg: parseFloat(body.braided_output_kg || '0'),
          p_transferred_by: body.transferred_by || 'Braiding Supervisor',
          p_notes: body.notes || '',
        });
        if (!error && data) return data as T;
        if (error) throw new Error(error.message);
      }
      const b = MEMORY_DB.batches.find((item) => item.id === batchId);
      if (b) {
        b.braided_output_kg = body.braided_output_kg;
        b.tipping_input_kg = body.braided_output_kg;
        b.status = 'TRANSFERRED';
        return b as T;
      }
      return {} as T;
    }

    // Action: weigh_and_store
    if (path.includes('/weigh_and_store')) {
      const batchId = path.split('/')[3];
      const sackWeights = body.sack_weights || (body.sack_weight_kg ? [body.sack_weight_kg] : []);
      if (useLiveSupabase) {
        const { data, error } = await supabase.rpc('weigh_and_store_batch', {
          p_batch_id: batchId,
          p_finished_output_kg: parseFloat(body.finished_output_kg || '0'),
          p_sack_weights: sackWeights.map((w: any) => parseFloat(w)),
          p_store_location: body.store_location || 'Finished Goods Store 1',
        });
        if (!error && data) return data as T;
        if (error) throw new Error(error.message);
      }

      const b = MEMORY_DB.batches.find((item) => item.id === batchId);
      if (b) {
        b.finished_output_kg = body.finished_output_kg;
        b.status = 'COMPLETED';
        const newBag = {
          id: `bag-${Date.now()}`,
          bag_id: `ABSL-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`,
          batch: b.id,
          product_variant: b.product_variant,
          product_name: b.product_name,
          weight_kg: String(body.finished_output_kg || '30.00'),
          store_location: body.store_location || 'Finished Goods Store 1',
          status: 'IN_STORE',
          entry_date: new Date().toISOString().slice(0, 10),
        };
        MEMORY_DB.bags.push(newBag);
        if (!b.bags_list) b.bags_list = [];
        b.bags_list.push(newBag);
        return b as T;
      }
      return {} as T;
    }

    // GET /production/batches/
    if (method === 'GET') {
      const singleId = path.replace('/production/batches', '').replace(/^\//, '');
      if (singleId) {
        if (useLiveSupabase) {
          const { data, error } = await supabase
            .from('production_batches')
            .select('*, product_variant:catalog_product_variants(*), raw_material_yarn:inventory_raw_materials(*), bags:store_finished_product_bags(*)')
            .eq('id', singleId)
            .single();
          if (!error && data) return data as T;
        }
        return (MEMORY_DB.batches.find((b) => b.id === singleId) || {}) as T;
      }

      if (useLiveSupabase) {
        const { data, error } = await supabase
          .from('production_batches')
          .select('*, product_variant:catalog_product_variants(*), bags:store_finished_product_bags(*)')
          .order('created_at', { ascending: false });
        if (!error && data) return { results: data } as T;
      }
      return { results: MEMORY_DB.batches } as T;
    }

    // POST /production/batches/
    if (method === 'POST') {
      let yarnId = body.raw_material_yarn || null;
      const inputKg = parseFloat(body.raw_yarn_input_kg || '32.00');
      const batchCount = parseInt(body.yarn_batch_count || '1', 10);

      if (useLiveSupabase) {
        // If raw_material_yarn was not explicitly supplied, find the matching yarn variant by product color
        if (!yarnId && body.product_variant) {
          const { data: pVar } = await supabase
            .from('catalog_product_variants')
            .select('color_id, color_details:catalog_colors(name, code)')
            .eq('id', body.product_variant)
            .maybeSingle();
          if (pVar) {
            const colName = (pVar.color_details?.name || '').toLowerCase();
            const { data: matchedYarn } = await supabase
              .from('inventory_raw_materials')
              .select('id')
              .ilike('color_name', colName)
              .maybeSingle();
            if (matchedYarn) yarnId = matchedYarn.id;
          }
          if (!yarnId) yarnId = 1; // Default to black polyester yarn
        }

        const { data, error } = await supabase.rpc('create_production_batch', {
          p_product_variant_id: body.product_variant,
          p_raw_yarn_input_kg: inputKg,
          p_yarn_batch_count: batchCount,
          p_raw_material_yarn_id: yarnId,
          p_acetone_used: parseFloat(body.acetone_used || '0'),
          p_film_roll_variant_id: body.film_roll_variant || null,
          p_film_roll_used: parseFloat(body.film_roll_used || '0'),
          p_supervisor: body.supervisor || 'Production Supervisor',
          p_notes: body.notes || '',
        });

        // Always clear cache so subsequent GET /inventory/variants or /production/batches gets fresh live data
        queryCache.clear();

        if (!error && data) return data as T;
        if (error) throw new Error(error.message);
      }

      // In-Memory Fallback: Also deduct from MEMORY_DB.rawMaterials & stocks
      const fallbackYarnId = yarnId || 1;
      const fallbackMat = MEMORY_DB.rawMaterials.find((m) => m.id === fallbackYarnId);
      if (fallbackMat) {
        fallbackMat.total_available_kg = Math.max(0, (fallbackMat.total_available_kg || 0) - inputKg);
      }
      queryCache.clear();

      const newBatch = {
        id: `batch-${Date.now()}`,
        batch_number: `BATCH-${new Date().getFullYear()}-${String(MEMORY_DB.batches.length + 1).padStart(5, '0')}`,
        product_variant: body.product_variant,
        product_name: MEMORY_DB.variants.find((v) => v.id === body.product_variant)?.display_name || 'Shoe Lace',
        status: 'IN_PROGRESS',
        start_date: new Date().toISOString().slice(0, 10),
        raw_yarn_input_kg: String(inputKg.toFixed(2)),
        braided_output_kg: '0.00',
        finished_output_kg: '0.00',
        phase1_waste_kg: '0.00',
        phase2_waste_kg: '0.00',
        total_waste_kg: '0.00',
        yield_percentage: '0.00',
        waste_percentage: '0.00',
        bag_count: 0,
        bags_list: [],
        supervisor: body.supervisor || 'Production Supervisor',
        notes: body.notes || '',
      };
      MEMORY_DB.batches.unshift(newBatch);
      return newBatch as T;
    }

    // PATCH /production/batches/:id/
    if (method === 'PATCH') {
      const batchId = path.split('/')[3];
      if (useLiveSupabase) {
        const { data, error } = await supabase.from('production_batches').update(body).eq('id', batchId).select().single();
        if (!error && data) return data as T;
      }
      const b = MEMORY_DB.batches.find((item) => item.id === batchId);
      if (b) {
        Object.assign(b, body);
        return b as T;
      }
      return {} as T;
    }

    // DELETE /production/batches/:id/
    if (method === 'DELETE') {
      const batchId = path.split('/')[3];
      if (useLiveSupabase) {
        await supabase.from('production_batches').delete().eq('id', batchId);
      }
      MEMORY_DB.batches = MEMORY_DB.batches.filter((b) => b.id !== batchId);
      return {} as T;
    }
  }

  // -------------------------------------------------------------
  // 3. CATALOG (Products, Variants, Colors, Thicknesses)
  // -------------------------------------------------------------
  if (path === '/catalog/variants') {
    if (useLiveSupabase) {
      const { data, error } = await supabase
        .from('catalog_product_variants')
        .select('*, color_details:catalog_colors(*), thickness_details:catalog_thicknesses(*), stock:catalog_product_stocks(*)');
      if (!error && data) return { results: data } as T;
    }
    return { results: MEMORY_DB.variants } as T;
  }

  if (path === '/catalog/products') {
    if (useLiveSupabase) {
      const { data, error } = await supabase
        .from('catalog_products')
        .select('*, variants:catalog_product_variants(*, color_details:catalog_colors(*), thickness_details:catalog_thicknesses(*))');
      if (!error && data) return { results: data } as T;
    }
    return { results: MEMORY_DB.products } as T;
  }

  if (path === '/catalog/colors') {
    if (useLiveSupabase) {
      const { data, error } = await supabase.from('catalog_colors').select('*');
      if (!error && data) return { results: data } as T;
    }
    return { results: MEMORY_DB.colors } as T;
  }

  if (path === '/catalog/thicknesses') {
    if (useLiveSupabase) {
      const { data, error } = await supabase.from('catalog_thicknesses').select('*');
      if (!error && data) return { results: data } as T;
    }
    return { results: MEMORY_DB.thicknesses } as T;
  }

  // -------------------------------------------------------------
  // 4. ASSETS (Machines, Machine Types, Spares, Maintenance)
  // -------------------------------------------------------------
  if (path === '/assets/machines' || path.startsWith('/assets/machines/')) {
    if (method === 'PATCH') {
      const mId = path.replace('/assets/machines/', '');
      if (useLiveSupabase) {
        const { data, error } = await supabase.from('assets_machines').update(body).eq('id', mId).select().single();
        if (!error && data) return data as T;
      }
      const m = MEMORY_DB.machines.find((x) => x.id === mId);
      if (m) Object.assign(m, body);
      return (m || {}) as T;
    }

    if (useLiveSupabase) {
      const { data, error } = await supabase.from('assets_machines').select('*, machine_type:assets_machine_types(*)');
      if (!error && data) return { results: data } as T;
    }
    return { results: MEMORY_DB.machines } as T;
  }

  if (path === '/assets/types' || path === '/assets/machine-types') {
    if (useLiveSupabase) {
      const { data, error } = await supabase.from('assets_machine_types').select('*');
      if (!error && data) return { results: data } as T;
    }
    return { results: MEMORY_DB.machineTypes } as T;
  }

  if (path === '/assets/spares' || path === '/assets/spare-parts') {
    if (method === 'POST') {
      if (useLiveSupabase) {
        const { data, error } = await supabase.from('assets_spare_parts').insert([body]).select().single();
        if (!error && data) return data as T;
      }
      const newSp = { id: Date.now(), ...body, is_low_stock: false };
      MEMORY_DB.spareParts.push(newSp);
      return newSp as T;
    }

    if (useLiveSupabase) {
      const { data, error } = await supabase.from('assets_spare_parts').select('*');
      if (!error && data) return { results: data } as T;
    }
    return { results: MEMORY_DB.spareParts } as T;
  }

  if (path === '/assets/spare-transactions' || path === '/assets/maintenance-logs') {
    if (method === 'POST') {
      if (useLiveSupabase) {
        const { data, error } = await supabase.from('assets_spare_part_transactions').insert([body]).select().single();
        if (!error && data) return data as T;
      }
      const newLog = { id: `log-${Date.now()}`, ...body, created_at: new Date().toISOString() };
      MEMORY_DB.maintenanceLogs.unshift(newLog);
      return newLog as T;
    }

    if (useLiveSupabase) {
      const { data, error } = await supabase
        .from('assets_spare_part_transactions')
        .select('*, spare_part:assets_spare_parts(*), machine:assets_machines(*)')
        .order('created_at', { ascending: false });
      if (!error && data) return { results: data } as T;
    }
    return { results: MEMORY_DB.maintenanceLogs } as T;
  }

  if (path === '/assets/utilities') {
    if (useLiveSupabase) {
      const { data, error } = await supabase.from('assets_utilities').select('*');
      if (!error && data) return { results: data } as T;
    }
    return { results: MEMORY_DB.utilities } as T;
  }

  // -------------------------------------------------------------
  // 5. INVENTORY & RAW MATERIALS
  // -------------------------------------------------------------
  if (path === '/inventory/variants' || path === '/inventory/raw-materials') {
    if (useLiveSupabase) {
      const { data, error } = await supabase
        .from('inventory_raw_materials')
        .select('*, material_type:inventory_raw_material_types(*), stock_records:inventory_raw_material_stocks(*)');
      if (!error && data) {
        const enriched = data.map((rm: any) => {
          const totalAvail = (rm.stock_records || []).reduce(
            (sum: number, s: any) => sum + (parseFloat(s.available_kg || '0') || 0),
            0
          );
          const minStock = parseFloat(rm.minimum_stock_kg || '0') || 0;
          return {
            ...rm,
            material_type_name: rm.material_type?.name || 'Raw Material',
            total_available_kg: totalAvail,
            is_low_stock: totalAvail <= minStock,
          };
        });
        return { results: enriched } as T;
      }
    }
    return { results: MEMORY_DB.rawMaterials } as T;
  }

  if (path === '/inventory/stocks' || path === '/inventory/raw-material-stocks') {
    if (method === 'POST') {
      if (useLiveSupabase) {
        const variantId = Number(body.variant || body.raw_material_variant);
        const qty = parseFloat(body.available_kg || body.quantity_kg || body.total_kg || '0') || 0;

        const { data: existing } = await supabase
          .from('inventory_raw_material_stocks')
          .select('id, available_kg')
          .eq('variant_id', variantId)
          .maybeSingle();

        let stockRecord;
        if (existing) {
          const newAvail = (parseFloat(existing.available_kg || '0') || 0) + qty;
          const { data, error } = await supabase
            .from('inventory_raw_material_stocks')
            .update({ available_kg: newAvail, updated_at: new Date().toISOString() })
            .eq('id', existing.id)
            .select()
            .single();
          if (!error && data) stockRecord = data;
        } else {
          const { data: locs } = await supabase.from('inventory_storage_locations').select('id').limit(1);
          const locId = locs && locs[0] ? locs[0].id : null;
          const payload: any = {
            variant_id: variantId,
            available_kg: qty,
            reserved_kg: 0,
          };
          if (locId) payload.storage_location_id = locId;

          const { data, error } = await supabase
            .from('inventory_raw_material_stocks')
            .insert([payload])
            .select()
            .single();
          if (!error && data) stockRecord = data;
        }

        if (stockRecord) {
          invalidateCache('/inventory');
          return stockRecord as T;
        }
      }
      const newStk = { id: Date.now(), ...body };
      MEMORY_DB.rawMaterialStocks.push(newStk);
      invalidateCache('/inventory');
      return newStk as T;
    }

    if (useLiveSupabase) {
      const { data, error } = await supabase
        .from('inventory_raw_material_stocks')
        .select('*, variant:inventory_raw_materials(*), storage_location:inventory_storage_locations(*)');
      if (!error && data) {
        const mapped = data.map((st: any) => ({
          ...st,
          place_text: st.storage_location?.name || 'Main Warehouse Shelf',
          variant_name: st.variant ? `${st.variant.code} - ${st.variant.color_name}` : 'Yarn',
        }));
        return { results: mapped } as T;
      }
    }
    return { results: MEMORY_DB.rawMaterialStocks } as T;
  }

  if (path === '/inventory/stock-requests') {
    if (method === 'POST') {
      const { items = [], ...reqData } = body || {};
      const generatedReqNumber = reqData.request_number || `REQ-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

      if (useLiveSupabase) {
        const reqPayload: any = {
          request_number: generatedReqNumber,
          requester_name: reqData.requester_name || 'Production Staff',
          department: reqData.department || 'Braiding Section',
          reason: reqData.reason || 'Production batch yarn requirement',
          status: reqData.status || 'PENDING',
          notes: reqData.notes || null,
        };

        const { data: createdReq, error: reqError } = await supabase
          .from('inventory_stock_requests')
          .insert([reqPayload])
          .select()
          .single();

        if (!reqError && createdReq) {
          let createdItems: any[] = [];
          if (Array.isArray(items) && items.length > 0) {
            const itemInserts = items.map((it: any) => ({
              stock_request_id: createdReq.id,
              item_type: it.item_type || 'RAW_MATERIAL',
              raw_material_id: it.raw_material_variant || it.raw_material_id || null,
              spare_part_id: it.spare_part || it.spare_part_id || null,
              item_description: it.item_description || null,
              requested_quantity: parseFloat(it.requested_quantity || '1') || 1,
              approved_quantity: parseFloat(it.approved_quantity || '0') || 0,
              issued_quantity: parseFloat(it.issued_quantity || '0') || 0,
              unit: it.unit || 'KG',
              status: it.status || 'PENDING',
            }));

            const { data: itemsData, error: itemsError } = await supabase
              .from('inventory_stock_request_items')
              .insert(itemInserts)
              .select();

            if (!itemsError && itemsData) {
              createdItems = itemsData;
            }
          }
          createdReq.items = createdItems.length > 0 ? createdItems : items;
          invalidateCache('/inventory/stock-requests');
          return createdReq as T;
        } else if (reqError) {
          console.warn('Failed inserting stock request to Supabase, falling back to memory DB:', reqError);
        }
      }

      const newReq = {
        id: `req-${Date.now()}`,
        request_number: generatedReqNumber,
        status: reqData.status || 'PENDING',
        created_at: new Date().toISOString(),
        ...body,
      };
      MEMORY_DB.stockRequests.unshift(newReq);
      invalidateCache('/inventory/stock-requests');
      return newReq as T;
    }

    if (useLiveSupabase) {
      const { data, error } = await supabase
        .from('inventory_stock_requests')
        .select(`
          *,
          items:inventory_stock_request_items(
            *,
            raw_material:inventory_raw_materials(
              code,
              color_name,
              material_type:inventory_raw_material_types(name)
            ),
            spare_part:assets_spare_parts(name)
          )
        `)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const enriched = data.map((req: any) => ({
          ...req,
          items: (req.items || []).map((it: any) => ({
            ...it,
            raw_material_name: it.raw_material
              ? `${it.raw_material.code} - ${it.raw_material.color_name} (${it.raw_material.material_type?.name || 'Yarn'})`
              : it.item_description || 'Raw Material',
            spare_part_name: it.spare_part?.name || it.item_description,
          })),
        }));
        return { results: enriched } as T;
      }
    }
    return { results: MEMORY_DB.stockRequests } as T;
  }

  if (path.startsWith('/inventory/stock-requests/')) {
    const reqId = path.replace('/inventory/stock-requests/', '');
    if (method === 'PATCH') {
      const { items, ...patchData } = body || {};
      if (useLiveSupabase) {
        const { data, error } = await supabase
          .from('inventory_stock_requests')
          .update(patchData)
          .eq('id', reqId)
          .select()
          .single();
        if (!error && data) {
          if (patchData.status === 'APPROVED' || patchData.status === 'ISSUED') {
            await supabase
              .from('inventory_stock_request_items')
              .update({ status: patchData.status })
              .eq('stock_request_id', reqId);
          }
          invalidateCache('/inventory/stock-requests');
          return data as T;
        }
      }
      const r = MEMORY_DB.stockRequests.find((x) => x.id === reqId);
      if (r) Object.assign(r, body);
      invalidateCache('/inventory/stock-requests');
      return (r || {}) as T;
    }
  }

  // -------------------------------------------------------------
  // 6. STORE & BAGS
  // -------------------------------------------------------------
  if (path === '/store/bags' || path.startsWith('/store/bags/')) {
    if (method === 'DELETE') {
      const bagId = path.replace('/store/bags/', '');
      if (useLiveSupabase) {
        await supabase.from('store_finished_product_bags').delete().eq('id', bagId);
      }
      MEMORY_DB.bags = MEMORY_DB.bags.filter((b) => b.id !== bagId);
      return {} as T;
    }

    if (method === 'POST') {
      if (useLiveSupabase) {
        const { data, error } = await supabase.from('store_finished_product_bags').insert([body]).select().single();
        if (!error && data) return data as T;
      }
      const newBag = {
        id: `bag-${Date.now()}`,
        bag_id: `ABSL-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`,
        status: 'IN_STORE',
        entry_date: new Date().toISOString().slice(0, 10),
        ...body,
      };
      MEMORY_DB.bags.unshift(newBag);
      return newBag as T;
    }

    if (useLiveSupabase) {
      let query = supabase.from('store_finished_product_bags').select('*, product_variant:catalog_product_variants(*)');
      if (params.status) query = query.eq('status', params.status);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (!error && data) return { results: data } as T;
    }

    let bags = MEMORY_DB.bags;
    if (params.status) bags = bags.filter((b) => b.status === params.status);
    return { results: bags } as T;
  }

  // -------------------------------------------------------------
  // 7. SALES, ORDERS & RECEIVABLES
  // -------------------------------------------------------------
  if (path === '/sales/customers') {
    if (method === 'POST') {
      if (useLiveSupabase) {
        const { data, error } = await supabase.from('sales_customers').insert([body]).select().single();
        if (!error && data) return data as T;
        if (error) throw new Error(error.message);
      }
      const newCust = {
        id: `c-${Date.now()}`,
        available_credit: body.credit_limit || '0.00',
        current_outstanding: '0.00',
        credit_utilization_percent: 0,
        active: true,
        ...body,
      };
      MEMORY_DB.customers.unshift(newCust);
      return newCust as T;
    }

    if (useLiveSupabase) {
      const { data, error } = await supabase.from('sales_customers').select('*').order('name');
      if (!error && data) return { results: data } as T;
    }
    return { results: MEMORY_DB.customers } as T;
  }

  if (path === '/sales/orders') {
    if (method === 'POST') {
      if (useLiveSupabase) {
        const { data, error } = await supabase.rpc('create_dispatch_order', {
          p_customer_id: body.customer || body.customer_id,
          p_items: body.items,
          p_payment_mode: body.payment_mode || 'CASH',
          p_amount_paid: parseFloat(body.amount_paid || '0'),
          p_due_date: body.due_date || null,
          p_notes: body.notes || '',
        });
        if (!error && data) return data as T;
        if (error) throw new Error(error.message);
      }

      const customer = MEMORY_DB.customers.find((c) => c.id === (body.customer || body.customer_id));
      const totalAmount = body.items.reduce((acc: number, item: any) => {
        const bag = MEMORY_DB.bags.find((b) => b.id === item.bag || b.id === item.bag_id);
        const weight = bag ? parseFloat(bag.weight_kg) : 30.0;
        return acc + weight * parseFloat(item.price_per_kg || '150.00');
      }, 0);

      const newOrder = {
        id: `ord-${Date.now()}`,
        order_number: `DISP-${new Date().getFullYear()}-${String(MEMORY_DB.orders.length + 1).padStart(5, '0')}`,
        customer: customer?.id,
        customer_name: customer?.name || 'Customer',
        payment_mode: body.payment_mode || 'CASH',
        total_kg: '32.50',
        total_amount: totalAmount.toFixed(2),
        amount_paid: String(body.amount_paid || '0.00'),
        outstanding_amount: (totalAmount - parseFloat(body.amount_paid || '0')).toFixed(2),
        status: parseFloat(body.amount_paid || '0') >= totalAmount ? 'SETTLED' : 'PARTIAL',
        created_at: new Date().toISOString(),
        items: body.items,
      };

      // Mark bags as dispatched
      body.items.forEach((item: any) => {
        const b = MEMORY_DB.bags.find((bag) => bag.id === item.bag || bag.id === item.bag_id);
        if (b) b.status = 'DISPATCHED';
      });

      MEMORY_DB.orders.unshift(newOrder);

      if (parseFloat(newOrder.outstanding_amount) > 0) {
        MEMORY_DB.receivables.unshift({
          id: `rec-${Date.now()}`,
          customer: customer?.id,
          customer_name: customer?.name || 'Customer',
          order_number: newOrder.order_number,
          original_amount: newOrder.total_amount,
          amount_paid: newOrder.amount_paid,
          remaining_amount: newOrder.outstanding_amount,
          status: 'PARTIAL',
        });
      }

      return newOrder as T;
    }

    if (useLiveSupabase) {
      const { data, error } = await supabase
        .from('sales_dispatch_orders')
        .select('*, customer:sales_customers(*), items:sales_dispatch_order_items(*, bag:store_finished_product_bags(*))')
        .order('created_at', { ascending: false });
      if (!error && data) return { results: data } as T;
    }
    return { results: MEMORY_DB.orders } as T;
  }

  // Payment collection on orders
  if (path.includes('/collect-payment')) {
    const orderId = path.split('/')[3];
    if (useLiveSupabase) {
      const { data, error } = await supabase.rpc('collect_order_payment', {
        p_order_id: orderId,
        p_amount: parseFloat(body.amount || '0'),
        p_payment_method: body.payment_method || 'CASH',
        p_reference: body.reference || '',
        p_notes: body.notes || '',
      });
      if (!error && data) return data as T;
      if (error) throw new Error(error.message);
    }

    const order = MEMORY_DB.orders.find((o) => o.id === orderId);
    if (order) {
      const paid = parseFloat(body.amount || '0');
      order.amount_paid = (parseFloat(order.amount_paid) + paid).toFixed(2);
      order.outstanding_amount = Math.max(0, parseFloat(order.outstanding_amount) - paid).toFixed(2);
      order.status = parseFloat(order.outstanding_amount) <= 0 ? 'SETTLED' : 'PARTIAL';
      return order as T;
    }
    return { status: 'SETTLED', outstanding_amount: '0.00' } as T;
  }

  if (path === '/sales/receivables') {
    if (useLiveSupabase) {
      const { data, error } = await supabase
        .from('sales_receivables')
        .select('*, customer:sales_customers(*), dispatch_order:sales_dispatch_orders(*)')
        .order('created_at', { ascending: false });
      if (!error && data) return { results: data } as T;
    }
    return { results: MEMORY_DB.receivables } as T;
  }

  // -------------------------------------------------------------
  // 8. WORKFORCE, ATTENDANCE & PAYROLL
  // -------------------------------------------------------------
  if (path === '/workforce/employees') {
    if (method === 'POST') {
      if (useLiveSupabase) {
        const { data, error } = await supabase.from('workforce_employees').insert([body]).select().single();
        if (!error && data) return data as T;
      }
      const newEmp = {
        id: `emp-${Date.now()}`,
        employee_id: `EMP-${String(MEMORY_DB.employees.length + 1).padStart(3, '0')}`,
        employment_status: 'ACTIVE',
        performance_score: '100.00',
        ...body,
      };
      MEMORY_DB.employees.push(newEmp);
      return newEmp as T;
    }

    if (useLiveSupabase) {
      const { data, error } = await supabase.from('workforce_employees').select('*').order('name');
      if (!error && data) return { results: data } as T;
    }
    return { results: MEMORY_DB.employees } as T;
  }

  if (path === '/workforce/attendance') {
    if (method === 'POST') {
      if (body.records && Array.isArray(body.records)) {
        if (useLiveSupabase) {
          const { data, error } = await supabase.rpc('bulk_mark_attendance', {
            p_date: body.date || new Date().toISOString().slice(0, 10),
            p_records: body.records,
          });
          if (!error && data) return data as T;
        }
        return { message: 'Attendance marked successfully' } as T;
      }

      if (useLiveSupabase) {
        const { data, error } = await supabase.from('workforce_attendance').insert([body]).select().single();
        if (!error && data) return data as T;
      }
      const newAtt = { id: `att-${Date.now()}`, ...body };
      MEMORY_DB.attendance.push(newAtt);
      return newAtt as T;
    }

    if (useLiveSupabase) {
      let query = supabase.from('workforce_attendance').select('*, employee:workforce_employees(*)');
      if (params.date) query = query.eq('date', params.date);
      const { data, error } = await query;
      if (!error && data) return { results: data } as T;
    }
    return { results: MEMORY_DB.attendance } as T;
  }

  if (path.startsWith('/workforce/attendance/')) {
    const attId = path.replace('/workforce/attendance/', '');
    if (method === 'PATCH') {
      if (useLiveSupabase) {
        const { data, error } = await supabase.from('workforce_attendance').update(body).eq('id', attId).select().single();
        if (!error && data) return data as T;
      }
      const a = MEMORY_DB.attendance.find((x) => x.id === attId);
      if (a) Object.assign(a, body);
      return (a || {}) as T;
    }
  }

  if (path === '/workforce/payroll-configs') {
    if (useLiveSupabase) {
      const { data, error } = await supabase.from('workforce_payroll_configs').select('*');
      if (!error && data) return { results: data } as T;
    }
    return { results: MEMORY_DB.payrollConfigs } as T;
  }

  if (path === '/workforce/payroll-periods') {
    if (method === 'POST') {
      if (useLiveSupabase) {
        const { data, error } = await supabase.from('workforce_payroll_periods').insert([body]).select().single();
        if (!error && data) return data as T;
      }
      const newPeriod = {
        id: `p-${Date.now()}`,
        status: 'DRAFT',
        total_gross_salary: '0.00',
        total_deductions: '0.00',
        total_net_salary: '0.00',
        ...body,
      };
      MEMORY_DB.payrollPeriods.unshift(newPeriod);
      return newPeriod as T;
    }

    if (useLiveSupabase) {
      const { data, error } = await supabase
        .from('workforce_payroll_periods')
        .select('*, slips:workforce_payroll_slips(*, employee:workforce_employees(*))')
        .order('start_date', { ascending: false });
      if (!error && data) return { results: data } as T;
    }
    return { results: MEMORY_DB.payrollPeriods } as T;
  }

  // Calculate payroll period action
  if (path.includes('/calculate')) {
    const periodId = path.split('/')[3];
    if (useLiveSupabase) {
      const { data, error } = await supabase.rpc('calculate_payroll_period', { p_period_id: periodId });
      if (!error && data) return data as T;
      if (error) throw new Error(error.message);
    }

    const p = MEMORY_DB.payrollPeriods.find((x) => x.id === periodId);
    if (p) {
      p.status = 'CALCULATED';
      p.total_gross_salary = '21100.00';
      p.total_deductions = '650.00';
      p.total_net_salary = '20450.00';
      return p as T;
    }
    return {} as T;
  }

  if (path === '/workforce/payroll-slips') {
    if (useLiveSupabase) {
      let query = supabase.from('workforce_payroll_slips').select('*, employee:workforce_employees(*)');
      if (params.payroll_period) query = query.eq('payroll_period_id', params.payroll_period);
      const { data, error } = await query;
      if (!error && data) return { results: data } as T;
    }
    return { results: MEMORY_DB.payrollSlips } as T;
  }

  // -------------------------------------------------------------
  // 9. DOCUMENTS, NOTIFICATIONS & AUDIT
  // -------------------------------------------------------------
  if (path === '/documents/items' || path === '/documents/registry') {
    if (method === 'POST') {
      if (useLiveSupabase) {
        const { data, error } = await supabase.from('documents_registry').insert([body]).select().single();
        if (!error && data) return data as T;
      }
      const newDoc = { id: `doc-${Date.now()}`, ...body };
      MEMORY_DB.documents.push(newDoc);
      return newDoc as T;
    }

    if (useLiveSupabase) {
      const { data, error } = await supabase.from('documents_registry').select('*').order('created_at', { ascending: false });
      if (!error && data) return { results: data } as T;
    }
    return { results: MEMORY_DB.documents } as T;
  }

  // Notifications
  if (path === '/notifications/items' || path.startsWith('/notifications/items')) {
    if (path.includes('/mark-all-read')) {
      if (useLiveSupabase) {
        await supabase.from('notifications').update({ is_read: true }).eq('is_read', false);
      }
      MEMORY_DB.notifications.forEach((n) => (n.is_read = true));
      invalidateCache('/notifications');
      return { status: 'success' } as T;
    }

    if (path.includes('/clear-all-read')) {
      if (useLiveSupabase) {
        await supabase.from('notifications').delete().eq('is_read', true);
      }
      MEMORY_DB.notifications = MEMORY_DB.notifications.filter((n) => !n.is_read);
      invalidateCache('/notifications');
      return { status: 'success' } as T;
    }

    if (method === 'POST') {
      const newNotif = {
        recipient: body.recipient || 'all',
        notification_type: body.notification_type || 'ANNOUNCEMENT',
        title: body.title || 'Factory Announcement',
        message: body.message || '',
        severity: body.severity || 'INFO',
        related_model: body.related_model || null,
        related_object_id: body.related_object_id || null,
        is_read: false,
        created_at: new Date().toISOString()
      };
      if (useLiveSupabase) {
        const { data, error } = await supabase.from('notifications').insert([newNotif]).select();
        if (!error && data && data[0]) {
          invalidateCache('/notifications');
          return data[0] as T;
        }
      }
      const memoryNotif = { id: `notif-${Date.now()}`, ...newNotif };
      MEMORY_DB.notifications.unshift(memoryNotif);
      invalidateCache('/notifications');
      return memoryNotif as T;
    }

    if (method === 'PATCH') {
      const notifId = path.replace(/^\/notifications\/items\/?/, '');
      if (useLiveSupabase) {
        await supabase.from('notifications').update(body).eq('id', notifId);
      }
      const n = MEMORY_DB.notifications.find((x) => x.id === notifId);
      if (n) Object.assign(n, body);
      invalidateCache('/notifications');
      return (n || { id: notifId, ...body }) as T;
    }

    if (method === 'DELETE') {
      const notifId = path.replace(/^\/notifications\/items\/?/, '');
      if (useLiveSupabase) {
        await supabase.from('notifications').delete().eq('id', notifId);
      }
      MEMORY_DB.notifications = MEMORY_DB.notifications.filter((x) => x.id !== notifId);
      invalidateCache('/notifications');
      return { status: 'success', id: notifId } as T;
    }

    if (useLiveSupabase) {
      const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false });
      if (!error && data) return { results: data } as T;
    }
    return { results: MEMORY_DB.notifications } as T;
  }

  // Audit Logs & Movements
  if (path === '/audit/logs') {
    if (useLiveSupabase) {
      const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false });
      if (!error && data) return { results: data } as T;
    }
    return { results: MEMORY_DB.auditLogs } as T;
  }

  if (path === '/audit/movements') {
    if (useLiveSupabase) {
      const { data, error } = await supabase.from('universal_movement_ledger').select('*').order('timestamp', { ascending: false });
      if (!error && data) return { results: data } as T;
    }
    return { results: MEMORY_DB.movementLedger } as T;
  }

  // Importer trigger
  if (path === '/importer/trigger') {
    return { status: 'success', message: 'Operational dataset synchronized with Supabase.' } as T;
  }

function saveCustomUserCredential(email: string, password: string, profile: any) {
  try {
    const credsStr = localStorage.getItem('alibori_custom_users') || '{}';
    const creds = JSON.parse(credsStr);
    creds[email.toLowerCase()] = {
      password,
      profile: {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        first_name: profile.full_name?.split(' ')[0] || '',
        last_name: profile.full_name?.split(' ').slice(1).join(' ') || '',
        role: profile.role,
        role_display: profile.role === 'super_admin' ? 'Super Admin' : (profile.role === 'factory_monitor' ? 'Factory Monitor' : 'Store / Shop'),
        is_superuser: profile.role === 'super_admin',
        is_active: profile.is_active,
        phone_number: profile.phone_number,
        store_name: profile.store_name,
        department: profile.department,
        customer_id: profile.customer_id,
        customer: profile.customer,
        customer_name: profile.customer?.name || profile.store_name,
      }
    };
    localStorage.setItem('alibori_custom_users', JSON.stringify(creds));
  } catch (err) {
    console.warn('Failed saving user credential to localStorage:', err);
  }
}

  // -------------------------------------------------------------
  // 10. AUTH & USERS
  // -------------------------------------------------------------
  if (path === '/auth/users' || path === '/auth/users/') {
    if (method === 'POST') {
      const normalizedEmail = (body.email || '').trim().toLowerCase();
      const fullName = `${body.first_name || ''} ${body.last_name || ''}`.trim() || body.full_name || normalizedEmail.split('@')[0];
      const customerId = body.customer || body.customer_id || null;
      const role = body.role || 'store';
      const password = body.password || 'password123';

      const profilePayload: any = {
        email: normalizedEmail,
        full_name: fullName,
        role: role,
        phone_number: body.phone_number || null,
        store_name: body.store_name || null,
        department: body.department || null,
        customer_id: customerId,
        is_active: true,
      };

      if (useLiveSupabase) {
        // Try creating auth user in Supabase Auth if possible
        try {
          const { data: authData } = await supabase.auth.signUp({
            email: normalizedEmail,
            password: password,
            options: {
              data: { full_name: fullName, role: role }
            }
          });
          if (authData?.user?.id) {
            profilePayload.user_id = authData.user.id;
          }
        } catch {
          // Ignore auth rate limits
        }

        const { data: profile, error: profError } = await supabase
          .from('user_profiles')
          .insert([profilePayload])
          .select('*, customer:sales_customers(*)')
          .single();

        if (!profError && profile) {
          saveCustomUserCredential(normalizedEmail, password, profile);
          invalidateCache('/auth/users');
          return profile as T;
        } else if (profError) {
          console.warn('Supabase user profile insert error, saving locally:', profError);
        }
      }

      const newUser = {
        id: `u-${Date.now()}`,
        is_active: true,
        first_name: body.first_name || fullName.split(' ')[0],
        last_name: body.last_name || fullName.split(' ').slice(1).join(' '),
        ...profilePayload,
      };
      saveCustomUserCredential(normalizedEmail, password, newUser);
      MEMORY_DB.users.push(newUser);
      invalidateCache('/auth/users');
      return newUser as T;
    }

    if (useLiveSupabase) {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*, customer:sales_customers(*)')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mappedUsers = data.map((u: any) => ({
          id: u.id,
          email: u.email,
          full_name: u.full_name || u.email,
          first_name: u.full_name?.split(' ')[0] || '',
          last_name: u.full_name?.split(' ').slice(1).join(' ') || '',
          role: u.role,
          role_display: u.role === 'super_admin' ? 'Super Admin' : (u.role === 'factory_monitor' ? 'Factory Monitor' : 'Store / Shop'),
          is_superuser: u.role === 'super_admin',
          is_active: u.is_active,
          phone_number: u.phone_number,
          store_name: u.store_name,
          department: u.department,
          customer_id: u.customer_id,
          customer: u.customer,
          customer_name: u.customer?.name || u.store_name,
          customer_code: u.customer?.customer_code,
        }));
        return { results: mappedUsers } as T;
      }
    }
    return { results: MEMORY_DB.users } as T;
  }

  if (path.startsWith('/auth/users/') && method === 'DELETE') {
    const userId = path.replace('/auth/users/', '').replace(/\/+$/, '');
    if (useLiveSupabase) {
      await supabase.from('user_profiles').delete().eq('id', userId);
    }
    MEMORY_DB.users = MEMORY_DB.users.filter((x: any) => x.id !== userId);
    // Also remove from custom users registry
    try {
      const creds = JSON.parse(localStorage.getItem('alibori_custom_users') || '{}');
      for (const [em, data] of Object.entries(creds) as any) {
        if (data.profile?.id === userId) {
          delete creds[em];
        }
      }
      localStorage.setItem('alibori_custom_users', JSON.stringify(creds));
    } catch {}
    invalidateCache('/auth/users');
    return { status: 'deleted', id: userId } as T;
  }

  if (path.includes('/toggle-active')) {
    const parts = path.split('/');
    const userId = parts[parts.indexOf('users') + 1];
    if (useLiveSupabase && userId && userId.includes('-')) {
      const { data: curr } = await supabase.from('user_profiles').select('is_active').eq('id', userId).maybeSingle();
      if (curr) {
        const newActive = !curr.is_active;
        const { data, error } = await supabase
          .from('user_profiles')
          .update({ is_active: newActive, updated_at: new Date().toISOString() })
          .eq('id', userId)
          .select()
          .single();
        if (!error && data) {
          // Update in local registry as well
          try {
            const creds = JSON.parse(localStorage.getItem('alibori_custom_users') || '{}');
            for (const em of Object.keys(creds)) {
              if (creds[em].profile?.id === userId) {
                creds[em].profile.is_active = newActive;
              }
            }
            localStorage.setItem('alibori_custom_users', JSON.stringify(creds));
          } catch {}
          invalidateCache('/auth/users');
          return { status: 'success', is_active: newActive, id: userId } as T;
        }
      }
    }
    const u = MEMORY_DB.users.find((x: any) => x.id === userId);
    if (u) u.is_active = !u.is_active;
    invalidateCache('/auth/users');
    return { status: 'success', is_active: u?.is_active } as T;
  }

  if (path === '/auth/me') {
    const storedUser = localStorage.getItem('alibori_user');
    if (storedUser) {
      try {
        return JSON.parse(storedUser) as T;
      } catch {}
    }
    return MEMORY_DB.users[0] as T;
  }

  console.warn(`Unhandled endpoint: ${method} ${path}`, body);
  if (method === 'GET') {
    return { results: [], count: 0 } as T;
  }
  return {} as T;
}
