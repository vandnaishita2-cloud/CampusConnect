package campus;

import java.io.IOException;
import javax.servlet.*;
import javax.servlet.annotation.WebFilter;
import javax.servlet.http.*;

/** Protects every page: must be logged in; students may only open /profile. */
@WebFilter("/*")
public class AuthFilter implements Filter {
    @Override public void doFilter(ServletRequest q, ServletResponse s, FilterChain chain) throws IOException, ServletException {
        HttpServletRequest rq = (HttpServletRequest) q;
        HttpServletResponse rs = (HttpServletResponse) s;
        String p = rq.getServletPath();
        boolean open = p.equals("/login") || p.equals("/register") || p.equals("/") || p.equals("/index.jsp")
                || p.startsWith("/css") || p.startsWith("/js");
        HttpSession ses = rq.getSession(false);
        String role = ses == null ? null : (String) ses.getAttribute("role");
        if (open) chain.doFilter(q, s);
        else if (role == null) rs.sendRedirect(rq.getContextPath() + "/login");
        else if (!role.equals("ADMIN") && !p.equals("/profile") && !p.equals("/logout")) rs.sendRedirect(rq.getContextPath() + "/profile");
        else chain.doFilter(q, s);
    }
}
