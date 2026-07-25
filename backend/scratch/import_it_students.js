const mongoose = require('mongoose');
const Student = require('../models/Student');
const XLSX = require('../../frontend/node_modules/xlsx');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const importStudents = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB!');

        const excelPath = 'C:\\Users\\DHATCHANAMOORTHY\\Downloads\\Database 2027 Batch IT.xlsx';
        console.log(`Reading Excel file from ${excelPath}...`);
        
        const wb = XLSX.readFile(excelPath);
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const sheetRows = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (sheetRows.length <= 1) {
            console.error('Excel file is empty.');
            process.exit(1);
        }

        const getVal = (row, idx) => (row && row[idx] !== undefined && row[idx] !== null) ? row[idx].toString().trim() : '';

        const parsePercentage = (val) => {
            let num = parseFloat(val);
            if (isNaN(num)) return null;
            // Excel percentage: 0.7233 is 72.33%, 1.0 is 100%
            if (num > 0 && num <= 1.0) {
                return parseFloat((num * 100).toFixed(2));
            }
            return num;
        };

        const staffDeptId = '69afc6c047b2b4dca75eade7'; // IT Department
        const staffSectionId = '69afc6c447b2b4dca75eae7f'; // Section A
        const staffYear = 3; // 3rd Year

        const headers = (sheetRows[0] || []).map(h => (h || '').toString().trim().toLowerCase());
        const findHeaderIdx = (patterns, defaultIdx) => {
            const idx = headers.findIndex(h => patterns.some(p => h.includes(p)));
            return idx !== -1 ? idx : defaultIdx;
        };

        const regIdx = findHeaderIdx(['register number', 'roll number', 'reg no', 'roll no', 'reg_no', 'roll_no', 'register num', 'roll num', 'register', 'roll', 'ister num'], 1);
        const nameIdx = findHeaderIdx(['student name', 'student_name', 'name', 'student'], 2);
        const tenthIdx = findHeaderIdx(['10th', 'tenth'], 4);
        const twelfthIdx = findHeaderIdx(['12th', 'twelfth'], 5);
        const diplomaIdx = findHeaderIdx(['diploma'], 6);
        const cgpaIdx = findHeaderIdx(['cgpa'], 7);
        const currArrearIdx = findHeaderIdx(['current arrear', 'current_arrear', 'current arrears', 'arrear'], 8);
        const histArrearIdx = findHeaderIdx(['history'], 9);
        const emailIdx = findHeaderIdx(['email', 'e-mail', 'mail'], 10);
        const phoneIdx = findHeaderIdx(['phone', 'mobile', 'contact'], 11);
        const dobIdx = findHeaderIdx(['dob', 'date of birth', 'd.o.b'], 12);
        const genderIdx = findHeaderIdx(['gender'], 13);
        const bloodIdx = findHeaderIdx(['blood'], 14);
        const collegeIdx = findHeaderIdx(['college'], 15);
        const residencyIdx = findHeaderIdx(['residency', 'hostel', 'day scholar', 'dayscholar', 'transport'], 16);
        const firstGradIdx = findHeaderIdx(['first graduate', 'first_graduate', 'first grad'], 17);
        const addressIdx = findHeaderIdx(['address'], 18);
        const nativePlIdx = findHeaderIdx(['native place', 'native_place', 'native'], 19);
        const nativeStIdx = findHeaderIdx(['native state', 'native_state', 'state'], 20);
        const mediumIdx = findHeaderIdx(['medium'], 21);
        const placementIdx = findHeaderIdx(['placement status', 'placement'], 22);
        const placementCompanyIdx = findHeaderIdx(['company', 'placement company'], 23);
        const placementRoleIdx = findHeaderIdx(['role', 'placement role'], 24);
        const placementTypeIdx = findHeaderIdx(['placement type'], 25);
        const placementPackageIdx = findHeaderIdx(['package', 'salary', 'placement package'], 26);
        const placementDateIdx = findHeaderIdx(['placement date'], 27);

        const studentsToUpload = [];

        sheetRows.slice(1).forEach((row, index) => {
            if (!row || row.length === 0) return;

            const sNo = getVal(row, 0);
            const regNo = getVal(row, regIdx);
            const name = getVal(row, nameIdx);

            if (!sNo && !regNo && !name) return;
            if (sNo.toLowerCase().includes('s.no') || regNo.toLowerCase() === 'register number' || regNo.toLowerCase() === 'roll number') return;

            if (!regNo || !name) {
                console.warn(`Row ${index + 2} skipped: Register Number or Name is missing`);
                return;
            }

            const tenth = parsePercentage(getVal(row, tenthIdx));
            const twelfth = parsePercentage(getVal(row, twelfthIdx));
            const diploma = parsePercentage(getVal(row, diplomaIdx));
            const cgpaVal = parseFloat(getVal(row, cgpaIdx)) || 0;
            const currArrear = parseInt(getVal(row, currArrearIdx)) || 0;
            const histArrear = parseInt(getVal(row, histArrearIdx)) || 0;
            const emailVal = getVal(row, emailIdx);
            const phoneVal = getVal(row, phoneIdx);
            const dobVal = getVal(row, dobIdx);
            const genderVal = getVal(row, genderIdx).toLowerCase();
            const blood = getVal(row, bloodIdx);
            const coll = getVal(row, collegeIdx) || 'Muthayammal Engineering College';
            const residencyVal = getVal(row, residencyIdx).toLowerCase();
            const firstGrad = getVal(row, firstGradIdx) || 'No';
            const addr = getVal(row, addressIdx);
            const nativePl = getVal(row, nativePlIdx);
            const nativeSt = getVal(row, nativeStIdx);
            const medium = getVal(row, mediumIdx) || 'English';
            const placement = getVal(row, placementIdx) || 'Not Placed';
            const placementCompany = getVal(row, placementCompanyIdx);
            const placementRole = getVal(row, placementRoleIdx);
            const placementType = getVal(row, placementTypeIdx);
            const placementPackage = getVal(row, placementPackageIdx);
            const placementDate = getVal(row, placementDateIdx);

            studentsToUpload.push({
                name: name,
                rollNumber: regNo,
                registerNumber: regNo,
                year: staffYear,
                section: new mongoose.Types.ObjectId(staffSectionId),
                department: new mongoose.Types.ObjectId(staffDeptId),
                email: emailVal || `${regNo.toLowerCase()}@student.mec.edu.in`,
                personalEmail: emailVal || '',
                phone: phoneVal,
                gender: (genderVal.includes('girl') || genderVal.includes('female') || genderVal === 'f') ? 'Female' : 'Male',
                residency: (residencyVal.includes('hostel') || residencyVal.includes('hosteller')) ? 'Hosteller' : 'Day Scholar',
                tenthPercentage: tenth,
                twelfthPercentage: twelfth,
                diplomaPercentage: diploma,
                cgpa: cgpaVal,
                currentArrear: currArrear,
                historyOfArrear: histArrear,
                dob: dobVal,
                bloodGroup: blood,
                college: coll,
                firstGraduate: firstGrad,
                address: addr,
                nativePlace: nativePl,
                nativeState: nativeSt,
                twelfthMedium: medium,
                placementStatus: placement,
                placementCompany: placementCompany || '',
                placementRole: placementRole || '',
                placementType: placementType || '',
                placementPackage: placementPackage || '',
                placementDate: placementDate || ''
            });
        });

        console.log(`Parsed ${studentsToUpload.length} students from Excel.`);
        console.log('Clearing existing students for IT Year 3 Section A...');
        await Student.deleteMany({ department: staffDeptId, year: staffYear, section: staffSectionId });
        console.log('Inserting parsed students...');
        const inserted = await Student.insertMany(studentsToUpload);
        console.log(`Successfully imported ${inserted.length} students!`);

        // Verification query
        console.log('\n--- VERIFICATION ---');
        const verificationStudents = await Student.find({
            registerNumber: { $in: ['23IT001', '23IT005'] }
        });

        verificationStudents.forEach(st => {
            console.log(`Student: ${st.registerNumber} (${st.name})`);
            console.log(`  tenthPercentage: ${st.tenthPercentage}`);
            console.log(`  twelfthPercentage: ${st.twelfthPercentage}`);
            console.log(`  diplomaPercentage: ${st.diplomaPercentage}`);
        });

        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Error during import:', err);
        process.exit(1);
    }
};

importStudents();
