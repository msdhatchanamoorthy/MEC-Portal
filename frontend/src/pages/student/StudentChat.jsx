import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import api from '../../services/api';
import socket from '../../services/socket';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const StudentChat = () => {
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef();

    const fetchMessages = async () => {
        try {
            const res = await api.get('/student/messages');
            setMessages(res.data.data || []);
        } catch (err) {
            toast.error('Failed to load messages');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();

        if (socket) {
            socket.on('new_chat_message', (msg) => {
                setMessages(prev => [...prev, msg]);
            });
        }

        return () => {
            if (socket) socket.off('new_chat_message');
        };
    }, []);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            const res = await api.post('/student/messages', { message: newMessage });
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
                <Topbar title="Message Advisor" subtitle="Chat with your Class Advisor" />
                <div className="page-content" style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
                    <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div className="card-header">
                            <div className="card-title">💬 Conversation</div>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {messages.map((msg, i) => (
                                <div 
                                    key={i} 
                                    style={{ 
                                        maxWidth: '70%', 
                                        alignSelf: msg.sender === user._id ? 'flex-end' : 'flex-start',
                                        background: msg.sender === user._id ? 'var(--accent-gradient)' : 'var(--gray-100)',
                                        color: msg.sender === user._id ? 'white' : 'var(--gray-800)',
                                        padding: '12px 18px',
                                        borderRadius: msg.sender === user._id ? '20px 20px 0 20px' : '20px 20px 20px 0',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                        position: 'relative'
                                    }}
                                >
                                    <div style={{ fontSize: 14, fontWeight: 600 }}>{msg.message}</div>
                                    <div style={{ 
                                        fontSize: 9, 
                                        opacity: 0.7, 
                                        marginTop: 4, 
                                        textAlign: msg.sender === user._id ? 'right' : 'left',
                                        fontWeight: 700 
                                    }}>
                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            ))}
                            <div ref={scrollRef} />
                        </div>
                        <div style={{ padding: 20, borderTop: '1px solid var(--gray-100)' }}>
                            <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: 12 }}>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    placeholder="Type your message here..."
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    style={{ borderRadius: 30, padding: '12px 24px' }}
                                />
                                <button type="submit" className="btn btn-primary" style={{ borderRadius: '50%', width: 48, height: 48, padding: 0, flexShrink: 0 }}>
                                    🚀
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentChat;
