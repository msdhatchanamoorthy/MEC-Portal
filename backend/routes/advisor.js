const express = require('express');
const router = express.Router();
const { protect, roleCheck } = require('../middleware/auth');
const { 
    getStudentDocuments, 
    verifyDocument, 
    replyToStudent, 
    getStudentChat 
} = require('../controllers/advisorController');

router.use(protect);
router.use(roleCheck('staff'));

router.get('/documents', getStudentDocuments);
router.put('/documents/:id', verifyDocument);
router.post('/messages', replyToStudent);
router.get('/messages/:studentId', getStudentChat);

module.exports = router;
