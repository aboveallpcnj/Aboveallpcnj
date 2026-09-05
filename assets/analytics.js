window.dataLayer = window.dataLayer || [];
window.gtag = function () { window.dataLayer.push(arguments); };
window.gtag('js', new Date());
window.gtag('config', 'G-40YH2N89C6', {
  allow_google_signals: false,
  allow_ad_personalization_signals: false
});
// Count phone-link clicks separately from accepted callback requests.
// No visitor-entered form values are included in these events.
document.addEventListener('click', function (event) {
  const link = event.target.closest?.('a[href^="tel:"]');
  if (!link) return;
  try { window.gtag('event', 'phone_click', { contact_method: 'phone' }); } catch (_) {}
});
