import PageHeading from '../components/PageHeading.jsx';
import { Card, Stat } from '../components/Fields.jsx';
import { RawStockTable } from '../components/StockTables.jsx';
import { useFactory } from '../hooks/useFactory.js';
import { weight } from '../lib/format.js';
import History from '../components/History.jsx';
export default function RawInventoryPage() {
  const { data } = useFactory();
  return <div className="space-y-6"><PageHeading title="Raw material inventory" eyebrow="Inventory calculated from records" />
    <div className="grid gap-4 sm:grid-cols-2"><Stat label="Available raw rice" value={weight(data.raw_stock.reduce((s,r)=>s+Number(r.quantity),0))} /><Stat label="In process" value={weight(data.raw_stock.reduce((s,r)=>s+Number(r.in_process || 0),0))} /></div>
    <Card title="Raw rice"><RawStockTable rows={data.raw_stock} /></Card>
    <History kind="purchase" title="Raw material purchase records" />
  </div>;
}
