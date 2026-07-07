/* Shared behavior across every page. Depends on data.js being loaded first. */

document.addEventListener('DOMContentLoaded', () => {
  const salon = GNStore.load();

  /* ---------- Nav toggle ---------- */
  const toggle = document.querySelector('.nav-toggle');
  const menu = document.querySelector('.mobile-menu');
  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      const open = toggle.classList.toggle('is-open');
      menu.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    });
    menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => {
      toggle.classList.remove('is-open');
      menu.classList.remove('is-open');
      document.body.style.overflow = '';
    }));
  }

  /* ---------- Active nav link ---------- */
  const page = document.body.getAttribute('data-page');
  if (page) {
    document.querySelectorAll(`[data-nav="${page}"]`).forEach((el) => el.classList.add('active'));
  }

  /* ---------- Data binding: text + href + attrs from salon object ---------- */
  function pathValue(obj, path) {
    return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
  }
  document.querySelectorAll('[data-gn]').forEach((el) => {
    const val = pathValue(salon, el.getAttribute('data-gn'));
    if (val != null) el.textContent = val;
  });
  document.querySelectorAll('[data-gn-href]').forEach((el) => {
    const val = pathValue(salon, el.getAttribute('data-gn-href'));
    if (val != null) el.setAttribute('href', val);
  });

  /* WhatsApp / phone quick links */
  document.querySelectorAll('[data-gn-wa-link]').forEach((el) => {
    el.setAttribute('href', `https://wa.me/${salon.contact.whatsapp_dispatch}`);
  });
  document.querySelectorAll('[data-gn-tel-link]').forEach((el) => {
    el.setAttribute('href', `tel:${salon.contact.backup_phone}`);
  });

  /* Business hours list */
  document.querySelectorAll('[data-gn-hours]').forEach((el) => {
    el.innerHTML = salon.contact.hours.map((h) =>
      `<li><span>${h.day}</span><span>${h.time}</span></li>`
    ).join('');
  });

  /* ---------- Signature swatch strip ---------- */
  document.querySelectorAll('[data-gn-swatches]').forEach((el) => {
    el.innerHTML = salon.swatches.map((c) => `<span class="swatch" style="background:${c}"></span>`).join('');
  });

  /* ---------- Reveal on scroll ---------- */
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  }

  /* ---------- Hero carousel ---------- */
  const carousel = document.querySelector('.hero-carousel');
  if (carousel) {
    const slides = [...carousel.querySelectorAll('.hero-slide')];
    const dotsWrap = carousel.querySelector('.hero-dots');
    let index = 0;
    let timer = null;

    if (dotsWrap) {
      dotsWrap.innerHTML = slides.map((_, i) =>
        `<button aria-label="Go to slide ${i + 1}" class="${i === 0 ? 'is-active' : ''}"></button>`
      ).join('');
    }
    const dots = dotsWrap ? [...dotsWrap.querySelectorAll('button')] : [];

    function show(i) {
      slides.forEach((s, si) => s.classList.toggle('is-active', si === i));
      dots.forEach((d, di) => d.classList.toggle('is-active', di === i));
      index = i;
    }
    function next() { show((index + 1) % slides.length); }
    function startAuto() {
      stopAuto();
      timer = setInterval(next, 5200);
    }
    function stopAuto() { if (timer) clearInterval(timer); }

    dots.forEach((d, i) => d.addEventListener('click', () => { show(i); startAuto(); }));
    carousel.addEventListener('mouseenter', stopAuto);
    carousel.addEventListener('mouseleave', startAuto);

    /* touch swipe */
    let startX = 0;
    carousel.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
    carousel.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) { dx < 0 ? next() : show((index - 1 + slides.length) % slides.length); startAuto(); }
    }, { passive: true });

    if (slides.length > 1) startAuto();
  }

  /* ---------- Gallery lightbox ---------- */
  const lightbox = document.querySelector('.lightbox');
  if (lightbox) {
    const lbImg = lightbox.querySelector('.ph');
    document.querySelectorAll('.gallery-item').forEach((item) => {
      item.addEventListener('click', () => {
        const label = item.querySelector('.ph')?.getAttribute('data-label') || 'Gallery image';
        if (lbImg) lbImg.setAttribute('data-label', label);
        lightbox.classList.add('is-open');
      });
    });
    lightbox.querySelector('.lightbox-close')?.addEventListener('click', () => lightbox.classList.remove('is-open'));
    lightbox.addEventListener('click', (e) => { if (e.target === lightbox) lightbox.classList.remove('is-open'); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') lightbox.classList.remove('is-open'); });
  }

  /* ---------- Footer year ---------- */
  document.querySelectorAll('[data-gn-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  /* ---------- Cart Badge ---------- */
  function updateCartBadge(cart) {
    document.querySelectorAll('#navCartBadge').forEach(badge => {
      badge.textContent = cart.length;
      badge.classList.toggle('has-items', cart.length > 0);
    });
  }
  updateCartBadge(GNStore.getCart());
  GNStore.onCartChange(updateCartBadge);

  /* ---------- Global Search Overlay ---------- */
  const searchHtml = `
    <div class="search-overlay" id="searchOverlay" aria-hidden="true">
      <div class="search-panel" role="search">
        <div class="search-header">
          <input type="text" class="search-input" id="searchInput" placeholder="Search services..." autocomplete="off">
          <button class="search-close" id="searchCloseBtn" aria-label="Close search">
            <svg viewBox="0 0 24 24" width="24" height="24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>
          </button>
        </div>
        <div class="search-results" id="searchResults"></div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', searchHtml);

  const searchOverlay = document.getElementById('searchOverlay');
  const searchInput = document.getElementById('searchInput');
  const searchResults = document.getElementById('searchResults');
  
  document.querySelectorAll('#navSearchBtn').forEach(btn => {
    btn.addEventListener('click', () => {
      searchOverlay.classList.add('is-active');
      searchOverlay.setAttribute('aria-hidden', 'false');
      searchInput.value = '';
      searchResults.innerHTML = '';
      setTimeout(() => searchInput.focus(), 100);
    });
  });

  function closeSearch() {
    searchOverlay.classList.remove('is-active');
    searchOverlay.setAttribute('aria-hidden', 'true');
  }

  document.getElementById('searchCloseBtn').addEventListener('click', closeSearch);
  searchOverlay.addEventListener('click', (e) => {
    if (e.target === searchOverlay) closeSearch();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSearch();
  });

  searchInput.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    if (!q) { searchResults.innerHTML = ''; return; }
    
    let html = '';
    salon.categories.forEach(cat => {
      cat.items.forEach(item => {
        if (item.name.toLowerCase().includes(q)) {
          const inCart = GNStore.getCart().includes(item.id);
          html += `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid var(--line);">
              <div>
                <div style="font-weight:600; font-size:0.95rem;">${item.name}</div>
                <div style="color:var(--ink-soft); font-size:0.85rem;">${salon.currency}${item.price}</div>
              </div>
              <button class="btn btn-secondary btn-sm search-cart-toggle" data-id="${item.id}">
                ${inCart ? 'Remove' : 'Add to booking'}
              </button>
            </div>
          `;
        }
      });
    });
    
    searchResults.innerHTML = html || '<div style="color:var(--ink-soft); padding:20px 0; text-align:center;">No services found</div>';
    
    searchResults.querySelectorAll('.search-cart-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        GNStore.toggleCartItem(btn.getAttribute('data-id'));
        btn.textContent = GNStore.getCart().includes(btn.getAttribute('data-id')) ? 'Remove' : 'Add to booking';
      });
    });
  });
});
