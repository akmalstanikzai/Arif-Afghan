import { useLanguage } from '../hooks/useLanguage';

export default function Brand({ workspace = false }) {
  const { t } = useLanguage();
  return (
    <a className="flex items-center gap-3 text-xs font-bold leading-7 text-inherit no-underline" href="/" aria-label={t("Rice factory home")}>
      <span className="text-[38px] leading-none text-brand-gold" aria-hidden="true">✳</span>
      <span>{t("Rice Factory")}{workspace && <small className="mt-1.5 block text-[8px] font-normal leading-5 text-[#9eb3a6]">{t("Factory management system")}</small>}</span>
    </a>
  );
}
