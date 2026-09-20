import { supabase } from '../lib/supabase/client.js';

async function rpc(name, args) {
  if (!supabase) throw new Error("The system connection is not configured. Contact your administrator.");
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data;
}
export const fetchSnapshot = () => rpc('mill_snapshot');
export const fetchHistory = filters => rpc('mill_history', filters);
export const postEntry = (kind, data, requestId) => rpc('mill_post', { p_kind: kind, p_data: data, p_request_id: requestId });
