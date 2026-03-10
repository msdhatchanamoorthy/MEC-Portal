const mongoose = require('mongoose');
const User = require('./models/User');
const AttendanceRecord = require('./models/AttendanceRecord');
const Department = require('./models/Department');

async function simulate() {
    try {
        await mongoose.connect('mongodb://localhost:27017/mec_attendance');
        console.log('Connected to DB');

        const user = await User.findOne({ email: 'hod.it@mec.edu.in' }).populate('department');
        console.log('User Role:', user.role);
        console.log('User Dept:', user.department._id);

        let filter = {
            department: user.department._id,
            status: 'pending'
        };

        console.log('Query Filter:', filter);

        const records = await AttendanceRecord.find(filter);
        console.log('Records Found:', records.length);

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

simulate();
