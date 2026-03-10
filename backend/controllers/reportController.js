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
            .populate('attendance.student', 'name rollNumber registerNumber')
            .sort({ date: -1, period: 1 })
            .limit(1000);

        if (records.length === 0) {
            return res.status(404).json({ message: 'No records found for the selected criteria' });
        }

        // Calculate statistics for the summary
        const stats = {
            totalEntries: 0,
            present: 0,
            absent: 0,
            leave: 0
        };

        records.forEach(r => {
            r.attendance.forEach(a => {
                stats.totalEntries++;
                if (a.status === 'Present') stats.present++;
                else if (a.status === 'Absent') stats.absent++;
                else if (a.status === 'Leave') stats.leave++;
            });
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=attendance_report.pdf');

        const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape', bufferPages: true });
        doc.pipe(res);

        // --- Colors ---
        const colors = {
            primary: '#1e3a8a',    // Navy Blue
            secondary: '#64748b',  // Slate
            success: '#10b981',    // Emerald
            danger: '#ef4444',     // Red/Rose
            warning: '#f59e0b',    // Amber
            tableHeader: '#1e3a8a',
            tableRowEven: '#f8fafc',
            textMain: '#1e293b',
            textLight: '#94a3b8'
        };

        const drawHeader = (isFirstPage = true) => {
            // Header Bar
            doc.save();
            doc.rect(0, 0, doc.page.width, 80).fill(colors.primary);
            doc.fillColor('#ffffff').fontSize(24).font('Helvetica-Bold').text('MEC ATTENDANCE SYSTEM', 40, 25);
            doc.fontSize(10).font('Helvetica').text('Official Department Attendance Report', 40, 55);

            // Generate Info (Right Side)
            if (isFirstPage) {
                doc.fontSize(8).text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 650, 30, { align: 'right' });
                doc.text(`Generated by: ${req.user.name}`, 650, 42, { align: 'right' });
                doc.text(`Role: ${req.user.role.toUpperCase()}`, 650, 54, { align: 'right' });
            }
            doc.restore();

            if (isFirstPage) {
                // Metadata Summary Boxes
                let boxX = 40;
                const boxWidth = 140;
                const boxHeight = 45;

                const drawInfoBox = (label, value, x) => {
                    doc.roundedRect(x, 100, boxWidth, boxHeight, 5).fill('#f1f5f9');
                    doc.fillColor(colors.secondary).fontSize(8).font('Helvetica').text(label.toUpperCase(), x + 10, 110);
                    doc.fillColor(colors.textMain).fontSize(11).font('Helvetica-Bold').text(value || 'N/A', x + 10, 122, { width: boxWidth - 20 });
                };

                const deptName = records[0].department?.name || 'Department';
                drawInfoBox('Department', deptName, boxX);
                drawInfoBox('Year', year ? `${year}${['st', 'nd', 'rd', 'th'][year - 1]} Year` : 'ALL YEARS', boxX + (boxWidth + 15) * 1);
                drawInfoBox('Section', records[0].section?.name ? `Section ${records[0].section.name}` : 'ALL SECTIONS', boxX + (boxWidth + 15) * 2);

                // Stats Box
                const statsX = boxX + (boxWidth + 15) * 3 + 20;
                doc.roundedRect(statsX, 100, 240, boxHeight, 8).lineWidth(1).stroke(colors.textLight);
                doc.fillColor(colors.textMain).fontSize(9).font('Helvetica-Bold').text('ATTENDANCE SUMMARY', statsX + 10, 108);

                doc.fontSize(8).font('Helvetica');
                doc.fillColor(colors.textMain).text(`Total: ${stats.totalEntries}`, statsX + 10, 125);
                doc.fillColor(colors.success).text(`Present: ${stats.present}`, statsX + 70, 125);
                doc.fillColor(colors.danger).text(`Absent: ${stats.absent}`, statsX + 140, 125);
                doc.fillColor(colors.warning).text(`Leave: ${stats.leave}`, statsX + 210, 125);

                doc.moveDown(5);
            } else {
                doc.moveDown(5);
            }
        };

        drawHeader(true);

        // --- Table Setup ---
        const tableTop = 165;
        const columns = {
            date: { x: 40, w: 75, label: 'DATE' },
            period: { x: 115, w: 40, label: 'PER' },
            staff: { x: 155, w: 120, label: 'FACULTY NAME' },
            roll: { x: 275, w: 100, label: 'ROLL NUMBER' },
            name: { x: 375, w: 200, label: 'STUDENT NAME' },
            section: { x: 575, w: 90, label: 'YEAR/SEC' },
            status: { x: 665, w: 95, label: 'ATTENDANCE' }
        };

        const drawTableHeader = (y) => {
            doc.save();
            doc.roundedRect(40, y, 750, 22, 4).fill(colors.tableHeader);
            doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');

            Object.values(columns).forEach(col => {
                doc.text(col.label, col.x + 5, y + 7, { width: col.w - 10, align: 'left' });
            });
            doc.restore();
            return y + 25;
        };

        let currentY = drawTableHeader(tableTop);
        let rowCount = 0;

        records.forEach((record) => {
            record.attendance.forEach((entry, idx) => {
                const isLastEntry = (record === records[records.length - 1]) && (idx === record.attendance.length - 1);

                // Page check
                if (currentY > 520 && !isLastEntry) {
                    doc.addPage({ layout: 'landscape' });
                    drawHeader(false);
                    currentY = drawTableHeader(100);
                }

                // Alternate row background
                if (rowCount % 2 === 1) {
                    doc.fillColor(colors.tableRowEven).rect(40, currentY - 2, 750, 18).fill();
                }

                doc.fontSize(8).font('Helvetica');
                doc.fillColor(colors.textMain);

                // Draw cells
                doc.text(new Date(record.date).toLocaleDateString('en-GB'), columns.date.x + 5, currentY);
                doc.text(record.period.toString(), columns.period.x + 5, currentY, { align: 'center', width: columns.period.w - 10 });
                doc.text(record.staffName || record.staff?.name || '---', columns.staff.x + 5, currentY, { width: columns.staff.w - 10, ellipsis: true });
                doc.text(entry.student?.rollNumber || '---', columns.roll.x + 5, currentY);
                doc.font('Helvetica-Bold').text(entry.student?.name || 'Unknown', columns.name.x + 5, currentY, { width: columns.name.w - 10, ellipsis: true });
                doc.font('Helvetica').text(`${record.year} Yr - ${record.section?.name || ''}`, columns.section.x + 5, currentY);

                // Status Badge
                const statusColor = entry.status === 'Present' ? colors.success :
                    (entry.status === 'Leave' ? colors.warning : colors.danger);

                doc.save();
                doc.roundedRect(columns.status.x + 5, currentY - 3, columns.status.w - 15, 12, 6).fill(statusColor);
                doc.fillColor('#ffffff').fontSize(7).font('Helvetica-Bold').text(entry.status.toUpperCase(), columns.status.x + 5, currentY - 0.5, { width: columns.status.w - 15, align: 'center' });
                doc.restore();

                currentY += 18;
                rowCount++;
            });
        });

        // Footer for all pages
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
            doc.switchToPage(i);
            doc.fontSize(7).fillColor(colors.textLight).text(
                `Page ${i + 1} of ${pages.count}  |  MEC Attendance Tracking System  |  Confidential Report`,
                40,
                doc.page.height - 25,
                { align: 'center' }
            );
        }

        doc.end();
    } catch (error) {
        console.error('PDF export error:', error);
        res.status(500).json({ message: 'Failed to generate PDF' });
    }
};

module.exports = { exportExcel, exportPDF };
