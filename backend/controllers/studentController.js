const Student = require('../models/Student');

const getStudents = async (req, res) => {
    try {
        const { departmentId, year, sectionId, search } = req.query;
        let filter = { isActive: true };
        if (departmentId) filter.department = departmentId;
        if (year) filter.year = parseInt(year);
        if (sectionId) filter.section = sectionId;
        if (search) {
            console.log('Searching for student:', search);
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { rollNumber: { $regex: search, $options: 'i' } },
                { registerNumber: { $regex: search, $options: 'i' } }
            ];
        }

        const students = await Student.find(filter)
            .populate('department', 'name shortName')
            .populate('section', 'name year')
            .sort({ rollNumber: 1 })
            .limit(search ? 10 : 0);

        console.log(`Found ${students.length} students matching search: "${search || ''}"`);

        res.json({ success: true, count: students.length, data: students });
    } catch (e) {
        console.error('getStudents Error:', e);
        res.status(500).json({ message: 'Server error' });
    }
};

const createStudent = async (req, res) => {
    try {
        const student = await Student.create(req.body);
        res.status(201).json({ success: true, data: student });
    } catch (e) {
        if (e.code === 11000) return res.status(400).json({ message: 'Roll/Register number already exists' });
        res.status(400).json({ message: e.message });
    }
};

// ─── UPLOAD EXCEL WITH STRICT REPLACE & DELETE LOGIC ─────────────────────────────
const uploadExcel = async (req, res) => {
    try {
        const { students, department, year, section } = req.body;

        if (!students || !Array.isArray(students)) {
            return res.status(400).json({ message: 'Invalid student data' });
        }

        if (!department || !year || !section) {
            return res.status(400).json({ message: 'Department, Year, and Section are required' });
        }

        // 1. Authorization: Staff can only manage THEIR assigned sections
        if (req.user.role === 'staff') {
            const assignedIds = req.user.assignedSections.map(s => (s._id || s).toString());
            if (!assignedIds.includes(section.toString())) {
                return res.status(403).json({ message: 'Not authorized for this section' });
            }
        }

        // 2. Strict Delete: Run delete query for that specific Dept + Year + Section
        await Student.deleteMany({
            department,
            year: parseInt(year),
            section
        });

        // 3. Insert new student records
        let docs = [];
        if (students.length > 0) {
            // Ensure each student doc has the correct dept/year/sec forced from the request for consistency
            const studentsToInsert = students.map(s => ({
                ...s,
                department,
                year: parseInt(year),
                section
            }));
            docs = await Student.insertMany(studentsToInsert);
        }

        res.status(201).json({
            success: true,
            count: docs.length,
            message: `Student data for this section has been fully replaced. Previous data cleared and ${docs.length} records inserted.`
        });

    } catch (err) {
        console.error('Excel Upload Error:', err);
        res.status(500).json({ message: err.message || 'Server error during upload' });
    }
};

// ─── MANUAL DELETE SECTION LOGIC ───────────────────────────────────────────────
const deleteSection = async (req, res) => {
    try {
        const { department, year, section } = req.query;

        if (!department || !year || !section) {
            return res.status(400).json({ message: 'Department, Year, and Section are required' });
        }

        // 1. Authorization: Staff can only manage THEIR assigned sections
        if (req.user.role === 'staff') {
            const assignedIds = req.user.assignedSections.map(s => (s._id || s).toString());
            if (!assignedIds.includes(section.toString())) {
                return res.status(403).json({ message: 'Not authorized for this section' });
            }
        }

        const result = await Student.deleteMany({
            department,
            year: parseInt(year),
            section
        });

        res.json({
            success: true,
            message: `Successfully deleted all (${result.deletedCount}) students from this section.`
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

const updateStudent = async (req, res) => {
    try {
        const student = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!student) return res.status(404).json({ message: 'Student not found' });
        res.json({ success: true, data: student });
    } catch (e) {
        res.status(400).json({ message: e.message });
    }
};

const deleteStudent = async (req, res) => {
    try {
        await Student.findByIdAndUpdate(req.params.id, { isActive: false });
        res.json({ success: true, message: 'Student deactivated' });
    } catch (e) {
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { getStudents, createStudent, updateStudent, deleteStudent, uploadExcel, deleteSection };
