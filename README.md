# Kamer website (kamerapp.com rebuild)

Static site built with Astro. No CMS, no database. Content lives in `src/pages/*.astro`.

## Run locally
```bash
pnpm install
pnpm dev        # http://localhost:4321
pnpm build      # outputs static HTML to dist/
```

## Pages
| URL | File |
|---|---|
| `/` | `src/pages/index.astro` |
| `/features` | `src/pages/features.astro` (feature list is a data array at the top) |
| `/pricing` | `src/pages/pricing.astro` |
| `/security` | `src/pages/security.astro` |
| `/about` | `src/pages/about.astro` |
| `/stories` | `src/pages/stories.astro` |
| `/contact` | `src/pages/contact.astro` (demo form opens WhatsApp with details prefilled; no backend) |
| `/privacy-policy`, `/terms-conditions`, `/refund-cancellation-policy` | carried over verbatim from the old site, same URLs |

Shared pieces: `src/layouts/Base.astro` (head, SEO tags, fonts), `src/components/Header.astro`, `Footer.astro`, `StoreButtons.astro` (App Store and Play Store links live here).
Design tokens (colours, radius, fonts) are at the top of `src/styles/global.css`.

## Deploy
Any static host. Cloudflare Pages or Vercel: build command `pnpm build`, output directory `dist`.
`astro.config.mjs` sets `site` to `https://kamerapp.com` for canonical URLs and the sitemap (`/sitemap-index.xml`).

## Before go-live
- Confirm the numbers with the founders: 20,000+ beds, 98% paying, Rs 9,999/year, 150-bed limit.
- Confirm support hours wording.
- Add founder photos (replace the initials avatars on `/` and `/about`).
- Decide whether the "three empty beds" story can name the customer.
- Optionally swap the WhatsApp demo form for a hosted form (Formspree, Tally) if they want leads stored.
