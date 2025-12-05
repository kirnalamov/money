"use client";

import { useTranslation } from "react-i18next";

export default function LimitsPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">{t("limits.title")}</h2>
      <div className="border rounded-xl p-6 flex items-center justify-center text-muted-foreground">
        {t("limits.editor_placeholder")}
      </div>
    </div>
  );
}
