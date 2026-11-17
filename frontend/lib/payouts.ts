import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  startOfDay,
  startOfMonth,
} from "date-fns";
import { Currency, Position } from "@/types";
import { MoexPayout } from "@/lib/moex";
import { convertCurrency } from "@/lib/utils";

/** Через сколько дней после даты отсечки выплата считается дошедшей до счёта */
export const PAY_LAG_DAYS = 14;

export interface TaxSettings {
  /** Налог с дивидендов/купонов и с прибыли при продаже, % */
  taxPct: number;
  /** Комиссия брокера за сделку (покупка и продажа), % */
  commissionPct: number;
}

export const DEFAULT_TAX: TaxSettings = { taxPct: 13, commissionPct: 0.05 };

/** Налог и комиссия: одни на всех или свои для каждого брокерского счёта. */
export type TaxSource = TaxSettings | ((accountId: number) => TaxSettings);
export const resolveTax = (tax: TaxSource, accountId: number): TaxSettings =>
  typeof tax === "function" ? tax(accountId) : tax;

export interface PayoutEvent {
  key: string;
  symbol: string;
  name: string;
  date: string; // yyyy-mm-dd
  kind: "dividend" | "coupon";
  perUnit: number;
  unitCurrency: Currency;
  qty: number;
  /** Суммы в валюте отображения */
  gross: number;
  tax: number;
  net: number;
  estimated?: boolean;
  announced?: boolean;
}

export type PayoutData = Record<string, MoexPayout[]>;

const iso = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export function normCur(c: string): Currency {
  const u = (c || "").toUpperCase();
  if (u === "SUR" || u === "RUB" || u === "RUR") return "RUB";
  if (u === "EUR" || u === "GBP" || u === "USD") return u as Currency;
  return "USD";
}

const isPayingClass = (p: Position) => {
  const cls = p.assetClass || "stock";
  return cls === "stock" || cls === "etf" || cls === "bond";
};

function makeEvent(
  p: Position,
  pay: MoexPayout,
  tax: TaxSource,
  dc: Currency,
  extra: Partial<PayoutEvent> = {}
): PayoutEvent {
  const cur = normCur(pay.currency);
  const gross = convertCurrency(pay.value * p.quantity, cur, dc);
  const t = (gross * resolveTax(tax, p.accountId).taxPct) / 100;
  return {
    key: `${p.accountId}:${p.symbol}:${pay.date}`,
    symbol: p.symbol.toUpperCase(),
    name: p.name,
    date: pay.date,
    kind: pay.kind,
    perUnit: pay.value,
    unitCurrency: cur,
    qty: p.quantity,
    gross,
    tax: t,
    net: gross - t,
    ...extra,
  };
}

/** Выплаты, которые уже дошли до владельца с момента покупки */
export function buildReceived(
  positions: Position[],
  data: PayoutData,
  tax: TaxSource,
  dc: Currency,
  now: Date = new Date()
) {
  const items: PayoutEvent[] = [];
  const missingDates = new Set<string>();
  const cutoff = iso(addDays(now, -PAY_LAG_DAYS));

  positions.forEach((p) => {
    if (!isPayingClass(p)) return;
    const payouts = data[p.symbol.toUpperCase()];
    if (!payouts?.length) return;
    let purchaseIso: string;
    if (p.purchaseDate) {
      purchaseIso = p.purchaseDate.slice(0, 10);
    } else {
      purchaseIso = iso(addMonths(now, -12));
      missingDates.add(p.symbol.toUpperCase());
    }
    payouts.forEach((pay) => {
      if (pay.date < purchaseIso || pay.date > cutoff) return;
      items.push(makeEvent(p, pay, tax, dc));
    });
  });

  items.sort((a, b) => b.date.localeCompare(a.date));
  return { items, missingDates: Array.from(missingDates) };
}

/**
 * Прогноз выплат на 12 календарных месяцев вперёд, начиная с текущего.
 * Объявленные выплаты берём как есть; прошлогодние переносим на год вперёд;
 * если данных нет: акции и фонды не оцениваем, облигации — по купону и периодичности с биржи.
 */
export function buildForecast(
  positions: Position[],
  data: PayoutData,
  tax: TaxSource,
  dc: Currency,
  loading: boolean,
  bonds?: Record<string, { coupon_value: number | null; coupon_period: number | null; next_coupon: string | null; maturity: string | null; currency: string }>,
  now: Date = new Date()
) {
  const today = startOfDay(now);
  const monthStart = startOfMonth(today);
  const todayIso = iso(today);
  const endIso = iso(addMonths(monthStart, 12));
  const yearAgoIso = iso(addMonths(today, -12));
  const events: PayoutEvent[] = [];

  positions.forEach((p) => {
    if (!isPayingClass(p)) return;
    const cls = p.assetClass || "stock";
    const payouts = data[p.symbol.toUpperCase()];

    if (payouts && payouts.length) {
      const future = payouts.filter((x) => x.date >= todayIso && x.date < endIso);
      future.forEach((x) =>
        events.push(makeEvent(p, x, tax, dc, { announced: true }))
      );
      payouts
        .filter((x) => x.date >= yearAgoIso && x.date < todayIso)
        .forEach((x) => {
          const shifted = iso(addMonths(new Date(x.date), 12));
          if (shifted < todayIso || shifted >= endIso) return;
          const covered = future.some(
            (f) =>
              Math.abs(
                differenceInCalendarDays(new Date(f.date), new Date(shifted))
              ) <= 45
          );
          if (covered) return;
          events.push(makeEvent(p, { ...x, date: shifted }, tax, dc));
        });
      return;
    }

    // Данных о выплатах нет. Для акций и фондов ничего не придумываем.
    // Для облигаций строим график ближайших купонов по данным биржи (размер и периодичность купона).
    if (cls !== "bond" || loading) return;
    const info = bonds?.[p.symbol.toUpperCase()];
    if (!info || !info.coupon_value || !info.coupon_period || !info.next_coupon) return;
    const gross = convertCurrency(info.coupon_value * p.quantity, normCur(info.currency), dc);
    if (gross <= 0) return;
    let when = new Date(info.next_coupon);
    let n = 0;
    while (iso(when) < endIso && n < 24) {
      const date = iso(when);
      if (info.maturity && date > info.maturity) break;
      if (date >= todayIso) {
        const t = (gross * resolveTax(tax, p.accountId).taxPct) / 100;
        events.push({
          key: `${p.accountId}:${p.symbol}:est:${date}`,
          symbol: p.symbol.toUpperCase(),
          name: p.name,
          date,
          kind: "coupon",
          perUnit: info.coupon_value,
          unitCurrency: normCur(info.currency),
          qty: p.quantity,
          gross,
          tax: t,
          net: gross - t,
          estimated: true,
        });
      }
      when = addDays(when, info.coupon_period);
      n++;
    }
  });

  const byMonth: PayoutEvent[][] = Array.from({ length: 12 }, () => []);
  events.forEach((e) => {
    const i = differenceInCalendarMonths(new Date(e.date), monthStart);
    if (i >= 0 && i < 12) byMonth[i].push(e);
  });
  byMonth.forEach((list) => list.sort((a, b) => b.net - a.net));
  events.sort((a, b) => a.date.localeCompare(b.date) || b.net - a.net);
  return { events, byMonth, monthStart };
}

/** Комиссии и налог при продаже портфеля сегодня (оценка) */
export function sellEstimate(
  totalValue: number,
  totalCost: number,
  receivedNet: number,
  tax: TaxSettings
) {
  const buyComm = (totalCost * tax.commissionPct) / 100;
  const sellComm = (totalValue * tax.commissionPct) / 100;
  const base = Math.max(0, totalValue - totalCost - buyComm - sellComm);
  const gainTax = (base * tax.taxPct) / 100;
  const net =
    totalValue - totalCost - buyComm - sellComm - gainTax + receivedNet;
  return { buyComm, sellComm, gainTax, net };
}
