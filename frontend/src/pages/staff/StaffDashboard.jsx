import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
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
                    const rowNum = index + 2; // +1 for 0-index, +1 for header row
                    const name = getVal(row, 'name', 'studentname', 'student name', 'fullname');
                    let regNo = getVal(row, 'registerNumber', 'register number', 'regno', 'reg no', 'reg');
                    let rollNo = getVal(row, 'rollNumber', 'roll number', 'rollno', 'roll no', 'roll');

                    // Fallback: use one as the other if only one is present
                    if (!regNo && rollNo) regNo = rollNo;
                    if (!rollNo && regNo) rollNo = regNo;

                    if (!name) { rowErrors.push(`Row ${rowNum}: Student Name is missing`); return; }
                    if (!regNo) { rowErrors.push(`Row ${rowNum}: Register Number is missing`); return; }

                    // Use section from Excel if provided, otherwise use staff's assigned section
                    const rowSectionRaw = getVal(row, 'sectionName', 'section', 'section name');
                    const rowSectionName = rowSectionRaw?.toString().trim().toUpperCase();
                    const matchedSection = rowSectionName
                        ? sections.find(s => s.name.trim().toUpperCase() === rowSectionName)
                        : null;
                    const finalSectionId = matchedSection?._id || staffSectionId;

                    if (!finalSectionId) {
                        rowErrors.push(`Row ${rowNum}: Could not determine section. Add a "Section" column or ensure your account has an assigned section.`);
                        return;
                    }

                    studentsToUpload.push({
                        name: name.toString().trim(),
                        rollNumber: rollNo.toString().trim(),
                        registerNumber: regNo.toString().trim(),
                        year: staffYear || matchedSection?.year || 1,
                        section: finalSectionId,
                        department: staffDeptId,
                        email: getVal(row, 'email')?.toString().trim() ||
                            `${regNo.toString().trim().toLowerCase()}@student.mec.edu.in`,
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
                    title={`Welcome, ${user?.name?.split(' ')[0] || 'Staff'}`}
                    subtitle={`${user?.department?.name || ''} — Staff Dashboard`}
                />
                <div className="page-content">
                    <div className="page-header">
                        <div className="page-header-left">
                            <h2>📋 Staff Dashboard</h2>
                            <p>Manage attendance and student data</p>
                        </div>
                        <div className="page-header-right" style={{ gap: 10 }}>
                            <button
                                className="btn btn-warning"
                                onClick={handleReportDuty}
                                disabled={reporting}
                            >
                                {reporting ? 'Sending...' : '📢 Report Duty to HOD'}
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={handleDeleteSectionData}
                                title="Delete all students for your section"
                            >
                                🗑️ Delete Student Data
                            </button>
                            <label className="btn btn-outline" style={{ cursor: 'pointer' }} title="Columns: name, rollNumber, registerNumber">
                                {importing ? 'Importing...' : '📁 Bulk Upload Students'}
                                <input
                                    type="file"
                                    ref={fileRef}
                                    accept=".xlsx, .xls"
                                    onChange={handleExcelImport}
                                    style={{ display: 'none' }}
                                    disabled={importing}
                                />
                            </label>
                            <a href="/staff/mark-attendance" className="btn btn-primary">
                                ✏️ Mark Attendance
                            </a>
                        </div>
                    </div>

                    {/* Current Class Banner */}
                    {currentClass && (
                        <div className="card" style={{ marginBottom: 20, background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: 'white' }}>
                            <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: 20 }}>⏰ Current Class: {currentClass.subject}</h3>
                                    <p style={{ margin: '4px 0 0', opacity: 0.9 }}>
                                        {currentClass.year}{['st', 'nd', 'rd', 'th'][currentClass.year - 1]} Year, Sec {currentClass.section?.name} | Period {currentClass.period}
                                    </p>
                                </div>
                                <a href="/staff/mark-attendance" className="btn" style={{ background: 'white', color: '#059669', fontWeight: 'bold' }}>
                                    ✅ Mark Attendance Now
                                </a>
                            </div>
                        </div>
                    )}

                    {/* Stats */}
                    <div className="dashboard-grid">
                        <div className="stat-card blue">
                            <div className="stat-icon blue">📝</div>
                            <div className="stat-info">
                                <h3>{myRecords.length}</h3>
                                <p>Total Submissions</p>
                            </div>
                        </div>
                        <div className="stat-card amber">
                            <div className="stat-icon amber">⏳</div>
                            <div className="stat-info">
                                <h3>{pendingCount}</h3>
                                <p>Pending Approval</p>
                            </div>
                        </div>
                        <div className="stat-card green">
                            <div className="stat-icon green">✅</div>
                            <div className="stat-info">
                                <h3>{approvedCount}</h3>
                                <p>Approved Records</p>
                            </div>
                        </div>
                        <div className="stat-card purple">
                            <div className="stat-icon purple">📊</div>
                            <div className="stat-info">
                                <h3>{avgPct}%</h3>
                                <p>Overall Attendance</p>
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
                                                    <td style={{ color: 'var(--success)', fontWeight: 600 }}>{present}</td>
                                                    <td style={{ color: 'var(--danger)', fontWeight: 600 }}>{total - present}</td>
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
                                                        <span style={{ color: 'var(--success)', fontWeight: 600 }}>{present}</span>
                                                        <span style={{ color: '#9CA3AF' }}> / {r.attendance.length}</span>
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
