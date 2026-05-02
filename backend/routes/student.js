const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { 
    uploadDocument, 
    getMyDocuments, 
    sendMessage, 
    getMessages 
} = require('../controllers/studentController');

router.use(protect);

router.post('/documents', uploadDocument);
router.get('/documents', getMyDocuments);
router.post('/messages', sendMessage);
router.get('/messages', getMessages);

module.exports = router;
