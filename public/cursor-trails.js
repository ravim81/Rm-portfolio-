/* RAVI M / AGENT LIGHT TRAILS.
 * Single Canvas 2D overlay driven by the existing 23-agent animation clock.
 * No extra RAF loop, WebGL renderer, pointer tracking, or external dependency.
 */
(() => {
  'use strict';

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  function qualityBudget(width, memory, cores) {
    const mobile = width <= 640;
    const constrained = (memory > 0 && memory <= 4) || (cores > 0 && cores <= 4);
    return {
      maxPoints: mobile ? (constrained ? 8 : 12) : (constrained ? 14 : 23),
      fps: (mobile || constrained) ? 30 : 60,
      ttl: mobile ? 370 : (constrained ? 460 : 610),
      dprCap: mobile ? 1.25 : (constrained ? 1.4 : 1.75)
    };
  }

  function create({layer, agentCount = 23}) {
    if (!layer || matchMedia('(prefers-reduced-motion: reduce)').matches) return null;

    const canvas = document.createElement('canvas');
    canvas.className = 'cursor-trails-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    const ctx = canvas.getContext('2d', {alpha: true, desynchronized: true});
    if (!ctx) return null;
    layer.insertBefore(canvas, layer.firstChild);

    const tracks = Array.from({length: Math.max(0, Math.min(40, agentCount))}, () => []);
    const palette = [[255, 83, 108], [234, 232, 231], [241, 121, 141], [206, 203, 207]];
    let width = 0;
    let height = 0;
    let budget = null;
    let lastDrawAt = -Infinity;
    let active = true;
    let resizeCount = 0;

    function clear() {
      for (const points of tracks) points.length = 0;
      if (width && height) ctx.clearRect(0, 0, width, height);
      lastDrawAt = -Infinity;
    }

    function resize() {
      const nextWidth = Math.max(1, innerWidth);
      const nextHeight = Math.max(1, innerHeight);
      budget = qualityBudget(nextWidth, navigator.deviceMemory, navigator.hardwareConcurrency);
      const scale = clamp(devicePixelRatio || 1, 1, budget.dprCap);
      canvas.width = Math.max(1, Math.round(nextWidth * scale));
      canvas.height = Math.max(1, Math.round(nextHeight * scale));
      canvas.style.width = nextWidth + 'px';
      canvas.style.height = nextHeight + 'px';
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      width = nextWidth;
      height = nextHeight;
      resizeCount++;
      clear(); // Old positions are in obsolete viewport coordinates.
    }

    function sample(now, agents, mode) {
      const painting = mode === 'intro' || mode === 'working' || mode === 'camera';
      if (!painting) return;
      const limit = Math.min(agents.length, tracks.length);
      for (let i = 0; i < limit; i++) {
        const a = agents[i];
        if (!a || !Number.isFinite(a.x) || !Number.isFinite(a.y)) continue;
        const opacity = Number.parseFloat(a.el?.style?.opacity ?? '0');
        if (!(opacity >= .18)) continue;
        const points = tracks[i];
        const x = clamp(a.x + (width <= 640 ? 4 : 6), 0, width);
        const y = clamp(a.y + (width <= 640 ? 6 : 8), 0, height);
        const last = points[points.length - 1];
        if (last) {
          const distance = Math.hypot(x - last.x, y - last.y);
          // Avoid an ugly diagonal if the user jumps to a section or replays.
          if (distance > Math.max(135, width * .25)) points.length = 0;
          else if (distance < 1.7 && now - last.t < 46) continue;
        }
        points.push({x, y, t: now});
        if (points.length > budget.maxPoints) points.shift();
      }
    }

    function paintTrack(points, index, now, mode) {
      const ttl = budget.ttl * (mode === 'camera' ? 1.13 : 1);
      while (points.length && now - points[0].t > ttl) points.shift();
      if (points.length < 2) return;
      const last = points[points.length - 1];
      const headAge = now - last.t;
      const freshness = clamp(1 - headAge / ttl, 0, 1);
      if (freshness <= 0) return;

      const first = points[0];
      const rgba = palette[index % palette.length];
      const flight = mode === 'camera' ? .79 : mode === 'intro' ? .76 : 1;
      const strength = flight * Math.pow(freshness, 1.6);

      // Draw a curved ribbon with a wide low-alpha halo and a thin crisp core.
      // Two strokes per agent are cheaper than per-segment shadows or CSS filters.
      const path = new Path2D();
      path.moveTo(first.x, first.y);
      for (let j = 1; j < points.length - 1; j++) {
        const midX = (points[j].x + points[j + 1].x) * .5;
        const midY = (points[j].y + points[j + 1].y) * .5;
        path.quadraticCurveTo(points[j].x, points[j].y, midX, midY);
      }
      path.lineTo(last.x, last.y);

      const gx = first.x === last.x && first.y === last.y ? last.x + 1 : last.x;
      const gradient = ctx.createLinearGradient(first.x, first.y, gx, last.y);
      gradient.addColorStop(0, 'rgba(' + rgba.join(',') + ',0)');
      gradient.addColorStop(.45, 'rgba(' + rgba.join(',') + ',' + (.2 * strength).toFixed(3) + ')');
      gradient.addColorStop(1, 'rgba(' + rgba.join(',') + ',' + (.76 * strength).toFixed(3) + ')');
      ctx.strokeStyle = gradient;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = width <= 640 ? 4.3 : 5.8;
      ctx.globalAlpha = .27;
      ctx.stroke(path);
      ctx.globalAlpha = .9;
      ctx.lineWidth = width <= 640 ? .9 : 1.15;
      ctx.stroke(path);
    }

    function paintFormation(now, agents, mode) {
      if (mode !== 'intro' && mode !== 'working') return;
      // One low-opacity path connects each builder to its closest teammate.
      // This evokes a drafting wireframe without a dense permanent web.
      const length = Math.min(agents.length, tracks.length);
      const path = new Path2D();
      let edges = 0;
      for (let i = 0; i < length; i++) {
        const a = agents[i];
        if (!a || Number.parseFloat(a.el?.style?.opacity || '0') < .4) continue;
        const group = mode === 'intro' ? (i < 8 ? 0 : i < 16 ? 1 : 2) : a.formation;
        if (!Number.isInteger(group) || group < 0) continue;
        let nearest = null;
        let nearestDistance = Infinity;
        for (let j = i + 1; j < length; j++) {
          const b = agents[j];
          if (!b || Number.parseFloat(b.el?.style?.opacity || '0') < .4) continue;
          const other = mode === 'intro' ? (j < 8 ? 0 : j < 16 ? 1 : 2) : b.formation;
          if (other !== group) continue;
          const distance = Math.hypot(a.x - b.x, a.y - b.y);
          if (distance < nearestDistance) {nearest = b;nearestDistance = distance;}
        }
        if (nearest && nearestDistance < (width <= 640 ? 122 : 220) && nearestDistance > 18) {
          path.moveTo(a.x, a.y);
          path.lineTo(nearest.x, nearest.y);
          edges++;
        }
      }
      if (!edges) return;
      const pulse = .84 + .16 * Math.sin(now * .0028);
      ctx.globalAlpha = mode === 'intro' ? .26 * pulse : .17 * pulse;
      ctx.strokeStyle = 'rgba(255,129,148,.72)';
      ctx.lineWidth = .65;
      ctx.lineCap = 'round';
      ctx.stroke(path);
      ctx.globalAlpha = 1;
    }

    function draw(now, agents, mode = 'working') {
      if (!active) return;
      if (innerWidth !== width || innerHeight !== height || !budget) resize();
      if (now - lastDrawAt < 1000 / budget.fps - 1) return;
      lastDrawAt = now;
      ctx.clearRect(0, 0, width, height);
      if (mode === 'done') {clear();return;}
      sample(now, agents || [], mode);
      for (let i = 0; i < tracks.length; i++) paintTrack(tracks[i], i, now, mode);
      paintFormation(now, agents || [], mode);
      ctx.globalAlpha = 1;
    }

    function destroy() {
      active = false;
      clear();
      canvas.remove();
    }
    resize();
    return {draw, clear, destroy, qualityBudget, get resizeCount() {return resizeCount;}};
  }

  window.createPortfolioCursorTrails = create;
  window.portfolioCursorTrailBudget = qualityBudget;
})();