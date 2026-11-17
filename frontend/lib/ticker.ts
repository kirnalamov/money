import { fetchLivePrices, type PriceHint } from "@/lib/moex";
import type { Currency, Position } from "@/types";

export type AssetClass = NonNullable<Position["assetClass"]>;

export interface TickerInfo {
  symbol: string;
  hint: PriceHint;
  price: number;
  currency: Currency;
  assetClass: AssetClass;
}

const ETFS = new Set(["VOO", "VTI", "SPY", "QQQ", "IVV", "VEA", "VWO", "BND", "AGG", "GLD", "SLV", "VNQ", "SCHD", "ARKK", "FXRL", "FXUS", "TMOS", "SBMX", "VTBB", "TGLD"]);

export const POPULAR_TICKERS = ["SBER", "GAZP", "LKOH", "AAPL", "VOO", "BTC"];

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

/** Ищет тикер: MOEX (при отсутствии бэкенд сам идёт в Yahoo) и крипто-биржа. */
export async function lookupTicker(raw: string): Promise<TickerInfo | null> {
  const symbol = raw.trim().toUpperCase();
  if (!/^[A-Z0-9.\-]{1,12}$/.test(symbol)) return null;
  const [general, crypto] = await Promise.all([
    fetchLivePrices([{ symbol, hint: "moex" }]).then((r) => r[symbol]),
    fetchLivePrices([{ symbol, hint: "crypto" }]).then((r) => r[symbol]),
  ]);
  let hint: PriceHint;
  let q = general;
  if (general && general.price > 0 && general.source === "moex") hint = "moex";
  else if (crypto && crypto.price > 0) { hint = "crypto"; q = crypto; }
  else if (general && general.price > 0) hint = "global";
  else return null;
  if (!q) return null;
  const cur = (q.currency || "").toUpperCase() as Currency;
  return {
    symbol,
    hint,
    price: q.price,
    currency: KNOWN.includes(cur) ? cur : hint === "moex" ? "RUB" : "USD",
    assetClass: classFor(symbol, hint),
  };
}
