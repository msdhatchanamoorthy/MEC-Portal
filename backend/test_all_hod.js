const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');
const AttendanceRecord = require('./models/AttendanceRecord');
const Department = require('./models/Department');
const DutyReport = require('./models/DutyReport');

async function testHODEndpoints() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        // Find an HOD
        const hod = await User.findOne({ role: 'hod' }).populate('department');
        if (!hod) {
            console.log('No HOD found');
            return;
        }
        console.log(`Testing as HOD: ${hod.name}, Dept: ${hod.department?.name} (${hod.department?._id})`);

        const reqUser = hod;
        const selectedDate = new Date().toISOString().split('T')[0];
        const startOfDay = new Date(new Date(selectedDate).setHours(0, 0, 0, 0));
        const endOfDay = new Date(new Date(selectedDate).setHours(23, 59, 59, 999));

        // 1. Daily Overview
        console.log('\n--- Testing Daily Overview ---');
        try {
            const deptId = reqUser.department?._id || reqUser.department;
            const deptQuery = { isActive: true, _id: deptId };
            const allDepts = await Department.find(deptQuery).select('name shortName _id');
            const deptMap = {};
            allDepts.forEach(d => {
                const id = d._id.toString();
                deptMap[id] = { _id: id, departmentId: id, department: d.name, shortName: d.shortName, totalStudents: 0, presentCount: 0, absentCount: 0 };
            });
            const records = await AttendanceRecord.find({
                date: { $gte: startOfDay, $lte: endOfDay },
                department: deptId
            });
            records.forEach((r) => {
                const dId = r.department?.toString();
                if (!dId || !deptMap[dId]) return;
                r.attendance.forEach((a) => {
                    deptMap[dId].totalStudents++;
                    if (a.status === 'Present') deptMap[dId].presentCount++;
                    else deptMap[dId].absentCount++;
                });
            });
            const departmentSummary = Object.values(deptMap).map(d => ({ ...d, percentage: d.totalStudents > 0 ? ((d.presentCount / d.totalStudents) * 100).toFixed(1) : '0.0' }));
            console.log('Daily Overview Success, Dept Count:', departmentSummary.length);
        } catch (e) { console.error('Daily Overview Failed:', e); }

        // 2. Summary (Aggregation)
        console.log('\n--- Testing Attendance Summary ---');
        try {
            const deptId = reqUser.department?._id || reqUser.department;
            const matchStage = { department: new mongoose.Types.ObjectId(deptId) };
            const pipeline = [
                { $match: matchStage },
                { $unwind: '$attendance' },
                {
                    $group: {
                        _id: { department: '$department', year: '$year', section: '$section', student: '$attendance.student' },
                        totalClasses: { $sum: 1 },
                        presentCount: { $sum: { $cond: [{ $eq: ['$attendance.status', 'Present'] }, 1, 0] } },
                    },
                },
                {
                    $group: {
                        _id: { department: '$_id.department', year: '$_id.year', section: '$_id.section' },
                        avgAttendance: { $avg: { $multiply: [{ $divide: ['$presentCount', '$totalClasses'] }, 100] } },
                        studentCount: { $sum: 1 },
                    },
                },
                { $lookup: { from: 'departments', localField: '_id.department', foreignField: '_id', as: 'dept' } },
                { $lookup: { from: 'sections', localField: '_id.section', foreignField: '_id', as: 'sec' } },
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
            ];
            const summary = await AttendanceRecord.aggregate(pipeline);
            console.log('Summary Aggregation Success, Results:', summary.length);
        } catch (e) { console.error('Summary Aggregation Failed:', e); }

        // 3. Pending Attendance
        console.log('\n--- Testing Pending Attendance ---');
        try {
            const deptId = reqUser.department?._id || reqUser.department;
            const records = await AttendanceRecord.find({ department: deptId, status: 'pending' })
                .populate('department', 'name shortName')
                .populate('section', 'name year')
                .populate('staff', 'name email')
                .sort({ date: -1 });
            console.log('Pending Attendance Success, Count:', records.length);
        } catch (e) { console.error('Pending Attendance Failed:', e); }

        // 4. Duty Reports
        console.log('\n--- Testing Duty Reports ---');
        try {
            const deptId = reqUser.department?._id || reqUser.department;
            const reports = await DutyReport.find({ department: deptId })
                .populate('user', 'name role email')
                .populate('department', 'name shortName')
                .sort({ createdAt: -1 });
            console.log('Duty Reports Success, Count:', reports.length);
        } catch (e) { console.error('Duty Reports Failed:', e); }

    } catch (err) {
        console.error('Test script crashed:', err);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected');
    }
}

testHODEndpoints();
