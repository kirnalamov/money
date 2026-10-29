"use client";

import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n';
import { detectDefaultLanguage } from '@/lib/i18n';
import { useEffect, useSyncExternalStore } from 'react';

const subscribeToHydration = () => () => undefined;
const getClientHydrationSnapshot = () => true;
const getServerHydrationSnapshot = () => false;

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const mounted = useSyncExternalStore(
    subscribeToHydration,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot,
  );

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

  if (!mounted) {
     return <>{children}</>; 
     // На сервере и при первой загрузке рендерим с английским языком
     // чтобы избежать несоответствия гидратации
  }

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

