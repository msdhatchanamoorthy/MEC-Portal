import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import socket from '../../services/socket';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export function NotificationCenter() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const res = await api.get('/notifications');
            const data = res.data.data || [];
            setNotifications(data);
            setUnreadCount(data.filter(n => !n.read).length);
        } catch (err) {
            console.error('Failed to fetch notifications');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchNotifications();

        if (socket) {
            socket.on('new_notification', (notification) => {
                setNotifications(prev => [notification, ...prev]);
                setUnreadCount(prev => prev + 1);
                toast(`🔔 ${notification.title}: ${notification.message}`, {
                    duration: 5000,
                    position: 'top-right',
                    style: {
                        background: 'var(--primary-dark)',
                        color: '#fff',
                        borderRadius: '12px',
                        fontSize: '13px',
                        fontWeight: '600'
                    }
                });
            });
        }

        return () => {
            if (socket) socket.off('new_notification');
        };
    }, [fetchNotifications]);

    const markAllAsRead = async () => {
        try {
            await api.put('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (err) {
            toast.error('Failed to mark all as read');
        }
    };

    const markAsRead = async (id) => {
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            toast.error('Failed to mark as read');
        }
    };

    if (!user || (user.role !== 'hod' && !user.email.includes('.ca@mec.in'))) return null;

    return (
        <div className="notification-center" style={{ position: 'relative' }}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
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
                    position: 'relative',
                    transition: 'var(--transition)'
                }}
            >
                🔔
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: '-5px',
                        right: '-5px',
                        background: 'var(--danger)',
                        color: 'white',
                        borderRadius: '50%',
                        width: '20px',
                        height: '20px',
                        fontSize: '11px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '800',
                        border: '2px solid white'
                    }}>
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '50px',
                    right: '0',
                    width: '320px',
                    background: 'white',
                    borderRadius: '16px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                    zIndex: 1000,
                    overflow: 'hidden',
                    border: '1px solid var(--gray-200)'
                }}>
                    <div style={{ padding: '16px', borderBottom: '1px solid var(--gray-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--primary-dark)' }}>Notifications</h4>
                        {unreadCount > 0 && (
                            <button onClick={markAllAsRead} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                                Mark all as read
                            </button>
                        )}
                    </div>

                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        {loading && notifications.length === 0 ? (
                            <div style={{ padding: '40px', textAlign: 'center' }}>
                                <div className="spinner-mini" style={{ margin: '0 auto' }}></div>
                            </div>
                        ) : notifications.length > 0 ? (
                            notifications.map(n => (
                                <div 
                                    key={n._id} 
                                    onClick={() => !n.read && markAsRead(n._id)}
                                    style={{ 
                                        padding: '16px', 
                                        borderBottom: '1px solid var(--gray-50)', 
                                        background: n.read ? 'transparent' : 'rgba(99, 102, 241, 0.05)',
                                        cursor: 'pointer',
                                        transition: 'background 0.2s'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--gray-900)' }}>{n.title}</span>
                                        <span style={{ fontSize: '10px', color: 'var(--gray-500)', fontWeight: 700 }}>
                                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--gray-600)', lineHeight: '1.4', fontWeight: 600 }}>{n.message}</p>
                                </div>
                            ))
                        ) : (
                            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-400)' }}>
                                <p style={{ margin: 0, fontSize: '13px', fontWeight: 700 }}>No new notifications</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

