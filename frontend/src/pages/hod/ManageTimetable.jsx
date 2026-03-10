import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

const ManageTimetable = () => {
    const { user } = useAuth();
    const [timetable, setTimetable] = useState([]);
    const [sections, setSections] = useState([]);
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({
        year: '',
        sectionId: '',
        day: 'Monday',
        period: '1',
        staffId: '',
        subject: ''
    });

    const fetchInitialData = async () => {
        try {
            const dpId = user?.department?._id || user?.department;
            const [ttRes, secRes, staffRes] = await Promise.all([
                api.get('/timetable/department'),
                api.get(`/admin/sections?departmentId=${dpId}`),
                api.get('/hod/staff')
            ]);
            setTimetable(ttRes.data.data || []);
            setSections(secRes.data.data || []);
            setStaff(staffRes.data.data || []);
        } catch (err) {
            toast.error('Failed to load initial data');
        }
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/timetable/upsert', form);
            toast.success('Timetable saved successfully!');
            fetchInitialData();
            setForm({ ...form, staffId: '', subject: '' });
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save timetable');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this entry?')) return;
        try {
            await api.delete(`/timetable/${id}`);
            toast.success('Deleted successfully');
            fetchInitialData();
        } catch (err) {
            toast.error('Failed to delete');
        }
    };

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <Topbar title="Manage Timetable" subtitle="HOD Control Panel" />
                <div className="page-content">

                    <div className="card" style={{ marginBottom: 24 }}>
                        <div className="card-header">
                            <div className="card-title">🗓️ Add / Update Timetable Entry</div>
                        </div>
                        <div className="card-body">
                            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, alignItems: 'end' }}>
                                <div className="form-group">
                                    <label className="form-label form-required">Year</label>
                                    <select className="form-control" name="year" value={form.year} onChange={handleChange} required>
                                        <option value="">Select Year</option>
                                        {[1, 2, 3, 4].map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label form-required">Section</label>
                                    <select className="form-control" name="sectionId" value={form.sectionId} onChange={handleChange} required>
                                        <option value="">Select Section</option>
                                        {sections.filter(s => s.year == form.year).map(s => (
                                            <option key={s._id} value={s._id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label form-required">Day</label>
                                    <select className="form-control" name="day" value={form.day} onChange={handleChange} required>
                                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label form-required">Period</label>
                                    <select className="form-control" name="period" value={form.period} onChange={handleChange} required>
                                        {[1, 2, 3, 4, 5, 6, 7, 8].map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label form-required">Staff</label>
                                    <select className="form-control" name="staffId" value={form.staffId} onChange={handleChange} required>
                                        <option value="">Select Staff</option>
                                        {staff.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label form-required">Subject</label>
                                    <input type="text" className="form-control" name="subject" value={form.subject} onChange={handleChange} required placeholder="e.g. DBMS" />
                                </div>
                                <button type="submit" className="btn btn-primary" disabled={loading} style={{ height: 42 }}>
                                    {loading ? 'Saving...' : '💾 Save Entry'}
                                </button>
                            </form>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header">
                            <div className="card-title">📚 Department Timetable List</div>
                        </div>
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Year / Sec</th>
                                        <th>Day - Period</th>
                                        <th>Subject</th>
                                        <th>Staff</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {timetable.sort((a, b) => a.year - b.year || a.day.localeCompare(b.day) || a.period - b.period).map(entry => (
                                        <tr key={entry._id}>
                                            <td>Yr {entry.year} - Sec {entry.section?.name}</td>
                                            <td>{entry.day} — Period {entry.period}</td>
                                            <td style={{ fontWeight: 600 }}>{entry.subject}</td>
                                            <td>{entry.staff?.name}</td>
                                            <td>
                                                <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(entry._id)} style={{ color: 'var(--danger)' }}>🗑️</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {timetable.length === 0 && (
                                <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>No timetable entries found</div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default ManageTimetable;
