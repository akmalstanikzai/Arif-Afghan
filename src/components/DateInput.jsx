import { useId, useState } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { dateDigits, fromSolarHijri, isValidGregorian, maxDate, minDate, toSolarHijri } from '../lib/calendar.js';

const inputClass = 'w-full min-w-0 rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink disabled:bg-stone-100';

// Parents always receive ISO Gregorian, regardless of the calendar used for entry.
export default function DateInput({ label = 'Date', value = '', onChange, required = false }) {
  const { t, language } = useLanguage();
  const id = useId();
  const [calendar, setCalendar] = useState(() => language === 'en' ? 'gregorian' : 'solar');
  const [draft, setDraft] = useState(null);
  const current = draft?.value === value ? draft : null;
  const invalid = current?.text && !value;
  function change(text) {
    const normalized = dateDigits(text);
    const next = calendar === 'solar' ? fromSolarHijri(normalized) : isValidGregorian(normalized) ? normalized : '';
    setDraft({ calendar, text, value: next });
    onChange(next);
  }
  const inputId = `${id}-${calendar}`;
  return <div className="min-w-0">
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
      <label htmlFor={inputId} className="text-xs font-semibold">{t(label)}{required ? ' *' : ''}</label>
      <div className="inline-flex rounded-md border border-line bg-surface p-0.5" role="group" aria-label={t('Calendar')}>
        {['gregorian', 'solar'].map(option => <button key={option} type="button" aria-pressed={calendar === option}
          className="cursor-pointer rounded px-2 py-1 text-[10px] text-stone-600 aria-pressed:bg-white aria-pressed:font-semibold aria-pressed:text-brand aria-pressed:shadow-sm"
          onClick={() => { setCalendar(option); setDraft(null); }}>
          {t(option === 'gregorian' ? 'Gregorian' : 'Solar Hijri')}
        </button>)}
      </div>
    </div>
    {calendar === 'gregorian' ? <input id={inputId} className={inputClass} type="date" dir="ltr" min={minDate} max={maxDate} required={required}
      aria-describedby={invalid ? `${id}-hint` : undefined} aria-invalid={Boolean(invalid)} value={current?.calendar === 'gregorian' ? current.text : value}
      onChange={e => change(e.target.value)} />
      : <input id={inputId} className={inputClass} type="text" dir="ltr" placeholder="1405-01-01" maxLength={10} required={required}
        aria-describedby={invalid ? `${id}-hint` : undefined} aria-invalid={Boolean(invalid)} value={current?.calendar === 'solar' ? current.text : toSolarHijri(value)}
        onChange={e => change(e.target.value)} />}
    {invalid && <p id={`${id}-hint`} className="mt-2 text-xs leading-6 text-red-700">{t('Enter a valid date (YYYY-MM-DD).')}</p>}
  </div>;
}
