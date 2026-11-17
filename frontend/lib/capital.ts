import { addDays, startOfDay } from "date-fns";
import type { Account, Currency, Transaction } from "@/types";
import { convertCurrency } from "./utils";

export interface CapitalPoint {
  date: Date;
  /** капитал на конец дня в валюте отображения */
  value: number;
}

/**
 * История капитала по дням: идём назад от текущих балансов и отменяем
 * операции, случившиеся после конца каждого дня.
 */
export function capitalSeries(
  accounts: Account[],
  transactions: Transaction[],
  currency: Currency,
  from: Date,
  to: Date = new Date()
): CapitalPoint[] {
  const first = startOfDay(from);
  const last = startOfDay(to);
  if (first.getTime() > last.getTime()) return [];

  const balances = new Map<number, number>(accounts.map((a) => [a.id, a.balance]));
  const cur = new Map<number, Currency>(accounts.map((a) => [a.id, a.currency]));
  const sorted = [...transactions]
    .filter((tx) => !Number.isNaN(new Date(tx.date).getTime()))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const undo = (tx: Transaction) => {
    const add = (id: number | undefined, delta: number) => {
      if (id === undefined || !balances.has(id)) return;
      balances.set(id, (balances.get(id) || 0) + delta);
    };
    if (tx.type === "expense") add(tx.accountId, tx.amount);
    else if (tx.type === "income") add(tx.accountId, -tx.amount);
    else if (tx.type === "transfer") {
      add(tx.accountId, tx.amount);
      add(tx.toAccountId, -tx.amount);
    }
  };
  const total = () => {
    let sum = 0;
    balances.forEach((bal, id) => {
      sum += convertCurrency(bal, cur.get(id) || "USD", currency);
    });
    return sum;
  };

  const days: Date[] = [];
  for (let d = last; d.getTime() >= first.getTime(); d = addDays(d, -1)) days.push(d);

  let ptr = 0;
  const out: CapitalPoint[] = [];
  for (const day of days) {
    const endOfDay = new Date(day);
    endOfDay.setHours(23, 59, 59, 999);
    while (ptr < sorted.length && new Date(sorted[ptr].date).getTime() > endOfDay.getTime()) {
      undo(sorted[ptr]);
      ptr++;
    }
    out.push({ date: day, value: total() });
  }
  return out.reverse();
}

export function earliestTransactionDate(transactions: Transaction[]): Date | null {
  let min: number | null = null;
  for (const tx of transactions) {
    const t = new Date(tx.date).getTime();
    if (Number.isNaN(t)) continue;
    if (min === null || t < min) min = t;
  }
  return min === null ? null : startOfDay(new Date(min));
}

export interface CapitalBreakdown {
  total: number;
  /** банковские счета (без наличных) */
  bank: number;
  cash: number;
  savings: number;
  /** брокерские счета */
  investments: number;
  /** всё, кроме брокерских счетов */
  liquid: number;
}

export function capitalBreakdown(accounts: Account[], currency: Currency): CapitalBreakdown {
  const sum = (types: Account["type"][]) =>
    accounts
      .filter((a) => types.includes(a.type))
      .reduce((s, a) => s + convertCurrency(a.balance, a.currency, currency), 0);
  const bank = sum(["bank"]);
  const cash = sum(["cash"]);
  const savings = sum(["savings"]);
  const investments = sum(["brokerage"]);
  return { total: bank + cash + savings + investments, bank, cash, savings, investments, liquid: bank + cash + savings };
}
