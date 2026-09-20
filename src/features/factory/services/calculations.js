import { numeric, roundMoney } from '../../../lib/format.js';

export function calculate(kind, values, data) {
  const q = numeric(values.weight), price = numeric(values.unit_price), input = numeric(values.input_weight);
  const raw = data.raw_stock.find(r => String(r.id) === String(values.raw_type_id));
  const base = roundMoney(q * price), logistics = numeric(values.logistics);
  const output = (values.outputs || []).reduce((s, o) => s + numeric(o.weight), 0);
  const rice = roundMoney((values.outputs || []).reduce((s, o) => s + numeric(o.retained) * numeric(o.fee_price), 0));
  const rawCost = input * Number(raw?.average_cost || 0), cost = rawCost + numeric(values.expenses);
  const total = kind === 'service' ? numeric(values.charge) : base;
  return { base, logistics, landed: base + logistics, actual: q ? (base + logistics) / q : 0, output, loss: input - output, rice, rawCost, cost, costPerKg: output ? cost / output : 0, processingPerKg: input ? numeric(values.expenses) / input : 0, remaining: total - numeric(values.paid) - (kind === 'service' ? rice : 0) };
}
export function validateTransaction(kind, v, data) {
  if (!v.date || !/^\d{4}-\d{2}-\d{2}$/.test(v.date)) return 'تاریخ معتبر را وارد کنید.';
  if (['purchase','sale','service'].includes(kind) && !v.party_id) return 'تأمین‌کننده یا مشتری را انتخاب کنید.';
  if (['purchase','processing','service'].includes(kind) && !v.raw_type_id) return 'نوع برنج خام را انتخاب کنید.';
  if (kind === 'sale' && !v.product_id) return 'محصول را انتخاب کنید.';
  if (['purchase','sale'].includes(kind) && !String(v.unit_price ?? '').trim()) return 'قیمت فی کیلو را وارد کنید.';
  if (kind === 'service' && !String(v.charge ?? '').trim()) return 'اجرت پروسس را وارد کنید.';
  const fields = kind === 'purchase' ? ['weight','unit_price','logistics','paid'] : kind === 'sale' ? ['weight','unit_price','paid','delivered'] : kind === 'processing' ? ['input_weight','expenses'] : kind === 'service' ? ['input_weight','charge','paid'] : ['amount'];
  for (const key of fields) {
    if (!Number.isFinite(numeric(v[key])) || numeric(v[key]) < 0 || numeric(v[key]) > 1e12) return 'همهٔ وزن‌ها و مبالغ باید اعداد معتبر و غیرمنفی باشند.';
  }
  const precisionValid = (value, places) => Math.abs(numeric(value) * (10 ** places) - Math.round(numeric(value) * (10 ** places))) < 0.000001;
  for (const key of fields) if (!precisionValid(v[key], ['weight','input_weight','delivered'].includes(key) ? 3 : key === 'unit_price' ? 4 : 2)) return 'وزن تا سه رقم اعشار، قیمت فی کیلو تا چهار رقم و مبلغ تا دو رقم اعشار قابل ثبت است.';
  if (['purchase','sale'].includes(kind) && numeric(v.weight) <= 0) return 'وزن باید بیشتر از صفر باشد.';
  if (['processing','service'].includes(kind)) {
    if (numeric(v.input_weight) <= 0) return 'وزن ورودی باید بیشتر از صفر باشد.';
    for (const o of v.outputs || []) {
      if ([o.weight,o.retained,o.fee_price].some(x => !Number.isFinite(numeric(x)) || numeric(x) < 0)) return 'مقادیر خروجی معتبر نیستند.';
      if (!precisionValid(o.weight,3) || !precisionValid(o.retained,3) || !precisionValid(o.fee_price,4)) return 'وزن خروجی تا سه و قیمت توافقی تا چهار رقم اعشار قابل ثبت است.';
      if (numeric(o.retained) > numeric(o.weight)) return 'برنج دریافتی کارخانه نمی‌تواند بیشتر از خروجی باشد.';
      if (numeric(o.retained) > 0 && numeric(o.fee_price) <= 0) return 'برای برنج دریافتی، قیمت توافقی فی کیلو را وارد کنید.';
    }
  }
  const c = calculate(kind, v, data);
  if (['purchase','sale','service'].includes(kind) && c.remaining < -0.001) return 'مجموع پرداخت نقدی و برنج از مبلغ سند بیشتر است.';
  if (['processing','service'].includes(kind) && (c.output <= 0 || c.loss < -0.000001)) return 'خروجی باید مثبت و کمتر یا مساوی ورودی باشد.';
  if (kind === 'processing') {
    const stock = data.raw_stock.find(r => String(r.id) === String(v.raw_type_id));
    if (numeric(v.input_weight) > Number(stock?.quantity || 0)) return 'موجودی برنج خام کافی نیست.';
  }
  if (kind === 'sale') {
    const stock = data.products.find(p => String(p.id) === String(v.product_id));
    if (numeric(v.weight) > Number(stock?.available || 0)) return 'موجودی قابل فروش کافی نیست.';
    if (numeric(v.delivered) > numeric(v.weight)) return 'تحویل نمی‌تواند بیشتر از وزن فروش باشد.';
  }
  if (kind === 'expense' && (!v.description?.trim() || !v.category_id || numeric(v.amount) <= 0)) return 'شرح، دسته و مبلغ مثبت مصرف را وارد کنید.';
  return '';
}
