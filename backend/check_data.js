const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');
const Department = require('./models/Department');

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const hods = await User.find({ role: 'hod' }).populate('department');
        console.log('--- HOD USERS ---');
        hods.forEach(h => {
            console.log(`Name: ${h.name}, Email: ${h.email}, Dept: ${h.department ? h.department.name : 'NULL'}`);
        });

        const depts = await Department.find();
        console.log('\n--- DEPARTMENTS ---');
        depts.forEach(d => {
            console.log(`Name: ${d.name}, ID: ${d._id}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
run();
