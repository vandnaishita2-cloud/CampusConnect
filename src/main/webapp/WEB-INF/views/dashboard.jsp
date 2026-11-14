<%@ include file="/WEB-INF/views/header.jspf" %>
<div class="grid">
  <div class="card stat"><b>${nStudents}</b><span>🎓 Registered students</span></div>
  <div class="card stat"><b>${nFaculty}</b><span>👨‍🏫 Faculty members</span></div>
  <div class="card stat"><b>${avgAtt}%</b><span>🗓️ Average attendance</span></div>
  <div class="card stat"><b>${nCourses}</b><span>📚 Total courses</span></div>
</div>
<div class="charts">
  <div class="card"><h3>Attendance trend (%)</h3><canvas id="c1"></canvas></div>
  <div class="card"><h3>Students by department</h3><canvas id="c2"></canvas></div>
  <div class="card"><h3>Average marks by course</h3><canvas id="c3"></canvas></div>
</div>
<div class="card"><h3 style="margin-bottom:10px">Recent registrations</h3><div class="scroll"><table>
  <tr><th>Name</th><th>Reg. No</th><th>Department</th><th>Admitted</th></tr>
  <c:forEach items="${recent}" var="s"><tr><td><c:out value="${s.name}"/></td><td><c:out value="${s.reg_no}"/></td><td>${s.department}</td><td>${s.admission_date}</td></tr></c:forEach>
  <c:if test="${empty recent}"><tr><td colspan="4" class="muted">No students yet – add some from the Students page.</td></tr></c:if>
</table></div></div>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1"></script>
<script>
const mk=(id,type,d,label)=>new Chart(document.getElementById(id),{type,data:{labels:d.labels,datasets:[{label,data:d.data,
  backgroundColor:['#6366f1','#8b5cf6','#38bdf8','#22c55e','#f59e0b','#ef4444'],borderColor:'#6366f1',tension:.35}]},
  options:{plugins:{legend:{display:type=='doughnut'}}}});
mk('c1','line',${attJson},'Attendance %'); mk('c2','doughnut',${deptJson},'Students'); mk('c3','bar',${markJson},'Avg marks');
</script>
<%@ include file="/WEB-INF/views/footer.jspf" %>
