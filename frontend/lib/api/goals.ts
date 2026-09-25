import apiClient from './client';
import { Goal } from '@/types';

interface GoalResponse {
    id: number;
    name: string;
    target_amount: number;
    current_amount: number;
    currency: Goal['currency'];
    deadline?: string;
    linked_account_id?: number;
}

interface GoalPayload {
    name?: string;
    target_amount?: number;
    current_amount?: number;
    currency?: Goal['currency'];
    deadline?: string;
    linked_account_id?: number;
}

const mapGoalToClient = (data: GoalResponse): Goal => ({
    ...data,
    targetAmount: data.target_amount,
    currentAmount: data.current_amount,
    linkedAccountId: data.linked_account_id
});

export const getGoals = async (): Promise<Goal[]> => {
    const response = await apiClient.get<GoalResponse[]>('/goals/');
    return response.data.map(mapGoalToClient);
};

export const createGoal = async (goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>): Promise<Goal> => {
    const payload: GoalPayload = {
        name: goal.name,
        target_amount: goal.targetAmount,
        current_amount: goal.currentAmount,
        currency: goal.currency,
        deadline: goal.deadline,
        linked_account_id: goal.linkedAccountId
    };
    const response = await apiClient.post<GoalResponse>('/goals/', payload);
    return mapGoalToClient(response.data);
};

export const updateGoal = async (id: number, goal: Partial<Goal>): Promise<Goal> => {
    const payload: GoalPayload = {
        name: goal.name,
        target_amount: goal.targetAmount,
        current_amount: goal.currentAmount,
        currency: goal.currency,
        deadline: goal.deadline,
        linked_account_id: goal.linkedAccountId
    };
    const response = await apiClient.put<GoalResponse>(`/goals/${id}`, payload);
    return mapGoalToClient(response.data);
};

export const deleteGoal = async (id: number): Promise<void> => {
    await apiClient.delete(`/goals/${id}`);
};
