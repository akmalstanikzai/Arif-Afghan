import { useState } from 'react';
import PageHeading from '../components/PageHeading.jsx';
import { Card, Input, Stat, Table, Field, fieldClass, secondaryClass } from '../components/Fields.jsx';
import { useFactory } from '../hooks/useFactory.js';
import { number, qualityLabels, summaryWeight, weight } from '../lib/format.js';
import { useLanguage } from '../hooks/useLanguage';
import { bagMarks, bagSizes } from '../lib/units.js';
import { emptyInventoryFilters, filterInventory } from '../services/inventory.js';

export default function InventoryPage() {
  const { data } = useFactory();
  const { t } = useLanguage();
  const [filters, setFilters] = useState(emptyInventoryFilters);
  const set = (key,value) => setFilters(old=>({...old,[key]:value}));
  const source = data.packaged_stock || data.products.map(p=>({...p,bag_size:0,bag_mark:''}));
  const rows = filterInventory(source,filters);
  const sum = key => rows.reduce((s,p)=>s+Number(p[key] || 0),0);
  const select = (label,key,options) => <Field label={label}>{id=><select id={id} className={fieldClass} value={filters[key]} onChange={e=>set(key,e.target.value)}>{options.map(([value,name])=><option key={value} value={value}>{name}</option>)}</select>}</Field>;
  return <div className="space-y-6"><PageHeading eyebrow="Inventory calculated from records" title="Processed inventory" />
    <Card title="Filter processed inventory"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Input label="Search products" value={filters.search} onChange={v=>set('search',v)} />
      {select('Raw rice type','raw',[['',t('All rice types')],...data.raw_stock.map(r=>[String(r.id),r.name])])}
      {select('Quality','quality',[['',t('All qualities')],...qualityLabels.map((q,i)=>[String(i+1),t(q)])])}
      {select('Bag size','size',[['',t('All sizes')],['0',t('Bulk / unpackaged')],...bagSizes.map(size=>[String(size),`${size} ${t('kg')}`])])}
      {select('Bag mark','mark',[['',t('All marks')],...bagMarks.map(mark=>[mark,mark])])}
      {select('Stock status','status',[['all',t('All stock')],['available',t('Available for sale')],['reserved',t('Awaiting delivery')],['empty',t('Out of stock')]])}
      {select('Sort by','sort',[['name',t('Product')],['available',t('Available quantity')],['physical',t('Physical inventory')]])}
      <div className="flex items-end"><button className={secondaryClass} onClick={()=>setFilters({...emptyInventoryFilters})}>{t('Clear filters')}</button></div>
    </div></Card>
    <p className="text-xs text-stone-500">{t('Totals below follow the selected filters.')} {number(rows.length,0)} {t('stock variants')}</p>
    <div className="grid gap-4 sm:grid-cols-3"><Stat label="Processed rice in storage" value={summaryWeight(sum('physical'))} /><Stat label="Factory rice available for sale" value={summaryWeight(sum('available'))} /><Stat label="Customer rice awaiting delivery" value={summaryWeight(sum('reserved'))} /></div>
    <Card title="Processed rice"><p className="mb-4 text-xs leading-7 text-stone-500">{t('Physical inventory = factory rice available for sale + sold rice awaiting delivery. Inventory is calculated from records and cannot be changed manually.')}</p>
      <Table rows={rows} columns={[
        {key:'name',label:'Product'}, {key:'quality',label:'Quality',render:r=>t(qualityLabels[Number(r.quality)-1] || '')},
        {key:'bag_size',label:'Bag size',render:r=>Number(r.bag_size)?`${r.bag_size} ${t('kg')}`:t('Bulk / unpackaged')}, {key:'bag_mark',label:'Bag mark',render:r=>r.bag_mark || '—'},
        {key:'available',label:'Available for sale',render:r=>weight(r.available)}, {key:'tons',label:'tons',render:r=>number(Number(r.available)/1000,6)},
        {key:'bags',label:'Bag equivalents',render:r=>Number(r.bag_size)?number(Number(r.available)/Number(r.bag_size),6):'—'},
        {key:'reserved',label:'Awaiting delivery',render:r=>weight(r.reserved)}, {key:'physical',label:'Physical inventory',render:r=>weight(r.physical)},
      ]} />
    </Card>
  </div>;
}
