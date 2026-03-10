const mongoose = require('mongoose');
const DutyReport = require('./models/DutyReport');
const User = require('./models/User');

async function testFetch() {
    await mongoose.connect('mongodb://localhost:27017/mec_attendance');

    const dateQuery = "2026-02-26";
    const d = new Date(dateQuery);
    const start = new Date(d.setHours(0, 0, 0, 0));
    const end = new Date(d.setHours(23, 59, 59, 999));

    const filter = {
        department: "699ec01da57242fef502c85f",
        createdAt: { $gte: start, $lte: end }
    };

    console.log('Testing Filter:', JSON.stringify(filter, null, 2));

    const reports = await DutyReport.find(filter);
    console.log('Result Count:', reports.length);
    if (reports.length > 0) {
        console.log('First Item ID:', reports[0]._id);
    }

    await mongoose.disconnect();
}

testFetch();
