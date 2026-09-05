const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store, max-age=0',
  'Netlify-CDN-Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};
const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });

export const config = {
  method: 'GET',
  rateLimit: { windowLimit: 10, windowSize: 60, aggregateBy: ['ip', 'domain'], action: 'rate_limit' },
};

export function presentPlace(place) {
  return {
    googleMapsUri: place.googleMapsUri,
    rating: place.rating,
    userRatingCount: place.userRatingCount,
    attributions: place.attributions ?? [],
    reviews: (Array.isArray(place.reviews) ? place.reviews : [])
      .filter(review => Number.isInteger(review.rating) && review.rating >= 4 && review.rating <= 5)
      .map(review => ({
        rating: review.rating,
        text: review.originalText?.text ?? review.text?.text ?? '',
        author: review.authorAttribution?.displayName ?? '',
        authorUrl: review.authorAttribution?.uri ?? '',
        avatar: review.authorAttribution?.photoUri ?? '',
        relativeTime: review.relativePublishTimeDescription ?? '',
        url: review.googleMapsUri ?? '',
      })),
  };
}

export function createReviewsHandler({ env = process.env, fetcher = globalThis.fetch, timeoutMs = 6000 } = {}) {
  return async request => {
    if (request.method !== 'GET') return reply({ error: 'Method not allowed' }, 405);
    const apiKey = env.GOOGLE_PLACES_API_KEY;
    const placeId = env.GOOGLE_PLACE_ID;
    // Disabled until the owner explicitly enables the integration in Netlify.
    if (env.GOOGLE_REVIEWS_ENABLED !== 'true' || !apiKey || !placeId) return reply({ enabled: false, reviews: [] });
    if (!/^[A-Za-z0-9_-]+$/.test(placeId)) return reply({ error: 'Reviews unavailable' }, 503);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      // No caller-supplied place IDs, fields, or upstream URLs. No review caching.
      const response = await fetcher(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=en`, {
        headers: {
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'googleMapsUri,rating,userRatingCount,reviews,attributions',
        }, signal: controller.signal,
      });
      if (!response.ok) return reply({ error: 'Reviews temporarily unavailable' }, 503);
      return reply(presentPlace(await response.json()));
    } catch { return reply({ error: 'Reviews temporarily unavailable' }, 503); }
    finally { clearTimeout(timeout); }
  };
}

export default createReviewsHandler();
