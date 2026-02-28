// CharacterSprite — PixiJS-based character rendering
// Each character gets a Container with Graphics children for body parts
// Replaces Canvas2D drawBody/drawWeapon with PixiJS + filters

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { HALF_HEIGHTS, FIGURE_HALF_HEIGHT, HEAD_RADIUS, QUAD_HEAD_RADIUS } from "../physics/bodies/constants.js";
import {
  getWalkingOffsets, getQuadrupedOffsets, getFloatingOffsets,
  getScorpionOffsets, getSpiderOffsets, getFrogOffsets, getSerpentOffsets,
} from "../physics/bodies/animOffsets.js";

// Glow color presets
const GLOW_FRIENDLY = { color: 0x3cdc50, alpha: 0.5 };
const GLOW_ENEMY = { color: 0xc83c3c, alpha: 0.35 };
const GLOW_HIT = { color: 0xff2828, alpha: 0.7 };

// Metallic gradient helpers
function metallicColor(baseColor, lighter = false) {
  const r = (baseColor >> 16) & 0xff;
  const g = (baseColor >> 8) & 0xff;
  const b = baseColor & 0xff;
  if (lighter) {
    return ((Math.min(255, r + 40) << 16) | (Math.min(255, g + 40) << 8) | Math.min(255, b + 40));
  }
  return ((Math.max(0, r - 30) << 16) | (Math.max(0, g - 30) << 8) | Math.max(0, b - 30));
}

function hexToPixi(hex) {
  if (typeof hex === "number") return hex;
  if (typeof hex === "string" && hex.startsWith("#")) {
    return parseInt(hex.slice(1), 16);
  }
  return 0x6a4a30;
}

export class CharacterSprite {
  constructor(npcData, friendly) {
    this.npcData = npcData;
    this.friendly = friendly;
    this.bodyType = npcData.bodyType || "humanoid";

    this.container = new Container();
    this.container.sortableChildren = true;

    // Graphics layers
    this.auraGfx = new Graphics();     // ground aura circle
    this.shadowGfx = new Graphics();   // ground shadow
    this.bodyGfx = new Graphics();     // main body drawing
    this.glowGfx = new Graphics();     // head glow ring
    this.weaponGfx = new Graphics();   // weapon overlay
    this.emojiText = null;             // emoji display

    this.auraGfx.zIndex = 0;
    this.shadowGfx.zIndex = 1;
    this.bodyGfx.zIndex = 2;
    this.weaponGfx.zIndex = 3;
    this.glowGfx.zIndex = 4;

    this.container.addChild(this.auraGfx);
    this.container.addChild(this.shadowGfx);
    this.container.addChild(this.bodyGfx);
    this.container.addChild(this.weaponGfx);
    this.container.addChild(this.glowGfx);

    // Create emoji text
    const headR = this.bodyType === "quadruped" ? QUAD_HEAD_RADIUS : HEAD_RADIUS;
    this.emojiText = new Text({
      text: npcData.emoji || "?",
      style: new TextStyle({
        fontSize: headR * 2,
        fontFamily: "serif",
      }),
    });
    this.emojiText.anchor.set(0.5, 0.5);
    this.emojiText.zIndex = 5;
    this.container.addChild(this.emojiText);

    // Compute colors
    const bodyColor = friendly ? "#3a8a40" : (npcData.bodyColor || "#6a4a30");
    const armorColor = friendly ? "#2a5a28" : (npcData.armorColor || "#4a3a28");
    const helmetColor = friendly ? "#4a7a3a" : (npcData.armorColor || "#5a4830");
    this.colors = {
      body: hexToPixi(bodyColor),
      armor: hexToPixi(armorColor),
      helmet: hexToPixi(helmetColor),
    };

    this._lastDir = 1;
  }

  update(entry, W, H, GY, fogVisibility) {
    if (!entry.limbBodies) return;

    const limbs = {};
    for (const [name, rb] of Object.entries(entry.limbBodies)) {
      const t = rb.translation();
      limbs[name] = { x: t.x, y: t.y };
    }

    // Calculate alpha with fog
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
    this.container.alpha = alpha;

    const dir = entry._dir || 1;
    this._lastDir = dir;
    const flash = entry.hitFlash > 0;
    const flashAlpha = flash ? entry.hitFlash / 8 * 0.6 : 0;

    // Clear all graphics
    this.auraGfx.clear();
    this.shadowGfx.clear();
    this.bodyGfx.clear();
    this.glowGfx.clear();
    this.weaponGfx.clear();

    // Draw based on body type
    switch (this.bodyType) {
      case "humanoid": this._drawHumanoid(limbs, dir, flash, flashAlpha, entry, GY); break;
      case "quadruped": this._drawQuadruped(limbs, dir, flash, flashAlpha, entry); break;
      case "floating": this._drawFloating(limbs, dir, flash, flashAlpha, entry); break;
      case "scorpion": this._drawScorpion(limbs, dir, flash, flashAlpha, entry); break;
      case "spider": this._drawSpider(limbs, dir, flash, flashAlpha, entry); break;
      case "frog": this._drawFrog(limbs, dir, flash, flashAlpha, entry); break;
      case "serpent": this._drawSerpent(limbs, dir, flash, flashAlpha, entry); break;
      case "barricade": this._drawBarricade(limbs, flash, flashAlpha); break;
      case "tower": this._drawTower(limbs, flash, flashAlpha); break;
      default: this._drawHumanoid(limbs, dir, flash, flashAlpha, entry, GY); break;
    }

    // Position emoji on head
    if (limbs.head) {
      this.emojiText.position.set(limbs.head.x, limbs.head.y + 1);
    }

    // Draw head glow ring (for living characters)
    if (!entry.ragdoll && limbs.head) {
      this._drawHeadGlow(limbs.head.x, limbs.head.y, flash, flashAlpha);
    }

    // Draw ground aura (for living characters)
    if (!entry.ragdoll && limbs.torso) {
      this._drawGroundAura(limbs.torso.x, limbs.torso.y);
    }
  }

  _drawLimb(g, from, to, width, color, flash, flashAlpha) {
    const c = flash ? this._flashColor(flashAlpha) : color;
    g.setStrokeStyle({ width, color: c, cap: "round" });
    g.moveTo(from.x, from.y);
    g.lineTo(to.x, to.y);
    g.stroke();
  }

  _flashColor(alpha) {
    const a = Math.round(alpha * 255);
    return (0xff0000 | (0x28 << 8) | 0x28) | (a << 24);
  }

  _drawHeadGlow(hx, hy, flash, flashAlpha) {
    const pulse = 0.7 + Math.sin(Date.now() * 0.004) * 0.3;
    const headR = this.bodyType === "quadruped" ? QUAD_HEAD_RADIUS : HEAD_RADIUS;
    const glow = this.friendly ? GLOW_FRIENDLY : GLOW_ENEMY;
    const glowColor = flash ? GLOW_HIT.color : glow.color;
    const glowAlpha = (flash ? GLOW_HIT.alpha : glow.alpha) * pulse;

    this.glowGfx.setStrokeStyle({ width: 2, color: glowColor, alpha: glowAlpha });
    this.glowGfx.circle(hx, hy, headR + (this.friendly ? 5 : 4));
    this.glowGfx.stroke();
  }

  _drawGroundAura(tx, ty) {
    const pulse = 0.6 + Math.sin(Date.now() * 0.003) * 0.2;
    const color = this.friendly ? 0x3cdc50 : 0xc83c3c;
    const halfH = HALF_HEIGHTS[this.bodyType] || FIGURE_HALF_HEIGHT;
    const footY = ty + halfH + 3;

    this.auraGfx.ellipse(tx, footY, 16, 6);
    this.auraGfx.fill({ color, alpha: 0.08 * pulse });
  }

  _drawShadow(g, x, y, rx, ry) {
    g.ellipse(x, y, rx, ry);
    g.fill({ color: 0x000000, alpha: 0.22 });
  }

  // ─── HUMANOID ───

  _drawHumanoid(limbs, dir, flash, flashAlpha, entry, GY) {
    const g = this.bodyGfx;
    const c = this.colors;
    const tx = limbs.torso.x, ty = limbs.torso.y;

    // Shadow
    this._drawShadow(this.shadowGfx, tx, ty + 38, 12, 4);

    // Legs
    const lUL = limbs.lUpperLeg, lLL = limbs.lLowerLeg;
    const rUL = limbs.rUpperLeg, rLL = limbs.rLowerLeg;
    this._drawLimb(g, lUL, lLL, 5, c.armor, flash, flashAlpha);
    this._drawLimb(g, rUL, rLL, 5, c.armor, flash, flashAlpha);

    // Shin highlights
    const shinColor = flash ? this._flashColor(flashAlpha) : 0x888888;
    g.setStrokeStyle({ width: 1, color: shinColor });
    g.moveTo(lLL.x - 1, lLL.y - 4); g.lineTo(lLL.x - 1, lLL.y + 4);
    g.moveTo(rLL.x - 1, rLL.y - 4); g.lineTo(rLL.x - 1, rLL.y + 4);
    g.stroke();

    // Boots
    const bootColor = flash ? this._flashColor(flashAlpha) : 0x2a1a0a;
    for (const leg of [lLL, rLL]) {
      g.ellipse(leg.x, leg.y + 6, 5, 3);
      g.fill({ color: bootColor });
    }

    // Torso — armored breastplate
    const armorC = flash ? this._flashColor(flashAlpha) : c.armor;
    g.moveTo(tx - 7, ty - 11);
    g.lineTo(tx + 7, ty - 11);
    g.lineTo(tx + 9, ty + 11);
    g.lineTo(tx - 9, ty + 11);
    g.closePath();
    g.fill({ color: armorC });

    // Metallic sheen highlight
    if (!flash) {
      g.rect(tx - 5, ty - 10, 10, 6);
      g.fill({ color: 0xffffff, alpha: 0.1 });
    }

    // Armor detail lines
    const lineColor = flash ? this._flashColor(flashAlpha) : c.body;
    g.setStrokeStyle({ width: 1, color: lineColor });
    g.moveTo(tx - 6, ty - 8); g.lineTo(tx + 6, ty - 8);
    g.moveTo(tx - 7, ty); g.lineTo(tx + 7, ty);
    g.moveTo(tx, ty - 11); g.lineTo(tx, ty + 11);
    g.stroke();

    // Belt
    g.rect(tx - 8, ty + 8, 16, 3);
    g.fill({ color: flash ? this._flashColor(flashAlpha) : 0x3a2a10 });

    // Belt buckle — gold
    g.rect(tx - 2, ty + 8, 4, 3);
    g.fill({ color: flash ? this._flashColor(flashAlpha) : 0xd4a030 });
    if (!flash) {
      g.rect(tx - 1, ty + 8, 2, 1);
      g.fill({ color: 0xffffff, alpha: 0.15 });
    }

    // Shoulder pauldrons
    const lUA = limbs.lUpperArm, rUA = limbs.rUpperArm;
    for (const shoulder of [lUA, rUA]) {
      g.ellipse(shoulder.x, shoulder.y - 2, 6, 4.5);
      g.fill({ color: armorC });
      // Metallic highlight
      if (!flash) {
        g.circle(shoulder.x - 1, shoulder.y - 3, 3);
        g.fill({ color: 0xffffff, alpha: 0.12 });
      }
      g.ellipse(shoulder.x, shoulder.y - 2, 6, 4.5);
      g.setStrokeStyle({ width: 1, color: lineColor });
      g.stroke();
    }

    // Arms
    const lLA = limbs.lLowerArm, rLA = limbs.rLowerArm;
    this._drawLimb(g, lUA, lLA, 3.5, c.body, flash, flashAlpha);
    this._drawLimb(g, rUA, rLA, 3.5, c.body, flash, flashAlpha);

    // Gauntlets
    for (const arm of [lLA, rLA]) {
      g.circle(arm.x, arm.y + 5, 3);
      g.fill({ color: armorC });
    }

    // Head
    this._drawHead(g, limbs.head.x, limbs.head.y, HEAD_RADIUS, flash, flashAlpha, entry);

    // Weapon
    if (entry.friendly && entry.npcData.weapon && !entry.ragdoll) {
      this._drawWeapon(limbs, entry, dir, GY);
    }
  }

  _drawHead(g, hx, hy, headR, flash, flashAlpha, entry) {
    // Head circle
    g.circle(hx, hy, headR + 1);
    g.fill({ color: flash ? this._flashColor(flashAlpha) : this.colors.body });

    // Helmet rim for humanoid
    if (this.bodyType === "humanoid" && !entry.ragdoll) {
      g.setStrokeStyle({ width: 2, color: flash ? this._flashColor(flashAlpha) : this.colors.helmet });
      g.arc(hx, hy - 1, headR + 2, Math.PI + 0.3, -0.3);
      g.stroke();
      // Visor slit
      g.setStrokeStyle({ width: 1.5, color: flash ? this._flashColor(flashAlpha) : 0x111111 });
      g.moveTo(hx - headR * 0.5, hy + 1);
      g.lineTo(hx + headR * 0.5, hy + 1);
      g.stroke();
    }
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
        const len = 18;
        const endX = rHand.x + Math.cos(angle) * len;
        const endY = rHand.y + 5 + Math.sin(angle) * len;

        // Blade - metallic
        w.setStrokeStyle({ width: 3, color: 0xd0d8e0, cap: "round" });
        w.moveTo(rHand.x, rHand.y + 5);
        w.lineTo(endX, endY);
        w.stroke();

        // Blade highlight
        w.setStrokeStyle({ width: 1, color: 0xffffff, alpha: 0.25 });
        w.moveTo(rHand.x + Math.cos(angle + 0.1), rHand.y + 5 + Math.sin(angle + 0.1));
        w.lineTo(endX + Math.cos(angle + 0.1), endY + Math.sin(angle + 0.1));
        w.stroke();

        // Guard - gold
        w.setStrokeStyle({ width: 3.5, color: 0xd4a030 });
        w.moveTo(rHand.x - 3, rHand.y + 4);
        w.lineTo(rHand.x + 3, rHand.y + 6);
        w.stroke();

        // Swing flash
        if (animT > 0) {
          w.setStrokeStyle({ width: 1.5, color: 0xffffff, alpha: animT * 0.7 });
          w.moveTo(rHand.x, rHand.y + 5);
          w.lineTo(endX, endY);
          w.stroke();
        }
        break;
      }
      case "dagger": {
        for (const hand of [rHand, lHand]) {
          if (!hand) continue;
          const offsetX = animT > 0 ? dir * animT * 8 : 0;
          w.setStrokeStyle({ width: 1.5, color: 0xa0a8b0, cap: "round" });
          w.moveTo(hand.x, hand.y + 5);
          w.lineTo(hand.x + dir * 10 + offsetX, hand.y + 3);
          w.stroke();
        }
        break;
      }
      case "staff": {
        const shoulder = limbs.lUpperArm;
        if (!shoulder) break;
        const staffTopX = shoulder.x - dir * 3;
        const staffTopY = shoulder.y - 18;
        w.setStrokeStyle({ width: 2.5, color: 0x6a4a2a, cap: "round" });
        w.moveTo(shoulder.x - dir, GY - 2);
        w.lineTo(staffTopX, staffTopY);
        w.stroke();

        // Staff orb
        const orbPulse = 0.6 + Math.sin(Date.now() * 0.004) * 0.3;
        const orbAlpha = animT > 0 ? 0.9 : 0.4 * orbPulse;
        // Ambient glow
        w.circle(staffTopX, staffTopY - 4, 10);
        w.fill({ color: 0x8c50dc, alpha: orbAlpha * 0.25 });
        // Orb
        w.circle(staffTopX, staffTopY - 4, 4.5);
        w.fill({ color: 0x7830c8, alpha: orbAlpha });
        // Center
        w.circle(staffTopX, staffTopY - 4, 2);
        w.fill({ color: 0xffffff, alpha: orbAlpha * 0.3 });
        break;
      }
      case "bow": {
        // Rifle / Musket
        if (!lHand) break;
        const rifleX = lHand.x, rifleY = lHand.y;
        const barrelLen = 20;
        const barrelEndX = rifleX + dir * barrelLen;
        // Stock — wood
        w.setStrokeStyle({ width: 4, color: 0x6a4a20, cap: "round" });
        w.moveTo(rifleX - dir * 6, rifleY + 3);
        w.lineTo(rifleX, rifleY);
        w.stroke();
        // Barrel — metallic
        w.setStrokeStyle({ width: 2.5, color: 0xa0a0a0, cap: "round" });
        w.moveTo(rifleX, rifleY);
        w.lineTo(barrelEndX, rifleY - 1);
        w.stroke();
        // Barrel highlight
        w.setStrokeStyle({ width: 1, color: 0xd0d0d0, alpha: 0.3 });
        w.moveTo(rifleX + dir * 4, rifleY - 1);
        w.lineTo(barrelEndX - dir * 2, rifleY - 2);
        w.stroke();
        // Muzzle flash when firing
        if (animT > 0) {
          w.circle(barrelEndX + dir * 2, rifleY - 1, 3 + animT * 3);
          w.fill({ color: 0xffa040, alpha: animT * 0.7 });
          w.circle(barrelEndX + dir * 2, rifleY - 1, 1.5);
          w.fill({ color: 0xffffff, alpha: animT * 0.5 });
        }
        break;
      }
    }
  }

  // ─── QUADRUPED ───

  _drawQuadruped(limbs, dir, flash, flashAlpha, entry) {
    const g = this.bodyGfx;
    const c = this.colors;
    const tx = limbs.torso.x, ty = limbs.torso.y;

    this._drawShadow(this.shadowGfx, tx, ty + 18, 14, 3);

    // Legs
    for (const key of ["fl", "fr", "bl", "br"]) {
      const leg = limbs[key];
      if (!leg) continue;
      const attachX = (key[0] === "f") ? tx + dir * 8 : tx - dir * 8;
      this._drawLimb(g, { x: attachX, y: ty + 5 }, leg, 3.5, c.body, flash, flashAlpha);
      g.ellipse(leg.x, leg.y + 7, 3.5, 2);
      g.fill({ color: flash ? this._flashColor(flashAlpha) : 0x2a1a08 });
    }

    // Armored body
    const armorC = flash ? this._flashColor(flashAlpha) : c.armor;
    g.roundRect(tx - 13, ty - 6, 26, 12, 3);
    g.fill({ color: armorC });
    // Metallic sheen
    if (!flash) {
      g.rect(tx - 10, ty - 5, 20, 4);
      g.fill({ color: 0xffffff, alpha: 0.08 });
    }
    // Segments
    g.setStrokeStyle({ width: 1, color: flash ? this._flashColor(flashAlpha) : c.body });
    g.moveTo(tx - 4, ty - 6); g.lineTo(tx - 4, ty + 6);
    g.moveTo(tx + 4, ty - 6); g.lineTo(tx + 4, ty + 6);
    g.stroke();
    // Spinal ridge gold
    g.setStrokeStyle({ width: 1.5, color: flash ? this._flashColor(flashAlpha) : 0x8a7040 });
    g.moveTo(tx - 10, ty - 6); g.lineTo(tx + 10, ty - 6);
    g.stroke();

    // Tail
    if (limbs.tail) {
      g.setStrokeStyle({ width: 2, color: flash ? this._flashColor(flashAlpha) : c.body });
      g.moveTo(tx - dir * 12, ty);
      g.quadraticCurveTo(limbs.tail.x, limbs.tail.y - 4, limbs.tail.x, limbs.tail.y + 4);
      g.stroke();
    }

    // Neck
    g.setStrokeStyle({ width: 3, color: flash ? this._flashColor(flashAlpha) : c.body });
    g.moveTo(tx + dir * 10, ty - 3);
    g.lineTo(limbs.head.x, limbs.head.y);
    g.stroke();

    this._drawHead(g, limbs.head.x, limbs.head.y, QUAD_HEAD_RADIUS, flash, flashAlpha, entry);
  }

  // ─── FLOATING ───

  _drawFloating(limbs, dir, flash, flashAlpha, entry) {
    const g = this.bodyGfx;
    const c = this.colors;
    const tx = limbs.torso.x, ty = limbs.torso.y;

    // Trail
    if (limbs.trail) {
      const trail = limbs.trail;
      g.setStrokeStyle({ width: 2, color: flash ? this._flashColor(flashAlpha) : c.body, alpha: 0.5 });
      g.moveTo(tx, ty + 13);
      g.quadraticCurveTo(tx + Math.sin(Date.now() * 0.003) * 6, (ty + 13 + trail.y) / 2, trail.x, trail.y);
      g.stroke();
      // Floating particles
      const pColor = this.friendly ? 0x3cdc50 : 0x643cc8;
      for (let i = 0; i < 3; i++) {
        const fy = trail.y + i * 4;
        g.circle(trail.x + Math.sin(Date.now() * 0.004 + i) * 3, fy, 2 - i * 0.5);
        g.fill({ color: pColor, alpha: 0.3 - i * 0.1 });
      }
    }

    // Robed torso
    const armorC = flash ? this._flashColor(flashAlpha) : c.armor;
    g.moveTo(tx - 10, ty - 10);
    g.lineTo(tx + 10, ty - 10);
    g.lineTo(tx + 4, ty + 13);
    g.lineTo(tx - 4, ty + 13);
    g.closePath();
    g.fill({ color: armorC });

    // Rune detail
    const runeColor = this.friendly ? 0x3cdc50 : 0x643cc8;
    g.setStrokeStyle({ width: 1, color: runeColor, alpha: 0.4 });
    g.moveTo(tx, ty - 6); g.lineTo(tx - 3, ty + 4); g.lineTo(tx + 3, ty + 4);
    g.closePath();
    g.stroke();

    // Inner glow
    g.circle(tx, ty, 12);
    g.fill({ color: runeColor, alpha: 0.12 });

    // Arms
    if (limbs.lArm && limbs.rArm) {
      this._drawLimb(g, { x: tx - 10, y: ty - 6 }, limbs.lArm, 2.5, c.body, flash, flashAlpha);
      this._drawLimb(g, { x: tx + 10, y: ty - 6 }, limbs.rArm, 2.5, c.body, flash, flashAlpha);
      g.circle(limbs.lArm.x, limbs.lArm.y + 6, 3);
      g.fill({ color: runeColor, alpha: 0.6 });
      g.circle(limbs.rArm.x, limbs.rArm.y + 6, 3);
      g.fill({ color: runeColor, alpha: 0.6 });
    }

    this._drawHead(g, limbs.head.x, limbs.head.y, 10, flash, flashAlpha, entry);
  }

  // ─── SIMPLE BODY TYPES (scorpion, spider, frog, serpent, barricade, tower) ───

  _drawScorpion(limbs, dir, flash, flashAlpha, entry) {
    const g = this.bodyGfx;
    const c = this.colors;
    const tx = limbs.torso.x, ty = limbs.torso.y;

    // 6 legs
    for (const key of ["l1", "l2", "l3", "r1", "r2", "r3"]) {
      const leg = limbs[key];
      if (!leg) continue;
      const side = key[0] === "l" ? -1 : 1;
      const idx = parseInt(key[1]) - 1;
      const attachX = tx + dir * (6 - idx * 6);
      g.setStrokeStyle({ width: 2, color: flash ? this._flashColor(flashAlpha) : c.body, cap: "round" });
      g.moveTo(attachX, ty + 6);
      g.quadraticCurveTo(leg.x + side * 4, ty + 4, leg.x, leg.y + 4);
      g.stroke();
    }

    // Body
    g.ellipse(tx, ty, 14, 6);
    g.fill({ color: flash ? this._flashColor(flashAlpha) : c.armor });
    g.ellipse(tx, ty, 14, 6);
    g.setStrokeStyle({ width: 1.5, color: flash ? this._flashColor(flashAlpha) : c.body });
    g.stroke();
    // Segments
    g.setStrokeStyle({ width: 0.5, color: flash ? this._flashColor(flashAlpha) : c.body });
    g.moveTo(tx - 4, ty - 5); g.lineTo(tx - 4, ty + 5);
    g.moveTo(tx + 4, ty - 5); g.lineTo(tx + 4, ty + 5);
    g.stroke();

    // Tail chain
    const t1 = limbs.tail1, t2 = limbs.tail2, st = limbs.stinger;
    if (t1 && t2 && st) {
      g.setStrokeStyle({ width: 3.5, color: flash ? this._flashColor(flashAlpha) : c.body, cap: "round" });
      g.moveTo(tx - dir * 12, ty);
      g.lineTo(t1.x, t1.y);
      g.lineTo(t2.x, t2.y);
      g.stroke();
      g.setStrokeStyle({ width: 2.5, color: flash ? this._flashColor(flashAlpha) : c.body });
      g.moveTo(t2.x, t2.y);
      g.lineTo(st.x, st.y);
      g.stroke();
      g.circle(st.x, st.y, 3.5);
      g.fill({ color: flash ? this._flashColor(flashAlpha) : 0xcc3030 });
    }

    // Pincers
    if (limbs.lPincer && limbs.rPincer) {
      const hp = limbs.head;
      for (const pincer of [limbs.lPincer, limbs.rPincer]) {
        g.setStrokeStyle({ width: 2.5, color: flash ? this._flashColor(flashAlpha) : c.body });
        g.moveTo(hp.x, hp.y);
        g.lineTo(pincer.x, pincer.y);
        g.stroke();
        g.setStrokeStyle({ width: 2, color: flash ? this._flashColor(flashAlpha) : c.armor });
        g.moveTo(pincer.x + dir * 4, pincer.y - 3);
        g.lineTo(pincer.x + dir * 7, pincer.y);
        g.lineTo(pincer.x + dir * 4, pincer.y + 3);
        g.stroke();
      }
    }

    this._drawHead(g, limbs.head.x, limbs.head.y, 6, flash, flashAlpha, entry);
  }

  _drawSpider(limbs, dir, flash, flashAlpha, entry) {
    const g = this.bodyGfx;
    const c = this.colors;
    const tx = limbs.torso.x, ty = limbs.torso.y;

    // 8 legs
    for (let i = 0; i < 4; i++) {
      for (const side of ["ll", "rl"]) {
        const leg = limbs[`${side}${i}`];
        if (!leg) continue;
        const sideDir = side === "ll" ? -1 : 1;
        const ox = (6 - i * 4) * dir;
        const kneeX = tx + ox + sideDir * 12;
        g.setStrokeStyle({ width: 1.5, color: flash ? this._flashColor(flashAlpha) : c.body, cap: "round" });
        g.moveTo(tx + ox, ty + 3);
        g.lineTo(kneeX, ty - 2);
        g.lineTo(leg.x + sideDir * 4, leg.y + 5);
        g.stroke();
      }
    }

    // Body
    g.ellipse(tx, ty, 8, 5);
    g.fill({ color: flash ? this._flashColor(flashAlpha) : c.armor });

    // Abdomen
    if (limbs.abdomen) {
      const ax = limbs.abdomen.x, ay = limbs.abdomen.y;
      g.ellipse(ax, ay, 9, 7);
      g.fill({ color: flash ? this._flashColor(flashAlpha) : c.body });
    }

    // Head + eyes
    const hx = limbs.head.x, hy = limbs.head.y;
    g.circle(hx, hy, 7);
    g.fill({ color: flash ? this._flashColor(flashAlpha) : c.body });
    const eyeColor = flash ? this._flashColor(flashAlpha) : 0xcc2020;
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
      g.circle(hx + Math.cos(angle) * 3.5, hy + Math.sin(angle) * 3.5, 1.2);
      g.fill({ color: eyeColor });
    }
  }

  _drawFrog(limbs, dir, flash, flashAlpha, entry) {
    const g = this.bodyGfx;
    const c = this.colors;
    const tx = limbs.torso.x, ty = limbs.torso.y;

    // Hind legs
    for (const key of ["lHind", "rHind"]) {
      const leg = limbs[key];
      if (!leg) continue;
      const side = key === "lHind" ? -1 : 1;
      const kneeX = tx + side * 8, kneeY = ty + 4;
      g.setStrokeStyle({ width: 4, color: flash ? this._flashColor(flashAlpha) : c.body, cap: "round" });
      g.moveTo(tx + side * 4, ty + 3);
      g.lineTo(kneeX, kneeY);
      g.lineTo(leg.x + side * 2, leg.y + 4);
      g.stroke();
    }

    // Front legs
    for (const key of ["lFront", "rFront"]) {
      const leg = limbs[key];
      if (!leg) continue;
      this._drawLimb(g, { x: tx + (key === "lFront" ? -3 : 3), y: ty + 2 }, leg, 2, c.body, flash, flashAlpha);
    }

    // Body
    g.ellipse(tx, ty, 8, 6);
    g.fill({ color: flash ? this._flashColor(flashAlpha) : c.armor });
    g.ellipse(tx, ty + 2, 5, 3);
    g.fill({ color: flash ? this._flashColor(flashAlpha) : (this.friendly ? 0x60e080 : 0x90a060) });

    this._drawHead(g, limbs.head.x, limbs.head.y, 8, flash, flashAlpha, entry);
  }

  _drawSerpent(limbs, dir, flash, flashAlpha, entry) {
    const g = this.bodyGfx;
    const c = this.colors;

    const segs = [limbs.torso, limbs.seg2, limbs.seg3, limbs.tailTip].filter(Boolean);
    if (segs.length > 1) {
      // Thick body
      g.setStrokeStyle({ width: 10, color: flash ? this._flashColor(flashAlpha) : c.armor, cap: "round", join: "round" });
      g.moveTo(segs[0].x, segs[0].y);
      for (let i = 1; i < segs.length; i++) g.lineTo(segs[i].x, segs[i].y);
      g.stroke();
      // Belly line
      g.setStrokeStyle({ width: 4, color: flash ? this._flashColor(flashAlpha) : c.body });
      g.moveTo(segs[0].x, segs[0].y + 2);
      for (let i = 1; i < segs.length; i++) g.lineTo(segs[i].x, segs[i].y + 2);
      g.stroke();
    }

    // Fins
    const tx = limbs.torso.x, ty = limbs.torso.y;
    for (const key of ["lFin", "rFin"]) {
      const fin = limbs[key];
      if (!fin) continue;
      const side = key === "lFin" ? -1 : 1;
      g.setStrokeStyle({ width: 2, color: flash ? this._flashColor(flashAlpha) : c.body });
      g.moveTo(tx + side * 3, ty + 3);
      g.lineTo(fin.x + side * 2, fin.y + 3);
      g.stroke();
    }

    // Tail tip
    if (limbs.tailTip) {
      const ttp = limbs.tailTip;
      g.moveTo(ttp.x - dir * 4, ttp.y - 3);
      g.lineTo(ttp.x - dir * 8, ttp.y);
      g.lineTo(ttp.x - dir * 4, ttp.y + 3);
      g.closePath();
      g.fill({ color: flash ? this._flashColor(flashAlpha) : c.body });
    }

    this._drawHead(g, limbs.head.x, limbs.head.y, 9, flash, flashAlpha, entry);
  }

  _drawBarricade(limbs, flash, flashAlpha) {
    const g = this.bodyGfx;
    const tx = limbs.torso.x, ty = limbs.torso.y;
    const plankColor = flash ? this._flashColor(flashAlpha) : 0x6a4a20;
    const darkPlank = flash ? this._flashColor(flashAlpha) : 0x4a3010;

    for (const dx of [-14, -7, 0, 7, 14]) {
      g.rect(tx + dx - 3, ty - 20, 6, 40);
      g.fill({ color: dx % 14 === 0 ? darkPlank : plankColor });
    }
    g.rect(tx - 18, ty - 12, 36, 4);
    g.fill({ color: darkPlank });
    g.rect(tx - 18, ty + 6, 36, 4);
    g.fill({ color: darkPlank });

    for (const dx of [-14, -7, 0, 7, 14]) {
      g.moveTo(tx + dx - 3, ty - 20);
      g.lineTo(tx + dx, ty - 26);
      g.lineTo(tx + dx + 3, ty - 20);
      g.closePath();
      g.fill({ color: plankColor });
    }
  }

  _drawTower(limbs, flash, flashAlpha) {
    const g = this.bodyGfx;
    const tx = limbs.torso.x, ty = limbs.torso.y;
    const stoneColor = flash ? this._flashColor(flashAlpha) : 0x5a5a5a;
    const baseColor = flash ? this._flashColor(flashAlpha) : 0x4a4a4a;

    // Base
    g.rect(tx - 14, ty + 10, 28, 18);
    g.fill({ color: baseColor });
    // Column
    g.rect(tx - 10, ty - 22, 20, 32);
    g.fill({ color: stoneColor });
    // Metallic sheen
    if (!flash) {
      g.rect(tx - 8, ty - 20, 6, 28);
      g.fill({ color: 0xffffff, alpha: 0.06 });
    }
    // Battlements
    for (const dx of [-10, -4, 2, 8]) {
      g.rect(tx + dx, ty - 28, 5, 6);
      g.fill({ color: stoneColor });
    }
    // Trim
    g.rect(tx - 13, ty - 22, 26, 3);
    g.fill({ color: flash ? this._flashColor(flashAlpha) : 0x6a5040 });
  }

  destroy() {
    this.container.removeChildren();
    this.container.destroy({ children: true });
  }
}
