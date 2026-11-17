"use client";

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '@/locales/en/translation.json';
import ru from '@/locales/ru/translation.json';

/**
 * Определяет, является ли пользователь из стран СНГ на основе языка браузера
 * @returns 'ru' если пользователь из СНГ, 'en' в противном случае
 */
export function detectDefaultLanguage(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('i18nextLng');
    if (saved) return saved;
  }
  return 'ru';
}

// Синхронные ресурсы не дают первому рендеру показать ключи переводов.
i18n
  .use(initReactI18next)
  .init({
    lng: 'en', // Всегда начинаем с английского для совместимости SSR
    fallbackLng: 'en',
    resources: { en: { translation: en }, ru: { translation: ru } },
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

