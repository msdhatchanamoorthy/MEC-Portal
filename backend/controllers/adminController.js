const Department = require('../models/Department');
const Section = require('../models/Section');
const User = require('../models/User');

// --- DEPARTMENT CRUD ---
const getDepartments = async (req, res) => {
    try {
        const depts = await Department.find({ isActive: true }).populate('hod', 'name email');
        res.json({ success: true, data: depts });
    } catch (e) {
        res.status(500).json({ message: 'Server error' });
    }
};

const createDepartment = async (req, res) => {
    try {
        const dept = await Department.create(req.body);
        res.status(201).json({ success: true, data: dept });
    } catch (e) {
        res.status(400).json({ message: e.message });
    }
};

// --- SECTION CRUD ---
const getSections = async (req, res) => {
    try {
        const { departmentId, year } = req.query;
        let filter = { isActive: true };
        if (departmentId) filter.department = departmentId;
        if (year) filter.year = parseInt(year);

        const sections = await Section.find(filter)
            .populate('department', 'name shortName')
            .sort({ year: 1, name: 1 });
        res.json({ success: true, data: sections });
    } catch (e) {
        res.status(500).json({ message: 'Server error' });
    }
};

const createSection = async (req, res) => {
    try {
        const section = await Section.create(req.body);
        res.status(201).json({ success: true, data: section });
    } catch (e) {
        res.status(400).json({ message: e.message });
    }
};


// --- USER MANAGEMENT (PRINCIPAL ONLY) ---
const getUsers = async (req, res) => {
    try {
        const { role, departmentId } = req.query;
        let filter = { isActive: true };
        if (role) filter.role = role;
        if (departmentId) filter.department = departmentId;

        const users = await User.find(filter)
            .select('-password')
            .populate('department', 'name shortName')
            .populate('assignedSections', 'name year');
        res.json({ success: true, data: users });
    } catch (e) {
        res.status(500).json({ message: 'Server error' });
    }
};

const createUser = async (req, res) => {
    try {
        const user = await User.create(req.body);
        const u = await User.findById(user._id).select('-password').populate('department');
        res.status(201).json({ success: true, data: u });
    } catch (e) {
        if (e.code === 11000) return res.status(400).json({ message: 'Email already exists' });
        res.status(400).json({ message: e.message });
    }
};

const updateUser = async (req, res) => {
    try {
        const { password, ...rest } = req.body;
        const user = await User.findByIdAndUpdate(req.params.id, rest, { new: true, runValidators: true })
            .select('-password')
            .populate('department');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json({ success: true, data: user });
    } catch (e) {
        res.status(400).json({ message: e.message });
    }
};

module.exports = {
    getDepartments, createDepartment,
    getSections, createSection,
    getUsers, createUser, updateUser,
};
