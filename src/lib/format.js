import { isValidGregorian, toSolarHijri } from './calendar.js';
import { getLanguage, languages, translate, catalogs } from './translations.js';
export const navigation = [
  { id: 'overview', label: "Overview", icon: 'home' },
  { id: 'suppliers', label: "Suppliers", icon: 'user' },
  { id: 'purchases', label: "Raw rice purchases", icon: 'cart' },
  { id: 'raw_inventory', label: 'Raw material inventory', icon: 'box' },
  { id: 'processing', label: "Rice processing", icon: 'process' },
  { id: 'ongoing', label: 'Ongoing processes', icon: 'process' },
  { id: 'inventory', label: 'Processed inventory', icon: 'box' },
  { id: 'service', label: "Contract processing", icon: 'leaf' },
  { id: 'sales', label: "Sales and delivery", icon: 'cart' },
  { id: 'customers', label: "Customers", icon: 'user' },
  { id: 'daily_expenses', label: "Daily expenses", icon: 'wallet' },
  { id: 'monthly_expenses', label: "Monthly expenses", icon: 'wallet' },
  { id: 'staff_salaries', label: "Staff and salaries", icon: 'user' },
  { id: 'expense_dashboard', label: "Expense dashboard", icon: 'home' },
  { id: 'rice_costing', label: "Rice cost calculator", icon: 'wallet' },
  { id: 'account', label: "Settings", icon: 'user' },
];
export const sidebarNavigation = [
  navigation[0],
  { id: 'raw_material_group', label: 'Raw material', icon: 'box', children: navigation.filter(item => ['suppliers','purchases','raw_inventory'].includes(item.id)) },
  { id: 'processes_group', label: 'Processes', icon: 'process', children: navigation.filter(item => ['processing','service','ongoing','inventory'].includes(item.id)) },
  ...navigation.filter(item => ['sales','customers'].includes(item.id)),
  { id: 'expenses_group', label: 'Expenses', icon: 'wallet', children: navigation.filter(item => ['expense_dashboard','rice_costing','daily_expenses','monthly_expenses','staff_salaries'].includes(item.id)) },
  ...navigation.filter(item => item.id==='account'),
];
export const kindLabels = { purchase: "Purchase", processing: "Processing", service: "Contract processing", sale: "Sale", payment: "Cash payment", delivery: "Delivery", expense: "Expense" };
export const qualityLabels = ["Premium", "Medium", "Lower medium", "Broken"];
const currentLanguage = () => languages[getLanguage()].locale;
export const number = (value, digits = 2) => new Intl.NumberFormat(currentLanguage(), { maximumFractionDigits: digits }).format(Number(value) || 0);
export const money = value => `${number(value)} ${translate('AFN')}`;
export const weight = value => `${number(value, 3)} ${translate('kg')}`;
export const dateLabel = (value, storedSolarDate) => {
  const date = value?.slice(0, 10);
  if (!isValidGregorian(date)) return '—';
  const localDigits = text => text.replace(/\d/g, digit => number(Number(digit), 0));
  return localDigits(storedSolarDate || toSolarHijri(date));
};
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const normalizeDigits = value => String(value).replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/٫/g, '.');
export const numeric = value => Number(normalizeDigits(value || '0'));
export const roundMoney = value => Math.round((value + Number.EPSILON) * 100) / 100;
// Return message keys, not rendered text, so visible errors change with the language.
export function errorMessage(error) {
  const messages = {
    PGRST202: 'Database setup is incomplete. An administrator must run the migrations.',
    '42P01': 'Database setup is incomplete. An administrator must run the migrations.',
    '23514': 'The entered values are invalid. Check weights, amounts, and required fields.',
    '23502': 'The entered values are invalid. Check weights, amounts, and required fields.',
    '22003': 'The entered values are invalid. Check weights, amounts, and required fields.',
    '22P02': 'The entered values are invalid. Check weights, amounts, and required fields.',
    '22007': 'Enter a valid date.', '22008': 'Enter a valid date.',
    '23505': 'This item already exists. Check for duplicate information.',
    '23503': 'The selected party, product, or record is invalid. Refresh the list.',
    '40001': 'The data changed concurrently. Please try again.',
    '42501': 'You do not have permission for this operation. Contact your administrator.',
  };
  if (messages[error?.code]) return messages[error.code];
  const message = error?.message || '';
  if (Object.hasOwn(catalogs.en, message)) return message;
  if (Object.hasOwn(catalogs.en, message + '.')) return message + '.';
  if (/fetch|network|connection|offline/i.test(message)) return 'Could not connect to the system. Check your internet connection and try again.';
  return 'The operation could not be completed. Refresh and try again.';
}
