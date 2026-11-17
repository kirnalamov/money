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

/** Ищет тикер в MOEX → крипто → мировые рынки; возвращает первую найденную котировку. */
export async function lookupTicker(raw: string): Promise<TickerInfo | null> {
  const symbol = raw.trim().toUpperCase();
  if (!/^[A-Z0-9.\-]{1,12}$/.test(symbol)) return null;
  const hints: PriceHint[] = ["moex", "crypto", "global"];
  const results = await Promise.all(
    hints.map((hint) => fetchLivePrices([{ symbol, hint }]).then((r) => ({ hint, q: r[symbol] })))
  );
  const hit = results.find((r) => r.q && r.q.price > 0);
  if (!hit || !hit.q) return null;
  const cur = (hit.q.currency || "").toUpperCase() as Currency;
  return {
    symbol,
    hint: hit.hint,
    price: hit.q.price,
    currency: KNOWN.includes(cur) ? cur : hit.hint === "moex" ? "RUB" : "USD",
    assetClass: classFor(symbol, hit.hint),
  };
}
