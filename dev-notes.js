import { setupViewer } from './viewer.js?v=20261124.4';
import { games, applyTheme } from './catalog.js?v=20261125.4';

const gameId = new URL(location.href).searchParams.get('game');
const selected = games.find(game => game.id === gameId);
if (selected) {
  applyTheme(selected);
  for (const link of document.querySelectorAll('.top a')) {
    const url = new URL(link.href);
    url.searchParams.set('game', selected.id);
    link.href = url.href;
  }
}

const viewer = setupViewer(matchMedia('(prefers-reduced-motion: reduce)'));
const link = document.getElementById('open-art');
const art = document.getElementById('concept-art');
link.addEventListener('click', event => {
  if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  viewer.open({
    title: '御兽师 · 新怪兽设定稿',
    src: art.currentSrc || art.src,
    alt: art.alt,
    caption: document.getElementById('art-caption').textContent
  }, link);
});
