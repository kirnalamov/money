import apiClient from './client';
import { User, UserUpdateRequest } from '@/types/auth';

/**
 * Get current user profile
 */
export const getProfile = async (): Promise<User> => {
    const response = await apiClient.get<User>('/users/me');
    return response.data;
};

/**
 * Update current user profile
 */
export const updateProfile = async (data: UserUpdateRequest): Promise<User> => {
    const response = await apiClient.put<User>('/users/me', data);
    return response.data;
};
