const mongoose = require('mongoose');
const Student = require('../models/Student');
const dotenv = require('dotenv');

dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const student = await Student.findById('6a0fdc16f954cb882c8ec05e');
        console.log('Student by ID:', student);

        const count = await Student.countDocuments();
        console.log('Total students in DB:', count);

        const firstStudent = await Student.findOne();
        console.log('First student in DB:', firstStudent);

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

run();
