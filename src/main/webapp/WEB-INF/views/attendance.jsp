<%@ include file="/WEB-INF/views/header.jspf" %>
<form class="card" method="post" action="${ctx}/attendance">
  <h3 style="margin-bottom:12px">Mark attendance</h3>
  <div class="bar">
    <select name="course_id" required><option value="">Select course</option>
      <c:forEach items="${courses}" var="c"><option value="${c.id}"><c:out value="${c.code} – ${c.name}"/></option></c:forEach></select>
    <input type="date" name="att_date" value="${today}" required>
    <input data-filter="mk" placeholder="🔍 Search student">
    <button class="btn">Save attendance</button>
  </div>
  <div class="scroll"><table><tr><th>Reg. No</th><th>Name</th><th>Status</th></tr>
    <c:forEach items="${students}" var="s"><tr data-f="mk"><td><c:out value="${s.reg_no}"/></td><td><c:out value="${s.name}"/></td>
      <td><label class="inl"><input type="radio" name="st_${s.id}" value="P" checked>Present</label><label class="inl"><input type="radio" name="st_${s.id}" value="A">Absent</label></td></tr></c:forEach>
  </table></div>
</form>

<div class="card"><h3 style="margin-bottom:12px">Attendance records</h3>
  <form class="bar" method="get" action="${ctx}/attendance">
    <input type="date" name="fdate" value="${param.fdate}">
    <select name="fstudent"><option value="">All students</option>
      <c:forEach items="${students}" var="s"><option value="${s.id}" ${param.fstudent==s.id?'selected':''}><c:out value="${s.name}"/></option></c:forEach></select>
    <select name="fcourse"><option value="">All subjects</option>
      <c:forEach items="${courses}" var="c"><option value="${c.id}" ${param.fcourse==c.id?'selected':''}><c:out value="${c.name}"/></option></c:forEach></select>
    <button class="btn sm">Filter</button><a class="btn sm ghost" href="${ctx}/attendance">Reset</a>
  </form>
  <div class="scroll"><table><tr><th>Date</th><th>Reg. No</th><th>Student</th><th>Subject</th><th>Status</th></tr>
    <c:forEach items="${records}" var="r"><tr><td>${r.att_date}</td><td><c:out value="${r.reg_no}"/></td><td><c:out value="${r.name}"/></td><td><c:out value="${r.course}"/></td>
      <td><span class="badge ${r.status}">${r.status=='P'?'Present':'Absent'}</span></td></tr></c:forEach>
    <c:if test="${empty records}"><tr><td colspan="5" class="muted">No records found.</td></tr></c:if>
  </table></div></div>

<div class="card"><h3 style="margin-bottom:12px">Attendance percentage</h3><div class="scroll"><table>
  <tr><th>Reg. No</th><th>Student</th><th>Present / Total</th><th>Percentage</th></tr>
  <c:forEach items="${summary}" var="r"><tr><td><c:out value="${r.reg_no}"/></td><td><c:out value="${r.name}"/></td><td>${r.present} / ${r.total}</td>
    <td><div class="pbar"><i style="width:${r.pct}%"></i></div> ${r.pct}% <c:if test="${r.pct<75}"><span class="badge A">Low</span></c:if></td></tr></c:forEach>
</table></div></div>
<%@ include file="/WEB-INF/views/footer.jspf" %>
