// DamageNumbers — floating damage numbers with glow effects and elastic bounce
import { Container, Text, TextStyle } from "pixi.js";
import { wrapPxToScreen } from "../utils/panoramaWrap.js";
import { worldToScreen, ISO_CONFIG } from "../utils/isometricUtils.js";

const ELEMENT_COLORS = {
  fire: "#ff6030",
  ice: "#60c0ff",
  lightning: "#ffe040",
  poison: "#44ff44",
  shadow: "#a050e0",
  holy: "#ffe080",
  melee: "#ff4040",
  default: "#ff4040",
};

// Per-element drop shadow colors for visual depth
const ELEMENT_SHADOWS = {
  fire:      "#cc2200",
  ice:       "#0060cc",
  lightning: "#cc8800",
  poison:    "#006600",
  shadow:    "#440080",
  holy:      "#cc9900",
  melee:     "#880000",
  default:   "#880000",
};

// Crit style — gold with fiery orange glow
const CRIT_STYLE = new TextStyle({
  fontSize: 26,
  fontWeight: "bold",
  fontFamily: "'Segoe UI', Arial, monospace",
  fill: ["#ffffff", "#ffdd40", "#ff8800"],
  fillGradientType: 0,
  stroke: { color: "#000000", width: 4 },
  dropShadow: {
    color: "#ff6600",
    blur: 10,
    distance: 0,
    alpha: 0.9,
  },
});

// Cache normal styles per element color
const _styleCache = {};
function getNormalStyle(element) {
  const color = ELEMENT_COLORS[element] || ELEMENT_COLORS.default;
  const shadow = ELEMENT_SHADOWS[element] || ELEMENT_SHADOWS.default;
  const key = element;
  if (_styleCache[key]) return _styleCache[key];
  const style = new TextStyle({
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: "'Segoe UI', Arial, monospace",
    fill: color,
    stroke: { color: "#000000", width: 2.5 },
    dropShadow: {
      color: shadow,
      blur: 5,
      distance: 1,
      alpha: 0.7,
    },
  });
  _styleCache[key] = style;
  return style;
}

// Element-specific large styles for big hits (>50 damage)
const _bigStyleCache = {};
function getBigStyle(element) {
  const color = ELEMENT_COLORS[element] || ELEMENT_COLORS.default;
  const shadow = ELEMENT_SHADOWS[element] || ELEMENT_SHADOWS.default;
  const key = "big_" + element;
  if (_bigStyleCache[key]) return _bigStyleCache[key];
  const style = new TextStyle({
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: "'Segoe UI', Arial, monospace",
    fill: [color, "#ffffff"],
    fillGradientType: 0,
    stroke: { color: "#000000", width: 3 },
    dropShadow: {
      color: shadow,
      blur: 7,
      distance: 0,
      alpha: 0.85,
    },
  });
  _bigStyleCache[key] = style;
  return style;
}

const MAX_DAMAGE_NUMBERS = 35;

// Elastic bounce: scale = 1 + A * e^(-damping * t) * cos(freq * t)
function elasticScale(age, maxAge, isCrit) {
  const A = isCrit ? 0.55 : 0.30;
  const damping = isCrit ? 8 : 10;
  const freq = isCrit ? 18 : 14;
  const t = age / maxAge;
  return 1 + A * Math.exp(-damping * t) * Math.cos(freq * t);
}

export class DamageNumbers {
  constructor(layer) {
    this.layer = layer;
    this.numbers = [];
    this._comboTracker = { lastTime: 0, count: 0, x: 0, y: 0 };
  }

  spawn(x, y, amount, element, isCrit = false) {
    // Cap active damage numbers
    if (this.numbers.length >= MAX_DAMAGE_NUMBERS) {
      const oldest = this.numbers.shift();
      this.layer.removeChild(oldest.text);
      oldest.text.destroy();
    }

    const isBig = amount >= 50;
    let text, style;
    if (isCrit) {
      text = `${amount}!`;
      style = CRIT_STYLE;
    } else if (isBig) {
      text = `${amount}`;
      style = getBigStyle(element);
    } else {
      text = `${amount}`;
      style = getNormalStyle(element);
    }

    const textObj = new Text({ text, style });
    textObj.anchor.set(0.5, 0.5);
    const worldX = x + (Math.random() - 0.5) * 22;
    textObj.position.set(worldX, y - 10);

    // Start bounced-up scale
    const initScale = isCrit ? 1.5 : 1.2;
    textObj.scale.set(initScale);

    this.layer.addChild(textObj);

    const maxLife = isCrit ? 60 : isBig ? 48 : 38;
    this.numbers.push({
      text: textObj,
      worldX,
      worldY: y,
      vy: isCrit ? -2.8 : -2.2,
      life: maxLife,
      maxLife,
      age: 0,
      isCrit,
      isBig,
      element,
    });
  }

  // Combo: call after each hit to detect rapid multi-hits
  spawnCombo(x, y, comboCount) {
    if (this.numbers.length >= MAX_DAMAGE_NUMBERS) return;
    const style = new TextStyle({
      fontSize: 14,
      fontWeight: "bold",
      fontFamily: "'Segoe UI', Arial, monospace",
      fill: "#ffcc00",
      stroke: { color: "#000000", width: 2 },
      dropShadow: { color: "#ff6600", blur: 6, distance: 0, alpha: 0.8 },
    });
    const textObj = new Text({ text: `x${comboCount} COMBO`, style });
    textObj.anchor.set(0.5, 0.5);
    const worldX = x + (Math.random() - 0.5) * 16;
    textObj.position.set(worldX, y - 40);
    this.layer.addChild(textObj);
    const maxLife = 50;
    this.numbers.push({
      text: textObj,
      worldX,
      worldY: y - 30,
      vy: -1.5,
      life: maxLife,
      maxLife,
      age: 0,
      isCrit: false,
      isBig: false,
      element: "holy",
    });
  }

  _updateEntry(n, screenX) {
    n.text.position.y += n.vy;
    n.vy *= 0.95;
    n.life--;
    n.age++;

    if (screenX !== null) {
      n.text.position.x = screenX;
      n.text.visible = true;
    } else {
      n.text.visible = false;
    }

    // Elastic bounce scale
    const scale = elasticScale(n.age, n.maxLife, n.isCrit);
    n.text.scale.set(scale);

    // Alpha fade in last 30% of life
    const lifeRatio = n.life / n.maxLife;
    n.text.alpha = lifeRatio > 0.3 ? 1 : lifeRatio / 0.3;
  }

  update(panOffset = 0, gameW = 1280) {
    for (let i = this.numbers.length - 1; i >= 0; i--) {
      const n = this.numbers[i];
      const screenX = wrapPxToScreen(n.worldX, panOffset, gameW);
      this._updateEntry(n, screenX);

      if (n.life <= 0) {
        this.layer.removeChild(n.text);
        n.text.destroy();
        this.numbers.splice(i, 1);
      }
    }
  }

  updateIso(cameraX, cameraY, gameW = 1280) {
    for (let i = this.numbers.length - 1; i >= 0; i--) {
      const n = this.numbers[i];
      if (n._floatY === undefined) n._floatY = -10;
      n._floatY += n.vy;

      const wx = n.wx ?? (n.worldX / gameW) * ISO_CONFIG.MAP_COLS;
      const wy = n.wy ?? ((n.worldY ?? (ISO_CONFIG.GAME_H / 2)) / ISO_CONFIG.GAME_H) * ISO_CONFIG.MAP_ROWS;
      const screen = worldToScreen(wx, wy, cameraX, cameraY);
      n.text.position.x = screen.x;
      n.text.position.y = screen.y + n._floatY;
      n.text.visible = screen.x > -50 && screen.x < gameW + 50;

      n.life--;
      n.age = (n.age || 0) + 1;
      n.vy *= 0.95;

      const scale = elasticScale(n.age, n.maxLife, n.isCrit);
      n.text.scale.set(scale);

      const lifeRatio = n.life / n.maxLife;
      n.text.alpha = lifeRatio > 0.3 ? 1 : lifeRatio / 0.3;

      if (n.life <= 0) {
        this.layer.removeChild(n.text);
        n.text.destroy();
        this.numbers.splice(i, 1);
      }
    }
  }
}
