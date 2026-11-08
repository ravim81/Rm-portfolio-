# Ravi M. — Open World Portfolio

React + Vite portfolio experience using React Three Fiber, drei, Rapier, GSAP and Tailwind. The world is a scroll-free third-person exploration: Paris-inspired intro, city ride, proximity skill panels, boat transfer, service displays, sunset finale and an interactive contact room.

## Run locally

```bash
npm install
npm run dev
```

Vite serves the project at http://localhost:5173/world/ (open the root URL shown by Vite if your local configuration redirects).

## Build and package for the existing Cloudflare Worker

```bash
npm run build
```

Vite builds into `public/world/`; the existing Worker packager then includes those assets in the isolated preview Worker. Deploy using the repository's existing secure Cloudflare deployment workflow / credentials. Never commit API tokens.

## Editable content

All names, service descriptions, skills, contact destinations, zone labels and asset placeholders live in `src/content.json`.

## Controls

- Desktop: WASD / arrow keys to steer, Shift to boost, Space to brake (brake binding is planned in the control pass).
- Mobile: on-screen steering pad and boost.
- Escape closes a service modal.
- Use “Skip to 2D” for the accessible, SEO-readable portfolio.

## Placeholder asset plan

The current prototype uses procedural low-poly geometry so the world works without large downloads. Replace assets incrementally with optimized GLB files:
- Eiffel / Paris skyline: create a low-poly landmark and skyline in Blender, export GLB; optional source models from Sketchfab (filter downloadable + CC0/CC-BY and verify attribution), Kenney city packs, or Poly Pizza (check each asset licence).
- Buildings, street props, traffic and trees: Kenney city / road assets and Poly Pizza CC0 models; instance repeated props and bake lighting.
- Bicycle, scooter and speedboat: Blender-made GLB models with separate wheel / propeller pivots; optional Sketchfab CC0/CC-BY models.
- Paraglider and meeting-room furniture: Blender low-poly models or Kenney furniture packs.
- Audio: self-recorded / CC0 ambient wind, soft engine, boat wake and UI tones; keep sound muted until the visitor opts in.

For all downloaded assets, retain the original licence and attribution in `ASSET_CREDITS.md`. Do not assume a search result is free to reuse.

## Performance plan

The first pass uses procedural meshes, instanced-ready scene groupings, adaptive DPR and lazy-loadable zone components. Next passes should add GLB/Draco loading, true instanced building/window batches, LOD thresholds, baked lightmaps, zone-level dynamic imports, post-processing bloom tuned by device tier, and measured 60 fps budgets. Rapier is used for arcade vehicle movement and fixed building colliders; tune the vehicle and contact response on target devices.

## Deployment

The isolated preview Worker removes GitHub Raw's restrictive `Content-Security-Policy` response header before serving the built assets; without this, browsers refuse to execute the app and display a blank page. The repository's current Cloudflare Worker packager reads `public/`. Build first, then package/deploy to the separate `rm-portfolio-world-preview` Worker. Production `main` and the existing portfolio Worker remain untouched until visual and browser QA passes.


## SEO, OG image and analytics

The preview includes an Open Graph / Twitter card image at `/world/og-image.svg`. Cloudflare Web Analytics is optional: copy `.env.example` to `.env.local`, set `VITE_CF_WEB_ANALYTICS_TOKEN`, and rebuild. No analytics script is loaded without a token.

## Browser QA

Run `npm install --no-audit --no-fund`, `npm run build`, then `npm install --no-save playwright@1.56.1`, install Playwright browsers and run `npm run audit:open-world`. The GitHub Actions browser matrix performs Chromium, Firefox and WebKit checks and stores screenshots as an artifact.
