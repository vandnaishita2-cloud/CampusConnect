<%@ include file="/WEB-INF/views/top.jspf" %>
<body class="auth">
<form class="card auth-card" method="post" action="${ctx}/login">
  <h1>🎓 CampusConnect</h1><p class="muted" style="margin-bottom:20px">Student Management Portal – sign in</p>
  <label>Username / Registration No.<input name="username" required autofocus></label>
  <label>Password<input type="password" name="password" required></label>
  <button class="btn">Login</button>
  <p class="muted">New student? <a href="${ctx}/register">Create an account</a></p>
</form>
<%@ include file="/WEB-INF/views/foot.jspf" %>
