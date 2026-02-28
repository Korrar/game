import { getIconImage } from "../rendering/icons.js";

// ─── FURNITURE DEFINITIONS PER HIDEOUT LEVEL ───

// Each level adds its own set of furniture drawn on the vault canvas
// Items are cumulative — higher levels keep lower level furniture + add new

const FURNITURE = [
  // Level 0: Nora w Skale — bare cave
  [
    { type: "rock", x: 0.12, y: 0.7, size: 1 },
    { type: "rock", x: 0.85, y: 0.75, size: 0.7 },
  ],
  // Level 1: Piwnica Karczmy — basic tavern cellar
  [
    { type: "barrel", x: 0.08, y: 0.55 },
    { type: "table", x: 0.35, y: 0.55 },
    { type: "stool", x: 0.28, y: 0.65 },
  ],
  // Level 2: Opuszczona Kopalnia — mining equipment
  [
    { type: "crate", x: 0.82, y: 0.55 },
    { type: "lantern", x: 0.5, y: 0.2 },
    { type: "pickaxe", x: 0.65, y: 0.5 },
  ],
  // Level 3: Stara Wieża — scholar's tower
  [
    { type: "bookshelf", x: 0.88, y: 0.3 },
    { type: "desk", x: 0.6, y: 0.5 },
    { type: "chair", x: 0.55, y: 0.6 },
  ],
  // Level 4: Zamkowa Krypta — dark crypt
  [
    { type: "altar", x: 0.5, y: 0.45 },
    { type: "candelabra", x: 0.4, y: 0.3 },
    { type: "candelabra", x: 0.6, y: 0.3 },
  ],
  // Level 5: Podziemna Twierdza — fortress armory
  [
    { type: "armorStand", x: 0.15, y: 0.35 },
    { type: "weaponRack", x: 0.75, y: 0.35 },
    { type: "banner", x: 0.5, y: 0.1 },
  ],
  // Level 6: Smocza Jaskinia — dragon's lair
  [
    { type: "crystal", x: 0.2, y: 0.4, hue: 280 },
    { type: "crystal", x: 0.78, y: 0.45, hue: 200 },
    { type: "dragonSkull", x: 0.5, y: 0.35 },
  ],
  // Level 7: Pałac Cieni — shadow palace
  [
    { type: "throne", x: 0.5, y: 0.3 },
    { type: "chandelier", x: 0.5, y: 0.05 },
    { type: "carpet", x: 0.5, y: 0.65 },
  ],
  // Level 8: Cytadela Wieczności — eternal citadel
  [
    { type: "magicOrb", x: 0.3, y: 0.25, hue: 180 },
    { type: "magicOrb", x: 0.7, y: 0.25, hue: 300 },
    { type: "portal", x: 0.5, y: 0.45 },
  ],
];

// ─── DRAW FUNCTIONS FOR EACH FURNITURE TYPE ───

function drawRock(ctx, x, y, W, H, item) {
  const s = (item.size || 1) * 18;
  const px = x, py = y;
  ctx.fillStyle = "#3a3028";
  ctx.beginPath();
  ctx.moveTo(px - s, py);
  ctx.quadraticCurveTo(px - s * 0.8, py - s * 0.9, px, py - s * 0.7);
  ctx.quadraticCurveTo(px + s * 0.9, py - s * 0.8, px + s, py);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#4a4038";
  ctx.beginPath();
  ctx.moveTo(px - s * 0.5, py - s * 0.1);
  ctx.quadraticCurveTo(px - s * 0.3, py - s * 0.6, px + s * 0.2, py - s * 0.5);
  ctx.quadraticCurveTo(px + s * 0.6, py - s * 0.55, px + s * 0.7, py - s * 0.1);
  ctx.closePath();
  ctx.fill();
}

function drawBarrel(ctx, x, y) {
  // Body
  ctx.fillStyle = "#5a3a1a";
  ctx.beginPath();
  ctx.ellipse(x, y + 10, 14, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  // Top
  ctx.fillStyle = "#6a4a2a";
  ctx.beginPath();
  ctx.ellipse(x, y - 8, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Metal bands
  ctx.strokeStyle = "#888";
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(x, y, 13, 4, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(x, y + 16, 12, 3.5, 0, 0, Math.PI * 2); ctx.stroke();
}

function drawTable(ctx, x, y) {
  // Table top
  ctx.fillStyle = "#5a3820";
  ctx.fillRect(x - 22, y - 2, 44, 5);
  // Legs
  ctx.fillStyle = "#4a2818";
  ctx.fillRect(x - 18, y + 3, 4, 18);
  ctx.fillRect(x + 14, y + 3, 4, 18);
  // Items on table
  const candle = getIconImage("fire", 8);
  const scrl = getIconImage("scroll", 8);
  if (candle) ctx.drawImage(candle, x - 10, y - 7, 8, 8);
  if (scrl) ctx.drawImage(scrl, x + 0, y - 7, 8, 8);
}

function drawStool(ctx, x, y) {
  ctx.fillStyle = "#4a2818";
  ctx.fillRect(x - 6, y, 12, 3);
  ctx.fillRect(x - 4, y + 3, 2, 12);
  ctx.fillRect(x + 2, y + 3, 2, 12);
}

function drawCrate(ctx, x, y) {
  ctx.fillStyle = "#4a3218";
  ctx.fillRect(x - 12, y, 24, 20);
  ctx.strokeStyle = "#6a5238";
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 12, y, 24, 20);
  // Planks
  ctx.beginPath();
  ctx.moveTo(x - 12, y + 10); ctx.lineTo(x + 12, y + 10);
  ctx.moveTo(x, y); ctx.lineTo(x, y + 20);
  ctx.stroke();
}

function drawLantern(ctx, x, y) {
  // Chain
  ctx.strokeStyle = "#666";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x, y - 10); ctx.lineTo(x, y + 5); ctx.stroke();
  // Lantern body
  ctx.fillStyle = "#5a4a30";
  ctx.fillRect(x - 5, y + 5, 10, 14);
  // Glow
  const g = ctx.createRadialGradient(x, y + 12, 2, x, y + 12, 25);
  g.addColorStop(0, "rgba(255,180,60,0.3)");
  g.addColorStop(1, "transparent");
  ctx.fillStyle = g;
  ctx.fillRect(x - 25, y - 10, 50, 50);
  // Flame
  ctx.fillStyle = "#ffa030";
  ctx.beginPath();
  ctx.ellipse(x, y + 10, 2, 4, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawPickaxe(ctx, x, y) {
  // Handle
  ctx.strokeStyle = "#5a3a18";
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x - 10, y + 20); ctx.lineTo(x + 8, y - 5); ctx.stroke();
  // Head
  ctx.fillStyle = "#888";
  ctx.beginPath();
  ctx.moveTo(x + 8, y - 5);
  ctx.lineTo(x + 18, y - 10);
  ctx.lineTo(x + 12, y - 3);
  ctx.lineTo(x + 2, y + 2);
  ctx.closePath();
  ctx.fill();
}

function drawBookshelf(ctx, x, y) {
  // Frame
  ctx.fillStyle = "#3a2210";
  ctx.fillRect(x - 16, y, 32, 45);
  // Shelves
  ctx.fillStyle = "#4a3218";
  for (let s = 0; s < 3; s++) {
    ctx.fillRect(x - 15, y + 3 + s * 14, 30, 2);
  }
  // Books (colored spines)
  const colors = ["#8a2020", "#2050a0", "#206030", "#805020", "#504080", "#a06020"];
  for (let s = 0; s < 3; s++) {
    let bx = x - 13;
    for (let b = 0; b < 5; b++) {
      const bw = 3 + Math.sin(s * 5 + b * 3) * 1.5;
      ctx.fillStyle = colors[(s * 5 + b) % colors.length];
      ctx.fillRect(bx, y + 5 + s * 14, bw, 11);
      bx += bw + 1;
    }
  }
}

function drawDesk(ctx, x, y) {
  // Desk surface
  ctx.fillStyle = "#4a2818";
  ctx.fillRect(x - 20, y, 40, 4);
  // Legs
  ctx.fillRect(x - 18, y + 4, 3, 15);
  ctx.fillRect(x + 15, y + 4, 3, 15);
  // Drawer
  ctx.fillStyle = "#3a1e10";
  ctx.fillRect(x - 10, y + 5, 20, 8);
  ctx.fillStyle = "#888";
  ctx.fillRect(x - 1, y + 8, 2, 2); // handle
  // Quill & scroll on desk
  const deskScroll = getIconImage("scroll", 7);
  if (deskScroll) ctx.drawImage(deskScroll, x - 11, y - 4, 7, 7);
}

function drawChair(ctx, x, y) {
  // Seat
  ctx.fillStyle = "#4a2818";
  ctx.fillRect(x - 7, y, 14, 3);
  // Back
  ctx.fillRect(x - 7, y - 14, 2, 14);
  ctx.fillRect(x + 5, y - 14, 2, 14);
  ctx.fillRect(x - 7, y - 14, 14, 2);
  // Legs
  ctx.fillRect(x - 6, y + 3, 2, 10);
  ctx.fillRect(x + 4, y + 3, 2, 10);
}

function drawAltar(ctx, x, y) {
  // Base
  ctx.fillStyle = "#3a3040";
  ctx.fillRect(x - 18, y + 8, 36, 16);
  // Top slab
  ctx.fillStyle = "#4a4050";
  ctx.fillRect(x - 20, y + 4, 40, 6);
  // Cloth
  ctx.fillStyle = "#6a1020";
  ctx.fillRect(x - 16, y + 4, 32, 3);
  // Glow
  const g = ctx.createRadialGradient(x, y + 4, 2, x, y + 4, 20);
  g.addColorStop(0, "rgba(200,100,255,0.15)");
  g.addColorStop(1, "transparent");
  ctx.fillStyle = g;
  ctx.fillRect(x - 22, y - 10, 44, 40);
  // Rune symbol
  const runeIcon = getIconImage("star", 10);
  if (runeIcon) ctx.drawImage(runeIcon, x - 5, y - 2, 10, 10);
}

function drawCandelabra(ctx, x, y) {
  // Stand
  ctx.strokeStyle = "#b89040";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x, y + 30); ctx.lineTo(x, y + 8); ctx.stroke();
  // Base
  ctx.fillStyle = "#a08030";
  ctx.beginPath(); ctx.ellipse(x, y + 30, 8, 3, 0, 0, Math.PI * 2); ctx.fill();
  // Arms
  [-8, 0, 8].forEach(dx => {
    ctx.strokeStyle = "#b89040"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x, y + 12); ctx.quadraticCurveTo(x + dx * 0.5, y + 6, x + dx, y + 5); ctx.stroke();
    // Candle
    ctx.fillStyle = "#e8d8b0";
    ctx.fillRect(x + dx - 2, y - 2, 4, 8);
    // Flame
    const fg = ctx.createRadialGradient(x + dx, y - 3, 1, x + dx, y - 3, 8);
    fg.addColorStop(0, "rgba(255,200,60,0.6)");
    fg.addColorStop(1, "transparent");
    ctx.fillStyle = fg;
    ctx.fillRect(x + dx - 8, y - 10, 16, 16);
    ctx.fillStyle = "#ffc040";
    ctx.beginPath(); ctx.ellipse(x + dx, y - 3, 1.5, 3, 0, 0, Math.PI * 2); ctx.fill();
  });
}

function drawArmorStand(ctx, x, y) {
  // Stand pole
  ctx.strokeStyle = "#5a4030";
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x, y + 35); ctx.lineTo(x, y); ctx.stroke();
  // Base
  ctx.fillStyle = "#4a3020";
  ctx.fillRect(x - 10, y + 33, 20, 4);
  // Helmet
  ctx.fillStyle = "#7a7a80";
  ctx.beginPath(); ctx.arc(x, y + 2, 7, Math.PI, 0); ctx.fill();
  ctx.fillRect(x - 7, y + 2, 14, 4);
  // Visor slit
  ctx.fillStyle = "#222";
  ctx.fillRect(x - 4, y + 3, 8, 2);
  // Breastplate
  ctx.fillStyle = "#8a8a90";
  ctx.beginPath();
  ctx.moveTo(x - 10, y + 8);
  ctx.lineTo(x + 10, y + 8);
  ctx.lineTo(x + 8, y + 25);
  ctx.lineTo(x - 8, y + 25);
  ctx.closePath();
  ctx.fill();
  // Shoulders
  ctx.fillStyle = "#6a6a70";
  ctx.fillRect(x - 14, y + 8, 8, 4);
  ctx.fillRect(x + 6, y + 8, 8, 4);
}

function drawWeaponRack(ctx, x, y) {
  // Rack frame
  ctx.fillStyle = "#4a2818";
  ctx.fillRect(x - 18, y, 36, 3);
  ctx.fillRect(x - 18, y + 20, 36, 3);
  ctx.fillRect(x - 18, y, 3, 35);
  ctx.fillRect(x + 15, y, 3, 35);
  // Weapons
  // Sword
  ctx.fillStyle = "#aaa";
  ctx.fillRect(x - 10, y + 4, 2, 16);
  ctx.fillStyle = "#8a6020";
  ctx.fillRect(x - 12, y + 15, 6, 2);
  // Axe
  ctx.fillStyle = "#888";
  ctx.fillRect(x - 1, y + 4, 2, 16);
  ctx.beginPath();
  ctx.moveTo(x + 1, y + 5); ctx.lineTo(x + 8, y + 3); ctx.lineTo(x + 8, y + 10); ctx.lineTo(x + 1, y + 8);
  ctx.closePath(); ctx.fill();
  // Mace
  ctx.fillStyle = "#666";
  ctx.fillRect(x + 8, y + 4, 2, 16);
  ctx.fillStyle = "#777";
  ctx.beginPath(); ctx.arc(x + 9, y + 6, 4, 0, Math.PI * 2); ctx.fill();
}

function drawBanner(ctx, x, y, W) {
  // Pole
  ctx.strokeStyle = "#8a6020";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x - 20, y); ctx.lineTo(x + 20, y); ctx.stroke();
  // Banner cloth
  ctx.fillStyle = "#8a1020";
  ctx.beginPath();
  ctx.moveTo(x - 15, y + 1);
  ctx.lineTo(x + 15, y + 1);
  ctx.lineTo(x + 12, y + 28);
  ctx.lineTo(x, y + 32);
  ctx.lineTo(x - 12, y + 28);
  ctx.closePath();
  ctx.fill();
  // Emblem
  const swordsIcon = getIconImage("swords", 12);
  if (swordsIcon) ctx.drawImage(swordsIcon, x - 6, y + 12, 12, 12);
}

function drawCrystal(ctx, x, y, item) {
  const hue = item.hue || 280;
  // Glow
  const g = ctx.createRadialGradient(x, y, 3, x, y, 30);
  g.addColorStop(0, `hsla(${hue},80%,60%,0.3)`);
  g.addColorStop(1, "transparent");
  ctx.fillStyle = g;
  ctx.fillRect(x - 30, y - 30, 60, 60);
  // Crystal shape
  ctx.fillStyle = `hsla(${hue},70%,50%,0.8)`;
  ctx.beginPath();
  ctx.moveTo(x, y - 18);
  ctx.lineTo(x + 8, y + 5);
  ctx.lineTo(x + 3, y + 12);
  ctx.lineTo(x - 3, y + 12);
  ctx.lineTo(x - 8, y + 5);
  ctx.closePath();
  ctx.fill();
  // Highlight
  ctx.fillStyle = `hsla(${hue},80%,80%,0.5)`;
  ctx.beginPath();
  ctx.moveTo(x - 2, y - 14);
  ctx.lineTo(x + 4, y + 2);
  ctx.lineTo(x, y + 5);
  ctx.lineTo(x - 5, y);
  ctx.closePath();
  ctx.fill();
}

function drawDragonSkull(ctx, x, y) {
  // Skull
  ctx.fillStyle = "#c8b898";
  ctx.beginPath();
  ctx.ellipse(x, y + 5, 16, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  // Jaw / snout
  ctx.beginPath();
  ctx.moveTo(x - 8, y + 10);
  ctx.lineTo(x, y + 22);
  ctx.lineTo(x + 8, y + 10);
  ctx.closePath();
  ctx.fill();
  // Eye sockets
  ctx.fillStyle = "#1a0808";
  ctx.beginPath(); ctx.ellipse(x - 6, y + 2, 3, 4, -0.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + 6, y + 2, 3, 4, 0.2, 0, Math.PI * 2); ctx.fill();
  // Horns
  ctx.fillStyle = "#a89878";
  ctx.beginPath();
  ctx.moveTo(x - 12, y - 3); ctx.lineTo(x - 22, y - 16); ctx.lineTo(x - 8, y - 6);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + 12, y - 3); ctx.lineTo(x + 22, y - 16); ctx.lineTo(x + 8, y - 6);
  ctx.closePath(); ctx.fill();
  // Teeth
  ctx.fillStyle = "#e8d8c8";
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i * 3, y + 12);
    ctx.lineTo(x + i * 3 - 1, y + 16);
    ctx.lineTo(x + i * 3 + 1, y + 16);
    ctx.closePath();
    ctx.fill();
  }
  // Eye glow
  const g1 = ctx.createRadialGradient(x - 6, y + 2, 1, x - 6, y + 2, 6);
  g1.addColorStop(0, "rgba(255,60,20,0.4)"); g1.addColorStop(1, "transparent");
  ctx.fillStyle = g1; ctx.fillRect(x - 12, y - 4, 12, 12);
  const g2 = ctx.createRadialGradient(x + 6, y + 2, 1, x + 6, y + 2, 6);
  g2.addColorStop(0, "rgba(255,60,20,0.4)"); g2.addColorStop(1, "transparent");
  ctx.fillStyle = g2; ctx.fillRect(x, y - 4, 12, 12);
}

function drawThrone(ctx, x, y) {
  // Back
  ctx.fillStyle = "#3a1818";
  ctx.fillRect(x - 14, y - 10, 28, 35);
  // Back ornament top
  ctx.fillStyle = "#5a2020";
  ctx.beginPath();
  ctx.moveTo(x - 16, y - 10);
  ctx.lineTo(x, y - 22);
  ctx.lineTo(x + 16, y - 10);
  ctx.closePath();
  ctx.fill();
  // Crown on top
  const crownIcon = getIconImage("crown", 9);
  if (crownIcon) ctx.drawImage(crownIcon, x - 4, y - 18, 9, 9);
  // Seat cushion
  ctx.fillStyle = "#6a1828";
  ctx.fillRect(x - 12, y + 12, 24, 6);
  // Armrests
  ctx.fillStyle = "#4a1010";
  ctx.fillRect(x - 18, y + 5, 6, 14);
  ctx.fillRect(x + 12, y + 5, 6, 14);
  // Gold accents
  ctx.fillStyle = "#d4a030";
  ctx.fillRect(x - 18, y + 5, 6, 2);
  ctx.fillRect(x + 12, y + 5, 6, 2);
  // Legs
  ctx.fillStyle = "#2a0a0a";
  ctx.fillRect(x - 14, y + 25, 4, 8);
  ctx.fillRect(x + 10, y + 25, 4, 8);
}

function drawChandelier(ctx, x, y) {
  // Chain
  ctx.strokeStyle = "#b89040";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x, y - 5); ctx.lineTo(x, y + 8); ctx.stroke();
  // Ring
  ctx.strokeStyle = "#a08030";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(x, y + 12, 20, 4, 0, 0, Math.PI * 2); ctx.stroke();
  // Candles & flames
  [-16, -8, 0, 8, 16].forEach(dx => {
    ctx.fillStyle = "#e8d8b0";
    ctx.fillRect(x + dx - 1, y + 8, 2, 5);
    // Glow
    const g = ctx.createRadialGradient(x + dx, y + 6, 1, x + dx, y + 6, 10);
    g.addColorStop(0, "rgba(255,200,60,0.4)");
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(x + dx - 10, y - 2, 20, 16);
    ctx.fillStyle = "#ffc040";
    ctx.beginPath(); ctx.ellipse(x + dx, y + 6, 1, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  });
}

function drawCarpet(ctx, x, y, W) {
  const cw = Math.min(W * 0.6, 120), ch = 18;
  ctx.fillStyle = "#6a1828";
  ctx.fillRect(x - cw / 2, y - ch / 2, cw, ch);
  // Border
  ctx.strokeStyle = "#d4a030";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x - cw / 2 + 2, y - ch / 2 + 2, cw - 4, ch - 4);
  // Pattern
  ctx.fillStyle = "#d4a030";
  for (let i = 0; i < 5; i++) {
    const px = x - cw / 2 + 15 + i * (cw - 30) / 4;
    ctx.beginPath(); ctx.arc(px, y, 2, 0, Math.PI * 2); ctx.fill();
  }
}

function drawMagicOrb(ctx, x, y, item) {
  const hue = item.hue || 180;
  // Pedestal
  ctx.fillStyle = "#4a4050";
  ctx.fillRect(x - 6, y + 8, 12, 10);
  ctx.fillRect(x - 8, y + 16, 16, 3);
  // Orb glow
  const g = ctx.createRadialGradient(x, y, 3, x, y, 25);
  g.addColorStop(0, `hsla(${hue},80%,60%,0.5)`);
  g.addColorStop(0.5, `hsla(${hue},70%,40%,0.15)`);
  g.addColorStop(1, "transparent");
  ctx.fillStyle = g;
  ctx.fillRect(x - 28, y - 22, 56, 56);
  // Orb body
  ctx.fillStyle = `hsla(${hue},60%,30%,0.7)`;
  ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill();
  // Inner glow
  ctx.fillStyle = `hsla(${hue},80%,70%,0.6)`;
  ctx.beginPath(); ctx.arc(x - 2, y - 2, 4, 0, Math.PI * 2); ctx.fill();
  // Highlight
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath(); ctx.arc(x - 3, y - 3, 2, 0, Math.PI * 2); ctx.fill();
}

function drawPortal(ctx, x, y) {
  // Outer glow
  const g1 = ctx.createRadialGradient(x, y, 5, x, y, 35);
  g1.addColorStop(0, "rgba(140,60,255,0.4)");
  g1.addColorStop(0.5, "rgba(80,30,200,0.15)");
  g1.addColorStop(1, "transparent");
  ctx.fillStyle = g1;
  ctx.fillRect(x - 40, y - 35, 80, 70);
  // Portal ring
  ctx.strokeStyle = "rgba(180,100,255,0.6)";
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(x, y, 18, 22, 0, 0, Math.PI * 2); ctx.stroke();
  // Inner ring
  ctx.strokeStyle = "rgba(220,160,255,0.4)";
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(x, y, 13, 17, 0, 0, Math.PI * 2); ctx.stroke();
  // Center void
  ctx.fillStyle = "rgba(20,0,40,0.8)";
  ctx.beginPath(); ctx.ellipse(x, y, 11, 14, 0, 0, Math.PI * 2); ctx.fill();
  // Swirl hints
  ctx.strokeStyle = "rgba(160,100,255,0.3)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 1.2); ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, 5, Math.PI * 0.5, Math.PI * 1.8); ctx.stroke();
}

const DRAW_MAP = {
  rock: drawRock,
  barrel: drawBarrel,
  table: drawTable,
  stool: drawStool,
  crate: drawCrate,
  lantern: drawLantern,
  pickaxe: drawPickaxe,
  bookshelf: drawBookshelf,
  desk: drawDesk,
  chair: drawChair,
  altar: drawAltar,
  candelabra: drawCandelabra,
  armorStand: drawArmorStand,
  weaponRack: drawWeaponRack,
  banner: drawBanner,
  crystal: drawCrystal,
  dragonSkull: drawDragonSkull,
  throne: drawThrone,
  chandelier: drawChandelier,
  carpet: drawCarpet,
  magicOrb: drawMagicOrb,
  portal: drawPortal,
};

// ─── MAIN RENDER ───

export function renderVault(ctx, W, H, totalGold, money, hideoutLevel) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#1a1210"; ctx.fillRect(0, 0, W, H);

  // Wall bricks
  ctx.fillStyle = "#2a2018";
  for (let row = 0; row < Math.ceil(H / 16); row++) {
    const off = row % 2 ? 10 : 0;
    for (let col = -1; col < Math.ceil(W / 32) + 1; col++) ctx.fillRect(off + col * 32 + 1, row * 16 + 1, 30, 14);
  }

  // Floor
  ctx.fillStyle = "#1a1410"; ctx.fillRect(0, H - 30, W, 30);
  ctx.fillStyle = "#221a14";
  for (let i = 0; i < W; i += 24) ctx.fillRect(i, H - 30, 22, 28);

  // Torches
  [[30, 30], [W - 30, 30]].forEach(([tx, ty]) => {
    const g = ctx.createRadialGradient(tx, ty, 3, tx, ty + 10, 80);
    g.addColorStop(0, "rgba(255,160,40,0.25)"); g.addColorStop(1, "transparent");
    ctx.fillStyle = g; ctx.fillRect(tx - 80, ty - 20, 160, 120);
    const torchIcon = getIconImage("fire", 16); if (torchIcon) ctx.drawImage(torchIcon, tx - 8, ty - 3, 16, 16);
  });

  // ─── DRAW FURNITURE for current level and all below ───
  const lvl = hideoutLevel != null ? hideoutLevel : 0;
  for (let l = 0; l <= lvl && l < FURNITURE.length; l++) {
    FURNITURE[l].forEach(item => {
      const fn = DRAW_MAP[item.type];
      if (fn) {
        const px = item.x * W;
        const py = item.y * H;
        fn(ctx, px, py, W, H, item);
      }
    });
  }

  // ─── GOLD PILES ───
  const piles = Math.min(15, Math.floor(totalGold / 2) + Math.min(money.gold, 3));
  const fillRatio = Math.min(1, totalGold / 80);

  if (piles === 0 && money.copper === 0 && money.silver === 0 && money.gold === 0) {
    ctx.fillStyle = "#555"; ctx.font = "14px serif"; ctx.textAlign = "center";
    ctx.fillText("Skarbiec jest pusty...", W / 2, H / 2 + 5); ctx.textAlign = "start";
  } else {
    const startX = 60, endX = W - 60, floorY = H - 32;
    for (let i = 0; i < piles; i++) {
      const x = startX + ((endX - startX) / 15) * i + Math.sin(i * 3.7) * 8;
      const pileH = 12 + fillRatio * 30 + Math.sin(i * 2.3) * 8;
      ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.ellipse(x, floorY + 2, 14 + fillRatio * 8 + 2, 4, 0, 0, Math.PI * 2); ctx.fill();
      for (let c = 0; c < Math.ceil(pileH / 4); c++) {
        const cy = floorY - c * 4, cw = 14 + fillRatio * 8 - c * 0.5, hue = 45 + Math.sin(i + c) * 8;
        ctx.fillStyle = `hsl(${hue},${65 + c * 2}%,${45 + c * 1.5}%)`; ctx.beginPath(); ctx.ellipse(x, cy, cw, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `hsl(${hue},60%,${35 + c}%)`; ctx.fillRect(x - cw, cy, cw * 2, 4);
      }
    }
    const sc = Math.min(20, Math.floor(totalGold * 1.5));
    ctx.fillStyle = "#c8a030";
    for (let i = 0; i < sc; i++) { ctx.beginPath(); ctx.ellipse(50 + Math.sin(i * 7.3 + 1) * (W - 100) * 0.5 + (W - 100) * 0.5, floorY - 1 + Math.sin(i * 4.7) * 3, 3 + Math.sin(i), 1.5, Math.sin(i) * 0.3, 0, Math.PI * 2); ctx.fill(); }
  }

  // HUD
  ctx.fillStyle = "#d4a030"; ctx.font = "bold 15px monospace"; ctx.textAlign = "center";
  ctx.fillText(`${money.copper}Cu  ${money.silver}Ag  ${money.gold}Au  |  Zarobiono: ~${totalGold.toFixed(1)} Au`, W / 2, 18);
  ctx.textAlign = "start";
}
