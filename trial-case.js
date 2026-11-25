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
  const sizeKey = $('screen-size');
  const phoneLayout = matchMedia('(max-width:760px), (pointer:coarse) and (max-width:1024px)');
  let returnScroll = 0;
  const held = new Map();
  const buttons = [...pad.querySelectorAll('.pad-hit:not(.hit-start)')];
  let bindings, keyActions;
  let game, frame, ready = false;

  for (const type of ['contextmenu', 'selectstart', 'dragstart']) {
    station.addEventListener(type, event => event.preventDefault(), true);
  }

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
  function setExpanded(on) {
    if (on === document.body.classList.contains('play-expanded')) return;
    releaseAll();
    if (on) returnScroll = window.scrollY;
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
  phoneLayout.addEventListener('change', () => { if (!phoneLayout.matches) setExpanded(false); });
  $('online-play').onclick = () => {
    start();
    station.scrollIntoView({block:'start', behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
  };
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== frame?.contentWindow ||
        event.data?.type !== 'cartridge-ready' || event.data.id !== game.id) return;
    ready = true;
    $('pad-start').setAttribute('aria-label', 'START，继续试玩' + game.title);
  });

  function select(next) {
    setExpanded(false);
    releaseAll();
    frame?.remove();
    frame = null;
    ready = false;
    game = next;
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
    const entry = held.get(action);
    if (!entry) return;
    clearTimeout(entry.timer);
    const finish = () => { sendCode(entry.code, false); held.delete(action); };
    const delay = immediately ? 0 : Math.max(0, 80 - (performance.now() - entry.at));
    if (delay) entry.timer = setTimeout(finish, delay);
    else finish();
  }
  function releaseAll() { for (const action of held.keys()) release(action, true); }
  function press(action) {
    if (!ready || !bindings[action]) return false;
    release(action, true);
    const code = bindings[action].code;
    held.set(action, {code, at:performance.now(), timer:0});
    sendCode(code, true);
    return true;
  }
  for (const button of buttons) {
    const action = button.id.slice(4);
    button.addEventListener('pointerdown', event => {
      if (event.button !== 0 || !press(action)) return;
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
    });
    button.addEventListener('pointerup', () => release(action));
    button.addEventListener('lostpointercapture', () => release(action));
    button.addEventListener('pointercancel', () => release(action, true));
    button.addEventListener('click', event => {
      if (event.detail === 0 && press(action)) release(action);
    });
  }
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
  power.onclick = () => start();
  $('pad-start').onclick = () => start(true);
  return {select};
}
