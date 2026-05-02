const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: {
        type: String,
        enum: ['principal', 'hod', 'staff', 'student'],
        required: true,
    },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    // Specific for Staff based on strict pattern (it1a, it2b, etc)
    year: { type: Number, default: null },
    section: { type: String, default: null },
    // For staff: additional sections they teach
    assignedSections: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Section' }],
    isActive: { type: Boolean, default: true },
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
