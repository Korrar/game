// CharacterSprite — PixiJS ASCII symbol character rendering
// Each enemy/NPC is represented by a large ASCII character

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { HALF_HEIGHTS, FIGURE_HALF_HEIGHT, HEAD_RADIUS, QUAD_HEAD_RADIUS } from "../physics/bodies/constants.js";

// Glow color presets
const GLOW_FRIENDLY = { color: 0x3cdc50, alpha: 0.5 };
const GLOW_ENEMY = { color: 0xc83c3c, alpha: 0.35 };
const GLOW_HIT = { color: 0xff2828, alpha: 0.7 };

// ASCII symbol mapping per body type
const BODY_SYMBOLS = {
  humanoid:  { char: "@", size: 42 },
  quadruped: { char: "W", size: 36 },
  floating:  { char: "~", size: 38 },
  scorpion:  { char: "}", size: 34 },
  spider:    { char: "X", size: 32 },
  frog:      { char: "&", size: 30 },
  serpent:   { char: "S", size: 36 },
  barricade: { char: "#", size: 44 },
  tower:     { char: "T", size: 48 },
};

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

    // ASCII symbol text — the main body representation
    const sym = BODY_SYMBOLS[this.bodyType] || BODY_SYMBOLS.humanoid;
    const bodyColor = friendly ? "#40c060" : (npcData.bodyColor || "#6a4a30");
    this.symbolText = new Text({
      text: sym.char,
      style: new TextStyle({
        fontSize: sym.size,
        fontFamily: "monospace",
        fontWeight: "bold",
        fill: bodyColor,
        stroke: { color: friendly ? "#1a3a1a" : (npcData.armorColor || "#2a1a10"), width: 3 },
      }),
    });
    this.symbolText.anchor.set(0.5, 0.5);
    this.symbolText.zIndex = 3;
    this.container.addChild(this.symbolText);

    // Small emoji label above the symbol (for identification)
    this.emojiText = new Text({
      text: npcData.emoji || "?",
      style: new TextStyle({ fontSize: 14, fontFamily: "serif" }),
    });
    this.emojiText.anchor.set(0.5, 1);
    this.emojiText.zIndex = 5;
    this.container.addChild(this.emojiText);

    // Store colors for flash
    this.colors = {
      body: hexToPixi(bodyColor),
      armor: hexToPixi(friendly ? "#2a5a28" : (npcData.armorColor || "#4a3a28")),
    };
    this.baseBodyColor = bodyColor;
    this.baseArmorColor = friendly ? "#1a3a1a" : (npcData.armorColor || "#2a1a10");

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

    // Clear graphics
    this.auraGfx.clear();
    this.shadowGfx.clear();
    this.bodyGfx.clear();
    this.glowGfx.clear();
    this.weaponGfx.clear();

    if (!limbs.torso) return;

    const tx = limbs.torso.x;
    const ty = limbs.torso.y;
    const halfH = HALF_HEIGHTS[this.bodyType] || FIGURE_HALF_HEIGHT;

    // Shadow on ground
    this._drawShadow(this.shadowGfx, tx, ty + halfH + 2, 14, 5);

    // Ground aura
    if (!entry.ragdoll) {
      this._drawGroundAura(tx, ty);
    }

    // Position ASCII symbol at torso
    this.symbolText.position.set(tx, ty);

    // Ragdoll: tilt the symbol
    if (entry.ragdoll) {
      const rotAngle = (1 - alpha) * (Math.PI / 2);
      this.symbolText.rotation = rotAngle;
    } else {
      this.symbolText.rotation = 0;
    }

    // Mirror based on direction
    this.symbolText.scale.x = dir;

    // Hit flash — change fill color
    if (flash) {
      this.symbolText.style.fill = "#ff2828";
      this.symbolText.style.stroke = { color: "#aa0000", width: 3 };
    } else {
      this.symbolText.style.fill = this.baseBodyColor;
      this.symbolText.style.stroke = { color: this.baseArmorColor, width: 3 };
    }

    // Position emoji above the symbol
    if (limbs.head) {
      this.emojiText.position.set(limbs.head.x, limbs.head.y - 14);
    } else {
      this.emojiText.position.set(tx, ty - halfH - 8);
    }

    // Glow ring around symbol
    if (!entry.ragdoll) {
      this._drawSymbolGlow(tx, ty, halfH, flash, flashAlpha);
    }

    // Draw weapon if applicable
    if (entry.friendly && entry.npcData.weapon && this.bodyType === "humanoid") {
      this._drawWeapon(limbs, entry, dir, GY);
    }
  }

  _fc(flash, flashAlpha, normal) { return flash ? this._flashColor(flashAlpha) : normal; }

  _flashColor(alpha) {
    const a = Math.round(alpha * 255);
    return (0xff0000 | (0x28 << 8) | 0x28) | (a << 24);
  }

  _drawSymbolGlow(tx, ty, halfH, flash, flashAlpha) {
    const pulse = 0.7 + Math.sin(Date.now() * 0.004) * 0.3;
    const glow = this.friendly ? GLOW_FRIENDLY : GLOW_ENEMY;
    const glowColor = flash ? GLOW_HIT.color : glow.color;
    const glowAlpha = (flash ? GLOW_HIT.alpha : glow.alpha) * pulse;
    const sym = BODY_SYMBOLS[this.bodyType] || BODY_SYMBOLS.humanoid;
    const r = sym.size * 0.45;
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

  _drawShadow(g, x, y, rx, ry) {
    g.ellipse(x, y, rx, ry);
    g.fill({ color: 0x000000, alpha: 0.25 });
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
        w.moveTo(shoulder.x - dir, GY - 2); w.lineTo(stX, stY); w.stroke();
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
