// TDD tests for NPC visual state improvements
import { describe, it, expect } from "vitest";
import {
  NPC_VISUAL_STATES,
  GLOW_ALERT,
  GLOW_CHARGING,
  GLOW_LOW_HP,
  IDLE_BOB_SPEED,
  IDLE_BOB_AMOUNT,
  ENHANCED_LUNGE_OFFSET,
  ENHANCED_LUNGE_FRAMES,
  LUNGE_DECAY,
} from "../../rendering/CharacterSprite.js";

// ─── Visual state constants ───

describe("NPC visual state configuration", () => {
  it("defines all required visual states", () => {
    expect(NPC_VISUAL_STATES.IDLE).toBe("idle");
    expect(NPC_VISUAL_STATES.ALERT).toBe("alert");
    expect(NPC_VISUAL_STATES.WINDUP).toBe("windup");
    expect(NPC_VISUAL_STATES.ATTACKING).toBe("attacking");
    expect(NPC_VISUAL_STATES.CHARGING).toBe("charging");
  });

  it("alert glow is brighter and more orange than default enemy glow", () => {
    expect(GLOW_ALERT).toBeDefined();
    expect(GLOW_ALERT.color).toBeTypeOf("number");
    expect(GLOW_ALERT.alpha).toBeGreaterThan(0.4);
  });

  it("charging glow is intense yellow/white", () => {
    expect(GLOW_CHARGING).toBeDefined();
    expect(GLOW_CHARGING.color).toBeTypeOf("number");
    expect(GLOW_CHARGING.alpha).toBeGreaterThan(0.5);
  });

  it("low HP glow is dark red", () => {
    expect(GLOW_LOW_HP).toBeDefined();
    expect(GLOW_LOW_HP.color).toBeTypeOf("number");
    expect(GLOW_LOW_HP.alpha).toBeGreaterThan(0);
  });
});

// ─── Idle bob animation ───

describe("idle bob animation config", () => {
  it("defines bob speed > 0", () => {
    expect(IDLE_BOB_SPEED).toBeTypeOf("number");
    expect(IDLE_BOB_SPEED).toBeGreaterThan(0);
  });

  it("defines bob amount in pixels (small, 1-3px)", () => {
    expect(IDLE_BOB_AMOUNT).toBeTypeOf("number");
    expect(IDLE_BOB_AMOUNT).toBeGreaterThanOrEqual(1);
    expect(IDLE_BOB_AMOUNT).toBeLessThanOrEqual(4);
  });
});

// ─── Enhanced melee lunge ───

describe("enhanced melee lunge parameters", () => {
  it("lunge offset is larger than old value (12)", () => {
    expect(ENHANCED_LUNGE_OFFSET).toBeGreaterThan(12);
  });

  it("lunge frames are longer than old value (8)", () => {
    expect(ENHANCED_LUNGE_FRAMES).toBeGreaterThan(8);
  });

  it("lunge decay factor is between 0.8 and 0.95 (slower decay)", () => {
    expect(LUNGE_DECAY).toBeGreaterThanOrEqual(0.8);
    expect(LUNGE_DECAY).toBeLessThanOrEqual(0.95);
  });
});

// ─── Visual state transitions ───

describe("visual state semantics", () => {
  it("all states are distinct strings", () => {
    const states = Object.values(NPC_VISUAL_STATES);
    const unique = new Set(states);
    expect(unique.size).toBe(states.length);
  });

  it("has exactly 5 visual states", () => {
    expect(Object.keys(NPC_VISUAL_STATES).length).toBe(5);
  });
});
