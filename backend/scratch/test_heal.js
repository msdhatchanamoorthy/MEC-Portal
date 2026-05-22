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
        console.log(`Checking ${records.length} records...`);

        let healableCount = 0;
        let unhealableCount = 0;

        for (const record of records) {
            // Find current students for this record's section/year
            const currentStudents = await Student.find({
                department: record.department,
                year: record.year,
                section: record.section
            }).sort({ rollNumber: 1 });

            const invalidEntries = [];
            for (let i = 0; i < record.attendance.length; i++) {
                const sId = record.attendance[i].student;
                const exists = await Student.findById(sId);
                if (!exists) {
                    invalidEntries.push(i);
                }
            }

            if (invalidEntries.length > 0) {
                console.log(`Record ID ${record._id}: Date ${record.date}, Period ${record.period}, Subject ${record.subject}`);
                console.log(`  Invalid student entries: ${invalidEntries.length} / ${record.attendance.length}`);
                console.log(`  Current students in that section: ${currentStudents.length}`);

                if (record.attendance.length === currentStudents.length) {
                    console.log(`  -> CAN HEAL: Student counts match perfectly (${record.attendance.length})!`);
                    healableCount++;
                } else {
                    console.log(`  -> CANNOT HEAL: Count mismatch! Record has ${record.attendance.length}, current section has ${currentStudents.length}.`);
                    unhealableCount++;
                }
            }
        }

        console.log(`\nSummary:`);
        console.log(`  Healable records: ${healableCount}`);
        console.log(`  Unhealable records: ${unhealableCount}`);

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

run();
