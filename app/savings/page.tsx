"use client";

import { useTranslation } from "react-i18next";

export default function SavingsPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">{t("savings.title")}</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="border rounded-xl p-6 h-64 flex items-center justify-center text-muted-foreground">{t("savings.accounts_placeholder")}</div>
        <div className="border rounded-xl p-6 h-64 flex items-center justify-center text-muted-foreground">{t("savings.goals_placeholder")}</div>
      </div>
    </div>
  );
}
