/* Renders the services menu (cards + prices + durations) from GNStore data.
   Preserves active category filter on cart toggle, removes emoji from chips,
   adds category headings, and shows piercing safety/aftercare notes. */

document.addEventListener('DOMContentLoaded', () => {
  const chipRow = document.getElementById('categoryChips');
  const sections = document.getElementById('serviceSections');
  if (!chipRow || !sections) return;

  let activeCat = 'all';

  function cardHTML(item, currency) {
    const priceText = GNStore.formatPrice(item, currency);
    const durText = GNStore.formatDuration(item.durationMinutes);
    const media = item.image
      ? `<img class="ph" src="${item.image}" alt="${item.name} — Glamorous Nails" width="400" height="300" loading="lazy">`
      : `<div class="ph" data-label="${item.name}"></div>`;
    const inCart = GNStore.getCart().includes(item.id);
    return `
      <article class="service-card">
        ${media}
        <div class="service-card-body">
          <h3>${item.name}</h3>
          <div class="service-meta">${durText}</div>
          <div class="service-card-footer">
            <p class="service-price">${priceText}</p>
            <button type="button" class="btn btn-secondary btn-sm service-cart-toggle" data-id="${item.id}">
              ${inCart ? 'Remove' : 'Add to booking'}
            </button>
          </div>
        </div>
      </article>`;
  }

  function applyFilter() {
    chipRow.querySelectorAll('.chip').forEach((c) => {
      c.classList.toggle('is-active', c.getAttribute('data-cat') === activeCat);
    });
    sections.querySelectorAll('.service-category').forEach((sec) => {
      const show = activeCat === 'all' || sec.getAttribute('data-cat-section') === activeCat;
      sec.style.display = show ? '' : 'none';
    });
    sections.querySelectorAll('.hairline').forEach((hr) => {
      hr.style.display = activeCat === 'all' ? '' : 'none';
    });
  }

  function render(data) {
    chipRow.innerHTML = `<button type="button" class="chip ${activeCat === 'all' ? 'is-active' : ''}" data-cat="all">All services</button>` +
      data.categories.map((c) => `<button type="button" class="chip ${activeCat === c.id ? 'is-active' : ''}" data-cat="${c.id}">${c.name}</button>`).join('');

    sections.innerHTML = data.categories.map((cat) => {
      const piercingNote = cat.id === 'piercing_services'
        ? `<div style="background:var(--blush); border:1px solid var(--line); border-radius:var(--radius-sm); padding:14px 16px; margin-bottom:20px; font-size:0.9rem; color:var(--ink);">
             <strong>Piercing safety &amp; aftercare:</strong> Clients must be 18+ (or accompanied by a parent/guardian with ID). All needles and jewellery are single-use/sterilised. Saline aftercare instructions are provided after every piercing.
           </div>`
        : '';
      return `
      <div class="service-category" data-cat-section="${cat.id}">
        <div class="section-head" style="margin-bottom:16px; text-align:left; align-items:flex-start;">
          <h2 style="margin:0;">${cat.name}</h2>
        </div>
        ${piercingNote}
        <div class="service-grid">
          ${cat.items.map((i) => cardHTML(i, data.currency)).join('')}
        </div>
      </div>
    `;
    }).join('<hr class="hairline" style="margin:40px 0;">');

    chipRow.querySelectorAll('.chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        activeCat = chip.getAttribute('data-cat');
        applyFilter();
      });
    });

    sections.querySelectorAll('.service-cart-toggle').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        GNStore.toggleCartItem(id);
      });
    });

    applyFilter();
  }

  let latestData = GNStore.load();
  render(latestData);
  GNStore.onChange((d) => { latestData = d; render(latestData); });
  GNStore.onCartChange(() => render(latestData));
});
