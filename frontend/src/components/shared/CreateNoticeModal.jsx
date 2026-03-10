import React, { useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const CreateNoticeModal = ({ isOpen, onClose, onSuccess }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [targetRoles, setTargetRoles] = useState(['all']);
    const [submitting, setSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title || !content) return toast.error('Please fill all fields');
        setSubmitting(true);
        try {
            await api.post('/notices', { title, content, targetRoles });
            toast.success('Notice published successfully');
            setTitle('');
            setContent('');
            onSuccess();
        } catch (err) {
            toast.error('Failed to post notice');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal">
                <div className="modal-header">
                    <h3>📢 Publish New Notice</h3>
                    <button className="modal-close" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label form-required">Title</label>
                            <input
                                type="text"
                                className="form-control"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                                placeholder="E.g., Holiday Announcement"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label form-required">Message / Content</label>
                            <textarea
                                className="form-control"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                rows="5"
                                required
                                placeholder="Type the circular details here..."
                            ></textarea>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Target Audience</label>
                            <select
                                className="form-control"
                                value={targetRoles[0]}
                                onChange={(e) => setTargetRoles([e.target.value])}
                            >
                                <option value="all">Everyone (Staff & HODs)</option>
                                <option value="staff">Staff Only</option>
                                <option value="hod">HODs Only</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={submitting}>
                                {submitting ? 'Publishing...' : 'Publish Notice'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreateNoticeModal;
