import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import ReasonProofModal from '../../components/shared/ReasonProofModal';
import VoiceControl from '../../components/shared/VoiceControl';

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
    const [lastRecordId, setLastRecordId] = useState(null);
    const [exporting, setExporting] = useState('');
    const [editMode, setEditMode] = useState(false);
    const [recordId, setRecordId] = useState(null);

    // Reason & Proof state
    const [modalOpen, setModalOpen] = useState(false);
    const [activeStudent, setActiveStudent] = useState(null);
    const [reasons, setReasons] = useState({}); // { studentId: string }
    const [proofFiles, setProofFiles] = useState({}); // { studentId: File }
    const [proofUrls, setProofUrls] = useState({}); // { studentId: string }
    const [currentPage, setCurrentPage] = useState(1);
    const studentsPerPage = 20;

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
            const rea = {};
            const urls = {};
            record.attendance.forEach(a => {
                const sId = a.student?._id || a.student;
                att[sId] = a.status;
                if (a.reason) rea[sId] = a.reason;
                if (a.proofUrl) urls[sId] = a.proofUrl;
            });
            setAttendance(att);
            setReasons(rea);
            setProofUrls(urls);
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
        } else {
            // Check for pre-fill params from Timetable
            const p = params.get('period');
            const s = params.get('sectionId');
            const subj = params.get('subject');
            if (p) setPeriod(p);
            if (s) setSectionId(s);
            if (subj) setSubject(subj);
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
            setCurrentPage(1); // Reset to first page on section change
        }
    }, [sectionId, fetchStudents]);

    // Initial section setting after loading
    useEffect(() => {
        if (!editMode && sections.length > 0 && !sectionId) {
            setSectionId(sections[0]._id);
        }
    }, [sections, editMode, sectionId]);


    const toggleAttendance = useCallback((studentId, status, voiceReason = null) => {
        if (!voiceReason && (status === 'Absent' || status === 'OD')) {
            const student = students.find(s => s._id === studentId);
            setActiveStudent({ id: studentId, name: student?.name, status });
            setModalOpen(true);
        } else {
            setAttendance((prev) => ({ ...prev, [studentId]: status }));
            if (voiceReason) {
                setReasons(prev => ({ ...prev, [studentId]: voiceReason }));
            }
        }
    }, [students]);

    const handleReasonConfirm = ({ reason, proofFile }) => {
        const { id, status } = activeStudent;
        setAttendance(prev => ({ ...prev, [id]: status }));
        if (reason) setReasons(prev => ({ ...prev, [id]: reason }));
        if (proofFile) setProofFiles(prev => ({ ...prev, [id]: proofFile }));
        setModalOpen(false);
        setActiveStudent(null);
    };

    const markAllPresent = useCallback(() => {
        const att = {};
        students.forEach((s) => { att[s._id] = 'Present'; });
        setAttendance(att);
        toast.success('All students marked Present');
    }, [students]);

    const markAllAbsent = useCallback(() => {
        const att = {};
        students.forEach((s) => { att[s._id] = 'Absent'; });
        setAttendance(att);
        toast.success('All students marked Absent');
    }, [students]);

    // Helper to convert voice numbers to digits
    const parseNumber = (text) => {
        const numMap = {
            'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
            'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
            'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
            'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20
        };
        const val = numMap[text.toLowerCase()];
        return val !== undefined ? val : text;
    };

    // Voice Commands Configuration
    const voiceCommands = useMemo(() => [
        {
            // Range: "Roll 1 to 10 absent"
            regex: /(?:number|roll|roll number|student)?\s*(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)\s+(?:to|through|until)\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)\s+(present|absent|od)/i,
            handler: (match) => {
                const start = parseInt(parseNumber(match[1]));
                const end = parseInt(parseNumber(match[2]));
                let status = match[3].toLowerCase();
                status = status.charAt(0).toUpperCase() + status.slice(1);
                if (status === 'Od') status = 'OD';
                
                let count = 0;
                for (let i = start; i <= end; i++) {
                    const rollStr = i.toString();
                    const student = students.find(s => 
                        s.rollNumber.toString().endsWith(rollStr) || 
                        s.rollNumber.toString() === rollStr
                    );
                    if (student) {
                        const reason = (status === 'Absent' || status === 'OD') ? 'Voice Entry' : null;
                        toggleAttendance(student._id, status, reason);
                        count++;
                    }
                }
                if (count > 0) {
                    toast.success(`Marked ${count} students as ${status}`, { id: 'voice-range' });
                } else {
                    toast.error(`No students found in range ${start} to ${end}`);
                }
            }
        },
        {
            // Regex for "Number 10 present", "Roll 10 present", or just "10 present"
            regex: /(?:number|roll|roll number|student)?\s*(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)\s+(present|absent|od)/i,
            handler: (match) => {
                const rollInput = match[1];
                const rollNo = parseNumber(rollInput).toString();
                let status = match[2].toLowerCase();
                status = status.charAt(0).toUpperCase() + status.slice(1);
                if (status === 'Od') status = 'OD';
                
                const student = students.find(s => 
                    s.rollNumber.toString().endsWith(rollNo) || 
                    s.rollNumber.toString() === rollNo
                );
                
                if (student) {
                    // For voice commands, we bypass the modal and set a default reason if absent
                    const reason = (status === 'Absent' || status === 'OD') ? 'Voice Entry' : null;
                    toggleAttendance(student._id, status, reason);
                    toast.success(`Roll ${rollNo} marked ${status}`, { id: `voice-${rollNo}` });
                } else {
                    toast.error(`Student with roll ${rollNo} not found`);
                }
            }
        },
        {
            regex: /all\s+present/i,
            handler: () => markAllPresent()
        },
        {
            regex: /all\s+absent/i,
            handler: () => markAllAbsent()
        },
        {
            regex: /(?:submit|save|finish)\s+attendance/i,
            handler: () => handleSubmit()
        }
    ], [students, toggleAttendance, markAllPresent, markAllAbsent]);

    const handleExport = async (type, filterType = null) => {
        if (!lastRecordId) return;
        setExporting(type + (filterType || ''));
        try {
            const params = new URLSearchParams();
            params.append('recordId', lastRecordId);
            if (filterType) params.append('filterType', filterType);
            
            const res = await api.get(`/reports/${type}?${params}`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            const filename = filterType === 'absentees' ? 'absentee_report.pdf' : `attendance_report.pdf`;
            a.download = filename;
            a.click();
            window.URL.revokeObjectURL(url);
            toast.success(`${filterType === 'absentees' ? 'Absentee List' : 'PDF'} downloaded!`);
        } catch {
            toast.error('Export failed');
        } finally {
            setExporting('');
        }
    };

    const handleSubmit = useCallback(async () => {
        if (!date || !period || !sectionId) {
            toast.error('Please fill all required fields');
            return;
        }
        if (students.length === 0) {
            toast.error('No students found for this section');
            return;
        }

        const selectedSection = sections.find((s) => s._id === sectionId);
        
        setSubmitting(true);
        try {
            // 1. Upload files first
            const finalProofUrls = { ...proofUrls };
            const uploadPromises = Object.keys(proofFiles).map(async (sId) => {
                if (proofFiles[sId] && attendance[sId] !== 'Present') {
                    const formData = new FormData();
                    formData.append('proof', proofFiles[sId]);
                    const res = await api.post('/attendance/upload-proof', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                    finalProofUrls[sId] = res.data.url;
                }
            });
            await Promise.all(uploadPromises);

            // 2. Prepare payload
            const attendancePayload = students.map((s) => ({
                student: s._id,
                status: attendance[s._id] || 'Absent',
                reason: reasons[s._id] || '',
                proofUrl: finalProofUrls[s._id] || '',
            }));

            if (editMode) {
                const res = await api.put(`/attendance/${recordId}`, {
                    subject,
                    staffName,
                    attendance: attendancePayload
                });
                setLastRecordId(res.data.data?._id || recordId);
                toast.success('✅ Attendance updated successfully!');
            } else {
                const res = await api.post('/attendance/mark', {
                    date,
                    period: parseInt(period),
                    departmentId: deptId,
                    year: selectedSection.year,
                    sectionId,
                    subject,
                    staffName,
                    attendance: attendancePayload,
                });
                setLastRecordId(res.data.data?._id);
                toast.success('✅ Attendance submitted successfully! HOD has been notified.');
            }
            setSubmitted(true);
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to submit attendance';
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    }, [date, period, sectionId, students, sections, proofUrls, proofFiles, attendance, reasons, editMode, deptId, recordId, subject, staffName]);

    const presentCount = Object.values(attendance).filter((v) => v === 'Present' || v === 'OD').length;
    const odCount = Object.values(attendance).filter((v) => v === 'OD').length;
    const absentCount = students.length - presentCount;
    const presentPct = students.length > 0 ? ((presentCount / students.length) * 100).toFixed(1) : 0;

    const boysCount = students.filter(s => s.gender === 'Male').length;
    const girlsCount = students.filter(s => s.gender === 'Female').length;
    const hostellerCount = students.filter(s => s.residency === 'Hosteller').length;
    const dayScholarCount = students.length - hostellerCount;

    const selectedSection = sections.find((s) => s._id === sectionId);

    // Pagination logic
    const indexOfLastStudent = currentPage * studentsPerPage;
    const indexOfFirstStudent = indexOfLastStudent - studentsPerPage;
    const currentStudents = students.slice(indexOfFirstStudent, indexOfLastStudent);
    const totalPages = Math.ceil(students.length / studentsPerPage);

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <Topbar title={editMode ? 'Edit Attendance' : 'Mark Attendance'} subtitle="Select section and mark student attendance" />
                <div className="page-content">

                    <div className="page-header" style={{ marginBottom: 32 }}>
                        <div className="header-left">
                            <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.04em', margin: 0 }}>
                                <span style={{ color: 'var(--accent)' }}>Attendance</span> Recording
                            </h1>
                            <p style={{ fontSize: 16, color: 'var(--gray-500)', marginTop: 4 }}>
                                {editMode ? 'Modifying existing session record' : 'Command Center — Select session details to begin'}
                            </p>
                        </div>
                        {editMode && (
                            <div className="header-right">
                                <button className="btn btn-ghost" style={{ borderRadius: 12, border: '1px solid var(--gray-200)' }} onClick={() => window.location.href = '/staff/mark-attendance'}>
                                    ← BACK TO NEW SESSION
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
                                            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--gray-900)' }}>{students.length}</div>
                                            <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>Total Students</div>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--success)' }}>{presentCount}</div>
                                            <div style={{ fontSize: 12, color: '#6B7280' }}>Present (incl. {odCount} OD)</div>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: 24, fontWeight: 700, color: absentCount > 0 ? 'var(--danger)' : 'var(--success)' }}>{absentCount}</div>
                                            <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>Absent</div>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: 24, fontWeight: 700, color:parseFloat(presentPct) >= 75 ? 'var(--success)' : 'var(--danger)' }}>
                                                {presentPct}%
                                            </div>
                                            <div style={{ fontSize: 12, color: '#6B7280' }}>Attendance</div>
                                        </div>
                                    </div>

                                    {/* Breakdown */}
                                    <div style={{ display: 'flex', gap: 12, padding: '8px 12px', background: 'var(--gray-50)', borderRadius: '8px', border: '1px solid var(--gray-200)' }}>
                                        <div style={{ display: 'flex', gap: 12, alignItems: 'center', borderRight: '1px solid var(--gray-300)', paddingRight: 12 }}>
                                            <div style={{ fontSize: '11px', color: 'var(--gray-500)', fontWeight: 600 }}>GENDER:</div>
                                            <div className="badge badge-blue">♂️ {boysCount} Boys</div>
                                            <div className="badge badge-pink">♀️ {girlsCount} Girls</div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>RESIDENCY:</div>
                                            <div className="residency-indicator hosteller">🏨 {hostellerCount} Hostellers</div>
                                            <div className="residency-indicator dayscholar">🏠 {dayScholarCount} Day Scholars</div>
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
                                    <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--gray-500)', marginLeft: 8 }}>
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
                                                <th>Register Number</th>
                                                <th>Student Name</th>
                                                <th>Gender</th>
                                                <th>Residency</th>
                                                <th style={{ textAlign: 'center' }}>Attendance Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {currentStudents.map((student, idx) => {
                                                const globalIdx = indexOfFirstStudent + idx;
                                                const status = attendance[student._id] || 'Absent';
                                                const genderClass = student.gender === 'Male' ? 'row-boy' : student.gender === 'Female' ? 'row-girl' : '';
                                                return (
                                                    <tr
                                                        key={student._id}
                                                        className={`${status === 'Present' ? 'student-present' : status === 'OD' ? 'student-od' : 'student-absent'} ${genderClass}`}
                                                    >
                                                        <td style={{ color: 'var(--gray-400)', fontWeight: 600 }}>{globalIdx + 1}</td>
                                                        <td style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 15, color: 'var(--primary)' }}>{student.registerNumber}</td>
                                                        <td>
                                                            <div style={{ fontWeight: 600, color: 'var(--gray-800)', fontSize: 14 }}>{student.name}</div>
                                                        </td>
                                                        <td>
                                                            <span className={`badge ${student.gender === 'Male' ? 'badge-blue' : 'badge-pink'}`} style={{ fontSize: 11, padding: '4px 10px' }}>
                                                                {student.gender === 'Male' ? '♂️ MALE' : '♀️ FEMALE'}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500, fontSize: 13, color: 'var(--gray-600)' }}>
                                                                {student.residency === 'Hosteller' ? '🏨 Hosteller' : '🏠 Day Scholar'}
                                                            </div>
                                                        </td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <div className="attendance-toggle">
                                                                <button
                                                                    className={`att-btn present ${status === 'Present' ? 'active' : ''}`}
                                                                    onClick={() => toggleAttendance(student._id, 'Present')}
                                                                >
                                                                    <span style={{ fontSize: 16 }}>✓</span> PRESENT
                                                                </button>
                                                                <button
                                                                    className={`att-btn od ${(status === 'OD') ? 'active' : ''}`}
                                                                    onClick={() => toggleAttendance(student._id, 'OD')}
                                                                >
                                                                    <span style={{ fontSize: 16 }}>★</span> OD
                                                                </button>
                                                                <button
                                                                    className={`att-btn absent ${status === 'Absent' ? 'active' : ''}`}
                                                                    onClick={() => toggleAttendance(student._id, 'Absent')}
                                                                >
                                                                    <span style={{ fontSize: 16 }}>✕</span> ABSENT
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination Controls */}
                                {totalPages > 1 && (
                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20, padding: '20px', borderTop: '1px solid var(--gray-100)' }}>
                                        <button 
                                            className="btn btn-ghost" 
                                            disabled={currentPage === 1}
                                            onClick={() => setCurrentPage(prev => prev - 1)}
                                            style={{ borderRadius: 10, padding: '8px 16px', border: '1px solid var(--gray-200)' }}
                                        >
                                            ← Previous
                                        </button>
                                        <span style={{ fontWeight: 700, color: 'var(--gray-500)', fontSize: 14 }}>
                                            Page <span style={{ color: 'var(--accent)' }}>{currentPage}</span> of {totalPages}
                                        </span>
                                        <button 
                                            className="btn btn-ghost" 
                                            disabled={currentPage === totalPages}
                                            onClick={() => setCurrentPage(prev => prev + 1)}
                                            style={{ borderRadius: 10, padding: '8px 16px', border: '1px solid var(--gray-200)' }}
                                        >
                                            Next →
                                        </button>
                                    </div>
                                )}

                                {/* Submit */}
                                <div style={{ padding: '16px 22px', borderTop: '1px solid var(--gray-100)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                                    {submitted ? (
                                        <div style={{ display: 'flex', gap: 10 }}>
                                            <button 
                                                className="btn btn-danger" 
                                                onClick={() => handleExport('pdf')}
                                                disabled={!!exporting}
                                                style={{ borderRadius: 12, padding: '8px 20px', fontWeight: 600 }}
                                            >
                                                {exporting === 'pdf' ? '⌛' : '📄 FULL PDF'}
                                            </button>
                                            <button 
                                                className="btn btn-warning" 
                                                onClick={() => handleExport('pdf', 'absentees')}
                                                disabled={!!exporting}
                                                style={{ borderRadius: 12, padding: '8px 20px', background: 'var(--warning)', color: 'white', border: 'none', fontWeight: 600 }}
                                            >
                                                {exporting === 'pdfabsentees' ? '⌛' : '🚫 ABSENTEES'}
                                            </button>
                                            <button 
                                                className="btn btn-ghost" 
                                                onClick={() => window.location.reload()}
                                                style={{ borderRadius: 12, border: '1px solid var(--gray-200)', padding: '8px 20px' }}
                                            >
                                                NEW SESSION
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            className="btn btn-primary btn-lg"
                                            onClick={handleSubmit}
                                            disabled={submitting}
                                            style={{ borderRadius: 12, padding: '10px 40px', fontWeight: 700 }}
                                        >
                                            {submitting ? (
                                                <><span className="spinner" /> {editMode ? 'Updating...' : 'Submitting...'}</>
                                            ) : (
                                                editMode ? '💾 Update Attendance' : '📤 Submit Attendance'
                                            )}
                                        </button>
                                    )}
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

            <ReasonProofModal 
                isOpen={modalOpen}
                onClose={() => {
                    setModalOpen(false);
                    setActiveStudent(null);
                }}
                onConfirm={handleReasonConfirm}
                studentName={activeStudent?.name}
                initialData={{
                    reason: reasons[activeStudent?.id] || '',
                    status: activeStudent?.status
                }}
            />

            <VoiceControl commands={voiceCommands} active={students.length > 0} />
        </div >
    );
};

export default MarkAttendance;
