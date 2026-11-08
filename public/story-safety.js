/* Ravi M — independent viewer safety net.
   If the cinematic engine throws or never completes its opening, restore the
   usable HTML portfolio rather than leaving the visitor on a frozen screen. */
(() => {
  'use strict';
  let recovered = false;
  const engineFile = /(?:build-story|swarm-formation|particle-intro|cursor-trails|kinetic-typography)\.js(?:$|\?)/;

  function release(reason) {
    if (recovered || document.hidden) return;
    const pending = document.querySelectorAll('.build-pending');
    const hiddenText = document.querySelectorAll('.kinetic-source-hidden');
    const primer = document.documentElement.classList?.contains?.('hero-build-primed');
    if (!pending.length && !hiddenText.length && !primer) return;
    recovered = true;
    try {
      if (typeof window.__portfolioStoryRecover === 'function') {
        window.__portfolioStoryRecover();
        return;
      }
    } catch {}
    // Recovery must not itself depend on the animation engine or Canvas.
    for (const node of pending) {
      node.classList.remove('build-pending');
      node.classList.add('build-complete');
    }
    for (const heading of hiddenText) {
      heading.classList.remove('kinetic-source-hidden');
    }
    document.querySelector('.agent-layer')?.remove();
    document.querySelector('.build-controls')?.remove();
    document.documentElement.classList.remove('agent-camera-moving');
    document.documentElement.classList.remove('hero-build-primed');
    document.body.classList.add('story-recovered');
  }

  window.addEventListener('error', event => {
    const file = event.filename || '';
    if (engineFile.test(file)) release('script-error');
  });
  window.addEventListener('unhandledrejection', event => {
    const trace = String(event.reason?.stack || '');
    if (engineFile.test(trace)) release('rejection');
  });

  function verifyIntro() {
    if (recovered) return;
    if (document.hidden ||
        document.querySelector('.build-pause')?.getAttribute?.('aria-pressed') === 'true') {
      window.setTimeout(verifyIntro, 2500);
      return;
    }
    const heroTitle = document.querySelector('.hero h1');
    const constructing = heroTitle?.dataset?.introState === 'constructing';
    const primer = document.documentElement.classList?.contains?.('hero-build-primed');
    // The native headline is not build-pending while its CSS mask advances.
    // A stalled reveal must still unlock every pending section, not only the
    // heading. The normal prepaint timer independently restores the headline.
    if (heroTitle?.classList.contains('build-pending') || constructing || primer)
      release('intro-timeout');
  }

  window.setTimeout(verifyIntro, 6500);
})();