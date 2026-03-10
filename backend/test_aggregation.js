const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/mec_attendance').then(async () => {
    const AttendanceRecord = require('./models/AttendanceRecord');
    const pl = [
        { $match: { date: { $gte: new Date(new Date().setHours(0, 0, 0, 0)), $lte: new Date(new Date().setHours(23, 59, 59, 999)) } } },
        { $unwind: '$attendance' },
        { $match: { 'attendance.status': { $in: ['Absent', 'Leave'] } } },
        { $group: { _id: '$attendance.student', status: { $first: '$attendance.status' } } },
        { $lookup: { from: 'students', localField: '_id', foreignField: '_id', as: 'student' } },
        { $unwind: '$student' }
    ];
    const res = await AttendanceRecord.aggregate(pl);
    console.log(JSON.stringify(res.slice(0, 2), null, 2));
    process.exit(0);
});
