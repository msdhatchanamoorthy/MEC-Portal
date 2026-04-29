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
    });

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
            phone: student.phone || '',
            department: student.department?._id || student.department,
            year: student.year.toString(),
            section: student.section?._id || student.section,
            gender: student.gender || 'Male',
            residency: student.residency || 'Day Scholar',
        });
        setShowModal(true);
    };

    const handleAddNewClick = () => {
        setEditingStudent(null);
        setNewStudent({
            name: '', rollNumber: '', registerNumber: '', email: '', phone: '',
            department: user?.department?._id || '',
            year: '1', section: '',
            gender: 'Male', residency: 'Day Scholar',
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
                const data = XLSX.utils.sheet_to_json(ws);

                if (data.length === 0) {
                    toast.error('Excel file is empty');
                    return;
                }

                // Map Excel headers to our model
                const students = data.map(row => {
                    let name = '', regNo = '', rollNo = '', genderVal = '', resVal = '';
                    
                    // Search all keys for matching patterns
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

                    // If rollNo wasn't found specifically, use regNo
                    if (!rollNo) rollNo = regNo;

                    return {
                        name: name || 'Unknown Student',
                        rollNumber: rollNo || 'N/A',
                        registerNumber: regNo || 'N/A',
                        email: row.Email || row.email || '',
                        phone: (row.Phone || row.phone || '').toString(),
                        gender: (genderVal.includes('girl') || genderVal.includes('female') || genderVal === 'f') ? 'Female' : 'Male',
                        residency: (resVal.includes('hostel')) ? 'Hosteller' : 'Day Scholar'
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
                            <h2>🎓 Students</h2>
                            <p>{filteredStudents.length} students found</p>
                        </div>
                        <div className="page-header-right">
                            <input
                                type="text"
                                className="form-control"
                                placeholder="🔍 Search students..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ width: 220 }}
                            />
                            {(user?.role === 'principal' || user?.role === 'hod' || user?.role === 'staff') && (
                                <div style={{ display: 'flex', gap: 10 }}>
                                    <button className="btn btn-outline" onClick={() => document.getElementById('excel-input').click()}>
                                        📤 Bulk Upload (Excel)
                                    </button>
                                    <input 
                                        id="excel-input"
                                        type="file" 
                                        accept=".xlsx, .xls, .csv" 
                                        style={{ display: 'none' }} 
                                        onChange={handleExcelUpload}
                                    />
                                    <button className="btn btn-primary" onClick={handleAddNewClick}>
                                        + Add Student
                                    </button>
                                </div>
                            )}
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
                                            <th>Register No</th>
                                            <th>Name</th>
                                            <th>Year</th>
                                            <th>Gender</th>
                                            <th>Residency</th>
                                            <th>Section</th>
                                            {user?.role === 'principal' && <th>Department</th>}
                                            <th>Email</th>
                                            <th>Phone</th>
                                            {(user?.role === 'principal' || user?.role === 'hod' || user?.role === 'staff') && <th>Actions</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredStudents.map((s, i) => (
                                            <tr key={s._id}>
                                                <td style={{ color: '#9CA3AF' }}>{i + 1}</td>
                                                <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{s.rollNumber}</td>
                                                <td style={{ fontFamily: 'monospace', fontSize: 13, color: '#6B7280' }}>{s.registerNumber}</td>
                                                <td style={{ fontWeight: 500 }}>{s.name}</td>
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
                                                <td style={{ fontSize: 12, color: '#6B7280' }}>{s.email || '—'}</td>
                                                <td style={{ fontSize: 12, color: '#6B7280' }}>{s.phone || '—'}</td>
                                                {(user?.role === 'principal' || user?.role === 'hod' || user?.role === 'staff') && (
                                                    <td>
                                                        <button
                                                            className="btn btn-ghost"
                                                            style={{ fontSize: 12, padding: '4px 8px', color: '#4F46E5' }}
                                                            onClick={() => handleEditClick(s)}
                                                        >
                                                            ✏️ Edit
                                                        </button>
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
                                        <label className="form-label">Email</label>
                                        <input type="email" className="form-control" placeholder="student@email.com"
                                            value={newStudent.email} onChange={(e) => setNewStudent((p) => ({ ...p, email: e.target.value }))} />
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
        </div>
    );
};

export default StudentsPage;
