const byId = id => document.getElementById(id);
const limit = (n, low, high) => Math.max(low, Math.min(high, n));

export function setupViewer(reducedMotion, onPage) {
  const dialog = byId('viewer');
  if (!dialog.firstElementChild) {
    dialog.innerHTML = `
    <div class="viewer-head">
      <h2 id="viewer-title"></h2>
      <button class="film-key viewer-close" aria-label="关闭大图" data-close><img src="icons/x-lg.svg" alt=""></button>
    </div>
    <div class="light-table">
      <div class="inspect" id="inspect" tabindex="0" role="group" aria-label="插画细节，可用方向键移动放大镜，空格切换放大镜">
        <img id="large-image" alt="" draggable="false"><div class="lens" id="lens" aria-hidden="true"></div>
      </div>
    </div>
    <div class="viewer-foot">
      <div class="viewer-copy"><p id="viewer-caption"></p><small id="zoom-help"></small></div>
      <div class="lens-tools">
        <button id="zoom" class="action press" aria-pressed="false"><img src="icons/zoom-in.svg" alt=""><span>开启放大镜</span></button>
        <label id="lens-power"><span class="sr">放大倍率</span><input id="power" aria-label="放大倍率" type="range" min="2" max="4" step=".5" value="2.5"><output id="power-readout" for="power">2.5×</output></label>
      </div>
    </div>`;
  }
  dialog.querySelector('[data-close]').onclick = () => dialog.close();
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  const inspect = byId('inspect');
  const photo = byId('large-image');
  const lens = byId('lens');
  const coarse = matchMedia('(pointer: coarse)');
  let zoomed = false, lensFinger = null, opener = null;
  let point = { x: .5, y: .5 };

  function paintLens() {
    if (!zoomed || !dialog.open) return;
    const w = photo.clientWidth, h = photo.clientHeight;
    if (!w || !h) return;
    const factor = Number(byId('power').value);
    const size = lens.offsetWidth, x = point.x * w, y = point.y * h;
    const left = limit(x - size / 2, 0, Math.max(0, w - size));
    const top = limit(y - size / 2 - (lensFinger !== null ? size * .45 : 0), 0, Math.max(0, h - size));
    lens.style.transform = 'translate3d(' + left + 'px,' + top + 'px,0)';
    lens.style.backgroundSize = w * factor + 'px ' + h * factor + 'px';
    lens.style.backgroundPosition = -limit(x * factor - size / 2, 0, Math.max(0, w * factor - size)) + 'px ' +
      -limit(y * factor - size / 2, 0, Math.max(0, h * factor - size)) + 'px';
  }
  function setZoom(on) {
    zoomed = on;
    inspect.classList.toggle('magnifying', on);
    byId('zoom').setAttribute('aria-pressed', String(on));
    byId('zoom').querySelector('span').textContent = on ? '收起放大镜' : '开启放大镜';
    byId('zoom').firstElementChild.src = on ? 'icons/zoom-out.svg' : 'icons/zoom-in.svg';
    byId('power').disabled = !on;
    byId('zoom-help').textContent = on
      ? (coarse.matches ? '按住画面拖动镜片。' : '移动鼠标或按方向键查看细节。')
      : '轻点画面可开启放大镜。';
    paintLens();
  }
  function display(item) {
    photo.src = item.src;
    photo.alt = item.alt || item.title;
    lens.style.backgroundImage = 'url(' + JSON.stringify(photo.src) + ')';
    byId('viewer-title').textContent = item.title;
    byId('viewer-caption').textContent = item.caption || '';
    point = { x:.5, y:.5 };
    paintLens();
  }
  function open(item, button, magnify = false) {
    if (dialog.open) return;
    opener = button;
    display(item);
    dialog.showModal();
    setZoom(magnify);
    inspect.focus({preventScroll:true});
    if (reducedMotion.matches) return;
    const a = button.getBoundingClientRect(), b = dialog.getBoundingClientRect();
    const dx = (a.left + a.width / 2 - b.left - b.width / 2) * .16;
    const dy = (a.top + a.height / 2 - b.top - b.height / 2) * .16;
    dialog.animate([{opacity:.25, transform:'translate(' + dx + 'px,' + dy + 'px) scale(.91)'}, {opacity:1, transform:'none'}],
      {duration:245, easing:'cubic-bezier(.18,.8,.22,1)'});
  }
  byId('zoom').onclick = () => { setZoom(!zoomed); inspect.focus({preventScroll:true}); };
  byId('power').oninput = () => {
    byId('power-readout').value = byId('power').value + '×';
    paintLens();
  };
  function pointAt(e) {
    const r = photo.getBoundingClientRect();
    if (!r.width || !r.height) return;
    point = {x:limit((e.clientX-r.left)/r.width,0,1), y:limit((e.clientY-r.top)/r.height,0,1)};
    paintLens();
  }
  let tap = null;
  inspect.onpointerdown = e => {
    if (!e.isPrimary || e.button !== 0) return;
    tap = {id:e.pointerId, x:e.clientX, y:e.clientY, moved:false};
    if (zoomed) {
      inspect.setPointerCapture(e.pointerId);
      if (e.pointerType === 'touch') lensFinger = e.pointerId;
      pointAt(e);
    }
  };
  inspect.onpointermove = e => {
    if (!e.isPrimary) return;
    if (tap && Math.hypot(e.clientX-tap.x,e.clientY-tap.y) > 7) tap.moved = true;
    if (zoomed && (e.pointerType !== 'touch' || lensFinger === e.pointerId)) pointAt(e);
  };
  inspect.addEventListener('touchmove', e => {
    if (zoomed && lensFinger !== null && e.cancelable) e.preventDefault();
  }, {passive:false});
  inspect.onpointerup = e => {
    if (tap?.id !== e.pointerId) return;
    lensFinger = null;
    if (!tap.moved) { pointAt(e); setZoom(!zoomed); } else paintLens();
    tap = null;
  };
  inspect.onpointercancel = () => { tap = null; lensFinger = null; paintLens(); };
  inspect.onkeydown = e => {
    const delta = {ArrowLeft:[-1,0], ArrowRight:[1,0], ArrowUp:[0,-1], ArrowDown:[0,1]};
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setZoom(!zoomed); }
    else if (delta[e.key]) {
      e.preventDefault();
      const [dx,dy] = delta[e.key];
      if (!zoomed) { if (dx) onPage?.(dx); return; }
      point = {x:limit(point.x+.045*dx,0,1), y:limit(point.y+.045*dy,0,1)};
      paintLens();
    }
  };
  photo.onload = paintLens;
  new ResizeObserver(paintLens).observe(photo);
  dialog.addEventListener('close', () => {
    setZoom(false); tap = null; lensFinger = null;
    opener?.focus({preventScroll:true});
  });
  return { open, display };
}
