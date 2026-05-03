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
    const [todayStatus, setTodayStatus] = useState(null);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [docRes, msgRes, attRes, todayRes] = await Promise.all([
                    api.get('/student/documents'),
                    api.get('/student/messages'),
                    api.get('/attendance/my-stats'),
                    api.get('/attendance/today-status')
                ]);

                setStats({
                    attendance: attRes.data.stats.total.percentage || 0,
                    uploads: docRes.data.data.length,
                    messages: msgRes.data.data.length
                });

                if (todayRes.data.success && todayRes.data.data) {
                    setTodayStatus(todayRes.data.data);
                }
            } catch (err) {
                console.error('Error fetching student dashboard data:', err);
            }
        };
        fetchDashboardData();
    }, [user._id]);

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

                    {/* Today's Morning Attendance Section */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: 24,
                        padding: '24px 30px',
                        marginBottom: 32,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderLeft: `6px solid ${todayStatus ? (todayStatus.status === 'Present' ? '#10b981' : '#ef4444') : '#f59e0b'}`,
                        boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
                    }}>
                        <div>
                            <h4 style={{ margin: 0, color: 'rgba(255, 255, 255, 0.5)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2 }}>
                                Today's Status
                            </h4>
                            <h2 style={{ margin: '8px 0 0 0', fontSize: 22, fontWeight: 800, color: 'white' }}>
                                {todayStatus ? (
                                    <>
                                        Morning Attendance: <span style={{ color: todayStatus.status === 'Present' ? '#10b981' : '#ef4444' }}>{todayStatus.status}</span>
                                    </>
                                ) : (
                                    <span style={{ opacity: 0.8 }}>Morning Attendance: Not yet marked</span>
                                )}
                            </h2>
                            {todayStatus && (
                                <p style={{ margin: '8px 0 0 0', fontSize: 14, color: 'rgba(255, 255, 255, 0.6)', fontWeight: 500 }}>
                                    Marked by <span style={{ color: 'white' }}>{todayStatus.isCA ? 'Class Advisor' : 'Staff'} {todayStatus.staffName}</span> for Period {todayStatus.period}
                                </p>
                            )}
                        </div>
                        <div style={{
                            width: 56,
                            height: 56,
                            borderRadius: 16,
                            background: todayStatus ? (todayStatus.status === 'Present' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)') : 'rgba(245, 158, 11, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 28,
                            boxShadow: 'inset 0 0 20px rgba(255,255,255,0.05)'
                        }}>
                            {todayStatus ? (todayStatus.status === 'Present' ? '✅' : '❌') : '⏳'}
                        </div>
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
