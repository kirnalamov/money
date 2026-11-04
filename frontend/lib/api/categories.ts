import apiClient from './client';
import { Category } from '@/types';

export const getCategories = async (): Promise<Category[]> => {
    const categories: Category[] = [];
    let page: Category[];
    do {
        const response = await apiClient.get<Category[]>('/categories/', { params: { skip: categories.length, limit: 100 } });
        page = response.data;
        categories.push(...page);
    } while (page.length === 100);
    return categories;
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
