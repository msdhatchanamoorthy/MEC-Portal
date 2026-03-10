const mongoose = require('mongoose');

const dutyReportSchema = new mongoose.Schema({
    staffName: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    date: { type: Date, default: Date.now },
    status: { type: String, enum: ['sent', 'acknowledged'], default: 'sent' },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('DutyReport', dutyReportSchema);
