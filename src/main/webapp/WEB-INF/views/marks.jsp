<%@ include file="/WEB-INF/views/header.jspf" %>
<form id="markForm" class="card" method="post" action="${ctx}/marks">
  <h3 style="margin-bottom:12px">Add / update marks (out of 100)</h3>
  <div class="bar">
    <select name="student_id" required><option value="">Select student</option>
      <c:forEach items="${students}" var="s"><option value="${s.id}"><c:out value="${s.reg_no} – ${s.name}"/></option></c:forEach></select>
    <select name="course_id" required><option value="">Select course</option>
      <c:forEach items="${courses}" var="c"><option value="${c.id}"><c:out value="${c.code} – ${c.name}"/></option></c:forEach></select>
    <input type="number" name="marks" min="0" max="100" placeholder="Marks" required>
    <button class="btn">Save</button>
  </div>
</form>
<div class="card"><div class="bar"><input data-filter="mk" placeholder="🔍 Search by student or subject"></div>
<div class="scroll"><table><tr><th>Reg. No</th><th>Student</th><th>Subject</th><th>Marks</th><th>Grade</th><th>Actions</th></tr>
  <c:forEach items="${marks}" var="m"><tr data-f="mk" data-id="${m.id}" data-student_id="${m.student_id}" data-course_id="${m.course_id}" data-marks="${m.marks}">
    <td><c:out value="${m.reg_no}"/></td><td><c:out value="${m.name}"/></td><td><c:out value="${m.code} – ${m.course}"/></td><td>${m.marks}</td>
    <td><span class="badge ${m.grade=='F'?'f':'g'}">${m.grade}</span></td>
    <td><button class="btn sm" onclick="edit(this,'markForm')">Edit</button>
      <a class="btn sm ghost" href="${ctx}/profile?id=${m.student_id}">Report</a>
      <form class="del" method="post" action="${ctx}/marks"><input type="hidden" name="action" value="delete"><input type="hidden" name="id" value="${m.id}"><button class="btn sm red">Delete</button></form></td></tr></c:forEach>
  <c:if test="${empty marks}"><tr><td colspan="6" class="muted">No marks entered yet.</td></tr></c:if>
</table></div></div>
<%@ include file="/WEB-INF/views/footer.jspf" %>
