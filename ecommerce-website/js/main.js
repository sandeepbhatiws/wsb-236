/**
 * main.js
 * Shared logic loaded on every page (after products.js):
 *  - store configuration, coupons and shipping methods
 *  - LocalStorage-backed Cart, Wishlist, Coupons, RecentlyViewed, Preferences
 *  - reusable renderers (header, footer, product card, stars, price, steppers)
 *  - global UI: search suggestions, mobile menu, quick view, wishlist drawer, toasts
 */
'use strict';

/* ==========================================================================
   Configuration
   ========================================================================== */

const STORE = {
  name: 'Lumora',
  locale: 'en-IN',
  currency: 'INR',
  freeShippingThreshold: 499,
  maxQtyPerItem: 10,
  gstRate: 0.18, // prices are GST-inclusive; the tax line is informational
  // Placeholder contact details — replace with real business information.
  email: 'support@lumora.example',
  phone: '+91 98765 43210',
  address: '42 Placeholder Lane, Indiranagar, Bengaluru 560038',
};

const STORAGE_KEYS = {
  cart: 'lumora_cart',
  wishlist: 'lumora_wishlist',
  coupon: 'lumora_coupon',
  recent: 'lumora_recently_viewed',
  prefs: 'lumora_preferences',
  lastOrder: 'lumora_last_order',
};

const SHIPPING_METHODS = [
  { id: 'standard', name: 'Standard Delivery', description: '4–6 business days', price: 79, freeAbove: STORE.freeShippingThreshold, minDays: 4, maxDays: 6 },
  { id: 'express', name: 'Express Delivery', description: '2–3 business days', price: 149, minDays: 2, maxDays: 3 },
  { id: 'nextday', name: 'Next-Day Delivery', description: 'Next business day, select cities', price: 249, minDays: 1, maxDays: 1 },
];

/** Demo coupon codes. */
const COUPONS = {
  SAVE10: { type: 'percent', value: 10, maxDiscount: 1000, description: '10% off your order (up to ₹1,000)' },
  WELCOME200: { type: 'flat', value: 200, minSubtotal: 1499, description: '₹200 off orders above ₹1,499' },
  FREESHIP: { type: 'shipping', description: 'Free shipping on any delivery method' },
};

const NAV_LINKS = [
  { label: 'Home', href: 'index.html', page: 'home' },
  { label: 'Shop', href: 'products.html', page: 'shop' },
  { label: 'About Us', href: 'about.html', page: 'about' },
  { label: 'Contact', href: 'contact.html', page: 'contact' },
];

const LOGO_MARK = `
  <svg viewBox="0 0 32 32" class="h-8 w-8 shrink-0" aria-hidden="true">
    <rect width="32" height="32" rx="9" fill="#4f46e5"/>
    <path d="M11 8v16h11" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <circle cx="22" cy="10" r="2.6" fill="#c7d2fe"/>
  </svg>`;

/* ==========================================================================
   Storage & small utilities
   ========================================================================== */

/** LocalStorage wrapper that never throws (private mode, quota, bad JSON). */
const LocalStore = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (error) {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Could not save "${key}" to localStorage.`, error);
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      /* ignore */
    }
  },
};

const priceFormatter = new Intl.NumberFormat(STORE.locale, {
  style: 'currency',
  currency: STORE.currency,
  maximumFractionDigits: 0,
});

function formatPrice(amount) {
  return priceFormatter.format(Math.round(amount));
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
}

/** Lucide icon placeholder; converted to inline SVG by refreshIcons(). */
function icon(name, classes = 'h-5 w-5') {
  return `<i data-lucide="${name}" class="${classes}" aria-hidden="true"></i>`;
}

function refreshIcons() {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

function emit(eventName, detail) {
  window.dispatchEvent(new CustomEvent(eventName, { detail }));
}

function debounce(fn, wait = 150) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value).trim());
}

/** Adds business days (skipping Sundays) to a date. */
function addBusinessDays(date, days) {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    if (result.getDay() !== 0) added += 1;
  }
  return result;
}

function formatShortDate(date) {
  return date.toLocaleDateString(STORE.locale, { weekday: 'short', day: 'numeric', month: 'short' });
}

function getDeliveryEstimate(methodId = 'standard') {
  const method = SHIPPING_METHODS.find((m) => m.id === methodId) || SHIPPING_METHODS[0];
  const now = new Date();
  const from = addBusinessDays(now, method.minDays);
  const to = addBusinessDays(now, method.maxDays);
  return method.minDays === method.maxDays
    ? formatShortDate(from)
    : `${formatShortDate(from)} – ${formatShortDate(to)}`;
}

/** Thumbnail variant of an Unsplash URL for small previews. */
function thumbUrl(url, width = 160) {
  return String(url).replace(/w=\d+/, `w=${width}`);
}

/* ==========================================================================
   Cart
   Items are stored as { key, id, qty, color, size }. The key combines the
   product id with its variants, so the same product in two colours is two
   separate lines.
   ========================================================================== */

const Cart = {
  read() {
    const items = LocalStore.get(STORAGE_KEYS.cart, []);
    if (!Array.isArray(items)) return [];
    return items.filter((item) => item && getProductById(item.id) && Number(item.qty) > 0);
  },

  write(items) {
    LocalStore.set(STORAGE_KEYS.cart, items);
    emit('cart:updated');
  },

  buildKey(id, color = '', size = '') {
    return `${id}|${color}|${size}`;
  },

  maxQtyFor(product) {
    return Math.max(0, Math.min(product.stock, STORE.maxQtyPerItem));
  },

  /**
   * Adds a product (with optional variants) to the cart.
   * Returns { ok, message } so callers can show the right toast.
   */
  add(productId, qty = 1, options = {}) {
    const product = getProductById(productId);
    if (!product) return { ok: false, message: 'Sorry, this product is no longer available.' };
    if (!isInStock(product)) return { ok: false, message: `${product.name} is currently out of stock.` };

    const color = options.color || product.colors[0] || '';
    const size = options.size || product.sizes[0] || '';
    const key = this.buildKey(product.id, color, size);
    const requested = Math.max(1, Math.floor(Number(qty)) || 1);
    const maxQty = this.maxQtyFor(product);

    const items = this.read();
    const existing = items.find((item) => item.key === key);
    const currentQty = existing ? existing.qty : 0;
    const newQty = Math.min(currentQty + requested, maxQty);

    if (newQty === currentQty) {
      return { ok: false, message: `You already have the maximum quantity (${maxQty}) of ${product.name} in your cart.` };
    }

    if (existing) {
      existing.qty = newQty;
    } else {
      items.push({ key, id: product.id, qty: newQty, color, size, addedAt: Date.now() });
    }
    this.write(items);

    const variantText = [color, size].filter(Boolean).join(', ');
    const label = variantText ? `${product.name} (${variantText})` : product.name;
    const adjusted = newQty - currentQty < requested;
    return {
      ok: true,
      message: adjusted ? `Only ${maxQty} available — cart updated for ${label}.` : `${label} added to your cart.`,
    };
  },

  /** Sets the quantity for a cart line, clamped between 1 and the max allowed. */
  setQty(key, qty) {
    const items = this.read();
    const item = items.find((entry) => entry.key === key);
    if (!item) return 0;
    const product = getProductById(item.id);
    const clamped = Math.max(1, Math.min(Math.floor(Number(qty)) || 1, this.maxQtyFor(product) || 1));
    item.qty = clamped;
    this.write(items);
    return clamped;
  },

  remove(key) {
    this.write(this.read().filter((item) => item.key !== key));
  },

  clear() {
    this.write([]);
  },

  count() {
    return this.read().reduce((sum, item) => sum + item.qty, 0);
  },

  /** Cart lines joined with their product data and line totals. */
  getDetailedItems() {
    return this.read().map((item) => {
      const product = getProductById(item.id);
      const qty = Math.min(item.qty, Math.max(1, this.maxQtyFor(product)));
      return { ...item, qty, product, lineTotal: product.price * qty };
    });
  },
};

/* ==========================================================================
   Wishlist
   ========================================================================== */

const Wishlist = {
  read() {
    const ids = LocalStore.get(STORAGE_KEYS.wishlist, []);
    return Array.isArray(ids) ? ids.map(Number).filter((id) => getProductById(id)) : [];
  },
  write(ids) {
    LocalStore.set(STORAGE_KEYS.wishlist, [...new Set(ids)]);
    emit('wishlist:updated');
  },
  has(id) {
    return this.read().includes(Number(id));
  },
  add(id) {
    if (!this.has(id)) this.write([Number(id), ...this.read()]);
  },
  remove(id) {
    this.write(this.read().filter((itemId) => itemId !== Number(id)));
  },
  /** Returns true when the product was added, false when removed. */
  toggle(id) {
    if (this.has(id)) {
      this.remove(id);
      return false;
    }
    this.add(id);
    return true;
  },
};

/* ==========================================================================
   Coupons & order totals (shared by cart and checkout)
   ========================================================================== */

const Coupons = {
  getApplied() {
    return LocalStore.get(STORAGE_KEYS.coupon, null);
  },

  validate(rawCode, subtotal) {
    const code = String(rawCode || '').trim().toUpperCase();
    if (!code) return { ok: false, message: 'Please enter a coupon code.' };
    const coupon = COUPONS[code];
    if (!coupon) return { ok: false, message: `“${code}” is not a valid coupon code.` };
    if (coupon.minSubtotal && subtotal < coupon.minSubtotal) {
      return {
        ok: false,
        code,
        message: `Add ${formatPrice(coupon.minSubtotal - subtotal)} more to use ${code} (minimum order ${formatPrice(coupon.minSubtotal)}).`,
      };
    }
    return { ok: true, code, coupon, message: `${code} applied — ${coupon.description}.` };
  },

  apply(rawCode, subtotal) {
    const result = this.validate(rawCode, subtotal);
    if (result.ok) {
      LocalStore.set(STORAGE_KEYS.coupon, result.code);
      emit('cart:updated');
    }
    return result;
  },

  remove() {
    LocalStore.remove(STORAGE_KEYS.coupon);
    emit('cart:updated');
  },
};

function getShippingCost(method, subtotal) {
  if (method.freeAbove && subtotal >= method.freeAbove) return 0;
  return method.price;
}

/**
 * Calculates the full order summary.
 * Coupons are re-validated against the current subtotal every time, so a
 * minimum-spend coupon stops applying if items are removed.
 */
function calculateOrderTotals(items, shippingMethodId = 'standard') {
  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.qty, 0);
  const itemCount = items.reduce((sum, item) => sum + item.qty, 0);
  const savings = items.reduce((sum, item) => sum + Math.max(0, item.product.originalPrice - item.product.price) * item.qty, 0);
  const method = SHIPPING_METHODS.find((m) => m.id === shippingMethodId) || SHIPPING_METHODS[0];

  let discount = 0;
  let couponCode = null;
  let couponMessage = '';
  let freeShipping = false;

  const appliedCode = Coupons.getApplied();
  if (appliedCode && subtotal > 0) {
    const result = Coupons.validate(appliedCode, subtotal);
    if (result.ok) {
      couponCode = result.code;
      const { coupon } = result;
      if (coupon.type === 'percent') discount = Math.min(Math.round((subtotal * coupon.value) / 100), coupon.maxDiscount ?? Infinity);
      if (coupon.type === 'flat') discount = Math.min(coupon.value, subtotal);
      if (coupon.type === 'shipping') freeShipping = true;
    } else {
      couponMessage = result.message;
    }
  }

  const shipping = subtotal === 0 || freeShipping ? 0 : getShippingCost(method, subtotal);
  const taxableAmount = subtotal - discount;
  const tax = Math.round((taxableAmount * STORE.gstRate) / (1 + STORE.gstRate));
  const total = taxableAmount + shipping;

  return {
    subtotal,
    itemCount,
    savings,
    discount,
    shipping,
    tax,
    total,
    couponCode,
    pendingCoupon: couponCode ? null : appliedCode,
    couponMessage,
    shippingMethod: method,
    amountToFreeShipping: Math.max(0, STORE.freeShippingThreshold - subtotal),
  };
}

/** Order summary rows (<dt>/<dd> pairs) shared by the cart and checkout pages. */
function renderTotalsRows(totals) {
  const row = (label, value, classes = '') => `
    <div class="flex items-start justify-between gap-4 ${classes}">
      <dt class="text-slate-600">${label}</dt>
      <dd class="text-right font-semibold">${value}</dd>
    </div>`;
  const shippingLabel = totals.shipping === 0 && totals.subtotal > 0 ? '<span class="text-emerald-600">Free</span>' : formatPrice(totals.shipping);
  return [
    row(`Subtotal (${totals.itemCount} ${totals.itemCount === 1 ? 'item' : 'items'})`, formatPrice(totals.subtotal)),
    totals.discount > 0 ? row(`Discount <span class="rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-bold text-emerald-700">${escapeHtml(totals.couponCode)}</span>`, `<span class="text-emerald-600">−${formatPrice(totals.discount)}</span>`) : '',
    row(`Shipping <span class="block text-xs text-slate-400">${escapeHtml(totals.shippingMethod.name)}${totals.couponCode === 'FREESHIP' ? ' · FREESHIP' : ''}</span>`, shippingLabel),
    row(`Estimated tax <span class="block text-xs text-slate-400">GST 18%, included in prices</span>`, formatPrice(totals.tax)),
    `<div class="flex items-center justify-between gap-4 border-t border-slate-200 pt-4">
       <dt class="text-base font-extrabold">Total</dt>
       <dd class="text-2xl font-extrabold">${formatPrice(totals.total)}</dd>
     </div>`,
    totals.savings + totals.discount > 0
      ? `<div><dt class="sr-only">Savings</dt><dd class="rounded-xl bg-emerald-50 px-3 py-2 text-center text-xs font-bold text-emerald-700">You're saving ${formatPrice(totals.savings + totals.discount)} on this order</dd></div>`
      : '',
  ].join('');
}

/* ==========================================================================
   Recently viewed & preferences
   ========================================================================== */

const RecentlyViewed = {
  read() {
    const ids = LocalStore.get(STORAGE_KEYS.recent, []);
    return Array.isArray(ids) ? ids.map(Number).filter((id) => getProductById(id)) : [];
  },
  add(id) {
    const ids = [Number(id), ...this.read().filter((itemId) => itemId !== Number(id))].slice(0, 8);
    LocalStore.set(STORAGE_KEYS.recent, ids);
  },
};

const Preferences = {
  get(key, fallback) {
    const prefs = LocalStore.get(STORAGE_KEYS.prefs, {});
    return prefs && key in prefs ? prefs[key] : fallback;
  },
  set(key, value) {
    const prefs = LocalStore.get(STORAGE_KEYS.prefs, {}) || {};
    prefs[key] = value;
    LocalStore.set(STORAGE_KEYS.prefs, prefs);
  },
};

/* ==========================================================================
   Reusable renderers
   ========================================================================== */

function renderStars(rating, { count = null, showValue = false } = {}) {
  const value = Number(rating).toFixed(1);
  return `
    <span class="inline-flex items-center gap-1.5">
      <span class="stars" style="--rating:${rating}" role="img" aria-label="Rated ${value} out of 5"></span>
      ${showValue ? `<span class="text-sm font-bold text-slate-900">${value}</span>` : ''}
      ${count !== null ? `<span class="text-xs font-medium text-slate-500">(${Number(count).toLocaleString(STORE.locale)}<span class="sr-only"> reviews</span>)</span>` : ''}
    </span>`;
}

function renderPrice(product, size = 'md') {
  const percent = getDiscountPercent(product);
  const large = size === 'lg';
  return `
    <div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span class="${large ? 'text-3xl' : 'text-base'} font-extrabold text-slate-900"><span class="sr-only">Price: </span>${formatPrice(product.price)}</span>
      ${percent ? `
        <span class="${large ? 'text-lg' : 'text-sm'} font-medium text-slate-400 line-through"><span class="sr-only">Original price: </span>${formatPrice(product.originalPrice)}</span>
        <span class="${large ? 'rounded-md bg-rose-50 px-2 py-0.5 text-sm' : 'text-xs'} font-bold text-rose-600">${percent}% off</span>` : ''}
    </div>`;
}

function renderBadges(product) {
  const badges = [];
  if (!isInStock(product)) badges.push('<span class="badge badge-soldout">Sold out</span>');
  if (product.isNew) badges.push('<span class="badge badge-new">New</span>');
  if (getDiscountPercent(product) > 0 && isInStock(product)) badges.push('<span class="badge badge-sale">Sale</span>');
  if (product.bestseller) badges.push(`<span class="badge badge-best">${icon('flame', 'h-3 w-3')}Bestseller</span>`);
  return badges.slice(0, 2).join('');
}

function renderStockStatus(product) {
  if (!isInStock(product)) {
    return `<span class="inline-flex items-center gap-2 font-semibold text-rose-600"><span class="h-2 w-2 rounded-full bg-rose-500"></span>Out of stock</span>`;
  }
  if (product.stock <= 5) {
    return `<span class="inline-flex items-center gap-2 font-semibold text-amber-600"><span class="h-2 w-2 rounded-full bg-amber-500"></span>Only ${product.stock} left — order soon</span>`;
  }
  return `<span class="inline-flex items-center gap-2 font-semibold text-emerald-600"><span class="h-2 w-2 rounded-full bg-emerald-500"></span>In stock</span>`;
}

function wishlistLabel(product, active) {
  return active ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`;
}

/** The product card used on every page. */
function renderProductCard(product) {
  const url = `product-details.html?id=${product.id}`;
  const name = escapeHtml(product.name);
  const inStock = isInStock(product);
  const wished = Wishlist.has(product.id);

  return `
    <article class="product-card fade-in" data-product-id="${product.id}">
      <div class="product-card__media">
        <a href="${url}" tabindex="-1" aria-hidden="true">
          <img src="${product.image}" alt="${name}" loading="lazy" decoding="async" width="600" height="600">
        </a>
        <div class="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-1.5">${renderBadges(product)}</div>
        <button type="button" class="icon-btn wishlist-btn absolute right-3 top-3" data-wishlist-toggle="${product.id}"
          aria-pressed="${wished}" aria-label="${escapeHtml(wishlistLabel(product, wished))}">
          ${icon('heart', 'h-[18px] w-[18px]')}
        </button>
        <div class="product-card__quick absolute inset-x-3 bottom-3">
          <button type="button" class="btn btn-light btn-sm btn-block shadow-soft" data-quick-view="${product.id}">
            ${icon('eye', 'h-4 w-4')} Quick view<span class="sr-only">: ${name}</span>
          </button>
        </div>
      </div>
      <div class="flex flex-1 flex-col pt-4">
        <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">${escapeHtml(product.brand)}</p>
        <h3 class="mt-1 line-clamp-2 text-[15px] font-bold leading-snug text-slate-900">
          <a href="${url}" class="hover:text-brand-600">${name}</a>
        </h3>
        <div class="mt-1.5">${renderStars(product.rating, { count: product.reviewCount })}</div>
        <div class="mt-2">${renderPrice(product)}</div>
        <div class="mt-auto pt-4">
          <button type="button" class="btn ${inStock ? 'btn-dark' : 'btn-outline'} btn-sm btn-block" data-add-to-cart="${product.id}" ${inStock ? '' : 'disabled'}>
            ${icon(inStock ? 'shopping-bag' : 'ban', 'h-4 w-4')} ${inStock ? 'Add to cart' : 'Out of stock'}<span class="sr-only">: ${name}</span>
          </button>
        </div>
      </div>
    </article>`;
}

function renderSkeletonCards(count = 4) {
  return Array.from({ length: count }, () => `
    <div aria-hidden="true">
      <div class="skeleton aspect-square !rounded-[1.25rem]"></div>
      <div class="skeleton mt-4 h-3 w-1/3"></div>
      <div class="skeleton mt-2 h-4 w-4/5"></div>
      <div class="skeleton mt-2 h-3 w-1/2"></div>
      <div class="skeleton mt-4 h-9 w-full !rounded-full"></div>
    </div>`).join('');
}

/** Renders a list of products into a grid container, with an optional empty state. */
function renderProductGrid(container, products, emptyHtml = '') {
  if (!container) return;
  container.innerHTML = products.length ? products.map(renderProductCard).join('') : emptyHtml;
  refreshIcons();
}

/** Colour & size pickers (used by quick view and the product details page). */
function renderVariantOptions(product, prefix) {
  let html = '';
  if (product.colors.length) {
    html += `
      <fieldset>
        <legend class="mb-2.5 text-sm font-bold">Colour: <span class="font-medium text-slate-600" data-selected-label>${escapeHtml(product.colors[0])}</span></legend>
        <div class="flex flex-wrap gap-2">
          ${product.colors.map((color, i) => `
            <label class="option-pill">
              <input type="radio" name="${prefix}-color" value="${escapeHtml(color)}" ${i === 0 ? 'checked' : ''}>
              <span><span class="swatch" style="background:${COLOR_SWATCHES[color] || '#cbd5e1'}"></span>${escapeHtml(color)}</span>
            </label>`).join('')}
        </div>
      </fieldset>`;
  }
  if (product.sizes.length) {
    html += `
      <fieldset>
        <legend class="mb-2.5 text-sm font-bold">Size: <span class="font-medium text-slate-600" data-selected-label>${escapeHtml(product.sizes[0])}</span></legend>
        <div class="flex flex-wrap gap-2">
          ${product.sizes.map((size, i) => `
            <label class="option-pill">
              <input type="radio" name="${prefix}-size" value="${escapeHtml(size)}" ${i === 0 ? 'checked' : ''}>
              <span>${escapeHtml(size)}</span>
            </label>`).join('')}
        </div>
      </fieldset>`;
  }
  return html;
}

function readVariantSelection(root, prefix) {
  return {
    color: root.querySelector(`input[name="${prefix}-color"]:checked`)?.value || '',
    size: root.querySelector(`input[name="${prefix}-size"]:checked`)?.value || '',
  };
}

/** Quantity stepper markup. Behaviour is handled globally via data attributes. */
function renderQtyStepper({ id, value = 1, max = STORE.maxQtyPerItem, label = 'Quantity', disabled = false, attrs = '' }) {
  const safeMax = Math.max(1, max);
  return `
    <div class="qty-stepper" data-qty-stepper>
      <button type="button" data-qty-step="-1" aria-label="Decrease quantity" ${disabled || value <= 1 ? 'disabled' : ''}>${icon('minus', 'h-4 w-4')}</button>
      <input type="number" id="${id}" inputmode="numeric" min="1" max="${safeMax}" value="${value}" aria-label="${escapeHtml(label)}" data-qty-input ${disabled ? 'disabled' : ''} ${attrs}>
      <button type="button" data-qty-step="1" aria-label="Increase quantity" ${disabled || value >= safeMax ? 'disabled' : ''}>${icon('plus', 'h-4 w-4')}</button>
    </div>`;
}

/** Clamps a stepper's value to its range and refreshes the +/- button states. */
function syncStepper(stepper) {
  const input = stepper.querySelector('[data-qty-input]');
  const min = Number(input.min) || 1;
  const max = Number(input.max) || STORE.maxQtyPerItem;
  const value = Math.max(min, Math.min(Math.floor(Number(input.value)) || min, max));
  input.value = value;
  if (!input.disabled) {
    stepper.querySelector('[data-qty-step="-1"]').disabled = value <= min;
    stepper.querySelector('[data-qty-step="1"]').disabled = value >= max;
  }
  return value;
}

/* ==========================================================================
   Header & footer (rendered into placeholders on every page)
   ========================================================================== */

function renderSearchForm(variant) {
  const id = `search-${variant}`;
  return `
    <form class="relative" role="search" action="products.html" method="get" data-search-form>
      <label for="${id}" class="sr-only">Search products</label>
      <span class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">${icon('search', 'h-[18px] w-[18px]')}</span>
      <input id="${id}" name="q" type="search" autocomplete="off" placeholder="Search products, brands…" class="search-input"
        role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="${id}-list">
      <div id="${id}-list" class="search-suggestions" role="listbox" aria-label="Product suggestions" hidden></div>
    </form>`;
}

function renderHeader() {
  const mount = document.querySelector('[data-component="header"]');
  if (!mount) return;
  const currentPage = document.body.dataset.page;
  const isCurrent = (link) => (link.page === currentPage ? 'aria-current="page"' : '');

  // outerHTML so the sticky <header> is a direct child of <body>.
  mount.outerHTML = `
    <div class="bg-slate-900 text-white">
      <div class="container flex min-h-[2.5rem] items-center justify-center gap-2 py-2 text-center text-xs font-medium sm:text-sm">
        ${icon('truck', 'hidden h-4 w-4 shrink-0 sm:block')}
        <p>Free shipping on orders over ${formatPrice(STORE.freeShippingThreshold)} · Use code <strong class="font-extrabold text-brand-200">SAVE10</strong> for 10% off</p>
      </div>
    </div>
    <header class="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-md" id="site-header">
      <div class="container flex h-16 items-center gap-1 lg:h-20 lg:gap-4">
        <button type="button" class="icon-btn -ml-2 lg:hidden" data-menu-toggle aria-controls="mobile-menu" aria-expanded="false" aria-label="Open menu">${icon('menu')}</button>
        <a href="index.html" class="flex shrink-0 items-center gap-2 rounded-lg" aria-label="${STORE.name} — home">
          ${LOGO_MARK}
          <span class="text-xl font-extrabold tracking-tight">${STORE.name}</span>
        </a>
        <nav class="ml-8 hidden items-center gap-7 lg:flex" aria-label="Primary">
          ${NAV_LINKS.map((link) => `<a href="${link.href}" class="nav-link" ${isCurrent(link)}>${link.label}</a>`).join('')}
        </nav>
        <div class="ml-auto hidden w-full max-w-xs md:block xl:max-w-sm">${renderSearchForm('desktop')}</div>
        <div class="ml-auto flex items-center md:ml-2">
          <button type="button" class="icon-btn md:hidden" data-search-toggle aria-controls="mobile-search" aria-expanded="false" aria-label="Search products">${icon('search')}</button>
          <button type="button" class="icon-btn hidden sm:inline-flex" data-account aria-label="Account">${icon('user')}</button>
          <button type="button" class="icon-btn" data-wishlist-open aria-label="Wishlist">
            ${icon('heart')}<span class="count-badge" data-wishlist-count hidden>0</span>
          </button>
          <a href="cart.html" class="icon-btn -mr-2" data-cart-link aria-label="Cart">
            ${icon('shopping-bag')}<span class="count-badge" data-cart-count hidden>0</span>
          </a>
        </div>
      </div>
      <div id="mobile-search" class="container border-t border-slate-200 py-3 md:hidden" hidden>${renderSearchForm('mobile')}</div>
      <div id="mobile-menu" class="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-slate-200 lg:hidden" hidden>
        <nav class="container py-4" aria-label="Mobile">
          <ul class="space-y-1">
            ${NAV_LINKS.map((link) => `
              <li><a href="${link.href}" ${isCurrent(link)} class="flex items-center justify-between rounded-xl px-3 py-3 text-base font-semibold hover:bg-slate-100 aria-[current=page]:bg-brand-50 aria-[current=page]:text-brand-700">${link.label}${icon('chevron-right', 'h-4 w-4 text-slate-400')}</a></li>`).join('')}
          </ul>
          <p class="mb-2 mt-5 px-3 text-xs font-bold uppercase tracking-wider text-slate-500">Shop by category</p>
          <ul class="grid grid-cols-2 gap-2">
            ${CATEGORIES.map((cat) => `
              <li><a href="products.html?category=${encodeURIComponent(cat.name)}" class="flex items-center gap-2 rounded-xl border border-slate-200 p-2 text-sm font-semibold hover:border-slate-900">
                <img src="${thumbUrl(cat.image, 96)}" alt="" class="h-9 w-9 rounded-lg object-cover" loading="lazy">${escapeHtml(cat.name)}</a></li>`).join('')}
          </ul>
          <button type="button" class="btn btn-outline btn-block mt-5 sm:hidden" data-account>${icon('user', 'h-4 w-4')} My account</button>
        </nav>
      </div>
    </header>`;
}

function renderNewsletterForm(idSuffix, dark = false) {
  const id = `newsletter-${idSuffix}`;
  return `
    <form data-newsletter-form novalidate class="${dark ? 'on-dark' : ''}">
      <label for="${id}" class="sr-only">Email address</label>
      <div class="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
        <input id="${id}" type="email" name="email" autocomplete="email" placeholder="you@example.com" class="form-input" aria-describedby="${id}-msg" required>
        <button type="submit" class="btn btn-primary shrink-0">Subscribe</button>
      </div>
      <p id="${id}-msg" class="form-message" role="status" aria-live="polite"></p>
    </form>`;
}

function renderFooter() {
  const mount = document.querySelector('[data-component="footer"]');
  if (!mount) return;
  const column = (title, links) => `
    <div>
      <h2 class="text-sm font-bold uppercase tracking-wider text-white">${title}</h2>
      <ul class="mt-4 space-y-3 text-sm">
        ${links.map(([label, href]) => `<li><a href="${href}" class="transition hover:text-white">${label}</a></li>`).join('')}
      </ul>
    </div>`;
  const socials = [
    ['instagram', 'Instagram', 'https://www.instagram.com/'],
    ['facebook', 'Facebook', 'https://www.facebook.com/'],
    ['twitter', 'X (Twitter)', 'https://x.com/'],
    ['youtube', 'YouTube', 'https://www.youtube.com/'],
  ];

  mount.outerHTML = `
    <footer class="bg-slate-950 text-slate-400">
      <div class="container py-14 lg:py-16">
        <div class="grid gap-12 lg:grid-cols-12">
          <div class="lg:col-span-4">
            <a href="index.html" class="inline-flex items-center gap-2 text-white">${LOGO_MARK}<span class="text-xl font-extrabold tracking-tight">${STORE.name}</span></a>
            <p class="mt-4 max-w-sm text-sm leading-relaxed">Thoughtfully chosen everyday essentials — from audio and accessories to home goods — delivered across India with easy returns.</p>
            <ul class="mt-6 space-y-2 text-sm">
              <li class="flex items-center gap-2">${icon('mail', 'h-4 w-4')}<a href="mailto:${STORE.email}" class="hover:text-white">${STORE.email}</a></li>
              <li class="flex items-center gap-2">${icon('phone', 'h-4 w-4')}<a href="tel:${STORE.phone.replace(/\s/g, '')}" class="hover:text-white">${STORE.phone}</a></li>
              <li class="text-xs text-slate-500">Placeholder contact details for this demo store.</li>
            </ul>
            <div class="mt-6 flex gap-2">
              ${socials.map(([name, label, href]) => `
                <a href="${href}" target="_blank" rel="noopener noreferrer" class="icon-btn !text-slate-300 ring-1 ring-white/10 hover:!bg-white/10 hover:!text-white" aria-label="${STORE.name} on ${label} (opens in new tab)">${icon(name, 'h-[18px] w-[18px]')}</a>`).join('')}
            </div>
          </div>
          <div class="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-5">
            ${column('Shop', [['All products', 'products.html'], ['New arrivals', 'products.html?sort=newest'], ['Best sellers', 'products.html?sort=bestselling'], ['On sale', 'products.html?sale=1'], ['Your cart', 'cart.html']])}
            ${column('Help', [['Contact us', 'contact.html'], ['FAQs', 'contact.html#faq'], ['Shipping info', 'about.html#shipping'], ['Returns & refunds', 'about.html#returns'], ['About us', 'about.html']])}
            ${column('Legal', [['Privacy policy', 'about.html#privacy'], ['Terms of service', 'about.html#terms'], ['Shipping policy', 'about.html#shipping'], ['Return policy', 'about.html#returns']])}
          </div>
          <div class="lg:col-span-3">
            <h2 class="text-sm font-bold uppercase tracking-wider text-white">Stay in the loop</h2>
            <p class="mt-4 text-sm">New drops, restocks and members-only offers. No spam, unsubscribe anytime.</p>
            <div class="mt-4">${renderNewsletterForm('footer', true)}</div>
            <ul class="mt-6 space-y-2 text-sm">
              <li class="flex items-center gap-2">${icon('truck', 'h-4 w-4 text-brand-300')}Free shipping over ${formatPrice(STORE.freeShippingThreshold)}</li>
              <li class="flex items-center gap-2">${icon('rotate-ccw', 'h-4 w-4 text-brand-300')}30-day easy returns</li>
            </ul>
          </div>
        </div>
        <div class="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>© <span data-year></span> ${STORE.name}. A frontend demo store — all products, prices and details are samples.</p>
          <p class="flex items-center gap-2">${icon('shield-check', 'h-4 w-4')} Demo checkout · No real payments are processed</p>
        </div>
      </div>
    </footer>`;
}

/* ==========================================================================
   Header behaviour: search suggestions, mobile menu & mobile search
   ========================================================================== */

function highlightMatch(text, term) {
  const index = text.toLowerCase().indexOf(term.toLowerCase());
  if (!term || index < 0) return escapeHtml(text);
  return `${escapeHtml(text.slice(0, index))}<mark>${escapeHtml(text.slice(index, index + term.length))}</mark>${escapeHtml(text.slice(index + term.length))}`;
}

function initSearchForm(form) {
  const input = form.querySelector('input[type="search"]');
  const list = form.querySelector('[role="listbox"]');
  let activeIndex = -1;

  const options = () => [...list.querySelectorAll('[role="option"]')];

  const close = () => {
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    activeIndex = -1;
  };

  const setActive = (index) => {
    activeIndex = index;
    options().forEach((option, i) => {
      const active = i === index;
      option.setAttribute('aria-selected', String(active));
      if (active) {
        input.setAttribute('aria-activedescendant', option.id);
        option.scrollIntoView({ block: 'nearest' });
      }
    });
  };

  const render = () => {
    const term = input.value.trim();
    if (!term) return close();
    const results = searchProducts(term).slice(0, 6);

    list.innerHTML = results.length
      ? results.map((product, i) => `
          <a id="${list.id}-option-${i}" role="option" aria-selected="false" tabindex="-1" href="product-details.html?id=${product.id}" class="suggestion">
            <img src="${thumbUrl(product.image, 120)}" alt="" class="h-11 w-11 shrink-0 rounded-lg bg-slate-100 object-cover">
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-semibold">${highlightMatch(product.name, term)}</span>
              <span class="block text-xs text-slate-500">${escapeHtml(product.category)} · ${escapeHtml(product.brand)}</span>
            </span>
            <span class="text-sm font-bold">${formatPrice(product.price)}</span>
          </a>`).join('') + `
          <a href="products.html?q=${encodeURIComponent(term)}" class="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm font-semibold text-brand-600 hover:bg-slate-50">
            See all results for “${escapeHtml(term)}” ${icon('arrow-right', 'h-4 w-4')}
          </a>`
      : `<p class="px-4 py-5 text-sm text-slate-500">No products match “${escapeHtml(term)}”. Try “headphones”, “bag” or “Beauty”.</p>`;

    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    activeIndex = -1;
    refreshIcons();
  };

  input.addEventListener('input', debounce(render, 120));
  input.addEventListener('focus', () => input.value.trim() && render());

  input.addEventListener('keydown', (event) => {
    const items = options();
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (list.hidden) return render();
      if (!items.length) return;
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((activeIndex + step + items.length) % items.length);
    } else if (event.key === 'Escape') {
      close();
    } else if (event.key === 'Enter' && activeIndex >= 0 && items[activeIndex]) {
      event.preventDefault();
      window.location.href = items[activeIndex].href;
    }
  });

  // Empty searches stay on the page; otherwise the form submits to products.html?q=…
  form.addEventListener('submit', (event) => {
    if (!input.value.trim()) {
      event.preventDefault();
      input.focus();
    }
  });

  document.addEventListener('click', (event) => {
    if (!form.contains(event.target)) close();
  });
}

function initMobileMenu() {
  const toggle = document.querySelector('[data-menu-toggle]');
  const menu = document.getElementById('mobile-menu');
  if (!toggle || !menu) return;

  const setOpen = (open) => {
    menu.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    toggle.innerHTML = icon(open ? 'x' : 'menu');
    refreshIcons();
  };

  toggle.addEventListener('click', () => setOpen(menu.hidden));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !menu.hidden) {
      setOpen(false);
      toggle.focus();
    }
  });
  window.matchMedia('(min-width: 1024px)').addEventListener('change', (event) => {
    if (event.matches) setOpen(false);
  });
}

function initMobileSearch() {
  const toggle = document.querySelector('[data-search-toggle]');
  const panel = document.getElementById('mobile-search');
  if (!toggle || !panel) return;
  toggle.addEventListener('click', () => {
    const open = panel.hidden;
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    if (open) panel.querySelector('input').focus();
  });
}

/* ==========================================================================
   Overlays (quick view modal, wishlist drawer) with focus management
   ========================================================================== */

const Overlay = {
  active: null,
  returnFocus: null,

  focusableIn(element) {
    return [...element.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
      .filter((node) => node.offsetParent !== null);
  },

  open(element) {
    if (this.active && this.active !== element) this.close(this.active, false);
    clearTimeout(element._hideTimer);
    if (!this.active) this.returnFocus = document.activeElement;
    element.hidden = false;
    void element.offsetWidth; // force reflow so the opening transition runs
    element.classList.add('is-open');
    document.body.classList.add('has-overlay');
    this.active = element;
    const focusable = this.focusableIn(element);
    (focusable[0] || element).focus();
  },

  close(element = this.active, restoreFocus = true) {
    if (!element) return;
    element.classList.remove('is-open');
    element._hideTimer = setTimeout(() => { element.hidden = true; }, 260);
    if (this.active === element) this.active = null;
    document.body.classList.remove('has-overlay');
    if (restoreFocus && this.returnFocus && document.contains(this.returnFocus)) this.returnFocus.focus();
  },

  /** Escape closes; Tab is trapped inside the open overlay. */
  handleKeydown(event) {
    if (!Overlay.active) return;
    if (event.key === 'Escape') {
      Overlay.close();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = Overlay.focusableIn(Overlay.active);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  },
};

function createOverlay(id, labelledBy, panelClass) {
  let element = document.getElementById(id);
  if (element) return element;
  element = document.createElement('div');
  element.id = id;
  element.className = 'overlay';
  element.hidden = true;
  element.setAttribute('role', 'dialog');
  element.setAttribute('aria-modal', 'true');
  element.setAttribute('aria-labelledby', labelledBy);
  element.innerHTML = `<div class="overlay__backdrop" data-close-overlay></div><div class="${panelClass}" data-overlay-body></div>`;
  document.body.appendChild(element);
  return element;
}

function openQuickView(productId) {
  const product = getProductById(productId);
  if (!product) {
    showToast('Sorry, that product could not be found.', 'error');
    return;
  }
  const overlay = createOverlay('quick-view', 'quick-view-title', 'modal__panel');
  const inStock = isInStock(product);
  const wished = Wishlist.has(product.id);

  overlay.querySelector('[data-overlay-body]').innerHTML = `
    <button type="button" class="icon-btn absolute right-3 top-3 z-10 bg-white/90 shadow-soft" data-close-overlay aria-label="Close quick view">${icon('x')}</button>
    <div class="grid md:grid-cols-2">
      <div class="aspect-square bg-slate-100 md:aspect-auto">
        <img src="${product.image}" alt="${escapeHtml(product.name)}" class="h-full w-full object-cover md:min-h-[28rem]">
      </div>
      <form class="flex flex-col p-6 sm:p-8" data-quick-view-form novalidate>
        <p class="text-xs font-bold uppercase tracking-wider text-brand-600">${escapeHtml(product.brand)} · ${escapeHtml(product.category)}</p>
        <h2 id="quick-view-title" class="mt-2 pr-8 text-2xl font-extrabold leading-tight">${escapeHtml(product.name)}</h2>
        <div class="mt-2">${renderStars(product.rating, { count: product.reviewCount, showValue: true })}</div>
        <div class="mt-4">${renderPrice(product, 'lg')}</div>
        <p class="mt-4 line-clamp-4 text-sm leading-relaxed text-slate-600">${escapeHtml(product.description)}</p>
        <div class="mt-5 space-y-4">${renderVariantOptions(product, 'qv')}</div>
        <p class="mt-5 text-sm">${renderStockStatus(product)}</p>
        <div class="mt-5 flex flex-wrap items-center gap-3">
          ${renderQtyStepper({ id: 'qv-qty', max: Cart.maxQtyFor(product), disabled: !inStock })}
          <button type="submit" class="btn btn-primary flex-1" ${inStock ? '' : 'disabled'}>${icon('shopping-bag', 'h-4 w-4')} ${inStock ? 'Add to cart' : 'Out of stock'}</button>
          <button type="button" class="icon-btn wishlist-btn ring-1 ring-slate-200" data-wishlist-toggle="${product.id}" aria-pressed="${wished}" aria-label="${escapeHtml(wishlistLabel(product, wished))}">${icon('heart', 'h-5 w-5')}</button>
        </div>
        <a href="product-details.html?id=${product.id}" class="mt-6 inline-flex items-center gap-1 self-start text-sm font-bold text-brand-600 hover:underline">View full details ${icon('arrow-right', 'h-4 w-4')}</a>
      </form>
    </div>`;

  overlay.querySelector('[data-quick-view-form]').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const qty = Number(form.querySelector('[data-qty-input]').value);
    const result = Cart.add(product.id, qty, readVariantSelection(form, 'qv'));
    showToast(result.message, result.ok ? 'success' : 'error', result.ok ? { label: 'View cart', href: 'cart.html' } : null);
    if (result.ok) Overlay.close();
  });

  refreshIcons();
  Overlay.open(overlay);
}

function renderWishlistDrawer() {
  const overlay = createOverlay('wishlist-drawer', 'wishlist-title', 'drawer__panel');
  const products = Wishlist.read().map(getProductById);

  overlay.querySelector('[data-overlay-body]').innerHTML = `
    <div class="flex items-center justify-between border-b border-slate-200 px-5 py-4">
      <h2 id="wishlist-title" class="text-lg font-extrabold">Wishlist <span class="text-slate-400">(${products.length})</span></h2>
      <button type="button" class="icon-btn" data-close-overlay aria-label="Close wishlist">${icon('x')}</button>
    </div>
    <div class="flex-1 overflow-y-auto px-5 py-4">
      ${products.length ? `
        <ul class="divide-y divide-slate-100">
          ${products.map((product) => `
            <li class="flex gap-4 py-4">
              <a href="product-details.html?id=${product.id}" class="shrink-0"><img src="${thumbUrl(product.image, 200)}" alt="${escapeHtml(product.name)}" class="h-20 w-20 rounded-xl bg-slate-100 object-cover"></a>
              <div class="min-w-0 flex-1">
                <a href="product-details.html?id=${product.id}" class="line-clamp-2 text-sm font-bold hover:text-brand-600">${escapeHtml(product.name)}</a>
                <p class="mt-1 text-sm font-extrabold">${formatPrice(product.price)}</p>
                <div class="mt-2 flex flex-wrap gap-2">
                  <button type="button" class="btn btn-dark btn-sm" data-add-to-cart="${product.id}" ${isInStock(product) ? '' : 'disabled'}>${isInStock(product) ? 'Add to cart' : 'Out of stock'}</button>
                  <button type="button" class="btn btn-ghost btn-sm" data-wishlist-remove="${product.id}">Remove<span class="sr-only"> ${escapeHtml(product.name)}</span></button>
                </div>
              </div>
            </li>`).join('')}
        </ul>` : `
        <div class="flex h-full flex-col items-center justify-center py-16 text-center">
          <span class="flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-500">${icon('heart', 'h-7 w-7')}</span>
          <p class="mt-4 font-bold">Your wishlist is empty</p>
          <p class="mt-1 max-w-xs text-sm text-slate-500">Tap the heart on any product to save it for later.</p>
        </div>`}
    </div>
    <div class="border-t border-slate-200 p-5">
      <a href="products.html" class="btn btn-outline btn-block">Continue shopping</a>
    </div>`;
  refreshIcons();
  return overlay;
}

/* ==========================================================================
   Toast notifications
   ========================================================================== */

function showToast(message, type = 'success', action = null) {
  let root = document.getElementById('toast-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'toast-root';
    root.setAttribute('aria-live', 'polite');
    root.setAttribute('role', 'status');
    document.body.appendChild(root);
  }
  const icons = { success: 'circle-check', error: 'circle-alert', info: 'info', wishlist: 'heart' };
  const colours = { success: 'text-emerald-400', error: 'text-rose-400', info: 'text-sky-400', wishlist: 'text-rose-400' };

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    ${icon(icons[type] || icons.info, `h-5 w-5 shrink-0 ${colours[type] || ''}`)}
    <span>${escapeHtml(message)}</span>
    ${action ? `<a href="${action.href}">${escapeHtml(action.label)}</a>` : ''}`;
  root.appendChild(toast);
  refreshIcons();

  // Keep at most three toasts on screen.
  while (root.children.length > 3) root.firstElementChild.remove();

  setTimeout(() => {
    toast.classList.add('is-leaving');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
    setTimeout(() => toast.remove(), 400); // fallback when animations are disabled
  }, 3800);
}

/* ==========================================================================
   Global state sync & event delegation
   ========================================================================== */

function setBadge(selector, count) {
  document.querySelectorAll(selector).forEach((badge) => {
    const previous = Number(badge.textContent) || 0;
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.hidden = count === 0;
    if (count > previous) {
      badge.classList.remove('is-bump');
      void badge.offsetWidth;
      badge.classList.add('is-bump');
    }
  });
}

function updateCounts() {
  const cartCount = Cart.count();
  const wishlistCount = Wishlist.read().length;
  setBadge('[data-cart-count]', cartCount);
  setBadge('[data-wishlist-count]', wishlistCount);
  document.querySelectorAll('[data-cart-link]').forEach((link) => {
    link.setAttribute('aria-label', `Cart, ${cartCount} ${cartCount === 1 ? 'item' : 'items'}`);
  });
  document.querySelectorAll('[data-wishlist-open]').forEach((button) => {
    button.setAttribute('aria-label', `Wishlist, ${wishlistCount} ${wishlistCount === 1 ? 'item' : 'items'}`);
  });
}

function syncWishlistButtons() {
  const ids = Wishlist.read();
  document.querySelectorAll('[data-wishlist-toggle]').forEach((button) => {
    const product = getProductById(button.dataset.wishlistToggle);
    if (!product) return;
    const active = ids.includes(product.id);
    button.setAttribute('aria-pressed', String(active));
    button.setAttribute('aria-label', wishlistLabel(product, active));
    const text = button.querySelector('[data-wishlist-text]');
    if (text) text.textContent = active ? 'Saved to wishlist' : 'Add to wishlist';
  });
}

function handleAddToCart(productId) {
  const result = Cart.add(productId, 1);
  showToast(result.message, result.ok ? 'success' : 'error', result.ok ? { label: 'View cart', href: 'cart.html' } : null);
}

function handleWishlistToggle(productId) {
  const product = getProductById(productId);
  if (!product) return;
  const added = Wishlist.toggle(product.id);
  showToast(added ? `${product.name} saved to your wishlist.` : `${product.name} removed from your wishlist.`, 'wishlist');
}

function bindGlobalEvents() {
  document.addEventListener('click', (event) => {
    const target = event.target;
    let el;

    if ((el = target.closest('[data-add-to-cart]'))) return handleAddToCart(el.dataset.addToCart);
    if ((el = target.closest('[data-wishlist-toggle]'))) return handleWishlistToggle(el.dataset.wishlistToggle);
    if ((el = target.closest('[data-quick-view]'))) return openQuickView(el.dataset.quickView);
    if ((el = target.closest('[data-wishlist-remove]'))) {
      Wishlist.remove(el.dataset.wishlistRemove);
      return showToast('Removed from your wishlist.', 'wishlist');
    }
    if (target.closest('[data-wishlist-open]')) return Overlay.open(renderWishlistDrawer());
    if (target.closest('[data-close-overlay]')) return Overlay.close();
    if (target.closest('[data-account]')) {
      return showToast('Accounts need a backend. In this demo, your cart and wishlist are saved in this browser.', 'info');
    }
    if ((el = target.closest('[data-qty-step]'))) {
      const stepper = el.closest('[data-qty-stepper]');
      const input = stepper.querySelector('[data-qty-input]');
      input.value = Number(input.value) + Number(el.dataset.qtyStep);
      syncStepper(stepper);
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });

  // Capture phase so values are clamped before page-level listeners read them.
  document.addEventListener('change', (event) => {
    const stepper = event.target.closest('[data-qty-stepper]');
    if (stepper && event.target.matches('[data-qty-input]')) syncStepper(stepper);

    // Keep "Colour: Black" style labels in sync with the selected option.
    if (event.target.matches('.option-pill input')) {
      const label = event.target.closest('fieldset')?.querySelector('[data-selected-label]');
      if (label) label.textContent = event.target.value;
    }
  }, true);

  document.addEventListener('keydown', Overlay.handleKeydown);

  window.addEventListener('cart:updated', updateCounts);
  window.addEventListener('wishlist:updated', () => {
    updateCounts();
    syncWishlistButtons();
    const drawer = document.getElementById('wishlist-drawer');
    if (drawer && !drawer.hidden) renderWishlistDrawer();
  });

  // Keep multiple open tabs in sync.
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEYS.cart || event.key === STORAGE_KEYS.coupon) emit('cart:updated');
    if (event.key === STORAGE_KEYS.wishlist) emit('wishlist:updated');
  });
}

function initNewsletterForms() {
  document.querySelectorAll('[data-newsletter-form]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const input = form.querySelector('input[type="email"]');
      const message = form.querySelector('.form-message');
      const email = input.value.trim();
      let error = '';
      if (!email) error = 'Please enter your email address.';
      else if (!isValidEmail(email)) error = 'Please enter a valid email address, like name@example.com.';

      input.setAttribute('aria-invalid', String(Boolean(error)));
      message.className = `form-message ${error ? 'is-error' : 'is-success'}`;
      message.textContent = error || 'Thanks for subscribing! (Demo only — connect an email service to send real newsletters.)';
      if (error) input.focus();
      else form.reset();
    });
  });
}

/* ==========================================================================
   Image fallbacks
   ========================================================================== */

function applyImageFallback(img) {
  if (img.dataset.fallback === 'applied') return;
  img.dataset.fallback = 'applied';
  img.src = FALLBACK_IMAGE;
}

// Capture phase catches errors from images added later (cards, modals, etc.).
document.addEventListener('error', (event) => {
  if (event.target instanceof HTMLImageElement) applyImageFallback(event.target);
}, true);

function fixAlreadyBrokenImages() {
  document.querySelectorAll('img').forEach((img) => {
    if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) applyImageFallback(img);
  });
}

/* ==========================================================================
   Init
   ========================================================================== */

function initSite() {
  renderHeader();
  renderFooter();
  document.querySelectorAll('[data-search-form]').forEach(initSearchForm);
  initMobileMenu();
  initMobileSearch();
  initNewsletterForms();
  bindGlobalEvents();
  updateCounts();
  document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
  refreshIcons();
  fixAlreadyBrokenImages();

  // The injected header shifts content, so re-align links like about.html#privacy.
  if (window.location.hash.length > 1) {
    const target = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
    if (target) requestAnimationFrame(() => target.scrollIntoView());
  }
}

document.addEventListener('DOMContentLoaded', initSite);
