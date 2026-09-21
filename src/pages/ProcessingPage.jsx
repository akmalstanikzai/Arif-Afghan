import PageHeading from '../components/PageHeading.jsx';
import TransactionForm from '../components/TransactionForm.jsx';
import History from '../components/History.jsx';
import ContractProcessForm from '../components/ContractProcessForm.jsx';
export default function ProcessingPage({ service = false, onStarted }) {
  const kind = service ? 'service' : 'processing';
  return <div className="space-y-6"><PageHeading eyebrow={service ? "Customer-owned rice" : "Turning raw materials into products"} title={service ? "Contract processing" : "Rice processing"} />{service ? <ContractProcessForm onSaved={onStarted} /> : <TransactionForm kind={kind} onSaved={onStarted} />}<History kind={kind} /></div>;
}
