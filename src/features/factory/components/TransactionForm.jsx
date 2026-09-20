import { useState } from 'react';
import { Card, Input, SearchSelect, buttonClass, Notice } from '../../../components/ui/Fields';
import Alert from '../../../components/ui/Alert';
import { useFactory, useMutation } from '../hooks/useFactory';
import { calculate, validateTransaction } from '../services/calculations';
import { money, number, numeric, today, weight, normalizeDigits, qualityLabels } from '../../../lib/format';
import { useLanguage } from '../../../lib/i18n';

const titles = { purchase: 'ثبت خرید برنج خام', processing: 'ثبت پروسس برنج کارخانه', service: 'ثبت پروسس امانتی تکمیل‌شده', sale: 'ثبت فروش', expense: 'ثبت مصرف' };
const initial = () => ({ date: today(), paid: '0', logistics: '0', expenses: '0', delivered: '0', outputs: [], notes: '' });
export default function TransactionForm({ kind }) {
  const { data } = useFactory();
  const mutation = useMutation();
  const { t } = useLanguage();
  const [v, setV] = useState(initial);
  const set = (key, value) => setV(old => ({ ...old, [key]: value }));
  const c = calculate(kind, v, data);
  function selectRaw(id) { setV(old => ({ ...old, raw_type_id: id, outputs: data.products.filter(p => String(p.raw_type_id) === String(id)).map(p => ({ product_id: p.id, weight: '', retained: '0', fee_price: '0' })) })); }
  const numericInput = (key, label, hint) => <Input label={label} hint={hint} inputMode="decimal" value={v[key]} onChange={val => set(key, normalizeDigits(val))} />;
  async function submit(event) {
    event.preventDefault();
    const error = validateTransaction(kind, v, data);
    if (error) { mutation.setError(t(error)); return; }
    if (await mutation.save(kind, v)) setV(initial());
  }
  const hasOutputs = ['processing','service'].includes(kind);
  const totals = kind === 'purchase' ? [['بهای خرید', money(c.base)], ['مصارف جداگانه', money(c.logistics)], ['قیمت تمام‌شده', money(c.landed)], ['قیمت واقعی فی کیلو', money(c.actual)], ['باقی‌حساب تأمین‌کننده', money(c.remaining)]]
    : kind === 'sale' ? [['مجموع فروش', money(c.base)], ['باقی‌حساب', money(c.remaining)], ['باقی در گدام برای مشتری', weight(numeric(v.weight) - numeric(v.delivered))]]
    : kind === 'processing' ? [['مجموع خروجی', weight(c.output)], ['ضایعات', weight(c.loss)], ['هزینهٔ مواد خام', money(c.rawCost)], ['مصرف پروسس فی کیلو ورودی', money(c.processingPerKg)], ['قیمت تمام‌شدهٔ دسته', money(c.cost)], ['قیمت فی کیلو خروجی', money(c.costPerKg)]]
    : kind === 'service' ? [['مجموع خروجی', weight(c.output)], ['ضایعات', weight(c.loss)], ['ارزش برنج دریافتی', money(c.rice)], ['باقی‌حساب اجرت', money(c.remaining)]] : [];
  return <Card title={titles[kind]}>
    {kind === 'purchase' && <p className="mb-5 text-xs leading-7 text-stone-500">{t('ترانسپورت و مصارف اضافی جداگانه پرداخت می‌شوند. این مبلغ به قیمت موجودی افزوده می‌شود، نه به بدهی تأمین‌کننده. دوباره در بخش مصارف ثبت نکنید.')}</p>}
    {kind === 'service' && <p className="mb-5 text-xs leading-7 text-stone-500">{t('این فورم را پس از تکمیل پروسس و بازگرداندن برنج ثبت کنید. فقط سهم اجرت وارد موجودی کارخانه می‌شود؛ باقی خروجی به صاحب برنج برگردانده می‌شود.')}</p>}
    <form onSubmit={submit} noValidate><fieldset disabled={mutation.busy}>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {['purchase','sale','service'].includes(kind) && <SearchSelect label={kind === 'purchase' ? 'تأمین‌کننده *' : 'مشتری / صاحب برنج *'} value={v.party_id} onChange={val => set('party_id', val)} options={data.parties.filter(p => p.active && p.kind === (kind === 'purchase' ? 'supplier' : 'customer'))} />}
        {['purchase','processing','service'].includes(kind) && <SearchSelect label="نوع برنج خام *" value={v.raw_type_id} onChange={selectRaw} options={data.raw_stock.map(r => ({ ...r, name: `${r.name} — ${weight(r.quantity)}` }))} />}
        {kind === 'sale' && <SearchSelect label="محصول *" value={v.product_id} onChange={val => set('product_id', val)} options={data.products.map(p => ({ ...p, name: `${p.name} — قابل فروش: ${weight(p.available)}` }))} />}
        {['purchase','sale'].includes(kind) && numericInput('weight', 'وزن (کیلوگرام) *')}
        {['purchase','sale'].includes(kind) && numericInput('unit_price', 'قیمت فی کیلو (افغانی) *')}
        {kind === 'purchase' && numericInput('logistics', 'مصارف اضافی / ترانسپورت (افغانی)')}
        {hasOutputs && numericInput('input_weight', 'وزن ورودی خام (کیلوگرام) *')}
        {kind === 'processing' && numericInput('expenses', 'مصارف پرداخت‌شدهٔ پروسس (افغانی)')}
        {kind === 'service' && numericInput('charge', 'اجرت پروسس (افغانی) *')}
        {['purchase','sale','service'].includes(kind) && numericInput('paid', kind === 'purchase' ? 'پرداخت نقدی به تأمین‌کننده (افغانی)' : 'دریافت نقدی از مشتری (افغانی)')}
        {kind === 'sale' && numericInput('delivered', 'تحویل فعلی (کیلوگرام)', 'اگر برنج در گدام می‌ماند، صفر وارد کنید.')}
        {kind === 'expense' && <>
          <Input label="شرح مصرف *" value={v.description} onChange={val => set('description', val)} maxLength={500} />
          <SearchSelect label="دستهٔ مصرف *" value={v.category_id} onChange={val => set('category_id', val)} options={data.expense_categories} />
          {numericInput('amount', 'مبلغ پرداخت‌شده (افغانی) *')}
          <Input label="شخص مسئول" value={v.responsible} onChange={val => set('responsible', val)} maxLength={160} />
        </>}
        <Input label="تاریخ (میلادی) *" type="date" value={v.date} onChange={val => set('date', val)} />
        <Input label="یادداشت" value={v.notes} onChange={val => set('notes', val)} maxLength={2000} />
      </div>
      {hasOutputs && v.outputs.length > 0 && <div className="mt-6 overflow-x-auto rounded-lg border border-line"><table className="w-full min-w-[500px] text-right text-xs"><thead className="bg-surface"><tr><th className="p-3">{t('کیفیت')}</th><th className="p-3">{t('خروجی (کیلوگرام)')}</th>{kind === 'service' && <><th className="p-3">{t('سهم کارخانه (کیلوگرام)')}</th><th className="p-3">{t('قیمت توافقی فی کیلو')}</th><th className="p-3">{t('برگشت به صاحب')}</th></>}</tr></thead><tbody>{v.outputs.map((o,index) => <tr className="border-t border-line" key={o.product_id}><th className="p-3">{t(qualityLabels[index])}</th>{(kind === 'service' ? ['weight','retained','fee_price'] : ['weight']).map(key => <td className="p-2" key={key}><input className="w-full min-w-20 rounded border border-line p-2" aria-label={`${t(qualityLabels[index])} ${t(key === 'weight' ? 'خروجی (کیلوگرام)' : key === 'retained' ? 'سهم کارخانه (کیلوگرام)' : 'قیمت توافقی فی کیلو')}`} inputMode="decimal" value={o[key]} onChange={e => setV(old => ({ ...old, outputs: old.outputs.map((item,i) => i === index ? { ...item, [key]: normalizeDigits(e.target.value) } : item) }))} /></td>)}{kind === 'service' && <td className="p-3">{number(numeric(o.weight)-numeric(o.retained),3)}</td>}</tr>)}</tbody></table></div>}
      {totals.length > 0 && <dl className="mt-6 grid gap-3 rounded-lg bg-surface p-4 sm:grid-cols-2 lg:grid-cols-3">{totals.map(([label,value]) => <div key={label}><dt className="text-xs text-stone-500">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div>)}</dl>}
      {kind === 'processing' && <p className="mt-2 text-xs leading-6 text-stone-500">{t('قیمت نمایش‌داده‌شده تخمینی است؛ قیمت نهایی با میانگین وزنی موجودی در لحظهٔ ثبت محاسبه می‌شود.')}</p>}
      <Alert>{mutation.error}</Alert><Notice>{mutation.success}</Notice>
      <button className={`${buttonClass} mt-5`} type="submit">{mutation.busy ? t('در حال ثبت…') : t('ثبت نهایی')}</button>
      <p className="mt-3 text-xs leading-6 text-stone-500">{t('سند نهایی مستقیماً ویرایش یا حذف نمی‌شود. برای اصلاح، سند را با ذکر دلیل باطل و دوباره ثبت کنید.')}</p>
    </fieldset></form>
  </Card>;
}
