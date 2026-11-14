/**
 * checkout.js
 * Three-step demo checkout: Information → Shipping → Payment.
 * Validates every field inline, recalculates totals with the selected shipping
 * method, and shows a confirmation screen with a generated demo order number.
 *
 * Privacy note: no payment details are requested, collected or stored.
 * Only a minimal order summary (no payment data) is saved for the confirmation.
 */
'use strict';

const checkoutState = {
  step: 1,
  shippingMethod: 'standard',
  orderPlaced: false,
};

const PAYMENT_NOTES = {
  cod: { icon: 'banknote', text: 'Pay in cash or by UPI to the delivery partner when your order arrives. No advance payment is needed.' },
  upi: { icon: 'info', text: 'Demo only: a live store would hand off to a payment gateway (e.g. Razorpay or Cashfree) to open your UPI app. No payment request will be sent.' },
  card: { icon: 'shield-alert', text: 'Demo only: card payments need a PCI-compliant gateway such as Razorpay or Stripe. For your security, this demo does not show or collect any card number fields.' },
};

/* ---------- Validation rules ---------- */

const POSTAL_PATTERNS = {
  IN: { pattern: /^[1-9]\d{5}$/, example: '560038' },
  US: { pattern: /^\d{5}(-\d{4})?$/, example: '94105' },
  GB: { pattern: /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i, example: 'SW1A 1AA' },
  CA: { pattern: /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i, example: 'K1A 0B1' },
  AU: { pattern: /^\d{4}$/, example: '2000' },
  SG: { pattern: /^\d{6}$/, example: '018956' },
  AE: { pattern: /^[A-Z0-9\s-]{0,10}$/i, example: '00000', optional: true },
};

const getCountry = () => document.getElementById('country').value;
const NAME_PATTERN = /^[\p{L}][\p{L}\s.'-]*$/u;

function validatePostal(value) {
  const rule = POSTAL_PATTERNS[getCountry()] || { pattern: /^[A-Z0-9\s-]{3,10}$/i, example: '12345' };
  if (!value) return rule.optional ? '' : 'Please enter your postal code.';
  return rule.pattern.test(value) ? '' : `Please enter a valid postal code, e.g. ${rule.example}.`;
}

/** Field id → validator returning an error message ('' when valid). */
const VALIDATORS = {
  fullName: (v) => {
    if (!v) return 'Please enter your full name.';
    if (v.length < 2 || !NAME_PATTERN.test(v)) return 'Please enter a valid name using letters only.';
    return '';
  },
  email: (v) => {
    if (!v) return 'Please enter your email address.';
    return isValidEmail(v) ? '' : 'Please enter a valid email address, e.g. name@example.com.';
  },
  phone: (v) => {
    if (!v) return 'Please enter your phone number.';
    const digits = v.replace(/[\s()-]/g, '');
    if (getCountry() === 'IN') {
      return /^(\+91|0)?[6-9]\d{9}$/.test(digits) ? '' : 'Please enter a valid 10-digit Indian mobile number, e.g. 98765 43210.';
    }
    return /^\+?\d{7,15}$/.test(digits) ? '' : 'Please enter a valid phone number (7–15 digits).';
  },
  address: (v) => {
    if (!v) return 'Please enter your street address.';
    return v.length < 5 ? 'Your address looks too short — please add more detail.' : '';
  },
  city: (v) => {
    if (!v) return 'Please enter your city.';
    return NAME_PATTERN.test(v) ? '' : 'Please enter a valid city name.';
  },
  state: (v) => (v ? '' : 'Please enter your state or region.'),
  postalCode: (v) => validatePostal(v),
  country: (v) => (v ? '' : 'Please select your country.'),
  billingName: (v) => VALIDATORS.fullName(v),
  billingAddress: (v) => VALIDATORS.address(v),
  billingCity: (v) => VALIDATORS.city(v),
  billingPostal: (v) => validatePostal(v),
};

const STEP_FIELDS = {
  1: ['fullName', 'email', 'phone', 'address', 'city', 'state', 'postalCode', 'country'],
  2: [],
  3: ['billingName', 'billingAddress', 'billingCity', 'billingPostal'],
};

function setFieldError(id, message) {
  const field = document.getElementById(id);
  const error = document.getElementById(`${id}-error`);
  if (field) field.setAttribute('aria-invalid', String(Boolean(message)));
  if (error) error.innerHTML = message ? `${icon('circle-alert', 'h-4 w-4 shrink-0')}<span>${escapeHtml(message)}</span>` : '';
  if (message) refreshIcons();
}

function validateField(id) {
  const field = document.getElementById(id);
  if (!field || !VALIDATORS[id]) return true;
  // Billing fields only matter when "same as shipping" is unchecked.
  if (id.startsWith('billing') && document.getElementById('billingSame').checked) {
    setFieldError(id, '');
    return true;
  }
  const message = VALIDATORS[id](field.value.trim());
  setFieldError(id, message);
  return !message;
}

function validateTerms() {
  const terms = document.getElementById('terms');
  const message = terms.checked ? '' : 'Please accept the terms to place your order.';
  setFieldError('terms', message);
  return !message;
}

/** Validates all fields for a step; focuses the first invalid one. */
function validateStep(step) {
  const invalid = STEP_FIELDS[step].filter((id) => !validateField(id));
  if (step === 3 && !validateTerms()) invalid.push('terms');
  if (invalid.length) {
    document.getElementById(invalid[0]).focus();
    showToast(`Please fix ${invalid.length} ${invalid.length === 1 ? 'field' : 'fields'} to continue.`, 'error');
    return false;
  }
  return true;
}

/* ---------- Rendering ---------- */

function getCheckoutItems() {
  return Cart.getDetailedItems();
}

function renderSummary() {
  const items = getCheckoutItems();
  const totals = calculateOrderTotals(items, checkoutState.shippingMethod);

  document.getElementById('checkout-items').innerHTML = items.map((item) => `
    <li class="flex items-center gap-4 py-3">
      <span class="relative shrink-0">
        <img src="${thumbUrl(item.product.image, 160)}" alt="" class="h-16 w-16 rounded-xl bg-slate-100 object-cover">
        <span class="absolute -right-2 -top-2 flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-slate-700 px-1.5 text-xs font-bold text-white" aria-label="Quantity ${item.qty}">${item.qty}</span>
      </span>
      <span class="min-w-0 flex-1">
        <span class="block truncate text-sm font-bold">${escapeHtml(item.product.name)}</span>
        <span class="block text-xs text-slate-500">${[item.color, item.size].filter(Boolean).map(escapeHtml).join(' · ') || escapeHtml(item.product.category)}</span>
      </span>
      <span class="text-sm font-bold">${formatPrice(item.lineTotal)}</span>
    </li>`).join('');

  document.getElementById('checkout-totals').innerHTML = renderTotalsRows(totals);
  document.getElementById('place-order-label').textContent = `Place order · ${formatPrice(totals.total)}`;
  return totals;
}

function renderShippingMethods() {
  const subtotal = getCheckoutItems().reduce((sum, item) => sum + item.lineTotal, 0);
  const freeShipCoupon = calculateOrderTotals(getCheckoutItems(), 'express').couponCode === 'FREESHIP';

  document.getElementById('shipping-methods').innerHTML = SHIPPING_METHODS.map((method) => {
    const cost = freeShipCoupon ? 0 : getShippingCost(method, subtotal);
    return `
      <label class="radio-card">
        <input type="radio" name="shippingMethod" value="${method.id}" ${method.id === checkoutState.shippingMethod ? 'checked' : ''}>
        <span class="flex-1">
          <span class="flex items-center justify-between gap-3">
            <span class="font-bold">${method.name}</span>
            <span class="font-extrabold">${cost === 0 ? '<span class="text-emerald-600">Free</span>' : formatPrice(cost)}</span>
          </span>
          <span class="mt-1 block text-sm text-slate-500">${method.description} · Arrives ${getDeliveryEstimate(method.id)}</span>
          ${method.freeAbove && cost > 0 ? `<span class="mt-1 block text-xs text-slate-400">Free on orders over ${formatPrice(method.freeAbove)}</span>` : ''}
        </span>
      </label>`;
  }).join('');
}

function renderShipToReview() {
  const value = (id) => escapeHtml(document.getElementById(id).value.trim());
  const countryName = document.getElementById('country').selectedOptions[0].textContent;
  document.getElementById('ship-to-review').innerHTML = `
    <div class="flex items-start justify-between gap-4">
      <p><span class="font-bold">Ship to:</span> ${value('fullName')}, ${value('address')}${value('apartment') ? `, ${value('apartment')}` : ''}, ${value('city')}, ${value('state')} ${value('postalCode')}, ${escapeHtml(countryName)}</p>
      <button type="button" class="shrink-0 font-semibold text-brand-600 hover:underline" data-prev-step="1">Change</button>
    </div>
    <p class="mt-1 text-slate-500">${value('email')} · ${value('phone')}</p>`;
}

function renderPaymentNote() {
  const method = document.querySelector('input[name="payment"]:checked')?.value || 'cod';
  const note = PAYMENT_NOTES[method];
  document.getElementById('payment-note').innerHTML = `${icon(note.icon, 'h-5 w-5 shrink-0')}<p>${note.text}</p>`;
  refreshIcons();
}

function goToStep(step) {
  checkoutState.step = step;
  document.querySelectorAll('[data-step-panel]').forEach((panel) => {
    panel.hidden = Number(panel.dataset.stepPanel) !== step;
  });
  document.querySelectorAll('[data-step-indicator]').forEach((indicator) => {
    const n = Number(indicator.dataset.stepIndicator);
    indicator.classList.toggle('is-active', n === step);
    indicator.classList.toggle('is-complete', n < step);
    indicator.querySelector('.step__dot').innerHTML = n < step ? icon('check', 'h-4 w-4') : String(n);
    if (n === step) indicator.setAttribute('aria-current', 'step');
    else indicator.removeAttribute('aria-current');
  });
  document.querySelectorAll('[data-step-line]').forEach((line) => {
    line.classList.toggle('is-complete', Number(line.dataset.stepLine) < step);
  });

  if (step === 2) {
    renderShipToReview();
    renderShippingMethods();
  }
  if (step === 3) renderPaymentNote();

  refreshIcons();
  const heading = document.querySelector(`[data-step-panel="${step}"] h2`);
  heading?.focus({ preventScroll: true });
  document.getElementById('checkout-view').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ---------- Order placement ---------- */

function generateOrderNumber() {
  const now = new Date();
  const datePart = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const randomPart = Math.floor(10000 + Math.random() * 90000);
  return `LUM-${datePart}-${randomPart}`;
}

function renderConfirmation(order) {
  const section = document.getElementById('order-confirmation');
  const paymentText = {
    cod: `Cash on Delivery — please keep ${formatPrice(order.totals.total)} ready when your order arrives.`,
    upi: 'UPI (demo) — no payment request was sent.',
    card: 'Card (demo) — no card was charged and no card details were collected.',
  }[order.paymentMethod];

  section.innerHTML = `
    <div class="rounded-3xl bg-white p-6 text-center shadow-soft sm:p-10 fade-in">
      <span class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">${icon('check', 'h-8 w-8')}</span>
      <h1 id="confirmation-title" class="mt-6 text-3xl font-extrabold tracking-tight" tabindex="-1">Thank you, ${escapeHtml(order.firstName)}!</h1>
      <p class="mt-2 text-lg text-slate-600">Your demo order has been placed.</p>
      <div class="mx-auto mt-6 inline-flex flex-col items-center rounded-2xl bg-slate-50 px-6 py-4">
        <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Order number</span>
        <span class="mt-1 font-mono text-xl font-extrabold tracking-wide">${order.number}</span>
      </div>
      <dl class="mt-8 grid gap-4 text-left text-sm sm:grid-cols-2">
        <div class="rounded-2xl border border-slate-200 p-4">
          <dt class="font-bold">Estimated delivery</dt>
          <dd class="mt-1 text-slate-600">${order.delivery} · ${escapeHtml(order.shippingMethodName)}</dd>
        </div>
        <div class="rounded-2xl border border-slate-200 p-4">
          <dt class="font-bold">Shipping to</dt>
          <dd class="mt-1 text-slate-600">${escapeHtml(order.shipTo)}</dd>
        </div>
        <div class="rounded-2xl border border-slate-200 p-4 sm:col-span-2">
          <dt class="font-bold">Payment</dt>
          <dd class="mt-1 text-slate-600">${paymentText}</dd>
        </div>
      </dl>
      <div class="mt-8 text-left">
        <h2 class="font-bold">Order summary</h2>
        <ul class="mt-3 divide-y divide-slate-100 rounded-2xl border border-slate-200 px-4">
          ${order.items.map((item) => `
            <li class="flex justify-between gap-4 py-3 text-sm">
              <span>${escapeHtml(item.name)}${item.variant ? ` <span class="text-slate-400">(${escapeHtml(item.variant)})</span>` : ''} × ${item.qty}</span>
              <span class="font-semibold">${formatPrice(item.lineTotal)}</span>
            </li>`).join('')}
          ${order.totals.discount > 0 ? `<li class="flex justify-between gap-4 py-3 text-sm"><span>Discount</span><span class="font-semibold text-emerald-600">−${formatPrice(order.totals.discount)}</span></li>` : ''}
          <li class="flex justify-between gap-4 py-3 text-sm"><span>Shipping</span><span class="font-semibold">${order.totals.shipping === 0 ? 'Free' : formatPrice(order.totals.shipping)}</span></li>
          <li class="flex justify-between gap-4 py-3 text-base font-extrabold"><span>Total</span><span>${formatPrice(order.totals.total)}</span></li>
        </ul>
      </div>
      <p class="mt-6 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
        This is a frontend demo. No payment was processed, no order was sent to a warehouse and no confirmation email was sent to ${escapeHtml(order.email)}.
        Connecting a backend and payment gateway would make these steps real.
      </p>
      <div class="mt-8 flex flex-wrap justify-center gap-3">
        <a href="products.html" class="btn btn-primary btn-lg">Continue shopping</a>
        <a href="index.html" class="btn btn-outline btn-lg">Back to home</a>
      </div>
    </div>`;

  document.getElementById('checkout-view').hidden = true;
  document.getElementById('toast-root')?.replaceChildren(); // drop stale validation toasts
  section.hidden = false;
  refreshIcons();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  document.getElementById('confirmation-title').focus({ preventScroll: true });
  document.title = `Order confirmed — ${STORE.name}`;
}

function placeOrder() {
  const items = getCheckoutItems();
  if (!items.length) {
    showToast('Your cart is empty.', 'error');
    return;
  }
  const button = document.getElementById('place-order');
  const label = document.getElementById('place-order-label');
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  label.textContent = 'Placing order…';
  button.querySelector('svg, i')?.replaceWith(Object.assign(document.createElement('span'), { className: 'spinner' }));

  const totals = calculateOrderTotals(items, checkoutState.shippingMethod);
  const value = (id) => document.getElementById(id).value.trim();
  const order = {
    number: generateOrderNumber(),
    placedAt: new Date().toISOString(),
    firstName: value('fullName').split(/\s+/)[0],
    email: value('email'),
    shipTo: `${value('address')}${value('apartment') ? `, ${value('apartment')}` : ''}, ${value('city')}, ${value('state')} ${value('postalCode')}`,
    shippingMethodName: totals.shippingMethod.name,
    delivery: getDeliveryEstimate(checkoutState.shippingMethod),
    paymentMethod: document.querySelector('input[name="payment"]:checked').value,
    items: items.map((item) => ({
      id: item.id,
      name: item.product.name,
      qty: item.qty,
      variant: [item.color, item.size].filter(Boolean).join(', '),
      lineTotal: item.lineTotal,
    })),
    totals: { subtotal: totals.subtotal, discount: totals.discount, shipping: totals.shipping, total: totals.total },
  };

  // Simulate a network round-trip, then confirm.
  setTimeout(() => {
    checkoutState.orderPlaced = true;
    LocalStore.set(STORAGE_KEYS.lastOrder, order); // contains no payment data
    Cart.clear();
    Coupons.remove();
    renderConfirmation(order);
  }, 1200);
}

/* ---------- Init ---------- */

function showCheckoutOrEmpty() {
  if (checkoutState.orderPlaced) return;
  const isEmpty = Cart.count() === 0;
  document.getElementById('checkout-view').hidden = isEmpty;
  document.getElementById('checkout-empty').hidden = !isEmpty;
  if (!isEmpty) {
    renderSummary();
    if (checkoutState.step === 2) renderShippingMethods();
  }
  refreshIcons();
}

function initCheckout() {
  checkoutState.shippingMethod = Preferences.get('shippingMethod', 'standard');
  if (!SHIPPING_METHODS.some((m) => m.id === checkoutState.shippingMethod)) checkoutState.shippingMethod = 'standard';

  showCheckoutOrEmpty();
  window.addEventListener('cart:updated', showCheckoutOrEmpty);

  const form = document.getElementById('checkout-form');

  // Inline validation: on blur, and live once a field has shown an error.
  Object.keys(VALIDATORS).forEach((id) => {
    const field = document.getElementById(id);
    if (!field) return;
    field.addEventListener('blur', () => { if (field.value.trim()) validateField(id); });
    field.addEventListener('input', () => { if (field.getAttribute('aria-invalid') === 'true') validateField(id); });
  });
  document.getElementById('country').addEventListener('change', () => {
    ['postalCode', 'phone'].forEach((id) => { if (document.getElementById(id).value.trim()) validateField(id); });
  });
  document.getElementById('terms').addEventListener('change', validateTerms);

  // Step navigation.
  form.addEventListener('click', (event) => {
    const next = event.target.closest('[data-next-step]');
    const prev = event.target.closest('[data-prev-step]');
    if (next && validateStep(checkoutState.step)) goToStep(Number(next.dataset.nextStep));
    if (prev) goToStep(Number(prev.dataset.prevStep));
  });

  // Pressing Enter inside step 1 or 2 advances instead of submitting.
  form.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.target.matches('input:not([type="checkbox"]):not([type="radio"])') && checkoutState.step < 3) {
      event.preventDefault();
      if (validateStep(checkoutState.step)) goToStep(checkoutState.step + 1);
    }
  });

  // Shipping method changes update totals instantly.
  document.getElementById('shipping-methods').addEventListener('change', (event) => {
    if (event.target.name !== 'shippingMethod') return;
    checkoutState.shippingMethod = event.target.value;
    Preferences.set('shippingMethod', checkoutState.shippingMethod);
    renderSummary();
  });

  document.querySelectorAll('input[name="payment"]').forEach((input) => input.addEventListener('change', renderPaymentNote));

  document.getElementById('billingSame').addEventListener('change', (event) => {
    const fields = document.getElementById('billing-fields');
    fields.hidden = event.target.checked;
    if (event.target.checked) STEP_FIELDS[3].forEach((id) => setFieldError(id, ''));
    else document.getElementById('billingName').focus();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (checkoutState.step !== 3) return;
    // Re-validate everything in case earlier steps were changed.
    if (!STEP_FIELDS[1].every(validateField)) {
      goToStep(1);
      validateStep(1);
      return;
    }
    if (!validateStep(3)) return;
    placeOrder();
  });
}

document.addEventListener('DOMContentLoaded', initCheckout);
