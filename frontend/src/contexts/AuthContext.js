import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

// Decode JWT payload without verification (safe for client-side use)
// This gives us instant access to user info without a backend call
const decodeToken = (token) => {
    try {
        const payload = token.split('.')[1];
        const decoded = JSON.parse(atob(payload));
        // Check if token is expired
        if (decoded.exp && decoded.exp * 1000 < Date.now()) {
            return null; // Token expired
        }
        return decoded;
    } catch {
        return null;
    }
};

export const AuthProvider = ({ children }) => {
    const savedToken = sessionStorage.getItem('mec_token');
    const initDone = useRef(false);

    // Phase 1: Instantly restore user from token (no network needed)
    // This prevents ANY flash of Access Denied / Login page on refresh
    const getInitialUser = () => {
        if (!savedToken) return null;
        const decoded = decodeToken(savedToken);
        if (!decoded) {
            sessionStorage.removeItem('mec_token');
            return null;
        }
        // Return a minimal user object from the token
        // Full user data will be fetched from backend in the background
        return decoded._user || null;
    };

    const [user, setUser] = useState(() => {
        if (!savedToken) return null;
        const decoded = decodeToken(savedToken);
        return decoded ? decoded._user || null : null;
    });
    const [token, setToken] = useState(savedToken);
    // If we have a token, start as NOT loading (use decoded data immediately)
    // If no token, also not loading (we know they're not logged in)
    const [loading, setLoading] = useState(!!savedToken && !decodeToken(savedToken)?._user);

    useEffect(() => {
        if (initDone.current) return;
        initDone.current = true;

        const initAuth = async () => {
            const currentToken = sessionStorage.getItem('mec_token');
            if (!currentToken) {
                setLoading(false);
                return;
            }

            // Validate token client-side first
            const decoded = decodeToken(currentToken);
            if (!decoded) {
                // Token expired or invalid
                sessionStorage.removeItem('mec_token');
                delete api.defaults.headers.common['Authorization'];
                setToken(null);
                setUser(null);
                setLoading(false);
                return;
            }

            // Fetch full user data from backend
            try {
                api.defaults.headers.common['Authorization'] = `Bearer ${currentToken}`;
                const res = await api.get('/auth/me');
                setUser(res.data.user);
                setToken(currentToken);
            } catch (err) {
                if (err.response && err.response.status === 401) {
                    // Token rejected by server — clear it
                    sessionStorage.removeItem('mec_token');
                    delete api.defaults.headers.common['Authorization'];
                    setToken(null);
                    setUser(null);
                }
                // On network error: keep whatever user we have (decoded from token)
            } finally {
                setLoading(false);
            }
        };

        // Set auth header immediately from stored token
        if (savedToken) {
            api.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
        }

        initAuth();
    }, []);

    const login = async (email, password, role) => {
        const res = await api.post('/auth/login', { email, password, role });
        const { token: newToken, user: userData } = res.data;
        sessionStorage.setItem('mec_token', newToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        setToken(newToken);
        setUser(userData);
        return userData;
    };

    const logout = () => {
        sessionStorage.removeItem('mec_token');
        delete api.defaults.headers.common['Authorization'];
        setToken(null);
        setUser(null);
        window.location.href = '/login';
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};
