import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import api, { getFileUrl } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const AbsenteeReportPage = () => {
    const { user } = useAuth();
    const [absentees, setAbsentees] = useState([]);
    const [summary, setSummary] = useState({ total: 0, y1: 0, y2: 0, y3: 0, y4: 0 });
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

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
        try {
            const params = new URLSearchParams();
            params.append('date', filters.date);
            if (filters.year) params.append('year', filters.year);
            if (filters.section) params.append('section', filters.section);

            const res = await api.get(`/hod/absentee-report?${params}`);
            setAbsentees(res.data.data || []);
            setSummary(res.data.summary || { total: 0, y1: 0, y2: 0, y3: 0, y4: 0 });
        } catch (err) {
            toast.error('Failed to load absentee report');
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

    const filteredData = absentees.filter(item =>
        item.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.registerNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <Topbar title="Department Absentee Report" subtitle="Complete overview of student absenteeism" />
                <div className="page-content">

                    <div className="page-header">
                        <div className="page-header-left">
                            <h2 style={{ fontSize: 24, fontWeight: 900, color: 'var(--primary-dark)', letterSpacing: -0.5 }}>📊 Department Absentee Report</h2>
                            <p style={{ fontSize: 13, color: 'var(--gray-600)', fontWeight: 600 }}>Real-time monitoring of student absences and leave applications</p>
                        </div>
                    </div>

                    {/* Department Quick Stats */}
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(5, 1fr)', 
                        gap: 20, 
                        marginBottom: 24 
                    }}>
                        <div className="stat-card" style={{ padding: '20px', borderRadius: 20, background: 'var(--accent-gradient)', color: 'white', border: 'none' }}>
                            <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.8, textTransform: 'uppercase', letterSpacing: 1 }}>Total Absentees</div>
                            <div style={{ fontSize: 28, fontWeight: 900, marginTop: 4 }}>{summary.total}</div>
                            <div style={{ fontSize: 10, marginTop: 4, opacity: 0.7 }}>Across all sections</div>
                        </div>
                        {[1, 2, 3, 4].map(y => (
                            <div key={y} className="stat-card" style={{ padding: '20px', borderRadius: 20, background: 'white', border: '1px solid var(--gray-200)' }}>
                                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: 1 }}>{y}{['st', 'nd', 'rd', 'th'][y - 1]} Year</div>
                                <div style={{ fontSize: 24, fontWeight: 900, marginTop: 4, color: 'var(--primary-dark)' }}>{summary[`y${y}`]}</div>
                                <div style={{ fontSize: 10, marginTop: 4, color: 'var(--gray-400)' }}>Students Absent</div>
                            </div>
                        ))}
                    </div>

                    {/* Filters & Search */}
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
                                <div className="form-group">
                                    <label className="form-label">Search Student</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Name or Reg No..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Absentee Table */}
                    <div className="card">
                        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div className="card-title">📋 Absent & Leave List</div>
                            <span className="badge badge-danger" style={{ padding: '6px 14px' }}>
                                Found {filteredData.length} records
                            </span>
                        </div>

                        <div className="table-container">
                            {loading ? (
                                <div style={{ padding: 60, textAlign: 'center' }}>
                                    <div className="spinner spinner-dark" style={{ margin: '0 auto' }} />
                                    <p style={{ marginTop: 16 }}>Generating department report...</p>
                                </div>
                            ) : filteredData.length > 0 ? (
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Register Number</th>
                                            <th>Student Name</th>
                                            <th>Year</th>
                                            <th>Section</th>
                                            <th>Period(s) Absent</th>
                                            <th>Marked By (Staff)</th>
                                            <th>Reason & Proof</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredData.map((abs, idx) => {
                                            const genderClass = abs.gender === 'Male' ? 'row-boy' : abs.gender === 'Female' ? 'row-girl' : '';
                                            return (
                                                <tr key={idx} className={genderClass} style={{ backgroundColor: abs.status === 'Leave' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(239, 68, 68, 0.08)' }}>
                                                    <td style={{ fontWeight: 600 }}>{abs.registerNumber}</td>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            {abs.studentName}
                                                            {abs.residency === 'Hosteller' ? (
                                                                <span title="Hosteller">🏨</span>
                                                            ) : (
                                                                <span title="Day Scholar">🏠</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td>{abs.year}</td>
                                                <td>{abs.sectionName}</td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                                        {abs.periods.sort((a, b) => a - b).map(p => (
                                                            <span key={p} className="badge badge-info" style={{ fontSize: 11 }}>P{p}</span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td style={{ fontSize: 13, color: 'var(--gray-300)' }}>
                                                    {abs.staffNames.join(', ')}
                                                </td>
                                                <td style={{ fontSize: 12 }}>
                                                    {abs.reasons && abs.reasons.filter(r => r).map((r, i) => (
                                                        <div key={i} style={{ marginBottom: 4 }}>💬 {r}</div>
                                                    ))}
                                                    {abs.proofUrls && abs.proofUrls.filter(u => u).map((u, i) => (
                                                        <a 
                                                            key={i}
                                                            href={getFileUrl(u)} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="badge badge-purple"
                                                            style={{ textDecoration: 'none', cursor: 'pointer', display: 'inline-block', marginBottom: 4 }}
                                                        >
                                                            📎 View Proof {abs.proofUrls.length > 1 ? i+1 : ''}
                                                        </a>
                                                    ))}
                                                    {(!abs.reasons || abs.reasons.every(r => !r)) && (!abs.proofUrls || abs.proofUrls.every(u => !u)) && <span style={{ color: 'var(--gray-400)' }}>—</span>}
                                                </td>
                                                <td>
                                                    <span className={`badge ${abs.status === 'Leave' ? 'badge-warning' : 'badge-danger'}`}>
                                                        {abs.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                </table>
                            ) : (
                                <div className="empty-state" style={{ padding: 60 }}>
                                    <div className="empty-state-icon">✅</div>
                                    <h3>No Absentees Found</h3>
                                    <p>Adjust your filters or celebrate 100% attendance!</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AbsenteeReportPage;
