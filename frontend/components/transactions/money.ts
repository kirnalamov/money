const SYMBOLS: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', RUB: '₽' };

// Формат макета «Операции»: знак, число, неразрывный пробел, символ валюты после суммы.
export function formatAmount(amount: number, currency: string, locale: string, signed = false): string {
    if (amount === undefined || Number.isNaN(amount)) return `0,00 ${SYMBOLS[currency] || '$'}`;
    const number = new Intl.NumberFormat(locale.startsWith('ru') ? 'ru-RU' : 'en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Math.abs(amount)).replace(/[   ]/g, ' ');
    const sign = amount < 0 && Number(Math.abs(amount).toFixed(2)) !== 0 ? '−' : signed && amount > 0 ? '+' : '';
    return `${sign}${number} ${SYMBOLS[currency] || '$'}`;
}
