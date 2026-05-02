const mongoose = require('mongoose');
const Department = require('../models/Department');
const dotenv = require('dotenv');

dotenv.config();

const checkDepts = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const depts = await Department.find({ shortName: { $in: ['IT', 'CSE'] } });
        console.log('Departments:', JSON.stringify(depts, null, 2));
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkDepts();
