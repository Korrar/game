// TDD Tests for ProgressiveDamage — visual damage stages for obstacles
import { describe, it, expect } from "vitest";
import {
  getDamageStage,
  getDamageVisuals,
  getLeakParticles,
  DAMAGE_STAGES,
} from "../ProgressiveDamage.js";

describe("DAMAGE_STAGES", () => {
  it("defines at least 3 stages", () => {
    expect(DAMAGE_STAGES.length).toBeGreaterThanOrEqual(3);
  });

  it("stages are sorted by threshold ascending", () => {
    for (let i = 1; i < DAMAGE_STAGES.length; i++) {
      expect(DAMAGE_STAGES[i].threshold).toBeGreaterThan(DAMAGE_STAGES[i - 1].threshold);
    }
  });

  it("each stage has threshold and name", () => {
    DAMAGE_STAGES.forEach(s => {
      expect(s).toHaveProperty("threshold");
      expect(s).toHaveProperty("name");
      expect(s.threshold).toBeGreaterThanOrEqual(0);
      expect(s.threshold).toBeLessThanOrEqual(1);
    });
  });
});

describe("getDamageStage", () => {
  it("returns 'pristine' at full HP", () => {
    expect(getDamageStage(1.0).name).toBe("pristine");
  });

  it("returns 'scratched' at ~75% HP", () => {
    expect(getDamageStage(0.75).name).toBe("scratched");
  });

  it("returns 'cracked' at ~50% HP", () => {
    expect(getDamageStage(0.5).name).toBe("cracked");
  });

  it("returns 'broken' at ~25% HP", () => {
    expect(getDamageStage(0.25).name).toBe("broken");
  });

  it("returns 'critical' at very low HP", () => {
    expect(getDamageStage(0.05).name).toBe("critical");
  });

  it("handles 0 HP", () => {
    const stage = getDamageStage(0);
    expect(stage.name).toBe("critical");
  });

  it("handles edge cases (> 1.0, < 0)", () => {
    expect(getDamageStage(1.5).name).toBe("pristine");
    expect(getDamageStage(-0.1).name).toBe("critical");
  });
});

describe("getDamageVisuals", () => {
  it("returns visual properties for a damage ratio and material", () => {
    const v = getDamageVisuals(0.5, "wood");
    expect(v).toHaveProperty("crackOpacity");
    expect(v).toHaveProperty("darkenAmount");
    expect(v).toHaveProperty("shakeIntensity");
    expect(v).toHaveProperty("crackPattern");
  });

  it("pristine obstacles have no cracks", () => {
    const v = getDamageVisuals(1.0, "stone");
    expect(v.crackOpacity).toBe(0);
    expect(v.darkenAmount).toBe(0);
  });

  it("more damaged = more cracks and darkening", () => {
    const light = getDamageVisuals(0.8, "wood");
    const heavy = getDamageVisuals(0.2, "wood");
    expect(heavy.crackOpacity).toBeGreaterThan(light.crackOpacity);
    expect(heavy.darkenAmount).toBeGreaterThan(light.darkenAmount);
  });

  it("crack pattern differs by material", () => {
    const wood = getDamageVisuals(0.3, "wood");
    const stone = getDamageVisuals(0.3, "stone");
    const ice = getDamageVisuals(0.3, "ice");
    // At least some materials should have different patterns
    const patterns = new Set([wood.crackPattern, stone.crackPattern, ice.crackPattern]);
    expect(patterns.size).toBeGreaterThan(1);
  });

  it("values stay in valid ranges", () => {
    for (const ratio of [0, 0.25, 0.5, 0.75, 1.0]) {
      const v = getDamageVisuals(ratio, "wood");
      expect(v.crackOpacity).toBeGreaterThanOrEqual(0);
      expect(v.crackOpacity).toBeLessThanOrEqual(1);
      expect(v.darkenAmount).toBeGreaterThanOrEqual(0);
      expect(v.darkenAmount).toBeLessThanOrEqual(1);
    }
  });
});

describe("getLeakParticles", () => {
  it("returns null for high HP obstacles", () => {
    expect(getLeakParticles(0.8, "wood")).toBeNull();
  });

  it("returns particle config for low HP wood (smoldering)", () => {
    const p = getLeakParticles(0.15, "wood");
    expect(p).not.toBeNull();
    expect(p).toHaveProperty("type");
    expect(p).toHaveProperty("color");
    expect(p).toHaveProperty("rate");
    expect(p.type).toBe("smoke");
  });

  it("returns crumble particles for low HP stone", () => {
    const p = getLeakParticles(0.15, "stone");
    expect(p).not.toBeNull();
    expect(p.type).toBe("crumble");
  });

  it("returns drip particles for low HP ice", () => {
    const p = getLeakParticles(0.15, "ice");
    expect(p).not.toBeNull();
    expect(p.type).toBe("drip");
  });

  it("rate increases as HP decreases", () => {
    const mid = getLeakParticles(0.2, "wood");
    const low = getLeakParticles(0.05, "wood");
    if (mid && low) {
      expect(low.rate).toBeGreaterThanOrEqual(mid.rate);
    }
  });
});
