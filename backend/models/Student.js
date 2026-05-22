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
    
    // Detailed Profile Fields from Excel
    tenthPercentage: { type: Number, default: 0 },
    twelfthPercentage: { type: Number, default: 0 },
    diplomaPercentage: { type: Number, default: 0 },
    cgpa: { type: Number, default: 0 },
    currentArrear: { type: Number, default: 0 },
    historyOfArrear: { type: Number, default: 0 },
    dob: { type: String, default: '' },
    bloodGroup: { type: String, default: '' },
    college: { type: String, default: 'Muthayammal Engineering College' },
    firstGraduate: { type: String, default: 'No' },
    address: { type: String, default: '' },
    nativePlace: { type: String, default: '' },
    nativeState: { type: String, default: '' },
    twelfthMedium: { type: String, default: 'English' },
    placementStatus: { type: String, default: 'Not Placed' },
    placementCompany: { type: String, default: '' },
    placementRole: { type: String, default: '' },
    placementType: { type: String, default: '' },
    placementPackage: { type: String, default: '' },
    placementDate: { type: String, default: '' },

    createdAt: { type: Date, default: Date.now },
});

// Optimized Indexes for large data handling
studentSchema.index({ rollNumber: 1 });
studentSchema.index({ registerNumber: 1 });
studentSchema.index({ department: 1, year: 1, section: 1, isActive: 1 });
studentSchema.index({ name: 'text' }); // Enable fast search for student names

module.exports = mongoose.model('Student', studentSchema);
