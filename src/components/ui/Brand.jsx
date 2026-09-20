import { useLanguage } from '../../lib/i18n';

export default function Brand({ workspace = false }) {
  const { t } = useLanguage();
  return (
    <a className="flex items-center gap-3 text-xs font-bold leading-7 text-inherit no-underline" href="/" aria-label={t('صفحهٔ اصلی کارخانهٔ برنج')}>
      <span className="text-[38px] leading-none text-brand-gold" aria-hidden="true">✳</span>
      <span>{t('کارخانهٔ برنج')}{workspace && <small className="mt-1.5 block text-[8px] font-normal leading-5 text-[#9eb3a6]">{t('سیستم مدیریت کارخانه')}</small>}</span>
    </a>
  );
}
