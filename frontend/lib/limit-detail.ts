import type { LimitRule, Transaction } from "@/types";
import { convertCurrency } from "./utils";

export type LimitStatusKey = "ok" | "warn" | "over";

export function limitStatus(spent: number, limit: number): LimitStatusKey {
  const pct = limit > 0 ? (spent / limit) * 100 : 0;
  if (pct > 100) return "over";
  if (pct >= 80) return "warn";
  return "ok";
}

export interface PeriodWindow {
  period: LimitRule["period"];
  start: Date;
  /** сколько дней в периоде */
  days: number;
  /** какой по счёту день периода сегодня (с 1) */
  day: number;
  /** сколько дней осталось после сегодняшнего */
  left: number;
}

/** Окно текущего периода лимита — те же границы, что в calculateLimitSpent */
export function periodWindow(period: LimitRule["period"], now: Date = new Date()): PeriodWindow {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  let days = 1;
  let day = 1;
  if (period === "monthly") {
    start.setDate(1);
    days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    day = now.getDate();
  } else if (period === "weekly") {
    const sinceMonday = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - sinceMonday);
    days = 7;
    day = sinceMonday + 1;
  }
  return { period, start, days, day, left: Math.max(0, days - day) };
}

export interface LimitTx {
  /** день периода, с 1 */
  day: number;
  /** сумма в валюте лимита */
  amount: number;
  tx: Transaction;
}

/** Расходы категории внутри окна периода, от старых к новым */
export function limitTransactions(
  limit: Pick<LimitRule, "category" | "currency">,
  transactions: Transaction[],
  win: PeriodWindow,
  now: Date = new Date()
): LimitTx[] {
  const startMs = win.start.getTime();
  const out: LimitTx[] = [];
  for (const tx of transactions) {
    if (tx.type !== "expense" || tx.category !== limit.category) continue;
    const d = new Date(tx.date);
    if (Number.isNaN(d.getTime()) || d < win.start || d > now) continue;
    const dayStart = new Date(d);
    dayStart.setHours(0, 0, 0, 0);
    out.push({
      day: Math.round((dayStart.getTime() - startMs) / 86400000) + 1,
      amount: convertCurrency(tx.amount, tx.currency, limit.currency),
      tx,
    });
  }
  return out.sort((a, b) => new Date(a.tx.date).getTime() - new Date(b.tx.date).getTime());
}

export interface LimitDetail {
  spent: number;
  limit: number;
  pct: number;
  status: LimitStatusKey;
  /** «план на сегодня» при равномерной трате */
  pace: number;
  avg: number;
  norm: number;
  proj: number;
  projPct: number;
  ratio: number;
  allowed: number;
  over: boolean;
  /** день, в который накопленная сумма впервые превысила лимит */
  crossDay: number | null;
  bar: { within: number; over: number; limitLeft: number; paceLeft: number };
}

export function limitDetail(limit: number, items: LimitTx[], win: PeriodWindow): LimitDetail {
  const spent = items.reduce((s, x) => s + x.amount, 0);
  const pct = limit > 0 ? (spent / limit) * 100 : 0;
  const pace = (limit * win.day) / win.days;
  const avg = spent / win.day;
  const norm = limit / win.days;
  const proj = avg * win.days;
  const allowed = Math.max(0, (limit - spent) / Math.max(1, win.left));

  let cum = 0;
  let crossDay: number | null = null;
  for (const x of items) {
    cum += x.amount;
    if (crossDay === null && cum > limit) crossDay = x.day;
  }

  const scale = Math.max(spent, limit, 1e-9);
  return {
    spent,
    limit,
    pct,
    status: limitStatus(spent, limit),
    pace,
    avg,
    norm,
    proj,
    projPct: limit > 0 ? (proj / limit) * 100 : 0,
    ratio: norm > 0 ? avg / norm : 0,
    allowed,
    over: spent > limit,
    crossDay,
    bar: {
      within: (Math.min(spent, limit) / scale) * 100,
      over: (Math.max(0, spent - limit) / scale) * 100,
      limitLeft: (limit / scale) * 100,
      paceLeft: (pace / scale) * 100,
    },
  };
}

/** «Красивые» варианты лимита для быстрого выбора */
export function limitChipValues(current: number): number[] {
  const nice = (v: number) => {
    if (v <= 0) return 0;
    const pw = Math.pow(10, Math.max(0, Math.floor(Math.log10(v)) - 1));
    return Math.round(v / pw) * pw;
  };
  const base = Math.round(current);
  const list = [base, nice(current * 1.1), nice(current * 1.25), nice(current * 1.5)];
  return Array.from(new Set(list.filter((v) => v > 0)));
}
