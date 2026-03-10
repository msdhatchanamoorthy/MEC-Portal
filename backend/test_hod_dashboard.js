const mongoose = require('mongoose');
const User = require('./models/User');
const AttendanceRecord = require('./models/AttendanceRecord');
const Department = require('./models/Department');
require('dotenv').config();

async function test() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    const hod = await User.findOne({ role: 'hod' }).populate('department');
    if (!hod) {
        console.log('No HOD found');
        process.exit(1);
    }
    console.log('Found HOD:', hod.name, 'Dept:', hod.department?.name);

    const selectedDate = new Date().toISOString().split('T')[0];
    const today = new Date(selectedDate);
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    console.log('\n--- Testing daily-overview ---');
    try {
        const deptQuery = { isActive: true, _id: hod.department?._id };
        const allDepts = await Department.find(deptQuery).select('name shortName _id');
        const deptMap = {};
        allDepts.forEach(d => {
            const id = d._id.toString();
            deptMap[id] = { _id: id, departmentId: id, department: d.name, shortName: d.shortName, totalStudents: 0, presentCount: 0, absentCount: 0 };
        });
        const records = await AttendanceRecord.find({
            date: { $gte: startOfDay, $lte: endOfDay },
            department: hod.department?._id
        });
        records.forEach((r) => {
            const deptId = r.department?.toString();
            if (!deptId || !deptMap[deptId]) return;
            r.attendance.forEach((a) => {
                deptMap[deptId].totalStudents++;
                if (a.status === 'Present') deptMap[deptId].presentCount++;
                else deptMap[deptId].absentCount++;
            });
        });
        console.log('Daily overview success');
    } catch (err) {
        console.error('Daily overview failed:', err);
    }

    console.log('\n--- Testing summary ---');
    try {
        const matchStage = { department: hod.department?._id };
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
            { $unwind: { path: '$dept', preserveNullAndEmpty: true } },
            { $unwind: { path: '$sec', preserveNullAndEmpty: true } },
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
        console.log('Summary success, results:', summary.length);
    } catch (err) {
        console.error('Summary failed:', err);
    }

    process.exit(0);
}

test();
