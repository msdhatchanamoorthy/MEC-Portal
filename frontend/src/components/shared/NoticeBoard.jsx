import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const NoticeBoard = ({ userRole, onCreateClick }) => {
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchNotices = async () => {
        setLoading(true);
        try {
            const res = await api.get('/notices');
            setNotices(res.data.data || []);
        } catch (err) {
            console.error('Failed to load notices', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotices();
    }, []);

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this notice?')) return;
        try {
            await api.delete(`/notices/${id}`);
            toast.success('Notice deleted');
            fetchNotices();
        } catch (err) {
            toast.error('Failed to delete notice');
        }
    };

    return (
        <div className="card glass" style={{ marginBottom: 24, border: 'none', boxShadow: 'var(--glass-shadow)' }}>
            <div className="card-header" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', padding: '20px 24px' }}>
                <div className="card-title" style={{ fontSize: 16, color: 'var(--primary-dark)' }}>
                    <span style={{ fontSize: 18 }}>📢</span> NOTICE BOARD & CIRCULARS
                </div>
                {['principal', 'hod', 'staff'].includes(userRole) && (
                    <button className="btn btn-primary btn-sm" onClick={onCreateClick} style={{ borderRadius: 30, padding: '6px 16px' }}>
                        + NEW NOTICE
                    </button>
                )}
            </div>
            <div className="card-body" style={{ maxHeight: '450px', overflowY: 'auto', padding: '24px' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        <div className="spinner spinner-dark" />
                        <p style={{ marginTop: 12, fontSize: 12, color: 'var(--gray-500)' }}>Syncing Announcements...</p>
                    </div>
                ) : notices.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {notices.map((notice) => (
                            <div key={notice._id} className="notice-item" style={{ 
                                padding: 20, 
                                background: 'var(--gray-100)',
                                border: '1px solid var(--gray-200)',
                                borderRadius: 16,
                                boxShadow: 'var(--glass-shadow)',
                                transition: 'var(--transition)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                    <h4 style={{ margin: 0, color: 'var(--primary)', fontSize: 17, fontWeight: 900 }}>{notice.title}</h4>
                                    {['principal', 'hod', 'staff'].includes(userRole) && (
                                        <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(notice._id)} style={{ padding: '6px', borderRadius: '50%', color: 'var(--danger)' }}>
                                            🗑️
                                        </button>
                                    )}
                                </div>
                                <p style={{ fontSize: 14, color: 'var(--gray-800)', margin: '0 0 16px 0', whiteSpace: 'pre-wrap', lineHeight: 1.6, fontWeight: 600 }}>
                                    {notice.content}
                                </p>
                                    <div style={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between', 
                                        alignItems: 'center', 
                                        paddingTop: 12,
                                        borderTop: '1px solid var(--gray-200)',
                                        fontSize: 12, 
                                        color: 'var(--gray-500)',
                                        fontWeight: 700
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <div style={{ width: 24, height: 24, background: 'var(--gray-100)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--gray-600)', fontWeight: 800 }}>
                                                {notice.authorName[0]}
                                            </div>
                                            <span>By Prof. {notice.authorName} <span style={{ opacity: 0.8 }}>• {notice.authorRole.toUpperCase()}</span></span>
                                        </div>
                                        <span>{new Date(notice.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '60px 10px', color: 'var(--gray-400)' }}>
                        <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
                        <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--gray-500)' }}>No New Announcements</h3>
                        <p style={{ fontSize: 13 }}>When notices are posted, they will appear here.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NoticeBoard;
