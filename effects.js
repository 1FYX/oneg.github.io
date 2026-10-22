(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const hero = document.querySelector('.hero');
  const atmosphere = document.querySelector('.hero-atmosphere');
  const activeAnimations = new Set();

  // WAAPI owns only entrance animations. Card tilt remains owned by script.js.
  function enter(element, delay = 0, card = false) {
    if (reduced.matches || !element.animate) return;
    const frames = card
      ? [{ opacity: 0, filter: 'blur(4px)' }, { opacity: 1, filter: 'blur(0px)' }]
      : [{ opacity: 0, transform: 'translateY(22px)', filter: 'blur(4px)' }, { opacity: 1, transform: 'translateY(0)', filter: 'blur(0px)' }];
    const animation = element.animate(frames, { duration: 380, delay, easing: 'cubic-bezier(.16, 1, .3, 1)', fill: 'both' });
    activeAnimations.add(animation);
    animation.finished.then(() => { activeAnimations.delete(animation); animation.cancel(); }).catch(() => activeAnimations.delete(animation));
  }

  function revealHero() {
    activeAnimations.forEach(animation => animation.cancel());
    activeAnimations.clear();
    if (reduced.matches || hero.getBoundingClientRect().bottom < 0) return;
    enter(hero.querySelector('.eyebrow'));
    hero.querySelectorAll('.hero-line').forEach((line, index) => enter(line, 70 + index * 80));
    ['.hero-description', '.hero-actions', '.hero-status'].forEach((selector, index) => enter(hero.querySelector(selector), 170 + index * 55));
  }
  revealHero();
  document.addEventListener('oneg:languagechange', revealHero);
  reduced.addEventListener('change', () => {
    if (reduced.matches) { activeAnimations.forEach(animation => animation.cancel()); activeAnimations.clear(); }
  });

  const revealTargets = [...document.querySelectorAll('.section-heading, .project-card, .about-intro, .focus-card, .contact > .section-eyebrow, .contact-main, .contact-bottom')];
  const revealed = new WeakSet();
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      const entering = entries.filter(entry => entry.isIntersecting);
      entering.forEach((entry, index) => {
        const element = entry.target;
        if (!revealed.has(element)) {
          enter(element, Math.min(index * 65, 130), element.matches('.tilt-card'));
          revealed.add(element);
        }
        observer.unobserve(element);
      });
    }, { threshold: .06, rootMargin: '0px 0px 60px 0px' });
    revealTargets.forEach(element => observer.observe(element));
  }

  // Decorative flow lines reuse the same paths as the static preview connectors.
  document.querySelectorAll('.node-connectors').forEach(svg => {
    const flow = svg.querySelector('path').cloneNode();
    flow.classList.add('node-flow');
    flow.setAttribute('aria-hidden', 'true');
    svg.append(flow);
  });

  // The atmosphere is CSS-only; pause its slow drift outside the viewport.
  let inView = true;
  function syncAtmosphere() {
    atmosphere.classList.toggle('atmosphere-paused', document.hidden || !inView);
  }
  document.addEventListener('visibilitychange', syncAtmosphere);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      syncAtmosphere();
    }).observe(hero);
  }
  syncAtmosphere();
})();
