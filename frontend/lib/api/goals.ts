import apiClient from './client';
import { Goal } from '@/types';

const mapGoalToClient = (data: any): Goal => ({
    ...data,
    targetAmount: data.target_amount,
    currentAmount: data.current_amount,
    linkedAccountId: data.linked_account_id
});

export const getGoals = async (): Promise<Goal[]> => {
    const response = await apiClient.get<any[]>('/goals/');
    return response.data.map(mapGoalToClient);
};

export const createGoal = async (goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>): Promise<Goal> => {
    const payload = {
        name: goal.name,
        target_amount: goal.targetAmount,
        current_amount: goal.currentAmount,
        deadline: goal.deadline,
        linked_account_id: goal.linkedAccountId
    };
    const response = await apiClient.post<any>('/goals/', payload);
    return mapGoalToClient(response.data);
};

export const updateGoal = async (id: string, goal: Partial<Goal>): Promise<Goal> => {
    const payload: any = {
        ...goal,
        target_amount: goal.targetAmount,
        current_amount: goal.currentAmount,
        linked_account_id: goal.linkedAccountId
    };
    const response = await apiClient.put<any>(`/goals/${id}`, payload);
    return mapGoalToClient(response.data);
};

export const deleteGoal = async (id: string): Promise<void> => {
    await apiClient.delete(`/goals/${id}`);
};
