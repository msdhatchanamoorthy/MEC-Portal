const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');
const Department = require('./models/Department');

async function check() {
    await mongoose.connect(process.env.MONGO_URI);
    const users = await User.find().populate('department');
    console.log('--- USERS ---');
    users.forEach(u => {
        console.log(`${u.role} | ${u.name} | ${u.department ? u.department.name : 'NONE'}`);
    });
    const depts = await Department.find();
    console.log('\n--- DEPTS ---');
    depts.forEach(d => {
        console.log(`${d.name} | ${d._id}`);
    });
    process.exit(0);
}
check();
