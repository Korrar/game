// Icon-based body renderers — Canvas2D fallback
// Each enemy/NPC is rendered as a hand-drawn icon

import { HALF_HEIGHTS, FIGURE_HALF_HEIGHT } from "./constants.js";
import { getNpcIconImage } from "../../rendering/icons.js";

// Icon size per body type
const ICON_SIZES = {
  humanoid: 48, quadruped: 44, floating: 44, scorpion: 40,
  spider: 38, frog: 36, serpent: 44, barricade: 52, tower: 56,
};

// ─── SHARED DRAW UTILS ───

// Ground aura ring for living characters
function drawGroundAura(ctx, x, y, radius, friendly, entry) {
  if (entry.ragdoll) return;
  const color = friendly ? [60, 220, 80] : [200, 60, 60];
  const pulse = 0.6 + Math.sin(Date.now() * 0.003) * 0.2;
  ctx.save();
  ctx.globalAlpha *= pulse * 0.4;
  const auraGrad = ctx.createRadialGradient(x, y + 2, radius * 0.3, x, y + 2, radius * 1.5);
  auraGrad.addColorStop(0, `rgba(${color.join(",")},0.15)`);
  auraGrad.addColorStop(1, "transparent");
  ctx.fillStyle = auraGrad;
  ctx.beginPath();
  ctx.ellipse(x, y + 2, radius * 1.5, radius * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ─── COLOR HELPER ───

export function getColors(entry, fogVisibility, W) {
  const { npcData, friendly, hitFlash, fadeAlpha } = entry;
  let alpha = fadeAlpha;
  if (fogVisibility && !friendly && !entry.ragdoll) {
    const tx = entry._px || 0;
    const playerX = W * 0.2;
    const distPct = Math.abs(tx - playerX) / W;
    const fogAlpha = distPct < fogVisibility ? 1.0
      : distPct < fogVisibility * 2 ? 1.0 - ((distPct - fogVisibility) / fogVisibility)
        : 0.05;
    alpha *= fogAlpha;
  }
  const bodyColor = friendly ? "#3a8a40" : (npcData.bodyColor || "#6a4a30");
  const armorColor = friendly ? "#2a5a28" : (npcData.armorColor || "#4a3a28");
  return {
    body: bodyColor,
    armor: armorColor,
    flash: hitFlash > 0 ? `rgba(255,40,40,${hitFlash / 8 * 0.6})` : null,
    alpha,
  };
}

// ─── UNIFIED ICON RENDERER ───

function drawIconBody(ctx, limbs, colors, dir, entry) {
  const c = colors;
  const halfH = HALF_HEIGHTS[entry.bodyType] || FIGURE_HALF_HEIGHT;
  const iconSize = ICON_SIZES[entry.bodyType] || 48;

  ctx.save();
  ctx.globalAlpha = c.alpha;

  const tx = limbs.torso.x;
  const ty = limbs.torso.y;

  // Ground shadow
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.ellipse(tx, ty + halfH + 2, 14, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Ground aura
  drawGroundAura(ctx, tx, ty + halfH + 2, 14, entry.friendly, entry);

  // Get icon image
  const bodyColor = entry.friendly ? "#3a8a40" : (entry.npcData.bodyColor || "#6a4a30");
  const armorColor = entry.friendly ? "#2a5a28" : (entry.npcData.armorColor || "#4a3a28");
  const img = c.flash
    ? getNpcIconImage(entry.bodyType, "#cc2020", "#880000", iconSize)
    : getNpcIconImage(entry.bodyType, bodyColor, armorColor, iconSize);

  // Draw icon (img is a canvas element, always ready)
  if (img) {
    const halfIcon = iconSize / 2;

    if (entry.ragdoll) {
      ctx.translate(tx, ty);
      const rotAngle = (1 - c.alpha) * (Math.PI / 2);
      ctx.rotate(rotAngle);
      ctx.drawImage(img, -halfIcon, -halfIcon, iconSize, iconSize);
    } else if (dir < 0) {
      ctx.save();
      ctx.translate(tx, ty);
      ctx.scale(-1, 1);
      ctx.drawImage(img, -halfIcon, -halfIcon, iconSize, iconSize);
      ctx.restore();
    } else {
      ctx.drawImage(img, tx - halfIcon, ty - halfIcon, iconSize, iconSize);
    }
  }

  // Glow ring
  if (!entry.ragdoll) {
    const pulse = 0.7 + Math.sin(Date.now() * 0.004) * 0.3;
    const glowColor = entry.friendly ? "rgba(60,220,80," : "rgba(200,60,60,";
    const glowAlpha = entry.friendly ? 0.35 * pulse : 0.25 * pulse;
    const r = iconSize * 0.5;
    ctx.shadowColor = glowColor + (entry.friendly ? `${0.5 * pulse})` : `${0.3 * pulse})`);
    ctx.shadowBlur = 10 * pulse;
    ctx.strokeStyle = glowColor + `${glowAlpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(tx, ty, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  ctx.restore();
}

// ─── WEAPON RENDERER ───

export function drawWeapon(ctx, limbs, entry, GY) {
  const { npcData, attackAnim, _dir: dir } = entry;
  const weapon = npcData.weapon;
  if (!weapon || !limbs.rLowerArm) return;

  ctx.save();
  ctx.globalAlpha = entry.fadeAlpha;
  const rHand = limbs.rLowerArm;
  const lHand = limbs.lLowerArm;
  const animT = attackAnim / 10;

  switch (weapon) {
    case "sword": {
      const angle = dir > 0 ? 0.3 - animT * 1.5 : Math.PI - 0.3 + animT * 1.5;
      const len = 18;
      const endX = rHand.x + Math.cos(angle) * len;
      const endY = rHand.y + 5 + Math.sin(angle) * len;
      ctx.strokeStyle = "#d0d8e0";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(rHand.x, rHand.y + 5);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.strokeStyle = "#d4a030";
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(rHand.x - 3, rHand.y + 4);
      ctx.lineTo(rHand.x + 3, rHand.y + 6);
      ctx.stroke();
      if (animT > 0) {
        ctx.strokeStyle = `rgba(255,255,255,${animT * 0.7})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(rHand.x, rHand.y + 5);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }
      break;
    }
    case "dagger": {
      for (const hand of [rHand, lHand]) {
        if (!hand) continue;
        const offsetX = animT > 0 ? dir * animT * 8 : 0;
        ctx.strokeStyle = "#a0a8b0";
        ctx.lineWidth = 1.5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(hand.x, hand.y + 5);
        ctx.lineTo(hand.x + dir * 10 + offsetX, hand.y + 3);
        ctx.stroke();
      }
      break;
    }
    case "staff": {
      const shoulder = limbs.lUpperArm;
      if (!shoulder) break;
      const staffTopX = shoulder.x - dir * 3;
      const staffTopY = shoulder.y - 18;
      ctx.strokeStyle = "#6a4a2a";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(shoulder.x - dir * 1, GY - 2);
      ctx.lineTo(staffTopX, staffTopY);
      ctx.stroke();
      const orbPulse = 0.6 + Math.sin(Date.now() * 0.004) * 0.3;
      const orbGlow = animT > 0 ? 0.9 : 0.4 * orbPulse;
      ctx.fillStyle = `rgba(120,60,200,${orbGlow})`;
      ctx.beginPath();
      ctx.arc(staffTopX, staffTopY - 4, 4.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "bow": {
      if (!lHand) break;
      const bowX = lHand.x - dir * 2, bowY = lHand.y;
      ctx.strokeStyle = "#7a5a30";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bowX, bowY - 12);
      ctx.quadraticCurveTo(bowX - dir * 10, bowY, bowX, bowY + 12);
      ctx.stroke();
      const stringPull = animT > 0 ? animT * 6 : 0;
      ctx.strokeStyle = "#b0a080";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bowX, bowY - 12);
      ctx.quadraticCurveTo(bowX + dir * stringPull, bowY, bowX, bowY + 12);
      ctx.stroke();
      if (animT <= 0) {
        ctx.strokeStyle = "#8a6a40";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(bowX, bowY);
        ctx.lineTo(bowX + dir * 12, bowY);
        ctx.stroke();
        ctx.fillStyle = "#a0a8b0";
        ctx.beginPath();
        ctx.moveTo(bowX + dir * 12, bowY);
        ctx.lineTo(bowX + dir * 10, bowY - 2);
        ctx.lineTo(bowX + dir * 10, bowY + 2);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
  }
  ctx.restore();
}

// ─── PROJECTILE RENDERERS ───

export function drawProjectile(ctx, proj) {
  ctx.save();
  const angle = Math.atan2(proj.vy, proj.vx);
  switch (proj.type) {
    case "arrow": {
      ctx.translate(proj.x, proj.y);
      ctx.rotate(angle);
      ctx.strokeStyle = "#8a6a40";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(6, 0); ctx.stroke();
      ctx.fillStyle = "#a0a8b0";
      ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(4, -3); ctx.lineTo(4, 3); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#c0a060"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-12, -3); ctx.moveTo(-10, 0); ctx.lineTo(-12, 3); ctx.stroke();
      break;
    }
    case "fireball_npc": {
      const r = 5 + Math.sin(proj.age * 0.5) * 1.5;
      const outerGlow = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, r * 3.5);
      outerGlow.addColorStop(0, "rgba(255,100,20,0.15)"); outerGlow.addColorStop(1, "transparent");
      ctx.fillStyle = outerGlow; ctx.fillRect(proj.x - r * 3.5, proj.y - r * 3.5, r * 7, r * 7);
      const glow = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, r * 2);
      glow.addColorStop(0, "rgba(255,160,40,0.8)"); glow.addColorStop(0.5, "rgba(255,100,20,0.4)"); glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow; ctx.fillRect(proj.x - r * 2, proj.y - r * 2, r * 4, r * 4);
      ctx.fillStyle = "rgba(255,200,80,0.95)"; ctx.beginPath(); ctx.arc(proj.x, proj.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,200,0.4)"; ctx.beginPath(); ctx.arc(proj.x, proj.y, r * 0.35, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case "iceShard_npc": {
      ctx.translate(proj.x, proj.y); ctx.rotate(angle + proj.age * 0.2);
      ctx.fillStyle = "rgba(140,220,255,0.8)"; ctx.fillRect(-2, -6, 4, 12);
      break;
    }
    case "poisonSpit": {
      const pg = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, 8);
      pg.addColorStop(0, "rgba(60,180,40,0.7)"); pg.addColorStop(1, "transparent");
      ctx.fillStyle = pg; ctx.fillRect(proj.x - 8, proj.y - 8, 16, 16);
      ctx.fillStyle = "rgba(80,200,60,0.8)"; ctx.beginPath(); ctx.arc(proj.x, proj.y, 4, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case "shadowBolt_npc": {
      const sg = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, 12);
      sg.addColorStop(0, "rgba(100,30,180,0.6)"); sg.addColorStop(1, "transparent");
      ctx.fillStyle = sg; ctx.fillRect(proj.x - 12, proj.y - 12, 24, 24);
      ctx.fillStyle = "rgba(130,50,200,0.8)"; ctx.beginPath(); ctx.arc(proj.x, proj.y, 4, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case "mageSpell": {
      const r = 5 + Math.sin(proj.age * 0.4) * 1.5;
      const mg2 = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, r * 4);
      mg2.addColorStop(0, "rgba(140,80,220,0.2)"); mg2.addColorStop(1, "transparent");
      ctx.fillStyle = mg2; ctx.fillRect(proj.x - r * 4, proj.y - r * 4, r * 8, r * 8);
      const mg = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, r * 2.5);
      mg.addColorStop(0, "rgba(160,100,240,0.8)"); mg.addColorStop(0.5, "rgba(140,80,220,0.4)"); mg.addColorStop(1, "transparent");
      ctx.fillStyle = mg; ctx.fillRect(proj.x - r * 2.5, proj.y - r * 2.5, r * 5, r * 5);
      ctx.fillStyle = "rgba(180,130,255,0.95)"; ctx.beginPath(); ctx.arc(proj.x, proj.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.3)"; ctx.beginPath(); ctx.arc(proj.x, proj.y, r * 0.4, 0, Math.PI * 2); ctx.fill();
      break;
    }
  }
  ctx.restore();
}

// ─── DRAW DISPATCH ───

export function drawBody(ctx, bodyType, limbs, colors, dir, entry) {
  entry.bodyType = entry.bodyType || bodyType;
  drawIconBody(ctx, limbs, colors, dir, entry);
}
