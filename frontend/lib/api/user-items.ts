import apiClient from './client';
import { LimitRule, Position, RecurringExpense } from '@/types';

export type UserItems = { limits: LimitRule[]; positions: Position[]; recurringExpenses: RecurringExpense[] };
export const getUserItems = async () => (await apiClient.get<UserItems>('/user-items/')).data;
export const saveUserItem = async (kind: keyof UserItems, key: string, value: LimitRule | Position | RecurringExpense) => {
  await apiClient.put(`/user-items/${kind}/${encodeURIComponent(key)}`, value);
};
export const deleteUserItem = async (kind: keyof UserItems, key: string) => {
  await apiClient.delete(`/user-items/${kind}/${encodeURIComponent(key)}`);
};
