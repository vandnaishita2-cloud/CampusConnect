package campus;

import java.io.IOException;
import java.io.PrintWriter;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.*;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.*;

/** Single controller: GET shows a page, POST performs a create/update/delete then redirects (PRG pattern). */
@WebServlet({"/login", "/register", "/logout", "/dashboard", "/students", "/attendance", "/marks", "/courses", "/profile", "/export"})
public class AppServlet extends HttpServlet {

    static final String GRADE = "CASE WHEN m.marks>=90 THEN 'A+' WHEN m.marks>=80 THEN 'A' WHEN m.marks>=70 THEN 'B' "
            + "WHEN m.marks>=60 THEN 'C' WHEN m.marks>=50 THEN 'D' ELSE 'F' END";

    // ---------------------------------------------------------------- GET
    @Override protected void doGet(HttpServletRequest rq, HttpServletResponse rs) throws ServletException, IOException {
        try {
            switch (rq.getServletPath()) {
                case "/login": show(rq, rs, "login", "Login"); break;
                case "/register": show(rq, rs, "register", "Register"); break;
                case "/logout": rq.getSession().invalidate(); rs.sendRedirect("login"); break;
                case "/dashboard": dashboard(rq); show(rq, rs, "dashboard", "Dashboard"); break;
                case "/students": rq.setAttribute("students", Db.query("SELECT * FROM students ORDER BY name"));
                    show(rq, rs, "students", "Students"); break;
                case "/attendance": attendance(rq); show(rq, rs, "attendance", "Attendance"); break;
                case "/marks": marks(rq); show(rq, rs, "marks", "Marks & Results"); break;
                case "/courses": courses(rq); show(rq, rs, "courses", "Courses"); break;
                case "/profile": if (profile(rq, rs)) show(rq, rs, "profile", "Student Profile"); break;
                case "/export": export(rs); break;
            }
        } catch (SQLException e) { throw new ServletException(e); }
    }

    // ---------------------------------------------------------------- POST
    @Override protected void doPost(HttpServletRequest rq, HttpServletResponse rs) throws ServletException, IOException {
        rq.setCharacterEncoding("UTF-8");
        String path = rq.getServletPath(), go = path.substring(1);
        try {
            switch (path) {
                case "/login": go = login(rq); break;
                case "/register": go = register(rq); break;
                case "/students": saveStudent(rq); break;
                case "/attendance": markAttendance(rq); break;
                case "/marks": saveMarks(rq); break;
                case "/courses": saveCourse(rq); break;
            }
        } catch (SQLException e) { flash(rq, "err", e.getErrorCode() == 1062 ? "Duplicate entry – already exists" : "Database error: " + e.getMessage()); }
        rs.sendRedirect(go);
    }

    // ---------------------------------------------------------------- helpers
    static String p(HttpServletRequest rq, String k) { String v = rq.getParameter(k); return v == null ? "" : v.trim(); }
    static void flash(HttpServletRequest rq, String k, String m) { rq.getSession().setAttribute(k, m); }
    static boolean isDelete(HttpServletRequest rq) { return "delete".equals(p(rq, "action")); }
    static boolean blank(String... v) { for (String s : v) if (s.isEmpty()) return true; return false; }
    static boolean inRange(String s, int lo, int hi) { try { int n = Integer.parseInt(s); return n >= lo && n <= hi; } catch (Exception e) { return false; } }

    static String gradeOf(double pct) { return pct >= 90 ? "A+" : pct >= 80 ? "A" : pct >= 70 ? "B" : pct >= 60 ? "C" : pct >= 50 ? "D" : "F"; }

    /** Moves flash messages to the request, then forwards to /WEB-INF/views/<view>.jsp */
    private void show(HttpServletRequest rq, HttpServletResponse rs, String view, String title) throws ServletException, IOException {
        HttpSession s = rq.getSession();
        for (String k : new String[]{"msg", "err"}) { rq.setAttribute(k, s.getAttribute(k)); s.removeAttribute(k); }
        rq.setAttribute("view", view);
        rq.setAttribute("title", title);
        rq.getRequestDispatcher("/WEB-INF/views/" + view + ".jsp").forward(rq, rs);
    }

    /** Rows -> JS object literal for Chart.js: {labels:[..],data:[..]} */
    static String json(List<Map<String, Object>> rows) {
        StringBuilder l = new StringBuilder("["), d = new StringBuilder("[");
        for (Map<String, Object> r : rows) {
            l.append('"').append(String.valueOf(r.get("label")).replace("\\", "\\\\").replace("\"", "\\\"").replace("<", "\\u003c")).append("\",");
            d.append(r.get("val")).append(',');
        }
        return "{labels:" + l + "],data:" + d + "]}";
    }

    // ---------------------------------------------------------------- authentication
    private String login(HttpServletRequest rq) throws SQLException {
        String pw = rq.getParameter("password");
        List<Map<String, Object>> u = Db.query("SELECT * FROM users WHERE username=?", p(rq, "username"));
        if (pw != null && !u.isEmpty() && Auth.check(pw, (String) u.get(0).get("password"))) {
            HttpSession s = rq.getSession();
            rq.changeSessionId();
            s.setAttribute("user", u.get(0).get("username"));
            s.setAttribute("role", u.get(0).get("role"));
            s.setAttribute("sid", u.get(0).get("student_id"));
            return "ADMIN".equals(u.get(0).get("role")) ? "dashboard" : "profile";
        }
        flash(rq, "err", "Invalid username or password");
        return "login";
    }

    private String register(HttpServletRequest rq) throws SQLException {
        String pw = rq.getParameter("password") == null ? "" : rq.getParameter("password");
        String err = validStudent(rq);
        if (err == null && pw.length() < 6) err = "Password must be at least 6 characters";
        if (err != null) { flash(rq, "err", err); return "register"; }
        insertStudent(rq, pw);
        flash(rq, "msg", "Registration successful! Please login with your registration number.");
        return "login";
    }

    // ---------------------------------------------------------------- students
    private String validStudent(HttpServletRequest rq) {
        if (blank(p(rq, "reg_no"), p(rq, "name"), p(rq, "email"), p(rq, "department"))) return "Please fill all required fields";
        if (!p(rq, "email").matches(".+@.+\\..+")) return "Enter a valid email address";
        if (!p(rq, "phone").isEmpty() && !p(rq, "phone").matches("\\d{10}")) return "Phone must be 10 digits";
        if (!inRange(p(rq, "semester"), 1, 8)) return "Semester must be between 1 and 8";
        return null;
    }

    /** Inserts the student and creates a login (username = reg no). */
    private void insertStudent(HttpServletRequest rq, String password) throws SQLException {
        Db.update("INSERT INTO students(reg_no,name,email,phone,department,semester,admission_date) VALUES(?,?,?,?,?,?,COALESCE(NULLIF(?,''),CURDATE()))",
            p(rq, "reg_no"), p(rq, "name"), p(rq, "email"), p(rq, "phone"), p(rq, "department"), p(rq, "semester"), p(rq, "admission_date"));
        Db.update("INSERT INTO users(username,password,role,student_id) SELECT ?,?, 'STUDENT', id FROM students WHERE reg_no=?",
            p(rq, "reg_no"), Auth.hash(password), p(rq, "reg_no"));
    }

    private void saveStudent(HttpServletRequest rq) throws SQLException {
        if (isDelete(rq)) { Db.update("DELETE FROM students WHERE id=?", p(rq, "id")); flash(rq, "msg", "Student deleted"); return; }
        String err = validStudent(rq);
        if (err != null) { flash(rq, "err", err); return; }
        if (p(rq, "id").isEmpty()) {
            insertStudent(rq, p(rq, "reg_no"));   // default password = registration number
            flash(rq, "msg", "Student added (default password = reg. number)");
        } else {
            Db.update("UPDATE students SET reg_no=?,name=?,email=?,phone=?,department=?,semester=?,admission_date=? WHERE id=?",
                p(rq, "reg_no"), p(rq, "name"), p(rq, "email"), p(rq, "phone"), p(rq, "department"), p(rq, "semester"), p(rq, "admission_date"), p(rq, "id"));
            Db.update("UPDATE users SET username=? WHERE student_id=?", p(rq, "reg_no"), p(rq, "id"));
            flash(rq, "msg", "Student updated");
        }
    }

    // ---------------------------------------------------------------- attendance
    private void attendance(HttpServletRequest rq) throws SQLException {
        StringBuilder w = new StringBuilder(" WHERE 1=1");
        List<Object> a = new ArrayList<>();
        if (!p(rq, "fdate").isEmpty()) { w.append(" AND a.att_date=?"); a.add(p(rq, "fdate")); }
        if (!p(rq, "fstudent").isEmpty()) { w.append(" AND a.student_id=?"); a.add(p(rq, "fstudent")); }
        if (!p(rq, "fcourse").isEmpty()) { w.append(" AND a.course_id=?"); a.add(p(rq, "fcourse")); }
        rq.setAttribute("students", Db.query("SELECT * FROM students ORDER BY name"));
        rq.setAttribute("courses", Db.query("SELECT * FROM courses ORDER BY code"));
        rq.setAttribute("today", LocalDate.now().toString());
        rq.setAttribute("records", Db.query("SELECT a.att_date,s.name,s.reg_no,c.name course,a.status FROM attendance a "
            + "JOIN students s ON s.id=a.student_id JOIN courses c ON c.id=a.course_id" + w + " ORDER BY a.att_date DESC,s.name LIMIT 200", a.toArray()));
        rq.setAttribute("summary", Db.query("SELECT s.reg_no,s.name,COUNT(a.id) total,SUM(a.status='P') present,"
            + "ROUND(100*SUM(a.status='P')/COUNT(a.id),1) pct FROM students s JOIN attendance a ON a.student_id=s.id GROUP BY s.id ORDER BY s.name"));
    }

    private void markAttendance(HttpServletRequest rq) throws SQLException {
        if (blank(p(rq, "course_id"), p(rq, "att_date"))) { flash(rq, "err", "Choose a course and date"); return; }
        for (Map<String, Object> s : Db.query("SELECT id FROM students")) {
            String st = rq.getParameter("st_" + s.get("id"));
            if (st != null)
                Db.update("INSERT INTO attendance(student_id,course_id,att_date,status) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE status=VALUES(status)",
                    s.get("id"), p(rq, "course_id"), p(rq, "att_date"), "A".equals(st) ? "A" : "P");
        }
        flash(rq, "msg", "Attendance saved");
    }

    // ---------------------------------------------------------------- marks
    private void marks(HttpServletRequest rq) throws SQLException {
        rq.setAttribute("students", Db.query("SELECT * FROM students ORDER BY name"));
        rq.setAttribute("courses", Db.query("SELECT * FROM courses ORDER BY code"));
        rq.setAttribute("marks", Db.query("SELECT m.id,m.student_id,m.course_id,m.marks,s.name,s.reg_no,c.code,c.name course," + GRADE
            + " grade FROM marks m JOIN students s ON s.id=m.student_id JOIN courses c ON c.id=m.course_id ORDER BY s.name,c.code"));
    }

    private void saveMarks(HttpServletRequest rq) throws SQLException {
        if (isDelete(rq)) { Db.update("DELETE FROM marks WHERE id=?", p(rq, "id")); flash(rq, "msg", "Marks deleted"); return; }
        if (blank(p(rq, "student_id"), p(rq, "course_id")) || !inRange(p(rq, "marks"), 0, 100)) { flash(rq, "err", "Choose student, course and marks (0-100)"); return; }
        Db.update("INSERT INTO marks(student_id,course_id,marks) VALUES(?,?,?) ON DUPLICATE KEY UPDATE marks=VALUES(marks)",
            p(rq, "student_id"), p(rq, "course_id"), p(rq, "marks"));
        flash(rq, "msg", "Marks saved");
    }

    // ---------------------------------------------------------------- courses
    private void courses(HttpServletRequest rq) throws SQLException {
        rq.setAttribute("courses", Db.query("SELECT c.*,(SELECT COUNT(*) FROM students s WHERE s.department=c.department AND s.semester=c.semester) enrolled "
            + "FROM courses c ORDER BY c.semester,c.code"));
        if (!p(rq, "view").isEmpty()) {
            rq.setAttribute("viewCourse", Db.one("SELECT name FROM courses WHERE id=?", p(rq, "view")));
            rq.setAttribute("enrolledList", Db.query("SELECT s.* FROM students s JOIN courses c ON c.department=s.department AND c.semester=s.semester WHERE c.id=? ORDER BY s.name", p(rq, "view")));
        }
    }

    private void saveCourse(HttpServletRequest rq) throws SQLException {
        if (isDelete(rq)) { Db.update("DELETE FROM courses WHERE id=?", p(rq, "id")); flash(rq, "msg", "Course deleted"); return; }
        if (blank(p(rq, "code"), p(rq, "name"), p(rq, "department"), p(rq, "faculty")) || !inRange(p(rq, "semester"), 1, 8)) { flash(rq, "err", "Fill all fields (semester 1-8)"); return; }
        if (p(rq, "id").isEmpty())
            Db.update("INSERT INTO courses(code,name,department,semester,faculty) VALUES(?,?,?,?,?)", p(rq, "code"), p(rq, "name"), p(rq, "department"), p(rq, "semester"), p(rq, "faculty"));
        else
            Db.update("UPDATE courses SET code=?,name=?,department=?,semester=?,faculty=? WHERE id=?", p(rq, "code"), p(rq, "name"), p(rq, "department"), p(rq, "semester"), p(rq, "faculty"), p(rq, "id"));
        flash(rq, "msg", "Course saved");
    }

    // ---------------------------------------------------------------- dashboard / profile / export
    private void dashboard(HttpServletRequest rq) throws SQLException {
        rq.setAttribute("nStudents", Db.one("SELECT COUNT(*) FROM students"));
        rq.setAttribute("nFaculty", Db.one("SELECT COUNT(DISTINCT faculty) FROM courses"));
        rq.setAttribute("nCourses", Db.one("SELECT COUNT(*) FROM courses"));
        rq.setAttribute("avgAtt", Db.one("SELECT COALESCE(ROUND(100*SUM(status='P')/COUNT(*),1),0) FROM attendance"));
        rq.setAttribute("recent", Db.query("SELECT name,reg_no,department,admission_date FROM students ORDER BY id DESC LIMIT 5"));
        List<Map<String, Object>> trend = Db.query("SELECT att_date label,ROUND(100*SUM(status='P')/COUNT(*),1) val FROM attendance GROUP BY att_date ORDER BY att_date DESC LIMIT 7");
        Collections.reverse(trend);
        rq.setAttribute("attJson", json(trend));
        rq.setAttribute("deptJson", json(Db.query("SELECT department label,COUNT(*) val FROM students GROUP BY department")));
        rq.setAttribute("markJson", json(Db.query("SELECT c.code label,ROUND(AVG(m.marks),1) val FROM marks m JOIN courses c ON c.id=m.course_id GROUP BY c.id")));
    }

    /** Admin: /profile?id=5 ; Student: always their own record. Returns false if it redirected. */
    private boolean profile(HttpServletRequest rq, HttpServletResponse rs) throws SQLException, IOException {
        HttpSession s = rq.getSession();
        Object id = "ADMIN".equals(s.getAttribute("role")) ? p(rq, "id") : s.getAttribute("sid");
        List<Map<String, Object>> st = Db.query("SELECT * FROM students WHERE id=?", id);
        if (st.isEmpty()) { flash(rq, "err", "Student not found"); rs.sendRedirect("students"); return false; }
        rq.setAttribute("stu", st.get(0));
        rq.setAttribute("att", Db.query("SELECT c.name course,COUNT(*) total,SUM(a.status='P') present,ROUND(100*SUM(a.status='P')/COUNT(*),1) pct "
            + "FROM attendance a JOIN courses c ON c.id=a.course_id WHERE a.student_id=? GROUP BY c.id", id));
        rq.setAttribute("history", Db.query("SELECT a.att_date,c.name course,a.status FROM attendance a JOIN courses c ON c.id=a.course_id "
            + "WHERE a.student_id=? ORDER BY a.att_date DESC LIMIT 15", id));
        List<Map<String, Object>> m = Db.query("SELECT c.code,c.name,m.marks," + GRADE + " grade FROM marks m JOIN courses c ON c.id=m.course_id WHERE m.student_id=?", id);
        int total = 0;
        for (Map<String, Object> r : m) total += ((Number) r.get("marks")).intValue();
        double pct = m.isEmpty() ? 0 : (double) total / m.size();
        rq.setAttribute("results", m);
        rq.setAttribute("total", total);
        rq.setAttribute("outOf", m.size() * 100);
        rq.setAttribute("pct", String.format("%.2f", pct));
        rq.setAttribute("overall", m.isEmpty() ? "-" : gradeOf(pct));
        return true;
    }

    private void export(HttpServletResponse rs) throws SQLException, IOException {
        rs.setContentType("text/csv;charset=UTF-8");
        rs.setHeader("Content-Disposition", "attachment; filename=students.csv");
        PrintWriter w = rs.getWriter();
        w.println("Reg No,Name,Email,Phone,Department,Semester,Admission Date");
        for (Map<String, Object> r : Db.query("SELECT * FROM students ORDER BY reg_no"))
            w.println(csv(r.get("reg_no")) + "," + csv(r.get("name")) + "," + csv(r.get("email")) + "," + csv(r.get("phone")) + ","
                + csv(r.get("department")) + "," + csv(r.get("semester")) + "," + csv(r.get("admission_date")));
    }

    static String csv(Object o) {
        String s = o == null ? "" : o.toString();
        if (s.matches("^[=+\\-@].*")) s = "'" + s;      // stop spreadsheet formula injection
        return "\"" + s.replace("\"", "\"\"") + "\"";
    }
}
