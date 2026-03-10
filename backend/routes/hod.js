const express = require('express');
const router = express.Router();
const { getStaffList, getHODAttendance, getAbsentees, getAbsenteeReport, getYearWiseAttendance, getSectionWiseAttendance, notifyParents, getTopStudents } = require('../controllers/hodController');
const { protect, roleCheck } = require('../middleware/auth');

// All HOD routes must be protected and restricted to HOD role
router.use(protect);
router.use(roleCheck('hod'));

// GET staff list for HOD department
router.get('/staff', getStaffList);

// GET top students by attendance
router.get('/top-students', getTopStudents);

// GET attendance records with filters for HOD
router.get('/attendance', getHODAttendance);

// GET specific absentees for a record
router.get('/attendance/:attendanceId/absentees', getAbsentees);

// GET department-wide absentee report
router.get('/absentee-report', getAbsenteeReport);

// GET year-wise summary
router.get('/attendance/year-wise', getYearWiseAttendance);

// GET section-wise summary for a year
router.get('/attendance/section-wise', getSectionWiseAttendance);

// POST notify parents of absent students
router.post('/notify-parents', notifyParents);

module.exports = router;
