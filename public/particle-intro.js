/* RAVI M / PARTICLE-TO-REALITY.
 * 2D text-mask particle system, synchronized with the existing 23 cursor agents.
 * One animation clock is owned by build-story.js; no WebGL or extra animation loop.
 */
(() => {
  'use strict';

  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
  const easeOut = t => 1 - Math.pow(1 - clamp(t), 3);
  const mix = (a, b, t) => a + (b - a) * t;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Exposed only so choreography and tests can share the same quality budget.
  function qualityBudget(width, deviceMemory, cores) {
    const small = width <= 640;
    const slow = (deviceMemory && deviceMemory <= 4) || (cores && cores <= 4);
    return small ? (slow ? 360 : 600) : (slow ? 850 : 1650);
  }

  function create({layer, heroHeading}) {
    if (!layer || !heroHeading || reduced()) return null;
    const canvas = document.createElement('canvas');
    canvas.className = 'particle-intro-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    const ctx = canvas.getContext('2d', {alpha:true, desynchronized:true});
    if (!ctx) return null;
    layer.insertBefore(canvas, layer.firstChild);

    let active = false;
    let start = 0;
    let duration = 3100;
    let width = 0, height = 0, scale = 1;
    let cx = 0, cy = 0, wordWidth = 0;
    let particles = [];
    let dust = [];
    let textPoints = [];
    let seed = 812967;
    const rand = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const sizePx = () => width <= 640 ? clamp(width * .22, 66, 110) : clamp(width * .155, 106, 215);

    function buildTextMask() {
      // Mask is sampled once at the start / viewport resize. No per-frame pixel reads.
      const mask = document.createElement('canvas');
      const m = mask.getContext('2d', {willReadFrequently:true});
      if (!m) return false;

      let fontSize = sizePx();
      m.font = '900 ' + Math.round(fontSize) + 'px Display, Impact, sans-serif';
      let left = m.measureText('RAVI').width;
      let right = m.measureText(' M.').width;
      const natural = left + right;
      if (natural > width * .88) {
        fontSize *= (width * .88) / natural;
        m.font = '900 ' + Math.round(fontSize) + 'px Display, Impact, sans-serif';
        left = m.measureText('RAVI').width;
        right = m.measureText(' M.').width;
      }
      wordWidth = left + right;
      mask.width = Math.ceil(wordWidth + 36);
      mask.height = Math.ceil(fontSize * 1.55 + 14);
      m.font = '900 ' + Math.round(fontSize) + 'px Display, Impact, sans-serif';
      m.textBaseline = 'middle';
      m.fillStyle = '#f6f2ed';
      m.fillText('RAVI', 18, mask.height / 2);
      m.fillStyle = '#ff516c';
      m.fillText(' M.', 18 + left, mask.height / 2);
      const image = m.getImageData(0, 0, mask.width, mask.height);
      const pixels = image.data;
      textPoints = [];
      const step = width <= 640 ? 3 : 4;
      for (let y = 0; y < mask.height; y += step) {
        for (let x = 0; x < mask.width; x += step) {
          const i = (y * mask.width + x) * 4;
          if (pixels[i + 3] < 118) continue;
          textPoints.push({x:x - mask.width / 2, y:y - mask.height / 2, accent:pixels[i + 1] < 185});
        }
      }
      return textPoints.length > 50;
    }

    function rebuild() {
      width = Math.max(1, innerWidth);
      height = Math.max(1, innerHeight);
      cx = width * .5;
      cy = height * (width <= 640 ? .42 : .455);
      scale = clamp(devicePixelRatio || 1, 1, width <= 640 ? 1.4 : 1.6);
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      seed = 812967;
      if (!buildTextMask()) return false;

      const budget = qualityBudget(width, navigator.deviceMemory, navigator.hardwareConcurrency);
      particles = [];
      // An emission point per cursor, distributed across the full word mask.
      for (let i = 0; i < budget; i++) {
        const point = textPoints[Math.floor(rand() * textPoints.length)];
        particles.push({
          tx:cx + point.x, ty:cy + point.y,
          accent:point.accent || (i % 23 === 0),
          originX:NaN, originY:NaN,
          delay:rand() * 780, phase:rand() * Math.PI * 2,
          drift:2 + rand() * 17, size:(width <= 640 ? .95 : 1.1) + rand() * 1.25,
          agent:i % 23
        });
      }
      dust = Array.from({length: width <= 640 ? 20 : 44}, (_, i) => ({
        x:rand() * width,y:rand() * height,phase:rand() * 6.283,
        radius:.35 + rand() * .75,alpha:.035 + rand() * .085
      }));
      return true;
    }

    function begin(now, total = 3100) {
      active = false;
      start = now;
      duration = total;
      if (!rebuild()) {
        canvas.style.display = 'none';
        return false;
      }
      canvas.style.display = 'block';
      canvas.style.opacity = '1';
      active = true;
      return true;
    }

    function draw(now, cursors) {
      if (!active) return;
      if (width !== innerWidth || height !== innerHeight) {
        if (!rebuild()) {end();return;}
      }
      const elapsed = Math.max(0, now - start);
      const camera = smooth((elapsed - 2180) / 520);
      const fade = 1 - smooth((elapsed - 2340) / 520);
      if (fade <= 0) {ctx.clearRect(0, 0, width, height);return;}
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'lighter';

      // Soft, low-opacity dust supplies depth, not a permanent particle wallpaper.
      const atmospheric = Math.min(1, elapsed / 450) * fade;
      for (let i = 0; i < dust.length; i++) {
        const d = dust[i];
        const x = d.x + Math.sin(elapsed * .0006 + d.phase) * 9;
        const y = d.y - elapsed * (.001 + i % 3 * .0005);
        ctx.fillStyle = 'rgba(238,226,228,' + (d.alpha * atmospheric) + ')';
        ctx.fillRect(x, y, d.radius, d.radius);
      }

      const heading = heroHeading.getBoundingClientRect();
      // Target transformation goes toward the REAL DOM heading at the end.
      const heroX = clamp(heading.left + Math.min(heading.width, wordWidth) * .5, 0, width);
      const heroY = clamp(heading.top + heading.height * .46, 0, height);
      const fit = clamp(Math.min(heading.width / Math.max(wordWidth,1), 1.10), .62, 1.10);
      const availability = clamp((elapsed - 260) / 200);
      const renderCount = Math.floor(particles.length * availability);
      for (let i = 0; i < renderCount; i++) {
        const p = particles[i];
        const origin = cursors[p.agent];
        // Birth positions are captured ONCE, so moving cursors don't teleport particles.
        if (!Number.isFinite(p.originX)) {
          const angle = p.phase;
          p.originX = (origin ? origin.x : cx) + Math.cos(angle) * (7 + p.drift);
          p.originY = (origin ? origin.y : cy) + Math.sin(angle) * (7 + p.drift);
        }
        const settle = easeOut((elapsed - 520 - p.delay) / 1120);
        const noise = Math.pow(1 - settle, 1.6) * p.drift;
        let destX = p.tx, destY = p.ty;
        if (camera > 0) {
          destX = mix(destX, heroX + (destX - cx) * fit, camera);
          destY = mix(destY, heroY + (destY - cy) * fit, camera);
        }
        const x = mix(p.originX, destX, settle) +
          Math.cos(p.phase + elapsed * .006) * noise;
        const y = mix(p.originY, destY, settle) +
          Math.sin(p.phase * 1.4 + elapsed * .004) * noise;
        const opacity = clamp((elapsed - 245 - p.delay * .4) / 275) *
          (1 - camera * .1) * fade * (.65 + settle * .3);
        if (opacity < .018) continue;
        const size = p.size * (1 + .35 * (1 - settle));
        ctx.fillStyle = p.accent
          ? 'rgba(255,86,114,' + opacity + ')'
          : 'rgba(242,238,230,' + opacity + ')';
        ctx.fillRect(x, y, size, size);
        if (i % 41 === 0) {
          ctx.fillStyle = 'rgba(255,97,119,' + (opacity * .13) + ')';
          ctx.fillRect(x - 2, y - 2, size + 4, size + 4);
        }
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    function end() {
      active = false;
      ctx.clearRect(0, 0, width, height);
      canvas.style.opacity = '0';
      canvas.style.display = 'none';
    }
    function destroy() {end();canvas.remove();}
    return {begin,draw,end,destroy,qualityBudget};
  }

  window.createPortfolioParticleIntro = create;
  window.portfolioParticleQualityBudget = qualityBudget;
})();