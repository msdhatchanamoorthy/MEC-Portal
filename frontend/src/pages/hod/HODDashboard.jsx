import React, { useState, useEffect, useCallback } from 'react';
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend
} from 'chart.js';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import api from '../../services/api';
import socket from '../../services/socket';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import NoticeBoard from '../../components/shared/NoticeBoard';
import CreateNoticeModal from '../../components/shared/CreateNoticeModal';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const HODDashboard = () => {
    const { user } = useAuth();
    const [overview, setOverview] = useState(null);
    const [summary, setSummary] = useState([]);
    const [pendingRecords, setPendingRecords] = useState([]);
    const [dutyReports, setDutyReports] = useState([]);
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [staffLoading, setStaffLoading] = useState(true);
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
            const [overviewRes, summaryRes, pendingRes, dutyRes] = await Promise.all([
                api.get(`/attendance/daily-overview?date=${selectedDate}`),
                api.get('/attendance/summary'),
                api.get(`/attendance?status=pending&date=${selectedDate}`),
                api.get(`/duty-reports?date=${selectedDate}`)
            ]);
            setOverview(overviewRes.data);
            setSummary(summaryRes.data.data || []);
            setPendingRecords(pendingRes.data.data || []);
            setDutyReports(dutyRes.data.data || []);
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

    const overall = overview?.overall;

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <Topbar title={`HOD Dashboard — ${deptShort}`} subtitle={deptName} />
                <div className="page-content">

                    <div className="page-header">
                        <div className="page-header-left">
                            <h2>🏢 {deptName}</h2>
                            <p>Department attendance overview — manage and verify attendance records</p>
                        </div>
                        <div className="page-header-right">
                            <input
                                type="date"
                                className="form-control"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                style={{ width: 'auto' }}
                            />
                            <a href="/hod/reports" className="btn btn-primary">📄 Reports</a>
                        </div>
                    </div>

                    {loading ? (
                        <div className="loading-fullscreen">
                            <div className="spinner spinner-dark" />
                            <p>Loading department data...</p>
                        </div>
                    ) : (
                        <>
                            {/* Stats */}
                            <div className="dashboard-grid">
                                <div className="stat-card blue">
                                    <div className="stat-icon blue">👥</div>
                                    <div className="stat-info">
                                        <h3>{overall?.totalStudents || 0}</h3>
                                        <p>Total Students (Today)</p>
                                    </div>
                                </div>
                                <div className="stat-card green">
                                    <div className="stat-icon green">✅</div>
                                    <div className="stat-info">
                                        <h3>{overall?.presentCount || 0}</h3>
                                        <p>Present Today</p>
                                        <div className="stat-trend up">{overall?.percentage || '0.0'}%</div>
                                    </div>
                                </div>
                                <div className="stat-card red">
                                    <div className="stat-icon red">❌</div>
                                    <div className="stat-info">
                                        <h3>{overall?.absentCount || 0}</h3>
                                        <p>Absent Today</p>
                                    </div>
                                </div>
                                <div className="stat-card amber">
                                    <div className="stat-icon amber">⏳</div>
                                    <div className="stat-info">
                                        <h3>{pendingRecords.length}</h3>
                                        <p>Pending Approvals</p>
                                    </div>
                                </div>
                            </div>

                            {/* Row for Charts & Section-wise */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
                                {/* Year-wise Chart */}
                                <div className="card">
                                    <div className="card-header">
                                        <div className="card-title">📊 Year-wise Attendance</div>
                                    </div>
                                    <div className="card-body">
                                        <div className="chart-container">
                                            <Bar
                                                data={barData}
                                                options={{
                                                    responsive: true,
                                                    maintainAspectRatio: false,
                                                    plugins: { legend: { display: false } },
                                                    scales: {
                                                        y: { beginAtZero: true, max: 100, ticks: { callback: (v) => v + '%' } },
                                                        x: { grid: { display: false } },
                                                    },
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Section-wise Status */}
                                <div className="card">
                                    <div className="card-header">
                                        <div className="card-title">📚 Section-wise Attendance</div>
                                    </div>
                                    <div className="table-container" style={{ maxHeight: 280, overflowY: 'auto' }}>
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>Year</th>
                                                    <th>Section</th>
                                                    <th>Avg %</th>
                                                    <th>Submission</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {overview?.sectionSummary?.length > 0 ? (
                                                    overview.sectionSummary.map((s, i) => (
                                                        <tr key={i}>
                                                            <td>{s.year}{['st', 'nd', 'rd', 'th'][s.year - 1]} Year</td>
                                                            <td>Section {s.sectionName}</td>
                                                            <td>
                                                                <span style={{ fontWeight: 600, color: s.avgAttendance >= 75 ? 'var(--success)' : 'var(--text-main)' }}>
                                                                    {s.avgAttendance}%
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <span className={`badge ${s.isSubmitted ? 'badge-success' : 'badge-warning'}`}>
                                                                    {s.submissionStatus}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan="4" style={{ textAlign: 'center', color: '#9CA3AF', padding: 24 }}>No sections found</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            {/* Notice Board */}
                            <NoticeBoard
                                userRole="hod"
                                onCreateClick={() => setIsNoticeModalOpen(true)}
                            />

                            {/* Staff Members Section */}
                            <div className="card" style={{ marginBottom: 24 }}>
                                <div className="card-header">
                                    <div className="card-title">👨‍🏫 STAFF MEMBERS</div>
                                    <span className="badge badge-info">{staffList.length} Active Staff</span>
                                </div>
                                <div className="card-body">
                                    {staffLoading ? (
                                        <div style={{ padding: 20, textAlign: 'center' }}>
                                            <div className="spinner" style={{ margin: '0 auto' }} />
                                            <p style={{ marginTop: 10, color: '#6B7280' }}>Fetching staff list...</p>
                                        </div>
                                    ) : staffList.length > 0 ? (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                                            {staffList.map((staff) => (
                                                <div key={staff._id} className="stat-card" style={{
                                                    background: '#fff',
                                                    border: '1px solid #E5E7EB',
                                                    padding: '16px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 12,
                                                    transition: 'transform 0.2s',
                                                    cursor: 'default'
                                                }}>
                                                    <div className="stat-icon blue" style={{ fontSize: 24 }}>👨‍🏫</div>
                                                    <div className="stat-info">
                                                        <h4 style={{ margin: 0, fontSize: 15, color: '#111827' }}>Prof. {staff.name}</h4>
                                                        <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6B7280' }}>
                                                            {staff.year}{['st', 'nd', 'rd', 'th'][staff.year - 1]} Year — Sec {staff.section}
                                                        </p>
                                                        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9CA3AF' }}>{staff.email}</p>
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
        </div>
    );
};

export default HODDashboard;
