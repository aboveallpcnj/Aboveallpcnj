import { initContactForm } from './contact-form.js';
initContactForm(document.getElementById('contactForm'), document.getElementById('form-status'), document.getElementById('formSuccess'), {
  onSuccess() {
    window.gtag?.('event', 'generate_lead', { contact_method: 'callback_form' });
  }
});
