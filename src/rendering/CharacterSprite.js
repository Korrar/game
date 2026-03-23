// CharacterSprite — PixiJS icon-based character rendering
// Each enemy/NPC is represented by a hand-drawn icon sprite
// On death, the icon splits into individual limb pieces that fly apart via physics

import { Container, Graphics, Sprite, Texture } from "pixi.js";
import { HALF_HEIGHTS, FIGURE_HALF_HEIGHT } from "../physics/bodies/constants.js";
import { getNpcIconCanvas } from "./icons.js";
import { shadowAtDepth, fogAtDepth, desatAtDepth } from "./DepthSystem.js";

// Glow color presets
const GLOW_FRIENDLY = { color: 0x3cdc50, alpha: 0.5 };
const GLOW_ENEMY = { color: 0xc83c3c, alpha: 0.35 };
const GLOW_HIT = { color: 0xff2828, alpha: 0.7 };

// ─── NPC VISUAL STATE SYSTEM ───
export const NPC_VISUAL_STATES = {
  IDLE: "idle",
  ALERT: "alert",       // enemy noticed caravan, approaching
  WINDUP: "windup",     // winding up ability/attack
  ATTACKING: "attacking", // mid-attack (melee slash or projectile fire)
  CHARGING: "charging",  // charge rush (3x speed)
};

export const GLOW_ALERT = { color: 0xff6a20, alpha: 0.55 };    // bright orange
export const GLOW_CHARGING = { color: 0xffcc00, alpha: 0.7 };  // intense yellow
export const GLOW_LOW_HP = { color: 0x8b0000, alpha: 0.5 };    // dark red

// Idle bob animation
export const IDLE_BOB_SPEED = 0.003;   // radians per ms
export const IDLE_BOB_AMOUNT = 2;       // pixels up/down

// Enhanced melee lunge
export const ENHANCED_LUNGE_OFFSET = 24;
export const ENHANCED_LUNGE_FRAMES = 12;
export const LUNGE_DECAY = 0.88;

// Icon size per body type (in pixels)
const ICON_SIZES = {
  humanoid: 48, quadruped: 44, floating: 44, scorpion: 40,
  spider: 38, frog: 36, serpent: 44, barricade: 52, tower: 56,
  meteorBoulder: 60,
  lizard: 44, crab: 40, bird: 44, tentacle: 42, primate: 46, fish: 38,
};

// ─── LIMB VISUAL DEFINITIONS ───
// Maps body type → limb name → { shape, hw, hh, r, color: "body"|"armor"|"skin"|"dark"|"blood" }
// hw/hh = half-width/half-height for rects, r = radius for circles

function hexToInt(hex) {
  return parseInt(hex.replace("#", ""), 16);
}

function darkenHex(hex, factor = 0.7) {
  const c = parseInt(hex.replace("#", ""), 16);
  const r = Math.round(((c >> 16) & 0xff) * factor);
  const g = Math.round(((c >> 8) & 0xff) * factor);
  const b = Math.round((c & 0xff) * factor);
  return (r << 16) | (g << 8) | b;
}

function lightenHex(hex, factor = 1.3) {
  const c = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.round(((c >> 16) & 0xff) * factor));
  const g = Math.min(255, Math.round(((c >> 8) & 0xff) * factor));
  const b = Math.min(255, Math.round((c & 0xff) * factor));
  return (r << 16) | (g << 8) | b;
}

const LIMB_DEFS = {
  humanoid: {
    head:      { shape: "circle", r: 10, color: "skin" },
    torso:     { shape: "rect", hw: 6, hh: 12, color: "armor" },
    lUpperArm: { shape: "rect", hw: 2.5, hh: 7, color: "body" },
    rUpperArm: { shape: "rect", hw: 2.5, hh: 7, color: "body" },
    lLowerArm: { shape: "rect", hw: 2, hh: 6, color: "skin" },
    rLowerArm: { shape: "rect", hw: 2, hh: 6, color: "skin" },
    lUpperLeg: { shape: "rect", hw: 3, hh: 7, color: "dark" },
    rUpperLeg: { shape: "rect", hw: 3, hh: 7, color: "dark" },
    lLowerLeg: { shape: "rect", hw: 2.5, hh: 7, color: "armor" },
    rLowerLeg: { shape: "rect", hw: 2.5, hh: 7, color: "armor" },
  },
  quadruped: {
    head:  { shape: "circle", r: 8, color: "body" },
    torso: { shape: "rect", hw: 13, hh: 6, color: "body" },
    fl:    { shape: "rect", hw: 2.5, hh: 7, color: "dark" },
    fr:    { shape: "rect", hw: 2.5, hh: 7, color: "dark" },
    bl:    { shape: "rect", hw: 2.5, hh: 7, color: "dark" },
    br:    { shape: "rect", hw: 2.5, hh: 7, color: "dark" },
    tail:  { shape: "rect", hw: 2, hh: 5, color: "body" },
  },
  floating: {
    head:  { shape: "circle", r: 10, color: "body" },
    torso: { shape: "rect", hw: 7, hh: 14, color: "armor" },
    lArm:  { shape: "rect", hw: 2, hh: 8, color: "body" },
    rArm:  { shape: "rect", hw: 2, hh: 8, color: "body" },
    trail: { shape: "rect", hw: 2.5, hh: 5, color: "dark" },
  },
  scorpion: {
    head:    { shape: "circle", r: 6, color: "body" },
    torso:   { shape: "rect", hw: 15, hh: 7, color: "armor" },
    l1:      { shape: "rect", hw: 2, hh: 5, color: "dark" },
    l2:      { shape: "rect", hw: 2, hh: 5, color: "dark" },
    l3:      { shape: "rect", hw: 2, hh: 5, color: "dark" },
    r1:      { shape: "rect", hw: 2, hh: 5, color: "dark" },
    r2:      { shape: "rect", hw: 2, hh: 5, color: "dark" },
    r3:      { shape: "rect", hw: 2, hh: 5, color: "dark" },
    lPincer: { shape: "rect", hw: 2.5, hh: 5, color: "body" },
    rPincer: { shape: "rect", hw: 2.5, hh: 5, color: "body" },
    tail1:   { shape: "rect", hw: 2.5, hh: 4, color: "armor" },
    tail2:   { shape: "rect", hw: 2.5, hh: 4, color: "armor" },
    stinger: { shape: "circle", r: 3, color: "blood" },
  },
  spider: {
    head:    { shape: "circle", r: 6, color: "body" },
    torso:   { shape: "rect", hw: 9, hh: 6, color: "armor" },
    abdomen: { shape: "circle", r: 8, color: "body" },
    ll0:     { shape: "rect", hw: 1.5, hh: 6, color: "dark" },
    ll1:     { shape: "rect", hw: 1.5, hh: 6, color: "dark" },
    ll2:     { shape: "rect", hw: 1.5, hh: 6, color: "dark" },
    ll3:     { shape: "rect", hw: 1.5, hh: 6, color: "dark" },
    rl0:     { shape: "rect", hw: 1.5, hh: 6, color: "dark" },
    rl1:     { shape: "rect", hw: 1.5, hh: 6, color: "dark" },
    rl2:     { shape: "rect", hw: 1.5, hh: 6, color: "dark" },
    rl3:     { shape: "rect", hw: 1.5, hh: 6, color: "dark" },
  },
  frog: {
    head:   { shape: "circle", r: 8, color: "body" },
    torso:  { shape: "rect", hw: 8, hh: 6, color: "body" },
    lHind:  { shape: "rect", hw: 3, hh: 6, color: "dark" },
    rHind:  { shape: "rect", hw: 3, hh: 6, color: "dark" },
    lFront: { shape: "rect", hw: 2, hh: 4, color: "dark" },
    rFront: { shape: "rect", hw: 2, hh: 4, color: "dark" },
  },
  serpent: {
    head:    { shape: "circle", r: 9, color: "body" },
    torso:   { shape: "rect", hw: 8, hh: 6, color: "body" },
    seg2:    { shape: "rect", hw: 7, hh: 5, color: "armor" },
    seg3:    { shape: "rect", hw: 6, hh: 4, color: "body" },
    tailTip: { shape: "rect", hw: 3.5, hh: 3, color: "dark" },
    lFin:    { shape: "rect", hw: 2, hh: 4, color: "armor" },
    rFin:    { shape: "rect", hw: 2, hh: 4, color: "armor" },
  },
  barricade: {
    torso:    { shape: "rect", hw: 16, hh: 23, color: "body" },
    head:     { shape: "rect", hw: 5, hh: 5, color: "armor" },
    plankL:   { shape: "rect", hw: 3, hh: 18, color: "body" },
    plankR:   { shape: "rect", hw: 3, hh: 18, color: "body" },
    crossbar: { shape: "rect", hw: 18, hh: 3, color: "armor" },
  },
  tower: {
    torso:  { shape: "rect", hw: 12, hh: 26, color: "body" },
    head:   { shape: "rect", hw: 7, hh: 7, color: "armor" },
    roofL:  { shape: "rect", hw: 3.5, hh: 2.5, color: "dark" },
    roofR:  { shape: "rect", hw: 3.5, hh: 2.5, color: "dark" },
    baseL:  { shape: "rect", hw: 3.5, hh: 5, color: "armor" },
    baseR:  { shape: "rect", hw: 3.5, hh: 5, color: "armor" },
  },
  meteorBoulder: {
    torso:  { shape: "rect", hw: 18, hh: 16, color: "body" },
    head:   { shape: "circle", r: 10, color: "armor" },
    fragL:  { shape: "rect", hw: 8, hh: 10, color: "body" },
    fragR:  { shape: "rect", hw: 8, hh: 10, color: "body" },
    crustT: { shape: "rect", hw: 12, hh: 6, color: "dark" },
    crustB: { shape: "rect", hw: 14, hh: 5, color: "dark" },
  },
  // ─── NEW BODY TYPES ───
  lizard: {
    head:  { shape: "circle", r: 8, color: "body" },
    torso: { shape: "rect", hw: 14, hh: 5, color: "body" },
    fl:    { shape: "rect", hw: 2.5, hh: 5, color: "dark" },
    fr:    { shape: "rect", hw: 2.5, hh: 5, color: "dark" },
    bl:    { shape: "rect", hw: 2.5, hh: 5, color: "dark" },
    br:    { shape: "rect", hw: 2.5, hh: 5, color: "dark" },
    tail:  { shape: "rect", hw: 2, hh: 7, color: "armor" },
    jaw:   { shape: "rect", hw: 5, hh: 2, color: "body" },
  },
  crab: {
    head:    { shape: "circle", r: 4, color: "body" },
    torso:   { shape: "rect", hw: 16, hh: 7, color: "armor" },
    l1:      { shape: "rect", hw: 1.5, hh: 5, color: "dark" },
    l2:      { shape: "rect", hw: 1.5, hh: 5, color: "dark" },
    l3:      { shape: "rect", hw: 1.5, hh: 5, color: "dark" },
    r1:      { shape: "rect", hw: 1.5, hh: 5, color: "dark" },
    r2:      { shape: "rect", hw: 1.5, hh: 5, color: "dark" },
    r3:      { shape: "rect", hw: 1.5, hh: 5, color: "dark" },
    lPincer: { shape: "rect", hw: 3, hh: 5, color: "body" },
    rPincer: { shape: "rect", hw: 3, hh: 5, color: "body" },
  },
  bird: {
    head:   { shape: "circle", r: 7, color: "body" },
    torso:  { shape: "rect", hw: 7, hh: 9, color: "body" },
    lWing:  { shape: "rect", hw: 3, hh: 10, color: "armor" },
    rWing:  { shape: "rect", hw: 3, hh: 10, color: "armor" },
    tail:   { shape: "rect", hw: 3, hh: 5, color: "dark" },
    lClaw:  { shape: "rect", hw: 2, hh: 4, color: "dark" },
    rClaw:  { shape: "rect", hw: 2, hh: 4, color: "dark" },
  },
  tentacle: {
    head:  { shape: "circle", r: 12, color: "body" },
    torso: { shape: "rect", hw: 8, hh: 8, color: "armor" },
    t1:    { shape: "rect", hw: 2, hh: 6, color: "body" },
    t2:    { shape: "rect", hw: 2, hh: 6, color: "body" },
    t3:    { shape: "rect", hw: 2, hh: 6, color: "dark" },
    t4:    { shape: "rect", hw: 2, hh: 6, color: "dark" },
    t5:    { shape: "rect", hw: 1.5, hh: 5, color: "body" },
    t6:    { shape: "rect", hw: 1.5, hh: 5, color: "body" },
  },
  primate: {
    head:  { shape: "circle", r: 8, color: "skin" },
    torso: { shape: "rect", hw: 6, hh: 10, color: "body" },
    lArm:  { shape: "rect", hw: 2.5, hh: 10, color: "body" },
    rArm:  { shape: "rect", hw: 2.5, hh: 10, color: "body" },
    lLeg:  { shape: "rect", hw: 2.5, hh: 6, color: "dark" },
    rLeg:  { shape: "rect", hw: 2.5, hh: 6, color: "dark" },
    tail:  { shape: "rect", hw: 1.5, hh: 8, color: "armor" },
  },
  fish: {
    head:      { shape: "circle", r: 6, color: "body" },
    torso:     { shape: "rect", hw: 12, hh: 5, color: "body" },
    dorsalFin: { shape: "rect", hw: 2, hh: 4, color: "armor" },
    tailFin:   { shape: "rect", hw: 3, hh: 5, color: "armor" },
    lFin:      { shape: "rect", hw: 2, hh: 3, color: "dark" },
    rFin:      { shape: "rect", hw: 2, hh: 3, color: "dark" },
  },
};

export class CharacterSprite {
  constructor(npcData, friendly) {
    this.npcData = npcData;
    this.friendly = friendly;
    this.bodyType = npcData.bodyType || "humanoid";

    this.container = new Container();
    this.container.sortableChildren = true;

    // Graphics layers
    this.auraGfx = new Graphics();
    this.shadowGfx = new Graphics();
    this.glowGfx = new Graphics();
    this.weaponGfx = new Graphics();
    this.limbGfx = new Graphics(); // for ragdoll limb rendering

    this.auraGfx.zIndex = 0;
    this.shadowGfx.zIndex = 1;
    this.weaponGfx.zIndex = 3;
    this.glowGfx.zIndex = 4;
    this.limbGfx.zIndex = 3;

    this.container.addChild(this.auraGfx);
    this.container.addChild(this.shadowGfx);
    this.container.addChild(this.weaponGfx);
    this.container.addChild(this.glowGfx);
    this.container.addChild(this.limbGfx);

    // Create icon sprite from raw canvas (avoids PixiJS async data-URL issues)
    const iconSize = ICON_SIZES[this.bodyType] || 48;
    const bodyColor = friendly ? "#3a8a40" : (npcData.bodyColor || "#6a4a30");
    const armorColor = friendly ? "#2a5a28" : (npcData.armorColor || "#4a3a28");
    const iconCanvas = getNpcIconCanvas(this.bodyType, bodyColor, armorColor, iconSize);

    this.iconSprite = new Sprite(Texture.from(iconCanvas));
    this.iconSprite.anchor.set(0.5, 0.5);
    this.iconSprite.zIndex = 3;
    this.iconSize = iconSize;
    this.container.addChild(this.iconSprite);

    // Create hit flash icon (red-tinted version)
    const flashCanvas = getNpcIconCanvas(this.bodyType, "#cc2020", "#880000", iconSize);
    this.flashSprite = new Sprite(Texture.from(flashCanvas));
    this.flashSprite.anchor.set(0.5, 0.5);
    this.flashSprite.zIndex = 3;
    this.flashSprite.visible = false;
    this.container.addChild(this.flashSprite);

    // Precompute limb colors
    this._bodyColorInt = hexToInt(bodyColor);
    this._armorColorInt = hexToInt(armorColor);
    this._skinColorInt = lightenHex(bodyColor, 1.4);
    this._darkColorInt = darkenHex(bodyColor, 0.5);
    this._bloodColorInt = 0xaa2020;

    this._lastDir = 1;
    this._depthScale = 1;
  }

  _getLimbColor(colorKey) {
    switch (colorKey) {
      case "body": return this._bodyColorInt;
      case "armor": return this._armorColorInt;
      case "skin": return this._skinColorInt;
      case "dark": return this._darkColorInt;
      case "blood": return this._bloodColorInt;
      default: return this._bodyColorInt;
    }
  }

  update(entry, W, H, GY, fogVisibility, depth = 0.5, depthScale = 1.0) {
    if (!entry.limbBodies) return;

    const limbs = {};
    const limbRots = {};
    for (const [name, rb] of Object.entries(entry.limbBodies)) {
      const t = rb.translation();
      limbs[name] = { x: t.x, y: t.y };
      limbRots[name] = rb.rotation();
    }

    // Calculate alpha with fog (distance-based fog)
    let alpha = entry.fadeAlpha ?? 1;
    if (fogVisibility && !this.friendly && !entry.ragdoll) {
      let distPct;
      if (entry._wx !== undefined) {
        const dx = (entry._wx ?? 20) - 3;
        const dy = (entry._wy ?? 20) - 20;
        distPct = Math.sqrt(dx * dx + dy * dy) / 40;
      } else {
        const tx = entry._px || 0;
        const playerX = W * 0.2;
        distPct = Math.abs(tx - playerX) / W;
      }
      const fogAlpha = distPct < fogVisibility ? 1.0
        : distPct < fogVisibility * 2 ? 1.0 - ((distPct - fogVisibility) / fogVisibility)
        : 0.05;
      alpha *= fogAlpha;
    }
    const depthFog = fogAtDepth(depth);
    alpha *= (1 - depthFog * 0.5);
    alpha = Math.max(alpha, 0.15);
    this.container.alpha = alpha;

    const desat = desatAtDepth(depth);
    if (desat > 0.01 && this.container.filters !== undefined) {
      this.container.tint = desat > 0.1 ? 0xddddee : 0xffffff;
    } else if (this.container.tint !== 0xffffff) {
      this.container.tint = 0xffffff;
    }

    this._depthScale = depthScale;

    const dir = entry._dir || 1;
    this._lastDir = dir;
    const flash = entry.hitFlash > 0;

    // Read visual state from entry (set by App.jsx AI loop)
    const visualState = entry.visualState || NPC_VISUAL_STATES.IDLE;
    const hpPct = entry.hpPct ?? 1; // 0-1 ratio of current/max HP
    const now = Date.now();

    // Clear graphics
    this.auraGfx.clear();
    this.shadowGfx.clear();
    this.glowGfx.clear();
    this.weaponGfx.clear();
    this.limbGfx.clear();

    if (!limbs.torso) return;

    const tx = limbs.torso.x;
    const ty = limbs.torso.y;
    const halfH = HALF_HEIGHTS[this.bodyType] || FIGURE_HALF_HEIGHT;

    // ─── RAGDOLL: Draw individual limb pieces ───
    if (entry.ragdoll) {
      // Hide icon sprite, show limb graphics
      this.iconSprite.visible = false;
      this.flashSprite.visible = false;

      const defs = LIMB_DEFS[this.bodyType] || LIMB_DEFS.humanoid;
      const g = this.limbGfx;

      for (const [name, def] of Object.entries(defs)) {
        const pos = limbs[name];
        if (!pos) continue;
        const rot = limbRots[name] || 0;
        const color = this._getLimbColor(def.color);

        if (def.shape === "circle") {
          // Circle limb (head, abdomen, stinger, etc.)
          g.circle(pos.x, pos.y, def.r);
          g.fill({ color, alpha: 1 });
          // Head details: eyes
          if (name === "head") {
            const eyeOff = def.r * 0.35;
            g.circle(pos.x - eyeOff, pos.y - eyeOff * 0.5, 1.5);
            g.fill({ color: 0xffffff, alpha: 0.9 });
            g.circle(pos.x + eyeOff, pos.y - eyeOff * 0.5, 1.5);
            g.fill({ color: 0xffffff, alpha: 0.9 });
            g.circle(pos.x - eyeOff, pos.y - eyeOff * 0.5, 0.7);
            g.fill({ color: 0x111111, alpha: 0.9 });
            g.circle(pos.x + eyeOff, pos.y - eyeOff * 0.5, 0.7);
            g.fill({ color: 0x111111, alpha: 0.9 });
          }
        } else {
          // Rotated rectangle limb — compute 4 corners manually
          const cos = Math.cos(rot), sin = Math.sin(rot);
          const hw = def.hw, hh = def.hh;
          const cx = pos.x, cy = pos.y;
          const pts = [
            cx + (-hw * cos - (-hh) * sin), cy + (-hw * sin + (-hh) * cos),
            cx + (hw * cos - (-hh) * sin),  cy + (hw * sin + (-hh) * cos),
            cx + (hw * cos - hh * sin),     cy + (hw * sin + hh * cos),
            cx + (-hw * cos - hh * sin),    cy + (-hw * sin + hh * cos),
          ];
          g.poly(pts);
          g.fill({ color, alpha: 1 });
        }

        // Blood trail on severed connection points (small red dot)
        if (name !== "torso" && (entry.fadeTimer || 0) < 40) {
          const bloodAlpha = Math.max(0, 1 - (entry.fadeTimer || 0) / 40);
          g.circle(pos.x, pos.y, 2);
          g.fill({ color: 0xcc2020, alpha: bloodAlpha * 0.6 });
        }
      }

      return; // skip normal icon rendering
    }

    // ─── ALIVE: Normal icon rendering ───

    // P6: Idle bob animation — subtle floating motion
    const bob = Math.sin(now * IDLE_BOB_SPEED) * IDLE_BOB_AMOUNT;
    const renderTy = ty + bob;

    // Depth-aware shadow
    const shadow = shadowAtDepth(depth);
    this._drawShadow(this.shadowGfx, tx, ty + halfH + shadow.offsetY,
      14 * shadow.scaleX, 5 * shadow.scaleY, shadow.alpha);

    // Ground aura — state-aware color
    this._drawGroundAura(tx, ty, visualState, hpPct);

    // Position icon sprite at torso + bob offset
    this.iconSprite.position.set(tx, renderTy);
    this.flashSprite.position.set(tx, renderTy);

    // Hit flash
    if (flash) {
      this.iconSprite.visible = false;
      this.flashSprite.visible = true;
      this.flashSprite.alpha = 0.6 + (entry.hitFlash / 8) * 0.4;
    } else {
      this.iconSprite.visible = true;
      this.flashSprite.visible = false;
    }

    // P2: Windup telegraph — scale pulse + tilt
    let scaleBoost = 0;
    let tilt = 0;
    if (visualState === NPC_VISUAL_STATES.WINDUP) {
      const windupPulse = Math.sin(now * 0.015) * 0.5 + 0.5;
      scaleBoost = 0.08 * windupPulse;
      tilt = dir * 0.1 * windupPulse; // lean forward
    } else if (visualState === NPC_VISUAL_STATES.ATTACKING) {
      scaleBoost = 0.05;
      tilt = dir * -0.15; // snap back on hit
    } else if (visualState === NPC_VISUAL_STATES.CHARGING) {
      tilt = dir * 0.25; // lean forward heavily during charge
      scaleBoost = 0.04;
    }

    this.iconSprite.rotation = tilt;
    this.flashSprite.rotation = tilt;
    this.iconSprite.anchor.set(0.5, 0.5);
    this.flashSprite.anchor.set(0.5, 0.5);

    // 2.5D: scale sprites by depth + state boost
    const finalScale = this._depthScale + scaleBoost;
    this.iconSprite.scale.set(dir * finalScale, finalScale);
    this.flashSprite.scale.set(dir * finalScale, finalScale);

    // Glow ring — state-aware
    this._drawSymbolGlow(tx, renderTy, halfH, flash, visualState, hpPct);

    // P1: Alert "!" indicator
    if (!this.friendly && (visualState === NPC_VISUAL_STATES.ALERT || visualState === NPC_VISUAL_STATES.WINDUP)) {
      this._drawAlertIndicator(tx, renderTy, halfH, visualState);
    }

    // P5: Charge speed lines
    if (visualState === NPC_VISUAL_STATES.CHARGING) {
      this._drawChargeSpeedLines(tx, renderTy, dir, halfH);
    }

    // P7: Low HP darkening effect
    if (!this.friendly && hpPct < 0.3 && hpPct > 0) {
      this._drawLowHpEffect(tx, renderTy, halfH);
    }

    // Draw weapon (now for both friendlies AND enemies with attackAnim)
    if (entry.npcData.weapon && this.bodyType === "humanoid") {
      this._drawWeapon(limbs, entry, dir, GY);
    } else if (!this.friendly && entry.attackAnim > 0) {
      // P3: Enemy melee slash arc (no weapon model — draw generic slash)
      this._drawMeleeSlashArc(tx, renderTy, dir, entry.attackAnim, halfH);
    }
  }

  _drawSymbolGlow(tx, ty, halfH, flash, visualState = "idle", hpPct = 1) {
    const now = Date.now();
    const scale = this._depthScale || 1;
    const r = this.iconSize * 0.5 * scale;

    let glowColor, glowAlpha, pulseSpeed = 0.004;
    if (flash) {
      glowColor = GLOW_HIT.color;
      glowAlpha = GLOW_HIT.alpha;
    } else if (this.friendly) {
      glowColor = GLOW_FRIENDLY.color;
      glowAlpha = GLOW_FRIENDLY.alpha;
    } else if (visualState === NPC_VISUAL_STATES.CHARGING) {
      glowColor = GLOW_CHARGING.color;
      glowAlpha = GLOW_CHARGING.alpha;
      pulseSpeed = 0.012; // fast pulse
    } else if (visualState === NPC_VISUAL_STATES.WINDUP) {
      glowColor = GLOW_CHARGING.color;
      glowAlpha = GLOW_CHARGING.alpha * 0.8;
      pulseSpeed = 0.01;
    } else if (visualState === NPC_VISUAL_STATES.ALERT) {
      glowColor = GLOW_ALERT.color;
      glowAlpha = GLOW_ALERT.alpha;
      pulseSpeed = 0.006;
    } else if (hpPct < 0.3 && hpPct > 0) {
      glowColor = GLOW_LOW_HP.color;
      glowAlpha = GLOW_LOW_HP.alpha;
    } else {
      glowColor = GLOW_ENEMY.color;
      glowAlpha = GLOW_ENEMY.alpha;
    }

    const pulse = 0.7 + Math.sin(now * pulseSpeed) * 0.3;
    const finalAlpha = glowAlpha * pulse;

    // Main glow ring
    this.glowGfx.setStrokeStyle({ width: 2, color: glowColor, alpha: finalAlpha });
    this.glowGfx.circle(tx, ty, r);
    this.glowGfx.stroke();

    // P4: Ranged charge-up — expanding inner ring during windup
    if (visualState === NPC_VISUAL_STATES.WINDUP && !this.friendly) {
      const chargeR = r * 0.6 + Math.sin(now * 0.02) * r * 0.3;
      this.glowGfx.setStrokeStyle({ width: 1.5, color: 0xffaa00, alpha: finalAlpha * 0.6 });
      this.glowGfx.circle(tx, ty, chargeR);
      this.glowGfx.stroke();
      // Energy converging dots
      for (let i = 0; i < 4; i++) {
        const angle = now * 0.008 + i * Math.PI * 0.5;
        const dotR = r * 1.2 * (1 - (now % 600) / 600);
        const dx = tx + Math.cos(angle) * dotR;
        const dy = ty + Math.sin(angle) * dotR;
        this.glowGfx.circle(dx, dy, 2);
        this.glowGfx.fill({ color: 0xffcc00, alpha: finalAlpha * 0.5 });
      }
    }
  }

  _drawGroundAura(tx, ty, visualState = "idle", hpPct = 1) {
    const now = Date.now();
    const halfH = HALF_HEIGHTS[this.bodyType] || FIGURE_HALF_HEIGHT;
    let color, pulseBase, pulseAmp;
    if (this.friendly) {
      color = 0x3cdc50;
      pulseBase = 0.08; pulseAmp = 0.03;
    } else if (visualState === NPC_VISUAL_STATES.CHARGING) {
      color = 0xffcc00;
      pulseBase = 0.15; pulseAmp = 0.08;
    } else if (visualState === NPC_VISUAL_STATES.WINDUP) {
      color = 0xff8800;
      pulseBase = 0.12; pulseAmp = 0.05;
    } else if (visualState === NPC_VISUAL_STATES.ALERT) {
      color = 0xff5020;
      pulseBase = 0.10; pulseAmp = 0.04;
    } else if (hpPct < 0.3 && hpPct > 0) {
      color = 0x8b0000;
      pulseBase = 0.12; pulseAmp = 0.06;
    } else {
      color = 0xc83c3c;
      pulseBase = 0.08; pulseAmp = 0.02;
    }
    const pulse = pulseBase + Math.sin(now * 0.003) * pulseAmp;
    this.auraGfx.ellipse(tx, ty + halfH + 3, 16, 6);
    this.auraGfx.fill({ color, alpha: pulse });
  }

  _drawShadow(g, x, y, rx, ry, alpha = 0.25) {
    g.ellipse(x, y, rx, ry);
    g.fill({ color: 0x000000, alpha });
  }

  _drawWeapon(limbs, entry, dir, GY) {
    const w = this.weaponGfx;
    const weapon = entry.npcData.weapon;
    const rHand = limbs.rLowerArm;
    const lHand = limbs.lLowerArm;
    if (!rHand) return;
    const animT = (entry.attackAnim || 0) / 10;

    switch (weapon) {
      case "sword": {
        const angle = dir > 0 ? 0.3 - animT * 1.5 : Math.PI - 0.3 + animT * 1.5;
        const len = 20;
        const endX = rHand.x + Math.cos(angle) * len;
        const endY = rHand.y + 5 + Math.sin(angle) * len;
        w.setStrokeStyle({ width: 4, color: 0xd0d8e0, cap: "round" });
        w.moveTo(rHand.x, rHand.y + 5); w.lineTo(endX, endY); w.stroke();
        w.setStrokeStyle({ width: 1.5, color: 0xffffff, alpha: 0.3 });
        w.moveTo(rHand.x, rHand.y + 5); w.lineTo(endX, endY); w.stroke();
        w.setStrokeStyle({ width: 4, color: 0xd4a030 });
        w.moveTo(rHand.x - 5, rHand.y + 4); w.lineTo(rHand.x + 5, rHand.y + 6); w.stroke();
        if (animT > 0) {
          w.setStrokeStyle({ width: 2, color: 0xffffff, alpha: animT * 0.7 });
          w.moveTo(rHand.x, rHand.y + 5); w.lineTo(endX, endY); w.stroke();
        }
        break;
      }
      case "dagger": {
        for (const hand of [rHand, lHand]) {
          if (!hand) continue;
          const ox = animT > 0 ? dir * animT * 8 : 0;
          w.setStrokeStyle({ width: 2.5, color: 0xa0a8b0, cap: "round" });
          w.moveTo(hand.x, hand.y + 5); w.lineTo(hand.x + dir * 12 + ox, hand.y + 3); w.stroke();
        }
        break;
      }
      case "staff": {
        const shoulder = limbs.lUpperArm;
        if (!shoulder) break;
        const stX = shoulder.x - dir * 3, stY = shoulder.y - 20;
        w.setStrokeStyle({ width: 3.5, color: 0x6a4a2a, cap: "round" });
        const staffBottom = Math.min(GY - 2, shoulder.y + 50);
        w.moveTo(shoulder.x - dir, staffBottom); w.lineTo(stX, stY); w.stroke();
        const orbPulse = 0.6 + Math.sin(Date.now() * 0.004) * 0.3;
        const orbAlpha = animT > 0 ? 0.9 : 0.5 * orbPulse;
        w.circle(stX, stY - 4, 10);
        w.fill({ color: 0x60c060, alpha: orbAlpha * 0.2 });
        w.circle(stX, stY - 5, 5);
        w.fill({ color: 0x40a040, alpha: orbAlpha });
        w.circle(stX, stY - 5, 2.5);
        w.fill({ color: 0x80ff80, alpha: orbAlpha * 0.4 });
        break;
      }
      case "bow": {
        if (!lHand) break;
        const rx = lHand.x, ry = lHand.y;
        const bEnd = rx + dir * 22;
        w.setStrokeStyle({ width: 5, color: 0x6a4a20, cap: "round" });
        w.moveTo(rx - dir * 7, ry + 3); w.lineTo(rx, ry); w.stroke();
        w.setStrokeStyle({ width: 3, color: 0x909090, cap: "round" });
        w.moveTo(rx, ry); w.lineTo(bEnd, ry - 1); w.stroke();
        if (animT > 0) {
          w.circle(bEnd + dir * 3, ry - 1, 4 + animT * 4);
          w.fill({ color: 0xffa040, alpha: animT * 0.7 });
          w.circle(bEnd + dir * 3, ry - 1, 2);
          w.fill({ color: 0xffffff, alpha: animT * 0.5 });
        }
        break;
      }
    }
  }

  // P1: Alert "!" or "!!" indicator above enemy head
  _drawAlertIndicator(tx, ty, halfH, visualState) {
    const g = this.glowGfx;
    const scale = this._depthScale || 1;
    const y = ty - halfH * scale - 12;
    const now = Date.now();
    const bounce = Math.sin(now * 0.008) * 3;

    if (visualState === NPC_VISUAL_STATES.WINDUP) {
      // Double "!!" for windup
      g.setStrokeStyle({ width: 2.5, color: 0xffcc00, alpha: 0.9 });
      g.moveTo(tx - 3, y + bounce - 8); g.lineTo(tx - 3, y + bounce); g.stroke();
      g.circle(tx - 3, y + bounce + 3, 1.2); g.fill({ color: 0xffcc00, alpha: 0.9 });
      g.moveTo(tx + 3, y + bounce - 8); g.lineTo(tx + 3, y + bounce); g.stroke();
      g.circle(tx + 3, y + bounce + 3, 1.2); g.fill({ color: 0xffcc00, alpha: 0.9 });
    } else {
      // Single "!" for alert
      g.setStrokeStyle({ width: 2.5, color: 0xff4020, alpha: 0.85 });
      g.moveTo(tx, y + bounce - 8); g.lineTo(tx, y + bounce); g.stroke();
      g.circle(tx, y + bounce + 3, 1.2); g.fill({ color: 0xff4020, alpha: 0.85 });
    }
  }

  // P5: Speed lines behind charging enemy
  _drawChargeSpeedLines(tx, ty, dir, halfH) {
    const g = this.glowGfx;
    const now = Date.now();
    for (let i = 0; i < 5; i++) {
      const offset = ((now * 0.5 + i * 30) % 60) - 30;
      const lineY = ty - halfH * 0.6 + i * (halfH * 0.3);
      const lineAlpha = 0.3 * (1 - Math.abs(offset) / 30);
      g.setStrokeStyle({ width: 1.5, color: 0xffaa00, alpha: lineAlpha });
      g.moveTo(tx - dir * 20 + offset, lineY);
      g.lineTo(tx - dir * 40 + offset, lineY);
      g.stroke();
    }
    // Red glow behind
    const glowR = 20 + Math.sin(now * 0.01) * 5;
    g.circle(tx - dir * 15, ty, glowR);
    g.fill({ color: 0xff2020, alpha: 0.06 });
  }

  // P7: Low HP darkening/pulsing red overlay
  _drawLowHpEffect(tx, ty, halfH) {
    const now = Date.now();
    const pulse = 0.08 + Math.sin(now * 0.006) * 0.04;
    const scale = this._depthScale || 1;
    const r = this.iconSize * 0.5 * scale;
    this.glowGfx.circle(tx, ty, r);
    this.glowGfx.fill({ color: 0x600000, alpha: pulse });
  }

  // P3: Enemy melee slash arc (generic — no weapon model needed)
  _drawMeleeSlashArc(tx, ty, dir, attackAnim, halfH) {
    const g = this.weaponGfx;
    const animT = attackAnim / 10;
    if (animT <= 0) return;

    // Arc sweep
    const arcAngle = dir > 0 ? -0.5 + animT * 2.5 : Math.PI + 0.5 - animT * 2.5;
    const arcLen = 22 * (this._depthScale || 1);
    const endX = tx + Math.cos(arcAngle) * arcLen;
    const endY = ty + Math.sin(arcAngle) * arcLen;

    // Main slash line (white-hot)
    g.setStrokeStyle({ width: 3, color: 0xffffff, alpha: animT * 0.8 });
    g.moveTo(tx + dir * 5, ty);
    g.lineTo(endX, endY);
    g.stroke();

    // Orange trail
    g.setStrokeStyle({ width: 5, color: 0xff6020, alpha: animT * 0.4 });
    g.moveTo(tx + dir * 5, ty);
    g.lineTo(endX, endY);
    g.stroke();

    // Impact spark at tip
    if (animT > 0.5) {
      g.circle(endX, endY, 3 + animT * 4);
      g.fill({ color: 0xffcc00, alpha: animT * 0.5 });
    }
  }

  destroy() {
    this.container.removeChildren();
    this.container.destroy({ children: true });
  }
}
