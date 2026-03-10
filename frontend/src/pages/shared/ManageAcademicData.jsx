import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const ManageAcademicData = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('sections'); // sections, departments
    const [data, setData] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);

    // Form states
    const [formData, setFormData] = useState({});

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            let res;
            if (activeTab === 'sections') {
                const params = user.role === 'hod' ? `?departmentId=${user.department._id}` : '';
                res = await api.get(`/admin/sections${params}`);
            } else if (activeTab === 'departments') {
                res = await api.get('/admin/departments');
            }
            setData(res.data.data || []);
        } catch (err) {
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    }, [activeTab, user]);

    useEffect(() => {
        fetchData();
        if (user.role === 'principal') {
            api.get('/admin/departments').then(res => setDepartments(res.data.data || []));
        } else {
            setDepartments([user.department]);
        }
    }, [fetchData, user]);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setData([]);
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            let endpoint = '';
            let payload = { ...formData };

            if (activeTab === 'sections') {
                endpoint = '/admin/sections';
                if (user.role === 'hod') payload.department = user.department._id;
            } else if (activeTab === 'departments') {
                endpoint = '/admin/departments';
            }

            await api.post(endpoint, payload);
            toast.success(`${activeTab.slice(0, -1)} created successfully!`);
            setShowModal(false);
            setFormData({});
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create');
        }
    };

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <Topbar title="Academic Setup" subtitle="Manage departments and sections" />
                <div className="page-content">

                    <div className="page-header">
                        <div className="page-header-left">
                            <h2>⚙️ Academic Infrastructure</h2>
                            <p>Configure the basic structure of the college</p>
                        </div>
                        <div className="page-header-right">
                            <button className="btn btn-primary" onClick={() => { setFormData({}); setShowModal(true); }}>
                                + Add {activeTab.slice(0, -1)}
                            </button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="card" style={{ marginBottom: 20 }}>
                        <div style={{ display: 'flex', gap: 10, padding: 10 }}>
                            <button
                                className={`btn ${activeTab === 'sections' ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => handleTabChange('sections')}
                            >
                                Sections
                            </button>
                            {user.role === 'principal' && (
                                <button
                                    className={`btn ${activeTab === 'departments' ? 'btn-primary' : 'btn-ghost'}`}
                                    onClick={() => handleTabChange('departments')}
                                >
                                    Departments
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header">
                            <div className="card-title">List of {activeTab}</div>
                            <span className="badge badge-info">{data.length} found</span>
                        </div>

                        {loading ? (
                            <div className="loading-fullscreen" style={{ minHeight: 200 }}>
                                <div className="spinner spinner-dark" />
                            </div>
                        ) : (
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            {activeTab === 'departments' ? (
                                                <>
                                                    <th>Name</th>
                                                    <th>Code</th>
                                                    <th>HOD</th>
                                                    <th>Status</th>
                                                </>
                                            ) : (
                                                <>
                                                    <th>Name</th>
                                                    <th>Year</th>
                                                    {user.role === 'principal' && <th>Department</th>}
                                                    {activeTab === 'sections' && <th>Students</th>}
                                                    <th>Status</th>
                                                </>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.map((item, i) => (
                                            <tr key={item._id}>
                                                <td>{i + 1}</td>
                                                <td><strong>{item.name}</strong></td>
                                                {activeTab === 'departments' && <td>{item.shortName}</td>}
                                                {activeTab !== 'departments' && <td>{item.year}{['st', 'nd', 'rd', 'th'][item.year - 1]} Yr</td>}
                                                {user.role === 'principal' && activeTab !== 'departments' && (
                                                    <td>{item.department?.shortName}</td>
                                                )}
                                                {activeTab === 'departments' && <td>{item.hod?.name || 'Not assigned'}</td>}
                                                {activeTab === 'sections' && <td>{item.studentCount}</td>}
                                                <td><span className="badge badge-success">Active</span></td>
                                            </tr>
                                        ))}
                                        {data.length === 0 && (
                                            <tr>
                                                <td colSpan={10} style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>
                                                    No {activeTab} found
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-title">Add {activeTab.slice(0, -1)}</div>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleCreate}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">{activeTab.slice(0, -1)} Name</label>
                                    <input
                                        type="text" className="form-control" required
                                        placeholder={`Enter ${activeTab.slice(0, -1)} name`}
                                        value={formData.name || ''}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>

                                {activeTab === 'departments' && (
                                    <div className="form-group">
                                        <label className="form-label">Short Name / Code</label>
                                        <input
                                            type="text" className="form-control" required
                                            placeholder="e.g. CSE"
                                            value={formData.shortName || ''}
                                            onChange={e => setFormData({ ...formData, shortName: e.target.value })}
                                        />
                                    </div>
                                )}


                                {activeTab !== 'departments' && (
                                    <>
                                        <div className="form-group">
                                            <label className="form-label">Year</label>
                                            <select
                                                className="form-control" required
                                                value={formData.year || '1'}
                                                onChange={e => setFormData({ ...formData, year: e.target.value })}
                                            >
                                                <option value="1">1st Year</option>
                                                <option value="2">2nd Year</option>
                                                <option value="3">3rd Year</option>
                                                <option value="4">4th Year</option>
                                            </select>
                                        </div>
                                        {user.role === 'principal' && (
                                            <div className="form-group">
                                                <label className="form-label">Department</label>
                                                <select
                                                    className="form-control" required
                                                    value={formData.department || ''}
                                                    onChange={e => setFormData({ ...formData, department: e.target.value })}
                                                >
                                                    <option value="">Select Department</option>
                                                    {departments.map(d => (
                                                        <option key={d._id} value={d._id}>{d.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageAcademicData;
