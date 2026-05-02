const mongoose = require('mongoose');
const User = require('../models/User');
const dotenv = require('dotenv');

dotenv.config();

const findCA = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const ca = await User.findOne({ email: /ca@mec.in/i });
        console.log('Any CA:', JSON.stringify(ca, null, 2));
        
        const cseCA = await User.findOne({ email: /cse1a.ca@mec.in/i });
        console.log('CSE 1A CA:', JSON.stringify(cseCA, null, 2));

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

findCA();
