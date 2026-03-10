const express = require('express');
const router = express.Router();
const { protect, roleCheck } = require('../middleware/auth');
const {
    getTimetableForStaff,
    getTimetableForDepartment,
    upsertTimetable,
    deleteTimetable
} = require('../controllers/timetableController');

// All routes are protected
router.use(protect);

router.get('/my-timetable', roleCheck('staff'), getTimetableForStaff);
router.get('/department', roleCheck('hod', 'principal'), getTimetableForDepartment);
router.post('/upsert', roleCheck('hod', 'principal'), upsertTimetable);
router.delete('/:id', roleCheck('hod', 'principal'), deleteTimetable);

module.exports = router;
