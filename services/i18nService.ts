import { useLanguage } from '../contexts/LanguageContext.tsx';
import { documentationContent } from './documentationContent';
import { uiTranslations } from './uiTranslations';
import { useCallback } from 'react';

// Helper to navigate nested object paths
const getNestedTranslation = (obj: any, path: string): string | undefined => {
    return path.split('.').reduce((o, key) => (o && o[key] !== undefined ? o[key] : undefined), obj);
}

export const useTranslation = () => {
    const { language, setLanguage } = useLanguage();

    const t = useCallback((key: string): any => {
        // Try UI translations first
        const uiTranslation = getNestedTranslation(uiTranslations[language], key);
        if (uiTranslation !== undefined) {
            return uiTranslation;
        }

        // Fallback to documentation content
        const docTranslation = getNestedTranslation(documentationContent[language], key);
        
        if (docTranslation === undefined) {
             console.warn(`[i18n] Translation not found for key: "${key}" in language "${language}". Falling back to English.`);
             // Fallback to English for both
             const fallbackUi = getNestedTranslation(uiTranslations['en'], key);
             if (fallbackUi !== undefined) return fallbackUi;
             
             const fallbackDoc = getNestedTranslation(documentationContent['en'], key);
             if(fallbackDoc !== undefined) return fallbackDoc;

             return key; // Return key if no translation is found at all
        }
        
        return docTranslation;
    }, [language]);

    return { t, setLanguage, language };
};