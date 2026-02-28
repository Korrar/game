/**
 * Hand-drawn western-pirate icon system.
 * Each icon is drawn on an offscreen canvas and cached as a data-URL.
 * Usage:  import { getIconUrl, ICONS } from "./icons";
 *         <img src={getIconUrl("dynamite", 32)} />
 */

const _cache = {};

/* ── helpers ────────────────────────────────────────── */

function _canvas(size) {
  const c = document.createElement("canvas");
  c.width = size; c.height = size;
  return [c, c.getContext("2d")];
}

/** jittered line – gives a hand-drawn feel */
function sketchLine(ctx, x1, y1, x2, y2, jitter = 1.2) {
  const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * jitter * 2;
  const my = (y1 + y2) / 2 + (Math.random() - 0.5) * jitter * 2;
  ctx.beginPath();
  ctx.moveTo(x1 + (Math.random() - 0.5) * jitter, y1 + (Math.random() - 0.5) * jitter);
  ctx.quadraticCurveTo(mx, my, x2 + (Math.random() - 0.5) * jitter, y2 + (Math.random() - 0.5) * jitter);
  ctx.stroke();
}

/** sketchy circle */
function sketchCircle(ctx, cx, cy, r, jitter = 1) {
  ctx.beginPath();
  for (let i = 0; i <= 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    const jr = r + (Math.random() - 0.5) * jitter * 2;
    const x = cx + Math.cos(a) * jr;
    const y = cy + Math.sin(a) * jr;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** sketchy rectangle */
function sketchRect(ctx, x, y, w, h, jitter = 1) {
  const j = jitter;
  ctx.beginPath();
  ctx.moveTo(x + r2(j), y + r2(j));
  ctx.lineTo(x + w + r2(j), y + r2(j));
  ctx.lineTo(x + w + r2(j), y + h + r2(j));
  ctx.lineTo(x + r2(j), y + h + r2(j));
  ctx.closePath();
}

function r2(j) { return (Math.random() - 0.5) * j * 2; }

/** common stroke/fill setup for western style */
function westernStroke(ctx, color = "#3a2010", width = 1.5) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
}

/** sepia glow behind icon */
function sepiaGlow(ctx, cx, cy, r, alpha = 0.25) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, `rgba(210,170,100,${alpha})`);
  g.addColorStop(1, "rgba(210,170,100,0)");
  ctx.fillStyle = g;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
}

/* ── icon drawing functions ─────────────────────────── */
/* Each fn receives (ctx, s) where s = canvas size       */

const DRAW = {};

// ─── SPELL / ACTION ICONS ───

DRAW.dynamite = (ctx, s) => {
  const cx = s / 2, cy = s / 2;
  sepiaGlow(ctx, cx, cy, s * 0.45);
  // stick
  westernStroke(ctx, "#3a2010", s * 0.06);
  ctx.fillStyle = "#c03020";
  sketchRect(ctx, cx - s * 0.08, cy - s * 0.25, s * 0.16, s * 0.45, 0.8);
  ctx.fill(); ctx.stroke();
  // band
  ctx.fillStyle = "#8a2010";
  ctx.fillRect(cx - s * 0.09, cy - s * 0.05, s * 0.18, s * 0.06);
  ctx.fillRect(cx - s * 0.09, cy + s * 0.1, s * 0.18, s * 0.06);
  // fuse
  westernStroke(ctx, "#5a4a30", s * 0.03);
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.25);
  ctx.quadraticCurveTo(cx + s * 0.15, cy - s * 0.38, cx + s * 0.05, cy - s * 0.42);
  ctx.stroke();
  // spark
  ctx.fillStyle = "#ffe040";
  sketchCircle(ctx, cx + s * 0.05, cy - s * 0.42, s * 0.05);
  ctx.fill();
  ctx.fillStyle = "#fff";
  sketchCircle(ctx, cx + s * 0.05, cy - s * 0.42, s * 0.02);
  ctx.fill();
};

DRAW.sniper = (ctx, s) => {
  const cx = s / 2, cy = s / 2;
  sepiaGlow(ctx, cx, cy, s * 0.45);
  // crosshair
  westernStroke(ctx, "#d4a030", s * 0.04);
  sketchCircle(ctx, cx, cy, s * 0.28);
  ctx.stroke();
  sketchCircle(ctx, cx, cy, s * 0.15);
  ctx.stroke();
  // cross lines
  sketchLine(ctx, cx, cy - s * 0.38, cx, cy + s * 0.38, 0.5);
  sketchLine(ctx, cx - s * 0.38, cy, cx + s * 0.38, cy, 0.5);
  // center dot
  ctx.fillStyle = "#ff3020";
  sketchCircle(ctx, cx, cy, s * 0.04);
  ctx.fill();
};

DRAW.harpoon = (ctx, s) => {
  const cx = s / 2, cy = s / 2;
  sepiaGlow(ctx, cx, cy, s * 0.4);
  // shaft
  westernStroke(ctx, "#6a5030", s * 0.05);
  sketchLine(ctx, cx - s * 0.3, cy + s * 0.3, cx + s * 0.2, cy - s * 0.25, 0.6);
  // head (barbed)
  westernStroke(ctx, "#a0a0a0", s * 0.04);
  ctx.fillStyle = "#c0c0c0";
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.2, cy - s * 0.25);
  ctx.lineTo(cx + s * 0.35, cy - s * 0.4);
  ctx.lineTo(cx + s * 0.25, cy - s * 0.28);
  ctx.lineTo(cx + s * 0.38, cy - s * 0.32);
  ctx.lineTo(cx + s * 0.2, cy - s * 0.2);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // rope
  westernStroke(ctx, "#8a7050", s * 0.02);
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.3, cy + s * 0.3);
  ctx.bezierCurveTo(cx - s * 0.35, cy + s * 0.15, cx - s * 0.4, cy + s * 0.35, cx - s * 0.38, cy + s * 0.42);
  ctx.stroke();
};

DRAW.poison = (ctx, s) => {
  const cx = s / 2, cy = s / 2;
  sepiaGlow(ctx, cx, cy, s * 0.4, 0.15);
  // bullet shape
  ctx.fillStyle = "#40a040";
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.25, cy);
  ctx.lineTo(cx + s * 0.05, cy - s * 0.12);
  ctx.lineTo(cx - s * 0.25, cy - s * 0.1);
  ctx.lineTo(cx - s * 0.25, cy + s * 0.1);
  ctx.lineTo(cx + s * 0.05, cy + s * 0.12);
  ctx.closePath();
  ctx.fill();
  westernStroke(ctx, "#205020", s * 0.03);
  ctx.stroke();
  // skull
  ctx.fillStyle = "#e0e0c0";
  sketchCircle(ctx, cx - s * 0.05, cy, s * 0.1);
  ctx.fill();
  westernStroke(ctx, "#303020", s * 0.02);
  ctx.stroke();
  // skull eyes
  ctx.fillStyle = "#303020";
  sketchCircle(ctx, cx - s * 0.08, cy - s * 0.02, s * 0.025);
  ctx.fill();
  sketchCircle(ctx, cx - s * 0.02, cy - s * 0.02, s * 0.025);
  ctx.fill();
};

DRAW.goldBullet = (ctx, s) => {
  const cx = s / 2, cy = s / 2;
  sepiaGlow(ctx, cx, cy, s * 0.45, 0.35);
  // large gold coin / bullet
  ctx.fillStyle = "#d4a030";
  sketchCircle(ctx, cx, cy, s * 0.3);
  ctx.fill();
  westernStroke(ctx, "#8a6020", s * 0.04);
  ctx.stroke();
  // inner ring
  westernStroke(ctx, "#b08020", s * 0.02);
  sketchCircle(ctx, cx, cy, s * 0.2);
  ctx.stroke();
  // dollar sign
  ctx.fillStyle = "#8a6020";
  ctx.font = `bold ${s * 0.3}px serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("$", cx, cy + s * 0.02);
};

DRAW.recruit = (ctx, s) => {
  const cx = s / 2, cy = s / 2;
  sepiaGlow(ctx, cx, cy, s * 0.4);
  // hat
  ctx.fillStyle = "#8a6a30";
  // brim
  ctx.beginPath();
  ctx.ellipse(cx, cy - s * 0.08, s * 0.32, s * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();
  westernStroke(ctx, "#5a4020", s * 0.03);
  ctx.stroke();
  // crown
  sketchRect(ctx, cx - s * 0.14, cy - s * 0.32, s * 0.28, s * 0.25, 0.6);
  ctx.fill(); ctx.stroke();
  // face
  ctx.fillStyle = "#d4a870";
  sketchCircle(ctx, cx, cy + s * 0.12, s * 0.14);
  ctx.fill();
  westernStroke(ctx, "#6a4a20", s * 0.02);
  ctx.stroke();
  // eyes
  ctx.fillStyle = "#3a2010";
  sketchCircle(ctx, cx - s * 0.05, cy + s * 0.09, s * 0.02);
  ctx.fill();
  sketchCircle(ctx, cx + s * 0.05, cy + s * 0.09, s * 0.02);
  ctx.fill();
  // bandana
  westernStroke(ctx, "#c03020", s * 0.03);
  sketchLine(ctx, cx - s * 0.12, cy + s * 0.2, cx + s * 0.12, cy + s * 0.2, 0.5);
};

DRAW.cannon = (ctx, s) => {
  const cx = s / 2, cy = s / 2;
  sepiaGlow(ctx, cx, cy, s * 0.45);
  // cannon body
  ctx.fillStyle = "#505050";
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.3, cy + s * 0.1);
  ctx.lineTo(cx + s * 0.25, cy - s * 0.05);
  ctx.lineTo(cx + s * 0.3, cy + s * 0.05);
  ctx.lineTo(cx - s * 0.25, cy + s * 0.2);
  ctx.closePath();
  ctx.fill();
  westernStroke(ctx, "#2a2a2a", s * 0.04);
  ctx.stroke();
  // muzzle
  ctx.fillStyle = "#3a3a3a";
  sketchCircle(ctx, cx + s * 0.28, cy, s * 0.08);
  ctx.fill(); ctx.stroke();
  // wheels
  ctx.fillStyle = "#6a4a20";
  sketchCircle(ctx, cx - s * 0.15, cy + s * 0.25, s * 0.1);
  ctx.fill();
  westernStroke(ctx, "#3a2010", s * 0.03);
  ctx.stroke();
  // fire blast
  ctx.fillStyle = "#ff8020";
  sketchCircle(ctx, cx + s * 0.38, cy - s * 0.02, s * 0.07);
  ctx.fill();
  ctx.fillStyle = "#ffe040";
  sketchCircle(ctx, cx + s * 0.38, cy - s * 0.02, s * 0.04);
  ctx.fill();
};

DRAW.bulletRain = (ctx, s) => {
  const cx = s / 2, cy = s / 2;
  sepiaGlow(ctx, cx, cy, s * 0.4);
  // multiple bullets falling
  const bullets = [
    [cx - s * 0.2, cy - s * 0.2], [cx, cy - s * 0.3], [cx + s * 0.15, cy - s * 0.15],
    [cx - s * 0.1, cy + s * 0.05], [cx + s * 0.2, cy + s * 0.1], [cx - s * 0.25, cy + s * 0.2],
  ];
  bullets.forEach(([bx, by]) => {
    ctx.fillStyle = "#c0a060";
    ctx.beginPath();
    ctx.ellipse(bx, by, s * 0.03, s * 0.06, -0.3, 0, Math.PI * 2);
    ctx.fill();
    westernStroke(ctx, "#8a6020", s * 0.015);
    ctx.stroke();
  });
  // smoke cloud at bottom
  ctx.fillStyle = "rgba(160,140,120,0.4)";
  sketchCircle(ctx, cx, cy + s * 0.3, s * 0.2);
  ctx.fill();
  sketchCircle(ctx, cx - s * 0.15, cy + s * 0.25, s * 0.12);
  ctx.fill();
};

DRAW.pirateRaid = (ctx, s) => {
  const cx = s / 2, cy = s / 2;
  sepiaGlow(ctx, cx, cy, s * 0.4, 0.2);
  // blood drop
  ctx.fillStyle = "#a02030";
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.3);
  ctx.bezierCurveTo(cx + s * 0.25, cy, cx + s * 0.2, cy + s * 0.25, cx, cy + s * 0.32);
  ctx.bezierCurveTo(cx - s * 0.2, cy + s * 0.25, cx - s * 0.25, cy, cx, cy - s * 0.3);
  ctx.closePath();
  ctx.fill();
  westernStroke(ctx, "#601020", s * 0.03);
  ctx.stroke();
  // coin inside
  ctx.fillStyle = "#d4a030";
  sketchCircle(ctx, cx, cy + s * 0.05, s * 0.1);
  ctx.fill();
  westernStroke(ctx, "#8a6020", s * 0.02);
  ctx.stroke();
};

DRAW.ricochet = (ctx, s) => {
  const cx = s / 2, cy = s / 2;
  sepiaGlow(ctx, cx, cy, s * 0.45, 0.3);
  // bullet trail - zigzag
  westernStroke(ctx, "#d4a030", s * 0.04);
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.35, cy + s * 0.2);
  ctx.lineTo(cx - s * 0.1, cy - s * 0.05);
  ctx.lineTo(cx + s * 0.1, cy + s * 0.15);
  ctx.lineTo(cx + s * 0.3, cy - s * 0.25);
  ctx.stroke();
  // impact sparks
  const sparks = [
    [cx - s * 0.1, cy - s * 0.05], [cx + s * 0.1, cy + s * 0.15],
  ];
  sparks.forEach(([sx, sy]) => {
    ctx.fillStyle = "#ffe040";
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.5;
      const len = s * 0.08;
      sketchLine(ctx, sx, sy, sx + Math.cos(a) * len, sy + Math.sin(a) * len, 0.3);
    }
    sketchCircle(ctx, sx, sy, s * 0.03);
    ctx.fill();
  });
  // bullet at tip
  ctx.fillStyle = "#c0b090";
  sketchCircle(ctx, cx + s * 0.3, cy - s * 0.25, s * 0.05);
  ctx.fill();
  westernStroke(ctx, "#6a5a40", s * 0.02);
  ctx.stroke();
};

DRAW.mine = (ctx, s) => {
  const cx = s / 2, cy = s / 2;
  sepiaGlow(ctx, cx, cy, s * 0.45, 0.3);
  // mine body
  ctx.fillStyle = "#4a4a4a";
  sketchCircle(ctx, cx, cy + s * 0.05, s * 0.22);
  ctx.fill();
  westernStroke(ctx, "#2a2a2a", s * 0.04);
  ctx.stroke();
  // spikes
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const bx = cx + Math.cos(a) * s * 0.22;
    const by = cy + s * 0.05 + Math.sin(a) * s * 0.22;
    const tx = cx + Math.cos(a) * s * 0.32;
    const ty = cy + s * 0.05 + Math.sin(a) * s * 0.32;
    westernStroke(ctx, "#3a3a3a", s * 0.03);
    sketchLine(ctx, bx, by, tx, ty, 0.3);
    ctx.fillStyle = "#5a5a5a";
    sketchCircle(ctx, tx, ty, s * 0.03);
    ctx.fill();
  }
  // explosion lines
  ctx.fillStyle = "#ff8020";
  sketchCircle(ctx, cx, cy - s * 0.3, s * 0.06);
  ctx.fill();
  ctx.fillStyle = "#ffe040";
  sketchCircle(ctx, cx, cy - s * 0.3, s * 0.03);
  ctx.fill();
};

// ─── MERCENARY ICONS ───

DRAW.sheriff = (ctx, s) => {
  const cx = s / 2, cy = s / 2;
  sepiaGlow(ctx, cx, cy, s * 0.45);
  // star badge
  ctx.fillStyle = "#d4a030";
  const pts = 5, outerR = s * 0.32, innerR = s * 0.14;
  ctx.beginPath();
  for (let i = 0; i < pts * 2; i++) {
    const a = (i / (pts * 2)) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    const x = cx + Math.cos(a) * r + (Math.random() - 0.5) * 0.8;
    const y = cy + Math.sin(a) * r + (Math.random() - 0.5) * 0.8;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  westernStroke(ctx, "#8a6020", s * 0.03);
  ctx.stroke();
  // center circle
  ctx.fillStyle = "#b08020";
  sketchCircle(ctx, cx, cy, s * 0.08);
  ctx.fill();
  westernStroke(ctx, "#6a4a10", s * 0.02);
  ctx.stroke();
};

DRAW.pirate = (ctx, s) => {
  const cx = s / 2, cy = s / 2;
  sepiaGlow(ctx, cx, cy, s * 0.4);
  // flag
  ctx.fillStyle = "#1a1a1a";
  sketchRect(ctx, cx - s * 0.25, cy - s * 0.3, s * 0.45, s * 0.35, 1);
  ctx.fill();
  westernStroke(ctx, "#404040", s * 0.03);
  ctx.stroke();
  // skull on flag
  ctx.fillStyle = "#e0e0d0";
  sketchCircle(ctx, cx - s * 0.02, cy - s * 0.18, s * 0.1);
  ctx.fill();
  // crossbones
  westernStroke(ctx, "#e0e0d0", s * 0.03);
  sketchLine(ctx, cx - s * 0.18, cy - s * 0.02, cx + s * 0.14, cy + s * 0.02, 0.5);
  sketchLine(ctx, cx + s * 0.14, cy - s * 0.02, cx - s * 0.18, cy + s * 0.02, 0.5);
  // pole
  westernStroke(ctx, "#6a5030", s * 0.04);
  sketchLine(ctx, cx - s * 0.28, cy - s * 0.4, cx - s * 0.28, cy + s * 0.4, 0.5);
};

DRAW.alchemist = (ctx, s) => {
  const cx = s / 2, cy = s / 2;
  sepiaGlow(ctx, cx, cy, s * 0.4, 0.2);
  // flask body
  ctx.fillStyle = "#80c060";
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.06, cy - s * 0.15);
  ctx.lineTo(cx - s * 0.22, cy + s * 0.2);
  ctx.quadraticCurveTo(cx, cy + s * 0.38, cx + s * 0.22, cy + s * 0.2);
  ctx.lineTo(cx + s * 0.06, cy - s * 0.15);
  ctx.closePath();
  ctx.fill();
  westernStroke(ctx, "#406030", s * 0.03);
  ctx.stroke();
  // neck
  ctx.fillStyle = "#a0d0a0";
  sketchRect(ctx, cx - s * 0.06, cy - s * 0.3, s * 0.12, s * 0.16, 0.5);
  ctx.fill();
  westernStroke(ctx, "#406030", s * 0.03);
  ctx.stroke();
  // cork
  ctx.fillStyle = "#8a6a30";
  sketchRect(ctx, cx - s * 0.07, cy - s * 0.36, s * 0.14, s * 0.08, 0.5);
  ctx.fill();
  westernStroke(ctx, "#5a4020", s * 0.02);
  ctx.stroke();
  // bubbles
  ctx.fillStyle = "rgba(200,255,150,0.6)";
  sketchCircle(ctx, cx - s * 0.08, cy + s * 0.08, s * 0.04);
  ctx.fill();
  sketchCircle(ctx, cx + s * 0.05, cy + s * 0.15, s * 0.03);
  ctx.fill();
  sketchCircle(ctx, cx, cy + s * 0.02, s * 0.025);
  ctx.fill();
};

DRAW.gunner = (ctx, s) => {
  const cx = s / 2, cy = s / 2;
  sepiaGlow(ctx, cx, cy, s * 0.45);
  // revolver
  westernStroke(ctx, "#3a3a3a", s * 0.04);
  // barrel
  ctx.fillStyle = "#606060";
  sketchRect(ctx, cx - s * 0.05, cy - s * 0.28, s * 0.1, s * 0.32, 0.5);
  ctx.fill(); ctx.stroke();
  // cylinder
  ctx.fillStyle = "#505050";
  sketchCircle(ctx, cx, cy + s * 0.02, s * 0.1);
  ctx.fill(); ctx.stroke();
  // grip
  ctx.fillStyle = "#6a4a20";
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.08, cy + s * 0.1);
  ctx.lineTo(cx - s * 0.12, cy + s * 0.35);
  ctx.lineTo(cx + s * 0.04, cy + s * 0.32);
  ctx.lineTo(cx + s * 0.06, cy + s * 0.1);
  ctx.closePath();
  ctx.fill();
  westernStroke(ctx, "#3a2010", s * 0.03);
  ctx.stroke();
  // trigger guard
  westernStroke(ctx, "#404040", s * 0.02);
  ctx.beginPath();
  ctx.arc(cx + s * 0.04, cy + s * 0.12, s * 0.06, -0.5, Math.PI + 0.5);
  ctx.stroke();
};

// ─── UI ICONS ───

DRAW.gunpowder = (ctx, s) => {
  const cx = s / 2, cy = s / 2;
  sepiaGlow(ctx, cx, cy, s * 0.45, 0.3);
  // keg
  ctx.fillStyle = "#6a4a20";
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.2, cy - s * 0.25);
  ctx.quadraticCurveTo(cx - s * 0.28, cy, cx - s * 0.2, cy + s * 0.25);
  ctx.lineTo(cx + s * 0.2, cy + s * 0.25);
  ctx.quadraticCurveTo(cx + s * 0.28, cy, cx + s * 0.2, cy - s * 0.25);
  ctx.closePath();
  ctx.fill();
  westernStroke(ctx, "#3a2010", s * 0.03);
  ctx.stroke();
  // bands
  westernStroke(ctx, "#8a6a40", s * 0.025);
  sketchLine(ctx, cx - s * 0.22, cy - s * 0.1, cx + s * 0.22, cy - s * 0.1, 0.3);
  sketchLine(ctx, cx - s * 0.22, cy + s * 0.1, cx + s * 0.22, cy + s * 0.1, 0.3);
  // skull mark
  ctx.fillStyle = "#d4a870";
  ctx.font = `${s * 0.18}px serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("☠", cx, cy);
};

DRAW.fame = (ctx, s) => {
  const cx = s / 2, cy = s / 2;
  sepiaGlow(ctx, cx, cy, s * 0.45, 0.35);
  // wanted poster style star
  ctx.fillStyle = "#e0c040";
  const pts = 6, outerR = s * 0.35, innerR = s * 0.18;
  ctx.beginPath();
  for (let i = 0; i < pts * 2; i++) {
    const a = (i / (pts * 2)) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    const x = cx + Math.cos(a) * r + (Math.random() - 0.5) * 0.6;
    const y = cy + Math.sin(a) * r + (Math.random() - 0.5) * 0.6;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  westernStroke(ctx, "#a08020", s * 0.03);
  ctx.stroke();
};

DRAW.copper = (ctx, s) => {
  const cx = s / 2, cy = s / 2;
  ctx.fillStyle = "#b07040";
  sketchCircle(ctx, cx, cy, s * 0.35);
  ctx.fill();
  westernStroke(ctx, "#6a4020", s * 0.03);
  ctx.stroke();
  ctx.fillStyle = "#8a5030";
  sketchCircle(ctx, cx, cy, s * 0.22);
  ctx.stroke();
  ctx.fillStyle = "#6a4020";
  ctx.font = `bold ${s * 0.3}px serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("c", cx, cy + s * 0.02);
};

DRAW.silver = (ctx, s) => {
  const cx = s / 2, cy = s / 2;
  ctx.fillStyle = "#c0c0c0";
  sketchCircle(ctx, cx, cy, s * 0.35);
  ctx.fill();
  westernStroke(ctx, "#707070", s * 0.03);
  ctx.stroke();
  ctx.fillStyle = "#909090";
  sketchCircle(ctx, cx, cy, s * 0.22);
  ctx.stroke();
  ctx.fillStyle = "#606060";
  ctx.font = `bold ${s * 0.3}px serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("s", cx, cy + s * 0.02);
};

DRAW.gold = (ctx, s) => {
  const cx = s / 2, cy = s / 2;
  ctx.fillStyle = "#d4a030";
  sketchCircle(ctx, cx, cy, s * 0.35);
  ctx.fill();
  westernStroke(ctx, "#8a6020", s * 0.03);
  ctx.stroke();
  ctx.fillStyle = "#b08020";
  sketchCircle(ctx, cx, cy, s * 0.22);
  ctx.stroke();
  ctx.fillStyle = "#6a4a10";
  ctx.font = `bold ${s * 0.3}px serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("g", cx, cy + s * 0.02);
};

DRAW.save = (ctx, s) => {
  const cx = s / 2, cy = s / 2;
  sepiaGlow(ctx, cx, cy, s * 0.4);
  // floppy / scroll
  ctx.fillStyle = "#d4c0a0";
  sketchRect(ctx, cx - s * 0.28, cy - s * 0.3, s * 0.56, s * 0.6, 1);
  ctx.fill();
  westernStroke(ctx, "#8a6a40", s * 0.03);
  ctx.stroke();
  // lines of text
  westernStroke(ctx, "#8a7050", s * 0.02);
  for (let i = 0; i < 4; i++) {
    const y = cy - s * 0.15 + i * s * 0.12;
    const w = i === 3 ? s * 0.25 : s * 0.35;
    sketchLine(ctx, cx - s * 0.18, y, cx - s * 0.18 + w, y, 0.5);
  }
};

DRAW.doors = (ctx, s) => {
  const cx = s / 2, cy = s / 2;
  sepiaGlow(ctx, cx, cy, s * 0.4);
  // saloon doors
  ctx.fillStyle = "#8a6a30";
  // left door
  sketchRect(ctx, cx - s * 0.35, cy - s * 0.25, s * 0.3, s * 0.5, 0.8);
  ctx.fill();
  westernStroke(ctx, "#5a4020", s * 0.03);
  ctx.stroke();
  // right door
  sketchRect(ctx, cx + s * 0.05, cy - s * 0.25, s * 0.3, s * 0.5, 0.8);
  ctx.fill();
  ctx.stroke();
  // hinges
  ctx.fillStyle = "#d4a030";
  sketchCircle(ctx, cx - s * 0.33, cy - s * 0.1, s * 0.03);
  ctx.fill();
  sketchCircle(ctx, cx - s * 0.33, cy + s * 0.1, s * 0.03);
  ctx.fill();
  sketchCircle(ctx, cx + s * 0.33, cy - s * 0.1, s * 0.03);
  ctx.fill();
  sketchCircle(ctx, cx + s * 0.33, cy + s * 0.1, s * 0.03);
  ctx.fill();
};

DRAW.hourglass = (ctx, s) => {
  const cx = s / 2, cy = s / 2;
  sepiaGlow(ctx, cx, cy, s * 0.4);
  westernStroke(ctx, "#8a6a40", s * 0.03);
  // top
  ctx.fillStyle = "#d4c0a0";
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.22, cy - s * 0.35);
  ctx.lineTo(cx + s * 0.22, cy - s * 0.35);
  ctx.lineTo(cx + s * 0.04, cy);
  ctx.lineTo(cx - s * 0.04, cy);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // bottom
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.04, cy);
  ctx.lineTo(cx + s * 0.04, cy);
  ctx.lineTo(cx + s * 0.22, cy + s * 0.35);
  ctx.lineTo(cx - s * 0.22, cy + s * 0.35);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // sand
  ctx.fillStyle = "#d4a030";
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.04, cy);
  ctx.lineTo(cx + s * 0.04, cy);
  ctx.lineTo(cx + s * 0.15, cy + s * 0.25);
  ctx.lineTo(cx - s * 0.15, cy + s * 0.25);
  ctx.closePath();
  ctx.fill();
  // bars
  westernStroke(ctx, "#6a4a20", s * 0.04);
  sketchLine(ctx, cx - s * 0.25, cy - s * 0.35, cx + s * 0.25, cy - s * 0.35, 0.3);
  sketchLine(ctx, cx - s * 0.25, cy + s * 0.35, cx + s * 0.25, cy + s * 0.35, 0.3);
};

DRAW.treasure = (ctx, s) => {
  const cx = s / 2, cy = s / 2;
  sepiaGlow(ctx, cx, cy, s * 0.45, 0.3);
  // chest
  ctx.fillStyle = "#8a5a20";
  sketchRect(ctx, cx - s * 0.3, cy - s * 0.05, s * 0.6, s * 0.35, 1);
  ctx.fill();
  westernStroke(ctx, "#5a3010", s * 0.03);
  ctx.stroke();
  // lid
  ctx.fillStyle = "#9a6a30";
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.3, cy - s * 0.05);
  ctx.quadraticCurveTo(cx, cy - s * 0.35, cx + s * 0.3, cy - s * 0.05);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // lock
  ctx.fillStyle = "#d4a030";
  sketchCircle(ctx, cx, cy + s * 0.08, s * 0.06);
  ctx.fill();
  westernStroke(ctx, "#8a6020", s * 0.02);
  ctx.stroke();
  // gems peeking out
  ctx.fillStyle = "#40c040";
  sketchCircle(ctx, cx - s * 0.12, cy - s * 0.08, s * 0.04);
  ctx.fill();
  ctx.fillStyle = "#ff4040";
  sketchCircle(ctx, cx + s * 0.1, cy - s * 0.1, s * 0.035);
  ctx.fill();
};

DRAW.wantedList = (ctx, s) => {
  const cx = s / 2, cy = s / 2;
  sepiaGlow(ctx, cx, cy, s * 0.4);
  // poster
  ctx.fillStyle = "#d4c0a0";
  sketchRect(ctx, cx - s * 0.3, cy - s * 0.35, s * 0.6, s * 0.7, 1.2);
  ctx.fill();
  westernStroke(ctx, "#8a6a40", s * 0.03);
  ctx.stroke();
  // "WANTED" text
  ctx.fillStyle = "#5a2010";
  ctx.font = `bold ${s * 0.14}px serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("WANTED", cx, cy - s * 0.2);
  // skull
  ctx.fillStyle = "#8a6a40";
  sketchCircle(ctx, cx, cy + s * 0.02, s * 0.12);
  ctx.fill();
  westernStroke(ctx, "#5a3020", s * 0.02);
  ctx.stroke();
  // eyes
  ctx.fillStyle = "#3a1010";
  sketchCircle(ctx, cx - s * 0.04, cy - s * 0.01, s * 0.025);
  ctx.fill();
  sketchCircle(ctx, cx + s * 0.04, cy - s * 0.01, s * 0.025);
  ctx.fill();
  // reward
  ctx.fillStyle = "#5a2010";
  ctx.font = `bold ${s * 0.09}px serif`;
  ctx.fillText("$$$", cx, cy + s * 0.22);
};

DRAW.shop = (ctx, s) => {
  const cx = s / 2, cy = s / 2;
  sepiaGlow(ctx, cx, cy, s * 0.4);
  // barrel
  ctx.fillStyle = "#8a6a30";
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.22, cy - s * 0.3);
  ctx.quadraticCurveTo(cx - s * 0.3, cy, cx - s * 0.22, cy + s * 0.3);
  ctx.lineTo(cx + s * 0.22, cy + s * 0.3);
  ctx.quadraticCurveTo(cx + s * 0.3, cy, cx + s * 0.22, cy - s * 0.3);
  ctx.closePath();
  ctx.fill();
  westernStroke(ctx, "#5a3a10", s * 0.03);
  ctx.stroke();
  // bands
  westernStroke(ctx, "#a08040", s * 0.025);
  sketchLine(ctx, cx - s * 0.26, cy - s * 0.12, cx + s * 0.26, cy - s * 0.12, 0.3);
  sketchLine(ctx, cx - s * 0.26, cy + s * 0.12, cx + s * 0.26, cy + s * 0.12, 0.3);
  // coins on top
  ctx.fillStyle = "#d4a030";
  sketchCircle(ctx, cx - s * 0.08, cy - s * 0.32, s * 0.06);
  ctx.fill();
  sketchCircle(ctx, cx + s * 0.06, cy - s * 0.34, s * 0.05);
  ctx.fill();
};

DRAW.base = (ctx, s) => {
  const cx = s / 2, cy = s / 2;
  sepiaGlow(ctx, cx, cy, s * 0.45);
  // wooden shack
  ctx.fillStyle = "#7a5a20";
  sketchRect(ctx, cx - s * 0.3, cy - s * 0.1, s * 0.6, s * 0.42, 1);
  ctx.fill();
  westernStroke(ctx, "#4a3010", s * 0.03);
  ctx.stroke();
  // roof
  ctx.fillStyle = "#5a3a10";
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.38, cy - s * 0.1);
  ctx.lineTo(cx, cy - s * 0.4);
  ctx.lineTo(cx + s * 0.38, cy - s * 0.1);
  ctx.closePath();
  ctx.fill();
  westernStroke(ctx, "#3a2010", s * 0.03);
  ctx.stroke();
  // door
  ctx.fillStyle = "#5a3a10";
  sketchRect(ctx, cx - s * 0.08, cy + s * 0.05, s * 0.16, s * 0.27, 0.5);
  ctx.fill();
  westernStroke(ctx, "#3a2010", s * 0.02);
  ctx.stroke();
};

DRAW.convoy = (ctx, s) => {
  const cx = s / 2, cy = s / 2;
  sepiaGlow(ctx, cx, cy, s * 0.45);
  // wagon body
  ctx.fillStyle = "#8a6a30";
  sketchRect(ctx, cx - s * 0.32, cy - s * 0.12, s * 0.55, s * 0.22, 1);
  ctx.fill();
  westernStroke(ctx, "#5a3a10", s * 0.03);
  ctx.stroke();
  // wheels
  ctx.fillStyle = "#5a3a10";
  sketchCircle(ctx, cx - s * 0.2, cy + s * 0.2, s * 0.1);
  ctx.fill();
  westernStroke(ctx, "#3a2010", s * 0.03);
  ctx.stroke();
  sketchCircle(ctx, cx + s * 0.12, cy + s * 0.2, s * 0.1);
  ctx.fill(); ctx.stroke();
  // horse silhouette
  westernStroke(ctx, "#5a3a10", s * 0.03);
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.25, cy);
  ctx.lineTo(cx + s * 0.38, cy - s * 0.12);
  ctx.lineTo(cx + s * 0.42, cy - s * 0.2);
  ctx.moveTo(cx + s * 0.38, cy - s * 0.12);
  ctx.lineTo(cx + s * 0.38, cy + s * 0.15);
  ctx.stroke();
};

DRAW.scroll = (ctx, s) => {
  const cx = s / 2, cy = s / 2;
  sepiaGlow(ctx, cx, cy, s * 0.4);
  // scroll body
  ctx.fillStyle = "#d4c0a0";
  sketchRect(ctx, cx - s * 0.22, cy - s * 0.28, s * 0.44, s * 0.56, 1);
  ctx.fill();
  westernStroke(ctx, "#8a6a40", s * 0.03);
  ctx.stroke();
  // roll top
  ctx.fillStyle = "#c0a880";
  ctx.beginPath();
  ctx.ellipse(cx, cy - s * 0.28, s * 0.24, s * 0.06, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  // roll bottom
  ctx.beginPath();
  ctx.ellipse(cx, cy + s * 0.28, s * 0.24, s * 0.06, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  // text lines
  westernStroke(ctx, "#8a7050", s * 0.015);
  for (let i = 0; i < 4; i++) {
    const y = cy - s * 0.14 + i * s * 0.1;
    sketchLine(ctx, cx - s * 0.14, y, cx + s * 0.14, y, 0.5);
  }
};

DRAW.soundOn = (ctx, s) => {
  const cx = s / 2, cy = s / 2;
  // speaker
  ctx.fillStyle = "#d4a030";
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.15, cy - s * 0.1);
  ctx.lineTo(cx - s * 0.05, cy - s * 0.1);
  ctx.lineTo(cx + s * 0.1, cy - s * 0.25);
  ctx.lineTo(cx + s * 0.1, cy + s * 0.25);
  ctx.lineTo(cx - s * 0.05, cy + s * 0.1);
  ctx.lineTo(cx - s * 0.15, cy + s * 0.1);
  ctx.closePath();
  ctx.fill();
  westernStroke(ctx, "#8a6020", s * 0.025);
  ctx.stroke();
  // sound waves
  westernStroke(ctx, "#d4a030", s * 0.025);
  ctx.beginPath(); ctx.arc(cx + s * 0.15, cy, s * 0.12, -0.6, 0.6); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx + s * 0.15, cy, s * 0.22, -0.6, 0.6); ctx.stroke();
};

DRAW.soundOff = (ctx, s) => {
  const cx = s / 2, cy = s / 2;
  // speaker
  ctx.fillStyle = "#6a5a40";
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.15, cy - s * 0.1);
  ctx.lineTo(cx - s * 0.05, cy - s * 0.1);
  ctx.lineTo(cx + s * 0.1, cy - s * 0.25);
  ctx.lineTo(cx + s * 0.1, cy + s * 0.25);
  ctx.lineTo(cx - s * 0.05, cy + s * 0.1);
  ctx.lineTo(cx - s * 0.15, cy + s * 0.1);
  ctx.closePath();
  ctx.fill();
  westernStroke(ctx, "#4a3a20", s * 0.025);
  ctx.stroke();
  // X
  westernStroke(ctx, "#a03020", s * 0.03);
  sketchLine(ctx, cx + s * 0.15, cy - s * 0.12, cx + s * 0.32, cy + s * 0.12, 0.5);
  sketchLine(ctx, cx + s * 0.32, cy - s * 0.12, cx + s * 0.15, cy + s * 0.12, 0.5);
};

// ─── BOSS ICONS ───

DRAW.bull = (ctx, s) => {
  const cx = s / 2, cy = s / 2;
  sepiaGlow(ctx, cx, cy, s * 0.45);
  // head
  ctx.fillStyle = "#6a3a10";
  sketchCircle(ctx, cx, cy, s * 0.22);
  ctx.fill();
  westernStroke(ctx, "#3a2010", s * 0.03);
  ctx.stroke();
  // horns
  westernStroke(ctx, "#d4c0a0", s * 0.04);
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.18, cy - s * 0.1);
  ctx.quadraticCurveTo(cx - s * 0.35, cy - s * 0.35, cx - s * 0.28, cy - s * 0.38);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.18, cy - s * 0.1);
  ctx.quadraticCurveTo(cx + s * 0.35, cy - s * 0.35, cx + s * 0.28, cy - s * 0.38);
  ctx.stroke();
  // nose ring
  ctx.fillStyle = "#d4a030";
  ctx.beginPath();
  ctx.arc(cx, cy + s * 0.12, s * 0.06, 0.3, Math.PI - 0.3);
  ctx.stroke();
  // eyes
  ctx.fillStyle = "#ff3020";
  sketchCircle(ctx, cx - s * 0.08, cy - s * 0.04, s * 0.035);
  ctx.fill();
  sketchCircle(ctx, cx + s * 0.08, cy - s * 0.04, s * 0.035);
  ctx.fill();
};

DRAW.baron = (ctx, s) => {
  const cx = s / 2, cy = s / 2;
  sepiaGlow(ctx, cx, cy, s * 0.4);
  // top hat
  ctx.fillStyle = "#1a1a1a";
  sketchRect(ctx, cx - s * 0.15, cy - s * 0.42, s * 0.3, s * 0.32, 0.8);
  ctx.fill();
  westernStroke(ctx, "#404040", s * 0.03);
  ctx.stroke();
  // brim
  ctx.beginPath();
  ctx.ellipse(cx, cy - s * 0.1, s * 0.28, s * 0.06, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  // hat band
  westernStroke(ctx, "#a03020", s * 0.03);
  sketchLine(ctx, cx - s * 0.15, cy - s * 0.12, cx + s * 0.15, cy - s * 0.12, 0.3);
  // monocle
  westernStroke(ctx, "#d4a030", s * 0.02);
  sketchCircle(ctx, cx + s * 0.12, cy + s * 0.12, s * 0.06);
  ctx.stroke();
  // mustache
  westernStroke(ctx, "#2a2a2a", s * 0.03);
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.15, cy + s * 0.2);
  ctx.quadraticCurveTo(cx, cy + s * 0.15, cx + s * 0.15, cy + s * 0.2);
  ctx.stroke();
};

DRAW.kraken = (ctx, s) => {
  const cx = s / 2, cy = s / 2;
  sepiaGlow(ctx, cx, cy, s * 0.45, 0.2);
  // head
  ctx.fillStyle = "#406060";
  sketchCircle(ctx, cx, cy - s * 0.1, s * 0.2);
  ctx.fill();
  westernStroke(ctx, "#203030", s * 0.03);
  ctx.stroke();
  // eyes
  ctx.fillStyle = "#ff6020";
  sketchCircle(ctx, cx - s * 0.07, cy - s * 0.14, s * 0.04);
  ctx.fill();
  sketchCircle(ctx, cx + s * 0.07, cy - s * 0.14, s * 0.04);
  ctx.fill();
  // tentacles
  westernStroke(ctx, "#507070", s * 0.035);
  const angles = [-0.8, -0.3, 0.3, 0.8];
  angles.forEach(a => {
    ctx.beginPath();
    const startX = cx + Math.sin(a) * s * 0.15;
    ctx.moveTo(startX, cy + s * 0.05);
    ctx.quadraticCurveTo(
      cx + Math.sin(a) * s * 0.35, cy + s * 0.15,
      cx + Math.sin(a * 1.5) * s * 0.3, cy + s * 0.38
    );
    ctx.stroke();
  });
};

DRAW.ghost = (ctx, s) => {
  const cx = s / 2, cy = s / 2;
  sepiaGlow(ctx, cx, cy, s * 0.4, 0.15);
  // ghostly body
  ctx.fillStyle = "rgba(180,200,220,0.5)";
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.22, cy + s * 0.3);
  ctx.quadraticCurveTo(cx - s * 0.28, cy - s * 0.15, cx, cy - s * 0.35);
  ctx.quadraticCurveTo(cx + s * 0.28, cy - s * 0.15, cx + s * 0.22, cy + s * 0.3);
  // wavy bottom
  for (let i = 0; i < 4; i++) {
    const x = cx + s * 0.22 - i * s * 0.11;
    ctx.quadraticCurveTo(x - s * 0.03, cy + s * (i % 2 === 0 ? 0.22 : 0.35), x - s * 0.11, cy + s * 0.3);
  }
  ctx.closePath();
  ctx.fill();
  westernStroke(ctx, "rgba(100,120,140,0.6)", s * 0.025);
  ctx.stroke();
  // eyes
  ctx.fillStyle = "#40e0ff";
  sketchCircle(ctx, cx - s * 0.08, cy - s * 0.08, s * 0.04);
  ctx.fill();
  sketchCircle(ctx, cx + s * 0.08, cy - s * 0.08, s * 0.04);
  ctx.fill();
  // pirate hat outline
  westernStroke(ctx, "rgba(100,120,140,0.4)", s * 0.02);
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.2, cy - s * 0.25);
  ctx.quadraticCurveTo(cx, cy - s * 0.45, cx + s * 0.2, cy - s * 0.25);
  ctx.stroke();
};

DRAW.emperor = (ctx, s) => {
  const cx = s / 2, cy = s / 2;
  sepiaGlow(ctx, cx, cy, s * 0.45, 0.4);
  // gem
  ctx.fillStyle = "#40c0ff";
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.3);
  ctx.lineTo(cx + s * 0.25, cy);
  ctx.lineTo(cx + s * 0.15, cy + s * 0.25);
  ctx.lineTo(cx - s * 0.15, cy + s * 0.25);
  ctx.lineTo(cx - s * 0.25, cy);
  ctx.closePath();
  ctx.fill();
  westernStroke(ctx, "#2080a0", s * 0.03);
  ctx.stroke();
  // facets
  westernStroke(ctx, "rgba(255,255,255,0.4)", s * 0.015);
  sketchLine(ctx, cx, cy - s * 0.3, cx - s * 0.15, cy + s * 0.25, 0.3);
  sketchLine(ctx, cx, cy - s * 0.3, cx + s * 0.15, cy + s * 0.25, 0.3);
  sketchLine(ctx, cx - s * 0.25, cy, cx + s * 0.25, cy, 0.3);
  // sparkle
  ctx.fillStyle = "#fff";
  sketchCircle(ctx, cx - s * 0.08, cy - s * 0.1, s * 0.03);
  ctx.fill();
};

/* ── Mapping from icon name → draw function ─────────── */

export const ICON_MAP = {
  // Spells / Actions
  dynamite: DRAW.dynamite,
  sniper: DRAW.sniper,
  harpoon: DRAW.harpoon,
  poison: DRAW.poison,
  goldBullet: DRAW.goldBullet,
  recruit: DRAW.recruit,
  cannon: DRAW.cannon,
  bulletRain: DRAW.bulletRain,
  pirateRaid: DRAW.pirateRaid,
  ricochet: DRAW.ricochet,
  mine: DRAW.mine,
  // Mercenaries
  sheriff: DRAW.sheriff,
  pirate: DRAW.pirate,
  alchemist: DRAW.alchemist,
  gunner: DRAW.gunner,
  // UI
  gunpowder: DRAW.gunpowder,
  fame: DRAW.fame,
  copper: DRAW.copper,
  silver: DRAW.silver,
  gold: DRAW.gold,
  save: DRAW.save,
  doors: DRAW.doors,
  hourglass: DRAW.hourglass,
  treasure: DRAW.treasure,
  wantedList: DRAW.wantedList,
  shop: DRAW.shop,
  base: DRAW.base,
  convoy: DRAW.convoy,
  scroll: DRAW.scroll,
  soundOn: DRAW.soundOn,
  soundOff: DRAW.soundOff,
  // Bosses
  bull: DRAW.bull,
  baron: DRAW.baron,
  kraken: DRAW.kraken,
  ghost: DRAW.ghost,
  emperor: DRAW.emperor,
};

/** spell ID → icon name mapping */
export const SPELL_ICON_MAP = {
  fireball: "dynamite",
  lightning: "sniper",
  icelance: "harpoon",
  shadowbolt: "poison",
  holybeam: "goldBullet",
  summon: "recruit",
  meteor: "cannon",
  blizzard: "bulletRain",
  drain: "pirateRaid",
  chainlightning: "ricochet",
  earthquake: "mine",
};

/** mercenary type → icon name */
export const MERC_ICON_MAP = {
  knight: "sheriff",
  rogue: "pirate",
  mage: "alchemist",
  archer: "gunner",
};

/** boss index → icon name */
export const BOSS_ICON_MAP = {
  0: "bull",
  1: "baron",
  2: "kraken",
  3: "ghost",
  4: "emperor",
};

/**
 * Get a data-URL for a given icon at the requested size.
 * Results are cached so each (name, size) pair is drawn only once.
 */
export function getIconUrl(name, size = 32) {
  const key = `${name}_${size}`;
  if (_cache[key]) return _cache[key];
  const drawFn = ICON_MAP[name];
  if (!drawFn) return null;
  const [cvs, ctx] = _canvas(size);
  // use a deterministic seed per icon so the "hand-drawn" jitter is stable
  const _origRandom = Math.random;
  let _seed = 0;
  for (let i = 0; i < name.length; i++) _seed += name.charCodeAt(i) * (i + 1);
  _seed = (_seed * 9301 + 49297) % 233280;
  Math.random = () => { _seed = (_seed * 9301 + 49297) % 233280; return _seed / 233280; };
  try { drawFn(ctx, size); } finally { Math.random = _origRandom; }
  const url = cvs.toDataURL();
  _cache[key] = url;
  return url;
}

/**
 * Get icon URL for a spell by its ID.
 */
export function getSpellIconUrl(spellId, size = 32) {
  return getIconUrl(SPELL_ICON_MAP[spellId], size);
}
