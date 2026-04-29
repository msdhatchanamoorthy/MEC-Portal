import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

/**
 * Safely decode JWT without external libraries
 */
const decodeToken = (token) => {
    if (!token) return null;
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        
        const payload = parts[1];
        // Support Unicode decoding
        const decoded = JSON.parse(decodeURIComponent(atob(payload).split('').map(c => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join('')));
        
        // Expiry Check
        if (decoded.exp && decoded.exp * 1000 < Date.now()) {
            return null;
        }
        return decoded;
    } catch (e) {
        console.error('Auth: Token decoding failed', e);
        return null;
    }
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(() => sessionStorage.getItem('mec_token'));
    const [loading, setLoading] = useState(true);
    const initStarted = useRef(false);

    // Bootstrap Auth State
    useEffect(() => {
        if (initStarted.current) return;
        initStarted.current = true;

        const bootstrap = async () => {
            const storedToken = sessionStorage.getItem('mec_token');
            
            if (!storedToken) {
                setLoading(false);
                return;
            }

            // 1. Optimistic UI: Try to set user from token immediately
            const decoded = decodeToken(storedToken);
            if (decoded && decoded._user) {
                setUser(decoded._user);
            }

            // 2. Verification: Confirm with Backend
            try {
                const res = await api.get('/auth/me');
                setUser(res.data.user);
            } catch (err) {
                // If it's a 401, api.js interceptor will handle redirect
                // If it's a network error, we keep the optimistic user data
                console.warn('Auth: Backend verification failed, using cached state');
            } finally {
                setLoading(false);
            }
        };

        bootstrap();
    }, []);

    const login = async (email, password, role) => {
        try {
            const res = await api.post('/auth/login', { email, password, role });
            const { token: newToken, user: userData } = res.data;
            
            sessionStorage.setItem('mec_token', newToken);
            setToken(newToken);
            setUser(userData);
            
            return userData;
        } catch (error) {
            throw error.errorMessage || 'Login failed';
        }
    };

    const logout = () => {
        sessionStorage.removeItem('mec_token');
        setToken(null);
        setUser(null);
        window.location.href = '/login';
    };

    const value = {
        user,
        token,
        loading,
        login,
        logout,
        isAuthenticated: !!user
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
            {loading && (
                <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4" />
                    <p className="text-gray-400 font-medium animate-pulse text-sm tracking-widest uppercase">MEC Secure Link</p>
                </div>
            )}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};
