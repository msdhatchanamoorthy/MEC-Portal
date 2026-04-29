import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useUI } from '../contexts/UIContext';

const Topbar = ({ title, subtitle }) => {
    const [now, setNow] = useState(new Date());
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const { isDarkMode, toggleTheme } = useTheme();
    const { toggleSidebar } = useUI();

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            clearInterval(timer);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const dateStr = now.toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    const timeStr = now.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });

    return (
        <header className="topbar">
            <div className="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <button 
                    className="mobile-toggle"
                    onClick={toggleSidebar}
                    style={{
                        display: 'none',
                        background: 'var(--gray-100)',
                        border: '1px solid var(--gray-200)',
                        borderRadius: '12px',
                        width: '40px',
                        height: '40px',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontSize: '20px'
                    }}
                >
                    ☰
                </button>
                <div>
                    <h1 style={{ fontSize: 16, fontWeight: 900, color: 'var(--primary-dark)', margin: 0 }}>{title}</h1>
                    {subtitle && <p style={{ fontSize: 11, color: 'var(--gray-900)', margin: '2px 0 0 0', fontWeight: 800 }}>{subtitle}</p>}
                </div>
            </div>
            <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                {!isOnline && (
                    <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', padding: '6px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '6px', animation: 'pulse 2s infinite' }}>
                        <span style={{ width: 8, height: 8, background: '#EF4444', borderRadius: '50%' }}></span>
                        OFFLINE MODE
                    </div>
                )}
                <button 
                    onClick={toggleTheme}
                    className="theme-toggle-btn"
                    style={{
                        background: 'var(--gray-100)',
                        border: '1px solid var(--gray-200)',
                        borderRadius: '12px',
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontSize: '18px',
                        transition: 'var(--transition)',
                        color: 'var(--gray-800)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                    }}
                    title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                    {isDarkMode ? '🌙' : '☀️'}
                </button>

                <div className="topbar-date" style={{ fontSize: 13, fontWeight: 800, color: 'var(--gray-900)', background: 'var(--gray-100)', padding: '8px 18px', borderRadius: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span>🗓️ {dateStr}</span>
                    <span style={{ color: 'var(--gray-600)' }}>|</span>
                    <span style={{ color: 'var(--accent)', fontWeight: 800 }}>🕛 {timeStr}</span>
                </div>
            </div>
        </header>
    );
};

export default Topbar;
