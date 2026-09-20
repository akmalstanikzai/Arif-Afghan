import PageHeading from '../../../components/ui/PageHeading';
import TransactionForm from '../../factory/components/TransactionForm';
import History from '../../factory/components/History';
export default function PurchasesPage() {
  return <div className="space-y-6"><PageHeading eyebrow="مواد اولیهٔ کارخانه" title="خرید برنج خام" /><TransactionForm kind="purchase" /><History kind="purchase" title="سابقهٔ خریدها" /><History kind="payment" title="سابقهٔ پرداخت‌های نقدی" /></div>;
}
