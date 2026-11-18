import "./data.js";

/* Single-canvas booking flow: service select -> date/time -> details -> review.
   No page reloads between steps. Ends by compiling the order into a
   formatted WhatsApp message and opening wa.me with it pre-filled.
   Payment is explicitly in-person only: this flow never collects card data. */

document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('bookingApp');
  if (!root) return;

  let salon = GNStore.load();
  const state = {
    step: 1,
    selected: {},     // itemId -> { item, categoryName }
    date: null,       // 'YYYY-MM-DD'
    time: null,
    calendarMonthOffset: 0,
    name: '',
    phone: '',
    notes: ''
  };

  const TIME_SLOTS = ['9:00 AM', '10:30 AM', '12:00 PM', '1:30 PM', '3:00 PM', '4:30 PM', '6:00 PM'];

  /* Preselect a service if arriving from services.html?service=ID, and sync with cart */
  const params = new URLSearchParams(window.location.search);
  let preselects = GNStore.getCart();
  if (params.get('service') && !preselects.includes(params.get('service'))) {
    preselects.push(params.get('service'));
    GNStore.toggleCartItem(params.get('service'));
  }

  const els = {
    steps: root.querySelectorAll('.booking-step'),
    progress: document.getElementById('bookingProgress'),
    serviceList: document.getElementById('serviceSelectList'),
    chips: document.getElementById('bookingCategoryChips'),
    summary: document.getElementById('orderSummary'),
    summaryTotal: document.getElementById('orderTotal'),
    calendar: document.getElementById('bookingCalendar'),
    monthLabel: document.getElementById('calendarMonthLabel'),
    slotList: document.getElementById('timeSlotList'),
    nextBtn1: document.getElementById('toStep2'),
    nextBtn2: document.getElementById('toStep3'),
    backBtn2: document.getElementById('backTo1'),
    backBtn3: document.getElementById('backTo2'),
    backBtn4: document.getElementById('backTo3'),
    toReview: document.getElementById('toStep4'),
    form3: document.getElementById('detailsForm'),
    reviewBody: document.getElementById('reviewBody'),
    confirmBtn: document.getElementById('confirmBooking'),
    stickyBar: document.getElementById('stickyCta'),
    stickyLabel: document.getElementById('stickyLabel'),
    stickyBtn: document.getElementById('stickyBtn'),
  };

  function currency() { return salon.currency; }

  function photoHTML(item) {
    if (item.image) {
      return `<img class="ph" src="${item.image}" alt="${item.name} at Glamorous Nails" loading="lazy">`;
    }
    return `<div class="ph" data-label="${item.name}"></div>`;
  }

  function goToStep(n) {
    state.step = n;
    els.steps.forEach((s) => s.classList.toggle('is-active', Number(s.dataset.step) === n));
    if (els.progress) {
      els.progress.querySelectorAll('.progress-dot').forEach((d) => {
        const dn = Number(d.dataset.step);
        d.classList.toggle('is-done', dn < n);
        d.classList.toggle('is-active', dn === n);
      });
    }
    document.querySelectorAll('.progress-step-label').forEach((lbl) => {
      const dn = Number(lbl.dataset.step);
      lbl.classList.toggle('is-done', dn < n);
      lbl.classList.toggle('is-active', dn === n);
    });
    window.scrollTo({ top: root.offsetTop - 80, behavior: 'smooth' });
    updateStickyBar();
  }

  /* ---------------- Step 1: services ---------------- */
  function renderServiceStep() {
    els.chips.innerHTML = `<button class="chip is-active" data-cat="all">All</button>` +
      salon.categories.map((c) => `<button class="chip" data-cat="${c.id}">${c.icon || ''} ${c.name}</button>`).join('');

    els.serviceList.innerHTML = salon.categories.map((cat) => `
      <div class="booking-cat" data-cat-section="${cat.id}">
        <h3 style="margin:20px 0 10px;">${cat.icon || ''} ${cat.name}</h3>
        <div class="booking-item-grid">
          ${cat.items.map((item) => `
            <label class="booking-item" data-item-id="${item.id}">
              ${photoHTML(item)}
              <div class="booking-item-body">
                <div class="booking-item-row">
                  <span class="booking-item-name">${item.name}</span>
                  <input type="checkbox" data-id="${item.id}" ${preselects.includes(item.id) ? 'checked' : ''}>
                </div>
                <span class="service-meta">${GNStore.formatDuration(item.durationMinutes)}</span>
                <span class="service-price">${GNStore.formatPrice(item, currency())}</span>
              </div>
            </label>`).join('')}
        </div>
      </div>`).join('');

    if (preselects.length > 0) {
      salon.categories.forEach((cat) => cat.items.forEach((item) => {
        if (preselects.includes(item.id)) toggleItem(item, cat.name, true);
      }));
    }

    els.serviceList.querySelectorAll('input[type=checkbox]').forEach((box) => {
      box.addEventListener('change', () => {
        const id = box.getAttribute('data-id');
        const { item, catName } = findItem(id);
        toggleItem(item, catName, box.checked);
        
        const cart = GNStore.getCart();
        if ((box.checked && !cart.includes(id)) || (!box.checked && cart.includes(id))) {
           GNStore.toggleCartItem(id);
        }
      });
    });

    els.chips.querySelectorAll('.chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        els.chips.querySelectorAll('.chip').forEach((c) => c.classList.remove('is-active'));
        chip.classList.add('is-active');
        const cat = chip.getAttribute('data-cat');
        els.serviceList.querySelectorAll('.booking-cat').forEach((sec) => {
          sec.style.display = (cat === 'all' || sec.getAttribute('data-cat-section') === cat) ? '' : 'none';
        });
      });
    });
  }

  function findItem(id) {
    for (const cat of salon.categories) {
      const item = cat.items.find((i) => i.id === id);
      if (item) return { item, catName: cat.name };
    }
    return {};
  }

  function toggleItem(item, catName, on) {
    if (!item) return;
    if (on) state.selected[item.id] = { item, catName };
    else delete state.selected[item.id];
    renderSummary();
  }

  function totalDurationMinutes() {
    return Object.values(state.selected).reduce((sum, s) => sum + (Number(s.item.durationMinutes) || 60), 0);
  }

  function renderSummary() {
    const ids = Object.keys(state.selected);
    if (!ids.length) {
      els.summary.innerHTML = `<p class="form-note">No services selected yet.</p>`;
      els.summaryTotal.textContent = '';
      if (els.nextBtn1) els.nextBtn1.disabled = true;
      updateStickyBar();
      return;
    }
    if (els.nextBtn1) els.nextBtn1.disabled = false;
    let total = 0;
    let hasEstimate = false;
    els.summary.innerHTML = ids.map((id) => {
      const { item } = state.selected[id];
      total += item.price;
      if (item.note) hasEstimate = true;
      return `<div class="summary-row">
        <div class="summary-item-left">
          <span>${item.name}</span>
          <small style="color:var(--ink-soft);">${GNStore.formatDuration(item.durationMinutes)}</small>
        </div>
        <div class="summary-item-right">
          <span>${GNStore.formatPrice(item, currency())}</span>
          <button type="button" class="summary-remove-btn" data-remove-id="${id}" aria-label="Remove ${item.name}">&times;</button>
        </div>
      </div>`;
    }).join('');
    els.summary.querySelectorAll('.summary-remove-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-remove-id');
        const box = els.serviceList.querySelector(`input[type=checkbox][data-id="${id}"]`);
        if (box) box.checked = false;
        const { item, catName } = findItem(id);
        toggleItem(item, catName, false);
        if (GNStore.getCart().includes(id)) GNStore.toggleCartItem(id);
      });
    });
    els.summaryTotal.textContent = `Estimated total: ${currency()}${total}${hasEstimate ? '+' : ''} · ${GNStore.formatDuration(totalDurationMinutes())}`;
    updateStickyBar();
  }

  /* ---------------- Step 2: date & time ---------------- */
  function renderCalendar() {
    const now = new Date();
    const viewDate = new Date(now.getFullYear(), now.getMonth() + state.calendarMonthOffset, 1);
    const monthName = viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    els.monthLabel.textContent = monthName;

    const firstWeekday = viewDate.getDay();
    const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
    const todayStr = toISO(now);

    let cells = '';
    ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach((d) => { cells += `<div class="cal-dow">${d}</div>`; });
    for (let i = 0; i < firstWeekday; i++) cells += `<div class="cal-cell cal-empty"></div>`;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(viewDate.getFullYear(), viewDate.getMonth(), d);
      const iso = toISO(dateObj);
      const isPast = iso < todayStr;
      const isSunday = dateObj.getDay() === 0;
      const isClosed = salon.closed_dates.includes(iso);
      const disabled = isPast || isClosed || isSunday;
      cells += `<button class="cal-cell${disabled ? ' cal-disabled' : ''}${state.date === iso ? ' cal-selected' : ''}" data-iso="${iso}" ${disabled ? 'disabled' : ''}>${d}</button>`;
    }
    els.calendar.innerHTML = cells;
    els.calendar.querySelectorAll('.cal-cell:not(.cal-empty):not(.cal-disabled)').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.date = btn.getAttribute('data-iso');
        renderCalendar();
        renderSlots();
        updateStep2NextState();
      });
    });
  }

  function toISO(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function parseSlotMinutes(label) {
    const m = label.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
    if (!m) return 0;
    let h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    const ampm = m[3].toUpperCase();
    if (ampm === 'PM' && h !== 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return h * 60 + min;
  }

  function getDayWindowMinutes(iso) {
    const d = new Date(iso + 'T00:00:00');
    const day = d.getDay(); // 0 = Sun, 6 = Sat
    if (day === 0) return { open: 0, close: 0 };
    if (day === 6) return { open: 9 * 60, close: 20 * 60 };
    return { open: 9 * 60, close: 19 * 60 };
  }

  function renderSlots() {
    if (!state.date) { els.slotList.innerHTML = `<p class="form-note">Pick a date to see available times.</p>`; return; }
    const dur = totalDurationMinutes();
    const { open, close } = getDayWindowMinutes(state.date);
    const available = TIME_SLOTS.filter((t) => {
      const start = parseSlotMinutes(t);
      return start >= open && (start + dur) <= close;
    });
    if (!available.length) {
      els.slotList.innerHTML = `<p class="form-note">No time slots fit your ${GNStore.formatDuration(dur)} selection before closing on this day. Please pick another day.</p>`;
      state.time = null;
      updateStep2NextState();
      return;
    }
    if (state.time && !available.includes(state.time)) {
      state.time = null;
      updateStep2NextState();
    }
    els.slotList.innerHTML = available.map((t) =>
      `<button type="button" class="chip slot-chip${state.time === t ? ' is-active' : ''}" data-time="${t}">${t}</button>`
    ).join('');
    els.slotList.querySelectorAll('.slot-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.time = btn.getAttribute('data-time');
        els.slotList.querySelectorAll('.slot-chip').forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        updateStickyBar();
        updateStep2NextState();
      });
    });
  }

  /* ---------------- Step 4: review + WhatsApp dispatch ---------------- */
  function renderReview() {
    const ids = Object.keys(state.selected);
    const lines = ids.map((id) => `• ${state.selected[id].item.name}: ${GNStore.formatPrice(state.selected[id].item, currency())}`);
    let total = 0;
    ids.forEach((id) => total += state.selected[id].item.price);

    els.reviewBody.innerHTML = `
      <div class="review-block">
        <strong style="display:block; font-size:0.8rem; text-transform:uppercase; letter-spacing:0.08em; color:var(--oxblood); margin-bottom:4px;">Services</strong>
        <p>${lines.join('<br>')}</p>
      </div>
      <div class="review-block">
        <strong style="display:block; font-size:0.8rem; text-transform:uppercase; letter-spacing:0.08em; color:var(--oxblood); margin-bottom:4px;">Date &amp; time</strong>
        <p>${formatDate(state.date)} at ${state.time}</p>
      </div>
      <div class="review-block">
        <strong style="display:block; font-size:0.8rem; text-transform:uppercase; letter-spacing:0.08em; color:var(--oxblood); margin-bottom:4px;">Your details</strong>
        <p>${state.name}<br>${state.phone}${state.notes ? `<br><span class="form-note">Note: ${state.notes}</span>` : ''}</p>
      </div>
      <div class="review-block">
        <strong style="display:block; font-size:0.8rem; text-transform:uppercase; letter-spacing:0.08em; color:var(--oxblood); margin-bottom:4px;">Estimated total</strong>
        <p class="service-price">${currency()}${total}</p>
      </div>
      <div class="info-card" style="margin-top:12px; background:var(--blush);">Payment is strictly in person at the studio (cash or mobile money). Nothing is charged online.</div>
    `;
  }

  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  function buildWhatsAppMessage() {
    const ids = Object.keys(state.selected);
    let total = 0;
    const lines = ids.map((id) => {
      const item = state.selected[id].item;
      total += item.price;
      return `- ${item.name} (${currency()}${item.price}${item.note ? '+' : ''})`;
    });
    return [
      `New booking request | ${salon.salon_name}`,
      ``,
      `Name: ${state.name}`,
      `Phone: ${state.phone}`,
      `Date: ${formatDate(state.date)}`,
      `Time: ${state.time}`,
      ``,
      `Services:`,
      ...lines,
      ``,
      `Estimated total: ${currency()}${total}`,
      state.notes ? `Note: ${state.notes}` : '',
      ``,
      `Payment will be made in person at the studio.`
    ].filter(Boolean).join('\n');
  }

  function confirmBooking() {
    const message = buildWhatsAppMessage();
    const waUrl = `https://wa.me/${salon.contact.whatsapp_dispatch}?text=${encodeURIComponent(message)}`;
    GNStore.addBooking({
      id: 'b_' + Date.now(),
      created_at: new Date().toISOString(),
      name: state.name,
      phone: state.phone,
      date: state.date,
      time: state.time,
      services: Object.values(state.selected).map((s) => s.item.name),
      notes: state.notes
    });
    GNStore.clearCart();
    window.open(waUrl, '_blank');
    goToStep(5);
  }

  function updateStep2NextState() {
    if (els.nextBtn2) els.nextBtn2.disabled = !(state.date && state.time);
  }

  /* ---------------- Sticky mobile CTA ---------------- */
  function updateStickyBar() {
    if (!els.stickyBar) return;
    if (state.step === 1) {
      const count = Object.keys(state.selected).length;
      els.stickyLabel.textContent = count ? `${count} service${count > 1 ? 's' : ''} selected` : 'Select a service to continue';
      els.stickyBtn.textContent = 'Next: Date & time';
      els.stickyBtn.disabled = count === 0;
      els.stickyBar.style.display = '';
      els.stickyBtn.onclick = () => goToStep(2);
    } else if (state.step === 2) {
      els.stickyLabel.textContent = (state.date && state.time) ? `${formatDate(state.date)} · ${state.time}` : 'Pick a date and time';
      els.stickyBtn.textContent = 'Next: Your details';
      els.stickyBtn.disabled = !(state.date && state.time);
      els.stickyBar.style.display = '';
      els.stickyBtn.onclick = () => goToStep(3);
    } else {
      els.stickyBar.style.display = 'none';
    }
  }

  /* ---------------- Wire up navigation ---------------- */
  els.nextBtn1.addEventListener('click', () => { renderCalendar(); renderSlots(); goToStep(2); });
  els.backBtn2.addEventListener('click', () => goToStep(1));
  els.nextBtn2.addEventListener('click', () => goToStep(3));
  els.backBtn3.addEventListener('click', () => goToStep(2));
  els.backBtn4.addEventListener('click', () => goToStep(3));

  document.getElementById('calPrev').addEventListener('click', () => { state.calendarMonthOffset--; renderCalendar(); });
  document.getElementById('calNext').addEventListener('click', () => { state.calendarMonthOffset++; renderCalendar(); });

  function isValidGhanaPhone(raw) {
    const cleaned = raw.replace(/[\s\-()]/g, '');
    return /^(?:\+?233|0)(?:2[034678]|5[045679])\d{7}$/.test(cleaned);
  }

  els.form3.addEventListener('submit', (e) => {
    e.preventDefault();
    const phoneInput = document.getElementById('bk-phone');
    const phoneErr = document.getElementById('bk-phone-error');
    const rawPhone = phoneInput.value.trim();
    if (!isValidGhanaPhone(rawPhone)) {
      if (phoneErr) {
        phoneErr.textContent = 'Enter a valid Ghana number (e.g. 024 000 0000 or +233 24 000 0000).';
        phoneErr.style.display = 'block';
      }
      phoneInput.focus();
      return;
    }
    if (phoneErr) phoneErr.style.display = 'none';
    state.name = document.getElementById('bk-name').value.trim();
    state.phone = rawPhone;
    state.notes = document.getElementById('bk-notes').value.trim();
    renderReview();
    goToStep(4);
  });

  els.confirmBtn.addEventListener('click', confirmBooking);

  GNStore.onChange((data) => { salon = data; renderServiceStep(); renderSummary(); renderCalendar(); });

  GNStore.onCartChange((cart) => {
    els.serviceList.querySelectorAll('input[type=checkbox]').forEach(box => {
      const id = box.getAttribute('data-id');
      const shouldBeChecked = cart.includes(id);
      if (box.checked !== shouldBeChecked) {
        box.checked = shouldBeChecked;
        const { item, catName } = findItem(id);
        toggleItem(item, catName, shouldBeChecked);
      }
    });
  });

  renderServiceStep();
  renderSummary();
  renderCalendar();
  goToStep(1);
});
