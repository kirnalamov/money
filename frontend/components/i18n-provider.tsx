"use client";

import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n';
import { detectDefaultLanguage } from '@/lib/i18n';
import { useEffect } from 'react';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // После монтирования определяем правильный язык и меняем его
    // Это происходит только на клиенте, избегая проблем с гидратацией
    const detectedLanguage = detectDefaultLanguage();
    if (detectedLanguage !== i18n.language) {
      i18n.changeLanguage(detectedLanguage);
    }

    const syncDocumentLanguage = (language: string) => {
      document.documentElement.lang = language.startsWith("ru") ? "ru" : "en";
    };

    syncDocumentLanguage(i18n.language);
    i18n.on("languageChanged", syncDocumentLanguage);

    return () => {
      i18n.off("languageChanged", syncDocumentLanguage);
    };
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

