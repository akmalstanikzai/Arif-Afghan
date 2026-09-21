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
export const deleteParty = id => rpc('mill_delete_party', { p_id: id });
export const paySupplier = (data, requestId) => rpc('mill_pay_supplier', {
  p_party: data.party_id,
  p_date: data.date,
  p_amount: data.amount,
  p_payment_method: data.payment_method,
  p_cheque_number: data.cheque_number,
  p_payment_institution: data.payment_institution,
  p_request_id: requestId,
});
