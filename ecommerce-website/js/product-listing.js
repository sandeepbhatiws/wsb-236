/**
 * product-listing.js
 * Search, filters, sorting, URL syncing and "Load more" pagination for products.html.
 *
 * Supported URL parameters (all optional):
 *   ?q=bag&category=Fashion,Footwear&min=500&max=5000&rating=4&instock=1&sale=1&sort=price-asc
 */
'use strict';

const PAGE_SIZE = 9;
const PRICE_CEILING = Math.ceil(Math.max(...PRODUCTS.map((p) => p.price)) / 1000) * 1000;
const SORT_OPTIONS = ['featured', 'newest', 'price-asc', 'price-desc', 'rating', 'bestselling'];

const listingState = {
  query: '',
  categories: [],
  minPrice: 0,
  maxPrice: PRICE_CEILING,
  minRating: 0,
  inStockOnly: false,
  saleOnly: false,
  sort: 'featured',
  visible: PAGE_SIZE,
};

const els = {};

/* ---------- Filtering & sorting ---------- */

function sortProducts(products, sort) {
  const list = products.slice();
  const sorters = {
    featured: (a, b) => Number(b.featured) - Number(a.featured) || Number(b.bestseller) - Number(a.bestseller) || b.sold - a.sold,
    newest: (a, b) => new Date(b.dateAdded) - new Date(a.dateAdded),
    'price-asc': (a, b) => a.price - b.price,
    'price-desc': (a, b) => b.price - a.price,
    rating: (a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount,
    bestselling: (a, b) => b.sold - a.sold,
  };
  return list.sort(sorters[sort] || sorters.featured);
}

function getFilteredProducts() {
  const s = listingState;
  const results = searchProducts(s.query).filter((product) =>
    (!s.categories.length || s.categories.includes(product.category)) &&
    product.price >= s.minPrice &&
    product.price <= s.maxPrice &&
    product.rating >= s.minRating &&
    (!s.inStockOnly || isInStock(product)) &&
    (!s.saleOnly || getDiscountPercent(product) > 0)
  );
  return sortProducts(results, s.sort);
}

function countActiveFilters() {
  const s = listingState;
  return [
    s.query,
    s.categories.length,
    s.minPrice > 0 || s.maxPrice < PRICE_CEILING,
    s.minRating > 0,
    s.inStockOnly,
    s.saleOnly,
  ].filter(Boolean).length;
}

/* ---------- URL <-> state ---------- */

function readStateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const validCategories = CATEGORIES.map((c) => c.name);
  const number = (key, fallback) => {
    const value = Number(params.get(key));
    return params.has(key) && Number.isFinite(value) ? value : fallback;
  };

  listingState.query = (params.get('q') || '').trim();
  listingState.categories = (params.get('category') || '').split(',').map((c) => c.trim()).filter((c) => validCategories.includes(c));
  listingState.minPrice = Math.max(0, number('min', 0));
  listingState.maxPrice = Math.min(PRICE_CEILING, number('max', PRICE_CEILING));
  listingState.minRating = number('rating', 0);
  listingState.inStockOnly = params.get('instock') === '1';
  listingState.saleOnly = params.get('sale') === '1';

  // URL sort wins; otherwise fall back to the shopper's saved preference.
  const sort = params.get('sort') || Preferences.get('sort', 'featured');
  listingState.sort = SORT_OPTIONS.includes(sort) ? sort : 'featured';
}

function writeStateToUrl() {
  const s = listingState;
  const params = new URLSearchParams();
  if (s.query) params.set('q', s.query);
  if (s.categories.length) params.set('category', s.categories.join(','));
  if (s.minPrice > 0) params.set('min', s.minPrice);
  if (s.maxPrice < PRICE_CEILING) params.set('max', s.maxPrice);
  if (s.minRating > 0) params.set('rating', s.minRating);
  if (s.inStockOnly) params.set('instock', '1');
  if (s.saleOnly) params.set('sale', '1');
  if (s.sort !== 'featured') params.set('sort', s.sort);
  const query = params.toString();
  history.replaceState(null, '', query ? `?${query}` : window.location.pathname);
}

/** Pushes current state into the form controls. */
function syncControls() {
  const s = listingState;
  els.search.value = s.query;
  els.categoryInputs.forEach((input) => { input.checked = s.categories.includes(input.value); });
  els.priceMin.value = s.minPrice;
  els.priceMax.value = s.maxPrice;
  els.priceRange.value = s.maxPrice;
  els.ratingInputs.forEach((input) => { input.checked = Number(input.value) === s.minRating; });
  if (![...els.ratingInputs].some((input) => input.checked)) els.ratingInputs[0].checked = true;
  els.inStock.checked = s.inStockOnly;
  els.sale.checked = s.saleOnly;
  els.sort.value = s.sort;
  updatePriceLabel();
}

function updatePriceLabel() {
  els.priceRange.style.setProperty('--fill', `${(listingState.maxPrice / PRICE_CEILING) * 100}%`);
  els.priceRangeLabel.textContent = `${formatPrice(listingState.minPrice)} – ${formatPrice(listingState.maxPrice)}`;
}

/* ---------- Rendering ---------- */

function renderCategoryFilters() {
  els.categoryFilters.innerHTML = CATEGORIES.map((category) => `
    <label class="flex cursor-pointer items-center gap-3 text-sm font-medium">
      <input type="checkbox" class="check-input" name="category" value="${escapeHtml(category.name)}">
      <span class="flex-1">${escapeHtml(category.name)}</span>
      <span class="text-xs text-slate-400">${getProductsByCategory(category.name).length}</span>
    </label>`).join('');
  els.categoryInputs = els.categoryFilters.querySelectorAll('input');
}

function renderHeading() {
  const s = listingState;
  let title = 'Shop all products';
  let description = 'Thoughtfully chosen essentials across six categories. Use the filters to find exactly what you\'re looking for.';
  let crumb = '';

  if (s.categories.length === 1) {
    const category = CATEGORIES.find((c) => c.name === s.categories[0]);
    title = category.name;
    description = `${category.description}. Browse our ${category.name.toLowerCase()} collection.`;
    crumb = category.name;
  } else if (s.saleOnly && !s.categories.length && !s.query) {
    title = 'On sale';
    description = 'Our best markdowns across every category — while stocks last.';
    crumb = 'On sale';
  }
  if (s.query) {
    title = `Results for “${s.query}”`;
    crumb = 'Search';
  }

  els.title.textContent = title;
  els.description.textContent = description;
  els.crumbCurrent.textContent = crumb;
  els.crumbCurrent.hidden = !crumb;
  els.crumbSep.hidden = !crumb;
  document.title = `${title} — ${STORE.name}`;
}

function renderActiveChips() {
  const s = listingState;
  const chips = [];
  if (s.query) chips.push({ label: `Search: ${s.query}`, clear: () => { s.query = ''; } });
  s.categories.forEach((category) => chips.push({ label: category, clear: () => { s.categories = s.categories.filter((c) => c !== category); } }));
  if (s.minPrice > 0 || s.maxPrice < PRICE_CEILING) chips.push({ label: `${formatPrice(s.minPrice)} – ${formatPrice(s.maxPrice)}`, clear: () => { s.minPrice = 0; s.maxPrice = PRICE_CEILING; } });
  if (s.minRating > 0) chips.push({ label: `${s.minRating}★ & up`, clear: () => { s.minRating = 0; } });
  if (s.inStockOnly) chips.push({ label: 'In stock', clear: () => { s.inStockOnly = false; } });
  if (s.saleOnly) chips.push({ label: 'On sale', clear: () => { s.saleOnly = false; } });

  els.chips.innerHTML = chips.map((chip, i) => `
    <button type="button" class="inline-flex items-center gap-1.5 rounded-full bg-slate-100 py-1.5 pl-3 pr-2 text-sm font-semibold hover:bg-slate-200" data-chip="${i}">
      ${escapeHtml(chip.label)} ${icon('x', 'h-3.5 w-3.5')}<span class="sr-only">Remove filter</span>
    </button>`).join('');
  els.chips.querySelectorAll('[data-chip]').forEach((button) => {
    button.addEventListener('click', () => {
      chips[Number(button.dataset.chip)].clear();
      applyFilters();
    });
  });

  const count = countActiveFilters();
  els.filterCount.textContent = count;
  els.filterCount.hidden = count === 0;
}

function renderLoadMore(total) {
  const shown = Math.min(listingState.visible, total);
  els.loadMoreWrap.hidden = total <= PAGE_SIZE;
  els.loadMoreProgress.textContent = `You've viewed ${shown} of ${total} products`;
  els.loadMoreBar.style.width = `${total ? (shown / total) * 100 : 0}%`;
  els.loadMore.hidden = shown >= total;
}

function renderResults() {
  const results = getFilteredProducts();
  const visible = results.slice(0, listingState.visible);

  renderProductGrid(els.grid, visible);
  els.grid.setAttribute('aria-busy', 'false');
  els.grid.classList.toggle('hidden', results.length === 0);
  els.noResults.classList.toggle('hidden', results.length > 0);

  els.resultCount.textContent = results.length
    ? `Showing ${visible.length} of ${results.length} ${results.length === 1 ? 'product' : 'products'}`
    : 'No products found';
  els.showResultsBtn.textContent = results.length ? `Show ${results.length} ${results.length === 1 ? 'result' : 'results'}` : 'No results — adjust filters';

  renderLoadMore(results.length);
  renderHeading();
  renderActiveChips();
  refreshIcons();
}

/** Re-reads state, resets pagination, re-renders and syncs the URL. */
function applyFilters() {
  listingState.visible = PAGE_SIZE;
  syncControls();
  renderResults();
  writeStateToUrl();
}

function loadMore() {
  const results = getFilteredProducts();
  const start = listingState.visible;
  listingState.visible += PAGE_SIZE;
  const nextBatch = results.slice(start, listingState.visible);
  els.grid.insertAdjacentHTML('beforeend', nextBatch.map(renderProductCard).join(''));
  refreshIcons();

  const shown = Math.min(listingState.visible, results.length);
  els.resultCount.textContent = `Showing ${shown} of ${results.length} products`;
  renderLoadMore(results.length);

  // Move keyboard focus to the first newly loaded product.
  els.grid.querySelector(`[data-product-id="${nextBatch[0]?.id}"] h3 a`)?.focus();
}

/* ---------- Mobile filter drawer ---------- */

function setFiltersOpen(open) {
  els.filters.classList.toggle('is-open', open);
  els.backdrop.hidden = !open;
  els.openFilters.setAttribute('aria-expanded', String(open));
  document.body.classList.toggle('has-overlay', open);
  if (open) els.filters.querySelector('[data-filters-close]').focus();
  else els.openFilters.focus();
}

/* ---------- Init ---------- */

function initListing() {
  Object.assign(els, {
    form: document.getElementById('filter-form'),
    search: document.getElementById('filter-search'),
    categoryFilters: document.getElementById('category-filters'),
    priceMin: document.getElementById('price-min'),
    priceMax: document.getElementById('price-max'),
    priceRange: document.getElementById('price-range'),
    priceRangeLabel: document.getElementById('price-range-label'),
    ratingInputs: document.querySelectorAll('input[name="rating"]'),
    inStock: document.getElementById('filter-instock'),
    sale: document.getElementById('filter-sale'),
    sort: document.getElementById('sort-select'),
    grid: document.getElementById('product-grid'),
    noResults: document.getElementById('no-results'),
    resultCount: document.getElementById('result-count'),
    chips: document.getElementById('active-filters'),
    filterCount: document.getElementById('filter-count'),
    loadMoreWrap: document.getElementById('load-more-wrap'),
    loadMore: document.getElementById('load-more'),
    loadMoreProgress: document.getElementById('load-more-progress'),
    loadMoreBar: document.getElementById('load-more-bar'),
    title: document.getElementById('listing-title'),
    description: document.getElementById('listing-description'),
    crumbCurrent: document.getElementById('breadcrumb-current'),
    crumbSep: document.getElementById('breadcrumb-sep'),
    filters: document.getElementById('filters'),
    backdrop: document.querySelector('.filters-backdrop'),
    openFilters: document.getElementById('open-filters'),
    showResultsBtn: document.getElementById('show-results-btn'),
  });

  [els.priceMin, els.priceMax, els.priceRange].forEach((input) => { input.max = PRICE_CEILING; });
  renderCategoryFilters();
  readStateFromUrl();
  syncControls();

  // Loading state: skeletons while the catalog "loads" (simulates a network fetch).
  els.grid.innerHTML = renderSkeletonCards(6);
  setTimeout(() => {
    renderResults();
    writeStateToUrl();
  }, 350);

  /* Filter events */
  els.form.addEventListener('submit', (event) => event.preventDefault());

  els.search.addEventListener('input', debounce(() => {
    listingState.query = els.search.value.trim();
    applyFilters();
  }, 250));

  els.categoryFilters.addEventListener('change', () => {
    listingState.categories = [...els.categoryInputs].filter((input) => input.checked).map((input) => input.value);
    applyFilters();
  });

  const applyPriceInputs = () => {
    let min = Math.max(0, Math.min(Number(els.priceMin.value) || 0, PRICE_CEILING));
    let max = Math.max(0, Math.min(Number(els.priceMax.value) || PRICE_CEILING, PRICE_CEILING));
    if (min > max) [min, max] = [max, min];
    listingState.minPrice = min;
    listingState.maxPrice = max;
    applyFilters();
  };
  els.priceMin.addEventListener('change', applyPriceInputs);
  els.priceMax.addEventListener('change', applyPriceInputs);

  els.priceRange.addEventListener('input', () => {
    listingState.maxPrice = Math.max(Number(els.priceRange.value), listingState.minPrice);
    els.priceMax.value = listingState.maxPrice;
    updatePriceLabel();
  });
  els.priceRange.addEventListener('change', applyFilters);

  els.ratingInputs.forEach((input) => input.addEventListener('change', () => {
    listingState.minRating = Number(input.value);
    applyFilters();
  }));

  els.inStock.addEventListener('change', () => {
    listingState.inStockOnly = els.inStock.checked;
    applyFilters();
  });

  els.sale.addEventListener('change', () => {
    listingState.saleOnly = els.sale.checked;
    applyFilters();
  });

  els.sort.addEventListener('change', () => {
    listingState.sort = els.sort.value;
    Preferences.set('sort', listingState.sort);
    applyFilters();
  });

  document.querySelectorAll('[data-clear-filters]').forEach((button) => button.addEventListener('click', () => {
    Object.assign(listingState, {
      query: '', categories: [], minPrice: 0, maxPrice: PRICE_CEILING, minRating: 0, inStockOnly: false, saleOnly: false,
    });
    applyFilters();
    showToast('All filters cleared.', 'info');
  }));

  els.loadMore.addEventListener('click', loadMore);

  /* Mobile drawer */
  els.openFilters.addEventListener('click', () => setFiltersOpen(true));
  document.querySelectorAll('[data-filters-close]').forEach((el) => el.addEventListener('click', () => setFiltersOpen(false)));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && els.filters.classList.contains('is-open')) setFiltersOpen(false);
  });
  window.matchMedia('(min-width: 1024px)').addEventListener('change', (event) => {
    if (event.matches && els.filters.classList.contains('is-open')) {
      els.filters.classList.remove('is-open');
      els.backdrop.hidden = true;
      document.body.classList.remove('has-overlay');
    }
  });
}

document.addEventListener('DOMContentLoaded', initListing);
