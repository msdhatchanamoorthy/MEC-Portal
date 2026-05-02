const mongoose = require('mongoose');
const Student = require('../models/Student');
const StudentDocument = require('../models/StudentDocument');
const ChatMessage = require('../models/ChatMessage');
const User = require('../models/User');
const Section = require('../models/Section');
const Department = require('../models/Department');
const Notification = require('../models/Notification');

// --- Helper to find CA for a student ---
const findAdvisorForStudent = async (student) => {
    try {
        console.log('--- FINDING ADVISOR ---');
        
        // Extract raw IDs if populated
        const deptId = student.department?._id || student.department;
        const year = student.year;
        const studentSection = student.section?._id || student.section; // Could be ID or name

        console.log('Student Info:', { name: student.name, deptId, year, studentSection });
        
        if (!deptId || !year || !studentSection) {
            console.log('Missing critical student fields');
            return null;
        }

        // 1. Get Section name
        let sectionName = '';
        if (mongoose.Types.ObjectId.isValid(studentSection)) {
            const sectionDoc = await Section.findById(studentSection);
            if (sectionDoc) sectionName = sectionDoc.name;
        } else {
            sectionName = studentSection.toString();
        }

        if (!sectionName) {
            console.log('Could not determine section name');
            return null;
        }

        // 2. Get Department short name
        const deptDoc = await Department.findById(deptId);
        if (!deptDoc) {
            console.log('Department not found');
            return null;
        }

        const deptCode = deptDoc.shortName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const normSectionName = sectionName.toLowerCase();
        
        // 3. Try finding by email pattern: <dept><year><section>.ca@mec.in
        const caEmail = `${deptCode}${year}${normSectionName}.ca@mec.in`;
        console.log('Target CA Email:', caEmail);
        
        let advisor = await User.findOne({ email: new RegExp(`^${caEmail}$`, 'i'), role: 'staff' });

        // 4. Fallback: Search for any staff member in the same dept, year, and section name
        if (!advisor) {
            console.log('CA email not found, trying fallback search via fields');
            advisor = await User.findOne({ 
                department: deptId,
                year: year,
                section: sectionName.toUpperCase(), 
                role: 'staff'
            });
        }

        if (advisor) {
            console.log('Advisor found:', advisor.name, '(_id:', advisor._id, ')');
        } else {
            console.log('ADVISOR NOT FOUND for class:', deptDoc.shortName, year, sectionName);
        }

        return advisor;
    } catch (err) {
        console.error('Error in findAdvisorForStudent:', err);
        return null;
    }
};

// @desc    Get all students
// @route   GET /api/students
exports.getStudents = async (req, res) => {
    try {
        const { departmentId, year, sectionId } = req.query;
        const query = {};
        if (departmentId) query.department = departmentId;
        if (year) query.year = year;
        if (sectionId) query.section = sectionId;

        const students = await Student.find(query).populate('department section').sort({ rollNumber: 1 });
        res.json({ success: true, count: students.length, data: students });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Create student
exports.createStudent = async (req, res) => {
    try {
        const student = await Student.create(req.body);
        res.status(201).json({ success: true, data: student });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Update student
exports.updateStudent = async (req, res) => {
    try {
        const student = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        res.json({ success: true, data: student });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete student
exports.deleteStudent = async (req, res) => {
    try {
        await Student.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Student removed' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Upload students via Excel
exports.uploadExcel = async (req, res) => {
    try {
        const { students, department, year, section } = req.body;
        // Clear existing students for this section to prevent duplicates or stale data
        await Student.deleteMany({ department, year, section });
        
        const created = await Student.insertMany(students);
        res.json({ success: true, count: created.length });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete entire section
exports.deleteSection = async (req, res) => {
    try {
        const { department, year, section } = req.query;
        await Student.deleteMany({ department, year, section });
        res.json({ success: true, message: 'Section cleared' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// --- Student Portal Functions ---

exports.uploadDocument = async (req, res) => {
    try {
        const { title, category, fileUrl } = req.body;
        const advisor = await findAdvisorForStudent(req.user);
        if (!advisor) return res.status(404).json({ message: 'No Class Advisor found.' });

        const doc = await StudentDocument.create({
            student: req.user._id,
            advisor: advisor._id,
            title,
            category,
            fileUrl
        });

        await Notification.create({
            recipient: advisor._id,
            sender: req.user._id,
            title: 'New Document Uploaded',
            message: `${req.user.name} has uploaded a ${category}: ${title}`,
            type: 'document_upload',
            relatedId: doc._id
        });

        if (req.io) req.io.to(advisor._id.toString()).emit('new_notification', { title: 'New Document Uploaded', message: `${req.user.name} has uploaded a ${category}: ${title}` });
        res.status(201).json({ success: true, data: doc });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getMyDocuments = async (req, res) => {
    try {
        const docs = await StudentDocument.find({ student: req.user._id }).sort({ createdAt: -1 });
        res.json({ success: true, data: docs });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.sendMessage = async (req, res) => {
    try {
        const { message } = req.body;
        const advisor = await findAdvisorForStudent(req.user);
        if (!advisor) return res.status(404).json({ message: 'No Class Advisor found.' });

        const msg = await ChatMessage.create({ sender: req.user._id, recipient: advisor._id, message });
        if (req.io) req.io.to(advisor._id.toString()).emit('new_chat_message', msg);
        res.status(201).json({ success: true, data: msg });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getMessages = async (req, res) => {
    try {
        const advisor = await findAdvisorForStudent(req.user);
        if (!advisor) return res.json({ success: true, data: [] });

        const messages = await ChatMessage.find({
            $or: [
                { sender: req.user._id, recipient: advisor._id },
                { sender: advisor._id, recipient: req.user._id }
            ]
        }).sort({ createdAt: 1 });
        res.json({ success: true, data: messages });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
