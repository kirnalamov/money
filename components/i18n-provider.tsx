"use client";

import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n';
import { useEffect, useState } from 'react';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
     return <>{children}</>; 
     // Or return a loading spinner to avoid flash of untranslated content.
     // But for SEO and simple hydration, rendering children is okay, 
     // though it might flash keys if we are not careful.
     // Since we set default to 'en' and hardcoded 'en' texts are replaced, 
     // it's better to wait or just use the provider.
  }

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

