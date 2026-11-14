# Lumora — Modern E-Commerce Frontend

A complete, responsive, multi-page e-commerce **frontend prototype** built with **HTML5, CSS3, Tailwind CSS and Vanilla JavaScript**. No frameworks, no build step required to try it.

> **Demo only.** There is no backend. Orders, payments, contact messages and newsletter sign-ups are simulated. No payment details are requested, collected or stored. All products, prices, reviews and contact details are sample/placeholder content.

---

## Project structure

```
ecommerce-website/
├── index.html               Home page
├── products.html            Product listing (search, filters, sort, load more)
├── product-details.html     Product detail page (?id=101 … ?id=118)
├── cart.html                Shopping cart
├── checkout.html            3-step demo checkout + order confirmation
├── about.html               About us (+ store policy anchors used by the footer)
├── contact.html             Contact form, FAQ, map
├── assets/
│   ├── images/              placeholder.svg (image fallback), empty-cart.svg
│   └── icons/               favicon.svg
├── css/
│   └── styles.css           Shared design system: buttons, forms, cards, overlays…
└── js/
    ├── tailwind-config.js   Tailwind theme (brand colours, font, container)
    ├── products.js          Product catalogue + catalogue helpers (single source of truth)
    ├── main.js              Shared: cart, wishlist, coupons, header/footer, search,
    │                        quick view, wishlist drawer, toasts, newsletter
    ├── home.js              Home page sections & deal countdown
    ├── product-listing.js   Filters, sorting, URL sync, pagination
    ├── product-details.js   Gallery, variants, tabs, reviews, related/recent
    ├── cart.js              Cart page
    ├── checkout.js          Checkout validation & demo order
    └── contact.js           Contact form & map
```

Every page loads `products.js` → `main.js` → its own page script, so all pages share the same data, cart logic and UI components. The header and footer are rendered by `main.js` into `<div data-component="header|footer">` placeholders. Change them once and every page updates.

## Running locally

Any static file server works. From the `ecommerce-website/` folder:

```bash
# Python 3
python -m http.server 8000

# or Node.js
npx serve .
```

Then open <http://localhost:8000>. You can also open `index.html` directly in a browser. Everything uses plain `<script>` tags, so `file://` works too. A local server is still recommended because some browsers restrict `localStorage` on `file://`.

An internet connection is needed for the CDN assets (Tailwind, Lucide icons, Google Fonts) and the Unsplash product photos. If a product image fails to load, a local placeholder is shown instead.

## Tailwind CSS: prototype vs production

The pages use the **Tailwind Play CDN** (`cdn.tailwindcss.com/3.4.17`) with the config in `js/tailwind-config.js`. This is ideal for prototyping, but it compiles CSS in the browser and is **not recommended for production**.

For production, use a compiled build:

```bash
npm install -D tailwindcss@3
npx tailwindcss init
```

1. Copy the object from `js/tailwind-config.js` into `tailwind.config.js` and set the content paths. **Include the JS files**, because many classes are generated in JavaScript:
   ```js
   module.exports = {
     content: ['./*.html', './js/**/*.js'],
     theme: { /* paste theme from js/tailwind-config.js */ },
   };
   ```
2. Create `src/tailwind.css`:
   ```css
   @tailwind base;
   @tailwind components;
   @tailwind utilities;
   ```
3. Build: `npx tailwindcss -i ./src/tailwind.css -o ./css/tailwind.css --minify`
4. In every HTML file, replace the two Tailwind `<script>` tags with `<link rel="stylesheet" href="css/tailwind.css">`, placed **before** `css/styles.css`.

## Features

| Area | What works |
|---|---|
| Global | Sticky header, mobile menu, live cart and wishlist counts, search with keyboard-navigable suggestions, wishlist drawer, quick view modal, toasts, skip link, focus trapping in overlays, image fallbacks, cross-tab sync |
| Listing | Text search, multi-category, price (inputs + slider), rating, in-stock and on-sale filters; six sort options; filter chips; URL-shareable filters (`?category=Footwear&sort=price-asc`); remembered sort preference; skeleton loading; Load more; empty state; mobile filter drawer |
| Details | Lookup by `?id=`, gallery (thumbnails, arrows, keyboard, swipe), colour/size variants, stock-aware quantity, Add to cart, Buy now, wishlist, delivery estimate, PIN code check, shipping/returns/payment info, specs and reviews tabs, related and recently viewed products, "not found" state |
| Cart | Quantity stepper, remove, save for later (moves to wishlist), clear cart, coupons, free-shipping progress, live totals, empty state, recommendations, checkout blocked when empty |
| Checkout | Information → Shipping → Payment steps, inline validation (email, phone, postal code by country), three shipping methods, demo payment options, separate billing address, required terms, generated order number, cart cleared after the order |
| Contact | Validated form with character counter, simulated submit and success state, FAQ accordion, social links, configurable map |

### Demo coupon codes

| Code | Effect |
|---|---|
| `SAVE10` | 10% off (max ₹1,000) |
| `WELCOME200` | ₹200 off orders of ₹1,499+ (pauses automatically if the cart drops below) |
| `FREESHIP` | Free shipping on any method |

### Pricing rules
- Prices are **GST-inclusive**. The "Estimated tax" line shows the included 18% GST and is not added on top.
- Standard shipping is ₹79, free over ₹999. Express is ₹149, next-day ₹249.
- The maximum quantity per line is the lower of stock and 10.

### LocalStorage keys
`lumora_cart`, `lumora_wishlist`, `lumora_coupon`, `lumora_recently_viewed`, `lumora_preferences` (sort and shipping method), `lumora_last_order` (summary only, no payment data). Run `localStorage.clear()` in the console to reset the store.

## Customising

- **Products:** edit `PRODUCTS` and `CATEGORIES` in `js/products.js`. Each product needs a unique `id`, and `colors` / `sizes` can be empty arrays.
- **Brand colour:** change `brand` in `js/tailwind-config.js` and the matching `--brand-*` variables in `css/styles.css`.
- **Store name, contact details, shipping, coupons:** edit `STORE`, `SHIPPING_METHODS` and `COUPONS` at the top of `js/main.js`.
- **Map location:** edit `CONTACT_CONFIG.mapQuery` in `js/contact.js`.

## Backend-dependent features (simulated here)

| Feature | What a real store needs |
|---|---|
| Payments (UPI / card) | Payment gateway (Razorpay, Stripe, Cashfree) + server-side order verification |
| Order placement and tracking | Order API, database, courier integration |
| Contact form | API endpoint or service such as Formspree or EmailJS (see `submitContactForm` in `contact.js`) |
| Newsletter | Email marketing service (Mailchimp, Brevo…) |
| Accounts / sign-in | Authentication service; the account icon currently shows an explanatory toast |
| Reviews, stock levels | Product API instead of the static `products.js` |

## Testing checklist

**All pages**
- [ ] All 7 pages load with no console errors; header, footer and nav links work, and the active page is underlined
- [ ] At 360px, 768px and 1280px there is no horizontal scrolling, and the hamburger menu opens and closes (Esc closes it)
- [ ] Typing "head" in the header search shows suggestions; arrow keys and Enter open a product; Enter on text goes to filtered results
- [ ] Tab through a page: focus rings are visible, and the skip link appears first
- [ ] Footer newsletter rejects `abc` and accepts `me@example.com`

**Home (`index.html`)**
- [ ] Category tiles link to filtered listings; best sellers, new arrivals and offers render; countdown ticks
- [ ] Add to cart and the heart button update header badges; Quick view opens, Esc closes it, and focus returns

**Listing (`products.html`)**
- [ ] Each filter changes the results and the URL; chips remove individual filters; "Clear all" resets
- [ ] All 6 sort options order correctly; the chosen sort persists after reload
- [ ] "Load more" reveals the remaining products; a nonsense search shows the no-results state
- [ ] Mobile: the Filters button opens a drawer, and "Show N results" closes it

**Details (`product-details.html?id=103`)**
- [ ] Thumbnails, arrows, ←/→ keys and swipe change the image
- [ ] Colour and size selection updates the labels; quantity cannot exceed stock (try `?id=118`, 3 in stock)
- [ ] Add to cart adds the selected variant; Buy now opens checkout with it
- [ ] Out-of-stock product (`?id=108`) disables purchase buttons
- [ ] `?id=999` and no id show "Product not found"
- [ ] Visit two products, and the second shows "Recently viewed"

**Cart (`cart.html`)**
- [ ] +/− and typed quantities update line and order totals instantly
- [ ] Remove, Save for later (→ wishlist) and Clear cart work; an empty cart shows the illustration
- [ ] `SAVE10`, `WELCOME200`, `FREESHIP` apply; `BOGUS` shows an error; removing the coupon works
- [ ] Shipping becomes free at ₹999+; reload keeps the cart and coupon

**Checkout (`checkout.html`)**
- [ ] With an empty cart, checkout shows an empty state instead of the form
- [ ] Clicking Continue with empty fields shows inline errors and focuses the first one
- [ ] Bad email, phone `12345` and PIN `56003` are rejected; changing country changes the postal rules
- [ ] Changing the shipping method updates the total; payment notes explain the demo, and no card fields exist
- [ ] Unchecking "Same as shipping" requires billing fields; terms are required
- [ ] Place order shows a spinner, then a confirmation with an `LUM-YYMMDD-NNNNN` number; the cart badge resets

**About & Contact**
- [ ] Footer links to `about.html#privacy`, `#terms`, `#shipping`, `#returns` scroll to the policy cards
- [ ] Contact form shows 4 errors when empty; phone is optional but validated; valid submit shows success, and "Send another message" resets
- [ ] Map loads; FAQ items expand and collapse with the keyboard
