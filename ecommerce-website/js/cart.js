/**
 * cart.js
 * Renders cart.html: line items, quantity updates, remove / save for later,
 * coupon codes, order summary, empty state and recommendations.
 * All state lives in the shared Cart / Coupons / Wishlist objects (main.js).
 */
'use strict';

const cartEls = {};

function renderShippingProgress(totals) {
  const remaining = totals.amountToFreeShipping;
  const percent = Math.min(100, (totals.subtotal / STORE.freeShippingThreshold) * 100);
  cartEls.shippingProgress.innerHTML = `
    <p class="flex items-center gap-2 text-sm font-semibold text-brand-900">
      ${icon(remaining > 0 ? 'truck' : 'party-popper', 'h-4 w-4 shrink-0')}
      ${remaining > 0
        ? `You're ${formatPrice(remaining)} away from free standard shipping.`
        : 'Nice! Your order qualifies for free standard shipping.'}
    </p>
    <div class="mt-3 h-2 overflow-hidden rounded-full bg-white" role="progressbar" aria-label="Progress to free shipping" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(percent)}">
      <div class="h-full rounded-full bg-brand-600 transition-all duration-500" style="width:${percent}%"></div>
    </div>`;
}

function renderCartItem(item) {
  const { product } = item;
  const key = escapeHtml(item.key);
  const variants = [item.color && `Colour: ${escapeHtml(item.color)}`, item.size && `Size: ${escapeHtml(item.size)}`].filter(Boolean).join(' · ');
  const url = `product-details.html?id=${product.id}`;
  const maxQty = Cart.maxQtyFor(product);

  return `
    <li class="flex gap-4 py-6 sm:gap-6" data-cart-key="${key}">
      <a href="${url}" class="shrink-0" tabindex="-1" aria-hidden="true">
        <img src="${thumbUrl(product.image, 320)}" alt="" class="h-24 w-24 rounded-2xl bg-slate-100 object-cover sm:h-32 sm:w-32" loading="lazy">
      </a>
      <div class="flex min-w-0 flex-1 flex-col">
        <div class="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4">
          <div class="min-w-0">
            <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">${escapeHtml(product.brand)}</p>
            <h3 class="mt-0.5 font-bold leading-snug"><a href="${url}" class="hover:text-brand-600">${escapeHtml(product.name)}</a></h3>
            ${variants ? `<p class="mt-1 text-sm text-slate-500">${variants}</p>` : ''}
            <p class="mt-1 text-sm">
              <span class="font-semibold">${formatPrice(product.price)}</span>
              ${product.originalPrice > product.price ? `<span class="ml-1 text-slate-400 line-through">${formatPrice(product.originalPrice)}</span>` : ''}
              <span class="text-slate-500"> each</span>
            </p>
            ${product.stock <= 5 ? `<p class="mt-1 text-xs font-semibold text-amber-600">Only ${product.stock} left in stock</p>` : ''}
          </div>
          <p class="text-lg font-extrabold sm:text-right"><span class="sr-only">Line total: </span>${formatPrice(item.lineTotal)}</p>
        </div>
        <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
          ${renderQtyStepper({ id: `qty-${product.id}-${item.key.replace(/[^a-z0-9]/gi, '')}`, value: item.qty, max: maxQty, label: `Quantity for ${product.name}` })}
          <div class="flex flex-wrap gap-1">
            <button type="button" class="btn btn-ghost btn-sm" data-save-for-later="${key}">${icon('heart', 'h-4 w-4')} Save for later<span class="sr-only">: ${escapeHtml(product.name)}</span></button>
            <button type="button" class="btn btn-ghost-danger btn-sm" data-remove-item="${key}">${icon('trash-2', 'h-4 w-4')} Remove<span class="sr-only">: ${escapeHtml(product.name)}</span></button>
          </div>
        </div>
      </div>
    </li>`;
}

function renderCouponState(totals) {
  const applied = cartEls.appliedCoupon;
  if (totals.couponCode) {
    applied.hidden = false;
    applied.innerHTML = `
      <div class="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <p class="flex items-center gap-2 text-sm font-semibold text-emerald-800">${icon('tag', 'h-4 w-4')} ${escapeHtml(totals.couponCode)} applied</p>
        <button type="button" class="text-sm font-bold text-emerald-800 underline underline-offset-2 hover:text-emerald-950" id="remove-coupon">Remove<span class="sr-only"> coupon ${escapeHtml(totals.couponCode)}</span></button>
      </div>`;
  } else if (totals.pendingCoupon) {
    // Coupon saved but currently not eligible (e.g. below its minimum order).
    applied.hidden = false;
    applied.innerHTML = `
      <div class="flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <p class="text-sm font-medium text-amber-800">${icon('circle-alert', 'mr-1 inline h-4 w-4 align-[-3px]')} ${escapeHtml(totals.couponMessage)}</p>
        <button type="button" class="shrink-0 text-sm font-bold text-amber-800 underline underline-offset-2" id="remove-coupon">Remove</button>
      </div>`;
  } else {
    applied.hidden = true;
    applied.innerHTML = '';
  }
  document.getElementById('remove-coupon')?.addEventListener('click', () => {
    Coupons.remove();
    setCouponMessage('Coupon removed.', false);
  });
}

function setCouponMessage(text, isError) {
  cartEls.couponMsg.className = `form-message ${isError ? 'is-error' : 'is-success'}`;
  cartEls.couponMsg.textContent = text;
  cartEls.couponInput.setAttribute('aria-invalid', String(Boolean(isError)));
}

function renderRecommendations() {
  const inCart = new Set(Cart.read().map((item) => item.id));
  const picks = PRODUCTS
    .filter((p) => !inCart.has(p.id) && isInStock(p))
    .sort((a, b) => Number(b.bestseller || b.featured) - Number(a.bestseller || a.featured) || b.rating - a.rating)
    .slice(0, 4);
  renderProductGrid(cartEls.recommended, picks);
}

/** Captures which control had focus so it can be restored after a re-render. */
function captureFocus() {
  const active = document.activeElement;
  const row = active?.closest?.('[data-cart-key]');
  if (!row) return null;
  let selector = null;
  if (active.matches('[data-qty-step]')) selector = `[data-qty-step="${active.dataset.qtyStep}"]`;
  else if (active.matches('[data-qty-input]')) selector = '[data-qty-input]';
  return selector ? { key: row.dataset.cartKey, selector } : null;
}

function restoreFocus(saved) {
  if (!saved) return;
  const row = [...cartEls.items.querySelectorAll('[data-cart-key]')].find((el) => el.dataset.cartKey === saved.key);
  if (!row) return;
  const target = row.querySelector(saved.selector);
  (target && !target.disabled ? target : row.querySelector('[data-qty-input]'))?.focus();
}

function renderCart() {
  const items = Cart.getDetailedItems();
  const totals = calculateOrderTotals(items, 'standard');
  const isEmpty = items.length === 0;

  cartEls.content.hidden = isEmpty;
  cartEls.empty.hidden = !isEmpty;
  cartEls.headingCount.textContent = isEmpty ? '' : `(${totals.itemCount})`;
  document.title = isEmpty ? `Your Cart — ${STORE.name}` : `Your Cart (${totals.itemCount}) — ${STORE.name}`;

  if (!isEmpty) {
    const focus = captureFocus();
    cartEls.items.innerHTML = items.map(renderCartItem).join('');
    renderShippingProgress(totals);
    cartEls.summary.innerHTML = renderTotalsRows(totals);
    renderCouponState(totals);
    restoreFocus(focus);
  }

  cartEls.checkoutBtn.setAttribute('aria-disabled', String(isEmpty));
  renderRecommendations();
  refreshIcons();
}

function initCart() {
  Object.assign(cartEls, {
    content: document.getElementById('cart-content'),
    empty: document.getElementById('cart-empty'),
    items: document.getElementById('cart-items'),
    itemsTitle: document.getElementById('cart-items-title'),
    summary: document.getElementById('summary-lines'),
    shippingProgress: document.getElementById('shipping-progress'),
    headingCount: document.getElementById('cart-heading-count'),
    couponForm: document.getElementById('coupon-form'),
    couponInput: document.getElementById('coupon-code'),
    couponMsg: document.getElementById('coupon-msg'),
    appliedCoupon: document.getElementById('applied-coupon'),
    checkoutBtn: document.getElementById('checkout-btn'),
    recommended: document.getElementById('recommended-grid'),
  });

  renderCart();
  window.addEventListener('cart:updated', renderCart);

  // Quantity changes (stepper buttons dispatch "change" on the input).
  cartEls.items.addEventListener('change', (event) => {
    if (!event.target.matches('[data-qty-input]')) return;
    const key = event.target.closest('[data-cart-key]').dataset.cartKey;
    Cart.setQty(key, event.target.value);
  });

  cartEls.items.addEventListener('click', (event) => {
    const removeBtn = event.target.closest('[data-remove-item]');
    const saveBtn = event.target.closest('[data-save-for-later]');
    if (!removeBtn && !saveBtn) return;

    const key = (removeBtn || saveBtn).closest('[data-cart-key]').dataset.cartKey;
    const item = Cart.read().find((entry) => entry.key === key);
    if (!item) return;
    const product = getProductById(item.id);

    if (saveBtn) Wishlist.add(item.id);
    Cart.remove(key);
    showToast(saveBtn ? `${product.name} moved to your wishlist.` : `${product.name} removed from your cart.`, saveBtn ? 'wishlist' : 'info');
    // Keep keyboard focus in a sensible place after the row disappears.
    (Cart.count() ? cartEls.itemsTitle : cartEls.empty.querySelector('h2'))?.focus?.();
  });

  document.getElementById('clear-cart').addEventListener('click', () => {
    if (!window.confirm('Remove all items from your cart?')) return;
    Cart.clear();
    showToast('Your cart has been cleared.', 'info');
  });

  cartEls.couponForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const subtotal = Cart.getDetailedItems().reduce((sum, item) => sum + item.lineTotal, 0);
    const result = Coupons.apply(cartEls.couponInput.value, subtotal);
    setCouponMessage(result.message, !result.ok);
    if (result.ok) cartEls.couponInput.value = '';
  });

  // Guard: never allow checkout with an empty cart.
  cartEls.checkoutBtn.addEventListener('click', (event) => {
    if (Cart.count() === 0) {
      event.preventDefault();
      showToast('Your cart is empty — add a product before checking out.', 'error');
    }
  });
}

document.addEventListener('DOMContentLoaded', initCart);
