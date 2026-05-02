require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const Department = require('../models/Department');
const Section = require('../models/Section');
const Student = require('../models/Student');

const connectDB = require('../config/db');

const DEPARTMENTS = [
    { name: 'Computer Science and Engineering', shortName: 'CSE' },
    { name: 'Information Technology', shortName: 'IT' },
    { name: 'Artificial Intelligence and Data Science', shortName: 'AIDS' }, // Changed to AIDS for cleaner email
    { name: 'Artificial Intelligence and Machine Learning', shortName: 'AIML' },
    { name: 'Cyber Security', shortName: 'CS' },
    { name: 'Computer Science and Business Systems', shortName: 'CSBS' },
    { name: 'Electronics and Communication Engineering', shortName: 'ECE' },
    { name: 'Electrical and Electronics Engineering', shortName: 'EEE' },
    { name: 'Electronics Engineering (VLSI Design and Technology)', shortName: 'VLSI' },
    { name: 'Mechanical Engineering', shortName: 'MECH' },
    { name: 'Mechatronics Engineering', shortName: 'MECT' },
    { name: 'Civil Engineering', shortName: 'CIVIL' },
    { name: 'Bio-Medical Engineering', shortName: 'BME' },
    { name: 'Bio-Technology', shortName: 'BT' },
    { name: 'Agricultural Engineering', shortName: 'AGE' },
];


const seed = async () => {
    try {
        await connectDB();

        console.log('🗑️  Clearing existing data...');
        await Promise.all([
            User.deleteMany({}),
            Department.deleteMany({}),
            Section.deleteMany({}),
            Student.deleteMany({}),
        ]);

        console.log('🏢 Creating departments...');
        const deptDocs = await Department.insertMany(DEPARTMENTS);

        // 1. PRINCIPAL
        console.log('👤 Creating Principal...');
        await User.create({
            name: 'Dr.P.Senthilkumar,M.E.,Ph.D.(IITM)',
            email: 'principal@mec.edu.in',
            password: 'principal', // Pattern: principal
            role: 'principal',
        });

        // Loop through each department
        for (const dept of deptDocs) {
            const deptCode = dept.shortName.toLowerCase().replace(/[^a-z0-9]/g, '');
            console.log(`📁 Processing: ${dept.shortName} (code: ${deptCode})`);

            // 2. HOD
            const hod = await User.create({
                name: `Prof. HOD ${dept.shortName}`,
                email: `hod.${deptCode}@mec.edu.in`, // Pattern: hod.<dept>@
                password: `${deptCode}hod`, // Pattern: <dept>hod
                role: 'hod',
                department: dept._id,
            });

            // Update department with HOD reference
            await Department.findByIdAndUpdate(dept._id, { hod: hod._id });

            // Create Sections
            const sections = [];
            for (let year = 1; year <= 4; year++) {
                for (const secName of ['A', 'B']) {
                    const section = await Section.create({
                        name: secName,
                        year,
                        department: dept._id,
                    });
                    sections.push(section);

                    // 3. ADVISOR & STAFF (Two logins for every section)
                    const secLower = secName.toLowerCase();
                    const prefix = `${deptCode}${year}${secLower}`;

                    // Advisor (CA)
                    await User.create({
                        name: `Prof. CA ${dept.shortName} ${year}${secName}`,
                        email: `${prefix}.ca@mec.in`,
                        password: `${prefix}.ca`,
                        role: 'staff',
                        department: dept._id,
                        year,
                        section: secName,
                        assignedSections: [section._id],
                    });

                    // Staff
                    await User.create({
                        name: `Prof. Staff ${dept.shortName} ${year}${secName}`,
                        email: `${prefix}.staff@mec.in`,
                        password: `${prefix}.staff`,
                        role: 'staff',
                        department: dept._id,
                        year,
                        section: secName,
                        assignedSections: [section._id],
                    });
                }
            }


            // Create some sample students (5 per section for total 40 per dept)
            for (const section of sections) {
                for (let i = 1; i <= 5; i++) {
                    const rollNo = `${deptCode.toUpperCase()}${section.year}${section.name}${String(i).padStart(3, '0')}`;
                    await Student.create({
                        name: `Student ${dept.shortName} ${section.year}${section.name} ${i}`,
                        rollNumber: rollNo,
                        registerNumber: `REG${rollNo}`,
                        email: `${rollNo.toLowerCase()}@student.mec.edu.in`,
                        department: dept._id,
                        year: section.year,
                        section: section._id,
                        gender: i % 2 === 0 ? 'Female' : 'Male',
                    });
                }
            }
        }

        console.log('\n✅ MEC Attendance System Strictly Rooted Seed completed!\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔑 CREDENTIAL RULES:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('1. PRINCIPAL:');
        console.log('   Email:    principal@mec.edu.in');
        console.log('   Password: principal');
        console.log('');
        console.log('2. HOD (Pattern: hod.<dept>@, pass: <dept>hod):');
        console.log('   Example:  hod.it@mec.edu.in / ithod');
        console.log('   Example:  hod.cse@mec.edu.in / csehod');
        console.log('');
        console.log('3. ADVISOR & STAFF (Pattern: <dept><year><sec>.[ca|staff]@mec.in):');
        console.log('   Advisor:  it1a.ca@mec.in / it1a.ca');
        console.log('   Staff:    it1a.staff@mec.in / it1a.staff');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Seed error:', error);
        process.exit(1);
    }
};

seed();
