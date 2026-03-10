const express = require('express');
const router = express.Router();
const { exportExcel, exportPDF } = require('../controllers/reportController');
const { protect, roleCheck } = require('../middleware/auth');

router.use(protect);
router.use(roleCheck('hod', 'principal'));

router.get('/excel', exportExcel);
router.get('/pdf', exportPDF);

module.exports = router;
