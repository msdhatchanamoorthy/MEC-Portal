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
        <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="card-title">📢 Notice Board & Circulars</div>
                {(userRole === 'principal' || userRole === 'hod') && (
                    <button className="btn btn-primary btn-sm" onClick={onCreateClick}>
                        + New Notice
                    </button>
                )}
            </div>
            <div className="card-body" style={{ maxHeight: '400px', overflowY: 'auto', padding: '16px' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                        <div className="spinner spinner-dark" />
                    </div>
                ) : notices.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {notices.map((notice) => (
                            <div key={notice._id} style={{ padding: 16, border: '1px solid var(--gray-200)', borderRadius: 8, background: '#FAFAFA' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                    <h4 style={{ margin: 0, color: 'var(--primary)', fontSize: 16 }}>{notice.title}</h4>
                                    {(userRole === 'principal' || userRole === 'hod') && (
                                        <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(notice._id)} style={{ padding: '4px', fontSize: 16 }}>
                                            🗑️
                                        </button>
                                    )}
                                </div>
                                <p style={{ fontSize: 14, color: 'var(--gray-700)', margin: '0 0 12px 0', whiteSpace: 'pre-wrap' }}>
                                    {notice.content}
                                </p>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--gray-500)' }}>
                                    <span>By: {notice.authorName} ({notice.authorRole.toUpperCase()})</span>
                                    <span>{new Date(notice.createdAt).toLocaleString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--gray-500)' }}>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                        <p>No new notices</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NoticeBoard;
