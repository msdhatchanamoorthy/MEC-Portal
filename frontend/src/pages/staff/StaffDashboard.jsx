import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import StudentQuickSearch from '../../components/shared/StudentQuickSearch';
import * as XLSX from 'xlsx';
import NoticeBoard from '../../components/shared/NoticeBoard';

const StaffDashboard = () => {
    const { user } = useAuth();
    const [myRecords, setMyRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [reporting, setReporting] = useState(false);
    const [importing, setImporting] = useState(false);
    const [sections, setSections] = useState([]);
    const [timetable, setTimetable] = useState([]);
    const fileRef = useRef(null);
    const isFetching = useRef(false);

    const fetchMyRecords = useCallback(async () => {
        if (isFetching.current) return;
        isFetching.current = true;
        try {
            const [attRes, ttRes] = await Promise.all([
                api.get('/attendance?'),
                api.get('/timetable/my-timetable')
            ]);
            setMyRecords(attRes.data.data || []);
            setTimetable(ttRes.data.data || []);
        } catch (err) {
            console.error('Staff Records Fetch Error:', err);
            if (err.response?.status !== 401) {
                toast.error('Failed to load records');
            }
        } finally {
            setLoading(false);
            isFetching.current = false;
        }
    }, []);

    const fetchSections = useCallback(async () => {
        try {
            const res = await api.get(`/admin/sections?departmentId=${user.department?._id || user.department}`);
            setSections(res.data.data || []);
        } catch (err) { }
    }, [user.department]);

    useEffect(() => {
        fetchMyRecords();
        if (user) fetchSections();
    }, [fetchMyRecords, fetchSections, user]);

    const handleReportDuty = async () => {
        const staffName = prompt('Enter your name for Duty Report:', user.name);
        if (!staffName) return;

        setReporting(true);
        try {
            await api.post('/duty-reports/send', { staffName });
            toast.success('Duty report sent to HOD successfully! 🚀');
        } catch (err) {
            toast.error('Failed to send duty report');
        } finally {
            setReporting(false);
        }
    };

    const handleExcelImport = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            setImporting(true);
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                if (data.length === 0) {
                    toast.error('Excel file is empty. Please add student data and try again.');
                    return;
                }

                // Helper to find value by flexible column name
                const getVal = (row, ...keys) => {
                    const rowKeys = Object.keys(row);
                    for (const key of keys) {
                        const foundKey = rowKeys.find(rk =>
                            rk.toLowerCase().replace(/[^a-z0-9]/g, '') === key.toLowerCase().replace(/[^a-z0-9]/g, '')
                        );
                        if (foundKey) return row[foundKey];
                    }
                    return null;
                };

                // Determine the staff's own section (the only section they upload for)
                const staffSection = user?.assignedSections?.[0];
                const staffSectionId = typeof staffSection === 'string' ? staffSection : staffSection?._id;
                const staffDeptId = user?.department?._id || user?.department;
                const staffYear = user?.year || (sections[0]?.year);

                // Map Excel rows to student objects
                const studentsToUpload = [];
                const rowErrors = [];

                data.forEach((row, index) => {
                    const rowNum = index + 2;

                    let name = '', regNo = '', rollNo = '', genderVal = '', resVal = '';

                    // Use the same smart scanner logic as StudentsPage
                    Object.keys(row).forEach(key => {
                        const k = key.toLowerCase().trim();
                        const val = row[key] ? row[key].toString().trim() : '';

                        if (k.includes('name')) name = val;
                        if (k.includes('num') || k.includes('reg') || k.includes('roll')) {
                            if (!regNo) regNo = val;
                            else rollNo = val;
                        }
                        if (k.includes('gender') || k.includes('sex')) genderVal = val.toLowerCase();
                        if (k.includes('residency') || k.includes('type') || k.includes('status')) resVal = val.toLowerCase();
                    });

                    if (!regNo && rollNo) regNo = rollNo;
                    if (!rollNo && regNo) rollNo = regNo;

                    if (!name) { rowErrors.push(`Row ${rowNum}: Student Name is missing`); return; }
                    if (!regNo) { rowErrors.push(`Row ${rowNum}: Register Number is missing`); return; }

                    const staffSectionId = typeof staffSection === 'string' ? staffSection : staffSection?._id;

                    studentsToUpload.push({
                        name: name.toString().trim(),
                        rollNumber: rollNo.toString().trim(),
                        registerNumber: regNo.toString().trim(),
                        year: staffYear || 1,
                        section: staffSectionId,
                        department: staffDeptId,
                        email: `${regNo.toString().trim().toLowerCase()}@student.mec.edu.in`,
                        gender: (genderVal.includes('girl') || genderVal.includes('female') || genderVal === 'f') ? 'Female' : 'Male',
                        residency: (resVal.includes('hostel')) ? 'Hosteller' : 'Day Scholar'
                    });
                });

                // Show row errors found on the frontend
                if (rowErrors.length > 0 && studentsToUpload.length === 0) {
                    toast.error(`Upload failed — all rows invalid:\n${rowErrors.slice(0, 3).join('\n')}`, { duration: 7000 });
                    fileRef.current.value = '';
                    return;
                }

                if (rowErrors.length > 0) {
                    const proceed = window.confirm(
                        `${rowErrors.length} row(s) have issues and will be skipped:\n\n${rowErrors.slice(0, 5).join('\n')}${rowErrors.length > 5 ? '\n...' : ''}\n\nContinue uploading the remaining ${studentsToUpload.length} valid students?`
                    );
                    if (!proceed) { fileRef.current.value = ''; return; }
                }

                // ── Step 2: Show Strict Confirmation Modal ───────────────────────────
                const confirmMessage = `⚠️ Old student data for this section will be permanently deleted.\n\n` +
                    `Department: ${user?.department?.name || 'Your Dept'}\n` +
                    `Year: ${staffYear}\n` +
                    `Section: ${user?.assignedSections?.[0]?.name || 'Your Section'}\n\n` +
                    `Do you want to continue?`;

                if (!window.confirm(confirmMessage)) {
                    fileRef.current.value = '';
                    setImporting(false);
                    return;
                }

                // Send to backend — backend will CLEAR existing students for these sections first
                const res = await api.post('/students/upload-excel', {
                    students: studentsToUpload,
                    department: staffDeptId,
                    year: staffYear,
                    section: staffSectionId
                });

                toast.success(
                    `✅ ${res.data.count} students uploaded! The student list for this section has been fully replaced.`,
                    { duration: 5000 }
                );
                fileRef.current.value = '';

            } catch (err) {
                console.error('Excel Upload Error:', err);
                fileRef.current.value = '';
                toast.error(err.response?.data?.message || 'Failed to upload student data. Please check your Excel format.');
            } finally {
                setImporting(false);
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleDeleteSectionData = async () => {
        const staffSection = user?.assignedSections?.[0];
        const staffSectionId = typeof staffSection === 'string' ? staffSection : staffSection?._id;
        const staffDeptId = user?.department?._id || user?.department;
        const staffYear = user?.year || (sections[0]?.year);

        if (!staffSectionId || !staffDeptId || !staffYear) {
            toast.error('Could not determine your assigned section/department.');
            return;
        }

        const confirmMessage = `🗑️ This will delete all students of this section permanently.\n\n` +
            `Section: ${sections.find(s => s._id === staffSectionId)?.name || 'Your Assigned Section'}\n` +
            `Year: ${staffYear}\n` +
            `Are you sure?`;

        if (!window.confirm(confirmMessage)) return;

        try {
            setLoading(true);
            await api.delete(`/students/delete-section?department=${staffDeptId}&year=${staffYear}&section=${staffSectionId}`);
            toast.success('Successfully deleted all students for this section.');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete section data');
        } finally {
            setLoading(false);
        }
    };


    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this attendance record? This action cannot be undone.')) return;

        try {
            await api.delete(`/attendance/${id}`);
            toast.success('Record deleted successfully');
            fetchMyRecords();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete record');
        }
    };

    const todayRecords = myRecords.filter((r) => {
        const today = new Date().toISOString().split('T')[0];
        return new Date(r.date).toISOString().split('T')[0] === today;
    });

    const totalPresent = myRecords.reduce(
        (sum, r) => sum + r.attendance.filter((a) => a.status === 'Present').length, 0
    );
    const totalStudents = myRecords.reduce((sum, r) => sum + r.attendance.length, 0);
    const avgPct = totalStudents > 0 ? ((totalPresent / totalStudents) * 100).toFixed(1) : 0;

    const pendingCount = myRecords.filter((r) => r.status === 'pending').length;
    const approvedCount = myRecords.filter((r) => r.status === 'approved').length;

    // Detect Current Class based on Timetable
    const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const currentHour = new Date().getHours();
    let currentPeriod = null;
    if (currentHour >= 9 && currentHour < 10) currentPeriod = 1;
    else if (currentHour >= 10 && currentHour < 11) currentPeriod = 2;
    // (Simplified demo schedule)
    else currentPeriod = 1; // Defaulting to 1 for demo purposes if outside hours

    const currentClass = timetable.find(t => t.day === todayStr && t.period == currentPeriod);

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <Topbar
                    title="Main Dashboard"
                />
                <div className="page-content">
                    {/* Premium Glassmorphic Hero Header */}
                    <div className="dashboard-hero" style={{
                        background: 'var(--accent-gradient)',
                        borderRadius: 24,
                        padding: '32px 40px',
                        marginBottom: 32,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        boxShadow: '0 20px 40px rgba(99, 102, 241, 0.3)',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        {/* Decorative background circles */}
                        <div style={{ position: 'absolute', top: -50, right: -50, width: 250, height: 250, background: 'rgba(255,255,255,0.2)', borderRadius: '50%', filter: 'blur(60px)' }}></div>
                        <div style={{ position: 'absolute', bottom: -50, left: -50, width: 200, height: 200, background: 'rgba(0,0,0,0.1)', borderRadius: '50%', filter: 'blur(60px)' }}></div>

                        <div className="header-left" style={{ position: 'relative', zIndex: 1 }}>

                            <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.02em', margin: 0, color: 'white' }}>
                                Welcome back, <span style={{ background: 'linear-gradient(to right, #ffffff, #c7d2fe)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 2px 10px rgba(0,0,0,0.15))' }}>Staff</span> 👋
                            </h1>
                            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', marginTop: 8, maxWidth: 500, lineHeight: 1.6, fontWeight: 700 }}>
                                Manage your students, mark attendance, and monitor performance metrics seamlessly from your command center.
                            </p>
                        </div>
                        <div className="header-right" style={{ display: 'flex', gap: 16, position: 'relative', zIndex: 1 }}>
                            <button
                                className="btn"
                                onClick={handleReportDuty}
                                disabled={reporting}
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    color: 'white',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    backdropFilter: 'blur(10px)',
                                    padding: '12px 24px',
                                    borderRadius: 16,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    fontWeight: 600,
                                    transition: 'all 0.3s'
                                }}
                                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                            >
                                <span style={{ fontSize: 18 }}>🚀</span>
                                {reporting ? 'Sending...' : 'Report Duty'}
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={() => fileRef.current.click()}
                                disabled={importing}
                                style={{ padding: '12px 24px', borderRadius: 16, fontWeight: 600, boxShadow: '0 8px 25px var(--accent-glow)' }}
                            >
                                📥 {importing ? 'Importing...' : 'Import Students'}
                            </button>
                            <input
                                type="file"
                                ref={fileRef}
                                onChange={handleExcelImport}
                                accept=".xlsx, .xls"
                                style={{ display: 'none' }}
                            />
                        </div>
                    </div>

                    <StudentQuickSearch />

                    {/* Current Class Banner */}
                    {currentClass && (
                        <div className="card glass" style={{
                            marginBottom: 24,
                            background: 'var(--accent-gradient)',
                            color: 'white',
                            border: 'none',
                            boxShadow: '0 10px 30px var(--accent-glow)',
                            borderRadius: 20
                        }}>
                            <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 32px' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: 20, color: 'white', fontWeight: 800 }}>⚡ ACTIVE SESSION: {currentClass.subject}</h3>
                                    <p style={{ margin: '4px 0 0', opacity: 0.9, fontSize: 14, fontWeight: 500 }}>
                                        {currentClass.year}{['st', 'nd', 'rd', 'th'][currentClass.year - 1]} Year • Section {currentClass.section?.name} • Period {currentClass.period}
                                    </p>
                                </div>
                                <a
                                    href={`/staff/mark-attendance?period=${currentClass.period}&sectionId=${currentClass.section?._id || currentClass.section}&subject=${encodeURIComponent(currentClass.subject)}`}
                                    className="btn"
                                    style={{ background: 'white', color: 'var(--accent)', fontWeight: 800, borderRadius: 30, padding: '12px 28px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                >
                                    MARK ATTENDANCE NOW
                                </a>
                            </div>
                        </div>
                    )}

                    {/* Stats Grid */}
                    <div className="dashboard-grid">
                        <div className="stat-card" style={{ borderLeft: '5px solid var(--accent)' }}>
                            <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent)' }}>📋</div>
                            <div className="stat-info">
                                <p>TOTAL SUBMISSIONS</p>
                                <h3>{myRecords.length}</h3>
                            </div>
                        </div>
                        <div className="stat-card" style={{ borderLeft: '5px solid var(--warning)' }}>
                            <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }}>⏳</div>
                            <div className="stat-info">
                                <p>PENDING REVIEW</p>
                                <h3>{pendingCount}</h3>
                            </div>
                        </div>
                        <div className="stat-card" style={{ borderLeft: '5px solid var(--success)' }}>
                            <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>✅</div>
                            <div className="stat-info">
                                <p>APPROVED RECORDS</p>
                                <h3>{approvedCount}</h3>
                                <p>Performance</p>
                            </div>
                        </div>
                    </div>

                    <NoticeBoard userRole="staff" />

                    {/* Today's Records */}
                    <div className="card" style={{ marginBottom: 20 }}>
                        <div className="card-header">
                            <div className="card-title">📅 Today's Attendance Records</div>
                            <span className="badge badge-info">{todayRecords.length} records</span>
                        </div>
                        {todayRecords.length > 0 ? (
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Period</th>
                                            <th>Section</th>
                                            <th>Total</th>
                                            <th>Present</th>
                                            <th>Absent</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {todayRecords.map((r) => {
                                            const present = r.attendance.filter((a) => a.status === 'Present').length;
                                            const total = r.attendance.length;
                                            return (
                                                <tr key={r._id}>
                                                    <td>Period {r.period}</td>
                                                    <td>{r.year}{['st', 'nd', 'rd', 'th'][r.year - 1]} Yr — Sec {r.section?.name}</td>
                                                    <td>{total}</td>
                                                    <td style={{ color: 'var(--success)', fontWeight: 800 }}>{present}</td>
                                                    <td style={{ color: 'var(--danger)', fontWeight: 800 }}>{total - present}</td>
                                                    <td>
                                                        <span className={`badge ${r.status === 'approved' ? 'badge-success' :
                                                            r.status === 'rejected' ? 'badge-danger' : 'badge-warning'
                                                            }`}>
                                                            {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: 6 }}>
                                                            {r.status !== 'approved' && (
                                                                <>
                                                                    <button
                                                                        className="btn btn-ghost btn-sm"
                                                                        title="Edit"
                                                                        onClick={() => window.location.href = `/staff/mark-attendance?edit=${r._id}`}
                                                                        style={{ padding: '4px 8px', color: 'var(--primary)', border: '1px solid #e5e7eb' }}
                                                                    >
                                                                        ✏️
                                                                    </button>
                                                                    <button
                                                                        className="btn btn-ghost btn-sm"
                                                                        title="Delete"
                                                                        onClick={() => handleDelete(r._id)}
                                                                        style={{ padding: '4px 8px', color: 'var(--danger)', border: '1px solid #e5e7eb' }}
                                                                    >
                                                                        🗑️
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="empty-state">
                                <div className="empty-state-icon">📭</div>
                                <h3>No Records Today</h3>
                                <p>You haven't marked any attendance today.</p>
                                <a href="/staff/mark-attendance" className="btn btn-primary" style={{ marginTop: 12 }}>
                                    ✏️ Mark Attendance Now
                                </a>
                            </div>
                        )}
                    </div>

                    {/* Recent Records */}
                    <div className="card">
                        <div className="card-header">
                            <div className="card-title">🕐 Recent Submissions</div>
                            <a href="/staff/my-records" className="btn btn-ghost btn-sm">View All</a>
                        </div>
                        {loading ? (
                            <div className="loading-fullscreen" style={{ minHeight: 150 }}>
                                <div className="spinner spinner-dark" />
                            </div>
                        ) : myRecords.length > 0 ? (
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Period</th>
                                            <th>Year & Section</th>
                                            <th>Present / Total</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {myRecords.slice(0, 10).map((r) => {
                                            const present = r.attendance.filter((a) => a.status === 'Present').length;
                                            return (
                                                <tr key={r._id}>
                                                    <td>{new Date(r.date).toLocaleDateString('en-IN')}</td>
                                                    <td>Period {r.period}</td>
                                                    <td>{r.year}{['st', 'nd', 'rd', 'th'][r.year - 1]} Yr — Sec {r.section?.name}</td>
                                                    <td>
                                                        <span style={{ color: 'var(--success)', fontWeight: 800 }}>{present}</span>
                                                        <span style={{ color: 'var(--gray-500)', fontWeight: 700 }}> / {r.attendance.length}</span>
                                                    </td>
                                                    <td>
                                                        <span className={`badge ${r.status === 'approved' ? 'badge-success' :
                                                            r.status === 'rejected' ? 'badge-danger' : 'badge-warning'
                                                            }`}>
                                                            {r.status}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: 6 }}>
                                                            {r.status !== 'approved' && (
                                                                <>
                                                                    <button
                                                                        className="btn btn-ghost btn-sm"
                                                                        title="Edit"
                                                                        onClick={() => window.location.href = `/staff/mark-attendance?edit=${r._id}`}
                                                                        style={{ padding: '4px 8px', color: 'var(--primary)', border: '1px solid #e5e7eb' }}
                                                                    >
                                                                        ✏️
                                                                    </button>
                                                                    <button
                                                                        className="btn btn-ghost btn-sm"
                                                                        title="Delete"
                                                                        onClick={() => handleDelete(r._id)}
                                                                        style={{ padding: '4px 8px', color: 'var(--danger)', border: '1px solid #e5e7eb' }}
                                                                    >
                                                                        🗑️
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="empty-state">
                                <div className="empty-state-icon">📋</div>
                                <h3>No Records Found</h3>
                                <p>Start marking attendance to see records here.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StaffDashboard;
