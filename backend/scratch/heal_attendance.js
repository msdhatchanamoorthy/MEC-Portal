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
        console.log(`Analyzing ${records.length} records...`);

        let healedRecordsCount = 0;
        let healedEntriesCount = 0;

        for (const record of records) {
            // Find current students for this record's section/year/department
            const currentStudents = await Student.find({
                department: record.department,
                year: record.year,
                section: record.section
            }).sort({ rollNumber: 1 });

            let hasInvalid = false;
            for (const entry of record.attendance) {
                const studentExists = await Student.exists({ _id: entry.student });
                if (!studentExists) {
                    hasInvalid = true;
                    break;
                }
            }

            if (hasInvalid) {
                console.log(`\nHealing Record ID: ${record._id}`);
                console.log(`  Date: ${record.date.toDateString()}, Period: ${record.period}, Subject: ${record.subject}`);
                console.log(`  Record entries count: ${record.attendance.length}`);
                console.log(`  Current students count: ${currentStudents.length}`);

                if (currentStudents.length === 0) {
                    console.log(`  ⚠️ Skipping: No current students found in this section.`);
                    continue;
                }

                // Map entries by index
                let updatedEntries = 0;
                for (let i = 0; i < record.attendance.length; i++) {
                    // Check if there is a corresponding current student at index i
                    if (i < currentStudents.length) {
                        const oldId = record.attendance[i].student;
                        const newId = currentStudents[i]._id;
                        
                        if (oldId.toString() !== newId.toString()) {
                            record.attendance[i].student = newId;
                            updatedEntries++;
                        }
                    } else {
                        console.log(`  ⚠️ Warning: Entry index ${i} exceeds current student count ${currentStudents.length}. Leaving as is.`);
                    }
                }

                if (updatedEntries > 0) {
                    await record.save();
                    console.log(`  ✅ Successfully healed ${updatedEntries} entries in this record!`);
                    healedRecordsCount++;
                    healedEntriesCount += updatedEntries;
                } else {
                    console.log(`  ℹ️ No changes needed (already mapped).`);
                }
            }
        }

        console.log(`\n--- HEALING COMPLETE ---`);
        console.log(`Total records healed: ${healedRecordsCount}`);
        console.log(`Total entries updated: ${healedEntriesCount}`);

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

run();
