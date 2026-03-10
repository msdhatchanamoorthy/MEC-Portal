import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const HODNotifyParents = () => {
    const { user } = useAuth();
    const [absentees, setAbsentees] = useState([]);
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(false);
    const [notifying, setNotifying] = useState(false);
    const [notifyResults, setNotifyResults] = useState(null);

    const [filters, setFilters] = useState({
        date: new Date().toISOString().split('T')[0],
        year: '',
        section: '',
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

    const fetchReport = useCallback(async () => {
        if (!filters.date) {
            toast.error('Please select a date');
            return;
        }

        setLoading(true);
        setNotifyResults(null);
        try {
            const params = new URLSearchParams();
            params.append('date', filters.date);
            if (filters.year) params.append('year', filters.year);
            if (filters.section) params.append('section', filters.section);

            const res = await api.get(`/hod/absentee-report?${params}`);
            setAbsentees(res.data.data || []);
        } catch (err) {
            toast.error('Failed to load absentees for notification');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [filters.date, filters.year, filters.section]);

    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleNotifyParents = async () => {
        if (absentees.length === 0) {
            toast.error('No absentees to notify');
            return;
        }

        setNotifying(true);
        setNotifyResults(null);
        try {
            const res = await api.post('/hod/notify-parents', {
                absentees: absentees,
                date: filters.date
            });

            const { notified, skipped, results } = res.data;
            setNotifyResults(results);

            if (notified > 0) {
                toast.success(`✅ Message sent to ${notified} parent(s)!${skipped > 0 ? ` (${skipped} skipped — no phone)` : ''}`);
            } else {
                toast.error(`⚠️ No messages sent. ${skipped} student(s) have no phone number.`);
            }
        } catch (err) {
            toast.error('Failed to send notifications');
            console.error(err);
        } finally {
            setNotifying(false);
        }
    };

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <Topbar title="Notify Parents" subtitle="Send SMS notifications to parents of absent students" />
                <div className="page-content">

                    <div className="page-header">
                        <div className="page-header-left">
                            <h2>📲 Notify Parents</h2>
                            <p>Select date and section to send absentee alerts to parents</p>
                        </div>
                        <div className="page-header-right">
                            <button
                                className="btn btn-primary"
                                onClick={handleNotifyParents}
                                disabled={notifying || absentees.length === 0}
                                style={{
                                    fontSize: 14,
                                    padding: '10px 20px',
                                    background: 'linear-gradient(135deg, #7C3AED, #4F46E5)',
                                    border: 'none',
                                    borderRadius: 8,
                                    color: '#fff',
                                    cursor: absentees.length > 0 ? 'pointer' : 'not-allowed',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    fontWeight: 600,
                                    opacity: absentees.length > 0 ? 1 : 0.6
                                }}
                            >
                                {notifying ? (
                                    <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Sending SMS...</>
                                ) : (
                                    <>📲 Send Notifications ({absentees.length})</>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Filters Section */}
                    <div className="card" style={{ marginBottom: 24 }}>
                        <div className="card-body">
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                                <div className="form-group">
                                    <label className="form-label">Select Date</label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        name="date"
                                        value={filters.date}
                                        onChange={handleFilterChange}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Year Filter</label>
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
                                    <label className="form-label">Section Filter</label>
                                    <select
                                        className="form-control"
                                        name="section"
                                        value={filters.section}
                                        onChange={handleFilterChange}
                                    >
                                        <option value="">All Sections</option>
                                        {sections.map(s => (
                                            <option key={s._id} value={s._id}>{s.name} ({s.year})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Notification Results Log - Shows after sending */}
                    {notifyResults && notifyResults.length > 0 && (
                        <div className="card" style={{ marginBottom: 24, borderLeft: '4px solid #10B981' }}>
                            <div className="card-header">
                                <div className="card-title">Transmission Log</div>
                            </div>
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Student Name</th>
                                            <th>Register No</th>
                                            <th>Phone</th>
                                            <th>Status</th>
                                            <th>Message Details</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {notifyResults.map((r, i) => (
                                            <tr key={i} style={{ backgroundColor: r.status === 'sent' ? '#ECFDF5' : '#FFFBEB' }}>
                                                <td style={{ fontWeight: 600 }}>{r.name}</td>
                                                <td>{r.regNo}</td>
                                                <td style={{ fontWeight: 600 }}>
                                                    {r.phone ? `📞 ${r.phone}` : '—'}
                                                </td>
                                                <td>
                                                    <span className={`badge ${r.status === 'sent' ? 'badge-success' : 'badge-warning'}`}>
                                                        {r.status === 'sent' ? '✅ Sent' : '⚠️ Skipped'}
                                                    </span>
                                                </td>
                                                <td style={{ fontSize: 13, color: '#4B5563', maxWidth: 400 }}>
                                                    {r.message || r.reason || '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Absentee List Table */}
                    <div className="card">
                        <div className="card-header">
                            <div className="card-title">📋 Students to Notify</div>
                            <span className="badge badge-danger">
                                {absentees.length} Absentees
                            </span>
                        </div>
                        <div className="table-container">
                            {loading ? (
                                <div style={{ padding: 60, textAlign: 'center' }}>
                                    <div className="spinner spinner-dark" style={{ margin: '0 auto' }} />
                                    <p style={{ marginTop: 16 }}>Loading absent students...</p>
                                </div>
                            ) : absentees.length > 0 ? (
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Student Name</th>
                                            <th>Register Number</th>
                                            <th>Year & Sec</th>
                                            <th>Parent Phone</th>
                                            <th>Periods Absent</th>
                                            <th>View Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {absentees.map((abs, idx) => (
                                            <tr key={idx}>
                                                <td style={{ fontWeight: 600 }}>{abs.studentName}</td>
                                                <td>{abs.registerNumber}</td>
                                                <td>{abs.year} Yr - Sec {abs.sectionName}</td>
                                                <td>
                                                    {abs.phone ? (
                                                        <span style={{ color: '#059669', fontWeight: 600 }}>
                                                            {abs.phone}
                                                        </span>
                                                    ) : (
                                                        <span style={{ color: '#9CA3AF', fontSize: 13 }}>No phone</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                                        {abs.periods.sort((a, b) => a - b).map(p => (
                                                            <span key={p} className="badge badge-info" style={{ fontSize: 11 }}>P{p}</span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`badge ${abs.status === 'Leave' ? 'badge-warning' : 'badge-danger'}`}>
                                                        {abs.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="empty-state" style={{ padding: 60 }}>
                                    <div className="empty-state-icon">✅</div>
                                    <h3>No Absentees to Notify</h3>
                                    <p>Select date/section to view students.</p>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default HODNotifyParents;
