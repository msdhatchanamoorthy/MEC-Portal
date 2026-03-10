import React, { useState, useEffect, useCallback } from 'react';
import {
    Chart as ChartJS,
    CategoryScale, LinearScale, BarElement, ArcElement,
    Title, Tooltip, Legend
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import api from '../../services/api';
import toast from 'react-hot-toast';
import NoticeBoard from '../../components/shared/NoticeBoard';
import CreateNoticeModal from '../../components/shared/CreateNoticeModal';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const PrincipalDashboard = () => {
    const [overview, setOverview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [drilldown, setDrilldown] = useState({ open: false, data: null, loading: false, deptName: '', deptId: '' });
    const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
    const isFetching = React.useRef(false);

    const handleDeptClick = async (deptId, deptName) => {
        const id = deptId || '';
        console.log('Clicked Department:', { deptId, deptName, id });

        if (!id) {
            toast.error('Department ID is missing for this record');
            return;
        }

        setDrilldown({ open: true, data: null, loading: true, deptName, deptId: id });
        try {
            const res = await api.get('/attendance/drilldown', {
                params: {
                    departmentId: id,
                    date: selectedDate
                }
            });
            setDrilldown(prev => ({ ...prev, data: res.data.drilldown, loading: false }));
        } catch (err) {
            console.error('Drilldown Fetch Error:', err);
            const msg = err.response?.data?.message || 'Failed to load department details. Check backend route configuration.';
            toast.error(msg);
            setDrilldown(prev => ({ ...prev, open: false, loading: false }));
        }
    };

    const fetchOverview = useCallback(async () => {
        if (isFetching.current) return;
        isFetching.current = true;

        try {
            setLoading(true);
            const res = await api.get(`/attendance/daily-overview?date=${selectedDate}`);
            setOverview(res.data);
        } catch (err) {
            console.error('Principal Dashboard Fetch Error:', err);
            if (err.response?.status !== 401) {
                toast.error(`Error: ${err.response?.data?.message || 'Failed to load dashboard data'}`);
            }
        } finally {
            setLoading(false);
            isFetching.current = false;
        }
    }, [selectedDate]);

    useEffect(() => {
        fetchOverview();
    }, [fetchOverview]);

    const getAttendanceColor = (pct) => {
        const p = parseFloat(pct);
        if (p >= 75) return 'green';
        if (p >= 50) return 'amber';
        return 'red';
    };

    const barData = overview?.departmentSummary
        ? {
            labels: overview.departmentSummary.map((d) => d.shortName),
            datasets: [
                {
                    label: 'Present',
                    data: overview.departmentSummary.map((d) => d.presentCount),
                    backgroundColor: 'rgba(16, 185, 129, 0.75)',
                    borderRadius: 6,
                },
                {
                    label: 'Absent',
                    data: overview.departmentSummary.map((d) => d.absentCount),
                    backgroundColor: 'rgba(239, 68, 68, 0.65)',
                    borderRadius: 6,
                },
            ],
        }
        : null;

    const doughnutData = overview?.overall
        ? {
            labels: ['Present', 'Absent'],
            datasets: [
                {
                    data: [overview.overall.presentCount, overview.overall.absentCount],
                    backgroundColor: ['#10B981', '#EF4444'],
                    borderWidth: 0,
                    hoverOffset: 4,
                },
            ],
        }
        : null;

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <Topbar title="Principal Dashboard" subtitle="MEC College — Full Attendance Overview" />
                <div className="page-content">

                    {/* Page Header */}
                    <div className="page-header">
                        <div className="page-header-left">
                            <h2>🏫 College Attendance Overview</h2>
                            <p>Real-time attendance statistics across all departments</p>
                        </div>
                        <div className="page-header-right">
                            <input
                                type="date"
                                className="form-control"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                style={{ width: 'auto' }}
                            />
                            <a href="/principal/reports" className="btn btn-primary">
                                📄 Reports
                            </a>
                        </div>
                    </div>

                    {loading ? (
                        <div className="loading-fullscreen">
                            <div className="spinner spinner-dark" />
                            <p>Loading dashboard...</p>
                        </div>
                    ) : (
                        <>
                            {/* Stats Cards */}
                            <div className="dashboard-grid">
                                <div className="stat-card blue">
                                    <div className="stat-icon blue">🏛️</div>
                                    <div className="stat-info">
                                        <h3>15</h3>
                                        <p>Total Departments</p>
                                    </div>
                                </div>
                                <div className="stat-card green">
                                    <div className="stat-icon green">👥</div>
                                    <div className="stat-info">
                                        <h3>{overview?.overall?.totalStudents?.toLocaleString() || 0}</h3>
                                        <p>Total Students (Today)</p>
                                    </div>
                                </div>
                                <div className="stat-card green">
                                    <div className="stat-icon green">✅</div>
                                    <div className="stat-info">
                                        <h3>{overview?.overall?.presentCount?.toLocaleString() || 0}</h3>
                                        <p>Present Today</p>
                                        <div className={`stat-trend ${parseFloat(overview?.overall?.percentage) >= 75 ? 'up' : 'down'}`}>
                                            {overview?.overall?.percentage}% attendance
                                        </div>
                                    </div>
                                </div>
                                <div className="stat-card red">
                                    <div className="stat-icon red">❌</div>
                                    <div className="stat-info">
                                        <h3>{overview?.overall?.absentCount?.toLocaleString() || 0}</h3>
                                        <p>Absent Today</p>
                                    </div>
                                </div>
                            </div>

                            <NoticeBoard
                                userRole="principal"
                                onCreateClick={() => setIsNoticeModalOpen(true)}
                            />

                            {/* Charts Row */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, marginBottom: 24 }}>
                                {/* Bar Chart */}
                                <div className="card">
                                    <div className="card-header">
                                        <div className="card-title">📊 Department-wise Attendance</div>
                                    </div>
                                    <div className="card-body">
                                        <div className="chart-container" style={{ height: 280 }}>
                                            {barData && (
                                                <Bar
                                                    data={barData}
                                                    options={{
                                                        responsive: true,
                                                        maintainAspectRatio: false,
                                                        plugins: { legend: { position: 'top' } },
                                                        scales: {
                                                            x: { grid: { display: false } },
                                                            y: { beginAtZero: true },
                                                        },
                                                    }}
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Doughnut */}
                                <div className="card">
                                    <div className="card-header">
                                        <div className="card-title">🎯 Overall</div>
                                    </div>
                                    <div className="card-body" style={{ textAlign: 'center' }}>
                                        {doughnutData && (
                                            <>
                                                <div style={{ height: 200, position: 'relative', marginBottom: 16 }}>
                                                    <Doughnut
                                                        data={doughnutData}
                                                        options={{
                                                            responsive: true,
                                                            maintainAspectRatio: false,
                                                            cutout: '72%',
                                                            plugins: { legend: { position: 'bottom' } },
                                                        }}
                                                    />
                                                    <div style={{
                                                        position: 'absolute', inset: 0,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        flexDirection: 'column',
                                                    }}>
                                                        <div style={{ fontSize: 28, fontWeight: 700, color: '#111827' }}>
                                                            {overview?.overall?.percentage}%
                                                        </div>
                                                        <div style={{ fontSize: 11, color: '#6B7280' }}>Attendance</div>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                        {!doughnutData && <p style={{ color: '#9CA3AF', paddingTop: 30 }}>No attendance data for selected date</p>}
                                    </div>
                                </div>
                            </div>

                            {/* Department Summary Table */}
                            {!drilldown.open ? (
                                <div className="card">
                                    <div className="card-header">
                                        <div className="card-title">🏢 Department-wise Summary</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <span style={{ fontSize: 13, color: '#6B7280' }}>💡 Click a row to view detailed absentees</span>
                                            <span className="badge badge-info">{overview?.departmentSummary?.length || 0} Departments</span>
                                        </div>
                                    </div>
                                    {overview?.departmentSummary?.length > 0 ? (
                                        <div className="table-container">
                                            <table>
                                                <thead>
                                                    <tr>
                                                        <th>#</th>
                                                        <th>Department</th>
                                                        <th>Short Name</th>
                                                        <th>Total Students</th>
                                                        <th>Present</th>
                                                        <th>Absent Today</th>
                                                        <th>Attendance %</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {overview.departmentSummary.map((d, i) => {
                                                        const pct = parseFloat(d.percentage);
                                                        const colorClass = getAttendanceColor(d.percentage);
                                                        return (
                                                            <tr
                                                                key={i}
                                                                onClick={() => handleDeptClick(d.departmentId || d._id, d.department)}
                                                                style={{ cursor: 'pointer' }}
                                                                className="hover-row"
                                                            >
                                                                <td style={{ color: '#9CA3AF', fontWeight: 600 }}>{i + 1}</td>
                                                                <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{d.department}</td>
                                                                <td><span className="badge badge-ghost">{d.shortName}</span></td>
                                                                <td>{d.totalStudents}</td>
                                                                <td style={{ color: 'var(--success)', fontWeight: 600 }}>{d.presentCount}</td>
                                                                <td style={{ color: 'var(--danger)', fontWeight: 600 }}>{d.absentCount}</td>
                                                                <td>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                                        <div className="percentage-bar" style={{ flex: 1, height: 8 }}>
                                                                            <div
                                                                                className={`percentage-fill ${colorClass}`}
                                                                                style={{ width: `${Math.min(pct, 100)}%` }}
                                                                            />
                                                                        </div>
                                                                        <span style={{ fontSize: 13, fontWeight: 700, minWidth: 48 }}>{d.percentage}%</span>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="empty-state">
                                            <div className="empty-state-icon">📭</div>
                                            <h3>No Attendance Data</h3>
                                            <p>No attendance records found for {new Date(selectedDate).toLocaleDateString('en-IN')}.</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="card">
                                    <div className="card-header" style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 16 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                onClick={() => setDrilldown({ open: false, data: null, loading: false })}
                                                style={{ padding: '4px 8px' }}
                                            >
                                                ⬅️ Back
                                            </button>
                                            <div>
                                                <div className="card-title" style={{ fontSize: 18 }}>📍 {drilldown.deptName} — Absentee Drilldown</div>
                                                <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>
                                                    Detailed breakdown of absent students by Year and Section
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="card-body">
                                        {drilldown.loading ? (
                                            <div style={{ padding: '60px 0', textAlign: 'center' }}>
                                                <div className="spinner" style={{ margin: '0 auto 16px' }} />
                                                <p>Fetching department details...</p>
                                            </div>
                                        ) : drilldown.data ? (
                                            <div className="drilldown-content">
                                                {/* Overview Chart for Drilldown */}
                                                <div className="card" style={{ marginBottom: 24, border: '1px solid #f3f4f6', boxShadow: 'none' }}>
                                                    <div className="card-header" style={{ padding: '12px 16px' }}>
                                                        <div style={{ fontWeight: 700, fontSize: 14 }}>📊 Section-wise Absentee Distribution</div>
                                                    </div>
                                                    <div className="card-body" style={{ height: 200 }}>
                                                        <Bar
                                                            data={{
                                                                labels: drilldown.data.flatMap(y => y.sections.map(s => `${y.year}Yr - ${s.sectionName}`)),
                                                                datasets: [{
                                                                    label: 'Absentees',
                                                                    data: drilldown.data.flatMap(y => y.sections.map(s => s.absentCount)),
                                                                    backgroundColor: 'rgba(239, 68, 68, 0.7)',
                                                                    borderRadius: 4
                                                                }]
                                                            }}
                                                            options={{
                                                                responsive: true,
                                                                maintainAspectRatio: false,
                                                                plugins: { legend: { display: false } },
                                                                scales: {
                                                                    y: { beginAtZero: true, ticks: { stepSize: 1 } },
                                                                    x: { grid: { display: false } }
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: 20 }}>
                                                    {drilldown.data.map((yData) => (
                                                        <div key={yData.year} className="card" style={{ border: '1px solid #f3f4f6', boxShadow: 'none' }}>
                                                            <div className="card-header" style={{ padding: '12px 16px', background: '#f9fafb' }}>
                                                                <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--primary)' }}>
                                                                    📅 {yData.year}{['st', 'nd', 'rd', 'th'][yData.year - 1]} Year
                                                                </div>
                                                            </div>
                                                            <div className="card-body" style={{ padding: 0 }}>
                                                                {yData.sections.length > 0 ? (
                                                                    <table className="table-sm">
                                                                        <thead style={{ background: '#fff' }}>
                                                                            <tr>
                                                                                <th style={{ paddingLeft: 16 }}>Section</th>
                                                                                <th>Total Students</th>
                                                                                <th style={{ textAlign: 'right', paddingRight: 16 }}>Absentees</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {yData.sections.map((sec) => (
                                                                                <tr key={sec.sectionName}>
                                                                                    <td style={{ paddingLeft: 16, fontWeight: 600 }}>Section {sec.sectionName}</td>
                                                                                    <td>{sec.totalStudents}</td>
                                                                                    <td style={{ textAlign: 'right', paddingRight: 16 }}>
                                                                                        <span style={{
                                                                                            background: '#FEE2E2',
                                                                                            color: '#B91C1C',
                                                                                            padding: '2px 10px',
                                                                                            borderRadius: 12,
                                                                                            fontSize: 12,
                                                                                            fontWeight: 700
                                                                                        }}>
                                                                                            {sec.absentCount}
                                                                                        </span>
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                            <tr style={{ background: '#f9fafb', fontWeight: 700 }}>
                                                                                <td style={{ paddingLeft: 16 }}>Total</td>
                                                                                <td>
                                                                                    {yData.sections.reduce((acc, s) => acc + s.totalStudents, 0)}
                                                                                </td>
                                                                                <td style={{ textAlign: 'right', paddingRight: 16, color: 'var(--danger)' }}>
                                                                                    {yData.sections.reduce((acc, s) => acc + s.absentCount, 0)}
                                                                                </td>
                                                                            </tr>
                                                                        </tbody>
                                                                    </table>
                                                                ) : (
                                                                    <div style={{ padding: 20, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
                                                                        No attendance records for this year today
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="empty-state">
                                                <p>Failed to load drilldown data.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
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

export default PrincipalDashboard;
