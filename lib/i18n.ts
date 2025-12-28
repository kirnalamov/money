"use client";

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import resourcesToBackend from 'i18next-resources-to-backend';

/**
 * Определяет, является ли пользователь из стран СНГ на основе языка браузера
 * @returns 'ru' если пользователь из СНГ, 'en' в противном случае
 */
export function detectDefaultLanguage(): string {
  // Проверяем, доступен ли navigator (только в браузере)
  if (typeof window === 'undefined' || !navigator) {
    return 'en';
  }

  // Получаем языки браузера
  const browserLanguages = navigator.languages || [navigator.language];
  
  // Коды языков стран СНГ
  const cisLanguageCodes = [
    'ru',      // Русский (Россия, Беларусь, Казахстан и др.)
    'be',      // Белорусский
    'kk',      // Казахский
    'ky',      // Киргизский
    'uk',      // Украинский
    'uz',      // Узбекский
    'hy',      // Армянский
    'az',      // Азербайджанский
    'tg',      // Таджикский
    'tk',      // Туркменский
    'ro',      // Румынский (Молдова)
  ];

  // Проверяем каждый язык браузера
  for (const lang of browserLanguages) {
    // Извлекаем базовый код языка (например, 'ru' из 'ru-RU')
    const baseLang = lang.toLowerCase().split('-')[0];
    
    // Если язык начинается с кода СНГ, возвращаем русский
    if (cisLanguageCodes.includes(baseLang)) {
      return 'ru';
    }
  }

  // По умолчанию английский
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

