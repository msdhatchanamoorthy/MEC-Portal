const mongoose = require('mongoose');
const User = require('./models/User');
const Department = require('./models/Department');
const AttendanceRecord = require('./models/AttendanceRecord');
const DutyReport = require('./models/DutyReport');

async function debug() {
    try {
        await mongoose.connect('mongodb://localhost:27017/mec_attendance');
        console.log('Connected to DB');

        const itDept = await Department.findOne({ shortName: 'IT' });
        console.log('IT Department:', itDept ? { id: itDept._id, name: itDept.name } : 'Not found');

        if (itDept) {
            const hod = await User.findOne({ role: 'hod', department: itDept._id });
            console.log('HOD for IT:', hod ? { id: hod._id, name: hod.name, department: hod.department } : 'Not found');

            const dateStr = '2026-02-26';
            const date = new Date(dateStr);
            const start = new Date(date);
            start.setHours(0, 0, 0, 0);
            const end = new Date(date);
            end.setHours(23, 59, 59, 999);

            const pendingRecords = await AttendanceRecord.find({
                department: itDept._id,
                status: 'pending',
                date: { $gte: start, $lte: end }
            });
            console.log('Pending Records for IT on 2026-02-26:', pendingRecords.length);

            const allPending = await AttendanceRecord.find({
                department: itDept._id,
                status: 'pending'
            });
            console.log('Total Pending Records for IT (Any date):', allPending.length);

            const dutyReports = await DutyReport.find({
                department: itDept._id
            });
            console.log('Total Duty Reports for IT:', dutyReports.length);

            // Log some pending records if they exist to see their data
            if (allPending.length > 0) {
                console.log('First Pending Record Date:', allPending[0].date);
            }
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

debug();
