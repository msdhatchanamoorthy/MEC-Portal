import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';
import toast from 'react-hot-toast';

const NAV_CONFIG = {
    principal: [
        {
            section: 'Overview', items: [
                { icon: '📊', label: 'Dashboard', path: '/principal' },
            ]
        },
        {
            section: 'Management', items: [
                { icon: '🏛️', label: 'Academic Setup', path: '/principal/setup' },
                { icon: '👥', label: 'Manage Users', path: '/principal/users' },
                { icon: '🎓', label: 'Students', path: '/principal/students' },
            ]
        },
        {
            section: 'Reports', items: [
                { icon: '📋', label: 'Attendance Reports', path: '/principal/reports' },
            ]
        },
    ],
    hod: [
        {
            section: 'Overview', items: [
                { icon: '📊', label: 'Department Dashboard', path: '/hod' },
            ]
        },
        {
            section: 'Attendance', items: [
                { icon: '📋', label: 'Detailed Records', path: '/hod/reports' },
                { icon: '📊', label: 'Absentee Report', path: '/hod/absentee-report' },
                { icon: '📲', label: 'Notify Parents', path: '/hod/notify' },
                { icon: '📈', label: 'Class Performance', path: '/hod/performance' },
                { icon: '🏆', label: 'Top Achievers', path: '/hod/top-students' },
            ]
        },
        {
            section: 'Department', items: [
                { icon: '🎓', label: 'Students', path: '/hod/students' },
                { icon: '⚙️', label: 'Academic Setup', path: '/hod/setup' },
                { icon: '🗓️', label: 'Manage Timetable', path: '/hod/timetable' },
            ]
        },
    ],
    staff: [
        {
            section: 'Overview', items: [
                { icon: '📊', label: 'My Dashboard', path: '/staff' },
            ]
        },
        {
            section: 'Attendance', items: [
                { icon: '✏️', label: 'Mark Attendance', path: '/staff/mark-attendance' },
                { icon: '📋', label: 'My Records', path: '/staff/my-records' },
            ]
        },
        {
            section: 'Academic', items: [
                { icon: '📈', label: 'Student Performance', path: '/staff/performance' },
            ]
        },
    ],
};

const ROLE_LABELS = {
    principal: 'Principal',
    hod: 'Head of Department',
    staff: 'Staff Member',
};

const Sidebar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { sidebarOpen, closeSidebar } = useUI();

    const navItems = NAV_CONFIG[user?.role] || [];

    const handleLogout = () => {
        logout();
        toast.success('Logged out successfully');
        navigate('/login');
    };

    const getInitials = (name = '') =>
        name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

    return (
        <>
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, backdropFilter: 'blur(4px)' }}
                    onClick={closeSidebar}
                />
            )}

            <aside className={`sidebar ${sidebarOpen ? 'mobile-open' : ''}`}>
                {/* Logo */}
                <div className="sidebar-logo">
                    <div className="sidebar-logo-inner" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="sidebar-logo-icon">M</div>
                        <div className="sidebar-logo-text">
                            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary-dark)', letterSpacing: -1, margin: 0 }}>MEC SYS</h2>
                            <span style={{ fontSize: 10, color: 'var(--gray-600)', textTransform: 'uppercase', letterSpacing: 1.5 }}>Premium Edition</span>
                        </div>
                    </div>
                </div>

                {/* User Info */}
                <div className="sidebar-user-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="sidebar-user-avatar">
                            <div style={{ 
                                width: 38, height: 38, borderRadius: 10,
                                background: 'var(--accent-gradient)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 14, fontWeight: 800, color: 'white',
                                position: 'relative', zIndex: 1
                            }}>
                                {getInitials(user?.name)}
                            </div>
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                            <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--primary-dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {user?.name}
                            </h4>
                            <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                {ROLE_LABELS[user?.role]}
                            </span>
                        </div>
                    </div>
                    {user?.department && (
                        <div style={{ marginTop: 10, fontSize: 11, color: 'var(--gray-700)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>🏢</span> {user.department.name}
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <nav className="sidebar-nav">
                    {navItems.map((section, si) => (
                        <div key={section.section}>
                            <div className="nav-section-title">{section.section}</div>
                            {section.items.map((item, ii) => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    end={item.path === '/principal' || item.path === '/hod' || item.path === '/staff'}
                                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                                    onClick={closeSidebar}
                                    style={{ animationDelay: `${(si * 3 + ii) * 60}ms` }}
                                >
                                    <span className="nav-icon">{item.icon}</span>
                                    {item.label}
                                </NavLink>
                            ))}
                        </div>
                    ))}
                </nav>

                {/* Footer */}
                <div className="sidebar-footer">
                    <button className="logout-btn" onClick={handleLogout} style={{ 
                        padding: '10px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 10,
                        fontSize: 13,
                        fontWeight: 700,
                        letterSpacing: 0.5
                    }}>
                        <span>🚪</span>
                        LOGOUT
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
