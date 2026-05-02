import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import api from '../../services/api';
import socket from '../../services/socket';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

import { Navigate, useLocation } from 'react-router-dom';

const AdvisorMessages = () => {
    const { user } = useAuth();
    const location = useLocation();
    const [students, setStudents] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(location.state?.student || null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);

    // Strict CA check
    const isCA = user?.role === 'staff' && user?.email?.includes('.ca@');

    useEffect(() => {
        const fetchStudents = async () => {
            try {
                let params = new URLSearchParams();
                if (user.assignedSections?.length > 0) {
                    params.append('sectionId', user.assignedSections[0]._id || user.assignedSections[0]);
                } else if (user.department && user.year && user.section) {
                    params.append('departmentId', user.department._id || user.department);
                    params.append('year', user.year);
                    // Since section name is stored as string in User but we need ID in student query, 
                    // we might need to fetch sections first or rely on the backend to handle name.
                    // However, we'll try to find students by department and year at least.
                }

                const res = await api.get(`/students?${params.toString()}`);
                // Filter by section name manually if needed
                let filtered = res.data.data || [];
                if (!user.assignedSections?.length && user.section) {
                    filtered = filtered.filter(s => s.section?.name === user.section);
                }
                setStudents(filtered);
            } catch (err) {
                console.error('Error fetching students:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchStudents();
    }, [user]);

    useEffect(() => {
        if (selectedStudent) {
            const fetchChat = async () => {
                const res = await api.get(`/advisor/messages/${selectedStudent._id}`);
                setMessages(res.data.data || []);
            };
            fetchChat();
        }
    }, [selectedStudent]);

    useEffect(() => {
        if (socket) {
            socket.on('new_chat_message', (msg) => {
                if (selectedStudent && (msg.sender === selectedStudent._id || msg.recipient === selectedStudent._id)) {
                    setMessages(prev => [...prev, msg]);
                }
            });
        }
        return () => socket?.off('new_chat_message');
    }, [selectedStudent]);

    const [searchTerm, setSearchTerm] = useState('');

    const filteredStudents = students.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.registerNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!isCA) return <Navigate to="/unauthorized" replace />;

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedStudent) return;

        try {
            const res = await api.post('/advisor/messages', { 
                studentId: selectedStudent._id, 
                message: newMessage 
            });
            setMessages(prev => [...prev, res.data.data]);
            setNewMessage('');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to send message');
        }
    };

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <Topbar title="Student Messages" subtitle="Communicate with students in your section" />
                <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="page-content" 
                    style={{ padding: '0 24px 24px 24px' }}
                >
                    {/* Messaging Status Bar */}
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        background: 'white', 
                        padding: '12px 24px', 
                        borderRadius: 16, 
                        marginBottom: 16,
                        border: '1px solid var(--gray-200)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                    }}>
                        <div style={{ display: 'flex', gap: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 10px rgba(16, 185, 129, 0.5)' }}></span>
                                <span style={{ fontSize: 12, fontWeight: 900, color: 'var(--gray-800)' }}>LIVE CONNECTION</span>
                            </div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-600)' }}>
                                <span style={{ color: 'var(--accent)' }}>{students.length}</span> STUDENTS
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 15 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-600)' }}>
                                <span style={{ color: '#2563EB' }}>{messages.filter(m => m.sender !== user._id).length}</span> RECEIVED
                            </div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-600)' }}>
                                <span style={{ color: '#DC2626' }}>{messages.filter(m => m.sender === user._id).length}</span> SENT
                            </div>
                        </div>
                    </div>
                    <div style={{ 
                        display: 'flex', 
                        gap: 24, 
                        height: 'calc(100vh - 180px)',
                        background: 'white',
                        borderRadius: 24,
                        overflow: 'hidden',
                        border: '1px solid var(--gray-200)',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.08)'
                    }}>
                        {/* Student Search & List */}
                        <div style={{ 
                            width: 320, 
                            display: 'flex', 
                            flexDirection: 'column',
                            borderRight: '1px solid var(--gray-100)',
                            background: 'var(--gray-50)'
                        }}>
                            <div style={{ padding: 20 }}>
                                <div style={{ position: 'relative' }}>
                                    <input 
                                        type="text" 
                                        className="form-control" 
                                        placeholder="Search student..." 
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        style={{ 
                                            background: 'rgba(255, 255, 255, 0.05)', 
                                            borderRadius: 12,
                                            paddingLeft: 40,
                                            fontSize: 13
                                        }}
                                    />
                                    <span style={{ position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
                                </div>
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px 20px' }}>
                                <AnimatePresence mode='popLayout'>
                                    {filteredStudents.map((s, idx) => (
                                        <motion.div 
                                            layout
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.03 }}
                                            key={s._id} 
                                            onClick={() => setSelectedStudent(s)}
                                            style={{ 
                                                padding: '12px 16px', 
                                                cursor: 'pointer', 
                                                borderRadius: 12,
                                                marginBottom: 4,
                                                transition: 'all 0.2s',
                                                background: selectedStudent?._id === s._id ? 'var(--accent-gradient)' : 'transparent',
                                                boxShadow: selectedStudent?._id === s._id ? '0 4px 15px rgba(0,0,0,0.2)' : 'none'
                                            }}
                                            whileHover={{ scale: 1.02, x: 4 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <div style={{ 
                                                fontWeight: 800, 
                                                fontSize: 14,
                                                color: selectedStudent?._id === s._id ? 'white' : 'var(--gray-800)'
                                            }}>{s.name}</div>
                                            <div style={{ 
                                                fontSize: 12, 
                                                fontWeight: 600,
                                                color: selectedStudent?._id === s._id ? 'rgba(255,255,255,0.85)' : 'var(--gray-500)' 
                                            }}>{s.registerNumber}</div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                                {filteredStudents.length === 0 && (
                                    <div style={{ textAlign: 'center', padding: 20, color: 'var(--gray-500)', fontSize: 12 }}>
                                        No students found.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Chat Area */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            {selectedStudent ? (
                                <>
                                    <div style={{ 
                                        padding: '20px 24px', 
                                        borderBottom: '1px solid var(--gray-100)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 15,
                                        background: 'white'
                                    }}>
                                        <div style={{ 
                                            width: 40, 
                                            height: 40, 
                                            borderRadius: 12, 
                                            background: 'var(--accent-gradient)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: 700,
                                            color: 'white'
                                        }}>{selectedStudent.name[0]}</div>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: 15 }}>{selectedStudent.name}</div>
                                            <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>{selectedStudent.registerNumber}</div>
                                        </div>
                                    </div>
                                    <div style={{ 
                                        flex: 1, 
                                        overflowY: 'auto', 
                                        padding: 24, 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        gap: 12,
                                        background: '#F1F5F9' // Solid light gray for chat
                                    }}>
                                        <AnimatePresence initial={false}>
                                            {messages.map((msg, i) => (
                                                <motion.div 
                                                    key={msg._id || i}
                                                    initial={{ opacity: 0, scale: 0.8, y: 10 }}
                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                                                    style={{ 
                                                        maxWidth: '70%', 
                                                        alignSelf: msg.sender === user._id ? 'flex-end' : 'flex-start',
                                                        background: msg.sender === user._id ? 'var(--accent-gradient)' : 'white',
                                                        color: msg.sender === user._id ? 'white' : 'var(--gray-800)',
                                                        padding: '12px 20px',
                                                        borderRadius: msg.sender === user._id ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                                                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                                                        border: msg.sender === user._id ? 'none' : '1px solid var(--gray-200)',
                                                        fontWeight: 600
                                                    }}
                                                >
                                                    <div style={{ fontSize: 13, lineHeight: 1.5 }}>{msg.message}</div>
                                                    <div style={{ fontSize: 9, opacity: 0.5, marginTop: 4, textAlign: 'right' }}>
                                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                    <div style={{ padding: 24, background: 'rgba(255, 255, 255, 0.02)', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                        <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: 12 }}>
                                            <input 
                                                type="text" 
                                                className="form-control" 
                                                placeholder={`Write a message to ${selectedStudent.name}...`}
                                                value={newMessage}
                                                onChange={e => setNewMessage(e.target.value)}
                                                style={{ 
                                                    background: 'rgba(255, 255, 255, 0.05)', 
                                                    borderRadius: 16, 
                                                    height: 50,
                                                    padding: '0 20px',
                                                    border: '1px solid rgba(255, 255, 255, 0.1)'
                                                }}
                                            />
                                            <motion.button 
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                type="submit" 
                                                className="btn btn-primary"
                                                style={{ borderRadius: 16, padding: '0 24px', fontWeight: 700 }}
                                            >
                                                Send
                                            </motion.button>
                                        </form>
                                    </div>
                                </>
                            ) : (
                                <div style={{ 
                                    flex: 1, 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    opacity: 0.5 
                                }}>
                                    <div style={{ fontSize: 50 }}>💬</div>
                                    <h3 style={{ marginTop: 20 }}>Select a student to start chatting</h3>
                                    <p style={{ fontSize: 13 }}>Search for a student using the bar on the left</p>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default AdvisorMessages;
