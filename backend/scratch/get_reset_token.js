const mongoose = require('mongoose');
const User = require('../models/User');
const dotenv = require('dotenv');

dotenv.config();

const findToken = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const user = await User.findOne({ email: 'cse1a001@student.mec.edu.in' });
        if (user) {
            console.log('User found:', user.email);
            console.log('Reset Token:', user.resetPasswordToken);
            console.log('Expires:', user.resetPasswordExpires);
        } else {
            console.log('User not found');
        }
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

findToken();
