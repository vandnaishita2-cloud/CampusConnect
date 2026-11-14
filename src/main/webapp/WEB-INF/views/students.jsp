<%@ include file="/WEB-INF/views/header.jspf" %>
<div class="card">
  <div class="bar">
    <input data-filter="st" placeholder="🔍 Search by name, reg. no or department">
    <button class="btn ghost sm" onclick="view('t')">Table</button><button class="btn ghost sm" onclick="view('c')">Cards</button>
    <button class="btn" onclick="openAdd('dlg')">+ Add Student</button>
    <a class="btn ghost" href="${ctx}/export">⬇ Export CSV</a>
  </div>
  <div id="tbl" class="scroll"><table>
    <tr><th>Reg. No</th><th>Name</th><th>Email</th><th>Phone</th><th>Dept</th><th>Sem</th><th>Admitted</th><th>Actions</th></tr>
    <c:forEach items="${students}" var="s">
      <tr data-f="st" data-id="${s.id}" data-reg_no="<c:out value='${s.reg_no}'/>" data-name="<c:out value='${s.name}'/>" data-email="<c:out value='${s.email}'/>"
          data-phone="<c:out value='${s.phone}'/>" data-department="${s.department}" data-semester="${s.semester}" data-admission_date="${s.admission_date}">
        <td><c:out value="${s.reg_no}"/></td><td><c:out value="${s.name}"/></td><td><c:out value="${s.email}"/></td><td><c:out value="${s.phone}"/></td>
        <td>${s.department}</td><td>${s.semester}</td><td>${s.admission_date}</td>
        <td><a class="btn sm ghost" href="${ctx}/profile?id=${s.id}">View</a>
          <button class="btn sm" onclick="edit(this,'dlg')">Edit</button>
          <form class="del" method="post" action="${ctx}/students"><input type="hidden" name="action" value="delete"><input type="hidden" name="id" value="${s.id}"><button class="btn sm red">Delete</button></form></td>
      </tr></c:forEach>
  </table></div>
  <div id="cards" class="grid" hidden>
    <c:forEach items="${students}" var="s"><a class="card pc" data-f="st" href="${ctx}/profile?id=${s.id}">
      <div class="av"><c:out value="${s.name.substring(0,1)}"/></div><b><c:out value="${s.name}"/></b>
      <div class="muted"><c:out value="${s.reg_no}"/> · ${s.department} · Sem ${s.semester}</div></a></c:forEach>
  </div>
  <c:if test="${empty students}"><p class="muted">No students yet. Click “Add Student”.</p></c:if>
</div>

<dialog id="dlg"><form method="post" action="${ctx}/students">
  <h3>Student details</h3><input type="hidden" name="id">
  <div class="fgrid">
    <label>Registration No.*<input name="reg_no" required></label>
    <label>Full name*<input name="name" required></label>
    <label>Email*<input type="email" name="email" required></label>
    <label>Phone (10 digits)<input name="phone" pattern="\d{10}"></label>
    <label>Department*<select name="department" required><%@ include file="/WEB-INF/views/depts.jspf" %></select></label>
    <label>Semester*<input type="number" name="semester" min="1" max="8" required></label>
    <label>Date of admission<input type="date" name="admission_date"></label>
  </div>
  <button class="btn">Save</button> <button class="btn ghost" type="button" onclick="this.closest('dialog').close()">Cancel</button>
</form></dialog>
<%@ include file="/WEB-INF/views/footer.jspf" %>
