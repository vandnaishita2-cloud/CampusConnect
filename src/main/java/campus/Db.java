package campus;

import java.sql.*;
import java.util.*;

/** Tiny JDBC helper: every query opens a connection, runs a PreparedStatement and closes it. */
public class Db {
    static String prop(String k, String d) { return System.getProperty(k, d); }
    static final String URL = prop("db.url",
        "jdbc:mysql://localhost:3306/campusconnect?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC");
    static final String USER = prop("db.user", "root"), PASS = prop("db.pass", "root");

    static { try { Class.forName("com.mysql.cj.jdbc.Driver"); } catch (Exception e) { throw new RuntimeException(e); } }

    /** SELECT -> list of rows (column label -> value). */
    public static List<Map<String, Object>> query(String sql, Object... p) throws SQLException {
        try (Connection c = DriverManager.getConnection(URL, USER, PASS); PreparedStatement ps = c.prepareStatement(sql)) {
            for (int i = 0; i < p.length; i++) ps.setObject(i + 1, p[i]);
            try (ResultSet rs = ps.executeQuery()) {
                ResultSetMetaData m = rs.getMetaData();
                List<Map<String, Object>> out = new ArrayList<>();
                while (rs.next()) {
                    Map<String, Object> row = new LinkedHashMap<>();
                    for (int i = 1; i <= m.getColumnCount(); i++) row.put(m.getColumnLabel(i), rs.getObject(i));
                    out.add(row);
                }
                return out;
            }
        }
    }

    /** INSERT / UPDATE / DELETE. */
    public static int update(String sql, Object... p) throws SQLException {
        try (Connection c = DriverManager.getConnection(URL, USER, PASS); PreparedStatement ps = c.prepareStatement(sql)) {
            for (int i = 0; i < p.length; i++) ps.setObject(i + 1, p[i]);
            return ps.executeUpdate();
        }
    }

    /** First column of first row (used for COUNT etc.). */
    public static Object one(String sql, Object... p) throws SQLException {
        List<Map<String, Object>> r = query(sql, p);
        return r.isEmpty() ? null : r.get(0).values().iterator().next();
    }
}
