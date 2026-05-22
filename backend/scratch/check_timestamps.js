const mongoose = require('mongoose');
const AttendanceRecord = require('../models/AttendanceRecord');
const Student = require('../models/Student');
const dotenv = require('dotenv');

dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const record = await AttendanceRecord.findById('6a0fd8a3f954cb882c8e770a');
        if (record) {
            console.log('Attendance Record CreatedAt:', record.createdAt);
            const firstStudentId = record.attendance[0].student;
            console.log('Record Student ID:', firstStudentId);
            
            const studentExists = await Student.findById(firstStudentId);
            console.log('Student Exists under that ID?', !!studentExists);
        } else {
            console.log('Record 6a0fd8a3f954cb882c8e770a not found');
        }

        const latestStudent = await Student.findOne().sort({ createdAt: -1 });
        if (latestStudent) {
            console.log('Latest Student CreatedAt:', latestStudent.createdAt);
            console.log('Latest Student Name:', latestStudent.name);
        }

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

run();
