import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
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
    const [mobileOpen, setMobileOpen] = useState(false);

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
            {mobileOpen && (
                <div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999 }}
                    onClick={() => setMobileOpen(false)}
                />
            )}

            <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
                {/* Logo */}
                <div className="sidebar-logo">
                    <div className="sidebar-logo-inner">
                        <div className="sidebar-logo-icon">M</div>
                        <div className="sidebar-logo-text">
                            <h2>MEC System</h2>
                            <span>Attendance Manager</span>
                        </div>
                    </div>
                </div>

                {/* User Info */}
                <div className="sidebar-user-info">
                    <div className="sidebar-user-inner">
                        <div className="sidebar-user-avatar">
                            {getInitials(user?.name)}
                        </div>
                        <div className="sidebar-user-details">
                            <h4>{user?.name}</h4>
                            <span className={`role-badge ${user?.role}`}>
                                {ROLE_LABELS[user?.role]}
                            </span>
                        </div>
                    </div>
                    {user?.department && (
                        <div style={{ marginTop: 8, fontSize: 11, color: 'rgba(255,255,255,0.5)', paddingLeft: 48 }}>
                            🏢 {user.department.shortName} Dept.
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <nav className="sidebar-nav">
                    {navItems.map((section) => (
                        <div key={section.section}>
                            <div className="nav-section-title">{section.section}</div>
                            {section.items.map((item) => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    end={item.path === '/principal' || item.path === '/hod' || item.path === '/staff'}
                                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                                    onClick={() => setMobileOpen(false)}
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
                    <button className="logout-btn" onClick={handleLogout}>
                        <span>🚪</span>
                        Logout
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
