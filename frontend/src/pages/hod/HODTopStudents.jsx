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
            setTopStudents(res.data.topStudents || []);
            if (res.data.topStudents?.length === 0) {
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

    return (
        <div className="layout">
            <Sidebar />
            <main className="main-content">
                <Topbar title="Top Achievers" />

                <div className="dashboard-content">
                    {/* Filters Section */}
                    <div className="card filter-card mb-4">
                        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                            <div className="form-group" style={{ flex: 1, minWidth: '150px' }}>
                                <label className="form-label">Period Timeline</label>
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

                            <div className="form-group" style={{ flex: 1, minWidth: '150px' }}>
                                <label className="form-label">Year</label>
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

                            <div className="form-group" style={{ flex: 1, minWidth: '150px' }}>
                                <label className="form-label">Section</label>
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

                            <div className="form-group" style={{ flex: 1, minWidth: '150px' }}>
                                <label className="form-label">&nbsp;</label>
                                <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
                                    {loading ? <span className="spinner" /> : '🔍 Fetch Ranked Students'}
                                </button>
                            </div>
                        </form>
                    </div>

                    <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#1E3A5F', marginBottom: '15px' }}>
                        🏆 Top 10 Performers
                    </h2>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '50px 0' }}>
                            <div className="spinner spinner-dark" style={{ margin: '0 auto 15px' }} />
                            <p style={{ color: '#6B7280' }}>Calculating attendance rankings...</p>
                        </div>
                    ) : topStudents.length === 0 ? (
                        <div className="empty-state" style={{ padding: '60px 0', textAlign: 'center', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                            <div className="empty-icon" style={{ fontSize: '48px', marginBottom: '15px' }}>📊</div>
                            <h3 style={{ fontSize: '18px', color: '#374151', marginBottom: '8px' }}>No Data Available</h3>
                            <p style={{ color: '#6B7280', fontSize: '14px', maxWidth: '300px', margin: '0 auto' }}>
                                We couldn't find any attendance logs matching your selected filters securely.
                            </p>
                        </div>
                    ) : (
                        <div className="ranking-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                            {topStudents.map((student, idx) => {
                                const style = getTrophyColor(idx);
                                const isPodium = idx < 3;
                                return (
                                    <div key={student._id} style={{
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

                                        <div style={{ marginTop: 'auto', paddingTop: '15px', borderTop: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Percentage</div>
                                                <div style={{ fontSize: '24px', fontWeight: 800, color: isPodium ? '#10B981' : '#374151' }}>
                                                    {student.percentage}%
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Classes Attended</div>
                                                <div style={{ fontSize: '16px', fontWeight: 600, color: '#374151' }}>
                                                    {student.presentCount} / {student.totalClasses}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default HODTopStudents;
