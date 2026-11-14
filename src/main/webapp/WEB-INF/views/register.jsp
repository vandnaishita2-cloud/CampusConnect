<%@ include file="/WEB-INF/views/top.jspf" %>
<body class="auth">
<form class="card auth-card" method="post" action="${ctx}/register">
  <h1>Student Registration</h1><p class="muted" style="margin-bottom:20px">Create your CampusConnect account</p>
  <div class="fgrid">
    <label>Registration No.<input name="reg_no" required></label>
    <label>Full name<input name="name" required></label>
    <label>Email<input type="email" name="email" required></label>
    <label>Phone (10 digits)<input name="phone" pattern="\d{10}"></label>
    <label>Department<select name="department" required><%@ include file="/WEB-INF/views/depts.jspf" %></select></label>
    <label>Semester<input type="number" name="semester" min="1" max="8" required></label>
  </div>
  <label>Password (min 6 chars)<input type="password" name="password" minlength="6" required></label>
  <button class="btn">Register</button>
  <p class="muted">Already registered? <a href="${ctx}/login">Login</a></p>
</form>
<%@ include file="/WEB-INF/views/foot.jspf" %>
