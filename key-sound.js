// A short housing resonance, a switch impact and a quieter return-stop tick.
export function makeKeySound(toggle) {
  let enabled = true;
  let context, noise;
  try { enabled = localStorage.getItem('shelf-key-sound') !== 'off'; } catch {}
  function sync() {
    toggle.textContent = enabled ? '键音开' : '键音关';
    toggle.setAttribute('aria-pressed', String(enabled));
    toggle.setAttribute('aria-label', enabled ? '关闭按键音效' : '开启按键音效');
  }
  function prepare() {
    if (!enabled) return;
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    try {
      context ||= new Audio();
      if (context.state !== 'running') context.resume().catch(() => {});
      if (!noise) {
        noise = context.createBuffer(1, Math.ceil(context.sampleRate * .045), context.sampleRate);
        const samples = noise.getChannelData(0);
        for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
      }
    } catch { /* Visual and physical feedback also work with audio unavailable. */ }
  }
  function play(down, voice = 0) {
    if (!enabled || !context || context.state === 'closed') return;
    const t = context.currentTime + .002;
    const pitch = (1 + voice * .027) * (.985 + Math.random() * .03);
    function envelope(source, at, amplitude, seconds) {
      const gain = context.createGain();
      gain.gain.setValueAtTime(.0001, at);
      gain.gain.exponentialRampToValueAtTime(amplitude, at + .0014);
      gain.gain.exponentialRampToValueAtTime(.0001, at + seconds);
      source.connect(gain); gain.connect(context.destination);
      return gain;
    }
    function resonator(start, end, volume, length, delay = 0) {
      const osc = context.createOscillator(), at = t + delay;
      osc.frequency.setValueAtTime(start * pitch, at);
      osc.frequency.exponentialRampToValueAtTime(end * pitch, at + length);
      const gain = envelope(osc, at, volume, length);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
      osc.start(at); osc.stop(at + length + .002);
    }
    const burst = context.createBufferSource(), band = context.createBiquadFilter();
    burst.buffer = noise; band.type = 'bandpass'; band.Q.value = down ? .9 : 1.3;
    band.frequency.value = (down ? 2060 : 3150) * pitch;
    burst.connect(band);
    const length = down ? .024 : .014;
    const gain = envelope(band, t, down ? .19 : .1, length);
    burst.onended = () => { burst.disconnect(); band.disconnect(); gain.disconnect(); };
    burst.start(t); burst.stop(t + length);
    if (down) {
      resonator(428, 155, .145, .060);
      resonator(1140, 760, .049, .021, .002);
    } else {
      resonator(825, 535, .066, .030);
      resonator(1680, 1270, .031, .014);
    }
  }
  toggle.addEventListener('click', () => {
    enabled = !enabled; sync();
    try { localStorage.setItem('shelf-key-sound', enabled ? 'on' : 'off'); } catch {}
    if (enabled) { prepare(); play(false); }
  });
  sync();
  return { prepare, play };
}
