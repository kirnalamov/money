import apiClient from './client';
import { LimitRule, Position, RecurringExpense } from '@/types';

export type UserItems = { limits: LimitRule[]; positions: Position[]; recurringExpenses: RecurringExpense[] };
export const getUserItems = async () => (await apiClient.get<UserItems>('/user-items/')).data;
export const saveUserItem = async (kind: keyof UserItems, key: string, value: LimitRule | Position | RecurringExpense, onlyIfMissing = false) => {
  await apiClient.put(`/user-items/${kind}/${encodeURIComponent(key)}`, value, { params: onlyIfMissing ? { only_if_missing: true } : undefined });
};
export const deleteUserItem = async (kind: keyof UserItems, key: string) => {
  await apiClient.delete(`/user-items/${kind}/${encodeURIComponent(key)}`);
};
export const payUserExpense = async (key: string, accountId: number) => {
  await apiClient.post(`/user-items/recurringExpenses/${encodeURIComponent(key)}/pay`, { account_id: accountId });
};

export type Preferences = Record<string, Record<string, unknown>>;
export const getPreferences = async () => (await apiClient.get<Preferences>('/user-items/preferences')).data;
export const savePreferences = async (value: Preferences) => (await apiClient.put<Preferences>('/user-items/preferences', value)).data;
