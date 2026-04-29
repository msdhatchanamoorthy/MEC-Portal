const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Student = require('./backend/models/Student');

dotenv.config({ path: './backend/.env' });

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');
        
        const count = await Student.countDocuments();
        console.log('Total Students:', count);
        
        const sample = await Student.find({ isActive: true }).limit(5);
        console.log('Sample Students:', sample.map(s => s.name));
        
        const search = 'raj'; // Example search
        const found = await Student.find({
            isActive: true,
            $or: [
                { name: { $regex: search, $options: 'i' } },
                { rollNumber: { $regex: search, $options: 'i' } }
            ]
        });
        console.log(`Found with "${search}":`, found.length);
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
