import PageHeading from '../components/PageHeading.jsx';
import TransactionForm from '../components/TransactionForm.jsx';
import History from '../components/History.jsx';
export default function PurchasesPage() {
  return <div className="space-y-6"><PageHeading eyebrow="Factory raw materials" title="Raw rice purchases" /><TransactionForm kind="purchase" /><History kind="purchase" title="Purchase history" /></div>;
}
