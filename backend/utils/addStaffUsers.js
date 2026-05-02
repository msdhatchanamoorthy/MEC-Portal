require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Section = require('../models/Section');
const Department = require('../models/Department');
const connectDB = require('../config/db');

const addStaffUsers = async () => {
    try {
        await connectDB();
        console.log('🔄 Fetching all sections...');

        const sections = await Section.find().populate('department');
        console.log(`Found ${sections.length} sections.`);

        let addedCount = 0;
        let renamedCount = 0;

        for (const section of sections) {
            if (!section.department) continue;

            const deptCode = section.department.shortName.toLowerCase().replace(/[^a-z0-9]/g, '');
            const year = section.year;
            const secLower = section.name.toLowerCase();
            const prefix = `${deptCode}${year}${secLower}`;

            // 1. Rename existing CA users (the ones we updated earlier)
            const caEmail = `${prefix}.ca@mec.in`;
            const caUser = await User.findOne({ email: caEmail });
            if (caUser) {
                caUser.name = `Prof. CA ${section.department.shortName} ${year}${section.name}`;
                await caUser.save();
                renamedCount++;
            }

            // 2. Create new Staff user
            const staffEmail = `${prefix}.staff@mec.in`;
            const staffPass = `${prefix}.staff`;

            // Check if already exists
            const existingStaff = await User.findOne({ email: staffEmail });
            if (!existingStaff) {
                console.log(`Creating ${staffEmail}...`);
                await User.create({
                    name: `Prof. Staff ${section.department.shortName} ${year}${section.name}`,
                    email: staffEmail,
                    password: staffPass, // Will be hashed by pre-save hook
                    role: 'staff',
                    department: section.department._id,
                    year,
                    section: section.name,
                    assignedSections: [section._id]
                });
                addedCount++;
            } else {
                console.log(`⏭️ Staff ${staffEmail} already exists.`);
            }
        }

        console.log(`\n✅ Successfully added ${addedCount} new staff users.`);
        console.log(`✅ Successfully renamed ${renamedCount} existing advisors.`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Update error:', error);
        process.exit(1);
    }
};

addStaffUsers();
