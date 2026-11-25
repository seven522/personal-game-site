import { games } from './catalog.js?v=20261124.5';
import { setupViewer } from './viewer.js?v=20261124.4';
import { setupTelevision } from './trial-case.js?v=20261125.1';

const $ = id => document.getElementById(id);
const shelf = document.querySelector('[data-catalog]');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const viewer = setupViewer(reducedMotion);
const television = setupTelevision();
const slots = [...shelf.querySelectorAll('.rack-key')];
let selected;
let statusTimer;

function clearPlatformStatus() {
  clearTimeout(statusTimer);
  $('platform-status').textContent = '';
}

function platformURL(platform) {
  const value = selected.platforms[platform];
  if (!value) return null;
  try {
    const url = new URL(value, document.baseURI);
    return ['https:', 'http:'].includes(url.protocol) ? url : null;
  } catch { return null; }
}

function select(game) {
  if (game === selected) return;
  const animate = Boolean(selected) && !reducedMotion.matches;
  selected = game;
  shelf.dataset.game = game.id;
  document.title = game.title + ' · ' + window.SITE.studio;
  $('game-name').textContent = game.title;
  $('tag').textContent = game.edition;
  $('description').textContent = game.description;
  $('grab-cart').setAttribute('aria-label', '旋转' + game.title + '卡带');
  $('sticker-print').src = game.cover.src;
  $('sticker-print').alt = game.cover.alt;
  $('online-play').setAttribute('aria-label', '在线试玩《' + game.title + '》');
  slots.forEach((slot, index) => {
    if (games[index]) slot.setAttribute('aria-pressed', String(games[index] === game));
  });
  clearPlatformStatus();
  for (const id of ['windows','android']) {
    const key = $(id);
    const available = Boolean(platformURL(id));
    const label = available ? '下载' : game.pending;
    key.classList.toggle('ready', available);
    key.querySelector('.availability').textContent = label;
    key.setAttribute('aria-label', game.title + '，' + key.dataset.platform + ' · ' + label);
  }
  television.select(game);
  shelf.dispatchEvent(new Event('cartridgechange'));
  if (animate) {
    shelf.querySelector('.cart-space').animate([{opacity:.45}, {opacity:1}], {duration:220, easing:'ease-out'});
  }
}
slots.forEach((slot, index) => {
  const game = games[index];
  slot.disabled = !game;
  if (!game) return;
  slot.querySelector('.rack-title').textContent = game.title;
  slot.setAttribute('aria-label', '选择' + game.title);
  slot.onclick = () => {
    if (selected === game) { clearPlatformStatus(); return; }
    const url = new URL(location.href);
    url.searchParams.set('game', game.id);
    history.pushState(null, '', url);
    select(game);
  };
});
for (const id of ['windows','android']) {
  const key = $(id);
  key.onclick = () => {
    const url = platformURL(id);
    if (!url) {
      clearTimeout(statusTimer);
      $('platform-status').textContent = key.dataset.platform + ' 安装包待发布。';
      statusTimer = setTimeout(clearPlatformStatus, 3200);
      return;
    }
    const link = document.createElement('a');
    link.href = url.href;
    link.download = '';
    if (url.origin !== location.origin) { link.target = '_blank'; link.rel = 'noopener'; }
    document.body.append(link);
    link.click();
    link.remove();
  };
}
function fromAddress() {
  const slug = new URL(location.href).searchParams.get('game');
  if (slug === 'beastmaster') {
    location.replace('dev-notes.html');
    return;
  }
  select(games.find(game => game.id === slug) || games[0]);
}
window.addEventListener('popstate', fromAddress);
fromAddress();
$('cover-button').onclick = event => viewer.open(selected.cover, event.currentTarget);

$('studio').textContent = $('footer-name').textContent = window.SITE.studio;
$('about-text').textContent = window.SITE.about;
if (window.SITE.email) {
  $('contact').href = 'mailto:' + window.SITE.email;
  $('contact').hidden = false;
}
const about = $('about');
$('about-open').onclick = () => about.showModal();
about.querySelector('[data-close]').onclick = () => about.close();
about.addEventListener('click', event => {
  if (event.target !== about) return;
  const box = about.getBoundingClientRect();
  if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) about.close();
});
await import('./hardware.js?v=20261124.2');
