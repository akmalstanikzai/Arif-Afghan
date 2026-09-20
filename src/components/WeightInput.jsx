import { useId, useState } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { fromKilograms, toKilograms } from '../lib/units.js';
import { fieldClass } from './Fields.jsx';

export default function WeightInput({ label = 'Weight', value, onChange, bagSize = 0, hint }) {
  const { t } = useLanguage();
  const id = useId();
  const [draft, setDraft] = useState(null);
  const units = ['kg', 'tons', ...(Number(bagSize) ? ['bags'] : [])];
  function change(unit, text) {
    const next = toKilograms(text, unit, bagSize);
    setDraft({ unit, text, value: next, bagSize });
    onChange(next);
  }
  return <fieldset className="min-w-0"><legend className="mb-2 text-xs font-semibold">{t(label)}</legend>
    <div className={`grid gap-2 ${units.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
      {units.map(unit => <div key={unit}><label className="mb-1 block text-xs text-stone-500" htmlFor={`${id}-${unit}`}>{t(unit === 'bags' ? 'Bag equivalents' : unit)}</label>
        <input id={`${id}-${unit}`} className={fieldClass} dir="ltr" inputMode="decimal" aria-invalid={value === 'invalid'}
          value={draft?.value === value && draft?.unit === unit && draft?.bagSize === bagSize ? draft.text : fromKilograms(value, unit, bagSize)}
          onChange={e => change(unit, e.target.value)} /></div>)}
    </div>
    {value === 'invalid' && <p className="mt-1 text-xs text-red-700">{t('Enter a non-negative weight with at most three kg decimals.')}</p>}
    {hint && <p className="mt-1 text-xs text-stone-500">{t(hint)}</p>}
  </fieldset>;
}
