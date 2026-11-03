import { Currency, Transaction } from "@/types";
import { convertCurrency } from "@/lib/utils";

export type FinancialHealth = "negative" | "neutral" | "positive";

const THRESHOLD_RATE = 0.035;
const DAYS_PER_MONTH = 30.4375;

export function getFinancialHealth(
  transactions: Transaction[],
  currency: Currency,
  periodStart: Date,
  periodEnd: Date,
): FinancialHealth {
  const monthlyExpenses = new Map<string, number>();
  const start = periodStart.getTime();
  const end = periodEnd.getTime();
  let netFlow = 0;

  for (const transaction of transactions) {
    const timestamp = new Date(transaction.date).getTime();
    if (!Number.isFinite(timestamp) || timestamp > end) continue;

    const amount = convertCurrency(transaction.amount, transaction.currency, currency);
    if (transaction.type === "expense") {
      const month = transaction.date.slice(0, 7);
      monthlyExpenses.set(month, (monthlyExpenses.get(month) || 0) + amount);
      if (timestamp >= start) netFlow -= amount;
    } else if (transaction.type === "income" && timestamp >= start) {
      netFlow += amount;
    }
  }

  if (!monthlyExpenses.size) return "neutral";

  const averageMonthlyExpenses = Array.from(monthlyExpenses.values()).reduce((sum, value) => sum + value, 0) / monthlyExpenses.size;
  const periodMonths = Math.max(1, (end - start) / (24 * 60 * 60 * 1000) / DAYS_PER_MONTH);
  const monthlyNetFlow = netFlow / periodMonths;
  const threshold = averageMonthlyExpenses * THRESHOLD_RATE;

  if (monthlyNetFlow < -threshold) return "negative";
  if (monthlyNetFlow > threshold) return "positive";
  return "neutral";
}

export function getFinancialHealthColor(status: FinancialHealth): string {
  if (status === "negative") return "#F27683";
  if (status === "positive") return "#C0F05C";
  return "#F2C45E";
}
