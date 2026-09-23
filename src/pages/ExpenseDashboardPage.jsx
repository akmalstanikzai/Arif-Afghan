import { useEffect, useState } from 'react';
import PageHeading from '../components/PageHeading.jsx';
import DateInput from '../components/DateInput.jsx';
import Alert from '../components/Alert.jsx';
import { Card, Stat, Table } from '../components/Fields.jsx';
import { dateLabel, errorMessage, money, number, today } from '../lib/format.js';
import { toSolarHijri } from '../lib/calendar.js';
import { fetchExpenseAverages, fetchExpenseDashboard } from '../services/millApi.js';
import { useFactory } from '../hooks/useFactory.js';
import { useLanguage } from '../hooks/useLanguage';

const wholeMoney=value=>money(Math.ceil(Number(value)||0));
const localPeriod=value=>String(value||'').replace(/\d/g,digit=>number(Number(digit),0));
const expenseColumns=first=>[first,{key:'daily',label:'Individual daily expenses',render:r=>wholeMoney(r.daily)},{key:'salary',label:'Salary expense',render:r=>wholeMoney(r.salary)},{key:'electricity',label:'Electricity expense',render:r=>wholeMoney(r.electricity)},{key:'total',label:'Total',render:r=>wholeMoney(r.total)}];
const dayColumns=expenseColumns({key:'date',label:'Date',render:r=>dateLabel(r.date,r.solar_date)});
const periodColumns=expenseColumns({key:'period',label:'Period',render:r=>localPeriod(r.period)});
const solarMonths=['Hamal','Sawr','Jawza','Saratan','Asad','Sonbola','Mizan','Aqrab','Qaws','Jadi','Dalwa','Hoot'];

export default function ExpenseDashboardPage(){
 const {version}=useFactory();const {t}=useLanguage();const initialSolar=toSolarHijri(today());const [date,setDate]=useState(today());const [data,setData]=useState(null);const [averages,setAverages]=useState(null);const [solarYear,setSolarYear]=useState(Number(initialSolar.slice(0,4)));const [solarMonth,setSolarMonth]=useState(Number(initialSolar.slice(5,7)));const [error,setError]=useState('');
 useEffect(()=>{let active=true;fetchExpenseDashboard(date).then(value=>{if(active){setData(value);setError('');}}).catch(err=>{if(active)setError(errorMessage(err));});return()=>{active=false;};},[date,version]);
 useEffect(()=>{let active=true;fetchExpenseAverages(date,`${solarYear}-${String(solarMonth).padStart(2,'0')}`).then(value=>{if(active){setAverages(value);setError('');}}).catch(err=>{if(active)setError(errorMessage(err));});return()=>{active=false;};},[date,solarYear,solarMonth,version]);
 const currentSolarYear=Number(toSolarHijri(today()).slice(0,4));
 const recordedYears=(data?.all_time_breakdown||[]).map(row=>Number(row.period)).filter(Number.isFinite);
 const earliestYear=Math.min(currentSolarYear,...recordedYears);
 const years=Array.from({length:currentSolarYear-earliestYear+1},(_,index)=>currentSolarYear-index);
 const reports=data?[["Daily breakdown",data.day_breakdown,dayColumns],["Weekly breakdown by day",data.week_breakdown,dayColumns],["Monthly breakdown by day",data.month_breakdown,dayColumns],["Yearly breakdown by month",data.year_breakdown,periodColumns],["All-time breakdown by year",data.all_time_breakdown,periodColumns]]:[];
 return <div className="space-y-6"><PageHeading eyebrow="Daily expenses plus allocated salaries and electricity" title="Expense dashboard" />
  <Card title="Report date"><div className="max-w-sm"><DateInput label="Date" value={date} onChange={setDate} required /></div></Card><Alert>{error}</Alert>
  {data&&<>
  {averages&&<Card title="Average expense per day"><p className="mb-5 text-xs leading-6 text-stone-500">{t('Rolling averages end on the report date and include calendar days with no expenses.')}</p><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><Stat label="Last 3 days" value={wholeMoney(averages.last_3_average)}/><Stat label="Last 7 days" value={wholeMoney(averages.last_7_average)}/><Stat label="Last 30 days" value={wholeMoney(averages.last_30_average)}/><Stat label="Last 365 days" value={wholeMoney(averages.last_365_average)}/><Stat label="All time" value={wholeMoney(data.all_time_average)}/></div></Card>}
  <Card title="Average for a Solar Hijri month"><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold">{t('Solar Hijri year')}<select className="mt-2 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink" value={solarYear} onChange={event=>setSolarYear(Number(event.target.value))}>{years.map(year=><option key={year} value={year}>{localPeriod(year)}</option>)}</select></label><label className="text-xs font-semibold">{t('Solar Hijri month')}<select className="mt-2 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink" value={solarMonth} onChange={event=>setSolarMonth(Number(event.target.value))}>{solarMonths.map((month,index)=><option key={month} value={index+1}>{localPeriod(String(index+1).padStart(2,'0'))} — {t(month)}</option>)}</select></label></div>{averages&&<div className="mt-5 grid gap-4 sm:grid-cols-2"><Stat label="Average expense per day" value={wholeMoney(averages.selected_month_average)} note={t('{days} calendar days',{days:number(averages.selected_month_days,0)})}/><Stat label="Total expenses for the month" value={wholeMoney(averages.selected_month_total)}/></div>}</Card>
  {reports.map(([title,rows,columns])=><Card key={title} title={title}><Table rows={rows||[]} rowKey={row=>row.date||row.period} columns={columns}/></Card>)}</>}
 </div>;
}
