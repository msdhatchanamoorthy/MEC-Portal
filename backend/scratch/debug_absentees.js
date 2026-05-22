const mongoose = require('mongoose');
const AttendanceRecord = require('../models/AttendanceRecord');
const dotenv = require('dotenv');

dotenv.config();

const debugAbsentees = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const records = await AttendanceRecord.find().sort({ date: -1, period: -1 }).limit(1);
        if (records.length > 0) {
            const rawRecord = records[0].toObject();
            console.log('RAW Record fields:', Object.keys(rawRecord));
            console.log('RAW Attendance Sample (first 5):');
            console.log(JSON.stringify(rawRecord.attendance.slice(0, 5), null, 2));
        } else {
            console.log('No records found.');
        }

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

debugAbsentees();
