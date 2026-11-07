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
