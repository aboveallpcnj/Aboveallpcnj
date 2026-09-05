# Above All Pest Control

Family-owned pest control serving Northern New Jersey since 1994.

- Website: https://aboveallpcnj.com
- Phone: 973-728-4455
- Facebook: https://www.facebook.com/people/Above-All-Pest-Control/61560596953416/

## Website maintenance

Static HTML, CSS and JavaScript, compatible with GitHub and Netlify. The production build requires no frontend framework. An optional Vite development preview is available with `npm install` and `npm run dev`.

- `index.html`: homepage, prevention offer, full family story and existing selected testimonials.
- `assets/site.css`: desktop and mobile styling.
- `assets/site.js`, `contact-form.js`, `reviews.js`: navigation, callback form and carousel.
- `assets/above-all-trucks-*`: responsive versions of the existing truck photo.
- `netlify/functions/google-reviews.mjs`: optional server-side Google review connection.
- `privacy.html`, `terms.html`: website-specific notices.

Keep service prices off the public website. Use **“No contract.”** for the prevention plan. Preserve the complete Steve-and-Alex family story when editing.

## Netlify

`netlify.toml` sets `node scripts/build.mjs` as the build command, `dist` as the public directory and `netlify/functions` as the functions directory. Node 22 is selected. Only public files are copied to `dist`; credentials, functions and repository files stay outside it.

The original Formspree endpoint is retained. Tests use mocked responses and never send leads. Verify one owner-authorized request reaches the intended inbox before publishing to the business domain.

## Google reviews connection

The homepage includes Alex’s **SociableKIT Google Reviews widget 25711278**. Configure carousel, minimum-rating, review-limit, and synchronization settings in the SociableKIT account. The embed is connected; saved account settings must be verified before describing its filter or full-history coverage as confirmed. No Trustindex account is required. The existing testimonials remain as a fallback if the provider does not load.

### Optional limited Places API connection

The carousel works immediately with the existing site’s four testimonials. They are not represented as a verified, live Google feed, and no unverified aggregate rating is published.

To enable only Google’s limited Places sample on Netlify:

1. Confirm the correct Above All listing and its Google Place ID.
2. Enable **Places API (New)** in an owner-controlled Google Cloud project. Review billing, set usage quotas and budget alerts, and restrict the key to the required API.
3. Set `GOOGLE_PLACES_API_KEY` and `GOOGLE_PLACE_ID` in Netlify’s server-side environment settings. Never put the key in HTML, JavaScript, GitHub, or chat.
4. Set `placesSampleEnabled: true` in `assets/review-config.js`, set `GOOGLE_REVIEWS_ENABLED=true`, and redeploy. False or unset means no Google API requests.

Place Details supplies up to five reviews in relevance order, not the full review history. This site displays four- and five-star reviews from that selection, identifies the filter, links to individual reviews and the complete listing, credits authors, and preserves Google’s full-listing rating and review count. It requests reviews once per page visit when the section enters view, not on each rotation. Google content is not cached or written to disk. Function rate limiting reduces repeat requests; configure Google quotas before enabling billing.

If Google is unavailable or supplies no eligible written reviews, the existing testimonials remain visible. The private static review preview cannot run Netlify functions; verify synchronization on Netlify after configuration.

Official references:

- https://developers.google.com/maps/documentation/places/web-service/place-details
- https://developers.google.com/maps/documentation/places/web-service/policies
- https://developers.google.com/maps/documentation/places/web-service/usage-and-billing
- https://docs.netlify.com/build/functions/api/

## Verification

Run `npm test` for mocked submission, retry, timeout and Google integration checks. Run `npm run build` to prepare `dist` and validate public file references.

## Images

The trucks and logo are existing business assets, resized and compressed for the web. The six displayed pest silhouettes are original generated artwork rendered using the single brand accent, #24AE24. The tick-and-lawn service uses the separate `assets/tick-silhouette.webp` mask. The Google Maps attribution logo is an unmodified official asset from Google’s Places API policy page. Alex’s new team photo can replace the truck image when supplied; preserve responsive sizes and descriptive alt text.
