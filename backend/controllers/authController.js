const jwt = require('jsonwebtoken');
const User = require('../models/User');

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

        const user = await User.findOne({ email, isActive: true }).populate('department');

        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ message: 'Invalid email or password' });
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

module.exports = { login, getMe, changePassword };
