import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import api, { getFileUrl } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const AttendanceReports = () => {
    const { user } = useAuth();
    const [records, setRecords] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState('');
    const [absenteeModal, setAbsenteeModal] = useState({ open: false, data: null, loading: false });

    // Filters
    const [filters, setFilters] = useState({
        departmentId: user?.role === 'hod' ? user?.department?._id || '' : '',
        year: '',
        sectionId: '',
        date: new Date().toISOString().split('T')[0],
        status: '',
    });

    useEffect(() => {
        if (user?.role === 'principal') fetchDepartments();
        fetchSections();
        fetchRecords();
    }, []);

    const fetchDepartments = async () => {
        try {
            const res = await api.get('/admin/departments');
            setDepartments(res.data.data || []);
        } catch { }
    };

    const fetchSections = async () => {
        try {
            const params = new URLSearchParams();
            if (filters.departmentId) params.append('departmentId', filters.departmentId);
            if (filters.year) params.append('year', filters.year);
            const res = await api.get(`/admin/sections?${params}`);
            setSections(res.data.data || []);
        } catch { }
    };

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
            const res = await api.get(`/attendance?${params}`);
            setRecords(res.data.data || []);
        } catch (err) {
            toast.error('Failed to load records');
        } finally {
            setLoading(false);
        }
    };

    const fetchAbsentees = async (id) => {
        setAbsenteeModal({ open: true, data: null, loading: true });
        try {
            const res = await api.get(`/hod/attendance/${id}/absentees`);
            setAbsenteeModal({ open: true, data: res.data, loading: false });
        } catch (err) {
            toast.error('Failed to load absentee details');
            setAbsenteeModal({ open: false, data: null, loading: false });
        }
    };

    const handleFilterChange = (key, val) => {
        setFilters((prev) => ({ ...prev, [key]: val }));
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this attendance record? This action cannot be undone.')) return;

        try {
            await api.delete(`/attendance/${id}`);
            toast.success('Record deleted successfully');
            fetchRecords();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete record');
        }
    };

    const handleExport = async (type, recordId = null, filterType = null) => {
        setExporting(type + (recordId || '') + (filterType || ''));
        try {
            const params = new URLSearchParams();
            if (recordId) {
                params.append('recordId', recordId);
            } else {
                Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
            }
            if (filterType) params.append('filterType', filterType);
            
            const res = await api.get(`/reports/${type}?${params}`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            const filename = filterType === 'absentees' ? 'absentee_report.pdf' : `attendance_report.${type === 'excel' ? 'xlsx' : 'pdf'}`;
            a.download = filename;
            a.click();
            window.URL.revokeObjectURL(url);
            toast.success(`${filterType === 'absentees' ? 'Absentee List' : type.toUpperCase()} downloaded!`);
        } catch {
            toast.error('Export failed');
        } finally {
            setExporting('');
        }
    };

    // Aggregate stats
    const totalPresent = records.reduce(
        (sum, r) => sum + r.attendance.filter((a) => a.status === 'Present').length, 0
    );
    const totalStudentEntries = records.reduce((sum, r) => sum + r.attendance.length, 0);
    const overallPct = totalStudentEntries > 0 ? ((totalPresent / totalStudentEntries) * 100).toFixed(1) : 0;

    const pageTitle = user?.role === 'staff' ? 'My Attendance Records' :
        user?.role === 'hod' ? 'Department Attendance Reports' : 'College Attendance Reports';

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <Topbar title={pageTitle} subtitle="Filter and export attendance records" />
                <div className="page-content">

                    <div className="page-header">
                        <div className="page-header-left">
                            <h2>📋 {pageTitle}</h2>
                            <p>Filter records and download reports in Excel or PDF format</p>
                        </div>
                        <div className="page-header-right" style={{ display: 'flex', gap: 10 }}>
                            <button
                                className="btn btn-success"
                                onClick={() => handleExport('excel')}
                                disabled={!!exporting}
                                style={{ borderRadius: 12 }}
                            >
                                {exporting === 'excel' ? <><span className="spinner" /> EXPORTING...</> : '📊 EXCEL REPORT'}
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={() => handleExport('pdf')}
                                disabled={!!exporting}
                                style={{ borderRadius: 12 }}
                            >
                                {exporting === 'pdf' ? <><span className="spinner" /> EXPORTING...</> : '📄 WHOLE PDF'}
                            </button>
                            <button
                                className="btn btn-warning"
                                onClick={() => handleExport('pdf', null, 'absentees')}
                                disabled={!!exporting}
                                style={{ borderRadius: 12, background: '#F59E0B', color: 'white' }}
                            >
                                {exporting === 'pdfabsentees' ? <><span className="spinner" /> EXPORTING...</> : '🚫 ABSENTEES PDF'}
                            </button>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="card" style={{ marginBottom: 20 }}>
                        <div className="filters-bar">
                            {user?.role === 'principal' && (
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label">Department</label>
                                    <select
                                        className="form-control"
                                        value={filters.departmentId}
                                        onChange={(e) => handleFilterChange('departmentId', e.target.value)}
                                    >
                                        <option value="">All Departments</option>
                                        {departments.map((d) => (
                                            <option key={d._id} value={d._id}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label">Year</label>
                                <select
                                    className="form-control"
                                    value={filters.year}
                                    onChange={(e) => handleFilterChange('year', e.target.value)}
                                >
                                    <option value="">All Years</option>
                                    {[1, 2, 3, 4].map((y) => (
                                        <option key={y} value={y}>{y}{['st', 'nd', 'rd', 'th'][y - 1]} Year</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label">Section</label>
                                <select
                                    className="form-control"
                                    value={filters.sectionId}
                                    onChange={(e) => handleFilterChange('sectionId', e.target.value)}
                                >
                                    <option value="">All Sections</option>
                                    {sections.map((s) => (
                                        <option key={s._id} value={s._id}>
                                            {s.year}{['st', 'nd', 'rd', 'th'][s.year - 1]} Yr — Sec {s.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label">Select Date</label>
                                <input
                                    type="date"
                                    className="form-control"
                                    value={filters.date}
                                    onChange={(e) => handleFilterChange('date', e.target.value)}
                                />
                            </div>

                            <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label">Status</label>
                                <select
                                    className="form-control"
                                    value={filters.status}
                                    onChange={(e) => handleFilterChange('status', e.target.value)}
                                >
                                    <option value="">All Status</option>
                                    <option value="pending">Pending</option>
                                    <option value="approved">Approved</option>
                                    <option value="rejected">Rejected</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                                <button className="btn btn-primary" onClick={fetchRecords} disabled={loading}>
                                    {loading ? <><span className="spinner" /> Loading...</> : '🔍 Search'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Summary Stats */}
                    <div className="dashboard-grid" style={{ marginBottom: 20 }}>
                        <div className="stat-card blue">
                            <div className="stat-icon blue">📝</div>
                            <div className="stat-info">
                                <h3>{records.length}</h3>
                                <p>Total Records</p>
                            </div>
                        </div>
                        <div className="stat-card green">
                            <div className="stat-icon green">✅</div>
                            <div className="stat-info">
                                <h3>{totalPresent.toLocaleString()}</h3>
                                <p>Total Present Entries</p>
                            </div>
                        </div>
                        <div className="stat-card red">
                            <div className="stat-icon red">❌</div>
                            <div className="stat-info">
                                <h3>{(totalStudentEntries - totalPresent).toLocaleString()}</h3>
                                <p>Total Absent Entries</p>
                            </div>
                        </div>
                        <div className="stat-card purple">
                            <div className="stat-icon purple">📊</div>
                            <div className="stat-info">
                                <h3>{overallPct}%</h3>
                                <p>Overall Attendance</p>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="card">
                        <div className="card-header">
                            <div className="card-title">📋 Attendance Records</div>
                            <span className="badge badge-info">{records.length} records</span>
                        </div>

                        {loading ? (
                            <div className="loading-fullscreen">
                                <div className="spinner spinner-dark" />
                                <p>Loading records...</p>
                            </div>
                        ) : records.length > 0 ? (
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Period</th>
                                            <th>Marked By</th>
                                            <th>Year & Section</th>
                                            <th>Total</th>
                                            <th>Present</th>
                                            <th>Absent</th>
                                            <th>%</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {records.map((r) => {
                                            const present = r.attendance.filter((a) => a.status === 'Present').length;
                                            const total = r.attendance.length;
                                            const pct = total > 0 ? ((present / total) * 100).toFixed(0) : 0;
                                            return (
                                                <tr key={r._id}>
                                                    <td style={{ whiteSpace: 'nowrap' }}>
                                                        {new Date(r.date).toLocaleDateString('en-IN')}
                                                    </td>
                                                    <td>P{r.period}</td>
                                                    <td style={{ fontSize: 13, fontWeight: 500 }}>
                                                        {r.staffName || r.staff?.name || 'N/A'}
                                                    </td>
                                                    <td>
                                                        {r.year}{['st', 'nd', 'rd', 'th'][r.year - 1]} Yr — Sec {r.section?.name}
                                                    </td>
                                                    <td>{total}</td>
                                                    <td style={{ color: 'var(--success)', fontWeight: 600 }}>{present}</td>
                                                    <td style={{ color: 'var(--danger)', fontWeight: 600 }}>{total - present}</td>
                                                    <td>
                                                        <span style={{ fontWeight: 700, color: pct >= 75 ? 'var(--success)' : pct >= 50 ? 'var(--accent)' : 'var(--danger)' }}>
                                                            {pct}%
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className={`badge ${r.status === 'approved' ? 'badge-success' :
                                                            r.status === 'rejected' ? 'badge-danger' : 'badge-warning'
                                                            }`}>
                                                            {r.status}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: 6 }}>
                                                            {user?.role === 'hod' && (
                                                                <>
                                                                    <button
                                                                        className="btn btn-success btn-sm"
                                                                        title="Download this record"
                                                                        onClick={() => handleExport('excel', r._id)}
                                                                        disabled={exporting === 'excel' + r._id}
                                                                        style={{ padding: '4px 8px', minWidth: '32px' }}
                                                                    >
                                                                        {exporting === 'excel' + r._id ? '⌛' : '📊'}
                                                                    </button>
                                                                    <button
                                                                        className="btn btn-danger btn-sm"
                                                                        title="Download Whole PDF"
                                                                        onClick={() => handleExport('pdf', r._id)}
                                                                        disabled={exporting.includes('pdf' + r._id)}
                                                                        style={{ padding: '4px 8px', minWidth: '32px' }}
                                                                    >
                                                                        📄
                                                                    </button>
                                                                    <button
                                                                        className="btn btn-warning btn-sm"
                                                                        title="Download Absentees Only PDF"
                                                                        onClick={() => handleExport('pdf', r._id, 'absentees')}
                                                                        disabled={exporting.includes('absentees')}
                                                                        style={{ padding: '4px 8px', minWidth: '32px', background: '#F59E0B', color: 'white', border: 'none' }}
                                                                    >
                                                                        🚫
                                                                    </button>
                                                                    <button
                                                                        className="btn btn-ghost btn-sm"
                                                                        title="View Absentees"
                                                                        onClick={() => fetchAbsentees(r._id)}
                                                                        style={{ padding: '4px 8px', color: 'var(--accent)', border: '1px solid #e5e7eb' }}
                                                                    >
                                                                        👁️
                                                                    </button>
                                                                </>
                                                            )}
                                                            {r.status !== 'approved' && user?.role === 'staff' && (
                                                                <>
                                                                    <button
                                                                        className="btn btn-ghost btn-sm"
                                                                        title="Edit"
                                                                        onClick={() => window.location.href = `/staff/mark-attendance?edit=${r._id}`}
                                                                        style={{ padding: '4px 8px', color: 'var(--primary)', border: '1px solid #e5e7eb' }}
                                                                    >
                                                                        ✏️
                                                                    </button>
                                                                    <button
                                                                        className="btn btn-ghost btn-sm"
                                                                        title="Delete"
                                                                        onClick={() => handleDelete(r._id)}
                                                                        style={{ padding: '4px 8px', color: 'var(--danger)', border: '1px solid #e5e7eb' }}
                                                                    >
                                                                        🗑️
                                                                    </button>
                                                                </>
                                                            )}
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
                                <h3>No Records Found</h3>
                                <p>Adjust filters and click Search to find attendance records.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div >

            {/* Absentee Details Modal */}
            {absenteeModal.open && (
                <div className="modal-overlay" style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                    padding: 20, backdropFilter: 'blur(4px)'
                }}>
                    <div className="modal-content card" style={{
                        maxWidth: 700, width: '100%', maxHeight: '90vh', overflowY: 'auto',
                        padding: 0, background: 'var(--card-bg)', borderRadius: 16, 
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                        border: '1px solid var(--gray-200)'
                    }}>
                        <div className="card-header" style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '20px 24px', borderBottom: '1px solid var(--gray-100)',
                            background: 'var(--gray-50)'
                        }}>
                            <div>
                                <h3 style={{ margin: 0, color: 'var(--gray-900)', fontWeight: 800 }}>
                                    {absenteeModal.loading ? 'Loading Details...' :
                                        `Student Details – ${absenteeModal.data?.meta?.sectionName} (${absenteeModal.data?.meta?.year}${['st', 'nd', 'rd', 'th'][absenteeModal.data?.meta?.year - 1]} Year)`
                                    }
                                </h3>
                                {!absenteeModal.loading && (
                                    <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--gray-500)', fontWeight: 500 }}>
                                        {new Date(absenteeModal.data?.meta?.date).toLocaleDateString('en-IN')} — Period {absenteeModal.data?.meta?.period} — {absenteeModal.data?.meta?.staffName}
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={() => setAbsenteeModal({ open: false, data: null, loading: false })}
                                style={{
                                    border: 'none', background: 'none', fontSize: 24, cursor: 'pointer',
                                    color: '#9CA3AF', padding: 4
                                }}
                            >✕</button>
                        </div>

                        <div className="card-body" style={{ padding: 24 }}>
                            {absenteeModal.loading ? (
                                <div style={{ textAlign: 'center', padding: 40 }}>
                                    <div className="spinner spinner-dark" style={{ margin: '0 auto' }} />
                                    <p style={{ marginTop: 16 }}>Fetching list...</p>
                                </div>
                            ) : (
                                <>
                                    <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <span style={{ fontSize: 14, color: 'var(--gray-600)', fontWeight: 600 }}>Subject:</span>
                                            <span style={{ marginLeft: 8, fontSize: 14, color: 'var(--gray-900)', fontWeight: 700 }}>{absenteeModal.data?.meta?.subject}</span>
                                        </div>
                                        <div className="badge badge-info" style={{ fontSize: 14, padding: '8px 16px', borderRadius: 10, background: 'var(--primary-gradient)', color: 'white', border: 'none' }}>
                                            Total Flagged: {absenteeModal.count}
                                        </div>
                                    </div>

                                    <div className="table-container">
                                        {absenteeModal.data?.data?.length > 0 ? (
                                            <table>
                                                <thead>
                                                    <tr>
                                                        <th>Register Number</th>
                                                        <th>Student Name</th>
                                                        <th>Status</th>
                                                        <th>Reason & Proof</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {absenteeModal.data.data.map((abs, idx) => (
                                                        <tr key={idx} style={{ 
                                                            backgroundColor: abs.status === 'Present' ? '' : 
                                                                           abs.status === 'OD' ? 'rgba(59, 130, 246, 0.08)' : 
                                                                           'rgba(239, 68, 68, 0.08)' 
                                                        }}>
                                                            <td style={{ fontWeight: 600 }}>{abs.student?.registerNumber}</td>
                                                            <td>{abs.student?.name}</td>
                                                            <td>
                                                                <span className={`badge ${abs.status === 'Leave' ? 'badge-warning' : abs.status === 'OD' ? 'badge-od' : 'badge-danger'}`}>
                                                                    {abs.status}
                                                                </span>
                                                            </td>
                                                            <td style={{ fontSize: 13 }}>
                                                                {abs.reason && (
                                                                    <div style={{ color: 'var(--gray-600)', marginBottom: 4 }}>
                                                                        💬 {abs.reason}
                                                                    </div>
                                                                )}
                                                                {abs.proofUrl && (
                                                                    <a 
                                                                        href={getFileUrl(abs.proofUrl)} 
                                                                        target="_blank" 
                                                                        rel="noopener noreferrer"
                                                                        className="badge badge-purple"
                                                                        style={{ textDecoration: 'none', cursor: 'pointer' }}
                                                                    >
                                                                        📎 View Proof
                                                                    </a>
                                                                )}
                                                                {!abs.reason && !abs.proofUrl && <span style={{ color: 'var(--gray-400)' }}>—</span>}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        ) : (
                                            <div className="empty-state" style={{ padding: 30 }}>
                                                <div className="empty-state-icon">🎉</div>
                                                <h3>No Absentees</h3>
                                                <p>Excellent! Everyone was present for this period.</p>
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ marginTop: 24, textAlign: 'right' }}>
                                        <button
                                            className="btn btn-primary"
                                            onClick={() => setAbsenteeModal({ open: false, data: null, loading: false })}
                                        >Close</button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default AttendanceReports;
