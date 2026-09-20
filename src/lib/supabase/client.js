import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
let client = null;
if (url && key && !url.includes('your-project') && !key.includes('your-publishable')) {
  try { client = createClient(url, key); } catch { /* Display setup guidance for invalid configuration. */ }
}
export const supabase = client;
