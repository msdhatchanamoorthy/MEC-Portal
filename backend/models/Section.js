const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
    name: { type: String, required: true }, // 'A', 'B', 'C'
    year: { type: Number, required: true, min: 1, max: 4 }, // 1, 2, 3, 4
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        required: true,
    },
    classTeacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    studentCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
});

// Compound index to ensure unique section per dept+year
sectionSchema.index({ name: 1, year: 1, department: 1 }, { unique: true });

module.exports = mongoose.model('Section', sectionSchema);
