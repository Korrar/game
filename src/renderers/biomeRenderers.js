import { seedRng } from "../utils/helpers";
import { getIconImage } from "../rendering/icons.js";
import { DEPTH_CONFIG } from "../rendering/DepthSystem.js";

// Panoramic world is 3x wider than the viewport — seamless wrap-around
export const PANORAMA_WORLD_W = 3;  // multiplier of viewport width

export function renderBiome(ctx, biome, room, W, H, isNight, panOffset = 0) {
  const GY = H * 0.25;
  const rng = seedRng(room * 137 + 42);
  const worldW = W * PANORAMA_WORLD_W;

  // Sky (full viewport, no pan — sky is always visible)
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

  // 2.5D: atmospheric depth haze on ground (horizon is hazier)
  const haze = ctx.createLinearGradient(0, GY, 0, GY + (H - GY) * 0.5);
  haze.addColorStop(0, "rgba(180,190,210,0.25)");
  haze.addColorStop(1, "rgba(180,190,210,0)");
  ctx.fillStyle = haze; ctx.fillRect(0, GY, W, (H - GY) * 0.5);

  // 2.5D: color desaturation band near horizon — washes out colors at distance
  const desat = ctx.createLinearGradient(0, GY, 0, GY + (H - GY) * 0.35);
  desat.addColorStop(0, `rgba(200,200,210,${DEPTH_CONFIG.desatMax})`);
  desat.addColorStop(1, "rgba(200,200,210,0)");
  ctx.fillStyle = desat; ctx.fillRect(0, GY, W, (H - GY) * 0.35);

  // 2.5D: depth lines — subtle horizontal lines that reinforce perspective
  ctx.strokeStyle = "rgba(0,0,0,0.03)";
  ctx.lineWidth = 1;
  const groundH = H - GY;
  for (let i = 0; i < 6; i++) {
    const t = i / 6;
    const ly = GY + t * groundH * 0.7;
    ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(W, ly); ctx.stroke();
  }

  // Night ground darkening
  if (isNight) {
    ctx.fillStyle = "rgba(0,0,12,0.35)";
    ctx.fillRect(0, GY, W, H - GY);
  }

  // Biome-specific + scatter: render in panoramic world space with wrapping
  // We draw the content 3x shifted to create seamless wrap, clipped to viewport
  const fns = { jungle: drawJungle, island: drawIsland, desert: drawDesert, winter: drawWinter, city: drawCity, volcano: drawVolcano, summer: drawSummer, autumn: drawAutumn, spring: drawSpring, mushroom: drawMushroom, swamp: drawSwamp, sunset_beach: drawSunsetBeach, bamboo_falls: drawBambooFalls, blue_lagoon: drawBlueLagoon, olympus: drawOlympus, underworld: drawUnderworld };
  const drawFn = fns[biome.renderFn];
  const panWorldW = W * PANORAMA_WORLD_W;
  // Normalize panOffset into [0, panWorldW)
  const normOff = ((panOffset % panWorldW) + panWorldW) % panWorldW;

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.clip();
  // Draw biome content at shifted positions for seamless wrapping
  for (let shift = -1; shift <= 1; shift++) {
    const tx = -normOff + shift * panWorldW;
    // Only draw if this copy overlaps the viewport
    if (tx + panWorldW < -10 || tx > W + 10) continue;
    ctx.save();
    ctx.translate(tx, 0);
    const shiftRng = seedRng(room * 137 + 42); // re-seed per copy so content is identical
    if (drawFn) drawFn(ctx, panWorldW, H, GY, shiftRng);
    drawScatter(ctx, panWorldW, H, GY, shiftRng, biome.scatter);
    ctx.restore();
  }
  ctx.restore();

  // Fog
  ctx.fillStyle = biome.fogCol; ctx.fillRect(0, 0, W, H);

  // Night general atmosphere
  if (isNight) {
    ctx.fillStyle = "rgba(5,5,20,0.15)";
    ctx.fillRect(0, 0, W, H);
  }
}

function drawScatter(ctx, W, H, GY, r, items) {
  // 2.5D: collect scatter objects, sort by Y (far first), scale by depth
  const groundH = H - GY;
  const scatterList = [];
  const SCATTER_MIN_DIST_SQ = 55 * 55; // minimum pixel distance squared between scatter items
  for (let i = 0; i < 18; i++) {
    const iconName = items[Math.floor(r() * items.length)];
    let x, y, attempts = 0;
    do {
      x = r() * (W - 50) + 25;
      y = GY + 12 + r() * (groundH - 45);
      attempts++;
    } while (attempts < 12 && scatterList.some(s => {
      const dx = x - s.x, dy = y - s.y;
      return dx * dx + dy * dy < SCATTER_MIN_DIST_SQ;
    }));
    scatterList.push({ iconName, x, y, rVal: r() });
  }
  // Sort by Y ascending (far objects drawn first — painter's algorithm)
  scatterList.sort((a, b) => a.y - b.y);

  for (const s of scatterList) {
    // Depth: 0 at horizon (GY), 1 at bottom (H)
    const depthT = Math.max(0, Math.min(1, (s.y - GY) / groundH));
    // Scale: far objects smaller (0.6x), near objects bigger (1.4x)
    const { minScale, maxScale } = DEPTH_CONFIG;
    const scale = minScale + (maxScale - minScale) * depthT;
    // Alpha: far objects more transparent (minimum 0.3 for visibility)
    const alpha = Math.max(0.3, (0.35 + s.rVal * 0.35) * (0.65 + depthT * 0.35));
    ctx.globalAlpha = alpha;
    const baseSz = 20 + s.rVal * 24;
    const sz = Math.round(baseSz * scale);
    const img = getIconImage(s.iconName, sz);
    if (img) {
      ctx.drawImage(img, s.x - sz / 2, s.y - sz / 2, sz, sz);
    }
  }
  ctx.globalAlpha = 1;
}

function drawJungle(ctx, W, H, GY, r) {
  const groundH = H - GY;
  // Collect trees with Y-position, sort by depth (painter's algorithm)
  const trees = [];
  for (let i = 0; i < 12; i++) {
    trees.push({ x: r() * W, by: GY - 10 + r() * 40, h: 70 + r() * 120, rvals: [r(), r(), r(), r(), r(), r(), r(), r()] });
  }
  trees.sort((a, b) => a.by - b.by); // far first
  for (const t of trees) {
    const depthT = Math.max(0, Math.min(1, (t.by - GY) / (groundH * 0.5)));
    const { minScale, maxScale } = DEPTH_CONFIG;
    const scale = minScale + (maxScale - minScale) * depthT;
    ctx.globalAlpha = 0.3 + depthT * 0.6;
    const tw = (5 + t.rvals[0] * 6) * scale;
    // Trunk
    ctx.fillStyle = `hsl(25,40%,${18 + t.rvals[1] * 10}%)`;
    ctx.fillRect(t.x - tw / 2, t.by - t.h * 0.35 * scale, tw, t.h * 0.35 * scale);
    // Vine
    ctx.strokeStyle = "rgba(40,120,20,0.4)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(t.x, t.by - t.h * 0.3 * scale);
    ctx.bezierCurveTo(t.x + 15 * scale, t.by - t.h * 0.2 * scale, t.x - 10 * scale, t.by - t.h * 0.1 * scale, t.x + 5 * scale, t.by); ctx.stroke();
    // Canopy layers
    for (let l = 0; l < 4; l++) {
      const ly = t.by - t.h * 0.35 * scale - l * t.h * 0.18 * scale;
      const rad = (22 + t.rvals[2 + l] * 25 - l * 4) * scale;
      const light = 16 + l * 6 + t.rvals[2 + l] * 5 - (1 - depthT) * 4; // darker at distance
      ctx.fillStyle = `hsl(${105 + t.rvals[2 + l] * 30},${45 + t.rvals[2 + l] * 20}%,${light}%)`;
      ctx.beginPath(); ctx.ellipse(t.x, ly, rad, rad * 0.65, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  // Hanging moss near horizon (depth detail)
  for (let i = 0; i < 12; i++) {
    const mx = r() * W, my = GY + 5 + r() * 25;
    ctx.strokeStyle = `rgba(60,100,30,${0.12 + r() * 0.1})`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx + (r() - 0.5) * 4, my + 10 + r() * 18); ctx.stroke();
  }
  // River flowing through the jungle
  const riverY = H * 0.78;
  const riverH = 25;
  const riverG = ctx.createLinearGradient(0, riverY, 0, riverY + riverH);
  riverG.addColorStop(0, "rgba(20,100,140,0.4)"); riverG.addColorStop(0.5, "rgba(30,120,160,0.5)"); riverG.addColorStop(1, "rgba(20,80,110,0.35)");
  ctx.fillStyle = riverG;
  ctx.beginPath(); ctx.moveTo(0, riverY + 5);
  for (let x = 0; x <= W; x += 15) ctx.lineTo(x, riverY + Math.sin(x * 0.01 + 1.2) * 4);
  ctx.lineTo(W, riverY + riverH);
  for (let x = W; x >= 0; x -= 15) ctx.lineTo(x, riverY + riverH + Math.sin(x * 0.012 + 0.8) * 3);
  ctx.closePath(); ctx.fill();
  // River surface shimmer
  ctx.strokeStyle = "rgba(120,200,230,0.15)"; ctx.lineWidth = 1;
  for (let row = 0; row < 3; row++) {
    const ry = riverY + 5 + row * 7;
    ctx.beginPath();
    for (let x = 0; x < W; x += 5) { const yy = ry + Math.sin(x * 0.02 + row * 1.5) * 2; x === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); }
    ctx.stroke();
  }
  // Rocks in river
  for (let i = 0; i < 4; i++) {
    const rx = r() * W, ry = riverY + 4 + r() * (riverH - 8);
    ctx.fillStyle = `rgba(60,70,55,${0.2 + r() * 0.15})`;
    ctx.beginPath(); ctx.ellipse(rx, ry, 5 + r() * 6, 3 + r() * 3, 0, 0, Math.PI * 2); ctx.fill();
  }
}

function drawIsland(ctx, W, H, GY, r) {
  const groundH = H - GY;
  // Collect palms with depth, sort far-first
  const palms = [];
  for (let i = 0; i < 6; i++) {
    palms.push({ x: r() * W, by: GY - 5 + r() * 25, h: 50 + r() * 70, lean: (r() - 0.5) * 25, rv: [r(), r(), r(), r(), r(), r(), r()] });
  }
  palms.sort((a, b) => a.by - b.by);
  for (const p of palms) {
    const depthT = Math.max(0, Math.min(1, (p.by - GY + 10) / (groundH * 0.4)));
    const { minScale, maxScale } = DEPTH_CONFIG;
    const scale = minScale + (maxScale - minScale) * depthT;
    ctx.globalAlpha = 0.35 + depthT * 0.55;
    ctx.strokeStyle = "#6B4420"; ctx.lineWidth = (4 + p.rv[0] * 3) * scale;
    ctx.beginPath(); ctx.moveTo(p.x, p.by); ctx.quadraticCurveTo(p.x + p.lean * 0.5, p.by - p.h * 0.5 * scale, p.x + p.lean, p.by - p.h * scale); ctx.stroke();
    const lx = p.x + p.lean, ly = p.by - p.h * scale;
    for (let j = 0; j < 6; j++) {
      const a = (j / 6) * Math.PI * 2 + p.rv[1] * 0.5, len = (25 + p.rv[2] * 28) * scale;
      const light = 28 + p.rv[3] * 12 - (1 - depthT) * 6;
      ctx.strokeStyle = `hsl(${115 + p.rv[4] * 20},50%,${light}%)`; ctx.lineWidth = (2 + p.rv[5] * 2) * scale;
      ctx.beginPath(); ctx.moveTo(lx, ly);
      ctx.quadraticCurveTo(lx + Math.cos(a) * len * 0.6, ly + Math.sin(a) * len * 0.3 - 8 * scale, lx + Math.cos(a) * len, ly + Math.sin(a) * len * 0.5 + 8 * scale);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  // Water with depth-fading waves
  const wy = H * 0.82;
  const g = ctx.createLinearGradient(0, wy, 0, H);
  g.addColorStop(0, "rgba(30,120,200,0.7)"); g.addColorStop(1, "rgba(10,60,120,0.9)");
  ctx.fillStyle = g; ctx.fillRect(0, wy, W, H - wy);
  for (let row = 0; row < 5; row++) {
    const y = wy + row * 10 + 4;
    const rowAlpha = 0.2 + (row / 5) * 0.25; // waves get brighter closer
    ctx.strokeStyle = `rgba(150,220,255,${rowAlpha})`; ctx.lineWidth = 1.5 + row * 0.3;
    ctx.beginPath();
    for (let x = 0; x < W; x += 4) { const yy = y + Math.sin(x * 0.03 + row * 2) * 3.5; x === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); }
    ctx.stroke();
  }
  // Distant ship (at horizon — very faded)
  const sx = W * 0.85, sy = wy - 2;
  ctx.globalAlpha = 0.15; // more faded = more distant feel
  ctx.fillStyle = "#1a1a2a";
  ctx.beginPath(); ctx.moveTo(sx - 18, sy); ctx.lineTo(sx - 14, sy + 6); ctx.lineTo(sx + 14, sy + 6); ctx.lineTo(sx + 18, sy); ctx.quadraticCurveTo(sx, sy - 3, sx - 18, sy); ctx.fill();
  ctx.fillRect(sx - 1, sy - 22, 2, 22);
  ctx.fillStyle = "#2a2a3a"; ctx.beginPath(); ctx.moveTo(sx + 1, sy - 20); ctx.lineTo(sx + 1, sy - 6); ctx.quadraticCurveTo(sx + 11, sy - 13, sx + 1, sy - 20); ctx.fill();
  ctx.globalAlpha = 1;
  // Rocky tidepools (foreground detail)
  for (let i = 0; i < 3; i++) {
    const rx = r() * W, ry = H - 15 - r() * 25;
    ctx.fillStyle = `rgba(80,100,120,${0.2 + r() * 0.15})`;
    ctx.beginPath(); ctx.ellipse(rx, ry, 8 + r() * 12, 4 + r() * 5, r() * 0.3, 0, Math.PI * 2); ctx.fill();
  }
}

function drawDesert(ctx, W, H, GY, r) {
  const groundH = H - GY;
  // Dune layers with depth perspective — closer layers are larger amplitude and more saturated
  for (let l = 0; l < 5; l++) {
    const depthT = l / 4; // 0=far, 1=near
    const by = GY - 15 + l * 25;
    const sat = 50 + depthT * 15;
    const light = 62 - (1 - depthT) * 8 + l * 3;
    ctx.fillStyle = `hsl(38,${sat}%,${light}%)`;
    ctx.beginPath(); ctx.moveTo(0, by + 35);
    const amp = (20 + l * 12) * (0.7 + depthT * 0.3);
    for (let x = 0; x <= W; x += 14) ctx.lineTo(x, by + Math.sin(x * (0.003 + l * 0.001) + l * 1.5) * amp);
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
  }
  // Sand particles — denser in foreground
  for (let i = 0; i < 60; i++) {
    const sy = GY + r() * groundH;
    const depthT = (sy - GY) / groundH;
    ctx.fillStyle = `rgba(180,140,60,${0.15 + depthT * 0.2})`;
    ctx.fillRect(r() * W, sy, 1 + depthT, 1);
  }
  // Cacti with depth sorting — detailed saguaro-style
  const cacti = [];
  for (let i = 0; i < 7; i++) cacti.push({ x: W * 0.08 + r() * W * 0.84, y: GY + 8 + r() * 45, h: 22 + r() * 40, rv: [r(), r(), r(), r(), r(), r()] });
  cacti.sort((a, b) => a.y - b.y);
  for (const c of cacti) {
    const depthT = Math.max(0, Math.min(1, (c.y - GY) / (groundH * 0.5)));
    const { minScale, maxScale } = DEPTH_CONFIG;
    const scale = minScale + (maxScale - minScale) * depthT;
    ctx.globalAlpha = 0.2 + depthT * 0.35;
    const dark = 22 + c.rv[2] * 8;
    const cw = (3.5 + c.rv[3]) * scale;
    // Main body - rounded cactus
    ctx.fillStyle = `hsl(${110 + c.rv[4] * 20},50%,${dark}%)`;
    ctx.beginPath();
    ctx.moveTo(c.x - cw, c.y);
    ctx.lineTo(c.x - cw, c.y - c.h * scale + cw);
    ctx.quadraticCurveTo(c.x - cw, c.y - c.h * scale, c.x, c.y - c.h * scale);
    ctx.quadraticCurveTo(c.x + cw, c.y - c.h * scale, c.x + cw, c.y - c.h * scale + cw);
    ctx.lineTo(c.x + cw, c.y);
    ctx.closePath(); ctx.fill();
    // Vertical ribs
    ctx.strokeStyle = `hsl(${115 + c.rv[4] * 15},40%,${dark - 5}%)`;
    ctx.lineWidth = 0.5 * scale;
    ctx.beginPath(); ctx.moveTo(c.x, c.y - c.h * scale); ctx.lineTo(c.x, c.y); ctx.stroke();
    // Highlight line
    ctx.strokeStyle = `rgba(140,200,80,${0.1 + depthT * 0.1})`;
    ctx.beginPath(); ctx.moveTo(c.x + cw * 0.3, c.y - c.h * scale * 0.9); ctx.lineTo(c.x + cw * 0.3, c.y); ctx.stroke();
    // Right arm
    if (c.rv[0] > 0.25) {
      const armY = c.y - c.h * (0.5 + c.rv[5] * 0.2) * scale;
      const armLen = (10 + c.rv[5] * 8) * scale;
      const armH = (10 + c.rv[5] * 12) * scale;
      ctx.fillStyle = `hsl(${112 + c.rv[4] * 18},48%,${dark + 1}%)`;
      ctx.beginPath();
      ctx.moveTo(c.x + cw, armY); ctx.lineTo(c.x + cw + armLen, armY);
      ctx.quadraticCurveTo(c.x + cw + armLen + 2 * scale, armY, c.x + cw + armLen, armY - armH);
      ctx.lineTo(c.x + cw + armLen - 3 * scale, armY - armH);
      ctx.quadraticCurveTo(c.x + cw + armLen - 3 * scale, armY - 2 * scale, c.x + cw, armY - 3 * scale);
      ctx.closePath(); ctx.fill();
    }
    // Left arm
    if (c.rv[1] > 0.35) {
      const armY = c.y - c.h * (0.35 + c.rv[3] * 0.2) * scale;
      const armLen = (8 + c.rv[3] * 7) * scale;
      const armH = (8 + c.rv[3] * 10) * scale;
      ctx.fillStyle = `hsl(${112 + c.rv[4] * 18},48%,${dark + 1}%)`;
      ctx.beginPath();
      ctx.moveTo(c.x - cw, armY); ctx.lineTo(c.x - cw - armLen, armY);
      ctx.quadraticCurveTo(c.x - cw - armLen - 2 * scale, armY, c.x - cw - armLen, armY - armH);
      ctx.lineTo(c.x - cw - armLen + 3 * scale, armY - armH);
      ctx.quadraticCurveTo(c.x - cw - armLen + 3 * scale, armY - 2 * scale, c.x - cw, armY - 3 * scale);
      ctx.closePath(); ctx.fill();
    }
    // Spines
    ctx.strokeStyle = `rgba(200,200,160,${0.15 + depthT * 0.15})`;
    ctx.lineWidth = 0.5;
    for (let sp = 0; sp < 5; sp++) {
      const spY = c.y - c.h * (0.15 + sp * 0.17) * scale;
      ctx.beginPath(); ctx.moveTo(c.x - cw, spY); ctx.lineTo(c.x - cw - 3 * scale, spY - 2 * scale); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(c.x + cw, spY); ctx.lineTo(c.x + cw + 3 * scale, spY - 2 * scale); ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  // Static tumbleweeds (dried, round bushes)
  for (let i = 0; i < 3; i++) {
    const tx = r() * W, ty = GY + 15 + r() * 35;
    const depthT = (ty - GY) / groundH;
    const ts = (8 + r() * 10) * (0.6 + depthT * 0.6);
    ctx.globalAlpha = 0.15 + depthT * 0.2;
    ctx.strokeStyle = `hsl(35,30%,${35 + r() * 15}%)`;
    ctx.lineWidth = 0.8;
    // Tangled branch lines
    for (let j = 0; j < 8; j++) {
      const a = j / 8 * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(tx, ty);
      ctx.quadraticCurveTo(tx + Math.cos(a) * ts * 0.6, ty + Math.sin(a) * ts * 0.5 + r() * 3, tx + Math.cos(a + 0.3) * ts, ty + Math.sin(a + 0.3) * ts * 0.7);
      ctx.stroke();
    }
    ctx.fillStyle = `rgba(140,120,70,${0.08 + depthT * 0.08})`;
    ctx.beginPath(); ctx.ellipse(tx, ty, ts, ts * 0.7, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Bleached bones with depth
  for (let i = 0; i < 3; i++) {
    const bx = r() * W, by = GY + 20 + r() * (groundH - 40);
    const depthT = (by - GY) / groundH;
    ctx.strokeStyle = `rgba(220,210,190,${0.08 + depthT * 0.12})`;
    ctx.lineWidth = 1.5 + depthT;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + 12, by + 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx + 3, by + 8); ctx.lineTo(bx + 10, by); ctx.stroke();
  }
  // Wagon wheel ruts (foreground detail)
  ctx.strokeStyle = "rgba(140,110,50,0.08)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 2; i++) {
    const ry = H - 30 - i * 12;
    ctx.beginPath();
    for (let x = 0; x < W; x += 6) ctx.lineTo(x, ry + Math.sin(x * 0.02 + i) * 2);
    ctx.stroke();
  }
}

function drawWinter(ctx, W, H, GY, r) {
  const groundH = H - GY;
  // Collect trees, sort by Y for depth
  const trees = [];
  for (let i = 0; i < 10; i++) {
    trees.push({ x: r() * W, by: GY - 5 + r() * 20, h: 50 + r() * 80, rv: [r(), r(), r(), r(), r()] });
  }
  trees.sort((a, b) => a.by - b.by);
  for (const t of trees) {
    const depthT = Math.max(0, Math.min(1, (t.by - GY + 10) / (groundH * 0.4)));
    const { minScale, maxScale } = DEPTH_CONFIG;
    const scale = minScale + (maxScale - minScale) * depthT;
    ctx.globalAlpha = 0.3 + depthT * 0.6;
    // Trunk
    const tw = 3 * scale;
    ctx.fillStyle = "#4a2a12"; ctx.fillRect(t.x - tw, t.by - t.h * 0.22 * scale, tw * 2, t.h * 0.22 * scale);
    // Pine layers
    for (let l = 0; l < 4; l++) {
      const ly = t.by - t.h * 0.22 * scale - l * t.h * 0.17 * scale;
      const w = (24 - l * 4 + t.rv[0] * 8) * scale;
      const light = 16 + l * 5 + t.rv[1] * 5 - (1 - depthT) * 5;
      ctx.fillStyle = `hsl(${145 + t.rv[2] * 20},${30 + depthT * 10}%,${light}%)`;
      ctx.beginPath(); ctx.moveTo(t.x - w, ly); ctx.lineTo(t.x, ly - t.h * 0.18 * scale); ctx.lineTo(t.x + w, ly); ctx.closePath(); ctx.fill();
    }
    // Snow on branches
    ctx.fillStyle = `rgba(230,240,255,${0.35 + depthT * 0.3})`;
    for (let l = 0; l < 3; l++) {
      const ly = t.by - t.h * 0.22 * scale - l * t.h * 0.17 * scale - t.h * 0.15 * scale;
      ctx.beginPath(); ctx.ellipse(t.x, ly, (16 - l * 3) * scale, 4 * scale, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  // Snow drifts with depth — larger drifts in foreground
  for (let i = 0; i < 6; i++) {
    const dy = GY + r() * groundH * 0.45;
    const depthT = (dy - GY) / groundH;
    const dw = (50 + r() * 100) * (0.6 + depthT * 0.8);
    ctx.fillStyle = `rgba(230,240,255,${0.3 + depthT * 0.2})`;
    ctx.beginPath(); ctx.ellipse(r() * W, dy, dw, (12 + r() * 12) * (0.7 + depthT * 0.5), 0, 0, Math.PI * 2); ctx.fill();
  }
  // Ice crystals — denser closer to camera
  for (let i = 0; i < 40; i++) {
    const iy = r() * H;
    const depthT = Math.max(0, (iy - GY) / groundH);
    const size = (1 + r() * 2.5) * (0.5 + depthT * 0.8);
    ctx.fillStyle = `rgba(255,255,255,${0.3 + depthT * 0.3})`;
    ctx.beginPath(); ctx.arc(r() * W, iy, size, 0, Math.PI * 2); ctx.fill();
  }
  // Frozen footprints (foreground detail)
  ctx.fillStyle = "rgba(180,200,220,0.08)";
  for (let i = 0; i < 6; i++) {
    const fx = W * 0.3 + r() * W * 0.4, fy = H - 20 - r() * 40;
    ctx.beginPath(); ctx.ellipse(fx, fy, 3, 5, r() * 0.3, 0, Math.PI * 2); ctx.fill();
  }
}

function drawCity(ctx, W, H, GY, r) {
  const groundH = H - GY;
  // Cobblestone ground with depth — smaller stones at horizon
  ctx.fillStyle = "#3a3428"; ctx.fillRect(0, GY + 5, W, groundH - 5);
  for (let i = 0; i < 100; i++) {
    const sy = GY + 10 + r() * (groundH - 15);
    const depthT = (sy - GY) / groundH;
    const sz = (6 + r() * 8) * (0.5 + depthT * 0.7);
    ctx.fillStyle = `rgba(60,55,45,${0.25 + depthT * 0.2})`;
    ctx.fillRect(r() * W, sy, sz * 1.3, sz);
  }
  // Houses — detailed buildings with roofs, chimneys, doors, shutters
  const houses = [];
  const count = 8 + Math.floor(r() * 4);
  for (let i = 0; i < count; i++) {
    houses.push({ x: (i / count) * W + (r() - 0.5) * 25, w: 38 + r() * 55, h: 80 + r() * 140, layer: r(),
      rv: [r(), r(), r(), r(), r(), r(), r(), r()] });
  }
  houses.sort((a, b) => a.layer - b.layer);
  for (const b of houses) {
    const depthT = b.layer;
    const scale = 0.75 + depthT * 0.35;
    const bw = b.w * scale, bh = b.h * scale, by = GY - bh + 10;
    ctx.globalAlpha = 0.5 + depthT * 0.5;
    // Wall with timber frame look
    const wallHue = 25 + b.rv[1] * 20;
    const wallLight = 28 + b.rv[0] * 18 - (1 - depthT) * 8;
    ctx.fillStyle = `hsl(${wallHue},${18 + depthT * 12}%,${wallLight}%)`;
    ctx.fillRect(b.x, by, bw, bh);
    // Timber frame beams
    ctx.strokeStyle = `rgba(42,24,10,${0.35 + depthT * 0.4})`;
    ctx.lineWidth = (2 + depthT) * scale;
    ctx.strokeRect(b.x, by, bw, bh);
    // Horizontal beam at each floor
    const floors = Math.max(1, Math.floor(bh / 45));
    for (let fl = 1; fl < floors; fl++) {
      const flY = by + fl * (bh / floors);
      ctx.beginPath(); ctx.moveTo(b.x, flY); ctx.lineTo(b.x + bw, flY); ctx.stroke();
    }
    // Cross-beam decoration on upper section
    if (b.rv[4] > 0.4 && bw > 30) {
      ctx.beginPath(); ctx.moveTo(b.x, by); ctx.lineTo(b.x + bw, by + bh * 0.33); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(b.x + bw, by); ctx.lineTo(b.x, by + bh * 0.33); ctx.stroke();
    }
    // Pitched roof with overhang
    const roofH = (22 + b.rv[3] * 18) * scale;
    const overhang = 8 * scale;
    const roofHue = b.rv[2] > 0.5 ? 8 + b.rv[2] * 12 : 20 + b.rv[2] * 15;
    ctx.fillStyle = `hsl(${roofHue},${35 + depthT * 15}%,${22 + b.rv[3] * 10}%)`;
    ctx.beginPath();
    ctx.moveTo(b.x - overhang, by);
    ctx.lineTo(b.x + bw / 2, by - roofH);
    ctx.lineTo(b.x + bw + overhang, by);
    ctx.closePath(); ctx.fill();
    // Roof tiles - horizontal lines
    ctx.strokeStyle = `rgba(30,15,5,${0.2 + depthT * 0.2})`;
    ctx.lineWidth = 0.5 * scale;
    for (let tl = 1; tl < 4; tl++) {
      const tY = by - roofH * (tl / 4);
      const tW = bw * (tl / 4) + overhang * (tl / 4);
      ctx.beginPath(); ctx.moveTo(b.x + bw / 2 - tW / 2, tY); ctx.lineTo(b.x + bw / 2 + tW / 2, tY); ctx.stroke();
    }
    // Chimney
    if (b.rv[5] > 0.35) {
      const chimX = b.x + bw * (0.2 + b.rv[6] * 0.5);
      const chimW = 8 * scale, chimH = 18 * scale;
      const chimTop = by - roofH * 0.5;
      ctx.fillStyle = `hsl(5,30%,${30 + b.rv[7] * 10}%)`;
      ctx.fillRect(chimX - chimW / 2, chimTop - chimH, chimW, chimH);
      // Chimney cap
      ctx.fillRect(chimX - chimW * 0.7, chimTop - chimH, chimW * 1.4, 3 * scale);
    }
    // Windows with shutters
    const wRows = Math.floor(bh / 35), wCols = Math.max(1, Math.floor(bw / 26));
    for (let ro = 0; ro < wRows; ro++) for (let co = 0; co < wCols; co++) {
      if (r() > 0.25) {
        const winW = 10 * scale, winH = 14 * scale;
        const wx = b.x + 8 * scale + co * 24 * scale;
        const wy = by + 8 * scale + ro * 33 * scale;
        const lit = r() > 0.45;
        const winAlpha = (0.35 + r() * 0.35) * (0.5 + depthT * 0.5);
        // Window frame
        ctx.fillStyle = `rgba(35,25,15,${0.5 + depthT * 0.3})`;
        ctx.fillRect(wx - 1, wy - 1, winW + 2, winH + 2);
        // Window glass
        ctx.fillStyle = lit ? `rgba(255,180,60,${winAlpha})` : `rgba(50,60,80,${0.3 + depthT * 0.3})`;
        ctx.fillRect(wx, wy, winW, winH);
        // Window cross divider
        ctx.strokeStyle = `rgba(40,30,15,${0.5 + depthT * 0.3})`;
        ctx.lineWidth = 0.8 * scale;
        ctx.beginPath(); ctx.moveTo(wx + winW / 2, wy); ctx.lineTo(wx + winW / 2, wy + winH); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(wx, wy + winH / 2); ctx.lineTo(wx + winW, wy + winH / 2); ctx.stroke();
        // Shutters (open)
        if (r() > 0.4) {
          const shutW = 4 * scale;
          ctx.fillStyle = `hsl(${wallHue + 10},${20 + depthT * 8}%,${wallLight - 8}%)`;
          ctx.fillRect(wx - shutW - 1, wy, shutW, winH);
          ctx.fillRect(wx + winW + 1, wy, shutW, winH);
        }
        // Light glow from window
        if (lit && depthT > 0.3) {
          const wg = ctx.createRadialGradient(wx + winW / 2, wy + winH / 2, 2, wx + winW / 2, wy + winH, winW * 2);
          wg.addColorStop(0, `rgba(255,160,40,${0.08 * depthT})`); wg.addColorStop(1, "transparent");
          ctx.fillStyle = wg; ctx.fillRect(wx - winW, wy - winH, winW * 4, winH * 4);
        }
      }
    }
    // Door on ground floor
    if (depthT > 0.25) {
      const doorW = 10 * scale, doorH = 20 * scale;
      const doorX = b.x + bw * (0.35 + b.rv[4] * 0.3) - doorW / 2;
      const doorY = by + bh - doorH;
      ctx.fillStyle = `hsl(20,${30 + depthT * 10}%,${18 + b.rv[7] * 8}%)`;
      ctx.fillRect(doorX, doorY, doorW, doorH);
      // Door frame
      ctx.strokeStyle = `rgba(30,18,8,${0.4 + depthT * 0.3})`;
      ctx.lineWidth = 1.5 * scale;
      ctx.strokeRect(doorX, doorY, doorW, doorH);
      // Arch above door
      ctx.beginPath(); ctx.arc(doorX + doorW / 2, doorY, doorW / 2, Math.PI, 0); ctx.stroke();
      // Door knob
      ctx.fillStyle = `rgba(180,160,60,${0.4 + depthT * 0.3})`;
      ctx.beginPath(); ctx.arc(doorX + doorW * 0.75, doorY + doorH * 0.55, 1.5 * scale, 0, Math.PI * 2); ctx.fill();
    }
    // Flower box under some windows
    if (b.rv[6] > 0.55 && wCols > 0) {
      const fbX = b.x + 8 * scale, fbY = by + 8 * scale + 33 * scale - 2;
      const fbW = 12 * scale;
      ctx.fillStyle = `rgba(80,50,25,${0.3 + depthT * 0.3})`;
      ctx.fillRect(fbX, fbY, fbW, 4 * scale);
      ctx.fillStyle = `rgba(200,60,80,${0.3 + depthT * 0.3})`;
      for (let f = 0; f < 3; f++) ctx.fillRect(fbX + 2 * scale + f * 3 * scale, fbY - 3 * scale, 2 * scale, 3 * scale);
    }
  }
  ctx.globalAlpha = 1;
  // Street lamps with glow
  ctx.textAlign = "center";
  for (let i = 0; i < 4; i++) {
    const lx = 80 + i * (W - 160) / 3;
    // Lamp post
    ctx.strokeStyle = "#3a2a18"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(lx, GY + 5); ctx.lineTo(lx, GY - 22); ctx.stroke();
    // Lamp arm
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(lx, GY - 20); ctx.quadraticCurveTo(lx + 8, GY - 24, lx + 10, GY - 18); ctx.stroke();
    // Lantern housing
    ctx.fillStyle = "#2a1a0a";
    ctx.fillRect(lx + 6, GY - 22, 8, 10);
    // Warm glow
    const g = ctx.createRadialGradient(lx + 10, GY - 17, 2, lx + 10, GY - 10, 32);
    g.addColorStop(0, "rgba(255,160,40,0.40)"); g.addColorStop(1, "transparent");
    ctx.fillStyle = g; ctx.fillRect(lx - 22, GY - 42, 64, 54);
    const fireImg = getIconImage("fire", 11); if (fireImg) ctx.drawImage(fireImg, lx + 5, GY - 20, 11, 11);
  }
  ctx.textAlign = "start";
  // Cobblestone path detail
  ctx.strokeStyle = "rgba(50,40,30,0.06)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    const py = H - 10 - i * 15;
    ctx.beginPath();
    for (let x = 0; x < W; x += 12) { ctx.moveTo(x, py); ctx.lineTo(x + 6, py); }
    ctx.stroke();
  }
  // Puddles in foreground (street detail)
  for (let i = 0; i < 3; i++) {
    const px = r() * W, py = H - 25 - r() * 30;
    ctx.fillStyle = "rgba(60,80,100,0.08)";
    ctx.beginPath(); ctx.ellipse(px, py, 15 + r() * 20, 4 + r() * 3, 0, 0, Math.PI * 2); ctx.fill();
  }
}

function drawVolcano(ctx, W, H, GY, r) {
  const groundH = H - GY;
  // Lava streams with depth — brighter closer to camera
  for (let i = 0; i < 5; i++) {
    const ly = GY + 12 + r() * (groundH - 30);
    const depthT = (ly - GY) / groundH;
    const red = 180 + depthT * 75 + r() * 30;
    const green = 40 + r() * 40 + depthT * 15;
    ctx.strokeStyle = `rgba(${red},${green},10,${0.4 + depthT * 0.3})`;
    ctx.lineWidth = (4 + r() * 8) * (0.6 + depthT * 0.6); ctx.beginPath(); let x = 0; ctx.moveTo(x, ly);
    while (x < W) { x += 20 + r() * 30; ctx.lineTo(x, ly + (r() - 0.5) * 20); } ctx.stroke();
    // Glow around lava
    ctx.strokeStyle = `rgba(255,100,20,${0.06 + depthT * 0.08})`; ctx.lineWidth = (16 + r() * 10) * (0.5 + depthT * 0.5); ctx.stroke();
  }
  // Sparks
  for (let i = 0; i < 15; i++) {
    const sy = r() * H;
    const depthT = Math.max(0, (sy - GY) / groundH);
    const size = (1 + r() * 2.5) * (0.5 + depthT * 0.8);
    ctx.fillStyle = `rgba(255,120,20,${0.3 + depthT * 0.3})`;
    ctx.beginPath(); ctx.arc(r() * W, sy, size, 0, Math.PI * 2); ctx.fill();
  }
  // Rocks sorted by depth
  const rocks = [];
  for (let i = 0; i < 7; i++) rocks.push({ x: r() * W, y: GY + 10 + r() * (groundH - 30), s: 5 + r() * 10, rv: [r(), r(), r(), r()] });
  rocks.sort((a, b) => a.y - b.y);
  for (const rk of rocks) {
    const depthT = (rk.y - GY) / groundH;
    const { minScale, maxScale } = DEPTH_CONFIG;
    const scale = minScale + (maxScale - minScale) * depthT;
    const rs = rk.s * scale;
    ctx.globalAlpha = 0.2 + depthT * 0.35;
    ctx.fillStyle = `rgb(${30 + rk.rv[0] * 20},${15 + rk.rv[1] * 10},${15 + rk.rv[1] * 10})`;
    ctx.beginPath();
    ctx.moveTo(rk.x, rk.y - rs); ctx.lineTo(rk.x + rs * 0.8, rk.y - rs * 0.2);
    ctx.lineTo(rk.x + rs * 0.5, rk.y + rs * 0.3); ctx.lineTo(rk.x - rs * 0.6, rk.y + rs * 0.2);
    ctx.lineTo(rk.x - rs * 0.7, rk.y - rs * 0.4); ctx.closePath(); ctx.fill();
    if (rk.rv[2] > 0.4) {
      ctx.fillStyle = `rgba(255,${80 + rk.rv[3] * 60},20,${(0.1 + depthT * 0.12)})`;
      ctx.beginPath(); ctx.arc(rk.x, rk.y, rs * 0.4, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  // Volcano mountain in background
  const vx = W * (0.35 + r() * 0.3);
  ctx.fillStyle = "rgba(50,25,15,0.35)";
  ctx.beginPath();
  ctx.moveTo(vx - 120, GY + 5);
  ctx.lineTo(vx - 20, GY * 0.15);
  ctx.lineTo(vx - 8, GY * 0.18);  // crater left
  ctx.lineTo(vx + 8, GY * 0.18);  // crater right
  ctx.lineTo(vx + 20, GY * 0.15);
  ctx.lineTo(vx + 120, GY + 5);
  ctx.closePath(); ctx.fill();
  // Lava glow in crater
  const craterG = ctx.createRadialGradient(vx, GY * 0.17, 4, vx, GY * 0.17, 30);
  craterG.addColorStop(0, "rgba(255,100,20,0.35)"); craterG.addColorStop(0.5, "rgba(255,60,10,0.15)"); craterG.addColorStop(1, "transparent");
  ctx.fillStyle = craterG; ctx.fillRect(vx - 30, GY * 0.05, 60, GY * 0.25);
  // Lava streams down the mountain
  ctx.strokeStyle = "rgba(255,80,10,0.2)"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(vx - 5, GY * 0.18);
  ctx.quadraticCurveTo(vx - 30, GY * 0.5, vx - 50, GY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(vx + 5, GY * 0.18);
  ctx.quadraticCurveTo(vx + 25, GY * 0.6, vx + 40, GY); ctx.stroke();
  // Glow around streams
  ctx.strokeStyle = "rgba(255,60,10,0.06)"; ctx.lineWidth = 12;
  ctx.beginPath(); ctx.moveTo(vx - 5, GY * 0.18);
  ctx.quadraticCurveTo(vx - 30, GY * 0.5, vx - 50, GY); ctx.stroke();
  // Smoke wisps in sky — larger, more dramatic
  for (let i = 0; i < 6; i++) {
    const sx = vx + (r() - 0.5) * 60, sy = GY * 0.08 + r() * GY * 0.2;
    const smokeR = 25 + r() * 35;
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, smokeR);
    g.addColorStop(0, `rgba(80,60,50,${0.06 + r() * 0.05})`); g.addColorStop(1, "transparent");
    ctx.fillStyle = g; ctx.fillRect(sx - smokeR, sy - smokeR, smokeR * 2, smokeR * 2);
  }
  // Additional smoke wisps across sky
  for (let i = 0; i < 3; i++) {
    const sx = r() * W, sy = GY * 0.3 + r() * GY * 0.4;
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 30 + r() * 25);
    g.addColorStop(0, `rgba(60,50,40,${0.04 + r() * 0.04})`); g.addColorStop(1, "transparent");
    ctx.fillStyle = g; ctx.fillRect(sx - 50, sy - 50, 100, 100);
  }
  // Cracked ground in foreground — glowing cracks
  ctx.strokeStyle = "rgba(180,80,20,0.12)"; ctx.lineWidth = 1.5;
  for (let i = 0; i < 7; i++) {
    const cx = r() * W, cy = H - 20 - r() * 30;
    ctx.beginPath(); ctx.moveTo(cx, cy);
    for (let j = 0; j < 3; j++) ctx.lineTo(cx + (r() - 0.5) * 30, cy + (r() - 0.5) * 15);
    ctx.stroke();
    // Glow inside cracks
    ctx.strokeStyle = "rgba(255,60,10,0.05)"; ctx.lineWidth = 4;
    ctx.stroke();
    ctx.strokeStyle = "rgba(180,80,20,0.12)"; ctx.lineWidth = 1.5;
  }
}

function drawSummer(ctx, W, H, GY, r) {
  const groundH = H - GY;
  // Wheat fields with depth — rows get denser and larger toward camera
  for (let row = 0; row < 4; row++) {
    const by = GY + 10 + row * 28;
    const depthT = row / 3;
    const { minScale, maxScale } = DEPTH_CONFIG;
    const scale = minScale + (maxScale - minScale) * depthT;
    const stalks = 30 + Math.floor(depthT * 20);
    for (let i = 0; i < stalks; i++) {
      const x = r() * W, h = (25 + r() * 35) * scale;
      ctx.globalAlpha = 0.35 + depthT * 0.5;
      const light = 45 + r() * 15 - (1 - depthT) * 6;
      ctx.strokeStyle = `hsl(${42 + r() * 15},${45 + depthT * 15}%,${light}%)`;
      ctx.lineWidth = (1.2 + r()) * scale;
      ctx.beginPath(); ctx.moveTo(x, by); ctx.lineTo(x + (r() - 0.5) * 6, by - h); ctx.stroke();
      ctx.fillStyle = `hsl(${40 + r() * 10},60%,${55 + r() * 15}%)`;
      ctx.beginPath(); ctx.ellipse(x + (r() - 0.5) * 6, by - h - 3 * scale, 2 * scale, 5 * scale, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  // Flowers with depth — bigger in foreground
  for (let i = 0; i < 15; i++) {
    const fx = r() * W, fy = GY + 5 + r() * (groundH - 15);
    const depthT = (fy - GY) / groundH;
    const size = (2 + r() * 2) * (0.6 + depthT * 0.7);
    const hue = [0, 45, 280, 320, 60][Math.floor(r() * 5)];
    ctx.fillStyle = `hsl(${hue},70%,60%)`;
    ctx.beginPath(); ctx.arc(fx, fy, size, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "hsl(50,80%,65%)"; ctx.beginPath(); ctx.arc(fx, fy, size * 0.4, 0, Math.PI * 2); ctx.fill();
  }
  // Butterflies (foreground detail)
  for (let i = 0; i < 4; i++) {
    const bx = r() * W, by = GY + 10 + r() * 40;
    ctx.fillStyle = `hsla(${[320, 45, 280, 0][i]},60%,60%,0.15)`;
    ctx.beginPath(); ctx.ellipse(bx - 3, by, 3, 2, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(bx + 3, by, 3, 2, 0.3, 0, Math.PI * 2); ctx.fill();
  }
  // Small pond with lily pads
  const pondX = W * (0.2 + r() * 0.3), pondY = H * 0.75;
  const pondG = ctx.createRadialGradient(pondX, pondY, 5, pondX, pondY, 35);
  pondG.addColorStop(0, "rgba(40,120,160,0.2)"); pondG.addColorStop(0.7, "rgba(30,100,140,0.12)"); pondG.addColorStop(1, "transparent");
  ctx.fillStyle = pondG;
  ctx.beginPath(); ctx.ellipse(pondX, pondY, 35, 12, 0, 0, Math.PI * 2); ctx.fill();
  // Lily pads on pond
  for (let i = 0; i < 3; i++) {
    const lx = pondX + (r() - 0.5) * 40, ly = pondY + (r() - 0.5) * 6;
    ctx.fillStyle = `rgba(60,140,50,${0.15 + r() * 0.1})`;
    ctx.beginPath(); ctx.ellipse(lx, ly, 5 + r() * 3, 3, r() * 0.3, 0, Math.PI * 2); ctx.fill();
  }
  // Sun glow
  const sg = ctx.createRadialGradient(W * 0.85, GY * 0.15, 10, W * 0.85, GY * 0.15, 120);
  sg.addColorStop(0, "rgba(255,240,140,0.25)"); sg.addColorStop(1, "transparent");
  ctx.fillStyle = sg; ctx.fillRect(W * 0.65, 0, W * 0.35, GY * 0.5);
}

function drawAutumn(ctx, W, H, GY, r) {
  const groundH = H - GY;
  // Collect trees with depth position
  const trees = [];
  for (let i = 0; i < 12; i++) {
    trees.push({ x: r() * W, by: GY - 5 + r() * 20, h: 60 + r() * 90, rv: [r(), r(), r(), r(), r(), r(), r(), r()] });
  }
  trees.sort((a, b) => a.by - b.by);
  for (const t of trees) {
    const depthT = Math.max(0, Math.min(1, (t.by - GY + 10) / (groundH * 0.4)));
    const { minScale, maxScale } = DEPTH_CONFIG;
    const scale = minScale + (maxScale - minScale) * depthT;
    ctx.globalAlpha = 0.3 + depthT * 0.6;
    const tw = (5 + t.rv[0] * 5) * scale;
    ctx.fillStyle = `hsl(25,${25 + depthT * 10}%,${20 + t.rv[1] * 10 - (1 - depthT) * 5}%)`;
    ctx.fillRect(t.x - tw / 2, t.by - t.h * 0.3 * scale, tw, t.h * 0.3 * scale);
    for (let c = 0; c < 3; c++) {
      const hue = [10, 25, 35, 45, 0][Math.floor(t.rv[2 + c] * 5)];
      const cx = t.x + (t.rv[5] - 0.5) * 18 * scale, cy = t.by - t.h * 0.3 * scale - t.rv[6] * t.h * 0.25 * scale;
      const rw = (18 + t.rv[7] * 22) * scale, rh = (14 + t.rv[2] * 18) * scale;
      const sat = 45 + depthT * 15 + t.rv[3] * 20;
      ctx.fillStyle = `hsl(${hue},${sat}%,${30 + t.rv[4] * 20 - (1 - depthT) * 6}%)`;
      ctx.beginPath(); ctx.ellipse(cx, cy, rw, rh, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  // Fallen leaves — bigger/more opaque in foreground
  for (let i = 0; i < 35; i++) {
    const ly = GY + 3 + r() * groundH * 0.45;
    const depthT = (ly - GY) / groundH;
    const size = (3 + r() * 5) * (0.5 + depthT * 0.8);
    ctx.fillStyle = `rgba(160,80,20,${0.15 + depthT * 0.25})`;
    ctx.beginPath(); ctx.ellipse(r() * W, ly, size, size * 0.5, r() * Math.PI, 0, Math.PI * 2); ctx.fill();
  }
  // Mushroom cluster (foreground detail)
  for (let i = 0; i < 3; i++) {
    const mx = r() * W, my = H - 15 - r() * 25;
    ctx.fillStyle = "rgba(180,120,60,0.12)";
    ctx.fillRect(mx - 1, my - 6, 2, 6);
    ctx.fillStyle = "rgba(160,60,30,0.15)";
    ctx.beginPath(); ctx.ellipse(mx, my - 6, 4, 2.5, 0, Math.PI, Math.PI * 2); ctx.fill();
  }
}

function drawSpring(ctx, W, H, GY, r) {
  const groundH = H - GY;
  // Trees with depth-sorted blossoms
  const trees = [];
  for (let i = 0; i < 10; i++) {
    trees.push({ x: r() * W, by: GY - 5 + r() * 18, h: 55 + r() * 80, rv: [r(), r(), r(), r(), r(), r(), r(), r()] });
  }
  trees.sort((a, b) => a.by - b.by);
  for (const t of trees) {
    const depthT = Math.max(0, Math.min(1, (t.by - GY + 10) / (groundH * 0.35)));
    const { minScale, maxScale } = DEPTH_CONFIG;
    const scale = minScale + (maxScale - minScale) * depthT;
    ctx.globalAlpha = 0.35 + depthT * 0.55;
    const tw = 3 * scale;
    ctx.fillStyle = `hsl(25,30%,${22 + t.rv[0] * 10 - (1 - depthT) * 4}%)`; ctx.fillRect(t.x - tw, t.by - t.h * 0.28 * scale, tw * 2, t.h * 0.28 * scale);
    for (let c = 0; c < 3; c++) {
      const cx = t.x + (t.rv[1 + c] - 0.5) * 14 * scale, cy = t.by - t.h * 0.28 * scale - t.rv[4] * t.h * 0.2 * scale;
      const rw = (16 + t.rv[5] * 18) * scale, rh = (12 + t.rv[6] * 14) * scale;
      ctx.fillStyle = `hsl(${110 + t.rv[1 + c] * 30},${45 + depthT * 15}%,${35 + t.rv[7] * 20 - (1 - depthT) * 5}%)`;
      ctx.beginPath(); ctx.ellipse(cx, cy, rw, rh, 0, 0, Math.PI * 2); ctx.fill();
    }
    // Blossoms — more visible when closer
    for (let b = 0; b < 5; b++) {
      const bx = t.x + (r() - 0.5) * 30 * scale, bby = t.by - t.h * 0.28 * scale - r() * t.h * 0.35 * scale;
      const blossomAlpha = (0.4 + depthT * 0.4 + r() * 0.2);
      ctx.fillStyle = r() > 0.5 ? `rgba(255,180,200,${blossomAlpha})` : `rgba(255,255,255,${blossomAlpha * 0.8})`;
      ctx.beginPath(); ctx.arc(bx, bby, (1.5 + r() * 2) * scale, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  // Ground flowers with depth
  for (let i = 0; i < 25; i++) {
    const fx = r() * W, fy = GY + 4 + r() * (groundH - 10);
    const depthT = (fy - GY) / groundH;
    const size = (2 + r() * 2) * (0.5 + depthT * 0.7);
    const hue = [320, 350, 280, 45, 0][Math.floor(r() * 5)];
    ctx.fillStyle = `hsl(${hue},70%,65%)`;
    ctx.beginPath(); ctx.arc(fx, fy, size, 0, Math.PI * 2); ctx.fill();
  }
  // Grass tufts — taller in foreground
  for (let i = 0; i < 30; i++) {
    const gx = r() * W, gy = GY + 2 + r() * 20;
    const depthT = Math.max(0, (gy - GY) / (groundH * 0.3));
    ctx.strokeStyle = `rgba(40,140,30,${0.2 + depthT * 0.25})`; ctx.lineWidth = 1 + depthT;
    const gh = (8 + r() * 8) * (0.6 + depthT * 0.6);
    for (let s = 0; s < 3; s++) {
      ctx.beginPath(); ctx.moveTo(gx + s * 3, gy); ctx.lineTo(gx + s * 3 + (r() - 0.5) * 5, gy - gh); ctx.stroke();
    }
  }
  // Bee near flowers (foreground detail)
  for (let i = 0; i < 2; i++) {
    const bx = r() * W, by = GY + 10 + r() * 30;
    ctx.fillStyle = "rgba(200,180,40,0.15)";
    ctx.beginPath(); ctx.ellipse(bx, by, 2.5, 1.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(40,30,10,0.1)"; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(bx, by - 1.5); ctx.lineTo(bx - 2, by - 3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx, by - 1.5); ctx.lineTo(bx + 2, by - 3); ctx.stroke();
  }
}

function drawMushroom(ctx, W, H, GY, r) {
  const groundH = H - GY;
  // Mushrooms sorted by depth
  const shrooms = [];
  for (let i = 0; i < 14; i++) {
    shrooms.push({ x: r() * W, y: GY + r() * groundH * 0.65, h: 18 + r() * 40, w: 10 + r() * 20, hue: [320, 280, 20, 0, 50][Math.floor(r() * 5)], rv: [r(), r(), r()] });
  }
  shrooms.sort((a, b) => a.y - b.y);
  for (const m of shrooms) {
    const depthT = Math.max(0, Math.min(1, (m.y - GY) / (groundH * 0.65)));
    const { minScale, maxScale } = DEPTH_CONFIG;
    const scale = minScale + (maxScale - minScale) * depthT;
    ctx.globalAlpha = 0.3 + depthT * 0.6;
    const sw = 2.5 * scale, sh = m.h * 0.38 * scale;
    const capW = m.w * scale, capH = m.w * 0.45 * scale;
    // Stem
    ctx.fillStyle = `hsl(40,${25 + depthT * 10}%,${70 + m.rv[0] * 10}%)`;
    ctx.fillRect(m.x - sw, m.y - sh, sw * 2, sh);
    // Cap
    const light = 32 + m.rv[1] * 18 - (1 - depthT) * 6;
    ctx.fillStyle = `hsl(${m.hue},${50 + depthT * 15}%,${light}%)`;
    ctx.beginPath(); ctx.ellipse(m.x, m.y - sh, capW, capH, 0, Math.PI, Math.PI * 2); ctx.fill();
    // Spots
    ctx.fillStyle = `rgba(255,255,255,${0.3 + depthT * 0.25})`;
    for (let d = 0; d < 3; d++) {
      const spotSize = (1 + m.rv[2] * 1.5) * scale;
      ctx.beginPath(); ctx.arc(m.x + (r() - 0.5) * capW, m.y - sh - r() * capH * 0.6, spotSize, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  // Bioluminescent glows with depth — larger/brighter closer
  for (let i = 0; i < 18; i++) {
    const sx = r() * W, sy = r() * H;
    const depthT = Math.max(0, (sy - GY) / groundH);
    const size = (5 + r() * 4) * (0.5 + depthT * 0.7);
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, size);
    g.addColorStop(0, `hsla(${280 + r() * 60},80%,60%,${0.15 + depthT * 0.15})`); g.addColorStop(1, "transparent");
    ctx.fillStyle = g; ctx.fillRect(sx - size, sy - size, size * 2, size * 2);
  }
  // Crystal formations (cave detail)
  for (let i = 0; i < 4; i++) {
    const cx = r() * W, cy = GY + 5 + r() * 15;
    const ch = 8 + r() * 15;
    ctx.globalAlpha = 0.1 + r() * 0.1;
    ctx.fillStyle = `hsl(${270 + r() * 40},50%,50%)`;
    ctx.beginPath(); ctx.moveTo(cx - 2, cy); ctx.lineTo(cx, cy - ch); ctx.lineTo(cx + 2, cy); ctx.closePath(); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Spider webs in corners with dew drops
  for (let i = 0; i < 2; i++) {
    const webX = i === 0 ? W * 0.08 + r() * 30 : W * 0.85 + r() * 30;
    const webY = GY + 3 + r() * 10;
    const webR = 18 + r() * 12;
    ctx.strokeStyle = "rgba(200,200,210,0.06)";
    ctx.lineWidth = 0.4;
    // Radial web threads
    for (let s = 0; s < 6; s++) {
      const a = s / 6 * Math.PI + r() * 0.2;
      ctx.beginPath(); ctx.moveTo(webX, webY);
      ctx.lineTo(webX + Math.cos(a) * webR, webY + Math.sin(a) * webR * 0.6);
      ctx.stroke();
    }
    // Spiral rings
    for (let ring = 1; ring <= 3; ring++) {
      const rr = webR * ring / 3;
      ctx.beginPath();
      for (let a = 0; a <= Math.PI; a += 0.3) {
        const x = webX + Math.cos(a) * rr;
        const y = webY + Math.sin(a) * rr * 0.6;
        a === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // Dew drops
    ctx.fillStyle = "rgba(180,200,240,0.08)";
    for (let d = 0; d < 3; d++) {
      const da = r() * Math.PI;
      const dr = webR * (0.3 + r() * 0.5);
      ctx.beginPath(); ctx.arc(webX + Math.cos(da) * dr, webY + Math.sin(da) * dr * 0.6, 1, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function drawSwamp(ctx, W, H, GY, r) {
  const groundH = H - GY;
  // Murky water pools with depth — larger/darker closer
  for (let i = 0; i < 8; i++) {
    const py = GY + 10 + r() * (groundH - 20);
    const depthT = (py - GY) / groundH;
    const pw = (40 + r() * 80) * (0.5 + depthT * 0.8);
    const ph = (10 + r() * 15) * (0.5 + depthT * 0.6);
    ctx.fillStyle = `rgba(30,60,20,${0.2 + depthT * 0.25})`;
    ctx.beginPath(); ctx.ellipse(r() * W, py, pw, ph, r() * 0.3, 0, Math.PI * 2); ctx.fill();
  }
  // Dead trees sorted by depth
  const trees = [];
  for (let i = 0; i < 6; i++) {
    trees.push({ x: r() * W, by: GY + r() * 15, h: 40 + r() * 55, rv: [r(), r(), r(), r(), r()] });
  }
  trees.sort((a, b) => a.by - b.by);
  for (const t of trees) {
    const depthT = Math.max(0, Math.min(1, (t.by - GY) / (groundH * 0.3)));
    const { minScale, maxScale } = DEPTH_CONFIG;
    const scale = minScale + (maxScale - minScale) * depthT;
    ctx.globalAlpha = 0.3 + depthT * 0.5;
    ctx.strokeStyle = `hsl(30,20%,${15 + t.rv[0] * 10 - (1 - depthT) * 3}%)`; ctx.lineWidth = (3 + t.rv[1] * 4) * scale;
    ctx.beginPath(); ctx.moveTo(t.x, t.by); ctx.lineTo(t.x + (t.rv[2] - 0.5) * 15, t.by - t.h * scale); ctx.stroke();
    // Branches
    for (let b = 0; b < 3; b++) {
      const bh = (t.h * 0.3 + t.rv[3 + b % 2] * t.h * 0.5) * scale;
      ctx.lineWidth = (1 + t.rv[4] * 2) * scale;
      ctx.beginPath(); ctx.moveTo(t.x + (r() - 0.5) * 8, t.by - bh); ctx.lineTo(t.x + (r() - 0.5) * 30, t.by - bh - (10 + r() * 15) * scale); ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  // Swamp mist — denser near horizon
  for (let i = 0; i < 6; i++) {
    const fx = r() * W, fy = GY - 10 + r() * 35;
    const depthT = Math.max(0, (fy - GY + 15) / (groundH * 0.3));
    const size = (40 + r() * 50) * (1.2 - depthT * 0.4);
    const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, size);
    g.addColorStop(0, `rgba(60,80,40,${0.08 + (1 - depthT) * 0.06})`); g.addColorStop(1, "transparent");
    ctx.fillStyle = g; ctx.fillRect(fx - size, fy - size * 0.4, size * 2, size * 0.8);
  }
  // Exposed tree roots wading into water
  for (let i = 0; i < 4; i++) {
    const rx = r() * W, ry = GY + 5 + r() * 20;
    const depthT = (ry - GY) / (groundH * 0.3);
    const scale = 0.6 + depthT * 0.5;
    ctx.strokeStyle = `rgba(50,35,18,${0.15 + depthT * 0.12})`;
    ctx.lineWidth = 2 * scale;
    // Root arching out of ground
    for (let j = 0; j < 3; j++) {
      const angle = -0.4 + j * 0.4 + r() * 0.3;
      const len = (15 + r() * 15) * scale;
      ctx.beginPath(); ctx.moveTo(rx, ry);
      ctx.quadraticCurveTo(rx + Math.cos(angle) * len * 0.5, ry - 6 * scale, rx + Math.cos(angle) * len, ry + 3);
      ctx.stroke();
    }
  }
  // Lily pads (foreground detail)
  for (let i = 0; i < 5; i++) {
    const lx = r() * W, ly = H - 20 - r() * 40;
    ctx.fillStyle = `rgba(40,100,30,${0.1 + r() * 0.08})`;
    ctx.beginPath(); ctx.ellipse(lx, ly, 6 + r() * 5, 3 + r() * 2, r() * 0.5, 0, Math.PI * 2); ctx.fill();
    // Lily flower on some
    if (r() > 0.6) {
      ctx.fillStyle = `rgba(200,180,200,${0.12 + r() * 0.08})`;
      ctx.beginPath(); ctx.arc(lx + 2, ly - 2, 2, 0, Math.PI * 2); ctx.fill();
    }
  }
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

// ─── BLUE LAGOON (Błękitna Laguna) ───
// Tropical paradise with turquoise water, palm trees, mountains, waterfall, sandy beach
function drawBlueLagoon(ctx, W, H, GY, r) {
  // --- Tropical sky gradient ---
  const skyGrad = ctx.createLinearGradient(0, 0, 0, GY);
  skyGrad.addColorStop(0, "#041830");
  skyGrad.addColorStop(0.2, "#0a4a80");
  skyGrad.addColorStop(0.5, "#1580c0");
  skyGrad.addColorStop(0.75, "#30a8e0");
  skyGrad.addColorStop(1, "#60d0f0");
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, GY);

  // --- Wispy clouds ---
  for (let i = 0; i < 6; i++) {
    const cx = r() * W, cy = GY * (0.1 + r() * 0.4);
    const cw = 50 + r() * 120, ch = 8 + r() * 14;
    ctx.fillStyle = `rgba(255,255,255,${0.08 + r() * 0.12})`;
    ctx.beginPath(); ctx.ellipse(cx, cy, cw, ch, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(255,255,255,${0.04 + r() * 0.06})`;
    ctx.beginPath(); ctx.ellipse(cx + cw * 0.3, cy - ch * 0.2, cw * 0.6, ch * 0.7, 0, 0, Math.PI * 2); ctx.fill();
  }

  // --- Distant mountain range (lush green, misty) ---
  for (let layer = 0; layer < 3; layer++) {
    const baseY = GY - 5 + layer * 8;
    const alpha = 0.3 + layer * 0.15;
    const hue = 160 + layer * 15;
    const lum = 18 + layer * 8;
    ctx.fillStyle = `hsla(${hue},50%,${lum}%,${alpha})`;
    ctx.beginPath();
    ctx.moveTo(0, baseY + 40);
    for (let x = 0; x <= W; x += 12) {
      const peak = Math.sin(x * 0.004 + layer * 2.5) * (50 + layer * 15) + Math.sin(x * 0.012 + layer) * 18;
      ctx.lineTo(x, baseY - peak - 20 + layer * 30);
    }
    ctx.lineTo(W, GY + 20); ctx.lineTo(0, GY + 20);
    ctx.closePath(); ctx.fill();
  }

  // --- Mountain mist overlay ---
  const mistGrad = ctx.createLinearGradient(0, GY - 60, 0, GY + 10);
  mistGrad.addColorStop(0, "rgba(80,200,220,0.08)");
  mistGrad.addColorStop(1, "rgba(80,200,220,0)");
  ctx.fillStyle = mistGrad;
  ctx.fillRect(0, GY - 60, W, 70);

  // --- Waterfall from mountain (left side) ---
  const fallX = W * 0.18 + r() * 20;
  const fallW = 22 + r() * 12;
  const fallTop = GY - 50;
  const fallBot = GY + (H - GY) * 0.35;

  // Rock cliff behind waterfall
  ctx.fillStyle = "#2a5a40";
  ctx.beginPath();
  ctx.moveTo(fallX - fallW * 1.5, fallTop);
  ctx.lineTo(fallX + fallW * 1.5, fallTop + 5);
  ctx.lineTo(fallX + fallW * 1.8, fallBot + 10);
  ctx.lineTo(fallX - fallW * 1.8, fallBot + 5);
  ctx.closePath(); ctx.fill();
  // Moss on rocks
  ctx.fillStyle = "rgba(40,140,60,0.35)";
  for (let i = 0; i < 6; i++) {
    ctx.beginPath(); ctx.ellipse(fallX + (r() - 0.5) * fallW * 2, fallTop + r() * (fallBot - fallTop) * 0.7, 5 + r() * 10, 3 + r() * 5, r(), 0, Math.PI * 2); ctx.fill();
  }

  // Waterfall stream
  const fallGrad = ctx.createLinearGradient(fallX, fallTop, fallX, fallBot);
  fallGrad.addColorStop(0, "rgba(180,240,255,0.7)");
  fallGrad.addColorStop(0.4, "rgba(100,210,240,0.6)");
  fallGrad.addColorStop(1, "rgba(140,230,250,0.5)");
  ctx.fillStyle = fallGrad;
  ctx.beginPath();
  ctx.moveTo(fallX - fallW * 0.35, fallTop);
  ctx.quadraticCurveTo(fallX - fallW * 0.45, (fallTop + fallBot) * 0.5, fallX - fallW * 0.5, fallBot);
  ctx.lineTo(fallX + fallW * 0.5, fallBot);
  ctx.quadraticCurveTo(fallX + fallW * 0.45, (fallTop + fallBot) * 0.5, fallX + fallW * 0.35, fallTop);
  ctx.closePath(); ctx.fill();

  // Waterfall streaks
  ctx.strokeStyle = "rgba(220,250,255,0.2)"; ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const sx = fallX - fallW * 0.25 + r() * fallW * 0.5;
    ctx.beginPath(); ctx.moveTo(sx, fallTop + r() * 15);
    ctx.lineTo(sx + (r() - 0.5) * 6, fallBot - r() * 10); ctx.stroke();
  }

  // Splash mist at waterfall base
  for (let i = 0; i < 5; i++) {
    const mx = fallX + (r() - 0.5) * fallW * 2;
    const my = fallBot + r() * 12;
    const mr = 8 + r() * 18;
    const mist = ctx.createRadialGradient(mx, my, 0, mx, my, mr);
    mist.addColorStop(0, `rgba(200,250,255,${0.1 + r() * 0.08})`);
    mist.addColorStop(1, "transparent");
    ctx.fillStyle = mist;
    ctx.fillRect(mx - mr, my - mr, mr * 2, mr * 2);
  }

  // --- Turquoise lagoon water ---
  const waterY = GY + (H - GY) * 0.25;
  const waterGrad = ctx.createLinearGradient(0, waterY, 0, H);
  waterGrad.addColorStop(0, "rgba(20,200,200,0.5)");
  waterGrad.addColorStop(0.3, "rgba(10,160,180,0.55)");
  waterGrad.addColorStop(0.6, "rgba(5,120,150,0.6)");
  waterGrad.addColorStop(1, "rgba(0,80,120,0.7)");
  ctx.fillStyle = waterGrad;
  ctx.fillRect(0, waterY, W, H - waterY);

  // Water sparkle highlights
  ctx.fillStyle = "rgba(200,255,255,0.12)";
  for (let i = 0; i < 20; i++) {
    const sx = r() * W, sy = waterY + r() * (H - waterY) * 0.5;
    ctx.beginPath(); ctx.arc(sx, sy, 0.8 + r() * 2, 0, Math.PI * 2); ctx.fill();
  }

  // Wave lines on water
  ctx.strokeStyle = "rgba(150,240,250,0.15)"; ctx.lineWidth = 1;
  for (let row = 0; row < 8; row++) {
    const y = waterY + 4 + row * 9;
    ctx.beginPath();
    for (let x = 0; x < W; x += 4) {
      const yy = y + Math.sin(x * 0.02 + row * 2) * 2.5;
      x === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }

  // --- Sandy beach area ---
  const beachY = GY + 3;
  const beachH = waterY - beachY;
  const beachGrad = ctx.createLinearGradient(0, beachY, 0, waterY);
  beachGrad.addColorStop(0, "rgba(230,210,160,0.35)");
  beachGrad.addColorStop(0.7, "rgba(220,195,140,0.3)");
  beachGrad.addColorStop(1, "rgba(180,160,110,0.25)");
  ctx.fillStyle = beachGrad;
  ctx.fillRect(0, beachY, W, beachH);

  // Sand texture ripples
  ctx.fillStyle = "rgba(190,160,80,0.1)";
  for (let i = 0; i < 30; i++) {
    const sx = r() * W, sy = beachY + r() * beachH;
    ctx.beginPath(); ctx.ellipse(sx, sy, 6 + r() * 18, 1.2, r() * 0.3, 0, Math.PI * 2); ctx.fill();
  }

  // Shells on beach
  for (let i = 0; i < 12; i++) {
    const sx = r() * W, sy = beachY + 5 + r() * beachH * 0.8;
    const hue = [35, 45, 350, 30][Math.floor(r() * 4)];
    ctx.fillStyle = `hsla(${hue},${30 + r() * 30}%,${65 + r() * 20}%,${0.2 + r() * 0.15})`;
    ctx.beginPath(); ctx.ellipse(sx, sy, 2 + r() * 3, 1.5 + r() * 2, r() * Math.PI, 0, Math.PI * 2); ctx.fill();
  }

  // --- Lush palm trees ---
  for (let i = 0; i < 6; i++) {
    const px = 30 + r() * (W - 60);
    const by = GY - 3 + r() * 10;
    const h = 80 + r() * 110;
    const lean = (r() - 0.4) * 30;
    const depth = r();
    ctx.globalAlpha = 0.5 + depth * 0.45;

    // Trunk
    ctx.lineWidth = 4 + depth * 4;
    const trG = ctx.createLinearGradient(px, by, px + lean, by - h);
    trG.addColorStop(0, "#6a4a20"); trG.addColorStop(1, "#4a3018");
    ctx.strokeStyle = trG;
    ctx.beginPath();
    ctx.moveTo(px, by);
    ctx.quadraticCurveTo(px + lean * 0.4, by - h * 0.5, px + lean, by - h);
    ctx.stroke();

    // Trunk ring texture
    ctx.strokeStyle = "rgba(90,60,25,0.3)"; ctx.lineWidth = 1;
    for (let t = 0; t < 5; t++) {
      const tt = t / 5;
      const rx = px + lean * 0.4 * tt + lean * 0.6 * tt * tt;
      const ry = by - h * tt;
      ctx.beginPath(); ctx.moveTo(rx - 3, ry); ctx.lineTo(rx + 3, ry); ctx.stroke();
    }

    // Coconuts
    const topX = px + lean, topY = by - h;
    ctx.fillStyle = "#5a3a12";
    for (let c = 0; c < 2 + Math.floor(r()); c++) {
      ctx.beginPath(); ctx.arc(topX + (r() - 0.5) * 8, topY + 4 + r() * 5, 2.5 + r() * 1.5, 0, Math.PI * 2); ctx.fill();
    }

    // Fronds
    for (let f = 0; f < 8; f++) {
      const angle = (f / 8) * Math.PI * 2 + r() * 0.5;
      const frondLen = 30 + r() * 40;
      const endX = topX + Math.cos(angle) * frondLen;
      const endY = topY + Math.sin(angle) * frondLen * 0.45 + frondLen * 0.25;
      const ctrlX = topX + Math.cos(angle) * frondLen * 0.6;
      const ctrlY = topY + Math.sin(angle) * frondLen * 0.2 - 8;

      ctx.strokeStyle = `hsl(${110 + r() * 25},${45 + r() * 20}%,${22 + depth * 12}%)`;
      ctx.lineWidth = 2 + r();
      ctx.beginPath(); ctx.moveTo(topX, topY);
      ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY); ctx.stroke();

      // Leaflets
      for (let lf = 0; lf < 4; lf++) {
        const lt = 0.25 + lf * 0.18;
        const lx = topX + (endX - topX) * lt;
        const ly = topY + (endY - topY) * lt;
        const side = lf % 2 === 0 ? 1 : -1;
        ctx.fillStyle = `hsl(${108 + r() * 20},${45 + r() * 15}%,${24 + depth * 10 + r() * 5}%)`;
        ctx.beginPath();
        ctx.ellipse(lx + side * 4, ly + 2, 7 + r() * 4, 2.2, angle + side * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.globalAlpha = 1;

  // --- Tropical flowers and vegetation on beach ---
  for (let i = 0; i < 10; i++) {
    const fx = r() * W, fy = beachY + 3 + r() * beachH * 0.5;
    const hue = [340, 35, 290, 10, 50][Math.floor(r() * 5)];
    ctx.fillStyle = `hsl(${hue},70%,60%)`;
    ctx.beginPath(); ctx.arc(fx, fy, 2 + r() * 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "hsl(50,80%,70%)";
    ctx.beginPath(); ctx.arc(fx, fy, 0.8, 0, Math.PI * 2); ctx.fill();
  }

  // Green bush clusters on shore
  for (let i = 0; i < 5; i++) {
    const bx = r() * W, bby = GY - 2 + r() * 8;
    for (let b = 0; b < 3; b++) {
      ctx.fillStyle = `hsl(${115 + r() * 25},${45 + r() * 15}%,${20 + r() * 12}%)`;
      ctx.beginPath(); ctx.ellipse(bx + (r() - 0.5) * 12, bby - r() * 10, 10 + r() * 12, 6 + r() * 8, 0, 0, Math.PI * 2); ctx.fill();
    }
  }

  // --- Small rocky outcrop in water ---
  const rockX = W * 0.72 + r() * 40;
  const rockY = waterY + 15 + r() * 20;
  ctx.fillStyle = "#3a5a4a";
  ctx.beginPath(); ctx.ellipse(rockX, rockY, 18 + r() * 10, 10 + r() * 6, r() * 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(50,140,60,0.3)";
  ctx.beginPath(); ctx.ellipse(rockX, rockY - 4, 12, 4, 0, Math.PI, Math.PI * 2); ctx.fill();

  // --- Sun reflection on water ---
  const sunX = W * 0.7, reflW = 25;
  for (let i = 0; i < 8; i++) {
    const ry = waterY + 3 + i * 7;
    const rw = reflW - i * 1.5 + r() * 8;
    ctx.fillStyle = `rgba(200,250,255,${Math.max(0.02, 0.2 - i * 0.02)})`;
    ctx.fillRect(sunX - rw / 2 + (r() - 0.5) * 6, ry, rw, 2.5);
  }

  // --- Gentle tropical atmosphere glow ---
  const tropGlow = ctx.createRadialGradient(W * 0.5, GY, 30, W * 0.5, GY, W * 0.6);
  tropGlow.addColorStop(0, "rgba(100,220,240,0.04)");
  tropGlow.addColorStop(1, "transparent");
  ctx.fillStyle = tropGlow;
  ctx.fillRect(0, 0, W, H);
}

function drawOlympus(ctx, W, H, GY, r) {
  const groundH = H - GY;
  // --- Mountain ranges with depth perspective (closer = more saturated) ---
  for (let layer = 0; layer < 5; layer++) {
    const depthT = layer / 4;
    const baseY = GY - 15 + layer * 18;
    const alpha = 0.1 + depthT * 0.18;
    const lightness = 75 - depthT * 20;
    const sat = 12 + depthT * 12;
    ctx.fillStyle = `hsla(220,${sat}%,${lightness}%,${alpha})`;
    ctx.beginPath(); ctx.moveTo(0, baseY + 60);
    const amp = (55 - layer * 8) * (0.6 + depthT * 0.4);
    for (let x = 0; x <= W; x += 10) {
      const peak = Math.sin(x * 0.005 + layer * 2.1) * amp + Math.sin(x * 0.013 + layer) * (15 + depthT * 10);
      ctx.lineTo(x, baseY - peak);
    }
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
  }
  // --- Temple with depth scale ---
  const templeX = W * 0.3 + r() * W * 0.4;
  const templeY = GY + 5;
  const templeDepth = 0.25; // temple is near horizon
  const templeScale = DEPTH_CONFIG.minScale + (DEPTH_CONFIG.maxScale - DEPTH_CONFIG.minScale) * templeDepth;
  ctx.globalAlpha = 0.25 + templeDepth * 0.25;
  for (let c = 0; c < 6; c++) {
    const cx = templeX - 50 * templeScale + c * 20 * templeScale;
    const ch = (60 + r() * 30) * templeScale;
    ctx.fillStyle = `hsl(40,15%,${72 + r() * 10}%)`; ctx.fillRect(cx - 3 * templeScale, templeY - ch, 6 * templeScale, ch);
    ctx.fillRect(cx - 6 * templeScale, templeY - ch - 4 * templeScale, 12 * templeScale, 4 * templeScale);
    ctx.fillRect(cx - 5 * templeScale, templeY - 3, 10 * templeScale, 3);
  }
  ctx.fillStyle = `hsl(40,12%,${72 + r() * 8}%)`;
  const roofOff = (90 + r() * 20) * templeScale;
  ctx.beginPath(); ctx.moveTo(templeX - 60 * templeScale, templeY - roofOff); ctx.lineTo(templeX, templeY - roofOff * 1.4); ctx.lineTo(templeX + 60 * templeScale, templeY - roofOff); ctx.closePath(); ctx.fill();
  ctx.fillRect(templeX - 62 * templeScale, templeY - roofOff, 124 * templeScale, 6 * templeScale);
  ctx.globalAlpha = 1;
  // --- Marble stones with depth ---
  for (let i = 0; i < 30; i++) {
    const sy = GY + 15 + r() * (groundH - 20);
    const depthT = (sy - GY) / groundH;
    const stoneScale = 0.5 + depthT * 0.8;
    ctx.fillStyle = `rgba(200,195,180,${0.06 + depthT * 0.1})`;
    ctx.fillRect(r() * W, sy, (12 + r() * 18) * stoneScale, (4 + r() * 6) * stoneScale);
  }
  // --- Olive trees sorted by depth — gnarled Mediterranean style ---
  const olives = [];
  for (let i = 0; i < 7; i++) olives.push({ x: r() * W, y: GY - 5 + r() * 30, h: 40 + r() * 55, rv: [r(), r(), r(), r(), r(), r(), r(), r()] });
  olives.sort((a, b) => a.y - b.y);
  for (const t of olives) {
    const depthT = Math.max(0, Math.min(1, (t.y - GY + 10) / (groundH * 0.4)));
    const scale = DEPTH_CONFIG.minScale + (DEPTH_CONFIG.maxScale - DEPTH_CONFIG.minScale) * depthT;
    ctx.globalAlpha = 0.25 + depthT * 0.45;
    // Gnarled trunk — curved with thickness variation
    const trunkW = (3 + t.rv[0] * 3) * scale;
    const trunkH = t.h * 0.35 * scale;
    const lean = (t.rv[4] - 0.5) * 12 * scale;
    ctx.fillStyle = `hsl(${25 + t.rv[5] * 15},${22 + depthT * 10}%,${28 + t.rv[0] * 10}%)`;
    ctx.beginPath();
    ctx.moveTo(t.x - trunkW, t.y);
    ctx.quadraticCurveTo(t.x - trunkW + lean * 0.3, t.y - trunkH * 0.5, t.x - trunkW * 0.7 + lean, t.y - trunkH);
    ctx.lineTo(t.x + trunkW * 0.7 + lean, t.y - trunkH);
    ctx.quadraticCurveTo(t.x + trunkW + lean * 0.3, t.y - trunkH * 0.5, t.x + trunkW, t.y);
    ctx.closePath(); ctx.fill();
    // Bark texture
    ctx.strokeStyle = `rgba(60,40,20,${0.15 + depthT * 0.1})`;
    ctx.lineWidth = 0.5;
    for (let b = 0; b < 3; b++) {
      const by = t.y - trunkH * (0.2 + b * 0.25);
      ctx.beginPath(); ctx.moveTo(t.x - trunkW * 0.6 + lean * (b / 3), by); ctx.lineTo(t.x + trunkW * 0.3 + lean * (b / 3), by + 3); ctx.stroke();
    }
    // Spreading branches
    const topX = t.x + lean, topY = t.y - trunkH;
    ctx.strokeStyle = `hsl(25,${22 + depthT * 8}%,${30 + t.rv[1] * 8}%)`;
    ctx.lineWidth = 2 * scale;
    for (let br = 0; br < 3; br++) {
      const bAngle = -0.8 + br * 0.8 + (t.rv[5 + br % 3] - 0.5) * 0.4;
      const bLen = (18 + t.rv[br % 4] * 15) * scale;
      ctx.beginPath(); ctx.moveTo(topX, topY);
      ctx.quadraticCurveTo(topX + Math.cos(bAngle) * bLen * 0.6, topY + Math.sin(bAngle) * bLen * 0.4 - 5 * scale,
        topX + Math.cos(bAngle) * bLen, topY + Math.sin(bAngle) * bLen * 0.3);
      ctx.stroke();
    }
    // Silvery-green canopy layers
    for (let l = 0; l < 4; l++) {
      const lx = topX + (t.rv[(l + 3) % 8] - 0.5) * 20 * scale;
      const ly = topY - l * 8 * scale - 3 * scale;
      const rw = (14 + t.rv[(l + 1) % 8] * 14) * scale;
      const rh = (9 + t.rv[(l + 2) % 8] * 8) * scale;
      const hue = 80 + t.rv[(l + 1) % 8] * 30;
      const sat = 20 + depthT * 15 + t.rv[(l + 2) % 8] * 12;
      ctx.fillStyle = `hsl(${hue},${sat}%,${38 + t.rv[(l + 3) % 8] * 15 - (1 - depthT) * 5}%)`;
      ctx.beginPath(); ctx.ellipse(lx, ly, rw, rh, t.rv[l % 8] * 0.3, 0, Math.PI * 2); ctx.fill();
    }
    // Olives (small dark fruits)
    if (depthT > 0.15) {
      ctx.fillStyle = `rgba(40,50,20,${0.3 + depthT * 0.3})`;
      for (let o = 0; o < 5; o++) {
        const ox = topX + (t.rv[(o + 2) % 8] - 0.5) * 22 * scale;
        const oy = topY - t.rv[(o + 4) % 8] * 25 * scale;
        ctx.beginPath(); ctx.arc(ox, oy, 1.5 * scale, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  ctx.globalAlpha = 1;
  // --- Ruins with depth ---
  for (let i = 0; i < 4; i++) {
    const sy = GY + 25 + r() * (groundH - 40);
    const depthT = (sy - GY) / groundH;
    const scale = 0.5 + depthT * 0.8;
    ctx.globalAlpha = 0.12 + depthT * 0.15;
    ctx.fillStyle = `hsl(40,10%,${70 + r() * 15}%)`;
    ctx.fillRect(r() * W, sy, (20 + r() * 25) * scale, (6 + r() * 4) * scale);
    for (let j = 0; j < 3; j++) { ctx.beginPath(); ctx.arc(r() * W, sy + (8 + r() * 8) * scale, (2 + r() * 3) * scale, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  // --- Divine glow ---
  const glow = ctx.createRadialGradient(W * 0.5, GY * 0.3, 20, W * 0.5, GY * 0.3, W * 0.5);
  glow.addColorStop(0, "rgba(255,220,120,0.08)"); glow.addColorStop(0.5, "rgba(200,180,255,0.03)"); glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, GY);
  // --- Amphora shards (foreground detail) ---
  for (let i = 0; i < 3; i++) {
    const ax = r() * W, ay = H - 15 - r() * 25;
    ctx.fillStyle = `rgba(180,120,70,${0.1 + r() * 0.08})`;
    ctx.beginPath(); ctx.arc(ax, ay, 3 + r() * 3, 0, Math.PI * 2); ctx.fill();
  }
}

function drawUnderworld(ctx, W, H, GY, r) {
  const groundH = H - GY;
  // --- Styx river with depth-fading waves ---
  const riverY = H * 0.82;
  const riverG = ctx.createLinearGradient(0, riverY, 0, H);
  riverG.addColorStop(0, "rgba(20,10,40,0.7)"); riverG.addColorStop(1, "rgba(10,5,25,0.9)");
  ctx.fillStyle = riverG; ctx.fillRect(0, riverY, W, H - riverY);
  for (let row = 0; row < 5; row++) {
    const y = riverY + row * 7 + 3;
    const rowAlpha = 0.12 + (row / 5) * 0.2;
    ctx.strokeStyle = `rgba(80,40,120,${rowAlpha})`; ctx.lineWidth = 1.5 + row * 0.3;
    ctx.beginPath();
    for (let x = 0; x < W; x += 4) { const yy = y + Math.sin(x * 0.02 + row * 2.5) * 3; x === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); }
    ctx.stroke();
  }
  // --- Stalactites with depth ---
  for (let i = 0; i < 14; i++) {
    const sx = r() * W, slen = 15 + r() * 45;
    const depthT = Math.min(1, slen / 60);
    ctx.globalAlpha = 0.2 + depthT * 0.3;
    const light = 13 + r() * 10 + depthT * 4;
    ctx.fillStyle = `hsl(${270 + r() * 30},15%,${light}%)`;
    const baseW = (3 + r() * 3) * (0.7 + depthT * 0.5);
    ctx.beginPath(); ctx.moveTo(sx - baseW, GY - 8); ctx.lineTo(sx, GY + slen); ctx.lineTo(sx + baseW, GY - 8); ctx.closePath(); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // --- Bone piles sorted by depth ---
  const bones = [];
  for (let i = 0; i < 8; i++) bones.push({ x: r() * W, y: GY + 20 + r() * (groundH - 40), rv: [r(), r(), r(), r()] });
  bones.sort((a, b) => a.y - b.y);
  for (const b of bones) {
    const depthT = (b.y - GY) / groundH;
    const scale = 0.5 + depthT * 0.8;
    ctx.globalAlpha = 0.12 + depthT * 0.2;
    ctx.strokeStyle = `hsl(40,20%,${55 + b.rv[0] * 20}%)`; ctx.lineWidth = 1.2 * scale;
    for (let j = 0; j < 4; j++) {
      const ox = b.x + (b.rv[1] - 0.5) * 20 * scale, oy = b.y + r() * 8;
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + (8 + r() * 8) * scale, oy + (r() - 0.5) * 6); ctx.stroke();
    }
    if (b.rv[2] > 0.5) {
      ctx.fillStyle = `hsl(40,15%,${60 + b.rv[3] * 15}%)`; ctx.beginPath(); ctx.arc(b.x, b.y - 2, (3 + r() * 2) * scale, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  // --- Ghost flames with depth ---
  for (let i = 0; i < 6; i++) {
    const fx = r() * W, fy = GY + 10 + r() * (groundH - 30);
    const depthT = (fy - GY) / groundH;
    const fh = (10 + r() * 16) * (0.6 + depthT * 0.6);
    const flameG = ctx.createRadialGradient(fx, fy - fh * 0.3, 2, fx, fy, fh);
    const hue = r() > 0.5 ? 280 : 140;
    flameG.addColorStop(0, `hsla(${hue},60%,50%,${0.15 + depthT * 0.15})`); flameG.addColorStop(1, "transparent");
    ctx.fillStyle = flameG; ctx.fillRect(fx - fh, fy - fh, fh * 2, fh * 2);
  }
  // --- Rocky formations at horizon ---
  for (let i = 0; i < 7; i++) {
    const rx = r() * W, ry = GY + r() * 18;
    const depthT = Math.max(0, (ry - GY) / (groundH * 0.3));
    const scale = 0.6 + depthT * 0.5;
    const rh = (25 + r() * 40) * scale, rw = (12 + r() * 20) * scale;
    ctx.globalAlpha = 0.25 + depthT * 0.25;
    ctx.fillStyle = `hsl(${260 + r() * 30},10%,${10 + r() * 8}%)`;
    ctx.beginPath(); ctx.moveTo(rx - rw / 2, ry); ctx.lineTo(rx - rw * 0.3, ry - rh); ctx.lineTo(rx + rw * 0.1, ry - rh * 0.8); ctx.lineTo(rx + rw / 2, ry); ctx.closePath(); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // --- Chains with depth ---
  for (let i = 0; i < 4; i++) {
    const cx = r() * W, clen = 30 + r() * 50;
    const chainDepth = (clen - 30) / 50;
    ctx.strokeStyle = `rgba(100,80,60,${0.12 + chainDepth * 0.18})`; ctx.lineWidth = 1.5 + chainDepth;
    ctx.beginPath(); ctx.moveTo(cx, GY - 5);
    for (let s = 0; s < clen; s += 5) ctx.lineTo(cx + Math.sin(s * 0.3) * (2 + chainDepth * 2), GY + s);
    ctx.stroke();
  }
  // --- Hellish glow ---
  const hellGlow = ctx.createLinearGradient(0, H - 50, 0, H);
  hellGlow.addColorStop(0, "transparent"); hellGlow.addColorStop(1, "rgba(120,30,60,0.18)");
  ctx.fillStyle = hellGlow; ctx.fillRect(0, H - 50, W, 50);
  // --- Gates of Hades ---
  const gx = W * 0.5, gy = GY;
  ctx.globalAlpha = 0.15; ctx.fillStyle = "#0a0508";
  ctx.fillRect(gx - 55, gy - 80, 12, 80); ctx.fillRect(gx + 43, gy - 80, 12, 80);
  ctx.beginPath(); ctx.arc(gx, gy - 80, 55, Math.PI, 0); ctx.lineTo(gx + 55, gy - 80); ctx.arc(gx, gy - 80, 43, 0, Math.PI, true); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 1;
  // --- Charred marks (foreground detail) ---
  for (let i = 0; i < 4; i++) {
    const mx = r() * W, my = H - 15 - r() * 30;
    ctx.fillStyle = `rgba(40,15,30,${0.08 + r() * 0.06})`;
    ctx.beginPath(); ctx.ellipse(mx, my, 8 + r() * 10, 3 + r() * 2, r() * 0.5, 0, Math.PI * 2); ctx.fill();
  }
}
