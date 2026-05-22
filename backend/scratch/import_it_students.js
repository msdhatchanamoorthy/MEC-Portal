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

        const studentsToUpload = [];

        sheetRows.slice(1).forEach((row, index) => {
            if (!row || row.length === 0) return;

            const sNo = getVal(row, 0);
            const regNo = getVal(row, 1);
            const name = getVal(row, 2);

            if (!sNo && !regNo && !name) return;
            if (sNo.toLowerCase().includes('s.no') || regNo.toLowerCase() === 'register number') return;

            if (!regNo || !name) {
                console.warn(`Row ${index + 2} skipped: Register Number or Name is missing`);
                return;
            }

            const tenth = parsePercentage(getVal(row, 4));
            const twelfth = parsePercentage(getVal(row, 5));
            const diploma = parsePercentage(getVal(row, 6));
            const cgpaVal = parseFloat(getVal(row, 7)) || 0;
            const currArrear = parseInt(getVal(row, 8)) || 0;
            const histArrear = parseInt(getVal(row, 9)) || 0;
            const emailVal = getVal(row, 10);
            const phoneVal = getVal(row, 11);
            const dobVal = getVal(row, 12);
            const genderVal = getVal(row, 13).toLowerCase();
            const blood = getVal(row, 14);
            const coll = getVal(row, 15) || 'Muthayammal Engineering College';
            const residencyVal = getVal(row, 16).toLowerCase();
            const firstGrad = getVal(row, 17) || 'No';
            const addr = getVal(row, 18);
            const nativePl = getVal(row, 19);
            const nativeSt = getVal(row, 20);
            const medium = getVal(row, 21) || 'English';
            const placement = getVal(row, 22) || 'Not Placed';
            const placementCompany = getVal(row, 23);
            const placementRole = getVal(row, 24);
            const placementType = getVal(row, 25);
            const placementPackage = getVal(row, 26);
            const placementDate = getVal(row, 27);

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
