const mongoose = require('mongoose');
const AttendanceRecord = require('../models/AttendanceRecord');
const Student = require('../models/Student');
const dotenv = require('dotenv');

dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const records = await AttendanceRecord.find();
        console.log('Total Attendance Records:', records.length);

        let totalEntries = 0;
        let validStudentEntries = 0;
        let invalidStudentEntries = 0;

        for (const record of records) {
            for (const entry of record.attendance) {
                totalEntries++;
                const student = await Student.findById(entry.student);
                if (student) {
                    validStudentEntries++;
                } else {
                    invalidStudentEntries++;
                }
            }
        }

        console.log('Total Entries:', totalEntries);
        console.log('Valid Student Entries:', validStudentEntries);
        console.log('Invalid Student Entries:', invalidStudentEntries);

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

run();
