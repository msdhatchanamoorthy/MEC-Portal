const AttendanceRecord = require('../models/AttendanceRecord');
const Student = require('../models/Student');
const Section = require('../models/Section');
const Department = require('../models/Department');
const User = require('../models/User');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');

// Helper to get current period based on time
const getCurrentPeriod = () => {
    const now = new Date();
    const hours = now.getHours();
    const mins = now.getMinutes();
    const time = hours * 60 + mins;

    if (time >= 550 && time < 605) return 1;    // 09:10 - 10:05
    if (time >= 605 && time < 660) return 2;    // 10:05 - 11:00
    if (time >= 675 && time < 730) return 3;    // 11:15 - 12:10
    if (time >= 730 && time < 780) return 4;    // 12:10 - 01:00
    if (time >= 825 && time < 880) return 5;    // 01:45 - 02:40
    if (time >= 880 && time < 935) return 6;    // 02:40 - 03:35
    if (time >= 935 && time < 990) return 7;    // 03:35 - 04:30
    
    return null;
};

// @desc    Mark attendance for a section
// @route   POST /api/attendance/mark
// @access  Staff
const markAttendance = async (req, res) => {
    try {
        const { date, period, departmentId, year, sectionId, attendance, subject, staffName } = req.body;

        if (!date || !period || !departmentId || !year || !sectionId || !attendance) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // --- STRICT RULE VALIDATION ---
        if (req.user.role === 'staff') {
            const isStaffMember = req.user.email.includes('.staff@mec.in');
            
            // 1. Only mark for current hour if they are a regular Staff
            if (isStaffMember) {
                const currentSystemPeriod = getCurrentPeriod();
                if (!currentSystemPeriod || parseInt(period) !== currentSystemPeriod) {
                    return res.status(403).json({ 
                        message: `Staff can only mark attendance for the current hour (Period ${currentSystemPeriod || 'None'}).` 
                    });
                }
            }

            // 2. Check department
            if (req.user.department._id.toString() !== departmentId) {
                return res.status(403).json({ message: 'Unauthorized: Department mismatch' });
            }

            // 3. Section assignment check
            const assignedSectionIds = (req.user.assignedSections || []).map(s =>
                (s && s._id) ? s._id.toString() : s.toString()
            );
            const isAssigned = assignedSectionIds.includes(sectionId.toString());

            if (!isAssigned && assignedSectionIds.length > 0) {
                return res.status(403).json({ message: 'Unauthorized: This section is not assigned to you' });
            }
        }

        // Check if attendance already submitted for this period/section/date
        const existing = await AttendanceRecord.findOne({
            date: new Date(date),
            period,
            section: sectionId,
        });

        if (existing) {
            return res.status(400).json({
                message: 'Attendance already marked for this period. Use update instead.',
            });
        }

        const record = await AttendanceRecord.create({
            date: new Date(date),
            period,
            department: departmentId,
            year,
            section: sectionId,
            staff: req.user._id,
            staffName: staffName || req.user.name || '',
            staffEmail: req.user.email || '',
            subject: subject || '',
            attendance,
            status: 'pending',
        });

        const populated = await record.populate([
            { path: 'department', select: 'name shortName' },
            { path: 'section', select: 'name year' },
            { path: 'staff', select: 'name email' },
            { path: 'attendance.student', select: 'name rollNumber registerNumber' },
        ]);

        res.status(201).json({ success: true, data: populated });

        // --- NOTIFICATION LOGIC FOR CA & HOD ---
        if (req.user.email.includes('.staff@mec.in')) {
            try {
                const section = await Section.findById(sectionId).populate('department');
                const deptCode = section.department.shortName.toLowerCase().replace(/[^a-z0-9]/g, '');
                const caEmail = `${deptCode}${section.year}${section.name.toLowerCase()}.ca@mec.in`;

                // 1. Find CA
                const ca = await User.findOne({ email: caEmail });
                
                // 2. Find HOD
                const hod = await User.findOne({ 
                    role: 'hod', 
                    department: section.department._id 
                });

                const notificationData = {
                    sender: req.user._id,
                    title: `Attendance Marked - Period ${period}`,
                    message: `✅ Period ${period} attendance for ${section.year}${section.name} has been marked by ${req.user.name}.`,
                    type: 'staff_attendance',
                    relatedId: record._id
                };

                if (ca) {
                    await Notification.create({ ...notificationData, recipient: ca._id });
                }
                if (hod) {
                    await Notification.create({ ...notificationData, recipient: hod._id });
                }
                
                // Emit socket event if needed (req.io is available)
                if (req.io) {
                    if (ca) req.io.to(ca._id.toString()).emit('new_notification', notificationData);
                    if (hod) req.io.to(hod._id.toString()).emit('new_notification', notificationData);
                }
            } catch (notifyErr) {
                console.error('Failed to send CA/HOD notifications:', notifyErr);
            }
        }
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Attendance already marked for this slot.' });
        }
        console.error('Mark attendance error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update existing attendance record
// @route   PUT /api/attendance/:id
// @access  Staff
const updateAttendance = async (req, res) => {
    try {
        const { attendance, subject, staffName } = req.body;
        const record = await AttendanceRecord.findById(req.params.id);

        if (!record) return res.status(404).json({ message: 'Record not found' });

        if (record.staff.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to update this record' });
        }

        // --- STAFF RESTRICTION ---
        if (req.user.email.includes('.staff@mec.in')) {
            return res.status(403).json({ message: 'Staff members are not allowed to edit attendance records once submitted.' });
        }

        if (record.status === 'approved') {
            return res.status(400).json({ message: 'Cannot update an approved attendance record' });
        }

        if (attendance) record.attendance = attendance;
        if (subject) record.subject = subject;
        if (staffName) record.staffName = staffName;

        record.status = 'pending';
        record.updatedAt = new Date();
        await record.save();

        res.json({ success: true, data: record });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get attendance records (filtered)
// @route   GET /api/attendance
// @access  Staff, HOD, Principal
const getAttendance = async (req, res) => {
    try {
        const { departmentId, year, sectionId, date, startDate, endDate, staffId, status } = req.query;

        let filter = {};

        // Role-based filtering
        console.log('Get Attendance - User:', { id: req.user._id, role: req.user.role, dept: req.user.department?._id || req.user.department });
        if (req.user.role === 'staff') {
            filter.staff = req.user._id;
        } else if (req.user.role === 'hod') {
            filter.department = req.user.department._id || req.user.department;
        }
        console.log('Initial Filter:', filter);
        // Principal can see all

        if (departmentId) filter.department = departmentId;
        if (year) filter.year = parseInt(year);
        if (sectionId) filter.section = sectionId;
        if (staffId && req.user.role !== 'staff') filter.staff = staffId;
        if (status) filter.status = status;

        if (date) {
            const d = new Date(date);
            const start = new Date(d.setHours(0, 0, 0, 0));
            const end = new Date(d.setHours(23, 59, 59, 999));
            filter.date = { $gte: start, $lte: end };
        } else if (startDate && endDate) {
            filter.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            };
        }

        const records = await AttendanceRecord.find(filter)
            .populate('department', 'name shortName')
            .populate('section', 'name year')
            .populate('staff', 'name email')
            .populate('attendance.student', 'name rollNumber registerNumber')
            .sort({ date: -1, period: 1 });

        res.json({ success: true, count: records.length, data: records });
    } catch (error) {
        console.error('Get attendance error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Approve/reject attendance (HOD only)
// @route   PUT /api/attendance/:id/approve
// @access  HOD
const approveAttendance = async (req, res) => {
    try {
        const { status, remarks } = req.body;

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Status must be approved or rejected' });
        }

        const record = await AttendanceRecord.findById(req.params.id).populate('department');

        if (!record) return res.status(404).json({ message: 'Record not found' });

        // HOD can only approve their department's records
        if (
            req.user.role === 'hod' &&
            record.department._id.toString() !== req.user.department._id.toString()
        ) {
            return res.status(403).json({ message: 'Not authorized to approve this record' });
        }

        record.status = status;
        record.approvedBy = req.user._id;
        record.approvedAt = new Date();
        record.remarks = remarks || '';
        await record.save();

        res.json({ success: true, data: record, message: `Attendance ${status} successfully` });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get attendance summary (statistics)
// @route   GET /api/attendance/summary
// @access  HOD, Principal
const getAttendanceSummary = async (req, res) => {
    try {
        const { departmentId, year, sectionId, startDate, endDate } = req.query;

        let matchStage = {};

        if (req.user.role === 'hod') {
            const deptId = req.user.department?._id || req.user.department;
            if (!deptId) return res.status(400).json({ message: 'HOD has no assigned department' });
            matchStage.department = new mongoose.Types.ObjectId(deptId);
        }

        if (departmentId) matchStage.department = new mongoose.Types.ObjectId(departmentId);
        if (year) matchStage.year = parseInt(year);
        if (sectionId) matchStage.section = new mongoose.Types.ObjectId(sectionId);
        if (startDate && endDate) {
            matchStage.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        const pipeline = [
            { $match: matchStage },
            { $unwind: '$attendance' },
            {
                $group: {
                    _id: {
                        department: '$department',
                        year: '$year',
                        section: '$section',
                        student: '$attendance.student',
                    },
                    totalClasses: { $sum: 1 },
                    presentCount: {
                        $sum: { $cond: [{ $in: ['$attendance.status', ['Present', 'OD']] }, 1, 0] },
                    },
                },
            },
            {
                $group: {
                    _id: {
                        department: '$_id.department',
                        year: '$_id.year',
                        section: '$_id.section',
                    },
                    avgAttendance: {
                        $avg: {
                            $multiply: [{ $divide: ['$presentCount', '$totalClasses'] }, 100],
                        },
                    },
                    studentCount: { $sum: 1 },
                },
            },
            {
                $lookup: {
                    from: 'departments',
                    localField: '_id.department',
                    foreignField: '_id',
                    as: 'dept',
                },
            },
            {
                $lookup: {
                    from: 'sections',
                    localField: '_id.section',
                    foreignField: '_id',
                    as: 'sec',
                },
            },
            { $unwind: { path: '$dept', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$sec', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    department: '$dept.name',
                    departmentShort: '$dept.shortName',
                    year: '$_id.year',
                    section: '$sec.name',
                    avgAttendance: { $round: ['$avgAttendance', 1] },
                    studentCount: 1,
                },
            },
            { $sort: { department: 1, year: 1, section: 1 } },
        ];

        const summary = await AttendanceRecord.aggregate(pipeline);

        res.json({ success: true, data: summary });
    } catch (error) {
        console.error('Summary error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get students attendance by student (Summarized stats)
// @route   GET /api/attendance/student/:studentId
// @access  HOD, Principal, Staff
const getStudentAttendance = async (req, res) => {
    try {
        const { studentId } = req.params;
        const student = await Student.findById(studentId)
            .populate('department', 'name')
            .populate('section', 'name');

        if (!student) return res.status(404).json({ message: 'Student not found' });

        const now = new Date();
        
        // Define Date Ranges
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        
        // Week start (Monday)
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        const startOfWeek = new Date(new Date(now).setDate(diff));
        startOfWeek.setHours(0,0,0,0);

        const getStatsForRange = async (start, end) => {
            let match = { 
                'attendance.student': new mongoose.Types.ObjectId(studentId),
                status: 'approved' // Only count approved records for official stats
            };
            
            if (start) {
                match.date = { $gte: start };
                if (end) match.date.$lte = end;
            }

            const pipeline = [
                { $match: match },
                { $unwind: '$attendance' },
                { $match: { 'attendance.student': new mongoose.Types.ObjectId(studentId) } },
                {
                    $group: {
                        _id: null,
                        totalClasses: { $sum: 1 },
                        presentCount: {
                            $sum: { $cond: [{ $eq: ['$attendance.status', 'Present'] }, 1, 0] },
                        },
                        absentCount: {
                            $sum: { $cond: [{ $eq: ['$attendance.status', 'Absent'] }, 1, 0] },
                        },
                        leaveCount: {
                            $sum: { $cond: [{ $in: ['$attendance.status', ['OD', 'Leave']] }, 1, 0] },
                        },
                    },
                },
                {
                    $project: {
                        _id: 0,
                        totalClasses: 1,
                        presentCount: 1,
                        absentCount: 1,
                        leaveCount: 1,
                        percentage: {
                            $cond: [
                                { $gt: ['$totalClasses', 0] },
                                { $round: [{ $multiply: [{ $divide: [{ $add: ['$presentCount', '$leaveCount'] }, '$totalClasses'] }, 100] }, 1] },
                                0
                            ]
                        }
                    },
                },
            ];
            const result = await AttendanceRecord.aggregate(pipeline);
            return result[0] || { totalClasses: 0, presentCount: 0, absentCount: 0, leaveCount: 0, percentage: 0 };
        };

        const [week, month, year, total] = await Promise.all([
            getStatsForRange(startOfWeek),
            getStatsForRange(startOfMonth),
            getStatsForRange(startOfYear),
            getStatsForRange(null) // All time
        ]);

        // Get last 5 leave reasons
        const leaveRecords = await AttendanceRecord.find({
            'attendance.student': new mongoose.Types.ObjectId(studentId),
            'attendance.status': { $in: ['Absent', 'Leave', 'OD'] }
        })
        .sort({ date: -1 })
        .limit(5)
        .select('date attendance.$');

        const reasons = leaveRecords.map(r => ({
            date: r.date,
            status: r.attendance[0].status,
            reason: r.attendance[0].reason || 'No reason provided'
        }));

        res.json({ 
            success: true, 
            student: {
                ...student._doc,
                residency: student.residency
            }, 
            stats: { week, month, year, total },
            reasons
        });
    } catch (error) {
        console.error('Get Student Stats Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get daily attendance overview for principal dashboard
// @route   GET /api/attendance/daily-overview
// @access  Principal, HOD
const getDailyOverview = async (req, res) => {
    try {
        const today = req.query.date ? new Date(req.query.date) : new Date();
        const startOfDay = new Date(new Date(today).setHours(0, 0, 0, 0));
        const endOfDay = new Date(new Date(today).setHours(23, 59, 59, 999));

        const Section = require('../models/Section');
        const Department = require('../models/Department');

        // 1. Fetch all departments first to ensure they all show up even with 0 attendance
        let deptQuery = { isActive: true };
        let deptId = null;
        if (req.user.role === 'hod') {
            deptId = req.user.department?._id || req.user.department;
            if (!deptId) return res.status(400).json({ message: 'HOD has no assigned department' });
            deptQuery._id = deptId;
        }

        const allDepts = await Department.find(deptQuery).select('name shortName _id');

        // Initialize map with ALL departments
        const deptMap = {};
        allDepts.forEach(d => {
            const id = d._id.toString();
            deptMap[id] = {
                _id: id,
                departmentId: id,
                department: d.name,
                shortName: d.shortName,
                totalStudents: 0,
                presentCount: 0,
                absentCount: 0,
            };
        });

        // 2. Fetch attendance records for the selected day
        const records = await AttendanceRecord.find({
            date: { $gte: startOfDay, $lte: endOfDay },
            ...(deptId ? { department: deptId } : {})
        });

        // 3. Process records into the map
        records.forEach((r) => {
            const dId = r.department?.toString();
            if (!dId || !deptMap[dId]) return;

            r.attendance.forEach((a) => {
                deptMap[dId].totalStudents++;
                if (a.status === 'Present' || a.status === 'OD') deptMap[dId].presentCount++;
                else deptMap[dId].absentCount++;
            });
        });

        const departmentSummary = Object.values(deptMap).sort((a, b) => a.department.localeCompare(b.department)).map((d) => ({
            ...d,
            percentage:
                d.totalStudents > 0
                    ? ((d.presentCount / d.totalStudents) * 100).toFixed(1)
                    : '0.0',
        }));

        // 4. HOD Specific: Fetch ALL sections and their submission status
        let sectionSummary = [];
        if (req.user.role === 'hod' && deptId) {
            const allSections = await Section.find({ department: deptId, isActive: true }).sort({ year: 1, name: 1 });

            // Map submission status
            const submissionMap = {};
            records.forEach(r => {
                const sId = r.section.toString();
                if (!submissionMap[sId]) submissionMap[sId] = { count: 0, present: 0, total: 0 };
                submissionMap[sId].count++;
                r.attendance.forEach(a => {
                    submissionMap[sId].total++;
                    if (a.status === 'Present' || a.status === 'OD') submissionMap[sId].present++;
                });
            });

            sectionSummary = allSections.map(sec => {
                const id = sec._id.toString();
                const sub = submissionMap[id];
                return {
                    sectionId: id,
                    sectionName: sec.name,
                    year: sec.year,
                    isSubmitted: !!sub,
                    submissionStatus: sub ? 'Submitted' : 'Pending',
                    avgAttendance: sub && sub.total > 0 ? ((sub.present / sub.total) * 100).toFixed(1) : '0.0'
                };
            });
        }

        const overall = departmentSummary.reduce(
            (acc, d) => {
                acc.totalStudents += d.totalStudents;
                acc.presentCount += d.presentCount;
                acc.absentCount += d.absentCount;
                return acc;
            },
            { totalStudents: 0, presentCount: 0, absentCount: 0 }
        );

        overall.percentage =
            overall.totalStudents > 0
                ? ((overall.presentCount / overall.totalStudents) * 100).toFixed(1)
                : '0.0';

        res.json({
            success: true,
            date: startOfDay,
            overall,
            departmentSummary,
            sectionSummary, // Added for HOD
        });
    } catch (error) {
        console.error('Daily Overview Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get detailed drilldown for a department (absentees by year/section)
// @route   GET /api/attendance/drilldown
// @access  Principal, HOD
const getDepartmentDrilldown = async (req, res) => {
    try {
        const { departmentId, date } = req.query;
        console.log('Drilldown Request:', { departmentId, date });

        if (!departmentId || departmentId === 'undefined' || departmentId === 'null') {
            return res.status(400).json({ message: 'Valid Department ID is required' });
        }

        const targetDate = date ? new Date(date) : new Date();
        const start = new Date(targetDate.setHours(0, 0, 0, 0));
        const end = new Date(targetDate.setHours(23, 59, 59, 999));

        const records = await AttendanceRecord.find({
            department: departmentId,
            date: { $gte: start, $lte: end }
        }).populate('section', 'name year');

        // Year -> Section -> stats
        const drilldownMap = {};
        for (let i = 1; i <= 4; i++) drilldownMap[i] = {};

        records.forEach(r => {
            const year = r.year;
            // Defensive check for year range
            if (!drilldownMap[year]) return;

            const secName = r.section?.name || 'Unknown';

            if (!drilldownMap[year][secName]) {
                drilldownMap[year][secName] = {
                    sectionName: secName,
                    absentCount: 0,
                    totalStudents: 0
                };
            }

            r.attendance.forEach(a => {
                drilldownMap[year][secName].totalStudents++;
                if (a.status === 'Absent') {
                    drilldownMap[year][secName].absentCount++;
                }
            });
        });

        const result = Object.keys(drilldownMap).map(year => ({
            year: parseInt(year),
            sections: Object.values(drilldownMap[year]).sort((a, b) => a.sectionName.localeCompare(b.sectionName))
        }));

        res.json({ success: true, drilldown: result });
    } catch (error) {
        console.error('Drilldown Error (Backend):', error);
        res.status(500).json({ message: 'Failed to process department drilldown' });
    }
};

// @desc    Delete attendance record
// @route   DELETE /api/attendance/:id
// @access  Staff, HOD
const deleteAttendance = async (req, res) => {
    try {
        const record = await AttendanceRecord.findById(req.params.id);

        if (!record) return res.status(404).json({ message: 'Record not found' });

        // Staff can only delete their own records, but .staff users are blocked entirely
        if (req.user.role === 'staff' && record.staff.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete this record' });
        }

        if (req.user.email.includes('.staff@mec.in')) {
            return res.status(403).json({ message: 'Staff members are not allowed to delete attendance records.' });
        }

        // HOD can delete any record in their department
        if (req.user.role === 'hod' && record.department.toString() !== req.user.department._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete this record' });
        }

        if (record.status === 'approved') {
            return res.status(400).json({ message: 'Cannot delete an approved attendance record' });
        }

        await record.deleteOne();

        res.json({ success: true, message: 'Attendance record deleted successfully' });
    } catch (error) {
        console.error('Delete attendance error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get morning absentees for a section
// @route   GET /api/attendance/morning-absentees
// @access  Staff
const getMorningAbsentees = async (req, res) => {
    try {
        const { sectionId, date } = req.query;
        if (!sectionId) return res.status(400).json({ message: 'Section ID is required' });

        const targetDate = date ? new Date(date) : new Date();
        const start = new Date(targetDate.setHours(0, 0, 0, 0));
        const end = new Date(targetDate.setHours(23, 59, 59, 999));

        const currentPeriod = getCurrentPeriod() || 9; // If outside hours, show all for day

        // Find all records for this section today before the current period
        const records = await AttendanceRecord.find({
            section: sectionId,
            date: { $gte: start, $lte: end },
            period: { $lt: currentPeriod }
        }).populate('attendance.student', 'name rollNumber registerNumber');

        // Aggregate absentees
        const absenteeMap = {}; // { studentId: { student, reasons: [] } }

        records.forEach(record => {
            record.attendance.forEach(att => {
                if (att.status === 'Absent' || att.status === 'OD' || att.status === 'Leave' || att.status === 'Permission') {
                    const sId = att.student._id.toString();
                    if (!absenteeMap[sId]) {
                        absenteeMap[sId] = {
                            student: att.student,
                            reasons: []
                        };
                    }
                    absenteeMap[sId].reasons.push({
                        period: record.period,
                        status: att.status,
                        reason: att.reason || 'No reason provided'
                    });
                }
            });
        });

        res.json({ success: true, data: Object.values(absenteeMap) });
    } catch (error) {
        console.error('Morning absentees error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    markAttendance,
    updateAttendance,
    deleteAttendance,
    getAttendance,
    approveAttendance,
    getAttendanceSummary,
    getStudentAttendance,
    getDailyOverview,
    getDepartmentDrilldown,
    getMorningAbsentees,
};
