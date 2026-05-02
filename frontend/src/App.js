import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { UIProvider } from './contexts/UIContext';

import Login from './pages/Login';
import PrincipalDashboard from './pages/principal/PrincipalDashboard';
import HODDashboard from './pages/hod/HODDashboard';
import HODAttendanceReport from './pages/hod/HODAttendanceReport';
import AbsenteeReportPage from './pages/hod/AbsenteeReportPage';
import HODNotifyParents from './pages/hod/HODNotifyParents';
import HODClassPerformance from './pages/hod/HODClassPerformance';
import HODTopStudents from './pages/hod/HODTopStudents';
import ManageTimetable from './pages/hod/ManageTimetable';
import StaffDashboard from './pages/staff/StaffDashboard';
import MarkAttendance from './pages/staff/MarkAttendance';
import AttendanceReports from './pages/shared/AttendanceReports';
import StudentsPage from './pages/shared/StudentsPage';
import ManageUsers from './pages/principal/ManageUsers';
import ManageAcademicData from './pages/shared/ManageAcademicData';
import ProfileSettings from './pages/shared/ProfileSettings';
import StudentPerformance from './pages/staff/StudentPerformance';
import StudentDashboard from './pages/student/StudentDashboard';
import StudentDocuments from './pages/student/StudentDocuments';
import StudentChat from './pages/student/StudentChat';
import AdvisorDocuments from './pages/staff/AdvisorDocuments';
import AdvisorMessages from './pages/staff/AdvisorMessages';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

const DynamicThemeHandler = () => {
    const { user } = useAuth();

    React.useEffect(() => {
        if (user?.role) {
            document.body.setAttribute('data-role', user.role);
        } else {
            document.body.removeAttribute('data-role');
        }
    }, [user]);

    return null;
};

const ProtectedRoute = ({ children, roles }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="loading-fullscreen">
                <div className="spinner spinner-dark" />
                <p>Loading MEC Attendance System...</p>
            </div>
        );
    }

    if (!user) return <Navigate to="/login" replace />;
    if (roles && !roles.includes(user.role)) return <Navigate to="/unauthorized" replace />;
    return children;
};

const RoleRedirect = () => {
    const { user, loading } = useAuth();

    // ⚠️ Wait for auth to finish loading before redirecting
    // This prevents logout-on-refresh
    if (loading) {
        return (
            <div className="loading-fullscreen">
                <div className="spinner spinner-dark" />
                <p>Loading MEC Attendance System...</p>
            </div>
        );
    }

    if (!user) return <Navigate to="/login" replace />;
    if (user.role === 'principal') return <Navigate to="/principal" replace />;
    if (user.role === 'hod') return <Navigate to="/hod" replace />;
    if (user.role === 'staff') return <Navigate to="/staff" replace />;
    if (user.role === 'student') return <Navigate to="/student" replace />;
    return <Navigate to="/login" replace />;
};

function App() {
    return (
        <ThemeProvider>
            <UIProvider>
                <AuthProvider>
                    <DynamicThemeHandler />
                    <BrowserRouter>
                <Toaster
                    position="top-right"
                    toastOptions={{
                        duration: 3500,
                        style: {
                            borderRadius: '10px',
                            fontFamily: 'Inter, sans-serif',
                            fontSize: '14px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                        },
                        success: { iconTheme: { primary: '#10B981', secondary: '#fff' } },
                        error: { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
                    }}
                />
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password/:token" element={<ResetPassword />} />
                    <Route path="/" element={<RoleRedirect />} />

                    {/* Principal Routes */}
                    <Route
                        path="/principal"
                        element={
                            <ProtectedRoute roles={['principal']}>
                                <PrincipalDashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/principal/users"
                        element={
                            <ProtectedRoute roles={['principal']}>
                                <ManageUsers />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/principal/setup"
                        element={
                            <ProtectedRoute roles={['principal']}>
                                <ManageAcademicData />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/principal/reports"
                        element={
                            <ProtectedRoute roles={['principal']}>
                                <AttendanceReports />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/principal/students"
                        element={
                            <ProtectedRoute roles={['principal']}>
                                <StudentsPage />
                            </ProtectedRoute>
                        }
                    />

                    {/* HOD Routes */}
                    <Route
                        path="/hod"
                        element={
                            <ProtectedRoute roles={['hod']}>
                                <HODDashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/hod/setup"
                        element={
                            <ProtectedRoute roles={['hod']}>
                                <ManageAcademicData />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/hod/reports"
                        element={
                            <ProtectedRoute roles={['hod']}>
                                <AttendanceReports />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/hod/absentee-report"
                        element={
                            <ProtectedRoute roles={['hod']}>
                                <AbsenteeReportPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/hod/notify"
                        element={
                            <ProtectedRoute roles={['hod']}>
                                <HODNotifyParents />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/hod/performance"
                        element={
                            <ProtectedRoute roles={['hod']}>
                                <HODClassPerformance />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/hod/top-students"
                        element={
                            <ProtectedRoute roles={['hod']}>
                                <HODTopStudents />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/hod/students"
                        element={
                            <ProtectedRoute roles={['hod']}>
                                <StudentsPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/hod/timetable"
                        element={
                            <ProtectedRoute roles={['hod']}>
                                <ManageTimetable />
                            </ProtectedRoute>
                        }
                    />

                    {/* Staff Routes */}
                    <Route
                        path="/staff"
                        element={
                            <ProtectedRoute roles={['staff']}>
                                <StaffDashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/staff/mark-attendance"
                        element={
                            <ProtectedRoute roles={['staff']}>
                                <MarkAttendance />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/staff/my-records"
                        element={
                            <ProtectedRoute roles={['staff']}>
                                <AttendanceReports />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/staff/performance"
                        element={
                            <ProtectedRoute roles={['staff']}>
                                <StudentPerformance />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/advisor/documents"
                        element={
                            <ProtectedRoute roles={['staff']}>
                                <AdvisorDocuments />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/advisor/messages"
                        element={
                            <ProtectedRoute roles={['staff']}>
                                <AdvisorMessages />
                            </ProtectedRoute>
                        }
                    />

                    {/* Student Routes */}
                    <Route
                        path="/student"
                        element={
                            <ProtectedRoute roles={['student']}>
                                <StudentDashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/student/documents"
                        element={
                            <ProtectedRoute roles={['student']}>
                                <StudentDocuments />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/student/chat"
                        element={
                            <ProtectedRoute roles={['student']}>
                                <StudentChat />
                            </ProtectedRoute>
                        }
                    />

                    {/* Settings - Shared */}
                    <Route
                        path="/settings"
                        element={
                            <ProtectedRoute>
                                <ProfileSettings />
                            </ProtectedRoute>
                        }
                    />

                    {/* Unauthorized */}
                    <Route
                        path="/unauthorized"
                        element={
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ fontSize: '48px' }}>🚫</div>
                                <h2>Access Denied</h2>
                                <p style={{ color: '#6B7280' }}>You don't have permission to access this page.</p>
                                <a href="/" style={{ color: '#1E3A5F', fontWeight: 600 }}>← Go Back</a>
                            </div>
                        }
                    />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
            </AuthProvider>
            </UIProvider>
        </ThemeProvider>
    );
}

export default App;
