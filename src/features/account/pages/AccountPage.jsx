import PageHeading from '../../../components/ui/PageHeading';
import { getUserDisplayName } from '../../../lib/user';
import { useLanguage } from '../../../lib/i18n';

export default function AccountPage({ user }) {
  const name = getUserDisplayName(user);
  const { t } = useLanguage();
  const details = [
    { label: 'آدرس ایمیل', value: user.email || t('ثبت نشده') },
    { label: 'تاریخ ایجاد حساب', value: user.created_at ? new Date(user.created_at).toLocaleDateString(document.documentElement.lang === 'en' ? 'en-US' : 'fa-AF-u-ca-gregory') : t('موجود نیست') },
  ];

  return (
    <>
      <PageHeading eyebrow="مشخصات حساب کاربری" title="حساب من" />
      <section className="max-w-[680px] rounded-xl border border-line bg-white p-8">
        <span className="mb-5 grid size-14 place-items-center rounded-full bg-[#e9eedf] text-[22px] font-semibold text-[#59704c]">{name.charAt(0).toUpperCase()}</span>
        <h2 className="text-[22px] font-semibold wrap-anywhere">{name}</h2>
        <p className="mt-3 text-[13px] leading-relaxed text-[#7e8877]">{t('مشخصات حسابی که با آن وارد شده‌اید.')}</p>
        <dl className="mt-8">
          {details.map(detail => <div key={detail.label} className="border-t border-line py-4"><dt className="mb-2 text-[11px] text-[#7e8877]">{detail.label}</dt><dd className="wrap-anywhere">{detail.value}</dd></div>)}
        </dl>
        <p className="mt-6 text-xs leading-relaxed text-[#7e8877]">{t('برای تغییر مشخصات یا کمک در رمز عبور، با مدیر کارخانه تماس بگیرید.')}</p>
      </section>
    </>
  );
}
