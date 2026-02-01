"use client";

import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n';
import { detectDefaultLanguage } from '@/lib/i18n';
import { useEffect, useState } from 'react';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // После монтирования определяем правильный язык и меняем его
    // Это происходит только на клиенте, избегая проблем с гидратацией
    const detectedLanguage = detectDefaultLanguage();
    if (detectedLanguage !== i18n.language) {
      i18n.changeLanguage(detectedLanguage);
    }
  }, []);

  if (!mounted) {
     return <>{children}</>; 
     // На сервере и при первой загрузке рендерим с английским языком
     // чтобы избежать несоответствия гидратации
  }

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

