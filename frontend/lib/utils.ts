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
  fromCurrency?: Currency | string,
  toCurrency?: Currency | string
): number {
  if (!amount || isNaN(amount)) return 0;
  const fromC = (fromCurrency as Currency) || 'USD';
  const toC = (toCurrency as Currency) || 'USD';

  if (fromC === toC) {
    return amount;
  }

  // Сначала конвертируем в USD (базовая валюта)
  const rateFrom = exchangeRates[fromC] || 1.0;
  const rateTo = exchangeRates[toC] || 1.0;

  const amountInUSD = amount / rateFrom;
  const convertedAmount = amountInUSD * rateTo;

  return convertedAmount;
}

/**
 * Получает курс обмена между двумя валютами
 */
export function getExchangeRate(
  fromCurrency?: Currency | string,
  toCurrency?: Currency | string
): number {
  const fromC = (fromCurrency as Currency) || 'USD';
  const toC = (toCurrency as Currency) || 'USD';
  if (fromC === toC) {
    return 1.0;
  }
  const rateFrom = exchangeRates[fromC] || 1.0;
  const rateTo = exchangeRates[toC] || 1.0;

  return rateTo / rateFrom;
}

/**
 * Форматирует сумму денег с символом валюты
 */
export function formatCurrency(amount: number, currency?: Currency | string): string {
  if (amount === undefined || isNaN(amount)) return '$0.00';
  const curr = (currency as Currency) || 'USD';
  const currencyConfig: Record<Currency, { symbol: string; position: 'before' | 'after'; locale: string }> = {
    USD: { symbol: '$', position: 'before', locale: 'en-US' },
    EUR: { symbol: '€', position: 'before', locale: 'de-DE' },
    GBP: { symbol: '£', position: 'before', locale: 'en-GB' },
    RUB: { symbol: '₽', position: 'after', locale: 'ru-RU' },
  };

  const config = currencyConfig[curr] || currencyConfig['USD'];
  const formattedAmount = new Intl.NumberFormat(config.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));

  const sign = amount < 0 && Number(Math.abs(amount).toFixed(2)) !== 0 ? '−' : '';
  return config.position === 'before'
    ? `${sign}${config.symbol}${formattedAmount}`
    : `${sign}${formattedAmount} ${config.symbol}`;
}

/**
 * Форматирует сумму с локалью и знаком перед валютой.
 */
export function formatMoney(amount: number, currency: Currency | string = 'USD', locale = 'en', signed = false): string {
  if (amount === undefined || isNaN(amount)) return '$0.00';

  const curr = currency as Currency;
  const currencyConfig: Record<Currency, { symbol: string; position: 'before' | 'after' }> = {
    USD: { symbol: '$', position: 'before' },
    EUR: { symbol: '€', position: 'before' },
    GBP: { symbol: '£', position: 'before' },
    RUB: { symbol: '₽', position: 'after' },
  };
  const config = currencyConfig[curr] || currencyConfig.USD;
  const formattedAmount = new Intl.NumberFormat(locale.startsWith('ru') ? 'ru-RU' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount)).replace(/[\u00a0\u202f]/g, ' ');
  const sign = amount < 0 ? '−' : signed && amount > 0 ? '+' : '';
  const value = config.position === 'before'
    ? `${config.symbol}${formattedAmount}`
    : `${formattedAmount} ${config.symbol}`;

  return `${sign}${value}`;
}

/**
 * Компактная сумма для осей: en `$14.9K`, ru `14,9 тыс. ₽`; без переносов строк.
 */
export function formatMoneyCompact(amount: number, currency: Currency | string = 'USD', locale = 'en', signed = false): string {
  if (amount === undefined || isNaN(amount)) return '$0';
  const symbols: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', RUB: '₽' };
  const symbol = symbols[currency as string] || '$';
  const ru = locale.startsWith('ru');
  const number = new Intl.NumberFormat(ru ? 'ru-RU' : 'en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Math.abs(amount)).replace(/[  ]/g, ' ');
  const sign = amount < 0 ? '−' : signed && amount > 0 ? '+' : '';
  return `${sign}${currency === 'RUB' ? `${number} ${symbol}` : `${symbol}${number}`}`.replace(/ /g, ' ');
}

/**
 * Проценты с локалью (значение уже в процентах): ru `−0,1%`, en `-0.1%`.
 */
export function formatPercent(value: number, locale = 'en', signed = false, digits = 1): string {
  if (value === undefined || isNaN(value)) return '0%';
  const ru = locale.startsWith('ru');
  const number = new Intl.NumberFormat(ru ? 'ru-RU' : 'en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Math.abs(value));
  const rounded = Number(Math.abs(value).toFixed(digits)) === 0;
  const sign = rounded ? '' : value < 0 ? (ru ? '−' : '-') : signed ? '+' : '';
  return `${sign}${number}%`;
}

export function getCurrencySymbol(currency?: Currency | string): string {
  const curr = (currency as Currency) || 'USD';
  const currencyConfig: Record<Currency, { symbol: string }> = {
    USD: { symbol: '$' },
    EUR: { symbol: '€' },
    GBP: { symbol: '£' },
    RUB: { symbol: '₽' },
  };
  return currencyConfig[curr]?.symbol || '$';
}

/**
 * Форматирует сумму денег без десятичных знаков (для больших чисел)
 */
export function formatCurrencyCompact(amount: number, currency?: Currency | string): string {
  if (amount === undefined || isNaN(amount)) return '$0';
  const curr = (currency as Currency) || 'USD';
  const currencyConfig: Record<Currency, { symbol: string; position: 'before' | 'after'; locale: string }> = {
    USD: { symbol: '$', position: 'before', locale: 'en-US' },
    EUR: { symbol: '€', position: 'before', locale: 'de-DE' },
    GBP: { symbol: '£', position: 'before', locale: 'en-GB' },
    RUB: { symbol: '₽', position: 'after', locale: 'ru-RU' },
  };

  const config = currencyConfig[curr] || currencyConfig['USD'];
  const formattedAmount = new Intl.NumberFormat(config.locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));

  const sign = amount < 0 && Math.round(Math.abs(amount)) !== 0 ? '−' : '';
  return config.position === 'before'
    ? `${sign}${config.symbol}${formattedAmount}`
    : `${sign}${formattedAmount} ${config.symbol}`;
}

