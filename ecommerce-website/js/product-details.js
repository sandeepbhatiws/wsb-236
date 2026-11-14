/**
 * product-details.js
 * Renders product-details.html?id=<productId>: gallery, variants, quantity,
 * add to cart / buy now, delivery estimate, tabs (description, specs, reviews),
 * related products and recently viewed products.
 */
'use strict';

const INFO_SECTIONS = [
  {
    icon: 'truck',
    title: 'Shipping',
    body: `Free standard delivery on orders over ${formatPrice(STORE.freeShippingThreshold)}; otherwise ₹79. Express (₹149) and next-day (₹249) delivery are available at checkout in select cities.`,
  },
  {
    icon: 'rotate-ccw',
    title: 'Returns & exchanges',
    body: 'Changed your mind? Return unused items in original packaging within 30 days for a full refund. We schedule a free doorstep pickup.',
  },
  {
    icon: 'credit-card',
    title: 'Payment options',
    body: 'Cash on Delivery, UPI and cards are shown at checkout. In this demo store, no payment is processed and no card details are collected.',
  },
];

function renderGallery(product) {
  const images = product.images.length ? product.images : [product.image];
  return `
    <div class="lg:sticky lg:top-28 lg:self-start">
      <div class="gallery-main relative overflow-hidden rounded-3xl bg-slate-100" tabindex="0" aria-roledescription="carousel" aria-label="${escapeHtml(product.name)} images. Use left and right arrow keys to browse." id="gallery-main">
        <img src="${images[0]}" alt="${escapeHtml(product.name)} — image 1 of ${images.length}" class="aspect-square w-full object-cover" id="gallery-image" width="800" height="800">
        <div class="pointer-events-none absolute left-4 top-4 flex flex-col items-start gap-1.5">${renderBadges(product)}</div>
        ${images.length > 1 ? `
          <button type="button" class="icon-btn absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 shadow-soft hover:!bg-white" data-gallery-step="-1" aria-label="Previous image">${icon('chevron-left')}</button>
          <button type="button" class="icon-btn absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 shadow-soft hover:!bg-white" data-gallery-step="1" aria-label="Next image">${icon('chevron-right')}</button>
          <span class="absolute bottom-4 right-4 rounded-full bg-slate-900/80 px-3 py-1 text-xs font-bold text-white" id="gallery-counter" aria-live="polite">1 / ${images.length}</span>` : ''}
      </div>
      ${images.length > 1 ? `
        <div class="mt-4 grid grid-cols-4 gap-3" role="group" aria-label="Choose an image">
          ${images.map((src, i) => `
            <button type="button" class="gallery-thumb" data-gallery-index="${i}" aria-label="Show image ${i + 1} of ${images.length}" aria-current="${i === 0}">
              <img src="${thumbUrl(src, 240)}" alt="" class="h-full w-full object-cover" loading="lazy">
            </button>`).join('')}
        </div>` : ''}
    </div>`;
}

function renderProductInfo(product) {
  const inStock = isInStock(product);
  const wished = Wishlist.has(product.id);
  const percent = getDiscountPercent(product);

  return `
    <div>
      <a href="products.html?q=${encodeURIComponent(product.brand)}" class="text-sm font-bold uppercase tracking-wider text-brand-600 hover:underline">${escapeHtml(product.brand)}</a>
      <h1 class="mt-2 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">${escapeHtml(product.name)}</h1>
      <div class="mt-3 flex flex-wrap items-center gap-3">
        ${renderStars(product.rating, { showValue: true })}
        <a href="#tab-reviews" class="text-sm font-semibold text-slate-600 underline-offset-4 hover:underline" data-open-tab="reviews">${product.reviewCount.toLocaleString(STORE.locale)} reviews</a>
      </div>

      <div class="mt-6">${renderPrice(product, 'lg')}</div>
      <p class="mt-1 text-sm text-slate-500">Inclusive of all taxes${percent ? ` · You save ${formatPrice(product.originalPrice - product.price)}` : ''}</p>

      <p class="mt-5 text-sm">${renderStockStatus(product)}</p>
      <p class="mt-5 leading-relaxed text-slate-600">${escapeHtml(product.description)}</p>

      <form class="mt-7 space-y-6 border-t border-slate-200 pt-7" id="product-form" novalidate>
        ${renderVariantOptions(product, 'pd')}
        <div>
          <label for="pd-qty" class="mb-2.5 block text-sm font-bold">Quantity</label>
          <div class="flex flex-wrap items-center gap-3">
            ${renderQtyStepper({ id: 'pd-qty', max: Cart.maxQtyFor(product), disabled: !inStock })}
            ${inStock ? `<span class="text-xs text-slate-500">Max ${Cart.maxQtyFor(product)} per order</span>` : ''}
          </div>
        </div>
        <div class="flex flex-col gap-3 sm:flex-row">
          <button type="submit" class="btn btn-primary btn-lg flex-1" ${inStock ? '' : 'disabled'}>${icon('shopping-bag', 'h-5 w-5')} ${inStock ? 'Add to cart' : 'Out of stock'}</button>
          <button type="button" class="btn btn-dark btn-lg flex-1" id="buy-now" ${inStock ? '' : 'disabled'}>${icon('zap', 'h-5 w-5')} Buy now</button>
        </div>
        <button type="button" class="btn btn-outline btn-block wishlist-btn !shadow-none" data-wishlist-toggle="${product.id}" aria-pressed="${wished}" aria-label="${escapeHtml(wishlistLabel(product, wished))}">
          ${icon('heart', 'h-5 w-5')} <span data-wishlist-text>${wished ? 'Saved to wishlist' : 'Add to wishlist'}</span>
        </button>
      </form>

      <!-- Delivery estimate -->
      <div class="mt-7 rounded-2xl border border-slate-200 p-5">
        <div class="flex items-start gap-3">
          <span class="mt-0.5 text-brand-600">${icon('truck', 'h-5 w-5')}</span>
          <div class="flex-1">
            <p class="font-bold">Estimated delivery: <span class="text-brand-700">${getDeliveryEstimate('standard')}</span></p>
            <p class="mt-0.5 text-sm text-slate-500">Standard delivery. Need it sooner? Choose express at checkout.</p>
            <form class="mt-4 flex flex-col gap-2 sm:flex-row" id="pincode-form" novalidate>
              <label for="pincode" class="sr-only">Delivery PIN code</label>
              <input id="pincode" inputmode="numeric" maxlength="6" placeholder="Enter 6-digit PIN code" class="form-input !min-h-[2.5rem] !py-2" aria-describedby="pincode-msg" autocomplete="postal-code">
              <button type="submit" class="btn btn-outline btn-sm !min-h-[2.5rem]">Check</button>
            </form>
            <p id="pincode-msg" class="form-message" role="status" aria-live="polite"></p>
          </div>
        </div>
      </div>

      <!-- Shipping, returns & payment -->
      <div class="mt-4 divide-y divide-slate-200 border-y border-slate-200">
        ${INFO_SECTIONS.map((section) => `
          <details class="accordion">
            <summary><span class="flex items-center gap-3">${icon(section.icon, 'h-5 w-5 text-slate-500')}${section.title}</span>${icon('plus', 'accordion-icon h-5 w-5')}</summary>
            <p class="pb-5 pl-8 text-sm leading-relaxed text-slate-600">${section.body}</p>
          </details>`).join('')}
      </div>
    </div>`;
}

function renderTabs(product) {
  const reviews = getProductReviews(product);
  const breakdown = getRatingBreakdown(product.rating);
  const tabs = [
    { id: 'description', label: 'Description' },
    { id: 'specs', label: 'Specifications' },
    { id: 'reviews', label: `Reviews (${product.reviewCount.toLocaleString(STORE.locale)})` },
  ];

  return `
    <section class="mt-16 lg:mt-24" aria-label="Product information">
      <div class="no-scrollbar flex gap-8 overflow-x-auto border-b border-slate-200" role="tablist" aria-label="Product information">
        ${tabs.map((tab, i) => `
          <button type="button" role="tab" class="tab-btn" id="tab-${tab.id}" aria-controls="panel-${tab.id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${tab.label}</button>`).join('')}
      </div>

      <div role="tabpanel" id="panel-description" aria-labelledby="tab-description" class="max-w-3xl py-8" tabindex="0">
        <p class="text-lg leading-relaxed text-slate-700">${escapeHtml(product.description)}</p>
        <ul class="mt-6 grid gap-3 sm:grid-cols-2">
          ${['Carefully quality-checked before dispatch', '30-day easy returns with free pickup', 'Ships in recyclable packaging', `${product.brand} brand warranty where applicable`].map((point) => `
            <li class="flex items-start gap-2 text-sm text-slate-600">${icon('check', 'mt-0.5 h-4 w-4 shrink-0 text-emerald-600')}${escapeHtml(point)}</li>`).join('')}
        </ul>
      </div>

      <div role="tabpanel" id="panel-specs" aria-labelledby="tab-specs" class="max-w-3xl py-8" tabindex="0" hidden>
        <dl class="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200">
          ${Object.entries({ Brand: product.brand, Category: product.category, ...product.specs }).map(([label, value]) => `
            <div class="grid grid-cols-1 gap-1 px-5 py-3.5 sm:grid-cols-3 sm:gap-4 odd:bg-slate-50">
              <dt class="text-sm font-semibold text-slate-500">${escapeHtml(label)}</dt>
              <dd class="text-sm font-medium sm:col-span-2">${escapeHtml(value)}</dd>
            </div>`).join('')}
        </dl>
      </div>

      <div role="tabpanel" id="panel-reviews" aria-labelledby="tab-reviews" class="py-8" tabindex="0" hidden>
        <div class="grid gap-10 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <div>
            <p class="text-5xl font-extrabold">${product.rating.toFixed(1)}</p>
            <div class="mt-2" style="--star-size:1.25rem">${renderStars(product.rating)}</div>
            <p class="mt-2 text-sm text-slate-500">Based on ${product.reviewCount.toLocaleString(STORE.locale)} reviews</p>
            <ul class="mt-6 space-y-2" aria-label="Rating breakdown">
              ${breakdown.map(({ star, percent }) => `
                <li class="flex items-center gap-3 text-sm">
                  <span class="w-8 font-semibold">${star}★</span>
                  <span class="h-2 flex-1 overflow-hidden rounded-full bg-slate-200"><span class="block h-full rounded-full bg-amber-400" style="width:${percent}%"></span></span>
                  <span class="w-10 text-right text-slate-500">${percent}%</span>
                </li>`).join('')}
            </ul>
          </div>
          <div>
            <ul class="divide-y divide-slate-200">
              ${reviews.map((review) => `
                <li class="py-6 first:pt-0">
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    ${renderStars(review.rating)}
                    <time class="text-xs text-slate-400" datetime="${review.date}">${new Date(review.date).toLocaleDateString(STORE.locale, { day: 'numeric', month: 'short', year: 'numeric' })}</time>
                  </div>
                  <h3 class="mt-2 font-bold">${escapeHtml(review.title)}</h3>
                  <p class="mt-1 leading-relaxed text-slate-600">${escapeHtml(review.body)}</p>
                  <p class="mt-3 flex items-center gap-2 text-sm font-semibold">${escapeHtml(review.author)} <span class="font-normal text-slate-400">· ${escapeHtml(review.location)}</span>
                    <span class="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">${icon('badge-check', 'h-3.5 w-3.5')} Verified buyer</span></p>
                </li>`).join('')}
            </ul>
            <p class="mt-4 text-xs text-slate-400">Reviews shown are sample content for this demo store.</p>
          </div>
        </div>
      </div>
    </section>`;
}

function renderNotFound(requestedId) {
  document.title = `Product not found — ${STORE.name}`;
  document.getElementById('product-root').innerHTML = `
    <div class="mx-auto max-w-lg rounded-3xl border border-dashed border-slate-300 px-6 py-16 text-center">
      <span class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600">${icon('package-x', 'h-7 w-7')}</span>
      <h1 class="mt-5 text-2xl font-extrabold">Product not found</h1>
      <p class="mt-2 text-slate-600">${requestedId ? `We couldn't find a product with ID “${escapeHtml(requestedId)}”.` : 'No product was specified.'} It may have been removed, or the link may be incorrect.</p>
      <div class="mt-8 flex flex-wrap justify-center gap-3">
        <a href="products.html" class="btn btn-primary">Browse all products</a>
        <a href="index.html" class="btn btn-outline">Back to home</a>
      </div>
    </div>`;
  document.getElementById('product-root').setAttribute('aria-busy', 'false');

  const related = document.getElementById('related-section');
  related.querySelector('h2').textContent = 'Popular right now';
  renderProductGrid(document.getElementById('related-grid'), PRODUCTS.filter((p) => p.bestseller).slice(0, 4));
  related.hidden = false;
  refreshIcons();
}

function renderBreadcrumb(product) {
  document.getElementById('breadcrumb').insertAdjacentHTML('beforeend', `
    <li aria-hidden="true">${icon('chevron-right', 'h-4 w-4')}</li>
    <li><a href="products.html?category=${encodeURIComponent(product.category)}" class="hover:text-slate-900">${escapeHtml(product.category)}</a></li>
    <li aria-hidden="true">${icon('chevron-right', 'h-4 w-4')}</li>
    <li class="max-w-[16rem] truncate font-semibold text-slate-900" aria-current="page">${escapeHtml(product.name)}</li>`);
}

/* ---------- Behaviour ---------- */

function initGallery(product) {
  const images = product.images.length ? product.images : [product.image];
  const main = document.getElementById('gallery-main');
  const image = document.getElementById('gallery-image');
  const counter = document.getElementById('gallery-counter');
  const thumbs = document.querySelectorAll('[data-gallery-index]');
  let current = 0;

  const show = (index) => {
    current = (index + images.length) % images.length;
    image.classList.add('is-fading');
    setTimeout(() => {
      delete image.dataset.fallback; // allow fallback again for the new source
      image.src = images[current];
      image.alt = `${product.name} — image ${current + 1} of ${images.length}`;
      image.classList.remove('is-fading');
    }, 150);
    thumbs.forEach((thumb, i) => thumb.setAttribute('aria-current', String(i === current)));
    if (counter) counter.textContent = `${current + 1} / ${images.length}`;
  };

  thumbs.forEach((thumb) => thumb.addEventListener('click', () => show(Number(thumb.dataset.galleryIndex))));
  document.querySelectorAll('[data-gallery-step]').forEach((button) => {
    button.addEventListener('click', () => show(current + Number(button.dataset.galleryStep)));
  });
  main.addEventListener('keydown', (event) => {
    if (images.length < 2) return;
    if (event.key === 'ArrowRight') { event.preventDefault(); show(current + 1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); show(current - 1); }
  });

  // Basic swipe support on touch devices.
  let touchStartX = null;
  main.addEventListener('touchstart', (event) => { touchStartX = event.touches[0].clientX; }, { passive: true });
  main.addEventListener('touchend', (event) => {
    if (touchStartX === null || images.length < 2) return;
    const delta = event.changedTouches[0].clientX - touchStartX;
    if (Math.abs(delta) > 40) show(current + (delta < 0 ? 1 : -1));
    touchStartX = null;
  });
}

function initTabs() {
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const select = (tab, focus = true) => {
    tabs.forEach((t) => {
      const active = t === tab;
      t.setAttribute('aria-selected', String(active));
      t.tabIndex = active ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !active;
    });
    if (focus) tab.focus();
  };

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', (event) => {
      const keys = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 };
      if (!(event.key in keys)) return;
      event.preventDefault();
      select(tabs[(keys[event.key] + tabs.length) % tabs.length]);
    });
  });

  // "N reviews" link near the title opens the Reviews tab.
  document.querySelector('[data-open-tab="reviews"]')?.addEventListener('click', (event) => {
    event.preventDefault();
    const reviewsTab = document.getElementById('tab-reviews');
    select(reviewsTab, false);
    reviewsTab.scrollIntoView({ behavior: 'smooth', block: 'center' });
    reviewsTab.focus({ preventScroll: true });
  });
}

function initProductForm(product) {
  const form = document.getElementById('product-form');
  const getSelection = () => ({
    qty: Number(form.querySelector('[data-qty-input]').value) || 1,
    ...readVariantSelection(form, 'pd'),
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const { qty, color, size } = getSelection();
    const result = Cart.add(product.id, qty, { color, size });
    showToast(result.message, result.ok ? 'success' : 'error', result.ok ? { label: 'View cart', href: 'cart.html' } : null);
  });

  document.getElementById('buy-now').addEventListener('click', () => {
    const { qty, color, size } = getSelection();
    const result = Cart.add(product.id, qty, { color, size });
    const alreadyInCart = Cart.read().some((item) => item.key === Cart.buildKey(product.id, color || product.colors[0] || '', size || product.sizes[0] || ''));
    if (result.ok || alreadyInCart) {
      window.location.href = 'checkout.html';
    } else {
      showToast(result.message, 'error');
    }
  });

  // PIN code delivery check (India: 6 digits, cannot start with 0).
  const pinForm = document.getElementById('pincode-form');
  const pinInput = document.getElementById('pincode');
  const pinMsg = document.getElementById('pincode-msg');
  pinForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const pin = pinInput.value.trim();
    const valid = /^[1-9]\d{5}$/.test(pin);
    pinInput.setAttribute('aria-invalid', String(!valid));
    pinMsg.className = `form-message ${valid ? 'is-success' : 'is-error'}`;
    pinMsg.textContent = valid
      ? `Delivers to ${pin} by ${getDeliveryEstimate('standard').split(' – ').pop()}. Cash on Delivery available. (Demo estimate)`
      : 'Please enter a valid 6-digit PIN code, e.g. 560038.';
  });
}

function renderRelatedAndRecent(product, previouslyViewed) {
  const sameCategory = PRODUCTS.filter((p) => p.category === product.category && p.id !== product.id);
  const fillers = PRODUCTS.filter((p) => p.category !== product.category && p.bestseller);
  const related = [...sameCategory, ...fillers].slice(0, 4);
  renderProductGrid(document.getElementById('related-grid'), related);
  document.getElementById('related-section').hidden = related.length === 0;

  const recent = previouslyViewed.filter((id) => id !== product.id).map(getProductById).slice(0, 4);
  renderProductGrid(document.getElementById('recent-grid'), recent);
  document.getElementById('recent-section').hidden = recent.length === 0;
}

function initProductDetails() {
  const requestedId = getQueryParam('id');
  const product = getProductById(requestedId);
  if (!product) {
    renderNotFound(requestedId);
    return;
  }

  document.title = `${product.name} — ${STORE.name}`;
  document.querySelector('meta[name="description"]')?.setAttribute('content', product.description.slice(0, 155));

  const root = document.getElementById('product-root');
  root.innerHTML = `
    <div class="grid gap-10 lg:grid-cols-2 lg:gap-14 fade-in">
      ${renderGallery(product)}
      ${renderProductInfo(product)}
    </div>
    ${renderTabs(product)}`;
  root.setAttribute('aria-busy', 'false');

  renderBreadcrumb(product);
  initGallery(product);
  initTabs();
  initProductForm(product);

  const previouslyViewed = RecentlyViewed.read();
  RecentlyViewed.add(product.id);
  renderRelatedAndRecent(product, previouslyViewed);
  refreshIcons();
}

document.addEventListener('DOMContentLoaded', initProductDetails);
