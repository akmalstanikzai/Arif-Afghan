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
export const updatePurchase = (data, requestId) => rpc('mill_update_purchase', { p_id: data.id, p_data: data, p_request_id: requestId });
export const fetchDailyExpenseSummary = date => rpc('mill_daily_expense_summary', { p_date: date });
export const fetchMonthlyExpenses = () => rpc('mill_monthly_expense_list');
export const saveMonthlyExpense = (data, requestId) => rpc('mill_save_monthly_expense', { p_data: data, p_request_id: requestId });
export const deleteMonthlyExpense = id => rpc('mill_delete_monthly_expense', { p_id: id });
export const fetchSalarySnapshot = month => rpc('mill_salary_snapshot', { p_month: month });
export const saveEmployee = (data, requestId) => rpc('mill_save_employee', { p_data: data, p_request_id: requestId });
export const deleteEmployee = id => rpc('mill_delete_employee', { p_id: id });
export const payEmployeeSalary = (data, requestId) => rpc('mill_pay_employee_salary', { p_data: data, p_request_id: requestId });
export const startContractProcess = (data, requestId) => rpc('mill_start_contract_process', { p_data: data, p_request_id: requestId });
export const completeContractProcess = (data, requestId) => rpc('mill_complete_contract_process', { p_data: data, p_request_id: requestId });
export const fetchExpenseDashboard = date => rpc('mill_expense_dashboard', { p_date: date });
