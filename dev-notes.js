import { setupViewer } from './viewer.js?v=20261124.4';

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
