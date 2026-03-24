// StructuralCollapse — multi-stage destruction for large obstacles
// Large structures break into smaller destructible fragments before fully collapsing
// Creates cascading destruction sequences with timing and physics

export const COLLAPSE_CONFIG = {
  fragmentSpawnRadius: 20,    // px spread for spawned fragments
  collapseDelay: 200,         // ms between collapse stages
  maxFragments: 4,            // max fragments per collapse
  fragmentHpMult: 0.25,       // fragment HP = parent HP * mult
  fragmentLootMult: 0.15,     // fragment loot = parent loot * mult
  toppleSpeed: 0.05,          // rotation speed for toppling animation
  dustParticles: 12,          // dust particles on collapse
  screenShakePerStage: 2,     // shake intensity per stage
};

// Structural definitions: which obstacles have multi-stage collapse
// stages: number of destruction stages before full collapse
// fragments: what smaller obstacles spawn from each stage
// toppleDir: preferred topple direction ("random", "away", "toward_player")
export const STRUCTURAL_DEFS = {
  windmill: {
    stages: 3,
    fragments: ["wooden_fence", "log_pile"],
    toppleDir: "random",
    collapseType: "topple",     // topples over like a tree
    dustColor: 0x8a6030,
    soundCategory: "wood_collapse",
  },
  small_house: {
    stages: 3,
    fragments: ["moss_boulder", "wooden_fence"],
    toppleDir: "away",
    collapseType: "crumble",    // crumbles inward
    dustColor: 0x7a7a7a,
    soundCategory: "stone_collapse",
  },
  shipwreck: {
    stages: 2,
    fragments: ["driftwood", "barrel_stack"],
    toppleDir: "random",
    collapseType: "shatter",    // breaks apart outward
    dustColor: 0x8a6030,
    soundCategory: "wood_collapse",
  },
  stone_bridge: {
    stages: 3,
    fragments: ["moss_boulder", "barnacle_rock"],
    toppleDir: "random",
    collapseType: "crumble",
    dustColor: 0x6a6a6a,
    soundCategory: "stone_collapse",
  },
  obsidian_pillar: {
    stages: 2,
    fragments: ["stalactite", "crystal_cluster"],
    toppleDir: "away",
    collapseType: "topple",
    dustColor: 0x333344,
    soundCategory: "stone_collapse",
  },
  mast_fragment: {
    stages: 2,
    fragments: ["driftwood", "rope_coil"],
    toppleDir: "random",
    collapseType: "topple",
    dustColor: 0x8a6030,
    soundCategory: "wood_collapse",
  },
  broken_wagon: {
    stages: 2,
    fragments: ["wooden_fence", "barrel_stack"],
    toppleDir: "away",
    collapseType: "shatter",
    dustColor: 0x8a6030,
    soundCategory: "wood_collapse",
  },
  cannon_wreck: {
    stages: 2,
    fragments: ["rusted_cage", "anchor_post"],
    toppleDir: "away",
    collapseType: "shatter",
    dustColor: 0x8a8a9a,
    soundCategory: "metal_collapse",
  },
  hunting_stand: {
    stages: 2,
    fragments: ["wooden_fence", "scarecrow"],
    toppleDir: "random",
    collapseType: "topple",
    dustColor: 0x8a6030,
    soundCategory: "wood_collapse",
  },
  crystal_geode: {
    stages: 2,
    fragments: ["crystal_cluster"],
    toppleDir: "random",
    collapseType: "shatter",
    dustColor: 0xa060e0,
    soundCategory: "crystal_collapse",
  },
  watchtower: {
    stages: 3,
    fragments: ["wooden_fence", "scarecrow", "log_pile"],
    toppleDir: "away",
    collapseType: "topple",
    dustColor: 0x8a6030,
    soundCategory: "wood_collapse",
  },
  stone_wall: {
    stages: 3,
    fragments: ["moss_boulder", "barnacle_rock", "stalactite"],
    toppleDir: "random",
    collapseType: "crumble",
    dustColor: 0x6a6a6a,
    soundCategory: "stone_collapse",
  },
  wooden_bridge: {
    stages: 2,
    fragments: ["driftwood", "rope_coil"],
    toppleDir: "random",
    collapseType: "shatter",
    dustColor: 0x8a6030,
    soundCategory: "wood_collapse",
  },
  bell_tower: {
    stages: 3,
    fragments: ["moss_boulder", "anchor_post"],
    toppleDir: "away",
    collapseType: "topple",
    dustColor: 0x7a7a7a,
    soundCategory: "stone_collapse",
  },
  crane: {
    stages: 2,
    fragments: ["rusted_cage", "rope_coil"],
    toppleDir: "away",
    collapseType: "topple",
    dustColor: 0x8a8a9a,
    soundCategory: "metal_collapse",
  },
  cracked_pillar: {
    stages: 2,
    fragments: ["moss_boulder"],
    toppleDir: "random",
    collapseType: "crumble",
    dustColor: 0x6a6a6a,
    soundCategory: "stone_collapse",
  },
};

// Check if an obstacle type has structural collapse behavior
export function hasStructuralCollapse(obstacleType) {
  return STRUCTURAL_DEFS.hasOwnProperty(obstacleType);
}

// Get the structural definition for an obstacle
export function getStructuralDef(obstacleType) {
  return STRUCTURAL_DEFS[obstacleType] || null;
}

// Calculate current collapse stage based on HP ratio
export function getCollapseStage(hpRatio, totalStages) {
  if (hpRatio <= 0) return totalStages; // fully collapsed
  const stageSize = 1.0 / totalStages;
  return Math.floor((1 - hpRatio) / stageSize);
}

// Generate fragments when transitioning to a new collapse stage
export function generateFragments(obstacle, structDef, stage, nextId) {
  const fragments = [];
  const numFragments = Math.min(
    COLLAPSE_CONFIG.maxFragments,
    structDef.fragments.length + Math.floor(stage * 0.5)
  );

  for (let i = 0; i < numFragments; i++) {
    const fragType = structDef.fragments[i % structDef.fragments.length];
    const angle = (Math.PI * 2 * i) / numFragments + (Math.random() - 0.5) * 0.5;
    const dist = COLLAPSE_CONFIG.fragmentSpawnRadius * (0.5 + Math.random() * 0.5);

    // Offset in percentage coordinates (matching obstacle x/y system)
    // dist ~10-20px, convert to ~1.5-4% spread for visible fragment separation
    const offsetX = Math.cos(angle) * dist * 0.15;
    const offsetY = Math.sin(angle) * dist * 0.15;

    fragments.push({
      id: `frag_${nextId}_${i}`,
      type: fragType,
      x: obstacle.x + offsetX,
      y: obstacle.y + offsetY,
      parentId: obstacle.id,
      collapseStage: stage,
      spawnDelay: i * COLLAPSE_CONFIG.collapseDelay * 0.5,
      // Fragments have reduced HP and loot
      hpMult: COLLAPSE_CONFIG.fragmentHpMult,
      lootMult: COLLAPSE_CONFIG.fragmentLootMult,
    });
  }

  return fragments;
}

// Get visual collapse state for rendering
export function getCollapseVisuals(obstacleType, hpRatio) {
  const def = STRUCTURAL_DEFS[obstacleType];
  if (!def) return null;

  const stage = getCollapseStage(hpRatio, def.stages);
  const stageProgress = ((1 - hpRatio) * def.stages) % 1; // 0-1 within current stage

  let tilt = 0;
  let scaleX = 1;
  let scaleY = 1;
  let crumbleOffset = 0;

  switch (def.collapseType) {
    case "topple":
      // Progressive tilt as damage increases
      tilt = stage * 5 + stageProgress * 8; // degrees
      scaleY = 1 - stage * 0.05;
      break;

    case "crumble":
      // Shrink and sink into ground
      scaleX = 1 - stage * 0.08;
      scaleY = 1 - stage * 0.12;
      crumbleOffset = stage * 3 + stageProgress * 2; // pixels downward
      break;

    case "shatter":
      // Expand slightly then break apart
      const shatterPulse = stageProgress < 0.3 ? stageProgress * 0.1 : 0;
      scaleX = 1 + shatterPulse - stage * 0.06;
      scaleY = 1 + shatterPulse - stage * 0.06;
      break;
  }

  return {
    stage,
    totalStages: def.stages,
    collapseType: def.collapseType,
    tilt,
    scaleX,
    scaleY,
    crumbleOffset,
    dustColor: def.dustColor,
    soundCategory: def.soundCategory,
    shouldSpawnDust: stageProgress < 0.1 && stage > 0,
  };
}

// Create a collapse event (for queuing in game loop)
export function createCollapseEvent(obstacle, structDef, fromStage, toStage, element) {
  return {
    obstacleId: obstacle.id,
    obstacleType: obstacle.type,
    x: obstacle.x,
    y: obstacle.y,
    material: obstacle.material,
    fromStage,
    toStage,
    element,
    collapseType: structDef.collapseType,
    dustColor: structDef.dustColor,
    screenShake: COLLAPSE_CONFIG.screenShakePerStage * (toStage - fromStage),
    dustCount: COLLAPSE_CONFIG.dustParticles * (toStage - fromStage),
    timestamp: Date.now(),
    delay: COLLAPSE_CONFIG.collapseDelay * fromStage,
  };
}
