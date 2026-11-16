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
  source: "dividends" | "coupons" | null;
  payouts: MoexPayout[];
}

const ISS = "https://iss.moex.com/iss";

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

  // 2) Купоны облигаций — публичный блок bondization.
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
