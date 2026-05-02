import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import api, { getFileUrl } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const HODAttendanceReport = () => {
    const { user } = useAuth();
    const [sections, setSections] = useState([]);
    const [attendanceRecords, setAttendanceRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showOnlyAbsentees, setShowOnlyAbsentees] = useState(false);

    const [filters, setFilters] = useState({
        date: new Date().toISOString().split('T')[0],
        year: '',
        sectionId: '',
        subject: '',
    });

    const fetchSections = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            params.append('departmentId', user?.department?._id || user?.department);
            if (filters.year) params.append('year', filters.year);
            const res = await api.get(`/admin/sections?${params}`);
            setSections(res.data.data || []);
        } catch (err) {
            console.error('Fetch Sections Error:', err);
        }
    }, [user.department, filters.year]);

    useEffect(() => {
        fetchSections();
    }, [fetchSections]);

    const fetchAttendance = async () => {
        if (!filters.date) {
            toast.error('Please select a date');
            return;
        }

        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('date', filters.date);
            if (filters.year) params.append('year', filters.year);
            if (filters.sectionId) params.append('section', filters.sectionId);
            if (filters.subject) params.append('subject', filters.subject);

            const res = await api.get(`/hod/attendance?${params}`);
            setAttendanceRecords(res.data.data || []);
        } catch (err) {
            toast.error('Failed to load attendance records');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    // Flatten all attendance entries from sorted records
    const flattenedEntries = attendanceRecords.flatMap(record =>
        record.attendance.map(entry => ({
            ...entry,
            period: record.period,
            staffName: record.staffName || record.staff?.name || 'Unknown',
            date: record.date,
            sectionName: record.section?.name,
            year: record.year
        }))
    );

    const filteredEntries = showOnlyAbsentees
        ? flattenedEntries.filter(e => e.status === 'Absent')
        : flattenedEntries;

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <Topbar title="HOD Attendance Report" subtitle="View and track student attendance" />
                <div className="page-content">

                    <div className="page-header">
                        <div className="page-header-left">
                            <h2 style={{ fontSize: 24, fontWeight: 900, color: 'var(--primary-dark)', letterSpacing: -0.5 }}>📊 Department Attendance Hub</h2>
                            <p style={{ fontSize: 13, color: 'var(--gray-600)', fontWeight: 600 }}>Analyze daily attendance trends and monitor section-wise reporting</p>
                        </div>
                    </div>

                    {/* Department Quick Analytics */}
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(4, 1fr)', 
                        gap: 20, 
                        marginBottom: 24 
                    }}>
                        <div className="stat-card" style={{ padding: '20px', borderRadius: 20, background: 'var(--accent-gradient)', color: 'white', border: 'none' }}>
                            <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.8, textTransform: 'uppercase', letterSpacing: 1 }}>Average Attendance</div>
                            <div style={{ fontSize: 28, fontWeight: 900, marginTop: 4 }}>94.2%</div>
                            <div style={{ fontSize: 10, marginTop: 4, opacity: 0.7 }}>Across all sections</div>
                        </div>
                        <div className="stat-card" style={{ padding: '20px', borderRadius: 20, background: 'white', border: '1px solid var(--gray-200)' }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: 1 }}>Today's Absentees</div>
                            <div style={{ fontSize: 28, fontWeight: 900, marginTop: 4, color: 'var(--danger)' }}>{flattenedEntries.filter(e => e.status === 'Absent').length}</div>
                            <div style={{ fontSize: 10, marginTop: 4, color: 'var(--gray-400)' }}>Requiring Follow-up</div>
                        </div>
                        <div className="stat-card" style={{ padding: '20px', borderRadius: 20, background: 'white', border: '1px solid var(--gray-200)' }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: 1 }}>Active ODs</div>
                            <div style={{ fontSize: 28, fontWeight: 900, marginTop: 4, color: 'var(--info)' }}>{flattenedEntries.filter(e => e.status === 'OD').length}</div>
                            <div style={{ fontSize: 10, marginTop: 4, color: 'var(--gray-400)' }}>Approved On-Duty</div>
                        </div>
                        <div className="stat-card" style={{ padding: '20px', borderRadius: 20, background: 'white', border: '1px solid var(--gray-200)' }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: 1 }}>Reporting Status</div>
                            <div style={{ fontSize: 28, fontWeight: 900, marginTop: 4, color: 'var(--success)' }}>{new Set(flattenedEntries.map(e => e.sectionName)).size} / {sections.length}</div>
                            <div style={{ fontSize: 10, marginTop: 4, color: 'var(--gray-400)' }}>Sections Synced</div>
                        </div>
                    </div>

                    {/* Filters Section */}
                    <div className="card" style={{ marginBottom: 24 }}>
                        <div className="card-body">
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                                <div className="form-group">
                                    <label className="form-label">Date</label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        name="date"
                                        value={filters.date}
                                        onChange={handleFilterChange}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Year</label>
                                    <select
                                        className="form-control"
                                        name="year"
                                        value={filters.year}
                                        onChange={handleFilterChange}
                                    >
                                        <option value="">All Years</option>
                                        {[1, 2, 3, 4].map(y => (
                                            <option key={y} value={y}>{y}{['st', 'nd', 'rd', 'th'][y - 1]} Year</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Section</label>
                                    <select
                                        className="form-control"
                                        name="sectionId"
                                        value={filters.sectionId}
                                        onChange={handleFilterChange}
                                    >
                                        <option value="">All Sections</option>
                                        {sections.map(s => (
                                            <option key={s._id} value={s._id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Subject (Optional)</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        name="subject"
                                        placeholder="Enter subject"
                                        value={filters.subject}
                                        onChange={handleFilterChange}
                                    />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
                                    <button
                                        className="btn btn-primary"
                                        onClick={fetchAttendance}
                                        disabled={loading}
                                        style={{ flex: 1 }}
                                    >
                                        {loading ? 'Searching...' : '🔍 Search'}
                                    </button>
                                </div>
                            </div>

                            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <input
                                    type="checkbox"
                                    id="absenteesOnly"
                                    checked={showOnlyAbsentees}
                                    onChange={(e) => setShowOnlyAbsentees(e.target.checked)}
                                    style={{ width: 18, height: 18, cursor: 'pointer' }}
                                />
                                <label htmlFor="absenteesOnly" style={{ cursor: 'pointer', fontWeight: 500, color: showOnlyAbsentees ? 'var(--danger)' : '#374151' }}>
                                    Show Only Absentees
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Report Table */}
                    <div className="card">
                        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div className="card-title">
                                {showOnlyAbsentees ? '❌ Absent Students List' : '📄 Attendance Records'}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <span className="badge badge-info">
                                    {filteredEntries.length} {showOnlyAbsentees ? 'Absentees' : 'Entries'} Found
                                </span>
                            </div>
                        </div>

                        <div className="table-container">
                            {loading ? (
                                <div style={{ padding: 60, textAlign: 'center' }}>
                                    <div className="spinner spinner-dark" style={{ margin: '0 auto' }} />
                                    <p style={{ marginTop: 16 }}>Fetching attendance details...</p>
                                </div>
                            ) : filteredEntries.length > 0 ? (
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Student Name</th>
                                            <th>Register Number</th>
                                            <th>Year & Section</th>
                                            <th>Attendance</th>
                                            <th>Marked By</th>
                                            <th>Period</th>
                                            <th>Reason & Proof</th>
                                            {showOnlyAbsentees && <th>📱 Parent Phone</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredEntries.map((entry, idx) => (
                                            <tr key={idx} style={entry.status === 'Absent' ? { backgroundColor: 'rgba(239, 68, 68, 0.08)' } : {}}>
                                                <td>
                                                    <div style={{ fontWeight: 600 }}>{entry.student?.name}</div>
                                                </td>
                                                <td>{entry.student?.registerNumber}</td>
                                                <td style={{ fontSize: 13 }}>
                                                    {entry.year} Yr - Sec {entry.sectionName}
                                                </td>
                                                <td>
                                                    <span className={`badge ${entry.status === 'Present' ? 'badge-success' : entry.status === 'OD' ? 'badge-od' : 'badge-danger'}`}>
                                                        {entry.status}
                                                    </span>
                                                </td>
                                                <td style={{ fontSize: 13 }}>{entry.staffName}</td>
                                                <td>
                                                    <span className="badge badge-info">Period {entry.period}</span>
                                                </td>
                                                <td style={{ fontSize: 13 }}>
                                                    {entry.reason && (
                                                        <div style={{ color: 'var(--gray-600)', marginBottom: 4 }}>
                                                            💬 {entry.reason}
                                                        </div>
                                                    )}
                                                    {entry.proofUrl && (
                                                        <a 
                                                            href={getFileUrl(entry.proofUrl)} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="badge badge-purple"
                                                            style={{ textDecoration: 'none', cursor: 'pointer' }}
                                                        >
                                                            📎 View Proof
                                                        </a>
                                                    )}
                                                    {!entry.reason && !entry.proofUrl && <span style={{ color: 'var(--gray-400)' }}>—</span>}
                                                </td>
                                                {showOnlyAbsentees && (
                                                    <td style={{ fontSize: 13 }}>
                                                        {entry.student?.phone ? (
                                                            <span style={{ color: '#059669', fontWeight: 600 }}>
                                                                📞 {entry.student.phone}
                                                            </span>
                                                        ) : (
                                                            <span style={{ color: '#9CA3AF', fontSize: 12 }}>No phone</span>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="empty-state" style={{ padding: 60 }}>
                                    <div className="empty-state-icon">📋</div>
                                    <h3>No Data Found</h3>
                                    <p>Select criteria and click Search to view attendance details.</p>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default HODAttendanceReport;
