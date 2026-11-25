const $ = id => document.getElementById(id);
const codes = {up:'ArrowUp', down:'ArrowDown', left:'ArrowLeft', right:'ArrowRight', a:'Enter', b:'Escape'};
export function setupTelevision() {
  const power = $('tv-power');
  const pad = document.querySelector('.pad-controls');
  const sizeKey = $('screen-size');
  const phoneLayout = matchMedia('(max-width:760px), (pointer:coarse) and (max-width:1024px)');
  let returnScroll = 0;
  const held = new Map();
  let game, frame, ready = false;

  function start() {
    releaseAll();
    if (!frame) {
      frame = document.createElement('iframe');
      frame.title = game.title + ' · Godot 试玩';
      frame.className = 'game-frame';
      frame.allow = 'autoplay; fullscreen';
      frame.src = 'games/player.html?game=' + encodeURIComponent(game.id);
      $('layer-play').append(frame);
      power.hidden = true;
    }
    frame.focus({preventScroll:true});
    if (ready) frame.contentDocument.getElementById('game-canvas').focus({preventScroll:true});
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
    $('trial').scrollIntoView({block:'start', behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
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
    $('expanded-title').textContent = next.title;
    power.hidden = false;
    $('standby-art').src = next.standby;
    $('standby-title').textContent = next.title;
    power.setAttribute('aria-label', '开始试玩' + next.title);
    $('pad-start').setAttribute('aria-label', 'START，开始试玩' + next.title);
  }

  function sendKey(action, down) {
    const canvas = frame?.contentDocument?.getElementById('game-canvas');
    if (!canvas || !ready) return;
    const child = frame.contentWindow;
    const key = codes[action];
    canvas.dispatchEvent(new child.KeyboardEvent(down ? 'keydown' : 'keyup', {
      key, code:key, bubbles:true, cancelable:true, view:child
    }));
  }
  function release(action, immediately = false) {
    const entry = held.get(action);
    if (!entry) return;
    clearTimeout(entry.timer);
    const finish = () => { sendKey(action, false); held.delete(action); };
    const delay = immediately ? 0 : Math.max(0, 80 - (performance.now() - entry.at));
    if (delay) entry.timer = setTimeout(finish, delay);
    else finish();
  }
  function releaseAll() { for (const action of held.keys()) release(action, true); }
  function press(action) {
    if (!ready) return false;
    release(action, true);
    held.set(action, {at:performance.now(), timer:0});
    sendKey(action, true);
    return true;
  }
  for (const action of Object.keys(codes)) {
    const button = $('pad-' + action);
    button.addEventListener('pointerdown', event => {
      if (event.button !== 0 || !press(action)) return;
      button.setPointerCapture(event.pointerId);
    });
    button.addEventListener('pointerup', () => release(action));
    button.addEventListener('lostpointercapture', () => release(action));
    button.addEventListener('pointercancel', () => release(action, true));
    button.addEventListener('click', event => {
      if (event.detail === 0 && press(action)) release(action);
    });
  }
  // Native keys reach Godot in the canvas. Keep the same controls when a pad button has focus.
  const directions = {ArrowUp:'up', ArrowDown:'down', ArrowLeft:'left', ArrowRight:'right',
    w:'up', s:'down', a:'left', d:'right', z:'a', x:'b', Escape:'b'};
  pad.addEventListener('keydown', event => {
    const action = directions[event.key];
    if (!action || !ready || event.ctrlKey || event.altKey || event.metaKey) return;
    event.preventDefault();
    if (!event.repeat) press(action);
  });
  pad.addEventListener('keyup', event => { if (directions[event.key]) release(directions[event.key]); });
  pad.addEventListener('focusout', event => { if (!pad.contains(event.relatedTarget)) releaseAll(); });
  window.addEventListener('blur', releaseAll);
  document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); });
  power.onclick = start;
  $('pad-start').onclick = start;
  return {select};
}
