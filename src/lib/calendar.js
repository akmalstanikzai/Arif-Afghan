// Solar Hijri (Shamsi/Jalali), not the lunar Hijri calendar.
// Year-start arithmetic adapted from jalaali-js (MIT); see docs/calendar-license.txt.
const breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
const dayMs = 86400000;
export const minDate = '1800-01-01';
export const maxDate = '2255-12-31';
const iso = (year, month, day) => `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
export const dateDigits = value => String(value ?? '').trim().replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replaceAll('/', '-');

function yearStart(year) {
  const gy = year + 621;
  let leaps = -14, previous = breaks[0], jump = 0;
  for (const next of breaks.slice(1)) {
    jump = next - previous;
    if (year < next) break;
    leaps += Math.trunc(jump / 33) * 8 + Math.trunc((jump % 33) / 4);
    previous = next;
  }
  const offset = year - previous;
  leaps += Math.trunc(offset / 33) * 8 + Math.trunc((offset % 33 + 3) / 4);
  if (jump % 33 === 4 && jump - offset === 4) leaps++;
  const gregorianLeaps = Math.trunc(gy / 4) - Math.trunc((Math.trunc(gy / 100) + 1) * 3 / 4) - 150;
  return Date.UTC(gy, 2, 20 + leaps - gregorianLeaps);
}

export function isValidGregorian(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < minDate || value > maxDate) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function toSolarHijri(value) {
  if (!isValidGregorian(value)) return '';
  let year = Number(value.slice(0, 4)) - 621;
  const time = Date.parse(`${value}T00:00:00Z`);
  if (time < yearStart(year)) year--;
  const days = (time - yearStart(year)) / dayMs;
  return days < 186 ? iso(year, Math.floor(days / 31) + 1, days % 31 + 1)
    : iso(year, Math.floor((days - 186) / 30) + 7, (days - 186) % 30 + 1);
}

export function fromSolarHijri(value) {
  const normalized = dateDigits(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return '';
  const [year, month, day] = normalized.split('-').map(Number);
  if (year < 1178 || year > 1634 || month < 1 || month > 12 || day < 1 || day > 31) return '';
  const offset = month <= 6 ? (month - 1) * 31 : 186 + (month - 7) * 30;
  const result = new Date(yearStart(year) + (offset + day - 1) * dayMs).toISOString().slice(0, 10);
  // Round-trip validation rejects non-leap month 12/day 30 and month 7/day 31.
  return toSolarHijri(result) === normalized ? result : '';
}
