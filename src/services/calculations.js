import { validateOutputPackaging } from '../lib/units.js';
import { isValidGregorian } from '../lib/calendar.js';
import { numeric, roundMoney } from '../lib/format.js';

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
  if (!isValidGregorian(v.date)) return "Enter a valid date.";
  if (['purchase','sale','service'].includes(kind) && !v.party_id) return "Select a supplier or customer.";
  if (['purchase','processing','service'].includes(kind) && !v.raw_type_id) return "Select a raw rice type.";
  if (kind === 'sale' && !v.product_id) return "Select a product.";
  if (['purchase','sale'].includes(kind) && !String(v.unit_price ?? '').trim()) return "Enter the price per kg.";
  if (kind === 'service' && !String(v.charge ?? '').trim()) return "Enter the processing charge.";
  const fields = kind === 'purchase' ? ['weight','unit_price','logistics','paid'] : kind === 'sale' ? ['weight','unit_price','paid','delivered'] : kind === 'processing' ? ['input_weight'] : kind === 'service' ? ['input_weight','charge','paid'] : ['amount'];
  for (const key of fields) {
    if (!Number.isFinite(numeric(v[key])) || numeric(v[key]) < 0 || numeric(v[key]) > 1e12) return "All weights and amounts must be valid non-negative numbers.";
  }
  const precisionValid = (value, places) => Math.abs(numeric(value) * (10 ** places) - Math.round(numeric(value) * (10 ** places))) < 0.000001;
  for (const key of fields) if (!precisionValid(v[key], ['weight','input_weight','delivered'].includes(key) ? 3 : key === 'unit_price' ? 4 : 2)) return "Weights support up to three decimals, prices per kg up to four, and amounts up to two.";
  if (['purchase','sale'].includes(kind) && numeric(v.weight) <= 0) return "Weight must be greater than zero.";
  if (['processing','service'].includes(kind)) {
    if (numeric(v.input_weight) <= 0) return "Input weight must be greater than zero.";
    for (const o of (kind === 'service' ? v.outputs : []) || []) {
      if ([o.weight,o.retained,o.fee_price].some(x => !Number.isFinite(numeric(x)) || numeric(x) < 0)) return "Output values are invalid.";
      if (!precisionValid(o.weight,3) || !precisionValid(o.retained,3) || !precisionValid(o.fee_price,4)) return "Output weights support up to three decimals and agreed prices up to four.";
      if (numeric(o.retained) > numeric(o.weight)) return "The factory share cannot exceed the output.";
      if (numeric(o.retained) > 0 && numeric(o.fee_price) <= 0) return "Enter an agreed price per kg for the factory share.";
    }
  }
  if (kind === 'purchase' && numeric(v.paid)>0 && v.payment_method === 'cheque' && !v.cheque_number?.trim()) return 'Enter a cheque number.';
  if(kind === 'service'){const error=validateOutputPackaging(v.outputs || []);if(error)return error;}
  const c = calculate(kind, v, data);
  if (['purchase','sale','service'].includes(kind) && c.remaining < -0.001) return "Cash and rice payments exceed the record amount.";
  if (kind === 'service' && (c.output <= 0 || c.loss < -0.000001)) return "Output must be positive and no greater than input.";
  if (kind === 'processing') {
    const stock = data.raw_stock.find(r => String(r.id) === String(v.raw_type_id));
    if (numeric(v.input_weight) > Number(stock?.quantity || 0)) return "There is not enough raw rice inventory.";
  }
  if (kind === 'sale') {
    const stock = data.packaged_stock ? data.packaged_stock.find(p=>String(p.product_id)===String(v.product_id) && Number(p.bag_size)===Number(v.bag_size || 0) && p.bag_mark===(v.bag_mark || '')) : data.products.find(p => String(p.id) === String(v.product_id));
    if (numeric(v.weight) > Number(stock?.available || 0)) return "There is not enough available inventory.";
    if (numeric(v.delivered) > numeric(v.weight)) return "Delivery cannot exceed the sale weight.";
  }
  if (kind === 'expense' && (!v.description?.trim() || !v.category_id || numeric(v.amount) <= 0)) return "Enter an expense description, category, and positive amount.";
  return '';
}
