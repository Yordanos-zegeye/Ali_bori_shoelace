import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hektcxmeowqpvblwkrqv.supabase.co';
const supabaseKey = 'sb_publishable_xZxvvqd3up-19C973fOTCg_9ar8G9KU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function syncBatches() {
  const { data: existingBatches } = await supabase.from('production_batches').select('*');
  console.log('Current batches:', existingBatches?.length);

  // If only 0 or 1 test batch exists, let's sync the real historical batches that match the 9 bags
  if (!existingBatches || existingBatches.length <= 1) {
    // Delete any incomplete test batch
    if (existingBatches && existingBatches.length > 0) {
      await supabase.from('production_batches').delete().eq('id', existingBatches[0].id);
    }

    const realBatches = [
      {
        batch_number: 'BATCH-2026-00001',
        product_variant_id: 2,
        yarn_batch_count: 1,
        raw_yarn_input_kg: 32.0,
        braided_output_kg: 31.0,
        phase1_waste_kg: 1.0,
        tipping_input_kg: 31.0,
        finished_output_kg: 29.95,
        phase2_waste_kg: 1.05,
        total_waste_kg: 2.05,
        yield_percentage: 93.59,
        waste_percentage: 6.41,
        status: 'COMPLETED',
        start_date: '2026-09-09',
        completion_date: '2026-09-09',
        supervisor: 'Ato Selehadin Ali',
        stock_request_number: 'REQ-2026-00001',
        notes: 'White 37\\110 cord run - dispatched to Habesha Laces'
      },
      {
        batch_number: 'BATCH-2026-00002',
        product_variant_id: 1,
        yarn_batch_count: 3,
        raw_yarn_input_kg: 96.0,
        braided_output_kg: 93.0,
        phase1_waste_kg: 3.0,
        tipping_input_kg: 93.0,
        finished_output_kg: 91.0,
        phase2_waste_kg: 2.0,
        total_waste_kg: 5.0,
        yield_percentage: 94.79,
        waste_percentage: 5.21,
        status: 'COMPLETED',
        start_date: '2026-09-16',
        completion_date: '2026-09-16',
        supervisor: 'Ato Selehadin Ali',
        stock_request_number: 'REQ-2026-00002',
        notes: 'Black 37\\110 cord run - 3 bags produced and dispatched'
      },
      {
        batch_number: 'BATCH-2026-00003',
        product_variant_id: 1,
        yarn_batch_count: 2,
        raw_yarn_input_kg: 72.0,
        braided_output_kg: 69.5,
        phase1_waste_kg: 2.5,
        tipping_input_kg: 69.5,
        finished_output_kg: 67.5,
        phase2_waste_kg: 2.0,
        total_waste_kg: 4.5,
        yield_percentage: 93.75,
        waste_percentage: 6.25,
        status: 'COMPLETED',
        start_date: '2026-09-21',
        completion_date: '2026-09-21',
        supervisor: 'Ishaq Alemayew',
        stock_request_number: 'REQ-2026-00003',
        notes: 'Black 37\\110 cord run - bags ABSL-2026-000101 and 000102 in store'
      },
      {
        batch_number: 'BATCH-2026-00004',
        product_variant_id: 2,
        yarn_batch_count: 2,
        raw_yarn_input_kg: 64.0,
        braided_output_kg: 61.0,
        phase1_waste_kg: 3.0,
        tipping_input_kg: 61.0,
        finished_output_kg: 58.5,
        phase2_waste_kg: 2.5,
        total_waste_kg: 5.5,
        yield_percentage: 91.41,
        waste_percentage: 8.59,
        status: 'COMPLETED',
        start_date: '2026-09-22',
        completion_date: '2026-09-22',
        supervisor: 'Ishaq Alemayew',
        stock_request_number: 'REQ-2026-00004',
        notes: 'White 37\\110 cord run - bags ABSL-2026-000103 and 000104 in store'
      },
      {
        batch_number: 'BATCH-2026-00005',
        product_variant_id: 4,
        yarn_batch_count: 1,
        raw_yarn_input_kg: 40.0,
        braided_output_kg: 39.0,
        phase1_waste_kg: 1.0,
        tipping_input_kg: 39.0,
        finished_output_kg: 38.0,
        phase2_waste_kg: 1.0,
        total_waste_kg: 2.0,
        yield_percentage: 95.0,
        waste_percentage: 5.0,
        status: 'COMPLETED',
        start_date: '2026-09-23',
        completion_date: '2026-09-23',
        supervisor: 'Feysel Nuri',
        stock_request_number: 'REQ-2026-00005',
        notes: 'Natural 37\\k cord run - bag ABSL-2026-000105 in store'
      }
    ];

    const { data: inserted, error: insErr } = await supabase.from('production_batches').insert(realBatches).select();
    console.log('Inserted real batches:', inserted?.length, 'error:', insErr);
  }
}

syncBatches().catch(console.error);
