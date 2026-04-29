const User = require('../models/User');
const AttendanceRecord = require('../models/AttendanceRecord');
const mongoose = require('mongoose');
const twilio = require('twilio');

// Initialize Twilio Client (Keys from .env)
const twilioClient = new twilio(
    process.env.TWILIO_ACCOUNT_SID || 'AC_dummy_sid',
    process.env.TWILIO_AUTH_TOKEN || 'dummy_auth_token'
);

// @desc    Get staff list for HOD's department
// @route   GET /api/hod/staff
// @access  HOD
const getStaffList = async (req, res) => {
    try {
        const deptId = req.user.department?._id || req.user.department;

        if (!deptId) {
            return res.status(400).json({ message: 'HOD has no assigned department' });
        }

        const staffList = await User.find({
            role: 'staff',
            department: deptId,
            isActive: true
        }).select('name email year section').sort({ year: 1, section: 1 });

        res.json({ success: true, count: staffList.length, data: staffList });
    } catch (err) {
        console.error('Get Staff List Error:', err);
        res.status(500).json({ message: 'Server error while fetching staff list' });
    }
};

// @desc    Get attendance records for HOD with filters
// @route   GET /api/hod/attendance
// @access  HOD
const getHODAttendance = async (req, res) => {
    try {
        const { year, section, date, subject } = req.query;
        const deptId = req.user.department?._id || req.user.department;

        if (!deptId) {
            return res.status(400).json({ message: 'HOD has no assigned department' });
        }

        let filter = { department: deptId };

        if (year) filter.year = parseInt(year);
        if (section) filter.section = new mongoose.Types.ObjectId(section);

        if (date) {
            const d = new Date(date);
            const start = new Date(d.setHours(0, 0, 0, 0));
            const end = new Date(d.setHours(23, 59, 59, 999));
            filter.date = { $gte: start, $lte: end };
        }

        // Fetch records
        const records = await AttendanceRecord.find(filter)
            .populate('staff', 'name email')
            .populate('section', 'name year')
            .populate('attendance.student', 'name rollNumber registerNumber phone')
            .sort({ date: -1, period: 1 });

        res.json({ success: true, count: records.length, data: records });
    } catch (err) {
        console.error('HOD Attendance Fetch Error:', err);
        res.status(500).json({ message: 'Server error while fetching attendance' });
    }
};

// @desc    Get absentees for a specific attendance record
// @route   GET /api/hod/attendance/:attendanceId/absentees
// @access  HOD
const getAbsentees = async (req, res) => {
    try {
        const { attendanceId } = req.params;
        const deptId = req.user.department?._id || req.user.department;

        const record = await AttendanceRecord.findOne({
            _id: attendanceId,
            department: deptId
        })
            .populate('staff', 'name email')
            .populate('section', 'name year')
            .populate('attendance.student', 'name rollNumber registerNumber');

        if (!record) {
            return res.status(404).json({ message: 'Attendance record not found or not in your department' });
        }

        // Filter for Absent, Leave, or OD students
        const absentees = record.attendance.filter(
            entry => entry.status === 'Absent' || entry.status === 'Leave' || entry.status === 'OD'
        );

        res.json({
            success: true,
            meta: {
                date: record.date,
                period: record.period,
                staffName: record.staffName || record.staff?.name,
                sectionName: record.section?.name,
                year: record.year,
                subject: record.subject || record.remarks || 'N/A'
            },
            count: absentees.length,
            data: absentees
        });
    } catch (err) {
        console.error('Get Absentees Error:', err);
        res.status(500).json({ message: 'Server error while fetching absentees' });
    }
};
// @desc    Get department-wide absentee report for HOD
// @route   GET /api/hod/absentee-report
// @access  HOD
const getAbsenteeReport = async (req, res) => {
    try {
        const { date, year, section } = req.query;
        const deptId = req.user.department?._id || req.user.department;

        if (!date) {
            return res.status(400).json({ message: 'Date is required' });
        }

        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);

        let matchStage = {
            department: new mongoose.Types.ObjectId(deptId),
            date: { $gte: start, $lte: end }
        };

        if (year) matchStage.year = parseInt(year);
        if (section) matchStage.section = new mongoose.Types.ObjectId(section);

        const pipeline = [
            { $match: matchStage },
            { $unwind: '$attendance' },
            { $match: { 'attendance.status': { $in: ['Absent', 'Leave'] } } },
            {
                $group: {
                    _id: '$attendance.student',
                    periods: { $addToSet: '$period' },
                    staffNames: { $addToSet: '$staffName' },
                    reasons: { $addToSet: '$attendance.reason' },
                    proofUrls: { $addToSet: '$attendance.proofUrl' },
                    year: { $first: '$year' },
                    section: { $first: '$section' },
                    status: { $first: '$attendance.status' }
                }
            },
            {
                $lookup: {
                    from: 'students',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'student'
                }
            },
            { $unwind: '$student' },
            {
                $lookup: {
                    from: 'sections',
                    localField: 'section',
                    foreignField: '_id',
                    as: 'sectionInfo'
                }
            },
            { $unwind: '$sectionInfo' },
            {
                $project: {
                    _id: 1,
                    periods: 1,
                    staffNames: 1,
                    reasons: 1,
                    proofUrls: 1,
                    year: 1,
                    status: 1,
                    sectionName: '$sectionInfo.name',
                    studentName: '$student.name',
                    registerNumber: '$student.registerNumber',
                    phone: '$student.phone',
                    gender: '$student.gender',
                    residency: '$student.residency'
                }
            },
            { $sort: { year: 1, sectionName: 1, registerNumber: 1 } }
        ];

        const absentees = await AttendanceRecord.aggregate(pipeline);

        // Summaries
        const summary = {
            total: absentees.length,
            y1: absentees.filter(a => a.year === 1).length,
            y2: absentees.filter(a => a.year === 2).length,
            y3: absentees.filter(a => a.year === 3).length,
            y4: absentees.filter(a => a.year === 4).length
        };

        res.json({ success: true, summary, data: absentees });
    } catch (err) {
        console.error('Absentee Report Error:', err);
        res.status(500).json({ message: 'Server error while generating absentee report' });
    }
};

// @desc    Get year-wise attendance status for the whole department
// @route   GET /api/hod/attendance/year-wise
// @access  HOD
const getYearWiseAttendance = async (req, res) => {
    try {
        const { date } = req.query;
        const deptId = req.user.department?._id || req.user.department;

        if (!date) return res.status(400).json({ message: 'Date is required' });

        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);

        const pipeline = [
            {
                $match: {
                    department: new mongoose.Types.ObjectId(deptId),
                    date: { $gte: start, $lte: end }
                }
            },
            {
                $project: {
                    year: 1,
                    totalStudents: { $size: '$attendance' },
                    presentCount: {
                        $size: {
                            $filter: {
                                input: '$attendance',
                                as: 'att',
                                cond: { $eq: ['$$att.status', 'Present'] }
                            }
                        }
                    },
                    absentCount: {
                        $size: {
                            $filter: {
                                input: '$attendance',
                                as: 'att',
                                cond: { $in: ['$$att.status', ['Absent', 'Leave']] }
                            }
                        }
                    }
                }
            },
            {
                $group: {
                    _id: '$year',
                    // We average across periods to get the daily year-wise view
                    avgTotalStudents: { $avg: '$totalStudents' },
                    totalPresent: { $sum: '$presentCount' },
                    totalAbsent: { $sum: '$absentCount' },
                    totalEntries: { $sum: '$totalStudents' }
                }
            },
            {
                $project: {
                    year: '$_id',
                    totalStudents: { $round: ['$avgTotalStudents', 0] },
                    totalAbsent: { $sum: '$totalAbsent' }, // Just a sum of all period-wise absents? 
                    // Usually for a dashboard, we show percentage clearly
                    percentage: {
                        $cond: [
                            { $gt: ['$totalEntries', 0] },
                            { $multiply: [{ $divide: ['$totalPresent', '$totalEntries'] }, 100] },
                            0
                        ]
                    }
                }
            },
            { $sort: { year: 1 } }
        ];

        const results = await AttendanceRecord.aggregate(pipeline);
        res.json({ success: true, data: results });
    } catch (err) {
        console.error('Year-wise API Error:', err);
        res.status(500).json({ message: 'Server error while fetching year-wise data' });
    }
};

// @desc    Get section-wise attendance for a specific year
// @route   GET /api/hod/attendance/section-wise
// @access  HOD
const getSectionWiseAttendance = async (req, res) => {
    try {
        const { date, year } = req.query;
        const deptId = req.user.department?._id || req.user.department;

        if (!date || !year) return res.status(400).json({ message: 'Date and Year are required' });

        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);

        // 1. Fetch ALL sections for this department and year
        const Section = require('../models/Section');
        const allSections = await Section.find({
            department: deptId,
            year: parseInt(year),
            isActive: true
        }).sort({ name: 1 });

        // 2. Fetch existing attendance records for the day
        const rawRecords = await AttendanceRecord.find({
            department: deptId,
            year: parseInt(year),
            date: { $gte: start, $lte: end }
        }).populate('section', 'name');

        // 3. Map records to sections
        const recordMap = {};
        rawRecords.forEach(r => {
            const secId = r.section?._id?.toString();
            if (!recordMap[secId]) {
                recordMap[secId] = { totalStudents: 0, present: 0, absent: 0, periods: 0 };
            }
            recordMap[secId].totalStudents = r.attendance.length;
            recordMap[secId].present += r.attendance.filter(a => a.status === 'Present').length;
            recordMap[secId].absent += r.attendance.filter(a => ['Absent', 'Leave'].includes(a.status)).length;
            recordMap[secId].periods += 1;
        });

        // 4. Build final results including sections with NO records
        const results = allSections.map(sec => {
            const id = sec._id.toString();
            const stats = recordMap[id];

            if (stats) {
                return {
                    sectionId: id,
                    sectionName: sec.name,
                    totalStudents: stats.totalStudents,
                    present: Math.round(stats.present / stats.periods),
                    absent: Math.round(stats.absent / stats.periods),
                    percentage: stats.totalStudents > 0 ? ((stats.present / (stats.totalStudents * stats.periods)) * 100) : 0,
                    isSubmitted: true,
                    submissionStatus: 'Submitted'
                };
            } else {
                return {
                    sectionId: id,
                    sectionName: sec.name,
                    totalStudents: sec.studentCount || 0,
                    present: 0,
                    absent: 0,
                    percentage: 0,
                    isSubmitted: false,
                    submissionStatus: 'Pending'
                };
            }
        });

        res.json({ success: true, data: results });
    } catch (err) {
        console.error('Section-wise API Error:', err);
        res.status(500).json({ message: 'Server error while fetching section-wise data' });
    }
};

// @desc    Notify parents of absent students via SMS (simulated)
// @route   POST /api/hod/notify-parents
// @access  HOD
const notifyParents = async (req, res) => {
    try {
        const { absentees, date } = req.body;

        if (!absentees || !Array.isArray(absentees) || absentees.length === 0) {
            return res.status(400).json({ message: 'No absentee data provided' });
        }

        const notifyDate = date ? new Date(date).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'long', year: 'numeric'
        }) : new Date().toLocaleDateString('en-IN', {
            day: '2-digit', month: 'long', year: 'numeric'
        });

        const results = [];

        for (const student of absentees) {
            const phone = student.phone || '';
            const name = student.studentName || student.name || 'Student';
            const regNo = student.registerNumber || '';
            const section = student.sectionName || '';
            const year = student.year || '';
            const periods = student.periods ? student.periods.join(', ') : '';

            const message = `Dear Parent, your ward ${name} (Reg No: ${regNo}) of ${year} Year - Sec ${section} was absent on ${notifyDate}${periods ? ` during period(s): ${periods}` : ''}. Please contact the HOD for further details. - MEC Attendance System`;

            if (phone) {
                try {
                    // Skip real SMS if in offline mode
                    if (process.env.OFFLINE_MODE === 'true') {
                        console.log(`[OFFLINE MODE] SMS Simulated to: ${phone}`);
                        results.push({ phone, name, regNo, status: 'sent', message, offline: true });
                        continue;
                    }

                    // Send real SMS via Twilio
                    const twilioRes = await twilioClient.messages.create({
                        body: message,
                        from: process.env.TWILIO_PHONE_NUMBER || '+1234567890',
                        // Make sure phone number has country code (e.g., +91 for India)
                        to: phone.startsWith('+') ? phone : `+91${phone}`
                    });

                    console.log(`[SMS SENT] To: ${phone} (SID: ${twilioRes.sid})`);
                    results.push({ phone, name, regNo, status: 'sent', message });
                } catch (smsErr) {
                    console.error(`[SMS FAILED] To: ${phone} - ${smsErr.message}`);
                    results.push({ phone, name, regNo, status: 'failed', reason: smsErr.message });
                }
            } else {
                console.log(`[SMS SKIPPED] No phone for ${name} (${regNo})`);
                results.push({ phone: null, name, regNo, status: 'skipped', reason: 'No phone number' });
            }
        }

        const sentCount = results.filter(r => r.status === 'sent').length;
        const skippedCount = results.filter(r => r.status === 'skipped').length;

        res.json({
            success: true,
            message: `Notifications sent to ${sentCount} parent(s). ${skippedCount > 0 ? `${skippedCount} skipped (no phone).` : ''}`,
            notified: sentCount,
            skipped: skippedCount,
            results
        });
    } catch (err) {
        console.error('Notify Parents Error:', err);
        res.status(500).json({ message: 'Server error while sending notifications' });
    }
};

const getTopStudents = async (req, res) => {
    try {
        const { period = 'monthly', year, section } = req.query;
        let startDate = new Date();
        const endDate = new Date();

        // Calculate Date Range
        if (period === 'weekly') {
            startDate.setDate(endDate.getDate() - 7);
        } else if (period === 'monthly') {
            startDate.setMonth(endDate.getMonth() - 1);
        } else if (period === 'yearly') {
            startDate.setFullYear(endDate.getFullYear() - 1);
        } else {
            startDate = new Date(0); // All time
        }

        const deptId = req.user.department._id || req.user.department;
        const matchStage = {
            department: new mongoose.Types.ObjectId(deptId),
            date: { $gte: startDate, $lte: endDate }
        };

        if (year) matchStage.year = parseInt(year);
        if (section) matchStage.section = new mongoose.Types.ObjectId(section);

        const pipeline = [
            { $match: matchStage },
            { $unwind: '$attendance' },
            {
                $group: {
                    _id: '$attendance.student',
                    totalClasses: { $sum: 1 },
                    presentCount: {
                        $sum: { $cond: [{ $in: ['$attendance.status', ['Present', 'OD', 'Late']] }, 1, 0] }
                    }
                }
            },
            {
                $project: {
                    _id: 1,
                    totalClasses: 1,
                    presentCount: 1,
                    percentage: {
                        $cond: [
                            { $eq: ['$totalClasses', 0] },
                            0,
                            { $round: [{ $multiply: [{ $divide: ['$presentCount', '$totalClasses'] }, 100] }, 1] }
                        ]
                    }
                }
            },
            { $sort: { percentage: -1, presentCount: -1 } },
            {
                $lookup: {
                    from: 'students',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'studentInfo'
                }
            },
            { $unwind: '$studentInfo' },
            {
                $lookup: {
                    from: 'sections',
                    localField: 'studentInfo.section',
                    foreignField: '_id',
                    as: 'sectionInfo'
                }
            },
            { $unwind: { path: '$sectionInfo', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 1,
                    totalClasses: 1,
                    presentCount: 1,
                    percentage: 1,
                    name: '$studentInfo.name',
                    registerNumber: '$studentInfo.registerNumber',
                    year: '$studentInfo.year',
                    section: '$sectionInfo.name'
                }
            },
            { $limit: 20 } // Show top 20 students
        ];

        const topStudents = await AttendanceRecord.aggregate(pipeline);
        
        // We set grouped: false to keep a flat leaderboard view which the user prefers for "Top Achievers"
        res.json({ 
            success: true, 
            grouped: false, 
            topStudents,
            meta: {
                totalCount: topStudents.length,
                period,
                filterApplied: !!(year || section)
            }
        });
    } catch (error) {
        console.error('Error fetching top students:', error);
        res.status(500).json({ message: 'Error fetching top students' });
    }
};

// @desc    Get whole department analytics (HOD/Principal)
// @route   GET /api/hod/analytics
const getAnalytics = async (req, res) => {
    try {
        const deptId = req.user.department?._id || req.user.department;
        const { year } = req.query;

        let match = { department: new mongoose.Types.ObjectId(deptId) };
        if (year) match.year = parseInt(year);

        const stats = await AttendanceRecord.aggregate([
            { $match: match },
            { $unwind: "$attendance" },
            {
                $group: {
                    _id: "$attendance.status",
                    count: { $sum: 1 }
                }
            }
        ]);

        const formattedStats = {
            Present: 0,
            Absent: 0,
            Late: 0,
            Leave: 0,
            OD: 0
        };

        stats.forEach(s => {
            if (formattedStats.hasOwnProperty(s._id)) {
                formattedStats[s._id] = s.count;
            }
        });

        res.json({ success: true, data: formattedStats });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get attendance percentages for all students in a section
// @route   GET /api/hod/attendance/percentages
const getAttendancePercentages = async (req, res) => {
    try {
        const { year, section } = req.query;
        const deptId = req.user.department?._id || req.user.department;

        if (!year || !section) {
            return res.status(400).json({ message: 'Year and Section are required' });
        }

        const pipeline = [
            { 
                $match: { 
                    department: new mongoose.Types.ObjectId(deptId),
                    year: parseInt(year),
                    section: new mongoose.Types.ObjectId(section)
                } 
            },
            { $unwind: "$attendance" },
            {
                $group: {
                    _id: "$attendance.student",
                    totalPeriods: { $sum: 1 },
                    presentPeriods: {
                        $sum: { $cond: [{ $in: ["$attendance.status", ["Present", "OD"]] }, 1, 0] }
                    }
                }
            },
            {
                $lookup: {
                    from: 'students',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'student'
                }
            },
            { $unwind: "$student" },
            {
                $project: {
                    _id: 1,
                    name: "$student.name",
                    rollNumber: "$student.rollNumber",
                    percentage: { 
                        $round: [{ $multiply: [{ $divide: ["$presentPeriods", "$totalPeriods"] }, 100] }, 1] 
                    }
                }
            },
            { $sort: { percentage: 1 } }
        ];

        const data = await AttendanceRecord.aggregate(pipeline);
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get alert for students below 75% attendance
// @route   GET /api/hod/alerts/low-attendance
const getLowAttendanceAlerts = async (req, res) => {
    try {
        const deptId = req.user.department?._id || req.user.department;
        
        const pipeline = [
            { $match: { department: new mongoose.Types.ObjectId(deptId) } },
            { $unwind: "$attendance" },
            {
                $group: {
                    _id: "$attendance.student",
                    total: { $sum: 1 },
                    present: {
                        $sum: { $cond: [{ $in: ["$attendance.status", ["Present", "OD"]] }, 1, 0] }
                    }
                }
            },
            {
                $project: {
                    percentage: { $multiply: [{ $divide: ["$present", "$total"] }, 100] }
                }
            },
            { $match: { percentage: { $lt: 75 } } },
            {
                $lookup: {
                    from: "students",
                    localField: "_id",
                    foreignField: "_id",
                    as: "info"
                }
            },
            { $unwind: "$info" },
            {
                $project: {
                    name: "$info.name",
                    rollNumber: "$info.rollNumber",
                    year: "$info.year",
                    percentage: { $round: ["$percentage", 1] }
                }
            },
            { $sort: { percentage: 1 } }
        ];

        const alerts = await AttendanceRecord.aggregate(pipeline);
        res.json({ success: true, count: alerts.length, data: alerts });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getStaffList,
    getHODAttendance,
    getAbsentees,
    getAbsenteeReport,
    getYearWiseAttendance,
    getSectionWiseAttendance,
    notifyParents,
    getTopStudents,
    getAnalytics,
    getAttendancePercentages,
    getLowAttendanceAlerts
};
