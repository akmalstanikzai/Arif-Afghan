import { normalizeDigits } from './format.js';
export const bagSizes = [20, 24.5, 70];
export const bagMarks = ['Talha', 'Mahfooz'];
export function toKilograms(value, unit = 'kg', bagSize = 0) {
  if (!String(value ?? '').trim()) return '';
  const n = Number(normalizeDigits(value));
  const factor = unit === 'tons' ? 1000 : unit === 'bags' ? Number(bagSize) : 1;
  if (!Number.isFinite(n) || n < 0 || !factor) return 'invalid';
  const kg = n * factor;
  // Do not silently round away a quantity smaller than the database precision.
  if (Math.abs(kg * 1000 - Math.round(kg * 1000)) > 0.00001) return 'invalid';
  return String(Math.round(kg * 1000) / 1000);
}
export function fromKilograms(value, unit = 'kg', bagSize = 0) {
  if (value === '' || value == null || !Number.isFinite(Number(value))) return '';
  const divisor = unit === 'tons' ? 1000 : unit === 'bags' ? Number(bagSize) : 1;
  return divisor ? String(Number((Number(value) / divisor).toFixed(6))) : '';
}
export const stockKey = row => `${row.product_id ?? row.id}:${Number(row.bag_size || 0)}:${row.bag_mark || ''}`;
export function validateOutputPackaging(outputs) {
  const keys = new Set();
  for (const row of outputs) {
    const size = Number(row.bag_size || 0), mark = row.bag_mark || '';
    if (!(size === 0 && mark === '') && !(bagSizes.includes(size) && bagMarks.includes(mark))) return 'Select a valid bag size and mark.';
    const key = stockKey(row);
    if (keys.has(key)) return 'Each grade and packaging combination must appear only once.';
    keys.add(key);
  }
  return '';
}
