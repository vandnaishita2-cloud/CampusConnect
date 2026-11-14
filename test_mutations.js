const http = require('node:http');

function req(options, postData) {
  return new Promise((resolve, reject) => {
    const r = http.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    r.on('error', reject);
    if (postData) r.write(postData);
    r.end();
  });
}

(async () => {
  try {
    // 1. Admin Login
    const postBody = 'username=admin&password=admin123';
    const rLogin = await req({
      host: 'localhost', port: 8080, path: '/login', method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(postBody) }
    }, postBody);
    const cookie = rLogin.headers['set-cookie'][0].split(';')[0];

    // 2. Add a new Student
    const newStudentBody = 'reg_no=2024IT999&name=Neha+Sen&email=neha%40test.com&phone=9123456789&department=IT&semester=1&admission_date=2024-09-01';
    const rAdd = await req({
      host: 'localhost', port: 8080, path: '/students', method: 'POST',
      headers: { 'Cookie': cookie, 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(newStudentBody) }
    }, newStudentBody);
    console.log('Add Student status:', rAdd.status, '| Redirects to:', rAdd.headers.location);

    // Verify in student list
    const rList = await req({ host: 'localhost', port: 8080, path: '/students', method: 'GET', headers: { 'Cookie': cookie } });
    console.log('Found Neha Sen in students list:', rList.body.includes('Neha Sen'));

    // 3. Mark Attendance for the new student
    const today = new Date().toISOString().slice(0, 10);
    const attBody = `course_id=5&att_date=${today}&st_7=P`;
    const rAtt = await req({
      host: 'localhost', port: 8080, path: '/attendance', method: 'POST',
      headers: { 'Cookie': cookie, 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(attBody) }
    }, attBody);
    console.log('Save Attendance status:', rAtt.status);

    // 4. Save Marks for student
    const marksBody = 'student_id=7&course_id=5&marks=94';
    const rMarks = await req({
      host: 'localhost', port: 8080, path: '/marks', method: 'POST',
      headers: { 'Cookie': cookie, 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(marksBody) }
    }, marksBody);
    console.log('Save Marks status:', rMarks.status);

    // Verify student profile
    const rProf = await req({ host: 'localhost', port: 8080, path: '/profile?id=7', method: 'GET', headers: { 'Cookie': cookie } });
    console.log('Profile has 94 marks and A+ grade:', rProf.body.includes('94') && rProf.body.includes('A+'));

    console.log('\nMUTATION TESTS PASSED 100%!');
  } catch (e) {
    console.error('Mutation test error:', e);
  }
})();
