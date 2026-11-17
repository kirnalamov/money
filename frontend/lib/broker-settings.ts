"use client";

import { useCallback } from "react";
import { usePref } from "@/lib/prefs";
import { useTaxSettings } from "@/components/portfolio/use-payouts";
import type { TaxSettings } from "@/lib/payouts";

type Stored = Record<string, Partial<TaxSettings>>;
const KEY = "plutus-broker-settings" as const;

/**
 * Налог и комиссия задаются для каждого брокерского счёта отдельно.
 * Если для счёта ничего не задано, берутся общие значения (по умолчанию 13% и 0,05%).
 */
export function useBrokerSettings() {
  const [stored, updateStored] = usePref<Stored>(KEY, {});
  const [global] = useTaxSettings();

  const settingsFor = useCallback(
    (accountId: number | undefined): TaxSettings => {
      const own = accountId !== undefined ? stored[String(accountId)] : undefined;
      return {
        taxPct: typeof own?.taxPct === "number" ? own.taxPct : global.taxPct,
        commissionPct: typeof own?.commissionPct === "number" ? own.commissionPct : global.commissionPct,
      };
    },
    [stored, global]
  );

  const save = useCallback(
    (accountId: number, value: TaxSettings) => {
      updateStored((prev) => ({ ...prev, [String(accountId)]: { taxPct: value.taxPct, commissionPct: value.commissionPct } }));
    },
    [updateStored]
  );

  const has = useCallback((accountId: number) => stored[String(accountId)] !== undefined, [stored]);

  return { settingsFor, save, has };
}
