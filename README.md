# Visual Metronome

A metronome that lets you *see* time, for any musician. Built with Joel.

- **Film-leader countdown circle** counts 1–4. The wedge sweeps once per beat.
- **Hi-hat "chick" on every beat** by default (2 and 4 only is a setting). Change which beats click in Settings.
- **A numbered brick** drops on every beat 4 and lands on the next downbeat. After 16 or 32 bars the wall clears like a Tetris line, and the next wall starts numbering again at 1.

It's a web app that can be added to a phone's home screen (a PWA). The plan is to wrap it as an Android app later, and maybe iOS.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173 (use your browser's phone view)
npm test           # timing + wall logic tests
npm run build      # production build in dist/
```

Handy URL options: `?beat=67.5` freezes the screen at a beat position, and `?nonews` skips the What's New popup.

## How the timing works

- Clicks are queued ahead of time on the Web Audio clock (`src/audio/engine.ts`). JS timers never decide when a click sounds.
- Every frame, the visuals read the audio clock, adjusted for output latency, so the picture can't drift from the sound.
- `src/audio/timeline.ts` and `src/visual/wallModel.ts` are pure functions with unit tests.

## Releasing a new version for Joel

1. Bump `VERSION` and update the notes in `src/version.ts`. Joel sees them the first time the new version opens.
2. Push to `main`. GitHub Actions tests, builds and publishes to GitHub Pages.
