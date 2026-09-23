import PageHeading from '../components/PageHeading.jsx';
import { Card, Stat, Table, secondaryClass } from '../components/Fields.jsx';
import { getUserDisplayName } from '../lib/user.js';
import { money, weight, summaryWeight, number, dateLabel, kindLabels } from '../lib/format.js';
import { useFactory } from '../hooks/useFactory.js';
import { RawStockTable, ProductStockTable } from '../components/StockTables.jsx';
import { useLanguage } from '../hooks/useLanguage';
export default function OverviewPage({ user, onNavigate }) {
  const { data } = useFactory();
  const { t } = useLanguage();
  const s = data.summary;
  const sum = key => data.products.reduce((a,p)=>a+Number(p[key]),0);
  const finances = [["Total raw material purchases",s.purchases],["Total rice sales",s.sales],["Contract processing charges",s.service_charges],["Cash received from customers",s.received],["Receivable from customers",s.receivable],["Cash paid to suppliers",s.supplier_paid],["Payable to suppliers",s.payable],["Total expenses",s.expenses],["Service charge settled with rice",s.rice_payment]];
  return <div className="space-y-6"><PageHeading eyebrow="Factory activity overview" title="Overview" />
    <section className="rounded-2xl border border-[#dee5d2] bg-[#e9eedf] p-7"><p className="text-xs text-[#59704c]">{t("Rice Factory")}</p><h2 className="mt-3 text-3xl leading-relaxed">{t("Welcome, {name}.", { name: getUserDisplayName(user) })}</h2><p className="mt-2 text-sm leading-8 text-[#708064]">{t("Inventory, accounts, and factory activity at a glance.")}</p><div className="mt-5 flex flex-wrap gap-2"><button className={secondaryClass} onClick={()=>onNavigate('purchases')}>{t("Record purchase")}</button><button className={secondaryClass} onClick={()=>onNavigate('processing')}>{t("Record processing")}</button><button className={secondaryClass} onClick={()=>onNavigate('sales')}>{t("Record sale")}</button></div></section>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Stat label="Total raw inventory" value={summaryWeight(data.raw_stock.reduce((a,r)=>a+Number(r.quantity),0))} /><Stat label="Processed physical inventory" value={summaryWeight(sum('physical'))} /><Stat label="Available inventory" value={summaryWeight(sum('available'))} /><Stat label="Customer rice in storage" value={summaryWeight(sum('reserved'))} /></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{finances.map(([label,value])=><Stat key={label} label={label} value={money(value)} />)}</div>
    <Card title="Factory processing statistics"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Stat label="Processing batches" value={number(s.processing_count,0)} /><Stat label="Input weight" value={summaryWeight(s.processing_input)} /><Stat label="Produced product" value={summaryWeight(s.processing_output)} /><Stat label="Waste" value={summaryWeight(s.wastage)} /></div></Card>
    <Card title="Contract processing statistics"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Stat label="Contract batches" value={number(s.service_count,0)} /><Stat label="Customer input" value={summaryWeight(s.service_input)} /><Stat label="Customer output" value={summaryWeight(s.service_output)} /><Stat label="Contract waste" value={summaryWeight(s.service_wastage)} /></div></Card>
    <Card title="Inventory by raw rice type"><RawStockTable rows={data.raw_stock} /></Card>
    <Card title="Inventory by product"><ProductStockTable rows={data.products} /></Card>
    <Card title="Expenses by category"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{data.expenses.map(c=><Stat key={c.id} label={c.name} value={money(c.amount)} />)}</div></Card>
    <Card title="Recent transactions"><Table rows={data.recent.filter(r=>!r.voided_at)} columns={[{key:'seq',label:"Number",render:r=>number(r.seq,0)},{key:'date',label:"Date",render:r=>dateLabel(r.date, r.date_solar_hijri)},{key:'kind',label:"Record type",render:r=>t(kindLabels[r.kind])},{key:'party_name',label:"Party / product",render:r=>r.party_name||r.item_name||r.description||'—'},{key:'total',label:"Amount / weight",render:r=>r.kind==='delivery'?weight(r.weight):money(r.total)}]} /></Card>
  </div>;
}
