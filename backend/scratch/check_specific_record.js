const mongoose = require('mongoose');
const AttendanceRecord = require('../models/AttendanceRecord');
const Student = require('../models/Student');
const dotenv = require('dotenv');

dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const record = await AttendanceRecord.findById('6a0fd8a3f954cb882c8e770a');
        if (!record) {
            console.log('Record not found.');
            process.exit();
        }

        console.log('RAW Record fields:', Object.keys(record.toObject()));
        const rawAtt = record.attendance.slice(0, 5);
        console.log('First 5 entries:');
        console.log(JSON.stringify(rawAtt, null, 2));

        // Check if those student IDs exist in Student collection
        for (const entry of rawAtt) {
            const studentId = entry.student;
            const exists = await Student.findById(studentId);
            console.log(`Student ID ${studentId} exists?`, !!exists);
        }

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

run();
