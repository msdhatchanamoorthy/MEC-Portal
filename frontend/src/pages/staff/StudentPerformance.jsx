import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import api from '../../services/api';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { useAuth } from '../../contexts/AuthContext';

const StudentPerformance = () => {
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [studentMarks, setStudentMarks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);
    
    // Upload state
    const [uploading, setUploading] = useState(false);
    const [subject, setSubject] = useState('');
    const fileRef = useRef(null);

    const handleSearch = async (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }

        setSearching(true);
        try {
            const res = await api.get(`/marks/search?query=${query}`);
            setSearchResults(res.data.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setSearching(false);
        }
    };

    const selectStudent = async (student) => {
        setSelectedStudent(student);
        setSearchQuery('');
        setSearchResults([]);
        setLoading(true);
        try {
            const res = await api.get(`/marks/${student._id}`);
            setStudentMarks(res.data.data || []);
        } catch (err) {
            toast.error('Failed to load performance data');
        } finally {
            setLoading(false);
        }
    };

    const handleExcelUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!subject) {
            toast.error('Please enter a subject name first');
            fileRef.current.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = async (evt) => {
            setUploading(true);
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

                const marksToUpload = data.map(row => ({
                    rollNumber: getVal(row, 'rollNumber', 'rollno', 'roll'),
                    a1: getVal(row, 'a1', 'assignment1'),
                    a2: getVal(row, 'a2', 'assignment2'),
                    a3: getVal(row, 'a3', 'assignment3'),
                    a4: getVal(row, 'a4', 'assignment4'),
                    a5: getVal(row, 'a5', 'assignment5'),
                    cia1: getVal(row, 'cia1'),
                    cia2: getVal(row, 'cia2'),
                    cia3: getVal(row, 'cia3'),
                }));

                const res = await api.post('/marks/upload', {
                    marks: marksToUpload,
                    subject
                });

                toast.success(res.data.message);
                fileRef.current.value = '';
                if (selectedStudent) selectStudent(selectedStudent);
            } catch (err) {
                toast.error(err.response?.data?.message || 'Upload failed');
            } finally {
                setUploading(false);
            }
        };
        reader.readAsBinaryString(file);
    };

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <Topbar title="Student Performance" subtitle="Track assignments and CIA marks" />
                <div className="page-content">
                    
                    <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                        {/* Search Section */}
                        <div className="card">
                            <div className="card-header">
                                <div className="card-title">🔍 Search Student</div>
                            </div>
                            <div className="card-body">
                                <div className="form-group" style={{ position: 'relative' }}>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Enter Name or Roll Number..."
                                        value={searchQuery}
                                        onChange={handleSearch}
                                    />
                                    {searching && <div className="spinner-sm" style={{ position: 'absolute', right: 10, top: 10 }} />}
                                    
                                    {searchResults.length > 0 && (
                                        <div className="search-dropdown" style={{
                                            position: 'absolute', top: '100%', left: 0, right: 0,
                                            background: 'white', border: '1px solid #ddd', borderRadius: 8,
                                            zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', overflow: 'hidden'
                                        }}>
                                            {searchResults.map(s => (
                                                <div 
                                                    key={s._id} 
                                                    className="search-item"
                                                    style={{ padding: '10px 15px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                                                    onClick={() => selectStudent(s)}
                                                >
                                                    <div style={{ fontWeight: 600 }}>{s.name}</div>
                                                    <div style={{ fontSize: 12, color: '#666' }}>{s.rollNumber} — {s.department?.name}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {selectedStudent ? (
                                    <div style={{ marginTop: 20, padding: 20, background: '#f8fafc', borderRadius: 8 }}>
                                        <h3 style={{ margin: 0, color: '#1e293b' }}>{selectedStudent.name}</h3>
                                        <p style={{ margin: '5px 0', color: '#64748b' }}>
                                            Roll: <b>{selectedStudent.rollNumber}</b> | Dept: {selectedStudent.department?.name}
                                        </p>
                                        <p style={{ margin: 0, color: '#64748b' }}>
                                            Section: {selectedStudent.section?.name} | Year: {selectedStudent.year}
                                        </p>
                                    </div>
                                ) : (
                                    <div style={{ marginTop: 20, textAlign: 'center', padding: 40, border: '2px dashed #e2e8f0', borderRadius: 8, color: '#94a3b8' }}>
                                        Select a student to view performance
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Upload Section */}
                        <div className="card">
                            <div className="card-header">
                                <div className="card-title">📤 Upload Marks (Excel)</div>
                            </div>
                            <div className="card-body">
                                <p style={{ fontSize: 13, color: '#64748b', marginBottom: 15 }}>
                                    Excel headers should include: <b>rollNumber, subject, a1, a2, a3, a4, a5, cia1, cia2, cia3</b>
                                </p>
                                <div className="form-group">
                                    <label className="form-label">Subject Name</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="e.g. Operating Systems"
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                    />
                                </div>
                                <div className="form-group" style={{ marginTop: 15 }}>
                                    <label className="btn btn-primary" style={{ width: '100%', cursor: 'pointer', textAlign: 'center' }}>
                                        {uploading ? 'Processing...' : '📁 Select Excel File'}
                                        <input
                                            type="file"
                                            ref={fileRef}
                                            accept=".xlsx, .xls"
                                            onChange={handleExcelUpload}
                                            style={{ display: 'none' }}
                                            disabled={uploading}
                                        />
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Performance Table */}
                    {selectedStudent && (
                        <div className="card" style={{ marginTop: 24 }}>
                            <div className="card-header">
                                <div className="card-title">📈 Academic Performance</div>
                            </div>
                            {loading ? (
                                <div style={{ padding: 40, textAlign: 'center' }}>
                                    <div className="spinner" style={{ margin: '0 auto' }} />
                                </div>
                            ) : studentMarks.length > 0 ? (
                                <div className="table-container">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th rowSpan="2">Subject</th>
                                                <th colSpan="5" style={{ textAlign: 'center', background: '#f1f5f9' }}>Assignments</th>
                                                <th colSpan="3" style={{ textAlign: 'center', background: '#ecfdf5' }}>CIA Marks</th>
                                                <th rowSpan="2">Updated At</th>
                                            </tr>
                                            <tr>
                                                <th style={{ fontSize: 11 }}>A1</th>
                                                <th style={{ fontSize: 11 }}>A2</th>
                                                <th style={{ fontSize: 11 }}>A3</th>
                                                <th style={{ fontSize: 11 }}>A4</th>
                                                <th style={{ fontSize: 11 }}>A5</th>
                                                <th style={{ fontSize: 11 }}>CIA 1</th>
                                                <th style={{ fontSize: 11 }}>CIA 2</th>
                                                <th style={{ fontSize: 11 }}>CIA 3</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {studentMarks.map((m, i) => (
                                                <tr key={i}>
                                                    <td style={{ fontWeight: 600 }}>{m.subject}</td>
                                                    <td>{m.assignments?.a1}</td>
                                                    <td>{m.assignments?.a2}</td>
                                                    <td>{m.assignments?.a3}</td>
                                                    <td>{m.assignments?.a4}</td>
                                                    <td>{m.assignments?.a5}</td>
                                                    <td style={{ background: '#f0fdf4', fontWeight: 600 }}>{m.cia?.cia1}</td>
                                                    <td style={{ background: '#f0fdf4', fontWeight: 600 }}>{m.cia?.cia2}</td>
                                                    <td style={{ background: '#f0fdf4', fontWeight: 600 }}>{m.cia?.cia3}</td>
                                                    <td style={{ fontSize: 11, color: '#94a3b8' }}>
                                                        {new Date(m.updatedAt).toLocaleDateString()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="empty-state" style={{ padding: 60 }}>
                                    <div className="empty-state-icon">📊</div>
                                    <h3>No records found</h3>
                                    <p>No marks have been uploaded for this student yet.</p>
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default StudentPerformance;
