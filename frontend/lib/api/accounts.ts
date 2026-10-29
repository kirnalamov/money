import apiClient from './client';
import { Account } from '@/types';

export const getAccounts = async (): Promise<Account[]> => {
    const accounts: Account[] = [];
    let page: Account[];
    do {
        const response = await apiClient.get<Account[]>('/accounts/', { params: { skip: accounts.length, limit: 100 } });
        page = response.data;
        accounts.push(...page);
    } while (page.length === 100);
    return accounts;
};

export const createAccount = async (account: Omit<Account, 'id' | 'lastSync' | 'created_at' | 'updated_at'>): Promise<Account> => {
    const response = await apiClient.post<Account>('/accounts/', account);
    return response.data;
};

export const updateAccount = async (id: number, account: Partial<Account>): Promise<Account> => {
    const response = await apiClient.put<Account>(`/accounts/${id}`, account);
    return response.data;
};

export const deleteAccount = async (id: number): Promise<void> => {
    await apiClient.delete(`/accounts/${id}`);
};
