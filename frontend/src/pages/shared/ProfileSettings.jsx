import React, { useState } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const ProfileSettings = () => {
    const { user } = useAuth();
    const [passwords, setPasswords] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setPasswords({ ...passwords, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (passwords.newPassword !== passwords.confirmPassword) {
            return toast.error('New passwords do not match');
        }

        setLoading(true);
        try {
            await api.put('/auth/change-password', {
                oldPassword: passwords.currentPassword,
                newPassword: passwords.newPassword,
            });
            toast.success('Password changed successfully');
            setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to change password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <Topbar title="Profile Settings" subtitle="Manage your account security" />
                <div className="page-content">

                    <div className="page-header">
                        <div className="page-header-left">
                            <h2>👤 Profile & Security</h2>
                            <p>Update your personal information and change password</p>
                        </div>
                    </div>

                    <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 2fr' }}>
                        {/* Profile Info */}
                        <div className="card">
                            <div className="card-header">
                                <div className="card-title">Account Information</div>
                            </div>
                            <div className="card-body">
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                    <div>
                                        <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>Full Name</label>
                                        <div style={{ fontWeight: 600, fontSize: 15 }}>{user.name}</div>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>Email Address</label>
                                        <div style={{ fontWeight: 600, fontSize: 15 }}>{user.email}</div>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>Role</label>
                                        <span className={`badge ${user.role}`}>
                                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                                        </span>
                                    </div>
                                    {user.department && (
                                        <div>
                                            <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>Department</label>
                                            <div style={{ fontWeight: 600, fontSize: 15 }}>{user.department.name}</div>
                                        </div>
                                    )}
                                </div>
                                <div style={{ marginTop: 30, paddingTop: 20, borderTop: '1px solid var(--gray-100)' }}>
                                    <p style={{ fontSize: 12, color: '#9CA3AF' }}>To update profile information, please contact the Principal Office.</p>
                                </div>
                            </div>
                        </div>

                        {/* Change Password */}
                        <div className="card">
                            <div className="card-header">
                                <div className="card-title">Change Password</div>
                            </div>
                            <div className="card-body">
                                <form onSubmit={handleSubmit} style={{ maxWidth: 400 }}>
                                    <div className="form-group">
                                        <label className="form-label">Current Password</label>
                                        <input
                                            type="password" name="currentPassword"
                                            className="form-control" required
                                            value={passwords.currentPassword} onChange={handleChange}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">New Password</label>
                                        <input
                                            type="password" name="newPassword"
                                            className="form-control" required minLength={6}
                                            value={passwords.newPassword} onChange={handleChange}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Confirm New Password</label>
                                        <input
                                            type="password" name="confirmPassword"
                                            className="form-control" required minLength={6}
                                            value={passwords.confirmPassword} onChange={handleChange}
                                        />
                                    </div>
                                    <div style={{ marginTop: 24 }}>
                                        <button type="submit" className="btn btn-primary" disabled={loading}>
                                            {loading ? <span className="spinner" /> : 'Update Password'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileSettings;
