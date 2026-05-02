const mongoose = require('mongoose');
const User = require('../models/User');
const Student = require('../models/Student');
const Section = require('../models/Section');
const Department = require('../models/Department');
const dotenv = require('dotenv');

dotenv.config();

const checkIT = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        
        // Find an IT student
        const itStudent = await Student.findOne({ rollNumber: /23IT/i });
        console.log('IT Student:', JSON.stringify(itStudent, null, 2));

        if (itStudent) {
            const dept = await Department.findById(itStudent.department);
            const section = await Section.findById(itStudent.section);
            console.log('Dept:', dept.shortName);
            console.log('Section:', section.name);

            // Find CA for this student
            const deptCode = dept.shortName.toLowerCase();
            const caEmail = `${deptCode}${itStudent.year}${section.name.toLowerCase()}.ca@mec.in`;
            console.log('Expected CA Email:', caEmail);

            const ca = await User.findOne({ email: new RegExp(caEmail, 'i') });
            console.log('Found CA User:', JSON.stringify(ca, null, 2));
        }

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkIT();
