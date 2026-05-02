import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';

const ResetPassword = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) return toast.error('Passwords do not match');
        if (password.length < 6) return toast.error('Password must be at least 6 characters');

        setLoading(true);
        try {
            await api.post('/auth/reset-password', { token, newPassword: password });
            toast.success('Password reset successful! Redirecting to login...');
            setTimeout(() => navigate('/login'), 2000);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Reset failed. Link may be expired.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center p-6" style={{ background: 'var(--gray-50)' }}>
            <div className="w-full max-w-md rounded-[32px] p-10 shadow-2xl border border-white/10" style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(20px)' }}>
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl shadow-inner">
                        🛡️
                    </div>
                    <h2 className="text-3xl font-black tracking-tight" style={{ color: 'var(--gray-900)', fontFamily: 'Syne, sans-serif' }}>Set New Password</h2>
                    <p className="text-sm mt-2 font-medium" style={{ color: 'var(--gray-500)' }}>Create a secure password for your MEC Portal account.</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="mb-6 relative">
                        <label className="block text-xs font-black uppercase tracking-widest mb-2 pl-1" style={{ color: 'var(--gray-500)' }}>New Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                className="w-full rounded-xl py-3.5 px-4 pr-12 text-sm font-semibold transition-all focus:outline-none focus:ring-4 focus:ring-blue-500/10 border"
                                style={{ 
                                    background: 'var(--gray-100)', 
                                    color: 'var(--gray-900)',
                                    borderColor: 'var(--gray-200)' 
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 transition-all"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div className="mb-8">
                        <label className="block text-xs font-black uppercase tracking-widest mb-2 pl-1" style={{ color: 'var(--gray-500)' }}>Confirm Password</label>
                        <input
                            type={showPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            className="w-full rounded-xl py-3.5 px-4 text-sm font-semibold transition-all focus:outline-none focus:ring-4 focus:ring-blue-500/10 border"
                            style={{ 
                                background: 'var(--gray-100)', 
                                color: 'var(--gray-900)',
                                borderColor: 'var(--gray-200)' 
                                }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full text-white rounded-xl py-4 font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-70"
                        style={{ background: 'var(--accent-gradient)' }}
                    >
                        {loading ? 'Updating...' : 'Update Password'}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <button onClick={() => navigate('/login')} className="text-sm font-bold hover:underline" style={{ color: 'var(--primary)' }}>
                        ← Back to Login
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
