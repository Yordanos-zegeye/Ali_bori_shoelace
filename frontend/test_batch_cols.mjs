import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hektcxmeowqpvblwkrqv.supabase.co';
const supabaseKey = 'sb_publishable_xZxvvqd3up-19C973fOTCg_9ar8G9KU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBatchCols() {
  const { data, error } = await supabase.from('production_batches').insert([{
    batch_number: 'BATCH-TEST-CHECK',
    product_variant_id: 1,
    status: 'COMPLETED',
    raw_yarn_input_kg: 100,
    braided_output_kg: 96.5,
    finished_output_kg: 94.0,
    total_waste_kg: 6.0,
    yield_percentage: 94.0,
    waste_percentage: 6.0
  }]).select();

  console.log('Insert test batch:', data, error);

  if (data && data.length) {
    // Delete test batch
    await supabase.from('production_batches').delete().eq('id', data[0].id);
    console.log('Cleaned up test batch');
  }
}

checkBatchCols().catch(console.error);
