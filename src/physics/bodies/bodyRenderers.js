// "They Are Billions" inspired body renderers
// More militaristic, armored, gritty strategy-game silhouettes
// Each renderer takes (ctx, limbs{}, colors{}, dir, entry) where limbs is {partName: {x,y}}

import {
  HEAD_RADIUS, QUAD_HEAD_RADIUS,
} from "./constants.js";

// ─── SHARED DRAW UTILS ───

function drawLimb(ctx, from, to, width, color, flash) {
  ctx.strokeStyle = flash || color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawHead(ctx, entry, hx, hy, headR, colors) {
  const { npcData, friendly, ragdoll } = entry;
  const c = colors;

  // Head circle — darker edge, inner highlight
  ctx.fillStyle = c.flash || c.body;
  ctx.beginPath();
  ctx.arc(hx, hy, headR + 1, 0, Math.PI * 2);
  ctx.fill();

  // Helmet rim for non-floating enemies/friendlies — TAB-style armored look
  if (entry.bodyType === "humanoid" && !ragdoll) {
    ctx.strokeStyle = c.flash || c.helmet;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(hx, hy - 1, headR + 2, Math.PI + 0.3, -0.3);
    ctx.stroke();
    // Visor slit
    ctx.strokeStyle = c.flash || "#111";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(hx - headR * 0.5, hy + 1);
    ctx.lineTo(hx + headR * 0.5, hy + 1);
    ctx.stroke();
  }

  // Emoji
  ctx.font = `${headR * 2}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(npcData.emoji, hx, hy + 1);
  ctx.textAlign = "start";

  // Glow ring
  if (!ragdoll) {
    const glowColor = friendly ? "rgba(60,220,80," : "rgba(200,60,60,";
    ctx.shadowColor = glowColor + (friendly ? "0.5)" : "0.3)");
    ctx.shadowBlur = friendly ? 12 : 8;
    ctx.strokeStyle = glowColor + (friendly ? "0.3)" : "0.2)");
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(hx, hy, headR + (friendly ? 4 : 3), 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
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
  // TAB-style: friendlies get green militia colors, enemies get rusty/dark tones
  const bodyColor = friendly ? "#3a8a40" : (npcData.bodyColor || "#6a4a30");
  const armorColor = friendly ? "#2a5a28" : (npcData.armorColor || "#4a3a28");
  const helmetColor = friendly ? "#4a7a3a" : (npcData.armorColor || "#5a4830");
  return {
    body: bodyColor,
    armor: armorColor,
    helmet: helmetColor,
    flash: hitFlash > 0 ? `rgba(255,40,40,${hitFlash / 8 * 0.6})` : null,
    alpha,
  };
}

// ─── HUMANOID RENDERER ─── (TAB-style armored soldier)

export function drawHumanoid(ctx, limbs, colors, dir, entry) {
  const c = colors;
  ctx.save();
  ctx.globalAlpha = c.alpha;

  const torso = limbs.torso;
  const head = limbs.head;
  const tx = torso.x, ty = torso.y;

  // Shadow on ground
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ctx.ellipse(tx, ty + 38, 10, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs — armored greaves
  const lUL = limbs.lUpperLeg, lLL = limbs.lLowerLeg;
  const rUL = limbs.rUpperLeg, rLL = limbs.rLowerLeg;
  // Thigh armor
  drawLimb(ctx, lUL, lLL, 5, c.armor, c.flash);
  drawLimb(ctx, rUL, rLL, 5, c.armor, c.flash);
  // Shin guard highlight
  ctx.strokeStyle = c.flash || "#888";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(lLL.x - 1, lLL.y - 4);
  ctx.lineTo(lLL.x - 1, lLL.y + 4);
  ctx.moveTo(rLL.x - 1, rLL.y - 4);
  ctx.lineTo(rLL.x - 1, rLL.y + 4);
  ctx.stroke();
  // Boots
  ctx.fillStyle = c.flash || "#2a1a0a";
  for (const leg of [lLL, rLL]) {
    ctx.beginPath();
    ctx.ellipse(leg.x, leg.y + 6, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Torso — armored breastplate (trapezoid with plate lines)
  ctx.fillStyle = c.flash || c.armor;
  ctx.beginPath();
  ctx.moveTo(tx - 7, ty - 11); ctx.lineTo(tx + 7, ty - 11);
  ctx.lineTo(tx + 9, ty + 11); ctx.lineTo(tx - 9, ty + 11);
  ctx.closePath();
  ctx.fill();
  // Armor plate detail lines
  ctx.strokeStyle = c.flash || c.body;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(tx - 6, ty - 8); ctx.lineTo(tx + 6, ty - 8);
  ctx.moveTo(tx - 7, ty); ctx.lineTo(tx + 7, ty);
  ctx.moveTo(tx, ty - 11); ctx.lineTo(tx, ty + 11);
  ctx.stroke();
  // Belt
  ctx.fillStyle = c.flash || "#3a2a10";
  ctx.fillRect(tx - 8, ty + 8, 16, 3);
  // Belt buckle
  ctx.fillStyle = c.flash || "#c0a040";
  ctx.fillRect(tx - 2, ty + 8, 4, 3);

  // Shoulder pauldrons
  const lUA = limbs.lUpperArm, rUA = limbs.rUpperArm;
  for (const shoulder of [lUA, rUA]) {
    ctx.fillStyle = c.flash || c.armor;
    ctx.beginPath();
    ctx.ellipse(shoulder.x, shoulder.y - 2, 5, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = c.flash || c.body;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  // Arms
  const lLA = limbs.lLowerArm, rLA = limbs.rLowerArm;
  drawLimb(ctx, lUA, lLA, 3.5, c.body, c.flash);
  drawLimb(ctx, rUA, rLA, 3.5, c.body, c.flash);
  // Gauntlets
  ctx.fillStyle = c.flash || c.armor;
  for (const arm of [lLA, rLA]) {
    ctx.beginPath();
    ctx.arc(arm.x, arm.y + 5, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  drawHead(ctx, entry, head.x, head.y, HEAD_RADIUS, c);
  ctx.restore();
}

// ─── QUADRUPED RENDERER ─── (armored war beast)

export function drawQuadruped(ctx, limbs, colors, dir, entry) {
  const c = colors;
  ctx.save();
  ctx.globalAlpha = c.alpha;

  const tx = limbs.torso.x, ty = limbs.torso.y;

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.beginPath();
  ctx.ellipse(tx, ty + 18, 14, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  for (const key of ["fl", "fr", "bl", "br"]) {
    const leg = limbs[key];
    if (!leg) continue;
    const attachX = (key[0] === "f") ? tx + dir * 8 : tx - dir * 8;
    drawLimb(ctx, { x: attachX, y: ty + 5 }, leg, 3.5, c.body, c.flash);
    // Hoof
    ctx.fillStyle = c.flash || "#2a1a08";
    ctx.beginPath();
    ctx.ellipse(leg.x, leg.y + 7, 3.5, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Armored torso — TAB-style plated beast
  ctx.fillStyle = c.flash || c.armor;
  roundRect(ctx, tx - 13, ty - 6, 26, 12, 3);
  ctx.fill();
  // Armor plate segments
  ctx.strokeStyle = c.flash || c.body;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(tx - 4, ty - 6); ctx.lineTo(tx - 4, ty + 6);
  ctx.moveTo(tx + 4, ty - 6); ctx.lineTo(tx + 4, ty + 6);
  ctx.stroke();
  // Spinal ridge
  ctx.strokeStyle = c.flash || "#444";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(tx - 10, ty - 6);
  ctx.lineTo(tx + 10, ty - 6);
  ctx.stroke();

  // Tail
  if (limbs.tail) {
    ctx.strokeStyle = c.flash || c.body;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tx - dir * 12, ty);
    ctx.quadraticCurveTo(limbs.tail.x, limbs.tail.y - 4, limbs.tail.x, limbs.tail.y + 4);
    ctx.stroke();
  }

  // Neck
  ctx.strokeStyle = c.flash || c.body;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(tx + dir * 10, ty - 3);
  ctx.lineTo(limbs.head.x, limbs.head.y);
  ctx.stroke();

  drawHead(ctx, entry, limbs.head.x, limbs.head.y, QUAD_HEAD_RADIUS, c);
  ctx.restore();
}

// ─── FLOATING RENDERER ─── (ghostly/magical — djinn style)

export function drawFloating(ctx, limbs, colors, dir, entry) {
  const c = colors;
  ctx.save();
  ctx.globalAlpha = c.alpha;

  const tx = limbs.torso.x, ty = limbs.torso.y;

  // Wispy trail below
  if (limbs.trail) {
    const trail = limbs.trail;
    ctx.strokeStyle = c.flash || c.body;
    ctx.lineWidth = 2;
    ctx.globalAlpha = c.alpha * 0.5;
    ctx.beginPath();
    ctx.moveTo(tx, ty + 13);
    ctx.quadraticCurveTo(tx + Math.sin(Date.now() * 0.003) * 6, (ty + 13 + trail.y) / 2, trail.x, trail.y);
    ctx.stroke();
    ctx.globalAlpha = c.alpha;
    for (let i = 0; i < 3; i++) {
      const fy = trail.y + i * 4;
      ctx.fillStyle = `rgba(${entry.friendly ? "60,220,80" : "100,60,200"},${0.3 - i * 0.1})`;
      ctx.beginPath();
      ctx.arc(trail.x + Math.sin(Date.now() * 0.004 + i) * 3, fy, 2 - i * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Triangular robed torso
  ctx.fillStyle = c.flash || c.armor;
  ctx.beginPath();
  ctx.moveTo(tx - 10, ty - 10);
  ctx.lineTo(tx + 10, ty - 10);
  ctx.lineTo(tx + 4, ty + 13);
  ctx.lineTo(tx - 4, ty + 13);
  ctx.closePath();
  ctx.fill();
  // Rune detail
  ctx.strokeStyle = c.flash || (entry.friendly ? "rgba(60,220,80,0.4)" : "rgba(100,60,200,0.4)");
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(tx, ty - 6); ctx.lineTo(tx - 3, ty + 4); ctx.lineTo(tx + 3, ty + 4); ctx.closePath();
  ctx.stroke();

  // Inner glow
  const glow = ctx.createRadialGradient(tx, ty, 0, tx, ty, 16);
  glow.addColorStop(0, entry.friendly ? "rgba(60,220,80,0.15)" : "rgba(100,60,200,0.15)");
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(tx - 16, ty - 16, 32, 32);

  // Arms
  if (limbs.lArm && limbs.rArm) {
    drawLimb(ctx, { x: tx - 10, y: ty - 6 }, limbs.lArm, 2.5, c.body, c.flash);
    drawLimb(ctx, { x: tx + 10, y: ty - 6 }, limbs.rArm, 2.5, c.body, c.flash);
    ctx.fillStyle = entry.friendly ? "rgba(60,220,80,0.6)" : "rgba(100,60,200,0.6)";
    ctx.beginPath();
    ctx.arc(limbs.lArm.x, limbs.lArm.y + 6, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(limbs.rArm.x, limbs.rArm.y + 6, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  drawHead(ctx, entry, limbs.head.x, limbs.head.y, 10, c);
  ctx.restore();
}

// ─── SCORPION RENDERER ───

export function drawScorpion(ctx, limbs, colors, dir, entry) {
  const c = colors;
  ctx.save();
  ctx.globalAlpha = c.alpha;

  const tx = limbs.torso.x, ty = limbs.torso.y;

  // 6 legs
  for (const key of ["l1", "l2", "l3", "r1", "r2", "r3"]) {
    const leg = limbs[key];
    if (!leg) continue;
    const side = key[0] === "l" ? -1 : 1;
    const idx = parseInt(key[1]) - 1;
    const attachX = tx + dir * (6 - idx * 6);
    ctx.strokeStyle = c.flash || c.body;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(attachX, ty + 6);
    ctx.quadraticCurveTo(leg.x + side * 4, ty + 4, leg.x, leg.y + 4);
    ctx.stroke();
  }

  // Armored torso
  ctx.fillStyle = c.flash || c.armor;
  ctx.beginPath();
  ctx.ellipse(tx, ty, 14, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = c.flash || c.body;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Chitin segments
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(tx - 4, ty - 5); ctx.lineTo(tx - 4, ty + 5);
  ctx.moveTo(tx + 4, ty - 5); ctx.lineTo(tx + 4, ty + 5);
  ctx.stroke();

  // Tail chain
  const t1 = limbs.tail1, t2 = limbs.tail2, st = limbs.stinger;
  if (t1 && t2 && st) {
    ctx.strokeStyle = c.flash || c.body;
    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(tx - dir * 12, ty);
    ctx.lineTo(t1.x, t1.y);
    ctx.lineTo(t2.x, t2.y);
    ctx.stroke();
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(t2.x, t2.y);
    ctx.lineTo(st.x, st.y);
    ctx.stroke();
    ctx.fillStyle = c.flash || "#cc3030";
    ctx.beginPath();
    ctx.arc(st.x, st.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Pincers
  if (limbs.lPincer && limbs.rPincer) {
    const hp = limbs.head;
    for (const pincer of [limbs.lPincer, limbs.rPincer]) {
      ctx.strokeStyle = c.flash || c.body;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(hp.x, hp.y);
      ctx.lineTo(pincer.x, pincer.y);
      ctx.stroke();
      ctx.strokeStyle = c.flash || c.armor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pincer.x + dir * 4, pincer.y - 3);
      ctx.lineTo(pincer.x + dir * 7, pincer.y);
      ctx.lineTo(pincer.x + dir * 4, pincer.y + 3);
      ctx.stroke();
    }
  }

  drawHead(ctx, entry, limbs.head.x, limbs.head.y, 6, c);
  ctx.restore();
}

// ─── SPIDER RENDERER ───

export function drawSpider(ctx, limbs, colors, dir, entry) {
  const c = colors;
  ctx.save();
  ctx.globalAlpha = c.alpha;

  const tx = limbs.torso.x, ty = limbs.torso.y;

  // 8 legs — spindly, bent outward
  for (let i = 0; i < 4; i++) {
    for (const side of ["ll", "rl"]) {
      const leg = limbs[`${side}${i}`];
      if (!leg) continue;
      const sideDir = side === "ll" ? -1 : 1;
      const ox = (6 - i * 4) * dir;
      const kneeX = tx + ox + sideDir * 12;
      const kneeY = ty - 2;
      ctx.strokeStyle = c.flash || c.body;
      ctx.lineWidth = 1.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(tx + ox, ty + 3);
      ctx.lineTo(kneeX, kneeY);
      ctx.lineTo(leg.x + sideDir * 4, leg.y + 5);
      ctx.stroke();
    }
  }

  // Body
  ctx.fillStyle = c.flash || c.armor;
  ctx.beginPath();
  ctx.ellipse(tx, ty, 8, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Abdomen
  if (limbs.abdomen) {
    const ax = limbs.abdomen.x, ay = limbs.abdomen.y;
    ctx.fillStyle = c.flash || c.body;
    ctx.beginPath();
    ctx.ellipse(ax, ay, 9, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = c.flash || c.armor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ax - 3, ay - 3); ctx.lineTo(ax, ay - 5); ctx.lineTo(ax + 3, ay - 3);
    ctx.stroke();
  }

  // Head + eyes
  const hx = limbs.head.x, hy = limbs.head.y;
  ctx.fillStyle = c.flash || c.body;
  ctx.beginPath();
  ctx.arc(hx, hy, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = c.flash || "#cc2020";
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.arc(hx + Math.cos(angle) * 3.5, hy + Math.sin(angle) * 3.5, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.font = "12px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(entry.npcData.emoji, hx, hy + 1);
  ctx.textAlign = "start";

  if (!entry.ragdoll) {
    ctx.shadowColor = "rgba(200,60,60,0.3)";
    ctx.shadowBlur = 8;
    ctx.strokeStyle = "rgba(200,60,60,0.2)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(hx, hy, 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  ctx.restore();
}

// ─── FROG RENDERER ───

export function drawFrog(ctx, limbs, colors, dir, entry) {
  const c = colors;
  ctx.save();
  ctx.globalAlpha = c.alpha;

  const tx = limbs.torso.x, ty = limbs.torso.y;

  // Hind legs
  for (const key of ["lHind", "rHind"]) {
    const leg = limbs[key];
    if (!leg) continue;
    const side = key === "lHind" ? -1 : 1;
    ctx.strokeStyle = c.flash || c.body;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    const kneeX = tx + side * 8, kneeY = ty + 4;
    ctx.beginPath();
    ctx.moveTo(tx + side * 4, ty + 3);
    ctx.lineTo(kneeX, kneeY);
    ctx.lineTo(leg.x + side * 2, leg.y + 4);
    ctx.stroke();
    // Webbed foot
    ctx.strokeStyle = c.flash || c.armor;
    ctx.lineWidth = 1.5;
    const fx = leg.x + side * 2, fy = leg.y + 5;
    ctx.beginPath();
    ctx.moveTo(fx - 3, fy); ctx.lineTo(fx, fy + 3); ctx.lineTo(fx + 3, fy);
    ctx.stroke();
  }

  // Front legs
  for (const key of ["lFront", "rFront"]) {
    const leg = limbs[key];
    if (!leg) continue;
    drawLimb(ctx, { x: tx + (key === "lFront" ? -3 : 3), y: ty + 2 }, leg, 2, c.body, c.flash);
  }

  // Body
  ctx.fillStyle = c.flash || c.armor;
  ctx.beginPath();
  ctx.ellipse(tx, ty, 8, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = c.flash || c.body;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = c.flash || (entry.friendly ? "#60e080" : "#90a060");
  ctx.beginPath();
  ctx.ellipse(tx, ty + 2, 5, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  drawHead(ctx, entry, limbs.head.x, limbs.head.y, 8, c);
  ctx.restore();
}

// ─── SERPENT RENDERER ───

export function drawSerpent(ctx, limbs, colors, dir, entry) {
  const c = colors;
  ctx.save();
  ctx.globalAlpha = c.alpha;

  const segs = [limbs.torso, limbs.seg2, limbs.seg3, limbs.tailTip].filter(Boolean);
  if (segs.length > 1) {
    ctx.strokeStyle = c.flash || c.armor;
    ctx.lineWidth = 10;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(segs[0].x, segs[0].y);
    for (let i = 1; i < segs.length; i++) ctx.lineTo(segs[i].x, segs[i].y);
    ctx.stroke();

    ctx.strokeStyle = c.flash || c.body;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(segs[0].x, segs[0].y + 2);
    for (let i = 1; i < segs.length; i++) ctx.lineTo(segs[i].x, segs[i].y + 2);
    ctx.stroke();

    ctx.strokeStyle = c.flash || c.body;
    ctx.lineWidth = 0.5;
    for (let i = 0; i < segs.length - 1; i++) {
      ctx.beginPath();
      ctx.arc(segs[i].x, segs[i].y - 3, 3, 0, Math.PI, true);
      ctx.stroke();
    }
  }

  const tx = limbs.torso.x, ty = limbs.torso.y;
  for (const key of ["lFin", "rFin"]) {
    const fin = limbs[key];
    if (!fin) continue;
    const side = key === "lFin" ? -1 : 1;
    ctx.strokeStyle = c.flash || c.body;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tx + side * 3, ty + 3);
    ctx.lineTo(fin.x + side * 2, fin.y + 3);
    ctx.stroke();
  }

  if (limbs.tailTip) {
    const ttp = limbs.tailTip;
    ctx.fillStyle = c.flash || c.body;
    ctx.beginPath();
    ctx.moveTo(ttp.x - dir * 4, ttp.y - 3);
    ctx.lineTo(ttp.x - dir * 8, ttp.y);
    ctx.lineTo(ttp.x - dir * 4, ttp.y + 3);
    ctx.closePath();
    ctx.fill();
  }

  drawHead(ctx, entry, limbs.head.x, limbs.head.y, 9, c);
  ctx.restore();
}

// ─── BARRICADE RENDERER ───

export function drawBarricade(ctx, limbs, colors) {
  const c = colors;
  ctx.save();
  ctx.globalAlpha = c.alpha;

  const tx = limbs.torso.x, ty = limbs.torso.y;

  const plankColor = c.flash || "#6a4a20";
  const darkPlank = c.flash || "#4a3010";
  for (const dx of [-14, -7, 0, 7, 14]) {
    ctx.fillStyle = dx % 14 === 0 ? darkPlank : plankColor;
    ctx.fillRect(tx + dx - 3, ty - 20, 6, 40);
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(tx + dx - 1, ty - 18);
    ctx.lineTo(tx + dx - 1, ty + 18);
    ctx.stroke();
  }

  ctx.fillStyle = darkPlank;
  ctx.fillRect(tx - 18, ty - 12, 36, 4);
  ctx.fillRect(tx - 18, ty + 6, 36, 4);

  for (const dx of [-14, -7, 0, 7, 14]) {
    ctx.fillStyle = plankColor;
    ctx.beginPath();
    ctx.moveTo(tx + dx - 3, ty - 20);
    ctx.lineTo(tx + dx, ty - 26);
    ctx.lineTo(tx + dx + 3, ty - 20);
    ctx.closePath();
    ctx.fill();
  }

  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(tx - 17, ty - 20, 34, 40);

  ctx.font = "14px serif";
  ctx.textAlign = "center";
  ctx.fillText("\u{1fab5}", tx, ty - 30);
  ctx.textAlign = "start";

  ctx.restore();
}

// ─── TOWER RENDERER ───

export function drawTower(ctx, limbs, colors) {
  const c = colors;
  ctx.save();
  ctx.globalAlpha = c.alpha;

  const tx = limbs.torso.x, ty = limbs.torso.y;

  // Base
  ctx.fillStyle = c.flash || "#4a4a4a";
  ctx.fillRect(tx - 14, ty + 10, 28, 18);
  ctx.strokeStyle = "rgba(0,0,0,0.2)";
  ctx.lineWidth = 0.7;
  for (let row = 0; row < 3; row++) {
    const ry = ty + 12 + row * 6;
    ctx.beginPath(); ctx.moveTo(tx - 14, ry); ctx.lineTo(tx + 14, ry); ctx.stroke();
    const off = row % 2 === 0 ? 0 : 7;
    for (let bx = -14 + off; bx < 14; bx += 14) {
      ctx.beginPath(); ctx.moveTo(tx + bx, ry); ctx.lineTo(tx + bx, ry + 6); ctx.stroke();
    }
  }

  // Column
  ctx.fillStyle = c.flash || "#5a5a5a";
  ctx.fillRect(tx - 10, ty - 22, 20, 32);
  ctx.strokeStyle = "rgba(0,0,0,0.15)";
  for (let row = 0; row < 5; row++) {
    const ry = ty - 20 + row * 6;
    ctx.beginPath(); ctx.moveTo(tx - 10, ry); ctx.lineTo(tx + 10, ry); ctx.stroke();
    const off = row % 2 === 0 ? 0 : 5;
    for (let bx = -10 + off; bx < 10; bx += 10) {
      ctx.beginPath(); ctx.moveTo(tx + bx, ry); ctx.lineTo(tx + bx, ry + 6); ctx.stroke();
    }
  }

  // Battlements
  ctx.fillStyle = c.flash || "#5a5a5a";
  for (const dx of [-10, -4, 2, 8]) {
    ctx.fillRect(tx + dx, ty - 28, 5, 6);
  }

  ctx.fillStyle = c.flash || "#6a5040";
  ctx.fillRect(tx - 13, ty - 22, 26, 3);

  ctx.font = "14px serif";
  ctx.textAlign = "center";
  ctx.fillText("\u{1f5fc}", tx, ty - 35);
  ctx.textAlign = "start";

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
      // Blade
      ctx.strokeStyle = "#c0c8d0";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(rHand.x, rHand.y + 5);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      // Guard
      ctx.strokeStyle = "#8a7040";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(rHand.x - 3, rHand.y + 4);
      ctx.lineTo(rHand.x + 3, rHand.y + 6);
      ctx.stroke();
      // Swing flash
      if (animT > 0) {
        ctx.strokeStyle = `rgba(255,255,255,${animT * 0.6})`;
        ctx.lineWidth = 1;
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
      const orbGlow = animT > 0 ? 0.8 : 0.3;
      ctx.fillStyle = `rgba(120,60,200,${orbGlow})`;
      ctx.beginPath();
      ctx.arc(staffTopX, staffTopY - 4, 4, 0, Math.PI * 2);
      ctx.fill();
      const cg = ctx.createRadialGradient(staffTopX, staffTopY - 4, 0, staffTopX, staffTopY - 4, 10);
      cg.addColorStop(0, `rgba(140,80,220,${orbGlow * 0.5})`);
      cg.addColorStop(1, "transparent");
      ctx.fillStyle = cg;
      ctx.fillRect(staffTopX - 10, staffTopY - 14, 20, 20);
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
      const glow = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, r * 2);
      glow.addColorStop(0, "rgba(255,140,40,0.7)"); glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow; ctx.fillRect(proj.x - r * 2, proj.y - r * 2, r * 4, r * 4);
      ctx.fillStyle = "rgba(255,180,60,0.9)"; ctx.beginPath(); ctx.arc(proj.x, proj.y, r, 0, Math.PI * 2); ctx.fill();
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
      const mg = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, r * 2.5);
      mg.addColorStop(0, "rgba(140,80,220,0.7)"); mg.addColorStop(1, "transparent");
      ctx.fillStyle = mg; ctx.fillRect(proj.x - r * 2.5, proj.y - r * 2.5, r * 5, r * 5);
      ctx.fillStyle = "rgba(160,100,240,0.9)"; ctx.beginPath(); ctx.arc(proj.x, proj.y, r, 0, Math.PI * 2); ctx.fill();
      break;
    }
  }
  ctx.restore();
}

// ─── DRAW DISPATCH ───

const RENDERERS = {
  humanoid: drawHumanoid,
  quadruped: drawQuadruped,
  floating: drawFloating,
  scorpion: drawScorpion,
  spider: drawSpider,
  frog: drawFrog,
  serpent: drawSerpent,
  barricade: drawBarricade,
  tower: drawTower,
};

export function drawBody(ctx, bodyType, limbs, colors, dir, entry) {
  const renderer = RENDERERS[bodyType] || drawHumanoid;
  renderer(ctx, limbs, colors, dir, entry);
}
