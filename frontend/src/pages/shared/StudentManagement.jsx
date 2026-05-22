import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const StudentManagement = () => {
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    
    // Selected Student for Detail Panel
    const [viewingStudent, setViewingStudent] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);

    // Live search with debounce (300ms)
    useEffect(() => {
        if (!searchQuery.trim()) {
            setResults([]);
            return;
        }

        const delayDebounce = setTimeout(() => {
            performSearch(searchQuery);
        }, 300);

        return () => clearTimeout(delayDebounce);
    }, [searchQuery]);

    const performSearch = async (query) => {
        if (!query.trim()) return;
        setSearchLoading(true);
        try {
            const res = await api.get(`/students/search?q=${encodeURIComponent(query)}`);
            if (res.data.success) {
                setResults(res.data.data);
            } else {
                toast.error('Failed to fetch search results');
            }
        } catch (err) {
            console.error('Search error:', err);
            toast.error(err.response?.data?.message || 'Error searching students');
        } finally {
            setSearchLoading(false);
        }
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        performSearch(searchQuery);
    };

    const handleStudentClick = async (registerNo) => {
        setDetailLoading(true);
        try {
            const res = await api.get(`/students/${registerNo}`);
            if (res.data.success) {
                setViewingStudent(res.data.data);
            } else {
                toast.error('Failed to load student details');
            }
        } catch (err) {
            console.error('Get details error:', err);
            toast.error(err.response?.data?.message || 'Error loading student details');
        } finally {
            setDetailLoading(false);
        }
    };

    const handleBackToSearch = () => {
        setViewingStudent(null);
    };

    // Get initials for profile placeholder
    const getInitials = (name = '') =>
        name.split(' ').filter(Boolean).map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '👤';

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <Topbar title="Student Management" subtitle="Search and explore student profiles across departments" />
                
                {/* Custom styling injected directly for tech glows and theme overrides */}
                <style dangerouslySetInnerHTML={{__html: `
                    /* Scrollbar custom styling */
                    .custom-scrollbar::-webkit-scrollbar {
                        width: 6px;
                        height: 6px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb {
                        background: rgba(139, 92, 246, 0.3);
                        border-radius: 10px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                        background: rgba(139, 92, 246, 0.5);
                    }

                    /* Interactive table hover effects */
                    .tech-table-row {
                        background: transparent;
                        border-bottom: 1px solid var(--glass-border);
                        cursor: pointer;
                        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                    }
                    .tech-table-row:hover {
                        background: rgba(139, 92, 246, 0.08) !important;
                        box-shadow: inset 4px 0 0 var(--accent);
                        transform: scale(1.002);
                    }

                    /* Glow effect for cards */
                    .tech-glow-card {
                        background: var(--glass-bg);
                        backdrop-filter: blur(20px);
                        border: 1px solid var(--glass-border);
                        box-shadow: var(--glass-shadow);
                        transition: all 0.3s ease;
                    }
                    .tech-glow-card:hover {
                        border-color: var(--accent);
                        box-shadow: 0 12px 35px rgba(0, 0, 0, 0.15), 0 0 20px rgba(139, 92, 246, 0.15);
                        transform: translateY(-2px);
                    }
                `}} />

                <div className="page-content" style={{ maxWidth: '1200px', width: '100%', margin: '0 auto', padding: '24px 20px' }}>
                    
                    {/* Header Banner */}
                    <div style={{ marginBottom: '28px' }}>
                        <h2 style={{ fontSize: '26px', fontWeight: 900, color: 'var(--gray-900)', letterSpacing: '-0.5px', fontFamily: 'Syne, sans-serif', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #D946EF 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>🔍 Student Explorer</span>
                        </h2>
                        <p style={{ fontSize: '13px', color: 'var(--gray-600)', fontWeight: 600, marginTop: '4px' }}>
                            Advanced classification & profile discovery engine for Class Advisors & Heads of Department
                        </p>
                    </div>

                    <AnimatePresence mode="wait">
                        {!viewingStudent ? (
                            <motion.div
                                key="search-view"
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                transition={{ duration: 0.3 }}
                            >
                                {/* Search input card */}
                                <div className="tech-glow-card" style={{ padding: '24px', borderRadius: '20px', marginBottom: '24px' }}>
                                    <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                                        <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
                                            <span style={{ position: 'absolute', left: '20px', fontSize: '20px', pointerEvents: 'none', opacity: 0.8 }}>🔍</span>
                                            <input
                                                type="text"
                                                placeholder="Search by Register No or Name..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    borderRadius: '14px',
                                                    padding: '16px 20px 16px 56px',
                                                    fontSize: '16px',
                                                    fontWeight: 600,
                                                    border: '1px solid rgba(139, 92, 246, 0.3)',
                                                    background: 'var(--glass-bg)',
                                                    color: 'var(--gray-900)',
                                                    boxShadow: 'var(--glass-shadow)',
                                                    transition: 'all 0.3s ease',
                                                    outline: 'none'
                                                }}
                                                onFocus={(e) => {
                                                    e.target.style.borderColor = 'rgba(139, 92, 246, 0.8)';
                                                    e.target.style.boxShadow = '0 0 15px rgba(139, 92, 246, 0.25)';
                                                }}
                                                onBlur={(e) => {
                                                    e.target.style.borderColor = 'rgba(139, 92, 246, 0.3)';
                                                    e.target.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
                                                }}
                                            />
                                            {searchQuery && (
                                                <button
                                                    type="button"
                                                    onClick={() => { setSearchQuery(''); setResults([]); }}
                                                    style={{
                                                        position: 'absolute',
                                                        right: '20px',
                                                        background: 'rgba(239, 68, 68, 0.15)',
                                                        color: '#EF4444',
                                                        border: 'none',
                                                        borderRadius: '50%',
                                                        width: '28px',
                                                        height: '28px',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontWeight: 800,
                                                        fontSize: '14px',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    title="Clear search"
                                                >
                                                    ×
                                                </button>
                                            )}
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={searchLoading}
                                            style={{
                                                background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
                                                color: '#FFFFFF',
                                                padding: '16px 28px',
                                                borderRadius: '14px',
                                                border: 'none',
                                                fontWeight: 800,
                                                fontSize: '15px',
                                                cursor: 'pointer',
                                                transition: 'all 0.3s ease',
                                                boxShadow: '0 6px 20px rgba(139, 92, 246, 0.3)',
                                                whiteSpace: 'nowrap'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.target.style.transform = 'translateY(-1px)';
                                                e.target.style.boxShadow = '0 8px 25px rgba(139, 92, 246, 0.45)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.target.style.transform = 'none';
                                                e.target.style.boxShadow = '0 6px 20px rgba(139, 92, 246, 0.3)';
                                            }}
                                        >
                                            {searchLoading ? 'Searching...' : 'Search'}
                                        </button>
                                    </form>
                                </div>

                                {/* Results Grid/Table */}
                                <div className="tech-glow-card" style={{ borderRadius: '20px', overflow: 'hidden' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--glass-border)' }}>
                                        <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--gray-900)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                                            <span style={{ color: '#8B5CF6' }}>📊</span> Search Results
                                        </h3>
                                        {results.length > 0 && (
                                            <span style={{ background: 'rgba(139, 92, 246, 0.1)', color: 'var(--accent)', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '12px', padding: '4px 12px', fontWeight: 800, fontSize: '12px' }}>
                                                {results.length} matched
                                            </span>
                                        )}
                                    </div>

                                    {searchLoading ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', gap: '16px' }}>
                                            <div className="spinner" style={{ width: '38px', height: '38px', border: '4px solid var(--glass-border)', borderTop: '4px solid #8B5CF6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                            <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--gray-600)' }}>Accessing database profiles...</p>
                                        </div>
                                    ) : !searchQuery.trim() ? (
                                        <div style={{ padding: '80px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
                                            <span style={{ fontSize: '48px', animation: 'float-dot 3s ease-in-out infinite' }}>🎓</span>
                                            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--gray-900)', margin: 0 }}>Profile Lookup Engine</h3>
                                            <p style={{ fontSize: '13px', color: 'var(--gray-600)', maxWidth: '420px', margin: 0, fontWeight: 500, lineHeight: 1.5 }}>
                                                Enter a register number or name to search. Clicking a record details academic records, contacts, and placement standing.
                                            </p>
                                        </div>
                                    ) : results.length === 0 ? (
                                        <div style={{ padding: '80px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
                                            <span style={{ fontSize: '48px' }}>🔍</span>
                                            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#EF4444', margin: 0 }}>No student found 🔍</h3>
                                            <p style={{ fontSize: '13px', color: 'var(--gray-600)', maxWidth: '420px', margin: 0, fontWeight: 500, lineHeight: 1.5 }}>
                                                No records matched your search query. Please double-check spelling or register number prefix.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="table-container custom-scrollbar" style={{ overflowX: 'auto' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                <thead>
                                                    <tr style={{ background: 'rgba(139, 92, 246, 0.05)', borderBottom: '1px solid var(--glass-border)' }}>
                                                        <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '11px', fontWeight: 900, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Reg No</th>
                                                        <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '11px', fontWeight: 900, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Name</th>
                                                        <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '11px', fontWeight: 900, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Gender</th>
                                                        <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '11px', fontWeight: 900, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>CGPA %</th>
                                                        <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '11px', fontWeight: 900, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Current Arrears</th>
                                                        <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '11px', fontWeight: 900, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Placement Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {results.map((student) => (
                                                        <tr
                                                            key={student.registerNo}
                                                            onClick={() => handleStudentClick(student.registerNo)}
                                                            className="tech-table-row"
                                                        >
                                                            <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent)' }}>
                                                                {student.registerNo}
                                                            </td>
                                                            <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: 800, color: 'var(--gray-900)' }}>
                                                                {student.name}
                                                            </td>
                                                            <td style={{ padding: '16px 24px', fontSize: '13px', fontWeight: 600, color: 'var(--gray-800)' }}>
                                                                {student.gender}
                                                            </td>
                                                            <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: 800, color: 'var(--gray-900)' }}>
                                                                {student.cgpa ? student.cgpa.toFixed(2) : '0.00'}
                                                            </td>
                                                            <td style={{ padding: '16px 24px' }}>
                                                                <span style={{
                                                                    fontSize: '11px',
                                                                    fontWeight: 800,
                                                                    padding: '4px 10px',
                                                                    borderRadius: '8px',
                                                                    background: student.currentArrears > 0 ? 'rgba(244, 63, 94, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                                                    color: student.currentArrears > 0 ? 'var(--danger)' : 'var(--success)',
                                                                    border: student.currentArrears > 0 ? '1px solid rgba(244, 63, 94, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)'
                                                                }}>
                                                                    {student.currentArrears} Arrear{student.currentArrears !== 1 ? 's' : ''}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '16px 24px' }}>
                                                                <span style={{
                                                                    fontSize: '11px',
                                                                    fontWeight: 800,
                                                                    padding: '4px 10px',
                                                                    borderRadius: '8px',
                                                                    background: student.placementStatus === 'Placed' ? 'rgba(16, 185, 129, 0.1)' : 'var(--glass-bg)',
                                                                    color: student.placementStatus === 'Placed' ? 'var(--success)' : 'var(--gray-600)',
                                                                    border: student.placementStatus === 'Placed' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--glass-border)'
                                                                }}>
                                                                    {student.placementStatus}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="detail-view"
                                initial={{ opacity: 0, x: 15 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -15 }}
                                transition={{ duration: 0.3 }}
                            >
                                {/* Back Button */}
                                <button
                                    onClick={handleBackToSearch}
                                    style={{
                                        background: 'var(--glass-bg)',
                                        color: 'var(--gray-900)',
                                        border: '1px solid rgba(139, 92, 246, 0.3)',
                                        borderRadius: '12px',
                                        padding: '10px 20px',
                                        fontWeight: 800,
                                        fontSize: '13px',
                                        cursor: 'pointer',
                                        marginBottom: '24px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        transition: 'all 0.2s',
                                        boxShadow: 'var(--glass-shadow)'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.background = 'rgba(139, 92, 246, 0.1)';
                                        e.target.style.borderColor = 'rgba(139, 92, 246, 0.6)';
                                        e.target.style.transform = 'translateX(-2px)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.background = 'var(--glass-bg)';
                                        e.target.style.borderColor = 'rgba(139, 92, 246, 0.3)';
                                        e.target.style.transform = 'none';
                                    }}
                                >
                                    ← Back to Search
                                </button>

                                {detailLoading ? (
                                    <div className="tech-glow-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 20px', gap: '16px', borderRadius: '20px' }}>
                                        <div className="spinner" style={{ width: '38px', height: '38px', border: '4px solid var(--glass-border)', borderTop: '4px solid #8B5CF6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                        <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--gray-600)' }}>Retrieving detailed files...</p>
                                    </div>
                                ) : (
                                    <div>
                                        {/* Avatar Summary Banner */}
                                        <div className="tech-glow-card" style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '24px',
                                            padding: '24px',
                                            borderRadius: '20px',
                                            marginBottom: '24px',
                                            flexWrap: 'wrap'
                                        }}>
                                            <div style={{
                                                width: '74px',
                                                height: '74px',
                                                borderRadius: '16px',
                                                background: 'linear-gradient(135deg, #8B5CF6 0%, #D946EF 100%)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '28px',
                                                color: '#FFFFFF',
                                                boxShadow: '0 8px 25px rgba(139, 92, 246, 0.4)',
                                                fontWeight: 900
                                            }}>
                                                {getInitials(viewingStudent.name)}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 900, color: 'var(--gray-900)', letterSpacing: '-0.02em', fontFamily: 'Syne, sans-serif' }}>
                                                    {viewingStudent.name}
                                                </h2>
                                                <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                                    <span style={{ fontFamily: 'monospace', fontSize: '12px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--accent)', padding: '4px 10px', borderRadius: '8px', fontWeight: 700 }}>
                                                        Reg: {viewingStudent.registerNo}
                                                    </span>
                                                    <span style={{ fontSize: '11px', fontWeight: 800, padding: '4px 10px', borderRadius: '8px', background: 'rgba(139, 92, 246, 0.1)', color: 'var(--accent)', border: '1px solid rgba(139, 92, 246, 0.25)' }}>
                                                        Dept: {viewingStudent.department}
                                                    </span>
                                                    <span style={{
                                                        fontSize: '11px',
                                                        fontWeight: 800,
                                                        padding: '4px 10px',
                                                        borderRadius: '8px',
                                                        background: viewingStudent.placementStatus === 'Placed' ? 'rgba(16, 185, 129, 0.1)' : 'var(--glass-bg)',
                                                        color: viewingStudent.placementStatus === 'Placed' ? 'var(--success)' : 'var(--gray-600)',
                                                        border: viewingStudent.placementStatus === 'Placed' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--glass-border)'
                                                    }}>
                                                        {viewingStudent.placementStatus}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 5 Grouped Cards Grid */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
                                            
                                            {/* CARD 1: 🎓 BASIC INFORMATION */}
                                            <div className="tech-glow-card" style={{ padding: '24px', borderRadius: '20px', display: 'flex', flexDirection: 'column' }}>
                                                <h4 style={{ margin: '0 0 18px', fontSize: '14px', color: 'var(--accent)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'Syne, sans-serif' }}>
                                                    <span style={{ fontSize: '16px' }}>🎓</span> Basic Information
                                                </h4>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--glass-border)' }}>
                                                        <span style={{ fontSize: '12px', color: 'var(--gray-500)', fontWeight: 600 }}>Register No</span>
                                                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gray-900)', fontFamily: 'monospace' }}>{viewingStudent.registerNo}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--glass-border)' }}>
                                                        <span style={{ fontSize: '12px', color: 'var(--gray-500)', fontWeight: 600 }}>Name</span>
                                                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gray-900)' }}>{viewingStudent.name}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--glass-border)' }}>
                                                        <span style={{ fontSize: '12px', color: 'var(--gray-500)', fontWeight: 600 }}>Department</span>
                                                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gray-900)' }}>{viewingStudent.department}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--glass-border)' }}>
                                                        <span style={{ fontSize: '12px', color: 'var(--gray-500)', fontWeight: 600 }}>Gender</span>
                                                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gray-900)' }}>{viewingStudent.gender}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--glass-border)' }}>
                                                        <span style={{ fontSize: '12px', color: 'var(--gray-500)', fontWeight: 600 }}>Date of Birth</span>
                                                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gray-900)' }}>{viewingStudent.dob}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <span style={{ fontSize: '12px', color: 'var(--gray-500)', fontWeight: 600 }}>Blood Group</span>
                                                        <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--danger)' }}>🩸 {viewingStudent.bloodGroup}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* CARD 2: 📞 CONTACT DETAILS */}
                                            <div className="tech-glow-card" style={{ padding: '24px', borderRadius: '20px', display: 'flex', flexDirection: 'column' }}>
                                                <h4 style={{ margin: '0 0 18px', fontSize: '14px', color: 'var(--accent)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'Syne, sans-serif' }}>
                                                    <span style={{ fontSize: '16px' }}>📞</span> Contact Details
                                                </h4>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--glass-border)' }}>
                                                        <span style={{ fontSize: '12px', color: 'var(--gray-500)', fontWeight: 600 }}>Mobile</span>
                                                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gray-900)' }}>📞 {viewingStudent.phone}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--glass-border)' }}>
                                                        <span style={{ fontSize: '12px', color: 'var(--gray-500)', fontWeight: 600 }}>Email</span>
                                                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gray-900)', wordBreak: 'break-all' }}>{viewingStudent.email}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--glass-border)' }}>
                                                        <span style={{ fontSize: '12px', color: 'var(--gray-500)', fontWeight: 600 }}>Native</span>
                                                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gray-900)' }}>
                                                            {viewingStudent.nativePlace}{viewingStudent.nativeState ? `, ${viewingStudent.nativeState}` : ''}
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <span style={{ fontSize: '12px', color: 'var(--gray-500)', fontWeight: 600, marginBottom: '6px' }}>Address</span>
                                                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gray-900)', lineHeight: 1.4 }}>
                                                            {viewingStudent.address}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* CARD 3: 📚 ACADEMIC DETAILS */}
                                            <div className="tech-glow-card" style={{ padding: '24px', borderRadius: '20px', display: 'flex', flexDirection: 'column' }}>
                                                <h4 style={{ margin: '0 0 18px', fontSize: '14px', color: 'var(--accent)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'Syne, sans-serif' }}>
                                                    <span style={{ fontSize: '16px' }}>📚</span> Academic Details
                                                </h4>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--glass-border)' }}>
                                                        <span style={{ fontSize: '12px', color: 'var(--gray-500)', fontWeight: 600 }}>10th %</span>
                                                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gray-900)' }}>{viewingStudent.tenthPercentage ? `${viewingStudent.tenthPercentage}%` : '—'}</span>
                                                    </div>
                                                    {viewingStudent.diplomaPercentage > 0 ? (
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--glass-border)' }}>
                                                            <span style={{ fontSize: '12px', color: 'var(--gray-500)', fontWeight: 600 }}>Diploma %</span>
                                                            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gray-900)' }}>{viewingStudent.diplomaPercentage}%</span>
                                                        </div>
                                                    ) : (
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--glass-border)' }}>
                                                            <span style={{ fontSize: '12px', color: 'var(--gray-500)', fontWeight: 600 }}>12th %</span>
                                                            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gray-900)' }}>{viewingStudent.twelfthPercentage ? `${viewingStudent.twelfthPercentage}%` : '—'}</span>
                                                        </div>
                                                    )}
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--glass-border)' }}>
                                                        <span style={{ fontSize: '12px', color: 'var(--gray-500)', fontWeight: 600 }}>CGPA %</span>
                                                        <span style={{ fontSize: '14px', fontWeight: 900, color: 'var(--success)' }}>{viewingStudent.cgpa ? viewingStudent.cgpa.toFixed(2) : '0.00'}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--glass-border)' }}>
                                                        <span style={{ fontSize: '12px', color: 'var(--gray-500)', fontWeight: 600 }}>Current Arrears</span>
                                                        <span style={{ fontSize: '13px', fontWeight: 800, color: viewingStudent.currentArrears > 0 ? 'var(--danger)' : 'var(--success)' }}>{viewingStudent.currentArrears}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--glass-border)' }}>
                                                        <span style={{ fontSize: '12px', color: 'var(--gray-500)', fontWeight: 600 }}>History Arrears</span>
                                                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gray-900)' }}>{viewingStudent.historyArrears}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <span style={{ fontSize: '12px', color: 'var(--gray-500)', fontWeight: 600 }}>Medium</span>
                                                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gray-900)' }}>{viewingStudent.twelfthMedium}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* CARD 4: 🏠 PERSONAL DETAILS */}
                                            <div className="tech-glow-card" style={{ padding: '24px', borderRadius: '20px', display: 'flex', flexDirection: 'column' }}>
                                                <h4 style={{ margin: '0 0 18px', fontSize: '14px', color: 'var(--accent)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'Syne, sans-serif' }}>
                                                    <span style={{ fontSize: '16px' }}>🏠</span> Personal Details
                                                </h4>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--glass-border)' }}>
                                                        <span style={{ fontSize: '12px', color: 'var(--gray-500)', fontWeight: 600 }}>Transport</span>
                                                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gray-900)' }}>{viewingStudent.transport}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--glass-border)' }}>
                                                        <span style={{ fontSize: '12px', color: 'var(--gray-500)', fontWeight: 600 }}>First Grad</span>
                                                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gray-900)' }}>{viewingStudent.firstGraduate}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <span style={{ fontSize: '12px', color: 'var(--gray-500)', fontWeight: 600 }}>College</span>
                                                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gray-900)' }}>{viewingStudent.college}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* CARD 5: 💼 PLACEMENT DETAILS */}
                                            <div className="tech-glow-card" style={{ padding: '24px', borderRadius: '20px', display: 'flex', flexDirection: 'column' }}>
                                                <h4 style={{ margin: '0 0 18px', fontSize: '14px', color: 'var(--accent)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'Syne, sans-serif' }}>
                                                    <span style={{ fontSize: '16px' }}>💼</span> Placement Details
                                                </h4>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--glass-border)' }}>
                                                        <span style={{ fontSize: '12px', color: 'var(--gray-500)', fontWeight: 600 }}>Status</span>
                                                        <span style={{
                                                            fontSize: '12px',
                                                            fontWeight: 800,
                                                            padding: '2px 10px',
                                                            borderRadius: '6px',
                                                            background: viewingStudent.placementStatus === 'Placed' ? 'rgba(16, 185, 129, 0.1)' : 'var(--glass-bg)',
                                                            color: viewingStudent.placementStatus === 'Placed' ? 'var(--success)' : 'var(--gray-600)',
                                                            border: viewingStudent.placementStatus === 'Placed' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--glass-border)'
                                                        }}>{viewingStudent.placementStatus}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--glass-border)' }}>
                                                        <span style={{ fontSize: '12px', color: 'var(--gray-500)', fontWeight: 600 }}>Company</span>
                                                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gray-900)' }}>{viewingStudent.placementCompany}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--glass-border)' }}>
                                                        <span style={{ fontSize: '12px', color: 'var(--gray-500)', fontWeight: 600 }}>Role</span>
                                                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gray-900)' }}>{viewingStudent.placementRole}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <span style={{ fontSize: '12px', color: 'var(--gray-500)', fontWeight: 600 }}>Package</span>
                                                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gray-900)' }}>{viewingStudent.placementPackage}</span>
                                                    </div>
                                                </div>
                                            </div>

                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>

                </div>
            </div>
        </div>
    );
};

export default StudentManagement;
