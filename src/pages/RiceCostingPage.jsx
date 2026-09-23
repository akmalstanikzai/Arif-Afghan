import { useEffect, useMemo, useState } from 'react';
import Alert from '../components/Alert.jsx';
import DateInput from '../components/DateInput.jsx';
import PageHeading from '../components/PageHeading.jsx';
import { Card, Field, Input, Stat, Table, fieldClass } from '../components/Fields.jsx';
import { useFactory } from '../hooks/useFactory.js';
import { useLanguage } from '../hooks/useLanguage.js';
import { dateLabel, errorMessage, money, number, qualityLabels, today, weight } from '../lib/format.js';
import { fetchRiceCostReport } from '../services/millApi.js';
import { calculateRiceCosts } from '../services/calculations.js';

const initialAllocation = [50, 25, 15, 10];
const periods = [['day','Day'],['week','Week'],['month','Month'],['year','Year']];

export default function RiceCostingPage() {
  const { version } = useFactory();
  const { t } = useLanguage();
  const [date, setDate] = useState(today());
  const [period, setPeriod] = useState('month');
  const [allocation, setAllocation] = useState(initialAllocation);
  const [rawTypeId, setRawTypeId] = useState('');
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetchRiceCostReport(date, period).then(value => { if (active) { setReport(value); setError(''); } }).catch(err => { if (active) setError(errorMessage(err)); });
    return () => { active = false; };
  }, [date, period, version]);

  const rawTypes = useMemo(() => [...new Map((report?.rows || []).map(row => [String(row.raw_type_id), { id:String(row.raw_type_id), name:row.raw_name }])).values()], [report]);
  const selectedRawTypeId = rawTypeId && rawTypes.some(type => type.id === rawTypeId) ? rawTypeId : (rawTypes[0]?.id || '');
  const totalAllocation = allocation.reduce((sum, value) => sum + (Number(value) || 0), 0);
  const allocationValid = Math.abs(totalAllocation - 100) < 0.001 && allocation.every(value => Number(value) >= 0);
  const calculated = useMemo(() => calculateRiceCosts(report, allocation, selectedRawTypeId), [report, allocation, selectedRawTypeId]);
  const { qualityTotals, rows } = calculated;
  const amount = value => value == null ? '—' : money(value);

  return <div className="space-y-6">
    <PageHeading eyebrow="Raw material price plus all factory expenses" title="Rice cost calculator" />
    <Card title="Costing period">
      <div className="grid gap-4 md:grid-cols-2">
        <DateInput label="Report date" value={date} onChange={setDate} required />
        <Field label="Period">{id => <select id={id} className={fieldClass} value={period} onChange={event => setPeriod(event.target.value)}>{periods.map(([value,label]) => <option key={value} value={value}>{t(label)}</option>)}</select>}</Field>
      </div>
      {report && <p className="mt-4 text-xs text-stone-500">{t('Included dates: {start} to {end}', { start: dateLabel(report.start_date, report.start_solar_date), end: dateLabel(report.end_date, report.end_solar_date) })}</p>}
    </Card>
    <Alert>{error}</Alert>
    {report && <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Total expenses" value={money(report.total_expenses)} note={t('Includes daily expenses, salaries, and electricity.')} />
        <Stat label="Average expense per day" value={money(report.average_daily_expense)} note={t('{days} calendar days', { days: number(report.days, 0) })} />
        <Stat label="Processed output" value={weight(report.total_output_weight)} note={t('Factory-owned processing completed in this period')} />
      </div>
      <Card title="Allocate expenses by rice type and quality">
        <p className="mb-5 text-sm leading-7 text-stone-600">{t('Choose a rice type, then assign all expenses across its four qualities. Each share is divided by the kilograms produced for that rice type and quality during the selected period.')}</p>
        <div className="mb-5 max-w-sm"><Field label="Raw rice type">{id => <select id={id} className={fieldClass} value={selectedRawTypeId} onChange={event => setRawTypeId(event.target.value)}>{rawTypes.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}</select>}</Field></div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{qualityLabels.map((quality,index) => <Input key={quality} type="number" min="0" max="100" step="0.01" label={`${t(quality)} (%)`} value={allocation[index]} onChange={value => setAllocation(old => old.map((item,i) => i === index ? value : item))} hint={t('Output: {weight}', { weight: weight(qualityTotals[index]) })} />)}</div>
        <p className={`mt-4 text-sm font-semibold ${allocationValid ? 'text-emerald-700' : 'text-red-700'}`}>{t('Allocated: {percent}%', { percent: number(totalAllocation) })} {!allocationValid && `— ${t('The allocation must total 100%.')}`}</p>
      </Card>
      <Card title="Estimated cost per kilogram">
        <p className="mb-5 text-xs leading-7 text-stone-500">{t('Raw price is the weighted average landed purchase price in the selected period. Final cost equals raw price plus the allocated expense per kilogram.')}</p>
        <Table rows={rows} rowKey={row => row.product_id} columns={[
          { key:'raw_name', label:'Raw rice type' },
          { key:'quality', label:'Quality', render: row => t(qualityLabels[Number(row.quality)-1]) },
          { key:'raw_price', label:'Average raw price / kg', render: row => amount(row.raw_price) },
          { key:'output_weight', label:'Produced weight', render: row => weight(row.output_weight) },
          { key:'allocation', label:'Expense allocation', render: row => `${number(allocation[Number(row.quality)-1])}%` },
          { key:'expense_per_kg', label:'Expense / kg', render: row => amount(row.expense_per_kg) },
          { key:'final_cost', label:'Estimated cost / kg', render: row => <strong className="text-brand">{amount(row.final_cost)}</strong> },
        ]} />
        <p className="mt-4 text-xs leading-7 text-stone-500">{t('A dash means this period has no purchase price or no produced weight for that calculation.')}</p>
      </Card>
    </>}
  </div>;
}
