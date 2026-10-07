/**
 * Audio Synthesizer using Web Audio API
 * Generates synthetic chimes, bells, and ticks completely offline without external files.
 */
class SoundEffects {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.volume = 0.7; // 0.0 to 1.0
  }

  initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, parseFloat(val) || 0));
  }

  setMuted(isMuted) {
    this.muted = Boolean(isMuted);
  }

  /**
   * Harmonious meditative bell sound
   */
  playBell() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(this.volume * 0.5, now);
    masterGain.connect(this.ctx.destination);

    // Fundamental and harmonic frequencies
    const freqs = [528, 1056, 1584];
    const decays = [2.5, 1.8, 1.2];
    const gains = [0.6, 0.25, 0.1];

    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(gains[idx], now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + decays[idx]);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(now);
      osc.stop(now + decays[idx]);
    });
  }

  /**
   * Clear 2-tone melodic chime (C5 -> G5)
   */
  playChime() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(this.volume * 0.45, now);
    masterGain.connect(this.ctx.destination);

    const tones = [
      { freq: 523.25, start: 0, duration: 0.8 },  // C5
      { freq: 659.25, start: 0.15, duration: 0.9 }, // E5
      { freq: 783.99, start: 0.3, duration: 1.2 }   // G5
    ];

    tones.forEach((tone) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(tone.freq, now + tone.start);

      gain.gain.setValueAtTime(0, now + tone.start);
      gain.gain.linearRampToValueAtTime(0.8, now + tone.start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + tone.start + tone.duration);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(now + tone.start);
      osc.stop(now + tone.start + tone.duration);
    });
  }

  /**
   * Subtle modern digital beep
   */
  playDigital() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(this.volume * 0.35, now);
    masterGain.connect(this.ctx.destination);

    [0, 0.14].forEach((offset) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now + offset);

      gain.gain.setValueAtTime(0.7, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.1);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(now + offset);
      osc.stop(now + offset + 0.1);
    });
  }

  /**
   * Soft UI tactile click
   */
  playTick() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    gain.gain.setValueAtTime(this.volume * 0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.03);
  }

  /**
   * Play by sound name
   */
  playByName(name) {
    if (name === 'bell') this.playBell();
    else if (name === 'digital') this.playDigital();
    else this.playChime();
  }
}

window.soundEffects = new SoundEffects();
