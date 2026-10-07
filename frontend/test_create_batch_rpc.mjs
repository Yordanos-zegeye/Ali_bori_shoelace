import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hektcxmeowqpvblwkrqv.supabase.co';
const supabaseKey = 'sb_publishable_xZxvvqd3up-19C973fOTCg_9ar8G9KU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRpc() {
  const { data, error } = await supabase.rpc('create_production_batch', {
    p_product_variant_id: 1,
    p_raw_yarn_input_kg: 32.0,
    p_yarn_batch_count: 1,
    p_raw_material_yarn_id: null,
    p_acetone_used: 0,
    p_film_roll_variant_id: null,
    p_film_roll_used: 0,
    p_supervisor: 'Supervisor',
    p_notes: 'Test'
  });
  console.log('create_production_batch RPC result:', data, 'error:', error);
}

checkRpc().catch(console.error);
