# Kolab SEO Audit — Current State vs. Target System

Date: 2026-09-14
Scope: `web/` (ourkolab.com), the public-facing surface only. No code changed by this audit.

## Headline finding

**This is not a blank slate.** A reasonably mature SEO layer already exists: a build-time
Playwright prerenderer, a shared `<SEO>` component with OG/Twitter/JSON-LD support, a
hand-maintained sitemap and robots.txt, a custom Express server (`server.mjs`) built
specifically to fix a Search Console soft-404 issue, and per-entity structured data
(`Person`, `Organization`, `JobPosting`) already authored on the three public detail pages.

The work ahead is mostly **closing gaps in and reconciling contradictions within an existing
system**, not building one from scratch. Two things stand out as genuinely broken today
(§2.1, §2.2) and should be treated as P0, ahead of the rest of the requirements doc's P1 list.

---

## 1. What already exists (don't rebuild)

| Piece | Location | Notes |
|---|---|---|
| Shared metadata component | `web/src/lib/seo/SEO.tsx` | title/description/canonical/robots/OG/Twitter/JSON-LD, React-19 native head-hoisting, no Helmet dependency |
| SEO config | `web/src/lib/seo/config.ts` | `SITE_URL`, `SITE_NAME`, `absoluteUrl()` |
| JSON-LD factories | `web/src/lib/seo/schema.ts` | `organizationSchema`, `websiteSchema`, `webPageSchema`, `faqSchema`, `breadcrumbSchema` |
| Build-time prerender | `web/scripts/prerender.mjs` | Playwright snapshot of 41 hardcoded marketing routes into static `dist/<route>/index.html` |
| Production server | `web/server.mjs` | Serves prerendered HTML where it exists, SPA shell for known public prefixes, real 404 otherwise (fixes a previously diagnosed Search Console soft-404/duplicate-canonical bug) |
| Sitemap | `web/public/sitemap.xml` | Static, hand-maintained, 45 URLs (marketing pages only) |
| Robots | `web/public/robots.txt` | Static, blocks admin/auth/dashboards + (see §2.1) `/creators` and `/businesses` |
| Slug support | `CreatorProfile.username` (Prisma) | Creators already have real slugs; resolved via `resolveHandleToId()` with ID fallback |
| Per-entity structured data | `CreatorProfilePage.tsx` (`Person`), `BusinessProfilePage.tsx` (`Organization`), `EventDetailPage.tsx` (`JobPosting`) | Already well-formed, including `JobPosting` salary/location/dates for events |
| Programmatic landing pages | `content/niche/NichePage.tsx` + `industries.data.tsx` (14) + `cities.data.tsx` (8) | Already covers most of the requirement doc's §3/§4 city+category page ask |
| GA4 | `web/index.html` (`G-R74M17YZQ6`) | Present site-wide |

The requirements doc's §2, §3, §4, §9, §15 (Organization/WebSite/ProfilePage/JobPosting), and
§26 (reusable SEO utilities) are **already substantially built**. The audit below focuses on
what's missing, broken, or inconsistent — that's where the real work is.

---

## 2. Critical issues (P0 — fix before anything else)

### 2.1 `robots.txt` blocks the exact pages the app is trying to get indexed

```
Disallow: /creators
Disallow: /businesses
```

This blocks **every** creator and business profile URL (prefix match), while:
- Both pages render full `<SEO>` metadata with no `noindex`.
- `server.mjs` comments describe `/creators` as a "public, indexable SPA route."
- `/events` has no such block and is treated as indexable.

Net effect today: **no creator or business profile can rank on Google**, full stop, regardless
of anything else in this audit. This is the single highest-leverage fix available — a two-line
robots.txt change unblocks the core "creators in Nepal" / "hire creators Nepal" search intent
that requirements §1 and §40 are entirely about.

Unknown: was this a deliberate decision (e.g. privacy concern, or waiting for prerendering)?
Flagging as a question rather than assuming — worth one sentence from the team before flipping
it, since it's a 5-minute change with real visibility consequences.

### 2.2 Dynamic detail pages are never prerendered

`/creators/:handle`, `/businesses/:id`, `/events/:id` all have correct per-entity `<SEO>` +
JSON-LD authored in React — but `prerender.mjs`'s `ROUTES` list is a hardcoded array of the 41
static marketing pages only. A crawler or link-unfurl bot (Googlebot's first pass, WhatsApp,
Slack, Facebook, iMessage) that doesn't execute JS gets the generic SPA shell, not that
creator's name/bio/image. This directly undermines requirements §5, §6, §22, and §32.

Google's indexer does generally execute JS on a second pass, so this isn't a total blocker the
way §2.1 is — but it degrades first-crawl reliability and kills social-share previews, which
matters a lot for a marketplace whose growth loop (requirements §44) depends on shared job/profile
links converting on WhatsApp/Facebook/Instagram DMs, the dominant sharing channels in Nepal.

### 2.3 Sitemap contains zero dynamic entity URLs

`sitemap.xml` only lists the 41 static pages. No `/creators/:handle`, `/businesses/:id`, or
`/events/:id` URL has ever been submitted to Google via sitemap. Combined with §2.1, this means
the *only* way Google could currently discover a creator/business page is by crawling the
`/creators` or `/businesses` listing page itself — which is also blocked.

---

## 3. High-priority gaps (map to requirements §7, §8, §12, §13, §32)

- **No slug for Business or Campaign/Event.** `BusinessProfile` and `Campaign` have no slug
  column in Prisma — only `CreatorProfile.username` exists. URLs are opaque `cuid()`s
  (`/businesses/ck9x...`, `/events/ck9x...`), violating requirements §31's "no bare IDs in
  public URLs" guidance and producing meaningless share-link/SERP-snippet text. Adding a
  business/campaign slug is a schema change (migration + backfill), heavier than anything else
  in this list — worth scoping as its own task rather than folding into the robots.txt/prerender
  fixes.
- **No dynamic sitemap generation.** Everything is hand-maintained across three independently
  synced lists (`App.tsx`, `prerender.mjs`, `sitemap.xml`) — fragile by construction, and
  structurally can't include dynamic entities anyway (a static file can't enumerate every
  creator). Needs a generated sitemap (sitemap index + `creators.xml`/`businesses.xml`/`events.xml`
  per requirements §13), sourced from the same public API endpoints already in
  `backend/src/modules/public/public.routes.ts`.
- **No indexability gate on dynamic pages.** `CreatorProfile.showPublicProfile` and
  `BusinessProfile.showPublicProfile` exist and are already enforced at the API layer (private
  profiles 404 before `<SEO>` even renders) — good. But there's no "thin profile" gate: a
  creator with an empty bio and no platforms still gets indexed if `showPublicProfile` is true.
  Requirements §5/§34 want completeness, not just privacy, to gate indexing.
- **Campaign lifecycle vs. indexing** (§7 of requirements doc) isn't wired up.
  `Campaign.status` (ACTIVE/PAUSED/CLOSED/EXPIRED, soft-deleted via `deletedAt`) already exists
  and is already enforced as a 404 gate for non-public statuses — but there's no
  expired-vs-cancelled distinction in the *indexing* sense (keep EXPIRED indexed with a
  "this opportunity has ended" message + noindex CLOSED/CANCELLED, per requirements §7).
- **No hreflang / alternate-language URLs.** `ne` is a `localStorage`-only UI toggle invisible
  to crawlers, on a single URL — yet `websiteSchema()` already asserts
  `inLanguage: ['en', 'ne']`, which is presently a false claim from a crawler's perspective.
  Requirements §19 explicitly says prepare the *architecture* for this, not necessarily ship
  Nepali pages now — so this is a "don't overclaim in JSON-LD" fix now, and a real
  hreflang/URL-prefix strategy later.
- **OG image is a bad crop.** `DEFAULT_OG_IMAGE` is a square 1024×1024 mark; link previews want
  ~1200×630. Already flagged in the code's own comment. Low effort, real conversion impact for
  WhatsApp/Facebook shares (requirements §32).
- **Listing pages use generic `WebPage` schema**, not `CollectionPage`/`ItemList`, and their
  meta description is a static i18n string rather than a live count ("214 creators in
  Kathmandu"). Minor, but easy uplift toward requirements §11/§34's "unique, dynamic metadata"
  goal.
- **Accidental `/business` → `/businesses` prefix collision** in `server.mjs`'s SPA-fallback
  routing (`startsWith` with no segment boundary). Currently harmless because robots.txt
  independently blocks `/businesses`, but becomes load-bearing the moment §2.1 is fixed — should
  be tightened to an exact-segment match as part of that same change, not left as a latent trap.

---

## 4. What's genuinely out of scope right now

Per requirements §37/§38/§41 and confirmed against the actual auth boundary
(`RequireAuth`/`RequireRole`/`ProtectedRoute` in `AppRoutes.tsx` / `App.tsx`):

- `/admin/*`, `/creator/*` (dashboard), `/business/*` (dashboard), all four auth screens —
  already correctly `Disallow`'d, no `<SEO>` import anywhere in those trees, nothing to change.
- Full city/category hub pages (`/cities-nepal`, `/industries-nepal`) and 22 programmatic
  niche pages already exist — the requirements doc's §3/§4 ask is largely done, not a gap.
- International/multi-country structure (§41) — explicitly deferred by the requirements doc
  itself; no action needed now.
- Blog (§18) — not found anywhere in the routes; genuinely net-new if the team wants it, but
  it's a P3/"growth" item per the requirements doc's own priority ordering, not urgent.
- JobPosting eligibility nuances (structured-data freshness/expiry requirements) — current
  implementation on `EventDetailPage.tsx` is a solid baseline; revisit against Google's current
  JobPosting spec only once §2.1–2.3 are fixed and there's real traffic to validate against.

---

## 5. Recommended sequencing

Adapted to the existing architecture — no framework rewrite, no SSR migration, extends what's
already there:

1. **P0 — fix the contradiction.** Remove `/creators` and `/businesses` from `robots.txt`
   (§2.1), and harden the `server.mjs` prefix match while touching that file anyway (§3, last
   bullet). Lowest effort, highest and most immediate visibility impact.
2. **P0 — extend prerendering to dynamic entities.** Generalize `prerender.mjs` beyond its
   hardcoded 41-route array to also snapshot public creator/business/event detail pages (and
   listing pages) at build time, or move to an on-request prerender/cache for these (since the
   full entity set is far larger and changes independently of deploys — a pure build-time
   snapshot of every creator doesn't scale the way it does for 41 static pages). This needs a
   design decision (build-time batch vs. on-demand cache) before implementation — flagging as a
   choice point, not deciding it here.
3. **P0 — dynamic sitemap.** Generate `sitemap.xml` (or a sitemap index +
   `creators.xml`/`businesses.xml`/`events.xml`) from the existing public API endpoints,
   gated on `showPublicProfile` / campaign status, regenerated on a schedule or on publish.
4. **P1 — indexability gate.** Add a "sufficiently complete" check (bio length, platform count,
   etc.) alongside the existing `showPublicProfile` gate before a profile is included in the
   sitemap / gets `index,follow` instead of `noindex,follow`.
5. **P1 — slugs for Business and Campaign.** Schema migration + backfill + redirect from old
   ID-based URL to new slug URL (301), same pattern already proven for creators.
6. **P2 — polish.** Proper 1200×630 OG image, `CollectionPage`/`ItemList` schema + dynamic
   descriptions on listing pages, campaign expired/cancelled indexing lifecycle, remove the
   overclaiming `inLanguage` JSON-LD until hreflang is real.
7. **P3 — growth.** Blog, real Nepali URL variants + hreflang, PR/backlink work — per the
   requirements doc's own priority ordering, and not before 1–6 land.

Each of these should stay scoped to `web/src/lib/seo/*`, `web/scripts/prerender.mjs`,
`web/server.mjs`, `web/public/{robots.txt,sitemap.xml}`, the public page components under
`web/src/app/public/*`, and (for step 5 only) a Prisma migration touching `BusinessProfile` /
`Campaign` — nothing under `/creator/*`, `/business/*` dashboard trees, `/admin/*`, payments,
auth, or messaging needs to move.
