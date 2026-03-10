import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import api from '../../services/api';
import toast from 'react-hot-toast';

const ManageUsers = () => {
    const [users, setUsers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [filterRole, setFilterRole] = useState('');

    const [newUser, setNewUser] = useState({
        name: '', email: '', password: '', role: 'staff',
        department: '', assignedSections: [],
    });

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [usersRes, deptsRes] = await Promise.all([
                api.get('/admin/users'),
                api.get('/admin/departments'),
            ]);
            setUsers(usersRes.data.data || []);
            setDepartments(deptsRes.data.data || []);
        } catch {
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const fetchSections = async (deptId) => {
        if (!deptId) { setSections([]); return; }
        try {
            const res = await api.get(`/admin/sections?departmentId=${deptId}`);
            setSections(res.data.data || []);
        } catch { }
    };

    const handleDeptChange = (deptId) => {
        setNewUser((p) => ({ ...p, department: deptId, assignedSections: [] }));
        fetchSections(deptId);
    };

    const handleMultiSelect = (field, value) => {
        setNewUser((prev) => {
            const arr = prev[field];
            return {
                ...prev,
                [field]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
            };
        });
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            await api.post('/admin/users', newUser);
            toast.success('User created successfully!');
            setShowModal(false);
            setNewUser({ name: '', email: '', password: '', role: 'staff', department: '', assignedSections: [] });
            fetchAll();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create user');
        }
    };

    const filteredUsers = filterRole ? users.filter((u) => u.role === filterRole) : users;

    const ROLE_COLORS = { principal: 'badge-warning', hod: 'badge-success', staff: 'badge-info' };

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <Topbar title="Manage Users" subtitle="Create and manage HOD and Staff accounts" />
                <div className="page-content">

                    <div className="page-header">
                        <div className="page-header-left">
                            <h2>👥 User Management</h2>
                            <p>Manage principal, HOD, and staff accounts</p>
                        </div>
                        <div className="page-header-right">
                            <select className="form-control" value={filterRole}
                                onChange={(e) => setFilterRole(e.target.value)} style={{ width: 'auto' }}>
                                <option value="">All Roles</option>
                                <option value="principal">Principal</option>
                                <option value="hod">HOD</option>
                                <option value="staff">Staff</option>
                            </select>
                            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                                + Create User
                            </button>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header">
                            <div className="card-title">🧑‍💼 System Users</div>
                            <span className="badge badge-info">{filteredUsers.length} users</span>
                        </div>

                        {loading ? (
                            <div className="loading-fullscreen">
                                <div className="spinner spinner-dark" />
                            </div>
                        ) : (
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Name</th>
                                            <th>Email</th>
                                            <th>Role</th>
                                            <th>Department</th>
                                            <th>Sections</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredUsers.map((u, i) => (
                                            <tr key={u._id}>
                                                <td style={{ color: '#9CA3AF' }}>{i + 1}</td>
                                                <td style={{ fontWeight: 600 }}>{u.name}</td>
                                                <td style={{ fontSize: 13, color: '#6B7280' }}>{u.email}</td>
                                                <td>
                                                    <span className={`badge ${ROLE_COLORS[u.role]}`}>
                                                        {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                                                    </span>
                                                </td>
                                                <td>{u.department?.name || '—'}</td>
                                                <td>
                                                    {u.assignedSections?.length > 0
                                                        ? u.assignedSections.map((s) => `Sec ${s.name}`).join(', ')
                                                        : '—'}
                                                </td>
                                                <td><span className="badge badge-success">Active</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Create User Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
                        <div className="modal-header">
                            <div className="modal-title">➕ Create New User</div>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleCreateUser}>
                            <div className="modal-body">
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label form-required">Full Name</label>
                                        <input className="form-control" required placeholder="Dr. John Doe"
                                            value={newUser.name} onChange={(e) => setNewUser((p) => ({ ...p, name: e.target.value }))} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label form-required">Email</label>
                                        <input type="email" className="form-control" required
                                            value={newUser.email} onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label form-required">Password</label>
                                        <input type="password" className="form-control" required minLength={6}
                                            value={newUser.password} onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label form-required">Role</label>
                                        <select className="form-control" value={newUser.role}
                                            onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value }))}>
                                            <option value="staff">Staff</option>
                                            <option value="hod">HOD</option>
                                            <option value="principal">Principal</option>
                                        </select>
                                    </div>
                                    {newUser.role !== 'principal' && (
                                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                            <label className="form-label">Department</label>
                                            <select className="form-control" value={newUser.department}
                                                onChange={(e) => handleDeptChange(e.target.value)}>
                                                <option value="">Select Department</option>
                                                {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                                            </select>
                                        </div>
                                    )}

                                    {newUser.role === 'staff' && sections.length > 0 && (
                                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                            <label className="form-label">Assigned Sections (click to select)</label>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                                                {sections.map((s) => (
                                                    <button
                                                        key={s._id} type="button"
                                                        className={`badge ${newUser.assignedSections.includes(s._id) ? 'badge-success' : 'badge-gray'}`}
                                                        style={{ cursor: 'pointer', padding: '6px 12px', border: 'none', fontSize: 12 }}
                                                        onClick={() => handleMultiSelect('assignedSections', s._id)}
                                                    >
                                                        {s.year}{['st', 'nd', 'rd', 'th'][s.year - 1]} Yr — Sec {s.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Create User</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageUsers;
