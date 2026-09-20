import PageHeading from '../components/PageHeading.jsx';
import { Stat } from '../components/Fields.jsx';
import { money } from '../lib/format.js';
import { useFactory } from '../hooks/useFactory.js';
import TransactionForm from '../components/TransactionForm.jsx';
import History from '../components/History.jsx';
import { useLanguage } from '../hooks/useLanguage';
export default function ExpensesPage() {
  const { data } = useFactory();
  const { t } = useLanguage();
  return <div className="space-y-6"><PageHeading eyebrow="Factory expenses paid" title="Expenses" /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{data.expenses.map(c=><Stat key={c.id} label={c.name} value={money(c.amount)} />)}</div><p className="text-xs leading-7 text-stone-500">{t("Purchase transport charges stay with purchases and are excluded here. Record other factory expenses separately.")}</p><TransactionForm kind="expense" /><History kind="expense" title="Independent expense records" expenseCategories={data.expense_categories} /></div>;
}
