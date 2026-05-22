const mongoose = require('mongoose');
const AttendanceRecord = require('../models/AttendanceRecord');
const Student = require('../models/Student');
const dotenv = require('dotenv');

dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        // Fetch all student IDs
        const students = await Student.find({}, '_id name section').lean();
        const validStudentIds = new Set(students.map(s => s._id.toString()));
        console.log(`Total valid students in DB: ${validStudentIds.size}`);

        const records = await AttendanceRecord.find().lean();
        console.log(`Total Attendance Records: ${records.length}`);

        let totalEntries = 0;
        let invalidEntries = 0;
        const invalidRecordsMap = new Map();

        for (const record of records) {
            let recordInvalidCount = 0;
            for (const entry of record.attendance) {
                totalEntries++;
                const sIdStr = entry.student.toString();
                if (!validStudentIds.has(sIdStr)) {
                    invalidEntries++;
                    recordInvalidCount++;
                }
            }
            if (recordInvalidCount > 0) {
                invalidRecordsMap.set(record._id.toString(), {
                    date: record.date,
                    period: record.period,
                    subject: record.subject,
                    section: record.section,
                    invalidCount: recordInvalidCount,
                    totalCount: record.attendance.length
                });
            }
        }

        console.log(`Total Entries checked: ${totalEntries}`);
        console.log(`Invalid Entries (referencing non-existent students): ${invalidEntries}`);
        console.log(`Records with invalid entries: ${invalidRecordsMap.size}`);

        if (invalidRecordsMap.size > 0) {
            console.log('\n--- Sample of records with invalid entries ---');
            let count = 0;
            for (const [id, info] of invalidRecordsMap.entries()) {
                if (count++ >= 10) break;
                console.log(`Record ID: ${id}`);
                console.log(`  Date: ${info.date}`);
                console.log(`  Period: ${info.period}`);
                console.log(`  Subject: ${info.subject}`);
                console.log(`  Section ID: ${info.section}`);
                console.log(`  Invalid entries: ${info.invalidCount} / ${info.totalCount}`);
            }
        }

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

run();
