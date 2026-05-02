const mongoose = require('mongoose');
const Student = require('../models/Student');
const dotenv = require('dotenv');

dotenv.config();

const debugStudent = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const students = await Student.find({ rollNumber: /cse1a001/i });
        console.log('Found students:', JSON.stringify(students, null, 2));
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

debugStudent();
