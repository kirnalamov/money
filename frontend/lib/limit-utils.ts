import type { LimitRule, Transaction } from '@/types';
import { convertCurrency } from './utils';

export function calculateLimitSpent(
  limit: Pick<LimitRule, 'category' | 'period' | 'currency'>,
  transactions: Transaction[],
  now = new Date(),
): number {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (limit.period === 'weekly') {
    const daysSinceMonday = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - daysSinceMonday);
  } else if (limit.period === 'monthly') {
    start.setDate(1);
  }

  return transactions.reduce((total, transaction) => {
    if (transaction.type !== 'expense' || transaction.category !== limit.category) return total;

    const transactionDate = new Date(transaction.date);
    if (Number.isNaN(transactionDate.getTime()) || transactionDate < start || transactionDate > now) return total;

    return total + convertCurrency(transaction.amount, transaction.currency, limit.currency);
  }, 0);
}
