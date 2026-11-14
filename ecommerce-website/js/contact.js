/**
 * contact.js
 * Contact form validation, simulated submission and the configurable map embed.
 *
 * No backend is configured, so submissions are simulated. To receive real
 * messages, POST the form data to your API or an email service such as
 * Formspree or EmailJS inside submitContactForm().
 */
'use strict';

const CONTACT_CONFIG = {
  // Change this to your business address or a "lat,lng" pair.
  mapQuery: 'Indiranagar, Bengaluru, Karnataka 560038',
  messageMinLength: 20,
  messageMaxLength: 1000,
};

const CONTACT_VALIDATORS = {
  'contact-name': (v) => {
    if (!v) return 'Please enter your name.';
    return /^[\p{L}][\p{L}\s.'-]{1,}$/u.test(v) ? '' : 'Please enter a valid name using letters only.';
  },
  'contact-email': (v) => {
    if (!v) return 'Please enter your email address.';
    return isValidEmail(v) ? '' : 'Please enter a valid email address, e.g. name@example.com.';
  },
  // Optional, but must look like a phone number if provided.
  'contact-phone': (v) => (!v || /^\+?\d{7,15}$/.test(v.replace(/[\s()-]/g, '')) ? '' : 'Please enter a valid phone number or leave this blank.'),
  'contact-subject': (v) => (v ? '' : 'Please choose a subject.'),
  'contact-message': (v) => {
    if (!v) return 'Please enter a message.';
    if (v.length < CONTACT_CONFIG.messageMinLength) {
      return `Please add a little more detail (${CONTACT_CONFIG.messageMinLength - v.length} more characters).`;
    }
    return '';
  },
};

function setContactError(id, message) {
  const field = document.getElementById(id);
  const error = document.getElementById(`${id}-error`);
  field.setAttribute('aria-invalid', String(Boolean(message)));
  error.innerHTML = message ? `${icon('circle-alert', 'h-4 w-4 shrink-0')}<span>${escapeHtml(message)}</span>` : '';
  if (message) refreshIcons();
}

function validateContactField(id) {
  const message = CONTACT_VALIDATORS[id](document.getElementById(id).value.trim());
  setContactError(id, message);
  return !message;
}

function submitContactForm(form) {
  const button = document.getElementById('contact-submit');
  const label = button.querySelector('span');
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  label.textContent = 'Sending…';

  const name = document.getElementById('contact-name').value.trim();
  const email = document.getElementById('contact-email').value.trim();

  // Simulated request. Replace with fetch('/api/contact', { method: 'POST', body: new FormData(form) }).
  setTimeout(() => {
    button.disabled = false;
    button.removeAttribute('aria-busy');
    label.textContent = 'Send message';

    document.getElementById('contact-success-text').textContent =
      `Thanks, ${name.split(/\s+/)[0]}. In a live store, our team would reply to ${email} within 4 hours.`;
    form.hidden = true;
    document.getElementById('contact-success').hidden = false;
    document.getElementById('contact-success-title').focus();
    showToast('Message submitted (demo).', 'success');
  }, 900);
}

function initContact() {
  const form = document.getElementById('contact-form');
  const message = document.getElementById('contact-message');
  const counter = document.getElementById('message-counter');

  // Map embed (no API key required for this basic embed URL).
  document.getElementById('contact-map').src =
    `https://www.google.com/maps?q=${encodeURIComponent(CONTACT_CONFIG.mapQuery)}&output=embed`;

  const updateCounter = () => {
    counter.textContent = `${message.value.length} / ${CONTACT_CONFIG.messageMaxLength}`;
  };
  message.addEventListener('input', updateCounter);

  Object.keys(CONTACT_VALIDATORS).forEach((id) => {
    const field = document.getElementById(id);
    field.addEventListener('blur', () => { if (field.value.trim()) validateContactField(id); });
    field.addEventListener(field.tagName === 'SELECT' ? 'change' : 'input', () => {
      if (field.getAttribute('aria-invalid') === 'true') validateContactField(id);
    });
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const invalid = Object.keys(CONTACT_VALIDATORS).filter((id) => !validateContactField(id));
    if (invalid.length) {
      document.getElementById(invalid[0]).focus();
      return;
    }
    submitContactForm(form);
  });

  document.getElementById('contact-reset').addEventListener('click', () => {
    form.reset();
    updateCounter();
    Object.keys(CONTACT_VALIDATORS).forEach((id) => setContactError(id, ''));
    document.getElementById('contact-success').hidden = true;
    form.hidden = false;
    document.getElementById('contact-name').focus();
  });
}

document.addEventListener('DOMContentLoaded', initContact);
