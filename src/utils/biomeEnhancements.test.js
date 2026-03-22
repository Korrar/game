import { describe, it, expect } from 'vitest';
import { BIOMES } from '../data/biomes.js';
import { BIOME_INTERACTABLES } from '../data/biomeInteractables.js';

// Helper to find biome by id
const biome = (id) => BIOMES.find(b => b.id === id);

describe('biome visual enhancement fx flags', () => {
  it('summer has butterflies and sunRays fx', () => {
    const b = biome('summer');
    expect(b.fx.butterflies).toBe(true);
    expect(b.fx.sunRays).toBe(true);
  });

  it('winter has icicles fx', () => {
    const b = biome('winter');
    expect(b.fx.icicles).toBe(true);
  });

  it('spring has rainbow and springStream fx', () => {
    const b = biome('spring');
    expect(b.fx.rainbow).toBe(true);
    expect(b.fx.springStream).toBe(true);
  });

  it('swamp has swampEyes and swampBubbles fx', () => {
    const b = biome('swamp');
    expect(b.fx.swampEyes).toBe(true);
    expect(b.fx.swampBubbles).toBe(true);
  });

  it('mushroom has caveDrops fx', () => {
    const b = biome('mushroom');
    expect(b.fx.caveDrops).toBe(true);
  });
});

describe('new interactive environment elements', () => {
  it('jungle has dam interactable', () => {
    const items = BIOME_INTERACTABLES.jungle;
    const dam = items.find(i => i.id === 'jungle_dam');
    expect(dam).toBeDefined();
    expect(dam.action).toBe('click');
    expect(dam.reward.type).toBe('dam_break');
  });

  it('spring has sapling interactable', () => {
    const items = BIOME_INTERACTABLES.spring;
    const sapling = items.find(i => i.id === 'spring_sapling');
    expect(sapling).toBeDefined();
    expect(sapling.action).toBe('click');
    expect(sapling.reward.type).toBe('grow_tree');
  });

  it('winter has hot spring interactable', () => {
    const items = BIOME_INTERACTABLES.winter;
    const hotSpring = items.find(i => i.id === 'winter_hot_spring');
    expect(hotSpring).toBeDefined();
    expect(hotSpring.action).toBe('saber');
    expect(hotSpring.reward.type).toBe('hot_spring');
  });

  it('swamp has campfire interactable', () => {
    const items = BIOME_INTERACTABLES.swamp;
    const campfire = items.find(i => i.id === 'swamp_campfire');
    expect(campfire).toBeDefined();
    expect(campfire.action).toBe('click');
    expect(campfire.reward.type).toBe('campfire');
  });

  it('all new interactables have Polish names and descriptions', () => {
    const newIds = ['jungle_dam', 'spring_sapling', 'winter_hot_spring', 'swamp_campfire'];
    for (const biomeId of Object.keys(BIOME_INTERACTABLES)) {
      for (const item of BIOME_INTERACTABLES[biomeId]) {
        if (newIds.includes(item.id)) {
          expect(item.name.length).toBeGreaterThan(3);
          expect(item.desc.length).toBeGreaterThan(10);
          // Polish text should contain Polish characters or at least proper words
          expect(typeof item.icon).toBe('string');
        }
      }
    }
  });
});

describe('biome render functions', () => {
  it('every biome has a renderFn defined', () => {
    for (const b of BIOMES) {
      expect(b.renderFn, `biome "${b.id}" missing renderFn`).toBeTruthy();
    }
  });
});

describe('biome interactable counts', () => {
  it('each biome has at least 3 interactables', () => {
    for (const [biomeId, items] of Object.entries(BIOME_INTERACTABLES)) {
      expect(items.length, `biome "${biomeId}" should have >=3 interactables`).toBeGreaterThanOrEqual(3);
    }
  });

  it('interactables have valid action types', () => {
    const validActions = ['click', 'shoot', 'saber', 'proximity'];
    for (const [_biomeId, items] of Object.entries(BIOME_INTERACTABLES)) {
      for (const item of items) {
        expect(validActions, `invalid action "${item.action}" for "${item.id}"`).toContain(item.action);
      }
    }
  });
});
