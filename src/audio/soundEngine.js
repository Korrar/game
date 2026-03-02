// Procedural audio engine using Web Audio API
let ctx = null;
let masterGain = null;
let musicGain = null;
let sfxGain = null;
let musicNodes = [];
let musicPlaying = false;
let muted = false;
let currentBiomeId = null;
let currentNight = false;
let chimeTimer = null;

function getCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.7;
    masterGain.connect(ctx.destination);

    musicGain = ctx.createGain();
    musicGain.gain.value = 0.35;
    musicGain.connect(masterGain);

    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.5;
    sfxGain.connect(masterGain);
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

// ─── BIOME-ADAPTIVE MUSIC ───

// Per-biome music profiles:
// drones: bass oscillators, df: drone filter Hz, pads: pad oscillators, pf: pad filter Hz,
// wv: wind volume, wf: wind filter Hz, notes: chime note pool,
// ct: chime tempo range [min,max] ms, cc: chime chance
const BIOME_MUSIC = {
  jungle: {
    drones: [{ freq: 110, dt: 0, vol: 0.22 }, { freq: 164.8, dt: 5, vol: 0.12 }, { freq: 220, dt: -3, vol: 0.08 }],
    df: 450, pads: [{ freq: 329.6, vol: 0.07 }, { freq: 440, vol: 0.05 }], pf: 650,
    wv: 0.03, wf: 350,
    notes: [329.6, 392, 440, 523.3, 659.3], ct: [3500, 7000], cc: 0.55,
  },
  island: {
    drones: [{ freq: 130.8, dt: 0, vol: 0.2 }, { freq: 196, dt: 3, vol: 0.12 }, { freq: 261.6, dt: -2, vol: 0.08 }],
    df: 500, pads: [{ freq: 392, vol: 0.06 }, { freq: 523.3, vol: 0.05 }], pf: 700,
    wv: 0.05, wf: 400,
    notes: [523.3, 587.3, 659.3, 784, 880], ct: [3000, 6000], cc: 0.6,
  },
  desert: {
    drones: [{ freq: 73.4, dt: 0, vol: 0.25 }, { freq: 110, dt: 7, vol: 0.15 }, { freq: 146.8, dt: -5, vol: 0.1 }],
    df: 350, pads: [{ freq: 293.7, vol: 0.06 }, { freq: 349.2, vol: 0.05 }], pf: 550,
    wv: 0.06, wf: 250,
    notes: [293.7, 311.1, 370, 440, 466.2], ct: [5000, 9000], cc: 0.4,
  },
  winter: {
    drones: [{ freq: 82.4, dt: 0, vol: 0.22 }, { freq: 123.5, dt: 4, vol: 0.14 }, { freq: 164.8, dt: -3, vol: 0.1 }],
    df: 320, pads: [{ freq: 246.9, vol: 0.07 }, { freq: 329.6, vol: 0.05 }], pf: 500,
    wv: 0.08, wf: 280,
    notes: [329.6, 392, 493.9, 659.3, 784], ct: [5000, 10000], cc: 0.35,
  },
  city: {
    drones: [{ freq: 61.7, dt: 0, vol: 0.25 }, { freq: 92.5, dt: 6, vol: 0.15 }, { freq: 123.5, dt: -4, vol: 0.1 }],
    df: 300, pads: [{ freq: 185, vol: 0.06 }, { freq: 246.9, vol: 0.05 }], pf: 450,
    wv: 0.02, wf: 200,
    notes: [246.9, 293.7, 349.2, 440, 523.3], ct: [4000, 8000], cc: 0.45,
  },
  volcano: {
    drones: [{ freq: 55, dt: 0, vol: 0.28 }, { freq: 82.4, dt: 8, vol: 0.18 }, { freq: 110, dt: -5, vol: 0.12 }],
    df: 280, pads: [{ freq: 164.8, vol: 0.07 }, { freq: 207.7, vol: 0.06 }], pf: 400,
    wv: 0.04, wf: 220,
    notes: [220, 261.6, 311.1, 370, 440], ct: [4500, 9000], cc: 0.35,
  },
  summer: {
    drones: [{ freq: 98, dt: 0, vol: 0.18 }, { freq: 146.8, dt: 4, vol: 0.12 }, { freq: 196, dt: -3, vol: 0.08 }],
    df: 500, pads: [{ freq: 293.7, vol: 0.06 }, { freq: 392, vol: 0.05 }], pf: 600,
    wv: 0.03, wf: 350,
    notes: [392, 440, 523.3, 587.3, 659.3], ct: [3500, 7000], cc: 0.5,
  },
  autumn: {
    drones: [{ freq: 73.4, dt: 0, vol: 0.22 }, { freq: 110, dt: 5, vol: 0.14 }, { freq: 146.8, dt: -4, vol: 0.09 }],
    df: 320, pads: [{ freq: 220, vol: 0.07 }, { freq: 293.7, vol: 0.05 }], pf: 450,
    wv: 0.04, wf: 260,
    notes: [220, 261.6, 293.7, 349.2, 440], ct: [5000, 10000], cc: 0.35,
  },
  spring: {
    drones: [{ freq: 87.3, dt: 0, vol: 0.18 }, { freq: 130.8, dt: 3, vol: 0.12 }, { freq: 174.6, dt: -2, vol: 0.08 }],
    df: 450, pads: [{ freq: 261.6, vol: 0.06 }, { freq: 349.2, vol: 0.05 }], pf: 550,
    wv: 0.04, wf: 320,
    notes: [349.2, 392, 440, 523.3, 587.3, 659.3], ct: [3000, 6000], cc: 0.55,
  },
  mushroom: {
    drones: [{ freq: 98, dt: 0, vol: 0.2 }, { freq: 146.8, dt: 5, vol: 0.12 }, { freq: 196, dt: -4, vol: 0.09 }],
    df: 450, pads: [{ freq: 293.7, vol: 0.07 }, { freq: 392, vol: 0.06 }], pf: 700,
    wv: 0.02, wf: 350,
    notes: [392, 440, 523.3, 587.3, 698.5, 784], ct: [3000, 6000], cc: 0.6,
  },
  swamp: {
    drones: [{ freq: 77.8, dt: 0, vol: 0.25 }, { freq: 116.5, dt: 7, vol: 0.15 }, { freq: 155.6, dt: -5, vol: 0.1 }],
    df: 280, pads: [{ freq: 233.1, vol: 0.06 }, { freq: 311.1, vol: 0.05 }], pf: 420,
    wv: 0.04, wf: 250,
    notes: [233.1, 277.2, 311.1, 370, 415.3], ct: [5000, 10000], cc: 0.35,
  },
  blue_lagoon: {
    drones: [{ freq: 110, dt: 0, vol: 0.2 }, { freq: 165, dt: 4, vol: 0.12 }, { freq: 220, dt: -2, vol: 0.08 }],
    df: 480, pads: [{ freq: 330, vol: 0.06 }, { freq: 440, vol: 0.05 }], pf: 680,
    wv: 0.05, wf: 380,
    notes: [330, 392, 440, 523.3, 659.3, 784], ct: [3000, 6500], cc: 0.52,
  },
};

function createDrone(freq, detune, vol, filterHz) {
  const c = getCtx();
  const osc = c.createOscillator();
  osc.type = "sine";
  osc.frequency.value = freq;
  osc.detune.value = detune;

  const gain = c.createGain();
  gain.gain.value = vol;

  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = filterHz || 400;
  filter.Q.value = 2;

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(musicGain);
  osc.start();

  // Slow LFO modulation on filter
  const lfo = c.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 0.05 + Math.random() * 0.08;
  const lfoGain = c.createGain();
  lfoGain.gain.value = 200;
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);
  lfo.start();

  return { osc, gain, filter, lfo, lfoGain };
}

function createPad(baseFreq, vol, filterHz) {
  const c = getCtx();
  const osc1 = c.createOscillator();
  osc1.type = "triangle";
  osc1.frequency.value = baseFreq;

  const osc2 = c.createOscillator();
  osc2.type = "sine";
  osc2.frequency.value = baseFreq * 1.002; // slight detuning for richness

  const gain = c.createGain();
  gain.gain.value = vol;

  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = filterHz || 600;
  filter.Q.value = 1;

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(gain);
  gain.connect(musicGain);
  osc1.start();
  osc2.start();

  // Slow volume swell
  const lfo = c.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 0.03 + Math.random() * 0.04;
  const lfoGain = c.createGain();
  lfoGain.gain.value = vol * 0.6;
  lfo.connect(lfoGain);
  lfoGain.connect(gain.gain);
  lfo.start();

  return { osc1, osc2, gain, filter, lfo, lfoGain };
}

function createWindNoise(vol, filterHz) {
  const c = getCtx();
  const bufferSize = c.sampleRate * 2;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const noise = c.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;

  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = filterHz || 300;
  filter.Q.value = 0.5;

  const gain = c.createGain();
  gain.gain.value = vol;

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(musicGain);
  noise.start();

  // Slow sweep on filter frequency
  const lfo = c.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 0.02;
  const lfoGain = c.createGain();
  lfoGain.gain.value = 250;
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);
  lfo.start();

  return { noise, filter, gain, lfo, lfoGain };
}

function playBiomeChime(notes, filterHz) {
  if (!musicPlaying || muted) return;
  const c = getCtx();
  const now = c.currentTime;
  const freq = notes[Math.floor(Math.random() * notes.length)];

  const osc = c.createOscillator();
  osc.type = "sine";
  osc.frequency.value = freq * 2; // higher octave

  const gain = c.createGain();
  gain.gain.setValueAtTime(0.06, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 3);

  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = Math.min((filterHz || 700) * 3, 3000);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(musicGain);
  osc.start(now);
  osc.stop(now + 3);
}

function _createBiomeNodes(biomeId, isNight) {
  const cfg = BIOME_MUSIC[biomeId];
  if (!cfg) return;

  const nm = isNight ? 0.65 : 1; // night: lower all filters

  cfg.drones.forEach(d => {
    musicNodes.push(createDrone(d.freq, d.dt, d.vol, cfg.df * nm));
  });
  cfg.pads.forEach(p => {
    musicNodes.push(createPad(p.freq, p.vol, cfg.pf * nm));
  });
  musicNodes.push(createWindNoise(cfg.wv * (isNight ? 1.5 : 1), cfg.wf * nm));

  // Scheduled chimes
  const [minT, maxT] = cfg.ct;
  const tmul = isNight ? 1.5 : 1;
  const chance = cfg.cc * (isNight ? 0.6 : 1);
  const fHz = cfg.pf * nm;

  const scheduleChime = () => {
    const interval = (minT + Math.random() * (maxT - minT)) * tmul;
    chimeTimer = setTimeout(() => {
      if (musicPlaying && !muted && Math.random() < chance) playBiomeChime(cfg.notes, fHz);
      if (musicPlaying) scheduleChime();
    }, interval);
  };
  scheduleChime();
}

function _stopAllNodes() {
  musicNodes.forEach(node => {
    Object.values(node).forEach(n => {
      if (n && typeof n.stop === "function") try { n.stop(); } catch (_) {}
      if (n && typeof n.disconnect === "function") try { n.disconnect(); } catch (_) {}
    });
  });
  musicNodes = [];
  if (chimeTimer) { clearTimeout(chimeTimer); chimeTimer = null; }
}

export function startMusic() {
  if (musicPlaying) return;
  getCtx();
  musicPlaying = true;
  // Actual nodes created by changeBiomeMusic() on first biome render
}

export function stopMusic() {
  musicPlaying = false;
  _stopAllNodes();
  currentBiomeId = null;
  currentNight = false;
}

export function changeBiomeMusic(biomeId, isNight) {
  if (!musicPlaying) return;
  if (biomeId === currentBiomeId && isNight === currentNight) return;

  const c = getCtx();
  const now = c.currentTime;

  if (musicNodes.length > 0) {
    // Crossfade: fade out old nodes, then swap
    musicGain.gain.setTargetAtTime(0, now, 0.25);
    const oldNodes = [...musicNodes];
    musicNodes = [];
    if (chimeTimer) { clearTimeout(chimeTimer); chimeTimer = null; }

    setTimeout(() => {
      oldNodes.forEach(node => {
        Object.values(node).forEach(n => {
          if (n && typeof n.stop === "function") try { n.stop(); } catch (_) {}
          if (n && typeof n.disconnect === "function") try { n.disconnect(); } catch (_) {}
        });
      });
      currentBiomeId = biomeId;
      currentNight = isNight;
      _createBiomeNodes(biomeId, isNight);
      musicGain.gain.setTargetAtTime(0.35, c.currentTime, 0.35);
    }, 500);
  } else {
    // First time – create immediately
    currentBiomeId = biomeId;
    currentNight = isNight;
    _createBiomeNodes(biomeId, isNight);
  }
}

export function toggleMusic() {
  muted = !muted;
  if (muted) {
    if (masterGain) masterGain.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
  } else {
    if (masterGain) masterGain.gain.setTargetAtTime(0.7, ctx.currentTime, 0.3);
  }
  return !muted;
}

export function isMusicOn() {
  return !muted;
}

// ─── SOUND EFFECTS ───

function playSfx(fn) {
  if (muted) return;
  const c = getCtx();
  fn(c, c.currentTime, sfxGain);
}

export function sfxPickupKey() {
  playSfx((c, now, dest) => {
    // Bright metallic chime - two harmonics
    [880, 1318.5].forEach((freq, i) => {
      const osc = c.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      const g = c.createGain();
      g.gain.setValueAtTime(0.3 - i * 0.1, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc.connect(g); g.connect(dest);
      osc.start(now + i * 0.08);
      osc.stop(now + 0.7);
    });
    // Sparkle noise burst
    const buf = c.createBuffer(1, c.sampleRate * 0.1, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const n = c.createBufferSource(); n.buffer = buf;
    const f = c.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 4000;
    const g = c.createGain(); g.gain.setValueAtTime(0.15, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    n.connect(f); f.connect(g); g.connect(dest);
    n.start(now);
  });
}

export function sfxDoor() {
  playSfx((c, now, dest) => {
    // Deep thud
    const osc = c.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);
    const g = c.createGain();
    g.gain.setValueAtTime(0.5, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(g); g.connect(dest);
    osc.start(now); osc.stop(now + 0.5);

    // Creaky noise
    const buf = c.createBuffer(1, c.sampleRate * 0.3, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.sin(i * 0.15) * Math.sin(i * 0.037) * (1 - i / d.length);
    const n = c.createBufferSource(); n.buffer = buf;
    const f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 800; f.Q.value = 3;
    const g2 = c.createGain(); g2.gain.setValueAtTime(0.25, now); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    n.connect(f); f.connect(g2); g2.connect(dest);
    n.start(now);

    // Stone scrape
    const osc2 = c.createOscillator();
    osc2.type = "sawtooth";
    osc2.frequency.value = 60;
    const f2 = c.createBiquadFilter(); f2.type = "lowpass"; f2.frequency.value = 200;
    const g3 = c.createGain(); g3.gain.setValueAtTime(0.12, now + 0.05); g3.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc2.connect(f2); f2.connect(g3); g3.connect(dest);
    osc2.start(now + 0.05); osc2.stop(now + 0.35);
  });
}

export function sfxChest() {
  playSfx((c, now, dest) => {
    // Magical opening - ascending arpeggio
    [523.3, 659.3, 784, 1047].forEach((freq, i) => {
      const osc = c.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      const g = c.createGain();
      const t = now + i * 0.1;
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.connect(g); g.connect(dest);
      osc.start(t); osc.stop(t + 0.6);
    });
    // Sparkle
    const buf = c.createBuffer(1, c.sampleRate * 0.4, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
    const n = c.createBufferSource(); n.buffer = buf;
    const f = c.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 5000;
    const g = c.createGain(); g.gain.setValueAtTime(0.1, now + 0.2); g.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    n.connect(f); f.connect(g); g.connect(dest);
    n.start(now + 0.2);
  });
}

export function sfxSell() {
  playSfx((c, now, dest) => {
    // Coin clinks - multiple small metallic sounds
    [0, 0.06, 0.12, 0.2].forEach((delay, i) => {
      const osc = c.createOscillator();
      osc.type = "square";
      osc.frequency.setValueAtTime(2200 + i * 400, now + delay);
      osc.frequency.exponentialRampToValueAtTime(800, now + delay + 0.06);
      const f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 3000; f.Q.value = 5;
      const g = c.createGain();
      g.gain.setValueAtTime(0.08, now + delay);
      g.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.08);
      osc.connect(f); f.connect(g); g.connect(dest);
      osc.start(now + delay); osc.stop(now + delay + 0.1);
    });
    // Ka-ching register sound
    const osc2 = c.createOscillator();
    osc2.type = "sine";
    osc2.frequency.value = 1500;
    const g2 = c.createGain();
    g2.gain.setValueAtTime(0.15, now + 0.25);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc2.connect(g2); g2.connect(dest);
    osc2.start(now + 0.25); osc2.stop(now + 0.55);
  });
}

export function sfxStore() {
  playSfx((c, now, dest) => {
    // Soft whoosh
    const buf = c.createBuffer(1, c.sampleRate * 0.3, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      const env = Math.sin((i / d.length) * Math.PI);
      d[i] = (Math.random() * 2 - 1) * env;
    }
    const n = c.createBufferSource(); n.buffer = buf;
    const f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 1200; f.Q.value = 0.5;
    const g = c.createGain(); g.gain.value = 0.15;
    n.connect(f); f.connect(g); g.connect(dest);
    n.start(now);

    // Soft thud at end
    const osc = c.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(200, now + 0.15);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.3);
    const g2 = c.createGain();
    g2.gain.setValueAtTime(0.15, now + 0.15);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(g2); g2.connect(dest);
    osc.start(now + 0.15); osc.stop(now + 0.4);
  });
}

export function sfxRetrieve() {
  playSfx((c, now, dest) => {
    // Quick upward sweep
    const osc = c.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);
    const g = c.createGain();
    g.gain.setValueAtTime(0.2, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(g); g.connect(dest);
    osc.start(now); osc.stop(now + 0.3);
  });
}

export function sfxUpgrade() {
  playSfx((c, now, dest) => {
    // Triumphant fanfare - ascending major chord
    const notes = [261.6, 329.6, 392, 523.3, 659.3]; // C E G C5 E5
    notes.forEach((freq, i) => {
      const osc = c.createOscillator();
      osc.type = i < 3 ? "triangle" : "sine";
      osc.frequency.value = freq;
      const g = c.createGain();
      const t = now + i * 0.12;
      g.gain.setValueAtTime(0.2, t);
      g.gain.setValueAtTime(0.2, t + 0.3);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
      osc.connect(g); g.connect(dest);
      osc.start(t); osc.stop(t + 1.3);
    });

    // Shimmering noise
    const buf = c.createBuffer(1, c.sampleRate * 1, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
    const n = c.createBufferSource(); n.buffer = buf;
    const f = c.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 4000;
    const g = c.createGain(); g.gain.setValueAtTime(0.08, now + 0.3); g.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    n.connect(f); f.connect(g); g.connect(dest);
    n.start(now + 0.3);

    // Deep bass impact
    const bass = c.createOscillator();
    bass.type = "sine";
    bass.frequency.setValueAtTime(80, now);
    bass.frequency.exponentialRampToValueAtTime(30, now + 0.5);
    const bg = c.createGain();
    bg.gain.setValueAtTime(0.3, now);
    bg.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    bass.connect(bg); bg.connect(dest);
    bass.start(now); bass.stop(now + 0.7);
  });
}

export function sfxGather() {
  playSfx((c, now, dest) => {
    // Thwack / dig impact
    const osc = c.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(250, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);
    const g = c.createGain();
    g.gain.setValueAtTime(0.3, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(g); g.connect(dest);
    osc.start(now); osc.stop(now + 0.2);

    // Crack/chip noise
    const buf = c.createBuffer(1, c.sampleRate * 0.15, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 1.5);
    const n = c.createBufferSource(); n.buffer = buf;
    const f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 2000; f.Q.value = 1;
    const g2 = c.createGain(); g2.gain.setValueAtTime(0.2, now + 0.05); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    n.connect(f); f.connect(g2); g2.connect(dest);
    n.start(now + 0.05);

    // Success chime
    const osc2 = c.createOscillator();
    osc2.type = "sine";
    osc2.frequency.value = 660;
    const g3 = c.createGain();
    g3.gain.setValueAtTime(0.15, now + 0.2);
    g3.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc2.connect(g3); g3.connect(dest);
    osc2.start(now + 0.2); osc2.stop(now + 0.55);
  });
}

export function sfxBuy() {
  playSfx((c, now, dest) => {
    // Pouch of coins dropping
    [0, 0.05, 0.1, 0.16, 0.24].forEach((delay, i) => {
      const osc = c.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1800 - i * 200, now + delay);
      osc.frequency.exponentialRampToValueAtTime(600, now + delay + 0.04);
      const g = c.createGain();
      g.gain.setValueAtTime(0.1, now + delay);
      g.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.06);
      osc.connect(g); g.connect(dest);
      osc.start(now + delay); osc.stop(now + delay + 0.08);
    });
    // Thud - item received
    const osc2 = c.createOscillator();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(180, now + 0.3);
    osc2.frequency.exponentialRampToValueAtTime(100, now + 0.45);
    const g2 = c.createGain();
    g2.gain.setValueAtTime(0.2, now + 0.3);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc2.connect(g2); g2.connect(dest);
    osc2.start(now + 0.3); osc2.stop(now + 0.55);
  });
}

// ─── SPELL & NPC SOUNDS ───

export function sfxFireball() {
  playSfx((c, now, dest) => {
    // Whoosh buildup
    const buf = c.createBuffer(1, c.sampleRate * 0.3, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(i / d.length, 2);
    const n = c.createBufferSource(); n.buffer = buf;
    const f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 600; f.Q.value = 1;
    const g = c.createGain(); g.gain.setValueAtTime(0.3, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    n.connect(f); f.connect(g); g.connect(dest); n.start(now);
    // Explosion
    const buf2 = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate);
    const d2 = buf2.getChannelData(0);
    for (let i = 0; i < d2.length; i++) d2[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d2.length, 1.5);
    const n2 = c.createBufferSource(); n2.buffer = buf2;
    const f2 = c.createBiquadFilter(); f2.type = "lowpass"; f2.frequency.value = 800;
    const g2 = c.createGain(); g2.gain.setValueAtTime(0.4, now + 0.25); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    n2.connect(f2); f2.connect(g2); g2.connect(dest); n2.start(now + 0.25);
    // Bass boom
    const bass = c.createOscillator(); bass.type = "sine";
    bass.frequency.setValueAtTime(100, now + 0.25); bass.frequency.exponentialRampToValueAtTime(25, now + 0.6);
    const bg = c.createGain(); bg.gain.setValueAtTime(0.35, now + 0.25); bg.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    bass.connect(bg); bg.connect(dest); bass.start(now + 0.25); bass.stop(now + 0.7);
  });
}

export function sfxLightning() {
  playSfx((c, now, dest) => {
    // Sharp gunshot crack (short noise burst, high volume, fast decay)
    const buf = c.createBuffer(1, c.sampleRate * 0.05, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
    const n = c.createBufferSource(); n.buffer = buf;
    const f = c.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 800;
    const g = c.createGain(); g.gain.setValueAtTime(0.7, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    n.connect(f); f.connect(g); g.connect(dest); n.start(now);
    // Brief echo/reverb tail (no rolling thunder)
    const buf2 = c.createBuffer(1, c.sampleRate * 0.3, c.sampleRate);
    const d2 = buf2.getChannelData(0);
    for (let i = 0; i < d2.length; i++) d2[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d2.length, 4);
    const n2 = c.createBufferSource(); n2.buffer = buf2;
    const f2 = c.createBiquadFilter(); f2.type = "bandpass"; f2.frequency.value = 600; f2.Q.value = 1;
    const g2 = c.createGain(); g2.gain.setValueAtTime(0.15, now + 0.04); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    n2.connect(f2); f2.connect(g2); g2.connect(dest); n2.start(now + 0.04);
  });
}

export function sfxIceLance() {
  playSfx((c, now, dest) => {
    // Crystalline swoosh
    [2000, 3000, 4500].forEach((freq, i) => {
      const osc = c.createOscillator(); osc.type = "sine"; osc.frequency.value = freq;
      const g = c.createGain();
      g.gain.setValueAtTime(0.12, now + i * 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.3 + i * 0.05);
      osc.connect(g); g.connect(dest);
      osc.start(now + i * 0.03); osc.stop(now + 0.4);
    });
    // Shatter impact
    const buf = c.createBuffer(1, c.sampleRate * 0.2, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
    const n = c.createBufferSource(); n.buffer = buf;
    const f = c.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 3000;
    const g = c.createGain(); g.gain.setValueAtTime(0.2, now + 0.2); g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    n.connect(f); f.connect(g); g.connect(dest); n.start(now + 0.2);
    // Low ice crack
    const osc2 = c.createOscillator(); osc2.type = "triangle";
    osc2.frequency.setValueAtTime(150, now + 0.22); osc2.frequency.exponentialRampToValueAtTime(50, now + 0.4);
    const g2 = c.createGain(); g2.gain.setValueAtTime(0.15, now + 0.22); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(g2); g2.connect(dest); osc2.start(now + 0.22); osc2.stop(now + 0.5);
  });
}

export function sfxShadowBolt() {
  playSfx((c, now, dest) => {
    // Dark warble
    const osc = c.createOscillator(); osc.type = "sawtooth"; osc.frequency.value = 120;
    const lfo = c.createOscillator(); lfo.type = "sine"; lfo.frequency.value = 8;
    const lfoG = c.createGain(); lfoG.gain.value = 40;
    lfo.connect(lfoG); lfoG.connect(osc.frequency);
    const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 300;
    const g = c.createGain(); g.gain.setValueAtTime(0.25, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.connect(f); f.connect(g); g.connect(dest);
    osc.start(now); lfo.start(now); osc.stop(now + 0.55); lfo.stop(now + 0.55);
    // Whisper noise
    const buf = c.createBuffer(1, c.sampleRate * 0.4, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.sin(i / d.length * Math.PI);
    const n = c.createBufferSource(); n.buffer = buf;
    const f2 = c.createBiquadFilter(); f2.type = "bandpass"; f2.frequency.value = 500; f2.Q.value = 2;
    const g2 = c.createGain(); g2.gain.setValueAtTime(0.1, now + 0.1); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    n.connect(f2); f2.connect(g2); g2.connect(dest); n.start(now + 0.1);
  });
}

export function sfxHolyBeam() {
  playSfx((c, now, dest) => {
    // Angelic chord
    [523.3, 659.3, 784, 1047, 1318.5].forEach((freq, i) => {
      const osc = c.createOscillator(); osc.type = "sine"; osc.frequency.value = freq;
      const g = c.createGain();
      g.gain.setValueAtTime(0.1, now); g.gain.setValueAtTime(0.1, now + 0.15);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      osc.connect(g); g.connect(dest);
      osc.start(now); osc.stop(now + 0.9);
    });
    // Shimmer
    const buf = c.createBuffer(1, c.sampleRate * 0.6, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
    const n = c.createBufferSource(); n.buffer = buf;
    const f = c.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 5000;
    const g = c.createGain(); g.gain.setValueAtTime(0.08, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    n.connect(f); f.connect(g); g.connect(dest); n.start(now);
  });
}

export function sfxNpcDeath() {
  playSfx((c, now, dest) => {
    // Descending moan
    const osc = c.createOscillator(); osc.type = "sawtooth";
    osc.frequency.setValueAtTime(400, now); osc.frequency.exponentialRampToValueAtTime(60, now + 0.6);
    const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 500;
    const g = c.createGain(); g.gain.setValueAtTime(0.2, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    osc.connect(f); f.connect(g); g.connect(dest); osc.start(now); osc.stop(now + 0.7);
    // Poof
    const buf = c.createBuffer(1, c.sampleRate * 0.2, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 1.5);
    const n = c.createBufferSource(); n.buffer = buf;
    const f2 = c.createBiquadFilter(); f2.type = "lowpass"; f2.frequency.value = 1000;
    const g2 = c.createGain(); g2.gain.setValueAtTime(0.15, now + 0.15); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    n.connect(f2); f2.connect(g2); g2.connect(dest); n.start(now + 0.15);
  });
}

export function sfxMeleeHit() {
  playSfx((c, now, dest) => {
    // Metallic sword clang
    const osc = c.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.08);
    const f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 1200; f.Q.value = 3;
    const g = c.createGain();
    g.gain.setValueAtTime(0.18, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(f); f.connect(g); g.connect(dest);
    osc.start(now); osc.stop(now + 0.12);
    // Impact thud
    const bass = c.createOscillator();
    bass.type = "sine";
    bass.frequency.setValueAtTime(150, now);
    bass.frequency.exponentialRampToValueAtTime(50, now + 0.15);
    const bg = c.createGain();
    bg.gain.setValueAtTime(0.2, now);
    bg.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    bass.connect(bg); bg.connect(dest);
    bass.start(now); bass.stop(now + 0.2);
    // Quick metallic noise
    const buf = c.createBuffer(1, c.sampleRate * 0.06, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 1);
    const n = c.createBufferSource(); n.buffer = buf;
    const f2 = c.createBiquadFilter(); f2.type = "highpass"; f2.frequency.value = 2000;
    const g2 = c.createGain(); g2.gain.setValueAtTime(0.12, now); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    n.connect(f2); f2.connect(g2); g2.connect(dest); n.start(now);
  });
}

export function sfxSaberSwipe() {
  playSfx((c, now, dest) => {
    // Metallic whoosh — fast high-frequency sweep
    const osc = c.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.12);
    const f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 1800; f.Q.value = 2;
    const g = c.createGain();
    g.gain.setValueAtTime(0.14, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(f); f.connect(g); g.connect(dest);
    osc.start(now); osc.stop(now + 0.18);
    // Air swoosh — filtered noise
    const buf = c.createBuffer(1, c.sampleRate * 0.12, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 0.8);
    const n = c.createBufferSource(); n.buffer = buf;
    const f2 = c.createBiquadFilter(); f2.type = "highpass"; f2.frequency.value = 1500;
    const g2 = c.createGain(); g2.gain.setValueAtTime(0.18, now); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    n.connect(f2); f2.connect(g2); g2.connect(dest); n.start(now);
  });
}

export function sfxSaberHit() {
  playSfx((c, now, dest) => {
    // Short metallic clang
    const osc = c.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(900, now);
    osc.frequency.exponentialRampToValueAtTime(500, now + 0.06);
    const g = c.createGain();
    g.gain.setValueAtTime(0.12, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(g); g.connect(dest);
    osc.start(now); osc.stop(now + 0.1);
  });
}

export function sfxRecruit() {
  playSfx((c, now, dest) => {
    // Coin jingle – multiple metallic clinks
    [0, 0.06, 0.11, 0.17, 0.24, 0.3].forEach((delay, i) => {
      const osc = c.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(2400 + (i % 3) * 300, now + delay);
      osc.frequency.exponentialRampToValueAtTime(1200, now + delay + 0.05);
      const f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 3500; f.Q.value = 4;
      const g = c.createGain();
      g.gain.setValueAtTime(0.09, now + delay);
      g.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.07);
      osc.connect(f); f.connect(g); g.connect(dest);
      osc.start(now + delay); osc.stop(now + delay + 0.09);
    });
    // Confirmation horn - short brass note
    const horn = c.createOscillator();
    horn.type = "sawtooth";
    horn.frequency.value = 330;
    const hf = c.createBiquadFilter(); hf.type = "lowpass"; hf.frequency.value = 800; hf.Q.value = 1;
    const hg = c.createGain();
    hg.gain.setValueAtTime(0.12, now + 0.35);
    hg.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    horn.connect(hf); hf.connect(hg); hg.connect(dest);
    horn.start(now + 0.35); horn.stop(now + 0.65);
    // Leather/cloth rustle
    const buf = c.createBuffer(1, c.sampleRate * 0.2, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 1.5);
    const n = c.createBufferSource(); n.buffer = buf;
    const nf = c.createBiquadFilter(); nf.type = "bandpass"; nf.frequency.value = 1500; nf.Q.value = 0.5;
    const ng = c.createGain(); ng.gain.setValueAtTime(0.08, now + 0.1); ng.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    n.connect(nf); nf.connect(ng); ng.connect(dest); n.start(now + 0.1);
  });
}

export function sfxSummon() {
  playSfx((c, now, dest) => {
    // Magical rising whoosh
    const osc = c.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.3);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.6);
    const g = c.createGain();
    g.gain.setValueAtTime(0.15, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    osc.connect(g); g.connect(dest);
    osc.start(now); osc.stop(now + 0.7);
    // Rising sparkle tones
    [400, 500, 600, 700].forEach((freq, i) => {
      const o = c.createOscillator();
      o.type = "sine";
      o.frequency.value = freq;
      const gg = c.createGain();
      const t = now + 0.1 + i * 0.08;
      gg.gain.setValueAtTime(0.08, t);
      gg.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      o.connect(gg); gg.connect(dest);
      o.start(t); o.stop(t + 0.3);
    });
    // Whoosh noise
    const buf = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.sin(i / d.length * Math.PI);
    const n = c.createBufferSource(); n.buffer = buf;
    const f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 800; f.Q.value = 0.5;
    const g2 = c.createGain(); g2.gain.setValueAtTime(0.12, now); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    n.connect(f); f.connect(g2); g2.connect(dest); n.start(now);
  });
}

export function sfxMeteorFall() {
  playSfx((c, now, dest) => {
    // Rising whoosh that builds intensity
    const buf = c.createBuffer(1, c.sampleRate * 1.2, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(i / d.length, 2);
    const n = c.createBufferSource(); n.buffer = buf;
    const f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 200;
    f.frequency.linearRampToValueAtTime(1200, now + 1.0);
    f.Q.value = 1;
    const g = c.createGain();
    g.gain.setValueAtTime(0.05, now);
    g.gain.linearRampToValueAtTime(0.35, now + 0.9);
    g.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
    n.connect(f); f.connect(g); g.connect(dest); n.start(now);
    // Rising bass rumble
    const bass = c.createOscillator(); bass.type = "sine";
    bass.frequency.setValueAtTime(30, now);
    bass.frequency.linearRampToValueAtTime(80, now + 1.0);
    const bg = c.createGain();
    bg.gain.setValueAtTime(0.05, now);
    bg.gain.linearRampToValueAtTime(0.25, now + 0.9);
    bg.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
    bass.connect(bg); bg.connect(dest);
    bass.start(now); bass.stop(now + 1.2);
  });
}

export function sfxMeteorImpact() {
  playSfx((c, now, dest) => {
    // Deep bass boom
    const bass = c.createOscillator();
    bass.type = "sine";
    bass.frequency.setValueAtTime(60, now);
    bass.frequency.exponentialRampToValueAtTime(20, now + 0.5);
    const bg = c.createGain();
    bg.gain.setValueAtTime(0.35, now);
    bg.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    bass.connect(bg); bg.connect(dest);
    bass.start(now); bass.stop(now + 0.65);
    // Metallic crack
    const crack = c.createOscillator();
    crack.type = "square";
    crack.frequency.setValueAtTime(200, now);
    crack.frequency.exponentialRampToValueAtTime(800, now + 0.1);
    const cf = c.createBiquadFilter(); cf.type = "bandpass"; cf.frequency.value = 600; cf.Q.value = 2;
    const cg = c.createGain();
    cg.gain.setValueAtTime(0.2, now);
    cg.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    crack.connect(cf); cf.connect(cg); cg.connect(dest);
    crack.start(now); crack.stop(now + 0.2);
    // Rumble noise
    const buf = c.createBuffer(1, c.sampleRate * 0.4, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
    const n = c.createBufferSource(); n.buffer = buf;
    const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 300;
    const g2 = c.createGain(); g2.gain.setValueAtTime(0.2, now + 0.05); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    n.connect(f); f.connect(g2); g2.connect(dest); n.start(now + 0.05);
  });
}

export function sfxDrinkMana() {
  playSfx((c, now, dest) => {
    // Magical gulp + sparkle
    const osc = c.createOscillator(); osc.type = "sine";
    osc.frequency.setValueAtTime(400, now); osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.3);
    const g = c.createGain(); g.gain.setValueAtTime(0.15, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(g); g.connect(dest); osc.start(now); osc.stop(now + 0.4);
    // Bubbles
    [0.05, 0.1, 0.15, 0.2].forEach(delay => {
      const o = c.createOscillator(); o.type = "sine";
      o.frequency.setValueAtTime(1200 + Math.random() * 800, now + delay);
      const gg = c.createGain(); gg.gain.setValueAtTime(0.06, now + delay); gg.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.05);
      o.connect(gg); gg.connect(dest); o.start(now + delay); o.stop(now + delay + 0.06);
    });
    // Magic shimmer
    const buf = c.createBuffer(1, c.sampleRate * 0.3, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
    const n = c.createBufferSource(); n.buffer = buf;
    const f = c.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 4000;
    const g2 = c.createGain(); g2.gain.setValueAtTime(0.08, now + 0.15); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    n.connect(f); f.connect(g2); g2.connect(dest); n.start(now + 0.15);
  });
}

export function sfxLocked() {
  playSfx((c, now, dest) => {
    // Dull clank - denied
    const osc = c.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
    const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 600;
    const g = c.createGain();
    g.gain.setValueAtTime(0.2, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(f); f.connect(g); g.connect(dest);
    osc.start(now); osc.stop(now + 0.25);

    // Second thud
    const osc2 = c.createOscillator();
    osc2.type = "square";
    osc2.frequency.setValueAtTime(150, now + 0.15);
    osc2.frequency.exponentialRampToValueAtTime(80, now + 0.3);
    const f2 = c.createBiquadFilter(); f2.type = "lowpass"; f2.frequency.value = 400;
    const g2 = c.createGain();
    g2.gain.setValueAtTime(0.15, now + 0.15);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc2.connect(f2); f2.connect(g2); g2.connect(dest);
    osc2.start(now + 0.15); osc2.stop(now + 0.4);
  });
}

// ─── RANDOM EVENT SFX ───

export function sfxEventAppear() {
  playSfx((c, now, dest) => {
    // Mystical whoosh – rising sweep
    const noise = c.createBufferSource();
    const buf = c.createBuffer(1, c.sampleRate * 0.6, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.5;
    noise.buffer = buf;
    const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.setValueAtTime(300, now);
    bp.frequency.exponentialRampToValueAtTime(2000, now + 0.4); bp.Q.value = 2;
    const gn = c.createGain(); gn.gain.setValueAtTime(0.2, now);
    gn.gain.linearRampToValueAtTime(0.3, now + 0.2);
    gn.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    noise.connect(bp); bp.connect(gn); gn.connect(dest);
    noise.start(now); noise.stop(now + 0.6);
    // Chime bell
    const osc = c.createOscillator(); osc.type = "sine"; osc.frequency.value = 1200;
    const g = c.createGain(); g.gain.setValueAtTime(0, now + 0.15);
    g.gain.linearRampToValueAtTime(0.25, now + 0.2);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    osc.connect(g); g.connect(dest); osc.start(now + 0.15); osc.stop(now + 0.85);
    // Second chime (fifth interval)
    const osc2 = c.createOscillator(); osc2.type = "sine"; osc2.frequency.value = 1800;
    const g2 = c.createGain(); g2.gain.setValueAtTime(0, now + 0.25);
    g2.gain.linearRampToValueAtTime(0.15, now + 0.3);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    osc2.connect(g2); g2.connect(dest); osc2.start(now + 0.25); osc2.stop(now + 0.95);
  });
}

export function sfxMerchant() {
  playSfx((c, now, dest) => {
    // Coin jingle
    [0, 0.06, 0.12, 0.18].forEach((delay, i) => {
      const osc = c.createOscillator(); osc.type = "sine";
      osc.frequency.setValueAtTime(2200 + (i % 3) * 400, now + delay);
      osc.frequency.exponentialRampToValueAtTime(1400, now + delay + 0.06);
      const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 3000; bp.Q.value = 5;
      const g = c.createGain(); g.gain.setValueAtTime(0.12, now + delay);
      g.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.1);
      osc.connect(bp); bp.connect(g); g.connect(dest);
      osc.start(now + delay); osc.stop(now + delay + 0.12);
    });
    // Welcoming horn
    const horn = c.createOscillator(); horn.type = "sawtooth"; horn.frequency.value = 330;
    const hf = c.createBiquadFilter(); hf.type = "lowpass"; hf.frequency.value = 500;
    const hg = c.createGain(); hg.gain.setValueAtTime(0, now + 0.2);
    hg.gain.linearRampToValueAtTime(0.12, now + 0.3);
    hg.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    horn.connect(hf); hf.connect(hg); hg.connect(dest);
    horn.start(now + 0.2); horn.stop(now + 0.75);
  });
}

export function sfxAmbush() {
  playSfx((c, now, dest) => {
    // Alarm stab – rapid descending notes
    [0, 0.08, 0.16].forEach((delay, i) => {
      const osc = c.createOscillator(); osc.type = "sawtooth";
      osc.frequency.setValueAtTime(600 - i * 100, now + delay);
      osc.frequency.exponentialRampToValueAtTime(200, now + delay + 0.1);
      const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 1200;
      const g = c.createGain(); g.gain.setValueAtTime(0.2, now + delay);
      g.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.12);
      osc.connect(f); f.connect(g); g.connect(dest);
      osc.start(now + delay); osc.stop(now + delay + 0.15);
    });
    // Sword slash noise burst
    const noise = c.createBufferSource();
    const buf = c.createBuffer(1, c.sampleRate * 0.15, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1);
    noise.buffer = buf;
    const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 4000; bp.Q.value = 3;
    const gn = c.createGain(); gn.gain.setValueAtTime(0.25, now + 0.2);
    gn.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    noise.connect(bp); bp.connect(gn); gn.connect(dest);
    noise.start(now + 0.2); noise.stop(now + 0.4);
  });
}

export function sfxRiddle() {
  playSfx((c, now, dest) => {
    // Deep mysterious drone
    const drone = c.createOscillator(); drone.type = "triangle"; drone.frequency.value = 110;
    const df = c.createBiquadFilter(); df.type = "lowpass"; df.frequency.value = 300;
    const dg = c.createGain(); dg.gain.setValueAtTime(0.15, now);
    dg.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    drone.connect(df); df.connect(dg); dg.connect(dest);
    drone.start(now); drone.stop(now + 0.85);
    // Crystalline chime
    [0.1, 0.25, 0.4].forEach((delay, i) => {
      const osc = c.createOscillator(); osc.type = "sine";
      osc.frequency.value = [880, 1320, 1760][i];
      const g = c.createGain(); g.gain.setValueAtTime(0.1, now + delay);
      g.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.35);
      osc.connect(g); g.connect(dest);
      osc.start(now + delay); osc.stop(now + delay + 0.4);
    });
  });
}

export function sfxAltar() {
  playSfx((c, now, dest) => {
    // Ethereal chord – major third + fifth
    [220, 277, 330].forEach((freq, i) => {
      const osc = c.createOscillator(); osc.type = "sine"; osc.frequency.value = freq;
      const g = c.createGain(); g.gain.setValueAtTime(0.12, now + i * 0.05);
      g.gain.linearRampToValueAtTime(0.15, now + 0.3);
      g.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
      osc.connect(g); g.connect(dest);
      osc.start(now + i * 0.05); osc.stop(now + 1.05);
    });
    // Shimmer overtone
    const osc2 = c.createOscillator(); osc2.type = "sine"; osc2.frequency.value = 660;
    const g2 = c.createGain(); g2.gain.setValueAtTime(0, now + 0.2);
    g2.gain.linearRampToValueAtTime(0.08, now + 0.4);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
    osc2.connect(g2); g2.connect(dest); osc2.start(now + 0.2); osc2.stop(now + 1.15);
  });
}

export function sfxEventSuccess() {
  playSfx((c, now, dest) => {
    // Triumphant ascending arpeggio
    [523, 659, 784, 1047].forEach((freq, i) => {
      const delay = i * 0.08;
      const osc = c.createOscillator(); osc.type = "sine"; osc.frequency.value = freq;
      const g = c.createGain(); g.gain.setValueAtTime(0.18, now + delay);
      g.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.25);
      osc.connect(g); g.connect(dest);
      osc.start(now + delay); osc.stop(now + delay + 0.3);
    });
  });
}

export function sfxEventFail() {
  playSfx((c, now, dest) => {
    // Sad descending tones
    [400, 350, 280, 200].forEach((freq, i) => {
      const delay = i * 0.1;
      const osc = c.createOscillator(); osc.type = "triangle"; osc.frequency.value = freq;
      const g = c.createGain(); g.gain.setValueAtTime(0.15, now + delay);
      g.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.2);
      osc.connect(g); g.connect(dest);
      osc.start(now + delay); osc.stop(now + delay + 0.25);
    });
    // Low thud
    const osc = c.createOscillator(); osc.type = "sine"; osc.frequency.value = 80;
    const g = c.createGain(); g.gain.setValueAtTime(0.2, now + 0.35);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc.connect(g); g.connect(dest); osc.start(now + 0.35); osc.stop(now + 0.65);
  });
}

// ─── DEFENSE WAVE SFX ───

export function sfxWaveHorn() {
  playSfx((c, now, dest) => {
    // Deep war horn
    const horn = c.createOscillator(); horn.type = "sawtooth";
    horn.frequency.setValueAtTime(110, now);
    horn.frequency.linearRampToValueAtTime(130, now + 0.4);
    horn.frequency.linearRampToValueAtTime(110, now + 1.0);
    const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 400;
    const g = c.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.2, now + 0.15);
    g.gain.setValueAtTime(0.2, now + 0.6);
    g.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    horn.connect(f); f.connect(g); g.connect(dest);
    horn.start(now); horn.stop(now + 1.25);
    // Second harmonic
    const h2 = c.createOscillator(); h2.type = "sawtooth"; h2.frequency.value = 165;
    const g2 = c.createGain();
    g2.gain.setValueAtTime(0, now + 0.05);
    g2.gain.linearRampToValueAtTime(0.08, now + 0.2);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
    h2.connect(f); h2.start(now + 0.05); h2.stop(now + 1.15);
  });
}

export function sfxWaveComplete() {
  playSfx((c, now, dest) => {
    // Bright ascending 3-note arpeggio
    [523, 659, 784].forEach((freq, i) => {
      const delay = i * 0.1;
      const osc = c.createOscillator(); osc.type = "sine"; osc.frequency.value = freq;
      const g = c.createGain(); g.gain.setValueAtTime(0.2, now + delay);
      g.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.3);
      osc.connect(g); g.connect(dest);
      osc.start(now + delay); osc.stop(now + delay + 0.35);
    });
  });
}

export function sfxVictoryFanfare() {
  playSfx((c, now, dest) => {
    // Triumphant brass chord
    [262, 330, 392, 523].forEach((freq, i) => {
      const delay = i * 0.12;
      const osc = c.createOscillator(); osc.type = "sawtooth"; osc.frequency.value = freq;
      const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 800;
      const g = c.createGain();
      g.gain.setValueAtTime(0.15, now + delay);
      g.gain.setValueAtTime(0.15, now + delay + 0.3);
      g.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.8);
      osc.connect(f); f.connect(g); g.connect(dest);
      osc.start(now + delay); osc.stop(now + delay + 0.85);
    });
    // Sparkle noise burst
    const noise = c.createBufferSource();
    const buf = c.createBuffer(1, c.sampleRate * 0.3, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.3;
    noise.buffer = buf;
    const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 5000; bp.Q.value = 3;
    const gn = c.createGain(); gn.gain.setValueAtTime(0.1, now + 0.5);
    gn.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    noise.connect(bp); bp.connect(gn); gn.connect(dest);
    noise.start(now + 0.5); noise.stop(now + 0.85);
  });
}

export function sfxCaravanHit() {
  playSfx((c, now, dest) => {
    // Wood/metal impact thud
    const buf = c.createBuffer(1, c.sampleRate * 0.25, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      const env = Math.exp(-i / (c.sampleRate * 0.06));
      d[i] = (Math.random() * 2 - 1) * env;
    }
    const n = c.createBufferSource(); n.buffer = buf;
    const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 600;
    const g = c.createGain();
    g.gain.setValueAtTime(0.3, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    n.connect(f); f.connect(g); g.connect(dest);
    n.start(now); n.stop(now + 0.3);
    // Metallic ring
    const osc = c.createOscillator(); osc.type = "triangle"; osc.frequency.value = 180;
    const g2 = c.createGain();
    g2.gain.setValueAtTime(0.12, now);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(g2); g2.connect(dest);
    osc.start(now); osc.stop(now + 0.2);
  });
}

// ─── WEATHER SFX ───

export function sfxWeather(weatherId) {
  playSfx((c, now, dest) => {
    switch (weatherId) {
      case "storm": {
        // Thunder rumble
        const buf = c.createBuffer(1, c.sampleRate * 1.5, c.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) {
          const env = i < d.length * 0.1 ? i / (d.length * 0.1) : Math.pow(1 - (i - d.length * 0.1) / (d.length * 0.9), 2);
          d[i] = (Math.random() * 2 - 1) * env;
        }
        const n = c.createBufferSource(); n.buffer = buf;
        const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 300;
        const g = c.createGain(); g.gain.setValueAtTime(0.25, now); g.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
        n.connect(f); f.connect(g); g.connect(dest); n.start(now); n.stop(now + 1.5);
        // Crack
        const osc = c.createOscillator(); osc.type = "square";
        osc.frequency.setValueAtTime(1200, now); osc.frequency.exponentialRampToValueAtTime(200, now + 0.08);
        const g2 = c.createGain(); g2.gain.setValueAtTime(0.15, now); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(g2); g2.connect(dest); osc.start(now); osc.stop(now + 0.12);
        break;
      }
      case "fog": {
        // Eerie low whoosh
        const buf = c.createBuffer(1, c.sampleRate * 1.0, c.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.sin(i / d.length * Math.PI);
        const n = c.createBufferSource(); n.buffer = buf;
        const f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 250; f.Q.value = 1;
        const g = c.createGain(); g.gain.setValueAtTime(0.15, now); g.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
        n.connect(f); f.connect(g); g.connect(dest); n.start(now); n.stop(now + 1.0);
        break;
      }
      case "rain": {
        // Rain patter
        const buf = c.createBuffer(1, c.sampleRate * 0.8, c.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
        const n = c.createBufferSource(); n.buffer = buf;
        const f = c.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 1000;
        const g = c.createGain(); g.gain.setValueAtTime(0.12, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        n.connect(f); f.connect(g); g.connect(dest); n.start(now); n.stop(now + 0.8);
        break;
      }
      case "gale": {
        // Wind howl
        const buf = c.createBuffer(1, c.sampleRate * 1.2, c.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.sin(i / d.length * Math.PI) * (1 + Math.sin(i * 0.01) * 0.5);
        const n = c.createBufferSource(); n.buffer = buf;
        const f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 400; f.Q.value = 0.5;
        const g = c.createGain(); g.gain.setValueAtTime(0.2, now); g.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
        n.connect(f); f.connect(g); g.connect(dest); n.start(now); n.stop(now + 1.2);
        break;
      }
    }
  });
}
