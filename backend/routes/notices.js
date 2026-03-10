const express = require('express');
const router = express.Router();
const { protect, roleCheck } = require('../middleware/auth');
const { getNotices, createNotice, deleteNotice } = require('../controllers/noticeController');

router.use(protect);

router.get('/', getNotices);
router.post('/', roleCheck('principal', 'hod'), createNotice);
router.delete('/:id', roleCheck('principal', 'hod'), deleteNotice);

module.exports = router;
