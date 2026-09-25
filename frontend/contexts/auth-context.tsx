"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, AuthContextType, RegisterRequest, UserUpdateRequest } from '@/types/auth';
import * as authApi from '@/lib/api/auth';
import * as usersApi from '@/lib/api/users';
import { hasTokens, getRefreshToken, clearTokens } from '@/lib/auth/token-manager';
import { useStore } from '@/lib/store';
import { useRouter } from 'next/navigation';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const resetStore = useStore((state) => state.reset);
    const refreshExchangeRates = useStore((state) => state.refreshExchangeRates);

    // Load user on mount if tokens exist
    const loadUser = useCallback(async () => {
        // Never render persisted financial data before the current session is known.
        resetStore();

        if (!hasTokens()) {

            setIsLoading(false);
            return;
        }

        try {
            const userData = await authApi.getCurrentUser();
            setUser(userData);
        } catch (error) {
            console.error('Failed to load user:', error);
            clearTokens();
            setUser(null);
            resetStore();
        } finally {
            setIsLoading(false);
        }
    }, [resetStore]);

    useEffect(() => {
        loadUser();
    }, [loadUser]);

    useEffect(() => {
        if (!user) return;

        void refreshExchangeRates();
        const interval = window.setInterval(() => {
            void refreshExchangeRates();
        }, 60 * 60 * 1000);

        return () => window.clearInterval(interval);
    }, [user, refreshExchangeRates]);

    const login = async (username: string, password: string) => {
        setIsLoading(true);
        try {
            await authApi.login(username, password);
            const userData = await authApi.getCurrentUser();
            setUser(userData);
            router.push('/');
        } catch (error: any) {
            console.error('Login failed:', error);
            throw new Error(error.response?.data?.detail || 'Login failed');
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (data: RegisterRequest) => {
        setIsLoading(true);
        try {
            await authApi.register(data);
            router.push('/login');
        } catch (error: any) {
            console.error('Registration failed:', error);
            const errorDetail = error.response?.data?.detail;
            if (typeof errorDetail === 'string') {
                throw new Error(errorDetail);
            } else if (Array.isArray(errorDetail)) {
                throw new Error(errorDetail[0]?.msg || 'Registration failed');
            }
            throw new Error('Registration failed');
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        setIsLoading(true);
        try {
            const refreshToken = getRefreshToken();
            if (refreshToken) {
                await authApi.logout(refreshToken);
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            resetStore();
            setUser(null);
            router.push('/login');
            setIsLoading(false);
        }
    };

    const refreshUser = async () => {
        try {
            const userData = await authApi.getCurrentUser();
            setUser(userData);
        } catch (error) {
            console.error('Failed to refresh user:', error);
            throw error;
        }
    };

    const updateProfile = async (data: UserUpdateRequest) => {
        try {
            const updatedUser = await usersApi.updateProfile(data);
            setUser(updatedUser);
        } catch (error: any) {
            console.error('Profile update failed:', error);
            throw new Error(error.response?.data?.detail || 'Profile update failed');
        }
    };

    const value: AuthContextType = {
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
        updateProfile,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
