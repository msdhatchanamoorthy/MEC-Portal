// Bypass TLS rejection for local dev behind proxies (fixes Twilio SSL errors)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');

// Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
    cors: {
        origin: true,
        methods: ['GET', 'POST'],
        credentials: true
    },
});

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const path = require('path');
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Attach io to request object
app.use((req, res, next) => {
    req.io = io;
    next();
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/students', require('./routes/students'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/duty-reports', require('./routes/dutyReports'));
app.use('/api/hod', require('./routes/hod'));
app.use('/api/timetable', require('./routes/timetable'));
app.use('/api/notices', require('./routes/notices'));
app.use('/api/marks', require('./routes/marks'));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'MEC Attendance System API is running' });
});

// PRODUCTION: Serve React Frontend
if (process.env.NODE_ENV === 'production') {
    const frontendPath = path.join(__dirname, '../frontend/build');
    app.use(express.static(frontendPath));
    
    // Fallback: Send index.html for all other routes (React Router)
    app.get('*', (req, res) => {
        res.sendFile(path.resolve(frontendPath, 'index.html'));
    });
} else {
    // 404 handler for development
    app.use((req, res) => {
        res.status(404).json({ message: `Route ${req.originalUrl} not found` });
    });
}

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        message: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
});

// Socket.IO events
io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    socket.on('join-department', (departmentId) => {
        socket.join(`dept-${departmentId}`);
        console.log(`Socket ${socket.id} joined dept-${departmentId}`);
    });

    socket.on('join-role', (role) => {
        socket.join(`role-${role}`);
    });

    socket.on('disconnect', () => {
        console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 MEC Attendance Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV}`);
});
