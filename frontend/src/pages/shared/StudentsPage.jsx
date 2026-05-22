import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

const StudentsPage = () => {
    const { user } = useAuth();
    const [students, setStudents] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingStudent, setEditingStudent] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [filters, setFilters] = useState({
        departmentId: user?.role === 'hod' ? user?.department?._id || '' : '',
        year: '',
        sectionId: '',
    });

    const [newStudent, setNewStudent] = useState({
        name: '', rollNumber: '', registerNumber: '', email: '', phone: '',
        department: user?.department?._id || '',
        year: '1', section: '',
        gender: 'Male', residency: 'Day Scholar',
        personalEmail: '', internalMarks: 0,
        tenthPercentage: 0, twelfthPercentage: 0, diplomaPercentage: 0, cgpa: 0, currentArrear: 0, historyOfArrear: 0,
        dob: '', bloodGroup: '', college: 'Muthayammal Engineering College', firstGraduate: 'No',
        address: '', nativePlace: '', nativeState: '', twelfthMedium: 'English', placementStatus: 'Not Placed',
    });

    const [viewingStudent, setViewingStudent] = useState(null);
    const [showViewModal, setShowViewModal] = useState(false);

    useEffect(() => {
        if (user?.role === 'principal') fetchDepartments();
        fetchSections();
        fetchStudents();
    }, []);

    const fetchDepartments = async () => {
        try {
            const res = await api.get('/admin/departments');
            setDepartments(res.data.data || []);
        } catch { }
    };

    const fetchSections = async () => {
        try {
            const params = new URLSearchParams();
            if (filters.departmentId) params.append('departmentId', filters.departmentId);
            if (filters.year) params.append('year', filters.year);
            const res = await api.get(`/admin/sections?${params}`);
            setSections(res.data.data || []);
        } catch { }
    };

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.departmentId) params.append('departmentId', filters.departmentId);
            if (filters.year) params.append('year', filters.year);
            if (filters.sectionId) params.append('sectionId', filters.sectionId);
            const res = await api.get(`/students?${params}`);
            setStudents(res.data.data || []);
        } catch {
            toast.error('Failed to load students');
        } finally {
            setLoading(false);
        }
    };

    const handleAddOrEditStudent = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...newStudent,
                year: parseInt(newStudent.year),
                section: newStudent.section,
            };

            if (editingStudent) {
                await api.put(`/students/${editingStudent._id}`, payload);
                toast.success('Student updated successfully!');
            } else {
                await api.post('/students', payload);
                toast.success('Student added successfully!');
            }
            setShowModal(false);
            setEditingStudent(null);
            fetchStudents();
        } catch (err) {
            toast.error(err.response?.data?.message || `Failed to ${editingStudent ? 'update' : 'add'} student`);
        }
    };

    const handleEditClick = (student) => {
        setEditingStudent(student);
        setNewStudent({
            name: student.name,
            rollNumber: student.rollNumber,
            registerNumber: student.registerNumber,
            email: student.email || '',
            personalEmail: student.personalEmail || '',
            internalMarks: student.internalMarks || 0,
            phone: student.phone || '',
            department: student.department?._id || student.department,
            year: student.year.toString(),
            section: student.section?._id || student.section,
            gender: student.gender || 'Male',
            residency: student.residency || 'Day Scholar',
            tenthPercentage: student.tenthPercentage || 0,
            twelfthPercentage: student.twelfthPercentage || 0,
            diplomaPercentage: student.diplomaPercentage || 0,
            cgpa: student.cgpa || 0,
            currentArrear: student.currentArrear || 0,
            historyOfArrear: student.historyOfArrear || 0,
            dob: student.dob || '',
            bloodGroup: student.bloodGroup || '',
            college: student.college || 'Muthayammal Engineering College',
            firstGraduate: student.firstGraduate || 'No',
            address: student.address || '',
            nativePlace: student.nativePlace || '',
            nativeState: student.nativeState || '',
            twelfthMedium: student.twelfthMedium || 'English',
            placementStatus: student.placementStatus || 'Not Placed',
        });
        setShowModal(true);
    };

    const handleAddNewClick = () => {
        setEditingStudent(null);
        setNewStudent({
            name: '', rollNumber: '', registerNumber: '', email: '', personalEmail: '', internalMarks: 0, phone: '',
            department: user?.department?._id || '',
            year: '1', section: '',
            gender: 'Male', residency: 'Day Scholar',
            tenthPercentage: 0, twelfthPercentage: 0, diplomaPercentage: 0, cgpa: 0, currentArrear: 0, historyOfArrear: 0,
            dob: '', bloodGroup: '', college: 'Muthayammal Engineering College', firstGraduate: 'No',
            address: '', nativePlace: '', nativeState: '', twelfthMedium: 'English', placementStatus: 'Not Placed',
        });
        setShowModal(true);
    };

    
    const handleToggleGender = async (student) => {
        try {
            const newGender = student.gender === 'Male' ? 'Female' : 'Male';
            await api.put(`/students/${student._id}`, { gender: newGender });
            toast.success(`${student.name} is now marked as a ${newGender === 'Male' ? 'Boy' : 'Girl'}`);
            fetchStudents();
        } catch (err) {
            toast.error('Failed to update gender');
        }
    };

    const handleToggleResidency = async (student) => {
        try {
            const newRes = student.residency === 'Hosteller' ? 'Day Scholar' : 'Hosteller';
            await api.put(`/students/${student._id}`, { residency: newRes });
            toast.success(`${student.name} is now a ${newRes}`);
            fetchStudents();
        } catch (err) {
            toast.error('Failed to update residency');
        }
    };

    const handleExcelUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!filters.departmentId || !filters.year || !filters.sectionId) {
            toast.error('Please select Department, Year, and Section first to specify where to upload these students.');
            e.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const sheetRows = XLSX.utils.sheet_to_json(ws, { header: 1 });

                if (sheetRows.length <= 1) {
                    toast.error('Excel file is empty');
                    return;
                }

                // Helper to safely get row value by 0-indexed column
                const getVal = (row, idx) => (row && row[idx] !== undefined && row[idx] !== null) ? row[idx].toString().trim() : '';

                const parsePercentage = (val) => {
                    let num = parseFloat(val);
                    if (isNaN(num)) return null;
                    // Excel percentage: 0.7233 is 72.33%, 1.0 is 100%
                    if (num > 0 && num <= 1.0) {
                        return parseFloat((num * 100).toFixed(2));
                    }
                    return num;
                };

                // Map Excel rows to our model by column index
                // Skip the first row (headers) and any row that starts with 'S.No' or where register number is empty
                const students = sheetRows.slice(1)
                    .filter(row => {
                        if (!row || row.length === 0) return false;
                        const reg = getVal(row, 1);
                        if (!reg || reg.toLowerCase() === 'register number') return false;
                        return true;
                    })
                    .map(row => {
                        const regNo = getVal(row, 1);
                        const name = getVal(row, 2);
                        const dept = getVal(row, 3);
                        const tenth = parsePercentage(getVal(row, 4));
                        const twelfth = parsePercentage(getVal(row, 5));
                        const diploma = parsePercentage(getVal(row, 6));
                        const cgpaVal = parseFloat(getVal(row, 7)) || 0;
                        const currArrear = parseInt(getVal(row, 8)) || 0;
                        const histArrear = parseInt(getVal(row, 9)) || 0;
                        const emailVal = getVal(row, 10);
                        const phoneVal = getVal(row, 11);
                        const dobVal = getVal(row, 12);
                        const genderVal = getVal(row, 13).toLowerCase();
                        const blood = getVal(row, 14);
                        const coll = getVal(row, 15) || 'Muthayammal Engineering College';
                        const residencyVal = getVal(row, 16).toLowerCase();
                        const firstGrad = getVal(row, 17) || 'No';
                        const addr = getVal(row, 18);
                        const nativePl = getVal(row, 19);
                        const nativeSt = getVal(row, 20);
                        const medium = getVal(row, 21) || 'English';
                        const placement = getVal(row, 22) || 'Not Placed';
                        const placementCompany = getVal(row, 23);
                        const placementRole = getVal(row, 24);
                        const placementType = getVal(row, 25);
                        const placementPackage = getVal(row, 26);
                        const placementDate = getVal(row, 27);

                        return {
                            name: name || 'Unknown Student',
                            rollNumber: regNo || 'N/A',
                            registerNumber: regNo || 'N/A',
                            email: emailVal || `${regNo.toLowerCase()}@student.mec.edu.in`,
                            personalEmail: emailVal || '',
                            phone: phoneVal || '',
                            gender: (genderVal.includes('girl') || genderVal.includes('female') || genderVal === 'f') ? 'Female' : 'Male',
                            residency: (residencyVal.includes('hostel') || residencyVal.includes('hosteller')) ? 'Hosteller' : 'Day Scholar',
                            
                            tenthPercentage: tenth,
                            twelfthPercentage: twelfth,
                            diplomaPercentage: diploma,
                            cgpa: cgpaVal,
                            currentArrear: currArrear,
                            historyOfArrear: histArrear,
                            dob: dobVal,
                            bloodGroup: blood,
                            college: coll,
                            firstGraduate: firstGrad,
                            address: addr,
                            nativePlace: nativePl,
                            nativeState: nativeSt,
                            twelfthMedium: medium,
                            placementStatus: placement,
                            placementCompany: placementCompany || '',
                            placementRole: placementRole || '',
                            placementType: placementType || '',
                            placementPackage: placementPackage || '',
                            placementDate: placementDate || ''
                        };
                    });

                setLoading(true);
                await api.post('/students/upload-excel', {
                    students,
                    department: filters.departmentId,
                    year: filters.year,
                    section: filters.sectionId
                });

                toast.success(`Successfully uploaded ${students.length} students!`);
                fetchStudents();
            } catch (err) {
                toast.error(err.response?.data?.message || 'Error parsing or uploading Excel');
            } finally {
                setLoading(false);
                e.target.value = '';
            }
        };
        reader.readAsBinaryString(file);
    };

    const filteredStudents = students.filter((s) =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.rollNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.registerNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <Topbar title="Students" subtitle="View and manage student records" />
                <div className="page-content">

                    <div className="page-header">
                        <div className="page-header-left">
                            <h2 style={{ fontSize: 24, fontWeight: 900, color: 'var(--primary-dark)', letterSpacing: -0.5 }}>🎓 Student Management</h2>
                            <p style={{ fontSize: 13, color: 'var(--gray-600)', fontWeight: 600 }}>Manage and monitor student records across departments</p>
                        </div>
                        <div className="page-header-right" style={{ display: 'flex', gap: 12 }}>
                            <div className="search-wrapper" style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Search by name, roll, or reg no..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{ width: 280, borderRadius: 12, paddingLeft: 40 }}
                                />
                                <span style={{ position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
                            </div>
                            {(user?.role === 'principal' || user?.role === 'hod' || user?.role === 'staff') && (
                                <div style={{ display: 'flex', gap: 10 }}>
                                    <button className="btn btn-outline" onClick={() => document.getElementById('excel-input').click()} style={{ borderRadius: 12, fontWeight: 700 }}>
                                        📤 Import
                                    </button>
                                    <input 
                                        id="excel-input"
                                        type="file" 
                                        accept=".xlsx, .xls, .csv" 
                                        style={{ display: 'none' }} 
                                        onChange={handleExcelUpload}
                                    />
                                    <button className="btn btn-primary" onClick={handleAddNewClick} style={{ borderRadius: 12, fontWeight: 700, boxShadow: '0 4px 12px var(--accent-glow)' }}>
                                        + Add New
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Stats Grid */}
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(4, 1fr)', 
                        gap: 20, 
                        marginBottom: 24 
                    }}>
                        <div className="stat-card" style={{ padding: '20px', borderRadius: 20, background: 'var(--accent-gradient)', color: 'white', border: 'none' }}>
                            <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.8, textTransform: 'uppercase', letterSpacing: 1 }}>Total Enrollment</div>
                            <div style={{ fontSize: 28, fontWeight: 900, marginTop: 4 }}>{students.length}</div>
                            <div style={{ fontSize: 10, marginTop: 4, opacity: 0.7 }}>Active Students</div>
                        </div>
                        <div className="stat-card" style={{ padding: '20px', borderRadius: 20, background: 'white', border: '1px solid var(--gray-200)' }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: 1 }}>Gender Mix</div>
                            <div style={{ display: 'flex', gap: 15, marginTop: 8 }}>
                                <div>
                                    <span style={{ fontSize: 18, fontWeight: 900, color: '#3B82F6' }}>{students.filter(s => s.gender === 'Male').length}</span>
                                    <span style={{ fontSize: 10, color: 'var(--gray-400)', marginLeft: 4 }}>Boys</span>
                                </div>
                                <div>
                                    <span style={{ fontSize: 18, fontWeight: 900, color: '#EC4899' }}>{students.filter(s => s.gender === 'Female').length}</span>
                                    <span style={{ fontSize: 10, color: 'var(--gray-400)', marginLeft: 4 }}>Girls</span>
                                </div>
                            </div>
                        </div>
                        <div className="stat-card" style={{ padding: '20px', borderRadius: 20, background: 'white', border: '1px solid var(--gray-200)' }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: 1 }}>Residency</div>
                            <div style={{ display: 'flex', gap: 15, marginTop: 8 }}>
                                <div>
                                    <span style={{ fontSize: 18, fontWeight: 900, color: 'var(--primary-dark)' }}>{students.filter(s => s.residency === 'Day Scholar').length}</span>
                                    <span style={{ fontSize: 10, color: 'var(--gray-400)', marginLeft: 4 }}>Day</span>
                                </div>
                                <div>
                                    <span style={{ fontSize: 18, fontWeight: 900, color: '#8B5CF6' }}>{students.filter(s => s.residency === 'Hosteller').length}</span>
                                    <span style={{ fontSize: 10, color: 'var(--gray-400)', marginLeft: 4 }}>Hostel</span>
                                </div>
                            </div>
                        </div>
                        <div className="stat-card" style={{ padding: '20px', borderRadius: 20, background: 'white', border: '1px solid var(--gray-200)' }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: 1 }}>Average Marks</div>
                            <div style={{ fontSize: 24, fontWeight: 900, marginTop: 4, color: 'var(--success)' }}>
                                {(students.reduce((acc, s) => acc + (s.internalMarks || 0), 0) / (students.length || 1)).toFixed(1)}
                            </div>
                            <div style={{ fontSize: 10, marginTop: 4, color: 'var(--gray-400)' }}>Section Performance</div>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="card" style={{ marginBottom: 20 }}>
                        <div className="filters-bar">
                            {user?.role === 'principal' && (
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label">Department</label>
                                    <select className="form-control" value={filters.departmentId}
                                        onChange={(e) => setFilters((p) => ({ ...p, departmentId: e.target.value }))}>
                                        <option value="">All Departments</option>
                                        {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                                    </select>
                                </div>
                            )}
                            <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label">Year</label>
                                <select className="form-control" value={filters.year}
                                    onChange={(e) => setFilters((p) => ({ ...p, year: e.target.value }))}>
                                    <option value="">All Years</option>
                                    {[1, 2, 3, 4].map((y) => <option key={y} value={y}>{y}{['st', 'nd', 'rd', 'th'][y - 1]} Year</option>)}
                                </select>
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label">Section</label>
                                <select className="form-control" value={filters.sectionId}
                                    onChange={(e) => setFilters((p) => ({ ...p, sectionId: e.target.value }))}>
                                    <option value="">All Sections</option>
                                    {sections.map((s) => (
                                        <option key={s._id} value={s._id}>
                                            {s.year}{['st', 'nd', 'rd', 'th'][s.year - 1]} Yr — Sec {s.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                                <button className="btn btn-primary" onClick={fetchStudents} disabled={loading}>
                                    {loading ? '...' : '🔍 Search'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Students Table */}
                    <div className="card">
                        <div className="card-header">
                            <div className="card-title">👥 Student List</div>
                            <span className="badge badge-info">{filteredStudents.length}</span>
                        </div>
                        {loading ? (
                            <div className="loading-fullscreen">
                                <div className="spinner spinner-dark" />
                            </div>
                        ) : filteredStudents.length > 0 ? (
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Roll Number</th>
                                            <th>Name</th>
                                            <th>Year</th>
                                            <th>Gender</th>
                                            <th>Residency</th>
                                            <th>Section</th>
                                            {user?.role === 'principal' && <th>Department</th>}
                                            <th>Personal Email</th>
                                            <th>Marks</th>
                                            <th>Phone</th>
                                            {(user?.role === 'principal' || user?.role === 'hod' || user?.role === 'staff') && <th>Actions</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredStudents.map((s, i) => (
                                            <tr key={s._id}>
                                                <td style={{ color: '#9CA3AF' }}>{i + 1}</td>
                                                <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{s.rollNumber}</td>
                                                <td 
                                                    style={{ fontWeight: 600, color: 'var(--primary-dark)', cursor: 'pointer', transition: 'all 0.2s' }}
                                                    onClick={() => { setViewingStudent(s); setShowViewModal(true); }}
                                                    onMouseOver={(e) => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.textDecoration = 'underline'; }}
                                                    onMouseOut={(e) => { e.currentTarget.style.color = 'var(--primary-dark)'; e.currentTarget.style.textDecoration = 'none'; }}
                                                    title="Click to view full student profile details"
                                                >
                                                    👤 {s.name}
                                                </td>
                                                <td>{s.year}{['st', 'nd', 'rd', 'th'][s.year - 1]} Yr</td>
                                                <td>
                                                    <span 
                                                        className={`badge ${s.gender === 'Male' ? 'badge-blue' : s.gender === 'Female' ? 'badge-pink' : 'badge-gray'}`} 
                                                        style={{ fontSize: 11, cursor: 'pointer' }}
                                                        onClick={() => handleToggleGender(s)}
                                                        title="Click to toggle gender"
                                                    >
                                                        {s.gender === 'Male' ? '♂️ Boy' : s.gender === 'Female' ? '♀️ Girl' : '👤 ' + s.gender}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span 
                                                        className={`badge ${s.residency === 'Hosteller' ? 'badge-purple' : 'badge-info'}`} 
                                                        style={{ fontSize: 11, cursor: 'pointer' }}
                                                        onClick={() => handleToggleResidency(s)}
                                                        title="Click to toggle residency"
                                                    >
                                                        {s.residency === 'Hosteller' ? '🏨 Hosteller' : '🏠 Day Scholar'}
                                                    </span>
                                                </td>
                                                <td><span className="badge badge-gray">Sec {s.section?.name}</span></td>
                                                {user?.role === 'principal' && <td style={{ fontSize: 12 }}>{s.department?.shortName}</td>}
                                                <td style={{ fontSize: 11, color: 'var(--primary-dark)', fontWeight: 600 }}>{s.personalEmail || '—'}</td>
                                                <td><span className="badge badge-success" style={{ fontSize: 11, fontWeight: 800 }}>{s.internalMarks || 0}</span></td>
                                                <td style={{ fontSize: 11, color: '#6B7280' }}>{s.phone || '—'}</td>
                                                {(user?.role === 'principal' || user?.role === 'hod' || user?.role === 'staff') && (
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            <button
                                                                className="btn btn-ghost"
                                                                style={{ fontSize: 12, padding: '4px 8px', color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '8px' }}
                                                                onClick={() => { setViewingStudent(s); setShowViewModal(true); }}
                                                            >
                                                                👁️ Profile
                                                            </button>
                                                            <button
                                                                className="btn btn-ghost"
                                                                style={{ fontSize: 12, padding: '4px 8px', color: '#4F46E5', display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid rgba(79, 70, 229, 0.2)', borderRadius: '8px' }}
                                                                onClick={() => handleEditClick(s)}
                                                            >
                                                                ✏️ Edit
                                                            </button>
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="empty-state">
                                <div className="empty-state-icon">🎓</div>
                                <h3>No Students Found</h3>
                                <p>Apply filters and search to find students.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Add/Edit Student Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-title">{editingStudent ? '✏️ Edit Student' : '➕ Add New Student'}</div>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleAddOrEditStudent}>
                            <div className="modal-body">
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label form-required">Student Name</label>
                                        <input className="form-control" required placeholder="Full Name"
                                            value={newStudent.name} onChange={(e) => setNewStudent((p) => ({ ...p, name: e.target.value }))} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label form-required">Roll Number</label>
                                        <input className="form-control" required placeholder="e.g. CSE1A001"
                                            value={newStudent.rollNumber} onChange={(e) => setNewStudent((p) => ({ ...p, rollNumber: e.target.value }))} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label form-required">Register Number</label>
                                        <input className="form-control" required placeholder="e.g. 23XXXXX"
                                            value={newStudent.registerNumber} onChange={(e) => setNewStudent((p) => ({ ...p, registerNumber: e.target.value }))} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Personal Email (Required for Reset)</label>
                                        <input type="email" className="form-control" placeholder="personal@gmail.com"
                                            value={newStudent.personalEmail} onChange={(e) => setNewStudent((p) => ({ ...p, personalEmail: e.target.value }))} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Internal Marks</label>
                                        <input type="number" className="form-control" placeholder="e.g. 85"
                                            value={newStudent.internalMarks} onChange={(e) => setNewStudent((p) => ({ ...p, internalMarks: e.target.value }))} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Parent's Phone</label>
                                        <input type="tel" className="form-control" placeholder="+919876543210"
                                            value={newStudent.phone} onChange={(e) => setNewStudent((p) => ({ ...p, phone: e.target.value }))} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label form-required">Year</label>
                                        <select className="form-control" value={newStudent.year}
                                            onChange={(e) => setNewStudent((p) => ({ ...p, year: e.target.value }))}>
                                            {[1, 2, 3, 4].map((y) => <option key={y} value={y}>{y}{['st', 'nd', 'rd', 'th'][y - 1]} Year</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label form-required">Section</label>
                                        <select className="form-control" value={newStudent.section}
                                            onChange={(e) => setNewStudent((p) => ({ ...p, section: e.target.value }))}>
                                            <option value="">Select Section</option>
                                            {sections.filter((s) => s.year === parseInt(newStudent.year)).map((s) => (
                                                <option key={s._id} value={s._id}>Section {s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label form-required">Gender</label>
                                        <select className="form-control" value={newStudent.gender}
                                            onChange={(e) => setNewStudent((p) => ({ ...p, gender: e.target.value }))}>
                                            <option value="Male">Male (Boy)</option>
                                            <option value="Female">Female (Girl)</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label form-required">Residency</label>
                                        <select className="form-control" value={newStudent.residency}
                                            onChange={(e) => setNewStudent((p) => ({ ...p, residency: e.target.value }))}>
                                            <option value="Day Scholar">Day Scholar</option>
                                            <option value="Hosteller">Hosteller</option>
                                        </select>
                                    </div>

                                    {/* New Academic Profile Fields */}
                                    <div className="form-group">
                                        <label className="form-label">10th %</label>
                                        <input type="number" step="0.01" className="form-control" placeholder="e.g. 92.5"
                                            value={newStudent.tenthPercentage} onChange={(e) => setNewStudent((p) => ({ ...p, tenthPercentage: parseFloat(e.target.value) || 0 }))} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">12th %</label>
                                        <input type="number" step="0.01" className="form-control" placeholder="e.g. 88.0"
                                            value={newStudent.twelfthPercentage} onChange={(e) => setNewStudent((p) => ({ ...p, twelfthPercentage: parseFloat(e.target.value) || 0 }))} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Diploma %</label>
                                        <input type="number" step="0.01" className="form-control" placeholder="e.g. 82.3"
                                            value={newStudent.diplomaPercentage} onChange={(e) => setNewStudent((p) => ({ ...p, diplomaPercentage: parseFloat(e.target.value) || 0 }))} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">12th Medium</label>
                                        <select className="form-control" value={newStudent.twelfthMedium}
                                            onChange={(e) => setNewStudent((p) => ({ ...p, twelfthMedium: e.target.value }))}>
                                            <option value="English">English</option>
                                            <option value="Tamil">Tamil</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">CGPA</label>
                                        <input type="number" step="0.01" className="form-control" placeholder="e.g. 8.45"
                                            value={newStudent.cgpa} onChange={(e) => setNewStudent((p) => ({ ...p, cgpa: parseFloat(e.target.value) || 0 }))} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Current Arrear</label>
                                        <input type="number" className="form-control" placeholder="e.g. 0"
                                            value={newStudent.currentArrear} onChange={(e) => setNewStudent((p) => ({ ...p, currentArrear: parseInt(e.target.value) || 0 }))} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">History of Arrear</label>
                                        <input type="number" className="form-control" placeholder="e.g. 0"
                                            value={newStudent.historyOfArrear} onChange={(e) => setNewStudent((p) => ({ ...p, historyOfArrear: parseInt(e.target.value) || 0 }))} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Placement Status</label>
                                        <select className="form-control" value={newStudent.placementStatus}
                                            onChange={(e) => setNewStudent((p) => ({ ...p, placementStatus: e.target.value }))}>
                                            <option value="Not Placed">Not Placed</option>
                                            <option value="Placed">Placed</option>
                                            <option value="Eligible">Eligible</option>
                                            <option value="Not Eligible">Not Eligible</option>
                                        </select>
                                    </div>

                                    {/* Personal Profile Fields */}
                                    <div className="form-group">
                                        <label className="form-label">Date of Birth</label>
                                        <input type="text" className="form-control" placeholder="DD-MM-YYYY or YYYY-MM-DD"
                                            value={newStudent.dob} onChange={(e) => setNewStudent((p) => ({ ...p, dob: e.target.value }))} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Blood Group</label>
                                        <input className="form-control" placeholder="e.g. O+ve"
                                            value={newStudent.bloodGroup} onChange={(e) => setNewStudent((p) => ({ ...p, bloodGroup: e.target.value }))} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">First Graduate</label>
                                        <select className="form-control" value={newStudent.firstGraduate}
                                            onChange={(e) => setNewStudent((p) => ({ ...p, firstGraduate: e.target.value }))}>
                                            <option value="No">No</option>
                                            <option value="Yes">Yes</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">College</label>
                                        <input className="form-control" placeholder="College Name"
                                            value={newStudent.college} onChange={(e) => setNewStudent((p) => ({ ...p, college: e.target.value }))} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Native Place</label>
                                        <input className="form-control" placeholder="e.g. Salem"
                                            value={newStudent.nativePlace} onChange={(e) => setNewStudent((p) => ({ ...p, nativePlace: e.target.value }))} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Native State</label>
                                        <input className="form-control" placeholder="e.g. Tamil Nadu"
                                            value={newStudent.nativeState} onChange={(e) => setNewStudent((p) => ({ ...p, nativeState: e.target.value }))} />
                                    </div>
                                    <div className="form-group" style={{ flex: '1 1 100%' }}>
                                        <label className="form-label">Address</label>
                                        <textarea className="form-control" rows="2" placeholder="Residential Address..." style={{ width: '100%', resize: 'none' }}
                                            value={newStudent.address} onChange={(e) => setNewStudent((p) => ({ ...p, address: e.target.value }))} />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">{editingStudent ? 'Update Details' : 'Add Student'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Detailed Student Profile Modal */}
            {showViewModal && viewingStudent && (
                <div className="modal-overlay" onClick={() => { setShowViewModal(false); setViewingStudent(null); }} style={{ backdropFilter: 'blur(12px)', background: 'rgba(15, 23, 42, 0.4)', zIndex: 9999 }}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{
                        maxWidth: '850px',
                        width: '95%',
                        background: 'rgba(255, 255, 255, 0.85)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        borderRadius: '24px',
                        boxShadow: '0 30px 60px rgba(0, 0, 0, 0.15)',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        maxHeight: '90vh'
                    }}>
                        <div className="modal-header" style={{
                            background: 'var(--accent-gradient)',
                            color: 'white',
                            border: 'none',
                            padding: '24px 32px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            position: 'relative'
                        }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: 'white', letterSpacing: '-0.02em' }}>🎓 Student Profile details</h3>
                                <p style={{ margin: '4px 0 0', opacity: 0.9, fontSize: '13px', fontWeight: 500 }}>Comprehensive academic and personal performance overview</p>
                            </div>
                            <button className="modal-close" onClick={() => { setShowViewModal(false); setViewingStudent(null); }} style={{ color: 'white', fontSize: '28px', opacity: 0.8, background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
                        </div>
                        
                        <div className="modal-body" style={{ padding: '32px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
                            
                            {/* Header Section: Avatar, Name, Badges */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '24px',
                                background: 'rgba(255, 255, 255, 0.5)',
                                padding: '20px',
                                borderRadius: '20px',
                                border: '1px solid rgba(255,255,255,0.5)',
                                boxShadow: '0 8px 32px rgba(31, 38, 135, 0.04)'
                            }}>
                                <div style={{
                                    width: '80px',
                                    height: '80px',
                                    borderRadius: '20px',
                                    background: 'var(--accent-gradient)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '32px',
                                    color: 'white',
                                    boxShadow: '0 10px 25px rgba(99, 102, 241, 0.3)'
                                }}>
                                    {viewingStudent.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '👤'}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: 'var(--primary-dark)', letterSpacing: '-0.02em' }}>{viewingStudent.name}</h2>
                                        <span className="badge badge-success" style={{ fontSize: '12px', fontWeight: 800, padding: '4px 12px', borderRadius: '12px', background: viewingStudent.placementStatus === 'Placed' ? '#10B981' : '#F59E0B', color: 'white' }}>
                                            {viewingStudent.placementStatus || 'Not Placed'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                        <span style={{ fontFamily: 'monospace', fontSize: '12px', background: '#F3F4F6', color: '#374151', padding: '4px 10px', borderRadius: '8px', fontWeight: 600 }}>
                                            Roll: {viewingStudent.rollNumber}
                                        </span>
                                        <span style={{ fontFamily: 'monospace', fontSize: '12px', background: '#F3F4F6', color: '#374151', padding: '4px 10px', borderRadius: '8px', fontWeight: 600 }}>
                                            Reg: {viewingStudent.registerNumber}
                                        </span>
                                        <span className="badge badge-info" style={{ fontSize: '11px', padding: '4px 8px' }}>
                                            {viewingStudent.year}{['st', 'nd', 'rd', 'th'][viewingStudent.year - 1]} Yr • Sec {viewingStudent.section?.name || 'A'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Info Grids */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
                                
                                {/* Block 1: 🎓 Academic Track */}
                                <div style={{
                                    background: 'rgba(255, 255, 255, 0.4)',
                                    borderRadius: '20px',
                                    border: '1px solid rgba(255,255,255,0.4)',
                                    padding: '20px',
                                    boxShadow: '0 8px 32px rgba(31, 38, 135, 0.03)'
                                }}>
                                    <h4 style={{ margin: '0 0 16px', fontSize: '15px', color: 'var(--accent)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span>🎓</span> Academic Merits & standing
                                    </h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                        <div style={{ background: 'white', padding: '12px', borderRadius: '12px', border: '1px solid #F3F4F6' }}>
                                            <span style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>10th Score</span>
                                            <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary-dark)' }}>{viewingStudent.tenthPercentage ? `${viewingStudent.tenthPercentage}%` : '—'}</span>
                                        </div>
                                        <div style={{ background: 'white', padding: '12px', borderRadius: '12px', border: '1px solid #F3F4F6' }}>
                                            <span style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>12th Score</span>
                                            <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary-dark)' }}>{viewingStudent.twelfthPercentage ? `${viewingStudent.twelfthPercentage}%` : '—'}</span>
                                        </div>
                                        <div style={{ background: 'white', padding: '12px', borderRadius: '12px', border: '1px solid #F3F4F6' }}>
                                            <span style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Diploma Score</span>
                                            <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary-dark)' }}>{viewingStudent.diplomaPercentage ? `${viewingStudent.diplomaPercentage}%` : '—'}</span>
                                        </div>
                                        <div style={{ background: 'white', padding: '12px', borderRadius: '12px', border: '1px solid #F3F4F6' }}>
                                            <span style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>12th Medium</span>
                                            <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary-dark)' }}>{viewingStudent.twelfthMedium || 'English'}</span>
                                        </div>
                                        <div style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(168, 85, 247, 0.05) 100%)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.1)', gridColumn: 'span 2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 800, display: 'block', textTransform: 'uppercase' }}>Current CGPA</span>
                                                <span style={{ fontSize: '24px', fontWeight: 900, color: 'var(--primary-dark)' }}>{viewingStudent.cgpa ? viewingStudent.cgpa.toFixed(2) : '0.00'}</span>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <span style={{ fontSize: '10px', color: '#6B7280', fontWeight: 700, display: 'block' }}>ARREARS (CURR / HIST)</span>
                                                <span style={{ fontSize: '18px', fontWeight: 800, color: viewingStudent.currentArrear > 0 ? 'var(--danger)' : 'var(--success)' }}>
                                                    {viewingStudent.currentArrear || 0} / {viewingStudent.historyOfArrear || 0}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Block 2: 👤 Personal Profile */}
                                <div style={{
                                    background: 'rgba(255, 255, 255, 0.4)',
                                    borderRadius: '20px',
                                    border: '1px solid rgba(255,255,255,0.4)',
                                    padding: '20px',
                                    boxShadow: '0 8px 32px rgba(31, 38, 135, 0.03)'
                                }}>
                                    <h4 style={{ margin: '0 0 16px', fontSize: '15px', color: 'var(--accent)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span>👤</span> Personal Biography
                                    </h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'white', borderRadius: '10px', border: '1px solid #F3F4F6' }}>
                                            <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600 }}>Date of Birth</span>
                                            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary-dark)' }}>{viewingStudent.dob || '—'}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'white', borderRadius: '10px', border: '1px solid #F3F4F6' }}>
                                            <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600 }}>Gender</span>
                                            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary-dark)' }}>{viewingStudent.gender}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'white', borderRadius: '10px', border: '1px solid #F3F4F6' }}>
                                            <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600 }}>Blood Group</span>
                                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#EF4444', display: 'flex', alignItems: 'center', gap: '4px' }}>🩸 {viewingStudent.bloodGroup || '—'}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'white', borderRadius: '10px', border: '1px solid #F3F4F6' }}>
                                            <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600 }}>First Graduate</span>
                                            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary-dark)' }}>{viewingStudent.firstGraduate || 'No'}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'white', borderRadius: '10px', border: '1px solid #F3F4F6' }}>
                                            <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600 }}>Residency Type</span>
                                            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary-dark)' }}>{viewingStudent.residency}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Block 3: 🗺️ Contact & Native info */}
                                <div style={{
                                    background: 'rgba(255, 255, 255, 0.4)',
                                    borderRadius: '20px',
                                    border: '1px solid rgba(255,255,255,0.4)',
                                    padding: '20px',
                                    boxShadow: '0 8px 32px rgba(31, 38, 135, 0.03)',
                                    gridColumn: 'span 2'
                                }}>
                                    <h4 style={{ margin: '0 0 16px', fontSize: '15px', color: 'var(--accent)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span>📞</span> Contact details & residency placement
                                    </h4>
                                    
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            <div style={{ background: 'white', padding: '12px', borderRadius: '12px', border: '1px solid #F3F4F6' }}>
                                                <span style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Institutional Email</span>
                                                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary-dark)', wordBreak: 'break-all' }}>{viewingStudent.email || '—'}</span>
                                            </div>
                                            <div style={{ background: 'white', padding: '12px', borderRadius: '12px', border: '1px solid #F3F4F6' }}>
                                                <span style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Personal Email ID</span>
                                                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary-dark)', wordBreak: 'break-all' }}>{viewingStudent.personalEmail || '—'}</span>
                                            </div>
                                            <div style={{ background: 'white', padding: '12px', borderRadius: '12px', border: '1px solid #F3F4F6' }}>
                                                <span style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Parent's Contact</span>
                                                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary-dark)' }}>📞 {viewingStudent.phone || '—'}</span>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                                <div style={{ background: 'white', padding: '12px', borderRadius: '12px', border: '1px solid #F3F4F6' }}>
                                                    <span style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Native Place</span>
                                                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary-dark)' }}>{viewingStudent.nativePlace || '—'}</span>
                                                </div>
                                                <div style={{ background: 'white', padding: '12px', borderRadius: '12px', border: '1px solid #F3F4F6' }}>
                                                    <span style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Native State</span>
                                                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary-dark)' }}>{viewingStudent.nativeState || '—'}</span>
                                                </div>
                                            </div>
                                            <div style={{ background: 'white', padding: '12px', borderRadius: '12px', border: '1px solid #F3F4F6', flex: 1 }}>
                                                <span style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Residential Address</span>
                                                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary-dark)', display: 'block', marginTop: '4px', lineHeight: 1.4 }}>{viewingStudent.address || '—'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', padding: '12px 16px', background: 'rgba(243, 244, 246, 0.5)', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
                                        <span style={{ fontSize: '11px', color: '#6B7280', fontWeight: 700 }}>🏫 REGISTERED INSTITUTION</span>
                                        <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--primary-dark)' }}>{viewingStudent.college || 'Muthayammal Engineering College'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer" style={{ borderTop: '1px solid rgba(0,0,0,0.05)', padding: '16px 32px', background: '#F9FAFB', display: 'flex', justifyContent: 'flex-end' }}>
                            <button className="btn btn-primary" onClick={() => { setShowViewModal(false); setViewingStudent(null); }} style={{ borderRadius: '12px', padding: '10px 24px', fontWeight: 700 }}>
                                Done & Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentsPage;
