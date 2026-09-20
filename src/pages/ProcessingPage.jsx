import PageHeading from '../components/PageHeading.jsx';
import TransactionForm from '../components/TransactionForm.jsx';
import History from '../components/History.jsx';
export default function ProcessingPage({ service = false, onStarted }) {
  const kind = service ? 'service' : 'processing';
  return <div className="space-y-6"><PageHeading eyebrow={service ? "Customer-owned rice" : "Turning raw materials into products"} title={service ? "Contract processing" : "Rice processing"} /><TransactionForm kind={kind} onSaved={service ? undefined : onStarted} /><History kind={kind} /></div>;
}
