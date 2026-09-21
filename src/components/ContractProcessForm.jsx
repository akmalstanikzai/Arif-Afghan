import { useState } from 'react';
import { Card, Input, SearchSelect, Notice, buttonClass } from './Fields.jsx';
import DateInput from './DateInput.jsx';
import WeightInput from './WeightInput.jsx';
import Alert from './Alert.jsx';
import { useFactory, useMutation } from '../hooks/useFactory.js';
import { normalizeDigits, numeric, today } from '../lib/format.js';
import { useLanguage } from '../hooks/useLanguage.js';

const initial=()=>({customer_name:'',father_name:'',contact:'',raw_type_id:'',input_weight:'',factory_percentage:'',date:today(),notes:''});
export default function ContractProcessForm({onSaved}){
 const {data}=useFactory();const mutation=useMutation();const {t}=useLanguage();const [form,setForm]=useState(initial);const set=(key,value)=>setForm(old=>({...old,[key]:value}));
 async function submit(e){e.preventDefault();const percentage=numeric(form.factory_percentage);if(!form.customer_name.trim()||!form.father_name.trim()||!form.raw_type_id||numeric(form.input_weight)<=0||percentage<=0||percentage>100){mutation.setError('Enter customer details, rice weight, and a factory percentage between 0 and 100.');return;}if(await mutation.saveContract('start',form)){setForm(initial());onSaved?.();}}
 return <Card title="Start contract process"><p className="mb-5 text-xs leading-7 text-stone-500">{t('Enter the customer directly. Their rice stays customer-owned until completion; only the factory percentage enters factory inventory.')}</p><form onSubmit={submit} noValidate><fieldset disabled={mutation.busy} className="grid items-end gap-5 sm:grid-cols-2 lg:grid-cols-3">
  <Input label="Customer name *" value={form.customer_name} onChange={value=>set('customer_name',value)} maxLength={160}/><Input label="Father name *" value={form.father_name} onChange={value=>set('father_name',value)} maxLength={160}/><Input label="Phone / address" value={form.contact} onChange={value=>set('contact',value)} maxLength={200}/>
  <SearchSelect label="Raw rice type *" value={form.raw_type_id} onChange={value=>set('raw_type_id',value)} options={data.raw_stock}/><WeightInput label="Customer rice weight *" value={form.input_weight} onChange={value=>set('input_weight',value)}/><Input label="Factory share percentage *" hint="Percentage of every finished rice quality kept by the factory" inputMode="decimal" value={form.factory_percentage} onChange={value=>set('factory_percentage',normalizeDigits(value))}/>
  <DateInput label="Date" value={form.date} onChange={value=>set('date',value)} required/><Input label="Notes" value={form.notes} onChange={value=>set('notes',value)} maxLength={2000}/><div className="col-span-full"><Alert>{mutation.error}</Alert><Notice>{mutation.success}</Notice><button className={buttonClass}>{mutation.busy?t('Saving…'):t('Start contract process')}</button></div>
 </fieldset></form></Card>;
}
