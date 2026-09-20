import { useState } from 'react';
import PageHeading from '../components/PageHeading.jsx';
import Alert from '../components/Alert.jsx';
import { Card, Input, Table, Notice, buttonClass, secondaryClass } from '../components/Fields.jsx';
import { useFactory, useMutation } from '../hooks/useFactory.js';
import History from '../components/History.jsx';
import { money, weight } from '../lib/format.js';
import { useLanguage } from '../hooks/useLanguage';
export default function PartiesPage({ kind }) {
  const { data } = useFactory();
  const mutation = useMutation();
  const [form, setForm] = useState({ name:'', father_name:'', contact:'', active:true });
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const { t } = useLanguage();
  const supplier = kind==='supplier';
  const rows = data.parties.filter(p=>p.kind===kind && `${p.name} ${p.father_name || ""} ${p.contact}`.includes(search));
  async function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) { mutation.setError("Enter a name."); return; }
    if (await mutation.save('party',{...form,kind})) setForm({name:'',father_name:'', contact:'',active:true});
  }
  return <div className="space-y-6"><PageHeading eyebrow="Accounts and transaction history" title={supplier ? "Suppliers" : "Customers"} />
    <Card title={form.id ? "Edit details" : supplier ? "Add supplier" : "Add customer"}><form onSubmit={submit} noValidate><fieldset disabled={mutation.busy} className="grid gap-4 sm:grid-cols-2">
      <Input label="Name *" value={form.name} maxLength={160} onChange={name=>setForm(v=>({...v,name}))} />
      {supplier && <Input label="Father name" value={form.father_name} maxLength={160} onChange={father_name=>setForm(v=>({...v,father_name}))} />}
      <Input label="Phone / address" value={form.contact} maxLength={200} onChange={contact=>setForm(v=>({...v,contact}))} />
      {form.id && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={e=>setForm(v=>({...v,active:e.target.checked}))} />{t("Active for new transactions")}</label>}
      <div className="col-span-full"><Alert>{mutation.error}</Alert><Notice>{mutation.success}</Notice><button className={buttonClass}>{mutation.busy ? t("Saving…") : t("Save details")}</button>{form.id && <button type="button" className={`${secondaryClass} ms-3`} onClick={()=>setForm({name:'',father_name:'', contact:'',active:true})}>{t("Cancel")}</button>}</div>
    </fieldset></form></Card>
    <Card title={supplier ? "Supplier accounts" : "Customer accounts"}><div className="mb-4 max-w-sm"><Input label="Search by name or contact" value={search} onChange={setSearch} /></div><Table rows={rows} columns={[
      {key:'name',label:"Name",render:r=><>{r.name}{!r.active && <span className="ms-2 text-stone-400">({t("Inactive")})</span>}</>},{key:'contact',label:"Contact"},
      ...(supplier ? [{key:'father_name',label:'Father name'}] : []),
      {key:'total',label:supplier?"Total purchases":"Total sales and service",render:r=>money(r.total)},
      ...(!supplier ? [{key:'sales_total',label:"Rice purchases",render:r=>money(r.sales_total)},{key:'service_total',label:"Service charges",render:r=>money(r.service_total)}] : []),
      {key:'paid',label:"Cash paid",render:r=>money(r.paid)},
      ...(!supplier ? [{key:'rice_payment',label:"Rice paid",render:r=>money(r.rice_payment)}] : []),
      {key:'remaining',label:supplier?"Payable":"Receivable",render:r=>money(r.remaining)},
      ...(!supplier ? [{key:'purchased_weight',label:"Purchased weight",render:r=>weight(r.purchased_weight)},{key:'delivered',label:"Delivered",render:r=>weight(r.delivered)},{key:'pending',label:"Awaiting delivery",render:r=>weight(r.pending)}] : []),
      {key:'actions',label:"Actions",render:r=><div className="flex gap-2"><button className={secondaryClass} onClick={()=>{setForm({id:r.id,name:r.name,father_name:r.father_name || "",contact:r.contact,active:r.active});mutation.setError('');mutation.setSuccess('');window.scrollTo({top:0,behavior:'smooth'});}}>{t("Edit")}</button><button className={secondaryClass} onClick={()=>setSelected(r.id)}>{t("History")}</button></div>},
    ]} /></Card>
    {selected && <><button className={secondaryClass} onClick={()=>setSelected(null)}>{t("Close history")}</button><History key={selected} partyId={selected} title={t('History for {name}', { name: data.parties.find(p=>p.id===selected)?.name || '' })} /></>}
  </div>;
}
