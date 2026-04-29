import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const HODTopStudents = () => {
    const { user } = useAuth();
    const [sections, setSections] = useState([]);
    const [topStudents, setTopStudents] = useState([]);
    const [groupedData, setGroupedData] = useState([]);
    const [isGrouped, setIsGrouped] = useState(false);
    const [loading, setLoading] = useState(false);

    const [filters, setFilters] = useState({
        period: 'monthly',
        year: '',
        sectionId: '',
    });

    const fetchSections = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (user?.department?._id || user?.department) {
                params.append('departmentId', user.department._id || user.department);
            }
            if (filters.year) params.append('year', filters.year);
            const res = await api.get(`/admin/sections?${params}`);
            setSections(res.data.data || []);
        } catch (err) {
            console.error('Fetch Sections Error:', err);
        }
    }, [user, filters.year]);

    useEffect(() => {
        fetchSections();
    }, [fetchSections]);

    const fetchTopStudents = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('period', filters.period);
            if (filters.year) params.append('year', filters.year);
            if (filters.sectionId) params.append('section', filters.sectionId);

            const res = await api.get(`/hod/top-students?${params}`);
            if (res.data.grouped) {
                setGroupedData(res.data.data || []);
                setIsGrouped(true);
                setTopStudents([]);
            } else {
                setTopStudents(res.data.topStudents || []);
                setIsGrouped(false);
                setGroupedData([]);
            }

            if ((res.data.grouped && res.data.data?.length === 0) || (!res.data.grouped && res.data.topStudents?.length === 0)) {
                toast.success('No records found for selected filters', { icon: 'ℹ️' });
            }
        } catch (err) {
            toast.error('Failed to load top students');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Load initial data
    useEffect(() => {
        fetchTopStudents();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters((prev) => ({
            ...prev,
            [name]: value,
            // Reset section if year changes
            ...(name === 'year' && { sectionId: '' }),
        }));
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchTopStudents();
    };

    const getTrophyColor = (index) => {
        switch (index) {
            case 0: return { bg: 'linear-gradient(135deg, #FFD700 0%, #FDB931 100%)', color: '#855A00', shadow: '0 4px 15px rgba(253, 185, 49, 0.4)' }; // Gold
            case 1: return { bg: 'linear-gradient(135deg, #E0E0E0 0%, #BDBDBD 100%)', color: '#424242', shadow: '0 4px 15px rgba(189, 189, 189, 0.4)' }; // Silver
            case 2: return { bg: 'linear-gradient(135deg, #FFB07C 0%, #CB6D31 100%)', color: '#5D2B0D', shadow: '0 4px 15px rgba(203, 109, 49, 0.4)' }; // Bronze
            default: return { bg: '#F3F4F6', color: '#4B5563', shadow: 'none', border: '1px solid #E5E7EB' };
        }
    };

    const StudentCard = ({ student, idx }) => {
        const style = getTrophyColor(idx);
        const isPodium = idx < 3;
        return (
            <div style={{
                position: 'relative',
                background: '#fff',
                borderRadius: '16px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '15px',
                boxShadow: isPodium ? '0 10px 25px -5px rgba(0,0,0,0.1)' : '0 4px 6px -1px rgba(0,0,0,0.05)',
                border: '1px solid #F3F4F6',
                transition: 'transform 0.2s',
                cursor: 'default'
            }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{
                        width: '45px', height: '45px', borderRadius: '12px',
                        background: style.bg, color: style.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '20px', fontWeight: 'bold',
                        boxShadow: style.shadow,
                        border: style.border
                    }}>
                        #{idx + 1}
                    </div>
                    <div style={{
                        background: '#EFF6FF',
                        color: '#1D4ED8',
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 600,
                    }}>
                        Year {student.year} - {student.section}
                    </div>
                </div>

                <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: '0 0 5px 0' }}>
                        {student.name}
                    </h3>
                    <p style={{ margin: 0, fontSize: '13px', color: '#6B7280', fontFamily: 'monospace' }}>
                        {student.registerNumber || 'No Register No.'}
                    </p>
                </div>

                <div style={{ marginTop: 'auto', paddingTop: '15px', borderTop: '1px solid #F3F4F6', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Attendance Percentage</div>
                        <div style={{ fontSize: '28px', fontWeight: 800, color: isPodium ? '#10B981' : '#374151' }}>
                            {student.percentage}%
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <Topbar title="Top Achievers" />
                <div className="page-content">
                    {/* Premium Glassmorphic Filters */}
                    <div className="card glass" style={{ 
                        borderRadius: 24, 
                        padding: '24px 32px', 
                        marginBottom: 32,
                        border: '1px solid rgba(255,255,255,0.8)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.05)'
                    }}>
                        <form onSubmit={handleSearch} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', alignItems: 'end' }}>
                            <div className="form-group">
                                <label className="form-label" style={{ color: 'var(--gray-800)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    📅 Period Timeline
                                </label>
                                <select
                                    name="period"
                                    className="form-control"
                                    value={filters.period}
                                    onChange={handleFilterChange}
                                >
                                    <option value="weekly">Last 7 Days (Weekly)</option>
                                    <option value="monthly">Last 30 Days (Monthly)</option>
                                    <option value="yearly">Last 365 Days (Yearly)</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label" style={{ color: 'var(--gray-800)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    🎓 Target Year
                                </label>
                                <select
                                    name="year"
                                    className="form-control"
                                    value={filters.year}
                                    onChange={handleFilterChange}
                                >
                                    <option value="">All Years</option>
                                    <option value="1">1st Year</option>
                                    <option value="2">2nd Year</option>
                                    <option value="3">3rd Year</option>
                                    <option value="4">4th Year</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label" style={{ color: 'var(--gray-800)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    🏫 Specific Section
                                </label>
                                <select
                                    name="sectionId"
                                    className="form-control"
                                    value={filters.sectionId}
                                    onChange={handleFilterChange}
                                    disabled={!filters.year}
                                >
                                    <option value="">All Sections</option>
                                    {sections.map(sec => (
                                        <option key={sec._id} value={sec._id}>{sec.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <button type="submit" className="btn btn-primary" disabled={loading} style={{ 
                                    width: '100%', 
                                    height: '46px',
                                    borderRadius: 12,
                                    fontSize: 14,
                                    fontWeight: 700,
                                    background: 'var(--accent-gradient)',
                                    border: 'none',
                                    boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)'
                                }}>
                                    {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : '🔍 Apply Filters'}
                                </button>
                            </div>
                        </form>
                    </div>

                    <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#1E3A5F', marginBottom: '15px' }}>
                        🏆 Department Top Achievers
                    </h2>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '50px 0' }}>
                            <div className="spinner spinner-dark" style={{ margin: '0 auto 15px' }} />
                            <p style={{ color: '#6B7280' }}>Calculating attendance rankings...</p>
                        </div>
                    ) : (topStudents.length === 0 && groupedData.length === 0) ? (
                        <div className="empty-state" style={{ padding: '60px 0', textAlign: 'center', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                            <div className="empty-icon" style={{ fontSize: '48px', marginBottom: '15px' }}>📊</div>
                            <h3 style={{ fontSize: '18px', color: '#374151', marginBottom: '8px' }}>No Data Available</h3>
                            <p style={{ color: '#6B7280', fontSize: '14px', maxWidth: '300px', margin: '0 auto' }}>
                                We couldn't find any attendance logs matching your selected filters securely.
                            </p>
                        </div>
                    ) : isGrouped ? (
                        <div className="grouped-ranking">
                            {groupedData.map((group) => (
                                <div key={group._id} style={{ marginBottom: '40px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px', borderBottom: '2px solid #EFF6FF', paddingBottom: '8px' }}>
                                        <div style={{ background: '#1D4ED8', color: '#fff', padding: '4px 12px', borderRadius: '8px', fontWeight: 700 }}>
                                            {group.year}{['st', 'nd', 'rd', 'th'][group.year - 1]} Yr
                                        </div>
                                        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1E3A5F', margin: 0 }}>
                                            Section {group.sectionName} — Top Performers
                                        </h3>
                                    </div>
                                    <div className="ranking-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                                        {group.topStudents.map((student, idx) => (
                                            <StudentCard key={student._id} student={student} idx={idx} />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="ranking-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                            {topStudents.map((student, idx) => (
                                <StudentCard key={student._id} student={student} idx={idx} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HODTopStudents;
