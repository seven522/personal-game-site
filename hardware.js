import { World, Body, Box, Vec3, Quaternion, Spring } from './vendor/cannon-es.js';
import { makeKeySound } from './key-sound.js?v=20261125.3';

const byId = id => document.getElementById(id);
const quietMotion = matchMedia('(prefers-reduced-motion: reduce)');
const audio = makeKeySound(byId('sound-toggle'));
const world = new World({ gravity: new Vec3(0, 0, 0) });
const step = 1 / 120;
const clampTo = (n, low, high) => Math.min(high, Math.max(low, n));
const degrees = a => a * Math.PI / 180;
const pose = (x, y, z = 0) => new Quaternion().setFromEuler(degrees(x), degrees(y), degrees(z), 'ZXY');
const home = pose(-15.49, 19.35, -3.66);
const cart = new Body({ mass: .45, shape: new Box(new Vec3(.5, .4333, .0375)), collisionFilterMask: 0 });
// The tether damps radial motion. Air drag dissipates the sideways velocity of a flick.
cart.linearDamping = .9995;
cart.angularDamping = .33;
cart.quaternion.copy(home);
world.addBody(cart);
const hand = new Body({ type: Body.KINEMATIC });
const tether = new Spring(cart, hand, { restLength: 0, stiffness: 112, damping: 12.3 });
const target = home.clone();
const assembly = document.querySelector('.cart-body');
const touch = byId('grab-cart');
const shadow = document.querySelector('.cast-shadow');
let cartWidth = 1, dragging = null, looseUntil = 0, flipped = false, suppressTap = false;
let frame = 0, previous = 0, balance = 0;
const keys = [];

// Closely spaced rounded cross sections close the corners between the two full faces.
for (let i = 1; i < 11; i++) {
  const layer = document.createElement('i');
  layer.className = 'cart-lamination';
  layer.style.transform = 'translateZ(calc(var(--depth) * ' + (i / 11 - .5) + '))';
  layer.style.filter = 'brightness(' + (.7 + i * .025) + ')';
  assembly.prepend(layer);
}
function measure() {
  cartWidth = assembly.offsetWidth || 1;
  paintCart();
}
const resizer = new ResizeObserver(measure);
resizer.observe(assembly);

function paintCart() {
  const q = cart.quaternion;
  const angle = 2 * Math.acos(clampTo(q.w, -1, 1));
  const xy = cart.position;
  const lifted = clampTo(xy.z / .11, 0, 1);
  const turn = Math.abs(1 - 2 * (q.x * q.x + q.y * q.y));
  assembly.style.transform = 'translate3d(calc(var(--rest-x) + ' + xy.x * cartWidth + 'px),calc(var(--rest-y) + ' + xy.y * cartWidth + 'px),' +
    xy.z * cartWidth + 'px) rotate3d(' + [q.x, q.y, q.z, angle + 'rad'].join(',') + ')';
  shadow.style.transform = 'translate(' + xy.x * cartWidth * .6 + 'px,' + (xy.y * .45 + xy.z * .24) * cartWidth +
    'px) scale(' + (.52 + Math.min(1,turn / .90) * .48) + ',' + (1 + lifted * .13) + ')';
  shadow.style.opacity = String(1 - lifted * .36);
}
const delta = new Quaternion(), inverse = new Quaternion(), acceleration = new Vec3(), local = new Vec3();
function steerCart() {
  if (performance.now() < looseUntil) return;
  const q = cart.quaternion;
  q.conjugate(inverse);
  target.mult(inverse, delta);
  const sign = delta.w < 0 ? -1 : 1;
  const halfSin = Math.hypot(delta.x, delta.y, delta.z);
  const stiffness = dragging ? 365 : 70;
  const damping = dragging ? 32 : 12;
  const amount = halfSin < 1e-7 ? 0 : stiffness * 2 * Math.atan2(halfSin, Math.abs(delta.w)) * sign / halfSin;
  acceleration.set(delta.x * amount - damping * cart.angularVelocity.x,
                   delta.y * amount - damping * cart.angularVelocity.y,
                   delta.z * amount - damping * cart.angularVelocity.z);
  // Convert desired angular acceleration into torque using the box's inertia tensor.
  inverse.vmult(acceleration, local);
  local.vmul(cart.inertia, local);
  q.vmult(local, cart.torque);
}
function addKey(button, voice) {
  const body = new Body({mass: .015, collisionFilterMask: 0});
  body.linearFactor.set(0, 0, 1);
  const anchor = new Body({type: Body.KINEMATIC});
  const spring = new Spring(body, anchor, {restLength: 0, stiffness: 36, damping: 1.02});
  world.addBody(body);
  const key = {button, body, anchor, spring, held: false, pressedAt: 0, releaseAt: 0, last: -1, pointer: null};
  keys.push(key);
  const station = button.closest('[data-controller]');
  function press() {
    if (key.held) return;
    key.held = true; key.releaseAt = 0; key.pressedAt = performance.now(); anchor.position.z = 1;
    audio.prepare(); audio.play(true, voice, station?.dataset.controller === 'arcade'); start();
  }
  function release() {
    if (!key.held) return;
    key.held = false;
    key.releaseAt = Math.max(performance.now(), key.pressedAt + 47);
    audio.play(false, voice, station?.dataset.controller === 'arcade'); start();
  }
  button.addEventListener('pointerdown', e => {
    if (e.button !== 0 || key.pointer !== null) return;
    key.pointer = e.pointerId; press();
  });
  // Release even if the pointer moved away. Native click still requires a matching target.
  const endPointer = e => {
    if (e.pointerId === key.pointer) { key.pointer = null; release(); }
  };
  window.addEventListener('pointerup', endPointer);
  window.addEventListener('pointercancel', endPointer);
  button.addEventListener('keydown', e => {
    if (e.key === ' ' || e.key === 'Enter') {
      if (e.repeat) { e.preventDefault(); return; }
      press();
    }
  });
  button.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') release(); });
  button.addEventListener('blur', release);
  window.addEventListener('blur', () => { key.pointer = null; release(); });
  button.addEventListener('click', e => {
    if (e.detail === 0 && !key.held && performance.now() - key.pressedAt > 160) { press(); release(); }
  });
}
function advance() {
  for (const key of keys) {
    if (key.releaseAt && performance.now() >= key.releaseAt) { key.anchor.position.z = 0; key.releaseAt = 0; }
    key.spring.applyForce();
  }
  tether.applyForce(); steerCart(); world.step(step);
  for (const key of keys) {
    if (key.body.position.z > 1 || key.body.position.z < 0) {
      key.body.position.z = clampTo(key.body.position.z, 0, 1);
      key.body.velocity.z *= -.12;
    }
  }
}
function paintKeys() {
  for (const key of keys) {
    const z = key.body.position.z;
    if (Math.abs(z - key.last) < .0004) continue;
    key.last = z;
    const rack = key.button.classList.contains('rack-key');
    const style = key.button.style;
    style.setProperty('--key-x', (rack ? -4.9 * z : 0) + '%');
    style.setProperty('--key-y', (rack ? 3.9 : 6.7) * z + '%');
    style.setProperty('--key-scale', 1 - .033 * z);
    style.setProperty('--key-light', 1 - .105 * z);
  }
}
function awake() {
  const a = cart.quaternion, b = target;
  const dot = a.x*b.x + a.y*b.y + a.z*b.z + a.w*b.w;
  return dragging || looseUntil > performance.now() || Math.abs(dot) < .9999995 ||
    cart.angularVelocity.lengthSquared() > .00002 || cart.position.distanceSquared(hand.position) > .000001 ||
    cart.velocity.lengthSquared() > .000001 || keys.some(k => k.releaseAt || Math.abs(k.body.position.z - k.anchor.position.z) > .0005 || Math.abs(k.body.velocity.z) > .015);
}
function tick(now) {
  balance += Math.min((now - previous) / 1000, .064);
  previous = now;
  while (balance >= step) { advance(); balance -= step; }
  paintCart(); paintKeys();
  frame = awake() ? requestAnimationFrame(tick) : 0;
}
function start() {
  if (!frame) { previous = performance.now(); balance = step; frame = requestAnimationFrame(tick); }
}
function snapIfReduced() {
  if (!quietMotion.matches) return;
  cart.quaternion.copy(target); cart.angularVelocity.setZero(); cart.position.copy(hand.position); cart.velocity.setZero();
  paintCart();
}
function rest(back = false) {
  flipped = back; looseUntil = 0;
  home.mult(pose(0, back ? 180 : 0), target);
  hand.position.setZero();
  byId('flip-cart').textContent = back ? '正面' : '翻面';
  snapIfReduced(); start();
}
for (const selector of ['.rack', '.cart-stage', '.deck']) {
  const host = document.querySelector(selector);
  if (!host) continue;
  for (const type of ['contextmenu', 'selectstart', 'dragstart']) {
    host.addEventListener(type, event => event.preventDefault(), true);
  }
}
for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) {
  touch.addEventListener(type, event => {
    if (event.cancelable) event.preventDefault();
  }, { passive: false });
}
let lastCartTapAt = 0;
touch.addEventListener('pointerdown', e => {
  if (e.button !== 0 || dragging) return;
  touch.setPointerCapture(e.pointerId);
  dragging = {id:e.pointerId, x:e.clientX, y:e.clientY, initial:cart.quaternion.clone(), moved:false, pointerType:e.pointerType};
  looseUntil = 0; target.copy(cart.quaternion);
  hand.position.z = quietMotion.matches ? 0 : .095;
  snapIfReduced(); start();
});
touch.addEventListener('pointermove', e => {
  if (dragging?.id !== e.pointerId) return;
  const dx = (e.clientX - dragging.x) / cartWidth, dy = (e.clientY - dragging.y) / cartWidth;
  if (Math.hypot(dx, dy) * cartWidth > 4) dragging.moved = true;
  pose(-dy * 195, dx * 265, dx * 8).mult(dragging.initial, target);
  hand.position.x = clampTo(dx * .39, -.20, .20);
  hand.position.y = clampTo(dy * .36, -.17, .17);
  snapIfReduced(); start();
});
function drop(e) {
  if (!dragging || (e.pointerId !== undefined && dragging.id !== e.pointerId)) return;
  const moved = dragging.moved;
  const isTouch = dragging.pointerType === 'touch';
  dragging = null; suppressTap = moved || isTouch;
  if (isTouch && !moved && e.type === 'pointerup') {
    const now = performance.now();
    if (now - lastCartTapAt < 340) { lastCartTapAt = 0; rest(false); }
    else { lastCartTapAt = now; rest(!flipped); }
    return;
  }
  rest(flipped);
  if (moved && e.type === 'pointerup' && !quietMotion.matches) looseUntil = performance.now() + 380;
}
for (const type of ['pointerup','pointercancel','lostpointercapture']) touch.addEventListener(type, drop);
window.addEventListener('blur', drop);
touch.addEventListener('click', e => {
  if (!suppressTap || e.detail === 0) rest(!flipped);
  suppressTap = false;
});
touch.addEventListener('dblclick', () => rest());
byId('flip-cart').addEventListener('click', () => rest(!flipped));
touch.addEventListener('keydown', e => {
  const axes = {ArrowLeft:[0,-30], ArrowRight:[0,30], ArrowUp:[-25,0], ArrowDown:[25,0]};
  if (e.key === 'Home') { e.preventDefault(); rest(); return; }
  if (!axes[e.key]) return;
  e.preventDefault(); looseUntil = 0;
  pose(...axes[e.key]).mult(target.clone(), target);
  snapIfReduced(); start();
});
document.querySelector('[data-catalog]').addEventListener('cartridgechange', () => rest());
document.querySelectorAll('.hardware-key:enabled, .pad-hit, .launch-key').forEach((button, i) => addKey(button, i));
measure(); start();
