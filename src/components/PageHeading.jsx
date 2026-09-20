import { useLanguage } from '../hooks/useLanguage';

export default function PageHeading({ eyebrow, title, children }) {
  const { t } = useLanguage();
  return (
    <div className="mb-7 flex items-start justify-between gap-5 md:items-center">
      <div>
        <span className="text-[9px] font-bold tracking-[1.5px] text-[#84917c]">{t(eyebrow)}</span>
        <h1 className="mt-2 text-[28px] font-medium tracking-tight">{t(title)}</h1>
      </div>
      {children}
    </div>
  );
}
