/* Ravi M — cinematic agent-built portfolio tour.
   Cursor-first choreography; the portfolio content remains ordinary, accessible HTML. */
(() => {
  'use strict';

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const compact = matchMedia('(max-width: 640px)').matches;
  const roles = [
    'Story','Design','Build','Motion','Type','Layout','Image','Light',
    'Detail','Frame','Depth','Craft','Flow','Space','Rhythm','Explore',
    'Compose','Color','Research','Prototype','Interact','Polish','Finish'
  ];
  const palette = ['#ff536b','#f5ebe4','#78d8ff','#fc6680','#b8abff','#e8e1d7','#80eadb'];
  const timings = Object.freeze({
    gather: 1080,
    approach: compact ? 610 : 560,
    stagger: compact ? 9 : 12,
    revealStart: compact ? 835 : 880,
    revealGap: compact ? 110 : 130,
    reveal: compact ? 580 : 650,
    linger: compact ? 920 : 1140,
    camera: compact ? 980 : 1160
  });
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const easeOut = n => 1 - Math.pow(1 - clamp(n, 0, 1), 4);
  const easeInOut = n => n < .5 ? 4 * n * n * n : 1 - Math.pow(-2 * n + 2, 3) / 2;
  const easeSoft = n => .5 - Math.cos(Math.PI * clamp(n, 0, 1)) / 2;

  // A single engine owns content visibility; app.js's generic scroll reveals are disabled.
  document.body.classList.remove('js-motion');
  document.body.classList.add('agent-story-mode');
  const selector = '.hero-copy > *, .portrait, .hero-bottom, .section-heading > *, .filters, .project, .work-note, .about-title > *, .about-copy > *, .comparison, .steps article, .capabilities > .reveal, .cap-list details, .manifesto, .lab-rows details, .contact > .eyebrow, .contact-grid > .reveal, footer';
  const targets = Array.from(document.querySelectorAll(selector))
    .filter(el => !(el.parentElement && el.parentElement.closest('.project')));
  const visible = el => {
    if (el.hidden || el.closest('[hidden]')) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.bottom > 85 && r.top < innerHeight - 55;
  };

  const controls = document.createElement('div');
  controls.className = 'build-controls';
  controls.innerHTML =
    '<span class="build-indicator" aria-hidden="true"></span>' +
    '<span class="build-caption" role="status" aria-live="off">AUTOPLAY / 23 AGENTS</span>' +
    '<button class="build-replay" type="button">Replay ↻</button>' +
    '<button class="build-pause" type="button" aria-pressed="false">Pause</button>' +
    '<button class="build-manual" type="button">Explore freely</button>';
  document.body.append(controls);

  const layer = document.createElement('div');
  layer.className = 'agent-layer';
  layer.setAttribute('aria-hidden', 'true');
  document.body.append(layer);

  const light = document.createElement('div');
  light.className = 'agent-stage-light';
  light.setAttribute('aria-hidden', 'true');
  layer.append(light);

  const agents = roles.map((role, i) => {
    const el = document.createElement('div');
    el.className = 'build-agent';
    el.style.setProperty('--agent', palette[i % palette.length]);
    el.innerHTML = '<svg viewBox="0 0 24 29" aria-hidden="true" focusable="false">' +
      '<path d="M2 1.5L21.5 17.5L12.3 18.4L8.1 27Z" fill="currentColor" stroke="#0c0c10" stroke-width="1.6" stroke-linejoin="round"/>' +
      '</svg>';
    layer.append(el);
    return {el, role, x: innerWidth * .5, y: innerHeight * .48};
  });

  // A small number of guide frames, not one large expensive rectangle per cursor.
  const guides = Array.from({length: 7}, () => {
    const box = document.createElement('div');
    box.className = 'build-selection';
    box.innerHTML = '<i></i><i></i><i></i><i></i>';
    layer.append(box);
    return box;
  });
  const caption = controls.querySelector('.build-caption');
  const pause = controls.querySelector('.build-pause');
  let introStart = performance.now();
  const heroNodes = targets.filter(el => el.closest('.hero'));
  const particleIntro = !reduceMotion && window.createPortfolioParticleIntro
    ? window.createPortfolioParticleIntro({layer, heroHeading: document.querySelector('.hero h1')})
    : null;
  const cursorTrails = !reduceMotion && window.createPortfolioCursorTrails && typeof Path2D === 'function'
    ? window.createPortfolioCursorTrails({layer, agentCount: agents.length})
    : null;
  let introAvailable = false;
  let introHandoff = false;
  let introPausedAt = 0;
  let pausedAt = 0;
  let hiddenSuspended = false;

  let enabled = !reduceMotion;
  let autoplay = !reduceMotion;
  let phase = reduceMotion ? 'idle' : 'intro';
  let stage = null;
  let stageCount = 0;
  let frame = 0;
  let holdUntil = 0;
  let camera = null;
  let animations = [];
  let lightX = innerWidth / 2;
  let lightY = innerHeight / 2;

  function move(a, x, y, opacity) {
    a.x = clamp(x, 8, innerWidth - 12);
    a.y = clamp(y, 18, innerHeight - 18);
    a.el.style.transform = 'translate3d(' + a.x + 'px,' + a.y + 'px,0)';
    a.el.style.opacity = String(clamp(opacity, 0, 1));
  }
  function illuminate(x, y, intensity) {
    lightX += (x - lightX) * .16;
    lightY += (y - lightY) * .16;
    light.style.transform = 'translate3d(' + (lightX - 240) + 'px,' + (lightY - 240) + 'px,0)';
    light.style.opacity = String(clamp(intensity, 0, .8));
  }
  function clearGuides() {
    guides.forEach(box => { box.style.opacity = '0'; });
  }
  // The wordmark first exists as luminous particles. As it travels into the
  // exact hero heading position, the real HTML fades into place underneath.
  function handoffHero(animated = true) {
    if (introHandoff) return;
    introHandoff = true;
    heroNodes.forEach((el, i) => {
      revealImmediately(el);
      if (!animated) return;
      const portrait = el.matches('.portrait');
      const heading = el.matches('h1');
      const frames = portrait
        ? [{opacity:0,clipPath:'inset(11% 9% 0 12%)',transform:'translateX(18px) scale(1.025)'},
           {opacity:1,clipPath:'inset(0 0 0 0)',transform:'none'}]
        : [{opacity:0,transform:heading?'none':'translateY(13px)'},
           {opacity:1,transform:'none'}];
      const animation = el.animate(frames,{
        duration:portrait ? 850 : 570,
        delay:heading ? 50 : portrait ? 170 : 120 + i * 52,
        easing:'cubic-bezier(.22,1,.36,1)',
        fill:'both'
      });
      animation.onfinish = () => {
        animation.cancel();
        animations = animations.filter(item => item !== animation);
      };
      animations.push(animation);
    });
  }
  function finishIntro(now) {
    particleIntro?.end();
    introAvailable = false;
    handoffHero(false);
    phase = 'hold';
    holdUntil = now + (compact ? 680 : 850);
    caption.textContent = 'AUTOPLAY / 23 AGENTS';
  }
  function showIntro(now) {
    if (!autoplay) return;
    const elapsed = Math.max(0, now - introStart);
    const gather = easeSoft(elapsed / 1030);
    const width = innerWidth, height = innerHeight;
    const bandWidth = Math.min(width * .78, compact ? width * .88 : 850);
    const bandLeft = (width - bandWidth) / 2;
    // 8 / 8 / 7 builders distribute around the three wordmark regions.
    agents.forEach((a, i) => {
      const group = i < 8 ? 0 : i < 16 ? 1 : 2;
      const index = i < 8 ? i : i < 16 ? i - 8 : i - 16;
      const count = group === 2 ? 7 : 8;
      const orbit = index / count * Math.PI * 2 - Math.PI / 2;
      const anchorX = bandLeft + (group + .5) * bandWidth / 3 +
        Math.cos(orbit) * (compact ? 25 : 53);
      const anchorY = height * (compact ? .42 : .455) +
        Math.sin(orbit) * (compact ? 57 : 92);
      const initialAngle = i * 2.39996323;
      const originX = width * .5 + Math.cos(initialAngle) * Math.min(width * .53, 540);
      const originY = height * .47 + Math.sin(initialAngle) * height * .42;
      const arrival = easeOut((elapsed - (i % 5) * 24) / 960);
      const sway = Math.sin(elapsed * .0018 + orbit) * (1 - gather) * 8;
      move(a, originX + (anchorX - originX) * arrival + sway,
        originY + (anchorY - originY) * arrival,
        .12 + .84 * easeOut(elapsed / 500));
    });
    illuminate(width * .5, height * .44,
      elapsed < 2230 ? .10 + .30 * easeOut(elapsed / 1100) : .13);
    if (introAvailable) particleIntro.draw(now, agents);
    if (elapsed >= (introAvailable ? 2320 : 850)) handoffHero(true);
    if (elapsed >= (introAvailable ? 3090 : 1470)) finishIntro(now);
    else caption.textContent = introAvailable ? 'ASSEMBLING / RAVI M.' : 'BUILDING / 23 AGENTS';
  }
  function kind(el) {
    if (el.matches('.project')) return 'project';
    if (el.matches('.portrait,.manifesto')) return 'image';
    if (el.matches('.comparison')) return 'comparison';
    if (el.matches('details,.filters,footer') || el.querySelector('form')) return 'rows';
    return 'text';
  }
  function keyframes(item) {
    const el = item.el;
    if (item.kind === 'project') {
      const variant = el.dataset.project;
      const start = variant === 'reframe' ? 'inset(0 100% 0 0)' :
        variant === 'discovery' ? 'inset(42% 42% 42% 42%)' :
        variant === 'brand' ? 'inset(100% 0 0 0)' : 'inset(0 0 100% 0)';
      return [
        {opacity: 0, clipPath: start, transform: 'translateY(12px) scale(.985)'},
        {opacity: 1, clipPath: 'inset(0 0 0 0)', transform: 'none'}
      ];
    }
    if (item.kind === 'image' || item.kind === 'comparison') return [
      {opacity: 0, clipPath: 'inset(9% 9% 9% 9%)', transform: 'scale(.972)'},
      {opacity: 1, clipPath: 'inset(0 0 0 0)', transform: 'none'}
    ];
    if (item.kind === 'rows') return [
      {opacity: 0, clipPath: 'inset(0 0 100% 0)', transform: 'translateY(8px)'},
      {opacity: 1, clipPath: 'inset(0 0 0 0)', transform: 'none'}
    ];
    return [
      {opacity: 0, clipPath: 'inset(0 100% 0 0)', transform: 'translateY(6px)'},
      {opacity: 1, clipPath: 'inset(0 0 0 0)', transform: 'none'}
    ];
  }
  function reveal(item) {
    if (item.done) return;
    item.done = true;
    item.el.classList.remove('build-pending');
    item.el.classList.add('build-complete');
    const animation = item.el.animate(keyframes(item), {
      duration: timings.reveal,
      easing: 'cubic-bezier(.22,1,.36,1)',
      fill: 'both'
    });
    animation.onfinish = () => {
      animation.cancel(); // Preserve native hover and interactive transforms.
      animations = animations.filter(item => item !== animation);
    };
    animations.push(animation);
  }
  function revealImmediately(el) {
    el.classList.remove('build-pending');
    el.classList.add('build-complete');
  }
  function finishStage() {
    if (!stage) return;
    stage.items.forEach(reveal);
    clearGuides();
    stage = null;
    phase = 'hold';
    const upcoming = targets.some(el => !el.classList.contains('build-complete') && !el.hidden);
    holdUntil = performance.now() + (upcoming ? timings.linger : 570);
    caption.textContent = autoplay ? 'AUTOPLAY / 23 AGENTS' : 'TOUR PAUSED';
  }
  function point(item, slot, count, progress) {
    const rect = item.el.getBoundingClientRect();
    const x = rect.left, y = rect.top, w = rect.width, h = rect.height;
    const fraction = count > 1 ? slot / (count - 1) : .5;
    let px, py;
    if (item.kind === 'image') {
      const theta = fraction * Math.PI * 1.82 - Math.PI * .88 + progress * .75;
      px = .5 + .43 * Math.cos(theta);
      py = .5 + .42 * Math.sin(theta);
    } else if (item.kind === 'project') {
      // Agents trace the artwork/card perimeter instead of covering its text.
      const around = (fraction * .92 + progress * .26) % 1;
      if (around < .25) {px = .07 + around * 3.44; py = .08;}
      else if (around < .5) {px = .93; py = .08 + (around - .25) * 3.36;}
      else if (around < .75) {px = .93 - (around - .5) * 3.44; py = .92;}
      else {px = .07; py = .92 - (around - .75) * 3.36;}
    } else if (item.kind === 'rows') {
      px = .08 + (slot % 2) * .82;
      py = .07 + progress * .83;
    } else if (item.kind === 'comparison') {
      px = .06 + progress * .87;
      py = .16 + fraction * .67;
    } else {
      // Type is underlined by a horizontal drafting formation.
      px = .05 + progress * .86;
      py = .25 + fraction * .62;
    }
    return {x: x + clamp(px, .03, .96) * w, y: y + clamp(py, .03, .96) * h};
  }
  function chooseStage(now) {
    if (!enabled || document.hidden) return;
    const available = targets.filter(el => !el.classList.contains('build-complete') && visible(el)).slice(0, 7);
    if (!available.length) {
      phase = 'idle';
      if (autoplay) startCamera(now);
      return;
    }
    const items = available.map((el, i) => ({
      el, kind: kind(el), done: false, revealAt: timings.revealStart + i * timings.revealGap
    }));
    const assignments = agents.map((a, i) => {
      const targetIndex = (i + stageCount * 3) % items.length;
      const item = items[targetIndex];
      const indices = Array.from({length: roles.length}, (_, k) => k)
        .filter(k => (k + stageCount * 3) % items.length === targetIndex);
      return {a, item, slot: indices.indexOf(i), count: indices.length, fromX: a.x, fromY: a.y, offset: (i % 8) * timings.stagger};
    });
    stage = {items, assignments, start: now, duration:
      timings.revealStart + (items.length - 1) * timings.revealGap + timings.reveal + 210};
    stageCount++;
    phase = 'working';
    caption.textContent = 'ASSEMBLING / 23 AGENTS';
  }
  function showWork(now) {
    if (!stage) { chooseStage(now); return; }
    const t = now - stage.start;
    const bounds = stage.items.map(item => item.el.getBoundingClientRect());
    let sx = 0, sy = 0, count = 0;
    stage.assignments.forEach((entry, i) => {
      const {a, item, slot} = entry;
      const flight = easeOut((t - entry.offset) / timings.approach);
      const trace = clamp((t - timings.revealStart + 85 - entry.offset) / (timings.reveal + 240), 0, 1);
      const destination = point(item, slot, entry.count, trace);
      const x = entry.fromX + (destination.x - entry.fromX) * flight;
      const y = entry.fromY + (destination.y - entry.fromY) * flight;
      const entered = clamp((t - entry.offset) / 190, 0, 1);
      const leaving = clamp((stage.duration - t) / 260, 0, 1);
      move(a, x, y, (.35 + .62 * entered) * leaving);
      sx += a.x; sy += a.y; count++;
    });
    if (count) illuminate(sx / count, sy / count, .45);
    stage.items.forEach((item, i) => {
      if (!item.done && t >= item.revealAt) reveal(item);
      const box = guides[i];
      const rect = bounds[i];
      if (!rect) return;
      box.style.transform = 'translate3d(' + rect.left + 'px,' + rect.top + 'px,0)';
      box.style.width = rect.width + 'px';
      box.style.height = rect.height + 'px';
      box.style.opacity = t > 490 && t < item.revealAt + 260 ? '.30' : '0';
    });
    if (t >= stage.duration) finishStage();
  }
  function startCamera(now) {
    if (!autoplay || document.hidden) { phase = 'idle'; return; }
    const max = Math.max(0, document.documentElement.scrollHeight - innerHeight);
    if (scrollY >= max - 3) {
      targets.forEach(revealImmediately);
      enabled = false;
      cursorTrails?.clear();
      phase = 'done';
      autoplay = false;
      caption.textContent = 'PORTFOLIO / COMPLETE';
      pause.textContent = 'Tour complete';
      pause.setAttribute('aria-pressed', 'true');
      agents.forEach(a => a.el.style.opacity = '0');
      illuminate(innerWidth / 2, innerHeight / 2, 0);
      return;
    }
    const distance = Math.max(260, innerHeight * (compact ? .76 : .72));
    const to = Math.min(max, scrollY + distance);
    camera = {
      from: scrollY, to, start: now, duration: timings.camera,
      agents: agents.map(a => ({x:a.x,y:a.y}))
    };
    phase = 'camera';
    caption.textContent = 'MOVING THROUGH THE STORY';
    document.documentElement.classList.add('agent-camera-moving');
    clearGuides();
  }
  function showCamera(now) {
    if (!camera) { phase = 'idle'; return; }
    const t = clamp((now - camera.start) / camera.duration, 0, 1);
    const eased = easeInOut(t);
    scrollTo({top: camera.from + (camera.to - camera.from) * eased, behavior: 'instant'});
    agents.forEach((a, i) => {
      const angle = i * 2.39996 + eased * .72;
      const destX = innerWidth * (.49 + .31 * Math.cos(angle));
      const destY = innerHeight * (.47 + .29 * Math.sin(angle));
      const start = camera.agents[i];
      move(a, start.x + (destX - start.x) * easeSoft(t),
        start.y + (destY - start.y) * easeSoft(t), .34 + .3 * Math.sin(Math.PI * t));
    });
    illuminate(innerWidth * .5, innerHeight * (.43 + .1 * eased), .15);
    if (t >= 1) {
      camera = null;
      document.documentElement.classList.remove('agent-camera-moving');
      chooseStage(now);
    }
  }
  function tick(now) {
    frame = 0;
    if (!enabled || document.hidden || !autoplay) return;
    if (phase === 'intro') {
      if (!autoplay) return; // Suspend the shared clock while the intro is paused.
      showIntro(now);
    }
    else if (phase === 'working') showWork(now);
    else if (phase === 'camera') showCamera(now);
    else if (phase === 'hold') {
      illuminate(lightX, lightY, .14);
      if (now >= holdUntil) chooseStage(now);
    } else if (phase === 'idle' && autoplay) chooseStage(now);
    cursorTrails?.draw(now, agents, phase);
    if (['intro','working','camera','hold'].includes(phase) || (phase === 'idle' && autoplay)) schedule();
  }
  function schedule() {
    if (!frame && enabled && !document.hidden) frame = requestAnimationFrame(tick);
  }
  // Pause freezes all clocks and active reveals; resuming carries on at the
  // same position instead of rushing through stages skipped during a pause.
  function setAutoplay(value) {
    if (!enabled || autoplay === value) return;
    const now = performance.now();
    if (!value) {
      pausedAt = now;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      cursorTrails?.clear();
      animations.forEach(animation => {
        try { if (animation.playState === 'running') animation.pause(); } catch {}
      });
    } else {
      const delta = pausedAt ? Math.max(0, now - pausedAt) : 0;
      if (phase === 'intro') {
        introStart += delta;
        particleIntro?.shiftTime(delta);
        introPausedAt = 0;
      } else if (phase === 'working' && stage) {
        stage.start += delta;
      } else if (phase === 'hold') {
        holdUntil += delta;
      } else if (phase === 'camera' && camera) {
        camera.start += delta;
      }
      pausedAt = 0;
      animations.forEach(animation => {
        try { if (animation.playState === 'paused') animation.play(); } catch {}
      });
    }
    autoplay = value;
    caption.textContent = autoplay ? 'AUTOPLAY / 23 AGENTS' : 'TOUR PAUSED';
    pause.textContent = autoplay ? 'Pause' : 'Resume';
    pause.setAttribute('aria-pressed', String(!value));
    if (autoplay) {
      if (phase === 'idle' || phase === 'done') chooseStage(now);
      schedule();
    }
  }
  function exploreFreely() {
    cursorTrails?.clear();
    particleIntro?.end();
    introAvailable = false;
    introHandoff = true;
    autoplay = false;
    enabled = false;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    animations.forEach(a => { try { a.finish(); a.cancel(); } catch {} });
    animations = [];
    targets.forEach(revealImmediately);
    clearGuides();
    agents.forEach(a => a.el.style.opacity = '0');
    light.style.opacity = '0';
    phase = 'done';
    document.documentElement.classList.remove('agent-camera-moving');
    caption.textContent = 'EXPLORE AT YOUR PACE';
    pause.disabled = true;
  }
  function replay() {
    if (reduceMotion) return;
    cursorTrails?.clear();
    animations.forEach(a => { try { a.cancel(); } catch {} });
    animations = [];
    stage = null;
    camera = null;
    stageCount = 0;
    enabled = true;
    autoplay = true;
    phase = 'intro';
    introHandoff = false;
    introPausedAt = 0;
    pausedAt = 0;
    hiddenSuspended = false;
    pause.disabled = false;
    pause.textContent = 'Pause';
    pause.setAttribute('aria-pressed', 'false');
    caption.textContent = 'AUTOPLAY / 23 AGENTS';
    targets.forEach(el => {
      el.classList.remove('build-complete');
      el.classList.add('build-pending');
    });
    scrollTo({top:0,behavior:'instant'});
    agents.forEach(a => { a.x = innerWidth * .5; a.y = innerHeight * .47; });
    clearGuides();
    // Rebuild the exact same particle-to-wordmark intro on every replay.
    introStart = performance.now();
    try { introAvailable = !!particleIntro?.begin(introStart, 3090); }
    catch { introAvailable = false; }
    schedule();
  }

  targets.forEach(el => {
    if (enabled) el.classList.add('build-pending');
    else revealImmediately(el);
  });
  controls.querySelector('.build-replay').addEventListener('click', replay);
  controls.querySelector('.build-manual').addEventListener('click', exploreFreely);
  pause.addEventListener('click', () => setAutoplay(!autoplay));
  ['wheel','touchstart'].forEach(type => addEventListener(type, () => {
    if (enabled) exploreFreely();
  }, {passive:true}));
  addEventListener('keydown', e => {
    if (['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' ','Tab','Escape'].includes(e.key)) {
      if (enabled) exploreFreely();
    }
  });
  document.addEventListener('pointerdown', e => {
    if (!e.target.closest('.build-controls') &&
        e.target.closest('a,button,.project,details,input,textarea,select')) {
      if (enabled) exploreFreely();
    }
  });
  let scrollTick = 0;
  addEventListener('scroll', () => {
    if (!enabled || autoplay || phase === 'working' || scrollTick) return;
    scrollTick = requestAnimationFrame(() => {
      scrollTick = 0;
      if (phase !== 'working' && phase !== 'intro') chooseStage(performance.now());
      schedule();
    });
  }, {passive:true});
  document.addEventListener('focusin', e => {
    const item = targets.find(el => el.contains(e.target));
    if (item) {
      if (phase === 'intro') exploreFreely();
      else revealImmediately(item);
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      cursorTrails?.clear();
      if (phase === 'intro') {
        if (autoplay && !introPausedAt) introPausedAt = performance.now();
        return;
      }
      if (autoplay) {
        hiddenSuspended = true;
        setAutoplay(false);
      }
    } else if (enabled) {
      if (phase === 'intro') {
        if (autoplay && introPausedAt) {
          const paused = Math.max(0, performance.now() - introPausedAt);
          introStart += paused;
          particleIntro?.shiftTime(paused);
          introPausedAt = 0;
        }
        if (autoplay) schedule();
      } else if (hiddenSuspended) {
        hiddenSuspended = false;
        setAutoplay(true);
      } else if (autoplay) {
        schedule();
      }
    }
  });
  // Deep links and restored browser positions should never be dragged back
  // through the hero animation; keep those visitors in control immediately.
  const deepLink = !!location.hash && location.hash !== '#home';
  const startManual = reduceMotion || deepLink || scrollY > 80;
  if (!startManual && document.hidden) introPausedAt = performance.now();
  if (!startManual) {
    try { introAvailable = !!particleIntro?.begin(introStart, 3090); }
    catch { introAvailable = false; }
  }
  addEventListener('pageshow', e => {
    if (e.persisted && phase === 'intro') exploreFreely();
  });
  if (startManual) {
    exploreFreely();
    controls.querySelector('.build-replay').disabled = reduceMotion;
    caption.textContent = reduceMotion ? 'REDUCED MOTION / MANUAL' : 'OPENED AT SECTION / MANUAL';
  } else {
    schedule();
  }
})();