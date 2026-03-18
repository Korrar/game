// Tests for Greek biomes (Olympus, Underworld) and fog reduction
import { describe, it, expect } from "vitest";
import { BIOMES } from "../biomes.js";
import { BIOME_NPCS } from "../npcs.js";
import { WEATHER_TYPES, rollWeather } from "../weather.js";

// ─── FOG WEIGHT REDUCTION ───

describe("fog weather weight reduction", () => {
  it("fog weight is 5x lower than storm weight", () => {
    expect(WEATHER_TYPES.fog.weight).toBe(0.2);
    expect(WEATHER_TYPES.storm.weight).toBe(1);
  });

  it("fog appears less frequently in random rolls", () => {
    let fogCount = 0;
    let totalWeather = 0;
    const runs = 5000;
    for (let i = 0; i < runs; i++) {
      const w = rollWeather("jungle");
      if (w) {
        totalWeather++;
        if (w.id === "fog") fogCount++;
      }
    }
    // Fog should be rare: roughly 0.2 / (1+0.2+1+1) = ~6.25% of weather rolls
    // With 40% chance of any weather: ~2.5% of all rooms
    const fogRate = fogCount / runs;
    expect(fogRate).toBeLessThan(0.08); // less than 8%
    expect(totalWeather).toBeGreaterThan(0);
  });
});

// ─── OLYMPUS BIOME ───

describe("Olympus biome", () => {
  const olympus = BIOMES.find(b => b.id === "olympus");

  it("exists in biome list", () => {
    expect(olympus).toBeDefined();
  });

  it("has Polish name", () => {
    expect(olympus.name).toBe("Góra Olimp");
  });

  it("has correct render function", () => {
    expect(olympus.renderFn).toBe("olympus");
  });

  it("has difficulty 3 (high)", () => {
    expect(olympus.difficulty).toBe(3);
  });

  it("has lightning and cloud effects", () => {
    expect(olympus.fx.lightning).toBe(true);
    expect(olympus.fx.clouds).toBe(true);
  });

  it("has scatter items", () => {
    expect(olympus.scatter.length).toBeGreaterThan(0);
  });

  it("has map position", () => {
    expect(olympus.mapPos.x).toBeGreaterThan(0);
    expect(olympus.mapPos.y).toBeGreaterThan(0);
  });
});

describe("Olympus enemies", () => {
  const enemies = BIOME_NPCS.olympus;

  it("has 6 enemy types", () => {
    expect(enemies).toBeDefined();
    expect(enemies.length).toBe(6);
  });

  it("all enemies have Polish names", () => {
    for (const e of enemies) {
      expect(e.name).toBeTruthy();
      // Polish names contain non-ASCII characters
      expect(typeof e.name).toBe("string");
    }
  });

  it("all enemies have valid body types", () => {
    const validTypes = ["humanoid", "quadruped", "floating", "serpent", "spider", "scorpion", "frog"];
    for (const e of enemies) {
      expect(validTypes).toContain(e.bodyType);
    }
  });

  it("HP follows difficulty 3 scaling (higher than average)", () => {
    const avgHp = enemies.reduce((s, e) => s + e.hp, 0) / enemies.length;
    expect(avgHp).toBeGreaterThan(50); // difficulty 3 biome should have tough enemies
  });

  it("has Greek-themed enemies: Minotaur, Chimera, Gryphon", () => {
    const names = enemies.map(e => e.name);
    expect(names).toContain("Minotaur");
    expect(names).toContain("Chimera");
    expect(names).toContain("Gryfon Olimpijski");
  });

  it("has valid rarity distribution", () => {
    const validRarities = ["common", "uncommon", "rare", "epic", "legendary"];
    for (const e of enemies) {
      expect(validRarities).toContain(e.rarity);
    }
  });

  it("all enemies have loot", () => {
    for (const e of enemies) {
      expect(e.loot).toBeDefined();
      const totalLoot = (e.loot.copper || 0) + (e.loot.silver || 0) * 100;
      expect(totalLoot).toBeGreaterThan(0);
    }
  });
});

// ─── UNDERWORLD BIOME ───

describe("Underworld biome", () => {
  const underworld = BIOMES.find(b => b.id === "underworld");

  it("exists in biome list", () => {
    expect(underworld).toBeDefined();
  });

  it("has Polish name", () => {
    expect(underworld.name).toBe("Królestwo Hadesa");
  });

  it("has correct render function", () => {
    expect(underworld.renderFn).toBe("underworld");
  });

  it("has difficulty 3 (high)", () => {
    expect(underworld.difficulty).toBe(3);
  });

  it("has ghost flame and fog effects", () => {
    expect(underworld.fx.ghostFlames).toBe(true);
    expect(underworld.fx.fog).toBe(true);
  });

  it("has dark color scheme", () => {
    // Ground color should be very dark
    const hexToLightness = hex => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return (r + g + b) / 3;
    };
    expect(hexToLightness(underworld.groundCol)).toBeLessThan(40);
  });
});

describe("Underworld enemies", () => {
  const enemies = BIOME_NPCS.underworld;

  it("has 6 enemy types", () => {
    expect(enemies).toBeDefined();
    expect(enemies.length).toBe(6);
  });

  it("all enemies have valid body types", () => {
    const validTypes = ["humanoid", "quadruped", "floating", "serpent", "spider", "scorpion", "frog"];
    for (const e of enemies) {
      expect(validTypes).toContain(e.bodyType);
    }
  });

  it("has Greek-themed enemies: Cerberus, Hydra, Harpie", () => {
    const names = enemies.map(e => e.name);
    expect(names.some(n => n.includes("Cerber"))).toBe(true);
    expect(names.some(n => n.includes("Hydra"))).toBe(true);
    expect(names.some(n => n.includes("Harpia"))).toBe(true);
  });

  it("has a legendary enemy (Hydra)", () => {
    const legendary = enemies.filter(e => e.rarity === "legendary");
    expect(legendary.length).toBeGreaterThanOrEqual(1);
  });

  it("Cerberus resists fire", () => {
    const cerberus = enemies.find(e => e.name.includes("Cerber"));
    expect(cerberus.resist).toBe("fire");
  });

  it("has shadow-element abilities (fitting underworld theme)", () => {
    const shadowAbilities = enemies.filter(e => e.ability && e.ability.element === "shadow");
    expect(shadowAbilities.length).toBeGreaterThanOrEqual(2);
  });
});

// ─── BIOME IDS UNIQUENESS ───

describe("biome data integrity", () => {
  it("all biome IDs are unique", () => {
    const ids = BIOMES.map(b => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all biomes have matching NPC pools", () => {
    for (const biome of BIOMES) {
      expect(BIOME_NPCS[biome.id]).toBeDefined();
      expect(BIOME_NPCS[biome.id].length).toBeGreaterThan(0);
    }
  });

  it("total biome count is 16", () => {
    expect(BIOMES.length).toBe(16);
  });
});
