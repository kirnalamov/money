import apiClient from './client';
import { LoginRequest, LoginResponse, RegisterRequest, TokenRefreshRequest, TokenRefreshResponse, User } from '@/types/auth';
import { setTokens, clearTokens } from '@/lib/auth/token-manager';

/**
 * Login with username and password
 */
export const login = async (username: string, password: string): Promise<LoginResponse> => {
    // Backend expects form data for OAuth2 compatibility
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const response = await apiClient.post<LoginResponse>('/auth/login', formData, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    });

    // Store tokens
    setTokens(response.data.access_token, response.data.refresh_token);

    return response.data;
};

/**
 * Register a new user
 */
export const register = async (data: RegisterRequest): Promise<User> => {
    const response = await apiClient.post<User>('/auth/register', data);
    return response.data;
};

/**
 * Logout and revoke refresh token
 */
export const logout = async (refreshToken: string): Promise<void> => {
    try {
        await apiClient.post('/auth/logout', { refresh_token: refreshToken });
    } finally {
        // Clear tokens even if logout request fails
        clearTokens();
    }
};

/**
 * Refresh access token
 */
export const refreshAccessToken = async (refreshToken: string): Promise<TokenRefreshResponse> => {
    const response = await apiClient.post<TokenRefreshResponse>('/auth/refresh', {
        refresh_token: refreshToken,
    });

    // Update stored tokens
    setTokens(response.data.access_token, response.data.refresh_token);

    return response.data;
};

/**
 * Get current authenticated user
 */
export const getCurrentUser = async (): Promise<User> => {
    const response = await apiClient.get<User>('/users/me');
    return response.data;
};
