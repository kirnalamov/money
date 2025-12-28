"use client"

import { ModeToggle } from "@/components/mode-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { CurrencyToggle } from "@/components/currency-toggle";
import { useTranslation } from "react-i18next";

export default function SettingsPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold tracking-tight">{t('settings.title')}</h2>
      
      <div className="space-y-4">
        <div className="rounded-xl border bg-card p-6">
          <h3 className="text-lg font-medium mb-4">{t('settings.appearance')}</h3>
          <div className="flex items-center justify-between">
            <span>{t('settings.theme_mode')}</span>
            <ModeToggle />
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6">
          <h3 className="text-lg font-medium mb-4">{t('settings.language')}</h3>
          <div className="flex items-center justify-between">
            <span>{t('settings.interface_language')}</span>
            <LanguageToggle />
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6">
          <h3 className="text-lg font-medium mb-4">{t('settings.currency')}</h3>
          <div className="flex items-center justify-between">
            <span>{t('settings.default_currency')}</span>
            <CurrencyToggle />
          </div>
        </div>
      </div>
    </div>
  );
}
