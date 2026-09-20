import PageHeading from '../../../components/ui/PageHeading';
import { Stat } from '../../../components/ui/Fields';
import { money } from '../../../lib/format';
import { useFactory } from '../../factory/hooks/useFactory';
import TransactionForm from '../../factory/components/TransactionForm';
import History from '../../factory/components/History';
import { useLanguage } from '../../../lib/i18n';
export default function ExpensesPage() {
  const { data } = useFactory();
  const { t } = useLanguage();
  return <div className="space-y-6"><PageHeading eyebrow="هزینه‌های پرداخت‌شدهٔ کارخانه" title="مصارف" /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{data.expenses.map(c=><Stat key={c.id} label={c.name} value={money(c.amount)} />)}</div><p className="text-xs leading-7 text-stone-500">{t('مجموع ترانسپورت شامل مصارف ثبت‌شده همراه خرید است. مصارف پروسس از دسته‌های پروسس محاسبه می‌شوند؛ این موارد را دوباره ثبت نکنید.')}</p><TransactionForm kind="expense" /><History kind="expense" title="اسناد مصارف مستقل" expenseCategories={data.expense_categories} /></div>;
}
