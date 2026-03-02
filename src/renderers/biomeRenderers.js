import { seedRng } from "../utils/helpers";
import { getIconImage } from "../rendering/icons.js";

export function renderBiome(ctx, biome, room, W, H, isNight) {
  const GY = H * 0.25;
  const rng = seedRng(room * 137 + 42);

  // Sky
  const sky = ctx.createLinearGradient(0, 0, 0, GY);
  sky.addColorStop(0, biome.skyTop); sky.addColorStop(1, biome.skyBot);
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, GY);

  // Night sky overlay
  if (isNight) {
    ctx.fillStyle = "rgba(0,0,12,0.65)";
    ctx.fillRect(0, 0, W, GY);
    // Stars
    for (let i = 0; i < 80; i++) {
      const sx = rng() * W, sy = rng() * GY * 0.92;
      const size = 0.5 + rng() * 2;
      ctx.fillStyle = `rgba(255,255,255,${0.3 + rng() * 0.6})`;
      ctx.fillRect(sx, sy, size, size);
    }
    // Moon
    const mx = W * 0.82, my = GY * 0.18, mr = 22;
    ctx.fillStyle = "rgba(255,255,220,0.85)";
    ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
    // Moon craters
    ctx.fillStyle = "rgba(200,200,180,0.3)";
    ctx.beginPath(); ctx.arc(mx - 5, my - 4, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(mx + 7, my + 3, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(mx - 2, my + 8, 4, 0, Math.PI * 2); ctx.fill();
    // Moon glow
    const glowG = ctx.createRadialGradient(mx, my, mr, mx, my, mr * 4);
    glowG.addColorStop(0, "rgba(200,220,255,0.12)");
    glowG.addColorStop(1, "transparent");
    ctx.fillStyle = glowG;
    ctx.fillRect(mx - mr * 4, my - mr * 4, mr * 8, mr * 8);
  }

  // Ground
  const gnd = ctx.createLinearGradient(0, GY, 0, H);
  gnd.addColorStop(0, biome.groundCol); gnd.addColorStop(1, biome.groundBot);
  ctx.fillStyle = gnd; ctx.fillRect(0, GY, W, H - GY);

  // Night ground darkening
  if (isNight) {
    ctx.fillStyle = "rgba(0,0,12,0.35)";
    ctx.fillRect(0, GY, W, H - GY);
  }

  // Biome-specific
  const fns = { jungle: drawJungle, island: drawIsland, desert: drawDesert, winter: drawWinter, city: drawCity, volcano: drawVolcano, summer: drawSummer, autumn: drawAutumn, spring: drawSpring, mushroom: drawMushroom, swamp: drawSwamp, sunset_beach: drawSunsetBeach, bamboo_falls: drawBambooFalls };
  if (fns[biome.renderFn]) fns[biome.renderFn](ctx, W, H, GY, rng);

  // Scatter
  drawScatter(ctx, W, H, GY, rng, biome.scatter);

  // Fog
  ctx.fillStyle = biome.fogCol; ctx.fillRect(0, 0, W, H);

  // Night general atmosphere
  if (isNight) {
    ctx.fillStyle = "rgba(5,5,20,0.15)";
    ctx.fillRect(0, 0, W, H);
  }
}

function drawScatter(ctx, W, H, GY, r, items) {
  for (let i = 0; i < 9; i++) {
    const iconName = items[Math.floor(r() * items.length)];
    const x = r() * (W - 50) + 25, y = GY + 12 + r() * (H - GY - 45);
    ctx.globalAlpha = 0.35 + r() * 0.5;
    const sz = Math.round(16 + r() * 20);
    const img = getIconImage(iconName, sz);
    if (img) {
      ctx.drawImage(img, x - sz / 2, y - sz / 2, sz, sz);
    }
  }
  ctx.globalAlpha = 1;
}

function drawJungle(ctx, W, H, GY, r) {
  for (let i = 0; i < 10; i++) {
    const x = r() * W, by = GY - 10 + r() * 30, h = 70 + r() * 120, dp = r();
    ctx.globalAlpha = 0.35 + dp * 0.6;
    ctx.fillStyle = `hsl(25,40%,${18 + r() * 10}%)`; const tw = 5 + dp * 6;
    ctx.fillRect(x - tw / 2, by - h * 0.35, tw, h * 0.35);
    ctx.strokeStyle = "rgba(40,120,20,0.4)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, by - h * 0.3);
    ctx.bezierCurveTo(x + 15, by - h * 0.2, x - 10, by - h * 0.1, x + 5, by); ctx.stroke();
    for (let l = 0; l < 4; l++) {
      const ly = by - h * 0.35 - l * h * 0.18, rad = 22 + r() * 25 - l * 4;
      ctx.fillStyle = `hsl(${105 + r() * 30},${45 + r() * 20}%,${16 + l * 6 + r() * 5}%)`;
      ctx.beginPath(); ctx.ellipse(x, ly, rad, rad * 0.65, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function drawIsland(ctx, W, H, GY, r) {
  for (let i = 0; i < 5; i++) {
    const x = r() * W, by = GY - 5 + r() * 15, h = 50 + r() * 70, lean = (r() - 0.5) * 25;
    ctx.globalAlpha = 0.45 + r() * 0.45;
    ctx.strokeStyle = "#6B4420"; ctx.lineWidth = 4 + r() * 3;
    ctx.beginPath(); ctx.moveTo(x, by); ctx.quadraticCurveTo(x + lean * 0.5, by - h * 0.5, x + lean, by - h); ctx.stroke();
    const lx = x + lean, ly = by - h;
    for (let j = 0; j < 6; j++) {
      const a = (j / 6) * Math.PI * 2 + r() * 0.5, len = 25 + r() * 28;
      ctx.strokeStyle = `hsl(${115 + r() * 20},50%,${28 + r() * 12}%)`; ctx.lineWidth = 2 + r() * 2;
      ctx.beginPath(); ctx.moveTo(lx, ly);
      ctx.quadraticCurveTo(lx + Math.cos(a) * len * 0.6, ly + Math.sin(a) * len * 0.3 - 8, lx + Math.cos(a) * len, ly + Math.sin(a) * len * 0.5 + 8);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  const wy = H * 0.82;
  const g = ctx.createLinearGradient(0, wy, 0, H);
  g.addColorStop(0, "rgba(30,120,200,0.7)"); g.addColorStop(1, "rgba(10,60,120,0.9)");
  ctx.fillStyle = g; ctx.fillRect(0, wy, W, H - wy);
  ctx.strokeStyle = "rgba(150,220,255,0.35)"; ctx.lineWidth = 2;
  for (let row = 0; row < 5; row++) {
    const y = wy + row * 10 + 4;
    ctx.beginPath();
    for (let x = 0; x < W; x += 4) { const yy = y + Math.sin(x * 0.03 + row * 2) * 3.5; x === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); }
    ctx.stroke();
  }
}

function drawDesert(ctx, W, H, GY, r) {
  for (let l = 0; l < 4; l++) {
    const by = GY - 15 + l * 22;
    ctx.fillStyle = `hsl(38,60%,${58 + l * 5}%)`;
    ctx.beginPath(); ctx.moveTo(0, by + 35);
    for (let x = 0; x <= W; x += 18) ctx.lineTo(x, by + Math.sin(x * (0.003 + l * 0.001) + l * 1.5) * (28 + l * 8));
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = "rgba(180,140,60,0.25)";
  for (let i = 0; i < 60; i++) ctx.fillRect(r() * W, GY + r() * (H - GY), 2, 1);
}

function drawWinter(ctx, W, H, GY, r) {
  for (let i = 0; i < 8; i++) {
    const x = r() * W, by = GY - 5 + r() * 15, h = 50 + r() * 80;
    ctx.globalAlpha = 0.4 + r() * 0.5;
    ctx.fillStyle = "#4a2a12"; ctx.fillRect(x - 3, by - h * 0.22, 6, h * 0.22);
    for (let l = 0; l < 4; l++) {
      const ly = by - h * 0.22 - l * h * 0.17, w = 24 - l * 4 + r() * 8;
      ctx.fillStyle = `hsl(${145 + r() * 20},35%,${16 + l * 5}%)`;
      ctx.beginPath(); ctx.moveTo(x - w, ly); ctx.lineTo(x, ly - h * 0.18); ctx.lineTo(x + w, ly); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = "rgba(230,240,255,0.55)";
    for (let l = 0; l < 3; l++) { ctx.beginPath(); ctx.ellipse(x, by - h * 0.22 - l * h * 0.17 - h * 0.15, 16 - l * 3, 4, 0, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = "rgba(230,240,255,0.45)";
  for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(r() * W, GY + r() * (H - GY) * 0.4, 50 + r() * 100, 12 + r() * 12, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  for (let i = 0; i < 40; i++) { ctx.beginPath(); ctx.arc(r() * W, r() * H, 1 + r() * 2.5, 0, Math.PI * 2); ctx.fill(); }
}

function drawCity(ctx, W, H, GY, r) {
  ctx.fillStyle = "#3a3428"; ctx.fillRect(0, GY + 5, W, H - GY - 5);
  ctx.fillStyle = "rgba(60,55,45,0.4)";
  for (let i = 0; i < 80; i++) ctx.fillRect(r() * W, GY + 10 + r() * (H - GY - 15), 8 + r() * 12, 6 + r() * 8);

  const count = 7 + Math.floor(r() * 5);
  for (let i = 0; i < count; i++) {
    const bx = (i / count) * W + (r() - 0.5) * 25, bw = 38 + r() * 55, bh = 80 + r() * 140, by = GY - bh + 10;
    ctx.fillStyle = `hsl(${30 + r() * 15},${20 + r() * 15}%,${25 + r() * 20}%)`; ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = "#3a2210"; ctx.lineWidth = 3; ctx.strokeRect(bx, by, bw, bh);
    ctx.beginPath(); ctx.moveTo(bx, by + bh * 0.33); ctx.lineTo(bx + bw, by + bh * 0.33); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx, by + bh * 0.66); ctx.lineTo(bx + bw, by + bh * 0.66); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx + bw * 0.5, by); ctx.lineTo(bx + bw * 0.5, by + bh); ctx.stroke();
    ctx.fillStyle = `hsl(${10 + r() * 15},${40 + r() * 15}%,${22 + r() * 10}%)`;
    ctx.beginPath(); ctx.moveTo(bx - 8, by); ctx.lineTo(bx + bw / 2, by - 25 - r() * 20); ctx.lineTo(bx + bw + 8, by); ctx.closePath(); ctx.fill();
    const rows = Math.floor(bh / 30), cols = Math.floor(bw / 22);
    for (let ro = 0; ro < rows; ro++) for (let co = 0; co < cols; co++) {
      if (r() > 0.3) {
        const wx = bx + 6 + co * 22, wy = by + 10 + ro * 30;
        ctx.fillStyle = r() > 0.5 ? `rgba(255,180,60,${0.4 + r() * 0.4})` : "rgba(40,30,20,0.8)";
        ctx.fillRect(wx, wy, 10, 14);
      }
    }
  }
  ctx.textAlign = "center";
  for (let i = 0; i < 4; i++) {
    const lx = 80 + i * (W - 160) / 3;
    ctx.strokeStyle = "#4a3a20"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(lx, GY + 5); ctx.lineTo(lx, GY - 18); ctx.stroke();
    const g = ctx.createRadialGradient(lx, GY - 20, 2, lx, GY - 10, 28);
    g.addColorStop(0, "rgba(255,160,40,0.35)"); g.addColorStop(1, "transparent");
    ctx.fillStyle = g; ctx.fillRect(lx - 28, GY - 38, 56, 48);
    const fireImg = getIconImage("fire", 13); if (fireImg) ctx.drawImage(fireImg, lx - 6, GY - 24, 13, 13);
  }
  ctx.textAlign = "start";
}

function drawVolcano(ctx, W, H, GY, r) {
  for (let i = 0; i < 4; i++) {
    const ly = GY + 15 + r() * (H - GY - 35);
    ctx.strokeStyle = `rgba(${200 + r() * 55},${50 + r() * 40},10,0.65)`;
    ctx.lineWidth = 5 + r() * 10; ctx.beginPath(); let x = 0; ctx.moveTo(x, ly);
    while (x < W) { x += 25 + r() * 35; ctx.lineTo(x, ly + (r() - 0.5) * 25); } ctx.stroke();
    ctx.strokeStyle = "rgba(255,100,20,0.12)"; ctx.lineWidth = 18 + r() * 12; ctx.stroke();
  }
  ctx.fillStyle = "rgba(255,120,20,0.5)";
  for (let i = 0; i < 15; i++) { ctx.beginPath(); ctx.arc(r() * W, r() * H, 1 + r() * 2.5, 0, Math.PI * 2); ctx.fill(); }
}

function drawSummer(ctx, W, H, GY, r) {
  // Wheat fields – rows of golden stalks
  for (let row = 0; row < 3; row++) {
    const by = GY + 15 + row * 30;
    for (let i = 0; i < 40; i++) {
      const x = r() * W, h = 25 + r() * 35;
      ctx.globalAlpha = 0.5 + r() * 0.4;
      ctx.strokeStyle = `hsl(${42 + r() * 15},${50 + r() * 20}%,${45 + r() * 15}%)`;
      ctx.lineWidth = 1.5 + r();
      ctx.beginPath(); ctx.moveTo(x, by); ctx.lineTo(x + (r() - 0.5) * 6, by - h); ctx.stroke();
      // Wheat head
      ctx.fillStyle = `hsl(${40 + r() * 10},60%,${55 + r() * 15}%)`;
      ctx.beginPath(); ctx.ellipse(x + (r() - 0.5) * 6, by - h - 3, 2, 5, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  // Flowers scattered
  for (let i = 0; i < 12; i++) {
    const fx = r() * W, fy = GY + 5 + r() * (H - GY - 15);
    const hue = [0, 45, 280, 320, 60][Math.floor(r() * 5)];
    ctx.fillStyle = `hsl(${hue},70%,60%)`;
    ctx.beginPath(); ctx.arc(fx, fy, 2.5 + r() * 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `hsl(50,80%,65%)`; ctx.beginPath(); ctx.arc(fx, fy, 1, 0, Math.PI * 2); ctx.fill();
  }
  // Sun glow (top right)
  const sg = ctx.createRadialGradient(W * 0.85, GY * 0.15, 10, W * 0.85, GY * 0.15, 120);
  sg.addColorStop(0, "rgba(255,240,140,0.25)"); sg.addColorStop(1, "transparent");
  ctx.fillStyle = sg; ctx.fillRect(W * 0.65, 0, W * 0.35, GY * 0.5);
}

function drawAutumn(ctx, W, H, GY, r) {
  // Deciduous trees with orange/red/brown foliage
  for (let i = 0; i < 10; i++) {
    const x = r() * W, by = GY - 5 + r() * 15, h = 60 + r() * 90;
    ctx.globalAlpha = 0.4 + r() * 0.5;
    // Trunk
    const tw = 5 + r() * 5;
    ctx.fillStyle = `hsl(25,${30 + r() * 15}%,${20 + r() * 10}%)`;
    ctx.fillRect(x - tw / 2, by - h * 0.3, tw, h * 0.3);
    // Crown – 2-3 overlapping ellipses in autumn colours
    for (let c = 0; c < 3; c++) {
      const hue = [10, 25, 35, 45, 0][Math.floor(r() * 5)];
      const cx = x + (r() - 0.5) * 18, cy = by - h * 0.3 - r() * h * 0.25;
      const rw = 18 + r() * 22, rh = 14 + r() * 18;
      ctx.fillStyle = `hsl(${hue},${50 + r() * 25}%,${30 + r() * 20}%)`;
      ctx.beginPath(); ctx.ellipse(cx, cy, rw, rh, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  // Fallen leaves on ground
  ctx.fillStyle = "rgba(160,80,20,0.3)";
  for (let i = 0; i < 30; i++) {
    ctx.beginPath(); ctx.ellipse(r() * W, GY + 3 + r() * (H - GY) * 0.4, 4 + r() * 6, 2 + r() * 3, r() * Math.PI, 0, Math.PI * 2); ctx.fill();
  }
}

function drawSpring(ctx, W, H, GY, r) {
  // Fresh green trees with blossoms
  for (let i = 0; i < 9; i++) {
    const x = r() * W, by = GY - 5 + r() * 12, h = 55 + r() * 80;
    ctx.globalAlpha = 0.45 + r() * 0.5;
    // Trunk
    ctx.fillStyle = `hsl(25,30%,${22 + r() * 10}%)`; ctx.fillRect(x - 3, by - h * 0.28, 6, h * 0.28);
    // Leafy crown
    for (let c = 0; c < 3; c++) {
      const cx = x + (r() - 0.5) * 14, cy = by - h * 0.28 - r() * h * 0.2;
      ctx.fillStyle = `hsl(${110 + r() * 30},${50 + r() * 20}%,${35 + r() * 20}%)`;
      ctx.beginPath(); ctx.ellipse(cx, cy, 16 + r() * 18, 12 + r() * 14, 0, 0, Math.PI * 2); ctx.fill();
    }
    // Blossoms (pink/white dots)
    for (let b = 0; b < 5; b++) {
      const bx = x + (r() - 0.5) * 30, bby = by - h * 0.28 - r() * h * 0.35;
      ctx.fillStyle = r() > 0.5 ? `rgba(255,180,200,${0.6 + r() * 0.3})` : `rgba(255,255,255,${0.5 + r() * 0.3})`;
      ctx.beginPath(); ctx.arc(bx, bby, 1.5 + r() * 2, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  // Ground flowers
  for (let i = 0; i < 20; i++) {
    const fx = r() * W, fy = GY + 4 + r() * (H - GY - 10);
    const hue = [320, 350, 280, 45, 0][Math.floor(r() * 5)];
    ctx.fillStyle = `hsl(${hue},70%,65%)`;
    ctx.beginPath(); ctx.arc(fx, fy, 2 + r() * 2, 0, Math.PI * 2); ctx.fill();
  }
  // Grass tufts
  ctx.strokeStyle = "rgba(40,140,30,0.35)"; ctx.lineWidth = 1.5;
  for (let i = 0; i < 25; i++) {
    const gx = r() * W, gy = GY + 2 + r() * 15;
    for (let s = 0; s < 3; s++) {
      ctx.beginPath(); ctx.moveTo(gx + s * 3, gy); ctx.lineTo(gx + s * 3 + (r() - 0.5) * 5, gy - 8 - r() * 8); ctx.stroke();
    }
  }
}

function drawMushroom(ctx, W, H, GY, r) {
  for (let i = 0; i < 12; i++) {
    const mx = r() * W, my = GY + r() * (H - GY) * 0.6, mh = 18 + r() * 40, mw = 10 + r() * 20;
    const hue = [320, 280, 20, 0, 50][Math.floor(r() * 5)];
    ctx.globalAlpha = 0.45 + r() * 0.5;
    ctx.fillStyle = "hsl(40,30%,75%)"; ctx.fillRect(mx - 2.5, my - mh * 0.38, 5, mh * 0.38);
    ctx.fillStyle = `hsl(${hue},60%,${32 + r() * 18}%)`; ctx.beginPath(); ctx.ellipse(mx, my - mh * 0.38, mw, mw * 0.45, 0, Math.PI, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    for (let d = 0; d < 3; d++) { ctx.beginPath(); ctx.arc(mx + (r() - 0.5) * mw, my - mh * 0.38 - r() * mw * 0.28, 1.5 + r() * 1.5, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < 15; i++) {
    const sx = r() * W, sy = r() * H;
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 7);
    g.addColorStop(0, `hsla(${280 + r() * 60},80%,60%,0.25)`); g.addColorStop(1, "transparent");
    ctx.fillStyle = g; ctx.fillRect(sx - 7, sy - 7, 14, 14);
  }
}

function drawSwamp(ctx, W, H, GY, r) {
  for (let i = 0; i < 7; i++) { ctx.fillStyle = `rgba(30,60,20,${0.3 + r() * 0.3})`; ctx.beginPath(); ctx.ellipse(r() * W, GY + 10 + r() * (H - GY - 20), 40 + r() * 80, 10 + r() * 15, r(), 0, Math.PI * 2); ctx.fill(); }
  for (let i = 0; i < 5; i++) {
    const x = r() * W, by = GY + r() * 10, h = 40 + r() * 55;
    ctx.strokeStyle = `hsl(30,20%,${15 + r() * 10}%)`; ctx.lineWidth = 3 + r() * 4;
    ctx.beginPath(); ctx.moveTo(x, by); ctx.lineTo(x + (r() - 0.5) * 15, by - h); ctx.stroke();
    for (let b = 0; b < 3; b++) { const bh = h * 0.3 + r() * h * 0.5; ctx.lineWidth = 1 + r() * 2; ctx.beginPath(); ctx.moveTo(x + (r() - 0.5) * 8, by - bh); ctx.lineTo(x + (r() - 0.5) * 30, by - bh - 10 - r() * 15); ctx.stroke(); }
  }
  for (let i = 0; i < 5; i++) { const fx = r() * W, fy = GY - 10 + r() * 30; const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, 50 + r() * 50); g.addColorStop(0, "rgba(60,80,40,0.12)"); g.addColorStop(1, "transparent"); ctx.fillStyle = g; ctx.fillRect(fx - 60, fy - 25, 120, 50); }
}

// ─── SUNSET BEACH (Złota Plaża Zachodu) ───
// Tropical sunset with golden sand, palm trees, thatched umbrellas, cocktail vibes
function drawSunsetBeach(ctx, W, H, GY, r) {
  // --- Dramatic sunset sky with layered warm gradients ---
  const skyGrad = ctx.createLinearGradient(0, 0, 0, GY);
  skyGrad.addColorStop(0, "#1a0530");       // deep purple top
  skyGrad.addColorStop(0.2, "#6a1040");     // magenta
  skyGrad.addColorStop(0.45, "#d04020");    // deep orange
  skyGrad.addColorStop(0.7, "#ff8030");     // warm orange
  skyGrad.addColorStop(0.9, "#ffc050");     // golden
  skyGrad.addColorStop(1, "#ffe080");       // light gold at horizon
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, GY);

  // --- Sun (large, half-submerged at horizon) ---
  const sunX = W * 0.55, sunY = GY - 5, sunR = 38;
  // Sun glow aura
  const sunGlow = ctx.createRadialGradient(sunX, sunY, sunR * 0.3, sunX, sunY, sunR * 4);
  sunGlow.addColorStop(0, "rgba(255,220,100,0.35)");
  sunGlow.addColorStop(0.3, "rgba(255,160,40,0.15)");
  sunGlow.addColorStop(1, "transparent");
  ctx.fillStyle = sunGlow;
  ctx.fillRect(sunX - sunR * 4, sunY - sunR * 4, sunR * 8, sunR * 4);
  // Sun body
  const sunBody = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR);
  sunBody.addColorStop(0, "#fff8e0");
  sunBody.addColorStop(0.5, "#ffd040");
  sunBody.addColorStop(1, "#ff8020");
  ctx.fillStyle = sunBody;
  ctx.beginPath(); ctx.arc(sunX, sunY, sunR, Math.PI, Math.PI * 2); ctx.fill();
  // Sun reflection stripe on sky
  ctx.fillStyle = "rgba(255,200,80,0.08)";
  ctx.fillRect(sunX - 120, GY - 20, 240, 20);

  // --- Horizon light band ---
  ctx.fillStyle = "rgba(255,240,180,0.15)";
  ctx.fillRect(0, GY - 8, W, 16);

  // --- Distant clouds silhouettes ---
  for (let i = 0; i < 5; i++) {
    const cx = r() * W, cy = GY * (0.15 + r() * 0.35);
    const cw = 60 + r() * 100, ch = 12 + r() * 18;
    const hue = 15 + r() * 25;
    ctx.fillStyle = `hsla(${hue},60%,${40 + r() * 20}%,${0.15 + r() * 0.15})`;
    ctx.beginPath(); ctx.ellipse(cx, cy, cw, ch, 0, 0, Math.PI * 2); ctx.fill();
    // Cloud highlight (top edge)
    ctx.fillStyle = `hsla(${hue + 10},70%,${65 + r() * 15}%,${0.08 + r() * 0.08})`;
    ctx.beginPath(); ctx.ellipse(cx, cy - ch * 0.3, cw * 0.8, ch * 0.5, 0, Math.PI, Math.PI * 2); ctx.fill();
  }

  // --- Ocean water area (bottom 25% of ground) ---
  const waterY = H * 0.78;
  // Water gradient - warm sunset tones reflecting
  const waterG = ctx.createLinearGradient(0, waterY, 0, H);
  waterG.addColorStop(0, "rgba(255,140,60,0.55)");
  waterG.addColorStop(0.3, "rgba(200,80,40,0.5)");
  waterG.addColorStop(0.7, "rgba(40,60,120,0.65)");
  waterG.addColorStop(1, "rgba(20,30,80,0.8)");
  ctx.fillStyle = waterG;
  ctx.fillRect(0, waterY, W, H - waterY);

  // --- Sun reflection on water ---
  const reflX = sunX, reflW = 30;
  for (let i = 0; i < 12; i++) {
    const ry = waterY + 5 + i * 6;
    const rw = reflW - i * 1.5 + r() * 10;
    const alpha = 0.35 - i * 0.025;
    ctx.fillStyle = `rgba(255,220,100,${Math.max(0.02, alpha)})`;
    ctx.fillRect(reflX - rw / 2 + (r() - 0.5) * 8, ry, rw, 3);
  }

  // --- Wave lines on water ---
  ctx.strokeStyle = "rgba(255,200,140,0.18)";
  ctx.lineWidth = 1.2;
  for (let row = 0; row < 6; row++) {
    const y = waterY + 5 + row * 10;
    ctx.beginPath();
    for (let x = 0; x < W; x += 4) {
      const yy = y + Math.sin(x * 0.025 + row * 2.5) * 3;
      x === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }

  // --- Sandy beach with texture ---
  // Sand ripple texture
  ctx.fillStyle = "rgba(180,140,60,0.12)";
  for (let i = 0; i < 40; i++) {
    const sx = r() * W, sy = GY + 5 + r() * (waterY - GY - 10);
    ctx.beginPath(); ctx.ellipse(sx, sy, 8 + r() * 20, 1.5, r() * 0.4, 0, Math.PI * 2); ctx.fill();
  }
  // Shells & pebbles
  for (let i = 0; i < 15; i++) {
    const sx = r() * W, sy = GY + 8 + r() * (waterY - GY - 15);
    const hue = [35, 40, 20, 50][Math.floor(r() * 4)];
    ctx.fillStyle = `hsla(${hue},${30 + r() * 30}%,${60 + r() * 25}%,${0.25 + r() * 0.2})`;
    ctx.beginPath(); ctx.ellipse(sx, sy, 2 + r() * 3, 1.5 + r() * 2, r() * Math.PI, 0, Math.PI * 2); ctx.fill();
  }

  // --- Palm trees (leaning, sunset-silhouetted) ---
  for (let i = 0; i < 5; i++) {
    const px = 40 + r() * (W - 80);
    const by = GY - 2 + r() * 10;
    const h = 80 + r() * 100;
    const lean = (r() - 0.4) * 35;
    const depth = r();
    ctx.globalAlpha = 0.5 + depth * 0.45;

    // Trunk - curved, warm brown
    ctx.lineWidth = 4 + depth * 4;
    const trunkG = ctx.createLinearGradient(px, by, px + lean, by - h);
    trunkG.addColorStop(0, "#5a3a18");
    trunkG.addColorStop(1, "#3a2010");
    ctx.strokeStyle = trunkG;
    ctx.beginPath();
    ctx.moveTo(px, by);
    ctx.quadraticCurveTo(px + lean * 0.4, by - h * 0.5, px + lean, by - h);
    ctx.stroke();

    // Trunk texture rings
    ctx.strokeStyle = "rgba(80,50,20,0.3)";
    ctx.lineWidth = 1;
    for (let t = 0; t < 6; t++) {
      const tt = t / 6;
      const ringX = px + lean * 0.4 * tt + (lean * 0.6 * tt * tt);
      const ringY = by - h * tt;
      ctx.beginPath(); ctx.moveTo(ringX - 3, ringY); ctx.lineTo(ringX + 3, ringY); ctx.stroke();
    }

    // Coconuts
    const topX = px + lean, topY = by - h;
    ctx.fillStyle = "#5a3a10";
    for (let c = 0; c < 2 + Math.floor(r() * 2); c++) {
      ctx.beginPath(); ctx.arc(topX + (r() - 0.5) * 10, topY + 5 + r() * 6, 3 + r() * 2, 0, Math.PI * 2); ctx.fill();
    }

    // Fronds (8 per tree)
    for (let f = 0; f < 8; f++) {
      const angle = (f / 8) * Math.PI * 2 + r() * 0.5;
      const frondLen = 35 + r() * 40;
      const endX = topX + Math.cos(angle) * frondLen;
      const endY = topY + Math.sin(angle) * frondLen * 0.5 + frondLen * 0.25;
      const ctrlX = topX + Math.cos(angle) * frondLen * 0.6;
      const ctrlY = topY + Math.sin(angle) * frondLen * 0.2 - 8;

      // Frond stem
      ctx.strokeStyle = `hsl(${100 + r() * 25},${40 + r() * 20}%,${18 + depth * 12}%)`;
      ctx.lineWidth = 2 + r();
      ctx.beginPath(); ctx.moveTo(topX, topY);
      ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY); ctx.stroke();

      // Leaflets along frond
      for (let lf = 0; lf < 5; lf++) {
        const lt = 0.2 + lf * 0.16;
        const lx = topX + (ctrlX - topX) * lt * 2 * (lt < 0.5 ? 1 : 0) + (endX - topX) * (lt > 0.5 ? lt : lt * 0.5);
        const ly = topY + (ctrlY - topY) * lt * 2 * (lt < 0.5 ? 1 : 0) + (endY - topY) * (lt > 0.5 ? lt : lt * 0.5);
        const side = lf % 2 === 0 ? 1 : -1;
        ctx.fillStyle = `hsl(${105 + r() * 20},${40 + r() * 15}%,${20 + depth * 10 + r() * 5}%)`;
        ctx.beginPath();
        ctx.ellipse(lx + side * 5, ly + 2, 8 + r() * 4, 2.5, angle + side * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.globalAlpha = 1;

  // --- Thatched beach umbrella ---
  const umbX = W * 0.25 + r() * W * 0.15;
  const umbY = GY + 15;
  // Pole
  ctx.strokeStyle = "#6a4a20"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(umbX, umbY + 50); ctx.lineTo(umbX, umbY - 25); ctx.stroke();
  // Thatch canopy (layered arcs)
  for (let layer = 0; layer < 4; layer++) {
    const ly = umbY - 25 + layer * 4;
    const rad = 38 - layer * 3;
    ctx.fillStyle = `hsl(${35 + layer * 5},${50 + layer * 5}%,${45 + layer * 5}%)`;
    ctx.beginPath(); ctx.ellipse(umbX, ly, rad, 10 + layer * 2, 0, Math.PI, Math.PI * 2); ctx.fill();
    // Straw texture
    ctx.strokeStyle = `rgba(160,120,50,${0.2 + layer * 0.05})`;
    ctx.lineWidth = 0.8;
    for (let s = 0; s < 6; s++) {
      const sx = umbX - rad + s * rad / 3 + r() * 8;
      ctx.beginPath(); ctx.moveTo(sx, ly - 5); ctx.lineTo(sx + (r() - 0.5) * 4, ly - 10 - r() * 5); ctx.stroke();
    }
  }

  // --- Cocktail glass on sand ---
  const cktX = umbX + 25 + r() * 20, cktY = umbY + 42;
  // Glass
  ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(cktX - 8, cktY - 15); ctx.lineTo(cktX - 3, cktY); ctx.lineTo(cktX + 3, cktY); ctx.lineTo(cktX + 8, cktY - 15); ctx.stroke();
  // Liquid
  ctx.fillStyle = "rgba(255,160,40,0.6)";
  ctx.beginPath(); ctx.moveTo(cktX - 7, cktY - 12); ctx.lineTo(cktX - 3, cktY); ctx.lineTo(cktX + 3, cktY); ctx.lineTo(cktX + 7, cktY - 12); ctx.closePath(); ctx.fill();
  // Umbrella decoration
  ctx.fillStyle = "#ff4060";
  ctx.beginPath(); ctx.moveTo(cktX + 1, cktY - 18); ctx.lineTo(cktX + 8, cktY - 14); ctx.lineTo(cktX + 1, cktY - 12); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#6a3a10"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cktX + 1, cktY - 20); ctx.lineTo(cktX + 1, cktY - 8); ctx.stroke();

  // --- Footprints in sand ---
  ctx.fillStyle = "rgba(140,110,50,0.15)";
  for (let i = 0; i < 6; i++) {
    const fx = W * 0.4 + i * 35 + r() * 10, fy = GY + 40 + r() * 20 + Math.sin(i * 0.8) * 8;
    ctx.beginPath(); ctx.ellipse(fx, fy, 4, 6, 0.2 * (i % 2 === 0 ? 1 : -1), 0, Math.PI * 2); ctx.fill();
  }

  // --- Overall warm glow ---
  const warmGlow = ctx.createRadialGradient(sunX, GY, 0, sunX, GY, W * 0.7);
  warmGlow.addColorStop(0, "rgba(255,180,60,0.06)");
  warmGlow.addColorStop(1, "transparent");
  ctx.fillStyle = warmGlow;
  ctx.fillRect(0, 0, W, H);
}

// ─── BAMBOO FALLS (Bambusowy Wodospad) ───
// Lush bamboo forest with emerald waterfall, mossy rocks, sunlight beams
function drawBambooFalls(ctx, W, H, GY, r) {
  // --- Rich tropical sky with canopy filtering ---
  const skyGrad = ctx.createLinearGradient(0, 0, 0, GY);
  skyGrad.addColorStop(0, "#0a2a10");
  skyGrad.addColorStop(0.4, "#1a5a28");
  skyGrad.addColorStop(0.7, "#2a8a3a");
  skyGrad.addColorStop(1, "#40b050");
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, GY);

  // --- Sunlight beams piercing through canopy ---
  for (let i = 0; i < 4; i++) {
    const bx = W * 0.15 + r() * W * 0.7;
    const bw = 15 + r() * 25;
    const g = ctx.createLinearGradient(bx, 0, bx + bw, H * 0.6);
    g.addColorStop(0, `rgba(255,255,180,${0.03 + r() * 0.04})`);
    g.addColorStop(0.5, `rgba(200,255,150,${0.02 + r() * 0.03})`);
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(bx, 0);
    ctx.lineTo(bx + bw * 3, H * 0.7);
    ctx.lineTo(bx + bw * 3 + bw, H * 0.7);
    ctx.lineTo(bx + bw, 0);
    ctx.closePath();
    ctx.fill();
  }

  // --- Waterfall (center-right, flowing from sky to pool) ---
  const fallX = W * 0.62 + r() * 30;
  const fallW = 35 + r() * 20;
  const fallTop = GY * 0.3;
  const fallBot = GY + (H - GY) * 0.55;

  // Rock cliff face behind waterfall
  ctx.fillStyle = "#3a4a30";
  ctx.beginPath();
  ctx.moveTo(fallX - fallW * 1.2, fallTop - 15);
  ctx.lineTo(fallX + fallW * 1.5, fallTop - 10);
  ctx.lineTo(fallX + fallW * 1.8, fallBot + 20);
  ctx.lineTo(fallX - fallW * 1.5, fallBot + 15);
  ctx.closePath();
  ctx.fill();
  // Rock texture
  ctx.fillStyle = "rgba(50,70,40,0.4)";
  for (let i = 0; i < 12; i++) {
    const rx = fallX - fallW + r() * fallW * 2.5;
    const ry = fallTop + r() * (fallBot - fallTop);
    ctx.beginPath(); ctx.ellipse(rx, ry, 6 + r() * 12, 4 + r() * 8, r(), 0, Math.PI * 2); ctx.fill();
  }
  // Moss on rocks
  ctx.fillStyle = "rgba(40,120,40,0.35)";
  for (let i = 0; i < 8; i++) {
    const mx = fallX - fallW * 0.8 + r() * fallW * 2;
    const my = fallTop + r() * (fallBot - fallTop) * 0.7;
    ctx.beginPath(); ctx.ellipse(mx, my, 5 + r() * 10, 3 + r() * 5, r(), 0, Math.PI * 2); ctx.fill();
  }

  // Waterfall main stream
  const fallGrad = ctx.createLinearGradient(fallX, fallTop, fallX, fallBot);
  fallGrad.addColorStop(0, "rgba(180,240,220,0.7)");
  fallGrad.addColorStop(0.3, "rgba(120,220,200,0.6)");
  fallGrad.addColorStop(0.7, "rgba(80,200,180,0.55)");
  fallGrad.addColorStop(1, "rgba(150,240,230,0.5)");
  ctx.fillStyle = fallGrad;
  ctx.beginPath();
  ctx.moveTo(fallX - fallW * 0.4, fallTop);
  ctx.quadraticCurveTo(fallX - fallW * 0.5, (fallTop + fallBot) * 0.5, fallX - fallW * 0.6, fallBot);
  ctx.lineTo(fallX + fallW * 0.6, fallBot);
  ctx.quadraticCurveTo(fallX + fallW * 0.5, (fallTop + fallBot) * 0.5, fallX + fallW * 0.4, fallTop);
  ctx.closePath();
  ctx.fill();

  // Waterfall streaks (vertical lines)
  ctx.strokeStyle = "rgba(200,255,240,0.2)"; ctx.lineWidth = 1;
  for (let i = 0; i < 10; i++) {
    const sx = fallX - fallW * 0.3 + r() * fallW * 0.6;
    const sy = fallTop + r() * 20;
    ctx.beginPath(); ctx.moveTo(sx, sy);
    ctx.lineTo(sx + (r() - 0.5) * 8, fallBot - r() * 15); ctx.stroke();
  }

  // Splash mist at base
  for (let i = 0; i < 6; i++) {
    const mx = fallX + (r() - 0.5) * fallW * 1.5;
    const my = fallBot - 5 + r() * 15;
    const mr = 10 + r() * 20;
    const mist = ctx.createRadialGradient(mx, my, 0, mx, my, mr);
    mist.addColorStop(0, `rgba(200,255,240,${0.12 + r() * 0.08})`);
    mist.addColorStop(1, "transparent");
    ctx.fillStyle = mist;
    ctx.fillRect(mx - mr, my - mr, mr * 2, mr * 2);
  }

  // --- Emerald pool at base ---
  const poolY = fallBot - 5;
  const poolH = 35;
  const poolGrad = ctx.createLinearGradient(0, poolY, 0, poolY + poolH);
  poolGrad.addColorStop(0, "rgba(30,180,130,0.5)");
  poolGrad.addColorStop(0.5, "rgba(20,120,100,0.55)");
  poolGrad.addColorStop(1, "rgba(10,80,70,0.6)");
  ctx.fillStyle = poolGrad;
  ctx.beginPath();
  ctx.ellipse(fallX, poolY + poolH * 0.3, fallW * 2.5, poolH, 0, 0, Math.PI * 2);
  ctx.fill();
  // Pool sparkle
  ctx.fillStyle = "rgba(200,255,240,0.15)";
  for (let i = 0; i < 8; i++) {
    const sx = fallX - fallW * 2 + r() * fallW * 4;
    const sy = poolY + r() * poolH * 0.5;
    ctx.beginPath(); ctx.arc(sx, sy, 1 + r() * 2, 0, Math.PI * 2); ctx.fill();
  }

  // --- Bamboo stalks (main feature) ---
  for (let i = 0; i < 14; i++) {
    const bx = r() * W;
    const by = GY - 5 + r() * 12;
    const bh = 90 + r() * 140;
    const depth = r();
    ctx.globalAlpha = 0.4 + depth * 0.55;

    // Bamboo stalk - segmented
    const stalkW = 3 + depth * 4;
    const segments = 5 + Math.floor(r() * 4);
    const segH = bh / segments;

    for (let s = 0; s < segments; s++) {
      const sy = by - s * segH;
      // Segment body
      const segGrad = ctx.createLinearGradient(bx - stalkW, sy, bx + stalkW, sy);
      segGrad.addColorStop(0, `hsl(${80 + r() * 20},${35 + r() * 15}%,${25 + depth * 15}%)`);
      segGrad.addColorStop(0.3, `hsl(${85 + r() * 15},${40 + r() * 15}%,${35 + depth * 18}%)`);
      segGrad.addColorStop(0.7, `hsl(${85 + r() * 15},${40 + r() * 15}%,${35 + depth * 18}%)`);
      segGrad.addColorStop(1, `hsl(${80 + r() * 20},${35 + r() * 15}%,${25 + depth * 15}%)`);
      ctx.fillStyle = segGrad;
      ctx.fillRect(bx - stalkW / 2, sy - segH, stalkW, segH - 1);

      // Node ring at segment joint
      ctx.fillStyle = `hsl(${75 + r() * 15},${30 + r() * 10}%,${20 + depth * 12}%)`;
      ctx.fillRect(bx - stalkW / 2 - 1, sy - 1, stalkW + 2, 3);

      // Highlight line (makes it look cylindrical)
      ctx.fillStyle = `rgba(180,220,160,${0.1 + depth * 0.08})`;
      ctx.fillRect(bx - stalkW / 2 + stalkW * 0.3, sy - segH + 2, 1, segH - 4);
    }

    // Bamboo leaves at top
    const topY = by - bh;
    for (let l = 0; l < 4 + Math.floor(r() * 4); l++) {
      const lAngle = (r() - 0.5) * Math.PI * 0.8;
      const lLen = 15 + r() * 25;
      const lx = bx + Math.cos(lAngle) * lLen;
      const ly = topY - Math.abs(Math.sin(lAngle)) * lLen * 0.3 + r() * 15;
      ctx.fillStyle = `hsl(${100 + r() * 30},${45 + r() * 20}%,${22 + depth * 12 + r() * 8}%)`;
      ctx.beginPath();
      ctx.ellipse(lx, ly, lLen * 0.4, 3 + r() * 2, lAngle, 0, Math.PI * 2);
      ctx.fill();
    }

    // Side leaf clusters on nodes
    if (r() > 0.4) {
      const nodeIdx = 1 + Math.floor(r() * (segments - 2));
      const ny = by - nodeIdx * segH;
      const side = r() > 0.5 ? 1 : -1;
      for (let l = 0; l < 3; l++) {
        const la = side * (0.3 + r() * 0.5);
        const ll = 12 + r() * 18;
        ctx.fillStyle = `hsl(${105 + r() * 20},${45 + r() * 15}%,${24 + depth * 10}%)`;
        ctx.beginPath();
        ctx.ellipse(bx + side * stalkW + Math.cos(la) * ll * 0.5, ny - l * 6 + Math.sin(la) * ll * 0.2, ll * 0.35, 2.5, la, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.globalAlpha = 1;

  // --- Mossy rocks on ground ---
  for (let i = 0; i < 6; i++) {
    const rx = r() * W, ry = GY + 10 + r() * (H - GY) * 0.5;
    const rw = 15 + r() * 30, rh = 8 + r() * 15;
    // Rock body
    ctx.fillStyle = `hsl(${100 + r() * 30},${15 + r() * 15}%,${22 + r() * 12}%)`;
    ctx.beginPath(); ctx.ellipse(rx, ry, rw, rh, r() * 0.3, 0, Math.PI * 2); ctx.fill();
    // Moss top
    ctx.fillStyle = `rgba(50,140,50,${0.3 + r() * 0.2})`;
    ctx.beginPath(); ctx.ellipse(rx, ry - rh * 0.3, rw * 0.8, rh * 0.4, 0, Math.PI, Math.PI * 2); ctx.fill();
  }

  // --- Bamboo raft in pool ---
  const raftX = fallX - 20, raftY = poolY + 5;
  ctx.fillStyle = "#6a5a20";
  for (let log = 0; log < 5; log++) {
    ctx.fillRect(raftX - 20 + log * 9, raftY - 2, 7, 24);
  }
  // Cross ties
  ctx.fillStyle = "#5a4a18";
  ctx.fillRect(raftX - 22, raftY + 3, 47, 3);
  ctx.fillRect(raftX - 22, raftY + 15, 47, 3);

  // --- Hanging vines ---
  ctx.strokeStyle = "rgba(30,100,30,0.3)"; ctx.lineWidth = 1.5;
  for (let i = 0; i < 5; i++) {
    const vx = r() * W;
    const vy = 0;
    const vLen = GY * 0.3 + r() * GY * 0.5;
    ctx.beginPath();
    ctx.moveTo(vx, vy);
    ctx.quadraticCurveTo(vx + (r() - 0.5) * 30, vy + vLen * 0.5, vx + (r() - 0.5) * 15, vy + vLen);
    ctx.stroke();
    // Small leaves on vine
    for (let l = 0; l < 3; l++) {
      const lt = 0.3 + l * 0.25;
      const lx = vx + (r() - 0.5) * 15 * lt;
      const ly = vy + vLen * lt;
      ctx.fillStyle = `hsl(${110 + r() * 20},50%,${25 + r() * 10}%)`;
      ctx.beginPath(); ctx.ellipse(lx, ly, 4, 2, r(), 0, Math.PI * 2); ctx.fill();
    }
  }

  // --- Ground ferns ---
  for (let i = 0; i < 8; i++) {
    const fx = r() * W, fy = GY + 5 + r() * 15;
    for (let f = 0; f < 3; f++) {
      const fa = -0.5 + f * 0.5 + (r() - 0.5) * 0.3;
      const fl = 12 + r() * 15;
      ctx.strokeStyle = `hsl(${110 + r() * 20},${45 + r() * 15}%,${20 + r() * 10}%)`;
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(fx, fy);
      ctx.quadraticCurveTo(fx + Math.cos(fa) * fl * 0.6, fy - fl * 0.7, fx + Math.cos(fa) * fl, fy - fl * 0.3);
      ctx.stroke();
    }
  }

  // --- Green mist / atmosphere ---
  const forestMist = ctx.createRadialGradient(W * 0.5, H * 0.4, 50, W * 0.5, H * 0.4, W * 0.6);
  forestMist.addColorStop(0, "rgba(40,160,80,0.04)");
  forestMist.addColorStop(1, "transparent");
  ctx.fillStyle = forestMist;
  ctx.fillRect(0, 0, W, H);
}
