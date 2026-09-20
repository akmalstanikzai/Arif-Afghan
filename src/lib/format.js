export const navigation = [
  { id: 'overview', label: 'صفحهٔ اصلی', icon: 'home' },
  { id: 'purchases', label: 'خرید برنج خام', icon: 'cart' },
  { id: 'suppliers', label: 'تأمین‌کنندگان', icon: 'user' },
  { id: 'processing', label: 'پروسس برنج', icon: 'process' },
  { id: 'service', label: 'پروسس امانتی', icon: 'leaf' },
  { id: 'inventory', label: 'موجودی گدام', icon: 'box' },
  { id: 'sales', label: 'فروش و تحویل', icon: 'cart' },
  { id: 'customers', label: 'مشتریان', icon: 'user' },
  { id: 'expenses', label: 'مصارف', icon: 'wallet' },
  { id: 'account', label: 'حساب من', icon: 'user' },
];
export const kindLabels = { purchase: 'خرید', processing: 'پروسس', service: 'پروسس امانتی', sale: 'فروش', payment: 'پرداخت نقدی', delivery: 'تحویل', expense: 'مصرف' };
export const qualityLabels = ['اصلی', 'متوسط', 'متوسط کمزوری', 'میدگی'];
const currentLanguage = () => document.documentElement.lang === 'en' ? 'en-US' : 'fa-AF';
export const number = (value, digits = 2) => new Intl.NumberFormat(currentLanguage(), { maximumFractionDigits: digits }).format(Number(value) || 0);
export const money = value => `${number(value)} ${currentLanguage() === 'en-US' ? 'AFN' : 'افغانی'}`;
export const weight = value => `${number(value, 3)} ${currentLanguage() === 'en-US' ? 'kg' : 'کیلوگرام'}`;
export const dateLabel = value => value ? new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString(`${currentLanguage()}-u-ca-gregory`) : '—';
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const normalizeDigits = value => String(value).replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/٫/g, '.');
export const numeric = value => Number(normalizeDigits(value || '0'));
export const roundMoney = value => Math.round((value + Number.EPSILON) * 100) / 100;
export function errorMessage(error) {
  if (error?.code === 'P0001' && error?.message?.includes('دسترسی')) return 'حساب واردشده دسترسی کارمند ندارد. مدیر باید این کاربر را در جدول mill_staff فعال کند.';
  if (error?.code === '42501' && error?.message?.includes('function')) return 'نشست شما معتبر نیست یا دسترسی RPC تنظیم نشده است. دوباره وارد شوید و دسترسی‌های دیتابیس را بررسی کنید.';
  const messages = {
    PGRST202: 'راه‌اندازی دیتابیس تکمیل نشده است. مدیر سیستم باید فایل‌های مهاجرت را اجرا کند.', '42P01': 'راه‌اندازی دیتابیس تکمیل نشده است. مدیر سیستم باید فایل‌های مهاجرت را اجرا کند.',
    '23514': 'مقادیر واردشده معتبر نیستند؛ وزن، مبلغ و خانه‌های ضروری را بررسی کنید.', '23502': 'مقادیر واردشده معتبر نیستند؛ وزن، مبلغ و خانه‌های ضروری را بررسی کنید.', '22003': 'مقادیر واردشده معتبر نیستند؛ وزن، مبلغ و خانه‌های ضروری را بررسی کنید.',
    '23505': 'این مورد قبلاً ثبت شده است؛ اطلاعات تکراری را بررسی کنید.', '23503': 'شخص، محصول یا سند انتخاب‌شده معتبر نیست. فهرست را تازه کنید.', '40001': 'اطلاعات هم‌زمان تغییر کرده است. لطفاً دوباره کوشش کنید.', '42501': 'اجازهٔ این عملیات را ندارید. با مدیر سیستم تماس بگیرید.'
  };
  const message = messages[error?.code];
  const englishMessages = { 'راه‌اندازی دیتابیس تکمیل نشده است. مدیر سیستم باید فایل‌های مهاجرت را اجرا کند.': 'Database setup is incomplete. An administrator must run the migrations.', 'مقادیر واردشده معتبر نیستند؛ وزن، مبلغ و خانه‌های ضروری را بررسی کنید.': 'The entered values are invalid. Check weights, amounts, and required fields.', 'این مورد قبلاً ثبت شده است؛ اطلاعات تکراری را بررسی کنید.': 'This item already exists. Check for duplicate information.', 'شخص، محصول یا سند انتخاب‌شده معتبر نیست. فهرست را تازه کنید.': 'The selected party, product, or record is invalid. Refresh the list.', 'اطلاعات هم‌زمان تغییر کرده است. لطفاً دوباره کوشش کنید.': 'The data changed concurrently. Please try again.', 'اجازهٔ این عملیات را ندارید. با مدیر سیستم تماس بگیرید.': 'You do not have permission for this operation. Contact your administrator.', 'ارتباط با سیستم برقرار نشد. اتصال انترنت را بررسی کرده و دوباره کوشش کنید.': 'Could not connect to the system. Check your internet connection and try again.' };
  if (message) return currentLanguage() === 'en-US' ? englishMessages[message] : message;
  if (error?.message && /[\u0600-\u06ff]/.test(error.message)) return error.message;
  return currentLanguage() === 'en-US' ? englishMessages['ارتباط با سیستم برقرار نشد. اتصال انترنت را بررسی کرده و دوباره کوشش کنید.'] : 'ارتباط با سیستم برقرار نشد. اتصال انترنت را بررسی کرده و دوباره کوشش کنید.';
}
