// CharacterSprite — PixiJS chibi western-pirate character rendering
// Chunky, filled silhouettes with hats, vests, boots, and accessories

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

function hexToPixi(hex) {
  if (typeof hex === "number") return hex;
  if (typeof hex === "string" && hex.startsWith("#")) return parseInt(hex.slice(1), 16);
  return 0x6a4a30;
}

function darken(c, amt = 40) {
  const r = Math.max(0, ((c >> 16) & 0xff) - amt);
  const g = Math.max(0, ((c >> 8) & 0xff) - amt);
  const b = Math.max(0, (c & 0xff) - amt);
  return (r << 16) | (g << 8) | b;
}

function lighten(c, amt = 40) {
  const r = Math.min(255, ((c >> 16) & 0xff) + amt);
  const g = Math.min(255, ((c >> 8) & 0xff) + amt);
  const b = Math.min(255, (c & 0xff) + amt);
  return (r << 16) | (g << 8) | b;
}

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
    this.bodyGfx = new Graphics();
    this.glowGfx = new Graphics();
    this.weaponGfx = new Graphics();
    this.emojiText = null;

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
      style: new TextStyle({ fontSize: headR * 2, fontFamily: "serif" }),
    });
    this.emojiText.anchor.set(0.5, 0.5);
    this.emojiText.zIndex = 5;
    this.container.addChild(this.emojiText);

    // Compute colors — western palette
    const bodyColor = friendly ? "#6a8a50" : (npcData.bodyColor || "#6a4a30");
    const armorColor = friendly ? "#4a6a38" : (npcData.armorColor || "#4a3a28");
    this.colors = {
      body: hexToPixi(bodyColor),
      armor: hexToPixi(armorColor),
      skin: friendly ? 0xd4a870 : 0xc09060,
      hat: friendly ? 0x8a6a30 : 0x3a2a18,
      vest: hexToPixi(armorColor),
      boot: 0x3a2010,
      belt: 0x4a3010,
      buckle: 0xd4a030,
    };

    // Determine hat style based on weapon/type
    if (friendly) {
      const w = npcData.weapon;
      if (w === "sword") this.hatStyle = "cowboy";
      else if (w === "dagger") this.hatStyle = "bandana";
      else if (w === "staff") this.hatStyle = "hood";
      else if (w === "bow") this.hatStyle = "hunter";
      else this.hatStyle = "cowboy";
    } else {
      // Enemies get pirate-themed hats
      const bt = this.bodyType;
      if (bt === "humanoid") this.hatStyle = "pirate";
      else this.hatStyle = "none";
    }

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

    // Draw head glow ring
    if (!entry.ragdoll && limbs.head) {
      this._drawHeadGlow(limbs.head.x, limbs.head.y, flash, flashAlpha);
    }

    // Draw ground aura
    if (!entry.ragdoll && limbs.torso) {
      this._drawGroundAura(limbs.torso.x, limbs.torso.y);
    }
  }

  _fc(flash, flashAlpha, normal) { return flash ? this._flashColor(flashAlpha) : normal; }

  _drawLimb(g, from, to, width, color, flash, flashAlpha) {
    g.setStrokeStyle({ width, color: this._fc(flash, flashAlpha, color), cap: "round" });
    g.moveTo(from.x, from.y); g.lineTo(to.x, to.y); g.stroke();
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
    this.auraGfx.ellipse(tx, ty + halfH + 3, 16, 6);
    this.auraGfx.fill({ color, alpha: 0.08 * pulse });
  }

  _drawShadow(g, x, y, rx, ry) {
    g.ellipse(x, y, rx, ry);
    g.fill({ color: 0x000000, alpha: 0.25 });
  }

  // ─── CHIBI HUMANOID ───

  _drawHumanoid(limbs, dir, flash, flashAlpha, entry, GY) {
    const g = this.bodyGfx;
    const c = this.colors;
    const tx = limbs.torso.x, ty = limbs.torso.y;
    const hx = limbs.head.x, hy = limbs.head.y;

    // Shadow — wider for chibi
    this._drawShadow(this.shadowGfx, tx, ty + 38, 14, 5);

    const lUL = limbs.lUpperLeg, lLL = limbs.lLowerLeg;
    const rUL = limbs.rUpperLeg, rLL = limbs.rLowerLeg;
    const lUA = limbs.lUpperArm, rUA = limbs.rUpperArm;
    const lLA = limbs.lLowerArm, rLA = limbs.rLowerArm;

    // ── LEGS — thick filled trousers ──
    const trouserColor = this._fc(flash, flashAlpha, darken(c.vest, 15));
    const outlineColor = this._fc(flash, flashAlpha, darken(c.vest, 60));
    for (const [upper, lower] of [[lUL, lLL], [rUL, rLL]]) {
      // Thick trouser leg
      g.setStrokeStyle({ width: 8, color: trouserColor, cap: "round" });
      g.moveTo(upper.x, upper.y); g.lineTo(lower.x, lower.y); g.stroke();
      // Outline
      g.setStrokeStyle({ width: 9, color: outlineColor, cap: "round" });
      g.moveTo(upper.x, upper.y); g.lineTo(lower.x, lower.y); g.stroke();
      // Fill over outline
      g.setStrokeStyle({ width: 7, color: trouserColor, cap: "round" });
      g.moveTo(upper.x, upper.y); g.lineTo(lower.x, lower.y); g.stroke();
    }

    // ── BOOTS — chunky cowboy boots ──
    const bootC = this._fc(flash, flashAlpha, c.boot);
    for (const leg of [lLL, rLL]) {
      // Boot shape — wide rounded
      g.roundRect(leg.x - 5, leg.y + 2, 10, 8, 2);
      g.fill({ color: bootC });
      // Boot top band
      g.rect(leg.x - 5, leg.y + 2, 10, 2);
      g.fill({ color: this._fc(flash, flashAlpha, lighten(c.boot, 30)) });
      // Boot heel
      g.rect(leg.x - 4, leg.y + 8, 3, 3);
      g.fill({ color: this._fc(flash, flashAlpha, darken(c.boot, 20)) });
      // Spur — gold dot
      if (!flash) {
        g.circle(leg.x - 4, leg.y + 10, 1.5);
        g.fill({ color: 0xd4a030 });
      }
    }

    // ── TORSO — chunky vest/jacket ──
    const vestC = this._fc(flash, flashAlpha, c.vest);
    const shirtC = this._fc(flash, flashAlpha, lighten(c.body, 30));
    // Shirt underneath (visible at collar)
    g.roundRect(tx - 9, ty - 12, 18, 25, 3);
    g.fill({ color: shirtC });
    // Vest over shirt
    g.roundRect(tx - 10, ty - 11, 20, 23, 3);
    g.fill({ color: vestC });
    // Outline
    g.roundRect(tx - 10, ty - 11, 20, 23, 3);
    g.setStrokeStyle({ width: 1.5, color: outlineColor });
    g.stroke();
    // Vest lapels — V-shape opening showing shirt
    if (!flash) {
      g.moveTo(tx - 3, ty - 11);
      g.lineTo(tx, ty - 3);
      g.lineTo(tx + 3, ty - 11);
      g.closePath();
      g.fill({ color: shirtC });
    }
    // Vest buttons — gold
    if (!flash) {
      for (let i = 0; i < 3; i++) {
        g.circle(tx + 1, ty - 4 + i * 5, 1);
        g.fill({ color: 0xd4a030 });
      }
    }
    // Pocket detail
    if (!flash) {
      g.setStrokeStyle({ width: 0.8, color: darken(c.vest, 25) });
      g.roundRect(tx + 3, ty + 2, 5, 4, 1);
      g.stroke();
    }

    // ── BELT — thick leather with gold buckle ──
    g.rect(tx - 11, ty + 9, 22, 4);
    g.fill({ color: this._fc(flash, flashAlpha, c.belt) });
    // Buckle — prominent gold rectangle
    g.roundRect(tx - 3, ty + 8, 6, 5, 1);
    g.fill({ color: this._fc(flash, flashAlpha, c.buckle) });
    if (!flash) {
      g.roundRect(tx - 2, ty + 9, 4, 3, 0.5);
      g.fill({ color: 0xffffff, alpha: 0.2 });
    }
    // Holster on hip
    if (!flash) {
      const holsterSide = dir;
      g.roundRect(tx + holsterSide * 8, ty + 8, 5 * holsterSide, 10, 1);
      g.fill({ color: darken(c.belt, 10) });
      g.setStrokeStyle({ width: 0.7, color: darken(c.belt, 30) });
      g.stroke();
    }

    // ── BANDOLIER — diagonal bullet strap for enemies ──
    if (!this.friendly && !flash) {
      g.setStrokeStyle({ width: 3, color: 0x5a4020 });
      g.moveTo(tx - 9, ty - 8); g.lineTo(tx + 8, ty + 8); g.stroke();
      // Bullets on strap
      for (let i = 0; i < 4; i++) {
        const bx = tx - 7 + i * 4.5;
        const by = ty - 6 + i * 4.5;
        g.roundRect(bx - 1, by - 2, 2, 4, 0.5);
        g.fill({ color: 0xc0a060 });
      }
    }

    // ── SHOULDERS — rounded pads ──
    for (const shoulder of [lUA, rUA]) {
      if (!shoulder) continue;
      g.ellipse(shoulder.x, shoulder.y - 1, 7, 5);
      g.fill({ color: vestC });
      g.ellipse(shoulder.x, shoulder.y - 1, 7, 5);
      g.setStrokeStyle({ width: 1, color: outlineColor });
      g.stroke();
    }

    // ── ARMS — thick with sleeves ──
    for (const [upper, lower] of [[lUA, lLA], [rUA, rLA]]) {
      if (!upper || !lower) continue;
      // Sleeve
      g.setStrokeStyle({ width: 6, color: shirtC, cap: "round" });
      g.moveTo(upper.x, upper.y); g.lineTo(lower.x, lower.y); g.stroke();
      // Outline
      g.setStrokeStyle({ width: 7, color: outlineColor, cap: "round" });
      g.moveTo(upper.x, upper.y); g.lineTo(lower.x, lower.y); g.stroke();
      g.setStrokeStyle({ width: 5, color: shirtC, cap: "round" });
      g.moveTo(upper.x, upper.y); g.lineTo(lower.x, lower.y); g.stroke();
    }

    // ── HANDS — gloves ──
    const gloveC = this._fc(flash, flashAlpha, 0x6a4a20);
    for (const hand of [lLA, rLA]) {
      if (!hand) continue;
      g.circle(hand.x, hand.y + 4, 4);
      g.fill({ color: gloveC });
    }

    // ── HEAD — big chibi head ──
    this._drawChibiHead(g, hx, hy, HEAD_RADIUS, flash, flashAlpha, entry, dir);

    // ── WEAPON ──
    if (entry.friendly && entry.npcData.weapon && !entry.ragdoll) {
      this._drawWeapon(limbs, entry, dir, GY);
    }
  }

  _drawChibiHead(g, hx, hy, headR, flash, flashAlpha, entry, dir) {
    const c = this.colors;
    const R = headR + 2; // slightly bigger for chibi

    // Head circle — skin tone
    g.circle(hx, hy, R);
    g.fill({ color: this._fc(flash, flashAlpha, c.skin) });
    // Outline
    g.circle(hx, hy, R);
    g.setStrokeStyle({ width: 1.5, color: this._fc(flash, flashAlpha, darken(c.skin, 50)) });
    g.stroke();

    // Eyes — big chibi eyes
    if (!entry.ragdoll && !flash) {
      const eyeOff = dir * 2;
      // Eye whites
      g.ellipse(hx - 3 + eyeOff, hy - 1, 2.5, 3);
      g.fill({ color: 0xffffff });
      g.ellipse(hx + 3 + eyeOff, hy - 1, 2.5, 3);
      g.fill({ color: 0xffffff });
      // Pupils
      g.circle(hx - 2.5 + eyeOff + dir * 1, hy - 0.5, 1.5);
      g.fill({ color: 0x1a1a1a });
      g.circle(hx + 3.5 + eyeOff + dir * 1, hy - 0.5, 1.5);
      g.fill({ color: 0x1a1a1a });
      // Eye shine
      g.circle(hx - 3 + eyeOff + dir * 0.5, hy - 2, 0.8);
      g.fill({ color: 0xffffff });
      g.circle(hx + 3 + eyeOff + dir * 0.5, hy - 2, 0.8);
      g.fill({ color: 0xffffff });
    }

    // Mouth — small line
    if (!entry.ragdoll && !flash) {
      g.setStrokeStyle({ width: 1, color: darken(c.skin, 60) });
      g.moveTo(hx + dir * 1 - 2, hy + 4);
      g.lineTo(hx + dir * 1 + 2, hy + 4);
      g.stroke();
    }

    // ── HAT ──
    if (!entry.ragdoll) {
      this._drawHat(g, hx, hy, R, flash, flashAlpha, dir);
    }
  }

  _drawHat(g, hx, hy, headR, flash, flashAlpha, dir) {
    const hatC = this._fc(flash, flashAlpha, this.colors.hat);
    const hatDark = this._fc(flash, flashAlpha, darken(this.colors.hat, 30));
    const hatLight = this._fc(flash, flashAlpha, lighten(this.colors.hat, 20));

    switch (this.hatStyle) {
      case "cowboy": {
        // Wide brim
        g.ellipse(hx, hy - headR + 1, headR + 8, 4);
        g.fill({ color: hatC });
        g.ellipse(hx, hy - headR + 1, headR + 8, 4);
        g.setStrokeStyle({ width: 1, color: hatDark });
        g.stroke();
        // Crown — tall rounded
        g.roundRect(hx - 7, hy - headR - 10, 14, 12, 3);
        g.fill({ color: hatC });
        g.roundRect(hx - 7, hy - headR - 10, 14, 12, 3);
        g.setStrokeStyle({ width: 1, color: hatDark });
        g.stroke();
        // Hat band — gold
        if (!flash) {
          g.rect(hx - 7, hy - headR - 1, 14, 2);
          g.fill({ color: 0xd4a030 });
        }
        // Star badge on hat (sheriff)
        if (this.friendly && this.npcData.weapon === "sword" && !flash) {
          g.circle(hx, hy - headR - 5, 3);
          g.fill({ color: 0xd4a030 });
          // Star points
          for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
            g.circle(hx + Math.cos(a) * 4, hy - headR - 5 + Math.sin(a) * 4, 1);
            g.fill({ color: 0xd4a030 });
          }
        }
        break;
      }
      case "pirate": {
        // Bandana base
        g.arc(hx, hy, headR + 1, Math.PI, 0);
        g.fill({ color: this._fc(flash, flashAlpha, 0xa02020) });
        // Knot hanging down
        if (!flash) {
          g.setStrokeStyle({ width: 2, color: 0xa02020 });
          g.moveTo(hx - dir * (headR + 1), hy);
          g.quadraticCurveTo(hx - dir * (headR + 4), hy + 6, hx - dir * (headR + 2), hy + 10);
          g.stroke();
        }
        // Skull on bandana
        if (!flash) {
          g.circle(hx + dir * 2, hy - headR + 2, 3);
          g.fill({ color: 0xe0e0d0 });
          g.circle(hx + dir * 1, hy - headR + 1, 1);
          g.fill({ color: 0x1a1a1a });
          g.circle(hx + dir * 3, hy - headR + 1, 1);
          g.fill({ color: 0x1a1a1a });
        }
        break;
      }
      case "bandana": {
        // Pirate tricorn-style bandana
        g.arc(hx, hy - 1, headR + 1, Math.PI + 0.2, -0.2);
        g.fill({ color: this._fc(flash, flashAlpha, 0x1a1a2a) });
        // Headband
        if (!flash) {
          g.setStrokeStyle({ width: 2, color: 0xc02020 });
          g.arc(hx, hy, headR + 2, Math.PI + 0.5, -0.5);
          g.stroke();
          // Tail
          g.setStrokeStyle({ width: 1.5, color: 0xc02020 });
          g.moveTo(hx - dir * (headR + 2), hy - 2);
          g.lineTo(hx - dir * (headR + 6), hy + 4);
          g.stroke();
        }
        break;
      }
      case "hood": {
        // Alchemist hood / poncho hat
        g.moveTo(hx - headR - 3, hy + 2);
        g.lineTo(hx, hy - headR - 8);
        g.lineTo(hx + headR + 3, hy + 2);
        g.closePath();
        g.fill({ color: this._fc(flash, flashAlpha, 0x4a6a30) });
        g.setStrokeStyle({ width: 1, color: this._fc(flash, flashAlpha, 0x2a4a18) });
        g.stroke();
        // Goggles
        if (!flash) {
          g.circle(hx - 3, hy - 2, 3.5);
          g.setStrokeStyle({ width: 1.5, color: 0x808060 });
          g.stroke();
          g.circle(hx + 3, hy - 2, 3.5);
          g.stroke();
          // Lens tint
          g.circle(hx - 3, hy - 2, 2.5);
          g.fill({ color: 0x80ff80, alpha: 0.2 });
          g.circle(hx + 3, hy - 2, 2.5);
          g.fill({ color: 0x80ff80, alpha: 0.2 });
        }
        break;
      }
      case "hunter": {
        // Flatter wide-brim hunter/tracker hat
        g.ellipse(hx, hy - headR + 2, headR + 6, 3);
        g.fill({ color: hatC });
        g.setStrokeStyle({ width: 1, color: hatDark });
        g.stroke();
        // Low crown
        g.roundRect(hx - 6, hy - headR - 5, 12, 8, 2);
        g.fill({ color: hatC });
        g.setStrokeStyle({ width: 1, color: hatDark });
        g.stroke();
        // Feather
        if (!flash) {
          g.setStrokeStyle({ width: 1.5, color: 0xc04020 });
          g.moveTo(hx + dir * 5, hy - headR - 4);
          g.quadraticCurveTo(hx + dir * 12, hy - headR - 10, hx + dir * 14, hy - headR - 6);
          g.stroke();
        }
        break;
      }
      default: break;
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
        const len = 20;
        const endX = rHand.x + Math.cos(angle) * len;
        const endY = rHand.y + 5 + Math.sin(angle) * len;
        // Blade — thick, metallic
        w.setStrokeStyle({ width: 4, color: 0xd0d8e0, cap: "round" });
        w.moveTo(rHand.x, rHand.y + 5); w.lineTo(endX, endY); w.stroke();
        // Blade edge highlight
        w.setStrokeStyle({ width: 1.5, color: 0xffffff, alpha: 0.3 });
        w.moveTo(rHand.x, rHand.y + 5); w.lineTo(endX, endY); w.stroke();
        // Guard — gold, wider
        w.setStrokeStyle({ width: 4, color: 0xd4a030 });
        w.moveTo(rHand.x - 5, rHand.y + 4); w.lineTo(rHand.x + 5, rHand.y + 6); w.stroke();
        // Grip wrap
        w.setStrokeStyle({ width: 3, color: 0x5a3a10, cap: "round" });
        w.moveTo(rHand.x, rHand.y + 5); w.lineTo(rHand.x - Math.cos(angle) * 4, rHand.y + 5 - Math.sin(angle) * 4); w.stroke();
        // Swing flash
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
          // Blade
          w.setStrokeStyle({ width: 2.5, color: 0xa0a8b0, cap: "round" });
          w.moveTo(hand.x, hand.y + 5); w.lineTo(hand.x + dir * 12 + ox, hand.y + 3); w.stroke();
          // Edge
          w.setStrokeStyle({ width: 0.8, color: 0xffffff, alpha: 0.3 });
          w.moveTo(hand.x, hand.y + 5); w.lineTo(hand.x + dir * 12 + ox, hand.y + 3); w.stroke();
        }
        break;
      }
      case "staff": {
        const shoulder = limbs.lUpperArm;
        if (!shoulder) break;
        const stX = shoulder.x - dir * 3, stY = shoulder.y - 20;
        // Thick wooden staff
        w.setStrokeStyle({ width: 3.5, color: 0x6a4a2a, cap: "round" });
        w.moveTo(shoulder.x - dir, GY - 2); w.lineTo(stX, stY); w.stroke();
        // Staff wrapping
        w.setStrokeStyle({ width: 1, color: 0x8a6a3a });
        for (let i = 0; i < 4; i++) {
          const sy = stY + 6 + i * 6;
          w.moveTo(stX - 2, sy); w.lineTo(stX + 2, sy + 2); w.stroke();
        }
        // Flask/bottle at top instead of orb — alchemist theme
        const orbPulse = 0.6 + Math.sin(Date.now() * 0.004) * 0.3;
        const orbAlpha = animT > 0 ? 0.9 : 0.5 * orbPulse;
        w.circle(stX, stY - 4, 10);
        w.fill({ color: 0x60c060, alpha: orbAlpha * 0.2 });
        // Flask
        w.circle(stX, stY - 5, 5);
        w.fill({ color: 0x40a040, alpha: orbAlpha });
        w.circle(stX, stY - 5, 2.5);
        w.fill({ color: 0x80ff80, alpha: orbAlpha * 0.4 });
        // Bubbles
        w.circle(stX - 2, stY - 7, 1);
        w.fill({ color: 0xc0ffc0, alpha: orbAlpha * 0.6 });
        break;
      }
      case "bow": {
        // Rifle / Musket — same as before, fits western theme well
        if (!lHand) break;
        const rx = lHand.x, ry = lHand.y;
        const bLen = 22;
        const bEnd = rx + dir * bLen;
        // Stock — wood, thicker
        w.setStrokeStyle({ width: 5, color: 0x6a4a20, cap: "round" });
        w.moveTo(rx - dir * 7, ry + 3); w.lineTo(rx, ry); w.stroke();
        // Barrel — metallic
        w.setStrokeStyle({ width: 3, color: 0x909090, cap: "round" });
        w.moveTo(rx, ry); w.lineTo(bEnd, ry - 1); w.stroke();
        // Barrel highlight
        w.setStrokeStyle({ width: 1, color: 0xd0d0d0, alpha: 0.35 });
        w.moveTo(rx + dir * 5, ry - 1); w.lineTo(bEnd - dir * 2, ry - 2); w.stroke();
        // Muzzle flash
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

  // ─── CHIBI QUADRUPED ───

  _drawQuadruped(limbs, dir, flash, flashAlpha, entry) {
    const g = this.bodyGfx;
    const c = this.colors;
    const tx = limbs.torso.x, ty = limbs.torso.y;

    this._drawShadow(this.shadowGfx, tx, ty + 18, 16, 4);

    // Legs — thicker, chunkier
    for (const key of ["fl", "fr", "bl", "br"]) {
      const leg = limbs[key];
      if (!leg) continue;
      const attachX = (key[0] === "f") ? tx + dir * 8 : tx - dir * 8;
      // Thick leg
      g.setStrokeStyle({ width: 7, color: this._fc(flash, flashAlpha, c.body), cap: "round" });
      g.moveTo(attachX, ty + 5); g.lineTo(leg.x, leg.y); g.stroke();
      // Outline
      g.setStrokeStyle({ width: 8, color: this._fc(flash, flashAlpha, darken(c.body, 40)), cap: "round" });
      g.moveTo(attachX, ty + 5); g.lineTo(leg.x, leg.y); g.stroke();
      g.setStrokeStyle({ width: 6, color: this._fc(flash, flashAlpha, c.body), cap: "round" });
      g.moveTo(attachX, ty + 5); g.lineTo(leg.x, leg.y); g.stroke();
      // Hoof
      g.ellipse(leg.x, leg.y + 6, 5, 3);
      g.fill({ color: this._fc(flash, flashAlpha, 0x2a1a08) });
    }

    // Body — round, chunky
    const armorC = this._fc(flash, flashAlpha, c.armor);
    g.roundRect(tx - 15, ty - 8, 30, 16, 6);
    g.fill({ color: armorC });
    // Outline
    g.roundRect(tx - 15, ty - 8, 30, 16, 6);
    g.setStrokeStyle({ width: 1.5, color: this._fc(flash, flashAlpha, darken(c.armor, 40)) });
    g.stroke();
    // Belly — lighter
    if (!flash) {
      g.ellipse(tx, ty + 3, 10, 5);
      g.fill({ color: lighten(c.armor, 25) });
    }
    // Saddle marks / stripe
    if (!flash) {
      g.setStrokeStyle({ width: 2, color: darken(c.body, 20) });
      g.moveTo(tx - 12, ty - 8); g.lineTo(tx + 12, ty - 8); g.stroke();
    }

    // Tail — thicker, wavy
    if (limbs.tail) {
      g.setStrokeStyle({ width: 4, color: this._fc(flash, flashAlpha, c.body), cap: "round" });
      g.moveTo(tx - dir * 14, ty);
      g.quadraticCurveTo(limbs.tail.x + 2, limbs.tail.y - 5, limbs.tail.x, limbs.tail.y + 4);
      g.stroke();
    }

    // Neck — thick
    g.setStrokeStyle({ width: 6, color: this._fc(flash, flashAlpha, c.body), cap: "round" });
    g.moveTo(tx + dir * 12, ty - 4); g.lineTo(limbs.head.x, limbs.head.y); g.stroke();

    // Head — round, bigger
    const hx = limbs.head.x, hy = limbs.head.y;
    const hR = QUAD_HEAD_RADIUS + 2;
    g.circle(hx, hy, hR);
    g.fill({ color: this._fc(flash, flashAlpha, c.body) });
    g.circle(hx, hy, hR);
    g.setStrokeStyle({ width: 1.5, color: this._fc(flash, flashAlpha, darken(c.body, 40)) });
    g.stroke();

    // Eyes — cute
    if (!entry.ragdoll && !flash) {
      g.circle(hx + dir * 3, hy - 2, 2);
      g.fill({ color: 0xffffff });
      g.circle(hx + dir * 3.5, hy - 1.5, 1.2);
      g.fill({ color: 0x1a1a1a });
      g.circle(hx + dir * 3, hy - 2.5, 0.6);
      g.fill({ color: 0xffffff });
    }

    // Snout
    if (!flash) {
      g.ellipse(hx + dir * (hR - 1), hy + 2, 3, 2);
      g.fill({ color: lighten(c.body, 20) });
    }
  }

  // ─── FLOATING (Alchemist / Witch Doctor) ───

  _drawFloating(limbs, dir, flash, flashAlpha, entry) {
    const g = this.bodyGfx;
    const c = this.colors;
    const tx = limbs.torso.x, ty = limbs.torso.y;

    // Trail with smoke
    if (limbs.trail) {
      const trail = limbs.trail;
      g.setStrokeStyle({ width: 3, color: this._fc(flash, flashAlpha, c.body), alpha: 0.4 });
      g.moveTo(tx, ty + 13);
      g.quadraticCurveTo(tx + Math.sin(Date.now() * 0.003) * 6, (ty + 13 + trail.y) / 2, trail.x, trail.y);
      g.stroke();
      // Smoke puffs
      const pColor = this.friendly ? 0x60c060 : 0x8040c0;
      for (let i = 0; i < 3; i++) {
        const fy = trail.y + i * 4;
        g.circle(trail.x + Math.sin(Date.now() * 0.004 + i) * 3, fy, 3 - i * 0.7);
        g.fill({ color: pColor, alpha: 0.25 - i * 0.07 });
      }
    }

    // Poncho / cloak — wide A-shape
    const cloakC = this._fc(flash, flashAlpha, c.armor);
    g.moveTo(tx - 12, ty - 10);
    g.lineTo(tx + 12, ty - 10);
    g.lineTo(tx + 6, ty + 14);
    g.lineTo(tx - 6, ty + 14);
    g.closePath();
    g.fill({ color: cloakC });
    g.setStrokeStyle({ width: 1.5, color: this._fc(flash, flashAlpha, darken(c.armor, 40)) });
    g.stroke();

    // Pattern — zigzag trim
    if (!flash) {
      const trimC = this.friendly ? 0xd4a030 : 0x8040c0;
      g.setStrokeStyle({ width: 1.2, color: trimC, alpha: 0.6 });
      for (let i = 0; i < 6; i++) {
        const bx = tx - 5 + i * 2;
        g.moveTo(bx, ty + 10); g.lineTo(bx + 1, ty + 12); g.lineTo(bx + 2, ty + 10);
      }
      g.stroke();
    }

    // Arms
    if (limbs.lArm && limbs.rArm) {
      g.setStrokeStyle({ width: 5, color: cloakC, cap: "round" });
      g.moveTo(tx - 10, ty - 6); g.lineTo(limbs.lArm.x, limbs.lArm.y); g.stroke();
      g.moveTo(tx + 10, ty - 6); g.lineTo(limbs.rArm.x, limbs.rArm.y); g.stroke();
      // Glowing hands
      const hColor = this.friendly ? 0x60c060 : 0x8040c0;
      g.circle(limbs.lArm.x, limbs.lArm.y + 5, 4);
      g.fill({ color: hColor, alpha: 0.5 });
      g.circle(limbs.rArm.x, limbs.rArm.y + 5, 4);
      g.fill({ color: hColor, alpha: 0.5 });
    }

    // Head with hood/mask
    const hx = limbs.head.x, hy = limbs.head.y;
    g.circle(hx, hy, 11);
    g.fill({ color: this._fc(flash, flashAlpha, c.body) });
    g.circle(hx, hy, 11);
    g.setStrokeStyle({ width: 1.5, color: this._fc(flash, flashAlpha, darken(c.body, 40)) });
    g.stroke();
    // Glowing eyes
    if (!entry.ragdoll && !flash) {
      const eyeC = this.friendly ? 0x40ff40 : 0xc040ff;
      g.circle(hx - 3, hy - 1, 2);
      g.fill({ color: eyeC });
      g.circle(hx + 3, hy - 1, 2);
      g.fill({ color: eyeC });
      // Eye glow
      g.circle(hx - 3, hy - 1, 5);
      g.fill({ color: eyeC, alpha: 0.15 });
      g.circle(hx + 3, hy - 1, 5);
      g.fill({ color: eyeC, alpha: 0.15 });
    }
  }

  // ─── SCORPION — chunkier ───

  _drawScorpion(limbs, dir, flash, flashAlpha, entry) {
    const g = this.bodyGfx;
    const c = this.colors;
    const tx = limbs.torso.x, ty = limbs.torso.y;

    // Legs — thicker
    for (const key of ["l1", "l2", "l3", "r1", "r2", "r3"]) {
      const leg = limbs[key];
      if (!leg) continue;
      const side = key[0] === "l" ? -1 : 1;
      const idx = parseInt(key[1]) - 1;
      const ax = tx + dir * (6 - idx * 6);
      g.setStrokeStyle({ width: 3, color: this._fc(flash, flashAlpha, c.body), cap: "round" });
      g.moveTo(ax, ty + 6);
      g.quadraticCurveTo(leg.x + side * 4, ty + 3, leg.x, leg.y + 4);
      g.stroke();
    }

    // Body — rounder
    g.ellipse(tx, ty, 16, 8);
    g.fill({ color: this._fc(flash, flashAlpha, c.armor) });
    g.ellipse(tx, ty, 16, 8);
    g.setStrokeStyle({ width: 1.5, color: this._fc(flash, flashAlpha, darken(c.armor, 35)) });
    g.stroke();
    // Shell segments
    if (!flash) {
      g.setStrokeStyle({ width: 0.8, color: darken(c.armor, 25) });
      g.moveTo(tx - 5, ty - 7); g.lineTo(tx - 5, ty + 7); g.stroke();
      g.moveTo(tx + 5, ty - 7); g.lineTo(tx + 5, ty + 7); g.stroke();
    }

    // Tail chain — thicker
    const t1 = limbs.tail1, t2 = limbs.tail2, st = limbs.stinger;
    if (t1 && t2 && st) {
      g.setStrokeStyle({ width: 5, color: this._fc(flash, flashAlpha, c.body), cap: "round" });
      g.moveTo(tx - dir * 14, ty);
      g.lineTo(t1.x, t1.y); g.lineTo(t2.x, t2.y); g.stroke();
      g.setStrokeStyle({ width: 3.5, color: this._fc(flash, flashAlpha, c.body) });
      g.moveTo(t2.x, t2.y); g.lineTo(st.x, st.y); g.stroke();
      // Stinger — red, bigger
      g.circle(st.x, st.y, 4.5);
      g.fill({ color: this._fc(flash, flashAlpha, 0xcc3030) });
      if (!flash) {
        g.circle(st.x, st.y, 2);
        g.fill({ color: 0xff6060 });
      }
    }

    // Pincers — bigger claws
    if (limbs.lPincer && limbs.rPincer) {
      const hp = limbs.head;
      for (const pincer of [limbs.lPincer, limbs.rPincer]) {
        g.setStrokeStyle({ width: 3.5, color: this._fc(flash, flashAlpha, c.body), cap: "round" });
        g.moveTo(hp.x, hp.y); g.lineTo(pincer.x, pincer.y); g.stroke();
        // Claw
        g.setStrokeStyle({ width: 2.5, color: this._fc(flash, flashAlpha, c.armor) });
        g.moveTo(pincer.x + dir * 5, pincer.y - 4);
        g.lineTo(pincer.x + dir * 9, pincer.y);
        g.lineTo(pincer.x + dir * 5, pincer.y + 4);
        g.stroke();
      }
    }

    // Head — round
    const hx = limbs.head.x, hy = limbs.head.y;
    g.circle(hx, hy, 7);
    g.fill({ color: this._fc(flash, flashAlpha, c.body) });
    g.circle(hx, hy, 7);
    g.setStrokeStyle({ width: 1, color: this._fc(flash, flashAlpha, darken(c.body, 35)) });
    g.stroke();
    // Eyes
    if (!flash) {
      g.circle(hx - 2, hy - 2, 1.5);
      g.fill({ color: 0xff4040 });
      g.circle(hx + 2, hy - 2, 1.5);
      g.fill({ color: 0xff4040 });
    }
  }

  // ─── SPIDER — rounder, cartoonier ───

  _drawSpider(limbs, dir, flash, flashAlpha, entry) {
    const g = this.bodyGfx;
    const c = this.colors;
    const tx = limbs.torso.x, ty = limbs.torso.y;

    // Legs — 8 legs, thicker
    for (let i = 0; i < 4; i++) {
      for (const side of ["ll", "rl"]) {
        const leg = limbs[`${side}${i}`];
        if (!leg) continue;
        const sideDir = side === "ll" ? -1 : 1;
        const ox = (6 - i * 4) * dir;
        const kneeX = tx + ox + sideDir * 12;
        g.setStrokeStyle({ width: 2.5, color: this._fc(flash, flashAlpha, c.body), cap: "round" });
        g.moveTo(tx + ox, ty + 3);
        g.lineTo(kneeX, ty - 2);
        g.lineTo(leg.x + sideDir * 4, leg.y + 5);
        g.stroke();
      }
    }

    // Body — round
    g.ellipse(tx, ty, 10, 7);
    g.fill({ color: this._fc(flash, flashAlpha, c.armor) });
    g.ellipse(tx, ty, 10, 7);
    g.setStrokeStyle({ width: 1.5, color: this._fc(flash, flashAlpha, darken(c.armor, 35)) });
    g.stroke();

    // Abdomen — bigger, rounder
    if (limbs.abdomen) {
      const ax = limbs.abdomen.x, ay = limbs.abdomen.y;
      g.ellipse(ax, ay, 11, 9);
      g.fill({ color: this._fc(flash, flashAlpha, c.body) });
      g.ellipse(ax, ay, 11, 9);
      g.setStrokeStyle({ width: 1.5, color: this._fc(flash, flashAlpha, darken(c.body, 35)) });
      g.stroke();
      // Pattern on abdomen
      if (!flash) {
        g.circle(ax, ay - 2, 3);
        g.fill({ color: darken(c.body, 30) });
        g.circle(ax - 3, ay + 3, 2);
        g.fill({ color: darken(c.body, 30) });
        g.circle(ax + 3, ay + 3, 2);
        g.fill({ color: darken(c.body, 30) });
      }
    }

    // Head + big eyes
    const hx = limbs.head.x, hy = limbs.head.y;
    g.circle(hx, hy, 8);
    g.fill({ color: this._fc(flash, flashAlpha, c.body) });
    g.circle(hx, hy, 8);
    g.setStrokeStyle({ width: 1, color: this._fc(flash, flashAlpha, darken(c.body, 35)) });
    g.stroke();
    // Multiple eyes — bigger
    if (!flash) {
      const eyeC = 0xcc2020;
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
        g.circle(hx + Math.cos(angle) * 4, hy + Math.sin(angle) * 4, 1.8);
        g.fill({ color: eyeC });
        g.circle(hx + Math.cos(angle) * 4 - 0.5, hy + Math.sin(angle) * 4 - 0.5, 0.6);
        g.fill({ color: 0xffffff });
      }
    }
  }

  // ─── FROG — chubby cartoon ───

  _drawFrog(limbs, dir, flash, flashAlpha, entry) {
    const g = this.bodyGfx;
    const c = this.colors;
    const tx = limbs.torso.x, ty = limbs.torso.y;

    // Hind legs — thick
    for (const key of ["lHind", "rHind"]) {
      const leg = limbs[key];
      if (!leg) continue;
      const side = key === "lHind" ? -1 : 1;
      g.setStrokeStyle({ width: 6, color: this._fc(flash, flashAlpha, c.body), cap: "round" });
      g.moveTo(tx + side * 4, ty + 3);
      g.lineTo(tx + side * 8, ty + 4);
      g.lineTo(leg.x + side * 2, leg.y + 4);
      g.stroke();
    }

    // Front legs
    for (const key of ["lFront", "rFront"]) {
      const leg = limbs[key];
      if (!leg) continue;
      this._drawLimb(g, { x: tx + (key === "lFront" ? -4 : 4), y: ty + 2 }, leg, 3, c.body, flash, flashAlpha);
    }

    // Body — round, chubby
    g.ellipse(tx, ty, 10, 8);
    g.fill({ color: this._fc(flash, flashAlpha, c.armor) });
    g.ellipse(tx, ty, 10, 8);
    g.setStrokeStyle({ width: 1.5, color: this._fc(flash, flashAlpha, darken(c.armor, 35)) });
    g.stroke();
    // Belly
    g.ellipse(tx, ty + 3, 7, 4);
    g.fill({ color: this._fc(flash, flashAlpha, this.friendly ? 0x80e0a0 : 0xb0c080) });

    // Head — big round with protruding eyes
    const hx = limbs.head.x, hy = limbs.head.y;
    g.circle(hx, hy, 9);
    g.fill({ color: this._fc(flash, flashAlpha, c.body) });
    g.circle(hx, hy, 9);
    g.setStrokeStyle({ width: 1.5, color: this._fc(flash, flashAlpha, darken(c.body, 35)) });
    g.stroke();
    // Big protruding eyes
    if (!flash) {
      g.circle(hx - 4, hy - 6, 4);
      g.fill({ color: 0xe0e040 });
      g.circle(hx + 4, hy - 6, 4);
      g.fill({ color: 0xe0e040 });
      g.circle(hx - 4, hy - 6, 2);
      g.fill({ color: 0x1a1a1a });
      g.circle(hx + 4, hy - 6, 2);
      g.fill({ color: 0x1a1a1a });
    }
    // Wide mouth
    if (!flash) {
      g.setStrokeStyle({ width: 1.2, color: darken(c.body, 50) });
      g.arc(hx, hy + 2, 5, 0.2, Math.PI - 0.2);
      g.stroke();
    }
  }

  // ─── SERPENT — same logic, chunkier ───

  _drawSerpent(limbs, dir, flash, flashAlpha, entry) {
    const g = this.bodyGfx;
    const c = this.colors;

    const segs = [limbs.torso, limbs.seg2, limbs.seg3, limbs.tailTip].filter(Boolean);
    if (segs.length > 1) {
      // Thick body outline
      g.setStrokeStyle({ width: 14, color: this._fc(flash, flashAlpha, darken(c.armor, 30)), cap: "round", join: "round" });
      g.moveTo(segs[0].x, segs[0].y);
      for (let i = 1; i < segs.length; i++) g.lineTo(segs[i].x, segs[i].y);
      g.stroke();
      // Body fill
      g.setStrokeStyle({ width: 12, color: this._fc(flash, flashAlpha, c.armor), cap: "round", join: "round" });
      g.moveTo(segs[0].x, segs[0].y);
      for (let i = 1; i < segs.length; i++) g.lineTo(segs[i].x, segs[i].y);
      g.stroke();
      // Belly line
      g.setStrokeStyle({ width: 5, color: this._fc(flash, flashAlpha, lighten(c.body, 20)) });
      g.moveTo(segs[0].x, segs[0].y + 2);
      for (let i = 1; i < segs.length; i++) g.lineTo(segs[i].x, segs[i].y + 2);
      g.stroke();
    }

    // Fins — wider
    const tx = limbs.torso.x, ty = limbs.torso.y;
    for (const key of ["lFin", "rFin"]) {
      const fin = limbs[key];
      if (!fin) continue;
      const side = key === "lFin" ? -1 : 1;
      g.setStrokeStyle({ width: 3, color: this._fc(flash, flashAlpha, c.body), cap: "round" });
      g.moveTo(tx + side * 4, ty + 3); g.lineTo(fin.x + side * 2, fin.y + 3); g.stroke();
    }

    // Tail tip
    if (limbs.tailTip) {
      const ttp = limbs.tailTip;
      g.moveTo(ttp.x - dir * 5, ttp.y - 4);
      g.lineTo(ttp.x - dir * 10, ttp.y);
      g.lineTo(ttp.x - dir * 5, ttp.y + 4);
      g.closePath();
      g.fill({ color: this._fc(flash, flashAlpha, c.body) });
    }

    // Head — bigger, rounder
    const hx = limbs.head.x, hy = limbs.head.y;
    g.circle(hx, hy, 10);
    g.fill({ color: this._fc(flash, flashAlpha, c.body) });
    g.circle(hx, hy, 10);
    g.setStrokeStyle({ width: 1.5, color: this._fc(flash, flashAlpha, darken(c.body, 35)) });
    g.stroke();
    // Eyes
    if (!flash) {
      g.circle(hx + dir * 4, hy - 3, 2.5);
      g.fill({ color: 0xffe040 });
      g.circle(hx + dir * 4, hy - 3, 1.2);
      g.fill({ color: 0x1a1a1a });
    }
  }

  // ─── BARRICADE — wooden western style ───

  _drawBarricade(limbs, flash, flashAlpha) {
    const g = this.bodyGfx;
    const tx = limbs.torso.x, ty = limbs.torso.y;
    const plankC = this._fc(flash, flashAlpha, 0x7a5a20);
    const darkC = this._fc(flash, flashAlpha, 0x4a3010);

    // Planks — wider, with grain
    for (const dx of [-14, -7, 0, 7, 14]) {
      g.roundRect(tx + dx - 3.5, ty - 20, 7, 40, 1);
      g.fill({ color: dx % 14 === 0 ? darkC : plankC });
      g.roundRect(tx + dx - 3.5, ty - 20, 7, 40, 1);
      g.setStrokeStyle({ width: 1, color: this._fc(flash, flashAlpha, 0x3a2008) });
      g.stroke();
    }
    // Crossbars
    g.roundRect(tx - 18, ty - 12, 36, 5, 1);
    g.fill({ color: darkC });
    g.roundRect(tx - 18, ty + 6, 36, 5, 1);
    g.fill({ color: darkC });
    // Nails — gold dots
    if (!flash) {
      for (const dx of [-14, -7, 0, 7, 14]) {
        g.circle(tx + dx, ty - 10, 1.5);
        g.fill({ color: 0xd4a030 });
        g.circle(tx + dx, ty + 8, 1.5);
        g.fill({ color: 0xd4a030 });
      }
    }
    // Pointed tops
    for (const dx of [-14, -7, 0, 7, 14]) {
      g.moveTo(tx + dx - 3.5, ty - 20);
      g.lineTo(tx + dx, ty - 27);
      g.lineTo(tx + dx + 3.5, ty - 20);
      g.closePath();
      g.fill({ color: plankC });
    }
  }

  // ─── TOWER — western fort tower ───

  _drawTower(limbs, flash, flashAlpha) {
    const g = this.bodyGfx;
    const tx = limbs.torso.x, ty = limbs.torso.y;
    const stoneC = this._fc(flash, flashAlpha, 0x6a5a40);
    const baseC = this._fc(flash, flashAlpha, 0x5a4a30);

    // Base — wooden fort base
    g.roundRect(tx - 14, ty + 8, 28, 20, 2);
    g.fill({ color: baseC });
    g.roundRect(tx - 14, ty + 8, 28, 20, 2);
    g.setStrokeStyle({ width: 1.5, color: this._fc(flash, flashAlpha, 0x3a2a18) });
    g.stroke();
    // Column — stone/wood
    g.roundRect(tx - 10, ty - 22, 20, 32, 2);
    g.fill({ color: stoneC });
    g.roundRect(tx - 10, ty - 22, 20, 32, 2);
    g.setStrokeStyle({ width: 1.5, color: this._fc(flash, flashAlpha, 0x4a3a28) });
    g.stroke();
    // Wood grain / stone lines
    if (!flash) {
      g.setStrokeStyle({ width: 0.7, color: 0x5a4a30 });
      for (let y = ty - 18; y < ty + 8; y += 6) {
        g.moveTo(tx - 9, y); g.lineTo(tx + 9, y); g.stroke();
      }
    }
    // Battlements
    for (const dx of [-10, -4, 2, 8]) {
      g.roundRect(tx + dx, ty - 28, 5, 7, 1);
      g.fill({ color: stoneC });
    }
    // Roof trim — gold
    g.rect(tx - 13, ty - 22, 26, 3);
    g.fill({ color: this._fc(flash, flashAlpha, 0x8a6030) });
    // Flag
    if (!flash) {
      g.setStrokeStyle({ width: 1.5, color: 0x5a3a10 });
      g.moveTo(tx, ty - 28); g.lineTo(tx, ty - 38); g.stroke();
      // Flag cloth
      g.moveTo(tx, ty - 38);
      g.lineTo(tx + 8, ty - 36);
      g.lineTo(tx, ty - 33);
      g.closePath();
      g.fill({ color: 0xc04020 });
    }
  }

  destroy() {
    this.container.removeChildren();
    this.container.destroy({ children: true });
  }
}
