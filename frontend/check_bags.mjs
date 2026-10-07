import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hektcxmeowqpvblwkrqv.supabase.co';
const supabaseKey = 'sb_publishable_xZxvvqd3up-19C973fOTCg_9ar8G9KU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBags() {
  const { data, error } = await supabase.from('store_finished_product_bags').select('*');
  console.log('Bags:', data);
}

checkBags().catch(console.error);
