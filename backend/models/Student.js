const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    rollNumber: { type: String, required: true, unique: true, trim: true },
    registerNumber: { type: String, required: true, unique: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: '' },
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
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
});

// Virtual for attendance percentage (calculated on query)
studentSchema.index({ rollNumber: 1 });
studentSchema.index({ department: 1, year: 1, section: 1 });

module.exports = mongoose.model('Student', studentSchema);
