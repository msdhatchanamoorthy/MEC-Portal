const mongoose = require('mongoose');
const User = require('./models/User');
const AttendanceRecord = require('./models/AttendanceRecord');
const Department = require('./models/Department');
require('dotenv').config();

async function test() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const hod = await User.findOne({ role: 'hod' }).populate('department');
        if (!hod) {
            console.log('No HOD found');
            return;
        }
        console.log('Found HOD:', hod.name, 'Dept:', hod.department?.name);

        const deptId = hod.department?._id || hod.department;
        console.log('Dept ID:', deptId);

        console.log('\n--- Testing aggregate summary ---');
        const matchStage = { department: new mongoose.Types.ObjectId(deptId) };
        console.log('Match Stage:', JSON.stringify(matchStage));

        const pipeline = [
            { $match: matchStage },
            { $unwind: '$attendance' },
            {
                $group: {
                    _id: {
                        student: '$attendance.student',
                    },
                    totalClasses: { $sum: 1 },
                    presentCount: {
                        $sum: { $cond: [{ $eq: ['$attendance.status', 'Present'] }, 1, 0] },
                    },
                },
            },
        ];

        console.log('Running test pipeline...');
        const results = await AttendanceRecord.aggregate(pipeline);
        console.log('Test pipeline success, results count:', results.length);

        if (results.length > 0) {
            console.log('First result:', JSON.stringify(results[0]));
        }

    } catch (err) {
        console.error('ERROR CAUGHT:');
        console.error(err);
        if (err.stack) console.error(err.stack);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected');
    }
}

test();
