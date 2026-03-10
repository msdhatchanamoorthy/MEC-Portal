const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema({
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    year: { type: Number, required: true },
    section: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true },
    day: {
        type: String,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        required: true
    },
    period: { type: Number, required: true, min: 1, max: 8 },
    staff: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});

// A specific class instance can only have one teacher per period
timetableSchema.index({ section: 1, day: 1, period: 1 }, { unique: true });

module.exports = mongoose.model('Timetable', timetableSchema);
