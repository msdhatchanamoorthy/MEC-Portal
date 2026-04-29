/**
 * Safe environment variable accessor for both Vite and CRA.
 * Prevents "process is not defined" ReferenceErrors.
 */
export const getEnv = (key) => {
    // 1. Check Vite style (import.meta.env)
    try {
        if (typeof import.meta !== 'undefined' && import.meta.env) {
            const viteKey = key.startsWith('VITE_') ? key : `VITE_${key.replace('REACT_APP_', '')}`;
            if (import.meta.env[viteKey]) return import.meta.env[viteKey];
        }
    } catch (e) {
        // Fall through
    }

    // 2. Check CRA style (process.env)
    try {
        if (typeof process !== 'undefined' && process.env) {
            const craKey = key.startsWith('REACT_APP_') ? key : `REACT_APP_${key.replace('VITE_', '')}`;
            if (process.env[craKey]) return process.env[craKey];
        }
    } catch (e) {
        // Fall through
    }

    return undefined;
};

export const API_URL = getEnv('API_URL') || '/api';
