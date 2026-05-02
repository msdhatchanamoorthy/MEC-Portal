import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

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
    student: [
        {
            section: 'Overview', items: [
                { icon: '📊', label: 'Dashboard', path: '/student' },
            ]
        },
        {
            section: 'Documents', items: [
                { icon: '📤', label: 'My Uploads', path: '/student/documents' },
            ]
        },
        {
            section: 'Support', items: [
                { icon: '💬', label: 'Message Advisor', path: '/student/chat' },
            ]
        },
    ],
};

const ROLE_LABELS = {
    principal: 'Principal',
    hod: 'Head of Department',
    staff: 'Class Advisor',
    student: 'Student',
};


const Sidebar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { sidebarOpen, closeSidebar } = useUI();

    let navItems = NAV_CONFIG[user?.role] || [];

    // If CA, inject Student Management
    if (user?.role === 'staff' && user?.email?.includes('.ca@')) {
        const advisorItems = [
            {
                section: 'Student Management', items: [
                    { icon: '📁', label: 'Student Documents', path: '/advisor/documents' },
                    { icon: '💬', label: 'Student Messages', path: '/advisor/messages' },
                ]
            }
        ];
        // Insert after Overview (first section)
        navItems = [navItems[0], ...advisorItems, ...navItems.slice(1)];
    }

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
            <AnimatePresence>
                {sidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, backdropFilter: 'blur(4px)' }}
                        onClick={closeSidebar}
                    />
                )}
            </AnimatePresence>

            <motion.aside 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className={`sidebar ${sidebarOpen ? 'mobile-open' : ''}`}
            >
                {/* Logo */}
                <div className="sidebar-logo">
                    <motion.div 
                        whileHover={{ scale: 1.05 }}
                        className="sidebar-logo-inner" style={{ display: 'flex', alignItems: 'center', gap: 12 }}
                    >
                        <motion.div 
                            animate={{ rotate: [0, 10, -10, 0] }}
                            transition={{ repeat: Infinity, duration: 5 }}
                            className="sidebar-logo-icon"
                        >M</motion.div>
                        <div className="sidebar-logo-text">
                            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary-dark)', letterSpacing: -1, margin: 0 }}>MEC SYS</h2>
                            <span style={{ fontSize: 10, color: 'var(--gray-600)', textTransform: 'uppercase', letterSpacing: 1.5 }}>Premium Edition</span>
                        </div>
                    </motion.div>
                </div>

                {/* User Info */}
                <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="sidebar-user-info"
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="sidebar-user-avatar">
                            <motion.div 
                                whileHover={{ rotate: 15 }}
                                style={{ 
                                    width: 38, height: 38, borderRadius: 10,
                                    background: 'var(--accent-gradient)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 14, fontWeight: 800, color: 'white',
                                    position: 'relative', zIndex: 1
                                }}>
                                {getInitials(user?.name)}
                            </motion.div>
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                            <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--primary-dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {user?.name}
                            </h4>
                            <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                {user?.role === 'staff' 
                                    ? (user?.email?.includes('.ca@') ? 'Class Advisor' : 'Staff Member')
                                    : ROLE_LABELS[user?.role]}
                            </span>
                        </div>
                    </div>
                    {user?.department && (
                        <div style={{ marginTop: 10, fontSize: 11, color: 'var(--gray-700)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>🏢</span> {user.department.name}
                        </div>
                    )}
                </motion.div>

                {/* Navigation */}
                <nav className="sidebar-nav">
                    {navItems.map((section, si) => (
                        <div key={section.section}>
                            <motion.div 
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: si * 0.1 }}
                                className="nav-section-title"
                            >{section.section}</motion.div>
                            {section.items.map((item, ii) => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    end={item.path === '/principal' || item.path === '/hod' || item.path === '/staff'}
                                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                                    onClick={closeSidebar}
                                >
                                    <motion.div 
                                        className="nav-item-inner"
                                        style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}
                                        whileHover={{ x: 5 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <span className="nav-icon">{item.icon}</span>
                                        {item.label}
                                    </motion.div>
                                </NavLink>
                            ))}
                        </div>
                    ))}
                </nav>

                {/* Footer */}
                <div className="sidebar-footer">
                    <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="logout-btn" onClick={handleLogout} style={{ 
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
                    </motion.button>
                </div>
            </motion.aside>
        </>
    );
};

export default Sidebar;
