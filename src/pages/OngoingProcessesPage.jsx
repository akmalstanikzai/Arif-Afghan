import { validateOutputPackaging } from '../lib/units.js';
import { useState } from 'react';
import PageHeading from '../components/PageHeading.jsx';
import DateInput from '../components/DateInput.jsx';
import ProcessingOutputs from '../components/ProcessingOutputs.jsx';
import Alert from '../components/Alert.jsx';
import { Card, Input, Notice, buttonClass, secondaryClass, Table } from '../components/Fields.jsx';
import { useFactory, useMutation } from '../hooks/useFactory.js';
import { useLanguage } from '../hooks/useLanguage';
import { dateLabel, money, numeric, today, weight } from '../lib/format.js';
import { isValidGregorian } from '../lib/calendar.js';
import { ActionForm, EntryDetails } from '../components/History.jsx';

function CompleteProcess({ process, onClose }) {
  const { data } = useFactory();
  const { t } = useLanguage();
  const mutation = useMutation();
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState('');
  const [outputs, setOutputs] = useState(() => data.products.filter(p => process.outputs?.some(o => o.product_id === p.id) || String(p.raw_type_id) === String(process.raw_type_id)).map(p => ({ product_id: p.id, weight: '', bag_size: 0, bag_mark: '' })));
  const total = outputs.reduce((sum, o) => sum + numeric(o.weight), 0);
  async function submit(event) {
    event.preventDefault();
    if (!isValidGregorian(date) || date < process.date) { mutation.setError('Completion date cannot be before the start date.'); return; }
    if (new Set(outputs.map(o=>o.product_id)).size !== 4 || outputs.some(o => !Number.isFinite(numeric(o.weight)) || numeric(o.weight) < 0) || total <= 0 || total > Number(process.weight)) { mutation.setError('Total output must be positive and no greater than input weight.'); return; }
    const packagingError=validateOutputPackaging(outputs);
    if(packagingError){mutation.setError(packagingError);return;}
    if (await mutation.save('processing_complete', { id: process.id, date, notes, outputs })) onClose();
  }
  return <Card title="Complete process"><form onSubmit={submit} noValidate><fieldset disabled={mutation.busy}>
    <div className="grid gap-4 sm:grid-cols-2"><DateInput label="Completion date" required value={date} onChange={setDate} /><Input label="Completion notes" value={notes} onChange={setNotes} maxLength={2000} /></div>
    <ProcessingOutputs products={data.products} outputs={outputs} onChange={setOutputs} />
    <p className="my-4 text-sm">{t('Input weight')}: {weight(process.weight)} · {t('Total output')}: {weight(total)} · {t('Waste')}: {weight(Number(process.weight) - total)}</p>
    <Alert>{mutation.error}</Alert><button className={buttonClass}>{mutation.busy ? t('Saving…') : t('Complete process')}</button><button type="button" className={`${secondaryClass} ms-3`} onClick={onClose}>{t('Cancel')}</button>
  </fieldset></form></Card>;
}

export default function OngoingProcessesPage() {
  const { data } = useFactory();
  const { t } = useLanguage();
  const [selected, setSelected] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const rows = data.ongoing_processes || [];
  const process = rows.find(row => row.id === selected);
  return <div className="space-y-6"><PageHeading title="Ongoing processes" eyebrow="Raw rice reserved for processing" />
    <Notice>{t('Raw rice is reserved at the start. Finished inventory is added only on completion.')}</Notice>
    <Table rows={rows} columns={[
      { key: 'seq', label: 'Record number' }, { key: 'date', label: 'Start date', render: r => dateLabel(r.date, r.date_solar_hijri) },
      { key: 'item_name', label: 'Raw rice type' }, { key: 'weight', label: 'Input weight', render: r => weight(r.weight) },
      { key: 'raw_cost', label: 'Raw material cost', render: r => money(r.raw_cost) }, { key: 'notes', label: 'Notes' },
      { key: 'actions', label: 'Actions', render: r => <div className="flex gap-2"><button className={secondaryClass} onClick={() => {setSelected(r.id);setDeleting(false);}}>{t('Details / complete')}</button><button className={`${secondaryClass} text-red-700`} onClick={() => {setSelected(r.id);setDeleting(true);}}>{t('Delete')}</button></div> },
    ]} />
    {process && (deleting ? <ActionForm action="delete" entry={process} onClose={() => {setSelected(null);setDeleting(false);}} /> : <><EntryDetails entry={process} /><CompleteProcess key={process.id} process={process} onClose={() => setSelected(null)} /></>)}
  </div>;
}
