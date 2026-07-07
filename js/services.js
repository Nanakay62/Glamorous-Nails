/* Renders the services menu (cards + prices) from GNStore data.
   Uses a single responsive grid at every breakpoint: 2 columns on
   mobile (scroll vertically, images shrink to fit side by side),
   3 columns from tablet width up. No horizontal scroll rail. */

document.addEventListener('DOMContentLoaded', () => {
  const chipRow = document.getElementById('categoryChips');
  const sections = document.getElementById('serviceSections');
  if (!chipRow || !sections) return;
  let activeCategory = 'all';

  function cardHTML(item, currency) {
    const priceText = `${currency}${item.price}${item.note ? ` <span class="service-note">${item.note}</span>` : ''}`;
    const media = item.image
      ? `<img class="ph" src="${item.image}" alt="${item.name} — Glamorous Nails" loading="lazy">`
      : `<div class="ph" data-label="${item.name}"></div>`;
    return `
      <article class="service-card">
        ${media}
        <div class="service-card-body">
          <div class="service-card-row">
            <h3>${item.name}</h3>
          </div>
          <p class="service-price">${priceText}</p>
          <button class="btn btn-secondary btn-sm service-cart-toggle" data-id="${item.id}">
            ${GNStore.getCart().includes(item.id) ? 'Remove' : 'Add to booking'}
          </button>
        </div>
      </article>`;
  }

  function render(data) {
    const categoryExists = activeCategory === 'all' || data.categories.some((c) => c.id === activeCategory);
    if (!categoryExists) activeCategory = 'all';

    chipRow.innerHTML = `<button class="chip${activeCategory === 'all' ? ' is-active' : ''}" data-cat="all">All services</button>` +
      data.categories.map((c) => `<button class="chip${activeCategory === c.id ? ' is-active' : ''}" data-cat="${c.id}">${c.icon || ''} ${c.name}</button>`).join('');

    sections.innerHTML = data.categories.map((cat) => `
      <div class="service-category" data-cat-section="${cat.id}">
        <div class="section-head reveal" style="margin-bottom:20px; text-align:left; align-items:flex-start;">
          <span class="category-tag">${cat.icon || ''} ${cat.name}</span>
        </div>
        <div class="service-grid">
          ${cat.items.map((i) => cardHTML(i, data.currency)).join('')}
        </div>
      </div>
    `).join('<hr class="hairline" style="margin:48px 0;">');

    chipRow.querySelectorAll('.chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        chipRow.querySelectorAll('.chip').forEach((c) => c.classList.remove('is-active'));
        chip.classList.add('is-active');
        activeCategory = chip.getAttribute('data-cat');
        applyCategoryFilter();
      });
    });

    sections.querySelectorAll('.service-cart-toggle').forEach((btn) => {
      btn.addEventListener('click', () => {
        GNStore.toggleCartItem(btn.getAttribute('data-id'));
      });
    });

    applyCategoryFilter();
  }

  function applyCategoryFilter() {
    sections.querySelectorAll('.service-category').forEach((sec) => {
      const show = activeCategory === 'all' || sec.getAttribute('data-cat-section') === activeCategory;
      sec.style.display = show ? '' : 'none';
    });
    sections.querySelectorAll('.hairline').forEach((hr) => { hr.style.display = activeCategory === 'all' ? '' : 'none'; });
  }

  const data = GNStore.load();
  render(data);
  GNStore.onChange(render);
  GNStore.onCartChange(() => render(data));
});
