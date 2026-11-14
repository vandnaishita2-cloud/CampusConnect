# 🎓 CampusConnect – Student Management Portal

A full-stack, responsive student information and management portal featuring role-based authentication, real-time dashboard analytics with Chart.js, student CRUD with live search and CSV export, course enrollment tracking, attendance management with automatic percentage calculation, marks and grades computation, and individual printable student report cards.

---

## 🚀 Live Website Access

The web server is currently running live on:
**[http://localhost:8080](http://localhost:8080)**

### 🔑 Demo Logins:
- **Admin Portal:**
  - **Username:** `admin`
  - **Password:** `admin123`
  - *Full access to Dashboard, Students CRUD, Course Management, Attendance Marking & Filtering, Marks & Results, CSV Export.*
- **Student Portal:**
  - **Username:** `2024CS001`
  - **Password:** `2024CS001`
  - *Access to personalized Student Profile, Academic Results breakdown, Subject-wise Attendance, and Printable Result Report.*

---

## ⚡ How to Start (1-Click)

### Option 1: Double-click
Double-click `start.bat` in the project root. It will automatically launch the server and open your default browser to `http://localhost:8080`.

### Option 2: Command Line
```bash
node server.js
```
The server will start on port `8080` (or `PORT` environment variable).

---

## 🛠️ Features Included

1. **Dashboard & Analytics**
   - Live metrics: Total Students, Total Faculty, Average Attendance %, Total Courses.
   - Interactive Chart.js visual charts:
     - Attendance trend line chart over recorded dates
     - Student distribution by department (doughnut chart)
     - Course average marks comparison (bar chart)
   - Recent student registrations feed.

2. **Student Management**
   - Full CRUD: Add, edit, and delete student records with confirmation.
   - Dual view modes: Toggle between **Table view** and **Cards view** (with dynamic avatar initials).
   - Instant live search by student name, registration number, or department.
   - 1-click **Export CSV** with spreadsheet formula injection protection.
   - Automatic generation of student portal login credentials (`username` = reg. number, default `password` = reg. number).

3. **Course Management**
   - Add, edit, and remove courses with course code, name, department, semester, and faculty.
   - Real-time enrolled student count based on matching department and semester.
   - Interactive "Students" drawer to inspect all students currently enrolled in any course.

4. **Attendance System**
   - Daily attendance entry for any course with Present/Absent radio options and search filtering.
   - Multi-filter historical records search (by date, student, or subject).
   - Attendance summary with visual progress bars and warning badge (`Low`) for attendance below 75%.

5. **Marks & Examination Results**
   - Add/update marks out of 100 for any student and course.
   - Automatic letter grade calculation:
     - `A+` (≥ 90%)
     - `A` (≥ 80%)
     - `B` (≥ 70%)
     - `C` (≥ 60%)
     - `D` (≥ 50%)
     - `F` (< 50%)
   - Instant live search and quick link to individual student result reports.

6. **Student Profile & Printable Report Card**
   - Comprehensive student details overview.
   - Academic performance summary: total marks, percentage, and overall letter grade.
   - Examination results table with grade badges.
   - Subject-wise attendance breakdown and recent attendance logs.
   - **Print Result Report** with dedicated `@media print` CSS stylesheet for printer/PDF export.

7. **Security & Session Management**
   - PBKDF2 with SHA-256 password hashing and cryptographic salts.
   - Role-based route guard: student accounts are strictly sandboxed to their personal profile; admin accounts manage the whole portal.
   - Form input validation (email structure, 10-digit mobile, semester ranges 1-8).
