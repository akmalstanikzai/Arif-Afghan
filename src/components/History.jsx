import { stockKey } from '../lib/units.js';
import WeightInput from './WeightInput.jsx';
import PaymentFields from './PaymentFields.jsx';
import { isValidGregorian } from '../lib/calendar.js';
import DateInput from './DateInput.jsx';
import { useEffect, useState } from 'react';
import Alert from './Alert.jsx';
import { Card, Input, SearchSelect, Table, Notice, buttonClass, secondaryClass, fieldClass } from './Fields.jsx';
import { fetchHistory } from '../services/millApi.js';
import { useFactory, useMutation } from '../hooks/useFactory.js';
import { dateLabel, errorMessage, kindLabels, money, number, numeric, today, weight, normalizeDigits } from '../lib/format.js';
import { useLanguage } from '../hooks/useLanguage';

export function ActionForm({ action, entry, onClose }) {
  const mutation = useMutation();
  const { t } = useLanguage();
  const [date, setDate] = useState(today());
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [payment, setPayment] = useState({payment_method:'cash',cheque_number:'',payment_institution:''});
  async function submit(e) {
    e.preventDefault();
    if (action === 'delete' && !reason.trim()) { mutation.setError("Enter a void reason."); return; }
    if (action !== 'delete' && (!isValidGregorian(date) || !Number.isFinite(numeric(amount)) || numeric(amount) <= 0)) { mutation.setError("Enter a valid date and positive amount."); return; }
    if (action === 'payment' && numeric(amount) > Number(entry.remaining)) { mutation.setError("Payment exceeds the remaining balance."); return; }
    if (action === 'delivery' && numeric(amount) > Number(entry.pending)) { mutation.setError("Delivery exceeds the remaining weight."); return; }
    if (action === 'payment' && payment.payment_method === 'cheque' && !payment.cheque_number.trim()) { mutation.setError('Enter a cheque number.'); return; }
    const payload = action === 'delete' ? { id: entry.id, reason } : { ...payment, date, target_id: entry.id, [action === 'payment' ? 'amount' : 'weight']: normalizeDigits(amount) };
    if (await mutation.save(action === 'delete' ? 'void' : action, payload)) onClose();
  }
  return <div className="my-4 rounded-lg border border-brand/20 bg-surface p-5"><h3 className="mb-4 font-semibold">{t(action === 'delete' ? "Delete record" : action === 'payment' ? "Record cash payment" : "Record rice delivery")} — {number(entry.seq,0)}</h3><form onSubmit={submit} noValidate><fieldset disabled={mutation.busy} className="grid items-end gap-4 sm:grid-cols-2">
    {action === 'delete' ? <Input label="Deletion reason *" value={reason} onChange={setReason} maxLength={1000} hint="The record will be removed from active records. Delete dependent records first." /> : <>
      <DateInput label="Date" required value={date} onChange={setDate} />
      {action === 'delivery' ? <WeightInput label="Delivery weight" value={amount} bagSize={entry.bag_size} onChange={setAmount} hint={t('Remaining:')+' '+weight(entry.pending)} /> : <><Input label="Amount (AFN)" inputMode="decimal" value={amount} onChange={setAmount} hint={t('Remaining:')+' '+money(entry.remaining)} /><PaymentFields value={payment} onChange={setPayment} /></>}
    </>}
    <div className="col-span-full"><Alert>{mutation.error}</Alert><button className={buttonClass} type="submit">{mutation.busy ? t("Saving…") : t("Confirm and save")}</button><button type="button" className={`${secondaryClass} ms-3`} onClick={onClose}>{t("Cancel")}</button></div>
  </fieldset></form></div>;
}

function PurchaseEditForm({ entry, onClose }) {
  const { data } = useFactory();
  const mutation = useMutation();
  const { t } = useLanguage();
  const [form, setForm] = useState({id:entry.id,date:entry.date,party_id:entry.party_id,raw_type_id:entry.raw_type_id,weight:String(entry.weight),unit_price:String(entry.unit_price),logistics:String(entry.logistics),notes:entry.notes || ''});
  const set = (key,value) => setForm(old=>({...old,[key]:value}));
  async function submit(e) {
    e.preventDefault();
    if (!isValidGregorian(form.date) || !form.party_id || !form.raw_type_id || numeric(form.weight)<=0 || numeric(form.unit_price)<0 || numeric(form.logistics)<0) { mutation.setError('The entered values are invalid. Check weights, amounts, and required fields.'); return; }
    if (await mutation.savePurchaseEdit(form)) onClose();
  }
  return <div className="my-4 rounded-lg border border-brand/20 bg-surface p-5"><h3 className="mb-4 font-semibold">{t('Edit purchase record')} — {number(entry.seq,0)}</h3><form onSubmit={submit} noValidate><fieldset disabled={mutation.busy} className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <SearchSelect label="Supplier *" value={form.party_id} onChange={value=>set('party_id',value)} options={data.parties.filter(p=>p.kind==='supplier').map(p=>({...p,name:p.father_name?`${p.name} — ${p.father_name}`:p.name}))} />
    <SearchSelect label="Raw rice type *" value={form.raw_type_id} onChange={value=>set('raw_type_id',value)} options={data.raw_stock} />
    <WeightInput label="Weight *" value={form.weight} onChange={value=>set('weight',value)} />
    <Input label="Price per kg (AFN) *" inputMode="decimal" value={form.unit_price} onChange={value=>set('unit_price',normalizeDigits(value))} />
    <Input label="Additional expenses / transport (AFN)" inputMode="decimal" value={form.logistics} onChange={value=>set('logistics',normalizeDigits(value))} />
    <DateInput label="Date" required value={form.date} onChange={value=>set('date',value)} />
    <Input label="Notes" value={form.notes} onChange={value=>set('notes',value)} maxLength={2000} />
    <div className="col-span-full"><Alert>{mutation.error}</Alert><Notice>{mutation.success}</Notice><button className={buttonClass}>{mutation.busy?t('Saving…'):t('Save details')}</button><button type="button" className={`${secondaryClass} ms-3`} onClick={onClose}>{t('Cancel')}</button></div>
  </fieldset></form></div>;
}
export function EntryDetails({ entry: e }) {
  const { t } = useLanguage();
  const items = [["Record number",number(e.seq,0)],["Date",dateLabel(e.date, e.date_solar_hijri)],["Record type",t(kindLabels[e.kind])],["Party",e.party_name || '—'],["Product / type",e.item_name || '—']];
  if (['purchase','sale'].includes(e.kind)) items.push(["Weight",weight(e.weight)],["Price per kg",money(e.unit_price)]);
  if (['purchase','sale','service'].includes(e.kind)) items.push(["Record amount",money(e.total)],["Cash paid",money(e.paid)],["Balance",money(e.remaining)]);
  if (e.kind === 'purchase') items.push(["Additional expenses",money(e.logistics)],["Landed cost",money(e.total_cost)],["Actual price per kg",money(Number(e.total_cost)/Number(e.weight))]);
  if (['processing','service'].includes(e.kind) && e.processing_status !== 'ongoing') items.push(["Input weight",weight(e.weight)],["Total output",weight(e.total_output)],["Waste",weight(e.wastage)]);
  if (e.kind === 'processing' && e.processing_status !== 'ongoing') items.push(["Raw material cost",money(e.raw_cost)],["Processing expenses",money(e.processing_expenses)],["Processing cost per input kg",money(Number(e.processing_expenses)/Number(e.weight))],["Total batch cost",money(e.total_cost)],["Cost per output kg",money(Number(e.total_cost)/Number(e.total_output))]);
  if (e.kind === 'service') items.push(["Service charge settled with rice",money(e.rice_payment)]);
  if (e.kind === 'sale') items.push(["Delivered",weight(e.delivered)],["Awaiting delivery",weight(e.pending)],["Delivery status",t(Number(e.pending) === 0 ? "Complete" : Number(e.delivered) > 0 ? "Partial" : "Not delivered")]);
  if (e.kind === 'expense') items.push(["Description",e.description],["Responsible",e.responsible || '—'],["Amount",money(e.total)]);
  if (e.kind === 'payment') items.push(["Cash amount",money(e.total)],["For",t(kindLabels[e.target_kind])]);
  if (e.kind === 'delivery') items.push(["Delivery weight",weight(e.weight)]);
  if (e.father_name) items.push(['Father name',e.father_name]);
  if (e.payment_method) items.push(['Payment method',t(e.payment_method === 'cheque' ? 'Cheque' : 'Cash')],['Cheque number',e.cheque_number || '—'],['Sarafi / bank',e.payment_institution || '—']);
  if (e.processing_status) items.push(['Processing status',t(e.processing_status === 'ongoing' ? 'Ongoing' : 'Completed')]);
  if (e.process_source === 'contract') items.push(['Process source',t('Contract')],['Factory share percentage',`${number(e.factory_percentage,4)}%`]);
  if (e.completed_date) items.push(['Completion date',dateLabel(e.completed_date,e.completed_date_solar_hijri)]);
  if (Number(e.bag_size)>0) items.push(['Bag size',weight(e.bag_size)],['Bag mark',e.bag_mark]);
  if (e.completion_notes) items.push(['Completion notes',e.completion_notes]);
  if (e.target_seq) items.push(["Related record number",number(e.target_seq,0)]);
  return <div className="my-4 rounded-lg border border-line p-5"><dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map(([label,value]) => <div key={label}><dt className="text-xs text-stone-500">{t(label)}</dt><dd className="mt-1 text-sm wrap-anywhere">{value}</dd></div>)}</dl>
    {e.outputs?.length > 0 && <div className="mt-5"><Table rows={e.outputs} rowKey={stockKey} columns={[{key:'name',label:"Product"},{key:'bag_size',label:'Bag size',render:r=>Number(r.bag_size)?weight(r.bag_size):t('Bulk / unpackaged')},{key:'bag_mark',label:'Bag mark'},{key:'bags',label:'Bag equivalents',render:r=>Number(r.bag_size)?number(Number(r.weight)/Number(r.bag_size),6):'—'},{key:'weight',label:"Output",render:r=>weight(r.weight)},...(e.kind === 'service' ? [{key:'retained',label:"Factory share",render:r=>weight(r.retained)},{key:'fee_price',label:"Agreed price",render:r=>money(r.fee_price)},{key:'returned',label:"Returned to owner",render:r=>weight(r.returned)}] : [])]} /></div>}
    {e.payments?.filter(p=>!p.voided_at).length>0 && <div className="mt-5"><Table rows={e.payments.filter(p=>!p.voided_at)} columns={[{key:'date',label:'Date',render:r=>dateLabel(r.date,r.date_solar_hijri)},{key:'amount',label:'Amount',render:r=>money(r.amount)},{key:'payment_method',label:'Payment method',render:r=>t(r.payment_method === 'cheque'?'Cheque':'Cash')},{key:'cheque_number',label:'Cheque number'},{key:'payment_institution',label:'Sarafi / bank'}]} /></div>}
    {e.notes && <p className="mt-4 text-xs leading-7">{t("Note:")} {e.notes}</p>}
  </div>;
}
export default function History({ kind = null, partyId = null, title = "Transaction history", expenseCategories }) {
  const { version } = useFactory();
  const { t } = useLanguage();
  const [filters, setFilters] = useState({ search: '', category: '' });
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
      fetchHistory({ p_kind:kind, p_party:partyId, p_from:null, p_to:null, p_search:filters.search, p_page:page, p_voided:false, p_category:filters.category || null })
        .then(data => { if (active) setResult(data); })
        .catch(err => { if (active) setError(errorMessage(err)); })
        .finally(() => { if (active) setLoading(false); });
    }, 200);
    return () => { active = false; clearTimeout(timer); };
  }, [kind,partyId,filters,page,version,reload]);
  const rows = loading || error ? [] : result.rows;
  return <Card title={title}>
    <div className="mb-4 grid items-end gap-3 sm:grid-cols-2">
      <Input label="Search records" value={filters.search} onChange={v=>filter('search',v)} placeholder={kind === 'purchase' ? "Name or father name" : "Name, product, or record number"} />
      {expenseCategories && <label className="text-xs font-semibold">{t("Expense category")}<select className={`${fieldClass} mt-2`} value={filters.category} onChange={e=>filter('category',e.target.value)}><option value="">{t("All categories")}</option>{expenseCategories.map(c=><option key={c.id} value={c.id}>{t(c.name)}</option>)}</select></label>}
    </div>
    {loading && <p role="status" className="my-4 text-sm text-stone-500">{t("Loading records…")}</p>}<Alert>{error}</Alert>{error && <button className={secondaryClass} onClick={()=>setReload(v=>v+1)}>{t("Try again")}</button>}
    <Table rows={rows} empty={loading ? "Please wait…" : error ? "Could not load the information." : "No matching record was found."} columns={[
      ...(kind === 'purchase' ? [] : [{key:'seq',label:"Number",render:r=>number(r.seq,0)}]),{key:'date',label:"Date",render:r=>dateLabel(r.date, r.date_solar_hijri)},
      ...(kind === 'purchase' ? [] : [{key:'kind',label:"Type",render:r=>t(kindLabels[r.kind])}]),
      ...(kind === 'purchase' ? [
        {key:'party_name',label:"Name",render:r=>r.party_name || '—'},
        {key:'father_name',label:"Father name",render:r=>r.father_name || '—'},
        {key:'item_name',label:"Product",render:r=>r.item_name || '—'},
      ] : [{key:'party_name',label:"Party / product",render:r=><><span className="block">{r.party_name || r.item_name || r.description || '—'}</span>{r.party_name && <span className="text-stone-500">{r.item_name}</span>}</>}]),
      ...(kind === 'purchase' ? [
        {key:'weight_kg',label:"Weight (kg)",render:r=>weight(r.weight)},
        {key:'weight_tons',label:"Weight (tons)",render:r=>`${number(Number(r.weight)/1000,3)} ${t('tons')}`},
        {key:'unit_price',label:"Price per kg",render:r=>money(r.unit_price)},
        {key:'total',label:"Total purchase price",render:r=>money(r.total)},
        {key:'logistics',label:"Additional expenses",render:r=>money(r.logistics)},
        {key:'paid',label:"Paid amount",render:r=>money(r.paid)},
        {key:'remaining',label:"Remaining amount",render:r=>r.voided_at?'—':money(r.remaining)},
        {key:'payment_method',label:"Payment method",render:r=>[...new Set((r.payments || []).filter(p=>!p.voided_at).map(p=>t(p.payment_method==='cheque'?'Cheque':'Cash')))].join(', ') || '—'},
        {key:'cheque_number',label:"Cheque number",render:r=>(r.payments || []).filter(p=>!p.voided_at && p.cheque_number).map(p=>p.cheque_number).join(', ') || '—'},
        {key:'payment_institution',label:"Sarafi / bank",render:r=>(r.payments || []).filter(p=>!p.voided_at && p.payment_institution).map(p=>p.payment_institution).join(', ') || '—'},
        {key:'notes',label:"Notes",render:r=>r.notes || '—'},
      ] : [
        {key:'total',label:"Amount / weight",render:r=>r.kind === 'delivery' ? weight(r.weight) : money(r.total)},
        {key:'remaining',label:"Balance",render:r=>['sale','service'].includes(r.kind) && !r.voided_at ? money(r.remaining) : '—'},
      ]),
      ...(kind === 'sale' ? [{key:'pending',label:"Delivery status",render:r=>r.voided_at?t("Voided"):Number(r.pending)===0?t("Complete"):`${Number(r.delivered)>0?t("Partial"):t("Not delivered")} · ${weight(r.pending)} ${t("remaining")}`}] : []),
      {key:'actions',label:"Actions",render:r=><div className="flex flex-wrap gap-2"><button className={secondaryClass} onClick={()=>{setSelected(r);setAction(null);}}>{t("Details")}</button>{!r.voided_at && <>
        {['sale','service'].includes(r.kind) && Number(r.remaining)>0 && <button className={secondaryClass} onClick={()=>{setSelected(r);setAction('payment');}}>{t("Payment")}</button>}
        {r.kind==='sale' && Number(r.pending)>0 && <button className={secondaryClass} onClick={()=>{setSelected(r);setAction('delivery');}}>{t("Delivery")}</button>}
        {r.kind==='purchase' && <button className={secondaryClass} onClick={()=>{setSelected(r);setAction('edit');}}>{t('Edit')}</button>}
        <button className={`${secondaryClass} text-red-700`} onClick={()=>{setSelected(r);setAction('delete');}}>{t("Delete")}</button>
      </>}</div>},
    ]} />
    {selected && <div><button className={`${secondaryClass} mt-3`} onClick={()=>{setSelected(null);setAction(null);}}>{t("Close details")}</button>{action === 'edit' ? <PurchaseEditForm key={`${selected.id}-edit`} entry={selected} onClose={()=>{setSelected(null);setAction(null);}} /> : action ? <ActionForm key={`${selected.id}-${action}`} action={action} entry={selected} onClose={()=>{setSelected(null);setAction(null);}} /> : <EntryDetails entry={selected} />}</div>}
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-500"><span>{number(result.count,0)} {t("records")} {kind && kind!=='delivery' && <> · {t("Active records total:")} {money(result.total)}</>}</span><div className="flex items-center gap-3"><button className={secondaryClass} disabled={loading || page===0} onClick={()=>{setPage(p=>p-1);setSelected(null);}}>{t("Previous")}</button><span>{t("Page")} {number(page+1,0)}</span><button className={secondaryClass} disabled={loading || (page+1)*50>=result.count} onClick={()=>{setPage(p=>p+1);setSelected(null);}}>{t("Next")}</button></div></div>
    <Notice>{partyId ? t("Record payment and delivery for each invoice from its row. Payments and deliveries also appear here for correction.") : ''}</Notice>
  </Card>;
}
