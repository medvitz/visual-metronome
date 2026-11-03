/**
 * Click sounds, each synthesized once into an AudioBuffer.
 * No sample files: nothing to license or download.
 */
import { renderHiHat } from "./hihat";

export type ClickSoundId = "hihat" | "click" | "woodblock" | "cowbell" | "blip";

export const CLICK_SOUNDS: { id: ClickSoundId; label: string }[] = [
  { id: "hihat", label: "Hi-hat" },
  { id: "click", label: "Classic click" },
  { id: "woodblock", label: "Woodblock" },
  { id: "cowbell", label: "Cowbell" },
  { id: "blip", label: "Electro blip" },
];

export const DEFAULT_CLICK_SOUND: ClickSoundId = "hihat";

export function isClickSound(x: unknown): x is ClickSoundId {
  return CLICK_SOUNDS.some((s) => s.id === x);
}

type Builder = (ctx: OfflineAudioContext, out: AudioNode) => void;

async function render(sampleRate: number, seconds: number, gain: number, build: Builder): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(1, Math.ceil(sampleRate * seconds), sampleRate);
  const out = ctx.createGain();
  out.gain.value = gain;
  out.connect(ctx.destination);
  build(ctx, out);
  return ctx.startRendering();
}

/** Percussive envelope: near-instant attack, exponential decay to silence by `decay` seconds. */
function env(ctx: BaseAudioContext, peak: number, decay: number, attack = 0.001): GainNode {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, 0);
  g.gain.linearRampToValueAtTime(peak, attack);
  g.gain.exponentialRampToValueAtTime(0.0001, decay);
  return g;
}

function osc(ctx: BaseAudioContext, type: OscillatorType, freq: number, stop: number): OscillatorNode {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  o.start(0);
  o.stop(stop);
  return o;
}

function noise(ctx: BaseAudioContext, seconds: number): AudioBufferSourceNode {
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.start(0);
  return src;
}

function filter(ctx: BaseAudioContext, type: BiquadFilterType, freq: number, q = 1): BiquadFilterNode {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
}

/** Classic metronome tick: a very short, bright tone with a sharp transient. */
const classicClick: Builder = (ctx, out) => {
  osc(ctx, "sine", 1950, 0.05).connect(env(ctx, 1, 0.035)).connect(out);
  osc(ctx, "square", 3900, 0.02).connect(filter(ctx, "highpass", 3000)).connect(env(ctx, 0.25, 0.008)).connect(out);
};

/** Woodblock: two hollow resonances with a quick knock. */
const woodblock: Builder = (ctx, out) => {
  const body = osc(ctx, "sine", 920, 0.15);
  body.frequency.setValueAtTime(980, 0);
  body.frequency.exponentialRampToValueAtTime(900, 0.03);
  body.connect(env(ctx, 1, 0.09)).connect(out);
  osc(ctx, "sine", 2480, 0.1).connect(env(ctx, 0.35, 0.04)).connect(out);
  noise(ctx, 0.02).connect(filter(ctx, "bandpass", 1500, 2)).connect(env(ctx, 0.5, 0.012)).connect(out);
};

/** Cowbell: the classic drum-machine recipe of two detuned square waves through a band-pass. */
const cowbell: Builder = (ctx, out) => {
  const bp = filter(ctx, "bandpass", 830, 1.6);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, 0);
  g.gain.linearRampToValueAtTime(1, 0.001);
  g.gain.exponentialRampToValueAtTime(0.35, 0.03); // quick initial drop...
  g.gain.exponentialRampToValueAtTime(0.0001, 0.32); // ...then the ring
  bp.connect(g).connect(out);
  osc(ctx, "square", 562, 0.35).connect(bp);
  osc(ctx, "square", 845, 0.35).connect(bp);
};

/** Electro blip: a short synth tone with a fast downward pitch sweep. */
const blip: Builder = (ctx, out) => {
  const o = osc(ctx, "triangle", 1760, 0.1);
  o.frequency.setValueAtTime(1760, 0);
  o.frequency.exponentialRampToValueAtTime(880, 0.03);
  o.connect(env(ctx, 1, 0.07, 0.002)).connect(out);
};

export async function renderClickSound(id: ClickSoundId, sampleRate: number): Promise<AudioBuffer> {
  switch (id) {
    case "hihat":
      return renderHiHat(sampleRate);
    case "click":
      return render(sampleRate, 0.06, 0.62, classicClick);
    case "woodblock":
      return render(sampleRate, 0.16, 0.42, woodblock);
    case "cowbell":
      return render(sampleRate, 0.36, 0.22, cowbell);
    case "blip":
      return render(sampleRate, 0.1, 0.55, blip);
  }
}
