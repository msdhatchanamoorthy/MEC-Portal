const mongoose = require('mongoose');
const User = require('./models/User');
const DutyReport = require('./models/DutyReport');

const express = require('express');
const app = express();

mongoose.connect('mongodb://localhost:27017/mec_attendance');

app.get('/debug-it', async (req, res) => {
    const deptId = "699ec01da57242fef502c85f";
    const reports = await DutyReport.find({ department: deptId }).populate('user');
    res.json(reports);
});

app.listen(5005, () => console.log('Debug server on 5005'));
