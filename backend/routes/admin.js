const express = require('express');
const router = express.Router();
const {
    getDepartments, createDepartment,
    getSections, createSection,
    getUsers, createUser, updateUser,
} = require('../controllers/adminController');
const { protect, roleCheck } = require('../middleware/auth');

router.use(protect);

// Departments
router.get('/departments', getDepartments);
router.post('/departments', roleCheck('principal'), createDepartment);

// Sections
router.get('/sections', getSections);
router.post('/sections', roleCheck('principal', 'hod'), createSection);


// Users (staff/HOD management)
router.get('/users', roleCheck('principal', 'hod'), getUsers);
router.post('/users', roleCheck('principal'), createUser);
router.put('/users/:id', roleCheck('principal'), updateUser);

module.exports = router;
