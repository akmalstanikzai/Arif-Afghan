import { useLanguage } from '../hooks/useLanguage';
import { languages } from '../lib/translations';
export default function LanguageSwitcher({ className = '' }) {
  const { language, setLanguage, t } = useLanguage();
  return <select className={className} value={language} onChange={event => setLanguage(event.target.value)} aria-label={t('Interface language')} dir="auto">
    {Object.entries(languages).map(([code, item]) => <option key={code} value={code} lang={code}>{item.name}</option>)}
  </select>;
}
