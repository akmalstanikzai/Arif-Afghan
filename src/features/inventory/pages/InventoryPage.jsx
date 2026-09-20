import { RawStockTable, ProductStockTable } from '../components/StockTables';
import { useState } from 'react';
import PageHeading from '../../../components/ui/PageHeading';
import { Card, Input, Stat } from '../../../components/ui/Fields';
import { useFactory } from '../../factory/hooks/useFactory';
import { weight } from '../../../lib/format';
import { useLanguage } from '../../../lib/i18n';
export default function InventoryPage() {
  const { data } = useFactory();
  const [search, setSearch] = useState('');
  const { t } = useLanguage();
  const sum = key => data.products.reduce((s,p)=>s+Number(p[key]),0);
  return <div className="space-y-6"><PageHeading eyebrow="موجودی محاسبه‌شده از اسناد" title="موجودی گدام" /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Stat label="مجموع برنج خام" value={weight(data.raw_stock.reduce((s,r)=>s+Number(r.quantity),0))} /><Stat label="برنج پروسس‌شده در گدام" value={weight(sum('physical'))} /><Stat label="برنج قابل فروش کارخانه" value={weight(sum('available'))} /><Stat label="برنج مشتریان منتظر تحویل" value={weight(sum('reserved'))} /></div><Card title="برنج خام"><RawStockTable rows={data.raw_stock} /></Card><Card title="برنج پروسس‌شده"><p className="mb-4 text-xs leading-7 text-stone-500">{t('موجودی فیزیکی = برنج قابل فروش کارخانه + برنج فروخته‌شدهٔ منتظر تحویل. موجودی از اسناد محاسبه می‌شود و دستی قابل تغییر نیست.')}</p><div className="mb-4 max-w-sm"><Input label="جستجوی محصول" value={search} onChange={setSearch} /></div><ProductStockTable rows={data.products.filter(p=>p.name.includes(search))} /></Card></div>;
}
