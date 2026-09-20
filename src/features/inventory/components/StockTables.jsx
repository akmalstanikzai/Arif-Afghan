import { Table } from '../../../components/ui/Fields';
import { money, weight } from '../../../lib/format';
export function RawStockTable({ rows }) {
  return <Table rows={rows} columns={[{key:'name',label:'نوع برنج خام'},{key:'quantity',label:'موجودی',render:r=>weight(r.quantity)},{key:'value',label:'ارزش موجودی',render:r=>money(r.value)},{key:'average_cost',label:'میانگین قیمت فی کیلو',render:r=>money(r.average_cost)}]} />;
}
export function ProductStockTable({ rows }) {
  return <Table rows={rows} columns={[{key:'name',label:'محصول'},{key:'produced',label:'تولید کارخانه',render:r=>weight(r.produced)},{key:'service_received',label:'اجرت دریافتی با برنج',render:r=>weight(r.service_received)},{key:'sold',label:'فروخته‌شده',render:r=>weight(r.sold)},{key:'delivered',label:'تحویل‌شده',render:r=>weight(r.delivered)},{key:'reserved',label:'متعلق به مشتری در گدام',render:r=>weight(r.reserved)},{key:'available',label:'قابل فروش',render:r=><strong className="text-brand">{weight(r.available)}</strong>},{key:'physical',label:'موجودی فیزیکی',render:r=>weight(r.physical)}]} />;
}
