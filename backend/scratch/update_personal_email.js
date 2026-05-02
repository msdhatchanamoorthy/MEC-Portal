const mongoose = require('mongoose');
const Student = require('../models/Student');
const dotenv = require('dotenv');

dotenv.config();

const updateStudent = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const student = await Student.findOne({ rollNumber: 'CSE1A001' });
        if (student) {
            student.personalEmail = 'dhatchana.dev@gmail.com';
            await student.save();
            console.log('Student personal email updated to:', student.personalEmail);
        } else {
            console.log('Student not found');
        }
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

updateStudent();
