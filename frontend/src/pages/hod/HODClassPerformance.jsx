import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const HODClassPerformance = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('year'); // 'year' or 'section'
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedYear, setSelectedYear] = useState('1');
    const [yearData, setYearData] = useState([]);
    const [sectionData, setSectionData] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchYearWise = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get(`/hod/attendance/year-wise?date=${date}`);
            setYearData(res.data.data || []);
        } catch (err) {
            toast.error('Failed to load year-wise attendance');
        } finally {
            setLoading(false);
        }
    }, [date]);

    const fetchSectionWise = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get(`/hod/attendance/section-wise?date=${date}&year=${selectedYear}`);
            setSectionData(res.data.data || []);
        } catch (err) {
            toast.error('Failed to load section-wise attendance');
        } finally {
            setLoading(false);
        }
    }, [date, selectedYear]);

    useEffect(() => {
        if (activeTab === 'year') {
            fetchYearWise();
        } else {
            fetchSectionWise();
        }
    }, [activeTab, fetchYearWise, fetchSectionWise]);

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <Topbar title="Class Performance" subtitle="Year and Section wise attendance tracking" />
                <div className="page-content">

                    <div className="page-header">
                        <div className="page-header-left">
                            <h2>📊 Performance Analytics</h2>
                            <p>Monitor attendance trends across your department</p>
                        </div>
                    </div>

                    {/* Filter Bar */}
                    <div className="card" style={{ marginBottom: 24 }}>
                        <div className="card-body">
                            <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label">Select Date</label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                    />
                                </div>

                                <div className="tabs" style={{ display: 'flex', gap: 8, background: '#F3F4F6', padding: 4, borderRadius: 8 }}>
                                    <button
                                        className={`tab-btn ${activeTab === 'year' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('year')}
                                        style={activeTab === 'year' ? styles.activeTab : styles.inactiveTab}
                                    >Year-wise View</button>
                                    <button
                                        className={`tab-btn ${activeTab === 'section' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('section')}
                                        style={activeTab === 'section' ? styles.activeTab : styles.inactiveTab}
                                    >Section-wise View</button>
                                </div>

                                {activeTab === 'section' && (
                                    <div className="form-group" style={{ margin: 0, minWidth: 150 }}>
                                        <label className="form-label">Select Year</label>
                                        <select
                                            className="form-control"
                                            value={selectedYear}
                                            onChange={(e) => setSelectedYear(e.target.value)}
                                        >
                                            {[1, 2, 3, 4].map(y => (
                                                <option key={y} value={y}>{y}{['st', 'nd', 'rd', 'th'][y - 1]} Year</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Content Section */}
                    <div className="card">
                        <div className="card-header">
                            <div className="card-title">
                                {activeTab === 'year' ? '📅 Department Attendance by Year' : `📚 Section-wise Status - ${selectedYear}${['st', 'nd', 'rd', 'th'][selectedYear - 1]} Year`}
                            </div>
                        </div>
                        <div className="table-container">
                            {loading ? (
                                <div style={{ padding: 60, textAlign: 'center' }}>
                                    <div className="spinner spinner-dark" style={{ margin: '0 auto' }} />
                                    <p style={{ marginTop: 16 }}>Analyzing attendance data...</p>
                                </div>
                            ) : activeTab === 'year' ? (
                                yearData.length > 0 ? (
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Year</th>
                                                <th style={{ textAlign: 'center' }}>Total Students (Avg)</th>
                                                <th style={{ textAlign: 'center' }}>Avg Attendance %</th>
                                                <th style={{ textAlign: 'center' }}>Total Absent (Sum)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {yearData.map((row) => (
                                                <tr key={row.year}>
                                                    <td style={{ fontWeight: 600 }}>{row.year}{['st', 'nd', 'rd', 'th'][row.year - 1]} Year</td>
                                                    <td style={{ textAlign: 'center' }}>{row.totalStudents}</td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
                                                            <div className="percentage-bar" style={{ width: 100 }}>
                                                                <div
                                                                    className={`percentage-fill ${row.percentage >= 75 ? 'high' : row.percentage >= 50 ? 'medium' : 'low'}`}
                                                                    style={{ width: `${row.percentage}%` }}
                                                                />
                                                            </div>
                                                            <span style={{ fontWeight: 700 }}>{row.percentage}%</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ textAlign: 'center', color: 'var(--danger)', fontWeight: 600 }}>
                                                        {row.totalAbsent}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="empty-state" style={{ padding: 60 }}>
                                        <h3>No Records Found</h3>
                                        <p>No attendance has been marked for this department on {new Date(date).toLocaleDateString()}.</p>
                                    </div>
                                )
                            ) : (
                                sectionData.length > 0 ? (
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Section</th>
                                                <th style={{ textAlign: 'center' }}>Total Students</th>
                                                <th style={{ textAlign: 'center' }}>Present (Avg)</th>
                                                <th style={{ textAlign: 'center' }}>Absent (Avg)</th>
                                                <th style={{ textAlign: 'center' }}>Attendance %</th>
                                                <th style={{ textAlign: 'center' }}>Submission</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sectionData.map((row) => (
                                                <tr key={row.sectionName}>
                                                    <td style={{ fontWeight: 600 }}>Section {row.sectionName}</td>
                                                    <td style={{ textAlign: 'center' }}>{row.totalStudents}</td>
                                                    <td style={{ textAlign: 'center', color: 'var(--success)', fontWeight: 600 }}>{row.present}</td>
                                                    <td style={{ textAlign: 'center', color: 'var(--danger)', fontWeight: 600 }}>{row.absent}</td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <span className={`badge ${row.percentage >= 75 ? 'badge-success' : row.percentage >= 50 ? 'badge-warning' : 'badge-danger'}`}>
                                                            {row.percentage}%
                                                        </span>
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <span className={`badge ${row.isSubmitted ? 'badge-success' : 'badge-warning'}`}>
                                                            {row.submissionStatus}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="empty-state" style={{ padding: 60 }}>
                                        <h3>No Section Data</h3>
                                        <p>No attendance records found for {selectedYear} Year on this date.</p>
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const styles = {
    activeTab: {
        background: '#fff',
        color: 'var(--primary)',
        padding: '8px 16px',
        border: 'none',
        borderRadius: 6,
        fontWeight: 600,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        cursor: 'pointer'
    },
    inactiveTab: {
        background: 'transparent',
        color: '#6B7280',
        padding: '8px 16px',
        border: 'none',
        borderRadius: 6,
        fontWeight: 500,
        cursor: 'pointer'
    }
};

export default HODClassPerformance;
