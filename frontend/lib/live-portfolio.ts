"use client";

import { useCallback, useMemo } from "react";
import { format } from "date-fns";
import { useStore } from "@/lib/store";
import { convertCurrency } from "@/lib/utils";
import { closeOnOrBefore } from "@/lib/moex";
import { useLivePrices, type LivePosition } from "@/components/portfolio/use-payouts";
import { useMarketExtras } from "@/components/portfolio/use-market-extras";

/**
 * Бумаги по живым ценам: облигации с ценой и НКД с биржи, стоимость сейчас и на любую дату
 * (по дневным ценам закрытия; до даты покупки бумага не учитывается).
 */
export function useLivePortfolioValue(accountId?: number) {
  const { positions: all, defaultCurrency } = useStore();
  const stored = useMemo(() => (accountId === undefined ? all : all.filter((p) => p.accountId === accountId)), [all, accountId]);
  const { livePositions, updatedAt, status, refresh } = useLivePrices(stored);
  const { bonds, history } = useMarketExtras(livePositions);

  const positions = useMemo<LivePosition[]>(
    () =>
      livePositions.map((p) => {
        const info = p.assetClass === "bond" ? bonds[p.symbol.toUpperCase()] : undefined;
        return info && info.currency === p.currency ? { ...p, currentPrice: info.price, accrued: info.accrued_interest, isLive: true } : p;
      }),
    [livePositions, bonds]
  );

  const value = useMemo(
    () => positions.reduce((s, p) => s + convertCurrency(p.quantity * p.currentPrice, p.currency, defaultCurrency), 0),
    [positions, defaultCurrency]
  );

  const valueAt = useCallback(
    (date: Date) => {
      const iso = format(date, "yyyy-MM-dd");
      let sum = 0;
      for (const p of positions) {
        const bought = p.purchaseDate ? p.purchaseDate.slice(0, 10) : "";
        if (bought && iso < bought) continue;
        const close = p.assetClass === "bond" ? null : closeOnOrBefore(history[p.symbol.toUpperCase()], iso);
        sum += convertCurrency(p.quantity * (close ?? p.currentPrice), p.currency, defaultCurrency);
      }
      return sum;
    },
    [positions, history, defaultCurrency]
  );

  return { value, valueAt, positions, history, bonds, updatedAt, status, refresh };
}
