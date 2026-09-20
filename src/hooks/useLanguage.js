import { useContext } from 'react';
import { LanguageContext } from '../providers/LanguageContext';
export const useLanguage = () => useContext(LanguageContext);
