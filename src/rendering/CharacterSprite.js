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

    // Calculate alpha with fog (horizontal distance fog + depth fog)
    let alpha = entry.fadeAlpha ?? 1;
    if (fogVisibility && !this.friendly && !entry.ragdoll) {
      const tx = entry._px || 0;
      const playerX = W * 0.2;
      const distPct = Math.abs(tx - playerX) / W;
      const fogAlpha = distPct < fogVisibility ? 1.0
        : distPct < fogVisibility * 2 ? 1.0 - ((distPct - fogVisibility) / fogVisibility)
        : 0.05;
      alpha *= fogAlpha;
    }
    // 2.5D: atmospheric depth fog (far objects fade slightly)
    const depthFog = fogAtDepth(depth);
    alpha *= (1 - depthFog * 0.5); // subtle — don't fully obscure far NPCs
    // Ensure minimum visibility — enemies should always be at least faintly visible
    alpha = Math.max(alpha, 0.15);
    this.container.alpha = alpha;

    // 2.5D: desaturate far-away sprites (atmospheric color perspective)
    const desat = desatAtDepth(depth);
    if (desat > 0.01 && this.container.filters !== undefined) {
      // PixiJS ColorMatrixFilter for desaturation — only apply if significant
      this.container.tint = desat > 0.1
        ? 0xddddee  // slight blue-grey tint for distant objects
        : 0xffffff;
    } else if (this.container.tint !== 0xffffff) {
      this.container.tint = 0xffffff;
    }

    // Store depth scale for use in icon/flash sprite sizing
    this._depthScale = depthScale;

    const dir = entry._dir || 1;
    this._lastDir = dir;
    const flash = entry.hitFlash > 0;

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

    // 2.5D: depth-aware shadow
    const shadow = shadowAtDepth(depth);
    this._drawShadow(this.shadowGfx, tx, ty + halfH + shadow.offsetY,
      14 * shadow.scaleX, 5 * shadow.scaleY, shadow.alpha);

    // Ground aura
    this._drawGroundAura(tx, ty);

    // Position icon sprite at torso
    this.iconSprite.position.set(tx, ty);
    this.flashSprite.position.set(tx, ty);

    // Hit flash — show/hide flash sprite
    if (flash) {
      this.iconSprite.visible = false;
      this.flashSprite.visible = true;
      this.flashSprite.alpha = 0.6 + (entry.hitFlash / 8) * 0.4;
    } else {
      this.iconSprite.visible = true;
      this.flashSprite.visible = false;
    }

    this.iconSprite.rotation = 0;
    this.flashSprite.rotation = 0;
    this.iconSprite.anchor.set(0.5, 0.5);
    this.flashSprite.anchor.set(0.5, 0.5);

    // 2.5D: scale sprites by depth (direction via sign)
    this.iconSprite.scale.set(dir * this._depthScale, this._depthScale);
    this.flashSprite.scale.set(dir * this._depthScale, this._depthScale);

    // Glow ring around icon
    this._drawSymbolGlow(tx, ty, halfH, flash);

    // Draw weapon if applicable
    if (entry.friendly && entry.npcData.weapon && this.bodyType === "humanoid") {
      this._drawWeapon(limbs, entry, dir, GY);
    }
  }

  _drawSymbolGlow(tx, ty, halfH, flash) {
    const pulse = 0.7 + Math.sin(Date.now() * 0.004) * 0.3;
    const glow = this.friendly ? GLOW_FRIENDLY : GLOW_ENEMY;
    const glowColor = flash ? GLOW_HIT.color : glow.color;
    const glowAlpha = (flash ? GLOW_HIT.alpha : glow.alpha) * pulse;
    const scale = this._depthScale || 1;
    const r = this.iconSize * 0.5 * scale;
    this.glowGfx.setStrokeStyle({ width: 2, color: glowColor, alpha: glowAlpha });
    this.glowGfx.circle(tx, ty, r);
    this.glowGfx.stroke();
  }

  _drawGroundAura(tx, ty) {
    const pulse = 0.6 + Math.sin(Date.now() * 0.003) * 0.2;
    const color = this.friendly ? 0x3cdc50 : 0xc83c3c;
    const halfH = HALF_HEIGHTS[this.bodyType] || FIGURE_HALF_HEIGHT;
    this.auraGfx.ellipse(tx, ty + halfH + 3, 16, 6);
    this.auraGfx.fill({ color, alpha: 0.08 * pulse });
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

  destroy() {
    this.container.removeChildren();
    this.container.destroy({ children: true });
  }
}
