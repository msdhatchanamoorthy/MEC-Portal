const mongoose = require('mongoose');

const attendanceRecordSchema = new mongoose.Schema({
    date: { type: Date, required: true },
    period: { type: Number, required: true, min: 1, max: 8 }, // Hour/Period number
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
    staff: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    staffName: { type: String, default: '' }, // Saved at submission time for permanent record
    staffEmail: { type: String, default: '' }, // Saved at submission time
    subject: { type: String, default: '' },
    // Array of student attendance entries
    attendance: [
        {
            student: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Student',
                required: true,
            },
            status: {
                type: String,
                enum: ['Present', 'Absent', 'Late', 'Leave', 'OD'],
                required: true,
            },
            reason: { type: String, default: '' },
            proofUrl: { type: String, default: '' },
        },
    ],
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    approvedAt: { type: Date, default: null },
    remarks: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

// Unique constraint: only one attendance record per period/section/date
attendanceRecordSchema.index(
    { date: 1, period: 1, section: 1 },
    { unique: true }
);

// Index for fast queries
attendanceRecordSchema.index({ department: 1, date: 1 });
attendanceRecordSchema.index({ section: 1, date: 1 });
attendanceRecordSchema.index({ staff: 1, date: 1 });

module.exports = mongoose.model('AttendanceRecord', attendanceRecordSchema);
