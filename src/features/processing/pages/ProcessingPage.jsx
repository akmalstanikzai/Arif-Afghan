import PageHeading from '../../../components/ui/PageHeading';
import TransactionForm from '../../factory/components/TransactionForm';
import History from '../../factory/components/History';
export default function ProcessingPage({ service = false }) {
  const kind = service ? 'service' : 'processing';
  return <div className="space-y-6"><PageHeading eyebrow={service ? 'برنج متعلق به مشتری' : 'تبدیل مواد اولیه به محصول'} title={service ? 'پروسس امانتی' : 'پروسس برنج'} /><TransactionForm kind={kind} /><History kind={kind} /></div>;
}
