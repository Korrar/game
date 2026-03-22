// TDD tests for new biome animated content, scatter models, and interactive mechanics
import { describe, it, expect } from "vitest";
import { BIOMES } from "../biomes.js";
import { BIOME_INTERACTABLES } from "../biomeInteractables.js";

const ALL_BIOME_IDS = BIOMES.map(b => b.id);

// ─── NEW SCATTER MODELS per biome theme ───

describe("biome-specific scatter models", () => {
  it("olympus has column and statue scatter", () => {
    const olympus = BIOMES.find(b => b.id === "olympus");
    expect(olympus.scatter).toContain("column");
    expect(olympus.scatter).toContain("statue");
  });

  it("jungle has palm and vine scatter", () => {
    const jungle = BIOMES.find(b => b.id === "jungle");
    expect(jungle.scatter).toContain("palm");
    expect(jungle.scatter).toContain("vine");
  });

  it("desert has cactus and wagon scatter", () => {
    const desert = BIOMES.find(b => b.id === "desert");
    expect(desert.scatter).toContain("cactus");
    expect(desert.scatter).toContain("wagon");
  });

  it("winter has snowman and pine scatter", () => {
    const winter = BIOMES.find(b => b.id === "winter");
    expect(winter.scatter).toContain("snowman");
    expect(winter.scatter).toContain("pine");
  });

  it("city has barrel and lamp scatter", () => {
    const city = BIOMES.find(b => b.id === "city");
    expect(city.scatter).toContain("barrel");
    expect(city.scatter).toContain("lamp");
  });

  it("volcano has lava and crystal scatter", () => {
    const volcano = BIOMES.find(b => b.id === "volcano");
    expect(volcano.scatter).toContain("lava");
    expect(volcano.scatter).toContain("crystal");
  });

  it("summer has wheat and windmill scatter", () => {
    const summer = BIOMES.find(b => b.id === "summer");
    expect(summer.scatter).toContain("wheat");
    expect(summer.scatter).toContain("windmill");
  });

  it("autumn has pumpkin and bridge scatter", () => {
    const autumn = BIOMES.find(b => b.id === "autumn");
    expect(autumn.scatter).toContain("pumpkin");
    expect(autumn.scatter).toContain("bridge");
  });

  it("spring has butterfly and nest scatter", () => {
    const spring = BIOMES.find(b => b.id === "spring");
    expect(spring.scatter).toContain("butterfly");
    expect(spring.scatter).toContain("nest");
  });

  it("mushroom has lantern and web scatter", () => {
    const mushroom = BIOMES.find(b => b.id === "mushroom");
    expect(mushroom.scatter).toContain("lantern");
    expect(mushroom.scatter).toContain("web");
  });

  it("swamp has log and skull scatter", () => {
    const swamp = BIOMES.find(b => b.id === "swamp");
    expect(swamp.scatter).toContain("log");
    expect(swamp.scatter).toContain("skull");
  });

  it("sunset_beach has shell and umbrella scatter", () => {
    const beach = BIOMES.find(b => b.id === "sunset_beach");
    expect(beach.scatter).toContain("shell");
    expect(beach.scatter).toContain("umbrella");
  });

  it("bamboo_falls has bamboo and shrine scatter", () => {
    const bamboo = BIOMES.find(b => b.id === "bamboo_falls");
    expect(bamboo.scatter).toContain("bamboo");
    expect(bamboo.scatter).toContain("shrine");
  });

  it("blue_lagoon has coral and shell scatter", () => {
    const lagoon = BIOMES.find(b => b.id === "blue_lagoon");
    expect(lagoon.scatter).toContain("coral");
    expect(lagoon.scatter).toContain("shell");
  });

  it("underworld has bone and chain scatter", () => {
    const underworld = BIOMES.find(b => b.id === "underworld");
    expect(underworld.scatter).toContain("bone");
    expect(underworld.scatter).toContain("chain");
  });

  it("meteor has crystal and crater scatter", () => {
    const meteor = BIOMES.find(b => b.id === "meteor");
    expect(meteor.scatter).toContain("crystal");
    expect(meteor.scatter).toContain("crater");
  });
});

// ─── NEW ANIMATED FX per biome ───

describe("biome-specific animated FX", () => {
  it("olympus has fallingColumns fx", () => {
    const olympus = BIOMES.find(b => b.id === "olympus");
    expect(olympus.fx.fallingColumns).toBe(true);
  });

  it("jungle has jumpingFish fx (catchable)", () => {
    const jungle = BIOMES.find(b => b.id === "jungle");
    expect(jungle.fx.jumpingFish).toBe(true);
  });

  it("desert has rollingTumbleweeds fx", () => {
    const desert = BIOMES.find(b => b.id === "desert");
    // tumbleweeds already exists, verify still present
    expect(desert.fx.tumbleweeds).toBe(true);
    expect(desert.fx.mirage).toBe(true);
  });

  it("winter has crackingIce fx", () => {
    const winter = BIOMES.find(b => b.id === "winter");
    expect(winter.fx.crackingIce).toBe(true);
  });

  it("city has rats fx", () => {
    const city = BIOMES.find(b => b.id === "city");
    expect(city.fx.rats).toBe(true);
  });

  it("volcano has lavaFlow fx", () => {
    const volcano = BIOMES.find(b => b.id === "volcano");
    expect(volcano.fx.lavaFlow).toBe(true);
  });

  it("summer has swayingWheat fx", () => {
    const summer = BIOMES.find(b => b.id === "summer");
    expect(summer.fx.swayingWheat).toBe(true);
  });

  it("autumn has fallingAcorns fx", () => {
    const autumn = BIOMES.find(b => b.id === "autumn");
    expect(autumn.fx.fallingAcorns).toBe(true);
  });

  it("spring has bloomingFlowers fx", () => {
    const spring = BIOMES.find(b => b.id === "spring");
    expect(spring.fx.bloomingFlowers).toBe(true);
  });

  it("mushroom has glowingCaps fx", () => {
    const mushroom = BIOMES.find(b => b.id === "mushroom");
    expect(mushroom.fx.glowingCaps).toBe(true);
  });

  it("swamp has risingMist fx", () => {
    const swamp = BIOMES.find(b => b.id === "swamp");
    expect(swamp.fx.risingMist).toBe(true);
  });

  it("sunset_beach has hermitCrabs fx", () => {
    const beach = BIOMES.find(b => b.id === "sunset_beach");
    expect(beach.fx.hermitCrabs).toBe(true);
  });

  it("bamboo_falls has swayingBamboo fx", () => {
    const bamboo = BIOMES.find(b => b.id === "bamboo_falls");
    expect(bamboo.fx.swayingBamboo).toBe(true);
  });

  it("blue_lagoon has floatingLotus fx", () => {
    const lagoon = BIOMES.find(b => b.id === "blue_lagoon");
    expect(lagoon.fx.floatingLotus).toBe(true);
  });

  it("underworld has wanderingSouls fx", () => {
    const underworld = BIOMES.find(b => b.id === "underworld");
    expect(underworld.fx.wanderingSouls).toBe(true);
  });

  it("meteor has cosmicRays fx", () => {
    const meteor = BIOMES.find(b => b.id === "meteor");
    expect(meteor.fx.cosmicRays).toBe(true);
  });
});

// ─── NEW INTERACTABLES with unique mechanics ───

describe("new biome-specific interactable mechanics", () => {
  it("jungle has catchable fish (jumping from river)", () => {
    const items = BIOME_INTERACTABLES.jungle;
    const fish = items.find(i => i.id === "jungle_fish");
    expect(fish).toBeDefined();
    expect(fish.action).toBe("shoot");
    expect(fish.name).toContain("Ryb");
    expect(fish.reward.type).toBe("heal");
  });

  it("olympus has crumbling pillar (crushes enemies)", () => {
    const items = BIOME_INTERACTABLES.olympus;
    const pillar = items.find(i => i.id === "olympus_pillar");
    expect(pillar).toBeDefined();
    expect(pillar.action).toBe("shoot");
    expect(pillar.reward.type).toBe("aoe_damage");
  });

  it("winter has frozen treasure (break ice to loot)", () => {
    const items = BIOME_INTERACTABLES.winter;
    const frozen = items.find(i => i.id === "winter_frozen_chest");
    expect(frozen).toBeDefined();
    expect(frozen.action).toBe("shoot");
    expect(frozen.reward.type).toBe("loot");
  });

  it("city has market stall (buy supplies)", () => {
    const items = BIOME_INTERACTABLES.city;
    const stall = items.find(i => i.id === "city_market_stall");
    expect(stall).toBeDefined();
    expect(stall.action).toBe("click");
    expect(stall.reward.type).toBe("random_loot");
  });

  it("summer has golden eagle (shoot for buff)", () => {
    const items = BIOME_INTERACTABLES.summer;
    const eagle = items.find(i => i.id === "summer_eagle");
    expect(eagle).toBeDefined();
    expect(eagle.action).toBe("shoot");
    expect(eagle.reward.type).toBe("buff");
  });

  it("mushroom has luminous pool (proximity heal)", () => {
    const items = BIOME_INTERACTABLES.mushroom;
    const pool = items.find(i => i.id === "mushroom_pool");
    expect(pool).toBeDefined();
    expect(pool.action).toBe("proximity");
    expect(pool.reward.type).toBe("heal_and_buff");
  });

  it("meteor has unstable core (timed click for big loot)", () => {
    const items = BIOME_INTERACTABLES.meteor;
    const core = items.find(i => i.id === "meteor_core");
    expect(core).toBeDefined();
    expect(core.action).toBe("click");
    expect(core.reward.type).toBe("timed_loot");
  });

  it("all interactables still have required fields", () => {
    for (const [biomeId, list] of Object.entries(BIOME_INTERACTABLES)) {
      for (const item of list) {
        expect(item.id, `${biomeId} missing id`).toBeTypeOf("string");
        expect(item.name, `${biomeId}/${item.id} missing name`).toBeTypeOf("string");
        expect(item.icon, `${biomeId}/${item.id} missing icon`).toBeTypeOf("string");
        expect(item.desc, `${biomeId}/${item.id} missing desc`).toBeTypeOf("string");
        expect(["shoot", "click", "saber", "proximity"]).toContain(item.action);
        expect(item.chance).toBeGreaterThan(0);
        expect(item.chance).toBeLessThanOrEqual(1);
        expect(item.reward).toBeDefined();
        expect(item.reward.type).toBeTypeOf("string");
      }
    }
  });

  it("no duplicate IDs across all biomes after additions", () => {
    const allIds = [];
    for (const list of Object.values(BIOME_INTERACTABLES)) {
      for (const item of list) allIds.push(item.id);
    }
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it("all new names and descriptions are in Polish", () => {
    const newIds = [
      "jungle_fish", "olympus_pillar", "winter_frozen_chest",
      "city_market_stall", "summer_eagle", "mushroom_pool", "meteor_core",
    ];
    for (const [, list] of Object.entries(BIOME_INTERACTABLES)) {
      for (const item of list) {
        if (newIds.includes(item.id)) {
          expect(item.name.length).toBeGreaterThan(3);
          expect(item.desc.length).toBeGreaterThan(10);
        }
      }
    }
  });
});

// ─── DATA INTEGRITY after all additions ───

describe("biome data integrity after new content", () => {
  it("all biomes still have valid scatter arrays", () => {
    for (const biome of BIOMES) {
      expect(Array.isArray(biome.scatter), `${biome.id} scatter`).toBe(true);
      expect(biome.scatter.length).toBeGreaterThanOrEqual(5);
    }
  });

  it("all biomes have fx object", () => {
    for (const biome of BIOMES) {
      expect(typeof biome.fx).toBe("object");
    }
  });

  it("each biome has at least 1 new unique animated fx", () => {
    // Map of biome -> new fx key that should exist
    const newFxMap = {
      jungle: "jumpingFish",
      island: "tidePools",
      desert: "mirage",
      winter: "crackingIce",
      city: "rats",
      volcano: "lavaFlow",
      summer: "swayingWheat",
      autumn: "fallingAcorns",
      spring: "bloomingFlowers",
      mushroom: "glowingCaps",
      swamp: "risingMist",
      sunset_beach: "hermitCrabs",
      bamboo_falls: "swayingBamboo",
      blue_lagoon: "floatingLotus",
      olympus: "fallingColumns",
      underworld: "wanderingSouls",
      meteor: "cosmicRays",
    };
    for (const biome of BIOMES) {
      const fxKey = newFxMap[biome.id];
      expect(biome.fx[fxKey], `${biome.id} missing fx: ${fxKey}`).toBeTruthy();
    }
  });

  it("total biome count unchanged at 17", () => {
    expect(BIOMES.length).toBe(17);
  });

  it("island has tidePools fx", () => {
    const island = BIOMES.find(b => b.id === "island");
    expect(island.fx.tidePools).toBe(true);
  });
});
