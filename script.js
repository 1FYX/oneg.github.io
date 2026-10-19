(() => {
  'use strict';
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const root = document.documentElement;
  const commandDialog = $('#command-dialog');
  const projectDialog = $('#project-dialog');
  const input = $('#command-input');
  const output = $('#command-output');
  let typingTimer;
  let toastTimer;
  let projectCleanup = () => {};

  $('#year').textContent = new Date().getFullYear();
  $('#shortcut-hint').textContent = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘ K' : 'Ctrl K';
  if (window.lucide) window.lucide.createIcons();
  try {
    if (localStorage.getItem('oneg-theme') === 'light') root.dataset.theme = 'light';
  } catch (_) { /* Storage can be disabled; the page still works. */ }
  syncThemeColor();

  function notify(message) {
    const toast = $('#toast');
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('visible');
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 3200);
  }

  function syncThemeColor() {
    $('meta[name="theme-color"]').content = root.dataset.theme === 'light' ? '#f3f5f7' : '#0A0A0C';
  }

  function toggleTheme() {
    const theme = root.dataset.theme === 'light' ? 'dark' : 'light';
    root.dataset.theme = theme;
    syncThemeColor();
    try { localStorage.setItem('oneg-theme', theme); } catch (_) { /* Use the in-memory theme. */ }
    return theme;
  }

  function typeReply(message) {
    clearInterval(typingTimer);
    output.replaceChildren();
    // A single complete announcement, with a separate visual typewriter.
    const announcement = document.createElement('span');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    const visual = document.createElement('span');
    visual.setAttribute('aria-hidden', 'true');
    output.append(announcement, visual);
    if (reducedMotion.matches) { visual.textContent = message; return; }
    let position = 0;
    typingTimer = setInterval(() => {
      position += 3;
      visual.textContent = message.slice(0, position);
      if (position >= message.length) clearInterval(typingTimer);
    }, 16);
  }

  function openDialog(dialog, source) {
    if (dialog.open) return;
    $$('dialog[open]').forEach(other => other.close());
    dialog.returnFocus = source || document.activeElement;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    hidePointer();
  }

  $$('dialog').forEach(dialog => {
    $('[data-close-dialog]', dialog).addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const box = dialog.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
    });
    dialog.addEventListener('close', () => {
      if (!document.querySelector('dialog[open]')) document.body.style.overflow = '';
      if (dialog === commandDialog) clearInterval(typingTimer);
      else projectCleanup();
      // Native dialog restores focus; the explicit fallback supports pointer openers.
      if (dialog.returnFocus?.isConnected && !$('dialog[open]')) dialog.returnFocus.focus({ preventScroll: true });
    });
  });

  const commands = [
    { id: 'about', label: 'About me', hint: 'The person behind the pixels', symbol: '◉', action: () => navigateTo('about') },
    { id: 'projects', label: 'Selected projects', hint: 'Explore the experiments', symbol: '⊞', action: () => navigateTo('projects') },
    { id: 'contact', label: 'Connect', hint: 'Start a conversation', symbol: '↗', action: () => navigateTo('contact') },
    { id: 'theme', label: 'Toggle theme', hint: 'A different perspective', symbol: '◐', action: () => typeReply(`> theme switched to ${toggleTheme()}.\nA fresh perspective, same curiosity.`) },
    { id: 'help', label: 'Help', hint: 'See available commands', symbol: '?', action: () => typeReply('> available commands:\nabout · projects · contact · theme · help\nUse ↑ ↓ and Enter, or click a command.') }
  ];
  let filteredCommands = commands;
  let selectedCommand = 0;

  function navigateTo(section) {
    commandDialog.close();
    requestAnimationFrame(() => {
      const target = $(`#${section}`);
      target.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'start' });
      const heading = $('h2', target);
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
      notify(`> opening ${section}…`);
    });
  }

  function updateSelection() {
    $$('.command-option').forEach((option, index) => option.setAttribute('aria-selected', String(index === selectedCommand)));
    if (filteredCommands.length) input.setAttribute('aria-activedescendant', `command-${filteredCommands[selectedCommand].id}`);
    else input.removeAttribute('aria-activedescendant');
  }

  function renderCommands() {
    const list = $('#command-list');
    const query = input.value.trim().toLowerCase().replace(/^>\s*/, '');
    filteredCommands = commands.filter(command => `${command.id} ${command.label}`.toLowerCase().includes(query));
    selectedCommand = Math.min(selectedCommand, Math.max(0, filteredCommands.length - 1));
    list.replaceChildren();
    filteredCommands.forEach((command, index) => {
      const option = document.createElement('div');
      option.className = 'command-option';
      option.id = `command-${command.id}`;
      option.setAttribute('role', 'option');
      const symbol = document.createElement('span');
      symbol.className = 'command-option-symbol';
      symbol.textContent = command.symbol;
      const label = document.createElement('span');
      label.textContent = command.label;
      const hint = document.createElement('small');
      hint.textContent = command.hint;
      option.append(symbol, label, hint);
      option.addEventListener('click', command.action);
      option.addEventListener('pointermove', () => {
        if (selectedCommand !== index) { selectedCommand = index; updateSelection(); }
      });
      list.append(option);
    });
    if (!filteredCommands.length) {
      const empty = document.createElement('p');
      empty.className = 'no-results';
      empty.textContent = 'No command found. Try about, projects, contact, or theme.';
      list.append(empty);
    }
    updateSelection();
  }

  function openCommand(source) {
    clearInterval(typingTimer);
    input.value = '';
    output.replaceChildren();
    selectedCommand = 0;
    renderCommands();
    openDialog(commandDialog, source);
    input.focus();
  }

  $$('[data-open-command]').forEach(button => button.addEventListener('click', () => openCommand(button)));
  document.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (commandDialog.open) commandDialog.close();
      else openCommand(document.activeElement);
    }
  });
  input.addEventListener('input', () => { selectedCommand = 0; renderCommands(); });
  input.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!filteredCommands.length) return;
      selectedCommand = (selectedCommand + (event.key === 'ArrowDown' ? 1 : -1) + filteredCommands.length) % filteredCommands.length;
      updateSelection();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (filteredCommands[selectedCommand]) filteredCommands[selectedCommand].action();
      else typeReply('> command not found.\nTry: about, projects, contact, theme, or help.');
    }
  });

  const projectContent = {
    orbit: { title: 'Orbit', number: '001', label: 'INTERFACE DESIGN / INTERACTIVE CONCEPT', description: 'An experiment in connected thinking. Pick two ideas below and see where they meet. A small prototype of an interface for making unexpected connections.' },
    signal: { title: 'Signal', number: '002', label: 'DEVELOPER TOOLS / INTERACTIVE CONCEPT', description: 'A tiny dashboard for the environment you’re in right now. These readings come directly from your browser — a live experiment in turning local data into something useful.' }
  };

  $$('[data-project]').forEach(button => button.addEventListener('click', () => {
    const id = button.dataset.project;
    const project = projectContent[id];
    $('#project-dialog-title').textContent = project.title;
    $('#experiment-id').textContent = project.number;
    $('#project-dialog-label').textContent = project.label;
    $('#project-dialog-description').textContent = project.description;
    const demo = $('#project-demo');
    demo.replaceChildren();
    if (id === 'orbit') createOrbitDemo(demo); else createSignalDemo(demo);
    openDialog(projectDialog, button);
  }));

  function createOrbitDemo(container) {
    const stage = document.createElement('div');
    stage.className = 'demo-stage';
    stage.innerHTML = '<p class="demo-hint">01 / SELECT TWO IDEAS TO CONNECT</p><div class="demo-orbit"></div><p class="demo-result" aria-live="polite">Every connection starts with a little curiosity.</p>';
    const selected = [];
    const responses = {
      'Code + Design': 'Thoughtful interfaces. Where function finds its form.',
      'AI + Code': 'A creative copilot. New tools for new kinds of building.',
      'Code + Curiosity': 'An experiment worth making. Start small, see what happens.',
      'AI + Design': 'A new canvas. Explore an idea, then make it your own.',
      'Curiosity + Design': 'A better question. What if an interface felt different?',
      'AI + Curiosity': 'An open frontier. Follow the questions without easy answers.'
    };
    ['Code', 'Design', 'AI', 'Curiosity'].forEach(idea => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'demo-node';
      button.textContent = idea;
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', () => {
        const index = selected.indexOf(idea);
        if (index !== -1) selected.splice(index, 1);
        else { if (selected.length === 2) selected.shift(); selected.push(idea); }
        $$('.demo-node', stage).forEach(node => node.setAttribute('aria-pressed', String(selected.includes(node.textContent))));
        $('.demo-result', stage).textContent = selected.length === 2
          ? `${selected.join(' + ')} → ${responses[[...selected].sort().join(' + ')]}`
          : selected.length ? `${selected[0]} + a new perspective. Pick one more idea.` : 'Every connection starts with a little curiosity.';
      });
      $('.demo-orbit', stage).append(button);
    });
    container.append(stage);
    projectCleanup = () => {};
  }

  function createSignalDemo(container) {
    const stage = document.createElement('div');
    stage.className = 'demo-stage';
    stage.innerHTML = '<p class="demo-hint">LIVE / YOUR BROWSER ENVIRONMENT</p><dl class="live-metrics"><div><dt>VIEWPORT</dt><dd data-metric="viewport"></dd></div><div><dt>LOCAL TIME</dt><dd data-metric="time"></dd></div><div><dt>NETWORK</dt><dd data-metric="network"></dd></div><div><dt>MOTION PREFERENCE</dt><dd data-metric="motion"></dd></div></dl><button class="button button-primary" type="button">Refresh readings ↗</button><p class="demo-hint" style="margin-top:16px">Network indicates browser connectivity, not service reachability.</p>';
    function refresh() {
      $('[data-metric="viewport"]', stage).textContent = `${innerWidth} × ${innerHeight}`;
      $('[data-metric="time"]', stage).textContent = new Date().toLocaleTimeString([], { hour12: false });
      $('[data-metric="network"]', stage).textContent = navigator.onLine ? 'Online' : 'Offline';
      $('[data-metric="motion"]', stage).textContent = reducedMotion.matches ? 'Reduced' : 'Standard';
    }
    $('button', stage).addEventListener('click', () => { refresh(); notify('> readings refreshed.'); });
    refresh();
    const interval = setInterval(refresh, 1000);
    projectCleanup = () => clearInterval(interval);
    container.append(stage);
  }

  $('#copy-link').addEventListener('click', async () => {
    const url = new URL(location.href);
    url.hash = '';
    try { await navigator.clipboard.writeText(url.href); notify('Site link copied. Pass the curiosity on.'); }
    catch (_) {
      const text = document.createElement('textarea');
      text.value = url.href;
      text.style.cssText = 'position:fixed;left:-9999px';
      document.body.append(text);
      text.select();
      let copied = false;
      try { copied = document.execCommand('copy'); } catch (_) { /* Show a useful fallback. */ }
      text.remove();
      $('#copy-link').focus();
      notify(copied ? 'Site link copied.' : 'Copy the site address from your browser’s address bar.');
    }
  });

  // A single on-demand animation loop smooths cursor, glow, and magnetic snapping.
  const ring = $('.cursor-ring');
  const dot = $('.cursor-dot');
  const glow = $('.ambient-glow');
  let pointerX = 0, pointerY = 0, ringX = 0, ringY = 0;
  let frameId = 0, activeMagnet = null, activeCard = null, pointerVisible = false;
  const canAnimatePointer = () => finePointer.matches && !reducedMotion.matches;

  function animatePointer() {
    frameId = 0;
    if (!canAnimatePointer() || !pointerVisible || $('dialog[open]')) return;
    let targetX = pointerX, targetY = pointerY;
    if (activeMagnet) {
      const box = activeMagnet.getBoundingClientRect();
      targetX += (box.left + box.width / 2 - pointerX) * .24;
      targetY += (box.top + box.height / 2 - pointerY) * .24;
    }
    ringX += (targetX - ringX) * .22;
    ringY += (targetY - ringY) * .22;
    ring.style.transform = `translate3d(${ringX}px,${ringY}px,0)`;
    dot.style.transform = `translate3d(${pointerX}px,${pointerY}px,0)`;
    glow.style.transform = `translate3d(${pointerX - 350}px,${pointerY - 350}px,0)`;
    if (Math.abs(targetX - ringX) > .08 || Math.abs(targetY - ringY) > .08) frameId = requestAnimationFrame(animatePointer);
  }

  function queuePointer() { if (!frameId) frameId = requestAnimationFrame(animatePointer); }

  function resetCard(card) {
    if (window.gsap) window.gsap.to(card, { rotateX: 0, rotateY: 0, duration: .35, ease: 'power2.out', overwrite: true });
    else { card.style.transition = 'transform .3s ease-out'; card.style.transform = ''; }
  }

  function hidePointer() {
    pointerVisible = false;
    root.classList.remove('cursor-enabled');
    ring.style.opacity = dot.style.opacity = glow.style.opacity = '0';
    ring.classList.remove('is-hover', 'is-down');
    activeMagnet = null;
    if (activeCard) resetCard(activeCard);
    activeCard = null;
    cancelAnimationFrame(frameId);
    frameId = 0;
  }

  document.addEventListener('pointermove', event => {
    if (!canAnimatePointer() || event.pointerType === 'touch' || $('dialog[open]')) return;
    pointerX = event.clientX;
    pointerY = event.clientY;
    if (!pointerVisible) {
      ringX = pointerX; ringY = pointerY; pointerVisible = true;
      ring.style.opacity = dot.style.opacity = glow.style.opacity = '1';
      root.classList.add('cursor-enabled');
    }
    activeMagnet = event.target.closest('.magnetic');
    ring.classList.toggle('is-hover', !!event.target.closest('a, button'));
    const card = event.target.closest('.tilt-card');
    if (activeCard && card !== activeCard) resetCard(activeCard);
    activeCard = card;
    if (card) {
      const box = card.getBoundingClientRect();
      const x = event.clientX - box.left, y = event.clientY - box.top;
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
      const rotateX = (0.5 - y / box.height) * 5;
      const rotateY = (x / box.width - 0.5) * 5;
      if (window.gsap) window.gsap.to(card, { rotateX, rotateY, transformPerspective: 1100, duration: .3, ease: 'power2.out', overwrite: true });
      else { card.style.transition = 'transform .3s ease-out'; card.style.transform = `perspective(1100px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`; }
    }
    queuePointer();
  }, { passive: true });
  document.addEventListener('pointerdown', () => ring.classList.add('is-down'), { passive: true });
  document.addEventListener('pointerup', () => ring.classList.remove('is-down'), { passive: true });
  document.documentElement.addEventListener('pointerleave', hidePointer);
  window.addEventListener('blur', hidePointer);
  document.addEventListener('scroll', hidePointer, { passive: true });
  document.addEventListener('keydown', event => { if (event.key === 'Tab') hidePointer(); });
  finePointer.addEventListener('change', hidePointer);
  reducedMotion.addEventListener('change', hidePointer);

  // Content is visible by default, even when any external CDN is unavailable.
  if (window.gsap && !reducedMotion.matches) {
    window.gsap.from('.reveal', { y: 16, opacity: 0, duration: .4, stagger: .065, ease: 'power2.out', clearProps: 'all' });
    window.gsap.from('.hero-art', { opacity: 0, duration: .4, ease: 'power2.out', clearProps: 'opacity' });
  }
})();
