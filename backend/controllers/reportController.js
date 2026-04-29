const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const AttendanceRecord = require('../models/AttendanceRecord');

// @desc    Export attendance as Excel
// @route   GET /api/reports/excel
// @access  HOD, Principal
const exportExcel = async (req, res) => {
    try {
        const { departmentId, year, sectionId, startDate, endDate, recordId, date } = req.query;

        let filter = {};
        if (recordId) {
            filter._id = recordId;
        } else if (date) {
            const d = new Date(date);
            const start = new Date(d.setHours(0, 0, 0, 0));
            const end = new Date(d.setHours(23, 59, 59, 999));
            filter.date = { $gte: start, $lte: end };
        } else {
            if (req.user.role === 'hod') filter.department = req.user.department._id;
            if (departmentId) filter.department = departmentId;
            if (year) filter.year = parseInt(year);
            if (sectionId) filter.section = sectionId;
            if (startDate && endDate) {
                filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
            }
        }

        const records = await AttendanceRecord.find(filter)
            .populate('department', 'name')
            .populate('section', 'name year')
            .populate('staff', 'name')
            .populate('attendance.student', 'name rollNumber')
            .sort({ date: -1 });

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'MEC Attendance System';
        const sheet = workbook.addWorksheet('Attendance Report');

        sheet.columns = [
            { header: 'Date', key: 'date', width: 14 },
            { header: 'Period', key: 'period', width: 8 },
            { header: 'Department', key: 'department', width: 20 },
            { header: 'Year', key: 'year', width: 6 },
            { header: 'Section', key: 'section', width: 10 },
            { header: 'Staff', key: 'staff', width: 20 },
            { header: 'Roll Number', key: 'rollNumber', width: 14 },
            { header: 'Student Name', key: 'studentName', width: 22 },
            { header: 'Status', key: 'status', width: 10 },
        ];

        // Header style
        sheet.getRow(1).eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A5F' } };
            cell.font = { bold: true, color: { argb: 'FFFFFF' } };
            cell.alignment = { horizontal: 'center' };
        });

        records.forEach((record) => {
            record.attendance.forEach((a) => {
                const row = sheet.addRow({
                    date: new Date(record.date).toLocaleDateString('en-IN'),
                    period: record.period,
                    department: record.department?.name || '',
                    year: `${record.year}${['st', 'nd', 'rd', 'th'][record.year - 1]} Year`,
                    section: `Section ${record.section?.name || ''}`,
                    staff: record.staff?.name || '',
                    rollNumber: a.student?.rollNumber || '',
                    studentName: a.student?.name || '',
                    status: a.status,
                });

                if (a.status === 'Present') {
                    row.getCell('status').font = { color: { argb: '00AA44' }, bold: true };
                } else {
                    row.getCell('status').font = { color: { argb: 'CC0000' }, bold: true };
                }
            });
        });

        // Auto filter
        sheet.autoFilter = { from: 'A1', to: 'I1' };

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=attendance_report.xlsx');

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Excel export error:', error);
        res.status(500).json({ message: 'Failed to generate Excel report' });
    }
};

// @desc    Export attendance as PDF
// @route   GET /api/reports/pdf
// @access  HOD, Principal
const exportPDF = async (req, res) => {
    try {
        const { departmentId, year, sectionId, startDate, endDate, recordId, date, filterType } = req.query;

        let filter = {};
        if (recordId) {
            filter._id = recordId;
        } else if (date) {
            const d = new Date(date);
            const start = new Date(d.setHours(0, 0, 0, 0));
            const end = new Date(d.setHours(23, 59, 59, 999));
            filter.date = { $gte: start, $lte: end };
        } else {
            if (req.user.role === 'hod') filter.department = req.user.department._id;
            if (departmentId) filter.department = departmentId;
            if (year) filter.year = parseInt(year);
            if (sectionId) filter.section = sectionId;
            if (startDate && endDate) {
                filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
            }
        }

        const records = await AttendanceRecord.find(filter)
            .populate('department', 'name')
            .populate('section', 'name year')
            .populate('staff', 'name')
            .populate('attendance.student', 'name rollNumber registerNumber gender residency')
            .sort({ date: -1, period: 1 })
            .limit(1000);

        if (records.length === 0) {
            return res.status(404).json({ message: 'No records found for the selected criteria' });
        }

        // Apply "Absentees Only" filtering if requested
        if (filterType === 'absentees') {
            records.forEach(r => {
                r.attendance = r.attendance.filter(a => a.status !== 'Present');
            });
        }

        // Calculate statistics
        const stats = {
            totalEntries: 0,
            present: 0,
            absent: 0,
            od: 0
        };

        records.forEach(r => {
            r.attendance.forEach(a => {
                stats.totalEntries++;
                if (a.status === 'Present') stats.present++;
                else if (a.status === 'Absent') stats.absent++;
                else if (a.status === 'OD') stats.od++;
            });
        });

        res.setHeader('Content-Type', 'application/pdf');
        const filename = filterType === 'absentees' ? 'absentee_report.pdf' : 'attendance_report.pdf';
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

        const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape', bufferPages: true });
        doc.pipe(res);

        const colors = {
            primary: '#0F172A',    // Deep Navy
            accent: '#3B82F6',     // Bright Blue
            success: '#10B981',    // Emerald
            danger: '#EF4444',     // Red
            info: '#0EA5E9',       // Sky Blue
            warning: '#F59E0B',    // Amber
            tableHeader: '#1E293B',
            bgLight: '#F8FAFC',
            textMain: '#1E293B',
            textLight: '#64748B',
            border: '#E2E8F0'
        };

        const drawHeader = (isFirstPage = true) => {
            doc.save();
            doc.rect(0, 0, doc.page.width, 120).fill(colors.primary);
            doc.rect(0, 118, doc.page.width, 2).fill(colors.accent);

            doc.fillColor('#FFFFFF').fontSize(24).font('Helvetica-Bold').text('MUTHAYAMMAL ENGINEERING COLLEGE', 40, 35);
            doc.fontSize(10).font('Helvetica').fillColor('rgba(255,255,255,0.7)').text('(AUTONOMOUS) | ACCREDITED BY NAAC WITH \'A\' GRADE', 40, 62);
            doc.fontSize(16).font('Helvetica-Bold').fillColor(colors.accent).text('EXECUTIVE ATTENDANCE INTELLIGENCE REPORT', 40, 80);

            if (filterType === 'absentees') {
                doc.roundedRect(doc.page.width - 240, 75, 200, 28, 6).fill(colors.danger);
                doc.fillColor('#FFFFFF').fontSize(11).font('Helvetica-Bold').text('ABSENTEE LIST', doc.page.width - 240, 84, { width: 200, align: 'center' });
            }

            doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica');
            doc.text(`DATE: ${new Date().toLocaleDateString('en-GB')}`, 550, 35, { align: 'right', width: 240 });
            doc.text(`TIME: ${new Date().toLocaleTimeString('en-US')}`, 550, 47, { align: 'right', width: 240 });
            doc.text(`ISSUED BY: ${req.user.name.toUpperCase()}`, 550, 59, { align: 'right', width: 240 });
            doc.restore();

            if (isFirstPage) {
                const startY = 135;
                const cardW = 180;
                const cardH = 55;

                const drawCard = (label, value, x, color = colors.bgLight, textColor = colors.textMain) => {
                    doc.save();
                    doc.roundedRect(x, startY, cardW, cardH, 12).fill(color);
                    if (color === colors.bgLight) {
                        doc.rect(x, startY + 15, 3, cardH - 30).fill(colors.accent);
                    }
                    doc.fillColor(color === colors.bgLight ? colors.textLight : 'rgba(255,255,255,0.8)').fontSize(7).font('Helvetica-Bold').text(label, x + 15, startY + 15);
                    doc.fillColor(textColor).fontSize(12).font('Helvetica-Bold').text(value || 'N/A', x + 15, startY + 28, { width: cardW - 30, ellipsis: true });
                    doc.restore();
                };

                const deptName = records[0].department?.name || 'ALL DEPARTMENTS';
                drawCard('DEPARTMENT', deptName, 40);
                drawCard('YEAR / SECTION', sectionId ? `${year}${['st', 'nd', 'rd', 'th'][year - 1]} Year - Sec ${records[0].section?.name}` : 'CONSOLIDATED', 235);
                
                const statsX = 430;
                doc.save();
                doc.roundedRect(statsX, startY, 360, cardH, 12).fill('#1E293B');
                doc.fillColor(colors.accent).fontSize(7).font('Helvetica-Bold').text('SESSION METRICS', statsX + 20, startY + 15);
                
                doc.fontSize(14).fillColor('#FFFFFF');
                doc.text(`TOTAL: ${stats.totalEntries}`, statsX + 20, startY + 28);
                doc.fillColor(colors.success).text(`PRESENT: ${stats.present}`, statsX + 105, startY + 28);
                doc.fillColor(colors.danger).text(`ABSENT: ${stats.absent}`, statsX + 205, startY + 28);
                doc.fillColor(colors.info).text(`OD: ${stats.od}`, statsX + 295, startY + 28);
                doc.restore();
            }
        };

        drawHeader(true);

        const columns = {
            date: { x: 40, w: 75, label: 'DATE' },
            per: { x: 115, w: 40, label: 'PRD' },
            subj: { x: 155, w: 120, label: 'SUBJECT' },
            reg: { x: 275, w: 100, label: 'REGISTER NO' },
            name: { x: 375, w: 190, label: 'STUDENT NAME' },
            gender: { x: 565, w: 70, label: 'GENDER' },
            staff: { x: 635, w: 105, label: 'FACULTY' },
            status: { x: 740, w: 60, label: 'STATUS' }
        };

        const drawTableHeader = (y) => {
            doc.save();
            doc.roundedRect(40, y, 750, 30, 4).fill(colors.tableHeader);
            doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold');
            Object.values(columns).forEach(c => {
                doc.text(c.label, c.x + 8, y + 10);
            });
            doc.restore();
            return y + 35;
        };

        let currentY = drawTableHeader(205);
        let rowCount = 0;

        // Flatten records and attendance to a single list to simplify page handling
        const allEntries = [];
        records.forEach(r => {
            r.attendance.forEach(a => {
                allEntries.push({ record: r, entry: a });
            });
        });

        allEntries.forEach((item, index) => {
            const { record, entry } = item;
            
            if (currentY > 500) {
                doc.addPage({ size: 'A4', layout: 'landscape' });
                drawHeader(false);
                currentY = drawTableHeader(140);
            }

            if (rowCount % 2 === 1) {
                doc.fillColor('#F8FAFC').rect(40, currentY - 5, 750, 25).fill();
            }

            doc.fontSize(8).font('Helvetica').fillColor(colors.textMain);
            doc.text(new Date(record.date).toLocaleDateString('en-GB'), columns.date.x + 8, currentY);
            doc.text(record.period.toString(), columns.per.x + 8, currentY, { align: 'center', width: 25 });
            doc.text(record.subject || '---', columns.subj.x + 8, currentY, { width: 110, ellipsis: true });
            doc.font('Helvetica-Bold').text(entry.student?.registerNumber || '---', columns.reg.x + 8, currentY);
            doc.font('Helvetica').text(entry.student?.name || '---', columns.name.x + 8, currentY, { width: 180, ellipsis: true });
            doc.fontSize(7).text(entry.student?.gender === 'Male' ? 'MALE' : 'FEMALE', columns.gender.x + 8, currentY);
            doc.fontSize(7).text(record.staffName || '---', columns.staff.x + 8, currentY, { width: 100, ellipsis: true });

            const sColor = entry.status === 'Present' ? colors.success : (entry.status === 'OD' ? colors.info : colors.danger);
            doc.save();
            doc.roundedRect(columns.status.x, currentY - 5, 50, 16, 8).fill(sColor);
            doc.fillColor('#FFFFFF').fontSize(7).font('Helvetica-Bold').text(entry.status.toUpperCase().charAt(0), columns.status.x, currentY - 1, { width: 50, align: 'center' });
            doc.restore();
            doc.save();
            doc.fillColor(sColor).fontSize(7).font('Helvetica-Bold').text(entry.status.toUpperCase(), columns.status.x, currentY - 1, { width: 50, align: 'center' });
            doc.restore();

            currentY += 25;
            rowCount++;
        });

        // Authorized Signature Area - Final Check
        if (currentY > 450) {
            doc.addPage({ size: 'A4', layout: 'landscape' });
            drawHeader(false);
            currentY = 140;
        }
        
        const signY = currentY + 70;
        doc.save();
        doc.lineWidth(0.5).strokeColor(colors.border).moveTo(40, signY).lineTo(220, signY).stroke();
        doc.fontSize(9).font('Helvetica-Bold').fillColor(colors.textMain).text('CLASS IN-CHARGE', 40, signY + 10, { width: 180, align: 'center' });

        doc.circle(doc.page.width / 2, signY - 10, 30).lineWidth(1).strokeColor('rgba(0,0,0,0.05)').stroke();
        doc.fontSize(6).fillColor('rgba(0,0,0,0.1)').text('OFFICIAL SEAL', doc.page.width / 2 - 25, signY - 13, { width: 50, align: 'center' });

        doc.lineWidth(0.5).strokeColor(colors.border).moveTo(doc.page.width - 220, signY).lineTo(doc.page.width - 40, signY).stroke();
        doc.fontSize(9).font('Helvetica-Bold').fillColor(colors.textMain).text('HEAD OF THE DEPARTMENT', doc.page.width - 220, signY + 10, { width: 180, align: 'center' });
        doc.restore();

        // Footer System - Apply to ALL pages
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
            doc.switchToPage(i);
            doc.save();
            doc.rect(0, doc.page.height - 40, doc.page.width, 40).fill(colors.primary);
            doc.fillColor('rgba(255,255,255,0.6)').fontSize(8).font('Helvetica').text(`PAGE ${i + 1} OF ${pages.count} | SECURE DIGITAL REPORT | © MUTHAYAMMAL ENGINEERING COLLEGE`, 0, doc.page.height - 25, { align: 'center', width: doc.page.width });
            doc.restore();
        }

        doc.end();
    } catch (error) {
        console.error('PDF export error:', error);
        res.status(500).json({ message: 'Failed to generate PDF' });
    }
};
module.exports = { exportExcel, exportPDF };
