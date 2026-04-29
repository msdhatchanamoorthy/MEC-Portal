const mongoose = require('mongoose');

const markSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    subject: { type: String, required: true },
    assignments: {
        a1: { type: Number, default: 0 },
        a2: { type: Number, default: 0 },
        a3: { type: Number, default: 0 },
        a4: { type: Number, default: 0 },
        a5: { type: Number, default: 0 }
    },
    cia: {
        cia1: { type: Number, default: 0 },
        cia2: { type: Number, default: 0 },
        cia3: { type: Number, default: 0 }
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedAt: { type: Date, default: Date.now }
});

// Compound index to ensure uniqueness per student per subject
markSchema.index({ student: 1, subject: 1 }, { unique: true });

module.exports = mongoose.model('Mark', markSchema);
