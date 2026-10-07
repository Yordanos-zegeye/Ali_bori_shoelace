import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hektcxmeowqpvblwkrqv.supabase.co';
const supabaseKey = 'sb_publishable_xZxvvqd3up-19C973fOTCg_9ar8G9KU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRpc() {
  const { data, error } = await supabase.rpc('get_dashboard_analytics');
  console.log('RPC result:', data);
  console.log('RPC error:', error);
}

checkRpc().catch(console.error);
