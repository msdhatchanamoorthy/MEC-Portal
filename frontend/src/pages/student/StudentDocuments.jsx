import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import api, { getFileUrl } from '../../services/api';
import toast from 'react-hot-toast';

const StudentDocuments = () => {
    const [docs, setDocs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        category: 'Certificate'
    });
    const [file, setFile] = useState(null);

    const fetchDocs = async () => {
        try {
            const res = await api.get('/student/documents');
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

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return toast.error('Please select a file');
        if (file.size > 5 * 1024 * 1024) return toast.error('File size exceeds 5MB limit');
        
        const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) return toast.error('Only JPG, PNG and PDF allowed');

        setUploading(true);
        try {
            // 1. Upload to storage (mimic with existing upload endpoint)
            const uploadData = new FormData();
            uploadData.append('proof', file); // using existing proof endpoint for simplicity
            const uploadRes = await api.post('/attendance/upload-proof', uploadData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // 2. Save document record
            await api.post('/student/documents', {
                ...formData,
                fileUrl: uploadRes.data.url
            });

            toast.success('Document uploaded successfully! Advisor notified.');
            setFormData({ title: '', category: 'Certificate' });
            setFile(null);
            fetchDocs();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <Topbar title="My Uploads" subtitle="Manage your certificates and photos" />
                <div className="page-content">
                    <div className="card" style={{ marginBottom: 24 }}>
                        <div className="card-header">
                            <div className="card-title">📤 Upload New Document</div>
                        </div>
                        <div className="card-body">
                            <form onSubmit={handleUpload} className="form-row" style={{ alignItems: 'flex-end' }}>
                                <div className="form-group" style={{ flex: 2 }}>
                                    <label className="form-label">Document Title</label>
                                    <input 
                                        type="text" 
                                        className="form-control" 
                                        placeholder="e.g. Hackathon Certificate"
                                        value={formData.title}
                                        onChange={e => setFormData({...formData, title: e.target.value})}
                                        required
                                    />
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label className="form-label">Category</label>
                                    <select 
                                        className="form-control"
                                        value={formData.category}
                                        onChange={e => setFormData({...formData, category: e.target.value})}
                                    >
                                        <option value="Certificate">Certificate</option>
                                        <option value="Photo">Photo</option>
                                        <option value="Project">Project</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label className="form-label">Select File (JPG, PNG, PDF)</label>
                                    <input 
                                        type="file" 
                                        className="form-control" 
                                        onChange={e => setFile(e.target.files[0])}
                                        accept=".jpg,.jpeg,.png,.pdf"
                                        required
                                    />
                                </div>
                                <button type="submit" className="btn btn-primary" disabled={uploading} style={{ height: 42, marginBottom: 15 }}>
                                    {uploading ? 'Uploading...' : 'Upload Now'}
                                </button>
                            </form>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header">
                            <div className="card-title">📜 Upload History</div>
                        </div>
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Title</th>
                                        <th>Category</th>
                                        <th>Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {docs.map(doc => (
                                        <tr key={doc._id}>
                                            <td>{new Date(doc.createdAt).toLocaleDateString()}</td>
                                            <td style={{ fontWeight: 700 }}>{doc.title}</td>
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
                                                <a href={getFileUrl(doc.fileUrl)} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">👁️ View</a>
                                            </td>
                                        </tr>
                                    ))}
                                    {docs.length === 0 && !loading && (
                                        <tr>
                                            <td colSpan="5" style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>No documents uploaded yet.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentDocuments;
