import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '@/lib/auth/token-manager';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// Create axios instance
export const apiClient: AxiosInstance = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = getAccessToken();

        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
let isRefreshing = false;
let failedQueue: Array<{
    resolve: (value?: any) => void;
    reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });

    failedQueue = [];
};

apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // If error is 401 and we haven't tried to refresh yet
        if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/login')) {
            if (isRefreshing) {
                // If already refreshing, queue this request
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        if (originalRequest.headers) {
                            originalRequest.headers.Authorization = `Bearer ${token}`;
                        }
                        return apiClient(originalRequest);
                    })
                    .catch((err) => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const refreshToken = getRefreshToken();

            if (!refreshToken) {
                isRefreshing = false;
                // No refresh token, clear auth and redirect to login
                clearTokens();
                // Avoid redirect loop or clearing state if already on login page
                if (window.location.pathname !== '/login' && !originalRequest.url?.includes('/auth/login')) {
                    window.location.href = '/login';
                }
                return Promise.reject(error);
            }


            try {
                const requestAccessToken = originalRequest.headers?.Authorization?.toString().replace(/^Bearer /, '');
                const refresh = async () => {
                    const currentRefreshToken = getRefreshToken();
                    if (!currentRefreshToken) throw new Error('Сессия завершена');
                    if (currentRefreshToken !== refreshToken || getAccessToken() !== requestAccessToken) {
                        const currentAccessToken = getAccessToken();
                        if (!currentAccessToken) throw new Error('Сессия завершена');
                        return currentAccessToken;
                    }
                    const response = await axios.post(`${API_URL}/auth/refresh`, { refresh_token: currentRefreshToken });
                    if (getRefreshToken() !== currentRefreshToken) throw new Error('Сессия изменилась');
                    const { access_token, refresh_token: newRefreshToken } = response.data;
                    setTokens(access_token, newRefreshToken);
                    return access_token as string;
                };
                // shortcut: без Web Locks вкладки могут конфликтовать; добавить координацию для старых браузеров при их поддержке.
                const access_token = navigator.locks ? await navigator.locks.request('plutus-token-refresh', refresh) : await refresh();

                // Update the original request with new token
                if (originalRequest.headers) {
                    originalRequest.headers.Authorization = `Bearer ${access_token}`;
                }

                processQueue(null, access_token);

                // Retry the original request
                return apiClient(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);
                if (getRefreshToken() === refreshToken) {
                    clearTokens();
                    window.location.href = '/login';
                }
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default apiClient;
