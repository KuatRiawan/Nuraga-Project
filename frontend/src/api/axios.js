import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor for token refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If error is 401 and we haven't tried refreshing yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            const refreshToken = localStorage.getItem('refreshToken');
            if (!refreshToken) {
                // No refresh token available, force logout
                localStorage.removeItem('token');
                localStorage.removeItem('refreshToken');
                window.location.href = '/login';
                return Promise.reject(error);
            }

            try {
                // Try to refresh the token
                const refreshResponse = await axios.post(
                    `${import.meta.env.VITE_API_BASE_URL || '/api'}/auth/refresh-token`,
                    { refreshToken }
                );

                const { token: newToken, refreshToken: newRefreshToken } = refreshResponse.data;

                // Store new tokens
                localStorage.setItem('token', newToken);
                localStorage.setItem('refreshToken', newRefreshToken);

                // Update authorization header for the original request
                originalRequest.headers.Authorization = `Bearer ${newToken}`;

                // Retry the original request
                return api(originalRequest);
            } catch (refreshError) {
                // Refresh token failed or expired, force logout
                localStorage.removeItem('token');
                localStorage.removeItem('refreshToken');
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
