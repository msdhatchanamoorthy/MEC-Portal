import React, { useState } from 'react';
import toast from 'react-hot-toast';

const REASONS = [
    'Temple Function (Kovil Function)',
    'Going to Home',
    'Medical Leave',
    'Sports',
    'Competition',
    'NSS / NCC',
    'Family Event',
    'Travel',
    'Exam',
    'Internship'
];

const ReasonProofModal = ({ isOpen, onClose, onConfirm, studentName, initialData }) => {
    const [selectedReason, setSelectedReason] = useState(initialData?.reason || '');
    const [otherReason, setOtherReason] = useState('');
    const [isOthers, setIsOthers] = useState(false);
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        const finalReason = isOthers ? otherReason : selectedReason;
        
        if (!finalReason) {
            return toast.error('Please select or enter a reason');
        }

        onConfirm({
            reason: finalReason,
            proofFile: file
        });
    };

    return (
        <div className="modal-overlay">
            <div className="modal glass" style={{ maxWidth: '520px', border: 'none', boxShadow: '0 30px 60px rgba(0,0,0,0.4)', borderRadius: 24, overflow: 'hidden', background: 'var(--glass-bg)', backdropFilter: 'blur(24px)' }}>
                <div className="modal-header" style={{ padding: '24px 32px', borderBottom: '1px solid var(--gray-200)' }}>
                    <h3 className="modal-title" style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary-dark)' }}>📝 Specify Reason — {studentName}</h3>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body" style={{ padding: '32px' }}>
                        <p style={{ fontSize: '14px', color: 'var(--gray-600)', marginBottom: '24px', fontWeight: 500 }}>
                            Please select the primary reason for marking this student as <span style={{ color: 'var(--danger)', fontWeight: 700 }}>Absent / OD</span>.
                        </p>

                        <div className="reason-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '24px' }}>
                            {REASONS.map(reason => (
                                <div 
                                    key={reason}
                                    className={`reason-item ${selectedReason === reason && !isOthers ? 'active' : ''}`}
                                    onClick={() => {
                                        setSelectedReason(reason);
                                        setIsOthers(false);
                                    }}
                                    style={{
                                        padding: '12px 16px',
                                        border: '1px solid var(--gray-200)',
                                        borderRadius: '12px',
                                        fontSize: '12px',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease',
                                        background: selectedReason === reason && !isOthers ? 'var(--accent-gradient)' : 'var(--gray-100)',
                                        borderColor: selectedReason === reason && !isOthers ? 'transparent' : 'var(--gray-300)',
                                        color: selectedReason === reason && !isOthers ? 'white' : 'var(--gray-800)',
                                        fontWeight: selectedReason === reason && !isOthers ? '700' : '600',
                                        boxShadow: selectedReason === reason && !isOthers ? '0 4px 12px var(--accent-glow)' : 'none'
                                    }}
                                >
                                    {reason}
                                </div>
                            ))}
                            <div 
                                className={`reason-item ${isOthers ? 'active' : ''}`}
                                onClick={() => setIsOthers(true)}
                                style={{
                                    padding: '12px 16px',
                                    border: '1px solid var(--gray-200)',
                                    borderRadius: '12px',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    background: isOthers ? 'var(--primary-dark)' : 'var(--gray-100)',
                                    borderColor: isOthers ? 'transparent' : 'var(--gray-300)',
                                    color: isOthers ? 'white' : 'var(--gray-800)',
                                    fontWeight: isOthers ? '700' : '600',
                                    boxShadow: isOthers ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
                                }}
                            >
                                Others...
                            </div>
                        </div>

                        {isOthers && (
                            <div className="form-group" style={{ animation: 'fadeIn 0.3s ease' }}>
                                <label className="form-label" style={{ fontWeight: 700, fontSize: 12 }}>MANUAL REASON</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    placeholder="e.g. Authorized leave for university event"
                                    value={otherReason}
                                    onChange={(e) => setOtherReason(e.target.value)}
                                    autoFocus
                                    style={{ borderRadius: 12, padding: '12px 16px' }}
                                />
                            </div>
                        )}

                        <div className="form-group" style={{ marginTop: '24px' }}>
                            <label className="form-label" style={{ fontWeight: 700, fontSize: 12 }}>UPLOAD SUPPORTING DOCUMENT (OPTIONAL)</label>
                            <input 
                                type="file" 
                                className="form-control" 
                                accept=".jpg,.jpeg,.png,.pdf"
                                onChange={(e) => setFile(e.target.files[0])}
                                style={{ borderRadius: 12, padding: '10px' }}
                            />
                            <p style={{ fontSize: '11px', color: 'var(--gray-400)', marginTop: '8px', fontWeight: 500 }}>
                                📑 Accepted formats: JPG, PNG, PDF (Maximum size: 5MB)
                            </p>
                        </div>
                    </div>
                    <div className="modal-footer" style={{ padding: '20px 32px', background: 'var(--gray-50)', borderTop: '1px solid var(--gray-200)', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-ghost" style={{ borderRadius: 12, padding: '10px 24px', fontWeight: 600 }} onClick={onClose}>CANCEL</button>
                        <button type="submit" className="btn btn-primary" style={{ borderRadius: 12, padding: '10px 32px', fontWeight: 700 }}>CONFIRM STATUS</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ReasonProofModal;
