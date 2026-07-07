/* Admin dashboard.
   NOTE ON SECURITY: this demo stores the admin password (hashed with the
   browser's built-in SubtleCrypto SHA-256) in localStorage so the dashboard
   is fully functional with zero backend setup. That is fine for a private
   preview but is NOT production auth. Before launch, swap AdminAuth's
   check()/setPassword() calls for real Firebase Auth or Supabase Auth
   (email link, magic link, or hosted login) — the rest of this file only
   calls AdminAuth.isLoggedIn() / login() / logout(), so the swap is isolated.

   LIVE SYNC: pricing and date edits go through GNStore.save(), which is the
   same store the public site reads from — so changes appear on any open
   tab immediately (BroadcastChannel today, ready to be swapped for a
   Firebase/Supabase realtime subscription per the note in data.js). */

const AdminAuth = (() => {
  const PW_KEY = 'gn_admin_pw_hash_v1';
  const SESSION_KEY = 'gn_admin_session_v1';
  const SECURITY_KEY = 'gn_admin_security_v1';
  const DEFAULT_PASSWORD = 'glamorous2026';
  const DEFAULT_QUESTION = 'What street is the studio on?';
  const DEFAULT_ANSWER = 'haatso';

  async function sha256(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  async function ensureSeeded() {
    if (!localStorage.getItem(PW_KEY)) {
      localStorage.setItem(PW_KEY, await sha256(DEFAULT_PASSWORD));
    }
    if (!localStorage.getItem(SECURITY_KEY)) {
      localStorage.setItem(SECURITY_KEY, JSON.stringify({ question: DEFAULT_QUESTION, answerHash: await sha256(DEFAULT_ANSWER.toLowerCase().trim()) }));
    }
  }

  async function login(password) {
    await ensureSeeded();
    const hash = await sha256(password);
    if (hash === localStorage.getItem(PW_KEY)) {
      sessionStorage.setItem(SESSION_KEY, '1');
      return true;
    }
    return false;
  }

  function isLoggedIn() { return sessionStorage.getItem(SESSION_KEY) === '1'; }
  function logout() { sessionStorage.removeItem(SESSION_KEY); }

  function getSecurityQuestion() {
    const raw = localStorage.getItem(SECURITY_KEY);
    try { return JSON.parse(raw).question; } catch (e) { return DEFAULT_QUESTION; }
  }

  async function verifySecurityAnswer(answer) {
    const raw = localStorage.getItem(SECURITY_KEY);
    let q;
    try { q = JSON.parse(raw); } catch (e) { return false; }
    return (await sha256(answer.toLowerCase().trim())) === q.answerHash;
  }

  async function setPassword(newPassword) {
    localStorage.setItem(PW_KEY, await sha256(newPassword));
  }

  ensureSeeded();
  return { login, isLoggedIn, logout, getSecurityQuestion, verifySecurityAnswer, setPassword, DEFAULT_PASSWORD, DEFAULT_QUESTION };
})();

document.addEventListener('DOMContentLoaded', () => {
  const loginView = document.getElementById('adminLoginView');
  const resetView = document.getElementById('adminResetView');
  const dashView = document.getElementById('adminDashboard');

  function showView(view) {
    [loginView, resetView, dashView].forEach((v) => v && v.classList.remove('is-visible'));
    view && view.classList.add('is-visible');
  }

  function refreshAuthView() {
    if (AdminAuth.isLoggedIn()) { showView(dashView); renderDashboard(); }
    else showView(loginView);
  }

  /* ---------- Login ---------- */
  const loginForm = document.getElementById('adminLoginForm');
  const loginError = document.getElementById('adminLoginError');
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pw = document.getElementById('admin-password').value;
    const ok = await AdminAuth.login(pw);
    if (ok) { loginError.textContent = ''; refreshAuthView(); }
    else loginError.textContent = 'Incorrect password. Try again or reset it below.';
  });
  document.getElementById('showResetLink').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('resetQuestion').textContent = AdminAuth.getSecurityQuestion();
    showView(resetView);
  });
  document.getElementById('backToLogin').addEventListener('click', (e) => { e.preventDefault(); showView(loginView); });

  /* ---------- Password reset ---------- */
  const resetForm = document.getElementById('adminResetForm');
  const resetError = document.getElementById('adminResetError');
  resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const answer = document.getElementById('reset-answer').value;
    const newPw = document.getElementById('reset-newpw').value;
    const confirmPw = document.getElementById('reset-confirmpw').value;
    if (newPw.length < 6) { resetError.textContent = 'New password must be at least 6 characters.'; return; }
    if (newPw !== confirmPw) { resetError.textContent = 'Passwords do not match.'; return; }
    const correct = await AdminAuth.verifySecurityAnswer(answer);
    if (!correct) { resetError.textContent = 'That answer doesn\u2019t match our records.'; return; }
    await AdminAuth.setPassword(newPw);
    resetError.textContent = '';
    resetForm.reset();
    alert('Password updated. Please log in with your new password.');
    showView(loginView);
  });

  /* ---------- Logout ---------- */
  document.getElementById('adminLogout')?.addEventListener('click', () => { AdminAuth.logout(); refreshAuthView(); });

  /* ---------- Dashboard ---------- */
  function renderDashboard() {
    const data = GNStore.load();

    const pricingBody = document.getElementById('pricingTableBody');
    pricingBody.innerHTML = data.categories.map((cat) => cat.items.map((item) => `
      <tr data-cat="${cat.id}" data-item="${item.id}">
        <td>${cat.name}</td>
        <td><input type="text" class="edit-name" value="${item.name}"></td>
        <td><input type="number" class="edit-price" value="${item.price}" min="0"></td>
        <td><input type="text" class="edit-note" value="${item.note || ''}" placeholder="e.g. and above"></td>
      </tr>`).join('')).join('');

    document.getElementById('savePricing').onclick = () => {
      const rows = pricingBody.querySelectorAll('tr');
      rows.forEach((row) => {
        const catId = row.getAttribute('data-cat');
        const itemId = row.getAttribute('data-item');
        const cat = data.categories.find((c) => c.id === catId);
        const item = cat && cat.items.find((i) => i.id === itemId);
        if (!item) return;
        item.name = row.querySelector('.edit-name').value.trim() || item.name;
        item.price = Number(row.querySelector('.edit-price').value) || 0;
        const note = row.querySelector('.edit-note').value.trim();
        if (note) item.note = note; else delete item.note;
      });
      GNStore.save(data);
      flashSaved('pricingSavedNote');
    };

    renderClosedDates(data);

    document.getElementById('resetDefaultsBtn').onclick = () => {
      if (confirm('Reset all pricing and closed dates to the original defaults? This cannot be undone.')) {
        GNStore.resetToDefault();
        renderDashboard();
      }
    };

    renderBookingLog();
  }

  function renderClosedDates(data) {
    const wrap = document.getElementById('closedDatesList');
    wrap.innerHTML = data.closed_dates.length
      ? data.closed_dates.map((d) => `<span class="closed-date-tag">${d} <button data-date="${d}" aria-label="Reopen date">&times;</button></span>`).join('')
      : `<span class="form-note">No closed dates — every day is bookable.</span>`;
    wrap.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const fresh = GNStore.load();
        fresh.closed_dates = fresh.closed_dates.filter((d) => d !== btn.getAttribute('data-date'));
        GNStore.save(fresh);
        renderClosedDates(fresh);
      });
    });
  }

  document.getElementById('addClosedDate').addEventListener('click', () => {
    const input = document.getElementById('newClosedDate');
    if (!input.value) return;
    const fresh = GNStore.load();
    if (!fresh.closed_dates.includes(input.value)) fresh.closed_dates.push(input.value);
    fresh.closed_dates.sort();
    GNStore.save(fresh);
    renderClosedDates(fresh);
    input.value = '';
  });

  function renderBookingLog() {
    const wrap = document.getElementById('bookingLog');
    const list = GNStore.loadBookings();
    wrap.innerHTML = list.length
      ? list.slice(0, 20).map((b) => `
          <div class="booking-log-item">
            <strong>${b.name} \u2014 ${b.date || 'no date'} ${b.time || ''}</strong>
            ${b.services.join(', ')}${b.phone ? ` &middot; ${b.phone}` : ''}
          </div>`).join('')
      : `<p class="form-note">No booking requests logged on this device yet.</p>`;
  }

  function flashSaved(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = 'Saved — changes are live on the site now.';
    el.style.opacity = 1;
    setTimeout(() => { el.style.opacity = 0.6; }, 2200);
  }

  GNStore.onChange(() => { if (AdminAuth.isLoggedIn()) renderDashboard(); });

  refreshAuthView();
});
