import { reviewConfig } from './review-config.js';
import { waitForSociableKitWidget } from './review-widget.js';

export function selectReviews(reviews) {
  return Array.isArray(reviews) ? reviews.filter(review =>
    typeof review.rating === 'number' && review.rating >= 4 && review.rating <= 5 &&
    typeof review.text === 'string' && review.text.trim() &&
    typeof review.author === 'string' && review.author.trim()
  ) : [];
}

function httpsUrl(value) {
  try { const url = new URL(value); return url.protocol === 'https:' ? url.href : null; }
  catch { return null; }
}

function externalLink(text, url, className = '') {
  const link = document.createElement('a');
  link.textContent = text;
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.className = className;
  return link;
}

function googleReviewCard(review) {
  const card = document.createElement('article');
  card.className = 'review-card';
  card.dataset.rating = String(review.rating);
  const stars = document.createElement('p');
  stars.className = 'review-stars';
  stars.textContent = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
  stars.setAttribute('aria-label', `${review.rating} out of 5 stars`);
  const quote = document.createElement('blockquote');
  const text = document.createElement('p');
  text.textContent = review.text;
  quote.append(text);
  const author = document.createElement('div');
  author.className = 'google-review-author';
  const avatarUrl = httpsUrl(review.avatar);
  if (avatarUrl) {
    const avatar = document.createElement('img');
    avatar.src = avatarUrl;
    avatar.alt = `${review.author} profile photo`;
    avatar.width = 36;
    avatar.height = 36;
    avatar.loading = 'lazy';
    avatar.referrerPolicy = 'no-referrer';
    author.append(avatar);
  }
  const details = document.createElement('div');
  const authorUrl = httpsUrl(review.authorUrl);
  const name = authorUrl ? externalLink(review.author, authorUrl, 'review-author') : document.createElement('p');
  name.textContent = review.author;
  name.className = 'review-author';
  details.append(name);
  if (review.relativeTime) {
    const date = document.createElement('p');
    date.className = 'review-meta';
    date.textContent = review.relativeTime;
    details.append(date);
  }
  author.append(details);
  card.append(stars, quote, author);
  const reviewUrl = httpsUrl(review.url);
  if (reviewUrl) card.append(externalLink('View this review on Google Maps', reviewUrl, 'review-source-link'));
  return card;
}

export function initReviews() {
  const carousel = document.getElementById('review-carousel');
  if (!carousel) return;
  const track = document.getElementById('review-track');
  const controls = carousel.querySelector('.review-controls');
  const pause = document.getElementById('review-pause');
  const previous = document.getElementById('review-prev');
  const next = document.getElementById('review-next');
  const position = document.getElementById('review-position');
  const narrow = matchMedia('(max-width: 560px)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let cards = Array.from(track.children);
  let index = 0;
  let paused = reducedMotion.matches;
  let hovered = false;
  let inView = false;
  let timer;
  let scrollFrame;
  let googleRequested = false;
  let liveCardsInstalled = false;
  let widgetInstalled = false;
  const visibleCount = () => Math.min(cards.length, narrow.matches ? 1 : 2);
  const lastIndex = () => Math.max(0, cards.length - visibleCount());
  const step = () => cards.length > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : track.clientWidth;

  function update() {
    const count = visibleCount();
    const end = Math.min(index + count, cards.length);
    position.textContent = count === 1 ? `${index + 1} of ${cards.length}` : `${index + 1}–${end} of ${cards.length}`;
    pause.textContent = paused ? 'Play rotation' : 'Pause rotation';
    pause.setAttribute('aria-label', paused ? 'Start automatic review rotation' : 'Pause automatic review rotation');
    controls.hidden = cards.length <= count;
    cards.forEach((card, i) => {
      card.setAttribute('role', 'group');
      card.setAttribute('aria-roledescription', 'slide');
      card.setAttribute('aria-label', `${i + 1} of ${cards.length}`);
      // Keep offscreen links out of the keyboard sequence. Native swipe still works.
      card.inert = i < index || i >= end;
    });
  }
  function schedule() {
    clearInterval(timer);
    if (!widgetInstalled && !paused && !hovered && inView && !document.hidden && lastIndex() > 0) {
      timer = setInterval(() => move(index >= lastIndex() ? 0 : index + 1), 7500);
    }
  }
  function move(to) {
    index = Math.max(0, Math.min(to, lastIndex()));
    track.scrollTo({ left: index * step(), behavior: reducedMotion.matches ? 'instant' : 'smooth' });
    update();
  }
  function stop() { paused = true; update(); schedule(); }
  function shift(direction) {
    stop();
    position.setAttribute('aria-live', 'polite');
    move(direction < 0 ? (index <= 0 ? lastIndex() : index - 1) : (index >= lastIndex() ? 0 : index + 1));
  }
  previous.addEventListener('click', () => shift(-1));
  next.addEventListener('click', () => shift(1));
  pause.addEventListener('click', () => { paused = !paused; position.setAttribute('aria-live', 'off'); update(); schedule(); });
  carousel.addEventListener('mouseenter', () => { hovered = true; schedule(); });
  carousel.addEventListener('mouseleave', () => { hovered = false; schedule(); });
  carousel.addEventListener('focusin', event => { if (!carousel.contains(event.relatedTarget)) stop(); });
  track.addEventListener('pointerdown', stop, { passive: true });
  track.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); shift(event.key === 'ArrowLeft' ? -1 : 1); }
  });
  track.addEventListener('scroll', () => {
    cancelAnimationFrame(scrollFrame);
    scrollFrame = requestAnimationFrame(() => { const size = step(); if (size > 0) index = Math.min(lastIndex(), Math.max(0, Math.round(track.scrollLeft / size))); update(); });
  }, { passive: true });
  const resize = () => { index = Math.min(index, lastIndex()); track.scrollTo({ left: index * step(), behavior: 'instant' }); update(); schedule(); };
  window.addEventListener('resize', resize);
  reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) paused = true; update(); schedule(); });
  document.addEventListener('visibilitychange', schedule);
  carousel.classList.add('is-ready');
  update();

  async function loadGoogle() {
    if (googleRequested) return;
    googleRequested = true;
    if (reviewConfig.sociableKitEnabled) {
      const ready = await waitForSociableKitWidget();
      if (ready) {
        const showWidget = () => {
          widgetInstalled = true;
          clearInterval(timer);
          carousel.hidden = true;
          document.getElementById('google-review-widget').classList.remove('is-loading');
          document.getElementById('review-source-label').textContent = 'Selected Google reviews';
          document.getElementById('review-selection-note').textContent = reviewConfig.minimumRatingConfirmed ? 'Featuring reviews rated 4 stars and up. Visit Google for the complete listing.' : 'Customer experiences from Google. Visit Google for the complete listing.';
          document.querySelector('.review-summary .google-all-link').textContent = 'Read all reviews on Google ↗';
        };
        if (carousel.contains(document.activeElement)) {
          const afterFocusLeaves = () => setTimeout(() => {
            if (!carousel.contains(document.activeElement)) {
              showWidget();
              carousel.removeEventListener('focusout', afterFocusLeaves);
            }
          }, 0);
          carousel.addEventListener('focusout', afterFocusLeaves);
        } else showWidget();
      }
      return;
    }
    if (!reviewConfig.placesSampleEnabled) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch('/.netlify/functions/google-reviews', { headers: { Accept: 'application/json' }, signal: controller.signal, cache: 'no-store' });
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) return;
      const data = await response.json();
      const reviews = selectReviews(data.reviews).filter(review => Number.isInteger(review.rating) && httpsUrl(review.url));
      const mapsUrl = httpsUrl(data.googleMapsUri);
      if (!reviews.length || !mapsUrl) return;
      const install = () => {
        if (liveCardsInstalled) return;
        liveCardsInstalled = true;
        clearInterval(timer);
        track.replaceChildren(...reviews.map(googleReviewCard));
        cards = Array.from(track.children);
        index = 0;
        track.scrollTo({ left: 0, behavior: 'instant' });
        document.getElementById('review-source-label').textContent = 'Selected Google reviews';
        document.getElementById('review-selection-note').textContent = '4 stars and up, in Google’s relevance order. See the complete listing on Google.';
        document.querySelectorAll('.google-all-link').forEach(link => { link.href = mapsUrl; });
        document.querySelector('.review-summary .google-all-link').textContent = 'Read all reviews on Google ↗';
        const rating = document.getElementById('google-rating');
        if (typeof data.rating === 'number' && data.rating >= 1 && data.rating <= 5 && Number.isInteger(data.userRatingCount) && data.userRatingCount > 0) {
          // This is Google's complete listing rating, never an average of the filtered selection.
          rating.textContent = `${data.rating.toFixed(1)} / 5 · ${data.userRatingCount.toLocaleString()} Google reviews`;
          rating.hidden = false;
        }
        const attributions = document.getElementById('google-attributions');
        const logo = document.createElement('img');
        logo.src = '/assets/google-maps-attribution.svg';
        logo.alt = 'Google Maps';
        logo.className = 'google-maps-logo';
        attributions.replaceChildren(logo);
        if (Array.isArray(data.attributions)) {
          for (const item of data.attributions) {
            const url = httpsUrl(item.providerUri);
            if (item.provider) attributions.append(url ? externalLink(item.provider, url) : document.createTextNode(item.provider));
          }
        }
        attributions.hidden = false;
        update(); schedule();
      };
      // Never remove a review or link while someone is reading it with keyboard focus.
      if (carousel.contains(document.activeElement)) {
        const afterFocusLeaves = () => setTimeout(() => {
          if (!carousel.contains(document.activeElement)) {
            install();
            carousel.removeEventListener('focusout', afterFocusLeaves);
          }
        }, 0);
        carousel.addEventListener('focusout', afterFocusLeaves);
      } else install();
    } catch { /* Existing testimonials remain usable when Google is unavailable. */ }
    finally { clearTimeout(timeout); }
  }
  if ('IntersectionObserver' in window) {
    const visibility = new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      if (inView) loadGoogle();
      schedule();
    }, { threshold: .15 });
    visibility.observe(carousel);
  } else { inView = true; loadGoogle(); schedule(); }
}
