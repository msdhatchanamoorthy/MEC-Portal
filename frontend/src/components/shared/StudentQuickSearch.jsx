import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const StudentQuickSearch = () => {
    const [search, setSearch] = useState('');
    const [results, setResults] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [stats, setStats] = useState(null);
    const [reasons, setReasons] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const searchRef = useRef(null);

    // Handle outside click to close results
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowResults(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Search students as user types
    useEffect(() => {
        const fetchStudents = async () => {
            if (search.length < 2) {
                setResults([]);
                return;
            }
            try {
                const res = await api.get(`/students?search=${search}`);
                setResults(res.data.data || []);
                setShowResults(true);
            } catch (err) {
                console.error('Search error:', err);
            }
        };

        const timer = setTimeout(fetchStudents, 300);
        return () => clearTimeout(timer);
    }, [search]);

    const handleSelect = async (student) => {
        setSearch(student.name);
        setShowResults(false);
        fetchStats(student._id);
    };

    const fetchStats = async (studentId) => {
        setLoading(true);
        try {
            const res = await api.get(`/attendance/student/${studentId}`);
            if (res.data.success) {
                setStats(res.data.stats);
                setReasons(res.data.reasons || []);
                // Update selectedStudent with full details from response (like residency)
                if (res.data.student) {
                    setSelectedStudent(res.data.student);
                }
            }
        } catch (err) {
            toast.error('Failed to load student statistics');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card glass" style={{ marginBottom: 20, position: 'relative', overflow: 'visible', border: '1px solid rgba(255,255,255,0.8)', boxShadow: 'var(--glass-shadow)', zIndex: 10 }}>
            <div className="card-header" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', padding: '16px 24px' }}>
                <div className="card-title" style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary-dark)' }}>
                    🔍 QUICK STUDENT LOOKUP
                </div>
            </div>
            <div className="card-body" style={{ padding: '20px 24px' }}>
                <div ref={searchRef} style={{ position: 'relative' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Enter Name or Register Number..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onFocus={() => search.length >= 2 && setShowResults(true)}
                            style={{ 
                                borderRadius: 12, 
                                padding: '12px 18px', 
                                background: 'var(--gray-50)', 
                                border: '1px solid var(--gray-200)',
                                fontSize: 14
                            }}
                        />
                    </div>

                    {showResults && results.length > 0 && (
                        <div className="search-dropdown">
                            {results.map((s) => (
                                <div key={s._id} className="search-result-item" onClick={() => handleSelect(s)}>
                                    <div style={{ fontWeight: 700, color: 'var(--primary-dark)', fontSize: 14 }}>{s.name}</div>
                                    <div style={{ fontSize: 11, color: 'var(--gray-700)', fontWeight: 600, marginTop: 2 }}>
                                        {s.registerNumber} • {s.year}{['st', 'nd', 'rd', 'th'][s.year - 1]} Yr • Sec {s.section?.name}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {loading ? (
                    <div style={{ padding: 20, textAlign: 'center' }}>
                        <div className="spinner spinner-dark" />
                    </div>
                ) : selectedStudent && stats ? (
                    <div style={{ marginTop: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, background: 'var(--gray-50)', padding: '10px 15px', borderRadius: 12, border: '1px solid var(--gray-100)' }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-600)' }}>RESIDENCY TYPE:</span>
                            <span style={{ 
                                fontSize: 12, 
                                fontWeight: 800, 
                                color: selectedStudent.residency === 'Hosteller' ? '#A78BFA' : '#38BDF8',
                                background: 'var(--gray-100)',
                                padding: '4px 10px',
                                borderRadius: 20,
                                border: `1px solid var(--gray-200)`
                            }}>
                                🏠 {selectedStudent.residency?.toUpperCase()}
                            </span>
                        </div>

                        <div className="student-stats-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                             <div className="stat-card-mini" style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)' }}>
                                <div className="mini-label">WEEKLY</div>
                                <div className="mini-value" style={{ color: stats.week.percentage >= 75 ? 'var(--success)' : 'var(--danger)' }}>
                                    {stats.week.percentage}%
                                </div>
                                <div className="mini-footer" style={{ color: 'var(--gray-500)', fontWeight: 600 }}>Weekly Absents</div>
                            </div>
                             <div className="stat-card-mini" style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)' }}>
                                <div className="mini-label">MONTHLY</div>
                                <div className="mini-value" style={{ color: stats.month.percentage >= 75 ? 'var(--success)' : 'var(--danger)' }}>
                                    {stats.month.percentage}%
                                </div>
                                <div className="mini-footer" style={{ color: 'var(--gray-500)', fontWeight: 600 }}>Monthly Absents</div>
                            </div>
                             <div className="stat-card-mini" style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)' }}>
                                <div className="mini-label">YEARLY (ABSENT)</div>
                                <div className="mini-value" style={{ color: stats.year.absentCount > 0 ? 'var(--danger)' : 'var(--success)' }}>
                                    {stats.year.absentCount}
                                </div>
                                <div className="mini-footer" style={{ color: 'var(--gray-500)', fontWeight: 600 }}>Yearly Absents</div>
                            </div>
                             <div className="stat-card-mini" style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)' }}>
                                <div className="mini-label">TOTAL LEAVES</div>
                                <div className="mini-value" style={{ color: 'var(--info)' }}>
                                    {stats.total.leaveCount}
                                </div>
                                <div className="mini-footer" style={{ color: 'var(--gray-500)', fontWeight: 600 }}>Duty Leave / OD</div>
                            </div>
                        </div>

                        {reasons && reasons.length > 0 && (
                            <div style={{ marginTop: 20, paddingTop: 15, borderTop: '1px dashed var(--gray-200)' }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-500)', marginBottom: 10, letterSpacing: 0.5 }}>RECENT REMARKS / LEAVE REASONS</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {reasons.map((r, i) => (
                                        <div key={i} style={{ background: 'var(--gray-50)', padding: '10px 12px', borderRadius: 10, fontSize: 12, border: '1px solid var(--gray-100)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                <span style={{ fontWeight: 700, color: 'var(--gray-800)' }}>{new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                                                 <span style={{ 
                                                    fontWeight: 800, 
                                                    fontSize: 10, 
                                                    color: r.status === 'Absent' ? 'var(--danger)' : 'var(--info)',
                                                    background: 'var(--gray-100)',
                                                    padding: '2px 6px',
                                                    borderRadius: 4,
                                                    border: '1px solid var(--gray-200)'
                                                }}>{r.status}</span>
                                            </div>
                                            <div style={{ color: 'var(--gray-500)', fontStyle: 'italic' }}>"{r.reason}"</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : search.length > 0 && results.length === 0 && showResults && (
                    <p style={{ marginTop: 12, fontSize: 12, color: 'var(--gray-400)', textAlign: 'center', fontStyle: 'italic' }}>No student found with that identifier.</p>
                )}
            </div>

            <style>{`
                 .search-dropdown {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    background: var(--gray-50);
                    border: 1px solid var(--gray-200);
                    border-radius: 12px;
                    box-shadow: var(--glass-shadow);
                    z-index: 9999;
                    margin-top: 10px;
                    max-height: 280px;
                    overflow-y: auto;
                    padding: 8px;
                }
                .search-result-item {
                    padding: 10px 14px;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .search-result-item:hover {
                    background: var(--gray-100);
                    transform: translateX(4px);
                }
                .stat-card-mini {
                    padding: 16px;
                    border-radius: 14px;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    transition: var(--transition);
                }
                .stat-card-mini:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                }
                .mini-label { font-size: 10px; font-weight: 800; color: var(--gray-400); text-transform: uppercase; letter-spacing: 1px; }
                .mini-value { font-size: 24px; font-weight: 800; margin: 2px 0; font-family: 'Syne', sans-serif; }
                .mini-footer { font-size: 11px; color: var(--gray-500); font-weight: 500; }
            `}</style>
        </div>
    );
};

export default StudentQuickSearch;
