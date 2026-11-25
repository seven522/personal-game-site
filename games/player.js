// Each cartridge runs in its own iframe so changing games releases the previous engine.
const sizes = { 'monster-paradise': 42810320, beastmaster: 43572228 };
const id = new URLSearchParams(location.search).get('game');
const canvas = document.getElementById('game-canvas');
const loader = document.getElementById('loader');
const message = document.getElementById('message');
const meter = loader.querySelector('progress');
const retry = document.getElementById('retry');
retry.onclick = () => location.reload();

function reportError(text) {
  loader.hidden = false;
  message.textContent = text;
  meter.hidden = true;
  retry.hidden = false;
}
async function boot() {
  if (!Object.hasOwn(sizes, id)) throw new Error('卡带无法识别。');
  if (Engine.getMissingFeatures({threads:false}).length || typeof DecompressionStream === 'undefined') {
    throw new Error('试玩需要支持 WebGL 2 的浏览器，请开启图形加速后重试。');
  }
  const pack = id + '.pck';
  const lengths = { 'engine.wasm':37700666, [pack]:sizes[id] };
  // The site is static. Stream the packaged assets even on servers without gzip headers.
  const fetchFile = window.fetch.bind(window);
  window.fetch = async function(input, init) {
    const url = new URL(input instanceof Request ? input.url : input, location.href);
    const name = url.pathname.split('/').pop();
    if (url.href !== new URL(name, location.href).href || !Object.hasOwn(lengths,name)) return fetchFile(input, init);
    const response = await fetchFile(name + '.gz', init);
    if (!response.ok) throw new Error('卡带读取失败，请重试。');
    const bytes = new Uint8Array(await response.arrayBuffer());
    const stream = new Blob([bytes]).stream();
    const body = bytes[0] === 31 && bytes[1] === 139 ? stream.pipeThrough(new DecompressionStream('gzip')) : stream;
    return new Response(body, {headers:{'Content-Type':name.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream','Content-Length':String(lengths[name])}});
  };
  try {
    const engine = new Engine({canvas, executable:'engine', mainPack:pack, canvasResizePolicy:0, focusCanvas:false, fileSizes:lengths,
      onProgress(done,total) {
        if (total > 0) { meter.max = total; meter.value = done; }
        if (total > 0 && done === total) message.textContent = '正在启动游戏…';
      },
      onExit() { reportError('本次试玩已结束。'); }
    });
    await engine.startGame();
    loader.hidden = true;
    if (!document.hidden && parent.document.activeElement === frameElement) canvas.focus({preventScroll:true});
    parent.postMessage({type:'cartridge-ready', id}, location.origin);
  } finally { window.fetch = fetchFile; }
}
boot().catch(error => reportError(error.message || '载入未完成，请重试。'));
