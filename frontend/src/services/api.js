import axios from 'axios';
import { API_URL } from '../config/env';

/**
 * Modern Axios instance with production-ready interceptors.
 */
const api = axios.create({
    baseURL: API_URL,
    headers: { 
        'Content-Type': 'application/json' 
    },
});

// Request interceptor: Attach Auth Token
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

// Response interceptor: Handle Global Errors (like 401 Unauthorized)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const { response, config } = error;
        
        // Prevent infinite loops on /auth/me checks
        const isAuthCheck = config?.url?.includes('/auth/me');
        const is401 = response?.status === 401;
        const isLoginPage = window.location.pathname.includes('/login');

        if (is401 && !isLoginPage && !isAuthCheck) {
            sessionStorage.removeItem('mec_token');
            // Use window.location for hard reload on auth failure
            window.location.href = '/login?session=expired';
        }

        // Standardized error object for frontend consumption
        const errorMessage = response?.data?.message || error.message || 'An unexpected error occurred';
        return Promise.reject({ ...error, errorMessage });
    }
);

/**
 * Helper to resolve file paths from the backend (Images/PDFs)
 */
export const getFileUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    
    // Clean base URL (remove /api if present)
    const cleanBase = API_URL.replace(/\/api$/, '');
    
    // Fallback for local development if base is just a path
    if (!cleanBase || cleanBase === '/') {
        if (window.location.hostname === 'localhost') {
            return `http://localhost:5001${path}`;
        }
    }
    
    return `${cleanBase}${path}`;
};

export default api;
