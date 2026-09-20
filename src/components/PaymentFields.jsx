import { useLanguage } from '../hooks/useLanguage';
import { Field, Input, fieldClass } from './Fields.jsx';
export default function PaymentFields({ value, onChange }) {
  const { t } = useLanguage();
  return <>
    <Field label="Payment method">{id => <select id={id} className={fieldClass} value={value.payment_method || 'cash'} onChange={e => onChange({ ...value, payment_method: e.target.value, cheque_number: '', payment_institution: '' })}>
      <option value="cash">{t('Cash')}</option><option value="cheque">{t('Cheque')}</option>
    </select>}</Field>
    {value.payment_method === 'cheque' && <>
      <Input label="Cheque number *" value={value.cheque_number} maxLength={100} onChange={cheque_number => onChange({ ...value, cheque_number })} />
      <Input label="Sarafi / bank" value={value.payment_institution} maxLength={160} onChange={payment_institution => onChange({ ...value, payment_institution })} />
    </>}
  </>;
}
