const Timetable = require('../models/Timetable');

const getTimetableForStaff = async (req, res) => {
    try {
        const staffId = req.user._id;
        const timetable = await Timetable.find({ staff: staffId })
            .populate('department', 'name')
            .populate('section', 'name year');
        res.json({ success: true, count: timetable.length, data: timetable });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

const getTimetableForDepartment = async (req, res) => {
    try {
        const deptId = req.user.role === 'hod' ? req.user.department?._id || req.user.department : req.query.departmentId;
        const timetable = await Timetable.find({ department: deptId })
            .populate('staff', 'name')
            .populate('section', 'name year');
        res.json({ success: true, count: timetable.length, data: timetable });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

const upsertTimetable = async (req, res) => {
    try {
        const { year, sectionId, day, period, staffId, subject } = req.body;
        const deptId = req.user.department?._id || req.user.department;

        // Check for existing class by another teacher at the same time
        const existing = await Timetable.findOne({ section: sectionId, day, period });
        if (existing) {
            existing.staff = staffId;
            existing.subject = subject;
            await existing.save();
            return res.json({ success: true, data: existing });
        }

        const newEntry = await Timetable.create({
            department: deptId,
            year,
            section: sectionId,
            day,
            period,
            staff: staffId,
            subject
        });

        res.status(201).json({ success: true, data: newEntry });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Class already scheduled for this slot.' });
        }
        res.status(500).json({ message: 'Server error' });
    }
};

const deleteTimetable = async (req, res) => {
    try {
        await Timetable.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Timetable entry deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getTimetableForStaff,
    getTimetableForDepartment,
    upsertTimetable,
    deleteTimetable
};
