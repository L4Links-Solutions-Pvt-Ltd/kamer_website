# Kamer website — handover guide

This folder is the complete source of the new kamerapp.com. It is a static site built with Astro.
No server, no database, no CMS. It compiles to plain HTML files.

## 1. Put it in your own GitHub (5 minutes)
1. Create a new **private** repository on GitHub, for example `kamer-website`. Leave it empty.
2. On your machine:
   ```bash
   cd kamer-website        # this folder, unzipped
   git init
   git add .
   git commit -m "Kamer website"
   git branch -M main
   git remote add origin https://github.com/<your-account>/kamer-website.git
   git push -u origin main
   ```

## 2. Host it on Vercel (5 minutes, free)
1. Sign up at vercel.com with the same GitHub account.
2. **Add New → Project → Import** the `kamer-website` repo.
3. Vercel detects Astro automatically. Leave the defaults (build `astro build`, output `dist`). Click **Deploy**.
4. You get a `*.vercel.app` URL. From now on, every push to `main` redeploys automatically.

## 3. Point kamerapp.com at it
1. In the Vercel project: **Settings → Domains → Add** `kamerapp.com` and `www.kamerapp.com`.
2. Vercel shows the DNS records to set. At your domain registrar, add/replace:
   - `A` record for `@` → the IP Vercel shows (currently 76.76.21.21)
   - `CNAME` for `www` → `cname.vercel-dns.com`
3. Wait for DNS (minutes to a few hours). Vercel issues HTTPS automatically.

That replaces the old Next.js site. Keep the old hosting alive until the new one shows on the domain.

## 4. Run it locally (optional)
Needs Node 22+ and pnpm (`npm i -g pnpm`).
```bash
pnpm install
pnpm dev      # http://localhost:4321
pnpm build    # writes dist/
```

## 5. Where things live
| What | File |
|---|---|
| Homepage (7 chapters) | `src/pages/index.astro` |
| Features + reels | `src/pages/features.astro` (the `groups` array at the top holds all text and which reel goes where) |
| Pricing | `src/pages/pricing.astro` |
| Your data (URL `/security`) | `src/pages/security.astro` |
| About | `src/pages/about.astro` |
| Stories | `src/pages/stories.astro` |
| Contact (WhatsApp form) | `src/pages/contact.astro` |
| Privacy / Terms / Refund | `src/pages/privacy-policy.astro`, `terms-conditions.astro`, `refund-cancellation-policy.astro` |
| Header, footer, store links | `src/components/Header.astro`, `Footer.astro`, `StoreButtons.astro` |
| Landscape clip player | `src/components/Clip.astro` |
| Vertical reel (phone frame) | `src/components/Reel.astro` |
| Colours, fonts, spacing | `src/styles/global.css` (the `:root` block at the top) |
| Page shell, SEO tags, fonts | `src/layouts/Base.astro` |
| Podcast clips (landscape) | `public/video/*.mp4` + `*-poster.jpg` |
| Feature reels (vertical) | `public/video/reels/*.mp4` + `*-poster.jpg` |
| Founder photos | `public/images/founders/` |
| App screenshots, logo, store badges | `public/images/` |
| YouTube / Instagram embeds | `src/data/videos.ts` (add links here; the "full episode" section appears automatically) |

## 6. Common edits
- **Change text:** open the page file, edit the words between the tags, push. Vercel redeploys.
- **Add a podcast clip to a chapter:** drop `name.mp4` and `name-poster.jpg` into `public/video/`, then add a `<Clip … />` line in `index.astro` like the existing ones.
- **Add a reel to Features:** drop the files into `public/video/reels/`, add an entry to the `reels` list of the relevant group in `features.astro`.
- **Swap a founder photo:** replace the file in `public/images/founders/` keeping the same name.
- **Change the price:** search for `9,999` across `src/pages/` and the JSON-LD block at the top of `index.astro`.
- **Phone / email:** search for `91000 91343` and `info@kamerapp.com`.

## 7. Things still to confirm before go-live
- The figures: 20,000+ beds, 98% paying, Rs 9,999 per year, 150-bed limit.
- Support hours wording on Features and Contact.
- Real photos of the hostels (none on the site yet) and a photo of Sunil (initials shown for now).
- Whether the "three empty beds" customer can be named on Stories.
- Founders to read About, Stories and Home once for accuracy; the text was written from the podcast transcript.

## Notes
- `vercel.json` sets clean URLs so `/pricing` serves `pricing.html`. Keep it if you stay on Vercel.
- Legal pages were copied verbatim from the old site at the same URLs.
- Contact form opens WhatsApp with the details prefilled; nothing is stored on the site. Swap for Formspree/Tally if you want leads saved.
