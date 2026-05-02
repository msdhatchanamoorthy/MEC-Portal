import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

const ForgotPassword = () => {
    const [step, setStep] = useState(1); // Step 1: Roll, Step 2: Email
    const [rollNumber, setRollNumber] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const navigate = useNavigate();

    const handleVerifyRoll = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/auth/verify-roll', { rollNumber });
            setStep(2);
            toast.success('Account identified! Now verify your email.');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Invalid Roll Number');
        } finally {
            setLoading(false);
        }
    };

    const handleFinalSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await api.post('/auth/forgot-password', { rollNumber, email });
            setSent(true);
            toast.success('Verification successful! Sending link...');
            
            // Dev bypass: if token returned, redirect
            if (response.data.resetToken) {
                setTimeout(() => {
                    navigate(`/reset-password/${response.data.resetToken}`);
                }, 2000);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Verification failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center p-6" style={{ background: 'var(--gray-50)' }}>
            <div className="w-full max-w-md rounded-[32px] p-10 shadow-2xl border border-white/10" style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(20px)' }}>
                {!sent ? (
                    <>
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl shadow-inner">
                                {step === 1 ? '🎓' : '📧'}
                            </div>
                            <h2 className="text-3xl font-black tracking-tight" style={{ color: 'var(--gray-900)', fontFamily: 'Syne, sans-serif' }}>
                                {step === 1 ? 'Step 1: Identify' : 'Step 2: Verify'}
                            </h2>
                            <p className="text-sm mt-2 font-medium" style={{ color: 'var(--gray-500)' }}>
                                {step === 1 ? 'Enter your Roll Number to begin.' : 'Now enter the email associated with your account.'}
                            </p>
                        </div>

                        {step === 1 ? (
                            <form onSubmit={handleVerifyRoll}>
                                <div className="mb-8">
                                    <label className="block text-xs font-black uppercase tracking-widest mb-2 pl-1" style={{ color: 'var(--gray-500)' }}>Roll Number</label>
                                    <input
                                        type="text"
                                        value={rollNumber}
                                        onChange={(e) => setRollNumber(e.target.value)}
                                        placeholder="e.g. 23IT016"
                                        required
                                        className="w-full rounded-xl py-4 px-4 text-sm font-semibold transition-all focus:outline-none focus:ring-4 focus:ring-blue-500/10 border"
                                        style={{ background: 'var(--gray-100)', color: 'var(--gray-900)', borderColor: 'var(--gray-200)' }}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full text-white rounded-xl py-4 font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-70"
                                    style={{ background: 'var(--primary-dark)' }}
                                >
                                    {loading ? 'Searching...' : 'Continue'}
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleFinalSubmit}>
                                <div className="mb-8">
                                    <label className="block text-xs font-black uppercase tracking-widest mb-2 pl-1" style={{ color: 'var(--gray-500)' }}>Associated Email</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="personal@gmail.com"
                                        required
                                        className="w-full rounded-xl py-4 px-4 text-sm font-semibold transition-all focus:outline-none focus:ring-4 focus:ring-violet-500/10 border"
                                        style={{ background: 'var(--gray-100)', color: 'var(--gray-900)', borderColor: 'var(--gray-200)' }}
                                    />
                                </div>
                                <div className="flex gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className="flex-1 py-4 font-black uppercase tracking-widest text-xs"
                                        style={{ color: 'var(--gray-500)' }}
                                    >
                                        Back
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-[2] text-white rounded-xl py-4 font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-70"
                                        style={{ background: 'var(--accent-gradient)' }}
                                    >
                                        {loading ? 'Verifying...' : 'Send Link'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </>
                ) : (
                    <div className="text-center py-8">
                        <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
                            ✅
                        </div>
                        <h3 className="text-2xl font-black mb-2" style={{ color: 'var(--gray-900)' }}>Success!</h3>
                        <p className="text-sm font-medium" style={{ color: 'var(--gray-500)' }}>
                            Reset link has been generated and sent to <br/><b style={{ color: 'var(--gray-800)' }}>{email}</b>
                        </p>
                        <p className="text-xs mt-6 text-blue-500 animate-pulse">Redirecting to Reset Page for test environment...</p>
                    </div>
                )}

                <div className="mt-8 text-center border-t border-gray-100 pt-6">
                    <button onClick={() => navigate('/login')} className="text-sm font-bold hover:underline" style={{ color: 'var(--primary)' }}>
                        ← Back to Login
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
