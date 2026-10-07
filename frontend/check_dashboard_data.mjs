import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hektcxmeowqpvblwkrqv.supabase.co';
const supabaseKey = 'sb_publishable_xZxvvqd3up-19C973fOTCg_9ar8G9KU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const [
    batches,
    bags,
    rawMaterials,
    machines,
    orders,
    customers,
    receivables,
    stockRequests,
    employees,
    attendance
  ] = await Promise.all([
    supabase.from('production_batches').select('*'),
    supabase.from('store_finished_product_bags').select('*'),
    supabase.from('inventory_raw_materials').select('*, stock_records:inventory_raw_material_stocks(*)'),
    supabase.from('assets_machines').select('id, machine_code, name, health, status'),
    supabase.from('sales_dispatch_orders').select('*'),
    supabase.from('sales_customers').select('*'),
    supabase.from('sales_receivables').select('*'),
    supabase.from('inventory_stock_requests').select('*'),
    supabase.from('workforce_employees').select('*'),
    supabase.from('workforce_attendance').select('*')
  ]);

  console.log('--- SUPABASE LIVE DATA ---');
  console.log('production_batches:', batches.data?.length, batches.error?.message || 'OK');
  console.log('store_finished_product_bags:', bags.data?.length, bags.error?.message || 'OK');
  console.log('inventory_raw_materials:', rawMaterials.data?.length, rawMaterials.error?.message || 'OK');
  console.log('assets_machines:', machines.data?.length, machines.error?.message || 'OK');
  console.log('sales_dispatch_orders:', orders.data?.length, orders.error?.message || 'OK');
  console.log('sales_customers:', customers.data?.length, customers.error?.message || 'OK');
  console.log('sales_receivables:', receivables.data?.length, receivables.error?.message || 'OK');
  console.log('inventory_stock_requests:', stockRequests.data?.length, stockRequests.error?.message || 'OK');
  console.log('workforce_employees:', employees.data?.length, employees.error?.message || 'OK');
  console.log('workforce_attendance:', attendance.data?.length, attendance.error?.message || 'OK');

  if (bags.data?.length) {
    const totalBagsKg = bags.data
      .filter(b => b.status === 'IN_STORE')
      .reduce((sum, b) => sum + (parseFloat(b.weight_kg) || 0), 0);
    console.log('Bags in store count:', bags.data.filter(b => b.status === 'IN_STORE').length, 'Total kg:', totalBagsKg);
  }

  if (rawMaterials.data?.length) {
    let totalKg = 0;
    let lowStock = 0;
    for (const rm of rawMaterials.data) {
      const avail = (rm.stock_records || []).reduce((s, r) => s + (parseFloat(r.available_kg || r.quantity_kg) || 0), 0);
      totalKg += avail;
      if (avail <= (parseFloat(rm.minimum_stock_kg) || 0)) {
        lowStock++;
      }
    }
    console.log('Raw yarn total available KG:', totalKg, 'Low stock count:', lowStock);
  }

  if (machines.data?.length) {
    const normal = machines.data.filter(m => (m.health || m.status) === 'NORMAL' || (m.health || m.status) === 'OPERATIONAL').length;
    const service = machines.data.filter(m => (m.health || m.status) === 'NEEDS_SERVICE' || (m.health || m.status) === 'MAINTENANCE').length;
    const critical = machines.data.filter(m => (m.health || m.status) === 'CRITICAL' || (m.health || m.status) === 'OFFLINE').length;
    console.log('Machines health -> Normal:', normal, 'Service:', service, 'Critical:', critical);
  }

  if (customers.data?.length) {
    console.log('Customers total balance:', customers.data.reduce((s, c) => s + (parseFloat(c.current_balance_etb) || 0), 0));
  }
}

check().catch(console.error);
