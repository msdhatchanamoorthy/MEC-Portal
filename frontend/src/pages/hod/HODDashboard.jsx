import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bar, Pie } from 'react-chartjs-2';
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement
} from 'chart.js';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import api from '../../services/api';
import socket from '../../services/socket';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import NoticeBoard from '../../components/shared/NoticeBoard';
import CreateNoticeModal from '../../components/shared/CreateNoticeModal';
import VoiceControl from '../../components/shared/VoiceControl';
import StudentQuickSearch from '../../components/shared/StudentQuickSearch';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const HODDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [overview, setOverview] = useState(null);
    const [summary, setSummary] = useState([]);
    const [pendingRecords, setPendingRecords] = useState([]);
    const [dutyReports, setDutyReports] = useState([]);
    const [staffList, setStaffList] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [staffLoading, setStaffLoading] = useState(true);
    const [analytics, setAnalytics] = useState(null);
    const [alerts, setAlerts] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [approving, setApproving] = useState(null);
    const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
    const isFetching = React.useRef(false);

    const deptName = user?.department?.name || 'Department';
    const deptShort = user?.department?.shortName || '';

    const fetchData = useCallback(async () => {
        if (isFetching.current) return;
        isFetching.current = true;

        try {
            setLoading(true);
            const [overviewRes, summaryRes, pendingRes, dutyRes, analyticsRes, alertsRes, notificationsRes] = await Promise.all([
                api.get(`/attendance/daily-overview?date=${selectedDate}`),
                api.get('/attendance/summary'),
                api.get(`/attendance?status=pending&date=${selectedDate}`),
                api.get(`/duty-reports?date=${selectedDate}`),
                api.get('/hod/analytics'),
                api.get('/hod/alerts/low-attendance'),
                api.get('/notifications')
            ]);
            setOverview(overviewRes.data);
            setSummary(summaryRes.data.data || []);
            setPendingRecords(pendingRes.data.data || []);
            setDutyReports(dutyRes.data.data || []);
            setAnalytics(analyticsRes.data.data);
            setAlerts(alertsRes.data.data || []);
            setNotifications(notificationsRes.data.data || []);
        } catch (err) {
            console.error('HOD Dashboard Fetch Error:', err);
            if (err.response?.status !== 401) {
                toast.error(`Error: ${err.response?.data?.message || 'Failed to load dashboard data'}`);
            }
        } finally {
            setLoading(false);
            isFetching.current = false;
        }
    }, [selectedDate]);

    const fetchStaff = useCallback(async () => {
        try {
            setStaffLoading(true);
            const res = await api.get('/hod/staff');
            setStaffList(res.data.data || []);
        } catch (err) {
            console.error('Fetch Staff Error:', err);
        } finally {
            setStaffLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        fetchStaff();

        if (user?.department) {
            const deptId = user.department._id || user.department;
            socket.connect();
            socket.emit('join-department', deptId);

            socket.on('new-duty-report', (report) => {
                // Only add if it belongs to the selected date
                const reportDate = new Date(report.createdAt).toISOString().split('T')[0];
                if (reportDate === selectedDate) {
                    setDutyReports(prev => [report, ...prev]);
                    toast.success(`New Duty Report: ${report.staffName}`, { icon: '📢' });
                }
            });

            return () => {
                socket.off('new-duty-report');
                socket.disconnect();
            };
        }
    }, [fetchData, fetchStaff, user, selectedDate]);

    const handleApprove = async (id, status) => {
        setApproving(id);
        try {
            await api.put(`/attendance/${id}/approve`, { status, remarks: '' });
            toast.success(`Attendance ${status} successfully!`);
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update');
        } finally {
            setApproving(null);
        }
    };

    const handleApproveAll = useCallback(async () => {
        if (pendingRecords.length === 0) {
            toast.error('No pending records to approve');
            return;
        }
        if (!window.confirm(`Approve all ${pendingRecords.length} records?`)) return;

        try {
            setLoading(true);
            const promises = pendingRecords.map(r => api.put(`/attendance/${r._id}/approve`, { status: 'approved', remarks: '' }));
            await Promise.all(promises);
            toast.success('All records approved!');
            fetchData();
        } catch (err) {
            toast.error('Failed to approve some records');
        } finally {
            setLoading(false);
        }
    }, [pendingRecords, fetchData]);

    // Voice Commands Configuration
    const voiceCommands = useMemo(() => [
        {
            regex: /approve\s+all/i,
            handler: () => handleApproveAll()
        },
        {
            regex: /refresh/i,
            handler: () => fetchData()
        },
        {
            regex: /show\s+alerts|view\s+alerts/i,
            handler: () => {
                document.getElementById('low-attendance-alerts')?.scrollIntoView({ behavior: 'smooth' });
                toast.success('Showing low attendance alerts');
            }
        },
        {
            regex: /(?:create|add|new)\s+notice/i,
            handler: () => {
                setIsNoticeModalOpen(true);
                toast.success('Opening notice creator');
            }
        },
        {
            regex: /(?:show|view)\s+reports/i,
            handler: () => {
                navigate('/hod/reports');
                toast.success('Navigating to reports');
            }
        },
        {
            regex: /logout/i,
            handler: () => {
                if (window.confirm('Logout via voice command?')) {
                    logout();
                    navigate('/login');
                }
            }
        }
    ], [handleApproveAll, fetchData, logout, navigate]);

    const handleClearReports = async () => {
        if (!window.confirm('Are you sure you want to clear all duty reports for your department?')) return;
        try {
            await api.delete('/duty-reports/clear');
            setDutyReports([]);
            toast.success('Duty reports cleared!');
        } catch (err) {
            toast.error('Failed to clear reports');
        }
    };

    // Year-wise grouping from summary
    const yearGroups = [1, 2, 3, 4].map((y) => {
        const entries = summary.filter((s) => s.year === y);
        const avg = entries.length
            ? (entries.reduce((a, e) => a + e.avgAttendance, 0) / entries.length).toFixed(1)
            : 0;
        return { year: y, avg, entries };
    });

    const barData = {
        labels: yearGroups.map((y) => `${y.year}${['st', 'nd', 'rd', 'th'][y.year - 1]} Year`),
        datasets: [{
            label: 'Avg Attendance %',
            data: yearGroups.map((y) => y.avg),
            backgroundColor: yearGroups.map((y) =>
                y.avg >= 75 ? 'rgba(16,185,129,0.75)' : y.avg >= 50 ? 'rgba(245,158,11,0.75)' : 'rgba(239,68,68,0.75)'
            ),
            borderRadius: 8,
        }],
    };

    const pieData = analytics ? {
        labels: Object.keys(analytics),
        datasets: [{
            data: Object.values(analytics),
            backgroundColor: [
                '#10B981', // Present
                '#EF4444', // Absent
                '#F59E0B', // Late
                '#6B7280', // Leave
                '#3B82F6'  // OD
            ]
        }]
    } : null;

    const overall = overview?.overall;

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <Topbar title={`HOD Dashboard — ${deptShort}`} subtitle={deptName} />
                <div className="page-content">
                    {/* Premium Glassmorphic Hero Header */}
                    <div className="dashboard-hero" style={{
                        background: 'linear-gradient(135deg, #0f766e 0%, #10B981 100%)',
                        borderRadius: 24,
                        padding: '32px 40px',
                        marginBottom: 32,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        boxShadow: '0 20px 40px rgba(16, 185, 129, 0.3)',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        <div style={{ position: 'absolute', top: -50, right: 100, width: 250, height: 250, background: 'rgba(255,255,255,0.2)', borderRadius: '50%', filter: 'blur(80px)' }}></div>
                        <div style={{ position: 'absolute', bottom: -50, left: -50, width: 200, height: 200, background: 'rgba(0,0,0,0.15)', borderRadius: '50%', filter: 'blur(60px)' }}></div>

                        <div className="header-left" style={{ position: 'relative', zIndex: 1 }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', background: 'rgba(255,255,255,0.1)', borderRadius: 20, color: 'white', fontSize: 12, fontWeight: 700, letterSpacing: 1, marginBottom: 16, backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 10px var(--success)' }}></span>
                                {deptShort} DEPARTMENT
                            </div>
                            <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.02em', margin: 0, color: 'white' }}>
                                HOD <span style={{ background: 'linear-gradient(to right, #ffffff, #a7f3d0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 2px 10px rgba(0,0,0,0.15))' }}>Command Center</span>
                            </h1>
                            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 8, maxWidth: 500, fontWeight: 700 }}>
                                {deptName} — Real-time intelligence, staff monitoring, and attendance analytics at a glance.
                            </p>
                        </div>
                        <div className="header-right" style={{ display: 'flex', gap: 16, position: 'relative', zIndex: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '6px', borderRadius: 16, display: 'flex', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)' }}>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    style={{ background: 'transparent', border: 'none', color: 'white', padding: '6px 12px', outline: 'none', colorScheme: 'dark', fontWeight: 800, fontFamily: 'inherit' }}
                                />
                            </div>
                            <a href="/hod/reports" className="btn btn-primary" style={{ padding: '12px 24px', borderRadius: 14, fontWeight: 800, boxShadow: '0 8px 20px rgba(99, 102, 241, 0.4)' }}>
                                📄 View Reports
                            </a>
                        </div>
                    </div>

                    <StudentQuickSearch />

                    {loading ? (
                        <div style={{ padding: 100, textAlign: 'center' }}>
                            <div className="spinner spinner-dark" />
                            <p style={{ marginTop: 20, color: 'var(--gray-500)' }}>Syncing department metrics...</p>
                        </div>
                    ) : (
                        <>
                            {/* Stats Grid */}
                            <div className="dashboard-grid">
                                <div className="stat-card" style={{ borderLeft: '5px solid var(--accent)' }}>
                                    <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent)' }}>🎓</div>
                                    <div className="stat-info">
                                        <p>TOTAL STRENGTH</p>
                                        <h3>{overall?.totalStudents || 0}</h3>
                                    </div>
                                </div>
                                <div className="stat-card" style={{ borderLeft: '5px solid var(--success)' }}>
                                    <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>👨‍🏫</div>
                                    <div className="stat-info">
                                        <p>ACTIVE STAFF</p>
                                        <h3>{staffList.length || 0}</h3>
                                    </div>
                                </div>
                                <div className="stat-card" style={{ borderLeft: '5px solid var(--info)' }}>
                                    <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--info)' }}>📈</div>
                                    <div className="stat-info">
                                        <p>AVG ATTENDANCE</p>
                                        <h3>{overall?.percentage || 0}%</h3>
                                    </div>
                                </div>
                                <div className="stat-card" style={{ borderLeft: '5px solid var(--danger)' }}>
                                    <div className="stat-icon" style={{ background: 'rgba(244, 63, 94, 0.1)', color: 'var(--danger)' }}>🚨</div>
                                    <div className="stat-info">
                                        <p>CRITICAL ALERTS</p>
                                        <h3>{alerts.length || 0}</h3>
                                    </div>
                                </div>
                            </div>

                            {/* Row for Charts & Section-wise */}
                            <div className="chart-row" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16, marginBottom: 16 }}>
                                {/* Year-wise Chart */}
                                <div className="card glass">
                                    <div className="card-header">
                                        <div className="card-title">📊 YEAR-WISE METRICS</div>
                                    </div>
                                    <div className="card-body">
                                        <div className="chart-container" style={{ height: 200 }}>
                                            <Bar
                                                data={barData}
                                                options={{
                                                    responsive: true,
                                                    maintainAspectRatio: false,
                                                    plugins: { legend: { display: false } },
                                                    scales: {
                                                        y: { beginAtZero: true, max: 100, ticks: { callback: (v) => v + '%', font: { size: 10 } } },
                                                        x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                                                    },
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Section-wise Status */}
                                <div className="card glass">
                                    <div className="card-header">
                                        <div className="card-title">📚 SECTION STATUS</div>
                                    </div>
                                    <div className="table-container" style={{ maxHeight: 240, overflowY: 'auto' }}>
                                        <table style={{ fontSize: 13 }}>
                                            <thead>
                                                <tr>
                                                    <th>Batch</th>
                                                    <th>Section</th>
                                                    <th>Avg %</th>
                                                    <th>Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {overview?.sectionSummary?.length > 0 ? (
                                                    overview.sectionSummary.map((s, i) => (
                                                        <tr key={i}>
                                                            <td>{s.year}{['st', 'nd', 'rd', 'th'][s.year - 1]} Yr</td>
                                                            <td>Sec {s.sectionName}</td>
                                                            <td>
                                                                <span style={{ fontWeight: 700, color: s.avgAttendance >= 75 ? 'var(--success)' : 'var(--danger)' }}>
                                                                    {s.avgAttendance}%
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <span className={`badge ${s.isSubmitted ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: 10 }}>
                                                                    {s.isSubmitted ? '✓ SUBMITTED' : '⚠ PENDING'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan="4" style={{ textAlign: 'center', color: '#9CA3AF', padding: 20 }}>No sections found</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                            <div className="chart-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                                {/* Analytics Pie Chart */}
                                <div className="card glass">
                                    <div className="card-header">
                                        <div className="card-title">📈 OVERALL DISTRIBUTION</div>
                                    </div>
                                    <div className="card-body">
                                        <div className="chart-container" style={{ height: 200 }}>
                                            {pieData && <Pie data={pieData} options={{
                                                maintainAspectRatio: false,
                                                plugins: { legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } } }
                                            }} />}
                                        </div>
                                    </div>
                                </div>

                                {/* Low Attendance Alerts */}
                                <div className="card glass" id="low-attendance-alerts">
                                    <div className="card-header">
                                        <div className="card-title" style={{ color: 'var(--danger)' }}>🚨 CRITICAL ALERTS (&lt;75%)</div>
                                    </div>
                                    <div className="table-container" style={{ maxHeight: 200, overflowY: 'auto' }}>
                                        {alerts.length > 0 ? (
                                            <table style={{ fontSize: 13 }}>
                                                <thead>
                                                    <tr>
                                                        <th>Student</th>
                                                        <th>Batch</th>
                                                        <th>Attendance</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {alerts.slice(0, 10).map((a, i) => (
                                                        <tr key={i}>
                                                            <td style={{ fontWeight: 700 }}>{a.name}</td>
                                                            <td>{a.year} Yr</td>
                                                            <td>
                                                                <span className="badge badge-danger" style={{ fontSize: 10 }}>{a.percentage}%</span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        ) : (
                                            <div style={{ padding: 20, textAlign: 'center', color: '#6B7280', fontSize: 13 }}>
                                                No students below 75% found. Good job! 👏
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Real-time System Notifications */}
                            {notifications.filter(n => !n.read).length > 0 && (
                                <div className="card glass" style={{ marginBottom: 24, border: 'none', background: 'rgba(99, 102, 241, 0.05)', borderLeft: '4px solid var(--accent)' }}>
                                    <div className="card-header" style={{ padding: '12px 24px' }}>
                                        <div className="card-title" style={{ fontSize: 13, color: 'var(--accent)' }}>🔔 SYSTEM ALERTS</div>
                                        <button 
                                            onClick={async () => {
                                                await api.put('/notifications/read-all');
                                                setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                                            }}
                                            style={{ background: 'none', border: 'none', color: 'var(--gray-500)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                                        >
                                            Dismiss All
                                        </button>
                                    </div>
                                    <div className="card-body" style={{ padding: '0 24px 16px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            {notifications.filter(n => !n.read).slice(0, 3).map(n => (
                                                <div key={n._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '10px 16px', borderRadius: 12, boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }}>
                                                    <div>
                                                        <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--primary-dark)' }}>{n.title}</span>
                                                        <p style={{ margin: 0, fontSize: 12, color: 'var(--gray-600)', fontWeight: 600 }}>{n.message}</p>
                                                    </div>
                                                    <span style={{ fontSize: 10, color: 'var(--gray-400)', fontWeight: 700 }}>
                                                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Notice Board */}
                            <NoticeBoard
                                userRole="hod"
                                onCreateClick={() => setIsNoticeModalOpen(true)}
                            />

                            {/* Staff Members Section */}
                            <div className="card glass" style={{ marginBottom: 24, border: 'none', boxShadow: 'var(--glass-shadow)' }}>
                                <div className="card-header" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', padding: '16px 24px' }}>
                                    <div className="card-title" style={{ fontSize: 14, fontWeight: 700 }}>👨‍🏫 STAFF MEMBERS</div>
                                    <span className="badge badge-info" style={{ borderRadius: 6 }}>{staffList.length} ACTIVE</span>
                                </div>
                                <div className="card-body" style={{ padding: '24px' }}>
                                    {staffLoading ? (
                                        <div style={{ padding: 40, textAlign: 'center' }}>
                                            <div className="spinner spinner-dark" />
                                            <p style={{ marginTop: 12, color: 'var(--gray-500)', fontSize: 13 }}>Retrieving faculty list...</p>
                                        </div>
                                    ) : staffList.length > 0 ? (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                                            {staffList.map((staff) => (
                                                <div key={staff._id} className="stat-card" style={{
                                                    background: 'white',
                                                    border: '1px solid rgba(0,0,0,0.03)',
                                                    padding: '16px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 16,
                                                    borderRadius: 16,
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
                                                }}>
                                                    <div className="avatar-mini" style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, background: 'var(--gray-50)', color: 'var(--primary-dark)' }}>
                                                        {staff.name[0]}
                                                    </div>
                                                    <div className="stat-info" style={{ textAlign: 'left' }}>
                                                        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 900, color: 'var(--primary-dark)' }}>Prof. {staff.name}</h4>
                                                        <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--gray-600)', fontWeight: 800 }}>
                                                            {staff.year}{['st', 'nd', 'rd', 'th'][staff.year - 1]} Yr • Sec {staff.section}
                                                        </p>
                                                        <p style={{ margin: '2px 0 0', fontSize: 10, color: 'var(--gray-400)' }}>{staff.email}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="empty-state" style={{ padding: 30 }}>
                                            <div className="empty-state-icon">👥</div>
                                            <h3>No Staff Found</h3>
                                            <p>No staff accounts associated with your department.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Pending Approvals */}
                            <div className="card" style={{ marginBottom: 24 }}>
                                <div className="card-header">
                                    <div className="card-title">⏳ Pending Attendance Approvals</div>
                                    {pendingRecords.length > 0 && (
                                        <span className="badge badge-warning">{pendingRecords.length} Pending</span>
                                    )}
                                </div>
                                {pendingRecords.length > 0 ? (
                                    <div className="table-container">
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>Date</th>
                                                    <th>Period</th>
                                                    <th>Section</th>
                                                    <th>Staff</th>
                                                    <th>Students</th>
                                                    <th>Present</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {pendingRecords.map((r) => {
                                                    const presentCount = r.attendance?.filter(a => a.status === 'Present').length || 0;
                                                    const total = r.attendance?.length || 0;
                                                    return (
                                                        <tr key={r._id}>
                                                            <td>{new Date(r.date).toLocaleDateString('en-IN')}</td>
                                                            <td>Period {r.period}</td>
                                                            <td>
                                                                {r.year}{['st', 'nd', 'rd', 'th'][r.year - 1]} Yr — Sec {r.section?.name}
                                                            </td>
                                                            <td>
                                                                <span style={{ fontWeight: 600 }}>{r.staff?.name || r.staffName || '—'}</span>
                                                            </td>
                                                            <td>{total}</td>
                                                            <td>
                                                                <span style={{ color: 'var(--success)', fontWeight: 600 }}>{presentCount}</span>
                                                                /{total}
                                                            </td>
                                                            <td>
                                                                <div style={{ display: 'flex', gap: 6 }}>
                                                                    <button
                                                                        className="btn btn-success btn-sm"
                                                                        onClick={() => handleApprove(r._id, 'approved')}
                                                                        disabled={approving === r._id}
                                                                    >
                                                                        {approving === r._id ? '...' : '✓ Approve'}
                                                                    </button>
                                                                    <button
                                                                        className="btn btn-danger btn-sm"
                                                                        onClick={() => handleApprove(r._id, 'rejected')}
                                                                        disabled={approving === r._id}
                                                                    >
                                                                        ✕
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="empty-state" style={{ padding: 40 }}>
                                        <div className="empty-state-icon">🎉</div>
                                        <h3>All Caught Up!</h3>
                                        <p>No pending attendance records to approve.</p>
                                    </div>
                                )}
                            </div>

                            {/* Staff Duty Reports */}
                            <div className="card" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.08)', marginBottom: 24 }}>
                                <div className="card-header" style={{ borderBottom: '1px solid #F3F4F6' }}>
                                    <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <span style={{ fontSize: '1.2em' }}>📢</span> Staff Duty Reports
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <span className="badge badge-info">{dutyReports.length} Total Reports Today</span>
                                        {dutyReports.length > 0 && (
                                            <button
                                                onClick={handleClearReports}
                                                className="btn btn-sm btn-outline-danger"
                                                style={{ padding: '2px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: 4 }}
                                            >
                                                🗑️ Clear All
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {dutyReports.length > 0 ? (
                                    <div className="table-container">
                                        <table className="table-modern">
                                            <thead>
                                                <tr>
                                                    <th>Staff Name</th>
                                                    <th>Time of Submission</th>
                                                    <th>Date</th>
                                                    <th>Contact Email</th>
                                                    <th>Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {dutyReports.map((report) => {
                                                    const dateObj = new Date(report.createdAt);
                                                    return (
                                                        <tr key={report._id}>
                                                            <td style={{ fontWeight: 600, color: '#111827' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                    <div className="avatar-mini" style={{ background: '#E0E7FF', color: '#4338CA', width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
                                                                        {report.staffName[0]}
                                                                    </div>
                                                                    {report.staffName}
                                                                </div>
                                                            </td>
                                                            <td>
                                                                {dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                            </td>
                                                            <td style={{ color: '#6B7280' }}>
                                                                {dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                            </td>
                                                            <td style={{ fontSize: 13, color: '#6B7280' }}>
                                                                {report.user?.email || 'N/A'}
                                                            </td>
                                                            <td>
                                                                <span className="badge badge-success" style={{ background: '#DCFCE7', color: '#166534' }}>
                                                                    ✅ Received
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="empty-state" style={{ padding: '60px 20px' }}>
                                        <div className="empty-state-icon" style={{ fontSize: 48, marginBottom: 16 }}>📢</div>
                                        <h3 style={{ fontSize: 18, fontWeight: 600, color: '#374151' }}>No Reports Yet</h3>
                                        <p style={{ color: '#6B7280', maxWidth: 300, margin: '8px auto' }}>
                                            Staff members can manually report their duty names here.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
            <CreateNoticeModal
                isOpen={isNoticeModalOpen}
                onClose={() => setIsNoticeModalOpen(false)}
                onSuccess={() => { setIsNoticeModalOpen(false); window.location.reload(); }}
            />

            <VoiceControl commands={voiceCommands} />
        </div>
    );
};

export default HODDashboard;
