// DamageNumbers — floating damage numbers with glow effects
import { Container, Text, TextStyle } from "pixi.js";

const ELEMENT_COLORS = {
  fire: "#ff6030",
  ice: "#60c0ff",
  lightning: "#ffe040",
  shadow: "#a050e0",
  holy: "#ffe080",
  melee: "#ff4040",
  default: "#ff4040",
};

const CRIT_STYLE = new TextStyle({
  fontSize: 22,
  fontWeight: "bold",
  fontFamily: "'Segoe UI', monospace",
  fill: "#ffdd40",
  stroke: { color: "#000000", width: 3 },
  dropShadow: {
    color: "#ffaa00",
    blur: 8,
    distance: 0,
  },
});

// Cache normal styles per element color to avoid allocations per spawn
const _styleCache = {};
function getNormalStyle(color) {
  if (_styleCache[color]) return _styleCache[color];
  const style = new TextStyle({
    fontSize: 15,
    fontWeight: "bold",
    fontFamily: "'Segoe UI', monospace",
    fill: color,
    stroke: { color: "#000000", width: 2 },
  });
  _styleCache[color] = style;
  return style;
}

const MAX_DAMAGE_NUMBERS = 30;

export class DamageNumbers {
  constructor(layer) {
    this.layer = layer;
    this.numbers = [];
  }

  spawn(x, y, amount, element, isCrit = false) {
    // Cap active damage numbers to prevent accumulation
    if (this.numbers.length >= MAX_DAMAGE_NUMBERS) {
      const oldest = this.numbers.shift();
      this.layer.removeChild(oldest.text);
      oldest.text.destroy();
    }

    const color = ELEMENT_COLORS[element] || ELEMENT_COLORS.default;
    const text = isCrit ? `${amount}!` : `${amount}`;
    const style = isCrit ? CRIT_STYLE : getNormalStyle(color);

    const textObj = new Text({ text, style });
    textObj.anchor.set(0.5, 0.5);
    textObj.position.set(x + (Math.random() - 0.5) * 20, y - 10);

    this.layer.addChild(textObj);
    this.numbers.push({
      text: textObj,
      vy: -2 - (isCrit ? 1 : 0),
      life: isCrit ? 50 : 35,
      maxLife: isCrit ? 50 : 35,
      isCrit,
    });
  }

  update() {
    for (let i = this.numbers.length - 1; i >= 0; i--) {
      const n = this.numbers[i];
      n.text.position.y += n.vy;
      n.vy *= 0.96; // decelerate
      n.life--;

      const lifeRatio = n.life / n.maxLife;
      n.text.alpha = lifeRatio > 0.3 ? 1 : lifeRatio / 0.3;

      // Scale up for crits
      if (n.isCrit && lifeRatio > 0.8) {
        const scale = 1 + (1 - (lifeRatio - 0.8) / 0.2) * 0.3;
        n.text.scale.set(scale);
      }

      if (n.life <= 0) {
        this.layer.removeChild(n.text);
        n.text.destroy();
        this.numbers.splice(i, 1);
      }
    }
  }
}
