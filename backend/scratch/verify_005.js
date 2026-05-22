const mongoose = require('mongoose');
const Student = require('../models/Student');
const dotenv = require('dotenv');

dotenv.config();

const verify = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const s1 = await Student.findOne({ registerNumber: '23IT001' });
        const s5 = await Student.findOne({ registerNumber: '23IT005' });

        console.log('--- VERIFICATION RESULT ---');
        if (s1) {
            console.log(`23IT001 -> tenth: ${s1.tenthPercentage}, twelfth: ${s1.twelfthPercentage}, diploma: ${s1.diplomaPercentage}`);
        } else {
            console.log('23IT001 not found');
        }

        if (s5) {
            console.log(`23IT005 -> tenth: ${s5.tenthPercentage}, twelfth: ${s5.twelfthPercentage}, diploma: ${s5.diplomaPercentage}`);
        } else {
            console.log('23IT005 not found');
        }

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

verify();
