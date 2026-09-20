import en from '../locales/en.json' with { type: 'json' };
import dari from '../locales/fa-AF.json' with { type: 'json' };
import pashto from '../locales/ps-AF.json' with { type: 'json' };

export const languages = {
  en: { name: 'English', direction: 'ltr', locale: 'en-US' },
  'fa-AF': { name: 'دری / فارسی', direction: 'rtl', locale: 'fa-AF' },
  'ps-AF': { name: 'پښتو', direction: 'rtl', locale: 'ps-AF' },
};
export const catalogs = { en, 'fa-AF': dari, 'ps-AF': pashto };
const storageKey = 'rice-factory-language';
const supported = value => Object.hasOwn(languages, value) ? value : 'fa-AF';
let currentLanguage = 'fa-AF';

export function translate(key, variables = {}, language = currentLanguage) {
  const message = catalogs[supported(language)][key] ?? en[key] ?? key ?? '';
  return message.replace(/\{(\w+)\}/g, (placeholder, name) =>
    Object.hasOwn(variables, name) ? String(variables[name]) : placeholder);
}

export const getLanguage = () => currentLanguage;
export function setCurrentLanguage(value) {
  currentLanguage = supported(value);
  if (typeof document !== 'undefined') {
    document.documentElement.lang = currentLanguage;
    document.documentElement.dir = languages[currentLanguage].direction;
  }
  try { globalThis.localStorage?.setItem(storageKey, currentLanguage); } catch { /* Storage may be disabled. */ }
  return currentLanguage;
}

// Initialize before rendering so dates and amounts use the selected language immediately.
let savedLanguage;
try { savedLanguage = globalThis.localStorage?.getItem(storageKey); } catch { /* Use the default. */ }
setCurrentLanguage(savedLanguage);
