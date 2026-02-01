import { Transaction, Account } from "@/types";
import { convertCurrency } from "@/lib/utils";
import { getDaysInMonth, startOfMonth, endOfMonth, differenceInDays } from "date-fns";

export interface ForecastMetrics {
    currentSpend: number;
    projectedSpend: number;
    burnRate: number; // Daily avg
    daysRemaning: number;
}

export const calculateForecast = (
    transactions: Transaction[],
    accounts: Account[],
    defaultCurrency: string
): ForecastMetrics => {
    const today = new Date();
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);

    // Days passed so far (inclusive of today for simplicity, or exclusive if we want partial day logic)
    // Let's assume passed days = today.getDate()
    const daysPassed = today.getDate();
    const totalDays = getDaysInMonth(today);
    const daysRemaining = totalDays - daysPassed;

    let currentSpend = 0;

    transactions.filter(tx => tx.type === 'expense').forEach(tx => {
        const txDate = new Date(tx.date);
        if (txDate >= monthStart && txDate <= today) {
            const account = accounts.find(a => a.id === tx.accountId);
            if (account) {
                currentSpend += convertCurrency(tx.amount, account.currency, defaultCurrency);
            }
        }
    });

    const averageDailyBurn = daysPassed > 0 ? currentSpend / daysPassed : 0;
    const projectedSpend = currentSpend + (averageDailyBurn * daysRemaining);

    return {
        currentSpend,
        projectedSpend,
        burnRate: averageDailyBurn,
        daysRemaning: daysRemaining
    };
};
