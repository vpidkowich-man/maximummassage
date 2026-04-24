# Maximum Health — Landing Page Build Instructions
## For Claude Code + Antigravity IDE → GitHub → Cloudflare Pages

---

## Project Overview

Build two landing pages for Maximum Health Massage Therapy Calgary, deployed via GitHub to Cloudflare Pages under the `go.maximummassage.ca` subdomain.

**Page 1 — Relaxation/General Audience** (`/massage-therapy-calgary/` or `/massage-calgary/`)
Short, conversion-optimized page for casual "massage near me" searchers. Direct booking flow.

**Page 2 — Complex/Chronic Pain Audience** (`/therapeutic-massage-calgary/` or similar)
Longer, clinical-tone page for chronic pain / injury recovery searchers. Retains quiz flow + direct booking.

Both pages share: brand colors, therapist picker lightbox component, Cal.com booking integration, footer, and Cloudflare Pages deployment pipeline.

---

## Tech Stack

- **Static HTML/CSS/JS** (no framework needed — these are landing pages)
- **GitHub repo** (free tier, private repo)
- **Cloudflare Pages** (connected to GitHub, auto-deploys on push)
- **Cal.com** embeds for booking (lightbox mode, pulls Jane EHR availability)
- **Google Tag Manager** for all tracking (Clarity, conversion tags, scroll depth, remarketing — all managed inside GTM, only the GTM snippet is hardcoded)

---

## Repo Structure

```
maximum-health-landing/
├── public/
│   ├── index.html                      # Redirect or root page
│   ├── massage-therapy-calgary/
│   │   └── index.html                  # Page 1 — Relaxation audience
│   ├── therapeutic-massage-calgary/
│   │   └── index.html                  # Page 2 — Chronic/complex audience
│   ├── confirmation/
│   │   └── index.html                  # Post-booking confirmation (fires conversion pixel)
│   ├── privacy-policy/
│   │   └── index.html
│   ├── terms/
│   │   └── index.html
│   ├── css/
│   │   ├── shared.css                  # Brand tokens, typography, shared components
│   │   ├── page1.css                   # Page 1 specific styles
│   │   └── page2.css                   # Page 2 specific styles
│   ├── js/
│   │   ├── therapist-picker.js         # Shared lightbox component
│   │   ├── quiz.js                     # Quiz logic (Page 2 only)
│   │   └── utm-capture.js              # UTM/gclid sessionStorage helper
│   └── images/
│       ├── logo.webp
│       ├── therapists/
│       │   ├── brookelyn.webp
│       │   ├── meagan.webp
│       │   ├── kassandra.webp
│       │   ├── charlotte.webp
│       │   ├── tracy.webp
│       │   └── lindsey.webp
│       └── og-image.webp               # Social share image (1200x630)
│   ├── favicon.ico
│   ├── favicon-32x32.png
│   ├── apple-touch-icon.png
│   └── robots.txt
├── wrangler.toml                        # Cloudflare Pages config (if needed)
└── README.md
```

**Important:** Cloudflare Pages serves from the `public/` directory. Set the build output directory to `public/` in Cloudflare Pages settings. No build command needed for static files — leave it blank or set to `exit 0`.

---

## Brand Design Tokens

Use these consistently across both pages:

```css
:root {
  /* Primary brand green */
  --brand-primary: #4a7c6b;
  --brand-primary-dark: #2d5e4a;
  --brand-primary-light: #eef5f1;
  --brand-primary-border: #a3c9b2;
  --brand-primary-muted: #6b8f7a;

  /* Text */
  --text-dark: #1a1a1a;
  --text-body: #333333;
  --text-muted: #6b8f7a;

  /* Backgrounds */
  --bg-white: #ffffff;
  --bg-light: #eef5f1;
  --bg-overlay: rgba(0, 0, 0, 0.5);

  /* Offer */
  --offer-bg: #d0e8d8;
  --offer-text: #2d5e4a;

  /* Typography */
  --font-body: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 40px;

  /* Radius */
  --radius-sm: 8px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-pill: 20px;
}
```

---

## Page 1 — Relaxation/General Audience

### Purpose
Fast-converting page for "massage near me" and general massage searches. Minimal copy, maximum clarity. These people want to book, not read.

### Above the fold (must all be visible without scrolling on mobile)

1. **Header bar**
   - Left: "MAXIMUM HEALTH" logo text
   - Right: Tap-to-call button with phone icon — `<a href="tel:+1XXXXXXXXXX">`
   - Background: `var(--brand-primary)`

2. **Hero section** (still on brand-primary background)
   - H1: "Massage therapy in Calgary that actually fixes things"
   - Subhead: "Therapeutic, results-focused RMTs. 28 years serving Calgary. Insurance-friendly receipts provided."
   - Star rating: ★★★★★ 5/5 from 1,749+ clients

3. **Primary CTA block** (white background card)
   - Label: "New client session — 60 min"
   - Price: "$114" with "$124" struck through + "$10 off new clients" badge
   - Button: "Book now — pick your therapist" → opens therapist picker lightbox
   - Background: `var(--bg-light)` with `var(--brand-primary-border)` border

4. **Secondary CTA**
   - "Not sure who to see? Take the 30-sec quiz to get matched"
   - Outlined/ghost button style → opens quiz lightbox

5. **Location bar** (small muted text)
   - "West Hillhurst, NW Calgary · Mon–Sat · Free parking"

### Below the fold

6. **Trust stats** — 2×2 grid
   - 28 yrs in business | 91% clients return
   - 103 yrs combined experience | All RMTs insurance claimable

7. **What we help with** — pill/tag chips
   - Back & neck pain, Migraines, Sports injuries, Chronic tension, Stiffness, Post-injury recovery

8. **Complex case bridge** — subtle callout block (not a full section)
   - Headline: "Dealing with something more complex?"
   - Body: "If you've tried physio, chiro, or medication and nothing's stuck — that's exactly who we work with. Our RMTs specialize in chronic pain, injury recovery, and cases where the usual approach hasn't helped."
   - Link: "Learn more about our therapeutic approach →" → links to Page 2
   - Style: light background card or left-border accent. Feels like a helpful aside, not a major section.

9. **Testimonial** — single review in a card

10. **3 simple steps** — numbered list
   - 1. Book online or call
   - 2. Assessment + treatment on day one
   - 3. Leave with a plan and real relief

11. **Second CTA button** — "Book now — $114 new client rate"

12. **FAQ section** — 5 questions, collapsible accordion
    - What happens at my first visit?
    - Do you direct bill insurance?
    - How soon can I get in?
    - Should a massage hurt?
    - Where are you located?

13. **Final CTA** — "Ready to feel like yourself again?" + book button

14. **Footer** — address, hours, privacy/terms links, copyright

### Full copy for Page 1
Reference the file: `maximum-health-landing-page-copy.md` (already provided — contains all headlines, body copy, FAQ answers, therapist bios, and CTA text)

---

## Page 2 — Complex/Chronic Pain Audience

### Purpose
Longer page for chronic pain, injury recovery, and complex case searchers. Retains clinical messaging about nervous system work, detective-first approach, lived experience. These people WILL scroll and read — they're researching.

### Structure

Same above-the-fold layout as Page 1 BUT with different headline and subhead:

- H1: "When nothing else has worked for your pain — we get it"
- Subhead: "Therapeutic massage grounded in nervous system science. For chronic pain, injury recovery, and complex cases. 28 years in Calgary."

Then below fold, in order:
1. Trust stats (same as Page 1)
2. "We know what it's like" empathy section (adapted from current page — shorter)
3. What we help with (expanded list including chronic pain, post-injury, migraines)
4. "Not your average massage therapists" differentiators section
   - Detectives first, therapists second
   - Nervous system as north star
   - Personalized treatment plans
   - Pain ≠ gain
   (Keep these but as short 2-3 sentence blocks, NOT the long paragraphs currently on the page)
5. How it works — 3 steps
6. Social proof stats (1,749+ clients, 91% return, etc.)
7. Therapist bios (brief — name, photo, specialty, one quote each)
8. Testimonials (2-3 reviews, especially Tracy and Charlotte ones from current page)
9. "Should you work with us" qualifier section (shortened from current page)
10. FAQ (same 5 + add "How do you work with the nervous system?" and "How long do I have to keep coming?")
11. Final CTA
12. Footer

### Key differences from current page
- Price, phone number, and direct book CTA are above the fold (they aren't now)
- Page is ~50% shorter than current version (cut repetitive philosophy sections)
- Typos fixed throughout
- Both booking paths available: direct picker + quiz
- Corporate logos section removed (not relevant to chronic pain audience)
- "Should you work with us" section shortened to 4-5 bullets max

---

## Shared Component: Therapist Picker Lightbox

This is the core interactive component used on both pages. Build as a standalone JS module.

### Behavior

1. User clicks "Book now — pick your therapist" button
2. Overlay appears (dark scrim + white lightbox)
3. Shows 6 therapist cards in a 2-column grid (mobile) or 3-column (desktop)
4. Each card: circular photo, name, one-line specialty
5. Tapping a card slides in a detail panel from the right
6. Detail panel shows:
   - Back arrow + "All therapists" link (returns to grid)
   - Larger photo
   - Full name + RMT
   - Specialty title
   - 2-sentence bio
   - Specialty tags
   - One testimonial quote
   - Experience line
   - Price with discount badge
   - "Book with [Name] — 60 min" button
7. Tapping the book button opens Cal.com embed lightbox for that specific therapist
8. Close X on the lightbox returns to the page

### Animation
- Lightbox: fade in overlay + slide up lightbox (200ms ease)
- Detail panel: slide in from right (250ms ease)
- Back: slide out to right (200ms ease)

### Cal.com Integration
Each therapist has a unique Cal.com booking link. The book button should trigger Cal.com's embed in lightbox/popup mode.

```html
<!-- Cal.com embed script — load once in page head -->
<script src="https://app.cal.com/embed/embed.js" async></script>

<!-- Trigger per therapist -->
<button onclick="Cal('ui', {
  calLink: 'THERAPIST_CAL_LINK',
  config: { layout: 'month_view' }
})">Book with Brookelyn — 60 min</button>
```

Replace `THERAPIST_CAL_LINK` with each therapist's actual Cal.com link. Victor will need to provide these.

### Therapist Data

Store as a JS array so both pages can import it:

```javascript
const therapists = [
  {
    id: 'brookelyn',
    name: 'Brookelyn Brolly',
    title: 'RMT',
    specialty: 'Sports + injury recovery',
    photo: '/images/therapists/brookelyn.webp',
    bio: 'Results-driven therapist who helps active people get back to the things they love. Direct, practical, and grounded in deep anatomical knowledge.',
    tags: ['Sports injuries', 'SI joint + low back', 'Cervical spine', 'Jade stone'],
    review: {
      text: 'Brookelyn really listened and tailored the session to exactly what I needed. I felt better after one visit.',
      source: 'Google review'
    },
    experience: '10,000+ hours hands-on. Graduated MacEwan University, 2014.',
    calLink: 'REPLACE_WITH_ACTUAL_CAL_LINK',
    price: 114,
    regularPrice: 124
  },
  {
    id: 'meagan',
    name: 'Meagan Brown',
    title: 'RMT',
    specialty: 'Whole-body + craniosacral',
    photo: '/images/therapists/meagan.webp',
    bio: 'Deeply intuitive, movement-aware therapist who takes a whole-body view of pain and recovery. Brings a calming presence and works to help your body find balance without pushing past limits.',
    tags: ['Craniosacral therapy', 'Reflexology', 'Thai massage'],
    review: {
      text: 'Meagan has a gift for understanding what your body needs. I always feel noticeably better after every session.',
      source: 'Google review'
    },
    experience: '10,000+ hours hands-on.',
    calLink: 'REPLACE_WITH_ACTUAL_CAL_LINK',
    price: 114,
    regularPrice: 124
  },
  {
    id: 'kassandra',
    name: 'Kassandra Wilson',
    title: 'RMT',
    specialty: 'Deep tissue + sports',
    photo: '/images/therapists/kassandra.webp',
    bio: 'Seasoned therapist with nearly two decades of experience. Focused, restorative style grounded in helping clients recover, perform, and feel like themselves again.',
    tags: ['Cupping', 'Deep tissue', 'Sports massage'],
    review: {
      text: 'Kassandra knows exactly where the tension is and works through it effectively. I have been coming back for years.',
      source: 'Google review'
    },
    experience: '15,000+ hours hands-on.',
    calLink: 'REPLACE_WITH_ACTUAL_CAL_LINK',
    price: 114,
    regularPrice: 124
  },
  {
    id: 'charlotte',
    name: 'Charlotte Tooth',
    title: 'RMT',
    specialty: 'Chronic pain + cupping',
    photo: '/images/therapists/charlotte.webp',
    bio: 'Results-focused therapist with a calm, clinical approach and a deep commitment to helping people move better and feel better. Advanced skills in injury recovery and chronic pain care.',
    tags: ['Dynamic cupping', 'Myofascial release', 'Trigger point', 'Lymphatic drainage', 'Pre/post-partum', 'Reiki'],
    review: {
      text: 'Charlotte is an experienced and knowledgeable professional. Best massage therapist ever — highly recommend!',
      source: 'Google review'
    },
    experience: '7,200+ hours hands-on.',
    calLink: 'REPLACE_WITH_ACTUAL_CAL_LINK',
    price: 114,
    regularPrice: 124
  },
  {
    id: 'tracy',
    name: 'Tracy Schneider-Steeves',
    title: 'RMT',
    specialty: 'Trigger point + craniosacral',
    photo: '/images/therapists/tracy.webp',
    bio: 'Therapeutic, results-focused therapist who blends years of experience with a deep commitment to understanding clients on every level. Sessions are both specific and grounding.',
    tags: ['Cupping', 'Trigger point therapy', 'Craniosacral therapy'],
    review: {
      text: 'Tracy is exactly what I have been looking for in a massage therapist for years. Her attention to detail and genuine interest in helping my body recover is unmatched.',
      source: 'Marc W., Google review'
    },
    experience: '20,000+ hours hands-on.',
    calLink: 'REPLACE_WITH_ACTUAL_CAL_LINK',
    price: 114,
    regularPrice: 124
  },
  {
    id: 'lindsey',
    name: 'Lindsey Stauffer',
    title: 'RMT',
    specialty: 'Fascial release + nervous system',
    photo: '/images/therapists/lindsey.webp',
    bio: 'Calm, detail-oriented therapist with a deeply supportive presence. Blends fascial release techniques with a nervous-system-aware approach to reduce pain, improve movement, and restore balance.',
    tags: ['Fascial release', 'Yoga teacher', 'Doula', 'Acupuncture (in training)'],
    review: {
      text: 'Lindsey creates such a safe, calming space. Her fascial work is incredible — I noticed a difference after the first session.',
      source: 'Google review'
    },
    experience: '4,000+ hours hands-on.',
    calLink: 'REPLACE_WITH_ACTUAL_CAL_LINK',
    price: 114,
    regularPrice: 124
  }
];
```

---

## Shared Component: Quiz Lightbox (Page 2 + optional on Page 1)

The existing weighted quiz form logic. This needs to be rebuilt as a JS lightbox component.

### Quiz Questions (from existing form)

**Q1:** What best describes why you're looking for massage therapy?
- Recovery from an injury
- Pain management
- Relaxation and stress relief
- Other

**Q2:** What are you currently dealing with? (multi-select)
- Muscle tension
- Chronic pain
- Recent injury
- Stress and anxiety
- Pregnancy or post-natal recovery

**Q3:** How would you rate your pain level or discomfort on a scale of 1 to 10?
- Slider: 1–10

**Q4:** What have you tried so far? (multi-select)
- I haven't tried anything yet
- Massage Therapy
- Physiotherapy
- Chiropractic or osteopathy
- Medication or painkillers
- Other therapies or self-care

**Q5:** What is your primary goal?
- Reduce pain and discomfort
- Help me relax and de-stress
- Improve mobility and flexibility
- Reduce stress and anxiety

### Weighted Matching Logic
Victor to provide the existing weighted scoring matrix that maps quiz answers to therapist recommendations. The quiz result should display inside the lightbox as a therapist detail panel (same component as the picker) with "Based on your answers, we recommend..." framing at the top.

---

## Tracking & Analytics Setup

All tracking (Google Ads conversions, Microsoft Clarity, scroll depth events, and any future pixels) is managed through Google Tag Manager. The only script that needs to be hardcoded on the pages is the GTM container snippet.

### Google Tag Manager
Add GTM container snippet to the `<head>` and `<body>` of every page:

```html
<!-- GTM head snippet -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-XXXXXXX');</script>

<!-- GTM noscript (immediately after opening <body>) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
```

Replace `GTM-XXXXXXX` with Victor's actual container ID. Everything else (Clarity, scroll depth, conversion tags, remarketing) lives inside GTM — no additional scripts needed in the codebase.

### UTM parameter capture
Capture UTM params and gclid from the URL on page load and store in sessionStorage. Pass them through to the quiz form submission and Cal.com booking (if Cal.com supports custom fields).

```javascript
const params = new URLSearchParams(window.location.search);
['gclid', 'utm_source', 'utm_campaign', 'utm_medium', 'utm_term', 'utm_content'].forEach(key => {
  const val = params.get(key);
  if (val) sessionStorage.setItem(key, val);
});
```

---

## Confirmation Page (`/confirmation/`)

Simple page shown after Cal.com booking completes. Cal.com should redirect here after successful booking.

Content:
- "You're booked!" heading
- "We'll see you at 213 19 St NW #4, Calgary. Check your email for confirmation details."
- Google Maps embed or static map image
- "What to expect" — brief note about intake form, what to wear, parking

This page fires:
- All conversion tracking via GTM (Google Ads, Clarity goals, any future pixels — all configured inside GTM, nothing hardcoded)

---

## SEO & Performance

### Meta tags (per page)
```html
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Massage Therapy Calgary — Maximum Health | Book Online</title>
<meta name="description" content="Therapeutic massage therapy in Calgary. 28 years experience, all RMTs, insurance claimable. Book your $114 new client session.">
<link rel="canonical" href="https://go.maximummassage.ca/massage-therapy-calgary/">
<meta property="og:title" content="Massage Therapy Calgary — Maximum Health">
<meta property="og:description" content="Therapeutic, results-focused RMTs. Book your new client session for $114.">
<meta property="og:image" content="https://go.maximummassage.ca/images/og-image.webp">
<meta property="og:url" content="https://go.maximummassage.ca/massage-therapy-calgary/">
```

### Performance
- All images in .webp format, compressed
- Therapist photos: 200x200 for cards, 400x400 for detail panels
- No external fonts — use system font stack
- Inline critical CSS for above-the-fold content
- Defer non-critical JS (quiz, tracking) with `defer` attribute
- Target < 2s LCP on mobile

### Favicon & Essentials
- Favicon: `/public/favicon.ico` + `/public/favicon-32x32.png` + `/public/apple-touch-icon.png`
  - Victor to provide logo icon or Claude Code can generate from the brand mark
- Include in `<head>` of every page:
```html
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
```
- OG image for social sharing: `/public/images/og-image.webp` (1200x630px recommended)
- Add `robots.txt` at `/public/robots.txt`:
```
User-agent: *
Allow: /
Sitemap: https://go.maximummassage.ca/sitemap.xml
```
- Optional: `sitemap.xml` listing the two landing pages + confirmation page

---

## Cloudflare Pages Deployment

### Setup
1. Push repo to GitHub (private repo, free tier)
2. In Cloudflare dashboard: Pages → Create project → Connect to GitHub
3. Select the repo
4. Build settings:
   - Build command: (leave blank or `exit 0`)
   - Build output directory: `public`
5. Custom domain: `go.maximummassage.ca` (add CNAME in Cloudflare DNS)

### Deployment
Every push to `main` branch auto-deploys. Preview branches deploy to preview URLs for testing.

---

## Pre-Launch Checklist

- [ ] All Cal.com therapist booking links inserted and tested
- [ ] Phone number added (tap-to-call verified on mobile)
- [ ] GTM container ID inserted and snippet verified on all pages
- [ ] Confirmation page live and URL confirmed in GTM for conversion tag
- [ ] All therapist photos compressed and uploaded
- [ ] Quiz weighted matching logic ported and tested
- [ ] Complex case bridge section on Page 1 links to Page 2
- [ ] Mobile responsive tested (360px, 390px, 414px widths)
- [ ] Page speed tested (target < 2s LCP)
- [ ] Favicon set (ico, 32x32 png, apple-touch-icon)
- [ ] OG image set (1200x630)
- [ ] robots.txt in place
- [ ] Privacy policy and terms pages live
- [ ] Google Ads landing page URLs updated for both ad groups
- [ ] All placeholder review quotes replaced with real Google reviews
- [ ] Typo-free: Brolly (not Bolly), recommend, training, loss (not lose)

---

## Things Victor Needs to Provide to Claude Code

1. **Cal.com booking links** for each of the 6 therapists
2. **Phone number** for the tap-to-call button
3. **Therapist headshot photos** (originals — Claude Code can compress)
4. **GTM container ID** (GTM-XXXXXXX) — this is the only tracking script needed; everything else (Clarity, Ads conversions, scroll depth, remarketing) is managed inside GTM
5. **Quiz weighted scoring matrix** (which answers map to which therapist recommendation)
6. **Any real Google review quotes** to replace placeholder testimonials for Brookelyn, Meagan, and Lindsey
7. **Favicon/logo icon** (or confirm Claude Code should generate from brand mark)

---

## Updates — 2026-04-24

**Read this section before acting on anything above.** The document above is the original spec from a prior Cloud web session. The model and several details have changed. Where this section conflicts with the above, this section wins.

### Model is now A/B split-test, not 3-page

The project is a single A/B test between two landing pages, not a 3-page build:

| Flow | Role | Content | On-disk path |
|---|---|---|---|
| **Flow A** (control) | Existing live page, kept as-is | Chronic pain / nervous system / clinical — the long original | `public/massage-therapy-calgary-flow-a/index.html` |
| **Flow B** (variant) | New page built in this project | Short, conversion-focused, relaxation/general audience (= what this doc calls "Page 1 — Relaxation/General Audience") | `public/massage-therapy-calgary-flow-b/index.html` |

"Page 2 — Complex/Chronic Pain Audience" as described above (a rebuilt/shortened pain page) is **not being built**. Flow A stays untouched.

### Production URL preservation

The existing live URL `go.maximummassage.ca/massage-therapy-calgary/` must keep serving Flow A so Google Ads URLs don't break. Handled via `public/_redirects`:

```
/massage-therapy-calgary/*  /massage-therapy-calgary-flow-a/:splat  200
```

Status 200 is a rewrite (browser URL unchanged). Flow B's production URL is TBD — decide at deploy time.

### Therapist roster is 4, not 6

Only **Brookelyn, Meagan, Charlotte, Lindsey** appear on Flow B. Kassandra and Tracy are excluded because they don't have Cal.com calendars. The 6-therapist data block above (with `kassandra` and `tracy` entries) should be ignored — the implementation in `public/js/therapist-picker.js` is canonical.

**Cal.com handle corrections:**
- Brookelyn → `bbrolly/60min`
- Meagan → `meaganb/60min`
- Charlotte → `ctooth/90min` (90 min, not 60 — button text says "Book with Charlotte — 90 min")
- Lindsey → `lstauffer/60min`

### Repo structure (current, superseding the tree above)

```
public/                                         ← Cloudflare Pages build output
├── index.html                                  ← root redirect → /massage-therapy-calgary/
├── _redirects                                  ← Flow A URL rewrite
├── robots.txt
├── favicon.ico
├── massage-therapy-calgary-flow-a/
│   └── index.html                              ← Flow A (control, original)
├── massage-therapy-calgary-flow-b/
│   ├── index.html                              ← Flow B (variant, new)
│   └── confirmation/index.html                 ← Flow B's own confirmation
├── brookelyn/, charlotte/, meagan/, lindsey/   ← Flow A practitioner pages (top-level, URLs unchanged)
├── privacy-policy/, terms/                     ← shared legal pages
├── css/
│   ├── shared.css                              ← brand tokens + shared components
│   └── flow-b.css                              ← Flow B page styles (was page1.css)
├── js/
│   ├── therapist-picker.js                     ← shared lightbox (data-open-picker triggers)
│   └── utm-capture.js
├── images/
│   ├── therapists/{brookelyn,meagan,charlotte,lindsey}.webp   ← Flow B picker photos
│   └── [Landingi/uploadcare images]            ← Flow A assets
└── assets/                                     ← Flow A's Landingi JS/CSS/fonts
```

### Deferred / not built

- **Quiz lightbox** (`quiz.js`) — not built. The "optional on Page 1" quiz CTA was omitted from Flow B.
- **Complex case bridge section on Flow B** — removed. A/B test has no crossover between variants.
- **OG image** `/images/og-image.webp` — doesn't exist yet. OG meta points to it as a placeholder.
- **Favicon PNG variants** (32×32, apple-touch-icon) — not created yet; only `.ico` present.

### Known placeholders in code

- `tel:+1XXXXXXXXXX` in Flow B header (commented) — pending tracking phone number
- `GTM-5M8LTCF8` — confirmed, inserted
- Tracy's testimonial still appears on Flow B's "What clients say" section even though she's not in the picker; flagged for later swap

### Rollback

Tag `pre-rebuild-2026-04-21` and branch `rollback/pre-rebuild-2026-04-21` point at the pre-restructure HEAD. Restore with:
```
git reset --hard pre-rebuild-2026-04-21
```
