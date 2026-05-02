const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String },
    authorRole: { type: String },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null }, // Null means all departments
    targetRoles: [{ type: String, enum: ['staff', 'hod', 'principal', 'student', 'all'], default: ['all'] }],
    year: { type: Number, default: null }, // Target specific year
    section: { type: String, default: null }, // Target specific section
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Notice', noticeSchema);
