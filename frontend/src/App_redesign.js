import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import MainLayout from './components/layout/MainLayout';

// Redesigned Pages
import LandingPage from './pages/LandingPage';
import ModernLogin from './pages/ModernLogin';
import ModernStaffDashboard from './pages/staff/ModernStaffDashboard';
import ModernHODDashboard from './pages/hod/ModernHODDashboard';

// Existing Pages (to be updated later or used as is with layout)
import PrincipalDashboard from './pages/principal/PrincipalDashboard';
import ManageUsers from './pages/principal/ManageUsers';
import AttendanceReports from './pages/shared/AttendanceReports';
import StudentsPage from './pages/shared/StudentsPage';
import MarkAttendance from './pages/staff/MarkAttendance';

const ProtectedRoute = ({ children, roles }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4" />
                <p className="text-muted-foreground font-medium animate-pulse">Loading MEC System...</p>
            </div>
        );
    }

    if (!user) return <Navigate to="/login" replace />;
    if (roles && !roles.includes(user.role)) return <Navigate to="/unauthorized" replace />;
    return children;
};

const RoleRedirect = () => {
    const { user, loading } = useAuth();
    if (loading) return null;
    if (!user) return <Navigate to="/home" replace />;
    if (user.role === 'principal') return <Navigate to="/principal" replace />;
    if (user.role === 'hod') return <Navigate to="/hod" replace />;
    if (user.role === 'staff') return <Navigate to="/staff" replace />;
    return <Navigate to="/login" replace />;
};

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Toaster position="top-right" richColors closeButton />
                <Routes>
                    {/* Public Routes */}
                    <Route path="/home" element={<LandingPage />} />
                    <Route path="/login" element={<ModernLogin />} />
                    <Route path="/" element={<RoleRedirect />} />

                    {/* Staff Routes */}
                    <Route path="/staff" element={<ProtectedRoute roles={['staff']}><MainLayout role="staff" /></ProtectedRoute>}>
                        <Route index element={<Navigate to="dashboard" replace />} />
                        <Route path="dashboard" element={<ModernStaffDashboard />} />
                        <Route path="mark-attendance" element={<MarkAttendance />} />
                        <Route path="reports" element={<AttendanceReports />} />
                    </Route>

                    {/* HOD Routes */}
                    <Route path="/hod" element={<ProtectedRoute roles={['hod']}><MainLayout role="hod" /></ProtectedRoute>}>
                        <Route index element={<Navigate to="dashboard" replace />} />
                        <Route path="dashboard" element={<ModernHODDashboard />} />
                        <Route path="reports" element={<AttendanceReports />} />
                        <Route path="students" element={<StudentsPage />} />
                    </Route>

                    {/* Principal Routes */}
                    <Route path="/principal" element={<ProtectedRoute roles={['principal']}><MainLayout role="principal" /></ProtectedRoute>}>
                        <Route index element={<Navigate to="dashboard" replace />} />
                        <Route path="dashboard" element={<PrincipalDashboard />} />
                        <Route path="users" element={<ManageUsers />} />
                        <Route path="reports" element={<AttendanceReports />} />
                    </Route>

                    {/* Unauthorized & 404 */}
                    <Route path="/unauthorized" element={
                        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
                            <h1 className="text-9xl font-black text-white/5 absolute -z-10">403</h1>
                            <div className="w-20 h-20 rounded-3xl bg-red-500/10 flex items-center justify-center mb-6">
                                <span className="text-4xl">🚫</span>
                            </div>
                            <h2 className="text-3xl font-bold mb-2">Access Denied</h2>
                            <p className="text-muted-foreground mb-8 max-w-xs">You don't have the required permissions to view this secure module.</p>
                            <button onClick={() => window.location.href = '/'} className="bg-white text-black px-8 py-3 rounded-xl font-bold hover:bg-gray-100 transition-all">
                                Return Home
                            </button>
                        </div>
                    } />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
