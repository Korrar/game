// Procedural audio engine using Web Audio API
// Enhanced music system with chord progressions, rhythm, arpeggios, reverb, stereo panning, and combat intensity
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
let reverbNode = null; // ConvolverNode for spatial depth
let musicBus = null; // stereo bus before musicGain
let combatIntensity = 0; // 0 = exploration, 1 = full combat
let combatFilterNode = null; // dynamic filter driven by combat state
let combatGainNode = null; // extra gain layer for combat dynamics

function getCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.7;
    masterGain.connect(ctx.destination);

    musicGain = ctx.createGain();
    musicGain.gain.value = 0.35;

    // Combat dynamics: filter opens up during combat, gain increases
    combatFilterNode = ctx.createBiquadFilter();
    combatFilterNode.type = "lowpass";
    combatFilterNode.frequency.value = 800; // exploration: muted, warm
    combatFilterNode.Q.value = 0.7;

    combatGainNode = ctx.createGain();
    combatGainNode.gain.value = 1.0;

    // Music bus for stereo routing: musicGain → combatFilter → combatGain → reverb mix
    musicBus = ctx.createGain();
    musicBus.gain.value = 1.0;

    // Create procedural reverb impulse response (small room / cave ambience)
    _createReverb();

    // Routing: musicGain → combatFilter → combatGain → musicBus → [dry + wet reverb] → masterGain
    musicGain.connect(combatFilterNode);
    combatFilterNode.connect(combatGainNode);
    combatGainNode.connect(musicBus);
    musicBus.connect(masterGain); // dry signal

    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.5;
    sfxGain.connect(masterGain);
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

// Procedural impulse response for reverb (no audio files needed)
function _createReverb() {
  const c = ctx;
  const sampleRate = c.sampleRate;
  const length = sampleRate * 1.8; // 1.8 second reverb tail
  const impulse = c.createBuffer(2, length, sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      // Exponential decay with early reflections
      const t = i / sampleRate;
      const decay = Math.exp(-t * 3.5); // medium decay rate
      // Early reflections: sparse impulses in first 50ms
      const early = t < 0.05 ? (Math.random() < 0.02 ? 0.6 : 0) : 0;
      // Late diffuse reverb tail
      const late = (Math.random() * 2 - 1) * decay * 0.4;
      data[i] = early + late;
    }
  }
  reverbNode = c.createConvolver();
  reverbNode.buffer = impulse;
  // Wet signal: musicBus → reverb → masterGain (at reduced volume)
  const reverbGain = c.createGain();
  reverbGain.gain.value = 0.12; // subtle reverb mix
  musicBus.connect(reverbNode);
  reverbNode.connect(reverbGain);
  reverbGain.connect(masterGain);
}

// ─── BIOME-ADAPTIVE MUSIC (Enhanced) ───

// Chord progression system using scale degree intervals relative to root
// Each chord is [root_interval, third_interval, fifth_interval] in semitones from biome root
// Progressions cycle through chords, creating harmonic movement
const CHORD_PROGRESSIONS = {
  // i - iv - VII - III (minor: mysterious, adventurous — pirate classic)
  minor_adventure: [[0, 3, 7], [5, 8, 12], [10, 14, 17], [3, 7, 10]],
  // i - VI - III - VII (minor: epic, sweeping — sea shanty feel)
  minor_epic: [[0, 3, 7], [8, 12, 15], [3, 7, 10], [10, 14, 17]],
  // I - IV - V - I (major: bright, confident — adventure)
  major_bright: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7]],
  // i - iv - v - i (minor: dark, brooding — danger)
  minor_dark: [[0, 3, 7], [5, 8, 12], [7, 10, 14], [0, 3, 7]],
  // I - vi - IV - V (major: uplifting, nostalgic — warm biomes)
  major_warm: [[0, 4, 7], [9, 12, 16], [5, 9, 12], [7, 11, 14]],
  // i - bII - v - i (phrygian: exotic, tense — desert/volcano)
  phrygian_exotic: [[0, 3, 7], [1, 5, 8], [7, 10, 14], [0, 3, 7]],
  // I - II - IV - I (lydian: dreamy, floaty — mushroom)
  lydian_dream: [[0, 4, 7], [2, 6, 9], [5, 9, 12], [0, 4, 7]],
  // i - VII - VI - VII (minor: melancholic, wistful — autumn)
  minor_wistful: [[0, 3, 7], [10, 14, 17], [8, 12, 15], [10, 14, 17]],
};

// Arpeggio patterns: indices into current chord notes (0=root, 1=third, 2=fifth)
// with octave shifts (+3 = root up octave, etc.)
const ARPEGGIO_PATTERNS = {
  ascending: [0, 1, 2, 3], // root, 3rd, 5th, root+oct
  descending: [3, 2, 1, 0],
  wave: [0, 1, 2, 1, 0, 1, 2, 3], // up-down wave
  broken: [0, 2, 1, 3, 2, 0], // skip pattern
  shanty: [0, 0, 1, 2, 2, 1], // sea shanty bouncing rhythm
  sparse: [0, -1, 2, -1, 1, -1, 3, -1], // -1 = rest (silence)
};

// Rhythm patterns for subtle percussion: 1 = hit, 0 = rest
// Each step = one subdivision of the beat
const RHYTHM_PATTERNS = {
  // Simple 4/4 with kick on 1,3 and hihat on offbeats
  basic: { kick: [1,0,0,0, 1,0,0,0], hat: [0,0,1,0, 0,0,1,0], tempo: 0.5 },
  // Pirate shanty 6/8 feel
  shanty: { kick: [1,0,0,1,0,0], hat: [0,0,1,0,0,1], tempo: 0.35 },
  // Slow atmospheric — very sparse
  ambient: { kick: [1,0,0,0, 0,0,0,0], hat: [0,0,0,0, 0,0,1,0], tempo: 0.7 },
  // Tense combat feel
  tense: { kick: [1,0,1,0, 1,0,1,0], hat: [0,1,0,1, 0,1,0,1], tempo: 0.4 },
  // Exotic desert rhythm
  exotic: { kick: [1,0,0,1, 0,0,1,0], hat: [0,0,1,0, 1,0,0,1], tempo: 0.45 },
};

// Per-biome music profiles (enhanced with chord progressions, arpeggios, rhythm)
const BIOME_MUSIC = {
  // ── G Dorian — mysterious tribal, pirate jungle ──
  jungle: {
    root: 98, // G2
    drones: [{ freq: 98, dt: 0, vol: 0.20 }, { freq: 146.83, dt: 5, vol: 0.12 }, { freq: 196, dt: -3, vol: 0.08 }],
    df: 500, pads: [{ freq: 233.08, vol: 0.07 }, { freq: 293.66, vol: 0.05 }], pf: 700,
    wv: 0.03, wf: 350,
    notes: [392, 466.16, 523.25, 587.33, 698.46], ct: [3000, 6000], cc: 0.55,
    bass: { notes: [98, 116.54, 130.81, 146.83, 174.61], rate: 600, vol: 0.10, fHz: 350 },
    chords: "minor_adventure", chordRate: 4000, // chord changes every 4s
    arp: "wave", arpRate: 350, arpVol: 0.04, arpOctave: 2, // arpeggiate 2 octaves up
    rhythm: "shanty", rhythmVol: 0.025,
    panSpread: 0.6, // how wide stereo field is
  },
  // ── D Mixolydian — classic sea shanty, adventure ──
  island: {
    root: 73.42, // D2
    drones: [{ freq: 73.42, dt: 0, vol: 0.20 }, { freq: 110, dt: 3, vol: 0.12 }, { freq: 146.83, dt: -2, vol: 0.08 }],
    df: 520, pads: [{ freq: 185, vol: 0.06 }, { freq: 220, vol: 0.05 }], pf: 750,
    wv: 0.05, wf: 400,
    notes: [293.66, 329.63, 370, 440, 523.25], ct: [2500, 5000], cc: 0.6,
    bass: { notes: [73.42, 82.41, 92.50, 110, 130.81], rate: 520, vol: 0.11, fHz: 400 },
    waves: { vol: 0.04, rate: 4.5 },
    chords: "major_bright", chordRate: 3500,
    arp: "shanty", arpRate: 280, arpVol: 0.05, arpOctave: 2,
    rhythm: "shanty", rhythmVol: 0.035,
    panSpread: 0.7,
  },
  // ── A Phrygian — exotic Middle Eastern desert ──
  desert: {
    root: 55, // A1
    drones: [{ freq: 55, dt: 0, vol: 0.24 }, { freq: 82.41, dt: 7, vol: 0.14 }, { freq: 110, dt: -5, vol: 0.10 }],
    df: 380, pads: [{ freq: 130.81, vol: 0.06 }, { freq: 164.81, vol: 0.05 }], pf: 580,
    wv: 0.06, wf: 250,
    notes: [329.63, 349.23, 415.30, 440, 523.25], ct: [4500, 8000], cc: 0.40,
    bass: { notes: [110, 116.54, 130.81, 146.83, 164.81], rate: 900, vol: 0.09, fHz: 280 },
    chords: "phrygian_exotic", chordRate: 5000,
    arp: "sparse", arpRate: 400, arpVol: 0.035, arpOctave: 2,
    rhythm: "exotic", rhythmVol: 0.025,
    panSpread: 0.5,
  },
  // ── E minor pentatonic — cold, crystalline, ethereal ──
  winter: {
    root: 82.41, // E2
    drones: [{ freq: 82.41, dt: 0, vol: 0.20 }, { freq: 123.47, dt: 4, vol: 0.12 }, { freq: 164.81, dt: -3, vol: 0.09 }],
    df: 340, pads: [{ freq: 196, vol: 0.07 }, { freq: 246.94, vol: 0.05 }], pf: 520,
    wv: 0.08, wf: 280,
    notes: [329.63, 392, 440, 493.88, 587.33], ct: [5000, 10000], cc: 0.35,
    bass: { notes: [82.41, 98, 110, 123.47, 146.83], rate: 1100, vol: 0.07, fHz: 250 },
    chords: "minor_dark", chordRate: 6000,
    arp: "descending", arpRate: 500, arpVol: 0.03, arpOctave: 3,
    rhythm: "ambient", rhythmVol: 0.015,
    panSpread: 0.8,
  },
  // ── Bb Dorian — dark tavern, port city ──
  city: {
    root: 58.27, // Bb1
    drones: [{ freq: 58.27, dt: 0, vol: 0.23 }, { freq: 87.31, dt: 6, vol: 0.13 }, { freq: 116.54, dt: -4, vol: 0.09 }],
    df: 320, pads: [{ freq: 138.59, vol: 0.06 }, { freq: 174.61, vol: 0.05 }], pf: 480,
    wv: 0.02, wf: 200,
    notes: [233.08, 261.63, 277.18, 349.23, 392], ct: [4000, 7500], cc: 0.45,
    bass: { notes: [58.27, 65.41, 69.30, 87.31, 98], rate: 700, vol: 0.10, fHz: 300 },
    chords: "minor_adventure", chordRate: 4500,
    arp: "broken", arpRate: 320, arpVol: 0.035, arpOctave: 2,
    rhythm: "basic", rhythmVol: 0.025,
    panSpread: 0.4,
  },
  // ── A Phrygian dominant — intense, ominous, volcanic ──
  volcano: {
    root: 55, // A1
    drones: [{ freq: 55, dt: 0, vol: 0.28 }, { freq: 82.41, dt: 8, vol: 0.18 }, { freq: 110, dt: -5, vol: 0.12 }],
    df: 300, pads: [{ freq: 130.81, vol: 0.07 }, { freq: 164.81, vol: 0.06 }], pf: 420,
    wv: 0.04, wf: 220,
    notes: [261.63, 329.63, 349.23, 415.30, 440], ct: [4000, 8000], cc: 0.35,
    bass: { notes: [55, 58.27, 69.30, 73.42, 82.41], rate: 800, vol: 0.12, fHz: 250 },
    chords: "phrygian_exotic", chordRate: 4000,
    arp: "ascending", arpRate: 350, arpVol: 0.03, arpOctave: 2,
    rhythm: "tense", rhythmVol: 0.030,
    panSpread: 0.5,
  },
  // ── G major pentatonic — bright, breezy, cheerful summer ──
  summer: {
    root: 98, // G2
    drones: [{ freq: 98, dt: 0, vol: 0.18 }, { freq: 146.83, dt: 4, vol: 0.11 }, { freq: 196, dt: -3, vol: 0.08 }],
    df: 520, pads: [{ freq: 246.94, vol: 0.06 }, { freq: 293.66, vol: 0.05 }], pf: 650,
    wv: 0.03, wf: 350,
    notes: [392, 440, 493.88, 587.33, 659.26], ct: [2500, 5500], cc: 0.55,
    bass: { notes: [98, 110, 123.47, 146.83, 164.81], rate: 550, vol: 0.09, fHz: 380 },
    chords: "major_warm", chordRate: 3500,
    arp: "wave", arpRate: 280, arpVol: 0.045, arpOctave: 2,
    rhythm: "basic", rhythmVol: 0.020,
    panSpread: 0.7,
  },
  // ── D minor pentatonic — melancholic, falling leaves ──
  autumn: {
    root: 73.42, // D2
    drones: [{ freq: 73.42, dt: 0, vol: 0.21 }, { freq: 110, dt: 5, vol: 0.13 }, { freq: 146.83, dt: -4, vol: 0.09 }],
    df: 340, pads: [{ freq: 174.61, vol: 0.07 }, { freq: 220, vol: 0.05 }], pf: 480,
    wv: 0.04, wf: 260,
    notes: [293.66, 349.23, 392, 440, 523.25], ct: [4500, 8500], cc: 0.38,
    bass: { notes: [73.42, 87.31, 98, 110, 130.81], rate: 850, vol: 0.08, fHz: 280 },
    chords: "minor_wistful", chordRate: 5000,
    arp: "descending", arpRate: 420, arpVol: 0.035, arpOctave: 2,
    rhythm: "ambient", rhythmVol: 0.018,
    panSpread: 0.6,
  },
  // ── F major pentatonic — fresh, uplifting, spring breeze ──
  spring: {
    root: 87.31, // F2
    drones: [{ freq: 87.31, dt: 0, vol: 0.18 }, { freq: 130.81, dt: 3, vol: 0.11 }, { freq: 174.61, dt: -2, vol: 0.08 }],
    df: 480, pads: [{ freq: 220, vol: 0.06 }, { freq: 261.63, vol: 0.05 }], pf: 600,
    wv: 0.04, wf: 320,
    notes: [349.23, 392, 440, 523.25, 587.33], ct: [2500, 5000], cc: 0.55,
    bass: { notes: [87.31, 98, 110, 130.81, 146.83], rate: 500, vol: 0.09, fHz: 350 },
    chords: "major_bright", chordRate: 3500,
    arp: "ascending", arpRate: 260, arpVol: 0.045, arpOctave: 2,
    rhythm: "basic", rhythmVol: 0.020,
    panSpread: 0.7,
  },
  // ── Eb Lydian — whimsical, dreamy, enchanted ──
  mushroom: {
    root: 77.78, // Eb2
    drones: [{ freq: 77.78, dt: 0, vol: 0.20 }, { freq: 116.54, dt: 5, vol: 0.11 }, { freq: 155.56, dt: -4, vol: 0.09 }],
    df: 470, pads: [{ freq: 196, vol: 0.07 }, { freq: 233.08, vol: 0.06 }], pf: 720,
    wv: 0.02, wf: 350,
    notes: [311.13, 349.23, 392, 466.16, 523.25, 587.33], ct: [3000, 5500], cc: 0.55,
    bass: { notes: [77.78, 87.31, 98, 116.54, 130.81], rate: 600, vol: 0.10, fHz: 350 },
    chords: "lydian_dream", chordRate: 4000,
    arp: "wave", arpRate: 300, arpVol: 0.04, arpOctave: 3,
    rhythm: "ambient", rhythmVol: 0.015,
    panSpread: 0.8,
  },
  // ── Eb minor pentatonic — dark, murky, oppressive ──
  swamp: {
    root: 77.78, // Eb2
    drones: [{ freq: 77.78, dt: 0, vol: 0.24 }, { freq: 116.54, dt: 7, vol: 0.14 }, { freq: 155.56, dt: -5, vol: 0.10 }],
    df: 300, pads: [{ freq: 185, vol: 0.06 }, { freq: 233.08, vol: 0.05 }], pf: 450,
    wv: 0.04, wf: 250,
    notes: [311.13, 370, 415.30, 466.16, 554.37], ct: [5000, 9000], cc: 0.35,
    bass: { notes: [77.78, 92.50, 103.83, 116.54, 138.59], rate: 1000, vol: 0.08, fHz: 250 },
    chords: "minor_dark", chordRate: 5500,
    arp: "sparse", arpRate: 450, arpVol: 0.025, arpOctave: 2,
    rhythm: "ambient", rhythmVol: 0.015,
    panSpread: 0.4,
  },
  // ── A major pentatonic — warm, tropical, paradise ──
  blue_lagoon: {
    root: 110, // A2
    drones: [{ freq: 110, dt: 0, vol: 0.20 }, { freq: 164.81, dt: 4, vol: 0.12 }, { freq: 220, dt: -2, vol: 0.08 }],
    df: 500, pads: [{ freq: 277.18, vol: 0.06 }, { freq: 329.63, vol: 0.05 }], pf: 720,
    wv: 0.05, wf: 380,
    notes: [440, 493.88, 554.37, 659.26, 740], ct: [2500, 5500], cc: 0.55,
    bass: { notes: [110, 123.47, 138.59, 164.81, 185], rate: 540, vol: 0.11, fHz: 400 },
    waves: { vol: 0.05, rate: 3.8 },
    chords: "major_warm", chordRate: 3500,
    arp: "shanty", arpRate: 300, arpVol: 0.04, arpOctave: 2,
    rhythm: "shanty", rhythmVol: 0.025,
    panSpread: 0.7,
  },
};

// ─── HELPER: Convert semitone interval to frequency ratio ───
function semitoneToRatio(semitones) {
  return Math.pow(2, semitones / 12);
}

// ─── DRONE SYNTHESIS (with stereo panning) ───
function createDrone(freq, detune, vol, filterHz, pan) {
  const c = getCtx();
  const osc = c.createOscillator();
  osc.type = "sine";
  osc.frequency.value = freq;
  osc.detune.value = detune;

  // Chorus copy for warmth (~0.3Hz beating)
  const osc2 = c.createOscillator();
  osc2.type = "sine";
  osc2.frequency.value = freq * 1.002;
  osc2.detune.value = detune;

  const gain = c.createGain();
  gain.gain.value = vol;

  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = filterHz || 400;
  filter.Q.value = 1.5;

  // Stereo panning for spatial depth
  const panner = c.createStereoPanner();
  panner.pan.value = pan || 0;

  osc.connect(filter);
  osc2.connect(filter);
  filter.connect(gain);
  gain.connect(panner);
  panner.connect(musicGain);
  osc.start();
  osc2.start();

  // Slow LFO on filter for gentle movement
  const lfo = c.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 0.04 + Math.random() * 0.06;
  const lfoGain = c.createGain();
  lfoGain.gain.value = filterHz ? filterHz * 0.4 : 150;
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);
  lfo.start();

  return { osc, osc2, gain, filter, lfo, lfoGain, panner };
}

// ─── PAD SYNTHESIS (with stereo panning + vibrato) ───
function createPad(baseFreq, vol, filterHz, pan) {
  const c = getCtx();
  const osc1 = c.createOscillator();
  osc1.type = "triangle";
  osc1.frequency.value = baseFreq;

  const osc2 = c.createOscillator();
  osc2.type = "sine";
  osc2.frequency.value = baseFreq * 1.003;

  const gain = c.createGain();
  gain.gain.value = vol;

  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = filterHz || 600;
  filter.Q.value = 1;

  const panner = c.createStereoPanner();
  panner.pan.value = pan || 0;

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(gain);
  gain.connect(panner);
  panner.connect(musicGain);
  osc1.start();
  osc2.start();

  // Slow breathing swell
  const lfo = c.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 0.03 + Math.random() * 0.04;
  const lfoGain = c.createGain();
  lfoGain.gain.value = vol * 0.5;
  lfo.connect(lfoGain);
  lfoGain.connect(gain.gain);
  lfo.start();

  // Gentle vibrato (5-6Hz)
  const vib = c.createOscillator();
  vib.type = "sine";
  vib.frequency.value = 5 + Math.random() * 1.5;
  const vibGain = c.createGain();
  vibGain.gain.value = baseFreq * 0.003;
  vib.connect(vibGain);
  vibGain.connect(osc1.frequency);
  vibGain.connect(osc2.frequency);
  vib.start();

  return { osc1, osc2, gain, filter, lfo, lfoGain, vib, vibGain, panner };
}

// ─── WIND NOISE ───
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

let percTimer = null;

// ─── BASS LINE (enhanced with chord-aware root notes) ───
let bassTimer = null;
function createBassLine(cfg, isNight, chordState) {
  if (!cfg) return null;
  const c = getCtx();
  const vol = cfg.vol * (isNight ? 0.7 : 1);
  const rate = cfg.rate * (isNight ? 1.4 : 1);
  const notes = cfg.notes;
  let noteIdx = 0;
  let stopped = false;

  const panner = c.createStereoPanner();
  panner.pan.value = -0.15; // bass slightly left

  const playNote = () => {
    if (stopped || !musicPlaying || muted) return;
    const now = c.currentTime;

    // Use chord root as primary bass note when available, else cycle through scale
    let freq;
    if (chordState && chordState.currentChordFreqs && Math.random() < 0.6) {
      // 60% chance: play chord root for harmonic grounding
      freq = chordState.currentChordFreqs[0];
      // Ensure bass stays in low range
      while (freq > 150) freq /= 2;
      while (freq < 40) freq *= 2;
    } else {
      freq = notes[noteIdx % notes.length];
      noteIdx++;
    }

    const osc = c.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = freq;
    const osc2 = c.createOscillator();
    osc2.type = "sine";
    osc2.frequency.value = freq * 1.003;

    const f = c.createBiquadFilter(); f.type = "lowpass";
    f.frequency.value = cfg.fHz || 300; f.Q.value = 2;
    const g = c.createGain();
    const dur = rate * 0.001 * 0.8;
    g.gain.setValueAtTime(vol, now);
    g.gain.setValueAtTime(vol * 0.8, now + dur * 0.5);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(f); osc2.connect(f); f.connect(g); g.connect(panner); panner.connect(musicGain);
    osc.start(now); osc2.start(now);
    osc.stop(now + dur + 0.05); osc2.stop(now + dur + 0.05);

    // Rhythmic variation: skip, double, or ghost note
    let nextDelay = rate;
    const r = Math.random();
    if (r < 0.12) nextDelay = rate * 2; // skip: rest
    else if (r < 0.20) nextDelay = rate * 0.5; // double-time
    bassTimer = setTimeout(playNote, nextDelay);
  };

  bassTimer = setTimeout(playNote, Math.random() * rate);

  return {
    stop: () => { stopped = true; },
    disconnect: () => { stopped = true; },
    panner,
  };
}

// ─── SEA WAVES (coastal biomes) ───
function createSeaWaves(cfg) {
  if (!cfg) return null;
  const c = getCtx();
  const bufferSize = c.sampleRate * 4;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const noise = c.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;

  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 350;
  filter.Q.value = 0.3;

  const gain = c.createGain();
  gain.gain.value = cfg.vol;

  // Slow pulsing for wave rhythm
  const lfo = c.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 1 / cfg.rate;
  const lfoGain = c.createGain();
  lfoGain.gain.value = cfg.vol * 0.8;
  lfo.connect(lfoGain);
  lfoGain.connect(gain.gain);

  // Filter sweep for wave crest shimmer
  const lfo2 = c.createOscillator();
  lfo2.type = "sine";
  lfo2.frequency.value = 1 / cfg.rate;
  const lfo2Gain = c.createGain();
  lfo2Gain.gain.value = 200;
  lfo2.connect(lfo2Gain);
  lfo2Gain.connect(filter.frequency);

  // Stereo spread for immersive waves
  const panner = c.createStereoPanner();
  const panLfo = c.createOscillator();
  panLfo.type = "sine";
  panLfo.frequency.value = 0.08; // very slow pan sweep
  const panLfoGain = c.createGain();
  panLfoGain.gain.value = 0.4;
  panLfo.connect(panLfoGain);
  panLfoGain.connect(panner.pan);
  panLfo.start();

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(panner);
  panner.connect(musicGain);
  noise.start();
  lfo.start();
  lfo2.start();

  return { noise, filter, gain, lfo, lfoGain, lfo2, lfo2Gain, panner, panLfo, panLfoGain };
}

// ─── CHORD PROGRESSION ENGINE ───
// Manages timed chord changes, updating drone/pad frequencies smoothly
let chordTimer = null;
function createChordProgression(cfg, isNight) {
  const progName = cfg.chords;
  const progression = CHORD_PROGRESSIONS[progName];
  if (!progression) return null;

  const root = cfg.root;
  const rate = (cfg.chordRate || 4000) * (isNight ? 1.4 : 1);
  let chordIdx = 0;
  let stopped = false;

  // State shared with bass line and arpeggiator
  const state = {
    currentChord: progression[0],
    currentChordFreqs: progression[0].map(s => root * semitoneToRatio(s)),
    chordIdx: 0,
  };

  const advanceChord = () => {
    if (stopped || !musicPlaying || muted) return;
    chordIdx = (chordIdx + 1) % progression.length;
    state.currentChord = progression[chordIdx];
    state.currentChordFreqs = progression[chordIdx].map(s => root * semitoneToRatio(s));
    state.chordIdx = chordIdx;

    // Smoothly glide drone frequencies toward new chord tones
    const c = getCtx();
    const now = c.currentTime;
    const glideTime = 1.5; // smooth 1.5s glide between chords
    musicNodes.forEach(node => {
      if (node._isDrone && node.osc && node._droneIdx !== undefined) {
        const targetFreq = state.currentChordFreqs[node._droneIdx % state.currentChordFreqs.length];
        // Keep drone in same octave range
        let f = targetFreq;
        while (f > node._baseOctaveMax) f /= 2;
        while (f < node._baseOctaveMin) f *= 2;
        node.osc.frequency.setTargetAtTime(f, now, glideTime * 0.3);
        node.osc2.frequency.setTargetAtTime(f * 1.002, now, glideTime * 0.3);
      }
      if (node._isPad && node.osc1 && node._padIdx !== undefined) {
        const chordFreqs = state.currentChordFreqs;
        // Pads play 3rd and 5th of chord (indices 1, 2)
        const targetFreq = chordFreqs[(node._padIdx + 1) % chordFreqs.length];
        let f = targetFreq;
        while (f > node._baseOctaveMax) f /= 2;
        while (f < node._baseOctaveMin) f *= 2;
        node.osc1.frequency.setTargetAtTime(f, now, glideTime * 0.3);
        node.osc2.frequency.setTargetAtTime(f * 1.003, now, glideTime * 0.3);
      }
    });

    chordTimer = setTimeout(advanceChord, rate + (Math.random() - 0.5) * rate * 0.2);
  };

  // Start first chord change after one cycle
  chordTimer = setTimeout(advanceChord, rate);

  return {
    state,
    stop: () => { stopped = true; },
    disconnect: () => { stopped = true; },
  };
}

// ─── ARPEGGIATOR ENGINE ───
// Plays melodic patterns based on current chord, creating musical phrases
let arpTimer = null;

function createArpeggiator(cfg, isNight, chordState) {
  if (!cfg.arp) return null;
  const c = getCtx();
  const pattern = ARPEGGIO_PATTERNS[cfg.arp] || ARPEGGIO_PATTERNS.ascending;
  const rate = (cfg.arpRate || 300) * (isNight ? 1.3 : 1);
  const vol = (cfg.arpVol || 0.04) * (isNight ? 0.5 : 1);
  const octaveUp = cfg.arpOctave || 2;
  let stepIdx = 0;
  let stopped = false;
  let phraseCount = 0;

  const panner = c.createStereoPanner();
  panner.pan.value = 0.25; // arpeggio slightly right

  const playStep = () => {
    if (stopped || !musicPlaying || muted) return;

    const patIdx = pattern[stepIdx % pattern.length];
    stepIdx++;

    // Every 2 patterns, occasionally rest for a full pattern (breathing space)
    if (stepIdx % pattern.length === 0) {
      phraseCount++;
      if (phraseCount % 3 === 0 && Math.random() < 0.4) {
        // Rest for one full pattern duration
        arpTimer = setTimeout(playStep, rate * pattern.length);
        return;
      }
    }

    if (patIdx === -1) {
      // Rest note
      arpTimer = setTimeout(playStep, rate);
      return;
    }

    const now = c.currentTime;
    const chordFreqs = chordState?.currentChordFreqs || [cfg.root * 2, cfg.root * 2.5, cfg.root * 3];

    // Map pattern index to chord tone with octave
    let baseIdx = patIdx % 3; // 0=root, 1=3rd, 2=5th
    let octShift = Math.floor(patIdx / 3); // 3+ = up one octave
    let freq = chordFreqs[baseIdx] * Math.pow(2, octaveUp + octShift);

    // Keep in audible melodic range
    while (freq > 2500) freq /= 2;
    while (freq < 300) freq *= 2;

    // Sine + triangle for bell-like arpeggio tone
    const osc = c.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;

    const osc2 = c.createOscillator();
    osc2.type = "triangle";
    osc2.frequency.value = freq * 2.01; // slight detune for shimmer

    const gain = c.createGain();
    const dur = rate * 0.001 * 2.5; // note sustain
    gain.gain.setValueAtTime(vol, now);
    gain.gain.setValueAtTime(vol * 0.7, now + dur * 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    const gain2 = c.createGain();
    gain2.gain.setValueAtTime(vol * 0.15, now); // overtone quieter
    gain2.gain.exponentialRampToValueAtTime(0.001, now + dur * 0.6);

    const filter = c.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 2500;

    osc.connect(filter);
    osc2.connect(gain2);
    filter.connect(gain);
    gain.connect(panner);
    gain2.connect(panner);
    panner.connect(musicGain);
    osc.start(now);
    osc2.start(now);
    osc.stop(now + dur + 0.1);
    osc2.stop(now + dur * 0.6 + 0.1);

    // Slight swing: alternate steps slightly longer/shorter
    const swing = stepIdx % 2 === 0 ? 1.08 : 0.92;
    arpTimer = setTimeout(playStep, rate * swing);
  };

  // Start after a random offset
  arpTimer = setTimeout(playStep, Math.random() * rate * 2 + rate);

  return {
    stop: () => { stopped = true; },
    disconnect: () => { stopped = true; },
    panner,
  };
}

// ─── RHYTHM / PERCUSSION ENGINE ───
// Synthesized kick drum and hi-hat patterns
let rhythmTimer = null;

function createRhythmSection(cfg, isNight) {
  const rhythmName = cfg.rhythm;
  const rhythmCfg = RHYTHM_PATTERNS[rhythmName];
  if (!rhythmCfg) return null;

  const c = getCtx();
  const vol = (cfg.rhythmVol || 0.02) * (isNight ? 0.5 : 1);
  const stepTime = rhythmCfg.tempo * (isNight ? 1.3 : 1); // seconds per step
  const kickPattern = rhythmCfg.kick;
  const hatPattern = rhythmCfg.hat;
  let step = 0;
  let stopped = false;

  const panner = c.createStereoPanner();
  panner.pan.value = 0; // percussion centered

  const playStep = () => {
    if (stopped || !musicPlaying || muted) return;
    const now = c.currentTime;
    const ki = step % kickPattern.length;
    const hi = step % hatPattern.length;

    // Synthesized kick drum
    if (kickPattern[ki]) {
      const osc = c.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(90, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.12);
      const g = c.createGain();
      g.gain.setValueAtTime(vol * 2.5, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      // Add sub-bass body
      const sub = c.createOscillator();
      sub.type = "sine";
      sub.frequency.value = 50;
      const sg = c.createGain();
      sg.gain.setValueAtTime(vol * 1.5, now);
      sg.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(g); g.connect(panner);
      sub.connect(sg); sg.connect(panner);
      panner.connect(musicGain);
      osc.start(now); osc.stop(now + 0.2);
      sub.start(now); sub.stop(now + 0.1);
    }

    // Synthesized hi-hat (filtered noise burst)
    if (hatPattern[hi]) {
      const bufLen = Math.floor(c.sampleRate * 0.04);
      const buf = c.createBuffer(1, bufLen, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 2);
      const n = c.createBufferSource(); n.buffer = buf;
      const f = c.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 7000;
      const g = c.createGain();
      g.gain.setValueAtTime(vol * 1.2, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      n.connect(f); f.connect(g); g.connect(panner); panner.connect(musicGain);
      n.start(now);
    }

    step++;
    // Subtle humanized timing (±5% variation)
    const humanize = 1 + (Math.random() - 0.5) * 0.1;
    rhythmTimer = setTimeout(playStep, stepTime * 1000 * humanize);
  };

  // Start rhythm
  rhythmTimer = setTimeout(playStep, stepTime * 1000);

  return {
    stop: () => { stopped = true; },
    disconnect: () => { stopped = true; },
    panner,
  };
}

// ─── ENHANCED CHIMES (melodic phrases instead of random single notes) ───
function playBiomeChime(notes, filterHz, chordState) {
  if (!musicPlaying || muted) return;
  const c = getCtx();
  const now = c.currentTime;

  // Pick notes that harmonize with current chord when possible
  let freq;
  if (chordState?.currentChordFreqs && Math.random() < 0.7) {
    const chordFreqs = chordState.currentChordFreqs;
    const pick = chordFreqs[Math.floor(Math.random() * chordFreqs.length)];
    freq = pick;
    // Bring to chime register (octave 4-5)
    while (freq < 350) freq *= 2;
    while (freq > 1200) freq /= 2;
  } else {
    const idx = Math.floor(Math.random() * notes.length);
    freq = notes[idx];
  }

  const panner = c.createStereoPanner();
  panner.pan.value = (Math.random() - 0.5) * 0.8; // random stereo position

  // Main chime note
  const osc = c.createOscillator();
  osc.type = "sine";
  osc.frequency.value = freq * 2;

  const gain = c.createGain();
  gain.gain.setValueAtTime(0.06, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);

  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = Math.min((filterHz || 700) * 3, 3500);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(panner);
  panner.connect(musicGain);
  osc.start(now);
  osc.stop(now + 2.8);

  // 55% chance: harmony note (third or fifth of chord)
  if (Math.random() < 0.55 && chordState?.currentChordFreqs) {
    const harmIdx = Math.random() < 0.5 ? 1 : 2;
    let freq2 = chordState.currentChordFreqs[harmIdx];
    while (freq2 < 350) freq2 *= 2;
    while (freq2 > 1200) freq2 /= 2;

    const osc2 = c.createOscillator();
    osc2.type = "sine";
    osc2.frequency.value = freq2 * 2;
    const g2 = c.createGain();
    g2.gain.setValueAtTime(0.04, now + 0.15);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 2.2);
    osc2.connect(filter);
    osc2.start(now + 0.15);
    osc2.stop(now + 2.5);
  }

  // 25% chance: bell overtone
  if (Math.random() < 0.25) {
    const bell = c.createOscillator();
    bell.type = "sine";
    bell.frequency.value = freq * 4;
    const bg = c.createGain();
    bg.gain.setValueAtTime(0.02, now + 0.05);
    bg.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    bell.connect(filter);
    bell.start(now + 0.05);
    bell.stop(now + 1.5);
  }

  // 20% chance: play a second chime after a short delay (mini-phrase)
  if (Math.random() < 0.2) {
    const delay = 0.3 + Math.random() * 0.4;
    const osc3 = c.createOscillator();
    osc3.type = "sine";
    let freq3 = freq * (Math.random() < 0.5 ? 1.5 : 1.25); // fifth or fourth up
    if (freq3 > 2000) freq3 /= 2;
    osc3.frequency.value = freq3;
    const g3 = c.createGain();
    g3.gain.setValueAtTime(0.035, now + delay);
    g3.gain.exponentialRampToValueAtTime(0.001, now + delay + 1.8);
    osc3.connect(filter);
    osc3.start(now + delay);
    osc3.stop(now + delay + 2.0);
  }
}

// ─── CREATE ALL BIOME NODES (main orchestrator) ───
function _createBiomeNodes(biomeId, isNight) {
  const cfg = BIOME_MUSIC[biomeId];
  if (!cfg) return;

  const nm = isNight ? 0.65 : 1;
  const spread = cfg.panSpread || 0.5;

  // Start chord progression engine
  const chordNode = createChordProgression(cfg, isNight);
  if (chordNode) musicNodes.push(chordNode);
  const chordState = chordNode?.state || null;

  // Drones with stereo spread and chord tracking metadata
  cfg.drones.forEach((d, i) => {
    const panPos = (i / (cfg.drones.length - 1 || 1) - 0.5) * spread * 2;
    const node = createDrone(d.freq, d.dt, d.vol, cfg.df * nm, panPos);
    // Tag for chord progression frequency gliding
    node._isDrone = true;
    node._droneIdx = i;
    node._baseOctaveMin = d.freq * 0.6;
    node._baseOctaveMax = d.freq * 1.7;
    musicNodes.push(node);
  });

  // Pads with wider stereo spread
  cfg.pads.forEach((p, i) => {
    const panPos = (i % 2 === 0 ? -1 : 1) * spread * 0.8;
    const node = createPad(p.freq, p.vol, cfg.pf * nm, panPos);
    node._isPad = true;
    node._padIdx = i;
    node._baseOctaveMin = p.freq * 0.6;
    node._baseOctaveMax = p.freq * 1.7;
    musicNodes.push(node);
  });

  // Ambient wind noise
  musicNodes.push(createWindNoise(cfg.wv * (isNight ? 1.5 : 1), cfg.wf * nm));

  // Bass line (chord-aware)
  if (cfg.bass) {
    const bassNode = createBassLine(cfg.bass, isNight, chordState);
    if (bassNode) musicNodes.push(bassNode);
  }

  // Sea waves for coastal biomes
  if (cfg.waves) {
    const waveNode = createSeaWaves(cfg.waves);
    if (waveNode) musicNodes.push(waveNode);
  }

  // Arpeggiator (chord-aware melodic patterns)
  const arpNode = createArpeggiator(cfg, isNight, chordState);
  if (arpNode) musicNodes.push(arpNode);

  // Rhythm section (subtle percussion)
  const rhythmNode = createRhythmSection(cfg, isNight);
  if (rhythmNode) musicNodes.push(rhythmNode);

  // Scheduled chimes (chord-aware)
  const [minT, maxT] = cfg.ct;
  const tmul = isNight ? 1.5 : 1;
  const chance = cfg.cc * (isNight ? 0.6 : 1);
  const fHz = cfg.pf * nm;

  const scheduleChime = () => {
    const interval = (minT + Math.random() * (maxT - minT)) * tmul;
    chimeTimer = setTimeout(() => {
      if (musicPlaying && !muted && Math.random() < chance) {
        playBiomeChime(cfg.notes, fHz, chordState);
      }
      if (musicPlaying) scheduleChime();
    }, interval);
  };
  scheduleChime();
}

// ─── STOP ALL MUSIC NODES ───
function _stopAllNodes() {
  musicNodes.forEach(node => {
    if (node && typeof node.stop === "function" && !node.frequency) {
      try { node.stop(); } catch (_) {}
    }
    Object.values(node).forEach(n => {
      if (n && typeof n.stop === "function") try { n.stop(); } catch (_) {}
      if (n && typeof n.disconnect === "function") try { n.disconnect(); } catch (_) {}
    });
  });
  musicNodes = [];
  if (chimeTimer) { clearTimeout(chimeTimer); chimeTimer = null; }
  if (percTimer) { clearTimeout(percTimer); percTimer = null; }
  if (bassTimer) { clearTimeout(bassTimer); bassTimer = null; }
  if (chordTimer) { clearTimeout(chordTimer); chordTimer = null; }
  if (arpTimer) { clearTimeout(arpTimer); arpTimer = null; }
  if (rhythmTimer) { clearTimeout(rhythmTimer); rhythmTimer = null; }
}

// ─── PUBLIC API ───

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
    // Crossfade: fade out old, swap to new
    musicGain.gain.setTargetAtTime(0, now, 0.25);
    const oldNodes = [...musicNodes];
    musicNodes = [];
    if (chimeTimer) { clearTimeout(chimeTimer); chimeTimer = null; }
    if (chordTimer) { clearTimeout(chordTimer); chordTimer = null; }
    if (arpTimer) { clearTimeout(arpTimer); arpTimer = null; }
    if (rhythmTimer) { clearTimeout(rhythmTimer); rhythmTimer = null; }

    setTimeout(() => {
      oldNodes.forEach(node => {
        if (node && typeof node.stop === "function" && !node.frequency) {
          try { node.stop(); } catch (_) {}
        }
        Object.values(node).forEach(n => {
          if (n && typeof n.stop === "function") try { n.stop(); } catch (_) {}
          if (n && typeof n.disconnect === "function") try { n.disconnect(); } catch (_) {}
        });
      });
      currentBiomeId = biomeId;
      currentNight = isNight;
      _createBiomeNodes(biomeId, isNight);
      musicGain.gain.setTargetAtTime(0.35, c.currentTime, 0.35);
    }, 600); // slightly longer crossfade for smoother transition
  } else {
    currentBiomeId = biomeId;
    currentNight = isNight;
    _createBiomeNodes(biomeId, isNight);
  }
}

// Combat intensity system: smoothly transitions music between exploration and combat
// intensity: 0 = calm exploration, 1 = full combat
export function setMusicCombatIntensity(intensity) {
  combatIntensity = Math.max(0, Math.min(1, intensity));
  if (!ctx || !combatFilterNode || !combatGainNode) return;
  const now = ctx.currentTime;
  // Open up filter during combat (800Hz calm → 3500Hz combat)
  const targetFreq = 800 + combatIntensity * 2700;
  combatFilterNode.frequency.setTargetAtTime(targetFreq, now, 0.5);
  // Slight volume boost during combat
  const targetGain = 1.0 + combatIntensity * 0.15;
  combatGainNode.gain.setTargetAtTime(targetGain, now, 0.3);
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
    // Heavy wood thud - ship cabin door
    const osc = c.createOscillator(); osc.type = "sine";
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.3);
    const g = c.createGain(); g.gain.setValueAtTime(0.45, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(g); g.connect(dest);
    osc.start(now); osc.stop(now + 0.45);
    // Creaky wooden hinge
    const crkLen = Math.floor(c.sampleRate * 0.35);
    const crkBuf = c.createBuffer(1, crkLen, c.sampleRate);
    const crkD = crkBuf.getChannelData(0);
    for (let i = 0; i < crkLen; i++) crkD[i] = Math.sin(i * 0.18) * Math.sin(i * 0.04) * (1 - i / crkLen) * 0.8;
    const crkN = c.createBufferSource(); crkN.buffer = crkBuf;
    const crkF = c.createBiquadFilter(); crkF.type = "bandpass"; crkF.frequency.value = 900; crkF.Q.value = 4;
    const crkG = c.createGain(); crkG.gain.setValueAtTime(0.2, now); crkG.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    crkN.connect(crkF); crkF.connect(crkG); crkG.connect(dest); crkN.start(now);
    // Iron latch clank
    const latch = c.createOscillator(); latch.type = "square";
    latch.frequency.setValueAtTime(500, now + 0.1); latch.frequency.exponentialRampToValueAtTime(200, now + 0.18);
    const lf = c.createBiquadFilter(); lf.type = "bandpass"; lf.frequency.value = 800; lf.Q.value = 3;
    const lg = c.createGain(); lg.gain.setValueAtTime(0.12, now + 0.1);
    lg.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    latch.connect(lf); lf.connect(lg); lg.connect(dest);
    latch.start(now + 0.1); latch.stop(now + 0.22);
    // Wood scrape
    const osc2 = c.createOscillator(); osc2.type = "sawtooth"; osc2.frequency.value = 70;
    const f2 = c.createBiquadFilter(); f2.type = "lowpass"; f2.frequency.value = 220;
    const g3 = c.createGain(); g3.gain.setValueAtTime(0.10, now + 0.05); g3.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
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
    // Fuse sizzle - gunpowder hiss before the boom
    const fizLen = Math.floor(c.sampleRate * 0.2);
    const fizBuf = c.createBuffer(1, fizLen, c.sampleRate);
    const fizD = fizBuf.getChannelData(0);
    for (let i = 0; i < fizLen; i++) fizD[i] = (Math.random() * 2 - 1) * Math.pow(i / fizLen, 1.5) * 0.6;
    const fizN = c.createBufferSource(); fizN.buffer = fizBuf;
    const fizF = c.createBiquadFilter(); fizF.type = "highpass"; fizF.frequency.value = 3000;
    const fizG = c.createGain(); fizG.gain.setValueAtTime(0.15, now); fizG.gain.exponentialRampToValueAtTime(0.3, now + 0.15);
    fizG.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    fizN.connect(fizF); fizF.connect(fizG); fizG.connect(dest); fizN.start(now);
    // Whoosh buildup
    const buf = c.createBuffer(1, c.sampleRate * 0.3, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(i / d.length, 2);
    const n = c.createBufferSource(); n.buffer = buf;
    const f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 600; f.Q.value = 1.5;
    const g = c.createGain(); g.gain.setValueAtTime(0.35, now + 0.05); g.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    n.connect(f); f.connect(g); g.connect(dest); n.start(now + 0.05);
    // BOOM - layered explosion
    const buf2 = c.createBuffer(1, c.sampleRate * 0.6, c.sampleRate);
    const d2 = buf2.getChannelData(0);
    for (let i = 0; i < d2.length; i++) d2[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d2.length, 1.2);
    const n2 = c.createBufferSource(); n2.buffer = buf2;
    const f2 = c.createBiquadFilter(); f2.type = "lowpass"; f2.frequency.value = 900;
    const g2 = c.createGain(); g2.gain.setValueAtTime(0.5, now + 0.2); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
    n2.connect(f2); f2.connect(g2); g2.connect(dest); n2.start(now + 0.2);
    // Deep cannon bass boom
    const bass = c.createOscillator(); bass.type = "sine";
    bass.frequency.setValueAtTime(120, now + 0.2); bass.frequency.exponentialRampToValueAtTime(20, now + 0.65);
    const bg = c.createGain(); bg.gain.setValueAtTime(0.45, now + 0.2); bg.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    bass.connect(bg); bg.connect(dest); bass.start(now + 0.2); bass.stop(now + 0.75);
    // Crackle tail - debris
    const crkLen = Math.floor(c.sampleRate * 0.3);
    const crkBuf = c.createBuffer(1, crkLen, c.sampleRate);
    const crkD = crkBuf.getChannelData(0);
    for (let i = 0; i < crkLen; i++) crkD[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / crkLen, 3) * 0.5;
    const crkN = c.createBufferSource(); crkN.buffer = crkBuf;
    const crkF = c.createBiquadFilter(); crkF.type = "bandpass"; crkF.frequency.value = 2000; crkF.Q.value = 2;
    const crkG = c.createGain(); crkG.gain.setValueAtTime(0.12, now + 0.35); crkG.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    crkN.connect(crkF); crkF.connect(crkG); crkG.connect(dest); crkN.start(now + 0.35);
  });
}

export function sfxLightning() {
  playSfx((c, now, dest) => {
    // Musket CRACK - sharp percussive hit
    const buf = c.createBuffer(1, Math.floor(c.sampleRate * 0.03), c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
    const n = c.createBufferSource(); n.buffer = buf;
    const f = c.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 1200;
    const g = c.createGain(); g.gain.setValueAtTime(0.8, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    n.connect(f); f.connect(g); g.connect(dest); n.start(now);
    // Body punch - mid frequency impact
    const osc = c.createOscillator(); osc.type = "square";
    osc.frequency.setValueAtTime(400, now); osc.frequency.exponentialRampToValueAtTime(100, now + 0.06);
    const og = c.createGain(); og.gain.setValueAtTime(0.3, now); og.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    const of2 = c.createBiquadFilter(); of2.type = "bandpass"; of2.frequency.value = 500; of2.Q.value = 2;
    osc.connect(of2); of2.connect(og); og.connect(dest); osc.start(now); osc.stop(now + 0.1);
    // Gunpowder sizzle tail
    const buf2 = c.createBuffer(1, Math.floor(c.sampleRate * 0.25), c.sampleRate);
    const d2 = buf2.getChannelData(0);
    for (let i = 0; i < d2.length; i++) d2[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d2.length, 3);
    const n2 = c.createBufferSource(); n2.buffer = buf2;
    const f2 = c.createBiquadFilter(); f2.type = "bandpass"; f2.frequency.value = 1800; f2.Q.value = 1.5;
    const g2 = c.createGain(); g2.gain.setValueAtTime(0.18, now + 0.03); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    n2.connect(f2); f2.connect(g2); g2.connect(dest); n2.start(now + 0.03);
    // Brief reverb echo
    const buf3 = c.createBuffer(1, Math.floor(c.sampleRate * 0.15), c.sampleRate);
    const d3 = buf3.getChannelData(0);
    for (let i = 0; i < d3.length; i++) d3[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d3.length, 5);
    const n3 = c.createBufferSource(); n3.buffer = buf3;
    const f3 = c.createBiquadFilter(); f3.type = "lowpass"; f3.frequency.value = 600;
    const g3 = c.createGain(); g3.gain.setValueAtTime(0.1, now + 0.06); g3.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    n3.connect(f3); f3.connect(g3); g3.connect(dest); n3.start(now + 0.06);
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
    // Impact hit
    const hitBuf = c.createBuffer(1, Math.floor(c.sampleRate * 0.05), c.sampleRate);
    const hitD = hitBuf.getChannelData(0);
    for (let i = 0; i < hitD.length; i++) hitD[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / hitD.length, 1.5);
    const hitN = c.createBufferSource(); hitN.buffer = hitBuf;
    const hitG = c.createGain(); hitG.gain.setValueAtTime(0.25, now); hitG.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    hitN.connect(hitG); hitG.connect(dest); hitN.start(now);
    // Descending death cry
    const osc = c.createOscillator(); osc.type = "sawtooth";
    osc.frequency.setValueAtTime(500, now); osc.frequency.exponentialRampToValueAtTime(50, now + 0.5);
    const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 600;
    const g = c.createGain(); g.gain.setValueAtTime(0.22, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc.connect(f); f.connect(g); g.connect(dest); osc.start(now); osc.stop(now + 0.6);
    // Body thud
    const bass = c.createOscillator(); bass.type = "sine";
    bass.frequency.setValueAtTime(100, now + 0.1); bass.frequency.exponentialRampToValueAtTime(30, now + 0.3);
    const bg = c.createGain(); bg.gain.setValueAtTime(0.2, now + 0.1); bg.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    bass.connect(bg); bg.connect(dest); bass.start(now + 0.1); bass.stop(now + 0.4);
    // Scatter/poof
    const buf = c.createBuffer(1, Math.floor(c.sampleRate * 0.2), c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
    const n = c.createBufferSource(); n.buffer = buf;
    const f2 = c.createBiquadFilter(); f2.type = "lowpass"; f2.frequency.value = 1200;
    const g2 = c.createGain(); g2.gain.setValueAtTime(0.15, now + 0.15); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    n.connect(f2); f2.connect(g2); g2.connect(dest); n.start(now + 0.15);
  });
}

export function sfxMeleeHit() {
  playSfx((c, now, dest) => {
    // Cutlass CLANG - metallic ring
    const osc = c.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(900, now);
    osc.frequency.exponentialRampToValueAtTime(350, now + 0.08);
    const f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 1400; f.Q.value = 4;
    const g = c.createGain();
    g.gain.setValueAtTime(0.22, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(f); f.connect(g); g.connect(dest);
    osc.start(now); osc.stop(now + 0.14);
    // Flesh/armor impact thud
    const bass = c.createOscillator(); bass.type = "sine";
    bass.frequency.setValueAtTime(180, now);
    bass.frequency.exponentialRampToValueAtTime(40, now + 0.12);
    const bg = c.createGain(); bg.gain.setValueAtTime(0.25, now);
    bg.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    bass.connect(bg); bg.connect(dest); bass.start(now); bass.stop(now + 0.18);
    // Quick metallic spark
    const spkLen = Math.floor(c.sampleRate * 0.04);
    const spkBuf = c.createBuffer(1, spkLen, c.sampleRate);
    const spkD = spkBuf.getChannelData(0);
    for (let i = 0; i < spkLen; i++) spkD[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / spkLen, 1.5);
    const spkN = c.createBufferSource(); spkN.buffer = spkBuf;
    const f2 = c.createBiquadFilter(); f2.type = "highpass"; f2.frequency.value = 3000;
    const g2 = c.createGain(); g2.gain.setValueAtTime(0.15, now); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    spkN.connect(f2); f2.connect(g2); g2.connect(dest); spkN.start(now);
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
    // Cannonball SLAM - initial crack
    const crkLen = Math.floor(c.sampleRate * 0.04);
    const crkBuf = c.createBuffer(1, crkLen, c.sampleRate);
    const crkD = crkBuf.getChannelData(0);
    for (let i = 0; i < crkLen; i++) crkD[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / crkLen, 1.5);
    const crkN = c.createBufferSource(); crkN.buffer = crkBuf;
    const crkG = c.createGain(); crkG.gain.setValueAtTime(0.6, now); crkG.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    crkN.connect(crkG); crkG.connect(dest); crkN.start(now);
    // Deep cannon bass boom
    const bass = c.createOscillator(); bass.type = "sine";
    bass.frequency.setValueAtTime(80, now); bass.frequency.exponentialRampToValueAtTime(15, now + 0.6);
    const bg = c.createGain(); bg.gain.setValueAtTime(0.45, now); bg.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    bass.connect(bg); bg.connect(dest); bass.start(now); bass.stop(now + 0.7);
    // Sub-bass thump
    const sub = c.createOscillator(); sub.type = "sine";
    sub.frequency.setValueAtTime(40, now); sub.frequency.exponentialRampToValueAtTime(12, now + 0.4);
    const sg = c.createGain(); sg.gain.setValueAtTime(0.3, now); sg.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    sub.connect(sg); sg.connect(dest); sub.start(now); sub.stop(now + 0.5);
    // Impact debris
    const buf = c.createBuffer(1, Math.floor(c.sampleRate * 0.5), c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 1.8);
    const n = c.createBufferSource(); n.buffer = buf;
    const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 400;
    const g2 = c.createGain(); g2.gain.setValueAtTime(0.25, now + 0.03); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    n.connect(f); f.connect(g2); g2.connect(dest); n.start(now + 0.03);
    // Metallic ring echo
    const ring = c.createOscillator(); ring.type = "triangle";
    ring.frequency.setValueAtTime(300, now + 0.05); ring.frequency.exponentialRampToValueAtTime(150, now + 0.3);
    const rg = c.createGain(); rg.gain.setValueAtTime(0.1, now + 0.05); rg.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    ring.connect(rg); rg.connect(dest); ring.start(now + 0.05); ring.stop(now + 0.4);
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
    // Coin jingle - lots of gold
    [0, 0.05, 0.1, 0.15, 0.2, 0.26].forEach((delay, i) => {
      const osc = c.createOscillator(); osc.type = "sine";
      osc.frequency.setValueAtTime(2400 + (i % 3) * 500, now + delay);
      osc.frequency.exponentialRampToValueAtTime(1400, now + delay + 0.05);
      const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 3500; bp.Q.value = 5;
      const g = c.createGain(); g.gain.setValueAtTime(0.10, now + delay);
      g.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.08);
      osc.connect(bp); bp.connect(g); g.connect(dest);
      osc.start(now + delay); osc.stop(now + delay + 0.1);
    });
    // Welcoming accordion-like horn (pirate trader)
    const horn = c.createOscillator(); horn.type = "sawtooth"; horn.frequency.value = 330;
    const horn2 = c.createOscillator(); horn2.type = "sawtooth"; horn2.frequency.value = 415; // major third
    const hf = c.createBiquadFilter(); hf.type = "lowpass"; hf.frequency.value = 600; hf.Q.value = 1.5;
    const hg = c.createGain(); hg.gain.setValueAtTime(0, now + 0.25);
    hg.gain.linearRampToValueAtTime(0.10, now + 0.35);
    hg.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
    horn.connect(hf); horn2.connect(hf); hf.connect(hg); hg.connect(dest);
    horn.start(now + 0.25); horn2.start(now + 0.25);
    horn.stop(now + 0.8); horn2.stop(now + 0.8);
    // "Ahoy!" whistle
    const whistle = c.createOscillator(); whistle.type = "sine";
    whistle.frequency.setValueAtTime(800, now + 0.3);
    whistle.frequency.linearRampToValueAtTime(1200, now + 0.4);
    whistle.frequency.linearRampToValueAtTime(900, now + 0.5);
    const wg = c.createGain(); wg.gain.setValueAtTime(0, now + 0.3);
    wg.gain.linearRampToValueAtTime(0.06, now + 0.35);
    wg.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    whistle.connect(wg); wg.connect(dest);
    whistle.start(now + 0.3); whistle.stop(now + 0.6);
  });
}

export function sfxAmbush() {
  playSfx((c, now, dest) => {
    // Battle drum hits - rapid war drums
    [0, 0.12, 0.24].forEach((delay, i) => {
      const osc = c.createOscillator(); osc.type = "sine";
      osc.frequency.setValueAtTime(120, now + delay); osc.frequency.exponentialRampToValueAtTime(40, now + delay + 0.12);
      const g = c.createGain(); g.gain.setValueAtTime(0.25, now + delay);
      g.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.15);
      osc.connect(g); g.connect(dest); osc.start(now + delay); osc.stop(now + delay + 0.18);
    });
    // Alarm brass stab – rapid descending
    [0, 0.08, 0.16].forEach((delay, i) => {
      const osc = c.createOscillator(); osc.type = "sawtooth";
      osc.frequency.setValueAtTime(700 - i * 120, now + delay);
      osc.frequency.exponentialRampToValueAtTime(200, now + delay + 0.1);
      const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 1400;
      const g = c.createGain(); g.gain.setValueAtTime(0.22, now + delay);
      g.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.12);
      osc.connect(f); f.connect(g); g.connect(dest);
      osc.start(now + delay); osc.stop(now + delay + 0.15);
    });
    // Sword slash noise burst
    const buf = c.createBuffer(1, Math.floor(c.sampleRate * 0.15), c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1);
    const noise = c.createBufferSource(); noise.buffer = buf;
    const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 4000; bp.Q.value = 3;
    const gn = c.createGain(); gn.gain.setValueAtTime(0.25, now + 0.2);
    gn.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    noise.connect(bp); bp.connect(gn); gn.connect(dest);
    noise.start(now + 0.2); noise.stop(now + 0.4);
    // Danger low drone
    const drone = c.createOscillator(); drone.type = "sawtooth"; drone.frequency.value = 55;
    const df = c.createBiquadFilter(); df.type = "lowpass"; df.frequency.value = 150;
    const dg = c.createGain(); dg.gain.setValueAtTime(0, now + 0.3);
    dg.gain.linearRampToValueAtTime(0.12, now + 0.4);
    dg.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    drone.connect(df); df.connect(dg); dg.connect(dest);
    drone.start(now + 0.3); drone.stop(now + 0.85);
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
    // First horn blast - deep pirate war horn
    const horn = c.createOscillator(); horn.type = "sawtooth";
    horn.frequency.setValueAtTime(95, now);
    horn.frequency.linearRampToValueAtTime(115, now + 0.3);
    horn.frequency.linearRampToValueAtTime(110, now + 0.8);
    const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 450; f.Q.value = 1.5;
    const g = c.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.25, now + 0.12);
    g.gain.setValueAtTime(0.25, now + 0.5);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.9);
    horn.connect(f); f.connect(g); g.connect(dest);
    horn.start(now); horn.stop(now + 0.95);
    // Second harmonic - richer brass
    const h2 = c.createOscillator(); h2.type = "sawtooth"; h2.frequency.value = 165;
    const g2 = c.createGain();
    g2.gain.setValueAtTime(0, now + 0.03);
    g2.gain.linearRampToValueAtTime(0.10, now + 0.15);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
    h2.connect(f); h2.start(now + 0.03); h2.stop(now + 0.9);
    // Third harmonic for richness
    const h3 = c.createOscillator(); h3.type = "triangle"; h3.frequency.value = 220;
    const g3 = c.createGain();
    g3.gain.setValueAtTime(0, now + 0.05);
    g3.gain.linearRampToValueAtTime(0.05, now + 0.2);
    g3.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
    h3.connect(f); h3.start(now + 0.05); h3.stop(now + 0.8);
    // Second horn blast (echo/answer) - higher
    const horn2 = c.createOscillator(); horn2.type = "sawtooth";
    horn2.frequency.setValueAtTime(130, now + 1.0);
    horn2.frequency.linearRampToValueAtTime(145, now + 1.3);
    horn2.frequency.linearRampToValueAtTime(130, now + 1.7);
    const f2 = c.createBiquadFilter(); f2.type = "lowpass"; f2.frequency.value = 500; f2.Q.value = 1;
    const g4 = c.createGain();
    g4.gain.setValueAtTime(0, now + 1.0);
    g4.gain.linearRampToValueAtTime(0.18, now + 1.1);
    g4.gain.setValueAtTime(0.18, now + 1.4);
    g4.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
    horn2.connect(f2); f2.connect(g4); g4.connect(dest);
    horn2.start(now + 1.0); horn2.stop(now + 1.85);
    // Reverb tail - wind-like echo
    const revLen = Math.floor(c.sampleRate * 0.8);
    const revBuf = c.createBuffer(1, revLen, c.sampleRate);
    const revD = revBuf.getChannelData(0);
    for (let i = 0; i < revLen; i++) revD[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / revLen, 3);
    const revN = c.createBufferSource(); revN.buffer = revBuf;
    const revF = c.createBiquadFilter(); revF.type = "bandpass"; revF.frequency.value = 250; revF.Q.value = 0.5;
    const revG = c.createGain(); revG.gain.setValueAtTime(0.08, now + 1.6); revG.gain.exponentialRampToValueAtTime(0.001, now + 2.3);
    revN.connect(revF); revF.connect(revG); revG.connect(dest); revN.start(now + 1.6);
  });
}

export function sfxWaveComplete() {
  playSfx((c, now, dest) => {
    // Bright ascending 4-note pirate arpeggio
    [392, 523, 659, 784, 1047].forEach((freq, i) => {
      const delay = i * 0.09;
      const osc = c.createOscillator(); osc.type = "sine"; osc.frequency.value = freq;
      const g = c.createGain(); g.gain.setValueAtTime(0.22, now + delay);
      g.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.35);
      osc.connect(g); g.connect(dest);
      osc.start(now + delay); osc.stop(now + delay + 0.4);
    });
    // Cymbal accent
    const cymLen = Math.floor(c.sampleRate * 0.3);
    const cymBuf = c.createBuffer(1, cymLen, c.sampleRate);
    const cymD = cymBuf.getChannelData(0);
    for (let i = 0; i < cymLen; i++) cymD[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / cymLen, 3);
    const cymN = c.createBufferSource(); cymN.buffer = cymBuf;
    const cymF = c.createBiquadFilter(); cymF.type = "highpass"; cymF.frequency.value = 5000;
    const cymG = c.createGain(); cymG.gain.setValueAtTime(0.1, now + 0.35);
    cymG.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    cymN.connect(cymF); cymF.connect(cymG); cymG.connect(dest); cymN.start(now + 0.35);
    // Bass drum accent
    const kick = c.createOscillator(); kick.type = "sine";
    kick.frequency.setValueAtTime(100, now + 0.35); kick.frequency.exponentialRampToValueAtTime(40, now + 0.5);
    const kg = c.createGain(); kg.gain.setValueAtTime(0.2, now + 0.35); kg.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    kick.connect(kg); kg.connect(dest); kick.start(now + 0.35); kick.stop(now + 0.55);
  });
}

export function sfxVictoryFanfare() {
  playSfx((c, now, dest) => {
    // Drum roll intro
    for (let i = 0; i < 6; i++) {
      const t = now + i * 0.08;
      const dLen = Math.floor(c.sampleRate * 0.04);
      const dBuf = c.createBuffer(1, dLen, c.sampleRate);
      const dD = dBuf.getChannelData(0);
      for (let j = 0; j < dLen; j++) dD[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / dLen, 2);
      const dN = c.createBufferSource(); dN.buffer = dBuf;
      const dF = c.createBiquadFilter(); dF.type = "bandpass"; dF.frequency.value = 2500; dF.Q.value = 1;
      const dG = c.createGain(); dG.gain.setValueAtTime(0.08 + i * 0.02, t);
      dG.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      dN.connect(dF); dF.connect(dG); dG.connect(dest); dN.start(t);
    }
    // Triumphant brass fanfare - ascending pirate melody
    const melodyFreqs = [262, 330, 392, 523, 659];
    melodyFreqs.forEach((freq, i) => {
      const delay = 0.5 + i * 0.12;
      const osc = c.createOscillator(); osc.type = "sawtooth"; osc.frequency.value = freq;
      const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 900; f.Q.value = 1.5;
      const g = c.createGain();
      g.gain.setValueAtTime(0.18, now + delay);
      g.gain.setValueAtTime(0.18, now + delay + 0.4);
      g.gain.exponentialRampToValueAtTime(0.001, now + delay + 1.0);
      osc.connect(f); f.connect(g); g.connect(dest);
      osc.start(now + delay); osc.stop(now + delay + 1.05);
    });
    // Full brass chord hold at the end
    [262, 330, 392, 523].forEach(freq => {
      const osc = c.createOscillator(); osc.type = "sawtooth"; osc.frequency.value = freq;
      const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 700;
      const g = c.createGain();
      g.gain.setValueAtTime(0, now + 1.1);
      g.gain.linearRampToValueAtTime(0.12, now + 1.25);
      g.gain.setValueAtTime(0.12, now + 1.8);
      g.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
      osc.connect(f); f.connect(g); g.connect(dest);
      osc.start(now + 1.1); osc.stop(now + 2.55);
    });
    // Celebratory cymbal crash
    const cymLen = Math.floor(c.sampleRate * 1.0);
    const cymBuf = c.createBuffer(1, cymLen, c.sampleRate);
    const cymD = cymBuf.getChannelData(0);
    for (let i = 0; i < cymLen; i++) cymD[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / cymLen, 2.5);
    const cymN = c.createBufferSource(); cymN.buffer = cymBuf;
    const cymF = c.createBiquadFilter(); cymF.type = "highpass"; cymF.frequency.value = 4000;
    const cymG = c.createGain(); cymG.gain.setValueAtTime(0.15, now + 1.1);
    cymG.gain.exponentialRampToValueAtTime(0.001, now + 2.0);
    cymN.connect(cymF); cymF.connect(cymG); cymG.connect(dest); cymN.start(now + 1.1);
    // Bass drum hit
    const bassD = c.createOscillator(); bassD.type = "sine";
    bassD.frequency.setValueAtTime(100, now + 1.1); bassD.frequency.exponentialRampToValueAtTime(30, now + 1.5);
    const bdg = c.createGain(); bdg.gain.setValueAtTime(0.3, now + 1.1); bdg.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
    bassD.connect(bdg); bdg.connect(dest); bassD.start(now + 1.1); bassD.stop(now + 1.55);
  });
}

export function sfxCaravanHit() {
  playSfx((c, now, dest) => {
    // Heavy wood impact
    const impOsc = c.createOscillator(); impOsc.type = "sine";
    impOsc.frequency.setValueAtTime(180, now); impOsc.frequency.exponentialRampToValueAtTime(50, now + 0.15);
    const impG = c.createGain(); impG.gain.setValueAtTime(0.35, now); impG.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    impOsc.connect(impG); impG.connect(dest); impOsc.start(now); impOsc.stop(now + 0.25);
    // Wood cracking/splintering
    const crkLen = Math.floor(c.sampleRate * 0.15);
    const crkBuf = c.createBuffer(1, crkLen, c.sampleRate);
    const crkD = crkBuf.getChannelData(0);
    for (let i = 0; i < crkLen; i++) {
      const env = Math.exp(-i / (c.sampleRate * 0.04));
      crkD[i] = (Math.random() * 2 - 1) * env;
    }
    const crkN = c.createBufferSource(); crkN.buffer = crkBuf;
    const crkF = c.createBiquadFilter(); crkF.type = "bandpass"; crkF.frequency.value = 1800; crkF.Q.value = 2;
    const crkG = c.createGain(); crkG.gain.setValueAtTime(0.22, now);
    crkG.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    crkN.connect(crkF); crkF.connect(crkG); crkG.connect(dest); crkN.start(now);
    // Metallic ring (nail/iron bands)
    const ring = c.createOscillator(); ring.type = "square";
    ring.frequency.setValueAtTime(600, now + 0.02); ring.frequency.exponentialRampToValueAtTime(200, now + 0.1);
    const rf = c.createBiquadFilter(); rf.type = "bandpass"; rf.frequency.value = 1200; rf.Q.value = 3;
    const rg = c.createGain(); rg.gain.setValueAtTime(0.1, now + 0.02);
    rg.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    ring.connect(rf); rf.connect(rg); rg.connect(dest); ring.start(now + 0.02); ring.stop(now + 0.15);
    // Wood debris scatter
    const debLen = Math.floor(c.sampleRate * 0.2);
    const debBuf = c.createBuffer(1, debLen, c.sampleRate);
    const debD = debBuf.getChannelData(0);
    for (let i = 0; i < debLen; i++) debD[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / debLen, 2.5) * 0.4;
    const debN = c.createBufferSource(); debN.buffer = debBuf;
    const debF = c.createBiquadFilter(); debF.type = "bandpass"; debF.frequency.value = 3000; debF.Q.value = 0.5;
    const debG = c.createGain(); debG.gain.setValueAtTime(0.1, now + 0.08);
    debG.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    debN.connect(debF); debF.connect(debG); debG.connect(dest); debN.start(now + 0.08);
  });
}

// ─── WEATHER SFX ───

export function sfxWeather(weatherId) {
  playSfx((c, now, dest) => {
    switch (weatherId) {
      case "storm": {
        // Lightning CRACK - bright snap
        const crkLen = Math.floor(c.sampleRate * 0.03);
        const crkBuf = c.createBuffer(1, crkLen, c.sampleRate);
        const crkD = crkBuf.getChannelData(0);
        for (let i = 0; i < crkLen; i++) crkD[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / crkLen, 1.5);
        const crkN = c.createBufferSource(); crkN.buffer = crkBuf;
        const crkG = c.createGain(); crkG.gain.setValueAtTime(0.35, now); crkG.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        crkN.connect(crkG); crkG.connect(dest); crkN.start(now);
        // Rolling thunder
        const thLen = Math.floor(c.sampleRate * 2.0);
        const thBuf = c.createBuffer(1, thLen, c.sampleRate);
        const thD = thBuf.getChannelData(0);
        for (let i = 0; i < thLen; i++) {
          const env = i < thLen * 0.08 ? i / (thLen * 0.08) : Math.pow(1 - (i - thLen * 0.08) / (thLen * 0.92), 1.5);
          thD[i] = (Math.random() * 2 - 1) * env;
        }
        const thN = c.createBufferSource(); thN.buffer = thBuf;
        const thF = c.createBiquadFilter(); thF.type = "lowpass"; thF.frequency.value = 350;
        const thG = c.createGain(); thG.gain.setValueAtTime(0.3, now + 0.03); thG.gain.exponentialRampToValueAtTime(0.001, now + 2.0);
        thN.connect(thF); thF.connect(thG); thG.connect(dest); thN.start(now + 0.03);
        // Sub bass rumble
        const sub = c.createOscillator(); sub.type = "sine";
        sub.frequency.setValueAtTime(40, now + 0.05); sub.frequency.exponentialRampToValueAtTime(15, now + 1.5);
        const sg = c.createGain(); sg.gain.setValueAtTime(0.2, now + 0.05); sg.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
        sub.connect(sg); sg.connect(dest); sub.start(now + 0.05); sub.stop(now + 1.6);
        break;
      }
      case "fog": {
        // Eerie foghorn-like drone
        const horn = c.createOscillator(); horn.type = "sawtooth"; horn.frequency.value = 85;
        const hf = c.createBiquadFilter(); hf.type = "lowpass"; hf.frequency.value = 200;
        const hg = c.createGain();
        hg.gain.setValueAtTime(0, now); hg.gain.linearRampToValueAtTime(0.08, now + 0.3);
        hg.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
        horn.connect(hf); hf.connect(hg); hg.connect(dest);
        horn.start(now); horn.stop(now + 1.25);
        // Misty noise
        const mLen = Math.floor(c.sampleRate * 1.0);
        const mBuf = c.createBuffer(1, mLen, c.sampleRate);
        const mD = mBuf.getChannelData(0);
        for (let i = 0; i < mLen; i++) mD[i] = (Math.random() * 2 - 1) * Math.sin(i / mLen * Math.PI);
        const mN = c.createBufferSource(); mN.buffer = mBuf;
        const mF = c.createBiquadFilter(); mF.type = "bandpass"; mF.frequency.value = 250; mF.Q.value = 0.5;
        const mg = c.createGain(); mg.gain.setValueAtTime(0.12, now); mg.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
        mN.connect(mF); mF.connect(mg); mg.connect(dest); mN.start(now);
        break;
      }
      case "rain": {
        // Heavy rain on ship deck
        const rLen = Math.floor(c.sampleRate * 1.2);
        const rBuf = c.createBuffer(1, rLen, c.sampleRate);
        const rD = rBuf.getChannelData(0);
        for (let i = 0; i < rLen; i++) rD[i] = (Math.random() * 2 - 1) * (1 - i / rLen) * 0.8;
        const rN = c.createBufferSource(); rN.buffer = rBuf;
        const rF = c.createBiquadFilter(); rF.type = "highpass"; rF.frequency.value = 1200;
        const rG = c.createGain(); rG.gain.setValueAtTime(0.15, now); rG.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
        rN.connect(rF); rF.connect(rG); rG.connect(dest); rN.start(now);
        // Wood patter - rain on planks
        const pLen = Math.floor(c.sampleRate * 0.6);
        const pBuf = c.createBuffer(1, pLen, c.sampleRate);
        const pD = pBuf.getChannelData(0);
        for (let i = 0; i < pLen; i++) pD[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / pLen, 1.5) * 0.3;
        const pN = c.createBufferSource(); pN.buffer = pBuf;
        const pF = c.createBiquadFilter(); pF.type = "bandpass"; pF.frequency.value = 3000; pF.Q.value = 2;
        const pG = c.createGain(); pG.gain.setValueAtTime(0.08, now + 0.1); pG.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
        pN.connect(pF); pF.connect(pG); pG.connect(dest); pN.start(now + 0.1);
        break;
      }
      case "gale": {
        // Ship rigging howl
        const wLen = Math.floor(c.sampleRate * 1.5);
        const wBuf = c.createBuffer(1, wLen, c.sampleRate);
        const wD = wBuf.getChannelData(0);
        for (let i = 0; i < wLen; i++) wD[i] = (Math.random() * 2 - 1) * Math.sin(i / wLen * Math.PI) * (1 + Math.sin(i * 0.008) * 0.6);
        const wN = c.createBufferSource(); wN.buffer = wBuf;
        const wF = c.createBiquadFilter(); wF.type = "bandpass"; wF.frequency.value = 450; wF.Q.value = 0.8;
        const wG = c.createGain(); wG.gain.setValueAtTime(0.22, now); wG.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
        wN.connect(wF); wF.connect(wG); wG.connect(dest); wN.start(now);
        // High whistle - wind through rigging
        const whistle = c.createOscillator(); whistle.type = "sine";
        whistle.frequency.setValueAtTime(600, now);
        whistle.frequency.linearRampToValueAtTime(900, now + 0.5);
        whistle.frequency.linearRampToValueAtTime(500, now + 1.0);
        const wgf = c.createBiquadFilter(); wgf.type = "bandpass"; wgf.frequency.value = 700; wgf.Q.value = 5;
        const wgg = c.createGain();
        wgg.gain.setValueAtTime(0, now); wgg.gain.linearRampToValueAtTime(0.05, now + 0.3);
        wgg.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
        whistle.connect(wgf); wgf.connect(wgg); wgg.connect(dest);
        whistle.start(now); whistle.stop(now + 1.3);
        break;
      }
    }
  });
}
