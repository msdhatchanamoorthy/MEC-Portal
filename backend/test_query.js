const mongoose = require('mongoose');
const User = require('./models/User');
const Department = require('./models/Department');
const DutyReport = require('./models/DutyReport');

async function testQuery() {
    try {
        await mongoose.connect('mongodb://localhost:27017/mec_attendance');
        console.log('Connected to DB');

        const itDept = await Department.findOne({ shortName: 'IT' });
        const hod = await User.findOne({ role: 'hod', department: itDept._id }).populate('department');

        console.log('HOD Department Object:', hod.department);

        // Test with the whole object
        const reportsWithObject = await DutyReport.find({ department: hod.department });
        console.log('Reports with Object:', reportsWithObject.length);

        // Test with _id
        const reportsWithId = await DutyReport.find({ department: hod.department._id });
        console.log('Reports with ID:', reportsWithId.length);

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

testQuery();
