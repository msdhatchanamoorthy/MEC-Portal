const StudentDocument = require('../models/StudentDocument');
const ChatMessage = require('../models/ChatMessage');
const User = require('../models/User');
const Student = require('../models/Student');
const Notification = require('../models/Notification');

// Helper to map Student document ID to User account ID
const getUserIdFromStudentId = async (studentId) => {
    const student = await Student.findById(studentId);
    if (!student) return null;

    // Search for user by email pattern (starts with roll number or register number)
    const rollPattern = new RegExp(`^${student.rollNumber}@`, 'i');
    const regPattern = new RegExp(`^${student.registerNumber}@`, 'i');
    
    const user = await User.findOne({ 
        $or: [
            { email: rollPattern },
            { email: regPattern },
            { email: student.email.toLowerCase() }
        ],
        role: 'student' 
    });

    return user ? user._id : null;
};

exports.getStudentDocuments = async (req, res) => {
    try {
        // Strict CA Check: Must have .ca@ in email
        if (!req.user.email || !req.user.email.includes('.ca@')) {
            return res.status(403).json({ message: 'Only Class Advisors can access student documents.' });
        }

        const docs = await StudentDocument.find({ advisor: req.user._id })
            .populate('student', 'name email')
            .sort({ createdAt: -1 });
        res.json({ success: true, data: docs });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.verifyDocument = async (req, res) => {
    try {
        if (!req.user.email || !req.user.email.includes('.ca@')) {
            return res.status(403).json({ message: 'Only Class Advisors can verify documents.' });
        }

        const { status, remarks } = req.body;
        const doc = await StudentDocument.findByIdAndUpdate(
            req.params.id,
            { status, remarks },
            { new: true }
        );
        res.json({ success: true, data: doc });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.replyToStudent = async (req, res) => {
    try {
        const { studentId, message } = req.body;
        
        // Convert Student ID to User ID
        const recipientUserId = await getUserIdFromStudentId(studentId);
        if (!recipientUserId) {
            return res.status(404).json({ message: 'Student user account not found. They may need to log in first.' });
        }

        const msg = await ChatMessage.create({
            sender: req.user._id,
            recipient: recipientUserId,
            message
        });

        // Create notification for student
        await Notification.create({
            recipient: recipientUserId,
            sender: req.user._id,
            title: 'New Message from Advisor',
            message: `Your Class Advisor ${req.user.name} sent you a message: "${message.substring(0, 30)}${message.length > 30 ? '...' : ''}"`,
            type: 'chat_message',
            relatedId: msg._id
        });

        if (req.io) {
            req.io.to(recipientUserId.toString()).emit('new_chat_message', msg);
            req.io.to(recipientUserId.toString()).emit('new_notification', { 
                title: 'New Message from Advisor', 
                message: `Your Class Advisor ${req.user.name} sent you a message.` 
            });
        }

        res.status(201).json({ success: true, data: msg });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getStudentChat = async (req, res) => {
    try {
        const { studentId } = req.params;
        const recipientUserId = await getUserIdFromStudentId(studentId);
        if (!recipientUserId) return res.json({ success: true, data: [] });

        const messages = await ChatMessage.find({
            $or: [
                { sender: req.user._id, recipient: recipientUserId },
                { sender: recipientUserId, recipient: req.user._id }
            ]
        }).sort({ createdAt: 1 });
        res.json({ success: true, data: messages });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
