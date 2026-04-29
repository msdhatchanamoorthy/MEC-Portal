const express = require('express');
const router = express.Router();
const {
    markAttendance,
    updateAttendance,
    deleteAttendance,
    getAttendance,
    approveAttendance,
    getAttendanceSummary,
    getStudentAttendance,
    getDailyOverview,
    getDepartmentDrilldown,
} = require('../controllers/attendanceController');
const { protect, roleCheck } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

const upload = require('../utils/upload');

// Staff: Mark attendance
router.post('/mark', roleCheck('staff', 'hod', 'principal'), markAttendance);

// Upload proof file
router.post('/upload-proof', roleCheck('staff', 'hod', 'principal'), upload.single('proof'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }
    const fileUrl = `/uploads/proofs/${req.file.filename}`;
    res.json({ success: true, url: fileUrl });
});

// Get attendance records (filtered)
router.get('/', getAttendance);

// Get attendance summary statistics
router.get('/summary', roleCheck('hod', 'principal'), getAttendanceSummary);

// Get daily overview for dashboard
router.get('/daily-overview', roleCheck('hod', 'principal'), getDailyOverview);

// Get detailed drilldown (section-wise)
router.get('/drilldown', roleCheck('hod', 'principal'), getDepartmentDrilldown);

// Get individual student attendance
router.get('/student/:studentId', getStudentAttendance);

// Update attendance record
router.put('/:id', roleCheck('staff', 'hod'), updateAttendance);

// Delete attendance record
router.delete('/:id', roleCheck('staff', 'hod'), deleteAttendance);

// HOD: Approve/reject attendance
router.put('/:id/approve', roleCheck('hod', 'principal'), approveAttendance);

module.exports = router;
