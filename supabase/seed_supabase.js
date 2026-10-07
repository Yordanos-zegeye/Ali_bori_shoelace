const path = require('path');
const fs = require('fs');
const supabaseModulePath = path.resolve(__dirname, '../frontend/node_modules/@supabase/supabase-js');
const { createClient } = require(supabaseModulePath);

const url = process.argv[2] || process.env.SUPABASE_URL || 'https://hektcxmeowqpvblwkrqv.supabase.co';
const key = process.argv[3] || process.env.SUPABASE_KEY || 'sb_publishable_xZxvvqd3up-19C973fOTCg_9ar8G9KU';

console.log(`Connecting to Supabase at ${url}...`);
const supabase = createClient(url, key);

async function seed() {
  console.log('--- Seeding Complete Operational Dataset into Supabase ---');

  // Load JSON exports if present
  const factoryPath = path.resolve(__dirname, '../scratch/factory_full_export.json');
  const workforcePath = path.resolve(__dirname, '../scratch/workforce_full_export.json');

  let factoryData = null;
  let workforceData = null;

  if (fs.existsSync(factoryPath)) {
    factoryData = JSON.parse(fs.readFileSync(factoryPath, 'utf8'));
  }
  if (fs.existsSync(workforcePath)) {
    workforceData = JSON.parse(fs.readFileSync(workforcePath, 'utf8'));
  }

  // 1. Colors
  console.log('Seeding Colors...');
  const colors = factoryData?.colors || [
    { id: 1, name: 'Black', code: 'B', hex_code: '#1A1A1A' },
    { id: 2, name: 'White', code: 'W', hex_code: '#F5F5F5' },
    { id: 3, name: 'Natural/Default', code: '-', hex_code: '#D8C39E' },
    { id: 4, name: 'Brown', code: 'BR', hex_code: '#8B461E' },
    { id: 5, name: 'Red', code: 'RD', hex_code: '#A33327' },
    { id: 6, name: 'Gray', code: 'GY', hex_code: '#606A6D' },
    { id: 7, name: 'Golden Amber', code: 'AMB', hex_code: '#C87A38' },
  ];
  for (const c of colors) {
    const { error } = await supabase.from('catalog_colors').upsert(c, { onConflict: 'id' });
    if (error) console.warn('Color notice:', error.message);
  }

  // 2. Thicknesses
  console.log('Seeding Thicknesses...');
  const thicknesses = factoryData?.thicknesses || [
    { id: 1, name: '10MM', value_mm: 10.0 },
    { id: 2, name: '15MM', value_mm: 15.0 },
    { id: 3, name: '3MM', value_mm: 3.0 },
    { id: 4, name: '6MM', value_mm: 6.0 },
    { id: 5, name: '4MM', value_mm: 4.0 },
  ];
  for (const t of thicknesses) {
    const { error } = await supabase.from('catalog_thicknesses').upsert(t, { onConflict: 'id' });
    if (error) console.warn('Thickness notice:', error.message);
  }

  // 3. Products
  console.log('Seeding Products...');
  await supabase.from('catalog_products').upsert({
    id: 1,
    code: 'SHOE-LACE',
    name: 'Standard Braided & Tipped Shoe Lace',
    category: 'SHOE_LACE',
    unit: 'KG',
    remark: 'Standard factory production',
  }, { onConflict: 'id' });

  // 4. Product Variants & Stocks
  if (factoryData?.product_variants) {
    console.log(`Seeding ${factoryData.product_variants.length} Product Variants & Stocks...`);
    const codeSuffixes = {
      1: '37\\110-B', 2: '37\\110-W', 3: '37\\k-B', 4: '37\\k-W',
      5: '40 cm-NAT', 6: '60 cm-B', 7: '60 cm-NAT', 8: '80 cm-NAT',
      9: '19\\90-B', 10: '19\\90-W', 11: '19\\70-B', 12: '19\\70-W',
      13: '19\\110-B', 14: '19\\110-W', 15: '3\\60-B', 16: '3\\60-W',
      17: '3\\60-BR', 18: '27\\90', 19: '27\\70', 20: '27\\110'
    };
    for (const v of factoryData.product_variants) {
      await supabase.from('catalog_product_variants').upsert({
        id: v.id,
        product_id: v.product_id,
        serial_code: codeSuffixes[v.id] || v.serial_code,
        color_id: v.color_id,
        thickness_id: v.thickness_id,
        specification: v.specification || '',
        unit_price: v.unit_price || 150.00
      }, { onConflict: 'id' });
    }
    for (const s of (factoryData.product_stocks || [])) {
      await supabase.from('catalog_product_stocks').upsert(s, { onConflict: 'variant_id' });
    }
  }

  // 5. Machine Types
  if (factoryData?.machine_types) {
    console.log(`Seeding ${factoryData.machine_types.length} Machine Types...`);
    for (const mt of factoryData.machine_types) {
      await supabase.from('assets_machine_types').upsert(mt, { onConflict: 'id' });
    }
  }

  // 6. Machines (365 Machines)
  if (factoryData?.machines) {
    console.log(`Seeding ${factoryData.machines.length} Machines in batches...`);
    const batchSize = 50;
    for (let i = 0; i < factoryData.machines.length; i += batchSize) {
      const chunk = factoryData.machines.slice(i, i + batchSize);
      await supabase.from('assets_machines').upsert(chunk, { onConflict: 'machine_code' });
    }
  }

  // 7. Spare Parts & Compatibilities
  if (factoryData?.spare_parts) {
    console.log(`Seeding ${factoryData.spare_parts.length} Spare Parts...`);
    for (const sp of factoryData.spare_parts) {
      await supabase.from('assets_spare_parts').upsert(sp, { onConflict: 'id' });
    }
  }

  // 8. Storage Locations
  if (factoryData?.storage_locations) {
    console.log(`Seeding ${factoryData.storage_locations.length} Storage Locations...`);
    for (const loc of factoryData.storage_locations) {
      await supabase.from('inventory_storage_locations').upsert(loc, { onConflict: 'id' });
    }
  }

  // 9. Raw Material Types & Materials
  if (factoryData?.raw_material_types) {
    console.log(`Seeding ${factoryData.raw_material_types.length} Raw Material Types...`);
    for (const rmt of factoryData.raw_material_types) {
      await supabase.from('inventory_raw_material_types').upsert(rmt, { onConflict: 'id' });
    }
  }
  if (factoryData?.raw_materials) {
    console.log(`Seeding ${factoryData.raw_materials.length} Raw Materials...`);
    for (const rm of factoryData.raw_materials) {
      await supabase.from('inventory_raw_materials').upsert(rm, { onConflict: 'id' });
    }
  }
  if (factoryData?.raw_material_stocks) {
    console.log(`Seeding ${factoryData.raw_material_stocks.length} Raw Material Stocks...`);
    for (const rms of factoryData.raw_material_stocks) {
      await supabase.from('inventory_raw_material_stocks').upsert(rms, { onConflict: 'variant_id,storage_location_id' });
    }
  }

  // 10. Customers
  console.log('Seeding Customers...');
  await supabase.from('sales_customers').upsert({
    id: 'c1000000-0000-0000-0000-000000000001',
    customer_code: 'CUST-0001',
    name: 'Merkato Wholesale Distributors',
    customer_type: 'WHOLESALE',
    phone: '+251 911 234567',
    address: 'Merkato Military Tera, Addis Ababa',
    contact_person: 'Ato Solomon Bekele',
    credit_limit: 100000.0,
    current_outstanding: 45000.0,
    active: true,
  }, { onConflict: 'id' });

  // 11. Finished Product Bags
  if (factoryData?.finished_product_bags) {
    console.log(`Seeding ${factoryData.finished_product_bags.length} Finished Product Bags...`);
    for (const b of factoryData.finished_product_bags) {
      await supabase.from('store_finished_product_bags').upsert(b, { onConflict: 'id' });
    }
  }

  // 12. Payroll Policy
  console.log('Seeding Payroll Policy...');
  await supabase.from('workforce_payroll_configs').upsert({
    name: 'Ali Bori Factory Operational Policy 2026',
    salary_period: 'MONTHLY',
    working_days_per_period: 26,
    absence_deduction_method: 'DAILY_RATE',
    absence_deduction_rate: 1.0,
    overtime_hourly_multiplier: 1.5,
    saturday_rate: 500.0,
    is_active: true,
  }, { onConflict: 'name' });

  // 13. Workforce Employees
  if (workforceData?.employees) {
    console.log(`Seeding ${workforceData.employees.length} Workforce Employees...`);
    for (const emp of workforceData.employees) {
      await supabase.from('workforce_employees').upsert(emp, { onConflict: 'employee_id' });
    }
  }

  console.log('--- All operational datasets successfully seeded! ---');
}

seed().catch((err) => {
  console.error('Seeding encountered an error:', err);
  process.exit(1);
});
