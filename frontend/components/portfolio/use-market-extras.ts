"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchBondInfo, fetchHistory, type BondInfo, type DailyClose } from "@/lib/moex";
import { hintFor } from "@/lib/ticker";
import type { Position } from "@/types";

/** Данные облигаций (цена, НКД) и дневная история цен для расчёта изменения за период. */
export function useMarketExtras(positions: Position[]) {
  const [bonds, setBonds] = useState<Record<string, BondInfo>>({});
  const [history, setHistory] = useState<Record<string, DailyClose[]>>({});

  const bondIds = useMemo(
    () => Array.from(new Set(positions.filter((p) => p.assetClass === "bond").map((p) => p.symbol.toUpperCase()))).sort(),
    [positions]
  );
  const histItems = useMemo(() => {
    const m = new Map<string, "moex" | "global" | "crypto">();
    positions.forEach((p) => {
      if (p.assetClass === "bond" || p.assetClass === "cash") return;
      m.set(p.symbol.toUpperCase(), hintFor(p));
    });
    return Array.from(m.entries()).map(([symbol, hint]) => ({ symbol, hint }));
  }, [positions]);

  const bondSig = bondIds.join(",");
  const histSig = histItems.map((i) => `${i.symbol}:${i.hint}`).join(",");

  useEffect(() => {
    if (!bondIds.length) { setBonds({}); return; }
    let alive = true;
    const load = async () => {
      const rows = await Promise.all(bondIds.map((id) => fetchBondInfo(id)));
      if (!alive) return;
      const next: Record<string, BondInfo> = {};
      rows.forEach((row, i) => { if (row) next[bondIds[i]] = row; });
      setBonds(next);
    };
    void load();
    const timer = setInterval(load, 10 * 60_000);
    return () => { alive = false; clearInterval(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bondSig]);

  useEffect(() => {
    if (!histItems.length) { setHistory({}); return; }
    let alive = true;
    void fetchHistory(histItems).then((h) => { if (alive) setHistory(h); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [histSig]);

  return { bonds, history };
}
