import { useLanguage } from '../../lib/i18n';

export default function LanguageSwitcher({ className = '' }) {
  const { language, setLanguage, t } = useLanguage();
  const next = language === 'en' ? 'fa-AF' : 'en';
  return <button type="button" className={className} onClick={() => setLanguage(next)} aria-label={t(next === 'en' ? 'نمایش زبان انگلیسی' : 'نمایش زبان دری')} title={t(next === 'en' ? 'نمایش زبان انگلیسی' : 'نمایش زبان دری')}>
    {next === 'en' ? 'English' : 'دری'}
  </button>;
}
