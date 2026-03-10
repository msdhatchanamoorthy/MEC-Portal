import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    headers: { 'Content-Type': 'application/json' },
});

// Request interceptor to attach token
api.interceptors.request.use(
    (config) => {
        const token = sessionStorage.getItem('mec_token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor for global error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const isAuthCheck = error.config?.url?.includes('/auth/me');
        const is401 = error.response?.status === 401;
        const notOnLogin = !window.location.pathname.includes('/login');

        // Only auto-redirect on 401 if it's NOT the initial auth check
        // (AuthContext handles /auth/me failures itself)
        if (is401 && notOnLogin && !isAuthCheck) {
            sessionStorage.removeItem('mec_token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
