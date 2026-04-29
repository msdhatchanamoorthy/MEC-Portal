const Mark = require('../models/Mark');
const Student = require('../models/Student');

// @desc    Upload/Update marks from Excel
// @route   POST /api/marks/upload
const uploadMarks = async (req, res) => {
    try {
        const { marks, subject } = req.body;
        // marks: array of { rollNumber, a1, a2, a3, a4, a5, cia1, cia2, cia3 }

        if (!marks || !Array.isArray(marks) || !subject) {
            return res.status(400).json({ message: 'Marks array and subject are required' });
        }

        const stats = { updated: 0, studentNotFound: 0 };
        
        for (const m of marks) {
            if (!m.rollNumber) continue;
            
            const student = await Student.findOne({ 
                rollNumber: m.rollNumber.toString().trim() 
            });

            if (student) {
                const markData = {
                    student: student._id,
                    subject,
                    assignments: {
                        a1: Number(m.a1) || 0,
                        a2: Number(m.a2) || 0,
                        a3: Number(m.a3) || 0,
                        a4: Number(m.a4) || 0,
                        a5: Number(m.a5) || 0
                    },
                    cia: {
                        cia1: Number(m.cia1) || 0,
                        cia2: Number(m.cia2) || 0,
                        cia3: Number(m.cia3) || 0
                    },
                    uploadedBy: req.user._id,
                    updatedAt: new Date()
                };

                await Mark.findOneAndUpdate(
                    { student: student._id, subject },
                    markData,
                    { upsert: true, new: true }
                );
                stats.updated++;
            } else {
                stats.studentNotFound++;
            }
        }

        res.json({ 
            success: true, 
            data: stats, 
            message: `Marks processed: ${stats.updated} updated, ${stats.studentNotFound} roll numbers not found.` 
        });
    } catch (err) {
        console.error('Mark Upload Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Search student for performance view
// @route   GET /api/marks/search
const searchStudent = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) return res.json({ success: true, data: [] });

        const students = await Student.find({
            $or: [
                { rollNumber: { $regex: query, $options: 'i' } },
                { name: { $regex: query, $options: 'i' } }
            ]
        })
        .limit(10)
        .populate('department', 'name')
        .populate('section', 'name');

        res.json({ success: true, data: students });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get performance for a specific student ID
// @route   GET /api/marks/:studentId
const getStudentMarks = async (req, res) => {
    try {
        const marks = await Mark.find({ student: req.params.studentId })
            .populate('uploadedBy', 'name');
        res.json({ success: true, data: marks });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    uploadMarks,
    searchStudent,
    getStudentMarks
};
