import { useLanguage } from '../hooks/useLanguage';
import { bagMarks, bagSizes } from '../lib/units.js';
import { Field, fieldClass } from './Fields.jsx';

export default function PackagingFields({ value, onChange }) {
  const { t } = useLanguage();
  return <div className="grid gap-3 sm:grid-cols-2">
    <Field label="Bag size">{id => <select id={id} className={fieldClass} value={value.bag_size || 0} onChange={e => onChange({ ...value, bag_size: Number(e.target.value), bag_mark: Number(e.target.value) ? value.bag_mark || 'Talha' : '' })}>
      <option value={0}>{t('Bulk / unpackaged')}</option>{bagSizes.map(size => <option key={size} value={size}>{size} {t('kg')}</option>)}
    </select>}</Field>
    {Number(value.bag_size) > 0 && <Field label="Bag mark">{id => <select id={id} className={fieldClass} value={value.bag_mark || 'Talha'} onChange={e => onChange({ ...value, bag_mark: e.target.value })}>{bagMarks.map(mark => <option key={mark}>{mark}</option>)}</select>}</Field>}
  </div>;
}
