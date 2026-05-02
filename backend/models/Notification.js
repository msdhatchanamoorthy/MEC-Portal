const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { 
        type: String, 
        enum: ['staff_attendance', 'duty_report', 'system_alert', 'chat_message', 'document_upload'],
        default: 'staff_attendance'
    },
    relatedId: { type: mongoose.Schema.Types.ObjectId }, // ID of the attendance record, etc.
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Notification', notificationSchema);
