import { BPM_MAX, BPM_MIN, Settings, saveSettings } from "../settings";
import { VERSION, WHATS_NEW } from "../version";
import { ClickSoundId, isClickSound } from "../audio/sounds";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

export interface ControlCallbacks {
  onTogglePlay: () => void;
  onBpm: (bpm: number) => void;
  onClickBeats: (beats: number[]) => void;
  onVolume: (v: number) => void;
  /** Play one click of a sound so you can hear it. */
  onPreviewSound: (id: ClickSoundId) => void;
  /** Called after any change in the Settings panel. */
  onSettingsChanged: () => void;
}

export class Controls {
  private playBtn = $<HTMLButtonElement>("playBtn");
  private bpmValue = $<HTMLSpanElement>("bpmValue");
  private bpmSlider = $<HTMLInputElement>("bpmSlider");
  private perWallInputs = Array.from(
    document.querySelectorAll<HTMLInputElement>('#perWall input[type="radio"]'),
  );

  constructor(
    private s: Settings,
    private cb: ControlCallbacks,
  ) {
    this.bindTempo();
    this.bindPlay();
    this.bindSettings();
    this.bindNews();
    this.renderBpm();
  }

  setPlaying(on: boolean): void {
    this.playBtn.classList.toggle("on", on);
    this.playBtn.setAttribute("aria-label", on ? "Stop" : "Start");
  }

  private setBpm(bpm: number): void {
    const v = Math.min(BPM_MAX, Math.max(BPM_MIN, Math.round(bpm)));
    if (v === this.s.bpm) return;
    this.s.bpm = v;
    this.renderBpm();
    this.cb.onBpm(v);
    saveSettings(this.s);
  }

  private renderBpm(): void {
    this.bpmValue.textContent = String(this.s.bpm);
    this.bpmSlider.value = String(this.s.bpm);
  }

  private bindTempo(): void {
    this.bpmSlider.addEventListener("input", () => this.setBpm(Number(this.bpmSlider.value)));
    // Press = 1 BPM; hold = keeps going, faster.
    const hold = (btn: HTMLButtonElement, dir: number) => {
      let timer: number | undefined;
      let n = 0;
      const step = () => {
        this.setBpm(this.s.bpm + dir * (n > 10 ? 5 : 1));
        n++;
        timer = window.setTimeout(step, n === 1 ? 400 : 70);
      };
      const end = () => {
        clearTimeout(timer);
        timer = undefined;
      };
      btn.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        n = 0;
        step();
      });
      for (const ev of ["pointerup", "pointerleave", "pointercancel"]) btn.addEventListener(ev, end);
    };
    hold($("bpmDown"), -1);
    hold($("bpmUp"), 1);
    window.addEventListener("keydown", (e) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      if (e.key === "ArrowUp" || e.key === "ArrowRight") this.setBpm(this.s.bpm + (e.shiftKey ? 10 : 1));
      if (e.key === "ArrowDown" || e.key === "ArrowLeft") this.setBpm(this.s.bpm - (e.shiftKey ? 10 : 1));
    });
  }

  private bindPlay(): void {
    this.playBtn.addEventListener("click", () => this.cb.onTogglePlay());
    $("leader").addEventListener("click", () => this.cb.onTogglePlay());
    window.addEventListener("keydown", (e) => {
      if (e.code === "Space" && !document.querySelector("dialog[open]")) {
        e.preventDefault();
        this.cb.onTogglePlay();
      }
    });
  }

  private bindSettings(): void {
    const dlg = $<HTMLDialogElement>("settingsDlg");
    $("settingsBtn").addEventListener("click", () => dlg.showModal());

    const beatInputs = Array.from(document.querySelectorAll<HTMLInputElement>("#beatToggles input"));
    for (const i of beatInputs) {
      i.checked = this.s.clickBeats.includes(Number(i.value));
      i.addEventListener("change", () => {
        this.s.clickBeats = beatInputs.filter((x) => x.checked).map((x) => Number(x.value));
        this.cb.onClickBeats(this.s.clickBeats);
        saveSettings(this.s);
        this.cb.onSettingsChanged();
      });
    }

    for (const i of this.perWallInputs) {
      i.checked = Number(i.value) === this.s.perWall;
      i.addEventListener("change", () => {
        if (i.checked) this.s.perWall = Number(i.value);
        saveSettings(this.s);
        this.cb.onSettingsChanged();
      });
    }

    for (const i of document.querySelectorAll<HTMLInputElement>('#countInBars input[type="radio"]')) {
      i.checked = Number(i.value) === this.s.countInBars;
      i.addEventListener("change", () => {
        if (i.checked) this.s.countInBars = Number(i.value) as 0 | 1 | 2;
        saveSettings(this.s);
        this.cb.onSettingsChanged();
      });
    }

    for (const i of document.querySelectorAll<HTMLInputElement>('#clickSound input[type="radio"]')) {
      i.checked = i.value === this.s.clickSound;
      i.addEventListener("change", () => {
        if (!i.checked || !isClickSound(i.value)) return;
        this.s.clickSound = i.value;
        saveSettings(this.s);
        this.cb.onSettingsChanged();
        this.cb.onPreviewSound(i.value);
      });
      // Tapping the already-selected sound plays it again.
      // (Skip the radio's own bubbled click so a new choice doesn't play twice.)
      i.parentElement!.addEventListener("click", (e) => {
        if (e.target !== i && i.checked && isClickSound(i.value)) this.cb.onPreviewSound(i.value);
      });
    }

    const chime = $<HTMLInputElement>("chimeToggle");
    chime.checked = this.s.chime;
    chime.addEventListener("change", () => {
      this.s.chime = chime.checked;
      saveSettings(this.s);
      this.cb.onSettingsChanged();
    });

    const vol = $<HTMLInputElement>("volume");
    vol.value = String(this.s.volume);
    vol.addEventListener("input", () => {
      this.s.volume = Number(vol.value);
      this.cb.onVolume(this.s.volume);
      saveSettings(this.s);
      this.cb.onSettingsChanged();
    });

    const off = $<HTMLInputElement>("offset");
    const out = $<HTMLOutputElement>("offsetOut");
    const showOff = () => (out.textContent = `${this.s.visualOffsetMs > 0 ? "+" : ""}${this.s.visualOffsetMs} ms`);
    off.value = String(this.s.visualOffsetMs);
    showOff();
    off.addEventListener("input", () => {
      this.s.visualOffsetMs = Number(off.value);
      showOff();
      saveSettings(this.s);
      this.cb.onSettingsChanged();
    });

    this.setPlaying(false);
  }

  private bindNews(): void {
    const dlg = $<HTMLDialogElement>("newsDlg");
    $("newsTitle").textContent = WHATS_NEW.title;
    const fill = (id: string, items: string[]) => {
      const ul = $(id);
      ul.replaceChildren(
        ...items.map((t) => {
          const li = document.createElement("li");
          li.textContent = t;
          return li;
        }),
      );
    };
    fill("newsList", WHATS_NEW.new);
    fill("tryList", WHATS_NEW.tryThis);
    $("versionChip").textContent = `v${VERSION}`;
    $("versionChip").addEventListener("click", () => dlg.showModal());

    // Show automatically the first time each new version opens.
    const KEY = "jdm.lastSeenVersion";
    let seen: string | null = null;
    try {
      seen = localStorage.getItem(KEY);
    } catch {
      /* ignore */
    }
    if (seen !== VERSION && !new URLSearchParams(location.search).has("nonews")) {
      dlg.showModal();
      try {
        localStorage.setItem(KEY, VERSION);
      } catch {
        /* ignore */
      }
    }
  }
}
