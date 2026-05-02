const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Student = require('../models/Student');
const { sendResetEmail } = require('../utils/mailer');
const crypto = require('crypto');

// Generate JWT token with user info embedded (for instant client-side decode on refresh)
const generateToken = (user) => {
    return jwt.sign(
        {
            id: user._id,
            _user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department,
                year: user.year,
                section: user.section,
                assignedSections: user.assignedSections,
            }
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
    try {
        const { email, password, role } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password' });
        }

        let user = await User.findOne({ email, isActive: true }).populate('department');

        if (!user) {
            // Try searching by Roll Number for students (email starts with roll number)
            const usernamePattern = new RegExp(`^${email.toLowerCase()}@`, 'i');
            user = await User.findOne({ email: usernamePattern, role: 'student', isActive: true }).populate('department');
        }

        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ message: 'Invalid email/roll number or password' });
        }

        if (role && user.role !== role) {
            return res.status(403).json({ message: `Access denied. You are not registered as a ${role}.` });
        }

        const token = generateToken(user);

        res.json({
            success: true,
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department,
                assignedSections: user.assignedSections,
                year: user.year,
                section: user.section,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select('-password')
            .populate('department')
            .populate({ path: 'assignedSections', populate: { path: 'department' } });

        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user._id);

        if (!(await user.comparePassword(currentPassword))) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        user.password = newPassword;
        await user.save();

        res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
    try {
        const { email, rollNumber } = req.body;
        let user = null;

        if (rollNumber) {
            const trimmedRoll = rollNumber.trim();
            const trimmedEmail = email.trim().toLowerCase();

            // 1. Find the student first to get their records
            const student = await Student.findOne({ 
                rollNumber: new RegExp(`^${trimmedRoll}$`, 'i')
            });

            if (!student) {
                return res.status(404).json({ message: 'No student found with this roll number.' });
            }

            // 2. Verify if the entered email matches official or personal email
            const isOfficialMatch = student.email && student.email.toLowerCase() === trimmedEmail;
            const isPersonalMatch = student.personalEmail && student.personalEmail.toLowerCase() === trimmedEmail;

            if (!isOfficialMatch && !isPersonalMatch) {
                // Provide a hint to the user
                const mailToHint = student.personalEmail || student.email;
                const hint = mailToHint.split('@');
                const masked = hint[0].substring(0, 3) + '****' + '@' + hint[1];
                return res.status(400).json({ 
                    message: `The email does not match. Hint: ${masked}` 
                });
            }

            // Find user by roll number
            const rollPattern = new RegExp(`^${student.rollNumber.toLowerCase()}@`, 'i');
            user = await User.findOne({ email: rollPattern, role: 'student' });
        } else {
            // Search by exact email
            user = await User.findOne({ email });
            
            if (!user) {
                // If not found, try searching by username (register number) in student emails
                const usernamePattern = new RegExp(`^${email.toLowerCase()}@`, 'i');
                user = await User.findOne({ email: usernamePattern, role: 'student' });
            }

            // --- NEW: Search by Student's personalEmail ---
            if (!user) {
                const student = await Student.findOne({ personalEmail: email.toLowerCase() });
                if (student) {
                    // Find user by student's roll number (email starts with roll number)
                    const rollPattern = new RegExp(`^${student.rollNumber.toLowerCase()}@`, 'i');
                    user = await User.findOne({ email: rollPattern, role: 'student' });
                }
            }
        }

        if (!user) {
            return res.status(404).json({ message: 'No account found with that email, register number, or personal email.' });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        
        // Save to user with expiry
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();

        const success = await sendResetEmail(user.email, resetToken);

        if (success) {
            res.json({ 
                success: true, 
                message: 'Password reset link sent to your email.',
                resetToken: resetToken // Bypassing for dev environment
            });
        } else {
            res.status(500).json({ message: 'Failed to send email. Please try again later.' });
        }
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired reset token.' });
        }

        // Set new password (User model pre-save will hash it)
        user.password = newPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ success: true, message: 'Password reset successful! You can now log in.' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Verify if roll number exists
// @route   POST /api/auth/verify-roll
// @access  Public
const verifyRollNumber = async (req, res) => {
    try {
        const { rollNumber } = req.body;
        const student = await Student.findOne({ rollNumber: new RegExp(`^${rollNumber}$`, 'i') });
        
        if (!student) {
            return res.status(404).json({ message: 'No student found with this roll number.' });
        }

        res.json({ success: true, message: 'Roll number verified.' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { login, getMe, changePassword, forgotPassword, resetPassword, verifyRollNumber };
