const mongoose = require('mongoose');
const User = require('./models/User');
const Department = require('./models/Department');

async function checkUser() {
    try {
        await mongoose.connect('mongodb://localhost:27017/mec_attendance');
        const users = await User.find({ role: 'hod' }).populate('department');
        console.log(JSON.stringify(users, null, 2));
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkUser();
