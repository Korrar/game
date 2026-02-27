import { seedRng } from "../utils/helpers";

export function renderBiome(ctx, biome, room, W, H, isNight) {
  const GY = H * 0.65;
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
  const fns = { jungle: drawJungle, island: drawIsland, desert: drawDesert, winter: drawWinter, city: drawCity, volcano: drawVolcano, summer: drawSummer, autumn: drawAutumn, spring: drawSpring, mushroom: drawMushroom, swamp: drawSwamp };
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
  ctx.textAlign = "center";
  for (let i = 0; i < 9; i++) {
    const it = items[Math.floor(r() * items.length)];
    const x = r() * (W - 50) + 25, y = GY + 12 + r() * (H - GY - 45);
    ctx.globalAlpha = 0.35 + r() * 0.5;
    ctx.font = `${16 + r() * 20}px serif`;
    ctx.fillText(it, x, y);
  }
  ctx.globalAlpha = 1; ctx.textAlign = "start";
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
    ctx.font = "13px serif"; ctx.fillText("🔥", lx, GY - 18);
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
