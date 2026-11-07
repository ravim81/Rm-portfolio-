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
    approach: compact ? 610 : 560,
    revealStart: compact ? 835 : 880,
    revealGap: compact ? 110 : 130,
    reveal: compact ? 580 : 650,
    linger: compact ? 920 : 1140,
    camera: compact ? 980 : 1160
  });
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const easeOut = n => 1 - Math.pow(1 - clamp(n, 0, 1), 4);
  const easeInOut = n => n < .5 ? 4 * n * n * n : 1 - Math.pow(-2 * n + 2, 3) / 2;

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
  const swarm = !reduceMotion && window.createPortfolioSwarm
    ? window.createPortfolioSwarm({count: agents.length})
    : null;
  // Kinetic lettering shares this controller's frame clock and stays optional:
  // a missing Canvas or browser API must never block the portfolio.
  const kinetic = !reduceMotion && window.createPortfolioKineticTypography
    ? (() => {
        try { return window.createPortfolioKineticTypography({layer, agents}); }
        catch { return null; }
      })()
    : null;
  let kineticDisabled = false;
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
  const viewport = () => ({
    width: innerWidth,
    height: innerHeight,
    memory: navigator.deviceMemory || 8,
    cores: navigator.hardwareConcurrency || 8
  });

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
  function restoreKinetic() {
    try { kinetic?.clear(); } catch {}
    document.querySelectorAll('.kinetic-source-hidden').forEach(el => {
      el.classList.remove('kinetic-source-hidden');
    });
  }
  function beginKinetic(container, builders, now) {
    if (!kinetic || kineticDisabled) return false;
    try { return kinetic.start(container, builders, now); }
    catch {
      kineticDisabled = true;
      restoreKinetic();
      return false;
    }
  }
  function drawKinetic(now) {
    if (!kinetic || kineticDisabled) return;
    try { kinetic.draw(now); }
    catch {
      kineticDisabled = true;
      restoreKinetic();
    }
  }
  // The wordmark first exists as luminous particles. As it travels into the
  // exact hero heading position, the real HTML fades into place underneath.
  function handoffHero(animated = true) {
    if (introHandoff) return;
    introHandoff = true;
    heroNodes.forEach((el, i) => {
      revealImmediately(el);
      if (!animated) return;
      // The hero h1 is built by particles; h2 is drafted letter by letter.
      if (el.matches('h2') && beginKinetic(el, agents, performance.now())) return;
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
    const width = innerWidth, height = innerHeight;
    const formations = swarm.introFrame(agents, elapsed, viewport());
    formations.forEach((position, i) => {
      const a = agents[i];
      a.formation = position.formation;
      a.task = 'construct';
      move(a, position.x, position.y, position.opacity);
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
    if (el.matches('form') || el.querySelector('form')) return 'form';
    if (el.matches('details,.filters,footer')) return 'rows';
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
    // Only selected headings get individual glyph construction; ordinary copy
    // and interactive cards preserve their existing reveal and hover behavior.
    const builders = stage?.assignments
      ?.filter(entry => entry.item === item)
      .map(entry => entry.a) || agents;
    beginKinetic(item.el, builders, performance.now());
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
  // Measure each block once per frame. The swarm engine then works entirely
  // in plain geometry, without repeatedly reading the DOM for 23 cursors.
  function layoutOf(item) {
    const rect = item.el.getBoundingClientRect();
    const art = item.kind === 'project'
      ? item.el.querySelector('.project-art')?.getBoundingClientRect()
      : null;
    const copy = item.kind === 'project'
      ? item.el.querySelector('.project-info')?.getBoundingClientRect()
      : null;
    const artworkTitle = item.kind === 'project'
      ? item.el.querySelector('.art-title')?.getBoundingClientRect()
      : null;
    return {
      kind: item.kind,
      rect,
      artRect: art || null,
      avoidRects: [copy, artworkTitle].filter(Boolean)
    };
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
    const assignments = swarm.planStage(items.map(layoutOf), agents, stageCount, viewport());
    assignments.forEach(entry => {
      entry.a.formation = entry.targetIndex;
      entry.a.task = entry.task;
      entry.a.el.dataset.task = entry.task;
    });
    stage = {items, assignments, start: now, duration:
      timings.revealStart + (items.length - 1) * timings.revealGap + timings.reveal + 210};
    stageCount++;
    phase = 'working';
    const project = items.find(item => item.kind === 'project');
    const name = project?.el.querySelector('h3')?.textContent?.trim();
    caption.textContent = name ? 'CONSTRUCTING / ' + name.toUpperCase() : 'ASSEMBLING / 23 AGENTS';
  }
  function showWork(now) {
    if (!stage) { chooseStage(now); return; }
    const t = now - stage.start;
    const layouts = stage.items.map(layoutOf);
    const positions = swarm.workFrame(stage.assignments, layouts, t,
      {...timings, duration: stage.duration}, viewport());
    let sx = 0, sy = 0;
    positions.forEach((position, i) => {
      const a = stage.assignments[i].a;
      move(a, position.x, position.y, position.opacity);
      sx += a.x;
      sy += a.y;
    });
    if (positions.length) illuminate(sx / positions.length, sy / positions.length, .43);
    const guideLimit = swarm.budget(innerWidth, navigator.deviceMemory, navigator.hardwareConcurrency).guideLimit;
    stage.items.forEach((item, i) => {
      if (!item.done && t >= item.revealAt) reveal(item);
      const box = guides[i];
      if (!box) return;
      if (i >= guideLimit) {box.style.opacity = '0';return;}
      const geometry = layouts[i];
      const rect = item.kind === 'project' && geometry.artRect
        ? geometry.artRect : geometry.rect;
      box.dataset.kind = item.kind;
      const y = item.kind === 'text' ? rect.bottom + 8 : rect.top;
      box.style.transform = 'translate3d(' + rect.left + 'px,' + y + 'px,0)';
      box.style.width = rect.width + 'px';
      box.style.height = item.kind === 'text' ? '2px' : rect.height + 'px';
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
      pause.disabled = true;
      pause.setAttribute('aria-pressed', 'false');
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
    const formations = swarm.cameraFrame(agents, camera.agents, t, viewport());
    formations.forEach((position, i) => {
      const a = agents[i];
      a.formation = position.formation;
      a.task = 'travel';
      move(a, position.x, position.y, position.opacity);
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
    if (phase === 'intro') showIntro(now);
    else if (phase === 'working') showWork(now);
    else if (phase === 'camera') showCamera(now);
    else if (phase === 'hold') {
      illuminate(lightX, lightY, .14);
      if (now >= holdUntil) chooseStage(now);
    } else if (phase === 'idle' && autoplay) chooseStage(now);
    cursorTrails?.draw(now, agents, phase);
    drawKinetic(now);
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
      try { kinetic?.shiftTime(delta); } catch { restoreKinetic(); }
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
    restoreKinetic();
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
    restoreKinetic();
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

  // The independent watchdog can safely release the page on animation errors.
  window.__portfolioStoryRecover = exploreFreely;
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
          try { kinetic?.shiftTime(paused); } catch {restoreKinetic();}
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
  const startManual = reduceMotion || !swarm || deepLink || scrollY > 80;
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