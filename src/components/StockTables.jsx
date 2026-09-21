import { Table } from './Fields.jsx';
import { money, weight } from '../lib/format.js';
export function RawStockTable({ rows }) {
  return <Table rows={rows} columns={[{key:'name',label:"Raw rice type"},{key:'in_process',label:"In process",render:r=>weight(r.in_process || 0)},{key:'quantity',label:"Available raw rice",render:r=>weight(r.quantity)},{key:'purchase_price_per_kg',label:"Purchase price per kg",render:r=>money(r.purchase_price_per_kg)},{key:'value',label:"Inventory value",render:r=>money(r.value)},{key:'average_cost',label:"Average landed cost per kg",render:r=>money(r.average_cost)}]} />;
}
export function ProductStockTable({ rows }) {
  return <Table rows={rows} columns={[{key:'name',label:"Product"},{key:'produced',label:"Factory production",render:r=>weight(r.produced)},{key:'service_received',label:"Service received in rice",render:r=>weight(r.service_received)},{key:'sold',label:"Sold",render:r=>weight(r.sold)},{key:'delivered',label:"Delivered",render:r=>weight(r.delivered)},{key:'reserved',label:"Customer-owned in storage",render:r=>weight(r.reserved)},{key:'available',label:"Available for sale",render:r=><strong className="text-brand">{weight(r.available)}</strong>},{key:'physical',label:"Physical inventory",render:r=>weight(r.physical)}]} />;
}
