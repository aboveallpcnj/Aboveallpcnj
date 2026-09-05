import { initContactForm } from './contact-form.js';
import { initReviews } from './reviews.js';

const menu = document.querySelector('.menu-toggle');
const nav = document.getElementById('main-nav');
if (menu && nav) {
  const label = menu.querySelector('.sr-only');
  const setOpen = open => {
    menu.setAttribute('aria-expanded', String(open));
    label.textContent = open ? 'Close menu' : 'Open menu';
    nav.classList.toggle('is-open', open);
  };
  menu.addEventListener('click', () => setOpen(menu.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', event => { if (event.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') { setOpen(false); menu.focus(); }
  });
  document.addEventListener('click', event => { if (!event.target.closest('.site-header')) setOpen(false); });
  matchMedia('(min-width: 961px)').addEventListener('change', event => { if (event.matches) setOpen(false); });
  document.documentElement.classList.add('js-ready');
  menu.hidden = false;
}

document.querySelectorAll('[data-interest]').forEach(link => {
  link.addEventListener('click', () => {
    const interest = document.getElementById('form-interest');
    if (interest) interest.value = link.dataset.interest;
  });
});
initContactForm(document.getElementById('contactForm'), document.getElementById('form-status'), document.getElementById('formSuccess'), {
  onSuccess() {
    window.gtag?.('event', 'generate_lead', { contact_method: 'callback_form' });
  }
});
initReviews();
const year = document.getElementById('copyright-year');
if (year) year.textContent = String(new Date().getFullYear());
