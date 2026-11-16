/**
 * Клиент публичного MOEX ISS API (iss.moex.com).
 *
 * История дивидендов по акциям (/securities/{secid}/dividends) была убрана
 * биржей из бесплатного ISS; запрос оставлен на случай восстановления.
 * Купоны облигаций (/securities/{secid}/bondization) доступны публично.
 */

export interface MoexPayout {
  date: string; // ISO yyyy-mm-dd
  value: number; // выплата на одну бумагу
  currency: string;
  kind: "dividend" | "coupon";
  isFuture: boolean;
}

export interface MoexPayoutsResult {
  secid: string;
  source: "dividends" | "smartlab" | "coupons" | null;
  payouts: MoexPayout[];
}

const ISS = "https://iss.moex.com/iss";
const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

function parseTable(
  json: unknown,
  block: string
): Record<string, unknown>[] {
  const t = (json as Record<string, { columns?: string[]; data?: unknown[][] }>)?.[
    block
  ];
  if (!t?.columns || !t?.data) return [];
  const cols = t.columns;
  return t.data.map((row) =>
    Object.fromEntries(cols.map((c, i) => [c, row[i]]))
  );
}

const today = () => new Date().toISOString().slice(0, 10);

export async function fetchMoexPayouts(
  rawSecid: string
): Promise<MoexPayoutsResult> {
  const secid = rawSecid.trim().toUpperCase();
  const s = encodeURIComponent(secid);

  // 1) Легаси-блок дивидендов: сейчас МосБиржа отдаёт его только
  //    авторизованным клиентам, но попытка дешёвая.
  try {
    const r = await fetch(`${ISS}/securities/${s}/dividends.json?iss.meta=off`);
    if (r.ok) {
      const rows = parseTable(await r.json(), "dividends");
      const payouts = rows
        .map((x) => ({
          date: String(x.registryclosedate || ""),
          value: Number(x.value) || 0,
          currency: String(x.currencyid || "RUB"),
          kind: "dividend" as const,
          isFuture: String(x.registryclosedate || "") > today(),
        }))
        .filter((p) => p.date && p.value > 0)
        .sort((a, b) => a.date.localeCompare(b.date));
      if (payouts.length) return { secid, source: "dividends", payouts };
    }
  } catch {
    /* сеть/CORS — пробуем следующий источник */
  }

  // 2) Дивиденды акций через наш бэкенд (источник — smart-lab.ru),
  //    т.к. бесплатный ISS их больше не отдаёт.
  try {
    const r = await fetch(`${API_URL}/moex/dividends/${s}`);
    if (r.ok) {
      const j = (await r.json()) as {
        dividends?: { date: string; value: number; currency: string }[];
      };
      const t = today();
      const payouts = (j.dividends || [])
        .map((x) => ({
          date: x.date,
          value: Number(x.value) || 0,
          currency: x.currency || "RUB",
          kind: "dividend" as const,
          isFuture: x.date > t,
        }))
        .filter((p) => p.date && p.value > 0)
        .sort((a, b) => a.date.localeCompare(b.date));
      if (payouts.length) return { secid, source: "smartlab", payouts };
    }
  } catch {
    /* бэкенд недоступен — пробуем купоны */
  }

  // 3) Купоны облигаций — публичный блок bondization.
  try {
    const r = await fetch(
      `${ISS}/securities/${s}/bondization.json?iss.meta=off&iss.only=coupons&limit=100`
    );
    if (r.ok) {
      const rows = parseTable(await r.json(), "coupons");
      const t = today();
      const payouts = rows
        .map((x) => ({
          date: String(x.coupondate || ""),
          value: Number(x.value) || 0,
          currency: String(x.faceunit || "RUB"),
          kind: "coupon" as const,
          isFuture: String(x.coupondate || "") > t,
        }))
        .filter((p) => p.date && p.value > 0)
        .sort((a, b) => a.date.localeCompare(b.date));
      if (payouts.length) return { secid, source: "coupons", payouts };
    }
  } catch {
    /* ignore */
  }

  return { secid, source: null, payouts: [] };
}

export interface LiveQuote {
  symbol: string;
  price: number;
  currency: string;
  source: string;
}

export type PriceHint = "moex" | "global" | "crypto";

/** URL логотипа бумаги (проксируется нашим бэкендом, 404 если логотипа нет) */
export function logoUrl(symbol: string, hint: PriceHint): string {
  return `${API_URL}/moex/logo/${encodeURIComponent(symbol.trim().toUpperCase())}?hint=${hint}`;
}

/** Текущие котировки через наш бэкенд (MOEX / Binance / Yahoo). */
export async function fetchLivePrices(
  items: { symbol: string; hint: PriceHint }[]
): Promise<Record<string, LiveQuote>> {
  if (!items.length) return {};
  const q = items
    .map((i) => `${i.symbol.trim().toUpperCase()}:${i.hint}`)
    .join(",");
  try {
    const r = await fetch(`${API_URL}/moex/prices?q=${encodeURIComponent(q)}`);
    if (!r.ok) return {};
    const j = (await r.json()) as { prices?: Record<string, LiveQuote> };
    return j.prices || {};
  } catch {
    return {};
  }
}

/** История дивидендов бумаг США (Yahoo через наш бэкенд), на одну бумагу. */
export async function fetchUsDividends(symbol: string): Promise<MoexPayout[]> {
  try {
    const r = await fetch(
      `${API_URL}/moex/us-dividends/${encodeURIComponent(symbol.trim().toUpperCase())}`
    );
    if (!r.ok) return [];
    const j = (await r.json()) as {
      dividends?: { date: string; value: number; currency: string }[];
    };
    const t = today();
    return (j.dividends || [])
      .map((x) => ({
        date: x.date,
        value: Number(x.value) || 0,
        currency: x.currency || "USD",
        kind: "dividend" as const,
        isFuture: x.date > t,
      }))
      .filter((p) => p.date && p.value > 0)
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}
