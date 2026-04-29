const express = require('express');
const router = express.Router();
const { uploadMarks, searchStudent, getStudentMarks } = require('../controllers/markController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/upload', uploadMarks);
router.get('/search', searchStudent);
router.get('/:studentId', getStudentMarks);

module.exports = router;
