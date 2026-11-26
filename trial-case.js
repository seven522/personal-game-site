const $ = id => document.getElementById(id);
const directions = {
  left: {code:'ArrowLeft', face:'◀', label:'向左移动'},
  right: {code:'ArrowRight', face:'▶', label:'向右移动'}
};
const layouts = {
  classic: {
    ...directions, up:{code:'ArrowUp', face:'▲', label:'向上移动'}, down:{code:'ArrowDown', face:'▼', label:'向下移动'},
    a:{code:'Enter', face:'A', label:'A，确认'}, b:{code:'Escape', face:'B', label:'B，返回'}
  },
  arcade: {
    ...directions, a:{code:'KeyJ', face:'轻拳', label:'轻拳连击'}, b:{code:'KeyK', face:'重拳', label:'重拳，长按蓄力破盾'},
    dash:{code:'KeyL', face:'闪避', label:'闪避'}, jump:{code:'Space', face:'跳跃', label:'跳跃'},
    parry:{code:'KeyI', face:'弹反', label:'精准弹反'}, super:{code:'KeyU', face:'必杀', label:'满怒释放必杀'}
  }
};
const shortcuts = {
  classic:{KeyW:'up', KeyS:'down', KeyA:'left', KeyD:'right', KeyZ:'a', KeyX:'b'},
  arcade:{KeyA:'left', KeyD:'right', ArrowUp:'jump', KeyW:'jump', ShiftLeft:'dash', ShiftRight:'dash'}
};
export function setupTelevision() {
  const station = $('trial');
  const power = $('tv-power');
  const pad = document.querySelector('.pad-controls');
  const startButton = $('pad-start');
  const sizeKey = $('screen-size');
  const rotateKey = $('screen-rotate');
  const challenge = $('boss-challenge');
  const phoneLayout = matchMedia('(max-width:760px), (pointer:coarse) and (max-width:1024px), (pointer:coarse) and (max-height:560px)');
  const nativeLandscape = matchMedia('(orientation:landscape) and (max-height:560px)');
  let returnScroll = 0;
  const held = new Map();
  const buttons = [...pad.querySelectorAll('.pad-hit:not(.hit-start)')];
  const buttonByAction = new Map(buttons.map(button => [button.id.slice(4), button]));
  let bindings, keyActions;
  let game, frame, ready = false;
  let startPointerId = null;
  let lastPointerStartAt = 0;

  for (const type of ['contextmenu', 'selectstart', 'dragstart']) {
    station.addEventListener(type, event => event.preventDefault(), true);
  }
  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
    document.addEventListener(type, event => {
      if (event.cancelable) event.preventDefault();
    }, { passive: false });
  }
  station.addEventListener('dblclick', event => event.preventDefault(), true);

  // Block iOS Safari's native long-press magnifier loupe and double-tap zoom across the gamepad.
  // Pointer events continue to fire normally for multi-touch holds and rapid taps.
  for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) {
    pad.addEventListener(type, event => {
      if (event.cancelable) event.preventDefault();
    }, { passive: false });
  }
  document.addEventListener('touchmove', event => {
    if (event.touches.length > 1 && event.cancelable) event.preventDefault();
  }, { passive: false });
  let lastTouchEnd = 0;
  document.addEventListener('touchend', event => {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('button:not(.pad-hit), a, select, input, textarea, label, .inspect')) {
      lastTouchEnd = 0;
      return;
    }
    const now = performance.now();
    if (now - lastTouchEnd <= 320 && event.cancelable) event.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });

  function start(continueRound = false) {
    releaseAll();
    if (!frame) {
      frame = document.createElement('iframe');
      frame.title = game.title + ' · 在线试玩';
      frame.className = 'game-frame';
      frame.allow = 'autoplay; fullscreen';
      frame.src = game.entry;
      $('layer-play').append(frame);
      power.hidden = true;
    }
    frame.focus({preventScroll:true});
    if (ready) {
      frame.contentDocument.querySelector('canvas')?.focus({preventScroll:true});
      if (continueRound && game.controller === 'arcade') {
        sendCode('Enter', true);
        sendCode('Enter', false);
      }
    }
  }
  function setRotated(on) {
    const next = Boolean(on) && document.body.classList.contains('play-expanded') && !nativeLandscape.matches;
    document.body.classList.toggle('play-rotated', next);
    if (rotateKey) {
      rotateKey.setAttribute('aria-pressed', String(next));
      const label = $('rotate-label');
      if (label) label.textContent = next ? '恢复竖屏' : '横屏放大';
    }
  }
  function setExpanded(on) {
    if (on === document.body.classList.contains('play-expanded')) return;
    releaseAll();
    if (on) returnScroll = window.scrollY;
    else setRotated(false);
    document.body.classList.toggle('play-expanded', on);
    sizeKey.setAttribute('aria-expanded', String(on));
    $('size-label').textContent = on ? '收起画面' : '放大试玩';
    if (on) start();
    else {
      window.scrollTo({top:returnScroll, behavior:'instant'});
      if (phoneLayout.matches) sizeKey.focus({preventScroll:true});
    }
  }
  sizeKey.onclick = () => setExpanded(sizeKey.getAttribute('aria-expanded') !== 'true');
  if (rotateKey) {
    rotateKey.onclick = () => {
      if (!document.body.classList.contains('play-expanded')) setExpanded(true);
      setRotated(!document.body.classList.contains('play-rotated'));
    };
  }
  phoneLayout.addEventListener('change', () => { if (!phoneLayout.matches) setExpanded(false); });
  nativeLandscape.addEventListener('change', () => { if (nativeLandscape.matches) setRotated(false); });
  $('online-play').onclick = () => {
    if (phoneLayout.matches) {
      setExpanded(true);
      return;
    }
    start();
    station.scrollIntoView({block:'start', behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
  };
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== frame?.contentWindow ||
        event.data?.type !== 'cartridge-ready' || event.data.id !== game.id) return;
    ready = true;
    const bossList = frame.contentDocument.getElementById('boss-select');
    if (bossList) {
      for (const option of bossList.options) {
        if (option.value) challenge.add(new Option(option.text, option.value));
      }
      challenge.disabled = false;
    }
    $('pad-start').setAttribute('aria-label', 'START，继续试玩' + game.title);
  });
  challenge.addEventListener('change', () => {
    const list = frame?.contentDocument?.getElementById('boss-select');
    if (!list || !challenge.value) return;
    releaseAll();
    list.value = challenge.value;
    list.dispatchEvent(new frame.contentWindow.Event('change', {bubbles:true}));
    challenge.value = '';
  });

  function select(next) {
    setExpanded(false);
    releaseAll();
    frame?.remove();
    frame = null;
    ready = false;
    game = next;
    challenge.length = 1;
    challenge.disabled = true;
    challenge.hidden = next.controller !== 'arcade';
    station.dataset.controller = game.controller;
    bindings = layouts[game.controller];
    keyActions = {...shortcuts[game.controller]};
    for (const button of buttons) {
      const action = button.id.slice(4);
      const binding = bindings[action];
      button.hidden = !binding;
      if (!binding) continue;
      keyActions[binding.code] = action;
      button.querySelector('span').textContent = binding.face;
      button.setAttribute('aria-label', binding.label);
      button.title = binding.label;
      button.dataset.key = binding.code.replace('Key','').replace('Space','SPC');
    }
    $('expanded-title').textContent = next.title;
    power.hidden = false;
    $('standby-art').src = next.standby;
    $('standby-title').textContent = next.title;
    $('standby-hint').textContent = next.controller === 'arcade' ? '按 START 进入霓虹雨巷' : '按 START 试玩开发中 Demo';
    power.setAttribute('aria-label', '开始试玩' + next.title);
    $('pad-start').setAttribute('aria-label', 'START，开始试玩' + next.title);
  }

  function sendCode(code, down) {
    const canvas = frame?.contentDocument?.querySelector('canvas');
    if (!canvas || !ready) return;
    const child = frame.contentWindow;
    const key = code.startsWith('Key') ? code.slice(3).toLowerCase() : code === 'Space' ? ' ' : code;
    canvas.dispatchEvent(new child.KeyboardEvent(down ? 'keydown' : 'keyup', {
      key, code, bubbles:true, cancelable:true, view:child
    }));
  }
  function release(action, immediately = false) {
    buttonByAction.get(action)?.classList.remove('is-pressed');
    const entry = held.get(action);
    if (!entry) return;
    clearTimeout(entry.timer);
    const finish = () => { sendCode(entry.code, false); held.delete(action); };
    const delay = immediately ? 0 : Math.max(0, 80 - (performance.now() - entry.at));
    if (delay) entry.timer = setTimeout(finish, delay);
    else finish();
  }
  function releaseAll() {
    for (const button of buttons) button.classList.remove('is-pressed');
    startButton.classList.remove('is-pressed');
    startPointerId = null;
    for (const action of held.keys()) release(action, true);
  }
  function press(action) {
    if (!ready || !bindings[action]) return false;
    release(action, true);
    const code = bindings[action].code;
    held.set(action, {code, at:performance.now(), timer:0});
    buttonByAction.get(action)?.classList.add('is-pressed');
    sendCode(code, true);
    return true;
  }
  for (const button of buttons) {
    const action = button.id.slice(4);
    button.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      event.preventDefault();
      button.classList.add('is-pressed');
      try { button.setPointerCapture(event.pointerId); } catch {}
      press(action);
    });
    button.addEventListener('pointerup', () => release(action));
    button.addEventListener('lostpointercapture', () => release(action));
    button.addEventListener('pointercancel', () => release(action, true));
    button.addEventListener('click', event => {
      if (event.detail === 0 && press(action)) release(action);
    });
  }
  function activateStart(continueRound = true) {
    if (!frame && phoneLayout.matches) {
      setExpanded(true);
      return;
    }
    start(continueRound);
  }
  startButton.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    event.preventDefault();
    startPointerId = event.pointerId;
    startButton.classList.add('is-pressed');
    try { startButton.setPointerCapture(event.pointerId); } catch {}
  });
  startButton.addEventListener('pointerup', event => {
    if (event.pointerId !== startPointerId) return;
    startPointerId = null;
    startButton.classList.remove('is-pressed');
    const rect = startButton.getBoundingClientRect();
    const inside = event.clientX >= rect.left && event.clientX <= rect.right &&
      event.clientY >= rect.top && event.clientY <= rect.bottom;
    if (inside) {
      lastPointerStartAt = performance.now();
      activateStart(true);
    }
  });
  for (const type of ['pointercancel', 'lostpointercapture']) {
    startButton.addEventListener(type, () => {
      startPointerId = null;
      startButton.classList.remove('is-pressed');
    });
  }
  startButton.onclick = () => {
    if (performance.now() - lastPointerStartAt < 450) return;
    activateStart(true);
  };
  // Enter and Space activate the focused button using the browser's normal click.
  pad.addEventListener('keydown', event => {
    if (event.code === 'Enter' || event.code === 'Space') return;
    const action = keyActions[event.code];
    if (!action || !ready || event.ctrlKey || event.altKey || event.metaKey) return;
    event.preventDefault();
    if (!event.repeat) press(action);
  });
  pad.addEventListener('keyup', event => {
    if (event.code !== 'Enter' && event.code !== 'Space') release(keyActions[event.code]);
  });
  pad.addEventListener('focusout', event => { if (!pad.contains(event.relatedTarget)) releaseAll(); });
  window.addEventListener('blur', releaseAll);
  document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); });
  power.onclick = () => {
    if (phoneLayout.matches) setExpanded(true);
    else start();
  };
  return {select};
}
