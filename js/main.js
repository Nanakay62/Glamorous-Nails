import "./data.js";

/* Shared behavior across every page. */

document.addEventListener('DOMContentLoaded', () => {
  let salon = GNStore.load();

  /* ---------- Nav toggle ---------- */
  const toggle = document.querySelector('.nav-toggle');
  const menu = document.querySelector('.mobile-menu');
  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      const open = toggle.classList.toggle('is-open');
      if (open) {
        const nav = document.querySelector('.site-nav');
        if (nav) {
          menu.style.top = Math.max(nav.getBoundingClientRect().bottom, 0) + 'px';
        }
      }
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
  function bindSalonData() {
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
  }
  bindSalonData();
  GNStore.onChange((data) => {
    salon = data;
    bindSalonData();
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
    const lbImg = lightbox.querySelector('img, .ph');
    document.querySelectorAll('.gallery-item').forEach((item) => {
      item.addEventListener('click', () => {
        const img = item.querySelector('img');
        const label = img?.alt || item.querySelector('.ph')?.getAttribute('data-label') || 'Gallery image';
        if (lbImg?.tagName === 'IMG' && img) {
          lbImg.src = img.src;
          lbImg.alt = label;
        } else if (lbImg) {
          lbImg.setAttribute('data-label', label);
        }
        lightbox.classList.add('is-open');
      });
    });
    lightbox.querySelector('.lightbox-close')?.addEventListener('click', () => lightbox.classList.remove('is-open'));
    lightbox.addEventListener('click', (e) => { if (e.target === lightbox) lightbox.classList.remove('is-open'); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') lightbox.classList.remove('is-open'); });
  }

  /* ---------- Footer year ---------- */
  document.querySelectorAll('[data-gn-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  /* ---------- Official WhatsApp & Social Logos ---------- */
  const WA_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm5.79 14.11c-.24.68-1.41 1.3-1.95 1.38-.51.08-1.15.11-1.85-.11-.43-.14-.98-.32-1.69-.63-2.97-1.28-4.91-4.27-5.06-4.47-.15-.2-1.21-1.61-1.21-3.07 0-1.46.76-2.18 1.03-2.48.27-.3.59-.38.79-.38h.57c.18 0 .43-.07.67.51.25.6.85 2.08.92 2.23.08.15.13.33.02.53-.1.2-.15.33-.3.5-.15.17-.31.38-.45.51-.15.15-.31.31-.13.61.18.3.8 1.32 1.72 2.14 1.18 1.05 2.18 1.38 2.48 1.53.3.15.48.13.66-.08.18-.2.76-.88.96-1.18.2-.3.4-.25.68-.15.28.1 1.77.83 2.07.98.3.15.5.23.58.35.07.13.07.74-.17 1.42z"/></svg>';
  const IG_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2zm-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6zm9.65 1.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/></svg>';
  const TT_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.6 5.82c-1-.9-1.6-2.17-1.6-3.57h-3.1v13.7a3.1 3.1 0 1 1-2.19-2.96V9.94a6.2 6.2 0 1 0 5.29 6.15V9.7a8.06 8.06 0 0 0 4.6 1.44V8.03a4.85 4.85 0 0 1-2.99-2.2z"/></svg>';

  document.querySelectorAll('.btn-whatsapp').forEach((btn) => {
    if (!btn.querySelector('svg')) btn.insertAdjacentHTML('afterbegin', WA_SVG);
  });
  document.querySelectorAll('.site-footer .footer-links a').forEach((a) => {
    if (a.querySelector('svg')) return;
    const href = (a.getAttribute('href') || '').toLowerCase();
    const label = a.textContent.trim().toLowerCase();
    if (href.includes('instagram') || label.includes('instagram')) {
      a.classList.add('footer-social-link');
      a.insertAdjacentHTML('afterbegin', IG_SVG);
    } else if (href.includes('tiktok') || label.includes('tiktok')) {
      a.classList.add('footer-social-link');
      a.insertAdjacentHTML('afterbegin', TT_SVG);
    } else if (href.includes('wa.me') || label.includes('whatsapp')) {
      a.classList.add('footer-social-link');
      a.insertAdjacentHTML('afterbegin', WA_SVG);
    }
  });

  /* ---------- Home Page: Popular Services & Reviews ---------- */
  const popularGrid = document.getElementById('homePopularServices');
  function renderPopularServices(data) {
    if (!popularGrid || !data) return;
    const allItems = data.categories.flatMap((c) => c.items);
    let featured = allItems.filter((i) => i.featured);
    if (featured.length < 4) {
      const fallbackIds = ['n3', 'n2', 'l1', 'mp1'];
      featured = fallbackIds.map((id) => allItems.find((i) => i.id === id)).filter(Boolean);
    }
    popularGrid.innerHTML = featured.slice(0, 4).map((item) => `
      <article class="service-card">
        <img class="ph" src="${item.image}" alt="${item.name} at Glamorous Nails" width="400" height="300" loading="lazy">
        <div class="service-card-body">
          <h3>${item.name}</h3>
          <div class="service-meta">${GNStore.formatDuration(item.durationMinutes)}</div>
          <div class="service-card-footer">
            <p class="service-price">${GNStore.formatPrice(item, data.currency)}</p>
            <a class="btn btn-primary btn-sm" href="booking.html?service=${encodeURIComponent(item.id)}">Book</a>
          </div>
        </div>
      </article>
    `).join('');
  }
  renderPopularServices(salon);
  GNStore.onChange((data) => {
    salon = data;
    renderPopularServices(data);
  });

  const reviewsGrid = document.getElementById('homeReviewsGrid');
  function renderStars(count) {
    const n = Math.max(1, Math.min(5, Number(count) || 5));
    const filled = `<svg viewBox="0 0 24 24" width="16" height="16" fill="#B81D5E" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
    const empty = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#B81D5E" stroke-width="1.8" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
    return `<div style="display:flex; gap:3px;" aria-label="${n} out of 5 stars">${filled.repeat(n)}${empty.repeat(5 - n)}</div>`;
  }
  let reviewTimer = null;
  function renderReviewsList(reviews) {
    if (!reviewsGrid) return;
    const list = (reviews || []).slice(0, 8);
    if (!list.length) return;
    if (reviewTimer) clearInterval(reviewTimer);

    let idx = 0;
    reviewsGrid.className = 'reviews-carousel';
    reviewsGrid.innerHTML = `
      <div class="reviews-stage">
        ${list.map((r, i) => `
          <article class="review-card review-slide${i === 0 ? ' is-active' : ''}" data-rv-idx="${i}">
            ${renderStars(r.rating)}
            <p class="review-quote">"${r.quote || ''}"</p>
            <div>
              <div class="review-author">${r.author || 'Client'}</div>
              ${r.service ? `<div class="review-service">${r.service}</div>` : ''}
            </div>
          </article>
        `).join('')}
      </div>
      ${list.length > 1 ? `
        <div class="reviews-controls">
          <button type="button" class="review-nav-btn" id="reviewPrev" aria-label="Previous review">&lsaquo;</button>
          <div class="reviews-dots">
            ${list.map((_, i) => `<button type="button" class="review-dot${i === 0 ? ' is-active' : ''}" data-rv-dot="${i}" aria-label="Show review ${i + 1}"></button>`).join('')}
          </div>
          <button type="button" class="review-nav-btn" id="reviewNext" aria-label="Next review">&rsaquo;</button>
        </div>
      ` : ''}
    `;

    const slides = reviewsGrid.querySelectorAll('.review-slide');
    const dots = reviewsGrid.querySelectorAll('.review-dot');
    function showSlide(next) {
      idx = (next + list.length) % list.length;
      slides.forEach((s, i) => s.classList.toggle('is-active', i === idx));
      dots.forEach((d, i) => d.classList.toggle('is-active', i === idx));
    }
    function startAuto() {
      if (list.length <= 1) return;
      clearInterval(reviewTimer);
      reviewTimer = setInterval(() => showSlide(idx + 1), 5500);
    }

    reviewsGrid.querySelector('#reviewPrev')?.addEventListener('click', () => { showSlide(idx - 1); startAuto(); });
    reviewsGrid.querySelector('#reviewNext')?.addEventListener('click', () => { showSlide(idx + 1); startAuto(); });
    dots.forEach((dot) => {
      dot.addEventListener('click', () => { showSlide(Number(dot.dataset.rvDot)); startAuto(); });
    });
    reviewsGrid.addEventListener('mouseenter', () => clearInterval(reviewTimer));
    reviewsGrid.addEventListener('mouseleave', startAuto);
    startAuto();
  }
  if (reviewsGrid && GNStore.getReviews) {
    GNStore.getReviews().then(renderReviewsList);
  }

  const toggleReviewBtn = document.getElementById('toggleReviewFormBtn');
  const reviewFormWrap = document.getElementById('reviewFormWrap');
  const clientReviewForm = document.getElementById('clientReviewForm');
  const reviewFormStatus = document.getElementById('reviewFormStatus');
  if (toggleReviewBtn && reviewFormWrap) {
    toggleReviewBtn.addEventListener('click', () => {
      const open = reviewFormWrap.style.display === 'none';
      reviewFormWrap.style.display = open ? 'block' : 'none';
    });
  }
  if (clientReviewForm) {
    clientReviewForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const author = document.getElementById('rv-name').value.trim();
      const service = document.getElementById('rv-service').value.trim();
      const rating = Number(document.getElementById('rv-rating').value) || 5;
      const quote = document.getElementById('rv-quote').value.trim();
      if (!author || !quote) return;
      const entry = { author, service: service || 'Studio Client', rating, quote, created_at: new Date().toISOString() };
      try {
        await GNStore.addReview(entry);
        const latest = await GNStore.getReviews();
        renderReviewsList(latest);
        if (reviewFormStatus) {
          reviewFormStatus.textContent = 'Thank you! Your review has been published.';
          reviewFormStatus.style.color = 'var(--success)';
        }
        clientReviewForm.reset();
      } catch (err) {
        const waUrl = `https://wa.me/${salon.contact.whatsapp_dispatch}?text=${encodeURIComponent(`Client Review from ${author} (${rating}/5 stars, ${entry.service}):\n"${quote}"`)}`;
        if (reviewFormStatus) {
          reviewFormStatus.innerHTML = `Direct saving requires Firestore rules deployment. <a href="${waUrl}" target="_blank" rel="noopener" style="color:var(--oxblood); font-weight:600;">Send review via WhatsApp</a> instead.`;
          reviewFormStatus.style.color = 'var(--ink)';
        }
      }
    });
  }

  /* ---------- Cart Badge & Slide-Out Cart Drawer ---------- */
  const drawerHtml = `
    <div class="cart-drawer-overlay" id="cartDrawerOverlay" aria-hidden="true"></div>
    <aside class="cart-drawer" id="cartDrawer" aria-label="Selected services" aria-hidden="true">
      <div class="cart-drawer-head">
        <h2>Your selected services</h2>
        <button type="button" class="cart-drawer-close" id="cartDrawerClose" aria-label="Close cart">&times;</button>
      </div>
      <div class="cart-drawer-body" id="cartDrawerBody"></div>
      <div class="cart-drawer-foot" id="cartDrawerFoot">
        <div class="cart-drawer-total">
          <span>Estimated total</span>
          <span id="cartDrawerTotal">GH&#8373;0</span>
        </div>
        <div id="cartDrawerDuration" class="form-note"></div>
        <a class="btn btn-primary btn-block" href="booking.html">Proceed to booking</a>
      </div>
    </aside>
  `;
  document.body.insertAdjacentHTML('beforeend', drawerHtml);

  const cartOverlay = document.getElementById('cartDrawerOverlay');
  const cartDrawer = document.getElementById('cartDrawer');
  const cartBody = document.getElementById('cartDrawerBody');
  const cartFoot = document.getElementById('cartDrawerFoot');
  const cartTotalEl = document.getElementById('cartDrawerTotal');
  const cartDurEl = document.getElementById('cartDrawerDuration');

  function openCartDrawer() {
    renderCartDrawer(GNStore.getCart());
    cartOverlay.classList.add('is-open');
    cartDrawer.classList.add('is-open');
    cartOverlay.setAttribute('aria-hidden', 'false');
    cartDrawer.setAttribute('aria-hidden', 'false');
  }

  function closeCartDrawer() {
    cartOverlay.classList.remove('is-open');
    cartDrawer.classList.remove('is-open');
    cartOverlay.setAttribute('aria-hidden', 'true');
    cartDrawer.setAttribute('aria-hidden', 'true');
  }

  document.getElementById('cartDrawerClose')?.addEventListener('click', closeCartDrawer);
  cartOverlay?.addEventListener('click', closeCartDrawer);

  document.querySelectorAll('.nav-cart-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openCartDrawer();
    });
  });

  function renderCartDrawer(cart) {
    if (!cartBody) return;
    const allItems = salon.categories.flatMap((c) => c.items);
    const items = cart.map((id) => allItems.find((i) => i.id === id)).filter(Boolean);
    if (!items.length) {
      cartBody.innerHTML = `<p class="form-note" style="text-align:center; padding:32px 0;">No services selected yet. Browse the menu to add services to your booking.</p>`;
      if (cartFoot) cartFoot.style.display = 'none';
      return;
    }
    if (cartFoot) cartFoot.style.display = '';
    let total = 0;
    let totalMins = 0;
    let hasEstimate = false;
    cartBody.innerHTML = items.map((item) => {
      total += Number(item.price) || 0;
      totalMins += Number(item.durationMinutes) || 60;
      if (item.note) hasEstimate = true;
      return `
        <div class="cart-drawer-item">
          <img src="${item.image || './assets/images/long_acrylic.jpeg'}" alt="${item.name}">
          <div>
            <div class="cart-drawer-item-title">${item.name}</div>
            <div class="cart-drawer-item-meta">${GNStore.formatDuration(item.durationMinutes)} · ${GNStore.formatPrice(item, salon.currency)}</div>
          </div>
          <button type="button" class="summary-remove-btn cart-drawer-remove" data-id="${item.id}" aria-label="Remove ${item.name}">&times;</button>
        </div>
      `;
    }).join('');
    if (cartTotalEl) cartTotalEl.textContent = `${salon.currency}${total}${hasEstimate ? '+' : ''}`;
    if (cartDurEl) cartDurEl.textContent = `Total estimated time: ${GNStore.formatDuration(totalMins)}`;

    cartBody.querySelectorAll('.cart-drawer-remove').forEach((btn) => {
      btn.addEventListener('click', () => {
        GNStore.toggleCartItem(btn.getAttribute('data-id'));
      });
    });
  }

  function updateCartBadge(cart) {
    document.querySelectorAll('#navCartBadge').forEach(badge => {
      badge.textContent = cart.length;
      badge.classList.toggle('has-items', cart.length > 0);
    });
    renderCartDrawer(cart);
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
