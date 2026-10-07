import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hektcxmeowqpvblwkrqv.supabase.co';
const supabaseKey = 'sb_publishable_xZxvvqd3up-19C973fOTCg_9ar8G9KU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSchema() {
  const { data, error } = await supabase.from('production_batches').select('*').limit(1);
  console.log('production_batches select:', data, error);

  // Check catalog_product_variants
  const { data: variants } = await supabase.from('catalog_product_variants').select('id, serial_code');
  console.log('catalog_product_variants:', variants);
}

inspectSchema().catch(console.error);
