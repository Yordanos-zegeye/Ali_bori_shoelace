import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hektcxmeowqpvblwkrqv.supabase.co';
const supabaseKey = 'sb_publishable_xZxvvqd3up-19C973fOTCg_9ar8G9KU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testDashboardAggregation() {
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

  // If today has batches, calculate today's numbers. If today has 0, calculate recent batches totals
  const targetBatches = todayBatches.length > 0 ? todayBatches : batches;

  const totalInputKg = targetBatches.reduce((acc, b) => acc + (parseFloat(b.raw_yarn_input_kg) || 0), 0);
  const totalBraidedKg = targetBatches.reduce((acc, b) => acc + (parseFloat(b.braided_output_kg) || 0), 0);
  const totalFinishedKg = targetBatches.reduce((acc, b) => acc + (parseFloat(b.finished_output_kg) || 0), 0);
  const totalWasteKg = targetBatches.reduce((acc, b) => acc + (parseFloat(b.total_waste_kg) || 0), 0);

  const yieldPct = totalInputKg > 0 ? (totalFinishedKg / totalInputKg) * 100 : 0;
  const wastePct = totalInputKg > 0 ? (totalWasteKg / totalInputKg) * 100 : 0;

  // Raw yarn in warehouse
  let totalRawKg = 0;
  let lowStockCount = 0;
  rawMaterials.forEach((rm) => {
    const avail = (rm.stock_records || []).reduce((s, r) => s + (parseFloat(r.available_kg || r.quantity_kg) || 0), 0);
    totalRawKg += avail;
    if (avail <= (parseFloat(rm.minimum_stock_kg) || 0)) {
      lowStockCount++;
    }
  });

  // Finished Goods in Store
  const inStoreBags = bags.filter((b) => b.status === 'IN_STORE');
  const availableBagsCount = inStoreBags.length;
  const availableBagsKg = inStoreBags.reduce((acc, b) => acc + (parseFloat(b.weight_kg) || 0), 0);

  // Machines
  const normalMachines = machines.filter((m) => (m.health || m.status) === 'NORMAL' || (m.health || m.status) === 'OPERATIONAL').length;
  const serviceMachines = machines.filter((m) => (m.health || m.status) === 'NEEDS_SERVICE' || (m.health || m.status) === 'MAINTENANCE').length;
  const criticalMachines = machines.filter((m) => (m.health || m.status) === 'CRITICAL' || (m.health || m.status) === 'OFFLINE').length;

  // Sales & Credit
  const totalReceivables = customers.reduce((acc, c) => acc + (parseFloat(c.current_balance_etb) || 0), 0);
  const overdueEtb = receivables.filter((r) => r.status === 'OVERDUE').reduce((acc, r) => acc + (parseFloat(r.remaining_amount) || 0), 0);

  // Workforce
  const todayAttendance = attendance.filter((a) => a.date === todayStr);
  const presentCount = todayAttendance.filter((a) => a.status === 'PRESENT').length || employees.filter((e) => e.employment_status === 'ACTIVE').length;
  const absentCount = todayAttendance.filter((a) => a.status === 'ABSENT').length;
  const overtimeHours = todayAttendance.reduce((acc, a) => acc + (parseFloat(a.overtime_hours) || 0), 0);

  // Alerts
  const pendingRequests = stockRequests.filter((r) => r.status === 'PENDING').length;
  const lowSparesCount = spares.filter((s) => s.is_low_stock || (s.minimum_quantity && s.quantity <= s.minimum_quantity)).length;
  const criticalAlertsCount = criticalMachines + (lowStockCount > 0 ? 1 : 0) + (overdueEtb > 0 ? 1 : 0);

  // Real Batches History for the chart
  const batchesHistory = batches.slice(0, 7).map((b) => ({
    batch_number: b.batch_number,
    input_kg: parseFloat(b.raw_yarn_input_kg) || 0,
    braided_kg: parseFloat(b.braided_output_kg) || 0,
    finished_kg: parseFloat(b.finished_output_kg) || 0,
    waste_kg: parseFloat(b.total_waste_kg) || 0,
    yield_percentage: parseFloat(b.yield_percentage) || 0
  }));

  const metrics = {
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
      is_showing_recent: todayBatches.length === 0
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
  };

  console.log('Aggregated Dashboard Metrics:', JSON.stringify(metrics, null, 2));
}

testDashboardAggregation().catch(console.error);
