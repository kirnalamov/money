import apiClient from './client';
import { Transaction } from '@/types';

export const getTransactions = async (): Promise<Transaction[]> => {
    const response = await apiClient.get<Transaction[]>('/transactions/');
    return response.data;
};

export const createTransaction = async (transaction: Omit<Transaction, 'id'>): Promise<Transaction> => {
    const payload = {
        amount: transaction.amount,
        description: transaction.description,
        date: transaction.date,
        type: transaction.type,
        account_id: transaction.accountId,
        category_id: transaction.category ? undefined : undefined, // TODO: handle category ID lookup or creation if needed. For now sending None if not ID.
        // Actually, store sends category name in 'category' field. Backend 'TransactionCreate' might need logic or we just send it as is if backend handles it?
        // Checking backend schema: expect 'category_id'. If we only have name, we might need a different approach or backend fix.
        // For now, let's map standard fields.
        to_account_id: transaction.toAccountId,
        tags: transaction.tags
    };
    // Fix: The store passes 'category' as string name. If backend requires ID, we have a problem.
    // However, let's assuming we just need to fix the case for now.
    // Re-reading backend schema: 'category_id' alias='categoryId'.
    // If we send 'categoryId', pydantic handles it.
    // The issue is likely 'accountId' -> 'account_id' mismatch if aliases aren't working or if we want to be explicit.
    // Let's be explicit to be safe.

    // Improved payload construction:
    const safePayload = {
        ...transaction,
        account_id: transaction.accountId,
        to_account_id: transaction.toAccountId,
        // Remove camelCase versions to avoid confusion/errors if strict
        accountId: undefined,
        toAccountId: undefined
    };

    const response = await apiClient.post<Transaction>('/transactions/', safePayload);
    return response.data;
};

export const updateTransaction = async (id: string, transaction: Partial<Transaction>): Promise<Transaction> => {
    const response = await apiClient.put<Transaction>(`/transactions/${id}`, transaction);
    return response.data;
};

export const deleteTransaction = async (id: string): Promise<void> => {
    await apiClient.delete(`/transactions/${id}`);
};
