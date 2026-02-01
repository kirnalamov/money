"use client";

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import resourcesToBackend from 'i18next-resources-to-backend';

/**
 * Определяет, является ли пользователь из стран СНГ на основе языка браузера
 * @returns 'ru' если пользователь из СНГ, 'en' в противном случае
 */
export function detectDefaultLanguage(): string {
  // Always return 'en' to enforce English as default
  return 'en';
}

// Инициализируем всегда с английским, чтобы избежать проблем с гидратацией
// Язык будет изменён на клиенте после монтирования компонента
i18n
  .use(initReactI18next)
  .use(resourcesToBackend((language: string, namespace: string) => import(`@/locales/${language}/${namespace}.json`)))
  .init({
    lng: 'en', // Всегда начинаем с английского для совместимости SSR
    fallbackLng: 'en',
    ns: ['translation'],
    defaultNS: 'translation',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
    react: {
      useSuspense: true // This might cause hydration mismatch if not careful, but we'll wrap in provider
    }
  });

export default i18n;

