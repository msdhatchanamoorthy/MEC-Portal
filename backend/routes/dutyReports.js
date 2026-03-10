const express = require('express');
const router = express.Router();
const { sendDutyReport, getDutyReports, clearDutyReports } = require('../controllers/dutyReportController');
const { protect, roleCheck } = require('../middleware/auth');

router.use(protect);

router.post('/send', sendDutyReport);
router.get('/', getDutyReports);
router.delete('/clear', roleCheck('hod'), clearDutyReports);

module.exports = router;
