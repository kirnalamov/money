"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { convertCurrency } from "@/lib/utils";
import { useLivePrices } from "@/components/portfolio/use-payouts";

/** Рыночная стоимость бумаг по живым ценам (обновляется раз в минуту) в валюте отображения. */
export function useLivePortfolioValue() {
  const { positions, defaultCurrency } = useStore();
  const { livePositions, updatedAt, status } = useLivePrices(positions);
  const value = useMemo(
    () => livePositions.reduce((s, p) => s + convertCurrency(p.quantity * p.currentPrice, p.currency, defaultCurrency), 0),
    [livePositions, defaultCurrency]
  );
  return { value, livePositions, updatedAt, status };
}
