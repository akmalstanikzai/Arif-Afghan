import { useId, useRef, useState } from 'react';
import { useLanguage } from '../../lib/i18n';

export const fieldClass = 'w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink disabled:bg-stone-100';
export const buttonClass = 'rounded-lg bg-brand-action px-5 py-2.5 text-sm text-white cursor-pointer hover:bg-brand disabled:opacity-50 disabled:cursor-wait';
export const secondaryClass = 'rounded-lg border border-line bg-white px-3 py-2 text-xs text-brand cursor-pointer hover:bg-surface disabled:opacity-40';
export function Field({ label, children, hint }) {
  const { t } = useLanguage();
  const id = useId();
  return <div className="min-w-0"><label htmlFor={id} className="mb-2 block text-xs font-semibold">{t(label)}</label>{typeof children === 'function' ? children(id) : children}{hint && <p className="mt-1 text-xs leading-6 text-stone-500">{t(hint)}</p>}</div>;
}
export function Input({ label, hint, value, onChange, type = 'text', ...props }) {
  return <Field label={label} hint={hint}>{id => <input id={id} className={fieldClass} type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} {...props} />}</Field>;
}
export function SearchSelect({ label, value, onChange, options, disabled = false }) {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const root = useRef(null);
  const id = useId();
  const selected = options.find(o => String(o.id) === String(value));
  const choices = options.filter(o => o.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  return <div className="relative min-w-0"><span id={id} className="mb-2 block text-xs font-semibold">{t(label)}</span><details ref={root} onKeyDown={e => { if (e.key === 'Escape') { root.current.open = false; root.current.querySelector('summary').focus(); } }}>
    <summary aria-labelledby={id} className={`${fieldClass} cursor-pointer list-none ${disabled ? 'pointer-events-none opacity-50' : ''}`}>{selected?.name || t('انتخاب کنید')}<span className="float-left" aria-hidden="true">⌄</span></summary>
    <div className="absolute z-30 mt-1 w-full rounded-lg border border-line bg-white p-2 shadow-lg">
      <input aria-label={`${t('جستجو در')} ${t(label)}`} placeholder={t('جستجو…')} className={fieldClass} value={search} onChange={e => setSearch(e.target.value)} />
      <select aria-label={t(label)} className="mt-2 w-full rounded border border-line p-1 text-sm" size={Math.min(6, Math.max(2, choices.length + 1))} value={String(value || '')} onChange={e => { onChange(e.target.value); root.current.open = false; setSearch(''); root.current.querySelector('summary').focus(); }}>
        <option value="">{t('انتخاب کنید')}</option>{choices.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
      {!choices.length && <p className="p-2 text-xs text-stone-500">{t('موردی پیدا نشد.')}</p>}
    </div>
  </details></div>;
}
export function Card({ title, children, className = '' }) { const { t } = useLanguage(); return <section className={`rounded-xl border border-line bg-white p-5 md:p-6 ${className}`}>{title && <h2 className="mb-5 font-semibold">{t(title)}</h2>}{children}</section>; }
export function Notice({ children }) { return children ? <p className="my-3 rounded-lg bg-emerald-50 p-3 text-sm leading-7 text-emerald-800" role="status">{children}</p> : null; }
export function Stat({ label, value, note }) { const { t } = useLanguage(); return <div className="rounded-xl border border-line bg-white p-5"><p className="text-xs text-stone-500">{t(label)}</p><p className="mt-3 text-xl font-semibold wrap-anywhere text-brand">{value}</p>{note && <p className="mt-2 text-xs text-stone-500">{t(note)}</p>}</div>; }
export function Table({ columns, rows, rowKey = 'id', empty = 'هنوز موردی ثبت نشده است.' }) {
  const { t } = useLanguage();
  return <div className="overflow-x-auto rounded-lg border border-line"><table className="w-full min-w-[560px] text-right text-xs"><thead className="bg-surface"><tr>{columns.map(c => <th className="px-4 py-3 font-semibold whitespace-nowrap" key={c.key}>{t(c.label)}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row[rowKey]} className="border-t border-line hover:bg-stone-50">{columns.map(c => <td key={c.key} className="px-4 py-3 leading-6">{c.render ? c.render(row) : row[c.key]}</td>)}</tr>)}</tbody></table>{!rows.length && <p className="p-8 text-center text-sm text-stone-500">{t(empty)}</p>}</div>;
}
