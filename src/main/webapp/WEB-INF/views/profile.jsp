<%@ include file="/WEB-INF/views/header.jspf" %>
<div class="card" style="display:flex;gap:20px;align-items:center;flex-wrap:wrap">
  <div class="av" style="margin:0"><c:out value="${stu.name.substring(0,1)}"/></div>
  <div style="flex:1"><h2><c:out value="${stu.name}"/></h2>
    <p class="muted">Reg. No: <c:out value="${stu.reg_no}"/> · ${stu.department} · Semester ${stu.semester}</p>
    <p class="muted">✉ <c:out value="${stu.email}"/> · 📞 <c:out value="${stu.phone}"/> · Admitted ${stu.admission_date}</p></div>
  <div class="no-print"><button class="btn" onclick="window.print()">🖨 Print result report</button>
    <c:if test="${sessionScope.role=='ADMIN'}"><a class="btn ghost" href="${ctx}/students">← Back</a></c:if></div>
</div>
<div class="grid" style="margin-bottom:20px">
  <div class="card stat"><b>${total} / ${outOf}</b><span>Total marks</span></div>
  <div class="card stat"><b>${pct}%</b><span>Percentage</span></div>
  <div class="card stat"><b>${overall}</b><span>Overall grade</span></div>
</div>
<div class="card"><h3 style="margin-bottom:10px">Examination results</h3><div class="scroll"><table><tr><th>Code</th><th>Subject</th><th>Marks</th><th>Grade</th></tr>
  <c:forEach items="${results}" var="r"><tr><td><c:out value="${r.code}"/></td><td><c:out value="${r.name}"/></td><td>${r.marks}</td><td><span class="badge ${r.grade=='F'?'f':'g'}">${r.grade}</span></td></tr></c:forEach>
  <c:if test="${empty results}"><tr><td colspan="4" class="muted">No results yet.</td></tr></c:if></table></div></div>
<div class="card"><h3 style="margin-bottom:10px">Attendance by subject</h3><div class="scroll"><table><tr><th>Subject</th><th>Present / Total</th><th>Percentage</th></tr>
  <c:forEach items="${att}" var="a"><tr><td><c:out value="${a.course}"/></td><td>${a.present} / ${a.total}</td><td><div class="pbar"><i style="width:${a.pct}%"></i></div> ${a.pct}%</td></tr></c:forEach>
  <c:if test="${empty att}"><tr><td colspan="3" class="muted">No attendance yet.</td></tr></c:if></table></div></div>
<div class="card"><h3 style="margin-bottom:10px">Recent attendance history</h3><div class="scroll"><table><tr><th>Date</th><th>Subject</th><th>Status</th></tr>
  <c:forEach items="${history}" var="h"><tr><td>${h.att_date}</td><td><c:out value="${h.course}"/></td><td><span class="badge ${h.status}">${h.status=='P'?'Present':'Absent'}</span></td></tr></c:forEach>
</table></div></div>
<%@ include file="/WEB-INF/views/footer.jspf" %>
