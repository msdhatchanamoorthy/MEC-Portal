import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import NoticeBoard from '../../components/shared/NoticeBoard';

const StudentDashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        attendance: 0,
        uploads: 0,
        messages: 0
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [docRes, msgRes] = await Promise.all([
                    api.get('/student/documents'),
                    api.get('/student/messages')
                ]);
                setStats({
                    attendance: 0, // Need to fetch actual attendance pct
                    uploads: docRes.data.data.length,
                    messages: msgRes.data.data.length
                });
            } catch (err) {}
        };
        fetchStats();
    }, []);

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <Topbar title="Student Dashboard" subtitle={`Welcome back, ${user.name}`} />
                <div className="page-content">
                    <div className="dashboard-hero" style={{
                        background: 'var(--accent-gradient)',
                        borderRadius: 24,
                        padding: '32px 40px',
                        marginBottom: 32,
                        color: 'white',
                        boxShadow: '0 20px 40px rgba(99, 102, 241, 0.2)'
                    }}>
                        <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0 }}>Hello, {user.name}! 👋</h1>
                        <p style={{ opacity: 0.9, marginTop: 8, maxWidth: 600 }}>
                            Track your academic progress, upload your certificates, and stay connected with your Class Advisor.
                        </p>
                    </div>

                    <div className="dashboard-grid">
                        <div className="stat-card">
                            <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent)' }}>📊</div>
                            <div className="stat-info">
                                <p>ATTENDANCE</p>
                                <h3>{stats.attendance}%</h3>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>📤</div>
                            <div className="stat-info">
                                <p>MY UPLOADS</p>
                                <h3>{stats.uploads}</h3>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }}>💬</div>
                            <div className="stat-info">
                                <p>MESSAGES</p>
                                <h3>{stats.messages}</h3>
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: 32 }}>
                        <NoticeBoard userRole="student" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentDashboard;
