import PageHeading from '../components/PageHeading.jsx';
import { Card, Stat } from '../components/Fields.jsx';
import { money, today } from '../lib/format.js';
import { useFactory } from '../hooks/useFactory.js';
import { useEffect, useState } from 'react';
import TransactionForm from '../components/TransactionForm.jsx';
import History from '../components/History.jsx';
import { useLanguage } from '../hooks/useLanguage';
import DateInput from '../components/DateInput.jsx';
import Alert from '../components/Alert.jsx';
import { fetchDailyExpenseSummary } from '../services/millApi.js';
import { errorMessage } from '../lib/format.js';
export default function ExpensesPage() {
  const { data, version } = useFactory();
  const { t } = useLanguage();
  const [date,setDate]=useState(today());
  const [summary,setSummary]=useState(null);
  const [error,setError]=useState('');
  useEffect(()=>{let active=true;fetchDailyExpenseSummary(date).then(value=>{if(active){setSummary(value);setError('');}}).catch(err=>{if(active)setError(errorMessage(err));});return()=>{active=false;};},[date,version]);
  return <div className="space-y-6"><PageHeading eyebrow="Factory expenses paid" title="Daily expenses" />
    <Card title="Daily expense total"><div className="mb-5 max-w-sm"><DateInput label="Date" value={date} onChange={setDate} required /></div><Alert>{error}</Alert>{summary&&<div className="grid gap-4 sm:grid-cols-3"><Stat label="Individual daily expenses" value={money(summary.daily)} /><Stat label="Allocated monthly expenses" value={money(summary.fixed)} /><Stat label="Total expenses for the day" value={money(summary.total)} /></div>}</Card>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{data.expenses.map(c=><Stat key={c.id} label={c.name} value={money(c.amount)} />)}</div><p className="text-xs leading-7 text-stone-500">{t("Purchase transport charges stay with purchases and are excluded here. Record other factory expenses separately.")}</p><TransactionForm kind="expense" /><History kind="expense" title="Individual daily expense records" expenseCategories={data.expense_categories} /></div>;
}
