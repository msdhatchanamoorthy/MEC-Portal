# MEC Attendance Management System

A complete full-stack College Attendance Management System for **Muthayammal Engineering College (MEC)**.

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** v16+ 
- **MongoDB** running locally on port 27017
- **npm** v8+

### Installation & Setup

**Step 1: Install all dependencies**
```bash
npm run install-all
```

**Step 2: Seed the database with sample data**
```bash
npm run seed
```

**Step 3: Start both backend and frontend**
```bash
npm run dev
```

- **Frontend** → http://localhost:3000  
- **Backend API** → http://localhost:5000

---

## 🔑 Login Credentials (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Principal | principal@mec.edu.in | principal123 |
| HOD (CSE) | hod.cse@mec.edu.in | hod123 |
| HOD (IT) | hod.it@mec.edu.in | hod123 |
| Staff (CSE) | staff1.cse@mec.edu.in | staff123 |
| Staff (CSE) | staff2.cse@mec.edu.in | staff123 |

> All 15 departments have HOD and Staff accounts using the same pattern.

---

## 📁 Project Structure

```
mec-attendance-system/
├── backend/                    # Node.js + Express API
│   ├── config/db.js            # MongoDB connection
│   ├── controllers/            # Request handlers
│   │   ├── authController.js
│   │   ├── attendanceController.js
│   │   ├── adminController.js
│   │   ├── studentController.js
│   │   └── reportController.js
│   ├── middleware/auth.js       # JWT + Role guard
│   ├── models/                 # MongoDB Schemas
│   │   ├── User.js
│   │   ├── Department.js
│   │   ├── Section.js
│   │   ├── Student.js
│   │   └── AttendanceRecord.js
│   ├── routes/                 # API Routes
│   │   ├── auth.js
│   │   ├── attendance.js
│   │   ├── admin.js
│   │   ├── students.js
│   │   └── reports.js
│   ├── utils/seedData.js       # Database seeder
│   ├── server.js               # Express + Socket.IO server
│   └── .env                    # Environment config
│
└── frontend/                   # React.js App
    ├── public/index.html
    └── src/
        ├── contexts/AuthContext.js     # JWT Auth state
        ├── services/api.js             # Axios instance
        ├── components/
        │   ├── Sidebar.jsx             # Role-based nav
        │   └── Topbar.jsx
        ├── pages/
        │   ├── Login.jsx               # Role-selector login
        │   ├── principal/
        │   │   ├── PrincipalDashboard.jsx    # College overview
        │   │   └── ManageUsers.jsx           # User management
        │   ├── hod/
        │   │   └── HODDashboard.jsx          # Dept analytics
        │   ├── staff/
        │   │   ├── StaffDashboard.jsx
        │   │   └── MarkAttendance.jsx        # Mark P/A
        │   └── shared/
        │       ├── AttendanceReports.jsx     # Reports + Export
        │       └── StudentsPage.jsx
        ├── App.js                      # Routes + Auth guard
        └── index.css                   # Full design system
```

---

## 🏛️ Departments (15 Total)

1. Computer Science and Engineering (CSE)
2. Information Technology (IT)
3. Artificial Intelligence and Data Science (AI & DS)
4. Artificial Intelligence and Machine Learning (AI & ML)
5. Cyber Security (CS)
6. Computer Science and Business Systems (CSBS)
7. Electronics and Communication Engineering (ECE)
8. Electrical and Electronics Engineering (EEE)
9. Electronics Engineering - VLSI Design and Technology
10. Mechanical Engineering (MECH)
11. Mechatronics Engineering (MECT)
12. Civil Engineering (CIVIL)
13. Bio-Medical Engineering (BME)
14. Bio-Technology (BT)
15. Agricultural Engineering (AGE)

---

## 🔌 API Endpoints

### Auth
| Method | Route | Description |
|--------|-------|-------------|
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Get current user |

### Attendance
| Method | Route | Access |
|--------|-------|--------|
| POST | /api/attendance/mark | Staff |
| GET | /api/attendance | All |
| GET | /api/attendance/summary | HOD, Principal |
| GET | /api/attendance/daily-overview | HOD, Principal |
| PUT | /api/attendance/:id/approve | HOD, Principal |

### Reports
| Method | Route | Access |
|--------|-------|--------|
| GET | /api/reports/excel | HOD, Principal |
| GET | /api/reports/pdf | HOD, Principal |

---

## 🛠️ Tech Stack

- **Frontend**: React 18, React Router v6, Chart.js, React Hot Toast
- **Backend**: Node.js, Express.js, Socket.IO
- **Database**: MongoDB with Mongoose
- **Auth**: JWT (7-day expiry)
- **Reports**: ExcelJS + PDFKit
