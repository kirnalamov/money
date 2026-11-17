import { API_URL, fetchBondInfo, fetchLivePrices, type PriceHint } from "@/lib/moex";
import type { Currency, Position } from "@/types";

export type AssetClass = NonNullable<Position["assetClass"]>;

export interface TickerInfo {
  symbol: string;
  hint: PriceHint;
  price: number;
  currency: Currency;
  assetClass: AssetClass;
  /** НКД на одну облигацию (только для облигаций) */
  accrued?: number;
}

const ETFS = new Set(["VOO", "VTI", "SPY", "QQQ", "IVV", "VEA", "VWO", "BND", "AGG", "GLD", "SLV", "VNQ", "SCHD", "ARKK", "FXRL", "FXUS", "TMOS", "SBMX", "VTBB", "TGLD"]);

export const POPULAR_TICKERS: { symbol: string; hint: PriceHint; asset_class: SecurityHit["asset_class"] }[] = [
  { symbol: "SBER", hint: "moex", asset_class: "stock" },
  { symbol: "GAZP", hint: "moex", asset_class: "stock" },
  { symbol: "LKOH", hint: "moex", asset_class: "stock" },
  { symbol: "AAPL", hint: "global", asset_class: "stock" },
  { symbol: "VOO", hint: "global", asset_class: "etf" },
  { symbol: "BTC", hint: "crypto", asset_class: "crypto" },
];

export function classFor(symbol: string, hint: PriceHint): AssetClass {
  if (hint === "crypto") return "crypto";
  if (ETFS.has(symbol)) return "etf";
  return "stock";
}

export function hintFor(position: Pick<Position, "assetClass" | "currency" | "symbol">): PriceHint {
  if (position.assetClass === "crypto") return "crypto";
  if (/^[A-Z]{4,5}$/.test(position.symbol) && position.currency === "RUB") return "moex";
  return position.currency === "RUB" ? "moex" : "global";
}

const KNOWN: Currency[] = ["USD", "EUR", "GBP", "RUB"];

export interface SecurityHit {
  symbol: string;
  name: string;
  hint: PriceHint;
  asset_class: AssetClass | "bond";
  exchange: string;
}

/** Подходящие бумаги по тикеру или названию (МосБиржа, мировые рынки, крипто). */
export async function searchSecurities(query: string, signal?: AbortSignal): Promise<SecurityHit[]> {
  const q = query.trim();
  if (!q) return [];
  try {
    const r = await fetch(`${API_URL}/moex/search?q=${encodeURIComponent(q)}`, { signal });
    if (!r.ok) return [];
    const j = (await r.json()) as { results?: SecurityHit[] };
    return j.results || [];
  } catch {
    return [];
  }
}


const toInfo = (hit: Pick<SecurityHit, "symbol" | "hint" | "asset_class">, q: { price: number; currency: string }): TickerInfo => {
  const cur = (q.currency || "").toUpperCase() as Currency;
  return {
    symbol: hit.symbol,
    hint: hit.hint,
    price: q.price,
    currency: KNOWN.includes(cur) ? cur : hit.hint === "moex" ? "RUB" : "USD",
    assetClass: hit.asset_class === "bond" ? "bond" : hit.asset_class === "crypto" ? "crypto" : classFor(hit.symbol, hit.hint),
  };
};

/** Цена выбранной бумаги из её источника (для облигаций — цена в валюте и НКД). */
export async function resolveHit(hit: Pick<SecurityHit, "symbol" | "hint" | "asset_class">): Promise<TickerInfo | null> {
  if (hit.asset_class === "bond") {
    const bond = await fetchBondInfo(hit.symbol);
    if (!bond) return null;
    return {
      ...toInfo(hit, { price: bond.price, currency: bond.currency === "SUR" ? "RUB" : bond.currency }),
      assetClass: "bond",
      accrued: bond.accrued_interest,
    };
  }
  const quotes = await fetchLivePrices([{ symbol: hit.symbol, hint: hit.hint }]);
  const q = quotes[hit.symbol.toUpperCase()];
  return q && q.price > 0 ? toInfo(hit, q) : null;
}

/** Цены для подсказок: по одному запросу на источник (тикеры из разных источников могут совпадать). */
export async function pricesForHits(hits: SecurityHit[]): Promise<Record<string, { price: number; currency: Currency }>> {
  const out: Record<string, { price: number; currency: Currency }> = {};
  const hints: PriceHint[] = ["moex", "global", "crypto"];
  await Promise.all(
    hints.map(async (hint) => {
      const group = hits.filter((h) => h.hint === hint);
      if (!group.length) return;
      const quotes = await fetchLivePrices(group.map((h) => ({ symbol: h.symbol, hint })));
      for (const h of group) {
        const q = quotes[h.symbol.toUpperCase()];
        if (q && q.price > 0) out[`${h.symbol}:${hint}`] = { price: q.price, currency: toInfo(h, q).currency };
      }
    })
  );
  return out;
}
