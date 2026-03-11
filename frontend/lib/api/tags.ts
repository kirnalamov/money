import apiClient from './client';
import { Tag } from '@/types';

export const getTags = async (): Promise<Tag[]> => {
    const response = await apiClient.get<Tag[]>('/tags/');
    return response.data;
};

export const createTag = async (tag: Omit<Tag, 'id' | 'created_at' | 'updated_at'>): Promise<Tag> => {
    const response = await apiClient.post<Tag>('/tags/', tag);
    return response.data;
};

export const updateTag = async (id: string | number, tag: Partial<Tag>): Promise<Tag> => {
    const response = await apiClient.put<Tag>(`/tags/${id}`, tag);
    return response.data;
};

export const deleteTag = async (id: string | number): Promise<void> => {
    await apiClient.delete(`/tags/${id}`);
};
