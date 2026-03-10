import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

const MarkAttendance = () => {
    const { user } = useAuth();

    // Form state
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [period, setPeriod] = useState('1');
    const [sectionId, setSectionId] = useState('');
    const [subject, setSubject] = useState('');
    const [staffName, setStaffName] = useState(user?.name || '');

    // Data
    const [sections, setSections] = useState([]);
    const [students, setStudents] = useState([]);
    const [attendance, setAttendance] = useState({}); // { studentId: 'Present' | 'Absent' }

    // State
    const [loadingSections, setLoadingSections] = useState(false);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [recordId, setRecordId] = useState(null);

    const deptId = user?.department?._id;

    const fetchSections = useCallback(async () => {
        setLoadingSections(true);
        try {
            const res = await api.get(`/admin/sections?departmentId=${deptId}`);

            // Staff: filter to assigned sections if set
            let secs = res.data.data || [];

            if (user?.assignedSections?.length > 0) {
                const assignedIds = user.assignedSections.map((s) =>
                    typeof s === 'string' ? s : s._id
                );
                secs = secs.filter((s) => assignedIds.includes(s._id));
            }

            setSections(secs);
        } catch (err) {
            toast.error('Failed to load sections');
        } finally {
            setLoadingSections(false);
        }
    }, [deptId, user?.assignedSections]);

    const fetchExistingRecord = useCallback(async (id) => {
        try {
            const res = await api.get(`/attendance?_id=${id}`);
            const record = res.data.data.find(r => r._id === id);
            if (!record) throw new Error('Record not found');

            setDate(new Date(record.date).toISOString().split('T')[0]);
            setPeriod(record.period.toString());
            setSectionId(record.section?._id || record.section);
            setSubject(record.subject || '');
            setStaffName(record.staffName || '');

            const att = {};
            record.attendance.forEach(a => {
                att[a.student?._id || a.student] = a.status;
            });
            setAttendance(att);
            setEditMode(true);
            setRecordId(id);
        } catch (err) {
            toast.error('Failed to load existing record');
        }
    }, []);

    // Load assigned sections on mount
    useEffect(() => {
        if (deptId) {
            fetchSections();
        }
        const params = new URLSearchParams(window.location.search);
        const editId = params.get('edit');
        if (editId) {
            fetchExistingRecord(editId);
        }
    }, [deptId, fetchSections, fetchExistingRecord]);

    // Update staffName when user is loaded
    useEffect(() => {
        if (user?.name && !staffName && !editMode) {
            setStaffName(user.name);
        }
    }, [user, staffName, editMode]);

    const fetchStudents = useCallback(async () => {
        if (!sectionId) return;
        setLoadingStudents(true);
        try {
            const selectedSection = sections.find((s) => s._id === sectionId);
            const year = selectedSection ? selectedSection.year : '';

            const res = await api.get(
                `/students?departmentId=${deptId}&year=${year}&sectionId=${sectionId}`
            );
            const studs = res.data.data || [];
            setStudents(studs);

            // If not in edit mode, default all to Present
            if (!editMode) {
                const att = {};
                studs.forEach((s) => { att[s._id] = 'Present'; });
                setAttendance(att);
            }
        } catch (err) {
            toast.error('Failed to load students');
        } finally {
            setLoadingStudents(false);
        }
    }, [deptId, sectionId, sections, editMode]);

    // Load students when section changes
    useEffect(() => {
        if (sectionId) {
            fetchStudents();
        }
    }, [sectionId, fetchStudents]);

    // Initial section setting after loading
    useEffect(() => {
        if (!editMode && sections.length > 0 && !sectionId) {
            setSectionId(sections[0]._id);
        }
    }, [sections, editMode, sectionId]);


    const toggleAttendance = (studentId, status) => {
        setAttendance((prev) => ({ ...prev, [studentId]: status }));
    };

    const markAllPresent = () => {
        const att = {};
        students.forEach((s) => { att[s._id] = 'Present'; });
        setAttendance(att);
    };

    const markAllAbsent = () => {
        const att = {};
        students.forEach((s) => { att[s._id] = 'Absent'; });
        setAttendance(att);
    };

    const handleSubmit = async () => {
        if (!date || !period || !sectionId) {
            toast.error('Please fill all required fields');
            return;
        }
        if (students.length === 0) {
            toast.error('No students found for this section');
            return;
        }

        const selectedSection = sections.find((s) => s._id === sectionId);
        const attendancePayload = students.map((s) => ({
            student: s._id,
            status: attendance[s._id] || 'Absent',
        }));

        setSubmitting(true);
        try {
            if (editMode) {
                await api.put(`/attendance/${recordId}`, {
                    subject,
                    staffName,
                    attendance: attendancePayload
                });
                toast.success('✅ Attendance updated successfully!');
            } else {
                await api.post('/attendance/mark', {
                    date,
                    period: parseInt(period),
                    departmentId: deptId,
                    year: selectedSection.year,
                    sectionId,
                    subject,
                    staffName,
                    attendance: attendancePayload,
                });
                toast.success('✅ Attendance submitted successfully! HOD has been notified.');
            }
            setSubmitted(true);
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to submit attendance';
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const presentCount = Object.values(attendance).filter((v) => v === 'Present' || v === 'OD').length;
    const odCount = Object.values(attendance).filter((v) => v === 'OD').length;
    const absentCount = students.length - presentCount;
    const presentPct = students.length > 0 ? ((presentCount / students.length) * 100).toFixed(1) : 0;

    const selectedSection = sections.find((s) => s._id === sectionId);

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <Topbar title={editMode ? 'Edit Attendance' : 'Mark Attendance'} subtitle="Select section and mark student attendance" />
                <div className="page-content">

                    <div className="page-header">
                        <div className="page-header-left">
                            <h2>{editMode ? '💾 Edit Attendance' : '✏️ Mark Attendance'}</h2>
                            <p>{editMode ? 'Modify existing attendance record' : 'Select class details and mark students present or absent'}</p>
                        </div>
                        {editMode && (
                            <div className="page-header-right">
                                <button className="btn btn-ghost" onClick={() => window.location.href = '/staff/mark-attendance'}>
                                    ← New Attendance
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Selection Form */}
                    <div className="card" style={{ marginBottom: 20 }}>
                        <div className="card-header">
                            <div className="card-title">📋 Class Details</div>
                        </div>
                        <div className="card-body">
                            <div className="form-row" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
                                <div className="form-group">
                                    <label className="form-label form-required">Date</label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={date}
                                        max={new Date().toISOString().split('T')[0]}
                                        onChange={(e) => setDate(e.target.value)}
                                        disabled={editMode}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label form-required">Period / Hour</label>
                                    <select
                                        className="form-control"
                                        value={period}
                                        onChange={(e) => setPeriod(e.target.value)}
                                        disabled={editMode}
                                    >
                                        {PERIODS.map((p) => (
                                            <option key={p} value={p}>Period {p}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label form-required">Section</label>
                                    <select
                                        className="form-control"
                                        value={sectionId}
                                        onChange={(e) => setSectionId(e.target.value)}
                                        disabled={loadingSections || editMode}
                                    >
                                        {sections.length === 0 && <option value="">No sections assigned</option>}
                                        {sections.map((s) => (
                                            <option key={s._id} value={s._id}>
                                                {s.year}{['st', 'nd', 'rd', 'th'][s.year - 1]} Year — Section {s.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="form-row" style={{ marginTop: 20 }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label form-required">Subject Name</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="e.g. Operating Systems"
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Staff Name</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Enter your name"
                                        value={staffName}
                                        onChange={(e) => setStaffName(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                        {editMode && <p style={{ fontSize: 12, color: 'var(--accent)', marginTop: 8 }}>ℹ️ Date, period, and section cannot be changed in edit mode.</p>}
                    </div>

                    {/* Attendance Summary Bar */}
                    {students.length > 0 && (
                        <div className="card" style={{ marginBottom: 20 }}>
                            <div className="card-body" style={{ padding: '16px 22px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                                    {/* Summary */}
                                    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>{students.length}</div>
                                            <div style={{ fontSize: 12, color: '#6B7280' }}>Total Students</div>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--success)' }}>{presentCount}</div>
                                            <div style={{ fontSize: 12, color: '#6B7280' }}>Present (incl. {odCount} OD)</div>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--danger)' }}>{absentCount}</div>
                                            <div style={{ fontSize: 12, color: '#6B7280' }}>Absent</div>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: 24, fontWeight: 700, color: parseFloat(presentPct) >= 75 ? 'var(--success)' : 'var(--danger)' }}>
                                                {presentPct}%
                                            </div>
                                            <div style={{ fontSize: 12, color: '#6B7280' }}>Attendance</div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button className="btn btn-success btn-sm" onClick={markAllPresent}>✅ All Present</button>
                                        <button className="btn btn-danger btn-sm" onClick={markAllAbsent}>❌ All Absent</button>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div style={{ marginTop: 14 }}>
                                    <div className="percentage-bar">
                                        <div
                                            className={`percentage-fill ${parseFloat(presentPct) >= 75 ? 'high' : parseFloat(presentPct) >= 50 ? 'medium' : 'low'}`}
                                            style={{ width: `${presentPct}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Student Attendance Table */}
                    <div className="card">
                        <div className="card-header">
                            <div className="card-title">
                                👥 Student List
                                {selectedSection && (
                                    <span style={{ fontSize: 13, fontWeight: 400, color: '#6B7280', marginLeft: 8 }}>
                                        — {selectedSection.year}{['st', 'nd', 'rd', 'th'][selectedSection.year - 1]} Year, Section {selectedSection.name}
                                    </span>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <span className="badge badge-gray">{students.length} Students</span>
                            </div>
                        </div>

                        {loadingStudents ? (
                            <div className="loading-fullscreen">
                                <div className="spinner spinner-dark" />
                                <p>Loading students...</p>
                            </div>
                        ) : students.length > 0 ? (
                            <>
                                <div className="table-container">
                                    <table className="attendance-table">
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>Roll Number</th>
                                                <th>Register Number</th>
                                                <th>Student Name</th>
                                                <th style={{ textAlign: 'center' }}>Attendance</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {students.map((student, idx) => {
                                                const status = attendance[student._id] || 'Absent';
                                                return (
                                                    <tr
                                                        key={student._id}
                                                        className={status === 'Present' ? 'student-present' : status === 'OD' ? 'student-od' : 'student-absent'}
                                                    >
                                                        <td style={{ color: '#9CA3AF', fontWeight: 600 }}>{idx + 1}</td>
                                                        <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{student.rollNumber}</td>
                                                        <td style={{ fontFamily: 'monospace', fontSize: 13, color: '#6B7280' }}>{student.registerNumber}</td>
                                                        <td>
                                                            <div style={{ fontWeight: 500 }}>{student.name}</div>
                                                        </td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <div className="attendance-toggle">
                                                                <button
                                                                    className={`att-btn present ${status === 'Present' ? 'active' : ''}`}
                                                                    onClick={() => toggleAttendance(student._id, 'Present')}
                                                                >
                                                                    ✓ P
                                                                </button>
                                                                <button
                                                                    className={`att-btn od ${(status === 'OD') ? 'active' : ''}`}
                                                                    onClick={() => toggleAttendance(student._id, 'OD')}
                                                                >
                                                                    ★ OD
                                                                </button>
                                                                <button
                                                                    className={`att-btn absent ${status === 'Absent' ? 'active' : ''}`}
                                                                    onClick={() => toggleAttendance(student._id, 'Absent')}
                                                                >
                                                                    ✕ A
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Submit */}
                                <div style={{ padding: '16px 22px', borderTop: '1px solid var(--gray-100)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                                    {submitted && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--success)', fontWeight: 500 }}>
                                            ✅ {editMode ? 'Updated' : 'Submitted'} successfully
                                        </div>
                                    )}
                                    <button
                                        className="btn btn-primary btn-lg"
                                        onClick={handleSubmit}
                                        disabled={submitting || submitted}
                                    >
                                        {submitting ? (
                                            <><span className="spinner" /> {editMode ? 'Updating...' : 'Submitting...'}</>
                                        ) : submitted ? (
                                            '✅ Done'
                                        ) : (
                                            editMode ? '💾 Update Attendance' : '📤 Submit Attendance'
                                        )}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="empty-state">
                                <div className="empty-state-icon">👥</div>
                                <h3>Select a Section</h3>
                                <p>Choose a section above to load student list and mark attendance.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div >
    );
};

export default MarkAttendance;
