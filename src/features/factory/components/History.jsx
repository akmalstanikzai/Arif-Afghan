import { useEffect, useState } from 'react';
import Alert from '../../../components/ui/Alert';
import { Card, Input, Table, Notice, buttonClass, secondaryClass, fieldClass } from '../../../components/ui/Fields';
import { fetchHistory } from '../services/millApi';
import { useFactory, useMutation } from '../hooks/useFactory';
import { dateLabel, errorMessage, kindLabels, money, number, numeric, today, weight, normalizeDigits } from '../../../lib/format';
import { useLanguage } from '../../../lib/i18n';

function ActionForm({ action, entry, onClose }) {
  const mutation = useMutation();
  const { t } = useLanguage();
  const [date, setDate] = useState(today());
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  async function submit(e) {
    e.preventDefault();
    if (action === 'void' && !reason.trim()) { mutation.setError(t('دلیل ابطال را بنویسید.')); return; }
    if (action !== 'void' && (!date || !Number.isFinite(numeric(amount)) || numeric(amount) <= 0)) { mutation.setError(t('تاریخ و مقدار مثبت معتبر را وارد کنید.')); return; }
    if (action === 'payment' && numeric(amount) > Number(entry.remaining)) { mutation.setError(t('پرداخت از باقی‌حساب بیشتر است.')); return; }
    if (action === 'delivery' && numeric(amount) > Number(entry.pending)) { mutation.setError(t('وزن تحویل از باقی‌مانده بیشتر است.')); return; }
    const payload = action === 'void' ? { id: entry.id, reason } : { date, target_id: entry.id, [action === 'payment' ? 'amount' : 'weight']: normalizeDigits(amount) };
    if (await mutation.save(action, payload)) onClose();
  }
  return <div className="my-4 rounded-lg border border-brand/20 bg-surface p-5"><h3 className="mb-4 font-semibold">{t(action === 'void' ? 'ابطال سند' : action === 'payment' ? 'ثبت پرداخت نقدی' : 'ثبت تحویل برنج')} — {number(entry.seq,0)}</h3><form onSubmit={submit} noValidate><fieldset disabled={mutation.busy} className="grid items-end gap-4 sm:grid-cols-2">
    {action === 'void' ? <Input label="دلیل ابطال *" value={reason} onChange={setReason} maxLength={1000} hint="اثر سند برگشت داده می‌شود و سابقهٔ آن باقی می‌ماند. ابتدا پرداخت‌ها و تحویل‌های وابسته را باطل کنید." /> : <>
      <Input label="تاریخ (میلادی)" type="date" value={date} onChange={setDate} />
      <Input label={action === 'payment' ? 'مبلغ (افغانی)' : 'وزن (کیلوگرام)'} inputMode="decimal" value={amount} onChange={setAmount} hint={`باقی‌مانده: ${action === 'payment' ? money(entry.remaining) : weight(entry.pending)}`} />
    </>}
    <div className="col-span-full"><Alert>{mutation.error}</Alert><button className={buttonClass} type="submit">{mutation.busy ? t('در حال ثبت…') : t('تأیید و ثبت')}</button><button type="button" className={`${secondaryClass} ms-3`} onClick={onClose}>{t('انصراف')}</button></div>
  </fieldset></form></div>;
}
export function EntryDetails({ entry: e }) {
  const { t } = useLanguage();
  const items = [['شمارهٔ سند',number(e.seq,0)],['تاریخ',dateLabel(e.date)],['نوع سند',t(kindLabels[e.kind])],['شخص',e.party_name || '—'],['محصول / نوع',e.item_name || '—']];
  if (['purchase','sale'].includes(e.kind)) items.push(['وزن',weight(e.weight)],['قیمت فی کیلو',money(e.unit_price)]);
  if (['purchase','sale','service'].includes(e.kind)) items.push(['مبلغ سند',money(e.total)],['پرداخت نقدی',money(e.paid)],['باقی‌حساب',money(e.remaining)]);
  if (e.kind === 'purchase') items.push(['مصارف جداگانه',money(e.logistics)],['قیمت تمام‌شده',money(e.total_cost)],['قیمت واقعی فی کیلو',money(Number(e.total_cost)/Number(e.weight))]);
  if (['processing','service'].includes(e.kind)) items.push(['وزن ورودی',weight(e.weight)],['مجموع خروجی',weight(e.total_output)],['ضایعات',weight(e.wastage)]);
  if (e.kind === 'processing') items.push(['قیمت مواد خام',money(e.raw_cost)],['مصارف پروسس',money(e.processing_expenses)],['مصرف پروسس فی کیلو ورودی',money(Number(e.processing_expenses)/Number(e.weight))],['مجموع قیمت دسته',money(e.total_cost)],['قیمت فی کیلو خروجی',money(Number(e.total_cost)/Number(e.total_output))]);
  if (e.kind === 'service') items.push(['اجرت تسویه‌شده با برنج',money(e.rice_payment)]);
  if (e.kind === 'sale') items.push(['تحویل‌شده',weight(e.delivered)],['منتظر تحویل',weight(e.pending)],['وضعیت تحویل',t(Number(e.pending) === 0 ? 'تکمیل' : Number(e.delivered) > 0 ? 'قسمی' : 'تحویل نشده')]);
  if (e.kind === 'expense') items.push(['شرح',e.description],['مسئول',e.responsible || '—'],['مبلغ',money(e.total)]);
  if (e.kind === 'payment') items.push(['مبلغ نقدی',money(e.total)],['بابت',kindLabels[e.target_kind]]);
  if (e.kind === 'delivery') items.push(['وزن تحویل',weight(e.weight)]);
  if (e.target_seq) items.push(['شمارهٔ سند مربوط',number(e.target_seq,0)]);
  return <div className="my-4 rounded-lg border border-line p-5"><dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map(([label,value]) => <div key={label}><dt className="text-xs text-stone-500">{t(label)}</dt><dd className="mt-1 text-sm wrap-anywhere">{value}</dd></div>)}</dl>
    {e.outputs?.length > 0 && <div className="mt-5"><Table rows={e.outputs} rowKey="product_id" columns={[{key:'name',label:'محصول'},{key:'weight',label:'خروجی',render:r=>weight(r.weight)},...(e.kind === 'service' ? [{key:'retained',label:'سهم کارخانه',render:r=>weight(r.retained)},{key:'fee_price',label:'قیمت توافقی',render:r=>money(r.fee_price)},{key:'returned',label:'برگشت به صاحب',render:r=>weight(r.returned)}] : [])]} /></div>}
    {e.notes && <p className="mt-4 text-xs leading-7">یادداشت: {e.notes}</p>}{e.voided_at && <p className="mt-4 text-xs text-red-700">باطل‌شده: {e.void_reason}</p>}
  </div>;
}
export default function History({ kind = null, partyId = null, title = 'سابقهٔ معاملات', expenseCategories }) {
  const { version } = useFactory();
  const { t } = useLanguage();
  const [filters, setFilters] = useState({ search: '', from: '', to: '', voided: false, category: '' });
  const [page, setPage] = useState(0);
  const [result, setResult] = useState({ rows: [], count: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [action, setAction] = useState(null);
  const [reload, setReload] = useState(0);
  const filter = (key,value) => { setFilters(old => ({...old,[key]:value})); setPage(0); setSelected(null); setAction(null); };
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true); setError('');
      fetchHistory({ p_kind:kind, p_party:partyId, p_from:filters.from || null, p_to:filters.to || null, p_search:filters.search, p_page:page, p_voided:filters.voided, p_category:filters.category || null })
        .then(data => { if (active) setResult(data); })
        .catch(err => { if (active) setError(errorMessage(err)); })
        .finally(() => { if (active) setLoading(false); });
    }, 200);
    return () => { active = false; clearTimeout(timer); };
  }, [kind,partyId,filters,page,version,reload]);
  const rows = loading || error ? [] : result.rows;
  return <Card title={title}>
    <div className="mb-4 grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Input label="جستجو در اسناد" value={filters.search} onChange={v=>filter('search',v)} placeholder="نام، محصول یا شمارهٔ سند" />
      <Input label="از تاریخ (میلادی)" type="date" value={filters.from} onChange={v=>filter('from',v)} />
      <Input label="تا تاریخ (میلادی)" type="date" value={filters.to} onChange={v=>filter('to',v)} />
      {expenseCategories && <label className="text-xs font-semibold">دستهٔ مصرف<select className={`${fieldClass} mt-2`} value={filters.category} onChange={e=>filter('category',e.target.value)}><option value="">همهٔ دسته‌ها</option>{expenseCategories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
    </div>
    <label className="mb-5 flex items-center gap-2 text-xs"><input type="checkbox" checked={filters.voided} onChange={e=>filter('voided',e.target.checked)} />نمایش اسناد باطل‌شده</label>
    {loading && <p role="status" className="my-4 text-sm text-stone-500">{t('در حال دریافت اسناد…')}</p>}<Alert>{error}</Alert>{error && <button className={secondaryClass} onClick={()=>setReload(v=>v+1)}>{t('کوشش دوباره')}</button>}
    <Table rows={rows} empty={loading ? 'لطفاً منتظر بمانید…' : error ? 'دریافت اطلاعات ممکن نشد.' : 'سندی با این مشخصات پیدا نشد.'} columns={[
      {key:'seq',label:'شماره',render:r=>number(r.seq,0)},{key:'date',label:'تاریخ',render:r=>dateLabel(r.date)},
      {key:'kind',label:'نوع',render:r=><span>{t(kindLabels[r.kind])}{r.voided_at && <span className="ms-1 text-red-700">({t('باطل')})</span>}</span>},
      {key:'party_name',label:'شخص / محصول',render:r=><><span className="block">{r.party_name || r.item_name || r.description || '—'}</span>{r.party_name && <span className="text-stone-500">{r.item_name}</span>}</>},
      {key:'total',label:'مبلغ / وزن',render:r=>r.kind === 'delivery' ? weight(r.weight) : money(r.total)},
      {key:'remaining',label:'باقی‌حساب',render:r=>['purchase','sale','service'].includes(r.kind) && !r.voided_at ? money(r.remaining) : '—'},
      ...(kind === 'sale' ? [{key:'pending',label:'وضعیت تحویل',render:r=>r.voided_at?t('باطل'):Number(r.pending)===0?t('تکمیل'):`${Number(r.delivered)>0?t('قسمی'):t('تحویل نشده')} · ${weight(r.pending)} ${t('باقی')}`}] : []),
      {key:'actions',label:'عملیات',render:r=><div className="flex flex-wrap gap-2"><button className={secondaryClass} onClick={()=>{setSelected(r);setAction(null);}}>{t('جزئیات')}</button>{!r.voided_at && <>
        {['purchase','sale','service'].includes(r.kind) && Number(r.remaining)>0 && <button className={secondaryClass} onClick={()=>{setSelected(r);setAction('payment');}}>{t('پرداخت')}</button>}
        {r.kind==='sale' && Number(r.pending)>0 && <button className={secondaryClass} onClick={()=>{setSelected(r);setAction('delivery');}}>{t('تحویل')}</button>}
        <button className={`${secondaryClass} text-red-700`} onClick={()=>{setSelected(r);setAction('void');}}>{t('ابطال')}</button>
      </>}</div>},
    ]} />
    {selected && <div><button className={`${secondaryClass} mt-3`} onClick={()=>{setSelected(null);setAction(null);}}>{t('بستن جزئیات')}</button>{action ? <ActionForm key={`${selected.id}-${action}`} action={action} entry={selected} onClose={()=>{setSelected(null);setAction(null);}} /> : <EntryDetails entry={selected} />}</div>}
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-500"><span>{number(result.count,0)} سند {kind && kind!=='delivery' && <> · مجموع اسناد فعال: {money(result.total)}</>}</span><div className="flex items-center gap-3"><button className={secondaryClass} disabled={loading || page===0} onClick={()=>{setPage(p=>p-1);setSelected(null);}}>قبلی</button><span>صفحهٔ {number(page+1,0)}</span><button className={secondaryClass} disabled={loading || (page+1)*50>=result.count} onClick={()=>{setPage(p=>p+1);setSelected(null);}}>بعدی</button></div></div>
    <Notice>{partyId ? t('پرداخت و تحویل هر فاکتور را از همان ردیف ثبت کنید. پرداخت‌ها و تحویل‌ها نیز برای اصلاح در این سابقه دیده می‌شوند.') : ''}</Notice>
  </Card>;
}
