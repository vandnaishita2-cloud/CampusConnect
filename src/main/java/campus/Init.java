package campus;

import java.nio.charset.StandardCharsets;
import javax.servlet.ServletContextEvent;
import javax.servlet.ServletContextListener;
import javax.servlet.annotation.WebListener;

/** Runs once at startup: creates tables from schema.sql and seeds an admin + sample courses. */
@WebListener
public class Init implements ServletContextListener {
    @Override public void contextInitialized(ServletContextEvent e) {
        try {
            String sql = new String(Init.class.getResourceAsStream("/schema.sql").readAllBytes(), StandardCharsets.UTF_8);
            for (String s : sql.split(";")) if (!s.trim().isEmpty()) Db.update(s);
            if (((Number) Db.one("SELECT COUNT(*) FROM users")).intValue() == 0)
                Db.update("INSERT INTO users(username,password,role) VALUES('admin',?, 'ADMIN')", Auth.hash("admin123"));
            if (((Number) Db.one("SELECT COUNT(*) FROM courses")).intValue() == 0)
                Db.update("INSERT INTO courses(code,name,department,semester,faculty) VALUES "
                    + "('CS101','Programming in Java','CSE',1,'Dr. Sharma'),('CS102','Data Structures','CSE',1,'Prof. Rao'),"
                    + "('MA101','Engineering Maths','CSE',1,'Dr. Iyer'),('EC101','Basic Electronics','ECE',1,'Prof. Khan')");
            System.out.println(">>> CampusConnect database ready.");
        } catch (Exception ex) {
            throw new RuntimeException("Cannot set up MySQL. Is it running? Check -Ddb.user / -Ddb.pass.", ex);
        }
    }
}
