import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const Login = () => {
    const [role, setRole] = useState('principal');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleRoleChange = (newRole) => {
        setRole(newRole);
        setEmail('');
        setPassword('');
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const user = await login(email, password, role);
            toast.success(`Welcome back, ${user.name.split(' ')[0]}! 👋`);
            if (user.role === 'principal') navigate('/principal');
            else if (user.role === 'hod') navigate('/hod');
            else navigate('/staff');
        } catch (err) {
            const msg = err.response?.data?.message || 'Login failed. Please try again.';
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            {/* Left Side - Image/Branding */}
            <div className="login-left">
                <div
                    className="login-left-bg"
                    style={{ backgroundImage: `url(${process.env.PUBLIC_URL}/bg.jpg)` }}
                />
                <div className="login-left-overlay" />
                <div className="login-left-content">
                    <img src="/logo.png" alt="MEC Logo" className="login-left-logo" />
                    <h1>MEC Attendance System</h1>
                    <p>Muthayammal Engineering College</p>
                    <p style={{ marginTop: '10px', fontSize: '14px', opacity: 0.8 }}>Designing Your Future.</p>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="login-right">
                <div className="login-card">
                    <div className="login-logo" style={{ marginBottom: '30px' }}>
                        <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary)', marginBottom: '4px' }}>Welcome Back</h2>
                        <p style={{ fontSize: '14px', color: 'var(--gray-500)' }}>Please enter your credentials to login</p>
                    </div>

                    {/* Role Selector */}
                    <div className="role-selector">
                        {[
                            { key: 'principal', icon: '👨‍💼', label: 'Principal' },
                            { key: 'hod', icon: '👩‍🏫', label: 'HOD' },
                            { key: 'staff', icon: '👨‍🏫', label: 'Staff' },
                        ].map((r) => (
                            <button
                                key={r.key}
                                type="button"
                                className={`role-tab ${role === r.key ? 'active' : ''}`}
                                onClick={() => handleRoleChange(r.key)}
                            >
                                <span className="role-icon">{r.icon}</span>
                                <span className="role-label">{r.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Error */}
                    {error && <div className="error-message">⚠️ {error}</div>}

                    {/* Form */}
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label form-required">Email Address</label>
                            <input
                                id="email"
                                type="email"
                                className="form-control"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter your email"
                                required
                                autoComplete="email"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label form-required">Password</label>
                            <input
                                id="password"
                                type="password"
                                className="form-control"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                required
                                autoComplete="current-password"
                            />
                        </div>

                        <button type="submit" className="login-submit" disabled={loading}>
                            {loading ? (
                                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                                    <span className="spinner" /> Signing in...
                                </span>
                            ) : (
                                `Sign in as ${role.charAt(0).toUpperCase() + role.slice(1)}`
                            )}
                        </button>
                    </form>

                    <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#9CA3AF' }}>
                        🔒 Secure login powered by JWT Authentication
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
