import { useEffect, useRef, useState } from 'react';
import PageHeading from '../components/PageHeading.jsx';
import Alert from '../components/Alert.jsx';
import { Card, Input, Notice, Table, buttonClass, fieldClass, secondaryClass } from '../components/Fields.jsx';
import { errorMessage, money, normalizeDigits, numeric, today } from '../lib/format.js';
import { toSolarHijri } from '../lib/calendar.js';
import { deleteMonthlyExpense, fetchMonthlyExpenses, saveMonthlyExpense } from '../services/millApi.js';
import { useLanguage } from '../hooks/useLanguage.js';

const initial=()=>({solar_month:toSolarHijri(today()).slice(0,7),category_id:'salary',description:'',responsible:'',amount:''});
export default function MonthlyExpensesPage(){
  const {t}=useLanguage();
  const [form,setForm]=useState(initial);
  const [rows,setRows]=useState([]); const [error,setError]=useState(''); const [success,setSuccess]=useState(''); const [busy,setBusy]=useState(false); const [reload,setReload]=useState(0);
  const request=useRef(null);
  useEffect(()=>{let active=true;fetchMonthlyExpenses().then(value=>{if(active){setRows(value);setError('');}}).catch(err=>{if(active)setError(errorMessage(err));});return()=>{active=false;};},[reload]);
  async function submit(e){e.preventDefault();if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(form.solar_month)||numeric(form.amount)<=0){setError('Enter a valid month and positive amount.');return;}setBusy(true);setError('');setSuccess('');request.current ||= crypto.randomUUID();try{await saveMonthlyExpense(form,request.current);request.current=null;setForm(initial());setSuccess('Monthly expense saved successfully.');setReload(v=>v+1);}catch(err){setError(errorMessage(err));}finally{setBusy(false);}}
  async function remove(row){if(!window.confirm(t('Delete this monthly expense?')))return;setBusy(true);try{await deleteMonthlyExpense(row.id);setReload(v=>v+1);}catch(err){setError(errorMessage(err));}finally{setBusy(false);}}
  return <div className="space-y-6"><PageHeading eyebrow="Fixed expenses spread across every calendar day" title="Monthly expenses" />
    <Card title="Record monthly fixed expense"><form onSubmit={submit} noValidate><fieldset disabled={busy} className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Input label="Solar Hijri month *" hint="Format: YYYY-MM" value={form.solar_month} onChange={solar_month=>setForm(v=>({...v,solar_month:normalizeDigits(solar_month)}))} placeholder="1405-01" maxLength={7} />
      <label className="text-xs font-semibold">{t('Fixed expense type')}<select className={`${fieldClass} mt-2`} value={form.category_id} onChange={e=>setForm(v=>({...v,category_id:e.target.value}))}><option value="salary">{t('Staff salary')}</option><option value="electricity">{t('Electricity bill')}</option></select></label>
      <Input label="Amount (AFN) *" inputMode="decimal" value={form.amount} onChange={amount=>setForm(v=>({...v,amount:normalizeDigits(amount)}))} />
      <Input label="Description" value={form.description} onChange={description=>setForm(v=>({...v,description}))} maxLength={500} />
      <Input label="Responsible person" value={form.responsible} onChange={responsible=>setForm(v=>({...v,responsible}))} maxLength={160} />
      <div className="col-span-full"><Alert>{error}</Alert><Notice>{success}</Notice><button className={buttonClass}>{busy?t('Saving…'):t('Save record')}</button></div>
    </fieldset></form></Card>
    <Card title="Monthly fixed expense records"><Table rows={rows} columns={[{key:'solar_month',label:'Solar Hijri month'},{key:'category_id',label:'Type',render:r=>t(r.category_id==='salary'?'Staff salary':'Electricity bill')},{key:'amount',label:'Monthly amount',render:r=>money(r.amount)},{key:'daily_amount',label:'Amount per day',render:r=>money(r.daily_amount)},{key:'description',label:'Description'},{key:'responsible',label:'Responsible person'},{key:'actions',label:'Actions',render:r=><button disabled={busy} className={`${secondaryClass} text-red-700`} onClick={()=>remove(r)}>{t('Delete')}</button>}]} /></Card>
  </div>;
}
