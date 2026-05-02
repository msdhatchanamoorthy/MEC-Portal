const mongoose = require('mongoose');

const studentDocumentSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    advisor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: { type: String, required: true },
    category: { 
        type: String, 
        enum: ['Certificate', 'Photo', 'Project', 'Other'],
        required: true 
    },
    fileUrl: { type: String, required: true },
    status: { 
        type: String, 
        enum: ['Pending', 'Verified', 'Rejected'],
        default: 'Pending'
    },
    remarks: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('StudentDocument', studentDocumentSchema);
