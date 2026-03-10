const DutyReport = require('../models/DutyReport');

const sendDutyReport = async (req, res) => {
    try {
        const { staffName } = req.body;
        if (!staffName) return res.status(400).json({ message: 'Staff name is required' });

        const deptId = req.user.department?._id || req.user.department;

        if (!deptId) {
            return res.status(400).json({ message: 'User does not have an assigned department' });
        }

        const report = await DutyReport.create({
            staffName,
            user: req.user._id,
            department: deptId,
        });

        const populatedReport = await DutyReport.findById(report._id)
            .populate('user', 'name role email')
            .populate('department', 'name shortName');

        // Emit real-time event
        req.io.to(`dept-${deptId.toString()}`).emit('new-duty-report', populatedReport);

        res.status(201).json({ success: true, data: populatedReport });
    } catch (e) {
        console.error('Duty Report Error:', e);
        res.status(500).json({ message: 'Server error: ' + e.message });
    }
};

const getDutyReports = async (req, res) => {
    try {
        const { departmentId, date } = req.query;
        let filter = {};

        const deptId = req.user.department?._id || req.user.department;

        // Principal can see all chosen dept, HOD only their dept
        if (req.user.role === 'hod') {
            filter.department = deptId;
        } else if (departmentId) {
            filter.department = departmentId;
        }

        /*
        if (date) {
            const start = new Date(date);
            start.setUTCHours(0, 0, 0, 0);
            const end = new Date(date);
            end.setUTCHours(23, 59, 59, 999);
            filter.createdAt = { $gte: start, $lte: end };
        }
        */

        const reports = await DutyReport.find(filter)
            .populate('user', 'name role email')
            .populate('department', 'name shortName')
            .sort({ createdAt: -1 });

        res.json({ success: true, data: reports });
    } catch (e) {
        res.status(500).json({ message: 'Server error' });
    }
};

const clearDutyReports = async (req, res) => {
    try {
        const deptId = req.user.department?._id || req.user.department;

        if (!deptId) {
            return res.status(400).json({ message: 'User does not have an assigned department' });
        }

        await DutyReport.deleteMany({ department: deptId });

        res.json({ success: true, message: 'All duty reports cleared successfully' });
    } catch (e) {
        console.error('Clear Duty Reports Error:', e);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { sendDutyReport, getDutyReports, clearDutyReports };
