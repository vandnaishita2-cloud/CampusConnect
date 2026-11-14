<%@ include file="/WEB-INF/views/header.jspf" %>
<div class="card">
  <div class="bar"><input data-filter="co" placeholder="🔍 Search courses"><button class="btn" onclick="openAdd('dlg')">+ Add Course</button></div>
  <div class="scroll"><table><tr><th>Code</th><th>Course</th><th>Dept</th><th>Semester</th><th>Faculty</th><th>Enrolled</th><th>Actions</th></tr>
    <c:forEach items="${courses}" var="c"><tr data-f="co" data-id="${c.id}" data-code="<c:out value='${c.code}'/>" data-name="<c:out value='${c.name}'/>"
        data-department="${c.department}" data-semester="${c.semester}" data-faculty="<c:out value='${c.faculty}'/>">
      <td><c:out value="${c.code}"/></td><td><c:out value="${c.name}"/></td><td>${c.department}</td><td>${c.semester}</td><td><c:out value="${c.faculty}"/></td><td>${c.enrolled}</td>
      <td><a class="btn sm ghost" href="${ctx}/courses?view=${c.id}">Students</a> <button class="btn sm" onclick="edit(this,'dlg')">Edit</button>
        <form class="del" method="post" action="${ctx}/courses"><input type="hidden" name="action" value="delete"><input type="hidden" name="id" value="${c.id}"><button class="btn sm red">Delete</button></form></td></tr></c:forEach>
  </table></div>
</div>
<c:if test="${not empty viewCourse}"><div class="card"><h3 style="margin-bottom:10px">Enrolled in <c:out value="${viewCourse}"/> (same department &amp; semester)</h3><div class="scroll"><table>
  <tr><th>Reg. No</th><th>Name</th><th>Email</th></tr>
  <c:forEach items="${enrolledList}" var="s"><tr><td><c:out value="${s.reg_no}"/></td><td><c:out value="${s.name}"/></td><td><c:out value="${s.email}"/></td></tr></c:forEach>
  <c:if test="${empty enrolledList}"><tr><td colspan="3" class="muted">No students enrolled yet.</td></tr></c:if></table></div></div></c:if>

<dialog id="dlg"><form method="post" action="${ctx}/courses">
  <h3>Course details</h3><input type="hidden" name="id">
  <div class="fgrid">
    <label>Course code*<input name="code" required></label>
    <label>Course name*<input name="name" required></label>
    <label>Department*<select name="department" required><%@ include file="/WEB-INF/views/depts.jspf" %></select></label>
    <label>Semester*<input type="number" name="semester" min="1" max="8" required></label>
  </div>
  <label>Faculty*<input name="faculty" required></label>
  <button class="btn">Save</button> <button class="btn ghost" type="button" onclick="this.closest('dialog').close()">Cancel</button>
</form></dialog>
<%@ include file="/WEB-INF/views/footer.jspf" %>
