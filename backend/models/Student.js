const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    rollNumber: { type: String, required: true, unique: true, trim: true },
    registerNumber: { type: String, required: true, unique: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: '' },
    personalEmail: { type: String, trim: true, lowercase: true, default: '' },
    phone: { type: String, default: '' },
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        required: true,
    },
    year: { type: Number, required: true, min: 1, max: 4 },
    section: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Section',
        required: true,
    },
    internalMarks: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], default: 'Male' },
    residency: { type: String, enum: ['Day Scholar', 'Hosteller'], default: 'Day Scholar' },
    createdAt: { type: Date, default: Date.now },
});

// Optimized Indexes for large data handling
studentSchema.index({ rollNumber: 1 });
studentSchema.index({ registerNumber: 1 });
studentSchema.index({ department: 1, year: 1, section: 1, isActive: 1 });
studentSchema.index({ name: 'text' }); // Enable fast search for student names

module.exports = mongoose.model('Student', studentSchema);
