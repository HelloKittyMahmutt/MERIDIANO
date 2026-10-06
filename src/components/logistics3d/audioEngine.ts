/**
 * Procedural Web Audio API sound generator for Meridiano 3D Logistics Simulator
 * No external audio files required. Completely synthesized in real time.
 */

class LogisticsAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private currentLoop: { stop: () => void } | null = null;

  constructor() {
    // Initialized lazily upon user interaction
  }

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted && this.currentLoop) {
      this.currentLoop.stop();
      this.currentLoop = null;
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Subtle UI click sound
   */
  public playClick() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.04);
    } catch {
      // AudioContext policy safety
    }
  }

  /**
   * Phase transition confirmation chime
   */
  public playPhaseTransition() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(640, now + 0.08);

      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch {
      // AudioContext safety
    }
  }

  /**
   * Ambient sound generator tailored for each of the 4 logistics phases
   */
  public startPhaseAmbience(phase: number) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    if (this.currentLoop) {
      this.currentLoop.stop();
      this.currentLoop = null;
    }

    try {
      const now = this.ctx.currentTime;
      const masterGain = this.ctx.createGain();
      masterGain.gain.setValueAtTime(0.02, now);
      masterGain.connect(this.ctx.destination);

      if (phase === 0) {
        // Factory: Low hydraulic hum & gentle rhythmic pulse
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(55, now); // A1 note

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(140, now);

        osc.connect(filter);
        filter.connect(masterGain);
        osc.start(now);

        this.currentLoop = {
          stop: () => {
            try {
              osc.stop();
              osc.disconnect();
            } catch {}
          }
        };
      } else if (phase === 1) {
        // Highway: Steady engine purr and road friction
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(68, now);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(220, now);

        osc.connect(filter);
        filter.connect(masterGain);
        osc.start(now);

        this.currentLoop = {
          stop: () => {
            try {
              osc.stop();
              osc.disconnect();
            } catch {}
          }
        };
      } else if (phase === 2) {
        // Ocean Port: Deep vessel turbine & ocean resonance
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(42, now);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(100, now);

        osc.connect(filter);
        filter.connect(masterGain);
        osc.start(now);

        this.currentLoop = {
          stop: () => {
            try {
              osc.stop();
              osc.disconnect();
            } catch {}
          }
        };
      } else if (phase === 3) {
        // Cargo Flight: High-altitude jet thrust wind rumble
        const osc = this.ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(95, now);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(320, now);

        osc.connect(filter);
        filter.connect(masterGain);
        osc.start(now);

        this.currentLoop = {
          stop: () => {
            try {
              osc.stop();
              osc.disconnect();
            } catch {}
          }
        };
      }
    } catch {
      // Audio safety
    }
  }

  public stopAmbience() {
    if (this.currentLoop) {
      this.currentLoop.stop();
      this.currentLoop = null;
    }
  }
}

export const audioEngine = new LogisticsAudioEngine();
