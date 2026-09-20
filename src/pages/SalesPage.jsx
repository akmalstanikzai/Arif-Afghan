import PageHeading from '../components/PageHeading.jsx';
import TransactionForm from '../components/TransactionForm.jsx';
import History from '../components/History.jsx';
import { useLanguage } from '../hooks/useLanguage';
export default function SalesPage() {
  const { t } = useLanguage();
  return <div className="space-y-6"><PageHeading eyebrow="Sales, payments, and stock release" title="Sales and delivery" /><p className="rounded-lg bg-[#e9eedf] p-4 text-sm leading-8">{t("When a sale is recorded, ownership transfers to the customer and the rice is no longer available for sale. Physical inventory decreases only when delivery is recorded.")}</p><TransactionForm kind="sale" /><History kind="sale" title="Sales and remaining deliveries" /><History kind="delivery" title="Delivery history" /></div>;
}
