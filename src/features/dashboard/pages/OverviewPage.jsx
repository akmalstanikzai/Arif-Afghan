import PageHeading from '../../../components/ui/PageHeading';
import { Card, Stat, Table, secondaryClass } from '../../../components/ui/Fields';
import { getUserDisplayName } from '../../../lib/user';
import { money, weight, number, dateLabel, kindLabels } from '../../../lib/format';
import { useFactory } from '../../factory/hooks/useFactory';
import { RawStockTable, ProductStockTable } from '../../inventory/components/StockTables';
import { useLanguage } from '../../../lib/i18n';
export default function OverviewPage({ user, onNavigate }) {
  const { data } = useFactory();
  const { t } = useLanguage();
  const s = data.summary;
  const sum = key => data.products.reduce((a,p)=>a+Number(p[key]),0);
  const finances = [['مجموع خرید مواد خام',s.purchases],['مجموع فروش برنج',s.sales],['اجرت پروسس امانتی',s.service_charges],['نقد دریافتی از مشتریان',s.received],['قابل دریافت از مشتریان',s.receivable],['نقد پرداختی به تأمین‌کنندگان',s.supplier_paid],['قابل پرداخت به تأمین‌کنندگان',s.payable],['مجموع مصارف',s.expenses],['اجرت تسویه‌شده با برنج',s.rice_payment]];
  return <div className="space-y-6"><PageHeading eyebrow="نمای کلی فعالیت‌های کارخانه" title="صفحهٔ اصلی" />
    <section className="rounded-2xl border border-[#dee5d2] bg-[#e9eedf] p-7"><p className="text-xs text-[#59704c]">{t('کارخانهٔ برنج')}</p><h2 className="mt-3 text-3xl leading-relaxed">{t('خوش آمدید، {name}.', { name: getUserDisplayName(user) })}</h2><p className="mt-2 text-sm leading-8 text-[#708064]">{t('وضعیت موجودی، حساب‌ها و فعالیت‌های کارخانه در یک نگاه.')}</p><div className="mt-5 flex flex-wrap gap-2"><button className={secondaryClass} onClick={()=>onNavigate('purchases')}>{t('ثبت خرید')}</button><button className={secondaryClass} onClick={()=>onNavigate('processing')}>{t('ثبت پروسس')}</button><button className={secondaryClass} onClick={()=>onNavigate('sales')}>{t('ثبت فروش')}</button></div></section>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Stat label="مجموع موجودی خام" value={weight(data.raw_stock.reduce((a,r)=>a+Number(r.quantity),0))} /><Stat label="موجودی فیزیکی پروسس‌شده" value={weight(sum('physical'))} /><Stat label="موجودی قابل فروش" value={weight(sum('available'))} /><Stat label="برنج مشتری در گدام" value={weight(sum('reserved'))} /></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{finances.map(([label,value])=><Stat key={label} label={label} value={money(value)} />)}</div>
    <Card title="آمار پروسس کارخانه"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Stat label="دسته‌های پروسس" value={number(s.processing_count,0)} /><Stat label="وزن ورودی" value={weight(s.processing_input)} /><Stat label="محصول تولیدشده" value={weight(s.processing_output)} /><Stat label="ضایعات" value={weight(s.wastage)} /></div></Card>
    <Card title="آمار پروسس امانتی"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Stat label="دسته‌های امانتی" value={number(s.service_count,0)} /><Stat label="ورودی مشتریان" value={weight(s.service_input)} /><Stat label="خروجی مشتریان" value={weight(s.service_output)} /><Stat label="ضایعات امانتی" value={weight(s.service_wastage)} /></div></Card>
    <Card title="موجودی هر نوع برنج خام"><RawStockTable rows={data.raw_stock} /></Card>
    <Card title="موجودی هر محصول"><ProductStockTable rows={data.products} /></Card>
    <Card title="مصارف به تفکیک دسته"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{data.expenses.map(c=><Stat key={c.id} label={c.name} value={money(c.amount)} />)}</div></Card>
    <Card title="آخرین معاملات"><Table rows={data.recent} columns={[{key:'seq',label:'شماره',render:r=>number(r.seq,0)},{key:'date',label:'تاریخ',render:r=>dateLabel(r.date)},{key:'kind',label:'نوع سند',render:r=>`${t(kindLabels[r.kind])}${r.voided_at ? ` (${t('باطل')})` : ''}`},{key:'party_name',label:'شخص / محصول',render:r=>r.party_name||r.item_name||r.description||'—'},{key:'total',label:'مبلغ / وزن',render:r=>r.kind==='delivery'?weight(r.weight):money(r.total)}]} /></Card>
  </div>;
}
