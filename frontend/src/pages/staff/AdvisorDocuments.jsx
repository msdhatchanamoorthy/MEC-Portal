import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import api, { getFileUrl } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const AdvisorDocuments = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [docs, setDocs] = useState([]);
    const [loading, setLoading] = useState(true);

    // Strict CA check
    const isCA = user?.role === 'staff' && user?.email?.includes('.ca@');

    const fetchDocs = async () => {
        if (!isCA) return;
        try {
            const res = await api.get('/advisor/documents');
            setDocs(res.data.data || []);
        } catch (err) {
            toast.error('Failed to load documents');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDocs();
    }, []);

    if (!isCA) return <Navigate to="/unauthorized" replace />;

    const handleVerify = async (id, status) => {
        const remarks = prompt('Enter remarks (optional):');
        try {
            await api.put(`/advisor/documents/${id}`, { status, remarks });
            toast.success(`Document ${status}`);
            fetchDocs();
        } catch (err) {
            toast.error('Update failed');
        }
    };

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <Topbar title="Student Documents" subtitle="Verify certificates and photos uploaded by students" />
                <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="page-content"
                >
                    <div className="page-header" style={{ marginBottom: 24 }}>
                        <div className="page-header-left">
                            <h2 style={{ fontSize: 24, fontWeight: 900, color: 'var(--primary-dark)', letterSpacing: -0.5 }}>📂 Student Document Verification</h2>
                            <p style={{ fontSize: 13, color: 'var(--gray-600)', fontWeight: 600 }}>Review and verify academic certificates and profile documents</p>
                        </div>
                    </div>

                    {/* Verification Stats */}
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(4, 1fr)', 
                        gap: 20, 
                        marginBottom: 24 
                    }}>
                        <div className="stat-card" style={{ padding: '20px', borderRadius: 20, background: 'var(--accent-gradient)', color: 'white', border: 'none' }}>
                            <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.8, textTransform: 'uppercase', letterSpacing: 1 }}>Pending Reviews</div>
                            <div style={{ fontSize: 28, fontWeight: 900, marginTop: 4 }}>{docs.filter(d => d.status === 'Pending').length}</div>
                            <div style={{ fontSize: 10, marginTop: 4, opacity: 0.7 }}>Awaiting verification</div>
                        </div>
                        <div className="stat-card" style={{ padding: '20px', borderRadius: 20, background: 'white', border: '1px solid var(--gray-200)' }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: 1 }}>Verified Today</div>
                            <div style={{ fontSize: 28, fontWeight: 900, marginTop: 4, color: 'var(--success)' }}>{docs.filter(d => d.status === 'Verified').length}</div>
                            <div style={{ fontSize: 10, marginTop: 4, color: 'var(--gray-400)' }}>Processed documents</div>
                        </div>
                        <div className="stat-card" style={{ padding: '20px', borderRadius: 20, background: 'white', border: '1px solid var(--gray-200)' }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: 1 }}>Rejections</div>
                            <div style={{ fontSize: 28, fontWeight: 900, marginTop: 4, color: 'var(--danger)' }}>{docs.filter(d => d.status === 'Rejected').length}</div>
                            <div style={{ fontSize: 10, marginTop: 4, color: 'var(--gray-400)' }}>Flagged for correction</div>
                        </div>
                        <div className="stat-card" style={{ padding: '20px', borderRadius: 20, background: 'white', border: '1px solid var(--gray-200)' }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: 1 }}>Total Uploads</div>
                            <div style={{ fontSize: 28, fontWeight: 900, marginTop: 4, color: 'var(--primary)' }}>{docs.length}</div>
                            <div style={{ fontSize: 10, marginTop: 4, color: 'var(--gray-400)' }}>Lifetime submissions</div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header">
                            <div className="card-title">📁 Submission Queue</div>
                        </div>
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Student</th>
                                        <th>Title</th>
                                        <th>Category</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {docs.map(doc => (
                                        <tr key={doc._id}>
                                            <td>
                                                <div style={{ fontWeight: 700 }}>{doc.student?.name}</div>
                                                <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>{doc.student?.email}</div>
                                            </td>
                                            <td style={{ fontWeight: 600 }}>{doc.title}</td>
                                            <td><span className="badge badge-info">{doc.category}</span></td>
                                            <td>
                                                <span className={`badge ${
                                                    doc.status === 'Verified' ? 'badge-success' : 
                                                    doc.status === 'Rejected' ? 'badge-danger' : 'badge-warning'
                                                }`}>
                                                    {doc.status}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    <a href={getFileUrl(doc.fileUrl)} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">👁️ View</a>
                                                    <button 
                                                        onClick={() => navigate('/advisor/messages', { state: { student: doc.student } })} 
                                                        className="btn btn-outline btn-sm"
                                                        style={{ border: '1px solid var(--accent)', color: 'var(--accent)' }}
                                                    >
                                                        💬 Chat
                                                    </button>
                                                    {doc.status === 'Pending' && (
                                                        <>
                                                            <button onClick={() => handleVerify(doc._id, 'Verified')} className="btn btn-success btn-sm">✅ Verify</button>
                                                            <button onClick={() => handleVerify(doc._id, 'Rejected')} className="btn btn-danger btn-sm">❌ Reject</button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {docs.length === 0 && !loading && (
                                        <tr>
                                            <td colSpan="5" style={{ textAlign: 'center', padding: 40 }}>No documents to review.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default AdvisorDocuments;
