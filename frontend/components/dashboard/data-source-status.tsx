"use client";

import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DataSource, useStore } from "@/lib/store";

const sourceLinks: Array<{ key: DataSource; href: string; labelKey: string }> = [
  { key: "accounts", href: "/accounts", labelKey: "common.accounts" },
  { key: "transactions", href: "/transactions", labelKey: "common.transactions" },
  { key: "goals", href: "/savings", labelKey: "common.savings" },
  { key: "categories", href: "/settings", labelKey: "dashboard.data_status.categories" },
  { key: "tags", href: "/settings", labelKey: "dashboard.data_status.tags" },
];

export function DashboardDataSourceStatus() {
  const { t } = useTranslation();
  const { dataErrors, fetchAllData } = useStore();
  const failedSources = sourceLinks.filter((source) => dataErrors[source.key]);

  if (failedSources.length === 0) return null;

  return (
    <Alert variant="destructive">
      <AlertTitle>{t("dashboard.data_status.title")}</AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        <p>{t("dashboard.data_status.description")}</p>
        <div className="flex flex-wrap items-center gap-2">
          {failedSources.map((source) => (
            <Button key={source.key} variant="outline" size="sm" asChild>
              <Link href={source.href}>{t(source.labelKey)}</Link>
            </Button>
          ))}
          <Button variant="outline" size="sm" onClick={() => void fetchAllData()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t("common.retry")}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
