import WeightInput from './WeightInput.jsx';
import PaymentFields from './PaymentFields.jsx';
import ProcessingOutputs from './ProcessingOutputs.jsx';
import { stockKey } from '../lib/units.js';
import DateInput from './DateInput.jsx';
import { useState } from 'react';
import { Card, Input, SearchSelect, buttonClass, Notice } from './Fields.jsx';
import Alert from './Alert.jsx';
import { useFactory, useMutation } from '../hooks/useFactory.js';
import { calculate, validateTransaction } from '../services/calculations.js';
import { money, numeric, today, weight, normalizeDigits } from '../lib/format.js';
import { useLanguage } from '../hooks/useLanguage';

const titles = { purchase: "Record raw rice purchase", processing: "Start process", service: "Record completed contract processing", sale: "Record sale", expense: "Record expense" };
const initial = () => ({ date: today(), paid: '0', logistics: '0', payment_method: 'cash', cheque_number: '', payment_institution: '', delivered: '0', outputs: [], notes: '' });
export default function TransactionForm({ kind, onSaved }) {
  const { data } = useFactory();
  const mutation = useMutation();
  const { t } = useLanguage();
  const [v, setV] = useState(initial);
  const set = (key, value) => setV(old => ({ ...old, [key]: value }));
  const c = calculate(kind, v, data);
  function selectRaw(id) { setV(old => ({ ...old, raw_type_id: id, outputs: data.products.filter(p => String(p.raw_type_id) === String(id)).map(p => ({ product_id: p.id, weight: '', retained: '0', fee_price: '0', bag_size: 0, bag_mark: '' })) })); }
  const lots = data.packaged_stock || data.products.map(p => ({ ...p, product_id: p.id, bag_size: 0, bag_mark: '' }));
  const numericInput = (key, label, hint) => <Input label={label} hint={hint} inputMode="decimal" value={v[key]} onChange={val => set(key, normalizeDigits(val))} />;
  async function submit(event) {
    event.preventDefault();
    const error = validateTransaction(kind, v, data);
    if (error) { mutation.setError(error); return; }
    if (await mutation.save(kind === 'processing' ? 'processing_start' : kind, v)) { setV(initial()); onSaved?.(); }
  }
  const hasOutputs = kind === 'service';
  const totals = kind === 'purchase' ? [["Purchase price", money(c.base)], ["Additional expenses", money(c.logistics)], ["Landed cost", money(c.landed)], ["Actual price per kg", money(c.actual)], ["Supplier balance", money(c.remaining)]]
    : kind === 'sale' ? [["Total sales", money(c.base)], ["Balance", money(c.remaining)], ["Customer rice remaining in storage", weight(numeric(v.weight) - numeric(v.delivered))]]
    : kind === 'processing' ? [["Raw material cost", money(c.rawCost)]]
    : kind === 'service' ? [["Total output", weight(c.output)], ["Waste", weight(c.loss)], ["Value of received rice", money(c.rice)], ["Service charge balance", money(c.remaining)]] : [];
  return <Card title={titles[kind]}>
    {kind === 'purchase' && <p className="mb-5 text-xs leading-7 text-stone-500">{t("Transport and additional expenses are paid separately. This amount is added to inventory cost, not the supplier balance. Do not record it again as an expense.")}</p>}
    {kind === 'service' && <p className="mb-5 text-xs leading-7 text-stone-500">{t("Submit this form after processing is complete and the rice is returned. Only the service share enters factory inventory; the remaining output goes back to the owner.")}</p>}
    <form onSubmit={submit} noValidate><fieldset disabled={mutation.busy}>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {['purchase','sale','service'].includes(kind) && <SearchSelect label={kind === 'purchase' ? "Supplier *" : "Customer / rice owner *"} value={v.party_id} onChange={val => set('party_id', val)} options={data.parties.filter(p => p.active && p.kind === (kind === 'purchase' ? 'supplier' : 'customer')).map(p => ({ ...p, name: p.father_name ? `${p.name} — ${p.father_name}` : p.name }))} />}
        {['purchase','processing','service'].includes(kind) && <SearchSelect label="Raw rice type *" value={v.raw_type_id} onChange={selectRaw} options={data.raw_stock.map(r => ({ ...r, name: kind === 'purchase' ? r.name : `${r.name} — ${weight(r.quantity)}` }))} />}
        {kind === 'sale' && <SearchSelect label="Product / packaging *" value={v.stock_key} onChange={key => { const p=lots.find(row=>stockKey(row)===key); setV(old=>({...old,stock_key:key,product_id:p?.product_id,bag_size:p?.bag_size || 0,bag_mark:p?.bag_mark || ''})); }} options={lots.filter(p=>Number(p.available)>0).map(p=>({...p,id:stockKey(p),name:p.name+' — '+(Number(p.bag_size)?p.bag_size+' '+t('kg')+' '+p.bag_mark:t('Bulk / unpackaged'))+' — '+weight(p.available)}))} />}
        {['purchase','sale'].includes(kind) && <WeightInput label="Weight *" value={v.weight} bagSize={kind === 'sale' ? v.bag_size : 0} onChange={val=>set('weight',val)} />}
        {['purchase','sale'].includes(kind) && numericInput('unit_price', "Price per kg (AFN) *")}
        {kind === 'purchase' && numericInput('logistics', "Additional expenses / transport (AFN)")}
        {['processing','service'].includes(kind) && <WeightInput label="Input weight *" value={v.input_weight} onChange={val=>set('input_weight',val)} />}
        {kind === 'service' && numericInput('charge', "Processing charge (AFN) *")}
        {['purchase','sale','service'].includes(kind) && numericInput('paid', kind === 'purchase' ? "Amount paid to supplier (AFN)" : "Cash received from customer (AFN)")}
        {kind === 'purchase' && <PaymentFields value={v} onChange={setV} />}
        {kind === 'sale' && <WeightInput label="Current delivery" value={v.delivered} bagSize={v.bag_size} onChange={val=>set('delivered',val)} hint="Enter zero if the rice remains in storage." />}
        {kind === 'expense' && <>
          <Input label="Expense description *" value={v.description} onChange={val => set('description', val)} maxLength={500} />
          <SearchSelect label="Expense category *" value={v.category_id} onChange={val => set('category_id', val)} options={data.expense_categories.map(category => ({ ...category, name: t(category.name) }))} />
          {numericInput('amount', "Amount paid (AFN) *")}
          <Input label="Responsible person" value={v.responsible} onChange={val => set('responsible', val)} maxLength={160} />
        </>}
        <DateInput label="Date" required value={v.date} onChange={val => set('date', val)} />
        <Input label="Notes" value={v.notes} onChange={val => set('notes', val)} maxLength={2000} />
      </div>
      {hasOutputs && <ProcessingOutputs products={data.products} outputs={v.outputs} onChange={outputs=>set('outputs',outputs)} service />}
      {totals.length > 0 && <dl className="mt-6 grid gap-3 rounded-lg bg-surface p-4 sm:grid-cols-2 lg:grid-cols-3">{totals.map(([label,value]) => <div key={label}><dt className="text-xs text-stone-500">{t(label)}</dt><dd className="mt-1 font-semibold">{value}</dd></div>)}</dl>}
      {kind === 'processing' && <p className="mt-2 text-xs leading-6 text-stone-500">{t("The displayed price is an estimate; the final price is calculated from the weighted inventory average when saved.")}</p>}
      <Alert>{mutation.error}</Alert><Notice>{mutation.success}</Notice>
      {kind === 'processing' && <Notice>{t('Raw rice is reserved at the start. Finished inventory is added only on completion.')}</Notice>}
      <button className={`${buttonClass} mt-5`} type="submit">{mutation.busy ? t("Saving…") : t(kind === 'processing' ? 'Start process' : 'Save record')}</button>
      <p className="mt-3 text-xs leading-6 text-stone-500">{t("Final records cannot be edited or deleted directly. To correct one, void it with a reason and record it again.")}</p>
    </fieldset></form>
  </Card>;
}
