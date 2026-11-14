/**
 * home.js
 * Renders the dynamic homepage sections from the shared product data:
 * categories, best sellers, new arrivals, special offers and the deal countdown.
 */
'use strict';

function renderCategoryGrid() {
  const grid = document.getElementById('category-grid');
  if (!grid) return;
  grid.innerHTML = CATEGORIES.map((category) => {
    const count = getProductsByCategory(category.name).length;
    return `
      <a href="products.html?category=${encodeURIComponent(category.name)}" class="group relative block overflow-hidden rounded-3xl bg-slate-100">
        <img src="${category.image}" alt="" loading="lazy" class="aspect-[3/4] w-full object-cover transition duration-500 group-hover:scale-105" width="600" height="800">
        <span class="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/10 to-transparent"></span>
        <span class="absolute inset-x-0 bottom-0 p-4 text-white">
          <span class="block text-base font-extrabold leading-tight">${escapeHtml(category.name)}</span>
          <span class="mt-0.5 block text-xs text-white/80">${count} ${count === 1 ? 'product' : 'products'}</span>
        </span>
      </a>`;
  }).join('');
}

function renderHomeProducts() {
  const bestsellers = PRODUCTS.filter((p) => p.bestseller).sort((a, b) => b.sold - a.sold).slice(0, 4);
  const newArrivals = PRODUCTS.filter((p) => p.isNew).sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded)).slice(0, 4);
  const offers = PRODUCTS.filter(isInStock).sort((a, b) => getDiscountPercent(b) - getDiscountPercent(a)).slice(0, 4);

  renderProductGrid(document.getElementById('bestseller-grid'), bestsellers);
  renderProductGrid(document.getElementById('new-arrivals-grid'), newArrivals);
  renderProductGrid(document.getElementById('offers-grid'), offers);
}

/** Counts down to midnight — the daily deal reset. */
function startOfferCountdown() {
  const countdown = document.getElementById('offer-countdown');
  if (!countdown) return;
  const units = {
    h: countdown.querySelector('[data-unit="h"]'),
    m: countdown.querySelector('[data-unit="m"]'),
    s: countdown.querySelector('[data-unit="s"]'),
  };
  const pad = (n) => String(n).padStart(2, '0');

  const tick = () => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const secondsLeft = Math.max(0, Math.floor((midnight - now) / 1000));
    units.h.textContent = pad(Math.floor(secondsLeft / 3600));
    units.m.textContent = pad(Math.floor((secondsLeft % 3600) / 60));
    units.s.textContent = pad(secondsLeft % 60);
  };
  tick();
  setInterval(tick, 1000);
}

document.addEventListener('DOMContentLoaded', () => {
  renderCategoryGrid();
  renderHomeProducts();
  startOfferCountdown();
});
