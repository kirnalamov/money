import apiClient from './client';
import { Currency } from '@/types';

export interface ExchangeRatesResponse {
    base: Currency;
    rates: Partial<Record<Currency, number>>;
    updated_at: string;
}

export const getExchangeRates = async (): Promise<ExchangeRatesResponse> => {
    const response = await apiClient.get<ExchangeRatesResponse>('/exchange-rates/');
    return response.data;
};
