const mongoose = require('mongoose');
const User = require('./models/User');
const Student = require('./models/Student');
const Department = require('./models/Department');
const Section = require('./models/Section');
const dotenv = require('dotenv');

dotenv.config();

const seedStudents = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const students = await Student.find().populate('department');
        
        for (const student of students) {
            const email = student.email || `${student.registerNumber.toLowerCase()}@student.mec.edu.in`;
            
            // Check if user already exists
            const existing = await User.findOne({ email });
            if (!existing) {
                await User.create({
                    name: student.name,
                    email: email,
                    password: student.registerNumber, // Password is register number by default
                    role: 'student',
                    department: student.department._id,
                    year: student.year,
                    section: 'A' // Default to A, or we can find the section name
                });
                console.log(`Created user for ${student.name}`);
            }
        }

        console.log('Student users seeded successfully');
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedStudents();
