require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Department = require('../models/Department');
const connectDB = require('../config/db');

const updateStaff = async () => {
    try {
        await connectDB();
        console.log('🔄 Fetching staff users...');

        const staffUsers = await User.find({ role: 'staff' }).populate('department');
        console.log(`Found ${staffUsers.length} staff users.`);

        let updatedCount = 0;

        for (const user of staffUsers) {
            if (!user.department || !user.year || !user.section) {
                console.log(`⚠️ Skipping staff ${user.name} due to missing dept/year/section info.`);
                continue;
            }

            const deptCode = user.department.shortName.toLowerCase().replace(/[^a-z0-9]/g, '');
            const year = user.year;
            const sec = user.section.toLowerCase();

            // Pattern: [dept][year][section].ca
            const newId = `${deptCode}${year}${sec}.ca`;
            const newEmail = `${newId}@mec.in`;
            const newPassword = newId;

            console.log(`Updating ${user.email} -> ${newEmail}`);

            user.email = newEmail;
            user.password = newPassword; // Will be hashed by pre-save hook
            
            await user.save();
            updatedCount++;
        }

        console.log(`\n✅ Successfully updated ${updatedCount} staff users.`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Update error:', error);
        process.exit(1);
    }
};

updateStaff();
