import PageHeading from '../../../components/ui/PageHeading';
import TransactionForm from '../../factory/components/TransactionForm';
import History from '../../factory/components/History';
import { useLanguage } from '../../../lib/i18n';
export default function SalesPage() {
  const { t } = useLanguage();
  return <div className="space-y-6"><PageHeading eyebrow="فروش، دریافت پول و خروج از گدام" title="فروش و تحویل" /><p className="rounded-lg bg-[#e9eedf] p-4 text-sm leading-8">{t('با ثبت فروش، مالکیت برنج به مشتری انتقال می‌یابد و دیگر قابل فروش نیست. موجودی فیزیکی تنها هنگام ثبت تحویل کم می‌شود.')}</p><TransactionForm kind="sale" /><History kind="sale" title="فروش‌ها و تحویل باقی‌مانده" /><History kind="delivery" title="سابقهٔ تحویل‌ها" /></div>;
}
