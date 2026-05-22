const express = require('express');
const router = express.Router();
const {
    getStudents,
    createStudent,
    updateStudent,
    deleteStudent,
    uploadExcel,
    deleteSection,
    searchStudents,
    getStudentByRegisterNumber
} = require('../controllers/studentController');
const { protect, roleCheck } = require('../middleware/auth');

router.use(protect);

router.get('/search', roleCheck('hod', 'staff'), searchStudents);
router.get('/:registerNo', roleCheck('hod', 'staff'), getStudentByRegisterNumber);

router.get('/', getStudents);
router.post('/', roleCheck('principal', 'hod'), createStudent);
router.post('/upload-excel', roleCheck('principal', 'hod', 'staff'), uploadExcel);
router.delete('/delete-section', roleCheck('principal', 'hod', 'staff'), deleteSection);
router.put('/:id', roleCheck('principal', 'hod'), updateStudent);
router.delete('/:id', roleCheck('principal'), deleteStudent);

module.exports = router;
