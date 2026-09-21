import { useEffect, useState } from 'react';
import PageHeading from '../components/PageHeading.jsx';
import DateInput from '../components/DateInput.jsx';
import Alert from '../components/Alert.jsx';
import { Card, Stat, Table } from '../components/Fields.jsx';
import { dateLabel, errorMessage, money, number, today } from '../lib/format.js';
import { fetchExpenseDashboard } from '../services/millApi.js';
import { useFactory } from '../hooks/useFactory.js';
import { useLanguage } from '../hooks/useLanguage';

const wholeMoney=value=>money(Math.ceil(Number(value)||0));
const localPeriod=value=>String(value||'').replace(/\d/g,digit=>number(Number(digit),0));
const expenseColumns=first=>[first,{key:'daily',label:'Individual daily expenses',render:r=>wholeMoney(r.daily)},{key:'salary',label:'Salary expense',render:r=>wholeMoney(r.salary)},{key:'electricity',label:'Electricity expense',render:r=>wholeMoney(r.electricity)},{key:'total',label:'Total',render:r=>wholeMoney(r.total)}];
const dayColumns=expenseColumns({key:'date',label:'Date',render:r=>dateLabel(r.date,r.solar_date)});
const periodColumns=expenseColumns({key:'period',label:'Period',render:r=>localPeriod(r.period)});

export default function ExpenseDashboardPage(){
 const {version}=useFactory();const {t}=useLanguage();const [date,setDate]=useState(today());const [data,setData]=useState(null);const [error,setError]=useState('');
 useEffect(()=>{let active=true;fetchExpenseDashboard(date).then(value=>{if(active){setData(value);setError('');}}).catch(err=>{if(active)setError(errorMessage(err));});return()=>{active=false;};},[date,version]);
 const reports=data?[["Daily breakdown",data.day_breakdown,dayColumns],["Weekly breakdown by day",data.week_breakdown,dayColumns],["Monthly breakdown by day",data.month_breakdown,dayColumns],["Yearly breakdown by month",data.year_breakdown,periodColumns],["All-time breakdown by year",data.all_time_breakdown,periodColumns]]:[];
 return <div className="space-y-6"><PageHeading eyebrow="Daily expenses plus allocated salaries and electricity" title="Expense dashboard" />
  <Card title="Report date"><div className="max-w-sm"><DateInput label="Date" value={date} onChange={setDate} required /></div></Card><Alert>{error}</Alert>
  {data&&<><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><Stat label="Selected day" value={wholeMoney(data.day_total)} note={t("Average per day: {amount}",{amount:wholeMoney(data.day_average)})}/><Stat label="Selected week" value={wholeMoney(data.week_total)} note={t("Average per day: {amount}",{amount:wholeMoney(data.week_average)})}/><Stat label="Selected month" value={wholeMoney(data.month_total)} note={t("Average per day: {amount}",{amount:wholeMoney(data.month_average)})}/><Stat label="Selected year" value={wholeMoney(data.year_total)} note={t("Average per day: {amount}",{amount:wholeMoney(data.year_average)})}/><Stat label="All-time expenses" value={wholeMoney(data.all_time_total)} note={t("Average per day: {amount}",{amount:wholeMoney(data.all_time_average)})}/></div>
  {reports.map(([title,rows,columns])=><Card key={title} title={title}><Table rows={rows||[]} rowKey={row=>row.date||row.period} columns={columns}/></Card>)}</>}
 </div>;
}
