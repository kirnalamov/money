import apiClient from './client';
import { Transaction } from '@/types';

export const getTransactions = async (): Promise<Transaction[]> => {
    const transactions: Transaction[] = [];
    let page: Transaction[];
    do {
        const response = await apiClient.get<Transaction[]>('/transactions/', { params: { skip: transactions.length, limit: 100 } });
        page = response.data;
        transactions.push(...page);
    } while (page.length === 100);
    return transactions;
};

export const createTransaction = async (transaction: Omit<Transaction, 'id'>): Promise<Transaction> => {
    const payload = {
        amount: transaction.amount,
        description: transaction.description,
        date: transaction.date,
        type: transaction.type,
        currency: transaction.currency,
        account_id: transaction.accountId,
        category: transaction.category,
        to_account_id: transaction.toAccountId,
        tags: transaction.tags,
    };

    const response = await apiClient.post<Transaction>('/transactions/', payload);
    return response.data;
};

export const updateTransaction = async (id: string, transaction: Partial<Transaction>): Promise<Transaction> => {
    const response = await apiClient.put<Transaction>(`/transactions/${id}`, transaction);
    return response.data;
};

export const deleteTransaction = async (id: string): Promise<void> => {
    await apiClient.delete(`/transactions/${id}`);
};
