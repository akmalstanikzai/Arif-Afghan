import { useMemo, useState } from 'react';
import { getLanguage, setCurrentLanguage, translate, languages } from '../lib/translations.js';
import { LanguageContext } from './LanguageContext.js';
export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getLanguage);
  const value = useMemo(() => ({
    language,
    direction: languages[language].direction,
    setLanguage: next => setLanguageState(setCurrentLanguage(next)),
    t: (key, vars) => translate(key, vars, language),
  }), [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
