import test from 'node:test';
import assert from 'node:assert/strict';
import { createReviewsHandler } from '../netlify/functions/google-reviews.mjs';

const request = () => new Request('https://example.test/.netlify/functions/google-reviews');
const enabledEnv = { GOOGLE_REVIEWS_ENABLED: 'true', GOOGLE_PLACES_API_KEY: 'TEST_KEY_NOT_A_CREDENTIAL', GOOGLE_PLACE_ID: 'TEST_PLACE_ID' };

test('unconfigured reviews never call Google', async () => {
  const handler = createReviewsHandler({ env: {}, fetcher: () => { throw new Error('Must not call'); } });
  const response = await handler(request());
  assert.deepEqual(await response.json(), { enabled: false, reviews: [] });
  assert.match(response.headers.get('cache-control'), /no-store/);
});

test('filtering preserves attribution, relevance order and the full-listing rating', async () => {
  let requested;
  const handler = createReviewsHandler({ env: enabledEnv, fetcher: async (url, options) => {
    requested = { url, options };
    return Response.json({
      rating: 3.8, userRatingCount: 100, googleMapsUri: 'https://maps.google.com/?cid=example',
      attributions: [{ provider: 'Example source', providerUri: 'https://example.test/source' }],
      reviews: [
        { rating: 4, originalText: { text: 'Original review' }, text: { text: 'Translated review' }, authorAttribution: { displayName: 'Reviewer A', uri: 'https://example.test/a', photoUri: 'https://example.test/avatar' }, googleMapsUri: 'https://example.test/review/a', relativePublishTimeDescription: 'a month ago' },
        { rating: 2, text: { text: 'Low-rated review' }, authorAttribution: { displayName: 'Reviewer B' } },
        { rating: 5, text: { text: 'Another review' }, authorAttribution: { displayName: 'Reviewer C' }, googleMapsUri: 'https://example.test/review/c' },
      ],
    });
  } });
  const response = await handler(new Request('https://example.test/.netlify/functions/google-reviews?placeId=UNTRUSTED_ID'));
  const data = await response.json();
  assert.equal(data.rating, 3.8);
  assert.equal(data.userRatingCount, 100);
  assert.deepEqual(data.reviews.map(review => review.rating), [4, 5]);
  assert.deepEqual(data.reviews.map(review => review.author), ['Reviewer A', 'Reviewer C']);
  assert.equal(data.reviews[0].text, 'Original review');
  assert.equal(data.reviews[0].avatar, 'https://example.test/avatar');
  assert.equal(data.reviews[0].url, 'https://example.test/review/a');
  assert.equal(data.attributions[0].provider, 'Example source');
  assert.match(requested.url, /places\/TEST_PLACE_ID\?/);
  assert.doesNotMatch(requested.url, /UNTRUSTED_ID/);
  assert.equal(requested.options.headers['X-Goog-Api-Key'], enabledEnv.GOOGLE_PLACES_API_KEY);
  assert.doesNotMatch(JSON.stringify(data), /TEST_KEY_NOT_A_CREDENTIAL/);
  assert.match(response.headers.get('netlify-cdn-cache-control'), /no-store/);
});

test('upstream errors do not expose provider errors or credentials', async () => {
  for (const fetcher of [async () => Response.json({ secret: 'TEST_KEY_NOT_A_CREDENTIAL' }, { status: 403 }), async () => { throw new Error('TEST_KEY_NOT_A_CREDENTIAL'); }]) {
    const response = await createReviewsHandler({ env: enabledEnv, fetcher })(request());
    assert.equal(response.status, 503);
    assert.doesNotMatch(await response.text(), /TEST_KEY_NOT_A_CREDENTIAL/);
  }
});

test('invalid configuration and POST requests never reach Google', async () => {
  let calls = 0;
  const handler = createReviewsHandler({ env: { ...enabledEnv, GOOGLE_PLACE_ID: '../invalid' }, fetcher: async () => { calls++; } });
  assert.equal((await handler(request())).status, 503);
  assert.equal((await handler(new Request(request(), { method: 'POST' }))).status, 405);
  assert.equal(calls, 0);
});

test('slow upstream requests time out cleanly', async () => {
  const handler = createReviewsHandler({ env: enabledEnv, timeoutMs: 5, fetcher: (_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('Aborted')), { once: true })) });
  assert.equal((await handler(request())).status, 503);
});
