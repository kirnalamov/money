// Authentication and User types

export interface User {
    id: number;
    email: string;
    username: string;
    full_name: string | null;
    is_active: boolean;
    is_superuser: boolean;
    role: string;
    created_at: string;
    updated_at: string;
}

export interface LoginRequest {
    username: string;
    password: string;
}

export interface LoginResponse {
    access_token: string;
    refresh_token: string;
    token_type: string;
}

export interface RegisterRequest {
    email: string;
    username: string;
    password: string;
    full_name?: string;
}

export interface TokenRefreshRequest {
    refresh_token: string;
}

export interface TokenRefreshResponse {
    access_token: string;
    refresh_token: string;
    token_type: string;
}

export interface UserUpdateRequest {
    email?: string;
    full_name?: string;
    password?: string;
}

export interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (username: string, password: string) => Promise<void>;
    register: (data: RegisterRequest) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
    updateProfile: (data: UserUpdateRequest) => Promise<void>;
}

export interface ApiError {
    detail: string | Array<{
        type: string;
        loc: string[];
        msg: string;
        input: any;
    }>;
}
