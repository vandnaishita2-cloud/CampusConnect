// CampusConnect – small reusable helpers shared by all pages
const $ = (s, r = document) => r.querySelector(s);

// Toast notification (message comes from the server via data attributes)
const t = $('#toast');
if (t && (t.dataset.msg || t.dataset.err)) {
  const err = t.dataset.err;
  t.textContent = err || t.dataset.msg;
  t.style.background = err ? '#dc2626' : '#16a34a';
  t.style.display = 'block';
  setTimeout(() => t.style.display = 'none', 3500);
}

// Live search: <input data-filter="x"> hides every [data-f="x"] element that doesn't match
document.querySelectorAll('[data-filter]').forEach(i => i.addEventListener('input', () => {
  const q = i.value.toLowerCase();
  document.querySelectorAll('[data-f="' + i.dataset.filter + '"]').forEach(r =>
    r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none');
}));

// Confirmation before delete
document.querySelectorAll('form.del').forEach(f => f.addEventListener('submit', e => {
  if (!confirm('Delete this record permanently?')) e.preventDefault();
}));

// Open an empty "add" dialog
function openAdd(id) {
  const d = $('#' + id);
  d.querySelector('form').reset();
  d.querySelector('[name=id]').value = '';
  d.showModal();
}

// Fill a form (inside a dialog, or the form itself) from the data-* attributes of the clicked row
function edit(btn, id) {
  const el = $('#' + id), f = el.tagName == 'FORM' ? el : $('form', el), d = btn.closest('[data-id]').dataset;
  for (const k in d) if (f.elements[k]) f.elements[k].value = d[k];
  if (el.showModal) el.showModal(); else f.scrollIntoView({ behavior: 'smooth' });
}

// Table / card toggle on the students page
function view(mode) { $('#tbl').hidden = mode != 't'; $('#cards').hidden = mode != 'c'; }

// Mobile sidebar
$('#menu') && $('#menu').addEventListener('click', () => $('aside').classList.toggle('open'));
