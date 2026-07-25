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
        const { departmentId, year, sectionId, search } = req.query;
        const query = {};
        
        let targetDeptId = departmentId;
        if (req.user && ['hod', 'staff'].includes(req.user.role)) {
            targetDeptId = req.user.department?._id || req.user.department;
        }

        if (targetDeptId) query.department = targetDeptId;
        if (year) query.year = year;
        if (sectionId) query.section = sectionId;

        if (search) {
            const regex = new RegExp(search, 'i');
            query.$or = [
                { name: regex },
                { registerNumber: regex }
            ];
        }

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
        const studentId = req.params.id;
        const oldStudent = await Student.findById(studentId);
        if (!oldStudent) return res.status(404).json({ message: 'Student not found' });

        const student = await Student.findByIdAndUpdate(studentId, req.body, { new: true, runValidators: true });
        
        // --- SYNC WITH USER MODEL ---
        // If registerNumber or email changed, update the corresponding User record
        if (req.body.registerNumber || req.body.email || req.body.name) {
            const user = await User.findOne({ 
                $or: [
                    { email: oldStudent.email },
                    { email: new RegExp(`^${oldStudent.registerNumber}@`, 'i') }
                ],
                role: 'student'
            });

            if (user) {
                if (req.body.name) user.name = req.body.name;
                if (req.body.email) user.email = req.body.email;
                else if (req.body.registerNumber) {
                    // If email wasn't explicitly provided but registerNumber changed, update default email
                    user.email = `${req.body.registerNumber.toLowerCase()}@student.mec.edu.in`;
                }
                
                if (req.body.department) user.department = req.body.department;
                if (req.body.year) user.year = req.body.year;
                if (req.body.section) user.section = req.body.section;
                
                await user.save();
                console.log(`[Sync] Updated User record for student: ${student.name}`);
            }
        }

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
        if (!students || !Array.isArray(students) || students.length === 0) {
            return res.status(400).json({ message: 'No student data provided' });
        }

        // 1. Deduplicate incoming students by rollNumber / registerNumber
        const studentMap = new Map();
        for (const s of students) {
            const rollNo = (s.rollNumber || s.registerNumber || '').toString().trim();
            if (!rollNo) continue;
            studentMap.set(rollNo.toUpperCase(), s);
        }

        const uniqueStudents = Array.from(studentMap.values());
        if (uniqueStudents.length === 0) {
            return res.status(400).json({ message: 'No valid student roll numbers found' });
        }

        const uploadedRolls = uniqueStudents.map(s => (s.rollNumber || s.registerNumber || '').toString().trim());

        // 2. Clear old students from this specific section who are not in the new upload list
        if (department && year && section) {
            await Student.deleteMany({
                department,
                year: Number(year),
                section,
                rollNumber: { $nin: uploadedRolls }
            });
        }

        // 3. Find existing students across all sections by rollNumber or registerNumber
        const existingStudents = await Student.find({
            $or: [
                { rollNumber: { $in: uploadedRolls.map(r => new RegExp(`^${r}$`, 'i')) } },
                { registerNumber: { $in: uploadedRolls.map(r => new RegExp(`^${r}$`, 'i')) } }
            ]
        });

        const existingMap = new Map();
        existingStudents.forEach(st => {
            if (st.rollNumber) existingMap.set(st.rollNumber.toUpperCase(), st._id);
            if (st.registerNumber) existingMap.set(st.registerNumber.toUpperCase(), st._id);
        });

        // 4. Build bulkWrite operations (update existing, upsert new)
        const bulkOps = uniqueStudents.map(s => {
            const rollNo = (s.rollNumber || s.registerNumber || '').toString().trim();
            const regNo = (s.registerNumber || s.rollNumber || '').toString().trim();
            const { _id, ...cleanStudentData } = s;

            const updateFields = {
                ...cleanStudentData,
                rollNumber: rollNo,
                registerNumber: regNo,
            };

            if (department) updateFields.department = department;
            if (year) updateFields.year = Number(year);
            if (section) updateFields.section = section;

            const matchedId = existingMap.get(rollNo.toUpperCase());

            if (matchedId) {
                return {
                    updateOne: {
                        filter: { _id: matchedId },
                        update: { $set: updateFields }
                    }
                };
            } else {
                return {
                    updateOne: {
                        filter: { rollNumber: rollNo },
                        update: { $set: updateFields },
                        upsert: true
                    }
                };
            }
        });

        if (bulkOps.length > 0) {
            await Student.bulkWrite(bulkOps);
        }

        res.json({ success: true, count: uniqueStudents.length });
    } catch (error) {
        console.error('Upload Excel Error:', error);
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

// @desc    Search students by register number or name
// @route   GET /api/students/search
exports.searchStudents = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.json({ success: true, data: [] });
        }

        const regex = new RegExp(q, 'i');
        const queryObj = {
            $or: [
                { registerNumber: regex },
                { name: regex }
            ]
        };

        if (req.user && ['hod', 'staff'].includes(req.user.role)) {
            const deptId = req.user.department?._id || req.user.department;
            if (deptId) {
                queryObj.department = deptId;
            }
        }

        const students = await Student.find(queryObj)
            .populate('department', 'name shortName')
            .sort({ registerNumber: 1 })
            .limit(50);

        const formatted = students.map(s => ({
            registerNo: s.registerNumber,
            name: s.name,
            gender: s.gender,
            cgpa: s.cgpa || 0,
            currentArrears: s.currentArrear || 0,
            placementStatus: s.placementStatus || 'Not Placed'
        }));

        res.json({ success: true, data: formatted });
    } catch (error) {
        console.error('Search students error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get full student object by register number
// @route   GET /api/students/:registerNo
exports.getStudentByRegisterNumber = async (req, res) => {
    try {
        const { registerNo } = req.params;
        const queryObj = { registerNumber: registerNo };
        if (req.user && ['hod', 'staff'].includes(req.user.role)) {
            const deptId = req.user.department?._id || req.user.department;
            if (deptId) {
                queryObj.department = deptId;
            }
        }

        const student = await Student.findOne(queryObj)
            .populate('department', 'name shortName')
            .populate('section', 'name year');
        
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Format DOB if it's an Excel serial date
        const formatDOB = (dobVal) => {
            if (!dobVal) return '—';
            const num = Number(dobVal);
            if (!isNaN(num) && num > 0) {
                try {
                    const date = new Date((num - 25569) * 86400 * 1000);
                    const dd = String(date.getDate()).padStart(2, '0');
                    const mm = String(date.getMonth() + 1).padStart(2, '0');
                    const yyyy = date.getFullYear();
                    return `${dd}/${mm}/${yyyy}`;
                } catch (e) {
                    return dobVal;
                }
            }
            return dobVal;
        };

        const mapped = {
            registerNo: student.registerNumber,
            name: student.name,
            department: student.department ? (student.department.shortName || student.department.name) : '',
            gender: student.gender,
            dob: formatDOB(student.dob),
            bloodGroup: student.bloodGroup || '—',
            
            // Contact
            phone: student.phone || '—',
            email: student.email || '—',
            personalEmail: student.personalEmail || '—',
            address: student.address || '—',
            nativePlace: student.nativePlace || '—',
            nativeState: student.nativeState || '—',
            
            // Academic
            tenthPercentage: student.tenthPercentage || 0,
            twelfthPercentage: student.twelfthPercentage || 0,
            diplomaPercentage: student.diplomaPercentage || 0,
            cgpa: student.cgpa || 0,
            currentArrears: student.currentArrear || 0,
            historyArrears: student.historyOfArrear || 0,
            twelfthMedium: student.twelfthMedium || 'English',
            
            // Personal
            transport: student.residency || '—', // Maps residency (Hostel/Dayscholar) -> transport
            firstGraduate: student.firstGraduate || 'No',
            college: student.college || 'MEC',
            
            // Placement
            placementStatus: student.placementStatus || 'Not Placed',
            placementCompany: student.placementCompany || '—',
            placementRole: student.placementRole || '—',
            placementPackage: student.placementPackage || '—',
            placementType: student.placementType || '—',
            placementDate: student.placementDate || '—'
        };

        res.json({ success: true, data: mapped });
    } catch (error) {
        console.error('Get student details error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
