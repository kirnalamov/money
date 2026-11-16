"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Position } from "@/types";
import {
  fetchMoexPayouts,
  fetchUsDividends,
  fetchLivePrices,
  LiveQuote,
  MoexPayout,
  PriceHint,
} from "@/lib/moex";
import { convertCurrency } from "@/lib/utils";
import { DEFAULT_TAX, PayoutData, TaxSettings } from "@/lib/payouts";

const TTL = 6 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; payouts: MoexPayout[] }>();

/** История выплат по каждой бумаге портфеля (МосБиржа/Smart-Lab для ₽, Yahoo для остальных) */
export function usePayouts(positions: Position[]) {
  const targets = useMemo(() => {
    const m = new Map<string, { symbol: string; currency: string }>();
    positions.forEach((p) => {
      const cls = p.assetClass || "stock";
      if (cls !== "stock" && cls !== "etf" && cls !== "bond") return;
      const s = p.symbol.toUpperCase();
      if (!/^[A-Z0-9.\-]{1,14}$/.test(s)) return;
      m.set(s, { symbol: s, currency: p.currency });
    });
    return Array.from(m.values());
  }, [positions]);

  const sig = targets.map((t) => `${t.symbol}:${t.currency}`).join(",");
  const [data, setData] = useState<PayoutData>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let dead = false;
    if (!targets.length) {
      setData({});
      return;
    }
    setLoading(true);
    Promise.all(
      targets.map(async (t) => {
        const k = `${t.symbol}:${t.currency}`;
        const hit = cache.get(k);
        if (hit && Date.now() - hit.at < TTL) return [t.symbol, hit.payouts] as const;
        const payouts =
          t.currency === "RUB"
            ? (await fetchMoexPayouts(t.symbol)).payouts
            : await fetchUsDividends(t.symbol);
        cache.set(k, { at: Date.now(), payouts });
        return [t.symbol, payouts] as const;
      })
    ).then((entries) => {
      if (dead) return;
      setData(Object.fromEntries(entries));
      setLoading(false);
    });
    return () => {
      dead = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  return { data, loading };
}

export type LivePosition = Position & { isLive?: boolean };

/** Живые цены позиций (обновляются раз в минуту через наш бэкенд) */
export function useLivePrices(positions: Position[]) {
  const [quotes, setQuotes] = useState<Record<string, LiveQuote>>({});
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");

  const items = useMemo(() => {
    const m = new Map<string, PriceHint>();
    positions.forEach((p) => {
      const cls = p.assetClass || "stock";
      if (cls === "bond" || cls === "cash") return;
      const s = p.symbol.toUpperCase();
      m.set(s, cls === "crypto" ? "crypto" : p.currency === "RUB" ? "moex" : "global");
    });
    return Array.from(m.entries()).map(([symbol, hint]) => ({ symbol, hint }));
  }, [positions]);

  const itemsRef = useRef(items);
  itemsRef.current = items;
  const sig = items.map((i) => `${i.symbol}:${i.hint}`).join(",");

  const refresh = useCallback(async () => {
    if (!itemsRef.current.length) {
      setStatus("idle");
      return;
    }
    setStatus("loading");
    const res = await fetchLivePrices(itemsRef.current);
    if (Object.keys(res).length) {
      setQuotes(res);
      setUpdatedAt(new Date());
      setStatus("ok");
    } else {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  const livePositions = useMemo<LivePosition[]>(
    () =>
      positions.map((p) => {
        const q = quotes[p.symbol.toUpperCase()];
        if (!q) return p;
        const price = convertCurrency(q.price, q.currency, p.currency);
        return price > 0 ? { ...p, currentPrice: price, isLive: true } : p;
      }),
    [positions, quotes]
  );

  return { livePositions, updatedAt, status, refresh };
}

const TAX_KEY = "plutus-tax-settings";

/** Налог и комиссия брокера: хранятся в браузере */
export function useTaxSettings() {
  const [settings, setSettings] = useState<TaxSettings>(DEFAULT_TAX);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(TAX_KEY);
      if (raw) setSettings({ ...DEFAULT_TAX, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
  }, []);

  const update = useCallback((patch: Partial<TaxSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(TAX_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return [settings, update] as const;
}
