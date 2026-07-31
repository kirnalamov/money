import apiClient from './client';
import { Category } from '@/types';

export const getCategories = async (): Promise<Category[]> => {
    const response = await apiClient.get<Category[]>('/categories/');
    return response.data;
};

export const createCategory = async (category: Omit<Category, 'id' | 'created_at' | 'updated_at'>): Promise<Category> => {
    const response = await apiClient.post<Category>('/categories/', category);
    return response.data;
};

export const updateCategory = async (id: string | number, category: Partial<Category>): Promise<Category> => {
    const response = await apiClient.put<Category>(`/categories/${id}`, category);
    return response.data;
};

export const deleteCategory = async (id: string | number): Promise<void> => {
    await apiClient.delete(`/categories/${id}`);
};
