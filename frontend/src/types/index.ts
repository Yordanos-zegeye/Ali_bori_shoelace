export interface Color {
  id: number;
  name: string;
  code?: string;
  hex_code?: string;
}

export interface Thickness {
  id: number;
  name: string;
  value_mm?: string;
}

export interface ProductStock {
  id: number;
  daily_product: string;
  in_qty: string;
  out_qty: string;
  st_v: string;
  total: string;
  calculated_stock: string;
  remark?: string;
}

export interface ProductVariant {
  id: number;
  serial_code: string;
  color?: number;
  color_details?: Color;
  thickness?: number;
  thickness_details?: Thickness;
  specification?: string;
  unit_price: string;
  stock?: ProductStock;
  display_name?: string;
}

export interface Product {
  id: number;
  code: string;
  name: string;
  category: string;
  unit: string;
  remark?: string;
  variants: ProductVariant[];
}

export interface Machine {
  id: string;
  machine_code: string;
  name: string;
  machine_type?: number;
  machine_type_name?: string;
  building: string;
  room?: string;
  product_type?: string;
  place?: string;
  health: 'NORMAL' | 'NEEDS_SERVICE' | 'CRITICAL';
  most_frequent_issue?: string;
  service_time?: string;
  last_service_date?: string;
  next_service_date?: string;
  performance_score: string;
  performance_percent: number;
  total: number;
  status: 'ACTIVE' | 'MAINTENANCE' | 'OFFLINE';
  remark?: string;
}

export interface MachineType {
  id: number;
  name: string;
  description?: string;
  maintenance_interval_days: number;
  machine_count: number;
}

export interface SparePart {
  id: number;
  part_code: string;
  name: string;
  compatible_machine_types: number[];
  compatible_machine_type_names: string[];
  place?: string;
  room?: string;
  shelf?: string;
  quantity: string;
  minimum_stock: string;
  unit_cost: string;
  remark?: string;
  is_low_stock: boolean;
}

export interface RawMaterialVariant {
  id: number;
  material_type: number;
  material_type_name: string;
  color_name: string;
  code: string;
  minimum_stock_kg: string;
  unit_cost: string;
  total_available_kg: number;
  is_low_stock: boolean;
}

export interface StockRequestItem {
  id: number;
  item_type: 'RAW_MATERIAL' | 'SPARE_PART' | 'OTHER';
  raw_material_variant?: number;
  raw_material_name?: string;
  spare_part?: number;
  spare_part_name?: string;
  item_description?: string;
  requested_quantity: string;
  approved_quantity: string;
  issued_quantity: string;
  unit: string;
  status: string;
}

export interface StockRequest {
  id: string;
  request_number: string;
  requester_name: string;
  department: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PARTIALLY_ISSUED' | 'ISSUED' | 'CANCELLED';
  approved_by?: string;
  approved_at?: string;
  issued_by?: string;
  issued_at?: string;
  notes?: string;
  created_at: string;
  items: StockRequestItem[];
}

export interface ProductionBatch {
  id: string;
  batch_number: string;
  product_variant: number;
  product_name: string;
  status: 'PLANNED' | 'IN_PROGRESS' | 'PHASE_1_COMPLETE' | 'TRANSFERRED' | 'PHASE_2_IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  start_date: string;
  completion_date?: string;
  supervisor?: string;
  stock_request_number?: string;
  raw_material_yarn?: number | null;
  raw_material_yarn_name?: string;
  yarn_batch_count?: number;
  raw_yarn_input_kg: string;
  acetone_used?: string;
  film_roll_variant?: number | null;
  film_roll_name?: string;
  film_roll_used?: string;
  braided_output_kg: string;
  phase1_waste_kg: string;
  tipping_input_kg: string;
  finished_output_kg: string;
  phase2_waste_kg: string;
  total_waste_kg: string;
  yield_percentage: string;
  waste_percentage: string;
  notes?: string;
  bag_count: number;
  total_packed_kg?: string;
  remaining_unpacked_kg?: string;
  bags_list?: Array<{
    id: string;
    bag_id: string;
    weight_kg: string;
    store_location: string;
    status: string;
    entry_date: string;
  }>;
  materials_used?: Array<{
    id: string;
    raw_material_variant: number;
    material_name?: string;
    quantity: string;
    unit: string;
    phase: string;
    notes?: string;
  }>;
}

export interface FinishedProductBag {
  id: string;
  bag_id: string;
  batch?: string;
  batch_number?: string;
  product_variant: number;
  product_name: string;
  weight_kg: string;
  store_location: string;
  status: 'IN_STORE' | 'RESERVED' | 'DISPATCHED' | 'RETURNED' | 'DAMAGED';
  entry_date: string;
  dispatched_date?: string;
}

export interface Customer {
  id: string;
  customer_code: string;
  name: string;
  customer_type: string;
  phone?: string;
  address?: string;
  contact_person?: string;
  credit_limit: string;
  current_outstanding: string;
  available_credit: string;
  credit_utilization_percent: number;
  active: boolean;
}

export interface DispatchOrderItem {
  id: number;
  bag: string;
  bag_id: string;
  weight_kg: string;
  price_per_kg: string;
  subtotal: string;
}

export interface DispatchOrder {
  id: string;
  order_number: string;
  customer: string;
  customer_name: string;
  payment_mode: 'CASH' | 'CREDIT';
  total_kg: string;
  total_amount: string;
  amount_paid: string;
  outstanding_amount: string;
  due_date?: string;
  status: 'PENDING' | 'COMPLETED' | 'PARTIAL' | 'SETTLED' | 'OVERDUE';
  created_at: string;
  items: DispatchOrderItem[];
}

export interface Receivable {
  id: string;
  customer: string;
  customer_name: string;
  order_number: string;
  original_amount: string;
  amount_paid: string;
  remaining_amount: string;
  due_date?: string;
  status: 'PENDING' | 'PARTIAL' | 'SETTLED' | 'OVERDUE';
}

export interface Employee {
  id: string;
  employee_id: string;
  name: string;
  age?: number;
  gender: string;
  work_hours_per_day: number;
  work_room?: string;
  base_salary: string;
  performance_score: string;
  employment_status: string;
  remark?: string;
}

export interface AttendanceRecord {
  id: string;
  employee: string;
  employee_name: string;
  employee_code: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'LEAVE';
  check_in?: string;
  check_out?: string;
  overtime_hours: string;
  is_saturday: boolean;
  notes?: string;
}

export interface PayrollConfiguration {
  id: number;
  name: string;
  salary_period: string;
  working_days_per_period: number;
  absence_deduction_method: 'DAILY_RATE' | 'PERCENTAGE_OF_SALARY' | 'FIXED_AMOUNT';
  absence_deduction_rate: string;
  overtime_hourly_multiplier: string;
  saturday_rate: string;
  is_active: boolean;
}

export interface PayrollSlip {
  id: string;
  employee_name: string;
  employee_code: string;
  work_room?: string;
  base_salary: string;
  working_days: number;
  present_days: number;
  absent_days: number;
  late_days: number;
  leave_days: number;
  overtime_hours: string;
  overtime_pay: string;
  saturday_pay: string;
  additional_allowances: string;
  absence_deduction: string;
  other_deductions: string;
  net_salary: string;
  calculation_details?: any;
  status: string;
}

export interface PayrollPeriod {
  id: string;
  period_code: string;
  start_date: string;
  end_date: string;
  working_days: number;
  status: 'DRAFT' | 'CALCULATED' | 'APPROVED' | 'PAID';
  total_gross_salary: string;
  total_deductions: string;
  total_net_salary: string;
  slips?: PayrollSlip[];
  employee_count?: number;
}

export interface Notification {
  id: string;
  recipient: string;
  notification_type: string;
  title: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  related_model?: string;
  related_object_id?: string;
  is_read: boolean;
  created_at: string;
}

export interface DashboardMetrics {
  raw_materials: {
    total_kg: number;
    low_stock_count: number;
  };
  production: {
    today_input_kg: number;
    today_output_kg: number;
    today_waste_kg: number;
    waste_percentage: number;
    yield_percentage: number;
  };
  wip: {
    building_1_kg: number;
    building_2_kg: number;
  };
  finished_goods: {
    available_bags: number;
    available_kg: number;
  };
  sales: {
    today_dispatches: number;
    today_sales_etb: number;
    total_sales_etb: number;
  };
  credit: {
    total_receivables_etb: number;
    overdue_etb: number;
    credit_utilization_percent: number;
  };
  machines: {
    total: number;
    normal: number;
    needs_service: number;
    critical: number;
  };
  workforce: {
    total_employees: number;
    present_today: number;
    absent_today: number;
    overtime_hours: number;
  };
  alerts: {
    critical_count: number;
    pending_stock_requests: number;
    low_spares_count: number;
  };
}
