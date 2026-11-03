/**
 * Synthesized orchestral-triangle "ding", rendered once into an AudioBuffer.
 *
 * A struck triangle is a bright, inharmonic cluster of high partials. The
 * upper partials die away quickly and the lower ones ring for a couple of
 * seconds. Close pairs of slightly detuned partials give it its shimmer.
 */

// [frequency Hz, level, decay seconds (time to fade ~60 dB)]
const PARTIALS: [number, number, number][] = [
  [1318, 1.0, 3.6],
  [1324, 0.55, 3.3], // detuned twin: slow shimmer
  [3410, 0.6, 2.4],
  [3427, 0.35, 2.1],
  [4960, 0.42, 1.2],
  [6830, 0.3, 0.8],
  [8650, 0.22, 0.5],
  [10420, 0.15, 0.3],
];

export async function renderChime(sampleRate: number): Promise<AudioBuffer> {
  const len = 4;
  const ctx = new OfflineAudioContext(1, Math.ceil(sampleRate * len), sampleRate);
  const out = ctx.createGain();
  out.gain.value = 0.24;
  out.connect(ctx.destination);

  for (const [freq, level, decay] of PARTIALS) {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, 0);
    g.gain.linearRampToValueAtTime(level, 0.002);
    g.gain.setTargetAtTime(0, 0.002, decay / 6.9); // ~60 dB down after `decay`
    o.connect(g).connect(out);
    o.start(0);
    o.stop(len);
  }

  // The beater's tiny metallic "tick" at the strike.
  const tickLen = 0.03;
  const noise = ctx.createBuffer(1, Math.ceil(sampleRate * tickLen), sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const n = ctx.createBufferSource();
  n.buffer = noise;
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 6000;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.25, 0);
  ng.gain.exponentialRampToValueAtTime(0.001, tickLen);
  n.connect(hp).connect(ng).connect(out);
  n.start(0);

  return ctx.startRendering();
}
