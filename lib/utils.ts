import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { Currency } from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Курсы валют относительно USD (базовая валюта)
 * Можно заменить на API для получения актуальных курсов
 * 
 * Пример использования API:
 * async function fetchExchangeRates(): Promise<Record<Currency, number>> {
 *   const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
 *   const data = await response.json();
 *   return {
 *     USD: 1.0,
 *     EUR: data.rates.EUR,
 *     GBP: data.rates.GBP,
 *     RUB: data.rates.RUB,
 *   };
 * }
 */
let exchangeRates: Record<Currency, number> = {
  USD: 1.0,      // Базовая валюта
  EUR: 0.92,     // 1 USD = 0.92 EUR
  GBP: 0.79,     // 1 USD = 0.79 GBP
  RUB: 92.5,     // 1 USD = 92.5 RUB
};

/**
 * Обновляет курсы валют
 * Можно использовать для загрузки актуальных курсов из API
 */
export function updateExchangeRates(rates: Partial<Record<Currency, number>>) {
  exchangeRates = { ...exchangeRates, ...rates };
}

/**
 * Получает текущие курсы валют
 */
export function getExchangeRates(): Record<Currency, number> {
  return { ...exchangeRates };
}

/**
 * Конвертирует сумму из одной валюты в другую
 * @param amount - сумма для конвертации
 * @param fromCurrency - исходная валюта
 * @param toCurrency - целевая валюта
 * @returns конвертированная сумма
 */
export function convertCurrency(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency
): number {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  // Сначала конвертируем в USD (базовая валюта)
  const amountInUSD = amount / exchangeRates[fromCurrency];

  // Затем конвертируем из USD в целевую валюту
  const convertedAmount = amountInUSD * exchangeRates[toCurrency];

  return convertedAmount;
}

/**
 * Получает курс обмена между двумя валютами
 * @param fromCurrency - исходная валюта
 * @param toCurrency - целевая валюта
 * @returns курс обмена
 */
export function getExchangeRate(
  fromCurrency: Currency,
  toCurrency: Currency
): number {
  if (fromCurrency === toCurrency) {
    return 1.0;
  }

  return exchangeRates[toCurrency] / exchangeRates[fromCurrency];
}

/**
 * Форматирует сумму денег с символом валюты
 * @param amount - сумма для форматирования
 * @param currency - валюта (USD, EUR, GBP, RUB)
 * @returns отформатированная строка с символом валюты
 */
export function formatCurrency(amount: number, currency: Currency = 'USD'): string {
  const currencyConfig: Record<Currency, { symbol: string; position: 'before' | 'after'; locale: string }> = {
    USD: { symbol: '$', position: 'before', locale: 'en-US' },
    EUR: { symbol: '€', position: 'before', locale: 'de-DE' },
    GBP: { symbol: '£', position: 'before', locale: 'en-GB' },
    RUB: { symbol: '₽', position: 'after', locale: 'ru-RU' },
  };

  const config = currencyConfig[currency];
  const formattedAmount = new Intl.NumberFormat(config.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return config.position === 'before'
    ? `${config.symbol}${formattedAmount}`
    : `${formattedAmount} ${config.symbol}`;
}

export function getCurrencySymbol(currency: Currency = 'USD'): string {
  const currencyConfig: Record<Currency, { symbol: string }> = {
    USD: { symbol: '$' },
    EUR: { symbol: '€' },
    GBP: { symbol: '£' },
    RUB: { symbol: '₽' },
  };
  return currencyConfig[currency]?.symbol || '$';
}

/**
 * Форматирует сумму денег без десятичных знаков (для больших чисел)
 */
export function formatCurrencyCompact(amount: number, currency: Currency = 'USD'): string {
  const currencyConfig: Record<Currency, { symbol: string; position: 'before' | 'after'; locale: string }> = {
    USD: { symbol: '$', position: 'before', locale: 'en-US' },
    EUR: { symbol: '€', position: 'before', locale: 'de-DE' },
    GBP: { symbol: '£', position: 'before', locale: 'en-GB' },
    RUB: { symbol: '₽', position: 'after', locale: 'ru-RU' },
  };

  const config = currencyConfig[currency];
  const formattedAmount = new Intl.NumberFormat(config.locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

  return config.position === 'before'
    ? `${config.symbol}${formattedAmount}`
    : `${formattedAmount} ${config.symbol}`;
}

