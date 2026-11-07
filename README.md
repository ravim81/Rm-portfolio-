# Ravi M — Portfolio

Source repository for Ravi M's portfolio and Cloudflare Workers preview.

- Preview Worker: `rm-portfolio-preview`
- Editable website: `public/` (HTML, CSS, JavaScript, portraits and fonts)
- Automatic 23-agent cursor tour with choreographed cursor-first reveals, short readable pauses, smooth camera travel, replay, pause, manual exploration, project dialogs, filters, and comparison slider. Accessibility includes keyboard interruption and reduced-motion mode.
- Originally imported from ChatGPT Sites source commit `553c716f95e6cd1e2ad700c490fc8cf5e65b8a83`; subsequently upgraded in GitHub with cinematic 23-agent orchestration.

## Particle-to-reality opening

The 23-agent opening is implemented in `public/particle-intro.js` and controlled by the
shared animation clock in `public/build-story.js`. A Canvas 2D wordmark mask forms
`RAVI M.` with off-white and red particles; agents converge in groups of 8 / 8 / 7.
The particle wordmark transitions toward the existing DOM hero, which becomes
the real, accessible content. No image or canvas text substitutes for semantic HTML.

- Nominal introduction: about 3.1 seconds before the normal tour continues.
- Responsive quality budgets: 360–600 particles on mobile and 850–1650 on desktop,
  based on viewport width and approximate device capability.
- Scroll, touch, keyboard navigation and interactive clicks interrupt the introduction
  and immediately restore the normal document.
- Pause freezes the intro clock; Resume continues where it stopped; Replay rebuilds it.
- Reduced-motion settings, deep links, restored scroll positions and unavailable Canvas
  gracefully skip the particle effect.
- `npm run check` includes a mocked Canvas rendering test, quality-budget checks,
  source integration assertions and existing Worker tests.

## Cinematic cursor trails

The 23 cursors draw short red, rose, and silver light ribbons using
`public/cursor-trails.js`. This is a single lightweight Canvas 2D overlay,
integrated into `build-story.js`'s existing animation frame. No separate
render loop or heavy blur/shadow filter is used.

- Curved trails track each agent during particle construction, content reveals,
  and camera transitions, then fade out naturally.
- Collaborators briefly connect with faint geometric drafting lines;
  the lines are hidden when an agent moves on to another part of the story.
- Low-end/mobile settings reduce resolution, history length, and frame rate;
  desktop uses a denser trail history where resources allow.
- Pausing freezes animation timelines, camera position, and particle timing;
  Resume continues at the same point. Scrolling or interacting takes over
  the page and removes the effects cleanly.
- Replay clears old trails and rebuilds both the particle intro and the tour.
- Reduced-motion mode and environments without Canvas/Path2D stay functional.
- `tests/cursor-trails.test.mjs` covers budget, drawing, fade-out, resizing,
  graceful fallback, script order, and shared-clock integration.

## Intelligent 23-agent swarm formations

`public/swarm-formation.js` is the deterministic geometry engine for the existing
portfolio. It is loaded between the trail renderer and `public/build-story.js`
and uses the *same* requestAnimationFrame clock as the particle intro and trails.

- **23 builders, assigned deliberately:** every visible content block receives
  at least one agent; complex project art, images, and comparisons receive more
  agents than simple rows. Tasks include outline, illustration, inspection,
  baseline, framing, before/after transition and polish.
- **Content-aware formations:** image orbits, project-art boundaries,
  heading baselines, form frames, comparison lanes, and aligned list rails.
- **Smooth travel:** agents are allocated to the nearest available construction
  location, follow restrained quadratic Bezier travel paths and keep their group
  through a three-lane camera transition.
- **Collision and copy avoidance:** short-range symmetrical separation and a
  deterministic nearest-free correction keep the 23 pointers distinct, while
  measured project information and artwork titles remain protected.
- **Performance:** no extra animation loop, no physics library, no WebGL;
  adaptive separation and fewer drafting guides for constrained/mobile screens.
- **Accessibility:** cursors remain decorative with an aria-hidden overlay;
  keyboard/touch/wheel input, manual exploration, reduced-motion, replay,
  pause, deep links, and normal page interactions continue to work.
- **Tests:** `tests/swarm-formation.test.mjs` covers all 23 assignments,
  deterministic plans, mobile viewports, separation, project-copy clearance,
  and intro/camera group formations.

## Kinetic typography — cursor-built headlines

`public/kinetic-typography.js` adds a Canvas 2D *visual-only* letter construction
effect to selected headings. The semantic HTML, links, fonts, original text
nodes, natural line wrapping, and accent spans remain untouched.

- The particle-built `RAVI M.` hero wordmark is preserved. The next hero
  headline and later section titles are assembled character by character.
- DOM Ranges measure each glyph's real position, including explicit line
  breaks and colored spans. Each glyph travels from a nearby assigned agent
  through a short, restrained kinetic path before becoming real text.
- Cursors, particles, trails, swarm formations, and kinetic typography share
  the same animation controller and requestAnimationFrame. No new animation
  package, renderer, or separate timer is needed for the visual effect.
- Quality adapts to mobile, device memory, and CPU; at most two concurrent
  headline effects are drawn on mobile and three on desktop.
- Pause freezes the kinetic clock; replay and manual exploration restore all
  headings; reduced-motion visitors see original text immediately.
- Unsupported Canvas/Range or an animation failure falls back to ordinary
  text reveals. The independent safety net also releases hidden headings.
- Tests cover letter sampling, actual draw calls, semantic text preservation,
  mobile limits, pause/resume, replay, failed rendering, and the complete
  story's progression beyond the opening animation.

## Cross-browser quality gate

Automated browser coverage uses Playwright in Chromium, Firefox and WebKit
(the browser engines behind Chrome/Edge, Firefox and Safari). The matrix
tests 12 viewport configurations: small/standard/large phones, a foldable,
landscape phone, compact and full tablets, phone desktop-site mode, laptop,
desktop, and large desktop.

- `scripts/browser-audit.mjs` runs responsive layout, image, no-horizontal-
  overflow, interactive project dialogs, filter, mobile menu, comparison
  slider, accordion and contact-brief checks. It also runs an axe-core
  WCAG 2.1 A/AA audit on representative mobile, tablet and desktop views.
- It runs real 23-agent autoplay, manual takeover, replay, pause and resume
  tests on representative devices, with screenshot and JSON report artifacts.
- `.github/workflows/browser-audit.yml` tests the checked-out source on
  every relevant change.
- `scripts/live-smoke.mjs` and `.github/workflows/live-smoke.yml` exercise
  the **public deployed Cloudflare Worker** in Chromium mobile/desktop,
  WebKit mobile and Firefox desktop.
- `.github/workflows/live-matrix.yml` additionally runs the full browser
  matrix against the deployed Worker; it is kept separate from the local
  test so that deployment-specific caching/assets cannot be mistaken for
  source-level failures.

Local execution, after installing Playwright + axe-core and its browser
binaries:

```sh
npm install --no-save playwright@1.56.1 axe-core@4.10.3
npx playwright install chromium firefox webkit
node scripts/browser-audit.mjs
PORTFOLIO_URL=https://rm-portfolio-preview.mallaravikumar9618.workers.dev/ node scripts/browser-audit.mjs
node scripts/live-smoke.mjs
```

This automation is a broad **browser-engine regression test**, not a claim
that every physical Android/iOS device or operating system is tested. Actual
device GPU frame rates, screen-reader interaction and human visual review
remain important final checks. The automated accessibility checker may mark
some cases as `incomplete` and they require manual inspection.

## Development

Use Node 22 or newer. No npm dependencies are required.

```sh
python3 -m http.server 8080 --directory public
npm run check
npm run build
```

## Deployment

The connected Cloudflare integration can deploy `.build/worker-upload.json` with the Workers multipart upload API. The generated bundle includes all assets when deployed from a full local checkout. The connected deployment may temporarily use a pinned GitHub URL fallback for the large portrait if that binary cannot be transferred through the connector; other assets are bundled.

Alternatively, set `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` securely in your deployment environment and run `npm run deploy`. Never commit credentials. `SOURCE_REVISION` can identify the source revision; otherwise Git HEAD is used.

GitHub Actions checks code and packages the Worker on pushes and pull requests. Push-to-deploy is not enabled automatically; deployments are performed through the connected Cloudflare integration or the deploy script.

The contact brief downloads locally and does not send email. Some linked project previews may require their own access.
