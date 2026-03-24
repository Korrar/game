// DestructionCombo — tracks rapid destruction chains for combo bonuses
// Destroying multiple obstacles quickly increases damage and loot multipliers
// Visual feedback escalates with combo level

export const COMBO_CONFIG = {
  comboWindow: 3000,        // ms window to chain another destruction
  maxCombo: 10,             // cap combo at 10x
  damageBonusPerLevel: 0.12, // +12% damage per combo level
  lootBonusPerLevel: 0.15,  // +15% loot per combo level
  comboDecayDelay: 1500,    // ms before combo starts decaying
  comboDecayRate: 1,        // levels lost per decay tick
  comboDecayInterval: 800,  // ms between decay ticks
};

// Combo tier thresholds and labels (Polish names)
export const COMBO_TIERS = [
  { level: 0,  label: "",                    color: "#ffffff", particleMult: 0 },
  { level: 1,  label: "Zniszczenie!",        color: "#ffcc00", particleMult: 1.0 },
  { level: 3,  label: "Demolka!",            color: "#ff8800", particleMult: 1.5 },
  { level: 5,  label: "Kataklizm!",          color: "#ff4400", particleMult: 2.0 },
  { level: 7,  label: "Apokalipsa!",         color: "#ff0044", particleMult: 2.5 },
  { level: 10, label: "TOTALNA ZAGŁADA!",    color: "#ff00ff", particleMult: 3.0 },
];

export class DestructionComboTracker {
  constructor() {
    this.comboLevel = 0;
    this.lastDestructionTime = 0;
    this.totalDestructions = 0;    // lifetime count for this room
    this.chainElements = [];       // elements used in current combo
    this.pendingMessages = [];     // UI messages to display
    this._prevTier = 0;
  }

  // Register an obstacle destruction, returns combo info
  registerDestruction(element, timestamp) {
    if (!timestamp) timestamp = Date.now();

    const elapsed = timestamp - this.lastDestructionTime;
    this.lastDestructionTime = timestamp;
    this.totalDestructions++;

    if (elapsed <= COMBO_CONFIG.comboWindow && this.comboLevel > 0) {
      // Continue combo
      this.comboLevel = Math.min(COMBO_CONFIG.maxCombo, this.comboLevel + 1);
    } else {
      // Start new combo
      this.comboLevel = 1;
      this.chainElements = [];
    }

    // Track unique elements for variety bonus
    if (element && !this.chainElements.includes(element)) {
      this.chainElements.push(element);
    }

    // Check for tier promotion
    const tier = this._getCurrentTier();
    const tierIndex = COMBO_TIERS.indexOf(tier);
    const promoted = tierIndex > this._prevTier;
    this._prevTier = tierIndex;

    if (promoted && tier.level > 0) {
      this.pendingMessages.push({
        text: `${tier.label} x${this.comboLevel}`,
        color: tier.color,
        size: 1.0 + tierIndex * 0.15,
        timestamp,
      });
    }

    return this.getComboInfo();
  }

  // Decay combo over time (call from game loop)
  update(now) {
    if (!now) now = Date.now();
    if (this.comboLevel <= 0) return;

    const elapsed = now - this.lastDestructionTime;
    if (elapsed > COMBO_CONFIG.comboDecayDelay) {
      const decayTicks = Math.floor(
        (elapsed - COMBO_CONFIG.comboDecayDelay) / COMBO_CONFIG.comboDecayInterval
      );
      const newLevel = Math.max(0, this.comboLevel - decayTicks * COMBO_CONFIG.comboDecayRate);
      if (newLevel !== this.comboLevel) {
        this.comboLevel = newLevel;
        this._prevTier = COMBO_TIERS.indexOf(this._getCurrentTier());
      }
    }
  }

  // Get current combo multipliers and info
  getComboInfo() {
    const tier = this._getCurrentTier();
    const varietyBonus = Math.min(0.3, this.chainElements.length * 0.08); // up to +30% for element variety

    return {
      level: this.comboLevel,
      damageMult: 1 + this.comboLevel * COMBO_CONFIG.damageBonusPerLevel + varietyBonus,
      lootMult: 1 + this.comboLevel * COMBO_CONFIG.lootBonusPerLevel,
      tierLabel: tier.label,
      tierColor: tier.color,
      particleMult: tier.particleMult,
      elements: [...this.chainElements],
      varietyBonus,
      totalDestructions: this.totalDestructions,
    };
  }

  // Flush pending UI messages
  flushMessages() {
    const msgs = this.pendingMessages;
    this.pendingMessages = [];
    return msgs;
  }

  // Apply combo damage bonus to a base damage value
  applyDamageBonus(baseDamage) {
    const info = this.getComboInfo();
    return Math.round(baseDamage * info.damageMult);
  }

  // Apply combo loot bonus to loot object
  applyLootBonus(loot) {
    if (!loot || Object.keys(loot).length === 0) return loot;
    const info = this.getComboInfo();
    const boosted = {};
    for (const [currency, amount] of Object.entries(loot)) {
      boosted[currency] = Math.round(amount * info.lootMult);
    }
    return boosted;
  }

  _getCurrentTier() {
    let tier = COMBO_TIERS[0];
    for (const t of COMBO_TIERS) {
      if (this.comboLevel >= t.level) tier = t;
    }
    return tier;
  }

  reset() {
    this.comboLevel = 0;
    this.lastDestructionTime = 0;
    this.totalDestructions = 0;
    this.chainElements = [];
    this.pendingMessages = [];
    this._prevTier = 0;
  }
}
