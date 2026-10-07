import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hektcxmeowqpvblwkrqv.supabase.co';
const supabaseKey = 'sb_publishable_xZxvvqd3up-19C973fOTCg_9ar8G9KU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: batches } = await supabase.from('production_batches').select('*');
  console.log('Batches in DB:', batches);

  const { data: rpcData } = await supabase.rpc('get_dashboard_analytics');
  console.log('RPC production data:', rpcData?.production);
}

check().catch(console.error);
