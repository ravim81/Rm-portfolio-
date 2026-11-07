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
  const palette = ['#fa566f','#eee8e3','#e6a0ab','#c4bfc0','#ff6a7f','#e6e1d9','#d4415c'];
  const timings = Object.freeze({
    approach: compact ? 570 : 610,
    revealStart: compact ? 780 : 860,
    revealGap: compact ? 120 : 140,
    reveal: compact ? 610 : 670,
    linger: compact ? 720 : 860,
    camera: compact ? 520 : 650
  });
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const easeOut = n => 1 - Math.pow(1 - clamp(n, 0, 1), 4);
  const easeInOut = n => n < .5 ? 4 * n * n * n : 1 - Math.pow(-2 * n + 2, 3) / 2;

  // A single engine owns content visibility; app.js's generic scroll reveals are disabled.
  document.body.classList.remove('js-motion');
  document.body.classList.add('agent-story-mode');
  // One meaningful story beat per section/card. Tiny notes, filters, footer
  // metadata and individual rows stay ordinary HTML instead of creating
  // several seconds of empty choreography around each tiny element.
  const selector = '.hero-copy > *, .portrait, .section-heading, .project, .about-title, .about-copy, .comparison, .steps article, .capabilities > .reveal, .cap-list, .manifesto, .lab-rows, .contact-grid, footer';
  const targets = Array.from(document.querySelectorAll(selector))
    .filter(el => !(el.parentElement && el.parentElement.closest('.project')));
  const visible = el => {
    if (el.hidden || el.closest('[hidden]')) return false;
    const r = el.getBoundingClientRect();
    // A visible sliver near the bottom isn't a stage. Focus needs a real,
    // readable piece of content in the upper/middle viewport.
    return r.width > 0 && r.height > 0 &&
      r.bottom > innerHeight * .19 && r.top < innerHeight * .44;
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
  // A single visible construction scaffold makes each cursor movement legible.
  // Unlike 7 independent guide frames, it only surrounds the object being built.
  const blueprint = document.createElement('div');
  blueprint.className = 'build-blueprint';
  blueprint.setAttribute('aria-hidden','true');
  blueprint.innerHTML = '<span class="blueprint-index">01 / CONSTRUCT</span>' +
    '<i class="blueprint-corner tl"></i><i class="blueprint-corner tr"></i>' +
    '<i class="blueprint-corner bl"></i><i class="blueprint-corner br"></i>' +
    '<span class="blueprint-track"><i></i></span>';
  layer.append(blueprint);
  const blueprintLabel = blueprint.querySelector('.blueprint-index');
  const blueprintTrack = blueprint.querySelector('.blueprint-track i');
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
  // All construction paths and cursor tasks share this same animation frame.
  // Missing SVG APIs never prevent the readable HTML portfolio from opening.
  const sceneDirector = !reduceMotion && window.createPortfolioSceneDirector
    ? window.createPortfolioSceneDirector({layer}) : null;
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
    blueprint.style.opacity = '0';
    blueprint.dataset.phase = 'IDLE';
    blueprint.dataset.target = '';
    blueprint.dataset.progress = '0';
    sceneDirector?.clear();
  }
  const sceneNames = {
    chem:'CHEMLABS / LAB ASSEMBLY',
    reframe:'REFRAME / BEFORE → AFTER',
    brand:'BRANDSPOOL / FILM SET',
    discovery:'DISCOVERY / NODE MAP'
  };
  function sceneLabel(item) {
    const project = item.el.dataset?.project;
    if (project && sceneNames[project]) return sceneNames[project];
    if (item.kind === 'comparison') return 'BUILDING / A BETTER INTERFACE';
    if (item.kind === 'image') return 'FRAMING / THE COMPOSITION';
    if (item.kind === 'form') return 'ASSEMBLING / THE CONTACT FORM';
    if (item.kind === 'rows') return 'ALIGNING / THE DETAILS';
    return 'SETTING / THE TYPOGRAPHY';
  }
  function updateBlueprint(item, geom, elapsed) {
    const frame = item.kind === 'project' && geom.artRect ? geom.artRect : geom.rect;
    if (!frame) return;
    const inset = innerWidth <= 640 ? 4 : 8;
    const left = Math.max(8, frame.left - inset);
    const top = Math.max(34, frame.top - inset);
    const w = Math.max(20, Math.min(innerWidth - left - 8, frame.width + inset * 2));
    // A typography blueprint follows the actual heading (not the entire
    // section container). The label sits ABOVE the title; the progress rule
    // runs below its baseline rather than through unrelated body copy.
    const y = item.kind === 'text' ? Math.max(47, frame.top - 5) : top;
    const h = item.kind === 'text'
      ? Math.max(28, Math.min(innerHeight - y - 50, frame.height + 10))
      : Math.max(26, Math.min(innerHeight - top - 55, frame.height + inset * 2));
    blueprint.style.transform = 'translate3d(' + left + 'px,' + y + 'px,0)';
    blueprint.style.width = w + 'px';
    blueprint.style.height = h + 'px';
    blueprint.dataset.kind = item.kind;
    const action = elapsed < 380 ? 'PLAN' : elapsed < item.revealAt ? 'FRAME' : 'REVEAL';
    blueprint.dataset.phase = action;
    blueprint.dataset.target = item.el.dataset?.project || item.el.id || item.el.className?.split?.(' ')?.[0] || item.kind;
    blueprintLabel.textContent = sceneLabel(item) + '  ·  ' + action;
    blueprint.style.opacity = String(elapsed < item.revealAt - 100
      ? Math.min(1,(elapsed-120)/210)
      : Math.max(0,1 - (elapsed - item.revealAt + 100) / 390));
    // The visible drafting stroke starts AFTER cursors have arrived; never
    // let a loading bar race ahead of its builders.
    const draw = clamp((elapsed - timings.approach * .48) /
      Math.max(1, item.revealAt - timings.approach * .48), 0, 1);
    blueprintTrack.style.transform = 'scaleX(' + draw + ')';
    blueprint.dataset.progress = draw.toFixed(3);
    return {left,top:y,width:w,height:h,draw};
  }
  function restoreKinetic() {
    try { kinetic?.clear(); } catch {}
    document.querySelectorAll('.kinetic-source-hidden').forEach(el => {
      el.classList.remove('kinetic-source-hidden');
    });
  }
  function beginKinetic(container, builders, now) {
    // Narrow-screen Canvas glyph overlays crossed native text as the camera
    // moved. Use the accessible, crisp original headline on mobile instead.
    if (compact || !kinetic || kineticDisabled) return false;
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
      if (!compact && el.matches('h2') && beginKinetic(el, agents, performance.now())) return;
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
    const fromPreview = false;
    item.el.classList.remove('build-pending','build-staging');
    item.el.classList.add('build-complete');
    // Only selected headings get individual glyph construction; ordinary copy
    // and interactive cards preserve their existing reveal and hover behavior.
    const builders = stage?.assignments
      ?.filter(entry => entry.item === item)
      .map(entry => entry.a) || agents;
    if (!compact && item.kind === 'text') beginKinetic(item.el, builders, performance.now());
    // A native-content reveal starts only after the blueprint has been drawn.
    // No ghost copy, grayscale loading state or flash from an already-loaded card.
    const frames = keyframes(item);
    const animation = item.el.animate(frames, {
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
    el.classList.remove('build-pending','build-staging');
    el.classList.add('build-complete');
  }
  function finishStage() {
    if (!stage) return;
    stage.items.forEach(reveal);
    clearGuides();
    agents.forEach(a => a.el.style.opacity = '0');
    cursorTrails?.clear();
    stage = null;
    phase = 'hold';
    const upcoming = targets.some(el => !el.classList.contains('build-complete') && !el.hidden);
    holdUntil = performance.now() + (upcoming ? timings.linger : 570);
    caption.textContent = autoplay ? 'AUTOPLAY / 23 AGENTS' : 'TOUR PAUSED';
  }
  // Measure each block once per frame. The swarm engine then works entirely
  // in plain geometry, without repeatedly reading the DOM for 23 cursors.
  function layoutOf(item) {
    const container = item.el.getBoundingClientRect();
    const title = item.kind === 'text'
      ? item.el.matches('h1,h2,h3') ? item.el
        : item.el.querySelector('h1,h2,h3,.big-copy,summary')
      : null;
    const focusRect = title?.getBoundingClientRect();
    const rect = focusRect && focusRect.width > 10 && focusRect.height > 10
      ? focusRect : container;
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
    const available = targets.filter(el =>
      !el.classList.contains('build-complete') && visible(el));
    if (!available.length) {
      phase = 'idle';
      if (autoplay) startCamera(now);
      return;
    }
    // Storyboard scenes: a project, image or comparison is the sole focal
    // object. Smaller pieces within ONE parent (e.g. a heading and its
    // description, or two detail rows) form a coherent supporting group.
    const primary = available[0];
     // A single focal object per beat prevents unrelated tabs, labels and cards
    // appearing while the pointer crew is still working elsewhere.
    const selected = [primary];
    // Never expose finished card content before the builders arrive.
    // The blueprint/cursors establish the frame first, then native HTML reveals.
    const items = selected.map((el,i) => ({
      el,kind:kind(el),done:false,
      revealAt:timings.revealStart + i*timings.revealGap
    }));
    // 23 agents still exist and all build the opening, but only a focused
    // construction crew moves during each readable portfolio chapter.
    // Six purposeful tasks are clearer than ten undirected arrows. The
    // entire 23-agent cast still participates in the opening and rotation.
    const crewSize = items[0].kind === 'project' ? 6 : (compact ? 4 : 6);
    const crew = Array.from({length:crewSize},(_,i) =>
      agents[(stageCount * 5 + i) % agents.length]);
    agents.forEach(a=>{if (!crew.includes(a)) a.el.style.opacity = '0';});
    const assignments = swarm.planStage(items.map(layoutOf),crew,stageCount,viewport());
    assignments.forEach(entry => {
      entry.a.formation = entry.targetIndex;
      entry.a.task = entry.task;
      entry.a.el.dataset.task = entry.task;
    });
    if (sceneDirector && items[0].kind === 'project')
      sceneDirector.start(items[0]);
    stage = {items,assignments,start:now,
      duration:timings.revealStart + (items.length-1)*timings.revealGap +
      timings.reveal + (compact?190:230)};
    stageCount++;
    phase = 'working';
    cursorTrails?.clear();
    caption.textContent = sceneLabel(items[0]);
  }
  function showWork(now) {
    if (!stage) { chooseStage(now); return; }
    const t = now - stage.start;
    const layouts = stage.items.map(layoutOf);
    const positions = swarm.workFrame(stage.assignments, layouts, t,
      {...timings, duration: stage.duration}, viewport());
    // Draw the measured object outline before positioning the lead cursor.
    // This makes the red construction stroke visibly originate from the crew.
    const drawing = updateBlueprint(stage.items[0],layouts[0],t);
    if (drawing && positions.length) {
      // The lead cursor constructs the selection baseline; five other agents
      // draw distinct, project-specific geometry at measured path endpoints.
      const lead = positions.find((_,i)=>stage.assignments[i].slot===0)||positions[0];
      lead.x = drawing.left + drawing.width * drawing.draw;
      lead.y = drawing.top + drawing.height;
    }
    let sceneTips = null;
    if (sceneDirector && stage.items[0].kind === 'project') {
      const art = layouts[0].artRect || layouts[0].rect;
      const tips = sceneDirector.render({
        item:stage.items[0],rect:art,elapsed:t,
        revealAt:stage.items[0].revealAt,crew:stage.assignments,
        viewport:viewport()
      });
      sceneTips = tips;
      positions.forEach((position,i)=>{
        const slot=stage.assignments[i].slot;
        if(slot===0)return;
        const tip=tips[slot];
        if(!tip)return;
        // A small, restrained entry offset moves into the exact drawing
        // point instead of teleporting between unrelated content.
        const arrival=clamp(t/(timings.approach*.65),0,1);
        position.x=position.x*(1-arrival)+tip.x*arrival;
        position.y=position.y*(1-arrival)+tip.y*arrival;
        stage.assignments[i].a.el.dataset.task=tip.task.toLowerCase();
        position.opacity*=.45+.55*clamp(t/240,0,1);
      });
    }
    let sx = 0, sy = 0;
    positions.forEach((position, i) => {
      const a = stage.assignments[i].a;
      move(a, position.x, position.y, position.opacity);
      sx += a.x;
      sy += a.y;
    });
    if (positions.length) illuminate(sx / positions.length, sy / positions.length, .20);
    // Optional release-gate evidence is sampled from the SAME animation frame
    // that moves real cursor DOM nodes. Normal visitors incur zero recording.
    if (window.__PORTFOLIO_AUDIT__ && sceneTips) {
      const id = stage.items[0].el.dataset.project;
      const samples = window.__portfolioSceneEvidence ||
        (window.__portfolioSceneEvidence = []);
      const previous = samples[samples.length-1];
      if (!previous || previous.id !== id || t - previous.elapsed >= 45) {
        const draft = layer.querySelector('.director-draft');
        const offsets = [...(draft?.querySelectorAll('path')||[])]
          .map(p=>Number(p.getAttribute('stroke-dashoffset')));
        const distances = stage.assignments.map((entry,i)=>{
          const tip = sceneTips[entry.slot];
          if (!tip || entry.slot===0) return null;
          return Math.hypot(entry.a.x-tip.x,entry.a.y-tip.y);
        }).filter(x=>x!==null);
        samples.push({
          id,elapsed:t,progress:t/stage.items[0].revealAt,
          phase:blueprint.dataset.phase,
          pending:stage.items[0].el.classList.contains('build-pending'),
          svgOpacity:Number(draft?.style.opacity||0),
          strokes:offsets.filter(value=>Number.isFinite(value) && value<95).length,
          cursorAttachments:distances.filter(d=>d<24).length,
          cursorDistances:distances,
          crew:stage.assignments.length,
          pathCount:offsets.length,
          blueprintTarget:blueprint.dataset.target
        });
      }
    }
    stage.items.forEach((item,i) => {
      if (!item.done && t >= item.revealAt) reveal(item);
    });
    // The scaffold belongs only to the primary focus, never to a previously
    // revealed project or unrelated navigation element.
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
    // Reframe the NEXT real element at the reading position before any
    // pointers appear. A short preview must not be built below the fold.
    const upcoming = targets.find(el =>
      !el.classList.contains('build-complete') && !el.hidden &&
      !el.closest('[hidden]'));
    const rect = upcoming?.getBoundingClientRect();
    // Projects and visual comparisons become composed camera shots. Small
    // cards are centered vertically; long headlines stay higher for reading.
    const cinematicCard = upcoming?.matches('.project,.comparison,.manifesto');
    const desiredTop = cinematicCard && rect
      ? clamp((innerHeight - rect.height) * .48,
          innerHeight * .16, innerHeight * .32)
      : innerHeight * (compact ? .18 : .20);
    const targetY = rect
      ? scrollY + rect.top - desiredTop
      : scrollY + innerHeight * .75;
    // A direct but eased travel; unnecessary micro-scrolls used to leave
    // empty black gaps between every label and actual project card.
    // Travel directly to the next real object in a single controlled move.
    // Intermediate half-screen moves were creating long empty black scenes.
    const to = Math.min(max, Math.max(scrollY, targetY));
    camera = {
      from: scrollY, to, start: now, duration: timings.camera,
      next: upcoming,
      agents: agents.map(a => ({x:a.x,y:a.y}))
    };
    phase = 'camera';
    caption.textContent = 'MOVING THROUGH THE STORY';
    document.documentElement.classList.add('agent-camera-moving');
    agents.forEach(a=>a.el.style.opacity='0');
    cursorTrails?.clear();
    restoreKinetic();
    clearGuides();
  }
  function showCamera(now) {
    if (!camera) { phase = 'idle'; return; }
    const t = clamp((now - camera.start) / camera.duration, 0, 1);
    const eased = easeInOut(t);
    scrollTo({top: camera.from + (camera.to - camera.from) * eased, behavior: 'instant'});
    // The camera belongs to the work. Don't cover completed content with
    // traveling arrows or ribbons while the visitor is trying to read.
    agents.forEach(a => a.el.style.opacity = '0');
    illuminate(innerWidth * .5, innerHeight * (.43 + .1 * eased), 0);
    if (t >= 1) {
      const next = camera.next;
      camera = null;
      document.documentElement.classList.remove('agent-camera-moving');
      // Give the new camera position one layout frame to settle before
      // measuring the cursor anchors. A stale rect caused drifting cursors.
      requestAnimationFrame(() => {
        if (!enabled || !autoplay || document.hidden) return;
        if (next && !next.classList.contains('build-complete') && visible(next)) chooseStage(performance.now());
        else chooseStage(performance.now());
        schedule();
      });
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
    // Trails belong to the wordmark opening only. On project cards their
    // residual ribbons made the builders look disconnected from the frame.
    if (phase === 'intro') cursorTrails?.draw(now, agents, phase);
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
    sceneDirector?.clear();
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
    sceneDirector?.clear();
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
      // Replay begins from an entirely clean visual state. A pre-existing
      // preview must not remain faintly visible behind the rebuilt intro.
      el.classList.remove('build-complete','build-staging');
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

  // Deterministic visual QA: render the REAL production stage at requested
  // times without relying on a remote browser runner to hit a 200ms window.
  // This hook exists only when the test harness opted in before page load.
  if (window.__PORTFOLIO_AUDIT__ && !reduceMotion && swarm) {
    window.__portfolioAuditScene = (id,progress=.62) => {
      if (!['chem','reframe','brand','discovery'].includes(id)) return null;
      const el = document.querySelector('.project[data-project="'+id+'"]');
      if (!el) return null;
      if (frame) cancelAnimationFrame(frame);
      frame=0;autoplay=false;enabled=true;
      particleIntro?.end();introAvailable=false;introHandoff=true;
      const loader=document.querySelector('.loader');if(loader)loader.style.display='none';
      cursorTrails?.clear();restoreKinetic();sceneDirector?.clear();
      animations.forEach(a=>{try{a.cancel()}catch{}});
      animations=[];camera=null;stage=null;
      clearGuides();
      targets.forEach(revealImmediately);
      el.classList.remove('build-complete','build-staging');
      el.classList.add('build-pending');
      document.documentElement.classList.remove('agent-camera-moving');
      const old=el.getBoundingClientRect();
      const max=Math.max(0,document.documentElement.scrollHeight-innerHeight);
      const y=clamp(scrollY+old.top-innerHeight*.25,0,max);
      phase='working';
      scrollTo({top:y,behavior:'instant'});
      const item={el,kind:'project',done:false,revealAt:timings.revealStart};
      const crew=Array.from({length:6},(_,i)=>agents[(stageCount*5+i)%agents.length]);
      agents.forEach(a=>a.el.style.opacity='0');
      const assignments=swarm.planStage([layoutOf(item)],crew,stageCount++,viewport());
      assignments.forEach(a=>a.a.el.dataset.task=a.task);
      sceneDirector?.start(item);
      const now=performance.now();
      stage={items:[item],assignments,start:now-clamp(progress,0,1.5)*timings.revealStart,
        duration:timings.revealStart+timings.reveal+(compact?190:230)};
      caption.textContent=sceneLabel(item);
      showWork(now);
      return {id,progress,crew:assignments.length,
        pending:el.classList.contains('build-pending'),
        drawing:document.querySelector('.director-draft')?.dataset.target};
    };
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
  // Visitor interaction takes over autoplay, but cinematic controls must be
  // excluded: mobile touchstart fires BEFORE their click event.
  addEventListener('wheel', e => {
    if (e.target?.closest?.('.build-controls')) return;
    if (enabled) exploreFreely();
  }, {passive:true});
  addEventListener('touchstart', e => {
    if (e.target?.closest?.('.build-controls')) return;
    if (enabled) exploreFreely();
  }, {passive:true});
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