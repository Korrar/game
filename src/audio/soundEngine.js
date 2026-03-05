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
let currentWeather = null;
let currentRiver = false;
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
    musicGain.gain.value = 0.55;

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

// ─── BIOME AMBIENT SOUNDSCAPES ───
// Environmental sound effects instead of music — wind, waves, insects, rumbling, etc.

// Per-biome ambient soundscape profiles
// Each biome defines environmental sound layers instead of musical elements
const BIOME_AMBIENCE = {
  // ── Jungle: dense tropical forest ──
  jungle: {
    wind: { vol: 0.04, freq: 280, q: 0.6, lfoRate: 0.015 },
    // Layered insect/cicada drone
    insects: { vol: 0.06, freqs: [4200, 5800, 7200], q: 8, lfoRate: 0.3 },
    // Bird calls — random short chirps
    creatures: { type: "birds", vol: 0.05, interval: [2000, 5000], chance: 0.6 },
    // Distant monkey howls / frog croaks
    creatures2: { type: "frogs", vol: 0.04, interval: [4000, 8000], chance: 0.4 },
    // Dripping water
    drips: { vol: 0.03, interval: [800, 3000], chance: 0.5 },
    // Rustling leaves
    rustle: { vol: 0.03, freq: 1800, q: 0.4, lfoRate: 0.08 },
  },
  // ── Island: coastal with ocean ──
  island: {
    wind: { vol: 0.06, freq: 350, q: 0.5, lfoRate: 0.012 },
    waves: { vol: 0.08, rate: 5.0 },
    // Seagull cries
    creatures: { type: "seagulls", vol: 0.04, interval: [3000, 7000], chance: 0.5 },
    // Creaking wood (dock/ship)
    creak: { vol: 0.025, interval: [5000, 12000], chance: 0.35 },
  },
  // ── Desert: arid wind and sand ──
  desert: {
    wind: { vol: 0.10, freq: 200, q: 0.3, lfoRate: 0.008 },
    // Sand hiss — high frequency wind-blown sand
    sandHiss: { vol: 0.04, freq: 6000, q: 1.5, lfoRate: 0.05 },
    // Distant eagle/hawk cry
    creatures: { type: "hawk", vol: 0.03, interval: [6000, 15000], chance: 0.3 },
    // Low rumble — heat shimmer / distant thunder
    rumble: { vol: 0.04, freq: 40, lfoRate: 0.01 },
  },
  // ── Winter: cold howling wind and ice ──
  winter: {
    wind: { vol: 0.12, freq: 400, q: 0.4, lfoRate: 0.01 },
    // High-pitched wind whistle through gaps
    whistle: { vol: 0.03, freq: 2200, q: 6, lfoRate: 0.06 },
    // Ice cracking
    creatures: { type: "ice_crack", vol: 0.04, interval: [5000, 12000], chance: 0.35 },
    // Snow crunch / settling
    drips: { vol: 0.02, interval: [3000, 8000], chance: 0.3 },
  },
  // ── City: port town ambience ──
  city: {
    wind: { vol: 0.02, freq: 250, q: 0.5, lfoRate: 0.02 },
    // Crowd murmur — low bandpass noise
    crowd: { vol: 0.05, freq: 400, q: 0.3 },
    // Hammering / clanking work sounds
    creatures: { type: "hammering", vol: 0.035, interval: [3000, 7000], chance: 0.45 },
    // Creaking signs / doors
    creak: { vol: 0.025, interval: [6000, 14000], chance: 0.3 },
    // Distant dog bark / cat
    creatures2: { type: "dog", vol: 0.02, interval: [8000, 18000], chance: 0.25 },
  },
  // ── Volcano: tectonic rumbling and fire ──
  volcano: {
    wind: { vol: 0.05, freq: 180, q: 0.3, lfoRate: 0.008 },
    // Deep tectonic rumble — continuous
    rumble: { vol: 0.10, freq: 30, lfoRate: 0.007 },
    // Lava bubbling
    creatures: { type: "lava_bubble", vol: 0.05, interval: [1500, 4000], chance: 0.6 },
    // Fire crackle
    fireCrackle: { vol: 0.05, freq: 3500, q: 1.0, lfoRate: 0.15 },
    // Distant eruption rumble
    creatures2: { type: "eruption", vol: 0.04, interval: [8000, 20000], chance: 0.25 },
  },
  // ── Summer: warm meadow ──
  summer: {
    wind: { vol: 0.05, freq: 320, q: 0.5, lfoRate: 0.015 },
    // Bees / insects buzzing
    insects: { vol: 0.04, freqs: [3800, 4600], q: 6, lfoRate: 0.4 },
    // Bird song
    creatures: { type: "birds", vol: 0.045, interval: [2500, 5500], chance: 0.55 },
    // Grass rustling
    rustle: { vol: 0.03, freq: 2200, q: 0.3, lfoRate: 0.06 },
    // Cricket chirps
    creatures2: { type: "crickets", vol: 0.03, interval: [1500, 4000], chance: 0.5 },
  },
  // ── Autumn: wind through dry leaves ──
  autumn: {
    wind: { vol: 0.08, freq: 300, q: 0.4, lfoRate: 0.012 },
    // Dry leaf rustle — prominent
    rustle: { vol: 0.05, freq: 2500, q: 0.5, lfoRate: 0.1 },
    // Crow caws
    creatures: { type: "crows", vol: 0.035, interval: [4000, 10000], chance: 0.4 },
    // Creaking branches
    creak: { vol: 0.03, interval: [5000, 12000], chance: 0.3 },
  },
  // ── Spring: fresh breeze and birdsong ──
  spring: {
    wind: { vol: 0.04, freq: 350, q: 0.5, lfoRate: 0.018 },
    // Rich birdsong
    creatures: { type: "birds", vol: 0.05, interval: [1500, 4000], chance: 0.65 },
    // Babbling brook
    drips: { vol: 0.04, interval: [400, 1200], chance: 0.7 },
    // Rustling new leaves
    rustle: { vol: 0.025, freq: 2000, q: 0.4, lfoRate: 0.07 },
    // Insects
    insects: { vol: 0.025, freqs: [4000, 5200], q: 5, lfoRate: 0.35 },
  },
  // ── Mushroom: eerie underground/enchanted forest ──
  mushroom: {
    wind: { vol: 0.02, freq: 200, q: 0.4, lfoRate: 0.01 },
    // Deep cave drone
    rumble: { vol: 0.05, freq: 45, lfoRate: 0.008 },
    // Water drips in cave
    drips: { vol: 0.05, interval: [600, 2500], chance: 0.6 },
    // Strange spore puffs / alien sounds
    creatures: { type: "spores", vol: 0.04, interval: [3000, 7000], chance: 0.45 },
    // Echo-like resonance
    whistle: { vol: 0.02, freq: 800, q: 10, lfoRate: 0.03 },
  },
  // ── Swamp: murky, oppressive wetland ──
  swamp: {
    wind: { vol: 0.03, freq: 220, q: 0.3, lfoRate: 0.01 },
    // Bubbling mud/gas
    creatures: { type: "bubbles", vol: 0.05, interval: [1500, 4000], chance: 0.55 },
    // Frogs croaking
    creatures2: { type: "frogs", vol: 0.05, interval: [2000, 5000], chance: 0.5 },
    // Mosquito buzz
    insects: { vol: 0.035, freqs: [3600, 4800], q: 10, lfoRate: 0.5 },
    // Water slosh
    drips: { vol: 0.03, interval: [2000, 5000], chance: 0.4 },
    // Low fog drone
    rumble: { vol: 0.04, freq: 55, lfoRate: 0.006 },
  },
  // ── Blue Lagoon: tropical paradise ──
  blue_lagoon: {
    wind: { vol: 0.04, freq: 300, q: 0.5, lfoRate: 0.015 },
    waves: { vol: 0.07, rate: 4.0 },
    // Tropical birds
    creatures: { type: "birds", vol: 0.04, interval: [2500, 6000], chance: 0.5 },
    // Gentle waterfall
    rustle: { vol: 0.04, freq: 1500, q: 0.3, lfoRate: 0.04 },
    // Insects
    insects: { vol: 0.025, freqs: [4200, 5500], q: 6, lfoRate: 0.3 },
  },
};

// ─── HELPER: Create looping white noise buffer ───
function _makeNoiseBuf(duration) {
  const c = getCtx();
  const len = Math.floor(c.sampleRate * duration);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

// ─── WIND LAYER — continuous filtered noise with organic movement ───
function createWindLayer(cfg, isNight) {
  if (!cfg) return null;
  const c = getCtx();
  const noise = c.createBufferSource();
  noise.buffer = _makeNoiseBuf(3);
  noise.loop = true;

  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = cfg.freq;
  bp.Q.value = cfg.q;

  const gain = c.createGain();
  gain.gain.value = cfg.vol * (isNight ? 1.4 : 1);

  // Slow organic filter sweep — wind gusts
  const lfo = c.createOscillator(); lfo.type = "sine";
  lfo.frequency.value = cfg.lfoRate || 0.015;
  const lfoG = c.createGain();
  lfoG.gain.value = cfg.freq * 0.6;
  lfo.connect(lfoG); lfoG.connect(bp.frequency);

  // Volume swell — gusts come and go
  const volLfo = c.createOscillator(); volLfo.type = "sine";
  volLfo.frequency.value = (cfg.lfoRate || 0.015) * 0.7;
  const volLfoG = c.createGain();
  volLfoG.gain.value = cfg.vol * 0.4;
  volLfo.connect(volLfoG); volLfoG.connect(gain.gain);

  // Stereo movement
  const panner = c.createStereoPanner();
  const panLfo = c.createOscillator(); panLfo.type = "sine";
  panLfo.frequency.value = 0.04 + Math.random() * 0.03;
  const panG = c.createGain(); panG.gain.value = 0.5;
  panLfo.connect(panG); panG.connect(panner.pan);

  noise.connect(bp); bp.connect(gain); gain.connect(panner); panner.connect(musicGain);
  noise.start(); lfo.start(); volLfo.start(); panLfo.start();

  return { noise, bp, gain, lfo, lfoG, volLfo, volLfoG, panner, panLfo, panG };
}

// ─── SEA WAVES — realistic ocean with wash-in/wash-out cycle ───
function createWavesLayer(cfg) {
  if (!cfg) return null;
  const c = getCtx();

  // Main wave body — lowpass filtered noise
  const noise = c.createBufferSource();
  noise.buffer = _makeNoiseBuf(4);
  noise.loop = true;
  const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 400; lp.Q.value = 0.3;
  const gain = c.createGain(); gain.gain.value = cfg.vol;

  // Wave rhythm — volume pulsing
  const lfo = c.createOscillator(); lfo.type = "sine";
  lfo.frequency.value = 1 / cfg.rate;
  const lfoG = c.createGain(); lfoG.gain.value = cfg.vol * 0.7;
  lfo.connect(lfoG); lfoG.connect(gain.gain);

  // Wave crest shimmer — filter opens on crest
  const filterLfo = c.createOscillator(); filterLfo.type = "sine";
  filterLfo.frequency.value = 1 / cfg.rate;
  const filterLfoG = c.createGain(); filterLfoG.gain.value = 250;
  filterLfo.connect(filterLfoG); filterLfoG.connect(lp.frequency);

  // Foam/hiss layer — highpass noise on top of wave crest
  const foam = c.createBufferSource();
  foam.buffer = _makeNoiseBuf(4);
  foam.loop = true;
  const foamHP = c.createBiquadFilter(); foamHP.type = "highpass"; foamHP.frequency.value = 2000;
  const foamG = c.createGain(); foamG.gain.value = cfg.vol * 0.15;
  const foamLfo = c.createOscillator(); foamLfo.type = "sine";
  foamLfo.frequency.value = 1 / cfg.rate;
  const foamLfoG = c.createGain(); foamLfoG.gain.value = cfg.vol * 0.2;
  foamLfo.connect(foamLfoG); foamLfoG.connect(foamG.gain);

  // Stereo pan sweep
  const panner = c.createStereoPanner();
  const panLfo = c.createOscillator(); panLfo.type = "sine";
  panLfo.frequency.value = 0.06;
  const panG = c.createGain(); panG.gain.value = 0.45;
  panLfo.connect(panG); panG.connect(panner.pan);

  noise.connect(lp); lp.connect(gain); gain.connect(panner);
  foam.connect(foamHP); foamHP.connect(foamG); foamG.connect(panner);
  panner.connect(musicGain);
  noise.start(); lfo.start(); filterLfo.start(); foam.start(); foamLfo.start(); panLfo.start();

  return { noise, lp, gain, lfo, lfoG, filterLfo, filterLfoG, foam, foamHP, foamG, foamLfo, foamLfoG, panner, panLfo, panG };
}

// ─── INSECT DRONE — layered narrow-band oscillators simulating cicadas/bugs ───
function createInsectLayer(cfg, isNight) {
  if (!cfg) return null;
  const c = getCtx();
  const nodes = [];
  const vol = cfg.vol * (isNight ? 1.5 : 1);

  cfg.freqs.forEach((freq, i) => {
    const osc = c.createOscillator(); osc.type = "sine";
    osc.frequency.value = freq + (Math.random() - 0.5) * 50;
    const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = freq; bp.Q.value = cfg.q;
    const g = c.createGain(); g.gain.value = vol / cfg.freqs.length;

    // Pulsing — insects chirp in waves
    const lfo = c.createOscillator(); lfo.type = "sine";
    lfo.frequency.value = cfg.lfoRate + (Math.random() - 0.5) * 0.1;
    const lfoG = c.createGain(); lfoG.gain.value = g.gain.value * 0.7;
    lfo.connect(lfoG); lfoG.connect(g.gain);

    const panner = c.createStereoPanner();
    panner.pan.value = (i / (cfg.freqs.length - 1 || 1) - 0.5) * 1.2;

    osc.connect(bp); bp.connect(g); g.connect(panner); panner.connect(musicGain);
    osc.start(); lfo.start();
    nodes.push({ osc, bp, g, lfo, lfoG, panner });
  });
  return { _sub: nodes };
}

// ─── RUMBLE — deep tectonic/cave low-frequency drone ───
function createRumbleLayer(cfg, isNight) {
  if (!cfg) return null;
  const c = getCtx();
  const osc = c.createOscillator(); osc.type = "sine";
  osc.frequency.value = cfg.freq;
  const osc2 = c.createOscillator(); osc2.type = "triangle";
  osc2.frequency.value = cfg.freq * 1.5;

  const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = cfg.freq * 3; lp.Q.value = 1;
  const g = c.createGain(); g.gain.value = cfg.vol * (isNight ? 0.8 : 1);

  // Slow organic movement
  const lfo = c.createOscillator(); lfo.type = "sine";
  lfo.frequency.value = cfg.lfoRate || 0.01;
  const lfoG = c.createGain(); lfoG.gain.value = cfg.vol * 0.5;
  lfo.connect(lfoG); lfoG.connect(g.gain);

  // Frequency wobble
  const freqLfo = c.createOscillator(); freqLfo.type = "sine";
  freqLfo.frequency.value = 0.05 + Math.random() * 0.03;
  const freqLfoG = c.createGain(); freqLfoG.gain.value = cfg.freq * 0.15;
  freqLfo.connect(freqLfoG); freqLfoG.connect(osc.frequency);

  osc.connect(lp); osc2.connect(lp); lp.connect(g); g.connect(musicGain);
  osc.start(); osc2.start(); lfo.start(); freqLfo.start();

  return { osc, osc2, lp, g, lfo, lfoG, freqLfo, freqLfoG };
}

// ─── CONTINUOUS TEXTURE — rustle, crowd, fire crackle, sand hiss, whistle ───
function createTextureLayer(cfg, type) {
  if (!cfg) return null;
  const c = getCtx();

  if (type === "whistle") {
    // Tonal wind whistle — narrow resonant bandpass
    const osc = c.createOscillator(); osc.type = "sine";
    osc.frequency.value = cfg.freq;
    const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = cfg.freq; bp.Q.value = cfg.q;
    const g = c.createGain(); g.gain.value = cfg.vol;
    const lfo = c.createOscillator(); lfo.type = "sine";
    lfo.frequency.value = cfg.lfoRate;
    const lfoG = c.createGain(); lfoG.gain.value = cfg.freq * 0.1;
    lfo.connect(lfoG); lfoG.connect(osc.frequency);
    const volLfo = c.createOscillator(); volLfo.type = "sine";
    volLfo.frequency.value = cfg.lfoRate * 0.6;
    const volG = c.createGain(); volG.gain.value = cfg.vol * 0.6;
    volLfo.connect(volG); volG.connect(g.gain);
    osc.connect(bp); bp.connect(g); g.connect(musicGain);
    osc.start(); lfo.start(); volLfo.start();
    return { osc, bp, g, lfo, lfoG, volLfo, volG };
  }

  // Noise-based texture (rustle, crowd, sandHiss, fireCrackle)
  const noise = c.createBufferSource();
  noise.buffer = _makeNoiseBuf(2);
  noise.loop = true;
  const bp = c.createBiquadFilter(); bp.type = "bandpass";
  bp.frequency.value = cfg.freq; bp.Q.value = cfg.q || 0.5;
  const g = c.createGain(); g.gain.value = cfg.vol;

  const lfo = c.createOscillator(); lfo.type = "sine";
  lfo.frequency.value = cfg.lfoRate || 0.05;
  const lfoG = c.createGain(); lfoG.gain.value = cfg.freq * 0.3;
  lfo.connect(lfoG); lfoG.connect(bp.frequency);

  const volLfo = c.createOscillator(); volLfo.type = "sine";
  volLfo.frequency.value = (cfg.lfoRate || 0.05) * 0.8;
  const volG = c.createGain(); volG.gain.value = cfg.vol * 0.4;
  volLfo.connect(volG); volG.connect(g.gain);

  const panner = c.createStereoPanner();
  panner.pan.value = (Math.random() - 0.5) * 0.6;

  noise.connect(bp); bp.connect(g); g.connect(panner); panner.connect(musicGain);
  noise.start(); lfo.start(); volLfo.start();

  return { noise, bp, g, lfo, lfoG, volLfo, volG, panner };
}

// ─── CREATURE SOUNDS — scheduled procedural animal/environment calls ───
let creatureTimers = [];

function createCreatureLayer(cfg, layerName) {
  if (!cfg) return null;
  const c = getCtx();
  let stopped = false;

  const playCreature = () => {
    if (stopped || !musicPlaying || muted) return;
    if (Math.random() > cfg.chance) {
      scheduleNext();
      return;
    }

    const now = c.currentTime;
    const pan = (Math.random() - 0.5) * 1.4;
    const panner = c.createStereoPanner();
    panner.pan.value = pan;
    panner.connect(musicGain);

    switch (cfg.type) {
      case "birds": {
        // 2-4 note chirp, ascending/descending
        const noteCount = 2 + Math.floor(Math.random() * 3);
        const baseFreq = 2000 + Math.random() * 2000;
        const dir = Math.random() < 0.5 ? 1 : -1;
        for (let i = 0; i < noteCount; i++) {
          const t = now + i * (0.08 + Math.random() * 0.06);
          const freq = baseFreq + dir * i * (100 + Math.random() * 200);
          const osc = c.createOscillator(); osc.type = "sine";
          osc.frequency.setValueAtTime(freq, t);
          osc.frequency.linearRampToValueAtTime(freq * (1 + dir * 0.15), t + 0.06);
          const g = c.createGain();
          g.gain.setValueAtTime(cfg.vol, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
          osc.connect(g); g.connect(panner);
          osc.start(t); osc.stop(t + 0.1);
        }
        break;
      }
      case "frogs": {
        // Low ribbit — two short bursts
        [0, 0.15].forEach(delay => {
          const t = now + delay;
          const osc = c.createOscillator(); osc.type = "square";
          osc.frequency.setValueAtTime(180 + Math.random() * 80, t);
          osc.frequency.exponentialRampToValueAtTime(120, t + 0.08);
          const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 300; bp.Q.value = 3;
          const g = c.createGain();
          g.gain.setValueAtTime(cfg.vol, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
          osc.connect(bp); bp.connect(g); g.connect(panner);
          osc.start(t); osc.stop(t + 0.12);
        });
        break;
      }
      case "seagulls": {
        // Rising then falling cry
        const osc = c.createOscillator(); osc.type = "sine";
        osc.frequency.setValueAtTime(1200 + Math.random() * 400, now);
        osc.frequency.linearRampToValueAtTime(2200 + Math.random() * 600, now + 0.2);
        osc.frequency.linearRampToValueAtTime(1000 + Math.random() * 300, now + 0.5);
        const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1800; bp.Q.value = 2;
        const g = c.createGain();
        g.gain.setValueAtTime(0.001, now);
        g.gain.linearRampToValueAtTime(cfg.vol, now + 0.08);
        g.gain.setValueAtTime(cfg.vol * 0.8, now + 0.25);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
        osc.connect(bp); bp.connect(g); g.connect(panner);
        osc.start(now); osc.stop(now + 0.6);
        break;
      }
      case "hawk": {
        // High piercing screech
        const osc = c.createOscillator(); osc.type = "sawtooth";
        osc.frequency.setValueAtTime(1800, now);
        osc.frequency.linearRampToValueAtTime(2400, now + 0.3);
        osc.frequency.linearRampToValueAtTime(1600, now + 0.8);
        const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 2000; bp.Q.value = 3;
        const g = c.createGain();
        g.gain.setValueAtTime(0.001, now);
        g.gain.linearRampToValueAtTime(cfg.vol, now + 0.1);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
        osc.connect(bp); bp.connect(g); g.connect(panner);
        osc.start(now); osc.stop(now + 0.9);
        break;
      }
      case "crows": {
        // Harsh caw — 2-3 short calls
        const count = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < count; i++) {
          const t = now + i * 0.25;
          const osc = c.createOscillator(); osc.type = "sawtooth";
          osc.frequency.setValueAtTime(600 + Math.random() * 100, t);
          osc.frequency.exponentialRampToValueAtTime(400, t + 0.12);
          const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 800; bp.Q.value = 2;
          const g = c.createGain();
          g.gain.setValueAtTime(cfg.vol, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
          osc.connect(bp); bp.connect(g); g.connect(panner);
          osc.start(t); osc.stop(t + 0.18);
        }
        break;
      }
      case "crickets": {
        // Rapid chirp burst
        const chirpCount = 4 + Math.floor(Math.random() * 4);
        for (let i = 0; i < chirpCount; i++) {
          const t = now + i * 0.04;
          const osc = c.createOscillator(); osc.type = "sine";
          osc.frequency.value = 4500 + Math.random() * 1000;
          const g = c.createGain();
          g.gain.setValueAtTime(cfg.vol * 0.7, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.025);
          osc.connect(g); g.connect(panner);
          osc.start(t); osc.stop(t + 0.03);
        }
        break;
      }
      case "ice_crack": {
        // Sharp crack followed by resonant ring
        const snapLen = Math.floor(c.sampleRate * 0.01);
        const snapBuf = c.createBuffer(1, snapLen, c.sampleRate);
        const snapD = snapBuf.getChannelData(0);
        for (let i = 0; i < snapLen; i++) snapD[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / snapLen, 0.5);
        const sn = c.createBufferSource(); sn.buffer = snapBuf;
        const sg = c.createGain(); sg.gain.setValueAtTime(cfg.vol * 1.5, now); sg.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
        sn.connect(sg); sg.connect(panner); sn.start(now);
        // Ring
        const osc = c.createOscillator(); osc.type = "triangle";
        osc.frequency.setValueAtTime(800 + Math.random() * 400, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.3);
        const g = c.createGain(); g.gain.setValueAtTime(cfg.vol * 0.5, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(g); g.connect(panner); osc.start(now); osc.stop(now + 0.4);
        break;
      }
      case "hammering": {
        // 2-4 metallic hits
        const hits = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < hits; i++) {
          const t = now + i * (0.2 + Math.random() * 0.1);
          const osc = c.createOscillator(); osc.type = "square";
          osc.frequency.setValueAtTime(600 + Math.random() * 300, t);
          osc.frequency.exponentialRampToValueAtTime(200, t + 0.04);
          const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1000; bp.Q.value = 4;
          const g = c.createGain(); g.gain.setValueAtTime(cfg.vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
          osc.connect(bp); bp.connect(g); g.connect(panner); osc.start(t); osc.stop(t + 0.08);
        }
        break;
      }
      case "dog": {
        // Short bark — 1-2 bursts
        const barks = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < barks; i++) {
          const t = now + i * 0.2;
          const osc = c.createOscillator(); osc.type = "sawtooth";
          osc.frequency.setValueAtTime(350 + Math.random() * 100, t);
          osc.frequency.exponentialRampToValueAtTime(200, t + 0.08);
          const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 500; bp.Q.value = 2;
          const g = c.createGain(); g.gain.setValueAtTime(cfg.vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
          osc.connect(bp); bp.connect(g); g.connect(panner); osc.start(t); osc.stop(t + 0.12);
        }
        break;
      }
      case "lava_bubble": {
        // Deep plop — sine pitch drop + noise burst
        const osc = c.createOscillator(); osc.type = "sine";
        osc.frequency.setValueAtTime(200 + Math.random() * 100, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);
        const g = c.createGain(); g.gain.setValueAtTime(cfg.vol, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(g); g.connect(panner); osc.start(now); osc.stop(now + 0.3);
        // Pop noise
        const popLen = Math.floor(c.sampleRate * 0.03);
        const popBuf = c.createBuffer(1, popLen, c.sampleRate);
        const popD = popBuf.getChannelData(0);
        for (let j = 0; j < popLen; j++) popD[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / popLen, 2);
        const pn = c.createBufferSource(); pn.buffer = popBuf;
        const pg = c.createGain(); pg.gain.setValueAtTime(cfg.vol * 0.6, now + 0.05); pg.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        const pbp = c.createBiquadFilter(); pbp.type = "bandpass"; pbp.frequency.value = 500; pbp.Q.value = 2;
        pn.connect(pbp); pbp.connect(pg); pg.connect(panner); pn.start(now + 0.05);
        break;
      }
      case "eruption": {
        // Distant rumble + crack
        const rLen = Math.floor(c.sampleRate * 0.8);
        const rBuf = c.createBuffer(1, rLen, c.sampleRate);
        const rD = rBuf.getChannelData(0);
        for (let j = 0; j < rLen; j++) {
          const t2 = j / rLen;
          rD[j] = (Math.random() * 2 - 1) * (t2 < 0.1 ? t2 / 0.1 : Math.pow(1 - (t2 - 0.1) / 0.9, 2));
        }
        const rn = c.createBufferSource(); rn.buffer = rBuf;
        const rlp = c.createBiquadFilter(); rlp.type = "lowpass"; rlp.frequency.value = 200;
        const rg = c.createGain(); rg.gain.setValueAtTime(cfg.vol * 1.5, now); rg.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        rn.connect(rlp); rlp.connect(rg); rg.connect(panner); rn.start(now);
        break;
      }
      case "bubbles": {
        // Swamp gas bubbles — 2-5 plops
        const count = 2 + Math.floor(Math.random() * 4);
        for (let i = 0; i < count; i++) {
          const t = now + i * (0.1 + Math.random() * 0.15);
          const osc = c.createOscillator(); osc.type = "sine";
          osc.frequency.setValueAtTime(300 + Math.random() * 200, t);
          osc.frequency.exponentialRampToValueAtTime(80, t + 0.06);
          const g = c.createGain(); g.gain.setValueAtTime(cfg.vol * 0.7, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
          osc.connect(g); g.connect(panner); osc.start(t); osc.stop(t + 0.1);
        }
        break;
      }
      case "spores": {
        // Soft puff + shimmer tone
        const puffLen = Math.floor(c.sampleRate * 0.15);
        const puffBuf = c.createBuffer(1, puffLen, c.sampleRate);
        const puffD = puffBuf.getChannelData(0);
        for (let j = 0; j < puffLen; j++) puffD[j] = (Math.random() * 2 - 1) * Math.sin(j / puffLen * Math.PI);
        const pn = c.createBufferSource(); pn.buffer = puffBuf;
        const pbp = c.createBiquadFilter(); pbp.type = "bandpass"; pbp.frequency.value = 1200; pbp.Q.value = 1;
        const pg = c.createGain(); pg.gain.setValueAtTime(cfg.vol, now); pg.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        pn.connect(pbp); pbp.connect(pg); pg.connect(panner); pn.start(now);
        // Shimmer
        const osc = c.createOscillator(); osc.type = "sine";
        osc.frequency.value = 600 + Math.random() * 800;
        const g = c.createGain(); g.gain.setValueAtTime(cfg.vol * 0.3, now + 0.05); g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.connect(g); g.connect(panner); osc.start(now + 0.05); osc.stop(now + 0.45);
        break;
      }
      default: break;
    }
    scheduleNext();
  };

  const scheduleNext = () => {
    if (stopped) return;
    const [minI, maxI] = cfg.interval;
    const delay = minI + Math.random() * (maxI - minI);
    const timer = setTimeout(playCreature, delay);
    creatureTimers.push(timer);
  };

  scheduleNext();
  return { stop: () => { stopped = true; }, disconnect: () => { stopped = true; } };
}

// ─── WATER DRIPS — random short plop sounds ───
function createDripLayer(cfg) {
  if (!cfg) return null;
  const c = getCtx();
  let stopped = false;

  const playDrip = () => {
    if (stopped || !musicPlaying || muted) { scheduleNext(); return; }
    if (Math.random() > cfg.chance) { scheduleNext(); return; }

    const now = c.currentTime;
    const freq = 800 + Math.random() * 1500;
    const osc = c.createOscillator(); osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.5, now + 0.06);
    const g = c.createGain();
    g.gain.setValueAtTime(cfg.vol, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    const panner = c.createStereoPanner();
    panner.pan.value = (Math.random() - 0.5) * 1.2;
    osc.connect(g); g.connect(panner); panner.connect(musicGain);
    osc.start(now); osc.stop(now + 0.1);
    scheduleNext();
  };

  const scheduleNext = () => {
    if (stopped) return;
    const [minI, maxI] = cfg.interval;
    const delay = minI + Math.random() * (maxI - minI);
    const timer = setTimeout(playDrip, delay);
    creatureTimers.push(timer);
  };

  scheduleNext();
  return { stop: () => { stopped = true; }, disconnect: () => { stopped = true; } };
}

// ─── WOOD CREAK — random creaking sounds ───
function createCreakLayer(cfg) {
  if (!cfg) return null;
  const c = getCtx();
  let stopped = false;

  const playCreak = () => {
    if (stopped || !musicPlaying || muted) { scheduleNext(); return; }
    if (Math.random() > cfg.chance) { scheduleNext(); return; }

    const now = c.currentTime;
    const baseFreq = 150 + Math.random() * 200;
    const osc = c.createOscillator(); osc.type = "triangle";
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.linearRampToValueAtTime(baseFreq * (1.1 + Math.random() * 0.3), now + 0.15);
    osc.frequency.linearRampToValueAtTime(baseFreq * 0.9, now + 0.3);
    const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 400; bp.Q.value = 3;
    const g = c.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(cfg.vol, now + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    const panner = c.createStereoPanner();
    panner.pan.value = (Math.random() - 0.5) * 0.8;
    osc.connect(bp); bp.connect(g); g.connect(panner); panner.connect(musicGain);
    osc.start(now); osc.stop(now + 0.4);
    scheduleNext();
  };

  const scheduleNext = () => {
    if (stopped) return;
    const [minI, maxI] = cfg.interval;
    const delay = minI + Math.random() * (maxI - minI);
    const timer = setTimeout(playCreak, delay);
    creatureTimers.push(timer);
  };

  scheduleNext();
  return { stop: () => { stopped = true; }, disconnect: () => { stopped = true; } };
}

let percTimer = null;

// ─── RAIN LAYER — continuous rain sound with varying intensity ───
function createRainLayer(intensity) {
  // intensity: 0.0-1.0 (light drizzle to heavy downpour)
  const c = getCtx();
  const vol = 0.06 + intensity * 0.08;

  // Main rain body — filtered white noise
  const noise = c.createBufferSource();
  noise.buffer = _makeNoiseBuf(3);
  noise.loop = true;
  const hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 1000; hp.Q.value = 0.3;
  const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 6000 + intensity * 2000;
  const g = c.createGain(); g.gain.value = vol;

  // Rain patter intensity modulation — subtle gusts
  const lfo = c.createOscillator(); lfo.type = "sine";
  lfo.frequency.value = 0.08 + Math.random() * 0.04;
  const lfoG = c.createGain(); lfoG.gain.value = vol * 0.3;
  lfo.connect(lfoG); lfoG.connect(g.gain);

  // Secondary layer — heavier drops (low frequency component)
  const drops = c.createBufferSource();
  drops.buffer = _makeNoiseBuf(2);
  drops.loop = true;
  const dropBP = c.createBiquadFilter(); dropBP.type = "bandpass"; dropBP.frequency.value = 400; dropBP.Q.value = 0.5;
  const dropG = c.createGain(); dropG.gain.value = vol * 0.4 * intensity;

  // Stereo spread — rain comes from everywhere
  const panner = c.createStereoPanner();
  const panLfo = c.createOscillator(); panLfo.type = "sine";
  panLfo.frequency.value = 0.03;
  const panG = c.createGain(); panG.gain.value = 0.3;
  panLfo.connect(panG); panG.connect(panner.pan);

  noise.connect(hp); hp.connect(lp); lp.connect(g); g.connect(panner);
  drops.connect(dropBP); dropBP.connect(dropG); dropG.connect(panner);
  panner.connect(musicGain);
  noise.start(); drops.start(); lfo.start(); panLfo.start();

  return { noise, hp, lp, g, lfo, lfoG, drops, dropBP, dropG, panner, panLfo, panG };
}

// ─── STORM LAYER — thunder rumbles on top of rain ───
let thunderTimer = null;
function createStormLayer() {
  const c = getCtx();
  let stopped = false;

  // Rain layer with high intensity
  const rain = createRainLayer(1.0);

  // Scheduled thunder rumbles
  const playThunder = () => {
    if (stopped || !musicPlaying || muted) return;
    const now = c.currentTime;
    const pan = (Math.random() - 0.5) * 1.6;
    const panner = c.createStereoPanner(); panner.pan.value = pan;
    panner.connect(musicGain);

    // Thunder crack — sharp noise burst
    const crackLen = Math.floor(c.sampleRate * 0.05);
    const crackBuf = c.createBuffer(1, crackLen, c.sampleRate);
    const crackD = crackBuf.getChannelData(0);
    for (let i = 0; i < crackLen; i++) crackD[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / crackLen, 0.3);
    const crack = c.createBufferSource(); crack.buffer = crackBuf;
    const crackG = c.createGain();
    crackG.gain.setValueAtTime(0.08, now);
    crackG.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    crack.connect(crackG); crackG.connect(panner); crack.start(now);

    // Thunder rumble — low frequency noise with long tail
    const rumbleLen = Math.floor(c.sampleRate * 2.5);
    const rumbleBuf = c.createBuffer(1, rumbleLen, c.sampleRate);
    const rumbleD = rumbleBuf.getChannelData(0);
    for (let i = 0; i < rumbleLen; i++) {
      const t = i / rumbleLen;
      rumbleD[i] = (Math.random() * 2 - 1) * (t < 0.05 ? t / 0.05 : Math.pow(1 - (t - 0.05) / 0.95, 1.5));
    }
    const rumble = c.createBufferSource(); rumble.buffer = rumbleBuf;
    const rumbleLp = c.createBiquadFilter(); rumbleLp.type = "lowpass"; rumbleLp.frequency.value = 150;
    const rumbleG = c.createGain();
    rumbleG.gain.setValueAtTime(0.10, now + 0.02);
    rumbleG.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
    rumble.connect(rumbleLp); rumbleLp.connect(rumbleG); rumbleG.connect(panner);
    rumble.start(now + 0.02);

    // Next thunder in 4-12 seconds
    thunderTimer = setTimeout(playThunder, 4000 + Math.random() * 8000);
  };

  thunderTimer = setTimeout(playThunder, 1000 + Math.random() * 3000);

  return {
    _sub: rain ? [rain] : [],
    stop: () => { stopped = true; if (thunderTimer) { clearTimeout(thunderTimer); thunderTimer = null; } },
    disconnect: () => { stopped = true; },
  };
}

// ─── GALE LAYER — strong howling wind gusts ───
function createGaleLayer() {
  const c = getCtx();

  // Heavy wind body
  const noise = c.createBufferSource();
  noise.buffer = _makeNoiseBuf(3);
  noise.loop = true;
  const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 500; bp.Q.value = 0.4;
  const g = c.createGain(); g.gain.value = 0.09;

  // Gusting modulation
  const lfo = c.createOscillator(); lfo.type = "sine";
  lfo.frequency.value = 0.12 + Math.random() * 0.06;
  const lfoG = c.createGain(); lfoG.gain.value = 0.06;
  lfo.connect(lfoG); lfoG.connect(g.gain);

  // High whistle — wind through gaps
  const whistle = c.createOscillator(); whistle.type = "sine";
  whistle.frequency.value = 1800 + Math.random() * 500;
  const wBp = c.createBiquadFilter(); wBp.type = "bandpass"; wBp.frequency.value = 2000; wBp.Q.value = 8;
  const wG = c.createGain(); wG.gain.value = 0.02;
  const wLfo = c.createOscillator(); wLfo.type = "sine";
  wLfo.frequency.value = 0.08;
  const wLfoG = c.createGain(); wLfoG.gain.value = 0.015;
  wLfo.connect(wLfoG); wLfoG.connect(wG.gain);

  // Rapid panning — wind direction shifts
  const panner = c.createStereoPanner();
  const panLfo = c.createOscillator(); panLfo.type = "sine";
  panLfo.frequency.value = 0.15;
  const panG = c.createGain(); panG.gain.value = 0.7;
  panLfo.connect(panG); panG.connect(panner.pan);

  noise.connect(bp); bp.connect(g); g.connect(panner);
  whistle.connect(wBp); wBp.connect(wG); wG.connect(panner);
  panner.connect(musicGain);
  noise.start(); lfo.start(); whistle.start(); wLfo.start(); panLfo.start();

  return { noise, bp, g, lfo, lfoG, whistle, wBp, wG, wLfo, wLfoG, panner, panLfo, panG };
}

// ─── RIVER SEGMENT — sailing/water ambient ───
function _createRiverNodes() {
  // River flowing water
  const c = getCtx();
  const water = c.createBufferSource();
  water.buffer = _makeNoiseBuf(4);
  water.loop = true;
  const waterBp = c.createBiquadFilter(); waterBp.type = "bandpass"; waterBp.frequency.value = 600; waterBp.Q.value = 0.4;
  const waterG = c.createGain(); waterG.gain.value = 0.08;
  const waterLfo = c.createOscillator(); waterLfo.type = "sine";
  waterLfo.frequency.value = 0.15;
  const waterLfoG = c.createGain(); waterLfoG.gain.value = 0.04;
  waterLfo.connect(waterLfoG); waterLfoG.connect(waterG.gain);

  // Splashing — random waves hitting hull
  const splash = c.createBufferSource();
  splash.buffer = _makeNoiseBuf(3);
  splash.loop = true;
  const splashHp = c.createBiquadFilter(); splashHp.type = "highpass"; splashHp.frequency.value = 1500;
  const splashLp = c.createBiquadFilter(); splashLp.type = "lowpass"; splashLp.frequency.value = 4000;
  const splashG = c.createGain(); splashG.gain.value = 0.03;
  const splashLfo = c.createOscillator(); splashLfo.type = "sine";
  splashLfo.frequency.value = 0.2 + Math.random() * 0.1;
  const splashLfoG = c.createGain(); splashLfoG.gain.value = 0.025;
  splashLfo.connect(splashLfoG); splashLfoG.connect(splashG.gain);

  // Deep water rumble
  const rumbleOsc = c.createOscillator(); rumbleOsc.type = "sine";
  rumbleOsc.frequency.value = 50;
  const rumbleOsc2 = c.createOscillator(); rumbleOsc2.type = "triangle";
  rumbleOsc2.frequency.value = 65;
  const rumbleLp = c.createBiquadFilter(); rumbleLp.type = "lowpass"; rumbleLp.frequency.value = 100;
  const rumbleG = c.createGain(); rumbleG.gain.value = 0.04;
  const rumbleLfo = c.createOscillator(); rumbleLfo.type = "sine";
  rumbleLfo.frequency.value = 0.03;
  const rumbleLfoG = c.createGain(); rumbleLfoG.gain.value = 0.02;
  rumbleLfo.connect(rumbleLfoG); rumbleLfoG.connect(rumbleG.gain);

  // Wind over water
  const windNode = createWindLayer({ vol: 0.05, freq: 350, q: 0.5, lfoRate: 0.015 }, false);

  // Creaking ship wood
  const creakNode = createCreakLayer({ vol: 0.03, interval: [3000, 8000], chance: 0.5 });

  // Seagull cries
  const gullNode = createCreatureLayer({ type: "seagulls", vol: 0.03, interval: [5000, 12000], chance: 0.35 }, "gulls");

  // Stereo panning for water
  const panner = c.createStereoPanner();
  const panLfo = c.createOscillator(); panLfo.type = "sine";
  panLfo.frequency.value = 0.06;
  const panG = c.createGain(); panG.gain.value = 0.4;
  panLfo.connect(panG); panG.connect(panner.pan);

  water.connect(waterBp); waterBp.connect(waterG); waterG.connect(panner);
  splash.connect(splashHp); splashHp.connect(splashLp); splashLp.connect(splashG); splashG.connect(panner);
  rumbleOsc.connect(rumbleLp); rumbleOsc2.connect(rumbleLp); rumbleLp.connect(rumbleG); rumbleG.connect(panner);
  panner.connect(musicGain);
  water.start(); splash.start(); rumbleOsc.start(); rumbleOsc2.start();
  waterLfo.start(); splashLfo.start(); rumbleLfo.start(); panLfo.start();

  musicNodes.push({ water, waterBp, waterG, waterLfo, waterLfoG, splash, splashHp, splashLp, splashG, splashLfo, splashLfoG, rumbleOsc, rumbleOsc2, rumbleLp, rumbleG, rumbleLfo, rumbleLfoG, panner, panLfo, panG });
  if (windNode) musicNodes.push(windNode);
  if (creakNode) musicNodes.push(creakNode);
  if (gullNode) musicNodes.push(gullNode);
}

// ─── ADD WEATHER LAYERS on top of biome ambience ───
function _addWeatherNodes(weatherId) {
  if (!weatherId) return;
  switch (weatherId) {
    case "rain": {
      const node = createRainLayer(0.8);
      if (node) musicNodes.push(node);
      break;
    }
    case "storm": {
      const node = createStormLayer();
      if (node) musicNodes.push(node);
      break;
    }
    case "gale": {
      const node = createGaleLayer();
      if (node) musicNodes.push(node);
      break;
    }
    case "fog": {
      // Fog: eerie low drone + muffled ambience feel (no extra rain)
      const node = createRumbleLayer({ vol: 0.03, freq: 60, lfoRate: 0.005 }, false);
      if (node) musicNodes.push(node);
      break;
    }
  }
}

// ─── CREATE ALL BIOME AMBIENT NODES (main orchestrator) ───
function _createBiomeNodes(biomeId, isNight, weatherId) {
  const cfg = BIOME_AMBIENCE[biomeId];
  if (!cfg) return;

  // Wind — always present
  if (cfg.wind) {
    const node = createWindLayer(cfg.wind, isNight);
    if (node) musicNodes.push(node);
  }

  // Sea waves (coastal biomes)
  if (cfg.waves) {
    const node = createWavesLayer(cfg.waves);
    if (node) musicNodes.push(node);
  }

  // Insect drone layer
  if (cfg.insects) {
    const node = createInsectLayer(cfg.insects, isNight);
    if (node) musicNodes.push(node);
  }

  // Deep rumble (tectonic/cave)
  if (cfg.rumble) {
    const node = createRumbleLayer(cfg.rumble, isNight);
    if (node) musicNodes.push(node);
  }

  // Texture layers: rustle, crowd, sandHiss, fireCrackle, whistle
  if (cfg.rustle) musicNodes.push(createTextureLayer(cfg.rustle, "rustle"));
  if (cfg.crowd) musicNodes.push(createTextureLayer(cfg.crowd, "crowd"));
  if (cfg.sandHiss) musicNodes.push(createTextureLayer(cfg.sandHiss, "sandHiss"));
  if (cfg.fireCrackle) musicNodes.push(createTextureLayer(cfg.fireCrackle, "fireCrackle"));
  if (cfg.whistle) musicNodes.push(createTextureLayer(cfg.whistle, "whistle"));

  // Creature sound layers (scheduled random calls)
  if (cfg.creatures) musicNodes.push(createCreatureLayer(cfg.creatures, "creatures"));
  if (cfg.creatures2) musicNodes.push(createCreatureLayer(cfg.creatures2, "creatures2"));

  // Water drips
  if (cfg.drips) musicNodes.push(createDripLayer(cfg.drips));

  // Wood creaking
  if (cfg.creak) musicNodes.push(createCreakLayer(cfg.creak));

  // Weather overlay (rain, storm, gale, fog)
  _addWeatherNodes(weatherId);
}

// ─── STOP ALL AMBIENT NODES ───
function _stopAllNodes() {
  musicNodes.forEach(node => {
    if (!node) return;
    // Handle sub-arrays (insect layers)
    if (node._sub) {
      node._sub.forEach(sub => {
        Object.values(sub).forEach(n => {
          if (n && typeof n.stop === "function") try { n.stop(); } catch (_) {}
          if (n && typeof n.disconnect === "function") try { n.disconnect(); } catch (_) {}
        });
      });
      return;
    }
    if (typeof node.stop === "function" && !node.frequency) {
      try { node.stop(); } catch (_) {}
    }
    Object.values(node).forEach(n => {
      if (n && typeof n.stop === "function") try { n.stop(); } catch (_) {}
      if (n && typeof n.disconnect === "function") try { n.disconnect(); } catch (_) {}
    });
  });
  musicNodes = [];
  // Clear all creature/drip/creak timers
  creatureTimers.forEach(t => clearTimeout(t));
  creatureTimers = [];
  if (chimeTimer) { clearTimeout(chimeTimer); chimeTimer = null; }
  if (percTimer) { clearTimeout(percTimer); percTimer = null; }
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
  currentWeather = null;
  currentRiver = false;
  if (thunderTimer) { clearTimeout(thunderTimer); thunderTimer = null; }
}

// Helper to tear down old nodes with crossfade
function _crossfadeTo(createFn) {
  const c = getCtx();
  const now = c.currentTime;

  if (musicNodes.length > 0) {
    musicGain.gain.setTargetAtTime(0, now, 0.25);
    const oldNodes = [...musicNodes];
    musicNodes = [];
    if (chimeTimer) { clearTimeout(chimeTimer); chimeTimer = null; }
    if (thunderTimer) { clearTimeout(thunderTimer); thunderTimer = null; }
    creatureTimers.forEach(t => clearTimeout(t));
    creatureTimers = [];

    setTimeout(() => {
      oldNodes.forEach(node => {
        if (!node) return;
        if (node._sub) {
          node._sub.forEach(sub => {
            Object.values(sub).forEach(n => {
              if (n && typeof n.stop === "function") try { n.stop(); } catch (_) {}
              if (n && typeof n.disconnect === "function") try { n.disconnect(); } catch (_) {}
            });
          });
          return;
        }
        if (typeof node.stop === "function" && !node.frequency) {
          try { node.stop(); } catch (_) {}
        }
        Object.values(node).forEach(n => {
          if (n && typeof n.stop === "function") try { n.stop(); } catch (_) {}
          if (n && typeof n.disconnect === "function") try { n.disconnect(); } catch (_) {}
        });
      });
      createFn();
      musicGain.gain.setTargetAtTime(0.55, c.currentTime, 0.35);
    }, 600);
  } else {
    createFn();
  }
}

export function changeBiomeMusic(biomeId, isNight, weatherId) {
  if (!musicPlaying) return;
  const wId = weatherId || null;
  if (biomeId === currentBiomeId && isNight === currentNight && wId === currentWeather && !currentRiver) return;

  currentRiver = false;
  _crossfadeTo(() => {
    currentBiomeId = biomeId;
    currentNight = isNight;
    currentWeather = wId;
    _createBiomeNodes(biomeId, isNight, wId);
  });
}

// Start river/sailing ambient soundscape (replaces biome ambience during river segment)
export function startRiverAmbience() {
  if (!musicPlaying) return;
  if (currentRiver) return;
  currentRiver = true;

  _crossfadeTo(() => {
    _createRiverNodes();
  });
}

// Stop river ambience and restore biome sounds
export function stopRiverAmbience() {
  if (!currentRiver) return;
  currentRiver = false;
  // Re-create biome ambience
  if (currentBiomeId) {
    _crossfadeTo(() => {
      _createBiomeNodes(currentBiomeId, currentNight, currentWeather);
    });
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
    // Fuse sizzle — crackling gunpowder hiss with random pops
    const fizLen = Math.floor(c.sampleRate * 0.22);
    const fizBuf = c.createBuffer(1, fizLen, c.sampleRate);
    const fizD = fizBuf.getChannelData(0);
    for (let i = 0; i < fizLen; i++) {
      const t = i / fizLen;
      // Increasing crackle with random sputter pops
      const base = (Math.random() * 2 - 1) * Math.pow(t, 1.2) * 0.5;
      const pop = Math.random() > 0.97 ? (Math.random() * 2 - 1) * 0.8 : 0;
      fizD[i] = base + pop;
    }
    const fizN = c.createBufferSource(); fizN.buffer = fizBuf;
    const fizHP = c.createBiquadFilter(); fizHP.type = "highpass"; fizHP.frequency.value = 2500;
    const fizBP = c.createBiquadFilter(); fizBP.type = "bandpass"; fizBP.frequency.value = 5000; fizBP.Q.value = 0.8;
    const fizG = c.createGain(); fizG.gain.setValueAtTime(0.1, now);
    fizG.gain.linearRampToValueAtTime(0.25, now + 0.18);
    fizG.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    fizN.connect(fizHP); fizHP.connect(fizBP); fizBP.connect(fizG); fizG.connect(dest); fizN.start(now);
    // Pressure wave snap — the initial supersonic crack of detonation
    const snapLen = Math.floor(c.sampleRate * 0.006);
    const snapBuf = c.createBuffer(1, snapLen, c.sampleRate);
    const snapD = snapBuf.getChannelData(0);
    for (let i = 0; i < snapLen; i++) snapD[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / snapLen, 0.3);
    const snapN = c.createBufferSource(); snapN.buffer = snapBuf;
    const snapG = c.createGain(); snapG.gain.setValueAtTime(0.55, now + 0.22);
    snapG.gain.exponentialRampToValueAtTime(0.001, now + 0.235);
    snapN.connect(snapG); snapG.connect(dest); snapN.start(now + 0.22);
    // Main blast — layered broadband explosion with realistic envelope
    const blastLen = Math.floor(c.sampleRate * 0.5);
    const blastBuf = c.createBuffer(1, blastLen, c.sampleRate);
    const blastD = blastBuf.getChannelData(0);
    for (let i = 0; i < blastLen; i++) {
      const t = i / blastLen;
      // Fast attack, double-hump decay (initial blast + reflected wave)
      const env = Math.exp(-t * 5) + 0.3 * Math.exp(-Math.pow(t - 0.15, 2) * 200);
      blastD[i] = (Math.random() * 2 - 1) * env;
    }
    const blastN = c.createBufferSource(); blastN.buffer = blastBuf;
    const blastLP = c.createBiquadFilter(); blastLP.type = "lowpass";
    blastLP.frequency.setValueAtTime(1200, now + 0.22);
    blastLP.frequency.exponentialRampToValueAtTime(300, now + 0.65);
    blastLP.Q.value = 0.7;
    const blastG = c.createGain(); blastG.gain.setValueAtTime(0.45, now + 0.22);
    blastG.gain.exponentialRampToValueAtTime(0.001, now + 0.72);
    blastN.connect(blastLP); blastLP.connect(blastG); blastG.connect(dest); blastN.start(now + 0.22);
    // Sub-bass pressure wave — felt more than heard
    const sub = c.createOscillator(); sub.type = "sine";
    sub.frequency.setValueAtTime(60, now + 0.22);
    sub.frequency.exponentialRampToValueAtTime(18, now + 0.6);
    const subG = c.createGain(); subG.gain.setValueAtTime(0.4, now + 0.22);
    subG.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    sub.connect(subG); subG.connect(dest); sub.start(now + 0.22); sub.stop(now + 0.7);
    // Mid-bass cannon thump — the "punch" of the explosion
    const cannon = c.createOscillator(); cannon.type = "sine";
    cannon.frequency.setValueAtTime(150, now + 0.22);
    cannon.frequency.exponentialRampToValueAtTime(40, now + 0.45);
    const canG = c.createGain(); canG.gain.setValueAtTime(0.35, now + 0.22);
    canG.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    cannon.connect(canG); canG.connect(dest); cannon.start(now + 0.22); cannon.stop(now + 0.55);
    // Debris shower — scattered fragments raining down
    const debLen = Math.floor(c.sampleRate * 0.4);
    const debBuf = c.createBuffer(1, debLen, c.sampleRate);
    const debD = debBuf.getChannelData(0);
    for (let i = 0; i < debLen; i++) {
      const t = i / debLen;
      // Sparse random clicks simulating falling debris
      const click = Math.random() > (0.95 + t * 0.04) ? (Math.random() * 2 - 1) * 0.6 : 0;
      const noise = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.5) * 0.15;
      debD[i] = click + noise;
    }
    const debN = c.createBufferSource(); debN.buffer = debBuf;
    const debBP = c.createBiquadFilter(); debBP.type = "bandpass"; debBP.frequency.value = 2500; debBP.Q.value = 1;
    const debG = c.createGain(); debG.gain.setValueAtTime(0.12, now + 0.35);
    debG.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
    debN.connect(debBP); debBP.connect(debG); debG.connect(dest); debN.start(now + 0.35);
    // Fire crackle tail — remaining flames
    const fireLen = Math.floor(c.sampleRate * 0.3);
    const fireBuf = c.createBuffer(1, fireLen, c.sampleRate);
    const fireD = fireBuf.getChannelData(0);
    for (let i = 0; i < fireLen; i++) {
      const t = i / fireLen;
      const env = Math.pow(1 - t, 3);
      fireD[i] = (Math.random() * 2 - 1) * env * (Math.random() > 0.85 ? 1 : 0.15);
    }
    const fireN = c.createBufferSource(); fireN.buffer = fireBuf;
    const fireHP = c.createBiquadFilter(); fireHP.type = "highpass"; fireHP.frequency.value = 3500;
    const fireG = c.createGain(); fireG.gain.setValueAtTime(0.08, now + 0.45);
    fireG.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
    fireN.connect(fireHP); fireHP.connect(fireG); fireG.connect(dest); fireN.start(now + 0.45);
  });
}

export function sfxLightning() {
  playSfx((c, now, dest) => {
    // Supersonic crack — initial muzzle blast transient
    const crkLen = Math.floor(c.sampleRate * 0.004);
    const crkBuf = c.createBuffer(1, crkLen, c.sampleRate);
    const crkD = crkBuf.getChannelData(0);
    for (let i = 0; i < crkLen; i++) crkD[i] = (i % 2 === 0 ? 1 : -1) * Math.pow(1 - i / crkLen, 0.3);
    const crkN = c.createBufferSource(); crkN.buffer = crkBuf;
    const crkG = c.createGain(); crkG.gain.setValueAtTime(0.65, now);
    crkG.gain.exponentialRampToValueAtTime(0.001, now + 0.008);
    crkN.connect(crkG); crkG.connect(dest); crkN.start(now);
    // Muzzle blast body — sharp broadband burst with fast lowpass sweep
    const blastLen = Math.floor(c.sampleRate * 0.06);
    const blastBuf = c.createBuffer(1, blastLen, c.sampleRate);
    const blastD = blastBuf.getChannelData(0);
    for (let i = 0; i < blastLen; i++) blastD[i] = (Math.random() * 2 - 1) * Math.exp(-i / (blastLen * 0.15));
    const blastN = c.createBufferSource(); blastN.buffer = blastBuf;
    const blastLP = c.createBiquadFilter(); blastLP.type = "lowpass";
    blastLP.frequency.setValueAtTime(8000, now); blastLP.frequency.exponentialRampToValueAtTime(800, now + 0.05);
    const blastG = c.createGain(); blastG.gain.setValueAtTime(0.5, now);
    blastG.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    blastN.connect(blastLP); blastLP.connect(blastG); blastG.connect(dest); blastN.start(now);
    // Gunpowder punch — mid-frequency thump
    const punch = c.createOscillator(); punch.type = "triangle";
    punch.frequency.setValueAtTime(300, now);
    punch.frequency.exponentialRampToValueAtTime(80, now + 0.05);
    const punchG = c.createGain(); punchG.gain.setValueAtTime(0.3, now);
    punchG.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    punch.connect(punchG); punchG.connect(dest); punch.start(now); punch.stop(now + 0.08);
    // Smoke hiss — gunpowder gas escaping
    const hissLen = Math.floor(c.sampleRate * 0.2);
    const hissBuf = c.createBuffer(1, hissLen, c.sampleRate);
    const hissD = hissBuf.getChannelData(0);
    for (let i = 0; i < hissLen; i++) hissD[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / hissLen, 2.5);
    const hissN = c.createBufferSource(); hissN.buffer = hissBuf;
    const hissHP = c.createBiquadFilter(); hissHP.type = "highpass"; hissHP.frequency.value = 2000;
    const hissBP = c.createBiquadFilter(); hissBP.type = "bandpass"; hissBP.frequency.value = 4000; hissBP.Q.value = 0.8;
    const hissG = c.createGain(); hissG.gain.setValueAtTime(0.12, now + 0.02);
    hissG.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    hissN.connect(hissHP); hissHP.connect(hissBP); hissBP.connect(hissG); hissG.connect(dest); hissN.start(now + 0.02);
    // Distance echo — delayed, filtered reflection
    const echoLen = Math.floor(c.sampleRate * 0.15);
    const echoBuf = c.createBuffer(1, echoLen, c.sampleRate);
    const echoD = echoBuf.getChannelData(0);
    for (let i = 0; i < echoLen; i++) echoD[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / echoLen, 4);
    const echoN = c.createBufferSource(); echoN.buffer = echoBuf;
    const echoLP = c.createBiquadFilter(); echoLP.type = "lowpass"; echoLP.frequency.value = 500;
    const echoG = c.createGain(); echoG.gain.setValueAtTime(0.08, now + 0.08);
    echoG.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    echoN.connect(echoLP); echoLP.connect(echoG); echoG.connect(dest); echoN.start(now + 0.08);
  });
}

export function sfxIceLance() {
  playSfx((c, now, dest) => {
    // Crystalline formation — ascending harmonic series with shimmer
    [1800, 2700, 4200, 5600].forEach((freq, i) => {
      const osc = c.createOscillator(); osc.type = "sine";
      osc.frequency.setValueAtTime(freq * 0.8, now + i * 0.025);
      osc.frequency.exponentialRampToValueAtTime(freq, now + i * 0.025 + 0.05);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.9, now + 0.3);
      const g = c.createGain();
      g.gain.setValueAtTime(0.08 / (i * 0.5 + 1), now + i * 0.025);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.25 + i * 0.04);
      osc.connect(g); g.connect(dest);
      osc.start(now + i * 0.025); osc.stop(now + 0.35 + i * 0.04);
    });
    // Frost whoosh — icy wind sound
    const whooshLen = Math.floor(c.sampleRate * 0.15);
    const whooshBuf = c.createBuffer(1, whooshLen, c.sampleRate);
    const whooshD = whooshBuf.getChannelData(0);
    for (let i = 0; i < whooshLen; i++) {
      const t = i / whooshLen;
      whooshD[i] = (Math.random() * 2 - 1) * Math.sin(t * Math.PI) * 0.5;
    }
    const whooshN = c.createBufferSource(); whooshN.buffer = whooshBuf;
    const whooshBP = c.createBiquadFilter(); whooshBP.type = "bandpass";
    whooshBP.frequency.setValueAtTime(1500, now);
    whooshBP.frequency.linearRampToValueAtTime(4000, now + 0.07);
    whooshBP.frequency.linearRampToValueAtTime(2000, now + 0.14);
    whooshBP.Q.value = 1.5;
    const whooshG = c.createGain(); whooshG.gain.setValueAtTime(0.15, now);
    whooshG.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    whooshN.connect(whooshBP); whooshBP.connect(whooshG); whooshG.connect(dest); whooshN.start(now);
    // Ice shatter on impact — glass-like breaking
    const shatLen = Math.floor(c.sampleRate * 0.08);
    const shatBuf = c.createBuffer(1, shatLen, c.sampleRate);
    const shatD = shatBuf.getChannelData(0);
    for (let i = 0; i < shatLen; i++) {
      const env = Math.pow(1 - i / shatLen, 1.5);
      shatD[i] = (Math.random() * 2 - 1) * env * (Math.random() > 0.6 ? 1 : 0.2);
    }
    const shatN = c.createBufferSource(); shatN.buffer = shatBuf;
    const shatHP = c.createBiquadFilter(); shatHP.type = "highpass"; shatHP.frequency.value = 3500;
    const shatG = c.createGain(); shatG.gain.setValueAtTime(0.18, now + 0.18);
    shatG.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    shatN.connect(shatHP); shatHP.connect(shatG); shatG.connect(dest); shatN.start(now + 0.18);
    // Deep ice crack — structural fracture
    const crack = c.createOscillator(); crack.type = "triangle";
    crack.frequency.setValueAtTime(180, now + 0.2);
    crack.frequency.exponentialRampToValueAtTime(40, now + 0.38);
    const crackG = c.createGain(); crackG.gain.setValueAtTime(0.15, now + 0.2);
    crackG.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    crack.connect(crackG); crackG.connect(dest); crack.start(now + 0.2); crack.stop(now + 0.42);
    // Tinkling ice fragments — delayed scattered sparkles
    [0.24, 0.28, 0.33, 0.37].forEach(delay => {
      const o = c.createOscillator(); o.type = "sine";
      o.frequency.value = 3000 + Math.random() * 3000;
      const gg = c.createGain(); gg.gain.setValueAtTime(0.04, now + delay);
      gg.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.04);
      o.connect(gg); gg.connect(dest); o.start(now + delay); o.stop(now + delay + 0.05);
    });
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
    // Final blow impact — short punchy transient
    const hitLen = Math.floor(c.sampleRate * 0.012);
    const hitBuf = c.createBuffer(1, hitLen, c.sampleRate);
    const hitD = hitBuf.getChannelData(0);
    for (let i = 0; i < hitLen; i++) hitD[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / hitLen, 0.5);
    const hitN = c.createBufferSource(); hitN.buffer = hitBuf;
    const hitG = c.createGain(); hitG.gain.setValueAtTime(0.3, now); hitG.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
    hitN.connect(hitG); hitG.connect(dest); hitN.start(now);
    // Death groan — vocal-like formant with descending pitch
    const groan = c.createOscillator(); groan.type = "sawtooth";
    groan.frequency.setValueAtTime(280, now);
    groan.frequency.exponentialRampToValueAtTime(120, now + 0.25);
    groan.frequency.exponentialRampToValueAtTime(60, now + 0.45);
    const formant1 = c.createBiquadFilter(); formant1.type = "bandpass"; formant1.frequency.value = 500; formant1.Q.value = 5;
    const formant2 = c.createBiquadFilter(); formant2.type = "bandpass"; formant2.frequency.value = 1200; formant2.Q.value = 3;
    const groanG = c.createGain(); groanG.gain.setValueAtTime(0.18, now);
    groanG.gain.linearRampToValueAtTime(0.12, now + 0.2);
    groanG.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    // Mix two formants for vowel-like quality
    const groanMix = c.createGain(); groanMix.gain.value = 1;
    groan.connect(formant1); groan.connect(formant2);
    formant1.connect(groanG); formant2.connect(groanMix);
    groanMix.gain.value = 0.6;
    groanG.connect(dest); groanMix.connect(groanG);
    groan.start(now); groan.stop(now + 0.55);
    // Body collapse thud — heavy, delayed
    const thud = c.createOscillator(); thud.type = "sine";
    thud.frequency.setValueAtTime(90, now + 0.2);
    thud.frequency.exponentialRampToValueAtTime(25, now + 0.4);
    const thudG = c.createGain(); thudG.gain.setValueAtTime(0.25, now + 0.2);
    thudG.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    thud.connect(thudG); thudG.connect(dest); thud.start(now + 0.2); thud.stop(now + 0.45);
    // Armor/gear clatter — short noise burst with metallic resonance
    const clatLen = Math.floor(c.sampleRate * 0.1);
    const clatBuf = c.createBuffer(1, clatLen, c.sampleRate);
    const clatD = clatBuf.getChannelData(0);
    for (let i = 0; i < clatLen; i++) {
      const t = i / clatLen;
      // Sparse metallic clicks
      const env = Math.pow(1 - t, 1.5);
      clatD[i] = (Math.random() * 2 - 1) * env * (Math.random() > 0.7 ? 1 : 0.15);
    }
    const clatN = c.createBufferSource(); clatN.buffer = clatBuf;
    const clatBP = c.createBiquadFilter(); clatBP.type = "bandpass"; clatBP.frequency.value = 2800; clatBP.Q.value = 2;
    const clatG = c.createGain(); clatG.gain.setValueAtTime(0.1, now + 0.22);
    clatG.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    clatN.connect(clatBP); clatBP.connect(clatG); clatG.connect(dest); clatN.start(now + 0.22);
    // Dust settle — very soft low noise
    const dustLen = Math.floor(c.sampleRate * 0.15);
    const dustBuf = c.createBuffer(1, dustLen, c.sampleRate);
    const dustD = dustBuf.getChannelData(0);
    for (let i = 0; i < dustLen; i++) dustD[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / dustLen, 3);
    const dustN = c.createBufferSource(); dustN.buffer = dustBuf;
    const dustLP = c.createBiquadFilter(); dustLP.type = "lowpass"; dustLP.frequency.value = 800;
    const dustG = c.createGain(); dustG.gain.setValueAtTime(0.06, now + 0.3);
    dustG.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    dustN.connect(dustLP); dustLP.connect(dustG); dustG.connect(dest); dustN.start(now + 0.3);
  });
}

export function sfxMeleeHit() {
  playSfx((c, now, dest) => {
    // Initial impact transient — sharp clap of metal on armor/flesh
    const impLen = Math.floor(c.sampleRate * 0.008);
    const impBuf = c.createBuffer(1, impLen, c.sampleRate);
    const impD = impBuf.getChannelData(0);
    for (let i = 0; i < impLen; i++) impD[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / impLen, 0.5);
    const impN = c.createBufferSource(); impN.buffer = impBuf;
    const impG = c.createGain(); impG.gain.setValueAtTime(0.4, now); impG.gain.exponentialRampToValueAtTime(0.001, now + 0.012);
    impN.connect(impG); impG.connect(dest); impN.start(now);
    // Cutlass blade ring — two inharmonic partials for realistic metal
    const ringFreqs = [720 + Math.random() * 60, 1380 + Math.random() * 100];
    ringFreqs.forEach((freq, i) => {
      const osc = c.createOscillator(); osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.6, now + 0.12);
      const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = freq; bp.Q.value = 8;
      const g = c.createGain(); g.gain.setValueAtTime(0.12 / (i + 1), now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.08 + i * 0.06);
      osc.connect(bp); bp.connect(g); g.connect(dest);
      osc.start(now); osc.stop(now + 0.12 + i * 0.06);
    });
    // Body/armor thud — heavy low-frequency punch with fast decay
    const body = c.createOscillator(); body.type = "sine";
    body.frequency.setValueAtTime(200, now);
    body.frequency.exponentialRampToValueAtTime(35, now + 0.1);
    const bodyG = c.createGain(); bodyG.gain.setValueAtTime(0.28, now);
    bodyG.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    body.connect(bodyG); bodyG.connect(dest); body.start(now); body.stop(now + 0.15);
    // Spark/scrape detail — very short high noise for metal-on-metal friction
    const spkLen = Math.floor(c.sampleRate * 0.025);
    const spkBuf = c.createBuffer(1, spkLen, c.sampleRate);
    const spkD = spkBuf.getChannelData(0);
    for (let i = 0; i < spkLen; i++) {
      const env = Math.pow(1 - i / spkLen, 2);
      spkD[i] = (Math.random() * 2 - 1) * env * (Math.random() > 0.5 ? 1 : 0.3);
    }
    const spkN = c.createBufferSource(); spkN.buffer = spkBuf;
    const spkF = c.createBiquadFilter(); spkF.type = "highpass"; spkF.frequency.value = 4000;
    const spkG = c.createGain(); spkG.gain.setValueAtTime(0.1, now + 0.005);
    spkG.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
    spkN.connect(spkF); spkF.connect(spkG); spkG.connect(dest); spkN.start(now + 0.005);
    // Cloth/leather rustle from swing follow-through
    const rustLen = Math.floor(c.sampleRate * 0.06);
    const rustBuf = c.createBuffer(1, rustLen, c.sampleRate);
    const rustD = rustBuf.getChannelData(0);
    for (let i = 0; i < rustLen; i++) rustD[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / rustLen, 3);
    const rustN = c.createBufferSource(); rustN.buffer = rustBuf;
    const rustF = c.createBiquadFilter(); rustF.type = "bandpass"; rustF.frequency.value = 1600; rustF.Q.value = 0.5;
    const rustG = c.createGain(); rustG.gain.setValueAtTime(0.04, now + 0.03);
    rustG.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    rustN.connect(rustF); rustF.connect(rustG); rustG.connect(dest); rustN.start(now + 0.03);
  });
}

export function sfxSaberSwipe() {
  playSfx((c, now, dest) => {
    // Air displacement whoosh — Doppler-like frequency sweep (low→high→low)
    const whooshLen = Math.floor(c.sampleRate * 0.18);
    const whooshBuf = c.createBuffer(1, whooshLen, c.sampleRate);
    const whooshD = whooshBuf.getChannelData(0);
    for (let i = 0; i < whooshLen; i++) {
      const t = i / whooshLen;
      // Bell-shaped envelope peaking at ~40%
      const env = Math.sin(t * Math.PI) * Math.pow(1 - t, 0.5);
      whooshD[i] = (Math.random() * 2 - 1) * env;
    }
    const whooshN = c.createBufferSource(); whooshN.buffer = whooshBuf;
    const whooshBP = c.createBiquadFilter(); whooshBP.type = "bandpass";
    whooshBP.frequency.setValueAtTime(800, now);
    whooshBP.frequency.linearRampToValueAtTime(2800, now + 0.07);
    whooshBP.frequency.linearRampToValueAtTime(1200, now + 0.16);
    whooshBP.Q.value = 1.5;
    const whooshG = c.createGain(); whooshG.gain.setValueAtTime(0.22, now);
    whooshG.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    whooshN.connect(whooshBP); whooshBP.connect(whooshG); whooshG.connect(dest); whooshN.start(now);
    // Blade tonal ring — slight metallic singing as blade cuts air
    const blade = c.createOscillator(); blade.type = "sine";
    blade.frequency.setValueAtTime(1800, now + 0.02);
    blade.frequency.exponentialRampToValueAtTime(2400, now + 0.08);
    blade.frequency.exponentialRampToValueAtTime(1600, now + 0.14);
    const bladeG = c.createGain(); bladeG.gain.setValueAtTime(0, now + 0.02);
    bladeG.gain.linearRampToValueAtTime(0.06, now + 0.05);
    bladeG.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    blade.connect(bladeG); bladeG.connect(dest); blade.start(now + 0.02); blade.stop(now + 0.16);
    // Low air thump — body of swing felt physically
    const thump = c.createOscillator(); thump.type = "sine";
    thump.frequency.setValueAtTime(120, now + 0.03);
    thump.frequency.exponentialRampToValueAtTime(60, now + 0.1);
    const thumpG = c.createGain(); thumpG.gain.setValueAtTime(0.08, now + 0.03);
    thumpG.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    thump.connect(thumpG); thumpG.connect(dest); thump.start(now + 0.03); thump.stop(now + 0.12);
  });
}

export function sfxSaberHit() {
  playSfx((c, now, dest) => {
    // Initial blade-on-body impact — short transient crack
    const impLen = Math.floor(c.sampleRate * 0.015);
    const impBuf = c.createBuffer(1, impLen, c.sampleRate);
    const impD = impBuf.getChannelData(0);
    for (let i = 0; i < impLen; i++) impD[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / impLen, 0.8);
    const impN = c.createBufferSource(); impN.buffer = impBuf;
    const impG = c.createGain(); impG.gain.setValueAtTime(0.3, now); impG.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
    impN.connect(impG); impG.connect(dest); impN.start(now);
    // Metallic ring with harmonics — blade vibration after strike
    [850, 1700, 3400].forEach((freq, i) => {
      const osc = c.createOscillator(); osc.type = i === 0 ? "triangle" : "sine";
      osc.frequency.setValueAtTime(freq * (1 + Math.random() * 0.02), now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.7, now + 0.12);
      const g = c.createGain();
      g.gain.setValueAtTime(0.08 / (i + 1), now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.1 + i * 0.04);
      osc.connect(g); g.connect(dest);
      osc.start(now); osc.stop(now + 0.15 + i * 0.04);
    });
    // Flesh thud — low frequency body resonance
    const body = c.createOscillator(); body.type = "sine";
    body.frequency.setValueAtTime(160, now);
    body.frequency.exponentialRampToValueAtTime(60, now + 0.08);
    const bodyG = c.createGain(); bodyG.gain.setValueAtTime(0.14, now);
    bodyG.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    body.connect(bodyG); bodyG.connect(dest); body.start(now); body.stop(now + 0.12);
    // Wet cut detail — short bandpass noise
    const wetLen = Math.floor(c.sampleRate * 0.04);
    const wetBuf = c.createBuffer(1, wetLen, c.sampleRate);
    const wetD = wetBuf.getChannelData(0);
    for (let i = 0; i < wetLen; i++) wetD[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / wetLen, 2);
    const wetN = c.createBufferSource(); wetN.buffer = wetBuf;
    const wetF = c.createBiquadFilter(); wetF.type = "bandpass"; wetF.frequency.value = 2200; wetF.Q.value = 3;
    const wetG = c.createGain(); wetG.gain.setValueAtTime(0.06, now + 0.01);
    wetG.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    wetN.connect(wetF); wetF.connect(wetG); wetG.connect(dest); wetN.start(now + 0.01);
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
    // Initial impact transient — sharp wood crack
    const crkLen = Math.floor(c.sampleRate * 0.01);
    const crkBuf = c.createBuffer(1, crkLen, c.sampleRate);
    const crkD = crkBuf.getChannelData(0);
    for (let i = 0; i < crkLen; i++) crkD[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / crkLen, 0.5);
    const crkN = c.createBufferSource(); crkN.buffer = crkBuf;
    const crkG = c.createGain(); crkG.gain.setValueAtTime(0.4, now);
    crkG.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
    crkN.connect(crkG); crkG.connect(dest); crkN.start(now);
    // Heavy wood resonance — thick plank vibration with two formants
    const wood1 = c.createOscillator(); wood1.type = "triangle";
    wood1.frequency.setValueAtTime(220, now);
    wood1.frequency.exponentialRampToValueAtTime(80, now + 0.12);
    const wood1G = c.createGain(); wood1G.gain.setValueAtTime(0.3, now);
    wood1G.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    wood1.connect(wood1G); wood1G.connect(dest); wood1.start(now); wood1.stop(now + 0.18);
    const wood2 = c.createOscillator(); wood2.type = "triangle";
    wood2.frequency.setValueAtTime(440, now);
    wood2.frequency.exponentialRampToValueAtTime(150, now + 0.08);
    const wood2BP = c.createBiquadFilter(); wood2BP.type = "bandpass"; wood2BP.frequency.value = 350; wood2BP.Q.value = 3;
    const wood2G = c.createGain(); wood2G.gain.setValueAtTime(0.12, now);
    wood2G.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    wood2.connect(wood2BP); wood2BP.connect(wood2G); wood2G.connect(dest); wood2.start(now); wood2.stop(now + 0.12);
    // Splintering — rapid crackling noise with sharp envelope
    const splLen = Math.floor(c.sampleRate * 0.12);
    const splBuf = c.createBuffer(1, splLen, c.sampleRate);
    const splD = splBuf.getChannelData(0);
    for (let i = 0; i < splLen; i++) {
      const t = i / splLen;
      const env = Math.exp(-t * 8);
      // Random splintering pops
      const pop = Math.random() > (0.88 + t * 0.1) ? (Math.random() * 2 - 1) * 0.9 : 0;
      splD[i] = ((Math.random() * 2 - 1) * env * 0.3) + pop * env;
    }
    const splN = c.createBufferSource(); splN.buffer = splBuf;
    const splBP = c.createBiquadFilter(); splBP.type = "bandpass"; splBP.frequency.value = 2200; splBP.Q.value = 1.5;
    const splG = c.createGain(); splG.gain.setValueAtTime(0.2, now + 0.005);
    splG.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    splN.connect(splBP); splBP.connect(splG); splG.connect(dest); splN.start(now + 0.005);
    // Iron band clang — nails/metal fittings resonating
    const iron = c.createOscillator(); iron.type = "square";
    iron.frequency.setValueAtTime(680, now + 0.01);
    iron.frequency.exponentialRampToValueAtTime(280, now + 0.08);
    const ironBP = c.createBiquadFilter(); ironBP.type = "bandpass"; ironBP.frequency.value = 900; ironBP.Q.value = 6;
    const ironG = c.createGain(); ironG.gain.setValueAtTime(0.08, now + 0.01);
    ironG.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    iron.connect(ironBP); ironBP.connect(ironG); ironG.connect(dest); iron.start(now + 0.01); iron.stop(now + 0.12);
    // Debris fall — scattered wood chunks
    const debLen = Math.floor(c.sampleRate * 0.2);
    const debBuf = c.createBuffer(1, debLen, c.sampleRate);
    const debD = debBuf.getChannelData(0);
    for (let i = 0; i < debLen; i++) {
      const t = i / debLen;
      // Sparse clicks for falling pieces
      const click = Math.random() > (0.94 + t * 0.05) ? (Math.random() * 2 - 1) * 0.5 : 0;
      debD[i] = click * Math.pow(1 - t, 1.5);
    }
    const debN = c.createBufferSource(); debN.buffer = debBuf;
    const debBP = c.createBiquadFilter(); debBP.type = "bandpass"; debBP.frequency.value = 3500; debBP.Q.value = 0.8;
    const debG = c.createGain(); debG.gain.setValueAtTime(0.08, now + 0.06);
    debG.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    debN.connect(debBP); debBP.connect(debG); debG.connect(dest); debN.start(now + 0.06);
    // Sub thud — structural vibration felt through the ground
    const sub = c.createOscillator(); sub.type = "sine";
    sub.frequency.setValueAtTime(50, now);
    sub.frequency.exponentialRampToValueAtTime(20, now + 0.15);
    const subG = c.createGain(); subG.gain.setValueAtTime(0.15, now);
    subG.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    sub.connect(subG); subG.connect(dest); sub.start(now); sub.stop(now + 0.2);
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
