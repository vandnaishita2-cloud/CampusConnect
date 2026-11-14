const http = require('node:http');
const url = require('node:url');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 8080;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'campusconnect.db');
const db = new DatabaseSync(DB_PATH);

// ---------------------------------------------------------------- Database Initialization
db.exec(`
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reg_no TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  department TEXT NOT NULL,
  semester INTEGER NOT NULL,
  admission_date TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL, -- 'ADMIN' or 'STUDENT'
  student_id INTEGER NULL,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  semester INTEGER NOT NULL,
  faculty TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  att_date TEXT NOT NULL,
  status TEXT NOT NULL, -- 'P' or 'A'
  UNIQUE (student_id, course_id, att_date),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS marks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  marks INTEGER NOT NULL,
  UNIQUE (student_id, course_id),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);
`);

// ---------------------------------------------------------------- Password Hashing (PBKDF2)
function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync(pw, salt, 65536, 32, 'sha256');
  return salt.toString('hex') + ':' + hash.toString('hex');
}

function checkPassword(pw, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [saltHex, hashHex] = stored.split(':');
  const salt = Buffer.from(saltHex, 'hex');
  const hash = crypto.pbkdf2Sync(pw, salt, 65536, 32, 'sha256');
  return hash.toString('hex') === hashHex;
}

// ---------------------------------------------------------------- Seed Initial Data
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
if (userCount === 0) {
  console.log('Seeding initial data for CampusConnect...');
  
  // 1. Admin user (admin / admin123)
  db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(
    'admin', hashPassword('admin123'), 'ADMIN'
  );

  // 2. Default Courses
  const insertCourse = db.prepare(
    'INSERT INTO courses (code, name, department, semester, faculty) VALUES (?, ?, ?, ?, ?)'
  );
  insertCourse.run('CS101', 'Programming in Java', 'CSE', 1, 'Dr. Sharma');
  insertCourse.run('CS102', 'Data Structures & Algorithms', 'CSE', 1, 'Prof. Rao');
  insertCourse.run('MA101', 'Engineering Mathematics', 'CSE', 1, 'Dr. Iyer');
  insertCourse.run('EC101', 'Basic Electronics', 'ECE', 1, 'Prof. Khan');
  insertCourse.run('IT201', 'Web Technologies', 'IT', 1, 'Dr. Gupta');
  insertCourse.run('ME101', 'Engineering Mechanics', 'ME', 1, 'Prof. Verma');

  // 3. Sample Students
  const insertStudent = db.prepare(
    'INSERT INTO students (reg_no, name, email, phone, department, semester, admission_date) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const insertUser = db.prepare(
    'INSERT INTO users (username, password, role, student_id) VALUES (?, ?, ?, ?)'
  );

  const sampleStudents = [
    { reg: '2024CS001', name: 'Aarav Sharma', email: 'aarav.sharma@campus.edu', phone: '9876543210', dept: 'CSE', sem: 1, date: '2024-08-01' },
    { reg: '2024CS002', name: 'Ishita Patel', email: 'ishita.patel@campus.edu', phone: '9876543211', dept: 'CSE', sem: 1, date: '2024-08-01' },
    { reg: '2024CS003', name: 'Rohan Gupta', email: 'rohan.gupta@campus.edu', phone: '9876543212', dept: 'CSE', sem: 1, date: '2024-08-01' },
    { reg: '2024IT001', name: 'Ananya Verma', email: 'ananya.verma@campus.edu', phone: '9876543213', dept: 'IT', sem: 1, date: '2024-08-01' },
    { reg: '2024EC001', name: 'Kavya Reddy', email: 'kavya.reddy@campus.edu', phone: '9876543214', dept: 'ECE', sem: 1, date: '2024-08-01' },
    { reg: '2024ME001', name: 'Rahul Singh', email: 'rahul.singh@campus.edu', phone: '9876543215', dept: 'ME', sem: 1, date: '2024-08-01' }
  ];

  const studentIds = {};
  for (const s of sampleStudents) {
    const res = insertStudent.run(s.reg, s.name, s.email, s.phone, s.dept, s.sem, s.date);
    const sid = Number(res.lastInsertRowid);
    studentIds[s.reg] = sid;
    // Student login credentials: username = reg_no, password = reg_no
    insertUser.run(s.reg, hashPassword(s.reg), 'STUDENT', sid);
  }

  // 4. Sample Attendance across recent days
  const insertAtt = db.prepare(
    'INSERT OR IGNORE INTO attendance (student_id, course_id, att_date, status) VALUES (?, ?, ?, ?)'
  );
  const now = new Date();
  const dates = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }

  const sIds = Object.values(studentIds);
  // Mark attendance for CS101 (course_id 1) and CS102 (course_id 2)
  for (const date of dates) {
    insertAtt.run(studentIds['2024CS001'], 1, date, 'P');
    insertAtt.run(studentIds['2024CS002'], 1, date, 'P');
    insertAtt.run(studentIds['2024CS003'], 1, date, Math.random() > 0.4 ? 'P' : 'A'); // Rohan has lower attendance
    insertAtt.run(studentIds['2024CS001'], 2, date, 'P');
    insertAtt.run(studentIds['2024CS002'], 2, date, 'P');
    insertAtt.run(studentIds['2024CS003'], 2, date, 'A');
    insertAtt.run(studentIds['2024IT001'], 5, date, 'P');
    insertAtt.run(studentIds['2024EC001'], 4, date, 'P');
  }

  // 5. Sample Marks
  const insertMark = db.prepare(
    'INSERT OR IGNORE INTO marks (student_id, course_id, marks) VALUES (?, ?, ?)'
  );
  insertMark.run(studentIds['2024CS001'], 1, 92); // CS101 Java: A+
  insertMark.run(studentIds['2024CS001'], 2, 88); // CS102 DSA: A
  insertMark.run(studentIds['2024CS001'], 3, 95); // MA101 Maths: A+

  insertMark.run(studentIds['2024CS002'], 1, 85); // CS101 Java: A
  insertMark.run(studentIds['2024CS002'], 2, 91); // CS102 DSA: A+
  insertMark.run(studentIds['2024CS002'], 3, 78); // MA101 Maths: B

  insertMark.run(studentIds['2024CS003'], 1, 62); // CS101 Java: C
  insertMark.run(studentIds['2024CS003'], 2, 58); // CS102 DSA: D
  insertMark.run(studentIds['2024CS003'], 3, 44); // MA101 Maths: F

  insertMark.run(studentIds['2024IT001'], 5, 89); // IT201 Web Tech: A
  insertMark.run(studentIds['2024EC001'], 4, 82); // EC101 Electronics: A

  console.log('Seeding completed successfully!');
}

// ---------------------------------------------------------------- Helpers & Sessions
const sessions = new Map(); // token -> { user, role, sid, flashMsg, flashErr }

function parseCookies(req) {
  const list = {};
  const rc = req.headers.cookie;
  if (rc) {
    rc.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      list[parts.shift().trim()] = decodeURI(parts.join('='));
    });
  }
  return list;
}

function getSession(req) {
  const cookies = parseCookies(req);
  const token = cookies.campus_sid;
  if (token && sessions.has(token)) {
    return { token, session: sessions.get(token) };
  }
  return { token: null, session: null };
}

function createSession(res, user, role, sid) {
  const token = crypto.randomBytes(24).toString('hex');
  const sessionData = { user, role, sid: sid || null, flashMsg: null, flashErr: null };
  sessions.set(token, sessionData);
  res.setHeader('Set-Cookie', `campus_sid=${token}; Path=/; HttpOnly; SameSite=Lax`);
  return sessionData;
}

function destroySession(req, res) {
  const { token } = getSession(req);
  if (token) sessions.delete(token);
  res.setHeader('Set-Cookie', `campus_sid=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 1e6) { req.socket.destroy(); reject(new Error('Payload too large')); }
    });
    req.on('end', () => {
      const params = new URLSearchParams(body);
      const data = {};
      for (const [k, v] of params.entries()) data[k] = v.trim();
      resolve(data);
    });
  });
}

function gradeOf(pct) {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 50) return 'D';
  return 'F';
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const DEPARTMENTS = ['CSE', 'IT', 'ECE', 'EEE', 'ME', 'CE'];

function renderDeptOptions(selected) {
  let html = '<option value="">Select department</option>';
  for (const d of DEPARTMENTS) {
    html += `<option value="${d}" ${selected === d ? 'selected' : ''}>${d}</option>`;
  }
  return html;
}

// ---------------------------------------------------------------- Layout Templates
function renderLayout(title, view, contentHtml, session) {
  const user = session ? session.user : '';
  const role = session ? session.role : '';
  const msg = session && session.flashMsg ? session.flashMsg : '';
  const err = session && session.flashErr ? session.flashErr : '';
  if (session) { session.flashMsg = null; session.flashErr = null; }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} - CampusConnect</title>
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
  <div class="layout">
    <aside>
      <h2>🎓 CampusConnect</h2>
      ${role === 'ADMIN' ? `
        <a href="/dashboard" class="${view === 'dashboard' ? 'on' : ''}">📊 Dashboard</a>
        <a href="/students" class="${view === 'students' ? 'on' : ''}">🎓 Students</a>
        <a href="/attendance" class="${view === 'attendance' ? 'on' : ''}">🗓️ Attendance</a>
        <a href="/marks" class="${view === 'marks' ? 'on' : ''}">📝 Marks &amp; Results</a>
        <a href="/courses" class="${view === 'courses' ? 'on' : ''}">📚 Courses</a>
      ` : `
        <a href="/profile" class="on">👤 My Profile</a>
      `}
      <a href="/logout">🚪 Logout</a>
    </aside>
    <main>
      <div class="top">
        <div>
          <button id="menu" class="btn sm" type="button">☰</button>
          <h1 style="display:inline">${escapeHtml(title)}</h1>
        </div>
        <span>👤 ${escapeHtml(user)} (${escapeHtml(role)})</span>
      </div>
      ${contentHtml}
    </main>
  </div>
  <div id="toast" data-msg="${escapeHtml(msg)}" data-err="${escapeHtml(err)}"></div>
  <script src="/js/app.js"></script>
</body>
</html>`;
}

function renderAuthLayout(title, contentHtml, session) {
  const msg = session && session.flashMsg ? session.flashMsg : '';
  const err = session && session.flashErr ? session.flashErr : '';
  if (session) { session.flashMsg = null; session.flashErr = null; }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} - CampusConnect</title>
  <link rel="stylesheet" href="/css/style.css">
</head>
<body class="auth">
  ${contentHtml}
  <div id="toast" data-msg="${escapeHtml(msg)}" data-err="${escapeHtml(err)}"></div>
  <script src="/js/app.js"></script>
</body>
</html>`;
}

// ---------------------------------------------------------------- Request Handler
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;
  const method = req.method;

  // Static Assets
  if (pathname.startsWith('/css/') || pathname.startsWith('/js/')) {
    const filePath = path.join(__dirname, 'src/main/webapp', pathname);
    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath);
      const mime = ext === '.css' ? 'text/css' : ext === '.js' ? 'application/javascript' : 'text/plain';
      res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-cache' });
      return fs.createReadStream(filePath).pipe(res);
    }
  }

  if (pathname === '/favicon.ico') {
    res.writeHead(204);
    return res.end();
  }

  // Health check endpoint for Render / Railway
  if (pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
  }

  const { session } = getSession(req);

  // Authentication Filter & Route Protection
  const publicRoutes = ['/login', '/register'];
  if (!session && !publicRoutes.includes(pathname)) {
    res.writeHead(302, { Location: '/login' });
    return res.end();
  }
  if (session && publicRoutes.includes(pathname)) {
    const dest = session.role === 'ADMIN' ? '/dashboard' : '/profile';
    res.writeHead(302, { Location: dest });
    return res.end();
  }
  if (session && session.role !== 'ADMIN' && pathname !== '/profile' && pathname !== '/logout') {
    res.writeHead(302, { Location: '/profile' });
    return res.end();
  }

  // ---------------------------------------------------------------- Routes
  try {
    // Root
    if (pathname === '/') {
      const dest = !session ? '/login' : (session.role === 'ADMIN' ? '/dashboard' : '/profile');
      res.writeHead(302, { Location: dest });
      return res.end();
    }

    // ------------------------------------------------ Login
    if (pathname === '/login') {
      if (method === 'GET') {
        const html = `
          <form class="card auth-card" method="post" action="/login">
            <h1>🎓 CampusConnect</h1>
            <p class="muted" style="margin-bottom:20px">Student Management Portal – sign in</p>
            <div style="background:#f8fafc;padding:12px 14px;border-radius:10px;margin-bottom:16px;font-size:13px;border-left:4px solid #6366f1;">
              <strong>Demo Accounts:</strong><br>
              • Admin: <code>admin</code> / <code>admin123</code><br>
              • Student: <code>2024CS001</code> / <code>2024CS001</code>
            </div>
            <label>Username / Registration No.
              <input name="username" required autofocus placeholder="e.g. admin or 2024CS001">
            </label>
            <label>Password
              <input type="password" name="password" required placeholder="Enter password">
            </label>
            <button class="btn" type="submit">Login</button>
            <p class="muted">New student? <a href="/register">Create an account</a></p>
          </form>
        `;
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(renderAuthLayout('Login', html, session));
      }

      if (method === 'POST') {
        const body = await parseBody(req);
        const username = body.username || '';
        const password = body.password || '';

        const userRow = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
        if (userRow && checkPassword(password, userRow.password)) {
          createSession(res, userRow.username, userRow.role, userRow.student_id);
          const dest = userRow.role === 'ADMIN' ? '/dashboard' : '/profile';
          res.writeHead(302, { Location: dest });
          return res.end();
        }

        // Failed
        const s = session || createSession(res, '', '', null);
        s.flashErr = 'Invalid username or password';
        res.writeHead(302, { Location: '/login' });
        return res.end();
      }
    }

    // ------------------------------------------------ Register
    if (pathname === '/register') {
      if (method === 'GET') {
        const html = `
          <form class="card auth-card" method="post" action="/register">
            <h1>Student Registration</h1>
            <p class="muted" style="margin-bottom:20px">Create your CampusConnect account</p>
            <div class="fgrid">
              <label>Registration No.*
                <input name="reg_no" required placeholder="e.g. 2024CS004">
              </label>
              <label>Full name*
                <input name="name" required placeholder="Student name">
              </label>
              <label>Email*
                <input type="email" name="email" required placeholder="student@example.edu">
              </label>
              <label>Phone (10 digits)
                <input name="phone" pattern="\\d{10}" placeholder="10-digit mobile">
              </label>
              <label>Department*
                <select name="department" required>${renderDeptOptions('')}</select>
              </label>
              <label>Semester*
                <input type="number" name="semester" min="1" max="8" value="1" required>
              </label>
            </div>
            <label>Password (min 6 chars)*
              <input type="password" name="password" minlength="6" required placeholder="Set your password">
            </label>
            <button class="btn" type="submit">Register</button>
            <p class="muted">Already registered? <a href="/login">Login</a></p>
          </form>
        `;
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(renderAuthLayout('Register', html, session));
      }

      if (method === 'POST') {
        const b = await parseBody(req);
        const s = session || createSession(res, '', '', null);

        if (!b.reg_no || !b.name || !b.email || !b.department || !b.semester) {
          s.flashErr = 'Please fill all required fields';
          res.writeHead(302, { Location: '/register' });
          return res.end();
        }
        if (!b.email.includes('@')) {
          s.flashErr = 'Enter a valid email address';
          res.writeHead(302, { Location: '/register' });
          return res.end();
        }
        if (b.phone && !/^\d{10}$/.test(b.phone)) {
          s.flashErr = 'Phone must be 10 digits';
          res.writeHead(302, { Location: '/register' });
          return res.end();
        }
        if (!b.password || b.password.length < 6) {
          s.flashErr = 'Password must be at least 6 characters';
          res.writeHead(302, { Location: '/register' });
          return res.end();
        }

        try {
          const admDate = b.admission_date || new Date().toISOString().slice(0, 10);
          const resStudent = db.prepare(
            'INSERT INTO students (reg_no, name, email, phone, department, semester, admission_date) VALUES (?, ?, ?, ?, ?, ?, ?)'
          ).run(b.reg_no, b.name, b.email, b.phone || '', b.department, parseInt(b.semester, 10), admDate);
          
          const studentId = Number(resStudent.lastInsertRowid);
          db.prepare(
            'INSERT INTO users (username, password, role, student_id) VALUES (?, ?, ?, ?)'
          ).run(b.reg_no, hashPassword(b.password), 'STUDENT', studentId);

          s.flashMsg = 'Registration successful! Please login with your registration number.';
          res.writeHead(302, { Location: '/login' });
          return res.end();
        } catch (e) {
          s.flashErr = e.message.includes('UNIQUE') ? 'Registration number or username already exists' : 'Error: ' + e.message;
          res.writeHead(302, { Location: '/register' });
          return res.end();
        }
      }
    }

    // ------------------------------------------------ Logout
    if (pathname === '/logout') {
      destroySession(req, res);
      res.writeHead(302, { Location: '/login' });
      return res.end();
    }

    // ------------------------------------------------ Dashboard
    if (pathname === '/dashboard') {
      const nStudents = db.prepare('SELECT COUNT(*) as c FROM students').get().c;
      const nFaculty = db.prepare('SELECT COUNT(DISTINCT faculty) as c FROM courses').get().c;
      const nCourses = db.prepare('SELECT COUNT(*) as c FROM courses').get().c;
      
      const attAvgRow = db.prepare(`
        SELECT COALESCE(ROUND(100.0 * SUM(CASE WHEN status='P' THEN 1 ELSE 0 END) / COUNT(*), 1), 0) as avgAtt
        FROM attendance
      `).get();
      const avgAtt = attAvgRow ? attAvgRow.avgAtt : 0;

      const recent = db.prepare('SELECT name, reg_no, department, admission_date FROM students ORDER BY id DESC LIMIT 5').all();

      // Trend data (last 7 distinct attendance dates)
      const trendRows = db.prepare(`
        SELECT att_date as label, ROUND(100.0 * SUM(CASE WHEN status='P' THEN 1 ELSE 0 END) / COUNT(*), 1) as val
        FROM attendance GROUP BY att_date ORDER BY att_date DESC LIMIT 7
      `).all().reverse();

      // Dept data
      const deptRows = db.prepare(`
        SELECT department as label, COUNT(*) as val FROM students GROUP BY department
      `).all();

      // Mark data by course
      const markRows = db.prepare(`
        SELECT c.code as label, ROUND(AVG(m.marks), 1) as val
        FROM marks m JOIN courses c ON c.id=m.course_id GROUP BY c.id
      `).all();

      const attJson = JSON.stringify({ labels: trendRows.map(r => r.label), data: trendRows.map(r => r.val) });
      const deptJson = JSON.stringify({ labels: deptRows.map(r => r.label), data: deptRows.map(r => r.val) });
      const markJson = JSON.stringify({ labels: markRows.map(r => r.label), data: markRows.map(r => r.val) });

      let recentRowsHtml = '';
      if (recent.length === 0) {
        recentRowsHtml = '<tr><td colspan="4" class="muted">No students yet – add some from the Students page.</td></tr>';
      } else {
        recent.forEach(s => {
          recentRowsHtml += `<tr>
            <td>${escapeHtml(s.name)}</td>
            <td>${escapeHtml(s.reg_no)}</td>
            <td>${escapeHtml(s.department)}</td>
            <td>${escapeHtml(s.admission_date)}</td>
          </tr>`;
        });
      }

      const html = `
        <div class="grid">
          <div class="card stat"><b>${nStudents}</b><span>🎓 Registered students</span></div>
          <div class="card stat"><b>${nFaculty}</b><span>👨‍🏫 Faculty members</span></div>
          <div class="card stat"><b>${avgAtt}%</b><span>🗓️ Average attendance</span></div>
          <div class="card stat"><b>${nCourses}</b><span>📚 Total courses</span></div>
        </div>

        <div class="charts">
          <div class="card">
            <h3>Attendance trend (%)</h3>
            <canvas id="c1"></canvas>
          </div>
          <div class="card">
            <h3>Students by department</h3>
            <canvas id="c2"></canvas>
          </div>
          <div class="card">
            <h3>Average marks by course</h3>
            <canvas id="c3"></canvas>
          </div>
        </div>

        <div class="card">
          <h3 style="margin-bottom:10px">Recent registrations</h3>
          <div class="scroll">
            <table>
              <thead>
                <tr><th>Name</th><th>Reg. No</th><th>Department</th><th>Admitted</th></tr>
              </thead>
              <tbody>
                ${recentRowsHtml}
              </tbody>
            </table>
          </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
        <script>
          const mk = (id, type, d, label) => new Chart(document.getElementById(id), {
            type,
            data: {
              labels: d.labels,
              datasets: [{
                label,
                data: d.data,
                backgroundColor: ['#6366f1', '#8b5cf6', '#38bdf8', '#22c55e', '#f59e0b', '#ef4444'],
                borderColor: '#6366f1',
                tension: 0.35
              }]
            },
            options: {
              responsive: true,
              plugins: { legend: { display: type === 'doughnut' } }
            }
          });
          mk('c1', 'line', ${attJson}, 'Attendance %');
          mk('c2', 'doughnut', ${deptJson}, 'Students');
          mk('c3', 'bar', ${markJson}, 'Avg marks');
        </script>
      `;

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(renderLayout('Dashboard', 'dashboard', html, session));
    }

    // ------------------------------------------------ Students
    if (pathname === '/students') {
      if (method === 'GET') {
        const students = db.prepare('SELECT * FROM students ORDER BY name').all();

        let tableRows = '';
        let cardRows = '';
        for (const s of students) {
          tableRows += `
            <tr data-f="st" data-id="${s.id}" data-reg_no="${escapeHtml(s.reg_no)}" data-name="${escapeHtml(s.name)}" data-email="${escapeHtml(s.email)}"
                data-phone="${escapeHtml(s.phone || '')}" data-department="${escapeHtml(s.department)}" data-semester="${s.semester}" data-admission_date="${escapeHtml(s.admission_date)}">
              <td>${escapeHtml(s.reg_no)}</td>
              <td>${escapeHtml(s.name)}</td>
              <td>${escapeHtml(s.email)}</td>
              <td>${escapeHtml(s.phone || '-')}</td>
              <td>${escapeHtml(s.department)}</td>
              <td>${s.semester}</td>
              <td>${escapeHtml(s.admission_date)}</td>
              <td>
                <a class="btn sm ghost" href="/profile?id=${s.id}">View</a>
                <button class="btn sm" type="button" onclick="edit(this,'dlg')">Edit</button>
                <form class="del" method="post" action="/students" style="display:inline">
                  <input type="hidden" name="action" value="delete">
                  <input type="hidden" name="id" value="${s.id}">
                  <button class="btn sm red" type="submit">Delete</button>
                </form>
              </td>
            </tr>
          `;

          const initial = (s.name || '?').charAt(0).toUpperCase();
          cardRows += `
            <a class="card pc" data-f="st" href="/profile?id=${s.id}">
              <div class="av">${escapeHtml(initial)}</div>
              <b>${escapeHtml(s.name)}</b>
              <div class="muted">${escapeHtml(s.reg_no)} · ${escapeHtml(s.department)} · Sem ${s.semester}</div>
            </a>
          `;
        }

        const html = `
          <div class="card">
            <div class="bar">
              <input data-filter="st" placeholder="🔍 Search by name, reg. no or department">
              <button class="btn ghost sm" type="button" onclick="view('t')">Table</button>
              <button class="btn ghost sm" type="button" onclick="view('c')">Cards</button>
              <button class="btn" type="button" onclick="openAdd('dlg')">+ Add Student</button>
              <a class="btn ghost" href="/export">⬇ Export CSV</a>
            </div>

            <div id="tbl" class="scroll">
              <table>
                <thead>
                  <tr><th>Reg. No</th><th>Name</th><th>Email</th><th>Phone</th><th>Dept</th><th>Sem</th><th>Admitted</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  ${tableRows || '<tr><td colspan="8" class="muted">No students yet. Click “Add Student”.</td></tr>'}
                </tbody>
              </table>
            </div>

            <div id="cards" class="grid" hidden>
              ${cardRows}
            </div>
          </div>

          <dialog id="dlg">
            <form method="post" action="/students">
              <h3>Student details</h3>
              <input type="hidden" name="id">
              <div class="fgrid">
                <label>Registration No.*<input name="reg_no" required placeholder="e.g. 2024CS005"></label>
                <label>Full name*<input name="name" required placeholder="Student name"></label>
                <label>Email*<input type="email" name="email" required placeholder="student@example.edu"></label>
                <label>Phone (10 digits)<input name="phone" pattern="\\d{10}" placeholder="10-digit mobile"></label>
                <label>Department*<select name="department" required>${renderDeptOptions('')}</select></label>
                <label>Semester*<input type="number" name="semester" min="1" max="8" value="1" required></label>
                <label>Date of admission<input type="date" name="admission_date"></label>
              </div>
              <div style="margin-top:14px;display:flex;gap:10px">
                <button class="btn" type="submit">Save</button>
                <button class="btn ghost" type="button" onclick="this.closest('dialog').close()">Cancel</button>
              </div>
            </form>
          </dialog>
        `;

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(renderLayout('Students', 'students', html, session));
      }

      if (method === 'POST') {
        const b = await parseBody(req);
        if (b.action === 'delete') {
          db.prepare('DELETE FROM students WHERE id = ?').run(b.id);
          session.flashMsg = 'Student deleted successfully';
          res.writeHead(302, { Location: '/students' });
          return res.end();
        }

        if (!b.reg_no || !b.name || !b.email || !b.department || !b.semester) {
          session.flashErr = 'Please fill all required fields';
          res.writeHead(302, { Location: '/students' });
          return res.end();
        }
        if (!b.email.includes('@')) {
          session.flashErr = 'Enter a valid email address';
          res.writeHead(302, { Location: '/students' });
          return res.end();
        }
        if (b.phone && !/^\d{10}$/.test(b.phone)) {
          session.flashErr = 'Phone must be 10 digits';
          res.writeHead(302, { Location: '/students' });
          return res.end();
        }

        const admDate = b.admission_date || new Date().toISOString().slice(0, 10);
        const sem = parseInt(b.semester, 10);

        try {
          if (!b.id) {
            // New student
            const resSt = db.prepare(
              'INSERT INTO students (reg_no, name, email, phone, department, semester, admission_date) VALUES (?, ?, ?, ?, ?, ?, ?)'
            ).run(b.reg_no, b.name, b.email, b.phone || '', b.department, sem, admDate);
            const studentId = Number(resSt.lastInsertRowid);
            // Default student login = reg_no / reg_no
            db.prepare('INSERT INTO users (username, password, role, student_id) VALUES (?, ?, ?, ?)').run(
              b.reg_no, hashPassword(b.reg_no), 'STUDENT', studentId
            );
            session.flashMsg = 'Student added (default login = reg. number)';
          } else {
            // Update student
            db.prepare(
              'UPDATE students SET reg_no = ?, name = ?, email = ?, phone = ?, department = ?, semester = ?, admission_date = ? WHERE id = ?'
            ).run(b.reg_no, b.name, b.email, b.phone || '', b.department, sem, admDate, b.id);
            db.prepare('UPDATE users SET username = ? WHERE student_id = ?').run(b.reg_no, b.id);
            session.flashMsg = 'Student updated';
          }
        } catch (e) {
          session.flashErr = e.message.includes('UNIQUE') ? 'Registration number already exists' : 'Error: ' + e.message;
        }

        res.writeHead(302, { Location: '/students' });
        return res.end();
      }
    }

    // ------------------------------------------------ Courses
    if (pathname === '/courses') {
      if (method === 'GET') {
        const courses = db.prepare(`
          SELECT c.*, (SELECT COUNT(*) FROM students s WHERE s.department = c.department AND s.semester = c.semester) as enrolled
          FROM courses c ORDER BY c.semester, c.code
        `).all();

        let courseRows = '';
        for (const c of courses) {
          courseRows += `
            <tr data-f="co" data-id="${c.id}" data-code="${escapeHtml(c.code)}" data-name="${escapeHtml(c.name)}"
                data-department="${escapeHtml(c.department)}" data-semester="${c.semester}" data-faculty="${escapeHtml(c.faculty)}">
              <td>${escapeHtml(c.code)}</td>
              <td>${escapeHtml(c.name)}</td>
              <td>${escapeHtml(c.department)}</td>
              <td>${c.semester}</td>
              <td>${escapeHtml(c.faculty)}</td>
              <td><b>${c.enrolled}</b></td>
              <td>
                <a class="btn sm ghost" href="/courses?view=${c.id}">Students</a>
                <button class="btn sm" type="button" onclick="edit(this,'dlg')">Edit</button>
                <form class="del" method="post" action="/courses" style="display:inline">
                  <input type="hidden" name="action" value="delete">
                  <input type="hidden" name="id" value="${c.id}">
                  <button class="btn sm red" type="submit">Delete</button>
                </form>
              </td>
            </tr>
          `;
        }

        let enrolledSection = '';
        if (query.view) {
          const viewed = db.prepare('SELECT * FROM courses WHERE id = ?').get(query.view);
          if (viewed) {
            const enrolledStudents = db.prepare(`
              SELECT s.* FROM students s JOIN courses c ON c.department = s.department AND c.semester = s.semester
              WHERE c.id = ? ORDER BY s.name
            `).all(query.view);

            let enrolledRows = '';
            for (const s of enrolledStudents) {
              enrolledRows += `<tr>
                <td>${escapeHtml(s.reg_no)}</td>
                <td><a href="/profile?id=${s.id}">${escapeHtml(s.name)}</a></td>
                <td>${escapeHtml(s.email)}</td>
                <td>${escapeHtml(s.phone || '-')}</td>
              </tr>`;
            }

            enrolledSection = `
              <div class="card" style="border-left:4px solid #6366f1">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
                  <h3>Enrolled in ${escapeHtml(viewed.code)} - ${escapeHtml(viewed.name)} (${escapeHtml(viewed.department)}, Sem ${viewed.semester})</h3>
                  <a class="btn sm ghost" href="/courses">Close view</a>
                </div>
                <div class="scroll">
                  <table>
                    <thead><tr><th>Reg. No</th><th>Name</th><th>Email</th><th>Phone</th></tr></thead>
                    <tbody>${enrolledRows || '<tr><td colspan="4" class="muted">No students currently enrolled.</td></tr>'}</tbody>
                  </table>
                </div>
              </div>
            `;
          }
        }

        const html = `
          <div class="card">
            <div class="bar">
              <input data-filter="co" placeholder="🔍 Search courses by code, name or faculty">
              <button class="btn" type="button" onclick="openAdd('dlg')">+ Add Course</button>
            </div>
            <div class="scroll">
              <table>
                <thead>
                  <tr><th>Code</th><th>Course</th><th>Dept</th><th>Semester</th><th>Faculty</th><th>Enrolled</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  ${courseRows || '<tr><td colspan="7" class="muted">No courses yet. Click "+ Add Course".</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>

          ${enrolledSection}

          <dialog id="dlg">
            <form method="post" action="/courses">
              <h3>Course details</h3>
              <input type="hidden" name="id">
              <div class="fgrid">
                <label>Course code*<input name="code" required placeholder="e.g. CS201"></label>
                <label>Course name*<input name="name" required placeholder="e.g. Operating Systems"></label>
                <label>Department*<select name="department" required>${renderDeptOptions('')}</select></label>
                <label>Semester*<input type="number" name="semester" min="1" max="8" value="1" required></label>
              </div>
              <label>Faculty*<input name="faculty" required placeholder="e.g. Dr. Ramesh"></label>
              <div style="margin-top:14px;display:flex;gap:10px">
                <button class="btn" type="submit">Save</button>
                <button class="btn ghost" type="button" onclick="this.closest('dialog').close()">Cancel</button>
              </div>
            </form>
          </dialog>
        `;

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(renderLayout('Courses', 'courses', html, session));
      }

      if (method === 'POST') {
        const b = await parseBody(req);
        if (b.action === 'delete') {
          db.prepare('DELETE FROM courses WHERE id = ?').run(b.id);
          session.flashMsg = 'Course deleted';
          res.writeHead(302, { Location: '/courses' });
          return res.end();
        }

        if (!b.code || !b.name || !b.department || !b.semester || !b.faculty) {
          session.flashErr = 'Fill all fields (semester 1-8)';
          res.writeHead(302, { Location: '/courses' });
          return res.end();
        }

        const sem = parseInt(b.semester, 10);
        try {
          if (!b.id) {
            db.prepare('INSERT INTO courses (code, name, department, semester, faculty) VALUES (?, ?, ?, ?, ?)').run(
              b.code, b.name, b.department, sem, b.faculty
            );
            session.flashMsg = 'Course added';
          } else {
            db.prepare('UPDATE courses SET code = ?, name = ?, department = ?, semester = ?, faculty = ? WHERE id = ?').run(
              b.code, b.name, b.department, sem, b.faculty, b.id
            );
            session.flashMsg = 'Course updated';
          }
        } catch (e) {
          session.flashErr = e.message.includes('UNIQUE') ? 'Course code already exists' : 'Error: ' + e.message;
        }

        res.writeHead(302, { Location: '/courses' });
        return res.end();
      }
    }

    // ------------------------------------------------ Attendance
    if (pathname === '/attendance') {
      if (method === 'GET') {
        const students = db.prepare('SELECT * FROM students ORDER BY name').all();
        const courses = db.prepare('SELECT * FROM courses ORDER BY code').all();
        const today = new Date().toISOString().slice(0, 10);

        // Filtered attendance records
        let filterSql = 'WHERE 1=1';
        const filterParams = [];
        if (query.fdate) { filterSql += ' AND a.att_date = ?'; filterParams.push(query.fdate); }
        if (query.fstudent) { filterSql += ' AND a.student_id = ?'; filterParams.push(query.fstudent); }
        if (query.fcourse) { filterSql += ' AND a.course_id = ?'; filterParams.push(query.fcourse); }

        const records = db.prepare(`
          SELECT a.att_date, s.name, s.reg_no, c.name as course, a.status
          FROM attendance a
          JOIN students s ON s.id = a.student_id
          JOIN courses c ON c.id = a.course_id
          ${filterSql}
          ORDER BY a.att_date DESC, s.name LIMIT 200
        `).all(...filterParams);

        // Attendance summary
        const summary = db.prepare(`
          SELECT s.reg_no, s.name, COUNT(a.id) as total,
                 SUM(CASE WHEN a.status = 'P' THEN 1 ELSE 0 END) as present,
                 ROUND(100.0 * SUM(CASE WHEN a.status = 'P' THEN 1 ELSE 0 END) / COUNT(a.id), 1) as pct
          FROM students s
          JOIN attendance a ON a.student_id = s.id
          GROUP BY s.id ORDER BY s.name
        `).all();

        let markStudentRows = '';
        for (const s of students) {
          markStudentRows += `
            <tr data-f="mk">
              <td>${escapeHtml(s.reg_no)}</td>
              <td>${escapeHtml(s.name)} <span class="muted">(${escapeHtml(s.department)})</span></td>
              <td>
                <label class="inl"><input type="radio" name="st_${s.id}" value="P" checked> Present</label>
                <label class="inl"><input type="radio" name="st_${s.id}" value="A"> Absent</label>
              </td>
            </tr>
          `;
        }

        let courseOptions = courses.map(c => `<option value="${c.id}">${escapeHtml(c.code)} – ${escapeHtml(c.name)}</option>`).join('');

        let recordRows = '';
        for (const r of records) {
          recordRows += `
            <tr>
              <td>${escapeHtml(r.att_date)}</td>
              <td>${escapeHtml(r.reg_no)}</td>
              <td>${escapeHtml(r.name)}</td>
              <td>${escapeHtml(r.course)}</td>
              <td><span class="badge ${r.status}">${r.status === 'P' ? 'Present' : 'Absent'}</span></td>
            </tr>
          `;
        }

        let summaryRows = '';
        for (const r of summary) {
          summaryRows += `
            <tr>
              <td>${escapeHtml(r.reg_no)}</td>
              <td>${escapeHtml(r.name)}</td>
              <td><b>${r.present}</b> / ${r.total}</td>
              <td>
                <div style="display:flex;align-items:center;gap:8px">
                  <div class="pbar"><i style="width:${r.pct}%"></i></div>
                  <span>${r.pct}%</span>
                  ${r.pct < 75 ? '<span class="badge A">Low</span>' : ''}
                </div>
              </td>
            </tr>
          `;
        }

        const html = `
          <form class="card" method="post" action="/attendance">
            <h3 style="margin-bottom:12px">Mark attendance</h3>
            <div class="bar">
              <select name="course_id" required>
                <option value="">Select course</option>
                ${courseOptions}
              </select>
              <input type="date" name="att_date" value="${today}" required>
              <input data-filter="mk" placeholder="🔍 Search student">
              <button class="btn" type="submit">Save attendance</button>
            </div>
            <div class="scroll">
              <table>
                <thead><tr><th>Reg. No</th><th>Name</th><th>Status</th></tr></thead>
                <tbody>${markStudentRows || '<tr><td colspan="3" class="muted">No students available.</td></tr>'}</tbody>
              </table>
            </div>
          </form>

          <div class="card">
            <h3 style="margin-bottom:12px">Attendance records</h3>
            <form class="bar" method="get" action="/attendance">
              <input type="date" name="fdate" value="${escapeHtml(query.fdate || '')}">
              <select name="fstudent">
                <option value="">All students</option>
                ${students.map(s => `<option value="${s.id}" ${query.fstudent == s.id ? 'selected' : ''}>${escapeHtml(s.name)}</option>`).join('')}
              </select>
              <select name="fcourse">
                <option value="">All subjects</option>
                ${courses.map(c => `<option value="${c.id}" ${query.fcourse == c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
              </select>
              <button class="btn sm" type="submit">Filter</button>
              <a class="btn sm ghost" href="/attendance">Reset</a>
            </form>
            <div class="scroll">
              <table>
                <thead><tr><th>Date</th><th>Reg. No</th><th>Student</th><th>Subject</th><th>Status</th></tr></thead>
                <tbody>${recordRows || '<tr><td colspan="5" class="muted">No records found.</td></tr>'}</tbody>
              </table>
            </div>
          </div>

          <div class="card">
            <h3 style="margin-bottom:12px">Attendance percentage</h3>
            <div class="scroll">
              <table>
                <thead><tr><th>Reg. No</th><th>Student</th><th>Present / Total</th><th>Percentage</th></tr></thead>
                <tbody>${summaryRows || '<tr><td colspan="4" class="muted">No attendance data yet.</td></tr>'}</tbody>
              </table>
            </div>
          </div>
        `;

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(renderLayout('Attendance', 'attendance', html, session));
      }

      if (method === 'POST') {
        const b = await parseBody(req);
        if (!b.course_id || !b.att_date) {
          session.flashErr = 'Choose a course and date';
          res.writeHead(302, { Location: '/attendance' });
          return res.end();
        }

        const students = db.prepare('SELECT id FROM students').all();
        const upsertAtt = db.prepare(`
          INSERT INTO attendance (student_id, course_id, att_date, status)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(student_id, course_id, att_date) DO UPDATE SET status = excluded.status
        `);

        for (const s of students) {
          const st = b['st_' + s.id];
          if (st) {
            upsertAtt.run(s.id, b.course_id, b.att_date, st === 'A' ? 'A' : 'P');
          }
        }

        session.flashMsg = 'Attendance saved successfully';
        res.writeHead(302, { Location: '/attendance' });
        return res.end();
      }
    }

    // ------------------------------------------------ Marks
    if (pathname === '/marks') {
      if (method === 'GET') {
        const students = db.prepare('SELECT * FROM students ORDER BY name').all();
        const courses = db.prepare('SELECT * FROM courses ORDER BY code').all();

        const marks = db.prepare(`
          SELECT m.id, m.student_id, m.course_id, m.marks, s.name, s.reg_no, c.code, c.name as course,
                 CASE
                   WHEN m.marks >= 90 THEN 'A+'
                   WHEN m.marks >= 80 THEN 'A'
                   WHEN m.marks >= 70 THEN 'B'
                   WHEN m.marks >= 60 THEN 'C'
                   WHEN m.marks >= 50 THEN 'D'
                   ELSE 'F'
                 END as grade
          FROM marks m
          JOIN students s ON s.id = m.student_id
          JOIN courses c ON c.id = m.course_id
          ORDER BY s.name, c.code
        `).all();

        let markRows = '';
        for (const m of marks) {
          markRows += `
            <tr data-f="mk" data-id="${m.id}" data-student_id="${m.student_id}" data-course_id="${m.course_id}" data-marks="${m.marks}">
              <td>${escapeHtml(m.reg_no)}</td>
              <td>${escapeHtml(m.name)}</td>
              <td>${escapeHtml(m.code)} – ${escapeHtml(m.course)}</td>
              <td><b>${m.marks}</b></td>
              <td><span class="badge ${m.grade === 'F' ? 'f' : 'g'}">${escapeHtml(m.grade)}</span></td>
              <td>
                <button class="btn sm" type="button" onclick="edit(this,'markForm')">Edit</button>
                <a class="btn sm ghost" href="/profile?id=${m.student_id}">Report</a>
                <form class="del" method="post" action="/marks" style="display:inline">
                  <input type="hidden" name="action" value="delete">
                  <input type="hidden" name="id" value="${m.id}">
                  <button class="btn sm red" type="submit">Delete</button>
                </form>
              </td>
            </tr>
          `;
        }

        const html = `
          <form id="markForm" class="card" method="post" action="/marks">
            <h3 style="margin-bottom:12px">Add / update marks (out of 100)</h3>
            <div class="bar">
              <select name="student_id" required>
                <option value="">Select student</option>
                ${students.map(s => `<option value="${s.id}">${escapeHtml(s.reg_no)} – ${escapeHtml(s.name)}</option>`).join('')}
              </select>
              <select name="course_id" required>
                <option value="">Select course</option>
                ${courses.map(c => `<option value="${c.id}">${escapeHtml(c.code)} – ${escapeHtml(c.name)}</option>`).join('')}
              </select>
              <input type="number" name="marks" min="0" max="100" placeholder="Marks (0-100)" required>
              <button class="btn" type="submit">Save Marks</button>
            </div>
          </form>

          <div class="card">
            <div class="bar">
              <input data-filter="mk" placeholder="🔍 Search by student name, reg. no or subject">
            </div>
            <div class="scroll">
              <table>
                <thead>
                  <tr><th>Reg. No</th><th>Student</th><th>Subject</th><th>Marks</th><th>Grade</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  ${markRows || '<tr><td colspan="6" class="muted">No marks entered yet.</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
        `;

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(renderLayout('Marks & Results', 'marks', html, session));
      }

      if (method === 'POST') {
        const b = await parseBody(req);
        if (b.action === 'delete') {
          db.prepare('DELETE FROM marks WHERE id = ?').run(b.id);
          session.flashMsg = 'Marks deleted';
          res.writeHead(302, { Location: '/marks' });
          return res.end();
        }

        if (!b.student_id || !b.course_id || b.marks === '' || isNaN(b.marks)) {
          session.flashErr = 'Choose student, course and marks (0-100)';
          res.writeHead(302, { Location: '/marks' });
          return res.end();
        }

        const marksVal = parseInt(b.marks, 10);
        if (marksVal < 0 || marksVal > 100) {
          session.flashErr = 'Marks must be between 0 and 100';
          res.writeHead(302, { Location: '/marks' });
          return res.end();
        }

        db.prepare(`
          INSERT INTO marks (student_id, course_id, marks)
          VALUES (?, ?, ?)
          ON CONFLICT(student_id, course_id) DO UPDATE SET marks = excluded.marks
        `).run(b.student_id, b.course_id, marksVal);

        session.flashMsg = 'Marks saved successfully';
        res.writeHead(302, { Location: '/marks' });
        return res.end();
      }
    }

    // ------------------------------------------------ Profile / Student View / Printable Report
    if (pathname === '/profile') {
      const studentId = session.role === 'ADMIN' ? (query.id || 1) : session.sid;
      const stu = db.prepare('SELECT * FROM students WHERE id = ?').get(studentId);

      if (!stu) {
        if (session.role === 'ADMIN') {
          session.flashErr = 'Student not found';
          res.writeHead(302, { Location: '/students' });
          return res.end();
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          return res.end('<h3>Student record not found. Please contact admin.</h3>');
        }
      }

      const results = db.prepare(`
        SELECT c.code, c.name, m.marks,
               CASE
                 WHEN m.marks >= 90 THEN 'A+'
                 WHEN m.marks >= 80 THEN 'A'
                 WHEN m.marks >= 70 THEN 'B'
                 WHEN m.marks >= 60 THEN 'C'
                 WHEN m.marks >= 50 THEN 'D'
                 ELSE 'F'
               END as grade
        FROM marks m JOIN courses c ON c.id = m.course_id
        WHERE m.student_id = ?
        ORDER BY c.code
      `).all(studentId);

      let total = 0;
      results.forEach(r => { total += r.marks; });
      const outOf = results.length * 100;
      const pct = results.length > 0 ? (total / results.length).toFixed(2) : '0.00';
      const overall = results.length > 0 ? gradeOf(parseFloat(pct)) : '-';

      const attBySub = db.prepare(`
        SELECT c.name as course, COUNT(*) as total,
               SUM(CASE WHEN a.status = 'P' THEN 1 ELSE 0 END) as present,
               ROUND(100.0 * SUM(CASE WHEN a.status = 'P' THEN 1 ELSE 0 END) / COUNT(*), 1) as pct
        FROM attendance a JOIN courses c ON c.id = a.course_id
        WHERE a.student_id = ?
        GROUP BY c.id
      `).all(studentId);

      const history = db.prepare(`
        SELECT a.att_date, c.name as course, a.status
        FROM attendance a JOIN courses c ON c.id = a.course_id
        WHERE a.student_id = ?
        ORDER BY a.att_date DESC LIMIT 15
      `).all(studentId);

      let resultsHtml = '';
      for (const r of results) {
        resultsHtml += `<tr>
          <td>${escapeHtml(r.code)}</td>
          <td>${escapeHtml(r.name)}</td>
          <td><b>${r.marks}</b> / 100</td>
          <td><span class="badge ${r.grade === 'F' ? 'f' : 'g'}">${escapeHtml(r.grade)}</span></td>
        </tr>`;
      }

      let attSubHtml = '';
      for (const a of attBySub) {
        attSubHtml += `<tr>
          <td>${escapeHtml(a.course)}</td>
          <td><b>${a.present}</b> / ${a.total}</td>
          <td><div class="pbar"><i style="width:${a.pct}%"></i></div> ${a.pct}%</td>
        </tr>`;
      }

      let historyHtml = '';
      for (const h of history) {
        historyHtml += `<tr>
          <td>${escapeHtml(h.att_date)}</td>
          <td>${escapeHtml(h.course)}</td>
          <td><span class="badge ${h.status}">${h.status === 'P' ? 'Present' : 'Absent'}</span></td>
        </tr>`;
      }

      const initial = (stu.name || '?').charAt(0).toUpperCase();

      const html = `
        <div class="card" style="display:flex;gap:20px;align-items:center;flex-wrap:wrap">
          <div class="av" style="margin:0">${escapeHtml(initial)}</div>
          <div style="flex:1">
            <h2>${escapeHtml(stu.name)}</h2>
            <p class="muted">Reg. No: <b>${escapeHtml(stu.reg_no)}</b> · ${escapeHtml(stu.department)} · Semester ${stu.semester}</p>
            <p class="muted">✉ ${escapeHtml(stu.email)} · 📞 ${escapeHtml(stu.phone || 'N/A')} · Admitted: ${escapeHtml(stu.admission_date)}</p>
          </div>
          <div class="no-print" style="display:flex;gap:10px">
            <button class="btn" type="button" onclick="window.print()">🖨 Print result report</button>
            ${session.role === 'ADMIN' ? '<a class="btn ghost" href="/students">← Back to Students</a>' : ''}
          </div>
        </div>

        <div class="grid" style="margin-bottom:20px">
          <div class="card stat"><b>${total} / ${outOf}</b><span>Total marks</span></div>
          <div class="card stat"><b>${pct}%</b><span>Overall percentage</span></div>
          <div class="card stat"><b>${overall}</b><span>Grade</span></div>
        </div>

        <div class="card">
          <h3 style="margin-bottom:10px">Examination results</h3>
          <div class="scroll">
            <table>
              <thead><tr><th>Code</th><th>Subject</th><th>Marks</th><th>Grade</th></tr></thead>
              <tbody>${resultsHtml || '<tr><td colspan="4" class="muted">No examination results recorded yet.</td></tr>'}</tbody>
            </table>
          </div>
        </div>

        <div class="card">
          <h3 style="margin-bottom:10px">Attendance by subject</h3>
          <div class="scroll">
            <table>
              <thead><tr><th>Subject</th><th>Present / Total</th><th>Percentage</th></tr></thead>
              <tbody>${attSubHtml || '<tr><td colspan="3" class="muted">No attendance recorded yet.</td></tr>'}</tbody>
            </table>
          </div>
        </div>

        <div class="card">
          <h3 style="margin-bottom:10px">Recent attendance history</h3>
          <div class="scroll">
            <table>
              <thead><tr><th>Date</th><th>Subject</th><th>Status</th></tr></thead>
              <tbody>${historyHtml || '<tr><td colspan="3" class="muted">No history found.</td></tr>'}</tbody>
            </table>
          </div>
        </div>
      `;

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(renderLayout('Student Profile', 'profile', html, session));
    }

    // ------------------------------------------------ Export CSV
    if (pathname === '/export') {
      const students = db.prepare('SELECT * FROM students ORDER BY reg_no').all();
      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="students.csv"'
      });

      const csvEscape = (o) => {
        let s = o === null || o === undefined ? '' : String(o);
        if (/^[=+\-@]/.test(s)) s = "'" + s; // formula injection protection
        return '"' + s.replace(/"/g, '""') + '"';
      };

      res.write('Reg No,Name,Email,Phone,Department,Semester,Admission Date\r\n');
      for (const r of students) {
        res.write([
          csvEscape(r.reg_no),
          csvEscape(r.name),
          csvEscape(r.email),
          csvEscape(r.phone),
          csvEscape(r.department),
          csvEscape(r.semester),
          csvEscape(r.admission_date)
        ].join(',') + '\r\n');
      }
      return res.end();
    }

    // 404
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Page Not Found');
  } catch (err) {
    console.error('Server error:', err);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error: ' + err.message);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n=================================================`);
  console.log(`🎓 CampusConnect Web Server Running Live!`);
  console.log(`🔗 Local URL: http://localhost:${PORT}`);
  console.log(`🔑 Admin Login: admin / admin123`);
  console.log(`👤 Student Login: 2024CS001 / 2024CS001`);
  console.log(`=================================================\n`);
});
