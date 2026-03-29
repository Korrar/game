import { useState, useRef, useEffect, useCallback } from "react";
import { wrapPctToScreen as _wrapPct, screenPxToWorld as _screenToWorld } from "./utils/panoramaWrap.js";
import { worldToScreen as _isoWorldToScreen, screenToWorld as _isoScreenToWorld, ISO_CONFIG } from "./utils/isometricUtils.js";
import { IsoCamera } from "./rendering/IsoCamera.js";
// Convert game coords to physics percentage (0-100) for spawnNpc/updatePatrol
const _toPhysPct = (val, isIso, maxTiles) => isIso ? (val / maxTiles) * 100 : val;
const _isoCenter = () => ISO_CONFIG.MAP_COLS / 2;
import { renderIsoBiome, clearTileCache } from "./renderers/isoBiomeRenderer.js";
import { renderTerrainOverlays } from "./renderers/isoTerrainOverlayRenderer.js";
import { generateTerrainData, updateFogOfWar, calcHeightAdvantage, hasLineOfSight } from "./systems/TerrainSystem.js";
import { applyTerrainMovement, buildWalkGrid, getTerrainAwareMove, detectChokepoints } from "./systems/TerrainMovement.js";
import { TerrainDestructionState } from "./systems/TerrainDestruction.js";
import { MapResourceState } from "./systems/MapResources.js";
import { TerrainParticleSystem } from "./rendering/TerrainParticles.js";
import { BIOMES } from "./data/biomes";
import { RARITY_C, RARITY_L } from "./data/treasures";
import { rollCardDrop, ALL_NPCS, BIOME_NAMES } from "./data/bestiary";
import { HIDEOUT_LEVELS, HIDEOUT_UPGRADES } from "./data/hideout";
import { CARAVAN_LEVELS } from "./data/caravanLevels";
import { KNIGHT_LEVELS } from "./data/knightLevels";
import { MERCENARY_TYPES } from "./data/mercenaries";
import { SHOP_TOOLS, MANA_POTIONS, AMMO_ITEMS, pickResource, MINE_TIMES } from "./data/shopItems";
import { BAZAAR_SPECIALS, BIOME_SHOP_ITEMS, generateShopStock, attemptBargain, applyDiscount, BARGAIN_CONFIG } from "./data/bazaarSpecials";
import { pickNpc, SPELLS, RESIST_NAMES } from "./data/npcs";
import { SKILLSHOT_TYPES, ACCURACY_COMBO_THRESHOLD, ACCURACY_COMBO_BONUS, HEADSHOT_BONUS, DEFENSE_TRAPS, MAX_PLAYER_TRAPS } from "./data/skillshots";
import { totalCopper, copperToMoney, pickTreasure, formatValHTML } from "./utils/helpers";
import { rollRandomEvent } from "./data/randomEvents";
import { rollWeather, applyWeatherDamage } from "./data/weather";
import { rollModifier, applyModifierDamage } from "./data/biomeModifiers";
import { rollInteractables, DEFENSE_POIS } from "./data/biomeInteractables";
import { OBSTACLE_DEFS, OBSTACLE_MATERIALS, WEAKNESS_MULT, RESIST_MULT as OBS_RESIST_MULT } from "./data/obstacles";
import { STRUCTURE_DEFS, BIOME_STRUCTURES, getRandomStructure, createStructureInstance, checkCascadeCollapse, getStructureBounds } from "./data/structures";
import { renderBiome } from "./renderers/biomeRenderers";
import { renderVault } from "./renderers/vaultRenderer";
import { BiomeAnimator } from "./renderers/biomeAnimator";
import { PhysicsWorld } from "./physics/RapierPhysicsWorld";
import { initRapier } from "./physics/rapierInit";
import { PixiRenderer } from "./rendering/PixiRenderer";
import { depthFromY, scaleAtDepth, zIndexAtDepth } from "./rendering/DepthSystem";
import { findChainTargets, getChainDamage, getChainDelay, getElementSynergy, buildChainSequence } from "./systems/ChainReactions";
import { getLeakParticles, getDamageVisuals } from "./systems/ProgressiveDamage";
import { createShockwave, updateShockwaves, calcShockwavePush, calcDebrisPush, drawShockwave } from "./systems/ShockwaveSystem";
import { hasStructuralCollapse, getStructuralDef, getCollapseStage, generateFragments, getCollapseVisuals, createCollapseEvent, COLLAPSE_CONFIG } from "./systems/StructuralCollapse";
import { DestructionComboTracker } from "./systems/DestructionCombo";
import { EnvironmentalHazardManager, HAZARD_TYPES } from "./systems/EnvironmentalHazards";
import { createExplosiveDebris, checkDebrisDamage } from "./systems/DebrisSystem";
import {
  startMusic, toggleMusic, changeBiomeMusic, setMusicCombatIntensity, startRiverAmbience, stopRiverAmbience, sfxDoor, sfxChest, sfxSell,
  sfxStore, sfxRetrieve, sfxUpgrade, sfxGather, sfxBuy,
  sfxFireball, sfxLightning, sfxIceLance, sfxShadowBolt, sfxHolyBeam,
  sfxNpcDeath, sfxDrinkMana, sfxRecruit, sfxMeleeHit, sfxSaberSwipe, sfxSaberHit, sfxMeteorFall, sfxMeteorImpact,
  sfxEventAppear, sfxMerchant, sfxAltar, sfxEventSuccess, sfxEventFail,
  sfxWaveHorn, sfxWaveComplete, sfxVictoryFanfare, sfxWeather, sfxCaravanHit,
  sfxEnemyStrike, sfxEnemyProjectile,
  startCombatDrums, stopCombatDrums, updateCombatEnemyCount, updateComboLevel,
  sfxBossKillDrama, sfxCriticalHit, sfxHeadshotConfirm,
  startCaravanAlarm, stopCaravanAlarm, sfxWaveIncoming,
  sfxStructureCollapse, sfxStructureFullDestroy,
} from "./audio/soundEngine";
import TopBar from "./components/TopBar";
import SidePanel from "./components/SidePanel";
import ItemSlot from "./components/ItemSlot";
import ItemDetail from "./components/ItemDetail";
import LootPopup from "./components/LootPopup";
import SpellBar from "./components/SpellBar";
// Caravan bar removed – HP & Travel icons integrated into SpellBar
import EventModal from "./components/EventModal";
import WaveOverlay, { PowerSpikeWarning } from "./components/WaveOverlay";
import WeatherOverlay from "./components/WeatherOverlay";
import IsoMinimap from "./components/IsoMinimap";
import Chest, { CLICKS_TO_OPEN } from "./components/Chest";
import RelicPicker from "./components/RelicPicker";
import SlotMachine from "./components/SlotMachine";
import { RELICS, RELIC_SYNERGIES } from "./data/relics";
import { getBossForRoom, getDungeonBoss } from "./data/bosses";
import { generateDungeon, createDungeonBiome, DUNGEON_TYPES } from "./systems/DungeonGenerator.js";
import { generateDungeonTerrain, transitionDungeonLevel, checkStairsProximity, checkDungeonCompletion, calculateDungeonRewards } from "./systems/DungeonState.js";
import { renderDungeonLighting, renderStairsMarkers } from "./rendering/DungeonLighting.js";
import { DUNGEON_HAZARDS, shouldTriggerHazard, applyHazardEffect } from "./data/dungeonHazards.js";
import DungeonCrossSection from "./components/DungeonCrossSection";
import StairsPrompt from "./components/StairsPrompt";
import DungeonHUD from "./components/DungeonHUD";
import { COMBOS, COMBO_STREAK_BONUS, COMBO_STREAK_CAP, COMBO_STREAK_TIMEOUT } from "./data/combos";
import { xpForLevel, rollLevelPerks } from "./data/levelPerks";
import { rollUpgradeChoices, getUpgradedSpellStats, MAX_UPGRADES_PER_SPELL } from "./data/spellUpgrades";
import { isEliteRoom, rollEliteModifier } from "./data/eliteEnemies";
import { rollChallenge } from "./data/challenges";
import { CREW_ROLES, CREW_RELATIONS, getLoyaltyLevel } from "./data/crew";
import { STORY_ARCS, MORAL_DILEMMAS, rollStoryStep, rollNewStoryArc, rollMoralDilemma } from "./data/storyEvents";
import { SHIP_UPGRADES, rollSeaEvent, rollIslandDiscovery } from "./data/sailing";
import RiverShipSegment from "./components/RiverShipSegment";
import WorldMap from "./components/WorldMap";
import RiverMap from "./components/RiverMap";
import { FORTIFICATION_TREE, TRAP_COMBOS, FORTIFICATION_PHASE } from "./data/advancedTraps";
import FortificationMenu from "./components/FortificationMenu";
import { BIOME_RESOURCES, getAvailableRecipes, canCraft as checkCanCraft } from "./data/biomeCrafting";
import CraftingPanel from "./components/CraftingPanel";
import { FACTIONS, getFactionBonus, getFactionHostility, rollFactionQuest, rollFactionEvent } from "./data/factions";
import { ARTIFACT_SETS, DISCOVERY_MILESTONES, JOURNAL_CATEGORIES, getDiscoveryMilestone, rollSecretRoom, getCompletedSetBonuses } from "./data/discovery";
import { SABERS, SABER_RARITY_COLOR } from "./data/sabers";
import { MORALE_CONFIG, MORALE_EVENTS, getMoraleThreshold } from "./data/morale";
import { MUTATION_INTERVAL, MUTATIONS, selectMutationTargets, pickMutation } from "./data/mutations";
import { GHOST_SHIP_CONFIG } from "./data/ghostShip";
import ComboOverlay from "./components/ComboOverlay";
import LevelUpPicker from "./components/LevelUpPicker";
import SpellUpgradePicker from "./components/SpellUpgradePicker";
import BossHpBar from "./components/BossHpBar";
import { getIconUrl, getNpcIconUrl } from "./rendering/icons";

// Error boundary to catch rendering crashes and display them instead of black screen
import { Component } from "react";
class GameErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error("GameErrorBoundary:", error, info); }
  render() {
    if (this.state.error) return (
      <div style={{ color: "#ff4040", background: "#1a0a0a", padding: 20, fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
        <h2>Błąd gry</h2>
        <p>{this.state.error.message}</p>
        <p>{this.state.error.stack}</p>
        <button onClick={() => this.setState({ error: null })} style={{ color: "#fff", background: "#444", padding: "8px 16px", cursor: "pointer" }}>Spróbuj ponownie</button>
      </div>
    );
    return this.props.children;
  }
}

function Icon({ name, size = 16, style: st }) {
  const url = getIconUrl(name, size);
  if (!url) return null;
  return <img src={url} width={size} height={size} style={{ verticalAlign: "middle", display: "inline-block", ...st }} alt={name} />;
}
function NpcIcon({ bodyType, bodyColor, armorColor, size = 24, style: st }) {
  const url = getNpcIconUrl(bodyType, bodyColor || "#6a4a30", armorColor || "#4a3a28", size);
  if (!url) return null;
  return <img src={url} width={size} height={size} style={{ verticalAlign: "middle", display: "inline-block", ...st }} alt={bodyType} />;
}

const appStyle = { background: "#08050a", color: "#d8c8a8", fontFamily: "'Segoe UI', monospace", width: "100vw", height: "100vh", overflow: "hidden", position: "relative", display: "flex", justifyContent: "center", alignItems: "center" };
const scanlinesStyle = { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.04) 3px,rgba(0,0,0,0.04) 6px)", pointerEvents: "none", zIndex: 9999 };
const vignetteStyle = { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "radial-gradient(ellipse at center,transparent 55%,rgba(0,0,0,0.6) 100%)", pointerEvents: "none", zIndex: 9998 };

const SPELL_SFX = {
  fireball: sfxFireball, lightning: sfxLightning, icelance: sfxIceLance,
  meteor: sfxFireball, blizzard: sfxIceLance, drain: sfxShadowBolt,
  chainlightning: sfxLightning, earthquake: sfxHolyBeam,
};

const RESIST_MULT = 0.3; // 70% damage reduction on resist
const BASE_MAX_MANA = 100;
const MAX_INITIATIVE = 100;
const INITIATIVE_REGEN = 30; // per second
const CARAVAN_COST = 60;

// Fixed game resolution – CSS scales to fit viewport
// Desktop: landscape 1280×720. Mobile portrait: computed from screen.
const DESKTOP_W = 1280;
const DESKTOP_H = 720;

const animatorRef = { current: null };
const physicsRef = { current: null };
const pixiRef = { current: null };
let walkerIdCounter = 0;
let dmgPopupIdCounter = 0;

// Mobile detection helper
const isTouchDevice = () => "ontouchstart" in window || navigator.maxTouchPoints > 0;
const isMobileScreen = () => isTouchDevice() && window.innerWidth < 900;

// Height reserved for the spell bar on mobile (fixed at viewport bottom)
const MOBILE_SPELLBAR_H = 60;

// Compute mobile portrait game dimensions to fill screen (minus spell bar)
function getMobileDimensions() {
  const sw = window.visualViewport?.width || window.innerWidth;
  const sh = (window.visualViewport?.height || window.innerHeight) - MOBILE_SPELLBAR_H;
  const baseW = 480;
  const baseH = Math.round(baseW * (sh / sw));
  return { w: baseW, h: baseH };
}

function getGameDimensions() {
  if (isMobileScreen()) {
    const { w, h } = getMobileDimensions();
    return { w, h };
  }
  return { w: DESKTOP_W, h: DESKTOP_H };
}

// Ammo drop table — rolled on each monster kill
const AMMO_DROP_TABLE = [
  { type: "dynamite", chance: 0.12, amount: 1 },
  { type: "harpoon", chance: 0.10, amount: 1 },
  { type: "cannonball", chance: 0.06, amount: 1 },
  { type: "rum", chance: 0.08, amount: 1 },
  { type: "chain", chance: 0.06, amount: 1 },
];

export default function App() {
  const [screen, setScreen] = useState("intro");
  const [room, setRoom] = useState(0);
  const [biome, setBiome] = useState(null);
  const biomeRef = useRef(null);
  biomeRef.current = biome;
  const [doors, setDoors] = useState(0);
  const [initiative, setInitiative] = useState(MAX_INITIATIVE);
  const [inventory, setInventory] = useState([]);
  const [hideoutItems, setHideoutItems] = useState([]);
  const [money, setMoney] = useState({ copper: 50, silver: 0, gold: 0 });
  const [totalGoldEarned, setTotalGoldEarned] = useState(0);
  const [bossesDefeated, setBossesDefeated] = useState(0);
  const [gameOverStats, setGameOverStats] = useState(null);
  const [hideoutLevel, setHideoutLevel] = useState(0);
  const [hideoutUpgrades, setHideoutUpgrades] = useState({}); // { upgradeId: level }
  const [chestPos, setChestPos] = useState(null);
  const [showChest, setShowChest] = useState(false);
  const showChestRef = useRef(false);
  showChestRef.current = showChest;
  const [chestClicks, setChestClicks] = useState(0);
  const [panel, setPanel] = useState(null);
  const [selectedInv, setSelectedInv] = useState(-1);
  const [loot, setLoot] = useState(null);
  const [msg, setMsg] = useState(null);
  const [transitioning, setTransitioning] = useState(false);
  const transitionTimerRef = useRef(null);
  // Safety: auto-clear transitioning overlay after 5s to prevent permanent black screen
  useEffect(() => {
    if (transitioning) {
      transitionTimerRef.current = setTimeout(() => { setTransitioning(false); console.warn("Transition safety timeout — forced clear"); }, 5000);
    } else {
      if (transitionTimerRef.current) { clearTimeout(transitionTimerRef.current); transitionTimerRef.current = null; }
    }
    return () => { if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current); };
  }, [transitioning]);
  const [musicOn, setMusicOn] = useState(true);

  // Tools & resources
  const [ownedTools, setOwnedTools] = useState([]);
  const [resourceNode, setResourceNode] = useState(null);
  const [showResource, setShowResource] = useState(false);
  const [isNight, setIsNight] = useState(false);
  const isNightRef = useRef(false);
  isNightRef.current = isNight;
  const [weather, setWeather] = useState(null);
  const weatherRef = useRef(null);
  weatherRef.current = weather;
  // Biome environmental modifier (passive per-biome hazard)
  const [biomeModifier, setBiomeModifier] = useState(null);
  const biomeModifierRef = useRef(null);
  biomeModifierRef.current = biomeModifier;
  // Biome interactive terrain elements (clickable/shootable per-room objects)
  const [interactables, setInteractables] = useState([]);
  const interactablesRef = useRef([]);
  interactablesRef.current = interactables;
  // Element combo system: track last element hit on each NPC
  // Combos: fire+ice = "Steam Burst" (+50%), lightning+fire = "Overcharge" (+40%), ice+lightning = "Shatter" (+60%)
  const elementDebuffs = useRef({}); // { npcId: { element, timestamp } }
  const [miningProgress, setMiningProgress] = useState(0);
  const miningRef = useRef({ active: false, intervalId: null });

  // POIs: fruit tree, mine nuggets, waterfall, merc camp, arsenal
  const [fruitTree, setFruitTree] = useState(null);     // { x, fruits, biomeId, crown, trunk, label }
  const [mineNugget, setMineNugget] = useState(null);   // { x, nuggets, biomeId, rockCol, oreIcon }
  const [waterfall, setWaterfall] = useState(null);      // { x, opened, biomeId, rgb, frozen, label }
  const [mercCamp, setMercCamp] = useState(null);        // { x, biomeId }
  const [wizardPoi, setWizardPoi] = useState(null);      // { x, ammoType, ammoAmount }
  const [biomePoi, setBiomePoi] = useState(null);        // { type, x, biomeId, used, ...data }
  const waterfallStateRef = useRef(waterfall);
  waterfallStateRef.current = waterfall;
  const fruitTreeStateRef = useRef(fruitTree);
  fruitTreeStateRef.current = fruitTree;
  const chestPosRef = useRef(chestPos);
  chestPosRef.current = chestPos;
  const resourceNodeRef = useRef(resourceNode);
  resourceNodeRef.current = resourceNode;
  const mineNuggetRef = useRef(mineNugget);
  mineNuggetRef.current = mineNugget;
  const mercCampRef = useRef(mercCamp);
  mercCampRef.current = mercCamp;
  const wizardPoiRef = useRef(wizardPoi);
  wizardPoiRef.current = wizardPoi;
  const biomePoiRef = useRef(biomePoi);
  biomePoiRef.current = biomePoi;
  const nuggetRef = useRef({ active: false, intervalId: null });
  // Destructible obstacles per room
  const [obstacles, setObstacles] = useState([]);        // [{id, type, x, y, biomeId, hp, maxHp, destructible, material, hitAnim, destroying}]
  const obstaclesRef = useRef(obstacles);
  obstaclesRef.current = obstacles;
  const [structures, setStructures] = useState([]);      // composite multi-segment buildings
  const structuresRef = useRef(structures);
  structuresRef.current = structures;

  // Traps system
  const [traps, setTraps] = useState([]);               // [{id, type, x, hp?, maxHp?, active, triggered?, cooldown?}]
  const trapsRef = useRef(traps);
  trapsRef.current = traps;

  // Learned spells (IDs of spells the player has unlocked)
  const [learnedSpells, setLearnedSpells] = useState(() =>
    SPELLS.filter(s => s.learned).map(s => s.id)
  );
  const learnedSpellsRef = useRef(learnedSpells);
  learnedSpellsRef.current = learnedSpells;

  // Walking NPC system
  const [walkers, setWalkers] = useState([]);     // [{id, npcData, alive, dying, dyingAt, hp, maxHp}]
  const walkersRef = useRef(walkers);
  walkersRef.current = walkers;
  const [kills, setKills] = useState(0);
  const walkDataRef = useRef({});
  const npcElsRef = useRef({});
  const waterfallElRef = useRef(null);
  const fruitTreeElRef = useRef(null);
  const obsElsRef = useRef({});
  const structElsRef = useRef({});
  const chestElRef = useRef(null);
  const mercCampElRef = useRef(null);
  const wizardElRef = useRef(null);
  const biomePoiElRef = useRef(null);
  const defensePoiElRef = useRef(null);
  const resourceElRef = useRef(null);
  const caravanElRef = useRef(null);
  const shopElRef = useRef(null);
  const hideoutElRef = useRef(null);
  const mineNuggetElRef = useRef(null);
  const meteoriteElRef = useRef(null);
  const meteorBoulderElRef = useRef(null);
  const groundLootElsRef = useRef({});
  const trapElsRef = useRef({});
  const interactableElsRef = useRef({});
  const walkRafRef = useRef(null);
  const summonAttackRef = useRef(null);
  const enemyAttackFriendlyRef = useRef(null);
  const enemyAbilityRef = useRef(null);
  const attackCaravanRef = useRef(null);
  const enemyAttackEnemyRef = useRef(null); // confusion: enemies attack each other

  // Caravan HP system
  const [caravanLevel, setCaravanLevel] = useState(0);
  const [caravanHp, setCaravanHp] = useState(CARAVAN_LEVELS[0].hp);
  const caravanHpRef = useRef(CARAVAN_LEVELS[0].hp);
  caravanHpRef.current = caravanHp;
  const caravanLevelRef = useRef(0);
  // Caravan world position (iso tile coords)
  const caravanPosRef = useRef({ x: 3, y: ISO_CONFIG.MAP_ROWS / 2 });
  const caravanMoveRef = useRef({ active: false, targetX: 0, targetY: 0, speed: 2.5 }); // tiles per second
  const [caravanSelected, setCaravanSelected] = useState(false);
  const caravanSelectedRef = useRef(false);
  caravanSelectedRef.current = caravanSelected;
  const terrainDataRef = useRef(null);
  const terrainParticlesRef = useRef(null);
  const terrainDestructionRef = useRef(new TerrainDestructionState());
  const mapResourcesRef = useRef(new MapResourceState());
  // Advanced destruction system refs
  const shockwavesRef = useRef([]);
  const destructionComboRef = useRef(new DestructionComboTracker());
  const envHazardsRef = useRef(new EnvironmentalHazardManager());
  const collapseEventsRef = useRef([]);
  const collapseFragIdRef = useRef(0);
  const walkGridRef = useRef(null);
  const chokepointsRef = useRef([]);
  caravanLevelRef.current = caravanLevel;

  // ─── DUNGEON SYSTEM STATE ───
  const [dungeonState, setDungeonState] = useState(null);
  const dungeonStateRef = useRef(null);
  dungeonStateRef.current = dungeonState;
  const [stairsPrompt, setStairsPrompt] = useState(null); // { type, targetLevel, position }
  const [showCrossSection, setShowCrossSection] = useState(false);
  const [dungeonTransitioning, setDungeonTransitioning] = useState(false);
  const dungeonHazardTimersRef = useRef({}); // { hazardType: lastTriggerTime }
  const activeDungeonHazardsRef = useRef([]); // currently active hazard effects

  // Refs for game-over stats capture (needed inside interval callbacks)
  const roomRef = useRef(0);
  roomRef.current = room;
  const killsRef = useRef(0);
  killsRef.current = kills;
  const bossesDefeatedRef = useRef(0);
  bossesDefeatedRef.current = bossesDefeated;
  const moneyRef = useRef(money);
  moneyRef.current = money;
  const totalGoldEarnedRef = useRef(0);
  totalGoldEarnedRef.current = totalGoldEarned;
  const doorsRef = useRef(0);
  doorsRef.current = doors;

  // Knight upgrade level (index into KNIGHT_LEVELS, 0 = Giermek)
  const [knightLevel, setKnightLevel] = useState(0);

  // Mana & spell system
  const [mana, setMana] = useState(50);
  const manaRef = useRef(50);
  manaRef.current = mana;
  const [ammo, setAmmo] = useState({});
  const ammoRef = useRef({});
  ammoRef.current = ammo;
  const [cooldowns, setCooldowns] = useState({});
  const cooldownsRef = useRef({});
  cooldownsRef.current = cooldowns;
  const [selectedSpell, setSelectedSpell] = useState(null);
  const [_dragHighlight, setDragHighlight] = useState(null);

  // Floating damage popups
  const [dmgPopups, setDmgPopups] = useState([]);

  // NPC inspection (bottom-left info card on click)
  const [inspectedNpc, setInspectedNpc] = useState(null);

  // Bestiary & knowledge
  const [bestiary, setBestiary] = useState({});
  const [knowledge, setKnowledge] = useState(0);
  const bestiaryRef = useRef({});
  const knowledgeRef = useRef(0);
  bestiaryRef.current = bestiary;
  knowledgeRef.current = knowledge;
  const [cardLog, setCardLog] = useState([]); // compact side log entries
  // Knowledge shop: permanent upgrades bought with knowledge
  const [knowledgeUpgrades, setKnowledgeUpgrades] = useState({
    manaPool: 0,     // +10 max mana per level (max 3)
    spellPower: 0,   // +5% spell damage per level (max 5)
    manaRegen: 0,    // +0.5 mana/sec per level (max 3)
  });
  const knowledgeUpgradesRef = useRef({ manaPool: 0, spellPower: 0, manaRegen: 0 });
  knowledgeUpgradesRef.current = knowledgeUpgrades;

  // Meteorite event: phases: pending → falling → landed → active (destructible NPC)
  const [meteorite, setMeteorite] = useState(null);
  const meteoriteRef = useRef(meteorite);
  meteoriteRef.current = meteorite;
  // Ground loot dropped by destroyed meteor — clickable items
  const [groundLoot, setGroundLoot] = useState([]);
  // Map secrets: hidden ISO world-space POIs revealed by proximity
  const [mapSecrets, setMapSecrets] = useState([]);
  const mapSecretsRef = useRef([]);
  mapSecretsRef.current = mapSecrets;  // Track meteor wave spawn thresholds: { walkerId, nextThreshold, waveCount }
  const meteorWaveRef = useRef(null);
  const [screenShake, setScreenShake] = useState(false);
  // Enemy attack visual feedback: slash overlay on caravan hit
  const [attackSlash, setAttackSlash] = useState(null); // {id, fromX, dmg} — slash overlay on caravan hit
  const [summonPicker, setSummonPicker] = useState(false);
  const [randomEvent, setRandomEvent] = useState(null);
  // Scout preview: next room info (visible with spyglass tool)
  const [nextRoomPreview, setNextRoomPreview] = useState(null);
  // Tutorial system
  const [tutorialStep, setTutorialStep] = useState(0); // 0 = not started, 1-5 = steps, -1 = done
  const [showTutorial, setShowTutorial] = useState(true);
  const [defenseMode, setDefenseMode] = useState(null);
  const defenseModeRef = useRef(null);
  defenseModeRef.current = defenseMode;
  const [defensePoi, setDefensePoi] = useState(null); // POI marker for defense encounter
  const defensePoiRef = useRef(defensePoi);
  defensePoiRef.current = defensePoi;
  const [showFortMenu, setShowFortMenu] = useState(false); // fortification placement menu
  const [fortPlacedCount, setFortPlacedCount] = useState(0); // fortifications placed this defense
  const [activeRelics, setActiveRelics] = useState([]);
  const activeRelicsRef = useRef([]);
  activeRelicsRef.current = activeRelics;
  const [relicChoices, setRelicChoices] = useState(null);
  const relicChoicesRef = useRef(null);
  relicChoicesRef.current = relicChoices;
  const hasRelic = (id) => activeRelicsRef.current.some(r => r.id === id);

  // ─── FEATURE: Relic Synergies ───
  const [activeSynergies, setActiveSynergies] = useState([]);
  const activeSynergiesRef = useRef([]);
  activeSynergiesRef.current = activeSynergies;
  const hasSynergy = (id) => activeSynergiesRef.current.some(s => s.id === id);

  // ─── FEATURE: Saber Equipment ───
  const [ownedSabers, setOwnedSabers] = useState(["basic_saber"]);
  const ownedSabersRef = useRef(["basic_saber"]);
  ownedSabersRef.current = ownedSabers;
  const [equippedSaber, setEquippedSaber] = useState("basic_saber");
  const equippedSaberRef = useRef("basic_saber");
  equippedSaberRef.current = equippedSaber;
  const getEquippedSaberData = () => SABERS.find(s => s.id === equippedSaberRef.current) || SABERS[0];
  // Moonblade: rolled bonuses { dmgBonus: 0-0.6, spellBonus: 0-0.6 }
  const [moonbladeBonus, setMoonbladeBonus] = useState(null);
  const moonbladeBonusRef = useRef(null);
  moonbladeBonusRef.current = moonbladeBonus;

  // ─── FEATURE: Morale System ───
  const [morale, setMorale] = useState(MORALE_CONFIG.initial);
  const moraleRef = useRef(MORALE_CONFIG.initial);
  moraleRef.current = morale;
  const changeMorale = (eventId) => {
    const ev = MORALE_EVENTS[eventId];
    if (!ev) return;
    setMorale(prev => Math.max(MORALE_CONFIG.min, Math.min(MORALE_CONFIG.max, prev + ev.delta)));
  };

  // ─── FEATURE: Enemy Mutations ───
  const [activeMutations, setActiveMutations] = useState([]); // [{ npcName, mutation }]
  const activeMutationsRef = useRef([]);
  activeMutationsRef.current = activeMutations;
  const [killsByType, setKillsByType] = useState({}); // { "Krokodyl": 5, ... }
  const killsByTypeRef = useRef({});
  killsByTypeRef.current = killsByType;

  // ─── FEATURE: Bazaar Specials (expanded shop) ───
  const [boughtSpecials, setBoughtSpecials] = useState([]); // IDs of specials bought this run
  const [shopStock, setShopStock] = useState(null);         // { specials, biomeItems } for current visit
  const [shopDiscount, setShopDiscount] = useState(0);      // current bargain discount (0 = none)
  const [bargainUsed, setBargainUsed] = useState(false);    // already bargained this visit?
  const [activeBuffs, setActiveBuffs] = useState([]);       // [{ id, name, effect, roomsLeft, color }]
  const activeBuffsRef = useRef([]);
  activeBuffsRef.current = activeBuffs;

  // ─── FEATURE: Ghost Ship ───
  const [ghostShipActive, setGhostShipActive] = useState(false);
  const ghostShipActiveRef = useRef(false);
  ghostShipActiveRef.current = ghostShipActive;

  // ─── FEATURE: Magic Wand ───
  const [hasWand, setHasWand] = useState(false);
  const hasWandRef = useRef(false);
  hasWandRef.current = hasWand;
  const [wandActive, setWandActive] = useState(false);
  const wandActiveRef = useRef(false);
  wandActiveRef.current = wandActive;
  const wandOrbsRef = useRef({ active: false, startTime: 0, cursorX: 50, cursorY: 50, hitCooldowns: {}, lastDrainTime: 0 });
  const [_wandTick, setWandTick] = useState(0);

  // ─── FEATURE: Salwa Armatnia (hold-to-cast cannon barrage) ───
  const [salvaActive, setSalvaActive] = useState(false);
  const salvaActiveRef = useRef(false);
  salvaActiveRef.current = salvaActive;
  const salvaRef = useRef({ active: false, cursorX: 50, cursorY: 50, lastShotTime: 0 });
  const [_salvaTick, setSalvaTick] = useState(0);

  // ─── FEATURE: Combo Visual Feedback ───
  const [comboCounter, setComboCounter] = useState(0);
  const comboCounterRef = useRef(0);
  comboCounterRef.current = comboCounter;
  const [activeCombo, setActiveCombo] = useState(null);
  const comboTimerRef = useRef(null);

  // ─── FEATURE: Skillshot Aiming System ───
  const [skillshotMode, setSkillshotMode] = useState(false); // true when player is aiming
  const combatEngagedRef = useRef(false); // enemies passive until player first attacks
  const confusionActiveRef = useRef(false); // mushroom spores — enemies attack each other
  const [_skillshotSpell, setSkillshotSpell] = useState(null); // spell being aimed
  const [accuracy, setAccuracy] = useState({ hits: 0, misses: 0, headshots: 0 });
  const [accuracyStreak, setAccuracyStreak] = useState(0); // consecutive hits without miss
  const accuracyStreakRef = useRef(0);
  accuracyStreakRef.current = accuracyStreak;
  const [slowMotion, setSlowMotion] = useState(false);
  const slowMotionRef = useRef(false);

  // ─── FEATURE: Saber Swipe System ───
  const saberSwipingRef = useRef(false);
  const saberPointsRef = useRef([]); // [{x, y, time}] in game % coords
  const saberHitIdsRef = useRef(new Set()); // enemy IDs already hit in this swipe
  const [saberTrail, setSaberTrail] = useState([]); // for rendering the trail
  const saberCdRef = useRef(0); // cooldown timestamp
  slowMotionRef.current = slowMotion;

  // ─── FEATURE: Interactive Environment (Barrels) ───
  // (barrels removed — explosive obstacles are part of the biome obstacle system now)

  // ─── FEATURE: Player Defense Traps ───
  const [playerTraps, setPlayerTraps] = useState([]); // [{id, trapType, x, y, active, armed}]
  const playerTrapsRef = useRef([]);
  playerTrapsRef.current = playerTraps;
  const [placingTrap, setPlacingTrap] = useState(null); // trap config being placed

  // ─── FEATURE: Room Challenges ───
  const [roomChallenge, setRoomChallenge] = useState(null); // {id, desc, target, progress, reward, completed}
  const roomChallengeRef = useRef(null);
  roomChallengeRef.current = roomChallenge;

  // ─── FEATURE: Caravan Shield ───
  const [caravanShield, setCaravanShield] = useState({ active: false, cooldown: 0 });
  const caravanShieldRef = useRef({ active: false, cooldown: 0 });
  caravanShieldRef.current = caravanShield;

  // ─── FEATURE: XP & Level System ───
  const [playerXp, setPlayerXp] = useState(0);
  const [playerLevel, setPlayerLevel] = useState(1);
  const [levelPerks, setLevelPerks] = useState([]);
  const [levelUpChoices, setLevelUpChoices] = useState(null);
  const levelUpChoicesRef = useRef(null);
  levelUpChoicesRef.current = levelUpChoices;
  const playerXpRef = useRef(0);
  playerXpRef.current = playerXp;
  const playerLevelRef = useRef(1);
  playerLevelRef.current = playerLevel;
  const levelPerksRef = useRef([]);
  levelPerksRef.current = levelPerks;

  // Perk computed multipliers
  const getPerkCount = (id) => levelPerksRef.current.filter(p => p === id).length;
  const perkSpellDmgMult = 1 + getPerkCount("spell_dmg") * 0.10;
  const perkMaxMana = getPerkCount("max_mana") * 15;
  const perkMercHpBonus = getPerkCount("merc_hp") * 5;
  const perkCooldownMult = Math.pow(0.90, getPerkCount("cooldown"));
  const perkLootMult = 1 + getPerkCount("loot_value") * 0.20;
  const perkCaravanArmor = getPerkCount("caravan_armor");
  // MAX_MANA computed from base + knowledge upgrades + perks
  const MAX_MANA = BASE_MAX_MANA + (knowledgeUpgrades.manaPool || 0) * 10 + perkMaxMana;

  // ─── FEATURE: Spell Upgrades ───
  const [spellUpgrades, setSpellUpgrades] = useState({});
  const [upgradeChoices, setUpgradeChoices] = useState(null);
  const upgradeChoicesRef = useRef(null);
  upgradeChoicesRef.current = upgradeChoices;
  const spellUpgradesRef = useRef({});
  spellUpgradesRef.current = spellUpgrades;

  // ─── FEATURE: Crafting System ───
  const [craftingResources, setCraftingResources] = useState({});
  const craftingResourcesRef = useRef({});
  craftingResourcesRef.current = craftingResources;
  const [craftedConsumables, setCraftedConsumables] = useState([]);
  const [showCraftingPanel, setShowCraftingPanel] = useState(false);
  const [caravanReviveReady, setCaravanReviveReady] = useState(false);
  const caravanReviveReadyRef = useRef(false);
  caravanReviveReadyRef.current = caravanReviveReady;

  // ─── FEATURE: Difficulty Progression ───
  const [killStreak, setKillStreak] = useState(0);
  const killStreakRef = useRef(0);
  killStreakRef.current = killStreak;
  const [powerSpikeWarning, setPowerSpikeWarning] = useState(false);

  // ─── FEATURE: Risk vs Reward Events ───
  const [enemyBuffRooms, setEnemyBuffRooms] = useState(0);
  const enemyBuffRoomsRef = useRef(0);
  enemyBuffRoomsRef.current = enemyBuffRooms;
  const [playerDoubleDmgRooms, setPlayerDoubleDmgRooms] = useState(0);
  const playerDoubleDmgRoomsRef = useRef(0);
  playerDoubleDmgRoomsRef.current = playerDoubleDmgRooms;
  const [eventMercDmgBuff, setEventMercDmgBuff] = useState(0);
  const eventMercDmgBuffRef = useRef(0);
  eventMercDmgBuffRef.current = eventMercDmgBuff;
  const [eventMercHpBuff, setEventMercHpBuff] = useState(0);
  const eventMercHpBuffRef = useRef(0);
  eventMercHpBuffRef.current = eventMercHpBuff;

  // ─── FEATURE: Secret Room Buffs ───
  const [secretPermDmgBuff, setSecretPermDmgBuff] = useState(0); // permanent +X% dmg from secret rooms
  const secretPermDmgBuffRef = useRef(0);
  secretPermDmgBuffRef.current = secretPermDmgBuff;
  const [secretSpellBuffRooms, setSecretSpellBuffRooms] = useState(0); // rooms remaining for spell dmg buff
  const secretSpellBuffRoomsRef = useRef(0);
  secretSpellBuffRoomsRef.current = secretSpellBuffRooms;
  const [secretSpellBuffMult, setSecretSpellBuffMult] = useState(0); // spell dmg multiplier from secret rooms
  const secretSpellBuffMultRef = useRef(0);
  secretSpellBuffMultRef.current = secretSpellBuffMult;

  // ─── FEATURE: Crew Management ───
  const [crew, setCrew] = useState([]);           // [{role, loyalty, skillLevel, id}]
  const crewRef = useRef([]);
  crewRef.current = crew;
  const [_crewRecruitOffer, setCrewRecruitOffer] = useState(null);

  // ─── FEATURE: Story Events ───
  const [activeStory, setActiveStory] = useState(null);     // {id, currentStep}
  const activeStoryRef = useRef(null);
  activeStoryRef.current = activeStory;
  const [completedStories, setCompletedStories] = useState([]);
  const completedStoriesRef = useRef([]);
  completedStoriesRef.current = completedStories;
  const [storyEvent, setStoryEvent] = useState(null);       // current step event display
  const storyEventRef = useRef(null);
  storyEventRef.current = storyEvent;
  const [moralDilemma, setMoralDilemma] = useState(null);
  const moralDilemmaRef = useRef(null);
  moralDilemmaRef.current = moralDilemma;

  // ─── FEATURE: Sailing / Naval ───
  const [shipUpgrades, setShipUpgrades] = useState([]);     // IDs of bought upgrades
  const [seaEvent, setSeaEvent] = useState(null);           // current sea event
  const seaEventRef = useRef(null);
  seaEventRef.current = seaEvent;
  const [discoveredIslands, setDiscoveredIslands] = useState([]);
  const [riverSegment, setRiverSegment] = useState(false);   // true when river ship mini-game is active
  const [worldMap, setWorldMap] = useState(false);           // true when world map navigation is active
  const [riverMapOpen, setRiverMapOpen] = useState(false);   // true when river path map is shown
  const [riverPath, setRiverPath] = useState(null);          // chosen path from river map
  const [shipMapPos, setShipMapPos] = useState({ x: 640, y: 360 }); // ship position on world map
  const pendingDestBiomeRef = useRef(null); // chosen biome from world map, persists through events

  // ─── FEATURE: Advanced Traps & Fortifications ───
  const [unlockedFortifications, setUnlockedFortifications] = useState(["wooden_wall", "alarm_bell"]);
  const [_activeFortifications, setActiveFortifications] = useState([]); // placed this room
  const [_fortificationPhase, setFortificationPhase] = useState(false);

  // ─── FEATURE: Factions & Reputation ───
  const [factionRep, setFactionRep] = useState({
    merchants_guild: 0, treasure_hunters: 0, shadow_council: 0, royal_navy: 0,
  });
  const factionRepRef = useRef({ merchants_guild: 0, treasure_hunters: 0, shadow_council: 0, royal_navy: 0 });
  factionRepRef.current = factionRep;
  const [activeFactionQuest, setActiveFactionQuest] = useState(null);
  const activeFactionQuestRef = useRef(null);
  activeFactionQuestRef.current = activeFactionQuest;
  const [factionEvent, setFactionEvent] = useState(null);
  const factionEventRef = useRef(null);
  factionEventRef.current = factionEvent;

  // ─── FEATURE: Discovery & Collecting ───
  const [journal, setJournal] = useState({ biomes: [], enemies: [], bosses: [], treasures: [], events: [], secrets: [], artifacts: [], factions: [] });
  const [ownedArtifacts, setOwnedArtifacts] = useState([]);
  const [totalDiscoveries, setTotalDiscoveries] = useState(0);
  const [secretRoom, setSecretRoom] = useState(null);
  const secretRoomRef = useRef(null);
  secretRoomRef.current = secretRoom;
  const [_showJournal, setShowJournal] = useState(false);

  // Knowledge bonus: +5% damage per discovered NPC type (max +50%)
  const getKnowledgeBonus = (npcId) => {
    const entry = bestiaryRef.current[npcId];
    if (entry?.discovered) return 1.05; // 5% bonus for discovered NPCs
    return 1.0;
  };
  // Knowledge milestones: bonus based on total knowledge + spell power upgrade
  const getKnowledgeMilestoneBonus = () => {
    const k = knowledgeRef.current || 0;
    let bonus = 1.0;
    if (k >= 200) bonus = 1.15;
    else if (k >= 100) bonus = 1.10;
    else if (k >= 50) bonus = 1.05;
    // Knowledge shop spell power: +5% per level
    bonus += (knowledgeUpgradesRef.current.spellPower || 0) * 0.05;
    return bonus;
  };

  // Bestiary kill bonus: +10% per tier (5/20/50 kills) against a specific enemy type
  const BESTIARY_KILL_TIERS = [5, 20, 50];
  const getBestiaryKillBonus = (npcName) => {
    if (!npcName) return 1.0;
    const kills = killsByTypeRef.current[npcName] || 0;
    let bonus = 0;
    for (const threshold of BESTIARY_KILL_TIERS) {
      if (kills >= threshold) bonus += 0.10;
    }
    return 1.0 + bonus;
  };

  const showMessage = useCallback((text, color) => {
    setMsg({ text, color });
    setTimeout(() => setMsg(null), 1500);
  }, []);

  const addMoneyFn = useCallback((val) => {
    // Ghost Ship: triple loot
    let mult = ghostShipActiveRef.current ? GHOST_SHIP_CONFIG.lootMultiplier : 1;
    // Biome modifier: loot_mult (e.g. summer "Złote Żniwa" +25% copper)
    const mod = biomeModifierRef.current;
    if (mod?.effect?.type === "loot_mult" && mod.effect.copperMult) {
      mult *= mod.effect.copperMult;
    }
    // cursed_doubloon: x2 all loot
    if (hasRelic("cursed_doubloon")) mult *= 2;
    const adjusted = mult > 1 ? {
      copper: Math.round((val.copper || 0) * mult),
      silver: Math.round((val.silver || 0) * mult),
      gold: Math.round((val.gold || 0) * mult),
    } : val;
    setMoney(prev => {
      let tc = totalCopper(prev) + totalCopper(adjusted);
      return copperToMoney(tc);
    });
    setTotalGoldEarned(prev => prev + (adjusted.gold || 0) + (adjusted.silver || 0) / 100 + (adjusted.copper || 0) / 10000);
  }, []);

  // ─── XP & Level helpers ───
  const grantXp = useCallback((amount) => {
    setPlayerXp(prev => {
      const newXp = prev + amount;
      const needed = xpForLevel(playerLevelRef.current);
      if (newXp >= needed) {
        setPlayerLevel(l => l + 1);
        setLevelUpChoices(rollLevelPerks());
        return newXp - needed;
      }
      return newXp;
    });
  }, []);

  const selectPerk = useCallback((perk) => {
    setLevelPerks(prev => [...prev, perk.id]);
    setLevelUpChoices(null);
    showMessage(`${perk.name} aktywowany!`, perk.color || "#40e060");
  }, [showMessage]);

  // ─── Spell Upgrade helpers ───
  const selectUpgrade = useCallback((choice) => {
    setSpellUpgrades(prev => {
      const ups = prev[choice.spellId] || [];
      return { ...prev, [choice.spellId]: [...ups, choice.upgrade.id] };
    });
    setUpgradeChoices(null);
    showMessage(`${choice.spell.name}: ${choice.upgrade.name}!`, choice.upgrade.color || "#60c0ff");
  }, [showMessage]);

  // ─── Kill streak helpers ───
  const processKillStreak = useCallback(() => {
    setKillStreak(prev => {
      const newStreak = prev + 1;
      if (newStreak === 5) { addMoneyFn({ copper: 10 }); showMessage("Seria 5! +10 Cu", "#d4a030"); grantXp(5); }
      else if (newStreak === 10) { addMoneyFn({ copper: 25 }); showMessage("Seria 10! +25 Cu", "#d4a030"); grantXp(10); }
      else if (newStreak === 15) { addMoneyFn({ copper: 50 }); showMessage("Seria 15! +50 Cu", "#d4a030"); grantXp(20); }
      return newStreak;
    });
  }, [addMoneyFn, showMessage, grantXp]);

  // ─── Crew helpers ───
  const getCrewBonus = useCallback((bonusKey) => {
    let total = 0;
    for (const member of crewRef.current) {
      const role = CREW_ROLES.find(r => r.id === member.role);
      if (!role) continue;
      const loyaltyLvl = getLoyaltyLevel(member.loyalty);
      const skill = role.skills[Math.min(member.skillLevel, role.skills.length - 1)];
      const effect = member.skillLevel > 0 ? skill.effect : role.passive;
      if (effect && effect[bonusKey] !== undefined) {
        total += (typeof effect[bonusKey] === "number" ? effect[bonusKey] : 0) * loyaltyLvl.effectMult;
      }
    }
    return total;
  }, []);

  const updateCrewLoyalty = useCallback((delta) => {
    setCrew(prev => prev.map(m => ({ ...m, loyalty: Math.max(0, Math.min(100, m.loyalty + delta)) })));
  }, []);

  const addCrewMember = useCallback((roleId) => {
    const role = CREW_ROLES.find(r => r.id === roleId);
    if (!role) return;
    setCrew(prev => {
      if (prev.find(m => m.role === roleId)) return prev;
      return [...prev, { role: roleId, loyalty: 50, skillLevel: 0, id: Date.now() }];
    });
    showMessage(`${role.name} dołączył do załogi!`, "#40e060");
  }, [showMessage]);

  // ─── Faction helpers ───
  const changeFactionRep = useCallback((factionId, amount) => {
    setFactionRep(prev => ({
      ...prev,
      [factionId]: Math.max(-50, Math.min(100, (prev[factionId] || 0) + amount)),
    }));
    const faction = FACTIONS.find(f => f.id === factionId);
    if (faction) {
      const prefix = amount > 0 ? "+" : "";
      showMessage(`${faction.name}: ${prefix}${amount} reputacji`, faction.color);
    }
  }, [showMessage]);

  // ─── Discovery helpers ───
  const addDiscovery = useCallback((category, entry) => {
    let added = false;
    setJournal(prev => {
      const cat = prev[category] || [];
      if (cat.find(e => e.id === entry.id)) return prev;
      added = true;
      return { ...prev, [category]: [...cat, entry] };
    });
    // Only increment if journal actually changed (not a duplicate)
    if (added) setTotalDiscoveries(prev => prev + 1);
  }, []);

  // ─── Computed faction bonuses ───
  const _getAllFactionBonuses = () => {
    const bonuses = {};
    for (const faction of FACTIONS) {
      const rep = factionRepRef.current[faction.id] || 0;
      const bonus = getFactionBonus(faction.id, rep);
      if (bonus) bonuses[faction.id] = bonus;
    }
    return bonuses;
  };

  // ─── Computed artifact set bonuses (applied to damage, armor, etc.) ───
  const artifactSetBonuses = getCompletedSetBonuses(ownedArtifacts);
  const artifactDmgMult = artifactSetBonuses.reduce((m, b) => m * (b.effect.dmgMult || 1), 1);
  const artifactArmor = artifactSetBonuses.reduce((a, b) => a + (b.effect.caravanArmor || 0), 0);
  const artifactCooldownMult = artifactSetBonuses.reduce((m, b) => m * (b.effect.cooldownMult || 1), 1);
  const artifactDmgMultRef = useRef(1);
  artifactDmgMultRef.current = artifactDmgMult;
  const artifactArmorRef = useRef(0);
  artifactArmorRef.current = artifactArmor;
  const artifactCooldownMultRef = useRef(1);
  artifactCooldownMultRef.current = artifactCooldownMult;

  const [activeBoss, setActiveBoss] = useState(null);
  const activeBossRef = useRef(null);
  const [gameScale, setGameScale] = useState(1);
  const [isMobile, setIsMobile] = useState(() => isMobileScreen());
  const [gameDims, setGameDims] = useState(() => getGameDimensions());
  const meteorTimerRef = useRef(null);

  // Dynamic game dimensions
  const GAME_W = gameDims.w;
  const GAME_H = gameDims.h;

  // Map spell to death visual effect type
  const EXPLOSIVE_SPELLS = new Set(["fireball", "meteor", "earthquake"]);
  const getDeathElement = (spell) => {
    if (!spell) return "melee";
    if (EXPLOSIVE_SPELLS.has(spell.id)) return "explosion";
    if (spell.id === "lightning" || spell.id === "chainlightning") return "shot";
    return spell.element || "melee";
  };

  const canvasRef = useRef(null);
  const animCanvasRef = useRef(null);
  // Panoramic scrolling (legacy)
  const [panOffset, setPanOffset] = useState(0);
  const panRef = useRef({ dragging: false, startX: 0, startY: 0, startOffset: 0, startOffsetY: 0 });
  const panOffsetRef = useRef(0);
  // Sync ref from state ONLY when not actively dragging — during drag,
  // handlePanMove owns the ref and state may lag behind by a frame
  if (!panRef.current.dragging) panOffsetRef.current = panOffset;

  // Isometric camera
  const isoCameraRef = useRef(new IsoCamera());
  const isoModeRef = useRef(true); // enable isometric view
  const _physicsCanvasRef = useRef(null);
  const vaultRef = useRef(null);
  const gameContainerRef = useRef(null);
  const gameDimsRef = useRef(gameDims);
  gameDimsRef.current = gameDims;

  // Compute scale + detect mobile on resize
  useEffect(() => {
    const calc = () => {
      const mobile = isMobileScreen();
      setIsMobile(mobile);
      const dims = getGameDimensions();
      setGameDims(prev => (prev.w === dims.w && prev.h === dims.h) ? prev : dims);
      const vw = window.visualViewport?.width || window.innerWidth;
      const vh = (window.visualViewport?.height || window.innerHeight) - (mobile ? MOBILE_SPELLBAR_H : 0);
      // On mobile: force full-width scale (height matches by aspect ratio)
      setGameScale(mobile ? (vw / dims.w) : Math.min(vw / dims.w, vh / dims.h));
    };
    calc();
    window.addEventListener("resize", calc);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", calc);
    }
    return () => {
      window.removeEventListener("resize", calc);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", calc);
      }
    };
  }, []);

  // Prevent pinch-zoom and pull-to-refresh on mobile
  useEffect(() => {
    if (!isMobile) return;
    const preventZoom = (e) => {
      if (e.touches && e.touches.length > 1) e.preventDefault();
    };
    const preventContextMenu = (e) => e.preventDefault();
    document.addEventListener("touchmove", preventZoom, { passive: false });
    document.addEventListener("contextmenu", preventContextMenu);
    return () => {
      document.removeEventListener("touchmove", preventZoom);
      document.removeEventListener("contextmenu", preventContextMenu);
    };
  }, [isMobile]);

  // Request fullscreen on mobile on first touch
  useEffect(() => {
    if (!isMobile) return;
    const requestFullscreen = () => {
      const el = document.documentElement;
      const rfs = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
      if (rfs && !document.fullscreenElement && !document.webkitFullscreenElement) {
        rfs.call(el).catch(() => {});
      }
      document.removeEventListener("touchstart", requestFullscreen);
    };
    document.addEventListener("touchstart", requestFullscreen, { once: true });
    return () => document.removeEventListener("touchstart", requestFullscreen);
  }, [isMobile]);

  useEffect(() => { activeBossRef.current = activeBoss; }, [activeBoss]);

  // Auto-sync boss HP bar from walker state on every walkers change
  useEffect(() => {
    if (!activeBossRef.current) return;
    const bossWalker = walkers.find(w => w.isBoss && w.alive);
    if (bossWalker && bossWalker.hp !== activeBossRef.current.currentHp) {
      setActiveBoss(prev => prev ? { ...prev, currentHp: bossWalker.hp } : null);
    }
  }, [walkers]);

  // (showMessage & addMoneyFn moved before grantXp / selectPerk)

  // Spawn a floating damage popup at walker's current position
  const spawnDmgPopup = useCallback((wid, text, color, element) => {
    // Spawn PixiJS damage number (GPU-rendered, no React re-renders)
    if (pixiRef.current && physicsRef.current) {
      const entry = physicsRef.current.bodies[wid];
      if (entry && entry.limbBodies && entry.limbBodies.torso) {
        const pos = entry.limbBodies.torso.translation();
        const amount = parseInt(text.replace(/[^0-9]/g, "")) || 0;
        if (amount > 0) {
          pixiRef.current.spawnDamageNumber(pos.x, pos.y - 20, amount, element || "default", amount >= 40);
        }
        return;
      }
    }
    // Fallback: React popup only if PixiJS unavailable
    const wd = walkDataRef.current[wid];
    const xPct = wd ? wd.x : 50;
    const yPct = wd && wd.y != null ? wd.y : 65;
    const pid = ++dmgPopupIdCounter;
    setDmgPopups(prev => [...prev, { id: pid, x: xPct, y: yPct, text, color }]);
    setTimeout(() => setDmgPopups(prev => prev.filter(p => p.id !== pid)), 1100);
  }, []);

  // Card drop handler – called on every NPC kill
  const handleCardDrop = useCallback((npcData) => {
    // Track kills by enemy type for mutation system
    if (npcData.name) {
      setKillsByType(prev => ({ ...prev, [npcData.name]: (prev[npcData.name] || 0) + 1 }));
    }
    const card = rollCardDrop(npcData.biomeId, npcData.name, npcData.rarity);
    if (!card) return;
    setBestiary(prev => ({
      ...prev,
      [card.npcId]: {
        discovered: true,
        rarity: card.rarity,
      },
    }));
    setKnowledge(k => k + card.knowledge);
    const logId = Date.now() + Math.random();
    setCardLog(prev => [...prev.slice(-4), {
      id: logId,
      name: npcData.name,
      rarityLabel: card.rarityLabel,
      rarityColor: card.rarityColor,
      knowledge: card.knowledge,
    }]);
    setTimeout(() => setCardLog(prev => prev.filter(c => c.id !== logId)), 2000);
  }, []);

  // Summon auto-attack handler (called from RAF loop via ref)
  summonAttackRef.current = (friendlyId, enemyId, damage) => {
    // Morale: mercenary damage multiplier
    const moraleLevel = getMoraleThreshold(moraleRef.current);
    damage = Math.round(damage * moraleLevel.mercDmgMult);
    // War Drums: bonus damage from caravan aura
    const drumsData = CARAVAN_LEVELS[caravanLevelRef.current].warDrums;
    if (drumsData) damage = Math.round(damage * (1 + drumsData.bonus / 100));
    sfxMeleeHit();
    spawnDmgPopup(enemyId, `${damage}`, "#40e060");
    // Lunge on the friendly walker
    const fw = walkDataRef.current[friendlyId];
    if (fw) { fw.lungeFrames = 12; fw.lungeOffset = 24; }
    const ew = walkDataRef.current[enemyId];
    const meleeDirX = (fw && ew) ? Math.sign(ew.x - fw.x) || 1 : 1;
    // Alchemist passive: slow_hit — slow enemy on hit
    if (fw && fw.mercType === "mage" && ew && ew.alive) {
      if (!ew._origSpeed) ew._origSpeed = ew.speed;
      ew.speed = ew._origSpeed * 0.7;
      ew._slowedUntil = Date.now() + 2000;
    }
    // Clash effect at enemy position
    if (ew && animatorRef.current) {
      const ex = npcElsRef.current[enemyId];
      if (ex && gameContainerRef.current) {
        const gr = gameContainerRef.current.getBoundingClientRect();
        const r = ex.getBoundingClientRect();
        animatorRef.current.playMeleeClash(((r.left + r.width / 2) - gr.left) / gameScale, ((r.top + r.height / 2) - gr.top) / gameScale);
      }
    }
    // wampiryczny_pakt: summoned allies heal on hit
    if (hasSynergy("wampiryczny_pakt")) {
      const attacker = walkersRef.current.find(ww => ww.id === friendlyId && ww.alive);
      if (attacker && attacker.hp < attacker.maxHp) {
        const healAmt = Math.round(damage * 0.10);
        if (healAmt > 0) {
          setWalkers(pr => pr.map(ww => ww.id === friendlyId ? { ...ww, hp: Math.min(ww.maxHp, ww.hp + healAmt) } : ww));
          spawnDmgPopup(friendlyId, `+${healAmt}`, "#a050e0");
        }
      }
    }
    // Boss mana shield absorption
    let actualDamage = damage;
    if (activeBossRef.current?.manaShieldHp > 0) {
      const bw = walkersRef.current.find(ww => ww.isBoss && ww.id === enemyId);
      if (bw) {
        const absorbed = Math.min(actualDamage, activeBossRef.current.manaShieldHp);
        activeBossRef.current.manaShieldHp -= absorbed;
        actualDamage -= absorbed;
        if (absorbed > 0) spawnDmgPopup(enemyId, `${absorbed} BLOK`, "#4060ff");
        setActiveBoss(prev => prev ? { ...prev, manaShieldHp: activeBossRef.current.manaShieldHp } : null);
      }
    }
    setWalkers(prev => prev.map(w => {
      if (w.id !== enemyId || !w.alive || w.friendly) return w;
      const newHp = Math.max(0, w.hp - actualDamage);
      // Meteor boulder wave check
      if (w.isMeteorBoulder) checkMeteorWaveThreshold(enemyId, w.hp, newHp);
      // Sync boss HP bar immediately on melee damage
      if (w.isBoss && activeBossRef.current) {
        setActiveBoss(prev2 => prev2 ? { ...prev2, currentHp: newHp } : null);
      }
      if (newHp <= 0) {
        sfxNpcDeath();
        if (walkDataRef.current[enemyId]) walkDataRef.current[enemyId].alive = false;
        if (physicsRef.current) physicsRef.current.triggerRagdoll(enemyId, "melee", meleeDirX);
        // Meteor boulder destruction: ground loot
        if (w.isMeteorBoulder && meteorWaveRef.current) {
          spawnMeteorGroundLoot(meteorWaveRef.current.x, meteorWaveRef.current.y);
          meteorWaveRef.current = null;
          setMeteorite(null);
        } else {
          // Drop loot on the ground instead of giving directly
          const wd_kill = walkDataRef.current[w.id];
          const lootData = { ...(w.npcData.loot || {}) };
          if (hasRelic("golden_reaper")) {
            lootData.copper = (lootData.copper || 0) * 2;
            lootData.silver = (lootData.silver || 0) * 2;
          }
          spawnEnemyLoot(wd_kill, { ...w.npcData, loot: lootData }, w.isBoss);
        }
        // piracki_monopol synergy
        if (hasSynergy("piracki_monopol") && Math.random() < 0.20) {
          const bt = pickTreasure(roomRef.current);
          bt.biome = "Monopol"; bt.room = roomRef.current;
          const wd_kill = walkDataRef.current[w.id];
          if (wd_kill) {
            setGroundLoot(prev => [...prev, {
              id: `gl_${Date.now()}_monopol`, type: "treasure", treasure: bt,
              x: wd_kill.wx ?? wd_kill.x ?? 15, y: wd_kill.wy ?? wd_kill.y ?? 15,
              icon: bt.icon || "chest", label: bt.name, collected: false, spawnTime: Date.now(),
            }]);
          }
        }
        setKills(k => k + 1);
        handleCardDrop(w.npcData);
        // Ammo and saber drops now handled by spawnEnemyLoot ground system
        // Archer passive: ammo_drop — 15% chance for bonus ammo on kill
        if (fw && fw.mercType === "archer" && Math.random() < 0.15) {
          const ammoTypes = ["dynamite", "harpoon", "cannonball", "rum", "chain"];
          const dropType = ammoTypes[Math.floor(Math.random() * ammoTypes.length)];
          setAmmo(prev => ({ ...prev, [dropType]: (prev[dropType] || 0) + 1 }));
          const ammoShort = { dynamite: "dyn", harpoon: "harp", cannonball: "kula", rum: "rum", chain: "łańc" };
          spawnDmgPopup(friendlyId, `+1 ${ammoShort[dropType] || dropType}`, "#60a050");
        }
        // XP + streak on merc kill
        const xpAmt = w.isBoss ? 100 : w.isElite ? 50 : 10 + roomRef.current * 2;
        grantXp(xpAmt);
        processKillStreak();
        // necromancer: 10% chance to spawn temp friendly
        if (hasRelic("necromancer") && Math.random() < 0.10) {
          const mt = MERCENARY_TYPES[Math.floor(Math.random() * MERCENARY_TYPES.length)];
          setTimeout(() => {
            const nid = ++walkerIdCounter;
            const sx = walkDataRef.current[enemyId]?.x || 50;
            const nHp = Math.round(mt.hp * 0.7);
            const nDmg = Math.round(mt.damage * 0.7);
            const nd = { icon: mt.icon, name: `${mt.name}`, hp: nHp, resist: null, loot: {}, bodyColor: mt.bodyColor, armorColor: mt.armorColor, weapon: mt.weapon };
            setWalkers(pr => [...pr, { id: nid, npcData: nd, alive: true, dying: false, hp: nHp, maxHp: nHp, friendly: true }]);
            const _iso = isoModeRef.current;
            const _sy = _iso ? (ISO_CONFIG.MAP_ROWS / 2 + Math.random() * 8) : (25 + Math.random() * 65);
            walkDataRef.current[nid] = { x: sx, y: _sy, dir: 1, yDir: 1, speed: mt.speed, ySpeed: 0.01, minX: _iso ? 1 : 5, maxX: _iso ? ISO_CONFIG.MAP_COLS - 1 : 90, minY: _iso ? 1 : 25, maxY: _iso ? ISO_CONFIG.MAP_ROWS - 1 : 90, bouncePhase: 0, alive: true, friendly: true, damage: nDmg, attackCd: mt.attackCd || 2500, lungeFrames: 0, lungeOffset: 0, combatStyle: mt.combatStyle || "melee", mercType: mt.id, range: mt.range || 35 };
            if (physicsRef.current) physicsRef.current.spawnNpc(nid, _toPhysPct(sx, _iso, ISO_CONFIG.MAP_COLS), nd, true, _toPhysPct(_sy, _iso, ISO_CONFIG.MAP_ROWS));
            showMessage(`Nekromancja! ${mt.name} przywołany!`, "#a050e0");
            setTimeout(() => {
              if (walkDataRef.current[nid]) walkDataRef.current[nid].alive = false;
              if (physicsRef.current) physicsRef.current.removeNpc(nid);
              setWalkers(pr => pr.filter(ww => ww.id !== nid));
            }, 15000);
          }, 300);
        }
        if (w.npcData.biomeId === "meteor" && Math.random() < 0.08 && !ownedSabersRef.current.includes("moonblade")) {
          setOwnedSabers(prev => prev.includes("moonblade") ? prev : [...prev, "moonblade"]);
          showMessage("Zdobyto: Miecz Pełni Księżyca! Załóż w ekwipunku.", "#d4a030");
        }
        const friendlyW = prev.find(ww => ww.id === friendlyId);
        const mercName = friendlyW ? friendlyW.npcData.name : "najemnik";
        showMessage(`${w.npcData.name} pokonany przez ${mercName}! +${formatLootText(w.npcData.loot)}`, "#40e060");
        setTimeout(() => setWalkers(pr => pr.map(ww => ww.id === enemyId ? { ...ww, alive: false } : ww)), 2500);
        return { ...w, hp: 0, dying: true, dyingAt: Date.now() };
      }
      if (physicsRef.current) physicsRef.current.applyHit(enemyId, "melee", meleeDirX);
      return { ...w, hp: newHp };
    }));
  };

  // Enemy attacks friendly knight (called from RAF loop via ref)
  enemyAttackFriendlyRef.current = (enemyId, friendlyId, damage) => {
    sfxMeleeHit();
    spawnDmgPopup(friendlyId, `${damage}`, "#e05040");
    // Lunge on the enemy walker
    const ew = walkDataRef.current[enemyId];
    if (ew) { ew.lungeFrames = 12; ew.lungeOffset = 24; }
    const fw = walkDataRef.current[friendlyId];
    const meleeDirX = (ew && fw) ? Math.sign(fw.x - ew.x) || 1 : 1;
    // Clash effect at friendly position
    const fel = npcElsRef.current[friendlyId];
    if (fel && animatorRef.current && gameContainerRef.current) {
      const gr = gameContainerRef.current.getBoundingClientRect();
      const r = fel.getBoundingClientRect();
      animatorRef.current.playMeleeClash(((r.left + r.width / 2) - gr.left) / gameScale, ((r.top + r.height / 2) - gr.top) / gameScale, "#e05040");
    }
    setWalkers(prev => prev.map(w => {
      if (w.id !== friendlyId || !w.alive || !w.friendly) return w;
      const newHp = Math.max(0, w.hp - damage);
      if (newHp <= 0) {
        if (walkDataRef.current[friendlyId]) walkDataRef.current[friendlyId].alive = false;
        if (physicsRef.current) physicsRef.current.triggerRagdoll(friendlyId, "melee", meleeDirX);
        showMessage(`${w.npcData.name} poległ w walce!`, "#cc4040");
        changeMorale("merc_death");
        setTimeout(() => setWalkers(pr => pr.map(ww => ww.id === friendlyId ? { ...ww, alive: false } : ww)), 2500);
        return { ...w, hp: 0, dying: true, dyingAt: Date.now() };
      }
      if (physicsRef.current) physicsRef.current.applyHit(friendlyId, "melee", meleeDirX);
      return { ...w, hp: newHp };
    }));
  };

  // Confusion: enemy attacks another enemy (mushroom spores)
  enemyAttackEnemyRef.current = (attackerId, targetId, damage) => {
    sfxMeleeHit();
    spawnDmgPopup(targetId, `${damage}`, "#c080ff");
    const aw = walkDataRef.current[attackerId];
    if (aw) { aw.lungeFrames = 12; aw.lungeOffset = 24; }
    const tw = walkDataRef.current[targetId];
    const meleeDirX = (aw && tw) ? Math.sign(tw.x - aw.x) || 1 : 1;
    const tel = npcElsRef.current[targetId];
    if (tel && animatorRef.current && gameContainerRef.current) {
      const gr = gameContainerRef.current.getBoundingClientRect();
      const r = tel.getBoundingClientRect();
      animatorRef.current.playMeleeClash(((r.left + r.width / 2) - gr.left) / gameScale, ((r.top + r.height / 2) - gr.top) / gameScale, "#c080ff");
    }
    setWalkers(prev => prev.map(w => {
      if (w.id !== targetId || !w.alive || w.friendly) return w;
      const newHp = Math.max(0, w.hp - damage);
      if (newHp <= 0) {
        if (walkDataRef.current[targetId]) walkDataRef.current[targetId].alive = false;
        if (physicsRef.current) physicsRef.current.triggerRagdoll(targetId, "melee", meleeDirX);
        const npcData = w.npcData || {};
        if (npcData.loot) addMoneyFn(npcData.loot);
        showMessage(`${npcData.name || "Wróg"} pokonany przez sojusznika!`, "#c080ff");
        setTimeout(() => setWalkers(pr => pr.map(ww => ww.id === targetId ? { ...ww, alive: false } : ww)), 2500);
        return { ...w, hp: 0, dying: true, dyingAt: Date.now() };
      }
      if (physicsRef.current) physicsRef.current.applyHit(targetId, "melee", meleeDirX);
      return { ...w, hp: newHp };
    }));
  };

  // Enemy attacks caravan (called from RAF loop via ref)
  attackCaravanRef.current = (enemyId, damage) => {
    // Caravan shield: blocks one hit and deactivates
    if (caravanShieldRef.current.active) {
      setCaravanShield(prev => ({ ...prev, active: false }));
      spawnDmgPopup(enemyId, "TARCZA!", "#40a0ff");
      const ew2 = walkDataRef.current[enemyId];
      if (ew2) { ew2.lungeFrames = 8; ew2.lungeOffset = 12; }
      return;
    }
    // ice_core: 25% chance to fully block
    if (hasRelic("ice_core") && Math.random() < 0.25) {
      spawnDmgPopup(enemyId, "BLOK!", "#40a8b8");
      const ew = walkDataRef.current[enemyId];
      if (ew) { ew.lungeFrames = 12; ew.lungeOffset = 24; }
      return;
    }
    let armor = CARAVAN_LEVELS[caravanLevelRef.current].armor;
    // faith_shield: +3 armor
    if (hasRelic("faith_shield")) armor += 3;
    // twierdza synergy: +2 armor
    if (hasSynergy("twierdza")) armor += 2;
    // Perk: caravan armor
    armor += perkCaravanArmor;
    // Artifact set bonus: extra caravan armor
    armor += artifactArmorRef.current;
    let actualDmg = Math.max(1, damage - armor);
    // serpent_scale: 20% damage reduction (35% with zelazna_kliatwa synergy)
    if (hasRelic("serpent_scale")) actualDmg = Math.max(1, Math.round(actualDmg * (hasSynergy("zelazna_kliatwa") ? 0.65 : 0.80)));
    // cursed_doubloon: +20% damage taken (cost of doubled loot)
    if (hasRelic("cursed_doubloon")) actualDmg = Math.round(actualDmg * 1.20);
    // Height advantage: enemies on high ground deal more damage to caravan
    if (isoModeRef.current && terrainDataRef.current?.heightMap) {
      const ew = walkDataRef.current[enemyId];
      const _cp = caravanPosRef.current;
      if (ew && _cp) {
        const _ha = calcHeightAdvantage(ew.x, ew.y || ISO_CONFIG.MAP_ROWS / 2, _cp.x, _cp.y, terrainDataRef.current.heightMap);
        actualDmg = Math.round(actualDmg * _ha.damageMult);
      }
    }
    // Challenge: no_caravan_dmg fails on caravan damage
    if (roomChallengeRef.current?.id === "no_caravan_dmg" && !roomChallengeRef.current.completed && !roomChallengeRef.current.failed) {
      setRoomChallenge(prev => prev ? { ...prev, failed: true } : prev);
    }
    // Kill streak reset on caravan damage
    setKillStreak(0);
    sfxCaravanHit();
    sfxEnemyStrike();
    setCaravanHp(prev => {
      const newHp = Math.max(0, prev - actualDmg);
      const maxHp = CARAVAN_LEVELS[caravanLevelRef.current].hp;
      // Start/stop alarm based on HP threshold (30%)
      if (newHp > 0 && newHp / maxHp <= 0.3) startCaravanAlarm();
      else stopCaravanAlarm();
      return newHp;
    });
    changeMorale("caravan_hit");
    // Screen shake on caravan hit
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 150);
    // Attack slash overlay — weapon/claw slash across the screen
    const ew = walkDataRef.current[enemyId];
    // Spawn attack warn particles at enemy position
    if (ew && pixiRef.current) {
      const ewPx = isoModeRef.current ? (ew.x / ISO_CONFIG.MAP_COLS) * GAME_W : (ew.x / 100) * GAME_W;
      const ewPy = isoModeRef.current ? (ew.y / ISO_CONFIG.MAP_ROWS) * GAME_H : GAME_H * ((ew.y || 50) / 100);
      pixiRef.current.spawnEnemyAttackWarn(ewPx, ewPy);
    }
    const slashCenter = isoModeRef.current ? ISO_CONFIG.MAP_COLS / 2 : 50;
    const slashFromX = ew ? (ew.x < slashCenter ? 0 : 1) : Math.random() < 0.5 ? 0 : 1;
    const slashId = Date.now() + Math.random();
    setAttackSlash({ id: slashId, fromX: slashFromX, dmg: actualDmg });
    setTimeout(() => setAttackSlash(prev => prev?.id === slashId ? null : prev), 600);
    // Lunge anim on the enemy
    if (ew) { ew.lungeFrames = 12; ew.lungeOffset = 24; }
    // Thorn Armor: reflect damage back to attacking enemy
    const thornData = CARAVAN_LEVELS[caravanLevelRef.current].thornArmor;
    if (thornData && ew && ew.alive) {
      const reflectDmg = thornData.damage;
      ew.hp = (ew.hp || 0) - reflectDmg;
      spawnDmgPopup(enemyId, `${reflectDmg}`, "#e06030");
      if (ew.hp <= 0 && !ew.dying) {
        ew.alive = false;
        ew.dying = true;
        setWalkers(prev => prev.map(w => w.id === enemyId ? { ...w, hp: 0, dying: true, dyingAt: Date.now() } : w));
      }
    }
  };

  // Enemy ability attack (ranged: projectile, fireBreath, charge)
  enemyAbilityRef.current = (enemyId, friendlyId, damage, element) => {
    spawnDmgPopup(friendlyId, `${damage}`, "#e05040");
    const fw = walkDataRef.current[friendlyId];
    const ew = walkDataRef.current[enemyId];
    const dirX = (ew && fw) ? Math.sign(fw.x - ew.x) || 1 : 1;
    setWalkers(prev => prev.map(w => {
      if (w.id !== friendlyId || !w.alive || !w.friendly) return w;
      const newHp = Math.max(0, w.hp - damage);
      if (newHp <= 0) {
        if (walkDataRef.current[friendlyId]) walkDataRef.current[friendlyId].alive = false;
        if (physicsRef.current) physicsRef.current.triggerRagdoll(friendlyId, element || "melee", dirX);
        showMessage(`${w.npcData.name} poległ w walce!`, "#cc4040");
        changeMorale("merc_death");
        setTimeout(() => setWalkers(pr => pr.map(ww => ww.id === friendlyId ? { ...ww, alive: false } : ww)), 2500);
        return { ...w, hp: 0, dying: true, dyingAt: Date.now() };
      }
      if (physicsRef.current) physicsRef.current.applyHit(friendlyId, element || "melee", dirX);
      return { ...w, hp: newHp };
    }));
  };

  // ─── DEAD WALKER CLEANUP (removes stuck dying walkers) ───
  useEffect(() => {
    const iv = setInterval(() => {
      const now = Date.now();
      setWalkers(prev => {
        const cleaned = prev.filter(w => {
          if (w.dying && w.dyingAt && now - w.dyingAt > 3000) {
            // Also clean up walkData and physics
            delete walkDataRef.current[w.id];
            if (physicsRef.current) physicsRef.current.removeNpc(w.id);
            return false;
          }
          if (!w.alive && !w.dying) {
            delete walkDataRef.current[w.id];
            return false;
          }
          return true;
        });
        return cleaned.length !== prev.length ? cleaned : prev;
      });
    }, 2000);
    return () => clearInterval(iv);
  }, []);

  // ─── WALKING NPC RAF LOOP ───
  useEffect(() => {
    const atkCds = {};
    let lastTime = performance.now();
    let frameCount = 0;
    // Pre-allocated reusable arrays to avoid GC pressure
    let _friendlyList = [];
    let _enemyList = [];
    // Cache knight positions per frame for O(1) aura lookup
    let _knightPositions = []; // [{x, y}]
    const loop = () => {
      walkRafRef.current = requestAnimationFrame(loop);
      // Pause game when any modal/overlay is blocking gameplay
      if (levelUpChoicesRef.current || upgradeChoicesRef.current
        || relicChoicesRef.current || storyEventRef.current || moralDilemmaRef.current
        || factionEventRef.current || seaEventRef.current || showChestRef.current
        || secretRoomRef.current) {
        lastTime = performance.now();
        // Still render physics (so visuals stay) but skip all logic
        if (physicsRef.current) physicsRef.current.step();
        return;
      }
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1); // delta seconds, capped at 100ms
      lastTime = now;
      frameCount++;
      const wd = walkDataRef.current;
      // Cache Date.now() once per frame instead of calling it dozens of times in inner loops
      const dateNow = Date.now();

      // ─── OPTIMIZATION: Pre-compute friendly/enemy arrays once per frame ───
      // Reuse arrays to avoid allocation
      const allIds = Object.keys(wd);
      _friendlyList.length = 0;
      _enemyList.length = 0;
      _knightPositions.length = 0;
      const friendlyList = _friendlyList;
      const enemyList = _enemyList;
      const knightPositions = _knightPositions;
      for (const id of allIds) {
        const w = wd[id];
        if (!w || !w.alive) continue;
        if (w.friendly) {
          friendlyList.push({ id, w });
          // Cache knight positions for aura checks
          if (w.mercType === "knight") {
            knightPositions.push({ x: w.x, y: w.y || 50 });
          }
        }
        else enemyList.push({ id, w });
      }

      // Helper: check if any knight is within aura range (uses cached positions, O(k) where k = knight count)
      const _hasKnightAura = (wx, wy) => {
        for (let ki = 0; ki < knightPositions.length; ki++) {
          const kp = knightPositions[ki];
          const adx = kp.x - wx;
          const ady = (kp.y - wy) * 0.5;
          if (adx * adx + ady * ady < 625) return true; // 25*25 = 625, avoid sqrt
        }
        return false;
      };

      for (let wi = 0; wi < allIds.length; wi++) {
        const id = allIds[wi];
        const w = wd[id];
        if (!w || !w.alive) continue;
        // Cache parseInt(id) once per walker per frame
        const idNum = parseInt(id);

        if (w.friendly) {
          // Friendly AI: find nearest enemy from pre-computed list
          let nearX = null, nearY = null, nearDist = Infinity, nearId = null;
          const _fDefY = isoModeRef.current ? ISO_CONFIG.MAP_ROWS / 2 : 65;
          const _fYScale = isoModeRef.current ? 1 : 0.5;
          for (let ei = 0; ei < enemyList.length; ei++) {
            const e = enemyList[ei].w;
            const dx = e.x - w.x;
            const dy = ((e.y || _fDefY) - (w.y || _fDefY)) * _fYScale;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < nearDist) { nearDist = dist; nearX = e.x; nearY = e.y || _fDefY; nearId = enemyList[ei].id; }
          }

          // Mage mana regen (uses dt for frame-rate independence)
          if (w.mercType === "mage" && w.maxMana) {
            w.currentMana = Math.min(w.maxMana, (w.currentMana || 0) + (w.manaRegen || 2) * dt);
          }

          // Stationary walkers: no movement, but ranged can still shoot
          if (w.stationary) {
            if (w.combatStyle === "ranged" && nearId !== null) {
              const range = w.range || 40;
              const _stLOS = !isoModeRef.current || !terrainDataRef.current ||
                hasLineOfSight(w.x, w.y || ISO_CONFIG.MAP_ROWS / 2, wd[nearId]?.x || nearX, wd[nearId]?.y || nearY || ISO_CONFIG.MAP_ROWS / 2, terrainDataRef.current, terrainDestructionRef.current);
              if (_stLOS && nearDist < range) {
                w.dir = (wd[nearId]?.x || 50) > w.x ? 1 : -1;
                const projCd = w.projectileCd || w.attackCd || 2000;
                if (!atkCds[id] || dateNow - atkCds[id] > projCd) {
                  atkCds[id] = dateNow;
                  if (physicsRef.current) {
                    physicsRef.current.triggerAttackAnim(idNum);
                    const targetWd = wd[nearId];
                    const targetXPct = targetWd ? targetWd.x : nearX;
                    const _idNum = idNum; // capture for closure
                    physicsRef.current.spawnProjectile(
                      idNum, targetXPct, "arrow", w.projectileDamage || w.damage || 8, null,
                      (hitId, dmg) => { if (summonAttackRef.current) summonAttackRef.current(_idNum, hitId, dmg); },
                      parseInt(nearId), panOffsetRef.current
                    );
                  }
                }
              }
            }
          } else {

          const isRanged = w.combatStyle === "ranged";

          // Terrain speed modifier for friendly mercenaries
          let _fTerrainMod = 1.0;
          if (isoModeRef.current && terrainDataRef.current) {
            _fTerrainMod = applyTerrainMovement(w, terrainDataRef.current);
            if (_fTerrainMod <= 0) _fTerrainMod = 0.1;
          }

          if (nearX !== null) {
            if (isRanged) {
              // Ranged AI: keep distance, strafe while shooting
              if (!w.strafeDir) w.strafeDir = Math.random() < 0.5 ? 1 : -1;
              const _fRangedClose = isoModeRef.current ? 4 : 15;
              const _fRangedFar = isoModeRef.current ? 10 : 35;
              if (nearDist < _fRangedClose) {
                w.dir = nearX > w.x ? -1 : 1; // retreat
                w.x += w.speed * w.dir * _fTerrainMod;
              } else if (nearDist > _fRangedFar) {
                w.dir = nearX > w.x ? 1 : -1; // approach
                w.x += w.speed * w.dir * _fTerrainMod;
              }
              w.dir = nearX > w.x ? 1 : -1; // face enemy
              // Strafe in Y while in combat range
              if (w.y != null) {
                if (nearDist < 35 && nearDist > 12) {
                  // Active strafe while at ideal range
                  w.y += w.strafeDir * (w.ySpeed || 0.01) * 1.2 * _fTerrainMod;
                  if (Math.random() < 0.008) w.strafeDir *= -1;
                } else if (nearY != null) {
                  // Drift toward enemy Y when not in ideal range
                  const yd = nearY - w.y;
                  if (Math.abs(yd) > 3) w.y += Math.sign(yd) * (w.ySpeed || 0.01) * 0.5 * _fTerrainMod;
                }
              }

              let range = w.range || 35;
              // Height advantage: mercenaries on high ground get extra range
              if (isoModeRef.current && terrainDataRef.current?.heightMap && nearX != null) {
                const _ha = calcHeightAdvantage(w.x, w.y || ISO_CONFIG.MAP_ROWS / 2, nearX, nearY || ISO_CONFIG.MAP_ROWS / 2, terrainDataRef.current.heightMap);
                range += _ha.rangeBonusTiles;
              }
              // LOS check for ranged mercenaries
              const _mercHasLOS = !isoModeRef.current || !terrainDataRef.current ||
                hasLineOfSight(w.x, w.y || ISO_CONFIG.MAP_ROWS / 2, nearX, nearY || ISO_CONFIG.MAP_ROWS / 2, terrainDataRef.current, terrainDestructionRef.current);
              if (_mercHasLOS && nearDist < range) {
                // Sheriff aura: use cached knight positions instead of O(n) scan
                const rangedAuraBonus = _hasKnightAura(w.x, w.y || 50) ? 1.15 : 1;

                if (w.mercType === "mage") {
                  // Mage ranged spell (sea_shanty: -20% cooldown on sea biomes)
                  const _seaBiomes = ["island", "blue_lagoon", "sunset_beach"];
                  const _seaMult = (hasRelic("sea_shanty") && _seaBiomes.includes(biome?.id)) ? 0.80 : 1;
                  const spellCd = Math.round((w.spellCd || 3500) * _seaMult);
                  const spellCost = w.spellCost || 15;
                  if ((w.currentMana || 0) >= spellCost && (!atkCds[id] || dateNow - atkCds[id] > spellCd)) {
                    w.currentMana -= spellCost;
                    atkCds[id] = dateNow;
                    if (physicsRef.current) {
                      physicsRef.current.triggerAttackAnim(idNum);
                      const targetWd = wd[nearId];
                      const targetXPct = targetWd ? targetWd.x : nearX;
                      const _idNum = idNum;
                      physicsRef.current.spawnProjectile(
                        idNum, targetXPct, "mageSpell", Math.round((w.spellDamage || 14) * rangedAuraBonus), w.spellElement || "fire",
                        (hitId, dmg) => { if (summonAttackRef.current) summonAttackRef.current(_idNum, hitId, dmg); },
                        parseInt(nearId), panOffsetRef.current
                      );
                    }
                  } else if ((w.currentMana || 0) < (w.spellCost || 15) && nearDist < 8) {
                    // Fallback melee when out of mana
                    const meleeCd = 2000;
                    const cdKey = "m" + id;
                    if (!atkCds[cdKey] || dateNow - atkCds[cdKey] > meleeCd) {
                      atkCds[cdKey] = dateNow;
                      if (summonAttackRef.current) summonAttackRef.current(idNum, parseInt(nearId), w.meleeDamage || 3);
                    }
                  }
                } else if (w.mercType === "archer") {
                  // Archer ranged attack (sea_shanty: -20% cooldown on sea biomes)
                  const _seaBiomes2 = ["island", "blue_lagoon", "sunset_beach"];
                  const _seaMult2 = (hasRelic("sea_shanty") && _seaBiomes2.includes(biome?.id)) ? 0.80 : 1;
                  const projCd = Math.round((w.projectileCd || 1800) * _seaMult2);
                  if (!atkCds[id] || dateNow - atkCds[id] > projCd) {
                    atkCds[id] = dateNow;
                    if (physicsRef.current) {
                      physicsRef.current.triggerAttackAnim(idNum);
                      const targetWd = wd[nearId];
                      let targetXPct = targetWd ? targetWd.x : nearX;
                      // Storm: arrows have 30% chance to miss (offset target)
                      const ww = weatherRef.current;
                      if (ww?.accuracyMult?.arrow && Math.random() > ww.accuracyMult.arrow)
                        targetXPct += (Math.random() - 0.5) * 30;
                      const _idNum = idNum;
                      physicsRef.current.spawnProjectile(
                        idNum, targetXPct, "arrow", Math.round((w.projectileDamage || 6) * rangedAuraBonus), null,
                        (hitId, dmg) => { if (summonAttackRef.current) summonAttackRef.current(_idNum, hitId, dmg); },
                        parseInt(nearId), panOffsetRef.current
                      );
                    }
                  }
                }
              }
            } else {
              // Melee AI with combat states: approach → attack → retreat → circle → approach
              if (!w.combatState) w.combatState = "approach";
              if (!w.combatTimer) w.combatTimer = 0;
              if (!w.strafeDir) w.strafeDir = Math.random() < 0.5 ? 1 : -1;

              w.dir = nearX > w.x ? 1 : -1; // always face enemy

              // Distance thresholds scaled for iso vs panoramic
              const _fPushBack = isoModeRef.current ? 1 : 3;
              const _fCircleFar = isoModeRef.current ? 3 : 10;
              const _fCircleClose = isoModeRef.current ? 1.5 : 5;
              const _fCircleBreak = isoModeRef.current ? 4 : 14;
              const _fApproachDist = isoModeRef.current ? 2 : 6;
              const _fAttackRange = isoModeRef.current ? 3 : 10;
              const _fYThresh = isoModeRef.current ? 0.5 : 2;
              const _fYMult = isoModeRef.current ? 1.5 : 0.8;

              // Push back if too close
              if (nearDist < _fPushBack) {
                w.x -= w.speed * w.dir * 0.6 * _fTerrainMod;
              } else if (w.combatState === "retreat") {
                w.x -= w.speed * w.dir * 0.8 * _fTerrainMod;
                if (w.y != null) w.y += w.strafeDir * (w.ySpeed || 0.01) * 0.5 * _fTerrainMod;
                w.combatTimer--;
                if (w.combatTimer <= 0) {
                  w.combatState = Math.random() < 0.6 ? "circle" : "approach";
                  w.combatTimer = 30 + Math.floor(Math.random() * 40);
                }
              } else if (w.combatState === "circle") {
                if (w.y != null) w.y += w.strafeDir * (w.ySpeed || 0.01) * 1.5 * _fTerrainMod;
                if (nearDist > _fCircleFar) w.x += w.speed * w.dir * 0.4 * _fTerrainMod;
                else if (nearDist < _fCircleClose) w.x -= w.speed * w.dir * 0.3 * _fTerrainMod;
                w.combatTimer--;
                if (w.combatTimer <= 0 || nearDist > _fCircleBreak) {
                  w.combatState = "approach";
                  w.combatTimer = 0;
                  w.strafeDir *= -1;
                }
              } else {
                // Approach: move toward enemy
                if (nearDist > _fApproachDist) {
                  w.x += w.speed * w.dir * _fTerrainMod;
                  if (w.y != null && nearY != null) {
                    const yd = nearY - w.y;
                    if (Math.abs(yd) > _fYThresh) w.y += Math.sign(yd) * (w.ySpeed || 0.01) * _fYMult * _fTerrainMod;
                  }
                }
              }
              // Attack when in melee range
              if (nearDist < _fAttackRange) {
                const SEA_BIOMES = ["island", "blue_lagoon", "sunset_beach"];
                const seaShantyMult = (hasRelic("sea_shanty") && SEA_BIOMES.includes(biome?.id)) ? 0.80 : 1;
                const atkCdMs = Math.round((w.attackCd || 2500) * seaShantyMult);
                if (!atkCds[id] || dateNow - atkCds[id] > atkCdMs) {
                  atkCds[id] = dateNow;
                  let knightDmg = w.damage || 5;
                  // Rogue crit: chance for double damage (+perk bonus)
                  const mercCritBonus = getPerkCount("merc_crit") * 0.10;
                  if (w.mercType === "rogue" && Math.random() < ((w.critChance || 0.25) + mercCritBonus)) {
                    knightDmg = Math.round(knightDmg * (w.critMult || 2.0));
                    spawnDmgPopup(parseInt(nearId), `KRYT! ${knightDmg}`, "#ff8020");
                  }
                  // Pirate passive: combo_strike — every Nth hit deals double damage
                  if (w.mercType === "rogue" && w._passiveCombo !== undefined) {
                    w._passiveCombo = (w._passiveCombo || 0) + 1;
                    if (w._passiveCombo >= 5) {
                      knightDmg = Math.round(knightDmg * 2.0);
                      w._passiveCombo = 0;
                      spawnDmgPopup(parseInt(nearId), `COMBO! ${knightDmg}`, "#ffa040");
                    }
                  }
                  // Sheriff passive: aura — use cached knight positions (O(k) instead of O(n))
                  if (_hasKnightAura(w.x, w.y || 50)) {
                    knightDmg = Math.round(knightDmg * 1.15);
                  }
                  // berserker: merc <30% HP → 2x damage
                  if (hasRelic("berserker")) {
                    // Use w.hp/w.maxHp from walkData instead of O(n) find on walkersRef
                    if (w.hp !== undefined && w.maxHp && w.hp / w.maxHp < 0.30) knightDmg *= 2;
                  }
                  if (physicsRef.current) physicsRef.current.triggerAttackAnim(idNum);
                  if (summonAttackRef.current) summonAttackRef.current(idNum, parseInt(nearId), knightDmg);
                  w.combatState = Math.random() < 0.5 ? "retreat" : "circle";
                  w.combatTimer = 20 + Math.floor(Math.random() * 30);
                  w.strafeDir = Math.random() < 0.5 ? 1 : -1;
                }
              }
            }
          } else {
            // No enemies – normal patrol
            w.combatState = null;
            w.combatTimer = 0;
            {
              let _fPatrolMod = 1.0;
              if (isoModeRef.current && terrainDataRef.current) {
                _fPatrolMod = applyTerrainMovement(w, terrainDataRef.current);
                if (_fPatrolMod <= 0) _fPatrolMod = 0.1;
              }
              w.x += w.speed * w.dir * _fPatrolMod;
            }
            if (w.x > w.maxX) { w.x = w.maxX; w.dir = -1; }
            if (w.x < w.minX) { w.x = w.minX; w.dir = 1; }
          }
          } // end !stationary else
        } else {
          // Enemies are passive until the player attacks first
          if (!combatEngagedRef.current && defenseModeRef.current?.phase !== "wave_active") {
            // Idle patrol only — enemies passive until player attacks (skip in defense mode)
            {
              let _ePatrolMod = 1.0;
              if (isoModeRef.current && terrainDataRef.current) {
                _ePatrolMod = applyTerrainMovement(w, terrainDataRef.current);
                if (_ePatrolMod <= 0) { w.dir *= -1; _ePatrolMod = 0.1; } // reverse if stuck
              }
              w.x += w.speed * w.dir * _ePatrolMod;
            }
            if (w.x > w.maxX) { w.x = w.maxX; w.dir = -1; }
            if (w.x < w.minX) { w.x = w.minX; w.dir = 1; }
          } else {
          // Confusion: enemies attack each other (mushroom spores)
          if (confusionActiveRef.current) {
            let nearEnemyDist = Infinity, nearEnemyId = null, nearEnemyX = null, nearEnemyY = null;
            for (const eid in wd) {
              if (eid === id) continue;
              const ew = wd[eid];
              if (!ew || !ew.alive || ew.friendly) continue;
              const dx = ew.x - w.x;
              const _defY = isoModeRef.current ? ISO_CONFIG.MAP_ROWS / 2 : 50;
              const dy = ((ew.y || _defY) - (w.y || _defY)) * (isoModeRef.current ? 1 : 0.5);
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < nearEnemyDist) { nearEnemyDist = dist; nearEnemyId = eid; nearEnemyX = ew.x; nearEnemyY = ew.y || _defY; }
            }
            if (nearEnemyId !== null) {
              w.dir = nearEnemyX > w.x ? 1 : -1;
              const _confApproachDist = isoModeRef.current ? 3 : 6;
              if (nearEnemyDist > _confApproachDist) {
                w.x += w.speed * w.dir;
                if (w.y != null && nearEnemyY != null) {
                  const yd = nearEnemyY - w.y;
                  const _yTh = isoModeRef.current ? 0.5 : 2;
                  if (Math.abs(yd) > _yTh) w.y += Math.sign(yd) * (w.ySpeed || 0.01) * (isoModeRef.current ? 1.5 : 0.6);
                }
              }
              if (nearEnemyDist < 10) {
                const cdKey = "conf" + id;
                if (!atkCds[cdKey] || dateNow - atkCds[cdKey] > 2000) {
                  atkCds[cdKey] = dateNow;
                  const eDmg = w.damage || 5;
                  if (enemyAttackEnemyRef.current) enemyAttackEnemyRef.current(idNum, parseInt(nearEnemyId), eDmg);
                }
              }
            }
            continue; // skip normal AI while confused
          }

          // Enemy AI: always target the caravan as primary objective
          let friendX = null, friendY = null, friendDist = Infinity, friendId = null;
          let targetIsCaravan = true;
          {
            let caravanX, caravanY;
            if (isoModeRef.current) {
              caravanX = caravanPosRef.current.x;
              caravanY = caravanPosRef.current.y;
            } else {
              caravanX = 50; caravanY = 92;
            }
            const dxC = caravanX - w.x;
            const dyC = (caravanY - (w.y || (isoModeRef.current ? ISO_CONFIG.MAP_ROWS / 2 : 50))) * (isoModeRef.current ? 1 : 0.5);
            friendDist = Math.sqrt(dxC * dxC + dyC * dyC);
            friendX = caravanX;
            friendY = caravanY;
          }
          // Friendly NPCs can intercept if they are closer to the enemy than the caravan
          for (let fi = 0; fi < friendlyList.length; fi++) {
            const f = friendlyList[fi].w;
            const dx = f.x - w.x;
            const _yScale = isoModeRef.current ? 1 : 0.5;
            const dy = ((f.y || (isoModeRef.current ? ISO_CONFIG.MAP_ROWS / 2 : 50)) - (w.y || (isoModeRef.current ? ISO_CONFIG.MAP_ROWS / 2 : 50))) * _yScale;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < friendDist * 0.6) { // friendly must be significantly closer to distract
              friendDist = dist; friendX = f.x; friendY = f.y || 50;
              friendId = friendlyList[fi].id; targetIsCaravan = false;
            }
          }

          // ─── VISUAL STATE MANAGEMENT ───
          // Set aggroState based on distance and combat phase
          {
            const _engageDist = isoModeRef.current ? 25 : 25;
            const _oldState = w.aggroState || "idle";
            if (w.windupTimer > 0) {
              w.windupTimer--;
              w.aggroState = "windup";
            } else if (w.combatState === "retreat" || w.combatState === "circle") {
              w.aggroState = "alert";
            } else if (friendDist < _engageDist) {
              w.aggroState = "alert";
            } else {
              w.aggroState = "idle";
            }
            // Push visual state to physics renderer
            if (physicsRef.current) {
              const currentHp = walkers.find(ww => ww.id === idNum);
              const hpPct = currentHp ? currentHp.hp / (currentHp.maxHp || currentHp.hp || 1) : 1;
              physicsRef.current.setNpcVisualState(idNum, w.aggroState, hpPct);
            }
          }

          // NPC ability usage (any combat encounter) — targets caravan or intercepting friendlies
          if (w.ability && friendX !== null) {
            const ability = w.ability;
            const abCdKey = "ab" + id;
            // Scale ability range to ~4-6 tiles (iso: 5-6 tiles, panoramic: ~13-15 units)
            const _abIsRanged = ["poisonSpit", "iceShot", "shadowBolt", "fireBreath", "drain"].includes(ability.type);
            let _effectiveAbRange = isoModeRef.current
              ? (_abIsRanged ? Math.min(ability.range, 6) : Math.min(ability.range, 2))
              : (_abIsRanged ? Math.min(ability.range * 0.55, 15) : Math.min(ability.range * 0.25, 5));
            // Height advantage: enemies on high ground get extra range
            if (isoModeRef.current && terrainDataRef.current?.heightMap && _abIsRanged) {
              const _ha = calcHeightAdvantage(w.x, w.y || ISO_CONFIG.MAP_ROWS / 2, friendX, friendY || ISO_CONFIG.MAP_ROWS / 2, terrainDataRef.current.heightMap);
              _effectiveAbRange += _ha.rangeBonusTiles;
            }
            // LOS check: ranged enemies need clear line of sight through terrain/vegetation
            const _hasLOS = !_abIsRanged || !isoModeRef.current || !terrainDataRef.current ||
              hasLineOfSight(w.x, w.y || ISO_CONFIG.MAP_ROWS / 2, friendX, friendY || ISO_CONFIG.MAP_ROWS / 2, terrainDataRef.current, terrainDestructionRef.current);
            if (_hasLOS && friendDist < _effectiveAbRange && (!atkCds[abCdKey] || dateNow - atkCds[abCdKey] > ability.cooldown)) {
              atkCds[abCdKey] = dateNow;
              const dirX = friendX > w.x ? 1 : -1;
              const _idNum = idNum; // capture for closures
              if (physicsRef.current) physicsRef.current.triggerAttackAnim(idNum);
              // Set visual state to attacking
              w.aggroState = "attacking";
              if (physicsRef.current) physicsRef.current.setNpcVisualState(idNum, "attacking");
              // Spawn ranged charge-up particles for projectile abilities
              if (_abIsRanged && pixiRef.current) {
                const ewPx = isoModeRef.current ? (w.x / ISO_CONFIG.MAP_COLS) * GAME_W : (w.x / 100) * GAME_W;
                const ewPy = isoModeRef.current ? ((w.y || ISO_CONFIG.MAP_ROWS / 2) / ISO_CONFIG.MAP_ROWS) * GAME_H : GAME_H * 0.25;
                pixiRef.current.spawnRangedChargeUp(ewPx, ewPy, ability.element);
              }
              // Caravan target pixel position for projectile targetPos
              const _caravanPosPx = targetIsCaravan ? (isoModeRef.current
                ? { x: (caravanPosRef.current.x / ISO_CONFIG.MAP_COLS) * GAME_W, y: (caravanPosRef.current.y / ISO_CONFIG.MAP_ROWS) * GAME_H }
                : { x: (50 / 100) * GAME_W, y: GAME_H * 0.85 }) : null;
              switch (ability.type) {
                case "fireBreath":
                  if (physicsRef.current) {
                    const tx = isoModeRef.current ? (w.x / ISO_CONFIG.MAP_COLS) * GAME_W : (w.x / 100) * GAME_W;
                    const ty = isoModeRef.current ? ((w.y || ISO_CONFIG.MAP_ROWS / 2) / ISO_CONFIG.MAP_ROWS) * GAME_H : GAME_H * 0.25 - 30;
                    physicsRef.current.fx.spawnFireBreath(tx, ty, dirX);
                  }
                  if (targetIsCaravan) {
                    if (attackCaravanRef.current) attackCaravanRef.current(idNum, ability.damage);
                  } else {
                    if (enemyAbilityRef.current) enemyAbilityRef.current(idNum, parseInt(friendId), ability.damage, ability.element);
                  }
                  break;
                case "poisonSpit":
                case "iceShot":
                case "shadowBolt": {
                  sfxEnemyProjectile();
                  const projType = ability.type === "poisonSpit" ? "poisonSpit"
                    : ability.type === "iceShot" ? "iceShard_npc" : "shadowBolt_npc";
                  if (physicsRef.current) {
                    const targetXPct = targetIsCaravan ? 50 : (wd[friendId] ? wd[friendId].x : friendX);
                    physicsRef.current.spawnProjectile(
                      idNum, targetXPct, projType, ability.damage, ability.element,
                      targetIsCaravan
                        ? (_hitId, dmg) => { if (attackCaravanRef.current) attackCaravanRef.current(_idNum, dmg); }
                        : (hitId, dmg, elem) => { if (enemyAbilityRef.current) enemyAbilityRef.current(_idNum, hitId, dmg, elem); },
                      targetIsCaravan ? null : parseInt(friendId),
                      _caravanPosPx
                    );
                  }
                  break;
                }
                case "charge": {
                  // Temporary speed boost + big melee damage
                  const origSpeed = w.speed;
                  w.speed = origSpeed * 3;
                  w.dir = friendX > w.x ? 1 : -1;
                  // P5: Set charge visual state
                  w.aggroState = "charging";
                  if (physicsRef.current) physicsRef.current.setNpcVisualState(idNum, "charging");
                  setTimeout(() => {
                    if (wd[id]) {
                      wd[id].speed = origSpeed;
                      wd[id].aggroState = "alert";
                      if (physicsRef.current) physicsRef.current.setNpcVisualState(parseInt(id), "alert");
                    }
                  }, 800);
                  if (targetIsCaravan) {
                    if (attackCaravanRef.current) attackCaravanRef.current(idNum, ability.damage);
                  } else {
                    if (enemyAbilityRef.current) enemyAbilityRef.current(idNum, parseInt(friendId), ability.damage, "melee");
                  }
                  break;
                }
                case "drain": {
                  // Like shadowBolt but heals boss for 50% of damage dealt
                  if (physicsRef.current) {
                    const targetXPct = targetIsCaravan ? 50 : (wd[friendId] ? wd[friendId].x : friendX);
                    physicsRef.current.spawnProjectile(
                      idNum, targetXPct, "shadowBolt_npc", ability.damage, "shadow",
                      (hitId, dmg, elem) => {
                        if (targetIsCaravan) {
                          if (attackCaravanRef.current) attackCaravanRef.current(_idNum, dmg);
                        } else {
                          if (enemyAbilityRef.current) enemyAbilityRef.current(_idNum, hitId, dmg, elem);
                        }
                        // Heal boss for 50% of damage dealt
                        const bossWd = wd[id];
                        if (bossWd && bossWd.isBoss) {
                          const healAmt = Math.floor(dmg * 0.5);
                          setWalkers(prev => prev.map(ww => {
                            if (ww.id !== _idNum || !ww.isBoss) return ww;
                            const newHp = Math.min(ww.maxHp, ww.hp + healAmt);
                            return { ...ww, hp: newHp };
                          }));
                          spawnDmgPopup(_idNum, `+${healAmt}`, "#40c040");
                        }
                      },
                      targetIsCaravan ? null : parseInt(friendId),
                      _caravanPosPx
                    );
                  }
                  break;
                }
              }
            }
          }

          // Boss phase tracking — read HP from walker state (walkersRef), not walkDataRef
          if (w.isBoss && activeBossRef.current) {
            const boss = activeBossRef.current;
            const bossWalker = walkersRef.current.find(ww => ww.id === idNum && ww.isBoss);
            const bossHp = bossWalker ? bossWalker.hp : boss.currentHp;
            const bossMaxHp = bossWalker ? bossWalker.maxHp : boss.maxHp;
            const hpRatio = bossMaxHp > 0 ? bossHp / bossMaxHp : 1;

            // Phase 1 → Phase 2
            if (boss.phase === 1 && boss.phase2 && hpRatio <= boss.phase2.hpThreshold) {
              if (boss.phase2.speed) w.speed = boss.phase2.speed;
              if (boss.phase2.attackCd) w.attackCd = boss.phase2.attackCd;
              if (boss.phase2.combatStyle) w.combatStyle = boss.phase2.combatStyle;
              if (boss.phase2.damage) w.damage = Math.round(boss.phase2.damage * (boss.roomScale || 1));
              if (boss.phase2.ability || boss.phase2.abilityCd) {
                const newAbType = boss.phase2.ability || boss.ability;
                w.ability = {
                  type: newAbType,
                  damage: Math.round((boss.phase2.damage || boss.damage) * 1.5),
                  element: newAbType === "fireBreath" ? "fire" : newAbType === "iceShot" ? "ice"
                    : newAbType === "poisonSpit" ? "poison" : newAbType === "shadowBolt" ? "shadow"
                    : newAbType === "drain" ? "shadow" : "melee",
                  range: (boss.phase2.combatStyle || boss.combatStyle) === "ranged" ? 50 : 30,
                  cooldown: boss.phase2.abilityCd || boss.abilityCd,
                };
              }
              const shieldData = boss.phase2.manaShield ? {
                manaShieldHp: Math.round(boss.phase2.shieldHp * (boss.roomScale || 1)),
                manaShieldMaxHp: Math.round(boss.phase2.shieldHp * (boss.roomScale || 1)),
              } : {};
              setActiveBoss(prev => prev ? { ...prev, phase: 2, ...shieldData } : null);
              spawnDmgPopup(idNum, "FAZA 2!", "#ff6020");
            }
            // Phase 2 → Phase 3 (Cosmic Titan)
            const bossPhaseNow = activeBossRef.current?.phase || boss.phase;
            if (bossPhaseNow === 2 && boss.phase3 && hpRatio <= boss.phase3.hpThreshold) {
              if (boss.phase3.speed) w.speed = boss.phase3.speed;
              if (boss.phase3.attackCd) w.attackCd = boss.phase3.attackCd;
              if (boss.phase3.combatStyle) w.combatStyle = boss.phase3.combatStyle;
              if (boss.phase3.ability || boss.phase3.abilityCd) {
                const newAbType = boss.phase3.ability || boss.ability;
                w.ability = {
                  type: newAbType,
                  damage: Math.round((boss.phase3.damage || boss.damage) * 1.5),
                  element: newAbType === "fireBreath" ? "fire" : newAbType === "iceShot" ? "ice"
                    : newAbType === "poisonSpit" ? "poison" : newAbType === "shadowBolt" ? "shadow"
                    : newAbType === "drain" ? "shadow" : "melee",
                  range: (boss.phase3.combatStyle || boss.combatStyle) === "ranged" ? 50 : 30,
                  cooldown: boss.phase3.abilityCd || boss.abilityCd,
                };
              }
              setActiveBoss(prev => prev ? { ...prev, phase: 3 } : null);
              spawnDmgPopup(idNum, "FAZA 3!", "#e040e0");
            }

            // Sync HP to state for BossHpBar
            if (bossHp !== boss.currentHp) {
              setActiveBoss(prev => prev ? { ...prev, currentHp: bossHp } : null);
            }
          }

          if (friendX !== null && friendDist < 25) {
            // Check if blocked by a player barricade on the path
            let barricadeBlock = false;
            const pTrapsCheck = playerTrapsRef.current;
            const _defYb = isoModeRef.current ? ISO_CONFIG.MAP_ROWS / 2 : 50;
            const _yScaleB = isoModeRef.current ? 1 : 0.5;
            for (let bi = 0; bi < pTrapsCheck.length; bi++) {
              const bt = pTrapsCheck[bi];
              if (!bt.active || !(bt.trapType === "barricade" || bt.config?.type === "wall")) continue;
              const bdx = bt.x - w.x;
              const bdy = ((bt.y || _defYb) - (w.y || _defYb)) * _yScaleB;
              const bdistSq = bdx * bdx + bdy * bdy;
              const blockR = bt.config.blockRadius || (isoModeRef.current ? 2 : 5);
              if (bdistSq < blockR * blockR) {
                barricadeBlock = true;
                w.dir = bdx > 0 ? 1 : -1;
                const cdKey3 = "barr" + id;
                if (!atkCds[cdKey3] || dateNow - atkCds[cdKey3] > 2000) {
                  atkCds[cdKey3] = dateNow;
                  const eDmg2 = w.damage || 5;
                  bt.currentHp = (bt.currentHp != null ? bt.currentHp : bt.config.hp) - eDmg2;
                  spawnDmgPopup(idNum, `${eDmg2}`, "#8a6030");
                  if (bt.currentHp <= 0) {
                    bt.active = false;
                    sfxNpcDeath();
                    showMessage("Barykada zniszczona!", "#cc4040");
                    setPlayerTraps(prev => prev.map(t => t.id === bt.id ? { ...t, active: false } : t));
                  } else {
                    setPlayerTraps(prev => prev.map(t => t.id === bt.id ? { ...t, currentHp: bt.currentHp } : t));
                  }
                }
                break;
              }
            }
            if (barricadeBlock) {
              // Do nothing — stuck at barricade
            } else {

            if (!w.combatState) w.combatState = "approach";
            if (!w.combatTimer) w.combatTimer = 0;
            if (!w.strafeDir) w.strafeDir = Math.random() < 0.5 ? 1 : -1;

            w.dir = friendX > w.x ? 1 : -1; // face target

            // Terrain speed modifier for iso mode (roads boost, water/cliffs slow/block)
            let _terrainSpeedMod = 1.0;
            if (isoModeRef.current && terrainDataRef.current) {
              _terrainSpeedMod = applyTerrainMovement(w, terrainDataRef.current);
              // Also apply terrain destruction effects (fire zones slow, frozen speeds up)
              const _tdMod = terrainDestructionRef.current.getEffectSpeedMod(
                Math.floor(w.x), Math.floor(w.y ?? ISO_CONFIG.MAP_ROWS / 2), ISO_CONFIG.MAP_COLS
              );
              _terrainSpeedMod *= _tdMod;
              if (_terrainSpeedMod <= 0) _terrainSpeedMod = 0.05; // never fully stuck (find a way around)
            }

            // Determine if enemy uses ranged attacks (abilities like projectiles/breath)
            const _isEnemyRanged = w.ability && ["poisonSpit", "iceShot", "shadowBolt", "fireBreath", "drain"].includes(w.ability.type);
            // ~1 tile for melee, ~5 tiles for ranged
            const _meleeRange = isoModeRef.current ? 1.5 : 4;
            const _rangedIdeal = isoModeRef.current ? 5 : 13;
            const _engageDist = _isEnemyRanged ? _rangedIdeal : _meleeRange;

            if (_isEnemyRanged) {
              // Ranged enemy AI: maintain 4-6 tile distance, strafe while shooting
              if (friendDist < (_engageDist * 0.6)) {
                // Too close — retreat
                w.x -= w.speed * w.dir * 0.7 * _terrainSpeedMod;
                if (w.y != null) w.y += w.strafeDir * (w.ySpeed || 0.01) * 0.8 * _terrainSpeedMod;
              } else if (friendDist > (_engageDist * 1.3)) {
                // Too far — approach
                w.x += w.speed * w.dir * _terrainSpeedMod;
                if (w.y != null && friendY != null) {
                  const yd = friendY - w.y;
                  const _yThresh = isoModeRef.current ? 0.5 : 2;
                  if (Math.abs(yd) > _yThresh) w.y += Math.sign(yd) * (w.ySpeed || 0.01) * (isoModeRef.current ? 1.5 : 0.6) * _terrainSpeedMod;
                }
              } else {
                // At ideal range — strafe
                if (w.y != null) w.y += w.strafeDir * (w.ySpeed || 0.01) * 1.2 * _terrainSpeedMod;
                if (Math.random() < 0.008) w.strafeDir *= -1;
              }
            } else {
              // Melee enemy AI: approach to ~1 tile distance
              // Push back if too close
              if (friendDist < (isoModeRef.current ? 0.8 : 2)) {
                w.x -= w.speed * w.dir * 0.5 * _terrainSpeedMod;
              } else if (w.combatState === "retreat") {
                w.x -= w.speed * w.dir * 0.6 * _terrainSpeedMod;
                if (w.y != null) w.y += w.strafeDir * (w.ySpeed || 0.01) * 0.4 * _terrainSpeedMod;
                w.combatTimer--;
                if (w.combatTimer <= 0) {
                  w.combatState = Math.random() < 0.5 ? "circle" : "approach";
                  w.combatTimer = isoModeRef.current ? (20 + Math.floor(Math.random() * 30)) : (40 + Math.floor(Math.random() * 50));
                }
              } else if (w.combatState === "circle") {
                if (w.y != null) w.y += w.strafeDir * (w.ySpeed || 0.01) * 1.2 * _terrainSpeedMod;
                if (friendDist > _meleeRange * 2) w.x += w.speed * w.dir * 0.3 * _terrainSpeedMod;
                else if (friendDist < _meleeRange * 0.7) w.x -= w.speed * w.dir * 0.2 * _terrainSpeedMod;
                w.combatTimer--;
                if (w.combatTimer <= 0 || friendDist > _meleeRange * 3) {
                  w.combatState = "approach";
                  w.combatTimer = 0;
                  w.strafeDir *= -1;
                }
              } else {
                // Approach: move toward target — close both X and Y gaps
                if (friendDist > _meleeRange) {
                  w.x += w.speed * w.dir * _terrainSpeedMod;
                  if (w.y != null && friendY != null) {
                    const yd = friendY - w.y;
                    const _yThresh = isoModeRef.current ? 0.5 : 2;
                    const _yMult = isoModeRef.current ? 1.5 : 0.6;
                    if (Math.abs(yd) > _yThresh) w.y += Math.sign(yd) * (w.ySpeed || 0.01) * _yMult * _terrainSpeedMod;
                  }
                }
              }
            }
            // Melee attack when in close range (~1 tile)
            if (friendDist < _meleeRange) {
              const cdKey = "e" + id;
              if (!atkCds[cdKey] || dateNow - atkCds[cdKey] > 3000) {
                atkCds[cdKey] = dateNow;
                const eDmg = w.damage || 5;
                if (physicsRef.current) physicsRef.current.triggerAttackAnim(idNum);
                // P3: Enhanced lunge + slash trail particles
                w.aggroState = "attacking";
                if (physicsRef.current) physicsRef.current.setNpcVisualState(idNum, "attacking");
                if (pixiRef.current) {
                  const ewPx = isoModeRef.current ? (w.x / ISO_CONFIG.MAP_COLS) * GAME_W : (w.x / 100) * GAME_W;
                  const ewPy = isoModeRef.current ? ((w.y || ISO_CONFIG.MAP_ROWS / 2) / ISO_CONFIG.MAP_ROWS) * GAME_H : GAME_H * 0.25;
                  pixiRef.current.spawnMeleeSlashTrail(ewPx, ewPy, w.dir);
                }
                if (targetIsCaravan) {
                  if (attackCaravanRef.current) attackCaravanRef.current(idNum, eDmg);
                } else {
                  if (enemyAttackFriendlyRef.current) enemyAttackFriendlyRef.current(idNum, parseInt(friendId), eDmg);
                }
                w.combatState = Math.random() < 0.6 ? "retreat" : "circle";
                w.combatTimer = 25 + Math.floor(Math.random() * 35);
                w.strafeDir = Math.random() < 0.5 ? 1 : -1;
              }
            }
            } // end !barricadeBlock
          } else if (combatEngagedRef.current || defenseModeRef.current?.phase === "wave_active") {
            // No friendly target – march toward caravan; check for player barricades first
            w.combatState = null;
            let blockedByBarricade = false;
            const pTrapsForBlock = playerTrapsRef.current;
            const _defYb2 = isoModeRef.current ? ISO_CONFIG.MAP_ROWS / 2 : 50;
            const _yScaleB2 = isoModeRef.current ? 1 : 0.5;
            for (let bi = 0; bi < pTrapsForBlock.length; bi++) {
              const bt = pTrapsForBlock[bi];
              if (!bt.active || !(bt.trapType === "barricade" || bt.config?.type === "wall")) continue;
              const bdx = bt.x - w.x;
              const bdy = ((bt.y || _defYb2) - (w.y || _defYb2)) * _yScaleB2;
              const bdistSq = bdx * bdx + bdy * bdy;
              const blockR2 = bt.config.blockRadius || (isoModeRef.current ? 2 : 5);
              if (bdistSq < blockR2 * blockR2) {
                // Blocked — stop and attack the barricade
                blockedByBarricade = true;
                w.dir = bdx > 0 ? 1 : -1;
                const cdKey2 = "barr" + id;
                if (!atkCds[cdKey2] || dateNow - atkCds[cdKey2] > 2000) {
                  atkCds[cdKey2] = dateNow;
                  const eDmg = w.damage || 5;
                  bt.currentHp = (bt.currentHp != null ? bt.currentHp : bt.config.hp) - eDmg;
                  spawnDmgPopup(idNum, `${eDmg}`, "#8a6030");
                  if (bt.currentHp <= 0) {
                    bt.active = false;
                    sfxNpcDeath();
                    showMessage("Barykada zniszczona!", "#cc4040");
                    setPlayerTraps(prev => prev.map(t => t.id === bt.id ? { ...t, active: false } : t));
                  } else {
                    setPlayerTraps(prev => prev.map(t => t.id === bt.id ? { ...t, currentHp: bt.currentHp } : t));
                  }
                }
                break;
              }
            }
            if (!blockedByBarricade) {
              // March toward caravan
              const caravanX = isoModeRef.current ? caravanPosRef.current.x : 50;
              const caravanY = isoModeRef.current ? caravanPosRef.current.y : 92;
              const dxC = caravanX - w.x;
              const _defYm = isoModeRef.current ? ISO_CONFIG.MAP_ROWS / 2 : 50;
              const dyC = caravanY - (w.y || _defYm);
              // March speed: iso uses full speed toward caravan, panoramic uses 60%
              const _marchXMult = isoModeRef.current ? 1.0 : 0.6;
              const _marchYMult = isoModeRef.current ? 4.0 : 2.5;
              const _marchThresh = isoModeRef.current ? 0.5 : 2;
              // Terrain speed modifier for marching enemies
              let _marchTerrainMod = 1.0;
              if (isoModeRef.current && terrainDataRef.current) {
                _marchTerrainMod = applyTerrainMovement(w, terrainDataRef.current);
                const _tdMod2 = terrainDestructionRef.current.getEffectSpeedMod(
                  Math.floor(w.x), Math.floor(w.y ?? ISO_CONFIG.MAP_ROWS / 2), ISO_CONFIG.MAP_COLS
                );
                _marchTerrainMod *= _tdMod2;
                if (_marchTerrainMod <= 0) _marchTerrainMod = 0.05;
              }
              if (Math.abs(dxC) > _marchThresh) w.x += Math.sign(dxC) * w.speed * _marchXMult * _marchTerrainMod;
              if (w.y != null && Math.abs(dyC) > _marchThresh) w.y += Math.sign(dyC) * (w.ySpeed || 0.015) * _marchYMult * _marchTerrainMod;
              w.dir = dxC > 0 ? 1 : -1;
              // Attack when close enough to caravan (~1.5 tile: iso 2.25, panoramic 16)
              const distToCaravanSq = dxC * dxC + dyC * dyC;
              const _atkThreshSq = isoModeRef.current ? 2.25 : 16; // 1.5² or 4²
              if (distToCaravanSq < _atkThreshSq) {
                const cdKey = "ec" + id;
                if (!atkCds[cdKey] || dateNow - atkCds[cdKey] > 3000) {
                  atkCds[cdKey] = dateNow;
                  if (physicsRef.current) physicsRef.current.triggerAttackAnim(idNum);
                  if (attackCaravanRef.current) attackCaravanRef.current(idNum, w.damage || 5);
                }
              }
            }
          } else {
            // Reset combat state when no target
            w.combatState = null;
            w.combatTimer = 0;
            // Normal patrol
            {
              let _eIdleMod = 1.0;
              if (isoModeRef.current && terrainDataRef.current) {
                _eIdleMod = applyTerrainMovement(w, terrainDataRef.current);
                if (_eIdleMod <= 0) { w.dir *= -1; _eIdleMod = 0.1; }
              }
              w.x += w.speed * w.dir * _eIdleMod;
            }
            if (w.x > w.maxX) { w.x = w.maxX; w.dir = -1; }
            if (w.x < w.minX) { w.x = w.minX; w.dir = 1; }
          }
        } // end combatEngaged else
        }

        // Hard clamp to world edges
        const worldMaxX = isoModeRef.current ? ISO_CONFIG.MAP_COLS - 1 : 300;
        if (w.x < 0) { w.x = 0; w.dir = 1; }
        if (w.x > worldMaxX) { w.x = worldMaxX; w.dir = -1; }

        // Y movement – gentle wandering up and down
        if (w.y != null) {
          w.y += w.ySpeed * w.yDir;
          const defMaxY = isoModeRef.current ? ISO_CONFIG.MAP_ROWS - 1 : 90;
          const defMinY = isoModeRef.current ? 1 : 25;
          if (w.y > (w.maxY || defMaxY)) { w.y = w.maxY || defMaxY; w.yDir = -1; }
          if (w.y < (w.minY || defMinY)) { w.y = w.minY || defMinY; w.yDir = 1; }
          // Random Y direction change
          if (Math.random() < 0.003) w.yDir *= -1;
        }

        // ─── Enemy Dodge: react to incoming skillshots ───
        if (!w.friendly && physicsRef.current) {
          const physEntry = physicsRef.current.bodies[id];
          if (physEntry && physEntry._dodging && physEntry._dodgeDir && w.y != null) {
            w.y += physEntry._dodgeDir * 0.5; // dodge sideways in Y
            w.y = Math.max(w.minY || 25, Math.min(w.maxY || 90, w.y));
          }
        }

        // ─── Elite: Dark – HP regen (regenPct % of maxHp per second) ───
        if (w.isElite && w.eliteMod?.regenPct) {
          // Use walkData hp/maxHp to avoid O(n) walkersRef.current.find()
          if (w.hp !== undefined && w.maxHp && w.alive && w.hp < w.maxHp) {
            const healPerSec = w.maxHp * w.eliteMod.regenPct;
            const healAmt = healPerSec * dt;
            if (!w._regenAccum) w._regenAccum = 0;
            w._regenAccum += healAmt;
            if (w._regenAccum >= 1) {
              const heal = Math.floor(w._regenAccum);
              w._regenAccum -= heal;
              const _idNum = idNum;
              setWalkers(prev => prev.map(ww =>
                ww.id === _idNum ? { ...ww, hp: Math.min(ww.maxHp, ww.hp + heal) } : ww
              ));
            }
          }
        }

        // ─── Elite: Frozen – slow aura (reduce nearby friendly merc speed) ───
        if (w.isElite && w.eliteMod?.slowAura) {
          const _slowDefY = isoModeRef.current ? ISO_CONFIG.MAP_ROWS / 2 : 50;
          const _slowYScale = isoModeRef.current ? 1 : 0.5;
          const _slowRadiusSq = isoModeRef.current ? 36 : 900; // 6² tiles or 30² pct
          for (let fi = 0; fi < friendlyList.length; fi++) {
            const f = friendlyList[fi].w;
            const dx = f.x - w.x;
            const dy = ((f.y || _slowDefY) - (w.y || _slowDefY)) * _slowYScale;
            const distSq = dx * dx + dy * dy;
            if (distSq < _slowRadiusSq) {
              // Apply slow: store original speed once, then halve
              if (!f._origSpeed) f._origSpeed = f.speed;
              f.speed = f._origSpeed * 0.5;
              f._slowedUntil = dateNow + 500; // refresh slow for 500ms
            } else if (f._slowedUntil && dateNow > f._slowedUntil && f._origSpeed) {
              // Restore speed when out of range
              f.speed = f._origSpeed;
              delete f._origSpeed;
              delete f._slowedUntil;
            }
          }
        }

        // Ice saber freeze → slow transition: unfreeze after freeze ends, apply slow speed
        if (!w.friendly && w._frozenUntil) {
          if (dateNow < w._frozenUntil) {
            w.speed = 0; // completely frozen
            if (!w._origYSpeed && w.ySpeed) w._origYSpeed = w.ySpeed;
            w.ySpeed = 0;
          } else {
            // Freeze ended, restore to slow speed
            delete w._frozenUntil;
            if (w._origYSpeed) { w.ySpeed = w._origYSpeed * 0.5; }
            if (w._origSpeed && w._slowedUntil && dateNow < w._slowedUntil) {
              w.speed = w._origSpeed * 0.5; // transition to slow
            }
          }
        }
        // Restore speed after slow duration expires
        if (!w.friendly && w._slowedUntil && w._origSpeed && dateNow > w._slowedUntil) {
          w.speed = w._origSpeed;
          if (w._origYSpeed) { w.ySpeed = w._origYSpeed; delete w._origYSpeed; }
          delete w._origSpeed;
          delete w._slowedUntil;
          delete w._frozenUntil;
        }

        // Saber burn/poison DOT processing
        if (!w.friendly && w._burnUntil && dateNow < w._burnUntil) {
          if (!w._lastBurnTick || dateNow - w._lastBurnTick >= 1000) {
            w._lastBurnTick = dateNow;
            const burnDmg = w._burnDps || 5;
            const wObj = walkersRef.current.find(ww => ww.id === idNum);
            if (wObj && wObj.alive && !wObj.dying) {
              const nh = Math.max(0, wObj.hp - burnDmg);
              spawnDmgPopup(idNum, `🔥${burnDmg}`, "#ff6020", "fire");
              if (nh <= 0) {
                sfxNpcDeath(); w.alive = false;
                if (physicsRef.current) physicsRef.current.triggerRagdoll(idNum, "fire", w.dir || 1);
                addMoneyFn(wObj.npcData.loot || {});
                setKills(k => k + 1);
                grantXp(wObj.isBoss ? 100 : wObj.isElite ? 50 : 10 + roomRef.current * 2);
                setWalkers(prev => prev.map(ww => ww.id === idNum ? { ...ww, hp: 0, dying: true, dyingAt: dateNow } : ww));
                setTimeout(() => setWalkers(pp => pp.filter(ww => ww.id !== idNum)), 2500);
              } else {
                setWalkers(prev => prev.map(ww => ww.id === idNum ? { ...ww, hp: nh } : ww));
              }
            }
          }
        } else if (w._burnUntil) { delete w._burnDps; delete w._burnUntil; delete w._lastBurnTick; }
        if (!w.friendly && w._poisonUntil && dateNow < w._poisonUntil) {
          if (!w._lastPoisonTick || dateNow - w._lastPoisonTick >= 1000) {
            w._lastPoisonTick = dateNow;
            const poisonDmg = w._poisonDps || 3;
            const wObj = walkersRef.current.find(ww => ww.id === idNum);
            if (wObj && wObj.alive && !wObj.dying) {
              const nh = Math.max(0, wObj.hp - poisonDmg);
              spawnDmgPopup(idNum, `☠${poisonDmg}`, "#44ff44", "poison");
              if (nh <= 0) {
                sfxNpcDeath(); w.alive = false;
                if (physicsRef.current) physicsRef.current.triggerRagdoll(idNum, "shadow", w.dir || 1);
                addMoneyFn(wObj.npcData.loot || {});
                setKills(k => k + 1);
                grantXp(wObj.isBoss ? 100 : wObj.isElite ? 50 : 10 + roomRef.current * 2);
                setWalkers(prev => prev.map(ww => ww.id === idNum ? { ...ww, hp: 0, dying: true, dyingAt: dateNow } : ww));
                setTimeout(() => setWalkers(pp => pp.filter(ww => ww.id !== idNum)), 2500);
              } else {
                setWalkers(prev => prev.map(ww => ww.id === idNum ? { ...ww, hp: nh } : ww));
              }
            }
          }
        } else if (w._poisonUntil) { delete w._poisonDps; delete w._poisonUntil; delete w._lastPoisonTick; }

        // Fear: enemy flees in reverse direction at 2x speed
        if (!w.friendly && w._fearUntil && dateNow < w._fearUntil) {
          const fearSpeed = (w._origSpeed || w.speed || 0.02) * 2;
          w.x += fearSpeed * (w._fearDir || 1);
          const fearMinX = isoModeRef.current ? (w.minX || 1) : (w.minX || 2);
          const fearMaxX = isoModeRef.current ? (w.maxX || ISO_CONFIG.MAP_COLS - 1) : (w.maxX || 98);
          w.x = Math.max(fearMinX, Math.min(fearMaxX, w.x));
        } else if (w._fearUntil) {
          if (w._origSpeed) { w.speed = w._origSpeed; delete w._origSpeed; }
          delete w._fearUntil; delete w._fearDir;
        }

        // Lunge animation decay
        if (w.lungeFrames > 0) {
          w.lungeFrames--;
          w.lungeOffset *= 0.88;
        } else {
          w.lungeOffset = 0;
        }

        if (!w.stationary) w.bouncePhase += 0.12;
        // Sync iso world coords from movement
        if (isoModeRef.current) {
          w.wx = w.x;
          w.wy = w.y;
        }
        const el = npcElsRef.current[id];
        if (el) {
          const bounceY = w.stationary ? 0 : Math.abs(Math.sin(w.bouncePhase)) * 4;
          const lungeX = w.lungeOffset || 0;
          if (isoModeRef.current) {
            // Isometric: position DOM overlay via screen projection
            const cam = isoCameraRef.current;
            const screen = _isoWorldToScreen(w.wx, w.wy, cam.x, cam.y);
            if (screen.x < -200 || screen.x > GAME_W + 200 || screen.y < -200 || screen.y > GAME_H + 200) {
              el.style.display = "none";
            } else {
              el.style.display = "";
              el.style.left = `${screen.x}px`;
              el.style.top = `${screen.y - 75}px`;
              el.style.zIndex = 14 + Math.round((w.wx + w.wy) * 1.2);
              el.style.transform = `translateX(-50%) translateY(${-bounceY}px) translateX(${lungeX * w.dir}px)`;
            }
          } else {
            const yPos = w.y != null ? w.y : 25;
            // 2.5D: depth-based scaling and z-ordering for DOM walker elements
            const walkerDepth = depthFromY(yPos);
            const walkerScale = scaleAtDepth(walkerDepth);
            const walkerZ = 14 + zIndexAtDepth(walkerDepth); // base 14 to stay above PixiJS canvas (z-12)
            // Panoramic wrapping: position walker HTML overlay at wrapped screen X
            const wrappedX = _wrapPct(w.x, panOffsetRef.current, GAME_W);
            if (wrappedX === null) {
              el.style.display = "none";
            } else {
              el.style.display = "";
              el.style.left = `${wrappedX}%`;
              el.style.top = `calc(${yPos}% - 75px)`;
              el.style.zIndex = walkerZ;
              el.style.transform = `translateX(-50%) translateY(${-bounceY}px) translateX(${lungeX * w.dir}px) scale(${walkerScale})`;
            }
          }
        }
        // Update physics body to match walker position (always, even when off-screen)
        if (physicsRef.current) {
          const yPctForPhysics = w.y != null ? w.y : null;
          // Physics expects percentage coords; iso uses tile coords — convert
          const xForPhysics = isoModeRef.current ? (w.x / ISO_CONFIG.MAP_COLS) * 100 : w.x;
          const yForPhysics = isoModeRef.current && w.y != null ? (w.y / ISO_CONFIG.MAP_ROWS) * 100 : yPctForPhysics;
          physicsRef.current.updatePatrol(idNum, xForPhysics, w.dir, w.bouncePhase, yForPhysics, w.wx, w.wy);
        }
      }
      // ─── POI DOM ELEMENTS: sync position with panning/camera ───
      {
        const _isoActive = isoModeRef.current;
        const _isoCam = _isoActive ? isoCameraRef.current : null;
        const po = panOffsetRef.current;

        const _positionPoiEl = (el, poiX, poiY) => {
          if (!el) return;
          if (_isoActive && _isoCam) {
            const screen = _isoWorldToScreen(poiX, poiY ?? ISO_CONFIG.MAP_ROWS / 2, _isoCam.x, _isoCam.y);
            if (screen.x < -200 || screen.x > GAME_W + 200 || screen.y < -200 || screen.y > GAME_H + 200) {
              el.style.display = "none";
            } else {
              el.style.display = "";
              el.style.left = `${screen.x}px`;
              el.style.top = `${screen.y}px`;
              el.style.transform = "translateX(-50%) translateY(-100%)";
              el.style.zIndex = String(14 + Math.round((poiX + (poiY ?? 20)) * 1.2));
            }
          } else {
            const sx = _wrapPct(poiX, po, GAME_W);
            if (sx === null) { el.style.display = "none"; }
            else { el.style.display = ""; el.style.left = `${sx}%`; }
          }
        };

        const wfEl = waterfallElRef.current;
        const wfState = waterfallStateRef.current;
        if (wfEl && wfState) _positionPoiEl(wfEl, wfState.x, wfState.y);

        const ftEl = fruitTreeElRef.current;
        const ftState = fruitTreeStateRef.current;
        if (ftEl && ftState) _positionPoiEl(ftEl, ftState.x, ftState.y);

        // Sync obstacle DOM positions
        for (const obs of obstaclesRef.current) {
          const oel = obsElsRef.current[obs.id];
          _positionPoiEl(oel, obs.x, obs.y);
        }
        // Sync structure DOM positions (always visible — large landmarks)
        for (const struct of structuresRef.current) {
          const sEl = structElsRef.current[struct.id];
          if (sEl) {
            _positionPoiEl(sEl, struct.x, struct.y);
            sEl.style.visibility = "visible";
          }
        }

        // Sync all other POI positions (iso mode only — panoramic handled by React)
        if (_isoActive) {
          const _chestP = chestPosRef.current;
          if (chestElRef.current && _chestP) _positionPoiEl(chestElRef.current, _chestP.x, _chestP.y);
          const _rn = resourceNodeRef.current;
          if (resourceElRef.current && _rn) _positionPoiEl(resourceElRef.current, _rn.pos.x, _rn.pos.y);
          const _mn = mineNuggetRef.current;
          if (mineNuggetElRef.current && _mn) _positionPoiEl(mineNuggetElRef.current, _mn.x, _mn.y);
          const _mc = mercCampRef.current;
          if (mercCampElRef.current && _mc) _positionPoiEl(mercCampElRef.current, _mc.x, _mc.y);
          const _wp = wizardPoiRef.current;
          if (wizardElRef.current && _wp) _positionPoiEl(wizardElRef.current, _wp.x, _wp.y);
          const _bp = biomePoiRef.current;
          if (biomePoiElRef.current && _bp && !_bp.used) _positionPoiEl(biomePoiElRef.current, _bp.x, _bp.y);
          const _dp = defensePoiRef.current;
          if (defensePoiElRef.current && _dp && !_dp.activated) _positionPoiEl(defensePoiElRef.current, _dp.x, _dp.y);
          if (shopElRef.current) _positionPoiEl(shopElRef.current, 10, 15);
          if (hideoutElRef.current) _positionPoiEl(hideoutElRef.current, 30, 25);
          // Caravan movement (terrain-aware: roads +30%, water -40%, cliffs block)
          {
            const mv = caravanMoveRef.current;
            if (mv.active) {
              const _cp = caravanPosRef.current;
              const dx = mv.targetX - _cp.x;
              const dy = mv.targetY - _cp.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < 0.15) {
                // Arrived
                _cp.x = mv.targetX;
                _cp.y = mv.targetY;
                mv.active = false;
              } else {
                // Apply terrain speed modifier to caravan
                let caravanTerrainMod = 1.0;
                if (terrainDataRef.current) {
                  caravanTerrainMod = applyTerrainMovement(_cp, terrainDataRef.current);
                  const _tdMod = terrainDestructionRef.current.getEffectSpeedMod(
                    Math.floor(_cp.x), Math.floor(_cp.y), ISO_CONFIG.MAP_COLS
                  );
                  caravanTerrainMod *= _tdMod;
                  if (caravanTerrainMod <= 0.1) caravanTerrainMod = 0.1; // never fully stuck
                }
                // Move toward target
                const step = mv.speed * dt * caravanTerrainMod;
                const ratio = Math.min(1, step / dist);
                _cp.x += dx * ratio;
                _cp.y += dy * ratio;
              }
            }
          }
          // Caravan
          const _cp = caravanPosRef.current;
          if (caravanElRef.current && _cp) _positionPoiEl(caravanElRef.current, _cp.x, _cp.y);
          // Update PixiJS caravan model
          if (pixiRef.current && _cp) {
            const _maxHp = CARAVAN_LEVELS[caravanLevelRef.current].hp;
            pixiRef.current.setCaravan(_cp.x, _cp.y, caravanHpRef.current / _maxHp, caravanLevelRef.current);
          }
          // Meteorite
          const _met = meteoriteRef.current;
          if (_met) {
            if (meteoriteElRef.current) _positionPoiEl(meteoriteElRef.current, _met.x, _met.y);
            if (meteorBoulderElRef.current) _positionPoiEl(meteorBoulderElRef.current, _met.x, _met.y);
          }
          // Ground loot
          for (const glId of Object.keys(groundLootElsRef.current)) {
            const glEl = groundLootElsRef.current[glId];
            if (glEl && glEl.dataset.wx) _positionPoiEl(glEl, parseFloat(glEl.dataset.wx), parseFloat(glEl.dataset.wy));
          }
          // Player traps
          for (const tId of Object.keys(trapElsRef.current)) {
            const tEl = trapElsRef.current[tId];
            if (tEl && tEl.dataset.wx) _positionPoiEl(tEl, parseFloat(tEl.dataset.wx), parseFloat(tEl.dataset.wy));
          }
          // Biome interactables
          for (const iId of Object.keys(interactableElsRef.current)) {
            const iEl = interactableElsRef.current[iId];
            if (iEl && iEl.dataset.wx) _positionPoiEl(iEl, parseFloat(iEl.dataset.wx), parseFloat(iEl.dataset.wy));
          }
          // Pass current ISO camera to biome animator so living-map creatures stay in world-space
          if (animatorRef.current) {
            const cam = isoCameraRef.current;
            animatorRef.current.setCameraInfo(cam.x, cam.y);
          }
          // Reveal map secrets when caravan is within 5 tiles
          if (mapSecretsRef.current.length > 0) {
            const cp = caravanPosRef.current;
            const anyNewlyDiscovered = mapSecretsRef.current.some(
              s => !s.discovered && !s.collected &&
              Math.abs(s.wx - cp.x) + Math.abs(s.wy - cp.y) < 5
            );
            if (anyNewlyDiscovered) {
              setMapSecrets(prev => prev.map(s =>
                !s.discovered && !s.collected &&
                Math.abs(s.wx - cp.x) + Math.abs(s.wy - cp.y) < 5
                  ? { ...s, discovered: true }
                  : s
              ));
            }
          }
        }
      }

      // ─── OBSTACLE LEAK PARTICLES (low HP obstacles emit material particles) ───
      if (pixiRef.current) {
        for (const obs of obstaclesRef.current) {
          if (!obs.destructible || obs.destroying || obs.hp <= 0) continue;
          const hpR = obs.maxHp > 0 ? obs.hp / obs.maxHp : 1;
          const leak = getLeakParticles(hpR, obs.material);
          if (leak && Math.random() < leak.rate) {
            const lpx = isoModeRef.current ? (obs.x / ISO_CONFIG.MAP_COLS) * GAME_W : (obs.x / 100) * GAME_W;
            const lpy = isoModeRef.current ? (obs.y / ISO_CONFIG.MAP_ROWS) * GAME_H : GAME_H - (obs.y / 100) * GAME_H;
            pixiRef.current.spawnObstacleHitSpark(
              lpx + (Math.random() - 0.5) * 10,
              lpy + (Math.random() - 0.5) * 10,
              leak.color
            );
          }
        }
      }

      // (Mine collision check removed — explosive obstacles are part of biome obstacles now)

      // ─── PLAYER DEFENSE TRAPS COLLISION (throttled: every 3rd frame) ───
      if (frameCount % 3 === 0) {
      const pTraps = playerTrapsRef.current;
      let pTrapsChanged = false;
      for (let pi = 0; pi < pTraps.length; pi++) {
        const pt = pTraps[pi];
        if (!pt.active) continue;
        for (let ei = 0; ei < enemyList.length; ei++) {
          const eid = enemyList[ei].id;
          const e = enemyList[ei].w;
          const dx = e.x - pt.x;
          const dy = ((e.y || 50) - pt.y) * 0.5;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (pt.trapType === "caltrops") {
            if (dist < (pt.config.radius || 8)) {
              if (!e._caltropOrig) e._caltropOrig = e.speed;
              e.speed = e._caltropOrig * (pt.config.slowMult || 0.6);
              e._caltropUntil = dateNow + 500;
            } else if (e._caltropUntil && dateNow > e._caltropUntil && e._caltropOrig) {
              e.speed = e._caltropOrig;
              delete e._caltropOrig;
              delete e._caltropUntil;
            }
          }

          if (pt.trapType === "fire_pit" && dist < (pt.config.radius || 6)) {
            // DPS — apply damage every ~1s (every 20 frames at 60fps → check every 3rd = ~18 frames)
            const cdKey = `fire_${pt.id}_${eid}`;
            if (!atkCds[cdKey] || dateNow - atkCds[cdKey] > 1000) {
              atkCds[cdKey] = dateNow;
              const dmg = pt.config.dps || 5;
              spawnDmgPopup(parseInt(eid), `${dmg}`, "#ff6020");
              setWalkers(prev => prev.map(ww => {
                if (ww.id !== parseInt(eid) || !ww.alive || ww.friendly) return ww;
                const newHp = Math.max(0, ww.hp - dmg);
                if (ww.isMeteorBoulder) checkMeteorWaveThreshold(ww.id, ww.hp, newHp);
                if (newHp <= 0) {
                  sfxNpcDeath();
                  if (walkDataRef.current[ww.id]) walkDataRef.current[ww.id].alive = false;
                  if (physicsRef.current) physicsRef.current.triggerRagdoll(ww.id, "fire", Math.sign(dx) || 1);
                  if (ww.isMeteorBoulder && meteorWaveRef.current) {
                    spawnMeteorGroundLoot(meteorWaveRef.current.x, meteorWaveRef.current.y);
                    meteorWaveRef.current = null;
                    setMeteorite(null);
                  } else {
                    addMoneyFn(ww.npcData.loot || {});
                  }
                  setKills(k => k + 1);
                  grantXp(10 + roomRef.current * 2);
                  processKillStreak();
                  setTimeout(() => setWalkers(pr => pr.map(www => www.id === ww.id ? { ...www, alive: false } : www)), 2500);
                  return { ...ww, hp: 0, dying: true, dyingAt: Date.now() };
                }
                return { ...ww, hp: newHp };
              }));
            }
          }

          if (pt.trapType === "powder_barrel" && dist < (pt.config.triggerRadius || 4)) {
            pt.active = false;
            pTrapsChanged = true;
            sfxMeteorImpact();
            showMessage("Beczka prochu eksplodowała!", "#ff6020");
            const splashR = pt.config.splashRadius || 8;
            for (let ei2 = 0; ei2 < enemyList.length; ei2++) {
              const eid2 = enemyList[ei2].id;
              const e2 = enemyList[ei2].w;
              const dx2 = e2.x - pt.x;
              const dy2 = ((e2.y || 50) - pt.y) * 0.5;
              if (Math.sqrt(dx2 * dx2 + dy2 * dy2) < splashR) {
                const dmg = pt.config.damage || 35;
                spawnDmgPopup(parseInt(eid2), `${dmg}`, "#ff6020");
                setWalkers(prev => prev.map(ww => {
                  if (ww.id !== parseInt(eid2) || !ww.alive || ww.friendly) return ww;
                  const newHp = Math.max(0, ww.hp - dmg);
                  if (newHp <= 0) {
                    sfxNpcDeath();
                    if (walkDataRef.current[ww.id]) walkDataRef.current[ww.id].alive = false;
                    if (physicsRef.current) physicsRef.current.triggerRagdoll(ww.id, "fire", Math.sign(dx2) || 1);
                    addMoneyFn(ww.npcData.loot || {});
                    setKills(k => k + 1);
                    grantXp(10 + roomRef.current * 2);
                    processKillStreak();
                    setTimeout(() => setWalkers(pr => pr.map(www => www.id === ww.id ? { ...www, alive: false } : www)), 2500);
                    return { ...ww, hp: 0, dying: true, dyingAt: Date.now() };
                  }
                  if (physicsRef.current) physicsRef.current.applyHit(parseInt(eid2), "fire", Math.sign(dx2) || 1);
                  return { ...ww, hp: newHp };
                }));
              }
            }
            break;
          }

          if (pt.trapType === "net_trap" && dist < (pt.config.triggerRadius || 4)) {
            pt.active = false;
            pTrapsChanged = true;
            const stunDur = pt.config.stunDuration || 3000;
            e._origSpeed = e._origSpeed || e.speed;
            e.speed = 0;
            e._stunnedUntil = dateNow + stunDur;
            spawnDmgPopup(parseInt(eid), "SIEĆ!", "#40c0a0");
            showMessage("Wróg złapany w sieć!", "#40c0a0");
            setTimeout(() => {
              if (wd[eid] && wd[eid]._stunnedUntil) {
                wd[eid].speed = wd[eid]._origSpeed || 0.02;
                delete wd[eid]._origSpeed;
                delete wd[eid]._stunnedUntil;
              }
            }, stunDur);
            break;
          }

          // barricade / wall types are handled in enemy AI movement, not here

          // Spike pit — single-use ground trap damage
          if (pt.trapType === "spike_pit" && dist < (pt.config.stats?.triggerRadius || pt.config.triggerRadius || 4)) {
            pt.active = false;
            pTrapsChanged = true;
            const dmg = pt.config.stats?.damage || pt.config.damage || 15;
            spawnDmgPopup(parseInt(eid), `${dmg}`, "#b08040");
            showMessage("Wilczy dół aktywowany!", "#b08040");
            setWalkers(prev => prev.map(ww => {
              if (ww.id !== parseInt(eid) || !ww.alive || ww.friendly) return ww;
              const newHp = Math.max(0, ww.hp - dmg);
              if (newHp <= 0) {
                sfxNpcDeath();
                if (walkDataRef.current[ww.id]) walkDataRef.current[ww.id].alive = false;
                if (physicsRef.current) physicsRef.current.triggerRagdoll(ww.id, "melee", Math.sign(dx) || 1);
                addMoneyFn(ww.npcData.loot || {});
                setKills(k => k + 1);
                grantXp(10 + roomRef.current * 2);
                processKillStreak();
                setTimeout(() => setWalkers(pr => pr.map(www => www.id === ww.id ? { ...www, alive: false } : www)), 2500);
                return { ...ww, hp: 0, dying: true, dyingAt: Date.now() };
              }
              // Briefly stun enemy that fell in pit
              e.speed = 0;
              setTimeout(() => { if (wd[eid]) wd[eid].speed = wd[eid]._origSpeed || 0.02; }, 1500);
              return { ...ww, hp: newHp };
            }));
            break;
          }

          // Poison mine — single-use AoE poison DPS
          if (pt.trapType === "poison_mine" && dist < (pt.config.stats?.triggerRadius || pt.config.triggerRadius || 4)) {
            pt.active = false;
            pTrapsChanged = true;
            sfxMeteorImpact();
            showMessage("Mina trująca eksplodowała!", "#44ff44");
            const splashR = pt.config.stats?.splashRadius || 7;
            const poisonDps = pt.config.stats?.dps || 15;
            const poisonDur = pt.config.stats?.duration || 4000;
            // Apply poison DoT to all enemies in splash radius
            for (let ei2 = 0; ei2 < enemyList.length; ei2++) {
              const eid2 = enemyList[ei2].id;
              const e2 = enemyList[ei2].w;
              const dx2 = e2.x - pt.x;
              const dy2 = ((e2.y || 50) - pt.y) * 0.5;
              if (Math.sqrt(dx2 * dx2 + dy2 * dy2) < splashR) {
                e2._poisonDps = poisonDps;
                e2._poisonEnd = dateNow + poisonDur;
                spawnDmgPopup(parseInt(eid2), "TRUCIZNA!", "#44ff44");
              }
            }
            break;
          }

          // Totem types (ice_totem, fire_totem) — persistent aura DPS + slow
          if ((pt.trapType === "ice_totem" || pt.trapType === "fire_totem") && dist < (pt.config.stats?.radius || pt.config.radius || 8)) {
            const cdKey = `totem_${pt.id}_${eid}`;
            if (!atkCds[cdKey] || dateNow - atkCds[cdKey] > 1000) {
              atkCds[cdKey] = dateNow;
              const dmg = pt.config.stats?.dps || pt.config.dps || 5;
              const elem = pt.config.stats?.element || "fire";
              spawnDmgPopup(parseInt(eid), `${dmg}`, elem === "ice" ? "#4488ff" : "#ff6020");
              setWalkers(prev => prev.map(ww => {
                if (ww.id !== parseInt(eid) || !ww.alive || ww.friendly) return ww;
                const newHp = Math.max(0, ww.hp - dmg);
                if (newHp <= 0) {
                  sfxNpcDeath();
                  if (walkDataRef.current[ww.id]) walkDataRef.current[ww.id].alive = false;
                  if (physicsRef.current) physicsRef.current.triggerRagdoll(ww.id, elem, Math.sign(dx) || 1);
                  addMoneyFn(ww.npcData.loot || {});
                  setKills(k => k + 1);
                  grantXp(10 + roomRef.current * 2);
                  processKillStreak();
                  setTimeout(() => setWalkers(pr => pr.map(www => www.id === ww.id ? { ...www, alive: false } : www)), 2500);
                  return { ...ww, hp: 0, dying: true, dyingAt: Date.now() };
                }
                return { ...ww, hp: newHp };
              }));
            }
            // Ice totem also slows
            if (pt.trapType === "ice_totem") {
              const slowMult = pt.config.stats?.slowMult || 0.6;
              if (!e._caltropOrig) e._caltropOrig = e.speed;
              e.speed = e._caltropOrig * slowMult;
              e._caltropUntil = dateNow + 500;
            }
          }

          // Turret types (lightning_spire, kraken_totem, cannon_emplacement) — auto-attack nearest enemy
          if ((pt.trapType === "lightning_spire" || pt.trapType === "kraken_totem" || pt.trapType === "cannon_emplacement")
            && dist < (pt.config.stats?.range || 15)) {
            const cdKey = `turret_${pt.id}`;
            const atkCd = pt.config.stats?.attackCd || 2000;
            if (!atkCds[cdKey] || dateNow - atkCds[cdKey] > atkCd) {
              atkCds[cdKey] = dateNow;
              const dmg = pt.config.stats?.autoDamage || 15;
              const elem = pt.config.stats?.element || "lightning";
              spawnDmgPopup(parseInt(eid), `${dmg}`, elem === "lightning" ? "#ffee00" : elem === "ice" ? "#4488ff" : "#ff6020");
              setWalkers(prev => prev.map(ww => {
                if (ww.id !== parseInt(eid) || !ww.alive || ww.friendly) return ww;
                const newHp = Math.max(0, ww.hp - dmg);
                if (newHp <= 0) {
                  sfxNpcDeath();
                  if (walkDataRef.current[ww.id]) walkDataRef.current[ww.id].alive = false;
                  if (physicsRef.current) physicsRef.current.triggerRagdoll(ww.id, elem, Math.sign(dx) || 1);
                  addMoneyFn(ww.npcData.loot || {});
                  setKills(k => k + 1);
                  grantXp(10 + roomRef.current * 2);
                  processKillStreak();
                  setTimeout(() => setWalkers(pr => pr.map(www => www.id === ww.id ? { ...www, alive: false } : www)), 2500);
                  return { ...ww, hp: 0, dying: true, dyingAt: Date.now() };
                }
                return { ...ww, hp: newHp };
              }));
              // Kraken totem also slows
              if (pt.trapType === "kraken_totem" && pt.config.stats?.slowMult) {
                if (!e._caltropOrig) e._caltropOrig = e.speed;
                e.speed = e._caltropOrig * pt.config.stats.slowMult;
                e._caltropUntil = dateNow + 500;
              }
              break; // turret fires at one enemy per cooldown
            }
          }

          // Water geyser — knockback + damage with cooldown
          if (pt.trapType === "water_geyser" && dist < (pt.config.stats?.triggerRadius || 5)) {
            const cdKey = `geyser_${pt.id}`;
            const geyCd = pt.config.stats?.cooldown || 6000;
            if (!atkCds[cdKey] || dateNow - atkCds[cdKey] > geyCd) {
              atkCds[cdKey] = dateNow;
              const dmg = pt.config.stats?.damage || 20;
              const kb = pt.config.stats?.knockback || 15;
              spawnDmgPopup(parseInt(eid), `${dmg}`, "#4488ff");
              // Knockback: push enemy away from geyser
              const pushDir = e.x > pt.x ? 1 : -1;
              e.x += pushDir * kb;
              if (e.y != null) e.y = Math.max(e.minY || 25, e.y - kb * 0.5);
              setWalkers(prev => prev.map(ww => {
                if (ww.id !== parseInt(eid) || !ww.alive || ww.friendly) return ww;
                const newHp = Math.max(0, ww.hp - dmg);
                if (newHp <= 0) {
                  sfxNpcDeath();
                  if (walkDataRef.current[ww.id]) walkDataRef.current[ww.id].alive = false;
                  if (physicsRef.current) physicsRef.current.triggerRagdoll(ww.id, "ice", pushDir);
                  addMoneyFn(ww.npcData.loot || {});
                  setKills(k => k + 1);
                  grantXp(10 + roomRef.current * 2);
                  processKillStreak();
                  setTimeout(() => setWalkers(pr => pr.map(www => www.id === ww.id ? { ...www, alive: false } : www)), 2500);
                  return { ...ww, hp: 0, dying: true, dyingAt: Date.now() };
                }
                return { ...ww, hp: newHp };
              }));
            }
          }

          // Shadow trap — teleport enemy back to spawn area
          if (pt.trapType === "shadow_trap" && dist < (pt.config.stats?.triggerRadius || 5)) {
            const cdKey = `shadow_${pt.id}`;
            const shCd = pt.config.stats?.cooldown || 8000;
            if (!atkCds[cdKey] || dateNow - atkCds[cdKey] > shCd) {
              atkCds[cdKey] = dateNow;
              e.x = 10 + Math.random() * 80;
              e.y = 25 + Math.random() * 10;
              spawnDmgPopup(parseInt(eid), "TELEPORT!", "#8844cc");
            }
          }
        }
      }
      // Poison DoT tick for poisoned enemies
      for (let ei = 0; ei < enemyList.length; ei++) {
        const e = enemyList[ei].w;
        const eid = enemyList[ei].id;
        if (e._poisonDps && e._poisonEnd && dateNow < e._poisonEnd) {
          const cdKey = `pdot_${eid}`;
          if (!atkCds[cdKey] || dateNow - atkCds[cdKey] > 1000) {
            atkCds[cdKey] = dateNow;
            const dmg = e._poisonDps;
            spawnDmgPopup(parseInt(eid), `${dmg}`, "#44ff44");
            setWalkers(prev => prev.map(ww => {
              if (ww.id !== parseInt(eid) || !ww.alive || ww.friendly) return ww;
              const newHp = Math.max(0, ww.hp - dmg);
              if (newHp <= 0) {
                sfxNpcDeath();
                if (walkDataRef.current[ww.id]) walkDataRef.current[ww.id].alive = false;
                if (physicsRef.current) physicsRef.current.triggerRagdoll(ww.id, "poison", 1);
                addMoneyFn(ww.npcData.loot || {});
                setKills(k => k + 1);
                grantXp(10 + roomRef.current * 2);
                processKillStreak();
                setTimeout(() => setWalkers(pr => pr.map(www => www.id === ww.id ? { ...www, alive: false } : www)), 2500);
                return { ...ww, hp: 0, dying: true, dyingAt: Date.now() };
              }
              return { ...ww, hp: newHp };
            }));
          }
        } else if (e._poisonDps && e._poisonEnd && dateNow >= e._poisonEnd) {
          delete e._poisonDps;
          delete e._poisonEnd;
        }
      }
      if (pTrapsChanged) {
        setPlayerTraps(prev => prev.map(t => {
          const live = pTraps.find(pt => pt.id === t.id);
          return live && !live.active ? { ...t, active: false } : t;
        }));
      }
      } // end throttled trap check

      // ─── WAND ORBITING LIGHTNING BALLS ───
      if (wandOrbsRef.current.active) {
        const wo = wandOrbsRef.current;
        const elapsed = dateNow - wo.startTime;
        // Collect 1 gunpowder per second while wand is active
        if (dateNow - wo.lastDrainTime >= 1000) {
          wo.lastDrainTime = dateNow;
          const maxMana = BASE_MAX_MANA + (knowledgeUpgradesRef.current?.manaPool || 0) * 10;
          if (manaRef.current < maxMana) {
            manaRef.current = Math.min(maxMana, manaRef.current + 1);
            setMana(m => Math.min(maxMana, m + 1));
          }
        }
        const _isoWand = isoModeRef.current;
        const orbRadius = _isoWand ? 3.2 : 8; // tiles or % of screen
        const hitRadius = _isoWand ? 2 : 5; // tiles or % of screen for damage
        const dmgCd = 800; // ms between hits per enemy
        for (let orb = 0; orb < 3; orb++) {
          const angle = (elapsed / 600) + (orb * Math.PI * 2 / 3);
          const orbX = wo.cursorX + Math.cos(angle) * orbRadius;
          const orbY = wo.cursorY + Math.sin(angle) * orbRadius * 0.7;
          // Check hits against enemies
          for (const w of walkersRef.current) {
            if (!w.alive || w.dying || w.friendly) continue;
            const d = wd[w.id];
            if (!d || !d.alive) continue;
            // Cooldown per enemy
            const lastHit = wo.hitCooldowns[w.id] || 0;
            if (dateNow - lastHit < dmgCd) continue;
            const dx = d.x - orbX, dy = d.y - orbY;
            if (dx * dx + dy * dy < hitRadius * hitRadius) {
              wo.hitCooldowns[w.id] = dateNow;
              const dmg = 10;
              spawnDmgPopup(w.id, `⚡${dmg}`, "#4080ff");
              if (pixiRef.current) {
                const _lx = isoModeRef.current ? (d.x / ISO_CONFIG.MAP_COLS) * GAME_W : (d.x / 100) * GAME_W;
                const _ly = isoModeRef.current ? (d.y / ISO_CONFIG.MAP_ROWS) * GAME_H : (d.y / 100) * GAME_H;
                pixiRef.current.spawnMeleeSparks(_lx, _ly, Math.sign(d.x - (isoModeRef.current ? ISO_CONFIG.MAP_COLS / 2 : 50)) || 1);
              }
              setWalkers(prev => prev.map(ww => {
                if (ww.id !== w.id || !ww.alive || ww.dying) return ww;
                const nh = Math.max(0, ww.hp - dmg);
                if (ww.isMeteorBoulder) checkMeteorWaveThreshold(ww.id, ww.hp, nh);
                // Sync boss HP bar on wand lightning damage
                if (ww.isBoss && activeBossRef.current) {
                  setActiveBoss(prev2 => prev2 ? { ...prev2, currentHp: nh } : null);
                }
                if (nh <= 0) {
                  sfxNpcDeath();
                  if (walkDataRef.current[w.id]) walkDataRef.current[w.id].alive = false;
                  if (physicsRef.current) physicsRef.current.triggerRagdoll(w.id, "lightning", Math.sign(d.x - (isoModeRef.current ? ISO_CONFIG.MAP_COLS / 2 : 50)) || 1);
                  if (ww.isMeteorBoulder && meteorWaveRef.current) {
                    spawnMeteorGroundLoot(meteorWaveRef.current.x, meteorWaveRef.current.y);
                    meteorWaveRef.current = null;
                    setMeteorite(null);
                  } else {
                    addMoneyFn(ww.npcData.loot || {});
                  }
                  setKills(k => k + 1);
                  handleCardDrop(ww.npcData);
                  { const _wd = walkDataRef.current[ww.id]; rollAmmoDrop(_wd?.wx ?? _wd?.x, _wd?.wy ?? _wd?.y); rollSaberDrop(_wd?.wx ?? _wd?.x, _wd?.wy ?? _wd?.y); }
                  grantXp(ww.isBoss ? 100 : ww.isElite ? 50 : 10 + roomRef.current * 2);
                  processKillStreak();
                  setTimeout(() => setWalkers(pr => pr.filter(www => www.id !== w.id)), 2500);
                  return { ...ww, hp: 0, dying: true, dyingAt: Date.now() };
                }
                if (physicsRef.current) physicsRef.current.applyHit(w.id, "lightning", Math.sign(d.x - (isoModeRef.current ? ISO_CONFIG.MAP_COLS / 2 : 50)) || 1);
                return { ...ww, hp: nh };
              }));
              break; // one hit per orb per frame
            }
          }
        }
        // Force re-render so orbs spin visually even without hits
        setWandTick(t => t + 1);
      }

      // ─── SALWA ARMATNIA: hold-to-cast cannon barrage (real projectiles) ───
      if (salvaRef.current.active) {
        const sv = salvaRef.current;
        const SALVA_FIRE_RATE = 500; // ms between shots
        const SALVA_DMG = 35;
        const SALVA_MANA_COST = 5;
        // Fire a new projectile if enough time elapsed and resources available
        if (dateNow - sv.lastShotTime >= SALVA_FIRE_RATE) {
          const hasAmmo = (ammoRef.current.cannonball || 0) >= 1;
          const hasMana = manaRef.current >= SALVA_MANA_COST;
          if (hasAmmo && hasMana) {
            sv.lastShotTime = dateNow;
            // Deduct costs
            manaRef.current -= SALVA_MANA_COST;
            setMana(m => Math.max(0, m - SALVA_MANA_COST));
            setAmmo(prev => ({ ...prev, cannonball: (prev.cannonball || 0) - 1 }));
            // Slight random offset on target
            const _isoSalva = isoModeRef.current;
            const offX = (Math.random() - 0.5) * (_isoSalva ? 16 : 40);
            const offY = (Math.random() - 0.5) * (_isoSalva ? 12 : 30);
            const tgtPx = _isoSalva ? (sv.cursorX / ISO_CONFIG.MAP_COLS) * GAME_W + offX : (sv.cursorX / 100) * GAME_W + offX;
            const tgtPy = _isoSalva ? (sv.cursorY / ISO_CONFIG.MAP_ROWS) * GAME_H + offY : (sv.cursorY / 100) * GAME_H + offY;
            // Spawn real arc projectile via physics
            if (physicsRef.current) {
              const salvaSpell = SPELLS.find(s => s.id === "meteor");
              physicsRef.current.spawnPlayerSkillshot(
                "meteor", tgtPx, tgtPy,
                SALVA_DMG, "fire",
                // onHit
                (hitId, damage, element, isHeadshot) => {
                  setAccuracy(prev => ({ ...prev, hits: prev.hits + 1, headshots: isHeadshot ? prev.headshots + 1 : prev.headshots }));
                  setAccuracyStreak(prev => prev + 1);
                  if (isHeadshot) showMessage("HEADSHOT! +50% obrażeń!", "#ff4040");
                  processSkillshotHit(salvaSpell, hitId, damage, element, isHeadshot);
                },
                // onMiss
                () => { setAccuracy(prev => ({ ...prev, misses: prev.misses + 1 })); setAccuracyStreak(0); },
                // onHeadshot
                (hitId, damage, element) => {
                  setAccuracy(prev => ({ ...prev, hits: prev.hits + 1, headshots: prev.headshots + 1 }));
                  setAccuracyStreak(prev => prev + 1);
                  showMessage("HEADSHOT! +50% obrażeń!", "#ff4040");
                  processSkillshotHit(salvaSpell, hitId, damage, element, true);
                },
                panOffsetRef.current,
                // Salvo: fire from caravan position
                isoModeRef.current ? (() => {
                  const _cp = caravanPosRef.current;
                  return { x: (_cp.x / ISO_CONFIG.MAP_COLS) * GAME_W, y: (_cp.y / ISO_CONFIG.MAP_ROWS) * GAME_H };
                })() : null,
                _terrainImpactCb
              );
            }
            // Play sound
            sfxMeteorImpact();
          } else {
            // Out of resources - auto stop
            setSalvaActive(false);
            sv.active = false;
            if (!hasAmmo) showMessage("Brak kul armatnich!", "#c04040");
            else if (!hasMana) showMessage("Za mało prochu!", "#c0a060");
          }
        }
        setSalvaTick(t => t + 1);
      }

      // ─── PROJECTILE vs OBSTACLE collision check (with bounce) ───
      if (physicsRef.current && obstaclesRef.current.length > 0) {
        const skillshots = physicsRef.current.getPlayerSkillshots();
        if (skillshots.length > 0) {
          // Obstacle pixel sizes for AABB collision (must match visual obsStyles in render)
          const _obsSizes = {
            fallen_log:{w:50,h:14},vine_wall:{w:30,h:40},ancient_totem:{w:16,h:44},moss_boulder:{w:36,h:28},
            shipwreck:{w:55,h:30},driftwood:{w:44,h:10},tide_pool:{w:32,h:16},anchor_post:{w:12,h:38},
            cactus_cluster:{w:20,h:36},wagon_wreck:{w:48,h:28},sun_bleached_skull:{w:22,h:18},tumbleweed:{w:24,h:22},
            ice_pillar:{w:14,h:42},frozen_barrel:{w:24,h:28},snowdrift:{w:40,h:16},icicle_rock:{w:30,h:32},
            market_stall:{w:40,h:32},small_house:{w:44,h:48},broken_wagon:{w:50,h:24},lamp_post:{w:8,h:48},sandbag_wall:{w:44,h:20},
            lava_pool:{w:34,h:14},obsidian_pillar:{w:14,h:40},steam_vent:{w:18,h:12},ash_mound:{w:32,h:16},
            haystack:{w:30,h:28},windmill:{w:20,h:50},scarecrow:{w:18,h:44},wooden_fence:{w:46,h:22},
            log_pile:{w:38,h:20},hunting_stand:{w:22,h:46},mushroom_ring:{w:36,h:14},fallen_tree:{w:55,h:16},
            flower_patch:{w:34,h:12},beehive:{w:18,h:24},stone_bridge:{w:50,h:14},well:{w:22,h:26},
            crystal_cluster:{w:24,h:30},giant_mushroom:{w:28,h:38},web_wall:{w:40,h:34},stalactite:{w:12,h:36},
            quicksand:{w:36,h:12},dead_tree:{w:18,h:44},fog_pool:{w:38,h:12},lily_pad:{w:22,h:10},
            crystal_geode:{w:26,h:24},barrel_stack:{w:30,h:26},cannon_wreck:{w:44,h:22},treasure_pile:{w:32,h:20},
            coral_reef:{w:36,h:18},fishing_net:{w:42,h:10},rope_coil:{w:20,h:18},barnacle_rock:{w:30,h:26},
            rusted_cage:{w:28,h:32},mast_fragment:{w:14,h:48},powder_keg:{w:20,h:22},whirlpool:{w:34,h:14},seaweed_patch:{w:36,h:14},
            watchtower:{w:24,h:52},stone_wall:{w:50,h:24},wooden_bridge:{w:48,h:14},bell_tower:{w:22,h:54},crane:{w:20,h:50},
            acid_barrel:{w:22,h:26},shadow_crystal:{w:20,h:28},oil_lamp:{w:10,h:32},cracked_pillar:{w:14,h:40},
          };
          const _defaultSize = { w: 30, h: 20 };
          const obs = obstaclesRef.current;
          const _hitObsIds = new Set(); // avoid double-hitting same obstacle per frame

          for (let si = 0; si < skillshots.length; si++) {
            const proj = skillshots[si];
            // Skip area/mine projectiles — only bounce linear/arc
            if (proj.type !== "linear" && proj.type !== "arc") continue;
            // Initialize bounce tracking on projectile
            if (!proj._bounceIds) proj._bounceIds = new Set();
            if (!proj._bounceCount) proj._bounceCount = 0;
            const MAX_BOUNCES = 3;

            for (let oi = 0; oi < obs.length; oi++) {
              const o = obs[oi];
              if (o.hp <= 0 || o.destroying) continue;
              if (_hitObsIds.has(o.id)) continue;
              // Skip if we just bounced off this obstacle
              if (proj._bounceIds.has(o.id)) continue;

              // AABB collision: obstacle center in world pixel coords
              const sz = _obsSizes[o.type] || _defaultSize;
              const ocx = isoModeRef.current ? (o.x / ISO_CONFIG.MAP_COLS) * GAME_W : (o.x / 100) * GAME_W;
              const ocy = isoModeRef.current ? (o.y / ISO_CONFIG.MAP_ROWS) * GAME_H : GAME_H - (o.y / 100) * GAME_H - sz.h / 2;
              const hw = sz.w / 2 + 4; // half-width + small padding
              const hh = sz.h / 2 + 4; // half-height + small padding
              const pr = proj.hitRadius || 8;

              // Check AABB overlap between projectile circle and obstacle rect
              const closestX = Math.max(ocx - hw, Math.min(proj.x, ocx + hw));
              const closestY = Math.max(ocy - hh, Math.min(proj.y, ocy + hh));
              const dx = proj.x - closestX, dy = proj.y - closestY;
              if (dx * dx + dy * dy > pr * pr) continue;

              _hitObsIds.add(o.id);

              // ─── EXPLOSIVE projectiles: explode on obstacle impact (no bounce) ───
              const isExplosive = (proj.splashRadius || 0) > 0;
              if (isExplosive) {
                // Explosion particles at impact point
                if (pixiRef.current) {
                  pixiRef.current.spawnFire(closestX, closestY);
                  pixiRef.current.spawnGoreExplosion(closestX, closestY);
                  const matDef = OBSTACLE_MATERIALS[o.material] || OBSTACLE_MATERIALS.wood;
                  pixiRef.current.spawnObstacleHitSpark(closestX, closestY, matDef.color);
                  // Spawn explosive debris
                  const expDebris = createExplosiveDebris(o.material, closestX, closestY, 1.0);
                  for (const ed of expDebris) pixiRef.current._debris.push(ed);
                }
                // Spawn shockwave from explosive projectile impact
                const swEl = proj.element || "explosion";
                const sw = createShockwave(closestX, closestY, swEl, 0.8, proj.splashRadius * 0.3);
                shockwavesRef.current.push(sw);
                // Terrain destruction: explosive projectiles create craters, burn trees, freeze water
                if (isoModeRef.current && terrainDataRef.current) {
                  const _blastWx = (closestX / GAME_W) * ISO_CONFIG.MAP_COLS;
                  const _blastWy = (closestY / GAME_H) * ISO_CONFIG.MAP_ROWS;
                  const _blastR = (proj.splashRadius || 8) / GAME_W * ISO_CONFIG.MAP_COLS * 2;
                  terrainDestructionRef.current.applyExplosion(
                    _blastWx, _blastWy, Math.max(1.5, Math.min(4, _blastR)),
                    proj.element || "fire", terrainDataRef.current
                  );
                  // Rebuild walk grid after terrain modification
                  walkGridRef.current = buildWalkGrid(terrainDataRef.current);
                }
                // Kill the projectile (consumed by explosion)
                proj.age = proj.maxAge + 1;
              } else if (proj._bounceCount < MAX_BOUNCES) {
                // ─── BOUNCE: non-explosive projectiles reflect velocity ───
                const overlapL = (proj.x + pr) - (ocx - hw);
                const overlapR = (ocx + hw) - (proj.x - pr);
                const overlapT = (proj.y + pr) - (ocy - hh);
                const overlapB = (ocy + hh) - (proj.y - pr);
                const minOverlapX = Math.min(overlapL, overlapR);
                const minOverlapY = Math.min(overlapT, overlapB);

                if (minOverlapX < minOverlapY) {
                  proj.vx = -proj.vx * 0.75;
                  proj.vy *= 0.9;
                  proj.x += overlapL < overlapR ? -minOverlapX : minOverlapX;
                } else {
                  proj.vy = -proj.vy * 0.75;
                  proj.vx *= 0.9;
                  proj.y += overlapT < overlapB ? -minOverlapY : minOverlapY;
                }
                proj._bounceCount++;
                proj._bounceIds.clear();
                proj._bounceIds.add(o.id);
                proj.damage = Math.round(proj.damage * 0.6);
                proj.maxAge = Math.max(proj.maxAge, proj.age + 40);
                proj.explodeAtTarget = false;

                if (pixiRef.current) {
                  const matDef = OBSTACLE_MATERIALS[o.material] || OBSTACLE_MATERIALS.wood;
                  pixiRef.current.spawnObstacleHitSpark(closestX, closestY, matDef.color);
                }
              }

              // ─── DAMAGE: apply to destructible obstacles via unified handler ───
              // Explosive projectiles deal extra damage from splash
              if (o.destructible) {
                const obsDmgMult = isExplosive ? 1.5 : 1;
                const spellDmg = Math.round((proj.damage || 20) * obsDmgMult);
                const spellEl = proj.element || null;
                // Use damageObstacle for full destruction pipeline (combo, collapse, debris, hazards, chains)
                setTimeout(() => damageObstacle(o.id, spellDmg, spellEl), 0);
              }
              break; // one obstacle collision per projectile per frame
            }
          }
        }
      }

      // ─── PROJECTILE vs STRUCTURE collision check ───
      if (physicsRef.current && structuresRef.current.length > 0) {
        const skillshots = physicsRef.current.getPlayerSkillshots();
        for (let si = 0; si < skillshots.length; si++) {
          const proj = skillshots[si];
          if (proj.type !== "linear" && proj.type !== "arc") continue;
          for (const struct of structuresRef.current) {
            if (struct.allDestroyed) continue;
            for (const seg of struct.segments) {
              if (!seg.alive || seg.destroying) continue;
              // Compute segment center in pixel coords
              const sPx = isoModeRef.current ? (struct.x / ISO_CONFIG.MAP_COLS) * GAME_W : (struct.x / 100) * GAME_W;
              const sPy = isoModeRef.current ? (struct.y / ISO_CONFIG.MAP_ROWS) * GAME_H : GAME_H - (struct.y / 100) * GAME_H;
              const scx = sPx + (seg.x + seg.w / 2) - struct.width / 2;
              const scy = sPy - (seg.y + seg.h / 2);
              const shw = seg.w * 0.5 + 4;
              const shh = seg.h * 0.5 + 4;
              const pr = proj.hitRadius || 8;
              const clX = Math.max(scx - shw, Math.min(proj.x, scx + shw));
              const clY = Math.max(scy - shh, Math.min(proj.y, scy + shh));
              const dx = proj.x - clX, dy = proj.y - clY;
              if (dx * dx + dy * dy > pr * pr) continue;
              // Hit!
              const isExplosive = (proj.splashRadius || 0) > 0;
              const obsDmgMult = isExplosive ? 1.5 : 1;
              const spellDmg = Math.round((proj.damage || 20) * obsDmgMult);
              const spellEl = proj.element || null;
              const _sId = struct.id, _segId = seg.id;
              setTimeout(() => damageStructureSegment(_sId, _segId, spellDmg, spellEl), 0);
              if (isExplosive) proj.age = proj.maxAge + 1;
              break; // one segment per projectile per frame
            }
          }
        }
      }

      // Fog of war: reveal around caravan and mercenaries every 10 frames
      if (isoModeRef.current && terrainDataRef.current && frameCount % 10 === 0) {
        const revealPoints = [];
        const _cp = caravanPosRef.current;
        if (_cp) revealPoints.push({ wx: _cp.x, wy: _cp.y, radius: 8 });
        // Add mercenary vision
        for (const fid of friendlyList) {
          const fw = wd[fid.id || fid];
          if (fw && fw.alive) {
            revealPoints.push({ wx: fw.x, wy: fw.y || ISO_CONFIG.MAP_ROWS / 2, radius: 5 });
          }
        }
        if (revealPoints.length > 0) updateFogOfWar(terrainDataRef.current, revealPoints);

        // Dungeon stairs proximity check (every 10 frames)
        if (dungeonStateRef.current && frameCount % 10 === 0) {
          checkDungeonStairs();
          checkDungeonLevelCleared();
        }

        // Update resource discovery (resources hidden until fog reveals them)
        if (terrainDataRef.current.fogGrid) {
          mapResourcesRef.current.updateDiscovery(terrainDataRef.current.fogGrid, ISO_CONFIG.MAP_COLS);
        }

        // Update interactable discovery (hidden in fog until revealed, then stay visible forever)
        const _interacts = interactablesRef.current;
        if (_interacts.length > 0) {
          let anyDiscovered = false;
          for (const item of _interacts) {
            if (item._fogHidden === undefined) { item._fogHidden = true; item._discovered = false; }
            if (item._discovered) continue;
            const iwx = (item.x / 100) * ISO_CONFIG.MAP_COLS;
            const iwy = (item.y / 100) * ISO_CONFIG.MAP_ROWS;
            const icol = Math.floor(iwx), irow = Math.floor(iwy);
            if (icol >= 0 && icol < ISO_CONFIG.MAP_COLS && irow >= 0 && irow < ISO_CONFIG.MAP_ROWS) {
              const fogVal = terrainDataRef.current.fogGrid[irow * ISO_CONFIG.MAP_COLS + icol];
              if (fogVal >= 0.5) { item._discovered = true; item._fogHidden = false; anyDiscovered = true; }
            }
          }
          if (anyDiscovered) setInteractables([..._interacts]);
        }

        // Fog discovery for obstacles (once discovered, stay visible forever)
        let obsAnyDiscovered = false;
        for (const obs of obstaclesRef.current) {
          if (obs._fogDiscovered) continue;
          const ocol = Math.floor(obs.x), orow = Math.floor(obs.y);
          if (ocol >= 0 && ocol < ISO_CONFIG.MAP_COLS && orow >= 0 && orow < ISO_CONFIG.MAP_ROWS) {
            if (terrainDataRef.current.fogGrid[orow * ISO_CONFIG.MAP_COLS + ocol] > 0.01) {
              obs._fogDiscovered = true;
              obsAnyDiscovered = true;
            }
          }
        }
        if (obsAnyDiscovered) setObstacles([...obstaclesRef.current]);

        // Fog discovery for structures — check 3x3 area around center (structures are large)
        let structAnyDiscovered = false;
        for (const struct of structuresRef.current) {
          if (struct._fogDiscovered) continue;
          const scol = Math.floor(struct.x), srow = Math.floor(struct.y);
          let found = false;
          for (let dy = -1; dy <= 1 && !found; dy++) {
            for (let dx = -1; dx <= 1 && !found; dx++) {
              const nc = scol + dx, nr = srow + dy;
              if (nc >= 0 && nc < ISO_CONFIG.MAP_COLS && nr >= 0 && nr < ISO_CONFIG.MAP_ROWS) {
                if (terrainDataRef.current.fogGrid[nr * ISO_CONFIG.MAP_COLS + nc] > 0.01) {
                  found = true;
                }
              }
            }
          }
          if (found) { struct._fogDiscovered = true; structAnyDiscovered = true; }
        }
        if (structAnyDiscovered) setStructures([...structuresRef.current]);

        // Sync NPC fog visibility to physics entries (for PixiJS sprite hiding)
        if (physicsRef.current?.bodies && terrainDataRef.current?.fogGrid) {
          const _fg = terrainDataRef.current.fogGrid;
          for (const [nid, entry] of Object.entries(physicsRef.current.bodies)) {
            if (entry.friendly) { entry._fogHidden = false; continue; }
            const nwx = Math.floor(entry._wx ?? 0), nwy = Math.floor(entry._wy ?? 0);
            if (nwx >= 0 && nwx < ISO_CONFIG.MAP_COLS && nwy >= 0 && nwy < ISO_CONFIG.MAP_ROWS) {
              if (_fg[nwy * ISO_CONFIG.MAP_COLS + nwx] > 0.01) entry._fogDiscovered = true;
              entry._fogHidden = !entry._fogDiscovered;
            }
          }
        }
      }

      // ─── ADVANCED DESTRUCTION SYSTEM UPDATES ───

      // Shockwave update: expand rings, apply push forces to NPCs and debris
      if (shockwavesRef.current.length > 0) {
        const pushEvents = updateShockwaves(shockwavesRef.current);
        for (const pushEvt of pushEvents) {
          // Push NPCs in shockwave ring
          for (const nid of Object.keys(wd)) {
            const w = wd[nid];
            if (!w || !w.alive) continue;
            const npcPx = isoModeRef.current ? (w.x / ISO_CONFIG.MAP_COLS) * GAME_W : (w.x / 100) * GAME_W;
            const npcPy = isoModeRef.current ? ((w.y || ISO_CONFIG.MAP_ROWS / 2) / ISO_CONFIG.MAP_ROWS) * GAME_H : GAME_H - ((w.y || 50) / 100) * GAME_H;
            const push = calcShockwavePush(pushEvt, npcPx, npcPy, nid);
            if (push) {
              // Apply knockback offset to walk data
              w.x += (push.vx / GAME_W) * (isoModeRef.current ? ISO_CONFIG.MAP_COLS : 100);
              if (w.y !== undefined) w.y += (push.vy / GAME_H) * (isoModeRef.current ? ISO_CONFIG.MAP_ROWS : 100);
              // Apply physics hit for visual stagger
              if (physicsRef.current && !w.friendly) {
                physicsRef.current.applyHit(nid, push.element, push.vx > 0 ? 1 : -1);
              }
            }
          }
          // Push active debris
          if (pixiRef.current && pixiRef.current._debris) {
            for (let di = 0; di < pixiRef.current._debris.length; di++) {
              const d = pixiRef.current._debris[di];
              if (d.grounded) continue;
              const dPush = calcDebrisPush(pushEvt, d.x, d.y, di);
              if (dPush) {
                d.vx += dPush.vx;
                d.vy += dPush.vy;
                d.grounded = false;
              }
            }
          }
        }
      }

      // Render shockwave visuals
      if (pixiRef.current && shockwavesRef.current.length > 0) {
        pixiRef.current.renderShockwaves(shockwavesRef.current);
      } else if (pixiRef.current && pixiRef.current._shockwaveGfx) {
        pixiRef.current._shockwaveGfx.clear();
      }

      // Destruction combo decay
      destructionComboRef.current.update(dateNow);

      // Environmental hazards update
      envHazardsRef.current.update(dateNow);

      // Environmental hazard damage to enemies (every ~0.5s)
      if (frameCount % 30 === 0 && envHazardsRef.current.hazards.length > 0) {
        for (const nid of Object.keys(wd)) {
          const w = wd[nid];
          if (!w || !w.alive || w.friendly) continue;
          const effects = envHazardsRef.current.getHazardEffectsAt(w.x, w.y ?? (isoModeRef.current ? ISO_CONFIG.MAP_ROWS / 2 : 50));
          if (effects.damage > 0) {
            const wObj = walkersRef.current.find(ww => ww.id === nid);
            if (wObj && wObj.alive && !wObj.dying) {
              const hDmg = Math.round(effects.damage);
              spawnDmgPopup(nid, `${hDmg}`, effects.element === "fire" ? "#ff6020" : effects.element === "poison" ? "#44ff44" : "#ffee00");
              setWalkers(pp => pp.map(ww => {
                if (ww.id !== nid || !ww.alive || ww.dying) return ww;
                const newWHp = Math.max(0, ww.hp - hDmg);
                if (newWHp <= 0) {
                  sfxNpcDeath();
                  if (walkDataRef.current[ww.id]) walkDataRef.current[ww.id].alive = false;
                  if (physicsRef.current) physicsRef.current.triggerRagdoll(ww.id, effects.element, 1);
                  addMoneyFn(ww.npcData.loot || {});
                  setKills(k => k + 1);
                  showMessage(`${ww.npcData.name} zniszczony zagrożeniem!`, effects.element === "fire" ? "#ff6020" : "#44ff44");
                  setTimeout(() => setWalkers(pp2 => pp2.map(www => www.id === ww.id ? { ...www, alive: false } : www)), 2500);
                  return { ...ww, hp: 0, dying: true, dyingAt: Date.now() };
                }
                return { ...ww, hp: newWHp };
              }));
            }
          }
        }
      }

      // Projectile debris damage check (every 3 frames for performance)
      if (frameCount % 3 === 0 && pixiRef.current && pixiRef.current._debris) {
        for (const d of pixiRef.current._debris) {
          if (!d.isProjectile || d.grounded) continue;
          for (const nid of Object.keys(wd)) {
            const w = wd[nid];
            if (!w || !w.alive || w.friendly) continue;
            const npcPx = isoModeRef.current ? (w.x / ISO_CONFIG.MAP_COLS) * GAME_W : (w.x / 100) * GAME_W;
            const npcPy = isoModeRef.current ? ((w.y || ISO_CONFIG.MAP_ROWS / 2) / ISO_CONFIG.MAP_ROWS) * GAME_H : GAME_H - ((w.y || 50) / 100) * GAME_H;
            const debrisDmg = checkDebrisDamage(d, npcPx, npcPy, nid);
            if (debrisDmg) {
              spawnDmgPopup(nid, `${debrisDmg.damage}`, "#b0b0b0");
              setWalkers(pp => pp.map(ww => {
                if (ww.id !== nid || !ww.alive || ww.dying) return ww;
                const newWHp = Math.max(0, ww.hp - debrisDmg.damage);
                if (newWHp <= 0) {
                  sfxNpcDeath();
                  if (walkDataRef.current[ww.id]) walkDataRef.current[ww.id].alive = false;
                  if (physicsRef.current) physicsRef.current.triggerRagdoll(ww.id, null, 1);
                  addMoneyFn(ww.npcData.loot || {});
                  setKills(k => k + 1);
                  showMessage(`${ww.npcData.name} trafiony odłamkiem!`, "#b0b0b0");
                  setTimeout(() => setWalkers(pp2 => pp2.map(www => www.id === ww.id ? { ...www, alive: false } : www)), 2500);
                  return { ...ww, hp: 0, dying: true, dyingAt: Date.now() };
                }
                return { ...ww, hp: newWHp };
              }));
            }
          }
        }
      }

      // Terrain destruction tick: update burning, frozen, poison zones
      if (isoModeRef.current && terrainDataRef.current) {
        terrainDestructionRef.current.update(terrainDataRef.current, dateNow);
        // Rebuild walk grid if terrain changed (craters, frozen water thaw, destroyed vegetation)
        if (terrainDestructionRef.current.needsWalkGridRebuild) {
          walkGridRef.current = buildWalkGrid(terrainDataRef.current);
          terrainDestructionRef.current.needsWalkGridRebuild = false;
        }

        // Re-render canvas directly when terrain effects are active (craters, fire, ice, poison)
        // The useEffect canvas render only triggers on biome/room/night changes, so without
        // this, destruction effects would never appear on screen during combat
        if (terrainDestructionRef.current.effects.size > 0 && canvasRef.current && biomeRef.current) {
          const c = canvasRef.current;
          const ctx = c.getContext("2d");
          const cam = isoCameraRef.current;
          ctx.clearRect(0, 0, GAME_W, GAME_H);
          renderIsoBiome(ctx, biomeRef.current, roomRef.current, c.width, c.height, isNightRef.current, cam.x, cam.y, caravanPosRef.current, !!placingFortRef.current, terrainDataRef.current?.heightMap);
          renderTerrainOverlays(ctx, terrainDataRef.current, cam.x, cam.y, true, terrainDestructionRef.current, mapResourcesRef.current, chokepointsRef.current);
        }

        // Terrain zone damage: damage enemies standing on burning/poison tiles (every ~0.5s)
        if (frameCount % 30 === 0) {
          const _td = terrainDestructionRef.current;
          const _cols = ISO_CONFIG.MAP_COLS;
          const _zoneDmgIds = [];
          for (const nid of Object.keys(wd)) {
            const w = wd[nid];
            if (!w || !w.alive || w.friendly) continue; // only damage enemies
            const col = Math.floor(w.x);
            const row = Math.floor(w.y ?? ISO_CONFIG.MAP_ROWS / 2);
            const zoneDmg = _td.getEffectDamage(col, row, _cols);
            if (zoneDmg) {
              const _dmg = Math.round(zoneDmg.damage);
              if (_dmg > 0) {
                _zoneDmgIds.push({ id: parseInt(nid), dmg: _dmg, elem: zoneDmg.element });
                if (pixiRef.current) {
                  const px = (w.x / _cols) * GAME_W;
                  const py = ((w.y || ISO_CONFIG.MAP_ROWS / 2) / ISO_CONFIG.MAP_ROWS) * GAME_H;
                  if (zoneDmg.element === "fire") pixiRef.current.spawnFire(px, py);
                  else if (zoneDmg.element === "poison") pixiRef.current.spawnPoisonCloud(px, py);
                }
              }
            }
          }
          // Apply zone damage to enemy walkers
          if (_zoneDmgIds.length > 0) {
            setWalkers(prev => prev.map(ww => {
              const hit = _zoneDmgIds.find(z => z.id === ww.id);
              if (!hit || !ww.alive || ww.dying) return ww;
              const newHp = Math.max(0, ww.hp - hit.dmg);
              spawnDmgPopup(ww.id, `${hit.dmg}`, hit.elem === "fire" ? "#ff6020" : "#44ff44");
              if (newHp <= 0) {
                return { ...ww, hp: 0, alive: false, dying: true, deathTime: Date.now() };
              }
              return { ...ww, hp: newHp };
            }));
          }
        }

        // Resource gathering: check caravan proximity to resources
        if (frameCount % 15 === 0) {
          const _cp = caravanPosRef.current;
          if (_cp) {
            const gathered = mapResourcesRef.current.updateGathering(_cp.x, _cp.y, dateNow);
            if (gathered) {
              const val = gathered.value;
              if (val.copper) addMoneyFn({ copper: val.copper });
              if (val.heal) setCaravanHp(prev => Math.min(prev + val.heal, CARAVAN_LEVELS[caravanLevelRef.current].hp));
              if (val.ammo) setAmmo(prev => ({ ...prev, [val.ammo]: (prev[val.ammo] || 0) + val.amount }));
              showMessage(`Zebrano: ${gathered.resource.name}!`, gathered.resource.color);
            }
          }
        }
      }

      // Step physics simulation
      if (physicsRef.current) physicsRef.current.step();
    };
    walkRafRef.current = requestAnimationFrame(loop);
    return () => { if (walkRafRef.current) cancelAnimationFrame(walkRafRef.current); };
  }, []);

  const enterRoom = useCallback((newRoom, tools, forcedBiome) => {
    const b = forcedBiome || BIOMES[Math.floor(Math.random() * BIOMES.length)];
    setBiome(b);
    // Generate next room preview for spyglass
    const nextB = BIOMES[Math.floor(Math.random() * BIOMES.length)];
    const nextIsDefense = (newRoom + 1) > 0 && (newRoom + 1) % 5 === 0;
    const nextIsBoss = (newRoom + 1) > 0 && (newRoom + 1) % 10 === 0;
    const nextIsRiver = true; // river segment on every transition
    setNextRoomPreview({ biome: nextB, isDefense: nextIsDefense, isBoss: nextIsBoss, isRiver: nextIsRiver, room: newRoom + 1 });
    setRoom(newRoom);
    setPanOffset(0);
    panOffsetRef.current = 0;
    panRef.current.dragging = false; // ensure dragging state is reset so canvas renders
    combatEngagedRef.current = false; // enemies passive until player attacks
    if (isoModeRef.current) {
      // Center iso camera on map center for new room
      const cam = isoCameraRef.current;
      cam.centerOnWorld(ISO_CONFIG.MAP_COLS / 2, ISO_CONFIG.MAP_ROWS / 2);
      clearTileCache(); // new biome may need different tiles
      if (pixiRef.current) pixiRef.current.setIsoCamera(cam.x, cam.y);
      // Place caravan at left side of the map, vertically centered
      caravanPosRef.current = { x: 3, y: ISO_CONFIG.MAP_ROWS / 2 };
      caravanMoveRef.current = { active: false, targetX: 0, targetY: 0, speed: 2.5 };
      setCaravanSelected(false);
      // Generate terrain overlays (roads, water, vegetation, fog)
      terrainDataRef.current = generateTerrainData(newRoom, nextB);
      // Build walk grid for terrain-aware pathfinding
      walkGridRef.current = buildWalkGrid(terrainDataRef.current);
      chokepointsRef.current = detectChokepoints(walkGridRef.current, ISO_CONFIG.MAP_COLS, ISO_CONFIG.MAP_ROWS);
      // Reset terrain destruction state for new room
      terrainDestructionRef.current.reset();
      // Reset advanced destruction systems for new room
      shockwavesRef.current = [];
      destructionComboRef.current.reset();
      envHazardsRef.current.reset();
      collapseEventsRef.current = [];
      structuresRef.current = [];
      // Generate collectible map resources (ore, wood, herbs)
      mapResourcesRef.current.reset();
      mapResourcesRef.current.generate(newRoom, nextB.id, terrainDataRef.current);
      if (!terrainParticlesRef.current) {
        terrainParticlesRef.current = new TerrainParticleSystem(isMobileScreen());
      }
      terrainParticlesRef.current.clear();
    } else {
      if (pixiRef.current) pixiRef.current.setPanOffset(0);
    }
    // Immediately clear all POIs to prevent stale visuals from previous room
    setFruitTree(null);
    setMineNugget(null);
    setWaterfall(null);
    setMercCamp(null);
    setWizardPoi(null);
    setBiomePoi(null);
    setDefensePoi(null);
    setShowFortMenu(false);
    setFortPlacedCount(0);
    const isDefenseRoom = newRoom > 0 && newRoom % 5 === 0;

    // Power spike warning: boss coming next room
    if (newRoom % 10 === 9) {
      setPowerSpikeWarning(true);
      setTimeout(() => setPowerSpikeWarning(false), 4000);
    } else {
      setPowerSpikeWarning(false);
    }

    // Decrement risk event room counters
    if (enemyBuffRoomsRef.current > 0) setEnemyBuffRooms(prev => prev - 1);
    if (playerDoubleDmgRoomsRef.current > 0) setPlayerDoubleDmgRooms(prev => prev - 1);
    if (secretSpellBuffRoomsRef.current > 0) setSecretSpellBuffRooms(prev => prev - 1);
    // Reset per-room merchant buffs (active for 1 room after purchase)
    if (eventMercDmgBuffRef.current > 0) { setEventMercDmgBuff(0); eventMercDmgBuffRef.current = 0; }
    if (eventMercHpBuffRef.current > 0) { setEventMercHpBuff(0); eventMercHpBuffRef.current = 0; }

    // Decrement bazaar special buff durations
    setActiveBuffs(prev => prev
      .map(b => b.roomsLeft === -1 ? b : { ...b, roomsLeft: b.roomsLeft - 1 })
      .filter(b => b.roomsLeft === -1 || b.roomsLeft > 0)
    );
    // Reset shop stock so it regenerates on next visit
    setShopStock(null);

    // Enemy Mutations: every 10 rooms, least-killed enemies evolve
    if (newRoom > 1 && newRoom % MUTATION_INTERVAL === 0) {
      const biomeEnemies = b.enemies || [];
      if (biomeEnemies.length > 0) {
        const targets = selectMutationTargets(killsByTypeRef.current, biomeEnemies);
        const newMuts = targets.map(name => ({ npcName: name, mutation: pickMutation() }));
        setActiveMutations(newMuts);
        const mutNames = newMuts.map(m => `${m.npcName} → ${m.mutation.name}`).join(", ");
        setTimeout(() => showMessage(`Mutacja wrogów! ${mutNames}`, "#cc60cc"), 1000);
      }
    }

    // Ghost Ship: 10% chance after room 30
    if (newRoom >= GHOST_SHIP_CONFIG.minRoom && Math.random() < GHOST_SHIP_CONFIG.chance && !isDefenseRoom) {
      setGhostShipActive(true);
      setTimeout(() => showMessage("Widmowy Statek! Najemnicy odmawiają walki... Łup x3!", "#8888cc"), 800);
    } else {
      setGhostShipActive(false);
    }

    // Night mode (30% chance)
    const night = Math.random() < 0.3;
    setIsNight(night);
    // Weather (40% chance, biome-filtered) — also applies to defense rooms
    const roomWeather = rollWeather(b.id);
    setWeather(roomWeather);
    if (roomWeather) { sfxWeather(roomWeather.id); showMessage(`${roomWeather.name}!`, "#80a0cc"); }
    // Biome environmental modifier (60% chance)
    const roomModifier = rollModifier(b.id);
    setBiomeModifier(roomModifier);
    if (roomModifier) {
      setTimeout(() => showMessage(`${roomModifier.name}: ${roomModifier.desc}`, "#c0a0ff"), 800);
    }
    // Biome interactive terrain elements
    if (!isDefenseRoom) {
      const roomInteractables = rollInteractables(b.id);
      // In iso mode, interactables start hidden until fog reveals them
      if (isoModeRef.current) {
        for (const item of roomInteractables) {
          item._fogHidden = true;
          item._discovered = false;
        }
      }
      setInteractables(roomInteractables);
      // Generate ISO map secrets (hidden, revealed by proximity)
      if (isoModeRef.current) {
        const SECRET_TYPES = [
          { type: "buried_treasure", icon: "💰", label: "Zakopany skarb",  weight: 35 },
          { type: "forgotten_cache",  icon: "📦", label: "Zapomniana skrytka", weight: 30 },
          { type: "ancient_rune",     icon: "🔮", label: "Starożytna runa",    weight: 20 },
          { type: "mysterious_altar", icon: "⛩️", label: "Tajemniczy ołtarz",  weight: 10 },
          { type: "old_bones",        icon: "💀", label: "Stare kości",        weight: 5  },
        ];
        const totalW = SECRET_TYPES.reduce((s, t) => s + t.weight, 0);
        const pickType = () => {
          let r = Math.random() * totalW;
          for (const t of SECRET_TYPES) { r -= t.weight; if (r <= 0) return t; }
          return SECRET_TYPES[0];
        };
        const MAP_C = ISO_CONFIG.MAP_COLS, MAP_R = ISO_CONFIG.MAP_ROWS;
        const count = 2 + Math.floor(Math.random() * 2); // 2-3 secrets per room
        const generated = [];
        for (let i = 0; i < count; i++) {
          const t = pickType();
          // Place in mid-map avoiding edges and other secrets
          let wx, wy, attempts = 0;
          do {
            wx = 6 + Math.random() * (MAP_C - 12);
            wy = 6 + Math.random() * (MAP_R - 12);
            attempts++;
          } while (attempts < 20 && generated.some(s => Math.abs(s.wx - wx) + Math.abs(s.wy - wy) < 5));
          generated.push({ id: `secret_${Date.now()}_${i}`, wx, wy, ...t, discovered: false, collected: false });
        }
        setMapSecrets(generated);
      } else {
        setMapSecrets([]);
      }
    } else {
      setInteractables([]);
      // Spawn defense POI — player must click it to trigger defense
      const poiDef = DEFENSE_POIS[b.id] || DEFENSE_POIS.summer;
      setDefensePoi({
        ...poiDef,
        x: 35 + Math.random() * 30, // 35-65% of viewport
        y: 35 + Math.random() * 25, // 35-60% from bottom
        roomNumber: newRoom,
        biomeId: b.id,
        activated: false,
      });
    }
    // Room challenge (40% chance)
    const challenge = rollChallenge(newRoom, isDefenseRoom);
    setRoomChallenge(challenge);
    if (challenge) {
      setTimeout(() => showMessage(`Wyzwanie: ${challenge.name}!`, "#ffa040"), 500);
    }
    // Stop any active mining
    if (miningRef.current.intervalId) clearInterval(miningRef.current.intervalId);
    miningRef.current = { active: false, intervalId: null };
    setMiningProgress(0);

    const chestRate = b.id === "jungle" ? 1.0 : hasRelic("fortune_magnet") ? 0.15 : 0.08;
    if (!isDefenseRoom && Math.random() < chestRate) {
      const cx = useIso ? 5 + Math.random() * (ISO_CONFIG.MAP_COLS - 10) : 10 + Math.random() * 72;
      const cy = useIso ? 5 + Math.random() * (ISO_CONFIG.MAP_ROWS - 10) : 25 + Math.random() * 65;
      setChestPos({ x: cx, y: cy });
      setShowChest(true);
      setChestClicks(0);
    } else {
      setShowChest(false); setChestPos(null); setChestClicks(0);
    }

    const currentTools = tools || [];
    if (isDefenseRoom) {
      // Defense rooms: clear resource POIs but keep defense POI — don't auto-start defense
      setShowChest(false); setChestPos(null); setChestClicks(0); setResourceNode(null); setShowResource(false);
      setFruitTree(null); setMineNugget(null); setWaterfall(null); setBiomePoi(null);
      setMercCamp(null); setWizardPoi(null); setTraps([]);
      // Note: obstacles are now generated for ALL rooms (line ~2652), so don't clear them here
    }

    const terrain = b.terrain;
    const hasTool = (terrain === "forest" && currentTools.includes("axe")) ||
                    (terrain === "mine" && currentTools.includes("pickaxe"));
    if (!isDefenseRoom && hasTool && Math.random() < 0.45) {
      const rx = useIso ? 5 + Math.random() * (ISO_CONFIG.MAP_COLS - 10) : 10 + Math.random() * 280;
      const ry = useIso ? 5 + Math.random() * (ISO_CONFIG.MAP_ROWS - 10) : 58 + Math.random() * 24;
      const res = pickResource(terrain);
      if (res) { res.biome = b.name; res.room = newRoom; }
      setResourceNode({ terrain, pos: { x: rx, y: ry }, resource: res });
      setShowResource(true);
    } else {
      setResourceNode(null); setShowResource(false);
    }

    // POIs – biome-variant configs
    if (nuggetRef.current.intervalId) clearInterval(nuggetRef.current.intervalId);
    nuggetRef.current = { active: false, intervalId: null };

    const TREE_VARIANTS = {
      jungle:   { crown: ["#1a6a0a","#0e4a04","#063002"], trunk: "#5a3a18", fruits: ["coin","coin","gem","gold"], label: "Dżunglowe Drzewo" },
      island:   { crown: ["#1a7a10","#0e5a08","#064004"], trunk: "#7a5a30", fruits: ["coin","coin","gold"], label: "Palma" },
      winter:   { crown: ["#506880","#3a5060","#2a3a48"], trunk: "#4a3a2a", fruits: [], label: "Ośnieżone Drzewo" },
      summer:   { crown: ["#2a8a1a","#1a6a10","#0e4a06"], trunk: "#6a4a20", fruits: ["coin","coin","gem","gold","star"], label: "Owocowe Drzewo" },
      autumn:   { crown: ["#a06020","#c07030","#804010"], trunk: "#5a3a18", fruits: ["coin","coin","rock"], label: "Jesienny Dąb" },
      spring:   { crown: ["#30a020","#20801a","#106010"], trunk: "#6a4a22", fruits: ["coin","gem","gold","star"], label: "Kwitnące Drzewo" },
      mushroom: { crown: ["#6040a0","#4a3080","#302060"], trunk: "#6a5a40", fruits: ["mushroom","mushroom","mushroom"], label: "Grzyborost" },
      swamp:    { crown: ["#2a5a1a","#1a4010","#0e3008"], trunk: "#3a3018", fruits: ["coin","coin"], label: "Bagienny Dąb" },
      sunset_beach: { crown: ["#1a7a10","#0e5a08","#064004"], trunk: "#8a6a38", fruits: ["coin","coin","gold"], label: "Palma Zachodu" },
      bamboo_falls: { crown: ["#2a8a30","#1a6a20","#105010"], trunk: "#6a8a30", fruits: ["coin","gem","herb"], label: "Bambusowe Drzewo" },
      blue_lagoon:  { crown: ["#1a7a10","#0e6a08","#045a04"], trunk: "#7a5a30", fruits: ["coin","coin","gem"], label: "Tropikalna Palma" },
    };
    const MINE_VARIANTS = {
      desert:  { rockCol: ["#8a7a60","#6a6050","#5a5040"], oreIcon: "gem", label: "Piaskowa Skała" },
      city:    { rockCol: ["#5a5550","#4a4540","#3a3530"], oreIcon: "rock", label: "Ruiny Kopalni" },
      volcano: { rockCol: ["#4a2a1a","#3a2010","#2a1808"], oreIcon: "fire", label: "Wulkaniczna Żyła" },
      olympus: { rockCol: ["#c8c0a8","#a8a088","#8a8070"], oreIcon: "gem", label: "Marmurowa Skała" },
      underworld: { rockCol: ["#2a1a30","#1a1020","#100818"], oreIcon: "gem", label: "Żyła Styksu" },
    };
    const WATER_VARIANTS = {
      jungle:  { rgb: [40,180,100], label: "Leśny Wodospad", frozen: false },
      winter:  { rgb: [160,200,255], label: "Zamrożony Wodospad", frozen: true },
      swamp:   { rgb: [60,100,40], label: "Bagienny Spływ", frozen: false },
      bamboo_falls: { rgb: [60,180,140], label: "Bambusowy Wodospad", frozen: false },
      blue_lagoon:  { rgb: [40,180,220], label: "Lazurowy Wodospad", frozen: false },
      spring:  { rgb: [60,160,200], label: "Wiosenny Potok", frozen: false },
      default: { rgb: [80,160,255], label: "Wodospad", frozen: false },
    };

    const bid = b.id;
    const useIso = isoModeRef.current;
    const MAX_POIS = 6;
    const poiSlots = []; // { x, y } – tracks used positions to avoid overlap
    const poiCount = () => poiSlots.length;
    // In iso mode: positions are tile coords (3-37), panoramic: percentage (0-300)
    const ISO_POI_MIN_DIST = 4; // tiles apart in iso
    const PAN_POI_MIN_DIST = 12; // percent apart in panoramic
    const pickXY = (minX, maxX, minY, maxY) => {
      const minDist = useIso ? ISO_POI_MIN_DIST : PAN_POI_MIN_DIST;
      for (let tries = 0; tries < 30; tries++) {
        const x = minX + Math.random() * (maxX - minX);
        const y = minY + Math.random() * (maxY - minY);
        if (poiSlots.every(s => Math.sqrt((s.x - x) ** 2 + (s.y - y) ** 2) >= minDist)) {
          poiSlots.push({ x, y });
          return { x, y };
        }
      }
      return null;
    };
    // Legacy pickX wrapper for panoramic (y is optional)
    const pickX = (min, max) => {
      const result = pickXY(
        useIso ? 3 : min,
        useIso ? ISO_CONFIG.MAP_COLS - 3 : max,
        useIso ? 3 : 25,
        useIso ? ISO_CONFIG.MAP_ROWS - 3 : 75
      );
      return result ? result.x : null;
    };
    // Get last picked Y (for iso mode POIs need both x and y)
    const lastPickedY = () => poiSlots.length > 0 ? poiSlots[poiSlots.length - 1].y : (useIso ? ISO_CONFIG.MAP_ROWS / 2 : 50);

    // Build list of candidate POIs, roll each, then cap at MAX_POIS
    let newTree = null, newMine = null, newWater = null, newCamp = null, newWizard = null, newBiomePoi = null;
    if (!isDefenseRoom) {

    if (terrain === "forest" && Math.random() < 0.35) {
      const tx = pickX(20, 275);
      if (tx !== null) {
        const tv = TREE_VARIANTS[bid] || TREE_VARIANTS.summer;
        const fruits = [];
        if (tv.fruits.length > 0) {
          const count = 2 + Math.floor(Math.random() * 3);
          for (let i = 0; i < count; i++) {
            fruits.push({ id: i, icon: tv.fruits[Math.floor(Math.random() * tv.fruits.length)], x: 15 + Math.random() * 70, y: 10 + Math.random() * 40, picked: false });
          }
        }
        newTree = { x: tx, y: lastPickedY(), fruits, biomeId: bid, crown: tv.crown, trunk: tv.trunk, label: tv.label };
      }
    }

    if (poiCount() < MAX_POIS && terrain === "mine" && currentTools.includes("pickaxe") && Math.random() < 0.30) {
      const nx = pickX(15, 275);
      if (nx !== null) {
        const mv = MINE_VARIANTS[bid] || MINE_VARIANTS.desert;
        const nuggetCount = 2 + Math.floor(Math.random() * 3);
        const nuggets = [];
        for (let i = 0; i < nuggetCount; i++) {
          nuggets.push({ id: i, x: 10 + Math.random() * 70, y: 15 + Math.random() * 50, dug: false });
        }
        newMine = { x: nx, y: lastPickedY(), nuggets, progress: 0, activeId: null, biomeId: bid, rockCol: mv.rockCol, oreIcon: mv.oreIcon, label: mv.label };
      }
    }

    if (poiCount() < MAX_POIS && Math.random() < 0.10) {
      const wx = pickX(40, 260);
      if (wx !== null) {
        const wv = WATER_VARIANTS[bid] || WATER_VARIANTS.default;
        newWater = { x: wx, y: lastPickedY(), opened: false, biomeId: bid, rgb: wv.rgb, label: wv.label, frozen: wv.frozen };
      }
    }

    if (poiCount() < MAX_POIS && Math.random() < 0.20) {
      const cx = pickX(25, 270);
      if (cx !== null) newCamp = { x: cx, y: lastPickedY(), biomeId: bid };
    }

    if (poiCount() < MAX_POIS && Math.random() < 0.20) {
      const wizX = pickX(30, 275);
      if (wizX !== null) {
        const ammoTypes = [
          { type: "dynamite", min: 2, max: 5 },
          { type: "harpoon", min: 2, max: 5 },
          { type: "cannonball", min: 1, max: 3 },
          { type: "rum", min: 2, max: 4 },
          { type: "chain", min: 1, max: 3 },
        ];
        const pick = ammoTypes[Math.floor(Math.random() * ammoTypes.length)];
        const amount = pick.min + Math.floor(Math.random() * (pick.max - pick.min + 1));
        newWizard = { x: wizX, y: lastPickedY(), ammoType: pick.type, ammoAmount: amount };
      }
    }

    // ─── BIOME-SPECIFIC POI (unique interaction per biome) ───
    if (poiCount() < MAX_POIS) {
      const bpx = pickX(15, 280);
      if (bpx !== null) {
        // Each biome has its own POI type with unique mechanic
        const BIOME_POIS = {
          jungle:   { type: "healing_spring",  label: "Uzdrawiające Źródło",  icon: "water",  desc: "Odnawia HP karawany" },
          island:   { type: "shipwreck_cache", label: "Wrak ze Skarbem",      icon: "chest",  desc: "Ukryty skarb pirata" },
          desert:   { type: "oasis",           label: "Oaza",                 icon: "water",  desc: "Orzeźwia — bonus do obrażeń" },
          winter:   { type: "ice_crystal",     label: "Kryształ Lodu",        icon: "ice",    desc: "Lodowa moc — wzmocnienie ataków" },
          city:     { type: "black_market",    label: "Czarny Rynek",         icon: "coin",   desc: "Rzadkie przedmioty za złoto" },
          volcano:  { type: "fire_shrine",     label: "Ognisty Ołtarz",       icon: "fire",   desc: "Ofiara za moc ognia" },
          summer:   { type: "camp_rest",       label: "Obozowisko",           icon: "campfire",desc: "Odpoczynek — regeneracja" },
          autumn:   { type: "mushroom_circle", label: "Krąg Grzybów",         icon: "mushroom",desc: "Tajemniczy efekt losowy" },
          spring:   { type: "fairy_well",      label: "Studnia Wróżek",       icon: "sparkle",desc: "Losowy bonus lub klątwa" },
          mushroom: { type: "spore_cloud",     label: "Chmura Zarodników",    icon: "poison", desc: "Trucizna dla wrogów dookoła" },
          swamp:    { type: "witch_hut",       label: "Chata Wiedźmy",        icon: "skull",  desc: "Ryzykowna wymiana" },
          sunset_beach: { type: "treasure_map",label: "Mapa Skarbów",         icon: "scroll", desc: "Bonus do złota w tym pokoju" },
          bamboo_falls: { type: "zen_shrine",  label: "Świątynia Zen",        icon: "lotus",  desc: "Cisza — wzmocnienie obrony" },
          blue_lagoon:  { type: "pearl_oyster", label: "Perłowa Muszla",      icon: "gem",    desc: "Rzadka perła — dużo złota" },
        };
        // Dungeon entrance: 18% chance to replace normal biome POI (after room 5)
        const DUNGEON_BIOME_MAP = {
          jungle: "cave", island: "cave", desert: "mine", winter: "mine",
          city: "crypt", volcano: "mine", summer: "ruins", autumn: "crypt",
          spring: "cave", mushroom: "cave", swamp: "crypt", sunset_beach: "ruins",
          bamboo_falls: "ruins", blue_lagoon: "cave", olympus: "ruins",
          underworld: "crypt", meteor: "mine",
        };
        const dungeonChance = 1.0; // Always spawn dungeon entrance
        let poiDef;
        if (dungeonChance > 0 && Math.random() < dungeonChance && !dungeonStateRef.current) {
          const dType = DUNGEON_BIOME_MAP[bid] || "mine";
          const dName = DUNGEON_TYPES[dType]?.name || "Dungeon";
          poiDef = {
            type: "dungeon_entrance",
            label: dName,
            icon: DUNGEON_TYPES[dType]?.icon || "skull",
            desc: DUNGEON_TYPES[dType]?.desc || "Niebezpieczne podziemia pełne skarbów",
            dungeonType: dType,
          };
        } else {
          poiDef = BIOME_POIS[bid] || BIOME_POIS.summer;
        }
        newBiomePoi = { ...poiDef, x: bpx, y: lastPickedY(), biomeId: bid, used: false };
      }
    }

    } // end !isDefenseRoom POIs
    setFruitTree(newTree);
    setMineNugget(newMine);
    setWaterfall(newWater);
    setMercCamp(newCamp);
    setWizardPoi(newWizard);
    setBiomePoi(newBiomePoi);

    // ─── OBSTACLES (destructible per biome) ───
    // Wrapped in try/catch to detect any silent errors
    try {
    // Explosive obstacles (small chance) per biome
    const EXPLOSIVE_VARIANTS = {
      jungle:   "gas_mushroom",     island:   "powder_keg",       desert:   "oil_barrel",
      winter:   "frozen_gas_vent",  city:     "dynamite_crate",   volcano:  "magma_rock",
      summer:   "oil_barrel",       autumn:   "gas_mushroom",     spring:   "gas_mushroom",
      mushroom: "gas_mushroom",     swamp:    "swamp_gas_pod",    sunset_beach: "powder_keg",
      bamboo_falls: "gas_mushroom", blue_lagoon: "powder_keg",
      olympus: "volatile_crystal",  underworld: "magma_rock",
    };
    const OBSTACLE_VARIANTS = {
      jungle:   ["fallen_log", "vine_wall", "ancient_totem", "moss_boulder", "giant_mushroom", "coral_reef", "rope_coil", "fallen_tree"],
      island:   ["shipwreck", "driftwood", "tide_pool", "anchor_post", "barrel_stack", "cannon_wreck", "fishing_net", "barnacle_rock"],
      desert:   ["cactus_cluster", "wagon_wreck", "sun_bleached_skull", "tumbleweed", "sandbag_wall", "rope_coil", "rusted_cage", "dead_tree"],
      winter:   ["ice_pillar", "frozen_barrel", "snowdrift", "icicle_rock", "barnacle_rock", "mast_fragment", "crystal_geode", "moss_boulder"],
      city:     ["small_house", "market_stall", "small_house", "lamp_post", "broken_wagon", "barrel_stack", "small_house", "sandbag_wall"],
      volcano:  ["lava_pool", "obsidian_pillar", "steam_vent", "ash_mound", "crystal_cluster", "crystal_geode", "barnacle_rock", "rusted_cage"],
      summer:   ["haystack", "windmill", "scarecrow", "wooden_fence", "flower_patch", "beehive", "log_pile", "well"],
      autumn:   ["log_pile", "hunting_stand", "mushroom_ring", "fallen_tree", "dead_tree", "moss_boulder", "haystack", "wooden_fence"],
      spring:   ["flower_patch", "beehive", "stone_bridge", "well", "vine_wall", "lily_pad", "fallen_log", "giant_mushroom"],
      mushroom: ["crystal_cluster", "giant_mushroom", "web_wall", "stalactite", "crystal_geode", "fog_pool", "vine_wall", "mushroom_ring"],
      swamp:    ["quicksand", "dead_tree", "fog_pool", "lily_pad", "vine_wall", "fishing_net", "coral_reef", "seaweed_patch"],
      sunset_beach: ["driftwood", "tide_pool", "shipwreck", "anchor_post", "barrel_stack", "coral_reef", "fishing_net", "barnacle_rock"],
      bamboo_falls: ["moss_boulder", "fallen_log", "vine_wall", "flower_patch", "coral_reef", "rope_coil", "giant_mushroom", "lily_pad"],
      blue_lagoon:  ["driftwood", "tide_pool", "anchor_post", "flower_patch", "coral_reef", "seaweed_patch", "fishing_net", "barnacle_rock"],
      olympus:      ["obsidian_pillar", "moss_boulder", "crystal_cluster", "crystal_geode", "ancient_totem", "stone_bridge", "fallen_log", "volatile_crystal"],
      underworld:   ["stalactite", "obsidian_pillar", "lava_pool", "crystal_cluster", "fog_pool", "dead_tree", "ash_mound", "crystal_geode"],
    };
    const biomeObstacles = OBSTACLE_VARIANTS[bid] || OBSTACLE_VARIANTS.desert;
    const biomeExplosive = EXPLOSIVE_VARIANTS[bid] || "powder_keg";
    const newObstacles = [];
    // Spawn obstacles in both exploration and defense rooms (fewer in defense)
    const obsCount = isDefenseRoom ? (6 + Math.floor(Math.random() * 3)) : (14 + Math.floor(Math.random() * 4));
    // Minimum distance between obstacles to prevent overlap (in % units)
    const OBS_MIN_DIST = useIso ? 3 : 8; // tiles in iso, percentage in panoramic
    const _obsTooClose = (ox, oy, list) => {
      for (const o of list) {
        const dx = ox - o.x, dy = oy - o.y;
        if (dx * dx + dy * dy < OBS_MIN_DIST * OBS_MIN_DIST) return true;
      }
      return false;
    };
    for (let i = 0; i < obsCount; i++) {
      let ox, oy, attempts = 0;
      if (useIso) {
        // Iso mode: spread obstacles across the tile map
        do {
          ox = 2 + Math.random() * (ISO_CONFIG.MAP_COLS - 4);
          oy = 2 + Math.random() * (ISO_CONFIG.MAP_ROWS - 4);
          attempts++;
        } while (_obsTooClose(ox, oy, newObstacles) && attempts < 20);
      } else {
        // Panoramic: ~50% in viewport, ~50% in world
        const inViewport = i < Math.ceil(obsCount * 0.5);
        do {
          ox = inViewport
            ? 5 + Math.random() * 90
            : 100 + Math.random() * 190;
          oy = 10 + Math.random() * 55;
          attempts++;
        } while (_obsTooClose(ox, oy, newObstacles) && attempts < 20);
      }
      // 12% chance for explosive variant
      const isExplosiveObs = Math.random() < 0.12;
      const obsType = isExplosiveObs ? biomeExplosive : biomeObstacles[Math.floor(Math.random() * biomeObstacles.length)];
      const def = OBSTACLE_DEFS[obsType] || { material: "wood", hp: 30, loot: {}, destructible: true };
      const roomScale = 1 + Math.min(newRoom / 20, 0.5); // obstacles slightly tougher in later rooms
      const scaledHp = def.destructible ? Math.round(def.hp * roomScale) : 0;
      newObstacles.push({
        id: Date.now() + i,
        type: obsType,
        x: ox,
        y: oy,
        biomeId: bid,
        hp: scaledHp,
        maxHp: scaledHp,
        destructible: def.destructible,
        material: def.material,
        loot: def.loot,
        explosive: def.explosive || false,
        explosionDmg: def.explosionDmg || 0,
        explosionRadius: def.explosionRadius || 0,
        explosionElement: def.element || "fire",
        hitAnim: 0,        // shake animation timer
        destroying: false,  // destruction animation in progress
        _fogDiscovered: !isoModeRef.current, // fog: hidden until revealed in iso mode
      });
    }
    setObstacles(newObstacles);

    // ─── COMPOSITE STRUCTURES (multi-segment buildings) ───
    try {
      const newStructures = [];
      const structCandidates = BIOME_STRUCTURES[bid];
      if (structCandidates && structCandidates.length > 0 && !isDefenseRoom) {
        // Always spawn 2-3 structures per room
        const maxStructs = Math.random() < 0.5 ? 3 : 2;
        for (let si = 0; si < maxStructs; si++) {
          const def = getRandomStructure(bid);
          if (!def) continue;
          // Find a position that doesn't overlap existing obstacles or structures
          let sx, sy, sAttempts = 0;
          const sBounds = getStructureBounds(0, 0, def);
          // In ISO mode positions are tile coords (0-40), not pixels/percentages.
          // Using pixel-based radius as tile distance would require 16+ tile spacing,
          // making placement impossible in a 40x40 map. Use 4-tile spacing instead.
          const sMinDist = useIso ? 4 : sBounds.radius;
          do {
            if (useIso) {
              sx = 3 + Math.random() * (ISO_CONFIG.MAP_COLS - 6);
              sy = 3 + Math.random() * (ISO_CONFIG.MAP_ROWS - 6);
            } else {
              sx = 10 + Math.random() * 80;
              sy = 15 + Math.random() * 45;
            }
            sAttempts++;
          } while (sAttempts < 30 && (
            newObstacles.some(o => { const dx = sx - o.x, dy = sy - o.y; return dx*dx+dy*dy < sMinDist*sMinDist; }) ||
            newStructures.some(s => { const dx = sx - s.x, dy = sy - s.y; return dx*dx+dy*dy < (sMinDist*2)*(sMinDist*2); })
          ));
          if (sAttempts < 30) {
            const inst = createStructureInstance(def, sx, sy, newRoom);
            inst._fogDiscovered = !isoModeRef.current; // fog: hidden until revealed
            newStructures.push(inst);
          }
        }
      }
      setStructures(newStructures);
    } catch (structErr) {
      console.error("[STRUCTURE ERROR]", structErr);
      setStructures([]);
    }

    } catch (obsError) {
      console.error("[OBSTACLE ERROR] Failed to generate obstacles:", obsError);
      // Fallback: generate minimal obstacles so game is playable
      const fallbackObs = [];
      for (let fb = 0; fb < 10; fb++) {
        fallbackObs.push({
          id: Date.now() + fb, type: "moss_boulder", x: 10 + fb * 8, y: 20 + Math.random() * 40,
          biomeId: bid, hp: 30, maxHp: 30, destructible: true, material: "stone",
          loot: { copper: 3 }, explosive: false, explosionDmg: 0, explosionRadius: 0,
          explosionElement: "fire", hitAnim: 0, destroying: false,
        });
      }
      setObstacles(fallbackObs);
      setStructures([]);
      console.log(`[OBSTACLE FALLBACK] Created ${fallbackObs.length} fallback obstacles`);
    }

    // ─── TRAPS ───
    // (enemy mines removed — explosive obstacles are part of biome obstacles now)
    setTraps([]);

    // ─── NEW: Crew passive — cook heals caravan each room ───
    const cookHeal = getCrewBonus("healPerRoom");
    if (cookHeal > 0) {
      setCaravanHp(prev => Math.min(CARAVAN_LEVELS[caravanLevelRef.current].hp, prev + cookHeal));
      showMessage(`Kucharz serwuje posiłek! +${Math.round(cookHeal)} HP`, "#40e060");
    }
    // barnacle_shield: +10 HP after each sea biome room
    const SEA_BIOME_IDS = ["island", "blue_lagoon", "sunset_beach"];
    if (hasRelic("barnacle_shield") && SEA_BIOME_IDS.includes(b.id)) {
      setCaravanHp(prev => Math.min(CARAVAN_LEVELS[caravanLevelRef.current].hp, prev + 10));
      showMessage("Pancerz z Małży: +10 HP!", "#40c0c0");
    }
    // Crew loyalty change per room (small random drift)
    updateCrewLoyalty(Math.random() < 0.7 ? 1 : -1);

    // ─── NEW: Story arc progression ───
    // Only one modal per room to prevent overlap
    let modalShown = false;
    if (!isDefenseRoom) {
      if (!activeStoryRef.current) {
        const newArc = rollNewStoryArc(completedStoriesRef.current);
        if (newArc) {
          setActiveStory(newArc);
          const arcDef = STORY_ARCS.find(a => a.id === newArc.id);
          if (arcDef) showMessage(`Nowa przygoda: ${arcDef.name}!`, arcDef.themeColor);
        }
      } else {
        const step = rollStoryStep(activeStoryRef.current, newRoom);
        if (step) { setStoryEvent(step); modalShown = true; }
      }
      // Moral dilemma (12% chance) — only if no other modal
      if (!modalShown) {
        const dilemma = rollMoralDilemma();
        if (dilemma && !storyEventRef.current) { setMoralDilemma(dilemma); modalShown = true; }
      }
    }

    // ─── NEW: Faction events ───
    if (!isDefenseRoom) {
      if (!modalShown) {
        const fEvt = rollFactionEvent();
        if (fEvt) { setFactionEvent(fEvt); modalShown = true; }
      }
      // Check faction quests
      for (const faction of FACTIONS) {
        const rep = factionRepRef.current[faction.id] || 0;
        if (!activeFactionQuestRef.current) {
          const quest = rollFactionQuest(faction.id, rep);
          if (quest) {
            setActiveFactionQuest({ ...quest, startRoom: newRoom, progress: 0 });
            showMessage(`Zlecenie: ${quest.name}!`, faction.color);
          }
        }
      }
    }

    // ─── NEW: Secret room (5-10% chance) ───
    if (!isDefenseRoom && !modalShown) {
      const sr = rollSecretRoom(newRoom);
      if (sr) {
        setSecretRoom(sr);
        addDiscovery("secrets", { id: sr.id, name: sr.name, room: newRoom });
        showMessage(`Odkryto ukryty pokój: ${sr.name}!`, sr.themeColor);
      } else {
        setSecretRoom(null);
      }
    }

    // ─── NEW: Journal — biome discovery ───
    addDiscovery("biomes", { id: b.id, name: b.name });

    // Walking NPCs – always spawn 3-5 NPCs in non-defense rooms
    const newWalkers = [];
    const newWalkData = {};
    if (!isDefenseRoom) {
      // Spawn NPCs across the map
      const count = 8 + Math.floor(Math.random() * 5);
      const useIso = isoModeRef.current;
      for (let i = 0; i < count; i++) {
        let npcData = pickNpc(b.id);
        if (!npcData) continue;
        const roomScale = 1 + Math.min(newRoom / 25, 1.5);
        const explDiffMult = 1 + ((b.difficulty || 1) - 1) * 0.15;
        npcData = { ...npcData, hp: Math.round(npcData.hp * roomScale * explDiffMult) };
        const wid = ++walkerIdCounter;
        // Spawn position depends on view mode
        const spawnX = useIso
          ? 3 + Math.random() * (ISO_CONFIG.MAP_COLS - 6)  // iso world tile coords
          : 5 + Math.random() * 290;                        // panoramic percentage
        const spawnY = useIso
          ? 3 + Math.random() * (ISO_CONFIG.MAP_ROWS - 6)
          : 25 + Math.random() * 65;
        const walkRange = useIso ? 3 + Math.random() * 5 : 12 + Math.random() * 10;
        const speed = useIso ? 0.01 + Math.random() * 0.02 : 0.02 + Math.random() * 0.03;
        newWalkers.push({
          id: wid,
          npcData,
          alive: true,
          dying: false,
          hp: npcData.hp,
          maxHp: npcData.hp,
        });
        const dmgScale = 1 + Math.min(newRoom / 20, 2.0);
        newWalkData[wid] = {
          x: spawnX,
          y: spawnY,
          // Iso world coords stored separately for renderer
          wx: useIso ? spawnX : undefined,
          wy: useIso ? spawnY : undefined,
          dir: Math.random() < 0.5 ? 1 : -1,
          yDir: Math.random() < 0.5 ? 1 : -1,
          speed,
          ySpeed: useIso ? 0.005 + Math.random() * 0.01 : 0.005 + Math.random() * 0.015,
          minX: useIso ? Math.max(1, spawnX - walkRange) : Math.max(0, spawnX - walkRange),
          maxX: useIso ? Math.min(ISO_CONFIG.MAP_COLS - 1, spawnX + walkRange) : Math.min(300, spawnX + walkRange),
          minY: useIso ? Math.max(1, spawnY - walkRange) : 25,
          maxY: useIso ? Math.min(ISO_CONFIG.MAP_ROWS - 1, spawnY + walkRange) : 90,
          bouncePhase: Math.random() * Math.PI * 2,
          alive: true,
          friendly: false,
          damage: Math.ceil((npcData.hp / 8) * dmgScale),
          lungeFrames: 0,
          lungeOffset: 0,
          ability: npcData.ability || null,
          aggroState: "idle",
          windupTimer: 0,
        };
      }
    }
    // Preserve alive friendly mercenaries across rooms (skip barricade – defense only)
    const preservedData = {};
    for (const [id, w] of Object.entries(walkDataRef.current)) {
      if (w && w.alive && w.friendly && !w.stationary) {
        if (isoModeRef.current) {
          // Position preserved mercenaries near caravan
          w.x = caravanPosRef.current.x + 1 + Math.random() * 3;
          w.wx = w.x;
          w.wy = caravanPosRef.current.y - 2 + Math.random() * 4;
          w.y = w.wy;
          w.minX = 1; w.maxX = ISO_CONFIG.MAP_COLS - 1;
          w.minY = 1; w.maxY = ISO_CONFIG.MAP_ROWS - 1;
        } else {
          // Position preserved mercenaries near caravan (x:50, y:92)
          w.x = 46 + Math.random() * 8;
          w.minX = 5; w.maxX = 90;
          w.y = 85 + Math.random() * 7;
          w.minY = 25; w.maxY = 92;
        }
        if (w.yDir == null) w.yDir = Math.random() < 0.5 ? 1 : -1;
        if (w.ySpeed == null) w.ySpeed = 0.005 + Math.random() * 0.015;
        preservedData[id] = w;
      }
    }
    // Collect preserved walker React state via ref (avoids stale closure + batching issues)
    const keptWalkerState = walkersRef.current.filter(pw => pw.alive && !pw.dying && pw.friendly && !pw.isBarricade && preservedData[pw.id]);
    setWalkers([...keptWalkerState, ...newWalkers]);
    walkDataRef.current = { ...preservedData, ...newWalkData };
    npcElsRef.current = {};
    obsElsRef.current = {};
    structElsRef.current = {};
    setSelectedSpell(null);
    setDragHighlight(null);
    setDmgPopups([]);
    setInspectedNpc(null);
    setSummonPicker(false);
    setSkillshotMode(false);
    setSkillshotSpell(null);

    // (barrels removed — explosive obstacles are now part of the biome obstacle system)

    // Spawn physics NPCs
    if (physicsRef.current) {
      physicsRef.current.clear();
      for (const w of newWalkers) {
        const wd = newWalkData[w.id];
        // Physics expects percentage (0-100), iso stores tile coords (0-MAP_COLS)
        const xPct = isoModeRef.current ? (wd.x / ISO_CONFIG.MAP_COLS) * 100 : wd.x;
        const yPct = isoModeRef.current ? (wd.y / ISO_CONFIG.MAP_ROWS) * 100 : wd.y;
        physicsRef.current.spawnNpc(w.id, xPct, w.npcData, false, yPct);
      }
      // Re-spawn preserved friendly mercenaries
      for (const w of keptWalkerState) {
        if (preservedData[w.id]) {
          const pd = preservedData[w.id];
          const xPct = isoModeRef.current ? (pd.x / ISO_CONFIG.MAP_COLS) * 100 : pd.x;
          const yPct = isoModeRef.current ? (pd.y / ISO_CONFIG.MAP_ROWS) * 100 : pd.y;
          physicsRef.current.spawnNpc(w.id, xPct, w.npcData, true, yPct);
        }
      }
    }

    // Defense room: DON'T auto-start — the defense POI triggers it
    // Just pre-compute boss data so it's ready when POI is clicked
    if (isDefenseRoom) {
      // Show hint that a defense POI awaits
      setTimeout(() => showMessage("Zbadaj okolicę... coś tu jest!", "#cc8040"), 1000);
    }
    setDefenseMode(null);

    // Meteorite event – 18% chance, delayed fall after 1s
    if (meteorTimerRef.current) { clearTimeout(meteorTimerRef.current); meteorTimerRef.current = null; }
    if (Math.random() < 0.18) {
      const mx = 15 + Math.random() * 65;
      const landY = 20 + Math.random() * 5; // land at ground level (~20-25%, NPC line is 25%)
      setMeteorite({ x: mx, y: landY, phase: "pending" });
      // Start falling 1 second after room transition ends
      meteorTimerRef.current = setTimeout(() => {
        setMeteorite(prev => prev ? { ...prev, phase: "falling" } : null);
        sfxMeteorFall();
        // Fire trail on canvas
        if (animatorRef.current) {
          const px = GAME_W * mx / 100;
          const startPy = -50;
          const endPy = GAME_H * landY / 100;
          animatorRef.current.playMeteorTrail(px, startPy, endPy, 60);
        }
        // After 1s fall, land with impact → spawn destructible meteor NPC
        setTimeout(() => {
          setMeteorite(prev => prev ? { ...prev, phase: "active" } : null);
          sfxMeteorImpact();
          setScreenShake(true);
          setTimeout(() => setScreenShake(false), 200);
          if (animatorRef.current) {
            const px = GAME_W * mx / 100;
            const py = GAME_H * landY / 100;
            animatorRef.current.playMeteorImpact(px, py);
          }
          // Spawn meteor boulder as destructible NPC
          const meteorHp = 300;
          const meteorNpc = {
            icon: "meteor", name: "Płonący Meteoryt", hp: meteorHp,
            resist: "fire", loot: { silver: 5, copper: 50 },
            bodyColor: "#5a3828", armorColor: "#3a1a2e", bodyType: "meteorBoulder",
            biomeId: "meteor",
          };
          const wid = ++walkerIdCounter;
          setWalkers(prev => [...prev, {
            id: wid, npcData: meteorNpc, alive: true, dying: false,
            hp: meteorHp, maxHp: meteorHp, isMeteorBoulder: true,
          }]);
          walkDataRef.current[wid] = {
            x: mx, y: landY + 5, dir: 1, yDir: 0,
            speed: 0, ySpeed: 0,
            minX: mx, maxX: mx, minY: landY + 5, maxY: landY + 5,
            bouncePhase: 0, alive: true, friendly: false,
            damage: 0, lungeFrames: 0, lungeOffset: 0,
            isStatic: true,
          };
          if (physicsRef.current) physicsRef.current.spawnNpc(wid, mx, meteorNpc, false);
          meteorWaveRef.current = { walkerId: wid, nextThreshold: meteorHp, waveCount: 0, x: mx, y: landY };
          showMessage("Meteoryt wylądował! Zniszcz go!", "#ff6020");
        }, 1000);
      }, 1000);
    } else {
      setMeteorite(null);
      setGroundLoot([]);
      meteorWaveRef.current = null;
    }
  }, []);

  // ─── DUNGEON SYSTEM FUNCTIONS ───

  // Enter a dungeon from the surface (called when player interacts with dungeon entrance POI)
  const enterDungeon = useCallback((dungeonType, difficulty) => {
    const currentRoom = roomRef.current;
    const dState = generateDungeon(dungeonType, currentRoom, difficulty || 1);
    if (!dState) return;

    // Save surface biome for return
    dState.surfaceBiome = biomeRef.current;

    // Generate first level terrain
    const dungeonBiome = createDungeonBiome(dungeonType, 0, dState);
    const terrainData = generateDungeonTerrain(dState, 0);
    dState.levels[0].terrainData = terrainData;

    // Set dungeon state
    setDungeonState(dState);
    dungeonStateRef.current = dState;

    // Update terrain and biome
    setBiome(dungeonBiome);
    terrainDataRef.current = terrainData;
    terrainDestructionRef.current.reset();
    walkGridRef.current = buildWalkGrid(terrainData);
    chokepointsRef.current = detectChokepoints(walkGridRef.current, ISO_CONFIG.MAP_COLS, ISO_CONFIG.MAP_ROWS);
    mapResourcesRef.current.reset();
    mapResourcesRef.current.generate(currentRoom * 1000, dungeonBiome.id, terrainData);

    // Position caravan at exit point
    const exitPos = dState.levels[0].exitPos || { col: dState.mapSize / 2, row: dState.mapSize - 4 };
    caravanPosRef.current = { x: exitPos.col + 0.5, y: exitPos.row + 0.5 };
    caravanMoveRef.current = { active: false, targetX: 0, targetY: 0, speed: 2.5 };

    // Camera
    const cam = isoCameraRef.current;
    cam.centerOnWorld(exitPos.col, exitPos.row);
    clearTileCache();

    // Spawn dungeon enemies
    spawnDungeonEnemies(dState, 0);

    // Reset combat state
    combatEngagedRef.current = false;
    setDefenseMode(null);
    setStairsPrompt(null);

    // Show dungeon cross section briefly
    setShowCrossSection(true);
    setTimeout(() => setShowCrossSection(false), 3000);

    showMessage(`Wchodzisz do: ${dState.dungeonName}!`, "#ffd080");
  }, []);

  // Change dungeon level (ascend/descend)
  const changeDungeonLevel = useCallback((targetLevel) => {
    const dState = dungeonStateRef.current;
    if (!dState || targetLevel < 0 || targetLevel >= dState.maxLevels) return;

    setDungeonTransitioning(true);
    setStairsPrompt(null);

    setTimeout(() => {
      const result = transitionDungeonLevel(dState, targetLevel, terrainDataRef, terrainDestructionRef);

      // Update state
      setDungeonState(result.dungeonState);
      dungeonStateRef.current = result.dungeonState;

      // Update biome visuals
      const dungeonBiome = createDungeonBiome(dState.dungeonType, targetLevel, result.dungeonState);
      setBiome(dungeonBiome);

      // Rebuild walk grid
      walkGridRef.current = buildWalkGrid(terrainDataRef.current);
      chokepointsRef.current = detectChokepoints(walkGridRef.current, ISO_CONFIG.MAP_COLS, ISO_CONFIG.MAP_ROWS);

      // Position caravan
      caravanPosRef.current = { x: result.spawnPos.x, y: result.spawnPos.y };
      caravanMoveRef.current = { active: false, targetX: 0, targetY: 0, speed: 2.5 };

      // Camera
      const cam = isoCameraRef.current;
      cam.centerOnWorld(result.spawnPos.x, result.spawnPos.y);
      clearTileCache();

      // Spawn enemies if first visit
      if (result.isFirstVisit) {
        spawnDungeonEnemies(result.dungeonState, targetLevel);
      } else {
        // Cleared floor — no enemies
        setWalkers(prev => prev.filter(w => w.friendly));
        const keptData = {};
        for (const [id, w] of Object.entries(walkDataRef.current)) {
          if (w.friendly) keptData[id] = w;
        }
        walkDataRef.current = keptData;
      }

      combatEngagedRef.current = false;
      setDefenseMode(null);

      const levelData = result.dungeonState.levels[targetLevel];
      if (levelData.bossLevel) {
        showMessage(`Arena Bossa — Poziom ${targetLevel + 1}!`, "#ff4444");
      } else {
        showMessage(`Poziom ${targetLevel + 1} z ${result.dungeonState.maxLevels}`, "#c0a060");
      }

      setDungeonTransitioning(false);
    }, 600);
  }, []);

  // Exit dungeon back to surface
  const exitDungeon = useCallback(() => {
    const dState = dungeonStateRef.current;
    if (!dState) return;

    // Calculate rewards
    const rewards = calculateDungeonRewards(dState);

    setDungeonTransitioning(true);
    setStairsPrompt(null);

    setTimeout(() => {
      // Restore surface biome
      const surfaceBiome = dState.surfaceBiome || BIOMES[0];
      setBiome(surfaceBiome);
      terrainDataRef.current = generateTerrainData(dState.surfaceRoom, surfaceBiome);
      terrainDestructionRef.current.reset();
      walkGridRef.current = buildWalkGrid(terrainDataRef.current);
      chokepointsRef.current = detectChokepoints(walkGridRef.current, ISO_CONFIG.MAP_COLS, ISO_CONFIG.MAP_ROWS);
      mapResourcesRef.current.reset();
      mapResourcesRef.current.generate(dState.surfaceRoom, surfaceBiome.id, terrainDataRef.current);

      // Position caravan
      caravanPosRef.current = { x: ISO_CONFIG.MAP_COLS / 2, y: ISO_CONFIG.MAP_ROWS / 2 };
      const cam = isoCameraRef.current;
      cam.centerOnWorld(ISO_CONFIG.MAP_COLS / 2, ISO_CONFIG.MAP_ROWS / 2);
      clearTileCache();

      // Apply rewards
      if (rewards) {
        const copperReward = rewards.copper || 0;
        const silverReward = rewards.silver || 0;
        setMoney(prev => ({
          ...prev,
          copper: (prev.copper || 0) + copperReward,
          silver: (prev.silver || 0) + silverReward,
        }));
        const msgs = [];
        if (copperReward > 0) msgs.push(`+${copperReward} miedzi`);
        if (silverReward > 0) msgs.push(`+${silverReward} srebra`);
        if (rewards.relic) msgs.push("Znaleziono relikt!");
        showMessage(`Dungeon ukończony! ${msgs.length > 0 ? msgs.join(", ") : ""}`, "#ffd700");
      }

      // Clear dungeon state + boss
      setActiveBoss(null);
      setDungeonState(null);
      dungeonStateRef.current = null;
      setDungeonTransitioning(false);
      setShowCrossSection(false);
    }, 600);
  }, []);

  // Spawn enemies for a dungeon level
  function spawnDungeonEnemies(dState, level) {
    const levelData = dState.levels[level];
    if (!levelData || levelData.cleared) return;

    const newWalkers = [];
    const newWalkData = {};
    const mapSize = dState.mapSize;
    const dungeonBiomeId = `dungeon_${dState.dungeonType}`;

    if (levelData.bossLevel) {
      // Spawn boss
      const boss = getDungeonBoss(dState.dungeonType, level, levelData.difficulty);
      if (boss) {
        const wid = ++walkerIdCounter;
        const center = Math.floor(mapSize / 2);
        newWalkers.push({
          id: wid, npcData: boss, alive: true, dying: false,
          hp: boss.hp, maxHp: boss.hp, isBoss: true,
        });
        newWalkData[wid] = {
          x: center, y: center - 4,
          wx: center, wy: center - 4,
          dir: 1, yDir: 1, speed: boss.speed || 0.03, ySpeed: 0.02,
          minX: 3, maxX: mapSize - 3, minY: 3, maxY: mapSize - 3,
          bouncePhase: 0, alive: true, friendly: false,
          damage: boss.damage, lungeFrames: 0, lungeOffset: 0,
          ability: { type: boss.ability, damage: boss.damage, cooldown: boss.abilityCd, element: null, range: 25 },
          aggroState: "idle", windupTimer: 0,
        };
        // Set activeBoss so BossHpBar renders
        const roomScale = 1 + Math.min((dState.surfaceRoom || 1) / 25, 1.5);
        setActiveBoss({
          ...boss,
          id: wid,
          currentHp: boss.hp,
          maxHp: boss.hp,
          phase: 1,
          manaShieldHp: 0,
          manaShieldMaxHp: 0,
          roomScale,
        });
      }
    } else {
      // Spawn regular enemies
      const count = levelData.enemyCount || 5;
      for (let i = 0; i < count; i++) {
        const npcData = pickNpc(dungeonBiomeId);
        if (!npcData) continue;
        const roomScale = 1 + levelData.difficulty * 0.3;
        const scaledNpc = { ...npcData, hp: Math.round(npcData.hp * roomScale) };
        const wid = ++walkerIdCounter;
        const spawnX = 4 + Math.random() * (mapSize - 8);
        const spawnY = 4 + Math.random() * (mapSize - 8);
        const walkRange = 3 + Math.random() * 4;
        newWalkers.push({
          id: wid, npcData: scaledNpc, alive: true, dying: false,
          hp: scaledNpc.hp, maxHp: scaledNpc.hp,
        });
        const dmgScale = 1 + levelData.difficulty * 0.2;
        newWalkData[wid] = {
          x: spawnX, y: spawnY,
          wx: spawnX, wy: spawnY,
          dir: Math.random() < 0.5 ? 1 : -1, yDir: Math.random() < 0.5 ? 1 : -1,
          speed: 0.01 + Math.random() * 0.02, ySpeed: 0.005 + Math.random() * 0.01,
          minX: Math.max(2, spawnX - walkRange), maxX: Math.min(mapSize - 2, spawnX + walkRange),
          minY: Math.max(2, spawnY - walkRange), maxY: Math.min(mapSize - 2, spawnY + walkRange),
          bouncePhase: Math.random() * Math.PI * 2, alive: true, friendly: false,
          damage: Math.ceil((scaledNpc.hp / 8) * dmgScale),
          lungeFrames: 0, lungeOffset: 0,
          ability: scaledNpc.ability || null,
          aggroState: "idle", windupTimer: 0,
        };
      }
    }

    // Keep friendly mercenaries
    const preservedWalkers = walkersRef.current.filter(w => w.alive && w.friendly);
    const preservedData = {};
    for (const [id, w] of Object.entries(walkDataRef.current)) {
      if (w && w.alive && w.friendly) preservedData[id] = w;
    }

    setWalkers([...preservedWalkers, ...newWalkers]);
    walkDataRef.current = { ...preservedData, ...newWalkData };

    // Physics
    if (physicsRef.current) {
      physicsRef.current.clear();
      for (const w of newWalkers) {
        const wd = newWalkData[w.id];
        const xPct = (wd.x / ISO_CONFIG.MAP_COLS) * 100;
        const yPct = (wd.y / ISO_CONFIG.MAP_ROWS) * 100;
        physicsRef.current.spawnNpc(w.id, xPct, w.npcData, false, yPct);
      }
      for (const w of preservedWalkers) {
        const pd = preservedData[w.id];
        if (pd) {
          const xPct = (pd.x / ISO_CONFIG.MAP_COLS) * 100;
          const yPct = (pd.y / ISO_CONFIG.MAP_ROWS) * 100;
          physicsRef.current.spawnNpc(w.id, xPct, w.npcData, true, yPct);
        }
      }
    }
  }

  // Check stairs proximity in game loop (called per frame when in dungeon)
  const stairsDismissedRef = useRef(false); // prevent re-show after cancel
  const checkDungeonStairs = useCallback(() => {
    const dState = dungeonStateRef.current;
    if (!dState || dungeonTransitioning) return;

    const interaction = checkStairsProximity(caravanPosRef.current, dState, 2.0);
    if (interaction && !stairsPrompt) {
      if (!stairsDismissedRef.current) {
        setStairsPrompt(interaction);
      }
    } else if (!interaction) {
      // Player moved away from stairs — reset dismiss flag
      stairsDismissedRef.current = false;
      if (stairsPrompt) setStairsPrompt(null);
    }
  }, [stairsPrompt, dungeonTransitioning]);

  // Mark current dungeon level as cleared when all enemies are dead
  const checkDungeonLevelCleared = useCallback(() => {
    const dState = dungeonStateRef.current;
    if (!dState) return;
    const currentLevelData = dState.levels[dState.currentLevel];
    if (currentLevelData.cleared) return;

    const aliveEnemies = walkersRef.current.filter(w => w.alive && !w.friendly && !w.dying);
    if (aliveEnemies.length === 0) {
      currentLevelData.cleared = true;
      setDungeonState({ ...dState });
      dungeonStateRef.current = { ...dState };

      if (currentLevelData.bossLevel) {
        showMessage("Boss pokonany! Dungeon ukończony!", "#ffd700");
        // Auto-offer exit after boss
        setTimeout(() => {
          setStairsPrompt({ type: "exit_dungeon", position: currentLevelData.exitPos || { col: dState.mapSize / 2, row: dState.mapSize / 2 } });
        }, 2000);
      } else {
        showMessage(`Piętro ${dState.currentLevel + 1} oczyszczone! Znajdź schody.`, "#44ff44");
        // Auto-show stairs prompt after short delay if stairs down exist
        if (currentLevelData.stairs.down) {
          setTimeout(() => {
            stairsDismissedRef.current = false;
            setStairsPrompt({
              type: "descend",
              targetLevel: dState.currentLevel + 1,
              position: currentLevelData.stairs.down,
            });
          }, 2000);
        }
      }
    }
  }, []);

  // Render biome background — on biome/room/night/panOffset change
  const prevBiomeIdRef = useRef(null);
  useEffect(() => {
    if (!biome || !canvasRef.current) return;
    // During active drag, handlePanMove renders the canvas directly — skip
    // the effect to avoid re-drawing with a stale panOffset state value.
    // BUT always render on biome/room change to prevent black screen after transitions.
    const biomeChanged = prevBiomeIdRef.current !== biome.id;
    if (biomeChanged) prevBiomeIdRef.current = biome.id;
    if (panRef.current.dragging && !biomeChanged) return;
    const c = canvasRef.current;
    // Only reset canvas size when dimensions actually change (avoids unnecessary clear)
    if (c.width !== GAME_W || c.height !== GAME_H) { c.width = GAME_W; c.height = GAME_H; }
    const ctx = c.getContext("2d");
    try {
      // Clear before draw (canvas isn't auto-cleared when dimensions unchanged)
      ctx.clearRect(0, 0, GAME_W, GAME_H);
      if (isoModeRef.current) {
        const cam = isoCameraRef.current;
        renderIsoBiome(ctx, biome, room, c.width, c.height, isNight, cam.x, cam.y, caravanPosRef.current, !!placingFortRef.current, terrainDataRef.current?.heightMap);
        // Render terrain overlays (roads, water, vegetation, fog of war)
        if (terrainDataRef.current) {
          renderTerrainOverlays(ctx, terrainDataRef.current, cam.x, cam.y, true, terrainDestructionRef.current, mapResourcesRef.current, chokepointsRef.current);
          // Render terrain particles
          if (terrainParticlesRef.current) {
            terrainParticlesRef.current.spawnAmbient(terrainDataRef.current, cam.x, cam.y);
            terrainParticlesRef.current.update(ctx, cam.x, cam.y);
          }
          // Dungeon lighting overlay (darkness + light sources)
          if (dungeonStateRef.current && terrainDataRef.current) {
            const dState = dungeonStateRef.current;
            const levelData = dState.levels[dState.currentLevel];
            renderDungeonLighting(ctx, c.width, c.height, {
              ambientLight: levelData?.config?.ambientLight ?? 0.5,
              lightSources: levelData?.lightSources || [],
              caravanPos: caravanPosRef.current,
              cameraX: cam.x,
              cameraY: cam.y,
              heightMap: terrainDataRef.current?.heightMap,
              time: Date.now(),
              zoom: cam.zoom || 1,
            });
            // Stairs markers
            if (terrainDataRef.current.dungeonFeatures) {
              renderStairsMarkers(ctx, terrainDataRef.current.dungeonFeatures, cam.x, cam.y, terrainDataRef.current?.heightMap, Date.now());
            }
          }
        }
      } else {
        renderBiome(ctx, biome, room, c.width, c.height, isNight, panOffset);
      }
    } catch (e) {
      console.error("renderBiome crashed:", e, { biomeId: biome?.id, room, panOffset });
      ctx.fillStyle = "#200000";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.fillStyle = "#ff4040";
      ctx.font = "14px monospace";
      ctx.fillText(`Biome render error: ${e.message}`, 20, 30);
    }
  }, [biome, room, isNight, GAME_W, GAME_H, panOffset]);

  // Animate biome overlay
  useEffect(() => {
    if (!biome || !animCanvasRef.current) return;
    const c = animCanvasRef.current;
    c.width = GAME_W; c.height = GAME_H;
    if (!animatorRef.current) animatorRef.current = new BiomeAnimator();
    animatorRef.current.start(c, biome, isNight, weather);
    return () => { if (animatorRef.current) animatorRef.current.stop(); };
  }, [biome, isNight, weather, GAME_W, GAME_H]);

  // Physics + PixiJS renderer — async init for Rapier WASM + PixiJS
  useEffect(() => {
    if (!biome || !gameContainerRef.current) return;
    let cancelled = false;

    const initAll = async () => {
      await initRapier();
      if (cancelled) return;

      // Initialize PixiJS renderer
      if (!pixiRef.current) {
        pixiRef.current = new PixiRenderer();
        await pixiRef.current.init(gameContainerRef.current, GAME_W, GAME_H);
      } else {
        pixiRef.current.resize(GAME_W, GAME_H);
        // Re-attach canvas if it was removed from DOM (e.g., after game over screen unmounted the game container)
        const canvas = pixiRef.current.getCanvas();
        if (canvas && gameContainerRef.current && !gameContainerRef.current.contains(canvas)) {
          gameContainerRef.current.appendChild(canvas);
        }
      }
      if (cancelled) return;

      // Initialize Rapier physics
      if (!physicsRef.current) {
        physicsRef.current = new PhysicsWorld();
        // Use a dummy canvas for init (physics still needs W/H/GY)
        const dummyCanvas = document.createElement("canvas");
        dummyCanvas.width = GAME_W;
        dummyCanvas.height = GAME_H;
        physicsRef.current.init(dummyCanvas);
        physicsRef.current.setPixiRenderer(pixiRef.current);
      } else {
        physicsRef.current.W = GAME_W;
        physicsRef.current.H = GAME_H;
        physicsRef.current.GY = GAME_H * 0.25;
        physicsRef.current.setPixiRenderer(pixiRef.current);
      }

      // Sync: create physics bodies for any walkers spawned before physics was ready
      const wd = walkDataRef.current;
      const ws = walkersRef.current;
      for (const w of ws) {
        if (!w.alive || w.dying) continue;
        if (!physicsRef.current.bodies[w.id]) {
          const walkData = wd[w.id];
          if (walkData) {
            const _isI = isoModeRef.current;
            physicsRef.current.spawnNpc(w.id, _toPhysPct(walkData.x, _isI, ISO_CONFIG.MAP_COLS), w.npcData, !!w.friendly, _toPhysPct(walkData.y || (_isI ? ISO_CONFIG.MAP_ROWS / 2 : 65), _isI, ISO_CONFIG.MAP_ROWS));
          }
        }
      }
    };
    initAll();

    return () => { cancelled = true; };
  }, [biome, GAME_W, GAME_H]);

  // Weather → physics
  useEffect(() => {
    if (physicsRef.current) physicsRef.current.setWeather(weather);
  }, [weather]);

  // Vault renderer
  useEffect(() => {
    if (panel !== "hideout" || !vaultRef.current) return;
    const c = vaultRef.current;
    const ctx = c.getContext("2d");
    renderVault(ctx, c.width, c.height, totalGoldEarned, money, hideoutLevel);
  }, [panel, totalGoldEarned, money, hideoutLevel]);

  // Biome-adaptive ambient soundscape (includes weather overlay)
  useEffect(() => {
    if (biome && !riverSegment && !worldMap && !riverMapOpen) changeBiomeMusic(biome.id, isNight, weather?.id);
  }, [biome, isNight, weather, riverSegment, worldMap]);

  // River segment ambient sounds (water, creaking ship, seagulls)
  useEffect(() => {
    if (riverSegment) {
      startRiverAmbience();
    } else {
      stopRiverAmbience();
    }
  }, [riverSegment]);

  // Initiative regen
  useEffect(() => {
    const iv = setInterval(() => {
      setInitiative(prev => Math.min(MAX_INITIATIVE, prev + INITIATIVE_REGEN));
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  // ─── WEATHER: Storm lightning strikes ───
  useEffect(() => {
    if (!weather || weather.skillshotEffect !== "lightning_strikes") return;
    if (!defenseMode || defenseMode.phase !== "wave_active") return;
    const interval = weather.lightningInterval || 6000;
    const iv = setInterval(() => {
      const enemies = walkersRef.current.filter(w => w.alive && !w.dying && !w.friendly);
      if (enemies.length === 0) return;
      const target = enemies[Math.floor(Math.random() * enemies.length)];
      const wd = walkDataRef.current[target.id];
      if (!wd) return;
      const dmg = weather.lightningDamage || 15;
      spawnDmgPopup(target.id, `⚡${dmg}`, "#60c0ff");
      setWalkers(prev => prev.map(w => {
        if (w.id !== target.id || !w.alive) return w;
        const newHp = Math.max(0, w.hp - dmg);
        if (newHp <= 0) {
          sfxNpcDeath();
          if (walkDataRef.current[w.id]) walkDataRef.current[w.id].alive = false;
          if (physicsRef.current) physicsRef.current.triggerRagdoll(w.id, "lightning", 0);
          addMoneyFn(w.npcData.loot || {});
          setKills(k => k + 1);
          grantXp(10 + roomRef.current * 2);
          setTimeout(() => setWalkers(pr => pr.map(ww => ww.id === w.id ? { ...ww, alive: false } : ww)), 2500);
          return { ...w, hp: 0, dying: true, dyingAt: Date.now() };
        }
        if (physicsRef.current) physicsRef.current.applyHit(target.id, "lightning", 0);
        return { ...w, hp: newHp };
      }));
      if (animatorRef.current) {
        const px = isoModeRef.current ? (wd.x / ISO_CONFIG.MAP_COLS) * GAME_W : (wd.x / 100) * GAME_W;
        const py = isoModeRef.current ? ((wd.y || ISO_CONFIG.MAP_ROWS / 2) / ISO_CONFIG.MAP_ROWS) * GAME_H : GAME_H * 0.25;
        animatorRef.current.playMeleeSparks?.(px, py);
      }
    }, interval);
    return () => clearInterval(iv);
  }, [weather?.id, defenseMode?.phase]);

  // ─── BIOME MODIFIER: Periodic effects (heal, damage zones, etc.) ───
  useEffect(() => {
    if (!biomeModifier) return;
    const eff = biomeModifier.effect;
    // Periodic heal (e.g. spring regeneration)
    if (eff.type === "periodic_heal" && eff.interval) {
      const iv = setInterval(() => {
        setCaravanHp(prev => Math.min(prev + eff.healAmount, CARAVAN_LEVELS[caravanLevelRef.current].hp));
        showMessage(`${biomeModifier.name}: +${eff.healAmount} HP`, "#80ff80");
      }, eff.interval);
      return () => clearInterval(iv);
    }
    // Periodic damage (volcano eruption, island tidal surge)
    if (eff.type === "periodic_damage" && eff.interval) {
      const iv = setInterval(() => {
        // Damage enemies in zone
        const enemies = walkersRef.current.filter(w => w.alive && !w.dying && !w.friendly);
        for (const e of enemies) {
          const wd = walkDataRef.current[e.id];
          if (!wd) continue;
          const inZone = eff.zone === "random" ? Math.random() < 0.3 : eff.zone === "bottom" ? wd.y > (100 - eff.zoneSize) : true;
          if (!inZone) continue;
          setWalkers(prev => prev.map(w => w.id !== e.id || !w.alive ? w : { ...w, hp: Math.max(0, w.hp - eff.damage) }));
          spawnDmgPopup(e.id, `${eff.damage}`, eff.element === "fire" ? "#ff6020" : "#4488ff");
        }
        // Damage player if specified
        if (eff.hitsPlayer && eff.playerDamage) {
          setCaravanHp(prev => Math.max(0, prev - eff.playerDamage));
          showMessage(`${biomeModifier.name}: -${eff.playerDamage} HP!`, "#ff4040");
        } else {
          showMessage(`${biomeModifier.name}!`, "#c080ff");
        }
        // Visual FX
        if (pixiRef.current && eff.element === "fire") {
          const fx = 200 + Math.random() * 880;
          pixiRef.current.spawnFire(fx, GAME_H * 0.3);
          pixiRef.current.screenShake(4);
        }
      }, eff.interval);
      return () => clearInterval(iv);
    }
    // Confusion (mushroom spores — enemies attack each other)
    if (eff.type === "confusion" && eff.interval) {
      const confDuration = eff.duration || 4000;
      const iv = setInterval(() => {
        confusionActiveRef.current = true;
        combatEngagedRef.current = true; // ensure enemies are active
        showMessage("Halucynogenne Spory — wrogowie się atakują!", "#c080ff");
        if (pixiRef.current) pixiRef.current.spawnPoisonCloud(GAME_W * 0.5, GAME_H * 0.4);
        setTimeout(() => { confusionActiveRef.current = false; }, confDuration);
      }, eff.interval);
      return () => { clearInterval(iv); confusionActiveRef.current = false; };
    }
  }, [biomeModifier?.id]);

  // Passive mana regen: mana_spring relic + knowledge upgrade
  useEffect(() => {
    const iv = setInterval(() => {
      const knowledgeManaRegen = (knowledgeUpgrades.manaRegen || 0) * 0.5;
      const springRegen = hasRelic("mana_spring") ? 1.5 : 0;
      const totalRegen = knowledgeManaRegen + springRegen;
      if (totalRegen > 0) {
        setMana(prev => Math.min(MAX_MANA, prev + totalRegen));
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [knowledgeUpgrades.manaRegen, MAX_MANA]);

  // ─── DEFENSE POI CLICK → OPEN FORTIFICATION MENU ───
  const handleDefensePoiClick = useCallback(() => {
    if (!defensePoi || defensePoi.activated) return;
    setDefensePoi(prev => prev ? { ...prev, activated: true } : null);
    setShowFortMenu(true);
    setFortPlacedCount(0);
    showMessage("Przygotuj fortyfikacje!", "#cc6020");
  }, [defensePoi]);

  // ─── FORTIFICATION: Auto-deploy random traps ───
  const handleAutoPlaceForts = useCallback(() => {
    const autoTraps = [];
    for (const trap of DEFENSE_TRAPS) {
      for (let i = 0; i < trap.maxCount; i++) {
        if (autoTraps.length >= MAX_PLAYER_TRAPS) break;
        autoTraps.push({
          id: Date.now() + Math.random() + i + autoTraps.length,
          trapType: trap.id,
          x: 15 + Math.random() * 70,
          y: 35 + Math.random() * 50,
          active: true,
          armed: true,
          config: trap,
          ...(trap.hp ? { currentHp: trap.hp } : {}),
        });
      }
      if (autoTraps.length >= MAX_PLAYER_TRAPS) break;
    }
    setPlayerTraps(autoTraps);
    setFortPlacedCount(autoTraps.length);
    showMessage("Pułapki rozstawione!", "#40c0a0");
  }, []);

  // ─── FORTIFICATION: Select fort for placement (click-on-map) ───
  const [placingFort, setPlacingFort] = useState(null); // fortification def being placed
  const placingFortRef = useRef(null);
  placingFortRef.current = placingFort;
  const handlePlaceFort = useCallback((fortId) => {
    const fortDef = FORTIFICATION_TREE.find(f => f.id === fortId);
    if (!fortDef) return;
    // Check placement limit
    const existing = playerTrapsRef.current.filter(t => t.trapType === fortId);
    if (existing.length >= fortDef.maxCount) {
      showMessage(`Max ${fortDef.maxCount} ${fortDef.name}!`, "#c08040");
      return;
    }
    if (playerTrapsRef.current.length >= MAX_PLAYER_TRAPS) {
      showMessage(`Max ${MAX_PLAYER_TRAPS} fortyfikacji!`, "#c08040");
      return;
    }
    setPlacingFort(fortDef);
    showMessage(`Kliknij na mapę blisko karawany aby postawić ${fortDef.name}`, "#c0a060");
  }, [showMessage]);

  // Handle click on map to place fortification
  const handleFortPlaceClick = useCallback((e) => {
    if (!placingFort || !gameContainerRef.current) return;
    const gr = gameContainerRef.current.getBoundingClientRect();
    const clickX = (e.clientX - gr.left) / gameScale;
    const clickY = (e.clientY - gr.top) / gameScale;
    let fx, fy;
    if (isoModeRef.current) {
      const cam = isoCameraRef.current;
      const iw = _isoScreenToWorld(clickX, clickY, cam.x, cam.y);
      fx = iw.x; fy = iw.y;
    } else {
      fx = (clickX / GAME_W) * 100; fy = (clickY / GAME_H) * 100;
    }
    // Validate: must be within ~6 tiles of caravan in iso, or within 25% in panoramic
    const cp = caravanPosRef.current;
    const maxDist = isoModeRef.current ? 6 : 25;
    const dx = fx - (isoModeRef.current ? cp.x : 50);
    const dy = fy - (isoModeRef.current ? cp.y : 92);
    if (Math.sqrt(dx * dx + dy * dy) > maxDist) {
      showMessage("Za daleko od karawany! Postaw bliżej.", "#c04040");
      return;
    }
    // Must be on valid map tile
    if (isoModeRef.current && (fx < 0 || fx >= ISO_CONFIG.MAP_COLS || fy < 0 || fy >= ISO_CONFIG.MAP_ROWS)) {
      showMessage("Nie można stawiać na wodzie!", "#4080cc");
      return;
    }
    const trap = {
      id: Date.now() + Math.random(),
      trapType: placingFort.id,
      x: fx, y: fy,
      active: true, armed: true,
      config: placingFort,
      ...(placingFort.stats?.hp ? { currentHp: placingFort.stats.hp } : {}),
    };
    setPlayerTraps(prev => [...prev, trap]);
    setFortPlacedCount(prev => prev + 1);
    showMessage(`${placingFort.name} postawiona!`, "#c08040");
    setPlacingFort(null);
  }, [placingFort, gameScale, showMessage]);

  // ─── START DEFENSE FROM FORTIFICATION MENU ───
  const startDefenseFromMenu = useCallback(() => {
    setShowFortMenu(false);
    const poi = defensePoi;
    if (!poi) return;
    const newRoom = poi.roomNumber;
    const bossData = getBossForRoom(newRoom);
    const totalWaves = bossData ? 1 : (newRoom <= 15 ? 3 : newRoom <= 30 ? 4 : 5);

    // Reset caravan HP
    setCaravanHp(CARAVAN_LEVELS[caravanLevelRef.current].hp);

    setDefenseMode({
      phase: "setup", currentWave: 1, totalWaves,
      enemiesRemaining: 0, enemiesSpawned: 0, timer: 5,
      roomNumber: newRoom, isBossRoom: !!bossData,
    });
    setMeteorite(null);
    setGroundLoot([]);
    meteorWaveRef.current = null;
    sfxWaveHorn();
    sfxWaveIncoming(1);
    setMusicCombatIntensity(0.7);
    startCombatDrums(dm?.totalWaves > 3 ? 6 : 4);

    // Kill all existing non-friendly walkers (clear the room for defense)
    setWalkers(prev => prev.filter(w => w.friendly));
    const wdKeys = Object.keys(walkDataRef.current);
    for (const k of wdKeys) {
      if (walkDataRef.current[k] && !walkDataRef.current[k].friendly) {
        if (physicsRef.current) physicsRef.current.removeNpc(parseInt(k));
        delete walkDataRef.current[k];
      }
    }

    if (bossData) {
      const roomScale = 1 + Math.min(newRoom / 25, 1.5);
      const scaledBoss = {
        ...bossData,
        hp: Math.round(bossData.hp * roomScale),
        damage: Math.round(bossData.damage * roomScale),
        currentHp: Math.round(bossData.hp * roomScale),
        maxHp: Math.round(bossData.hp * roomScale),
        phase: 1,
        manaShieldHp: 0,
        manaShieldMaxHp: 0,
        roomScale,
      };
      setActiveBoss(scaledBoss);
      showMessage(`${bossData.name} nadchodzi!`, "#ff2020");
    } else {
      setActiveBoss(null);
      showMessage("Obrona rozpoczęta!", "#ff6020");
    }

    // Spawn caravan defenses: barricade, dog
    const cl = CARAVAN_LEVELS[caravanLevelRef.current];
    if (cl.barricade) {
      const bId = ++walkerIdCounter;
      const bHp = cl.barricade.hp;
      const bNpc = { icon: "wood", name: "Barykada", hp: bHp, resist: null, loot: {}, bodyColor: "#6a4a20", armorColor: "#4a3010", bodyType: "barricade" };
      setWalkers(prev => [...prev, { id: bId, npcData: bNpc, alive: true, dying: false, hp: bHp, maxHp: bHp, friendly: true, isBarricade: true }]);
      {
        const _isI = isoModeRef.current;
        const _bx = _isI ? caravanPosRef.current.x + 2 : 50;
        const _by = _isI ? caravanPosRef.current.y : 75;
        walkDataRef.current[bId] = {
          x: _bx, y: _by, dir: 1, yDir: 0, speed: 0, ySpeed: 0,
          minX: _bx, maxX: _bx, minY: _isI ? 1 : 25, maxY: _isI ? ISO_CONFIG.MAP_ROWS - 1 : 90,
          bouncePhase: 0, alive: true, friendly: true,
          damage: 0, lungeFrames: 0, lungeOffset: 0,
          stationary: true, combatStyle: "none", attackCd: 99999,
          wx: _isI ? _bx : undefined, wy: _isI ? _by : undefined,
        };
        if (physicsRef.current) physicsRef.current.spawnNpc(bId, _toPhysPct(_bx, _isI, ISO_CONFIG.MAP_COLS), bNpc, true, _toPhysPct(_by, _isI, ISO_CONFIG.MAP_ROWS));
      }
    }
    if (cl.dog) {
      const existingDog = walkersRef.current.find(w => w.isDog && w.alive);
      if (!existingDog) {
        const dId = ++walkerIdCounter;
        const dNpc = { icon: "dog", name: "Ogar bojowy", hp: 80, resist: null, loot: {}, bodyColor: "#8a6030", armorColor: "#5a4020", bodyType: "quadruped" };
        setWalkers(prev => [...prev, { id: dId, npcData: dNpc, alive: true, dying: false, hp: 80, maxHp: 80, friendly: true, isDog: true }]);
        {
          const _isI = isoModeRef.current;
          const _dx = _isI ? caravanPosRef.current.x + 1 : 45;
          const _dy = _isI ? caravanPosRef.current.y + 1 : 85;
          walkDataRef.current[dId] = {
            x: _dx, y: _dy, dir: 1, yDir: Math.random() < 0.5 ? 1 : -1,
            speed: _isI ? 0.03 : 0.06, ySpeed: 0.01,
            minX: _isI ? 1 : 30, maxX: _isI ? ISO_CONFIG.MAP_COLS - 1 : 70, minY: _isI ? 1 : 75, maxY: _isI ? ISO_CONFIG.MAP_ROWS - 1 : 92,
            bouncePhase: 0, alive: true, friendly: true,
            damage: 10, lungeFrames: 0, lungeOffset: 0,
            combatStyle: "melee", attackCd: 1800,
            wx: _isI ? _dx : undefined, wy: _isI ? _dy : undefined,
          };
          if (physicsRef.current) physicsRef.current.spawnNpc(dId, _toPhysPct(_dx, _isI, ISO_CONFIG.MAP_COLS), dNpc, true, _toPhysPct(_dy, _isI, ISO_CONFIG.MAP_ROWS));
        }
      }
    }
  }, [defensePoi]);

  // ─── DEFENSE WAVE SYSTEM ───
  // Phase timer: countdown during setup and inter_wave
  useEffect(() => {
    if (!defenseMode || (defenseMode.phase !== "setup" && defenseMode.phase !== "inter_wave")) return;
    const iv = setInterval(() => {
      setDefenseMode(prev => {
        if (!prev) return null;
        const t = prev.timer - 1;
        if (t <= 0) { console.log("[DEFENSE] Phase → wave_active"); combatEngagedRef.current = true; sfxWaveIncoming(prev.currentWave); return { ...prev, phase: "wave_active", timer: 0 }; }
        return { ...prev, timer: t };
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [defenseMode?.phase, defenseMode?.currentWave]);

  // Wave spawning: trigger when phase becomes "wave_active"
  useEffect(() => {
    const dm = defenseModeRef.current;
    if (!dm || dm.phase !== "wave_active" || dm.enemiesSpawned > 0) return;

    const boss = activeBossRef.current;

    // Boss room: spawn boss walker instead of regular enemies
    if (boss) {
      setDefenseMode(prev => prev ? { ...prev, enemiesRemaining: 1, enemiesSpawned: 1 } : null);
      const bossAbilityObj = boss.ability ? {
        type: boss.ability,
        damage: Math.round(boss.damage * 1.5),
        element: boss.ability === "fireBreath" ? "fire" : boss.ability === "iceShot" ? "ice"
          : boss.ability === "poisonSpit" ? "poison" : boss.ability === "shadowBolt" ? "shadow"
          : boss.ability === "drain" ? "shadow" : "melee",
        range: boss.combatStyle === "ranged" ? 50 : 30,
        cooldown: boss.abilityCd,
      } : null;
      const bossNpc = {
        icon: boss.icon, name: boss.name, hp: boss.maxHp,
        resist: null, loot: {}, bodyColor: "#8a2020", armorColor: "#4a1010",
        bodyType: boss.bodyType, ability: bossAbilityObj,
      };
      const wid = ++walkerIdCounter;
      const _isI = isoModeRef.current;
      const spawnX = _isI ? ISO_CONFIG.MAP_COLS - 5 : 50; // boss spawns far side in iso
      const spawnY = _isI ? ISO_CONFIG.MAP_ROWS / 2 : 5;
      setWalkers(prev => [...prev, {
        id: wid, npcData: bossNpc, alive: true, dying: false,
        hp: boss.maxHp, maxHp: boss.maxHp, isBoss: true, friendly: false,
      }]);
      walkDataRef.current[wid] = {
        x: spawnX, y: spawnY, dir: Math.random() < 0.5 ? -1 : 1,
        yDir: 1,
        speed: _isI ? boss.speed * 0.5 : boss.speed, ySpeed: _isI ? 0.005 : 0.008,
        minX: _isI ? 2 : 5, maxX: _isI ? ISO_CONFIG.MAP_COLS - 2 : 98,
        minY: _isI ? 2 : 25, maxY: _isI ? ISO_CONFIG.MAP_ROWS - 2 : 92,
        bouncePhase: 0, alive: true, friendly: false,
        damage: boss.damage,
        lungeFrames: 0, lungeOffset: 0,
        ability: bossAbilityObj,
        attackCd: boss.attackCd,
        combatStyle: boss.combatStyle,
        isBoss: true,
        range: boss.combatStyle === "ranged" ? (_isI ? 20 : 50) : (_isI ? 12 : 35),
        wx: _isI ? spawnX : undefined, wy: _isI ? spawnY : undefined,
      };
      if (physicsRef.current) physicsRef.current.spawnNpc(wid, _toPhysPct(spawnX, _isI, ISO_CONFIG.MAP_COLS), bossNpc, false, _toPhysPct(spawnY, _isI, ISO_CONFIG.MAP_ROWS));
      // Boss camera: center camera between caravan and boss in iso mode
      if (_isI) {
        const cam = isoCameraRef.current;
        cam.centerOnWorld(ISO_CONFIG.MAP_COLS / 2, ISO_CONFIG.MAP_ROWS / 2);
        if (pixiRef.current) pixiRef.current.setIsoCamera(cam.x, cam.y);
      }
      return;
    }

    // Regular defense wave
    const roomNum = dm.roomNumber;
    const roomDiff = Math.min(roomNum / 10, 1);
    const waveDiff = dm.currentWave / dm.totalWaves;
    const baseCount = 2 + Math.floor(roomDiff * 3);
    const waveBonus = Math.floor(waveDiff * 3);
    const enemyCount = baseCount + waveBonus;
    let hpMult = 1 + roomDiff * 1.2 + waveDiff * 0.8;
    // Biome difficulty scaling (difficulty 1=base, 2=+15%, 3=+30% HP/DMG)
    const biomeDiff = biome?.difficulty || 1;
    hpMult *= 1 + (biomeDiff - 1) * 0.15;
    // greedy_merchant: enemies +30% HP (nerfed from +20%)
    if (hasRelic("greedy_merchant")) hpMult *= 1.30;
    // Risk event: enemy buff rooms
    if (enemyBuffRoomsRef.current > 0) hpMult *= 1.50;
    const dmgMult = (1 + roomDiff * 0.7 + waveDiff * 0.5) * (1 + (biomeDiff - 1) * 0.10);
    const biomeId = biome?.id || "summer";
    // Biome modifier: enemy speed multiplier (jungle slow_and_drag, winter slow_all)
    const modEff = biomeModifierRef.current?.effect;
    const enemySpdMult = modEff?.enemySpeedMult || 1;
    // Biome modifier: enemy targeting slow (bamboo_falls mist_veil)
    const atkCdMult = modEff?.type === "enemy_targeting_slow" ? (1 / (modEff.targetingMult || 1)) : 1;

    // Elite room check
    const isElite = isEliteRoom(roomNum);
    const eliteMod = isElite ? rollEliteModifier() : null;

    // Track planned vs actually spawned enemies separately to prevent premature wave completion
    const totalPlanned = enemyCount + (isElite ? 1 : 0);
    setDefenseMode(prev => prev ? { ...prev, enemiesRemaining: totalPlanned, enemiesPlanned: totalPlanned, enemiesSpawned: 0 } : null);

    const timers = [];
    // Spawn elite enemy first on elite rooms
    if (isElite && eliteMod) {
      const tid = setTimeout(() => {
        const npcData = pickNpc(biomeId);
        if (!npcData) return;
        npcData.hp = Math.round(npcData.hp * hpMult * eliteMod.hpMult);
        npcData.name = `${eliteMod.name} ${npcData.name}`;
        if (eliteMod.resist) npcData.resist = eliteMod.resist;
        const wid = ++walkerIdCounter;
        const _isI = isoModeRef.current;
        const spawnX = _isI ? ISO_CONFIG.MAP_COLS / 2 : 50;
        const spawnY = _isI ? 8 : 28;
        setWalkers(prev => [...prev, {
          id: wid, npcData, alive: true, dying: false, hp: npcData.hp, maxHp: npcData.hp, isElite: true, eliteMod: eliteMod,
        }]);
        walkDataRef.current[wid] = {
          x: spawnX, y: spawnY, dir: Math.random() < 0.5 ? -1 : 1,
          yDir: 1, speed: (_isI ? 0.03 : 0.015) * enemySpdMult, ySpeed: (_isI ? 0.02 : 0.012) * enemySpdMult,
          minX: _isI ? 2 : 5, maxX: _isI ? ISO_CONFIG.MAP_COLS - 2 : 98,
          minY: _isI ? 5 : 25, maxY: _isI ? ISO_CONFIG.MAP_ROWS - 3 : 92,
          bouncePhase: 0, alive: true, friendly: false,
          damage: Math.ceil(npcData.hp / 6 * dmgMult * (eliteMod.damageMult || 1)),
          lungeFrames: 0, lungeOffset: 0,
          ability: npcData.ability || null,
          attackCd: Math.round(3000 * (eliteMod.attackSpeedMult || 1) * atkCdMult),
          isElite: true,
          eliteMod: eliteMod,
        };
        if (physicsRef.current) physicsRef.current.spawnNpc(wid, _toPhysPct(spawnX, _isI, ISO_CONFIG.MAP_COLS), npcData, false, _toPhysPct(spawnY, _isI, ISO_CONFIG.MAP_ROWS));
        setDefenseMode(prev => prev ? { ...prev, enemiesSpawned: prev.enemiesSpawned + 1 } : null);
        showMessage(`Elite: ${eliteMod.name}! ${eliteMod.desc}`, eliteMod.color);
      }, 500);
      timers.push(tid);
    }

    for (let i = 0; i < enemyCount; i++) {
      const delay = (isElite ? 1500 : 0) + i * (800 + Math.random() * 400);
      const tid = setTimeout(() => {
        const npcData = ghostShipActiveRef.current
          ? { ...GHOST_SHIP_CONFIG.enemies[Math.floor(Math.random() * GHOST_SHIP_CONFIG.enemies.length)] }
          : pickNpc(biomeId);
        if (!npcData) return;
        npcData.hp = Math.round(npcData.hp * hpMult);
        // Biome modifier: illusion_enemies (desert "Fatamorgana" — 20% are illusions)
        const isIllusion = modEff?.type === "illusion_enemies" && Math.random() < (modEff.illusionChance || 0);
        if (isIllusion) { npcData.hp = 1; npcData.loot = {}; npcData.isIllusion = true; }
        // Apply active mutations if this enemy type matches
        const mut = activeMutationsRef.current.find(m => m.npcName === npcData.name);
        if (mut && mut.mutation) mut.mutation.apply(npcData);
        const wid = ++walkerIdCounter;
        const _isI2 = isoModeRef.current;
        // Find spawn position avoiding obstacles and other NPCs
        let spawnX, spawnY, spAttempts = 0;
        const NPC_MIN_DIST = _isI2 ? 4 : 10;
        do {
          spawnX = _isI2 ? 4 + Math.random() * (ISO_CONFIG.MAP_COLS - 8) : 10 + Math.random() * 80;
          spawnY = _isI2 ? 5 + Math.random() * 8 : 25 + Math.random() * 15;
          spAttempts++;
        } while (spAttempts < 15 && (
          // Check obstacles
          obstaclesRef.current.some(o => { const dx = spawnX - o.x, dy = spawnY - o.y; return dx*dx+dy*dy < NPC_MIN_DIST*NPC_MIN_DIST; }) ||
          // Check other alive NPCs
          Object.values(walkDataRef.current).some(w => w.alive && !w.friendly && (() => { const dx = spawnX - w.x, dy = spawnY - (w.y||(_isI2 ? ISO_CONFIG.MAP_ROWS/2 : 50)); return dx*dx+dy*dy < NPC_MIN_DIST*NPC_MIN_DIST; })())
        ));
        setWalkers(prev => [...prev, {
          id: wid, npcData, alive: true, dying: false, hp: npcData.hp, maxHp: npcData.hp,
        }]);
        walkDataRef.current[wid] = {
          x: spawnX, y: spawnY, dir: Math.random() < 0.5 ? -1 : 1,
          yDir: 1, // always start moving downward
          speed: (_isI2 ? 0.02 + Math.random() * 0.04 : 0.01 + Math.random() * 0.02) * enemySpdMult,
          ySpeed: (_isI2 ? 0.03 + Math.random() * 0.03 : 0.015 + Math.random() * 0.015) * enemySpdMult,
          minX: _isI2 ? 2 : 5, maxX: _isI2 ? ISO_CONFIG.MAP_COLS - 2 : 98,
          minY: _isI2 ? 3 : 25, maxY: _isI2 ? ISO_CONFIG.MAP_ROWS - 3 : 92,
          bouncePhase: Math.random() * Math.PI * 2,
          alive: true, friendly: false,
          damage: Math.ceil(npcData.hp / 8 * dmgMult),
          lungeFrames: 0, lungeOffset: 0,
          ability: npcData.ability || null,
          attackCd: Math.round(3000 * atkCdMult),
        };
        if (physicsRef.current) physicsRef.current.spawnNpc(wid, _toPhysPct(spawnX, _isI2, ISO_CONFIG.MAP_COLS), npcData, false, _toPhysPct(spawnY, _isI2, ISO_CONFIG.MAP_ROWS));
        setDefenseMode(prev => prev ? { ...prev, enemiesSpawned: prev.enemiesSpawned + 1 } : null);
      }, delay);
      timers.push(tid);
    }

    // Last wave: spawn a mini-boss as the wave captain
    const isLastWave = dm.currentWave >= dm.totalWaves;
    if (isLastWave && !dm.isBossRoom) {
      const bossDelay = (isElite ? 1500 : 0) + enemyCount * 1000 + 500;
      const bossTid = setTimeout(() => {
        const bossNpc = pickNpc(biomeId);
        if (!bossNpc) return;
        // Mini-boss: 3x HP, named "Kapitan" (Captain), bigger bodyType
        bossNpc.hp = Math.round(bossNpc.hp * hpMult * 3);
        bossNpc.name = `Kapitan ${bossNpc.name}`;
        bossNpc.rarity = "rare";
        const wid = ++walkerIdCounter;
        const _isI3 = isoModeRef.current;
        const spawnX = _isI3 ? 16 + Math.random() * 8 : 40 + Math.random() * 20;
        const spawnY = _isI3 ? 4 : 10;
        setWalkers(prev => [...prev, {
          id: wid, npcData: bossNpc, alive: true, dying: false,
          hp: bossNpc.hp, maxHp: bossNpc.hp, isElite: true,
          eliteMod: { name: "Kapitan", color: "#cc4040", hpMult: 1, damageMult: 1.3, attackSpeedMult: 0.8 },
        }]);
        walkDataRef.current[wid] = {
          x: spawnX, y: spawnY, dir: Math.random() < 0.5 ? -1 : 1,
          yDir: 1, speed: (_isI3 ? 0.04 : 0.02) * enemySpdMult, ySpeed: (_isI3 ? 0.03 : 0.015) * enemySpdMult,
          minX: _isI3 ? 2 : 5, maxX: _isI3 ? ISO_CONFIG.MAP_COLS - 2 : 98,
          minY: _isI3 ? 3 : 25, maxY: _isI3 ? ISO_CONFIG.MAP_ROWS - 3 : 92,
          bouncePhase: 0, alive: true, friendly: false,
          damage: Math.ceil(bossNpc.hp / 5 * dmgMult),
          lungeFrames: 0, lungeOffset: 0,
          ability: bossNpc.ability || null,
          attackCd: Math.round(2500 * atkCdMult),
          isElite: true,
        };
        if (physicsRef.current) physicsRef.current.spawnNpc(wid, _toPhysPct(spawnX, _isI3, ISO_CONFIG.MAP_COLS), bossNpc, false, _toPhysPct(spawnY, _isI3, ISO_CONFIG.MAP_ROWS));
        setDefenseMode(prev => prev ? { ...prev, enemiesRemaining: prev.enemiesRemaining + 1, enemiesSpawned: prev.enemiesSpawned + 1 } : null);
        showMessage("Kapitan wrogów nadchodzi!", "#cc4040");
      }, bossDelay);
      timers.push(bossTid);
    }

    return () => timers.forEach(clearTimeout);
  }, [defenseMode?.phase, defenseMode?.currentWave, biome]);

  // Boss minion spawning
  useEffect(() => {
    const boss = activeBossRef.current;
    if (!boss || !defenseMode || defenseMode.phase !== "wave_active") return;
    if (!boss.minions) return;

    const m = boss.minions;
    const roomScale = boss.roomScale || 1;
    const iv = setInterval(() => {
      // Only spawn if boss is still alive
      const bossAlive = walkersRef.current.some(w => w.isBoss && w.alive && !w.dying);
      if (!bossAlive) return;

      for (let i = 0; i < m.count; i++) {
        const minionHp = Math.round(m.hp * roomScale);
        const minionDmg = Math.round(m.damage * roomScale);
        const minionNpc = {
          icon: m.icon || "skull", name: m.type, hp: minionHp,
          resist: null, loot: { copper: 2 },
          bodyColor: "#6a3030", armorColor: "#3a1818", bodyType: m.bodyType || "humanoid",
        };
        const wid = ++walkerIdCounter;
        const spawnX = 15 + Math.random() * 70; // spread across width
        const spawnY = 8 + Math.random() * 10;   // behind horizon
        setWalkers(prev => [...prev, {
          id: wid, npcData: minionNpc, alive: true, dying: false,
          hp: minionHp, maxHp: minionHp, isMinion: true,
        }]);
        walkDataRef.current[wid] = {
          x: spawnX, y: spawnY, dir: Math.random() < 0.5 ? -1 : 1,
          yDir: 1, // start moving downward
          speed: m.speed || 0.04,
          ySpeed: 0.015 + Math.random() * 0.015,
          minX: 5, maxX: 98, minY: 25, maxY: 92,
          bouncePhase: Math.random() * Math.PI * 2,
          alive: true, friendly: false,
          damage: minionDmg,
          lungeFrames: 0, lungeOffset: 0,
          combatStyle: m.combatStyle || "melee",
          attackCd: 3000,
        };
        if (physicsRef.current) physicsRef.current.spawnNpc(wid, spawnX, minionNpc, false);
      }
    }, m.interval);

    return () => clearInterval(iv);
  }, [activeBoss?.id, defenseMode?.phase]);

  // Wave completion and failure detection
  useEffect(() => {
    if (!defenseMode || defenseMode.phase !== "wave_active") return;
    const iv = setInterval(() => {
      const dm = defenseModeRef.current;
      if (!dm || dm.phase !== "wave_active") return;
      const aliveEnemies = walkersRef.current.filter(w => w.alive && !w.dying && !w.friendly);

      // Update remaining count
      setDefenseMode(prev => prev ? { ...prev, enemiesRemaining: aliveEnemies.length } : null);
      updateCombatEnemyCount(aliveEnemies.length);

      // Boss room: wave completes when boss is dead (minions get cleaned up)
      if (dm.isBossRoom) {
        const bossAlive = walkersRef.current.some(w => w.isBoss && w.alive && !w.dying);
        if (!bossAlive && dm.enemiesSpawned > 0) {
          clearInterval(iv);
          setActiveBoss(null);
          setBossesDefeated(b => b + 1);
          sfxBossKillDrama();
          setTimeout(() => sfxVictoryFanfare(), 1500); // fanfare after dramatic silence
          changeMorale("boss_kill");
          stopCombatDrums();
          setMusicCombatIntensity(0); // calm down music after boss victory
          setDefenseMode(prev => prev ? { ...prev, phase: "complete" } : null);
          return;
        }
      } else {
        // All enemies dead (regular defense) — require all planned enemies to have actually spawned
        const allSpawned = dm.enemiesSpawned >= (dm.enemiesPlanned || dm.enemiesSpawned);
        if (aliveEnemies.length === 0 && dm.enemiesSpawned > 0 && allSpawned) {
          clearInterval(iv);
          // Challenge completion checks on wave clear
          const ch = roomChallengeRef.current;
          if (ch && !ch.completed && !ch.failed) {
            if (ch.id === "speed_kill" && Date.now() - ch.startTime <= ch.timer) {
              addMoneyFn(ch.reward);
              showMessage(`Wyzwanie ukończone: ${ch.name}! ${ch.rewardLabel}`, "#ffd700");
              setRoomChallenge(prev => prev ? { ...prev, completed: true } : prev);
            }
            if (ch.id === "no_mana") {
              const rewardAmmo = ch.reward;
              if (rewardAmmo) setAmmo(am => {
                const upd = { ...am };
                for (const [k, v] of Object.entries(rewardAmmo)) upd[k] = (upd[k] || 0) + v;
                return upd;
              });
              showMessage(`Wyzwanie ukończone: ${ch.name}! ${ch.rewardLabel}`, "#ffd700");
              setRoomChallenge(prev => prev ? { ...prev, completed: true } : prev);
            }
            if (ch.id === "no_caravan_dmg") {
              addMoneyFn(ch.reward);
              showMessage(`Wyzwanie ukończone: ${ch.name}! ${ch.rewardLabel}`, "#ffd700");
              setRoomChallenge(prev => prev ? { ...prev, completed: true } : prev);
            }
          }
          if (dm.currentWave >= dm.totalWaves) {
            sfxVictoryFanfare();
            changeMorale("fast_victory");
            stopCombatDrums();
            setMusicCombatIntensity(0); // calm down music after all waves cleared
            setDefenseMode(prev => prev ? { ...prev, phase: "complete" } : null);
            // Ghost ship completion reward
            if (ghostShipActiveRef.current) {
              addMoneyFn(GHOST_SHIP_CONFIG.completionReward);
              showMessage(GHOST_SHIP_CONFIG.completionMessage, "#d4a030");
              setGhostShipActive(false);
            }
            // Morale: desertion check on low morale
            const mt = getMoraleThreshold(moraleRef.current);
            if (mt.desertionChance > 0) {
              const friendlies = walkersRef.current.filter(w => w.alive && !w.dying && w.friendly);
              friendlies.forEach(w => {
                if (Math.random() < mt.desertionChance) {
                  showMessage(`${w.npcData.name} dezerteruje! Morala zbyt niska!`, "#cc4040");
                  if (walkDataRef.current[w.id]) walkDataRef.current[w.id].alive = false;
                  setWalkers(prev => prev.filter(ww => ww.id !== w.id));
                }
              });
            }
          } else {
            sfxWaveComplete();
            showMessage(`Fala ${dm.currentWave} pokonana!`, "#40e060");
            // Heal all surviving mercs
            setWalkers(prev => prev.map(w =>
              w.alive && !w.dying && w.friendly ? { ...w, hp: w.maxHp } : w
            ));
            setDefenseMode(prev => prev ? {
              ...prev, phase: "inter_wave", currentWave: prev.currentWave + 1,
              timer: 12, enemiesRemaining: 0, enemiesSpawned: 0,
            } : null);
          }
          return;
        }
      }

      // Caravan destroyed → Game Over
      if (caravanHpRef.current <= 0) {
        clearInterval(iv);
        sfxEventFail();
        stopCombatDrums(); stopCaravanAlarm();
        if (activeBossRef.current) setActiveBoss(null);
        setDefenseMode(null);
        // Collect stats and transition to game over screen
        setGameOverStats({
          room: roomRef.current,
          kills: killsRef.current,
          bossesDefeated: bossesDefeatedRef.current,
          money: moneyRef.current,
          totalGoldEarned: totalGoldEarnedRef.current,
          relics: activeRelicsRef.current.length,
          doors: doorsRef.current,
          caravanLevel: caravanLevelRef.current,
          bestiary: Object.keys(bestiaryRef.current).length,
        });
        setScreen("gameover");
      }
    }, 500);
    return () => clearInterval(iv);
  }, [defenseMode?.phase, defenseMode?.currentWave, showMessage]);

  // Global game over check: HP reaches 0 outside of defense mode too
  useEffect(() => {
    if (caravanHp <= 0 && screen !== "gameover" && screen !== "intro" && screen !== "hideout") {
      // Phoenix Elixir: one-time revive
      if (caravanReviveReadyRef.current) {
        setCaravanReviveReady(false);
        const maxHp = CARAVAN_LEVELS[caravanLevelRef.current].hp;
        setCaravanHp(Math.round(maxHp * 0.30));
        showMessage("⚗ Eliksir Feniksa! Karawana odrodziła się z 30% HP!", "#ff6020");
        return;
      }
      sfxEventFail();
      if (activeBossRef.current) setActiveBoss(null);
      setDefenseMode(null);
      setGameOverStats({
        room: roomRef.current,
        kills: killsRef.current,
        bossesDefeated: bossesDefeatedRef.current,
        money: moneyRef.current,
        totalGoldEarned: totalGoldEarnedRef.current,
        relics: activeRelicsRef.current.length,
        doors: doorsRef.current,
        caravanLevel: caravanLevelRef.current,
        bestiary: Object.keys(bestiaryRef.current).length,
      });
      setScreen("gameover");
    }
  }, [caravanHp, screen]);

  // Defense rewards
  useEffect(() => {
    if (!defenseMode) return;
    if (defenseMode.phase === "complete" && defenseMode.roomNumber > 0) {
      stopCaravanAlarm();
      const rn = defenseMode.roomNumber;
      const isBoss = defenseMode.isBossRoom;

      // Boss rooms: enhanced rewards (2x treasure + bonus gold)
      const reward = isBoss
        ? { copper: 50 + rn * 8, silver: Math.floor(rn / 8) + 2, gold: 1 + Math.floor(rn / 20) }
        : { copper: 30 + rn * 5, silver: Math.floor(rn / 10) + 1 };
      addMoneyFn(reward);
      setInitiative(MAX_INITIATIVE);

      const treasures = [];
      const tCount = isBoss ? 2 : 1;
      for (let i = 0; i < tCount; i++) {
        const t = pickTreasure(rn);
        t.biome = biome?.name || "Obrona"; t.room = rn;
        if (hasRelic("greedy_merchant")) {
          if (t.value) {
            t.value = { ...t.value };
            if (t.value.copper) t.value.copper = Math.round(t.value.copper * 1.5);
            if (t.value.silver) t.value.silver = Math.round(t.value.silver * 1.5);
            if (t.value.gold) t.value.gold = Math.round(t.value.gold * 1.5);
          }
        }
        treasures.push(t);
      }
      setInventory(prev => [...prev, ...treasures]);
      setLoot(treasures[0]);

      // Relic picker: offer 3 random relics (minus owned)
      const owned = activeRelicsRef.current.map(r => r.id);
      const pool = RELICS.filter(r => !owned.includes(r.id));
      if (pool.length >= 3) {
        const shuffled = pool.sort(() => Math.random() - 0.5);
        setRelicChoices(shuffled.slice(0, 3));
      }

      // Spell upgrade picker after boss fights
      if (isBoss) {
        const upgChoices = rollUpgradeChoices(learnedSpellsRef.current, SPELLS, spellUpgradesRef.current);
        if (upgChoices.length > 0) {
          setTimeout(() => setUpgradeChoices(upgChoices), 500);
        }
      }
    }
    // Note: "failed" defense no longer exists — caravan destruction triggers game over
  }, [defenseMode?.phase]);

  const dismissDefense = useCallback(() => {
    setRelicChoices(null);
    setUpgradeChoices(null);
    setActiveBoss(null);
    setPlayerTraps([]);
    setPlacingTrap(null);
    setDefensePoi(null);
    setShowFortMenu(false);
    setFortPlacedCount(0);
    // Clean up remaining enemies + barricade (not dog — dog persists)
    for (const [id, w] of Object.entries(walkDataRef.current)) {
      if (!w.friendly || w.stationary) {
        if (physicsRef.current) physicsRef.current.removeNpc(parseInt(id));
        delete walkDataRef.current[id];
      }
    }
    setWalkers(prev => prev.filter(w => w.friendly && !w.isBarricade));
    setDefenseMode(null);
  }, []);

  // ─── RETREAT FROM DEFENSE ───
  // Player can flee during wave_active or inter_wave, but takes penalties
  const retreatFromDefense = useCallback(() => {
    if (!defenseMode || defenseMode.phase === "complete" || defenseMode.phase === "setup") return;
    if (defenseMode.isBossRoom) return; // cannot flee from boss
    // Penalty: lose 20% of caravan max HP
    const maxHp = CARAVAN_LEVELS[caravanLevelRef.current].hp;
    const penalty = Math.round(maxHp * 0.20);
    setCaravanHp(prev => Math.max(1, prev - penalty));
    showMessage(`Odwrót! Statek traci ${penalty} HP!`, "#cc8040");
    sfxCaravanHit();
    // Partial reward: copper only, based on waves completed
    const wavesCleared = defenseMode.currentWave - 1;
    if (wavesCleared > 0) {
      const partialReward = { copper: Math.round((10 + defenseMode.roomNumber * 2) * wavesCleared) };
      addMoneyFn(partialReward);
      showMessage(`Częściowa nagroda: ${partialReward.copper} miedzi`, "#d4a030");
    }
    // Clean up defense
    setRelicChoices(null);
    setUpgradeChoices(null);
    setActiveBoss(null);
    setPlayerTraps([]);
    setPlacingTrap(null);
    for (const [id, w] of Object.entries(walkDataRef.current)) {
      if (!w.friendly || w.stationary) {
        if (physicsRef.current) physicsRef.current.removeNpc(parseInt(id));
        delete walkDataRef.current[id];
      }
    }
    setWalkers(prev => prev.filter(w => w.friendly && !w.isBarricade));
    setDefenseMode(null);
    setInitiative(prev => Math.max(0, prev - 1)); // lose 1 initiative as additional penalty
  }, [defenseMode, showMessage, addMoneyFn]);

  const selectRelic = useCallback((relic) => {
    setActiveRelics(prev => {
      const newRelics = [...prev, relic];
      // Check for new synergies
      const ownedIds = newRelics.map(r => r.id);
      for (const syn of RELIC_SYNERGIES) {
        if (syn.relics.every(rid => ownedIds.includes(rid)) && !activeSynergiesRef.current.some(s => s.id === syn.id)) {
          setActiveSynergies(ps => [...ps, syn]);
          setTimeout(() => showMessage(`SYNERGIA: ${syn.name}! ${syn.desc}`, syn.color), 800);
        }
      }
      return newRelics;
    });
    setRelicChoices(null);
    showMessage(`${relic.name} aktywowany!`, "#a050e0");
  }, [showMessage]);

  const handleToggleMusic = () => { setMusicOn(toggleMusic()); };
  const startGame = () => { setScreen("game"); enterRoom(1, []); startMusic(); };

  const restartGame = () => {
    // Stop audio layers
    stopCombatDrums(); stopCaravanAlarm(); updateComboLevel(0);
    // Reset all game state
    setRoom(0); setBiome(null); setDoors(0); setInitiative(MAX_INITIATIVE);
    setInventory([]); setHideoutItems([]); setMoney({ copper: 50, silver: 0, gold: 0 });
    setTotalGoldEarned(0); setBossesDefeated(0); setHideoutLevel(0); setHideoutUpgrades({});
    setKills(0); setPanel(null); setLoot(null);
    setOwnedTools([]); setCaravanLevel(0); setCaravanHp(CARAVAN_LEVELS[0].hp);
    setKnightLevel(0); setMana(50); setBestiary({}); setKnowledge(0);
    setLearnedSpells(SPELLS.filter(s => s.learned).map(s => s.id));
    setActiveRelics([]); setRelicChoices(null); setKnowledgeUpgrades({ manaPool: 0, spellPower: 0, manaRegen: 0 });
    setDefenseMode(null); setActiveBoss(null); setWalkers([]);
    // Reset new systems
    setActiveSynergies([]); setComboCounter(0); setActiveCombo(null);
    setPlayerXp(0); setPlayerLevel(1); setLevelPerks([]); setLevelUpChoices(null);
    setSpellUpgrades({}); setUpgradeChoices(null);
    setKillStreak(0); setPowerSpikeWarning(false);
    setEnemyBuffRooms(0); setPlayerDoubleDmgRooms(0); setEventMercDmgBuff(0); setEventMercHpBuff(0);
    setSecretPermDmgBuff(0); setSecretSpellBuffRooms(0); setSecretSpellBuffMult(0);
    setPlayerTraps([]); setPlacingTrap(null);
    setRoomChallenge(null);
    setCaravanShield({ active: false, cooldown: 0 });
    // Reset new gameplay systems
    setCrew([]); setCrewRecruitOffer(null);
    setActiveStory(null); setCompletedStories([]); setStoryEvent(null); setMoralDilemma(null);
    setShipUpgrades([]); setSeaEvent(null); setDiscoveredIslands([]); setRiverSegment(false);
    setUnlockedFortifications(["wooden_wall", "alarm_bell"]);
    setActiveFortifications([]); setFortificationPhase(false);
    setFactionRep({ merchants_guild: 0, treasure_hunters: 0, shadow_council: 0, royal_navy: 0 });
    setActiveFactionQuest(null); setFactionEvent(null);
    setJournal({ biomes: [], enemies: [], bosses: [], treasures: [], events: [], secrets: [], artifacts: [], factions: [] });
    setOwnedArtifacts([]); setTotalDiscoveries(0); setSecretRoom(null); setShowJournal(false);
    setOwnedSabers(["basic_saber"]); setEquippedSaber("basic_saber"); setMoonbladeBonus(null);
    setMorale(MORALE_CONFIG.initial); setActiveMutations([]); setKillsByType({}); setGhostShipActive(false);
    setHasWand(false); setWandActive(false); wandOrbsRef.current = { active: false, startTime: 0, cursorX: 50, cursorY: 50, hitCooldowns: {}, lastDrainTime: 0 };
    setSalvaActive(false); salvaRef.current = { active: false, cursorX: 50, cursorY: 50, lastShotTime: 0 };
    setBoughtSpecials([]); setShopStock(null); setShopDiscount(0); setBargainUsed(false); setActiveBuffs([]);
    walkDataRef.current = {};
    if (pixiRef.current) { pixiRef.current.clearNpcs(); pixiRef.current.clearDestruction(); }
    if (physicsRef.current) physicsRef.current.clear();
    setGameOverStats(null);
    // Reset dungeon state
    setDungeonState(null); dungeonStateRef.current = null;
    setStairsPrompt(null); stairsDismissedRef.current = false;
    setGroundLoot([]);
    setMapSecrets([]);
    localStorage.removeItem("wrota_save");
    setScreen("game"); enterRoom(1, []); startMusic();
  };

  const goToIntro = () => {
    setDefenseMode(null); setActiveBoss(null); setWalkers([]);
    walkDataRef.current = {};
    setGameOverStats(null);
    localStorage.removeItem("wrota_save");
    setScreen("intro");
  };

  // Save/Load system
  const saveGame = () => {
    const saveData = {
      room, money, mana, ammo, kills, doors, initiative, inventory, hideoutItems,
      ownedTools, hideoutLevel, hideoutUpgrades, knightLevel, caravanLevel, caravanHp,
      bestiary, knowledge, learnedSpells, activeRelics: activeRelics.map(r => r.id),
      knowledgeUpgrades, bossesDefeated,
      // New systems
      activeSynergies: activeSynergies.map(s => s.id),
      playerXp, playerLevel, levelPerks,
      spellUpgrades,
      killStreak,
      enemyBuffRooms, playerDoubleDmgRooms,
      secretPermDmgBuff, secretSpellBuffRooms, secretSpellBuffMult,
      // New gameplay systems
      crew, activeStory, completedStories,
      shipUpgrades, discoveredIslands, shipMapPos,
      unlockedFortifications,
      factionRep,
      journal, ownedArtifacts, totalDiscoveries,
      ownedSabers, equippedSaber, moonbladeBonus,
      morale, activeMutations, killsByType,
      hasWand,
      savedAt: Date.now(),
    };
    try {
      localStorage.setItem("wrota_save", JSON.stringify(saveData));
      showMessage("Gra zapisana!", "#40c040");
    } catch { /* save error */
      showMessage("Błąd zapisu!", "#e04040");
    }
  };

  const loadGame = () => {
    try {
      const raw = localStorage.getItem("wrota_save");
      if (!raw) { showMessage("Brak zapisu!", "#cc8040"); return false; }
      const s = JSON.parse(raw);
      setMoney(s.money || { copper: 0, silver: 0, gold: 0 });
      setKills(s.kills || 0);
      setDoors(s.doors || 0);
      setInitiative(s.initiative || 50);
      setInventory(s.inventory || []);
      setHideoutItems(s.hideoutItems || []);
      setOwnedTools(s.ownedTools || []);
      setHideoutLevel(s.hideoutLevel || 0);
      setHideoutUpgrades(s.hideoutUpgrades || {});
      setKnightLevel(s.knightLevel || 0);
      setCaravanLevel(s.caravanLevel || 0);
      setCaravanHp(s.caravanHp || 100);
      setBestiary(s.bestiary || {});
      setKnowledge(s.knowledge || 0);
      setLearnedSpells(s.learnedSpells || SPELLS.filter(sp => sp.learned).map(sp => sp.id));
      if (s.activeRelics) {
        const relicObjs = s.activeRelics.map(id => RELICS.find(r => r.id === id)).filter(Boolean);
        setActiveRelics(relicObjs);
      }
      setKnowledgeUpgrades(s.knowledgeUpgrades || { manaPool: 0, spellPower: 0, manaRegen: 0 });
      setBossesDefeated(s.bossesDefeated || 0);
      setAmmo(s.ammo || {});
      setMana(s.mana || 50);
      // New systems
      if (s.activeSynergies) {
        const synObjs = s.activeSynergies.map(id => RELIC_SYNERGIES.find(syn => syn.id === id)).filter(Boolean);
        setActiveSynergies(synObjs);
      }
      setPlayerXp(s.playerXp || 0);
      setPlayerLevel(s.playerLevel || 1);
      setLevelPerks(s.levelPerks || []);
      setSpellUpgrades(s.spellUpgrades || {});
      setKillStreak(s.killStreak || 0);
      setEnemyBuffRooms(s.enemyBuffRooms || 0);
      setPlayerDoubleDmgRooms(s.playerDoubleDmgRooms || 0);
      setSecretPermDmgBuff(s.secretPermDmgBuff || 0);
      setSecretSpellBuffRooms(s.secretSpellBuffRooms || 0);
      setSecretSpellBuffMult(s.secretSpellBuffMult || 0);
      // Load new gameplay systems
      setCrew(s.crew || []);
      setActiveStory(s.activeStory || null);
      setCompletedStories(s.completedStories || []);
      setShipUpgrades(s.shipUpgrades || []);
      setDiscoveredIslands(s.discoveredIslands || []);
      if (s.shipMapPos) setShipMapPos(s.shipMapPos);
      setUnlockedFortifications(s.unlockedFortifications || ["wooden_wall", "alarm_bell", "spike_pit"]);
      setFactionRep(s.factionRep || { merchants_guild: 0, treasure_hunters: 0, shadow_council: 0, royal_navy: 0 });
      setJournal(s.journal || { biomes: [], enemies: [], bosses: [], treasures: [], events: [], secrets: [], artifacts: [], factions: [] });
      setOwnedArtifacts(s.ownedArtifacts || []);
      setTotalDiscoveries(s.totalDiscoveries || 0);
      setOwnedSabers(s.ownedSabers || ["basic_saber"]);
      setEquippedSaber(s.equippedSaber || "basic_saber");
      setMoonbladeBonus(s.moonbladeBonus || null);
      setMorale(s.morale ?? MORALE_CONFIG.initial);
      setActiveMutations(s.activeMutations || []);
      setKillsByType(s.killsByType || {});
      setHasWand(s.hasWand || false);
      if (s.hasWand && !s.learnedSpells?.includes("wand")) {
        setLearnedSpells(prev => [...prev, "wand"]);
      }
      setScreen("game");
      enterRoom(s.room || 1, s.ownedTools || []);
      startMusic();
      showMessage("Gra wczytana!", "#40c040");
      return true;
    } catch { /* load error */
      showMessage("Błąd wczytywania!", "#e04040");
      return false;
    }
  };

  const hasSaveGame = () => {
    try { return !!localStorage.getItem("wrota_save"); } catch { return false; }
  };

  // Auto-save every 60 seconds during gameplay
  useEffect(() => {
    if (screen !== "game") return;
    const iv = setInterval(() => {
      const saveData = {
        room, money, mana, ammo, kills, doors, initiative, inventory, hideoutItems,
        ownedTools, hideoutLevel, knightLevel, caravanLevel, caravanHp,
        bestiary, knowledge, learnedSpells, activeRelics: activeRelics.map(r => r.id),
        knowledgeUpgrades, bossesDefeated,
        activeSynergies: activeSynergies.map(s => s.id),
        playerXp, playerLevel, levelPerks,
        spellUpgrades, killStreak,
        enemyBuffRooms, playerDoubleDmgRooms,
        secretPermDmgBuff, secretSpellBuffRooms, secretSpellBuffMult,
        crew, activeStory, completedStories,
        shipUpgrades, discoveredIslands,
        unlockedFortifications, factionRep,
        journal, ownedArtifacts, totalDiscoveries,
        ownedSabers, equippedSaber, moonbladeBonus,
        morale, activeMutations, killsByType,
        savedAt: Date.now(),
      };
      try { localStorage.setItem("wrota_save", JSON.stringify(saveData)); } catch { /* auto-save silently fails */ }
    }, 60000);
    return () => clearInterval(iv);
  }, [screen, room, money, mana, ammo, kills, doors, initiative, inventory, hideoutItems, ownedTools, hideoutLevel, knightLevel, caravanLevel, caravanHp, bestiary, knowledge, learnedSpells, activeRelics, knowledgeUpgrades, activeSynergies, playerXp, playerLevel, levelPerks, spellUpgrades, killStreak, enemyBuffRooms, playerDoubleDmgRooms, crew, activeStory, completedStories, shipUpgrades, discoveredIslands, unlockedFortifications, factionRep, journal, ownedArtifacts, totalDiscoveries, ownedSabers, equippedSaber]);

  const travelCaravan = () => {
    if (defenseMode && defenseMode.phase !== "complete") {
      showMessage("Nie możesz podróżować podczas obrony!", "#cc4040"); return;
    }
    if (activeBoss) {
      showMessage("Nie możesz podróżować podczas walki z bossem!", "#cc4040"); return;
    }
    if (walkers.some(w => !w.friendly && w.alive && !w.dying)) {
      showMessage("Nie możesz podróżować podczas walki!", "#cc4040"); return;
    }
    if (initiative < CARAVAN_COST) {
      showMessage("Za mało inicjatywy!", "#cc8040");
      return;
    }
    setInitiative(prev => prev - CARAVAN_COST);
    // Navigator crew bonus: initiative boost
    const navBonus = getCrewBonus("initiativeMult");
    if (navBonus > 0) setInitiative(prev => Math.min(MAX_INITIATIVE, prev + Math.round(navBonus * 5)));
    sfxDoor(); setDoors(d => d + 1);
    // Open world map for player to choose destination
    setTimeout(() => { setWorldMap(true); }, 300);
  };

  // World map dock handler — player chose a biome island, teleport directly
  const handleWorldMapDock = useCallback((chosenBiome, newShipPos) => {
    setWorldMap(false);
    setShipMapPos(newShipPos);
    setTransitioning(true);
    pendingDestBiomeRef.current = chosenBiome;
    // Skip sailing segment — teleport directly to chosen island
    const baseCopper = 10 + room * 2;
    addMoneyFn({ copper: baseCopper });
    showMessage(`Podróż na ${chosenBiome?.name || "wyspę"}! +${baseCopper} miedzi`, "#a09080");
    setCaravanHp(prev => Math.min(CARAVAN_LEVELS[caravanLevelRef.current].hp, prev + 5));
    const nextRoom = room + 1;
    setTimeout(() => {
      setTransitioning(false);
      enterRoom(nextRoom, ownedTools, pendingDestBiomeRef.current);
    }, 600);
  }, [room, ownedTools]);

  // River map confirm handler — player chose a path, start sailing
  const handleRiverMapConfirm = useCallback((pathData) => {
    setRiverMapOpen(false);
    setRiverPath(pathData);
    const destBiome = pendingDestBiomeRef.current;
    setTimeout(() => { setRiverSegment({ destBiome }); }, 300);
  }, []);

  // River map cancel — go back to world map
  const handleRiverMapCancel = useCallback(() => {
    setRiverMapOpen(false);
    setTimeout(() => { setWorldMap(true); }, 200);
  }, []);

  // Quick travel — skip sailing mini-game entirely with reduced rewards
  const handleRiverSkip = useCallback(() => {
    setRiverMapOpen(false);
    setTransitioning(true);
    const baseCopper = 10 + room * 2;
    addMoneyFn({ copper: baseCopper });
    showMessage(`Szybka podróż! +${baseCopper} miedzi`, "#a09080");
    setCaravanHp(prev => Math.min(CARAVAN_LEVELS[caravanLevelRef.current].hp, prev + 5));
    const nextRoom = room + 1;
    // Sea event chance (biome transition)
    if (nextRoom % 10 === 1 && nextRoom > 1) {
      const seaEvt = rollSeaEvent();
      if (seaEvt) {
        setTimeout(() => {
          setTransitioning(false); // clear overlay BEFORE showing modal
          setSeaEvent(seaEvt); sfxEventAppear();
        }, 300);
        const island = rollIslandDiscovery();
        if (island) {
          setDiscoveredIslands(prev => [...prev, island]);
          addDiscovery("secrets", { id: island.id, name: island.name });
        }
        return;
      }
    }
    let event = rollRandomEvent(nextRoom);
    // sea_compass: on sea biomes, force a random event if none rolled
    const _seaBiomeIds = ["island", "blue_lagoon", "sunset_beach"];
    if (!event && hasRelic("sea_compass") && _seaBiomeIds.includes(biome?.id)) {
      event = rollRandomEvent(nextRoom) || rollRandomEvent(nextRoom); // two extra rolls
      if (event) showMessage("Kompas Kapitana wskazuje drogę!", "#60c0ff");
    }
    if (event) {
      // ghost_lantern: boost event loot on sea biomes
      if (hasRelic("ghost_lantern") && _seaBiomeIds.includes(biome?.id) && event.loot) {
        event.loot = { copper: Math.round((event.loot.copper || 0) * 2), silver: Math.round((event.loot.silver || 0) * 2), gold: (event.loot.gold || 0) };
      }
      setTimeout(() => {
        setTransitioning(false); // clear overlay BEFORE showing modal
        const sfxMap = { merchant: sfxMerchant, altar: sfxAltar, wounded: sfxEventAppear };
        (sfxMap[event.id] || sfxEventAppear)();
        setRandomEvent(event);
      }, 450);
    } else {
      setTimeout(() => {
        try {
          enterRoom(room + 1, ownedTools, pendingDestBiomeRef.current);
          pendingDestBiomeRef.current = null;
        } catch (e) { console.error("enterRoom failed:", e); }
        setTimeout(() => setTransitioning(false), 150);
      }, 300);
    }
  }, [room, ownedTools, addMoneyFn, showMessage, biome]);

  // River ship segment completion handler
  const handleRiverComplete = useCallback((result) => {
    setRiverSegment(false);
    setRiverPath(null);
    if (result.rewards) {
      addMoneyFn(result.rewards);
      if (result.rewards.copper) showMessage(`+${result.rewards.copper} miedzi`, "#d4a030");
      if (result.rewards.silver) showMessage(`+${result.rewards.silver} srebra`, "#c0c0c0");
    }
    // Heal caravan slightly on success
    if (result.success) {
      setCaravanHp(prev => Math.min(CARAVAN_LEVELS[caravanLevelRef.current].hp, prev + 10));
    }
    const nextRoom = room + 1;
    // Sea event chance (biome transition)
    if (nextRoom % 10 === 1 && nextRoom > 1) {
      const seaEvt = rollSeaEvent();
      if (seaEvt) {
        setTimeout(() => { setSeaEvent(seaEvt); sfxEventAppear(); }, 300);
        const island = rollIslandDiscovery();
        if (island) {
          setDiscoveredIslands(prev => [...prev, island]);
          addDiscovery("secrets", { id: island.id, name: island.name });
        }
        return; // sea event pauses travel, resolved in sea event modal
      }
    }
    // Random event chance
    const event = rollRandomEvent(nextRoom);
    if (event) {
      setTimeout(() => {
        const sfxMap = { merchant: sfxMerchant, altar: sfxAltar, wounded: sfxEventAppear };
        (sfxMap[event.id] || sfxEventAppear)();
        setRandomEvent(event);
      }, 450);
    } else {
      // Continue to next room — use the destination biome from world map
      setTimeout(() => {
        try {
          enterRoom(room + 1, ownedTools, pendingDestBiomeRef.current);
          pendingDestBiomeRef.current = null;
        } catch (e) { console.error("enterRoom failed:", e); }
        setTimeout(() => setTransitioning(false), 150);
      }, 300);
    }
  }, [room, ownedTools, addMoneyFn, showMessage, riverSegment]);

  const spawnFreeMerc = useCallback((mercType, hpFraction = 1) => {
    const wid = ++walkerIdCounter;
    const inDefense = !!defenseModeRef.current;
    const _isIso = isoModeRef.current;
    // Spawn mercenaries next to the caravan
    const spawnX = _isIso
      ? (caravanPosRef.current.x + 1 + Math.random() * 3)
      : (inDefense ? 45 + Math.random() * 10 : 46 + Math.random() * 8);
    const lvl = KNIGHT_LEVELS[knightLevel];
    const mult = lvl.mult || 1;
    const stoneBonus = (hasRelic("stone_skin") ? 30 : 0) + (hasSynergy("twierdza") ? 30 : 0) + perkMercHpBonus;
    const hpBuff = eventMercHpBuffRef.current || 0;
    const dmgBuff = eventMercDmgBuffRef.current || 0;
    const finalHp = Math.round(mercType.hp * mult * hpFraction) + stoneBonus + hpBuff;
    const maxHp = Math.round(mercType.hp * mult) + stoneBonus + hpBuff;
    const finalDmg = Math.round(mercType.damage * mult) + dmgBuff;
    const npcData = {
      icon: mercType.icon, name: mercType.name,
      hp: maxHp, resist: null, loot: {},
      bodyColor: mercType.bodyColor, armorColor: mercType.armorColor,
      weapon: mercType.weapon,
    };
    setWalkers(prev => [...prev, {
      id: wid, npcData, alive: true, dying: false, hp: finalHp, maxHp, friendly: true,
    }]);
    walkDataRef.current[wid] = {
      x: spawnX, y: _isIso
        ? (caravanPosRef.current.y - 2 + Math.random() * 4)
        : (inDefense ? 85 + Math.random() * 7 : 85 + Math.random() * 7),
      dir: inDefense ? -1 : 1,
      yDir: Math.random() < 0.5 ? 1 : -1, speed: mercType.speed, ySpeed: 0.008 + Math.random() * 0.012,
      minX: _isIso ? 1 : 5, maxX: _isIso ? ISO_CONFIG.MAP_COLS - 1 : 90,
      minY: _isIso ? 1 : 25, maxY: _isIso ? ISO_CONFIG.MAP_ROWS - 1 : 92,
      bouncePhase: 0, alive: true, friendly: true,
      damage: finalDmg, attackCd: mercType.attackCd || 2500,
      lungeFrames: 0, lungeOffset: 0,
      combatStyle: mercType.combatStyle || "melee",
      mercType: mercType.id,
      range: mercType.range || 35,
      currentMana: mercType.mana || 0, maxMana: mercType.mana || 0,
      manaRegen: mercType.manaRegen || 0, spellCost: mercType.spellCost || 0,
      spellDamage: Math.round((mercType.spellDamage || 0) * mult),
      spellCd: mercType.spellCd || 3500, spellElement: mercType.spellElement || null,
      meleeDamage: Math.round((mercType.meleeDamage || mercType.damage) * mult),
      projectileDamage: Math.round((mercType.projectileDamage || 0) * mult),
      projectileCd: mercType.projectileCd || 1800,
      _passiveCombo: 0,
    };
    if (physicsRef.current) physicsRef.current.spawnNpc(wid, spawnX, npcData, true);
  }, [knightLevel]);

  const resolveRandomEvent = useCallback((outcome) => {
    // Apply outcome effects
    switch (outcome.type) {
      case "merchantBuy": {
        const item = outcome.item;
        const tc = totalCopper(money);
        const need = totalCopper(item.cost);
        if (tc < need) break;
        setMoney(copperToMoney(tc - need));
        sfxEventSuccess();
        if (item.effect === "fullMana") { setMana(MAX_MANA); showMessage(`${item.icon} ${item.name} – Pełny proch!`, "#c0a060"); }
        else if (item.effect === "initiative") { setInitiative(prev => Math.min(MAX_INITIATIVE, prev + item.value)); showMessage(`${item.icon} ${item.name} – +${item.value} inicjatywy!`, "#d4a030"); }
        else if (item.effect === "moneyBack") { addMoneyFn(item.value); showMessage(`${item.icon} ${item.name}!`, "#d4a030"); }
        else if (item.effect === "soulstone") { setMana(MAX_MANA); addMoneyFn({ copper: item.value }); showMessage(`${item.icon} ${item.name} – Proch + monety!`, "#a050e0"); }
        else if (item.effect === "dmgBuff") { setEventMercDmgBuff(item.value); showMessage(`${item.icon} ${item.name} – +${item.value} obrażeń najemników!`, "#40e060"); }
        else if (item.effect === "hpBuff") { setEventMercHpBuff(item.value); showMessage(`${item.icon} ${item.name} – +${item.value} HP najemników!`, "#40e060"); }
        break;
      }
      case "merchantSkip": break;
      case "altar": {
        const eff = outcome.effect;
        if (eff.type === "buff") {
          sfxEventSuccess();
          if (eff.effect === "manaBoost") setMana(prev => Math.min(MAX_MANA, prev + eff.value));
          else if (eff.effect === "moneyGift") addMoneyFn(eff.value);
          else if (eff.effect === "initBoost") setInitiative(prev => Math.min(MAX_INITIATIVE, prev + eff.value));
          else if (eff.effect === "freeMerc") {
            const mt = MERCENARY_TYPES[Math.floor(Math.random() * MERCENARY_TYPES.length)];
            sfxRecruit();
            // Spawn will happen after room loads (delayed below)
            setTimeout(() => spawnFreeMerc(mt, 1), 600);
          }
        } else {
          sfxEventFail();
          if (eff.effect === "moneyLoss") {
            const ml = totalCopper(eff.value);
            const mc = totalCopper(money);
            setMoney(copperToMoney(mc - Math.min(ml, mc)));
          } else if (eff.effect === "manaLoss") {
            setMana(prev => Math.max(0, prev - eff.value));
          }
        }
        showMessage(`${eff.text}`, eff.type === "buff" ? "#40e060" : "#cc3030");
        break;
      }
      case "altarSkip": break;
      case "altarRisky": {
        const rEff = outcome.effect;
        if (outcome.accepted) {
          sfxEventSuccess();
          if (rEff.effect === "caravanSacrifice") {
            // Lose 50% caravan HP, gain 3 treasures
            setCaravanHp(prev => Math.max(1, Math.round(prev * 0.5)));
            const newTreasures = [];
            for (let i = 0; i < 3; i++) {
              const t = pickTreasure(room);
              t.biome = "Ołtarz"; t.room = room;
              newTreasures.push(t);
            }
            setInventory(prev => [...prev, ...newTreasures]);
            setLoot(newTreasures[0]);
            showMessage("Ofiara przyjęta! 3 skarby za krew statku!", "#e0a040");
          } else if (rEff.effect === "doubleDamage") {
            setPlayerDoubleDmgRooms(2);
            setEnemyBuffRooms(prev => prev + 2);
            showMessage("Podwójna moc! Ale wrogowie też silniejsi!", "#e0a040");
          }
        }
        break;
      }
      case "woundedRecruit": {
        sfxRecruit();
        const mt = MERCENARY_TYPES[outcome.mercIndex] || MERCENARY_TYPES[0];
        // Spawn with 50% HP after room loads
        setTimeout(() => spawnFreeMerc(mt, 0.5), 600);
        showMessage(`${mt.name} dołączył do drużyny!`, "#40e060");
        break;
      }
      case "woundedSkip": break;
      case "cursedChestAccept": {
        const co = outcome.outcome;
        if (co.type === "good") {
          sfxEventSuccess();
          if (co.reward.copper || co.reward.silver) addMoneyFn(co.reward);
          if (co.reward.mana) setMana(prev => Math.min(MAX_MANA, prev + co.reward.mana));
          if (co.reward.treasure) {
            const t = pickTreasure(room + 10); // higher tier treasure
            t.biome = "Przeklęta"; t.room = room;
            setInventory(prev => [...prev, t]);
            setLoot(t);
          }
          showMessage(co.text, "#40e060");
        } else {
          sfxEventFail();
          if (co.penalty.enemyBuff) setEnemyBuffRooms(prev => prev + co.penalty.enemyBuff);
          if (co.penalty.moneyLoss) {
            const ml = co.penalty.moneyLoss;
            const mc = totalCopper(money);
            setMoney(copperToMoney(mc - Math.min(ml, mc)));
          }
          if (co.penalty.manaLoss) setMana(prev => Math.max(0, prev - co.penalty.manaLoss));
          showMessage(co.text, "#cc3030");
        }
        break;
      }
      case "cursedChestSkip": break;
      case "shipwreckSalvage": {
        const sr = outcome.salvageResult;
        if (sr.reward) {
          if (sr.reward.copper) addMoneyFn({ copper: sr.reward.copper });
          if (sr.reward.silver) addMoneyFn({ silver: sr.reward.silver });
          if (sr.reward.dynamite) setAmmo(prev => ({ ...prev, dynamite: (prev.dynamite || 0) + sr.reward.dynamite }));
          if (sr.reward.cannonball) setAmmo(prev => ({ ...prev, cannonball: (prev.cannonball || 0) + sr.reward.cannonball }));
          if (sr.reward.harpoon) setAmmo(prev => ({ ...prev, harpoon: (prev.harpoon || 0) + sr.reward.harpoon }));
          if (sr.reward.initiative) setInitiative(prev => Math.min(MAX_INITIATIVE, prev + sr.reward.initiative));
          if (sr.reward.tempMercs) {
            const mt = MERCENARY_TYPES[Math.floor(Math.random() * MERCENARY_TYPES.length)];
            setTimeout(() => spawnFreeMerc(mt, 0.75), 600);
          }
          sfxEventSuccess();
          showMessage(sr.text, "#3080a0");
        }
        break;
      }
      case "shipwreckSkip": break;
      case "oracleAccept": {
        const p = outcome.prophecy;
        sfxEventSuccess();
        showMessage(p.text, "#d0a0ff");
        // Oracle buffs are applied as room-limited effects
        if (p.effect === "fireResist") setEnemyBuffRooms(p.value); // reuse buff room counter
        if (p.effect === "critBuff") setPlayerDoubleDmgRooms(p.value);
        if (p.effect === "lootBuff") setEnemyBuffRooms(p.value);
        if (p.effect === "dodgeBuff") setEnemyBuffRooms(p.value);
        break;
      }
      case "oracleSkip": break;
    }
    // Complete the room transition — use pending biome from world map
    setRandomEvent(null);
    try {
      enterRoom(room + 1, ownedTools, pendingDestBiomeRef.current);
      pendingDestBiomeRef.current = null;
    } catch (e) { console.error("enterRoom failed:", e); }
    setTimeout(() => setTransitioning(false), 150);
  }, [money, room, ownedTools, addMoneyFn, showMessage, spawnFreeMerc]);

  const openChest = () => {
    if (!chestPos) return;
    sfxChest();
    const newClicks = chestClicks + 1;
    setChestClicks(newClicks);

    // Spawn gold coin particles at chest position
    if (pixiRef.current) {
      const px = isoModeRef.current ? (chestPos.x / ISO_CONFIG.MAP_COLS) * GAME_W : (chestPos.x / 100) * GAME_W;
      const py = isoModeRef.current ? (chestPos.y / ISO_CONFIG.MAP_ROWS) * GAME_H : (chestPos.y / 100) * GAME_H;
      const intensity = 0.5 + (newClicks / CLICKS_TO_OPEN) * 0.8;
      pixiRef.current.spawnGoldCoins(px, py, intensity);
    }

    // Small copper bonus per click
    const clickCopper = 2 + Math.floor(Math.random() * 4);
    addMoneyFn({ copper: clickCopper });

    // Final open — give the real treasure
    if (newClicks >= CLICKS_TO_OPEN) {
      setTimeout(() => {
        setShowChest(false); setChestClicks(0);
        // 25% chance to drop a saber the player doesn't own
        const unownedSabers = SABERS.filter(s => !s.starter && !ownedSabersRef.current.includes(s.id));
        if (unownedSabers.length > 0 && Math.random() < 0.25) {
          const saber = unownedSabers[Math.floor(Math.random() * unownedSabers.length)];
          setOwnedSabers(prev => {
            if (prev.includes(saber.id)) return prev;
            return [...prev, saber.id];
          });
          showMessage(`Znaleziono szabl\u0119: ${saber.name}! Załóż w ekwipunku.`, saber.color);
        }
        const t = pickTreasure(room); t.biome = biome.name; t.room = room;
        // greedy_merchant: x1.5 treasure value (nerfed from x2)
        if (hasRelic("greedy_merchant") && t.value) {
          t.value = { ...t.value };
          if (t.value.copper) t.value.copper = Math.round(t.value.copper * 1.5);
          if (t.value.silver) t.value.silver = Math.round(t.value.silver * 1.5);
          if (t.value.gold) t.value.gold = Math.round(t.value.gold * 1.5);
        }
        setInventory(prev => [...prev, t]); setLoot(t);
        showMessage("Skrzynia otwarta!", "#ffd700");
        // Big coin burst on final open
        if (pixiRef.current) {
          const px = (chestPos.x / 100) * GAME_W;
          const py = (chestPos.y / 100) * GAME_H;
          pixiRef.current.spawnGoldCoins(px, py, 2.0);
        }
      }, 300);
    }
  };

  // Meteor boulder wave spawning — called when meteor takes damage
  const spawnMeteorWave = (meteorX, meteorY, waveNum) => {
    const count = 2 + Math.min(waveNum, 2); // 2-4 enemies per wave, scaling
    const hpMult = 1 + waveNum * 0.15;
    showMessage(`Fala ${waveNum + 1} potworów z meteorytu!`, "#ff4020");
    sfxMeteorImpact();
    if (animatorRef.current) {
      animatorRef.current.playMeteorImpact(GAME_W * meteorX / 100, GAME_H * meteorY / 100);
    }
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 150);
    const newWalkers = [];
    for (let i = 0; i < count; i++) {
      const npcData = pickNpc("meteor");
      if (!npcData) continue;
      npcData.hp = Math.round(npcData.hp * hpMult);
      const wid = ++walkerIdCounter;
      const spawnX = Math.max(5, Math.min(90, (meteorX - 15) + Math.random() * 30));
      const spawnY = 8 + Math.random() * 10;
      const walkRange = 15 + Math.random() * 10;
      const speed = 0.02 + Math.random() * 0.03;
      newWalkers.push({ id: wid, npcData, alive: true, dying: false, hp: npcData.hp, maxHp: npcData.hp });
      walkDataRef.current[wid] = {
        x: spawnX, y: spawnY, dir: Math.random() < 0.5 ? 1 : -1,
        yDir: 1, speed, ySpeed: 0.015 + Math.random() * 0.015,
        minX: Math.max(5, spawnX - walkRange), maxX: Math.min(90, spawnX + walkRange),
        minY: 25, maxY: 90,
        bouncePhase: Math.random() * Math.PI * 2,
        alive: true, friendly: false,
        damage: Math.ceil(npcData.hp / 8),
        lungeFrames: 0, lungeOffset: 0,
        ability: npcData.ability || null,
      };
    }
    setWalkers(prev => [...prev, ...newWalkers]);
    for (const nw of newWalkers) {
      if (physicsRef.current) physicsRef.current.spawnNpc(nw.id, walkDataRef.current[nw.id].x, nw.npcData, false);
    }
  };

  // Check if meteor HP crossed a wave threshold — call after any damage to meteor boulder
  const checkMeteorWaveThreshold = (walkerId, oldHp, newHp) => {
    const mw = meteorWaveRef.current;
    if (!mw || mw.walkerId !== walkerId) return;
    // First hit: spawn first wave
    if (mw.waveCount === 0 && newHp < mw.nextThreshold) {
      spawnMeteorWave(mw.x, mw.y, 0);
      mw.waveCount = 1;
      mw.nextThreshold = mw.nextThreshold - 80;
    }
    // Every 80 HP: spawn additional wave
    while (newHp <= mw.nextThreshold && newHp > 0) {
      spawnMeteorWave(mw.x, mw.y, mw.waveCount);
      mw.waveCount++;
      mw.nextThreshold -= 80;
    }
  };

  // ─── UNIVERSAL GROUND LOOT DROP SYSTEM ───
  // Spawns clickable items on the ground from enemy kills and obstacle destruction
  const _glId = useRef(0);
  const spawnGroundLootItems = (worldX, worldY, lootConfig) => {
    const items = [];
    const scatter = (range) => (Math.random() - 0.5) * range;
    const now = Date.now();
    const mkId = () => `gl_${now}_${++_glId.current}`;

    // 1. Currency drops (always from loot config)
    if (lootConfig.copper) {
      const coinCount = Math.min(5, Math.max(1, Math.ceil(lootConfig.copper / 8)));
      const perCoin = Math.floor(lootConfig.copper / coinCount);
      for (let i = 0; i < coinCount; i++) {
        items.push({
          id: mkId(), type: "coin",
          value: { copper: perCoin + (i === 0 ? lootConfig.copper % coinCount : 0) },
          x: worldX + scatter(3), y: worldY + scatter(2),
          icon: "coin", label: `${perCoin} Cu`, collected: false, spawnTime: now,
        });
      }
    }
    if (lootConfig.silver) {
      for (let i = 0; i < lootConfig.silver; i++) {
        items.push({
          id: mkId(), type: "coin", value: { silver: 1 },
          x: worldX + scatter(2.5), y: worldY + scatter(1.5),
          icon: "gem", label: "1 Ag", collected: false, spawnTime: now,
        });
      }
    }
    if (lootConfig.gold) {
      items.push({
        id: mkId(), type: "coin", value: { gold: lootConfig.gold },
        x: worldX + scatter(2), y: worldY + scatter(1),
        icon: "crown", label: `${lootConfig.gold} Au`, collected: false, spawnTime: now,
      });
    }

    // 2. Ammo drops (% chance per type)
    const ammoDrops = [
      { type: "dynamite", chance: 0.10, min: 1, max: 2, icon: "dynamite", label: "Dynamit" },
      { type: "harpoon", chance: 0.08, min: 1, max: 2, icon: "harpoon", label: "Harpun" },
      { type: "cannonball", chance: 0.05, min: 1, max: 1, icon: "cannon", label: "Kula" },
      { type: "rum", chance: 0.06, min: 1, max: 2, icon: "pirateRaid", label: "Rum" },
      { type: "chain", chance: 0.05, min: 1, max: 2, icon: "ricochet", label: "Łańcuch" },
    ];
    for (const ad of ammoDrops) {
      if (Math.random() < ad.chance * (lootConfig.ammoMult || 1)) {
        const amt = ad.min + Math.floor(Math.random() * (ad.max - ad.min + 1));
        items.push({
          id: mkId(), type: "ammo", value: { [ad.type]: amt },
          x: worldX + scatter(3), y: worldY + scatter(2),
          icon: ad.icon, label: `${ad.label} x${amt}`, collected: false, spawnTime: now,
        });
      }
    }

    // 3. Saber drop (3% from enemies, uses existing saber pool)
    if (lootConfig.canDropSaber && Math.random() < 0.03) {
      const unowned = (typeof SABERS !== "undefined" ? SABERS : []).filter(
        s => !s.starter && !s.dropOnly && !ownedSabersRef.current.includes(s.id)
      );
      if (unowned.length > 0) {
        const saber = unowned[Math.floor(Math.random() * unowned.length)];
        items.push({
          id: mkId(), type: "saber_drop", saberId: saber.id,
          x: worldX + scatter(2), y: worldY + scatter(1),
          icon: saber.icon || "swords", label: saber.name,
          collected: false, spawnTime: now, rarity: saber.rarity || "common",
        });
      }
    }

    // 4. Treasure drop (5% from enemies, 8% from obstacles)
    if (Math.random() < (lootConfig.treasureChance || 0)) {
      const treasure = typeof pickTreasure === "function" ? pickTreasure() : null;
      if (treasure) {
        items.push({
          id: mkId(), type: "treasure", treasure,
          x: worldX + scatter(2), y: worldY + scatter(1),
          icon: treasure.icon || "chest", label: treasure.name,
          collected: false, spawnTime: now, rarity: treasure.rarity || "common",
        });
      }
    }

    // 5. Relic drop (1% from elite/boss enemies)
    if (lootConfig.canDropRelic && Math.random() < 0.01) {
      const ownedRelicIds = (activeRelicsRef.current || []).map(r => r.id);
      const available = RELICS.filter(r => !ownedRelicIds.includes(r.id));
      if (available.length > 0) {
        const relic = available[Math.floor(Math.random() * available.length)];
        items.push({
          id: mkId(), type: "relic_drop", relic,
          x: worldX + scatter(1.5), y: worldY + scatter(1),
          icon: relic.icon || "star", label: relic.name,
          collected: false, spawnTime: now, rarity: relic.rarity || "rare",
        });
      }
    }

    // 6. Biome resource drops (only from enemy kills)
    if (lootConfig.canDropResource && biomeRef.current) {
      const biomeResources = BIOME_RESOURCES[biomeRef.current.id] || [];
      const mult = lootConfig.resourceMult || 1;
      for (const resource of biomeResources) {
        const baseChance = resource.rarity === "common" ? 0.12 : resource.rarity === "uncommon" ? 0.07 : 0.03;
        if (Math.random() < baseChance * mult) {
          items.push({
            id: mkId(), type: "resource", resource,
            x: worldX + scatter(2.5), y: worldY + scatter(1.5),
            icon: resource.icon, label: resource.name,
            collected: false, spawnTime: now, rarity: resource.rarity,
          });
        }
      }
    }

    if (items.length > 0) {
      setGroundLoot(prev => [...prev, ...items]);
    }
  };

  // Helper: spawn loot from killed enemy at their world position
  const spawnEnemyLoot = (walkData, npcData, isBoss) => {
    if (!walkData || !npcData) return;
    const wx = walkData.wx ?? walkData.x ?? 15;
    const wy = walkData.wy ?? walkData.y ?? 15;
    const loot = npcData.loot || {};
    spawnGroundLootItems(wx, wy, {
      ...loot,
      ammoMult: isBoss ? 3 : 1,
      canDropSaber: true,
      treasureChance: isBoss ? 0.40 : 0.05,
      canDropRelic: isBoss || (npcData.rarity === "rare" || npcData.rarity === "elite"),
      canDropResource: true,
      resourceMult: isBoss ? 2 : 1,
    });
  };

  // Helper: spawn loot from destroyed obstacle
  const spawnObstacleLoot = (obs) => {
    if (!obs) return;
    const loot = obs.loot || {};
    spawnGroundLootItems(obs.x, obs.y, {
      ...loot,
      ammoMult: 0.5,
      canDropSaber: false,
      treasureChance: 0.08,
      canDropRelic: false,
    });
  };

  // Spawn ground loot when meteor is destroyed
  const spawnMeteorGroundLoot = (meteorX, meteorY) => {
    const items = [];
    const baseX = meteorX;
    const baseY = meteorY + 5;
    // Scatter coins
    const coinCount = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < coinCount; i++) {
      items.push({
        id: `gl_${Date.now()}_${i}`,
        type: "coin",
        value: Math.random() < 0.3 ? { silver: 1 } : { copper: 8 + Math.floor(Math.random() * 12) },
        x: baseX + (Math.random() - 0.5) * 16,
        y: baseY + (Math.random() - 0.5) * 8,
        icon: "coin",
        label: Math.random() < 0.3 ? "Ag" : "Cu",
        collected: false,
        spawnTime: Date.now(),
      });
    }
    // Random relic/item drops
    if (Math.random() < 0.35) {
      items.push({
        id: `gl_relic_${Date.now()}`,
        type: "ammo",
        value: { dynamite: 2 + Math.floor(Math.random() * 3) },
        x: baseX + (Math.random() - 0.5) * 12,
        y: baseY + (Math.random() - 0.5) * 6,
        icon: "dynamite",
        label: "Dynamit",
        collected: false,
        spawnTime: Date.now(),
      });
    }
    if (Math.random() < 0.25) {
      items.push({
        id: `gl_ammo_${Date.now()}`,
        type: "ammo",
        value: { cannonball: 1 + Math.floor(Math.random() * 2) },
        x: baseX + (Math.random() - 0.5) * 12,
        y: baseY + (Math.random() - 0.5) * 6,
        icon: "cannon",
        label: "Kule",
        collected: false,
        spawnTime: Date.now(),
      });
    }
    // Rare legendary sword drop — now gives equippable saber
    if (Math.random() < 0.12 && !ownedSabersRef.current.includes("moonblade")) {
      items.push({
        id: `gl_sword_${Date.now()}`,
        type: "moonblade_saber",
        x: baseX + (Math.random() - 0.5) * 8,
        y: baseY + (Math.random() - 0.5) * 4,
        icon: "moon",
        label: "Miecz Pełni Księżyca",
        collected: false,
        spawnTime: Date.now(),
      });
    }
    setGroundLoot(items);
    // Gold coin particle effect
    if (pixiRef.current) {
      const px = GAME_W * baseX / 100;
      const py = GAME_H * baseY / 100;
      pixiRef.current.spawnGoldCoins(px, py, 3.0);
    }
    showMessage("Meteoryt zniszczony! Zbierz łupy!", "#ffd700");
  };

  // Collect a map secret
  const collectMapSecret = useCallback((secretId) => {
    const secret = mapSecretsRef.current.find(s => s.id === secretId && s.discovered && !s.collected);
    if (!secret) return;
    setMapSecrets(prev => prev.map(s => s.id === secretId ? { ...s, collected: true } : s));
    const maxHp = CARAVAN_LEVELS[caravanLevelRef.current].hp;
    switch (secret.type) {
      case "buried_treasure": {
        const copper = 15 + Math.floor(Math.random() * 25) + roomNumberRef.current * 2;
        const silver = Math.random() < 0.3 ? 1 : 0;
        addMoneyFn({ copper, silver });
        showMessage(`💰 Zakopany skarb! +${copper} miedzi${silver ? " +1 srebro" : ""}`, "#ffd700");
        break;
      }
      case "forgotten_cache": {
        const ammoTypes = ["dynamite", "harpoon", "cannonball", "rum", "chain"];
        const ammoType = ammoTypes[Math.floor(Math.random() * ammoTypes.length)];
        const qty = 1 + Math.floor(Math.random() * 3);
        setAmmo(prev => ({ ...prev, [ammoType]: (prev[ammoType] || 0) + qty }));
        showMessage(`📦 Skrytka! +${qty}x ${ammoType}`, "#88ddff");
        break;
      }
      case "ancient_rune": {
        // Temporary buff: +20% damage for this room
        const healAmt = Math.round(maxHp * 0.12);
        setCaravanHp(prev => Math.min(maxHp, prev + healAmt));
        showMessage(`🔮 Starożytna runa! +${healAmt} HP i błogosławieństwo runy`, "#cc88ff");
        break;
      }
      case "mysterious_altar": {
        const roll = Math.random();
        if (roll < 0.5) {
          const copper = 30 + Math.floor(Math.random() * 30);
          addMoneyFn({ copper });
          showMessage(`⛩️ Ołtarz przyjął ofiarę! +${copper} miedzi`, "#ffcc44");
        } else if (roll < 0.8) {
          const healAmt = Math.round(maxHp * 0.25);
          setCaravanHp(prev => Math.min(maxHp, prev + healAmt));
          if (healAmt / maxHp > 0.3) stopCaravanAlarm?.();
          showMessage(`⛩️ Ołtarz uzdrowił karawanę! +${healAmt} HP`, "#44ff88");
        } else {
          addMoneyFn({ silver: 2 });
          showMessage("⛩️ Bogowie byli łaskawi! +2 srebra", "#ffd700");
        }
        break;
      }
      case "old_bones": {
        if (Math.random() < 0.65) {
          const copper = 8 + Math.floor(Math.random() * 15);
          addMoneyFn({ copper });
          showMessage(`💀 Stare kości z monetami! +${copper} miedzi`, "#aaaaaa");
        } else {
          const dmg = Math.round(maxHp * 0.05);
          setCaravanHp(prev => Math.max(1, prev - dmg));
          showMessage(`💀 Kości były przeklęte! -${dmg} HP`, "#ff4444");
        }
        break;
      }
    }
  }, [addMoneyFn, showMessage, stopCaravanAlarm]);

  // Collect a ground loot item
  const collectGroundLoot = (itemId) => {
    const item = groundLoot.find(i => i.id === itemId && !i.collected);
    if (!item) return;
    setGroundLoot(prev => prev.map(i => i.id === itemId ? { ...i, collected: true } : i));
    if (item.type === "coin") {
      addMoneyFn(item.value);
      const text = item.value.gold ? `+${item.value.gold} Au` : item.value.silver ? `+${item.value.silver} Ag` : `+${item.value.copper || 0} Cu`;
      showMessage(text, "#d4a030");
    } else if (item.type === "ammo") {
      setAmmo(prev => {
        const upd = { ...prev };
        for (const [k, v] of Object.entries(item.value)) upd[k] = (upd[k] || 0) + v;
        return upd;
      });
      const ammoNames = { dynamite: "dynamitu", harpoon: "harpunów", cannonball: "kul", rum: "rumu", chain: "łańcuchów" };
      const entries = Object.entries(item.value);
      const text = entries.map(([k, v]) => `+${v} ${ammoNames[k] || k}`).join(", ");
      showMessage(text, "#60a050");
    } else if (item.type === "treasure") {
      setInventory(prev => [...prev, item.treasure]);
      setLoot(item.treasure);
      showMessage(`${item.treasure.name}!`, "#d4a030");
    } else if (item.type === "moonblade_saber") {
      setOwnedSabers(prev => prev.includes("moonblade") ? prev : [...prev, "moonblade"]);
      showMessage("Zdobyto: Miecz Pełni Księżyca! Załóż w ekwipunku.", "#ffd700");
    } else if (item.type === "saber_drop") {
      setOwnedSabers(prev => prev.includes(item.saberId) ? prev : [...prev, item.saberId]);
      showMessage(`Zdobyto szablę: ${item.label}!`, item.rarity === "epic" ? "#a050e0" : "#40a8b8");
    } else if (item.type === "relic_drop") {
      setActiveRelics(prev => {
        if (prev.find(r => r.id === item.relic.id)) return prev;
        return [...prev, item.relic];
      });
      showMessage(`Znaleziono relikt: ${item.relic.name}!`, "#ffd700");
    } else if (item.type === "resource") {
      setCraftingResources(prev => ({ ...prev, [item.resource.id]: (prev[item.resource.id] || 0) + 1 }));
      showMessage(`+1 ${item.resource.name}`, "#44cc88");
    } else if (item.type === "health_potion") {
      const maxHp = CARAVAN_LEVELS[caravanLevelRef.current].hp;
      const healAmt = Math.round(maxHp * 0.25);
      setCaravanHp(prev => {
        const newHp = Math.min(maxHp, prev + healAmt);
        if (newHp / maxHp > 0.3) stopCaravanAlarm();
        return newHp;
      });
      showMessage(`+${healAmt} HP! Eliksir życia!`, "#44ff88");
    }
    // Coin particle on pickup
    if (pixiRef.current) {
      const isoMode = isoModeRef.current;
      let px, py;
      if (isoMode) {
        const cam = isoCameraRef.current;
        const screen = _isoWorldToScreen(item.x, item.y, cam.x, cam.y);
        px = screen.x; py = screen.y;
      } else {
        px = GAME_W * item.x / 100;
        py = GAME_H * item.y / 100;
      }
      pixiRef.current.spawnGoldCoins(px, py, 0.3);
    }
  };

  const startMining = () => {
    if (!resourceNode || !showResource || miningRef.current.active) return;
    const res = resourceNode.resource;
    const duration = (MINE_TIMES[res?.rarity] || 2) * 1000;
    const startTime = Date.now();
    miningRef.current = { active: true, intervalId: null };
    const id = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      setMiningProgress(progress);
      if (progress >= 1) {
        clearInterval(id);
        miningRef.current = { active: false, intervalId: null };
        setShowResource(false); sfxGather(); setMiningProgress(0);
        if (res) { setInventory(prev => [...prev, res]); setLoot(res); }
      }
    }, 50);
    miningRef.current.intervalId = id;
  };

  // ─── CRAFTING ───
  const craftItem = useCallback((recipe) => {
    if (!checkCanCraft(recipe, craftingResourcesRef.current)) return;
    const newRes = { ...craftingResourcesRef.current };
    for (const ing of recipe.ingredients) {
      newRes[ing.resourceId] = (newRes[ing.resourceId] || 0) - ing.amount;
    }
    setCraftingResources(newRes);
    sfxChest();
    if (recipe.result.type === "ammo") {
      const { ammoType, amount } = recipe.result;
      setAmmo(prev => ({ ...prev, [ammoType]: (prev[ammoType] || 0) + amount }));
      showMessage(`✓ ${recipe.name} — +${amount} ${ammoType}`, "#44cc88");
    } else if (recipe.result.type === "consumable" || recipe.result.type === "trap") {
      setCraftedConsumables(prev => [...prev, {
        id: `crafted_${Date.now()}`,
        recipeId: recipe.id,
        name: recipe.name,
        desc: recipe.desc,
        icon: recipe.icon,
        effect: recipe.result.type === "trap"
          ? { type: "deploy_trap", trapConfig: recipe.result }
          : recipe.result.effect,
      }]);
      showMessage(`✓ ${recipe.name} gotowy do użycia!`, "#44cc88");
    } else if (recipe.result.type === "weapon_mod") {
      setSecretPermDmgBuff(prev => prev + 0.05);
      showMessage(`✓ ${recipe.name} — szabla wzmocniona na stałe!`, "#a050e0");
    }
  }, []);

  const useCraftedConsumable = useCallback((consumableId) => {
    const item = craftedConsumables.find(c => c.id === consumableId);
    if (!item) return;
    setCraftedConsumables(prev => prev.filter(c => c.id !== consumableId));
    const eff = item.effect;
    if (eff.type === "chain_lightning") {
      const enemies = walkersRef.current.filter(w => w.alive && !w.friendly && !w.dying);
      const targets = enemies.sort(() => Math.random() - 0.5).slice(0, eff.targets || 5);
      for (const t of targets) {
        const dmg = eff.damage || 20;
        spawnDmgPopup(t.id, `⚡${dmg}`, "#ffee00");
        if (physicsRef.current) physicsRef.current.applyHit(t.id, "lightning", 1);
        setWalkers(prev => prev.map(w => {
          if (w.id !== t.id || !w.alive || w.friendly) return w;
          const nh = Math.max(0, w.hp - dmg);
          if (nh <= 0) {
            if (walkDataRef.current[w.id]) walkDataRef.current[w.id].alive = false;
            addMoneyFn(w.npcData.loot || {});
            setKills(k => k + 1);
            return { ...w, hp: 0, dying: true, dyingAt: Date.now() };
          }
          return { ...w, hp: nh };
        }));
      }
      showMessage(`Grom Zeusa! Uderzono ${targets.length} wrogów!`, "#ffee00");
    } else if (eff.type === "permanent_spell_boost") {
      setSecretPermDmgBuff(prev => prev + eff.damageMult);
      showMessage(`Ambrozja! Czary +${Math.round(eff.damageMult * 100)}% trwale!`, "#ffd700");
    } else if (eff.type === "merc_mutation") {
      const allies = walkersRef.current.filter(w => w.alive && w.friendly && !w.dying);
      if (allies.length > 0) {
        const target = allies[Math.floor(Math.random() * allies.length)];
        const option = eff.options[Math.floor(Math.random() * eff.options.length)];
        if (option.stat === "hp") {
          setWalkers(prev => prev.map(w => w.id !== target.id ? w : {
            ...w, hp: Math.round(w.hp * option.mult), maxHp: Math.round(w.maxHp * option.mult),
          }));
        } else if (option.stat === "damage" && walkDataRef.current[target.id]) {
          walkDataRef.current[target.id].damage = Math.round((walkDataRef.current[target.id].damage || 10) * option.mult);
        }
        showMessage(`Mutacja! ${target.npcData.name} wzmocniony!`, "#c050ff");
      } else {
        showMessage("Brak sojuszników!", "#888");
        setCraftedConsumables(prev => [...prev, item]);
      }
    } else if (eff.type === "caravan_revive") {
      setCaravanReviveReady(true);
      showMessage("Eliksir Feniksa gotowy — karawana odrodzi się raz!", "#ff6020");
    } else if (eff.type === "deploy_trap") {
      const s = eff.trapConfig.stats || eff.trapConfig;
      setPlayerTraps(prev => [...prev, {
        id: `ct_${Date.now()}`, type: item.recipeId, active: true,
        currentHp: s.hp || 999,
        config: { ...s, name: item.name, icon: item.icon },
        x: isoModeRef.current ? ISO_CONFIG.MAP_COLS / 2 : 50,
        y: isoModeRef.current ? ISO_CONFIG.MAP_ROWS / 2 : 50,
      }]);
      showMessage(`${item.name} rozstawiona!`, "#44cc88");
    }
  }, [craftedConsumables]);

  const stopMining = () => {
    if (miningRef.current.intervalId) clearInterval(miningRef.current.intervalId);
    miningRef.current = { active: false, intervalId: null };
    setMiningProgress(0);
  };

  // ─── POI INTERACTIONS ───

  const pickFruit = (fruitId) => {
    if (!fruitTree) return;
    const fruit = fruitTree.fruits.find(f => f.id === fruitId && !f.picked);
    if (!fruit) return;
    sfxChest();
    const value = 3 + Math.floor(Math.random() * 8); // 3-10 copper
    setMoney(prev => copperToMoney(totalCopper(prev) + value));
    showMessage(`+${value} Cu`, "#40c040");
    setFruitTree(prev => prev ? { ...prev, fruits: prev.fruits.map(f => f.id === fruitId ? { ...f, picked: true } : f) } : null);
  };

  const pickNugget = (nuggetId) => {
    if (!mineNugget) return;
    if (!ownedTools.includes("pickaxe")) { showMessage("Potrzebujesz kilofa!", "#b83030"); return; }
    const nugget = mineNugget.nuggets.find(n => n.id === nuggetId && !n.dug);
    if (!nugget) return;
    sfxGather();
    const rewards = [
      { name: "Złoty samorodek", value: { silver: 1 }, rarity: "rare" },
      { name: "Srebrny samorodek", value: { copper: 25 }, rarity: "uncommon" },
      { name: "Kawałek rudy", value: { copper: 10 }, rarity: "common" },
    ];
    const roll = Math.random();
    const reward = roll < 0.15 ? rewards[0] : roll < 0.45 ? rewards[1] : rewards[2];
    const nv = totalCopper(reward.value);
    setMoney(prev => copperToMoney(totalCopper(prev) + nv));
    showMessage(`${reward.name}! +${nv} Cu`, "#d4a030");
    setMineNugget(prev => {
      if (!prev) return null;
      const updated = prev.nuggets.map(n => n.id === nuggetId ? { ...n, dug: true } : n);
      if (updated.every(n => n.dug)) return null;
      return { ...prev, nuggets: updated };
    });
  };

  const openWaterfall = () => {
    if (!waterfall || waterfall.opened) return;
    sfxChest();
    setWaterfall(prev => prev ? { ...prev, opened: true } : null);
    const roll = Math.random();
    let value, text;
    if (roll < 0.2) { value = { silver: 2 }; text = "Skarb! Srebrne monety!"; }
    else if (roll < 0.5) { value = { silver: 1 }; text = "Znaleziono srebrną monetę!"; }
    else { value = { copper: 15 + Math.floor(Math.random() * 20) }; text = "Garść miedzianych monet!"; }
    setMoney(prev => copperToMoney(totalCopper(prev) + totalCopper(value)));
    showMessage(`${text}`, "#40a0ff");
  };

  const recruitFromCamp = (mercType, spawnXOverride) => {
    if (ghostShipActiveRef.current) { showMessage("Najemnicy odmawiają walki na Widmowym Statku!", "#8888cc"); return; }
    const tc = totalCopper(money);
    const lvlMult = (KNIGHT_LEVELS[knightLevel]?.mult || 1);
    const need = Math.round(totalCopper(mercType.cost) * lvlMult);
    if (tc < need) { showMessage("Za mało monet!", "#b83030"); return; }
    setMoney(copperToMoney(tc - need));
    sfxRecruit();
    const wid = ++walkerIdCounter;
    const _isIso = isoModeRef.current;
    // Spawn recruited mercenaries next to the caravan
    const spawnX = spawnXOverride != null ? spawnXOverride
      : _isIso ? (caravanPosRef.current.x + 1 + Math.random() * 3)
      : (46 + Math.random() * 8);
    const lvl = KNIGHT_LEVELS[knightLevel];
    const mult = lvl.mult || 1;
    const stoneBonus = (hasRelic("stone_skin") ? 30 : 0) + (hasSynergy("twierdza") ? 30 : 0) + perkMercHpBonus;
    const hpBuff = eventMercHpBuffRef.current || 0;
    const dmgBuff = eventMercDmgBuffRef.current || 0;
    const finalHp = Math.round(mercType.hp * mult) + stoneBonus + hpBuff;
    const finalDmg = Math.round(mercType.damage * mult) + dmgBuff;
    const npcData = {
      icon: mercType.icon, name: mercType.name,
      hp: finalHp, resist: null, loot: {},
      bodyColor: mercType.bodyColor, armorColor: mercType.armorColor,
      weapon: mercType.weapon,
    };
    setWalkers(prev => [...prev, {
      id: wid, npcData, alive: true, dying: false, hp: finalHp, maxHp: finalHp, friendly: true,
    }]);
    walkDataRef.current[wid] = {
      x: spawnX, y: _isIso
        ? (caravanPosRef.current.y - 2 + Math.random() * 4)
        : (85 + Math.random() * 7),
      dir: Math.random() < 0.5 ? 1 : -1,
      yDir: Math.random() < 0.5 ? 1 : -1, speed: mercType.speed, ySpeed: 0.008 + Math.random() * 0.012,
      minX: _isIso ? 1 : 5, maxX: _isIso ? ISO_CONFIG.MAP_COLS - 1 : 90,
      minY: _isIso ? 1 : 25, maxY: _isIso ? ISO_CONFIG.MAP_ROWS - 1 : 92,
      bouncePhase: 0, alive: true, friendly: true,
      damage: finalDmg, attackCd: mercType.attackCd || 2500,
      lungeFrames: 0, lungeOffset: 0,
      combatStyle: mercType.combatStyle || "melee",
      mercType: mercType.id,
      range: mercType.range || 35,
      currentMana: mercType.mana || 0, maxMana: mercType.mana || 0,
      manaRegen: mercType.manaRegen || 0, spellCost: mercType.spellCost || 0,
      spellDamage: Math.round((mercType.spellDamage || 0) * mult),
      spellCd: mercType.spellCd || 3500, spellElement: mercType.spellElement || null,
      meleeDamage: Math.round((mercType.meleeDamage || mercType.damage) * mult),
      projectileDamage: Math.round((mercType.projectileDamage || 0) * mult),
      projectileCd: mercType.projectileCd || 1800,
      critChance: mercType.critChance || 0,
      critMult: mercType.critMult || 1,
    };
    if (physicsRef.current) physicsRef.current.spawnNpc(wid, spawnX, npcData, true);
    showMessage(`${mercType.name} zrekrutowany! (${lvl.name})`, "#40e060");
    setMercCamp(null); // camp disappears after recruiting
  };

  const collectArsenalAmmo = () => {
    if (!wizardPoi) return;
    sfxChest();
    const ammoType = wizardPoi.ammoType;
    const ammoAmount = wizardPoi.ammoAmount;
    setAmmo(prev => ({ ...prev, [ammoType]: (prev[ammoType] || 0) + ammoAmount }));
    const ammoNames = { dynamite: "dynamitu", harpoon: "harpunów", cannonball: "kul armatnich", rum: "rumu", chain: "łańcuchów" };
    showMessage(`+${ammoAmount} ${ammoNames[ammoType] || ammoType}!`, "#e0a040");
    setWizardPoi(null);
  };

  // ─── BIOME POI INTERACTION ───
  const activateBiomePoi = useCallback(() => {
    if (!biomePoi || biomePoi.used) return;
    sfxChest();
    const t = biomePoi.type;
    // Each POI type grants a unique effect
    if (t === "healing_spring") {
      // Heal caravan 20-35 HP
      const heal = 20 + Math.floor(Math.random() * 16);
      setCaravanHp(prev => Math.min(CARAVAN_LEVELS[caravanLevelRef.current].hp, prev + heal));
      showMessage(`Uzdrawiające źródło! +${heal} HP karawany`, "#40e060");
    } else if (t === "shipwreck_cache") {
      // Random loot: 15-30 copper + chance for silver
      const cop = 15 + Math.floor(Math.random() * 16);
      const sil = Math.random() < 0.3 ? 1 + Math.floor(Math.random() * 2) : 0;
      addMoneyFn({ copper: cop, silver: sil });
      showMessage(`Skarb z wraku! +${cop} miedzi${sil ? ` +${sil} srebra` : ""}`, "#ffd700");
    } else if (t === "oasis") {
      // +15% damage bonus for 60s
      showMessage("Oaza! +15% obrażeń przez 60s", "#40c0ff");
      // Simple bonus via temporary relic-like effect
      setMana(prev => Math.min(100, prev + 25));
    } else if (t === "ice_crystal") {
      // Grant 3-5 ice ammo (harpoon) + small heal
      const amt = 3 + Math.floor(Math.random() * 3);
      setAmmo(prev => ({ ...prev, harpoon: (prev.harpoon || 0) + amt }));
      showMessage(`Kryształ Lodu! +${amt} harpunów`, "#80c0ff");
    } else if (t === "black_market") {
      // Random ammo bundle at cost
      const loot = { copper: 8 + Math.floor(Math.random() * 12) };
      addMoneyFn(loot);
      const ammoAmt = 2 + Math.floor(Math.random() * 3);
      setAmmo(prev => ({ ...prev, dynamite: (prev.dynamite || 0) + ammoAmt }));
      showMessage(`Czarny rynek! +${loot.copper} miedzi +${ammoAmt} dynamitu`, "#c0a060");
    } else if (t === "fire_shrine") {
      // Grant 2-4 dynamite + fire damage boost message
      const amt = 2 + Math.floor(Math.random() * 3);
      setAmmo(prev => ({ ...prev, dynamite: (prev.dynamite || 0) + amt }));
      showMessage(`Ognisty ołtarz! +${amt} dynamitu`, "#ff6020");
    } else if (t === "camp_rest") {
      // Rest: heal caravan 15 HP + restore 20 mana
      const heal = 15;
      setCaravanHp(prev => Math.min(CARAVAN_LEVELS[caravanLevelRef.current].hp, prev + heal));
      setMana(prev => Math.min(100, prev + 20));
      showMessage(`Odpoczynek w obozie! +${heal} HP +20 many`, "#e0c060");
    } else if (t === "mushroom_circle") {
      // Random effect: heal OR poison OR loot
      const roll = Math.random();
      if (roll < 0.4) {
        setMana(prev => Math.min(100, prev + 30));
        showMessage("Magiczne grzyby! +30 many", "#a060c0");
      } else if (roll < 0.7) {
        addMoneyFn({ copper: 12 + Math.floor(Math.random() * 10) });
        showMessage("Grzyby skrywają skarb!", "#ffd700");
      } else {
        const heal = 10 + Math.floor(Math.random() * 10);
        setCaravanHp(prev => Math.min(CARAVAN_LEVELS[caravanLevelRef.current].hp, prev + heal));
        showMessage(`Lecznicze grzyby! +${heal} HP`, "#40e060");
      }
    } else if (t === "fairy_well") {
      // 60% bonus, 40% minor penalty
      if (Math.random() < 0.6) {
        const cop = 20 + Math.floor(Math.random() * 15);
        addMoneyFn({ copper: cop });
        showMessage(`Błogosławieństwo wróżek! +${cop} miedzi`, "#e0c0ff");
      } else {
        setMana(prev => Math.max(0, prev - 10));
        showMessage("Psikus wróżek! -10 many", "#c04060");
      }
    } else if (t === "spore_cloud") {
      // Grant 2-3 poison ammo (chain)
      const amt = 2 + Math.floor(Math.random() * 2);
      setAmmo(prev => ({ ...prev, chain: (prev.chain || 0) + amt }));
      showMessage(`Trujące zarodniki! +${amt} łańcuchów`, "#44ff44");
    } else if (t === "witch_hut") {
      // Risky: 50% good (silver), 50% bad (lose copper)
      if (Math.random() < 0.5) {
        addMoneyFn({ silver: 1 + Math.floor(Math.random() * 2) });
        showMessage("Wiedźma daje srebrny talizman!", "#c0c0c0");
      } else {
        const loss = 5 + Math.floor(Math.random() * 10);
        showMessage(`Wiedźma kradnie ${loss} miedzi!`, "#cc4040");
      }
    } else if (t === "treasure_map") {
      // Big copper bonus
      const cop = 25 + Math.floor(Math.random() * 20);
      addMoneyFn({ copper: cop });
      showMessage(`Mapa skarbów! +${cop} miedzi`, "#ffd700");
    } else if (t === "zen_shrine") {
      // Full mana restore + small heal
      setMana(100);
      const heal = 10;
      setCaravanHp(prev => Math.min(CARAVAN_LEVELS[caravanLevelRef.current].hp, prev + heal));
      showMessage("Świątynia Zen! Pełna mana +10 HP", "#80e0a0");
    } else if (t === "pearl_oyster") {
      // Rare pearl: big silver/gold reward
      if (Math.random() < 0.3) {
        addMoneyFn({ gold: 1 });
        showMessage("Złota perła! +1 złota!", "#ffd700");
      } else {
        addMoneyFn({ silver: 2 + Math.floor(Math.random() * 2) });
        showMessage("Piękna perła! +2-3 srebra", "#c0c0e0");
      }
    } else if (t === "dungeon_entrance") {
      // Enter a multi-level dungeon
      const dType = biomePoi.dungeonType || "mine";
      const difficulty = 1 + Math.min(roomRef.current / 25, 1.5);
      enterDungeon(dType, difficulty);
    }
    setBiomePoi(prev => prev ? { ...prev, used: true } : null);
  }, [biomePoi, addMoneyFn, showMessage, sfxChest, enterDungeon]);

  // ─── SPELL CASTING WITH HP & RESISTANCE ───

  const getSpellManaCost = (spell) => {
    let cost = spell.manaCost;
    // chaos_blade: +25% mana cost (negated by prochowy_baron synergy)
    if (hasRelic("chaos_blade") && !hasSynergy("prochowy_baron")) cost = Math.ceil(cost * 1.25);
    return cost;
  };

  const canCastSpell = (spell) => {
    if (!spell) return false;
    if (manaRef.current < getSpellManaCost(spell)) return false;
    // Use ref for immediate cooldown check to prevent double-fire between React renders
    const cdEnd = cooldownsRef.current[spell.id] || 0;
    if (Date.now() < cdEnd) return false;
    if (spell.ammoCost && (ammoRef.current[spell.ammoCost.type] || 0) < spell.ammoCost.amount) return false;
    return true;
  };

  const castSummon = useCallback((mercType) => {
    const spell = SPELLS.find(s => s.id === "summon");
    if (!spell) return;
    setSummonPicker(false);
    // Check cooldown
    const cdEnd = cooldowns[spell.id] || 0;
    if (Date.now() < cdEnd) { showMessage("Akcja jeszcze nie gotowa!", "#cc8040"); return; }
    // Check money cost
    const tc = totalCopper(money);
    const need = totalCopper(mercType.cost);
    if (tc < need) { showMessage("Za mało monet na przywołanie!", "#b83030"); return; }
    setMoney(copperToMoney(tc - need));
    setCooldowns(prev => ({ ...prev, [spell.id]: Date.now() + spell.cooldown }));
    sfxRecruit();
    if (animatorRef.current) {
      animatorRef.current.playSpell("summon", GAME_W * 0.5, GAME_H * 0.25, mercType.color || spell.color, spell.colorLight);
    }
    setTimeout(() => {
      const wid = ++walkerIdCounter;
      const inDef = !!defenseModeRef.current;
      const spawnX = inDef ? 35 + Math.random() * 30 : 5 + Math.random() * 8;
      const lvl = KNIGHT_LEVELS[knightLevel];
      const mult = lvl.mult || 1;
      const stoneBonus = (hasRelic("stone_skin") ? 30 : 0) + (hasSynergy("twierdza") ? 30 : 0) + perkMercHpBonus;
      const hpBuff = eventMercHpBuffRef.current || 0;
      const dmgBuff = eventMercDmgBuffRef.current || 0;
      const finalHp = Math.round(mercType.hp * mult) + stoneBonus + hpBuff;
      const finalDmg = Math.round(mercType.damage * mult) + dmgBuff;
      const npcData = {
        icon: mercType.icon, name: mercType.name,
        hp: finalHp, resist: null, loot: {},
        bodyColor: mercType.bodyColor, armorColor: mercType.armorColor,
        weapon: mercType.weapon,
      };
      setWalkers(prev => [...prev, {
        id: wid, npcData, alive: true, dying: false, hp: finalHp, maxHp: finalHp, friendly: true,
      }]);
      walkDataRef.current[wid] = {
        x: spawnX, y: inDef ? 75 + Math.random() * 15 : 25 + Math.random() * 65, dir: inDef ? -1 : Math.random() < 0.5 ? 1 : -1,
        yDir: Math.random() < 0.5 ? 1 : -1, speed: mercType.speed, ySpeed: 0.008 + Math.random() * 0.012,
        minX: 5, maxX: 90, minY: 25, maxY: 92, bouncePhase: 0, alive: true, friendly: true,
        damage: finalDmg, attackCd: mercType.attackCd || 2500,
        lungeFrames: 0, lungeOffset: 0,
        combatStyle: mercType.combatStyle || "melee",
        mercType: mercType.id,
        range: mercType.range || 35,
        // Mage fields
        currentMana: mercType.mana || 0,
        maxMana: mercType.mana || 0,
        manaRegen: mercType.manaRegen || 0,
        spellCost: mercType.spellCost || 0,
        spellDamage: Math.round((mercType.spellDamage || 0) * mult),
        spellCd: mercType.spellCd || 3500,
        spellElement: mercType.spellElement || null,
        meleeDamage: Math.round((mercType.meleeDamage || mercType.damage) * mult),
        // Archer fields
        projectileDamage: Math.round((mercType.projectileDamage || 0) * mult),
        projectileCd: mercType.projectileCd || 1800,
        // Rogue crit fields
        critChance: mercType.critChance || 0,
        critMult: mercType.critMult || 1,
      };
      if (physicsRef.current) physicsRef.current.spawnNpc(wid, spawnX, npcData, true);
      showMessage(`${mercType.name} przyzwany! (${lvl.name})`, "#40e060");
    }, 500);
  }, [money, cooldowns, knightLevel, showMessage]);

  // ─── SKILLSHOT: Process damage when a player skillshot projectile hits an enemy ───
  const processSkillshotHit = useCallback((spell, walkerId, damage, element, isHeadshot) => {
    setWalkers(prev => prev.map(w => {
      if (w.id !== walkerId || !w.alive || w.dying) return w;
      const npcData = w.npcData;
      const resistant = npcData.resist && npcData.resist === element;
      const spellUps = spellUpgradesRef.current[spell.id] || [];
      const upgradedStats = getUpgradedSpellStats(spell, spellUps);
      let dmg = Math.round(upgradedStats.damage * (resistant ? RESIST_MULT : 1));
      dmg = applyWeatherDamage(dmg, element, weatherRef.current);
      dmg = applyModifierDamage(dmg, element, biomeModifierRef.current);
      if (hasRelic("chaos_blade")) dmg = Math.round(dmg * 1.40);
      if (hasRelic("mermaid_tear") && element === "ice") dmg = Math.round(dmg * 1.25);
      dmg = Math.round(dmg * getKnowledgeBonus(npcData.id) * getKnowledgeMilestoneBonus() * getBestiaryKillBonus(npcData.name));
      dmg = Math.round(dmg * perkSpellDmgMult);
      // Moonblade: bonus spell/skill damage (0-60%)
      if (equippedSaberRef.current === "moonblade" && moonbladeBonusRef.current) {
        dmg = Math.round(dmg * (1 + moonbladeBonusRef.current.spellBonus));
      }
      if (playerDoubleDmgRoomsRef.current > 0) dmg = Math.round(dmg * 2);
      if (secretPermDmgBuffRef.current > 0) dmg = Math.round(dmg * (1 + secretPermDmgBuffRef.current));
      if (secretSpellBuffRoomsRef.current > 0 && secretSpellBuffMultRef.current > 0) dmg = Math.round(dmg * (1 + secretSpellBuffMultRef.current));
      if (artifactDmgMultRef.current !== 1) dmg = Math.round(dmg * artifactDmgMultRef.current);

      // Headshot bonus: +50% damage
      if (isHeadshot) dmg = Math.round(dmg * (1 + HEADSHOT_BONUS));

      // Challenge: headshot_streak
      if (isHeadshot && roomChallengeRef.current?.id === "headshot_streak" && !roomChallengeRef.current.completed) {
        setRoomChallenge(prev => {
          if (!prev || prev.completed) return prev;
          const p = prev.progress + 1;
          if (p >= prev.target) {
            addMoneyFn(prev.reward);
            showMessage(`Wyzwanie ukończone: ${prev.name}! ${prev.rewardLabel}`, "#ffd700");
            return { ...prev, progress: p, completed: true };
          }
          return { ...prev, progress: p };
        });
      }

      // Accuracy streak bonus
      if (accuracyStreakRef.current >= ACCURACY_COMBO_THRESHOLD) {
        dmg = Math.round(dmg * (1 + ACCURACY_COMBO_BONUS));
      }

      // Height advantage: bonus/penalty based on elevation difference (iso mode)
      if (isoModeRef.current && terrainDataRef.current?.heightMap) {
        const _cp = caravanPosRef.current;
        const _wd = walkDataRef.current[walkerId];
        if (_cp && _wd) {
          const heightAdv = calcHeightAdvantage(_cp.x, _cp.y, _wd.x, _wd.y, terrainDataRef.current.heightMap);
          dmg = Math.round(dmg * heightAdv.damageMult);
        }
      }

      // Element combo system
      let comboText = null;
      const prevDebuff = elementDebuffs.current[walkerId];
      if (prevDebuff && element && prevDebuff.element !== element && Date.now() - prevDebuff.timestamp < 5000) {
        const comboKey = [prevDebuff.element, element].sort().join("+");
        const combo = COMBOS[comboKey];
        if (combo) {
          const streakBonus = Math.min(COMBO_STREAK_CAP, comboCounterRef.current * COMBO_STREAK_BONUS);
          dmg = Math.round(dmg * (combo.mult + streakBonus));
          comboText = combo;
          setComboCounter(prev => { const nc = prev + 1; updateComboLevel(nc); return nc; });
          setActiveCombo(combo);
          if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
          comboTimerRef.current = setTimeout(() => { setComboCounter(0); setActiveCombo(null); updateComboLevel(0); }, COMBO_STREAK_TIMEOUT);
          // Challenge: combo_master
          if (roomChallengeRef.current?.id === "combo_master" && !roomChallengeRef.current.completed) {
            setRoomChallenge(prev => {
              if (!prev || prev.completed) return prev;
              const p = prev.progress + 1;
              if (p >= prev.target) {
                addMoneyFn(prev.reward);
                showMessage(`Wyzwanie ukończone: ${prev.name}! ${prev.rewardLabel}`, "#ffd700");
                return { ...prev, progress: p, completed: true };
              }
              return { ...prev, progress: p };
            });
          }
        }
      }
      if (element) elementDebuffs.current[walkerId] = { element, timestamp: Date.now() };
      const wd = walkDataRef.current[walkerId];
      const _dirCenter = isoModeRef.current ? ISO_CONFIG.MAP_COLS / 2 : 50;
      const spellDirX = wd ? (wd.x > _dirCenter ? 1 : -1) : 1;

      // Apply combo status effects (stun, burn, fear)
      if (comboText && comboText.status && wd) {
        const statusNow = Date.now();
        if (comboText.status === "stun") {
          if (!wd._origSpeed) wd._origSpeed = wd.speed;
          wd.speed = 0;
          wd._stunnedUntil = statusNow + comboText.statusDuration;
          spawnDmgPopup(walkerId, "OGŁUSZONY!", "#80d0ff");
          setTimeout(() => {
            const wdLater = walkDataRef.current[walkerId];
            if (wdLater && wdLater._stunnedUntil) {
              wdLater.speed = wdLater._origSpeed || 0.02;
              delete wdLater._origSpeed; delete wdLater._stunnedUntil;
            }
          }, comboText.statusDuration);
        } else if (comboText.status === "burn") {
          wd._burnDps = comboText.statusDps;
          wd._burnUntil = statusNow + comboText.statusDuration;
          spawnDmgPopup(walkerId, "PODPALENIE!", "#ff6020");
        } else if (comboText.status === "fear") {
          if (!wd._origSpeed) wd._origSpeed = wd.speed;
          wd._fearUntil = statusNow + comboText.statusDuration;
          wd._fearDir = wd.x > _dirCenter ? 1 : -1; // flee away from center
          spawnDmgPopup(walkerId, "STRACH!", "#a040a0");
          setTimeout(() => {
            const wdLater = walkDataRef.current[walkerId];
            if (wdLater && wdLater._fearUntil) {
              if (wdLater._origSpeed) { wdLater.speed = wdLater._origSpeed; delete wdLater._origSpeed; }
              delete wdLater._fearUntil; delete wdLater._fearDir;
            }
          }, comboText.statusDuration);
        }
      }

      // Apply burn from fire spells (10% chance per hit)
      if (element === "fire" && wd && !wd._burnUntil && Math.random() < 0.15) {
        wd._burnDps = 5;
        wd._burnUntil = Date.now() + 3000;
        spawnDmgPopup(walkerId, "PODPALENIE!", "#ff6020");
      }

      // Terrain effects from elemental skillshot impacts (iso mode)
      if (isoModeRef.current && terrainDataRef.current && wd && element) {
        const _impactCol = Math.floor(wd.x);
        const _impactRow = Math.floor(wd.y ?? ISO_CONFIG.MAP_ROWS / 2);
        const _td = terrainDestructionRef.current;
        const _tData = terrainDataRef.current;
        if (element === "ice") {
          // Ice spells freeze nearby water tiles
          _td.freezeWaterAt(_impactCol, _impactRow, _tData);
        } else if (element === "fire") {
          // Fire spells burn nearby vegetation
          const _veg = _tData.vegetation;
          if (_veg) {
            for (const v of _veg) {
              if (!v.alive || !v.destructible) continue;
              const vdx = v.col - _impactCol, vdy = v.row - _impactRow;
              if (vdx * vdx + vdy * vdy <= 4) { // within 2 tiles
                _td.burnVegetation(v.id, _tData);
                break; // burn one tree per hit
              }
            }
          }
        }
      }

      if (resistant) {
        const resistLabel = RESIST_NAMES[npcData.resist] || npcData.resist;
        showMessage(`${npcData.name} odporny na ${resistLabel}! (-70% obrażeń)`, "#6688aa");
      }
      if (comboText) {
        showMessage(`COMBO: ${comboText.name}! (x${comboText.mult.toFixed(1)})`, comboText.color);
      }

      // Show damage popup
      let dmgLabel = `${dmg}`;
      let dmgColor = spell.color;
      if (isHeadshot) { dmgLabel = `HEADSHOT! ${dmg}`; dmgColor = "#ff4040"; sfxHeadshotConfirm(); }
      else if (comboText) { dmgLabel = `COMBO x${comboCounter}! ${dmg}`; dmgColor = comboText.color; }
      else if (resistant) { dmgLabel = `${dmg} BLOK`; dmgColor = "#6688aa"; }
      spawnDmgPopup(walkerId, dmgLabel, dmgColor);

      // blood_weapon relic
      if (hasRelic("blood_weapon")) {
        const friendlies = prev.filter(ww => ww.alive && !ww.dying && ww.friendly && ww.hp < ww.maxHp);
        if (friendlies.length > 0) {
          const target = friendlies[Math.floor(Math.random() * friendlies.length)];
          const healMult = hasSynergy("desperacka_krew") && target.hp / target.maxHp < 0.30 ? 0.30 : 0.15;
          const healAmt = Math.round(dmg * healMult);
          setTimeout(() => {
            setWalkers(pr => pr.map(ww => ww.id === target.id ? { ...ww, hp: Math.min(ww.maxHp, ww.hp + healAmt) } : ww));
            spawnDmgPopup(target.id, `+${healAmt}`, "#40e060");
          }, 50);
        }
      }

      // storm_echo chain
      const chainChance = hasSynergy("burzowy_szal") ? 0.50 : 0.30;
      if (hasRelic("storm_echo") && element === "lightning" && Math.random() < chainChance) {
        const otherEnemies = prev.filter(ww => ww.alive && !ww.dying && !ww.friendly && ww.id !== walkerId);
        if (otherEnemies.length > 0) {
          const chain = otherEnemies[Math.floor(Math.random() * otherEnemies.length)];
          const chainDmg = Math.round(dmg * 0.60);
          spawnDmgPopup(chain.id, `${chainDmg}`, "#60c0ff");
          setTimeout(() => {
            setWalkers(pr => pr.map(ww => {
              if (ww.id !== chain.id) return ww;
              const nhp = Math.max(0, ww.hp - chainDmg);
              if (nhp <= 0) {
                sfxNpcDeath();
                if (walkDataRef.current[ww.id]) walkDataRef.current[ww.id].alive = false;
                addMoneyFn(ww.npcData.loot || {});
                if (hasRelic("golden_reaper")) addMoneyFn(ww.npcData.loot || {});
                setKills(k => k + 1);
                setTimeout(() => setWalkers(ppr => ppr.filter(www => www.id !== ww.id)), 2500);
                return { ...ww, hp: 0, dying: true, dyingAt: Date.now() };
              }
              return { ...ww, hp: nhp };
            }));
          }, 100);
        }
      }

      // Drain: heal mana
      if (spell.id === "drain") {
        const healAmount = Math.round(dmg * 0.5);
        setMana(m => Math.min(MAX_MANA, m + healAmount));
        showMessage(`Zrabowano ${healAmount} prochu!`, "#c02060");
      }

      const newHp = Math.max(0, w.hp - dmg);
      // Meteor boulder wave check
      if (w.isMeteorBoulder) checkMeteorWaveThreshold(walkerId, w.hp, newHp);
      // Sync boss HP immediately on any damage
      if (w.isBoss && activeBossRef.current) {
        setActiveBoss(prev => prev ? { ...prev, currentHp: newHp } : null);
      }
      if (newHp <= 0) {
        sfxNpcDeath();
        if (walkDataRef.current[walkerId]) walkDataRef.current[walkerId].alive = false;
        if (physicsRef.current) physicsRef.current.triggerRagdoll(walkerId, getDeathElement(spell), spellDirX);
        // Meteor boulder destruction: ground loot instead of normal loot
        if (w.isMeteorBoulder && meteorWaveRef.current) {
          spawnMeteorGroundLoot(meteorWaveRef.current.x, meteorWaveRef.current.y);
          meteorWaveRef.current = null;
          setMeteorite(null);
        } else {
          addMoneyFn(npcData.loot);
          if (hasRelic("golden_reaper")) addMoneyFn(npcData.loot);
        }
        if (hasSynergy("piracki_monopol") && Math.random() < 0.20) {
          const bt = pickTreasure(roomRef.current);
          bt.biome = "Monopol"; bt.room = room;
          setInventory(prev2 => [...prev2, bt]);
        }
        if (perkLootMult > 1 && npcData.loot) {
          const bonusCu = Math.round((npcData.loot.copper || 0) * (perkLootMult - 1));
          if (bonusCu > 0) addMoneyFn({ copper: bonusCu });
        }
        setKills(k => k + 1);
        handleCardDrop(npcData);
        { const _wd = walkDataRef.current[w.id]; rollAmmoDrop(_wd?.wx ?? _wd?.x, _wd?.wy ?? _wd?.y); rollSaberDrop(_wd?.wx ?? _wd?.x, _wd?.wy ?? _wd?.y); }
        const xpAmt = w.isBoss ? 100 : w.isElite ? 50 : 10 + roomRef.current * 2;
        grantXp(xpAmt);
        processKillStreak();
        // Biome modifier: kill_heal (blue_lagoon — heal caravan on kills in zone)
        const killMod = biomeModifierRef.current?.effect;
        if (killMod?.type === "kill_heal") {
          const wd = walkDataRef.current[walkerId];
          const inZone = !killMod.zoneRequired || (killMod.zoneRequired === "bottom" && wd && wd.y > (100 - (killMod.zoneSize || 40)));
          if (inZone) {
            setCaravanHp(prev2 => Math.min(CARAVAN_LEVELS[caravanLevelRef.current].hp, prev2 + killMod.healPerKill));
            showMessage(`${biomeModifierRef.current.name}: +${killMod.healPerKill} HP!`, "#40e0e0");
          }
        }
        // Biome modifier: zombie_respawn (underworld — 15% respawn as weakened zombie)
        if (killMod?.type === "zombie_respawn" && Math.random() < (killMod.respawnChance || 0) && !w.isZombie) {
          const wd = walkDataRef.current[walkerId];
          setTimeout(() => {
            const zid = ++walkerIdCounter;
            const zx = wd?.x || (isoModeRef.current ? ISO_CONFIG.MAP_COLS / 2 : 50);
            const zy = wd?.y || (isoModeRef.current ? ISO_CONFIG.MAP_ROWS / 2 : 50);
            const zNpc = { ...npcData, name: `Zombie ${npcData.name}`, hp: Math.round(npcData.hp * (killMod.respawnHpMult || 0.4)), loot: {}, isIllusion: false };
            zNpc.hp = Math.max(1, zNpc.hp);
            setWalkers(pr => [...pr, { id: zid, npcData: zNpc, alive: true, dying: false, hp: zNpc.hp, maxHp: zNpc.hp, isZombie: true }]);
            walkDataRef.current[zid] = { x: zx, y: zy, dir: Math.random() < 0.5 ? -1 : 1, yDir: 1, speed: 0.008, ySpeed: 0.008, minX: 5, maxX: 98, minY: 25, maxY: 92, bouncePhase: 0, alive: true, friendly: false, damage: Math.ceil(zNpc.hp / 6 * (killMod.respawnDmgMult || 0.5)), lungeFrames: 0, lungeOffset: 0, ability: null, attackCd: 3500 };
            if (physicsRef.current) physicsRef.current.spawnNpc(zid, zx, zNpc, false, zy);
            showMessage("Zombie odrodzony!", "#8040c0");
          }, killMod.respawnDelay || 8000);
        }

        // Check if last enemy in wave → slow motion effect
        const aliveEnemies = prev.filter(ww => ww.alive && !ww.dying && !ww.friendly && ww.id !== walkerId);
        if (aliveEnemies.length === 0) {
          setSlowMotion(true);
          setTimeout(() => setSlowMotion(false), 1000);
          // Challenge completion for non-defense rooms
          const ch = roomChallengeRef.current;
          if (ch && !ch.completed && !ch.failed && !defenseModeRef.current) {
            if (ch.id === "speed_kill" && Date.now() - ch.startTime <= ch.timer) {
              addMoneyFn(ch.reward);
              showMessage(`Wyzwanie ukończone: ${ch.name}! ${ch.rewardLabel}`, "#ffd700");
              setRoomChallenge(prev2 => prev2 ? { ...prev2, completed: true } : prev2);
            }
            if (ch.id === "no_mana") {
              const rewardAmmo = ch.reward;
              if (rewardAmmo) setAmmo(am => {
                const upd = { ...am };
                for (const [k, v] of Object.entries(rewardAmmo)) upd[k] = (upd[k] || 0) + v;
                return upd;
              });
              showMessage(`Wyzwanie ukończone: ${ch.name}! ${ch.rewardLabel}`, "#ffd700");
              setRoomChallenge(prev2 => prev2 ? { ...prev2, completed: true } : prev2);
            }
          }
        }

        showMessage(`${npcData.name} pokonany! +${formatLootText(npcData.loot)}`, "#e05040");
        setTimeout(() => setWalkers(pr => pr.map(ww => ww.id === walkerId ? { ...ww, alive: false } : ww)), 2500);
        return { ...w, hp: 0, dying: true, dyingAt: Date.now() };
      }
      // Sync boss HP bar immediately on damage
      if (w.isBoss && activeBossRef.current) {
        setActiveBoss(prev => prev ? { ...prev, currentHp: newHp } : null);
      }
      if (physicsRef.current) physicsRef.current.applyHit(walkerId, element, spellDirX);
      return { ...w, hp: newHp };
    }));
  }, [mana, addMoneyFn, showMessage, spawnDmgPopup]);

  // ─── TERRAIN IMPACT: callback for physics engine when splash projectile detonates ───
  const _terrainImpactCb = useCallback((impactPx, impactPy, splashRadius, element) => {
    if (!isoModeRef.current || !terrainDataRef.current) return;
    const _blastWx = (impactPx / GAME_W) * ISO_CONFIG.MAP_COLS;
    const _blastWy = (impactPy / GAME_H) * ISO_CONFIG.MAP_ROWS;
    const _blastR = (splashRadius || 8) / GAME_W * ISO_CONFIG.MAP_COLS * 2;
    terrainDestructionRef.current.applyExplosion(
      _blastWx, _blastWy, Math.max(1.5, Math.min(4, _blastR)),
      element || "fire", terrainDataRef.current
    );
    walkGridRef.current = buildWalkGrid(terrainDataRef.current);
  }, []);

  // ─── SKILLSHOT: Fire a skillshot projectile toward target coordinates ───
  const castSkillshot = useCallback((spell, targetPx, targetPy) => {
    if (!canCastSpell(spell)) {
      if (spell.ammoCost && (ammoRef.current[spell.ammoCost.type] || 0) < spell.ammoCost.amount) {
        const ammoNames = { dynamite: "dynamitu", harpoon: "harpunów", cannonball: "kul armatnich", rum: "rumu", chain: "łańcuchów" };
        showMessage(`Brak ${ammoNames[spell.ammoCost.type] || "amunicji"}!`, "#c04040");
      } else if (manaRef.current < getSpellManaCost(spell)) showMessage("Za mało prochu!", "#c0a060");
      else showMessage("Akcja jeszcze nie gotowa!", "#cc8040");
      return;
    }
    // Double-check mana via ref to prevent negative values in rapid fire
    const manaCost = getSpellManaCost(spell);
    if (manaRef.current < manaCost) {
      showMessage("Za mało prochu!", "#c0a060");
      return;
    }

    // Engage combat on first player attack
    if (!combatEngagedRef.current) combatEngagedRef.current = true;

    // Challenge: no_mana — fail if mana is used
    if (roomChallengeRef.current?.id === "no_mana" && !roomChallengeRef.current.completed && !roomChallengeRef.current.failed && manaCost > 0) {
      setRoomChallenge(prev => prev ? { ...prev, failed: true } : prev);
    }
    // Spend mana & set cooldown — compute upgrade stats once
    manaRef.current -= manaCost; // immediately update ref to prevent double-spend
    setMana(m => Math.max(0, m - manaCost));
    const _skUps = spellUpgradesRef.current[spell.id] || [];
    const _skStats = getUpgradedSpellStats(spell, _skUps);
    if (spell.ammoCost) {
      const freeAmmo = hasSynergy("duch_prochu") || (hasRelic("phantom_coin") && Math.random() < 0.30);
      if (!freeAmmo) {
        const ammoCost = Math.max(1, spell.ammoCost.amount - _skStats.ammoCostReduction);
        // Immediately update ammo ref to prevent double-spend
        ammoRef.current = { ...ammoRef.current, [spell.ammoCost.type]: (ammoRef.current[spell.ammoCost.type] || 0) - ammoCost };
        setAmmo(prev => ({ ...prev, [spell.ammoCost.type]: (prev[spell.ammoCost.type] || 0) - ammoCost }));
      }
    }
    {
      const finalCd = Math.round(_skStats.cooldown * perkCooldownMult * artifactCooldownMultRef.current);
      // Immediately update cooldown ref to prevent double-fire between React renders
      cooldownsRef.current = { ...cooldownsRef.current, [spell.id]: Date.now() + finalCd };
      setCooldowns(prev => ({ ...prev, [spell.id]: Date.now() + finalCd }));
    }

    const sfxFn = SPELL_SFX[spell.id];
    if (sfxFn) sfxFn();

    // Screen shake for area spells (meteor/blizzard), NOT for mine placement
    const cfg = SKILLSHOT_TYPES[spell.id];
    if (cfg && cfg.type === "area") {
      setScreenShake(true);
      setTimeout(() => setScreenShake(false), 200);
    }

    // Spawn skillshot projectile in physics (reuse pre-computed _skStats)
    if (physicsRef.current) {
      physicsRef.current.spawnPlayerSkillshot(
        spell.id, targetPx, targetPy,
        _skStats.damage, spell.element,
        // onHit callback
        (hitId, damage, element, isHeadshot) => {
          // Track accuracy
          setAccuracy(prev => ({
            ...prev,
            hits: prev.hits + 1,
            headshots: isHeadshot ? prev.headshots + 1 : prev.headshots,
          }));
          setAccuracyStreak(prev => prev + 1);

          if (isHeadshot) {
            showMessage("HEADSHOT! +50% obrażeń!", "#ff4040");
          }

          // Challenge: full_accuracy
          if (roomChallengeRef.current?.id === "full_accuracy" && !roomChallengeRef.current.completed) {
            setRoomChallenge(prev => {
              if (!prev || prev.completed) return prev;
              const p = prev.progress + 1;
              if (p >= prev.target) {
                const rewardAmmo = prev.reward;
                if (rewardAmmo) setAmmo(am => {
                  const upd = { ...am };
                  for (const [k, v] of Object.entries(rewardAmmo)) upd[k] = (upd[k] || 0) + v;
                  return upd;
                });
                showMessage(`Wyzwanie ukończone: ${prev.name}! ${prev.rewardLabel}`, "#ffd700");
                return { ...prev, progress: p, completed: true };
              }
              return { ...prev, progress: p };
            });
          }

          // Accuracy combo notification
          if (accuracyStreakRef.current + 1 >= ACCURACY_COMBO_THRESHOLD && (accuracyStreakRef.current + 1) % ACCURACY_COMBO_THRESHOLD === 0) {
            showMessage(`Celność x${accuracyStreakRef.current + 1}! +25% obrażeń!`, "#ffd700");
          }

          processSkillshotHit(spell, hitId, damage, element, isHeadshot);
        },
        // onMiss callback
        () => {
          setAccuracy(prev => ({ ...prev, misses: prev.misses + 1 }));
          setAccuracyStreak(0);
          // Challenge: full_accuracy fails on miss
          if (roomChallengeRef.current?.id === "full_accuracy" && !roomChallengeRef.current.completed) {
            setRoomChallenge(prev => prev ? { ...prev, progress: 0 } : prev);
          }
          // Visual feedback for miss
          showMessage("Pudło!", "#888888");
        },
        // onHeadshot callback (special headshot handling)
        (hitId, damage, element) => {
          setAccuracy(prev => ({ ...prev, hits: prev.hits + 1, headshots: prev.headshots + 1 }));
          setAccuracyStreak(prev => prev + 1);
          showMessage("HEADSHOT! +50% obrażeń!", "#ff4040");
          processSkillshotHit(spell, hitId, damage, element, true);
        },
        panOffsetRef.current,
        // Iso mode: fire from caravan position — projectiles arc from caravan toward target
        isoModeRef.current ? (() => {
          const _cp = caravanPosRef.current;
          return {
            x: (_cp.x / ISO_CONFIG.MAP_COLS) * GAME_W,
            y: (_cp.y / ISO_CONFIG.MAP_ROWS) * GAME_H,
          };
        })() : null,
        _terrainImpactCb
      );
    }

    // Projectile visuals are handled by ProjectileRenderer (PixiJS) —
    // no need for duplicate biomeAnimator canvas effects

    // Keep spell selected for repeated shots (don't deselect)
    // setSelectedSpell(null); -- removed: keep spell active for continuous skillshots
  }, [mana, cooldowns, showMessage, processSkillshotHit, spawnDmgPopup]);

  // ─── PANORAMIC SCROLLING: Drag to look around when no action selected ───
  // In iso mode, always allow camera panning (even during defense waves) so player can survey the battlefield
  const canPanScroll = !skillshotMode && !placingTrap && !showFortMenu && (isoModeRef.current || !defenseMode || defenseMode.phase === "complete" || defenseMode.phase === "setup");

  // Convenience: wrap percentage position using current pan offset
  const wrapPctToScreen = useCallback(
    (pct) => _wrapPct(pct, panOffsetRef.current, GAME_W),
    [GAME_W]
  );
  // Convert iso or panoramic coords to screen pixel position { x, y } or null
  const poiToScreenPos = useCallback((poiX, poiY) => {
    if (isoModeRef.current) {
      const cam = isoCameraRef.current;
      const screen = _isoWorldToScreen(poiX, poiY ?? ISO_CONFIG.MAP_ROWS / 2, cam.x, cam.y);
      if (screen.x < -80 || screen.x > GAME_W + 80) return null;
      return screen;
    }
    const sx = _wrapPct(poiX, panOffsetRef.current, GAME_W);
    return sx !== null ? { x: (sx / 100) * GAME_W, y: (poiY ?? 50) / 100 * GAME_H } : null;
  }, [GAME_W]);
  // Get CSS left position for a POI (iso: pixel, panoramic: percentage)
  const poiLeft = useCallback((x, y) => {
    if (isoModeRef.current) {
      const cam = isoCameraRef.current;
      const screen = _isoWorldToScreen(x, y ?? ISO_CONFIG.MAP_ROWS / 2, cam.x, cam.y);
      if (screen.x < -100 || screen.x > GAME_W + 100) return null;
      return `${screen.x}px`;
    }
    const sx = _wrapPct(x, panOffsetRef.current, GAME_W);
    return sx !== null ? `${sx}%` : null;
  }, [GAME_W]);
  // Get CSS top position for a POI (iso: pixel, panoramic: percentage)
  const poiTop = useCallback((x, y) => {
    if (isoModeRef.current) {
      const cam = isoCameraRef.current;
      const screen = _isoWorldToScreen(x, y ?? ISO_CONFIG.MAP_ROWS / 2, cam.x, cam.y);
      return `${screen.y}px`;
    }
    return `${y ?? 50}%`;
  }, [GAME_W]);
  const poiZIndex = useCallback((x, y) => {
    if (isoModeRef.current) return 14 + Math.round(((x || 0) + (y || 20)) * 1.2);
    return 14;
  }, []);

  const handlePanStart = useCallback((e) => {
    if (!canPanScroll) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    panRef.current = {
      dragging: true,
      startX: clientX, startY: clientY,
      startOffset: panOffsetRef.current,
      startCamX: isoCameraRef.current.x,
      startCamY: isoCameraRef.current.y,
    };
  }, [canPanScroll]);

  const handlePanMove = useCallback((e) => {
    if (!panRef.current.dragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    if (isoModeRef.current) {
      // Isometric: drag moves camera in 2D
      const dx = (panRef.current.startX - clientX) / gameScale;
      const dy = (panRef.current.startY - clientY) / gameScale;
      const cam = isoCameraRef.current;
      cam.setPosition(panRef.current.startCamX + dx, panRef.current.startCamY + dy);
      if (pixiRef.current) pixiRef.current.setIsoCamera(cam.x, cam.y);
      // Re-render canvas
      if (canvasRef.current && biome) {
        const c = canvasRef.current;
        const ctx = c.getContext("2d");
        ctx.clearRect(0, 0, GAME_W, GAME_H);
        renderIsoBiome(ctx, biome, room, c.width, c.height, isNight, cam.x, cam.y, caravanPosRef.current, !!placingFortRef.current, terrainDataRef.current?.heightMap);
        if (terrainDataRef.current) {
          renderTerrainOverlays(ctx, terrainDataRef.current, cam.x, cam.y, true, terrainDestructionRef.current, mapResourcesRef.current, chokepointsRef.current);
        }
      }
    } else {
      const dx = (panRef.current.startX - clientX) / gameScale;
      const newOffset = panRef.current.startOffset + dx;
      panOffsetRef.current = newOffset;
      if (pixiRef.current) pixiRef.current.setPanOffset(newOffset);
      if (canvasRef.current && biome) {
        const c = canvasRef.current;
        const ctx = c.getContext("2d");
        renderBiome(ctx, biome, room, c.width, c.height, isNight, newOffset);
      }
    }
    // Sync React state (throttled via rAF)
    if (!panRef.current._rafPending) {
      panRef.current._rafPending = true;
      requestAnimationFrame(() => {
        panRef.current._rafPending = false;
        if (panRef.current.dragging) {
          setPanOffset(panOffsetRef.current);
        }
      });
    }
  }, [gameScale, biome, room, isNight]);

  const handlePanEnd = useCallback(() => {
    panRef.current.dragging = false;
    setPanOffset(panOffsetRef.current);
    if (isoModeRef.current) {
      const cam = isoCameraRef.current;
      if (pixiRef.current) pixiRef.current.setIsoCamera(cam.x, cam.y);
    } else {
      if (pixiRef.current) pixiRef.current.setPanOffset(panOffsetRef.current);
    }
  }, []);

  // ─── CARAVAN MOVEMENT: Click to select, click map to move, right-click/Esc to deselect ───
  const handleCaravanClick = useCallback((e) => {
    e.stopPropagation();
    if (!isoModeRef.current) return;
    // Always select caravan on click (deselect only via right-click)
    if (!caravanSelectedRef.current) {
      setCaravanSelected(true);
    }
    // If already selected, click does nothing (use right-click to deselect)
  }, []);

  // Right-click deselects caravan
  const handleCaravanRightClick = useCallback((e) => {
    if (caravanSelectedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      setCaravanSelected(false);
      caravanMoveRef.current.active = false;
    }
  }, []);

  const handleCaravanMoveClick = useCallback((e) => {
    // Only intercept clicks when caravan is selected and no spell is active
    if (!caravanSelectedRef.current || !isoModeRef.current || !gameContainerRef.current) return false;
    if (selectedSpell && skillshotMode) return false;

    const gr = gameContainerRef.current.getBoundingClientRect();
    const screenX = (e.clientX - gr.left) / gameScale;
    const screenY = (e.clientY - gr.top) / gameScale;
    const cam = isoCameraRef.current;
    const world = _isoScreenToWorld(screenX, screenY, cam.x, cam.y);

    // Clamp to map bounds
    let tx = Math.max(1, Math.min(ISO_CONFIG.MAP_COLS - 2, world.x));
    let ty = Math.max(1, Math.min(ISO_CONFIG.MAP_ROWS - 2, world.y));

    // Check if target tile is walkable (not cliff or deep water)
    if (walkGridRef.current) {
      const tc = Math.floor(tx), tr = Math.floor(ty);
      const tileCost = walkGridRef.current[tr * ISO_CONFIG.MAP_COLS + tc];
      if (tileCost <= 0) {
        // Find nearest walkable tile
        let found = false;
        for (let r = 1; r <= 3 && !found; r++) {
          for (let dr = -r; dr <= r && !found; dr++) {
            for (let dc = -r; dc <= r && !found; dc++) {
              if (Math.abs(dr) !== r && Math.abs(dc) !== r) continue;
              const nc = tc + dc, nr = tr + dr;
              if (nc < 1 || nc >= ISO_CONFIG.MAP_COLS - 1 || nr < 1 || nr >= ISO_CONFIG.MAP_ROWS - 1) continue;
              if (walkGridRef.current[nr * ISO_CONFIG.MAP_COLS + nc] > 0) {
                tx = nc + 0.5; ty = nr + 0.5; found = true;
              }
            }
          }
        }
        if (!found) return false; // no walkable tile nearby
      }
    }

    caravanMoveRef.current = { active: true, targetX: tx, targetY: ty, speed: 2.5 };
    // Keep caravan selected so player can issue multiple movement orders
    return true;
  }, [gameScale, selectedSpell, skillshotMode]);

  // ─── SKILLSHOT: Canvas click handler for aiming ───
  const handleSkillshotClick = useCallback((e) => {
    if (!selectedSpell || !gameContainerRef.current) return;
    const spell = SPELLS.find(s => s.id === selectedSpell);
    if (!spell || !spell.skillshot) return;
    if (spell.id === "summon") return;

    // Get click position in game coordinates (screen space)
    const gr = gameContainerRef.current.getBoundingClientRect();
    const screenX = (e.clientX - gr.left) / gameScale;
    const clickY = (e.clientY - gr.top) / gameScale;

    if (isoModeRef.current) {
      // Isometric: convert screen click to world tile coords, then to physics percentage
      const cam = isoCameraRef.current;
      const isoWorld = _isoScreenToWorld(screenX, clickY, cam.x, cam.y);
      const targetPx = (isoWorld.x / ISO_CONFIG.MAP_COLS) * 100 * (GAME_W / 100);
      const targetPy = (isoWorld.y / ISO_CONFIG.MAP_ROWS) * 100 * (GAME_H / 100);
      castSkillshot(spell, targetPx, targetPy);
    } else {
      // Legacy panoramic mode
      const worldX = _screenToWorld(screenX, panOffsetRef.current, GAME_W);
      castSkillshot(spell, worldX, clickY);
    }
  }, [selectedSpell, gameScale, castSkillshot]);

  // ─── RAPID FIRE: Hold-to-fire for Strzał ───
  const rapidFireRef = useRef({ active: false, intervalId: null, lastPos: null });
  const isRapidFireMode = selectedSpell === "lightning" && skillshotMode;

  const startRapidFire = useCallback((e) => {
    if (!isRapidFireMode || !gameContainerRef.current) return;
    // Stop wand if active — can't use both simultaneously
    if (wandOrbsRef.current.active) {
      setWandActive(false);
      wandOrbsRef.current.active = false;
    }
    e.preventDefault();
    const spell = SPELLS.find(s => s.id === "lightning");
    if (!spell) return;
    const getPos = (ev) => {
      const gr = gameContainerRef.current.getBoundingClientRect();
      const cx = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const cy = ev.touches ? ev.touches[0].clientY : ev.clientY;
      const screenX = (cx - gr.left) / gameScale;
      const screenY = (cy - gr.top) / gameScale;
      if (isoModeRef.current) {
        const cam = isoCameraRef.current;
        const isoWorld = _isoScreenToWorld(screenX, screenY, cam.x, cam.y);
        return {
          x: (isoWorld.x / ISO_CONFIG.MAP_COLS) * 100 * (GAME_W / 100),
          y: (isoWorld.y / ISO_CONFIG.MAP_ROWS) * 100 * (GAME_H / 100),
        };
      }
      return { x: _screenToWorld(screenX, panOffsetRef.current, GAME_W), y: screenY };
    };
    const pos = getPos(e);
    rapidFireRef.current.lastPos = pos;
    // Fire immediately
    castSkillshot(spell, pos.x, pos.y);
    // Start interval for continuous fire
    const id = setInterval(() => {
      const p = rapidFireRef.current.lastPos;
      if (!p) return;
      const sp = SPELLS.find(s => s.id === "lightning");
      if (!sp) return;
      if (!canCastSpell(sp)) {
        // Out of gunpowder — stop rapid fire and notify
        if (manaRef.current <= 0) {
          showMessage("Za mało prochu!", "#c0a060");
          if (rapidFireRef.current.intervalId) clearInterval(rapidFireRef.current.intervalId);
          rapidFireRef.current = { active: false, intervalId: null, lastPos: null };
        }
        return;
      }
      castSkillshot(sp, p.x, p.y);
    }, 160); // ~6 shots/second
    rapidFireRef.current = { active: true, intervalId: id, lastPos: pos };
  }, [isRapidFireMode, gameScale, castSkillshot, canCastSpell, showMessage]);

  const moveRapidFire = useCallback((e) => {
    if (!rapidFireRef.current.active || !gameContainerRef.current) return;
    e.preventDefault();
    const gr = gameContainerRef.current.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    const screenX = (cx - gr.left) / gameScale;
    const screenY = (cy - gr.top) / gameScale;
    if (isoModeRef.current) {
      const cam = isoCameraRef.current;
      const isoWorld = _isoScreenToWorld(screenX, screenY, cam.x, cam.y);
      rapidFireRef.current.lastPos = {
        x: (isoWorld.x / ISO_CONFIG.MAP_COLS) * GAME_W,
        y: (isoWorld.y / ISO_CONFIG.MAP_ROWS) * GAME_H,
      };
    } else {
      rapidFireRef.current.lastPos = { x: _screenToWorld(screenX, panOffsetRef.current, GAME_W), y: screenY };
    }
  }, [gameScale]);

  const stopRapidFire = useCallback(() => {
    if (rapidFireRef.current.intervalId) clearInterval(rapidFireRef.current.intervalId);
    rapidFireRef.current = { active: false, intervalId: null, lastPos: null };
  }, []);

  // ─── WAND: Press-and-hold to orbit lightning orbs ───
  const isWandMode = selectedSpell === "wand" && hasWand;

  const startWand = useCallback((e) => {
    if (!isWandMode || !gameContainerRef.current) return;
    if (wandActiveRef.current) return;
    // Stop rapid fire and salva if active
    if (rapidFireRef.current.active) {
      if (rapidFireRef.current.intervalId) clearInterval(rapidFireRef.current.intervalId);
      rapidFireRef.current = { active: false, intervalId: null, lastPos: null };
    }
    if (salvaRef.current.active) { setSalvaActive(false); salvaRef.current.active = false; }
    e.preventDefault();
    const gr = gameContainerRef.current.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    const screenPx = (cx - gr.left) / gameScale;
    const screenPy = (cy - gr.top) / gameScale;
    let cursorX, cursorY;
    if (isoModeRef.current) {
      const cam = isoCameraRef.current;
      const isoW = _isoScreenToWorld(screenPx, screenPy, cam.x, cam.y);
      cursorX = isoW.x; cursorY = isoW.y; // tile coords (0-40)
    } else {
      const worldPx2 = _screenToWorld(screenPx, panOffsetRef.current, GAME_W);
      cursorX = (worldPx2 / GAME_W) * 100;
      cursorY = (screenPy / GAME_H) * 100;
    }
    if (!combatEngagedRef.current) combatEngagedRef.current = true;
    setWandActive(true);
    wandOrbsRef.current = { active: true, startTime: Date.now(), cursorX, cursorY, screenX: screenPx, screenY: screenPy, hitCooldowns: {}, lastDrainTime: Date.now() };
    sfxLightning();
  }, [isWandMode, gameScale]);

  const stopWand = useCallback(() => {
    if (!wandActiveRef.current) return;
    setWandActive(false);
    wandOrbsRef.current.active = false;
  }, []);

  // Stop wand when spell selection changes away from wand
  useEffect(() => {
    if (selectedSpell !== "wand" && wandOrbsRef.current.active) {
      setWandActive(false);
      wandOrbsRef.current.active = false;
    }
  }, [selectedSpell]);

  // Global mouseup/touchend to stop wand when user releases anywhere (not just game area)
  useEffect(() => {
    const handleGlobalRelease = () => {
      if (wandOrbsRef.current.active) {
        setWandActive(false);
        wandOrbsRef.current.active = false;
      }
    };
    window.addEventListener("mouseup", handleGlobalRelease);
    window.addEventListener("touchend", handleGlobalRelease);
    return () => {
      window.removeEventListener("mouseup", handleGlobalRelease);
      window.removeEventListener("touchend", handleGlobalRelease);
    };
  }, []);

  // ─── SALVA: Press-and-hold cannon barrage ───
  const isSalvaMode = selectedSpell === "meteor";

  const startSalva = useCallback((e) => {
    if (!isSalvaMode || !gameContainerRef.current) return;
    if (salvaActiveRef.current) return;
    // Stop other hold modes
    if (wandOrbsRef.current.active) { setWandActive(false); wandOrbsRef.current.active = false; }
    if (rapidFireRef.current.active) {
      if (rapidFireRef.current.intervalId) clearInterval(rapidFireRef.current.intervalId);
      rapidFireRef.current = { active: false, intervalId: null, lastPos: null };
    }
    e.preventDefault();
    const gr = gameContainerRef.current.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    const screenPx = (cx - gr.left) / gameScale;
    const screenPy = (cy - gr.top) / gameScale;
    let cursorX, cursorY;
    if (isoModeRef.current) {
      const cam = isoCameraRef.current;
      const iw = _isoScreenToWorld(screenPx, screenPy, cam.x, cam.y);
      cursorX = iw.x; cursorY = iw.y;
    } else {
      const worldPx2 = _screenToWorld(screenPx, panOffsetRef.current, GAME_W);
      cursorX = (worldPx2 / GAME_W) * 100;
      cursorY = (screenPy / GAME_H) * 100;
    }
    // Check initial resources
    if ((ammoRef.current.cannonball || 0) < 1) { showMessage("Brak kul armatnich!", "#c04040"); return; }
    if (manaRef.current < 5) { showMessage("Za mało prochu!", "#c0a060"); return; }
    setSalvaActive(true);
    salvaRef.current = { active: true, cursorX, cursorY, lastShotTime: 0, screenX: screenPx, screenY: screenPy };
  }, [isSalvaMode, gameScale]);

  const moveSalva = useCallback((e) => {
    if (!salvaRef.current.active) return;
    const gr = gameContainerRef.current?.getBoundingClientRect();
    if (!gr) return;
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    const sxPx = (cx - gr.left) / gameScale;
    const syPx = (cy - gr.top) / gameScale;
    // Always store screen pixel position for crosshair overlay
    salvaRef.current.screenX = sxPx;
    salvaRef.current.screenY = syPx;
    if (isoModeRef.current) {
      const cam = isoCameraRef.current;
      const iw = _isoScreenToWorld(sxPx, syPx, cam.x, cam.y);
      salvaRef.current.cursorX = iw.x; salvaRef.current.cursorY = iw.y;
    } else {
      const wxPx = _screenToWorld(sxPx, panOffsetRef.current, GAME_W);
      salvaRef.current.cursorX = (wxPx / GAME_W) * 100;
      salvaRef.current.cursorY = (syPx / GAME_H) * 100;
    }
  }, [gameScale]);

  const stopSalva = useCallback(() => {
    if (!salvaActiveRef.current) return;
    setSalvaActive(false);
    salvaRef.current.active = false;
  }, []);

  // Stop salva when spell selection changes
  useEffect(() => {
    if (selectedSpell !== "meteor" && salvaRef.current.active) {
      setSalvaActive(false);
      salvaRef.current.active = false;
    }
  }, [selectedSpell]);

  // Global release to stop salva
  useEffect(() => {
    const handleRelease = () => {
      if (salvaRef.current.active) { setSalvaActive(false); salvaRef.current.active = false; }
    };
    window.addEventListener("mouseup", handleRelease);
    window.addEventListener("touchend", handleRelease);
    return () => { window.removeEventListener("mouseup", handleRelease); window.removeEventListener("touchend", handleRelease); };
  }, []);

  // ─── SABER: Swipe handlers (Fruit Ninja style) ───
  const isSaberMode = selectedSpell === "saber" && skillshotMode;

  const saberGetGamePos = useCallback((e) => {
    if (!gameContainerRef.current) return null;
    const gr = gameContainerRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const screenPx = (clientX - gr.left) / gameScale;
    const gy = (clientY - gr.top) / gameScale;
    if (isoModeRef.current) {
      // Iso mode: convert screen click to world tile coords for hit testing
      const cam = isoCameraRef.current;
      const isoWorld = _isoScreenToWorld(screenPx, gy, cam.x, cam.y);
      return { x: isoWorld.x, y: isoWorld.y, px: screenPx, py: gy };
    }
    // Convert screen X to world X for hit detection against world-space objects
    const worldPx = _screenToWorld(screenPx, panOffsetRef.current, GAME_W);
    return { x: (worldPx / GAME_W) * 100, y: (gy / GAME_H) * 100, px: screenPx, py: gy };
  }, [gameScale]);

  const saberCheckHits = useCallback((x, y) => {
    const spell = SPELLS.find(s => s.id === "saber");
    if (!spell) return;
    const saberData = getEquippedSaberData();
    const eff = saberData.effect;
    // In iso mode, coords are tile-based (0-40), so hitRadius is in tiles
    // In panoramic, coords are percentage (0-100), so hitRadius is in percent
    const hitRadius = isoModeRef.current ? 2.5 : 6;
    const wd = walkDataRef.current;
    for (const w of walkersRef.current) {
      if (!w.alive || w.dying || w.friendly) continue;
      if (saberHitIdsRef.current.has(w.id)) continue;
      const d = wd[w.id];
      if (!d) continue;
      const dx = d.x - x, dy = d.y - y;
      if (dx * dx + dy * dy < hitRadius * hitRadius) {
        saberHitIdsRef.current.add(w.id);
        sfxSaberHit();
        // Crit chance: 20% to critically strike
        const isCrit = Math.random() < 0.20;
        // Base damage from equipped saber
        let dmg = saberData.damage;
        // Moonblade: bonus melee damage (0-60%)
        if (equippedSaberRef.current === "moonblade" && moonbladeBonusRef.current) {
          dmg = Math.round(dmg * (1 + moonbladeBonusRef.current.dmgBonus));
        }
        dmg = Math.round(dmg * perkSpellDmgMult);
        if (playerDoubleDmgRoomsRef.current > 0) dmg = Math.round(dmg * 2);
        if (secretPermDmgBuffRef.current > 0) dmg = Math.round(dmg * (1 + secretPermDmgBuffRef.current));
        if (artifactDmgMultRef.current !== 1) dmg = Math.round(dmg * artifactDmgMultRef.current);
        if (hasRelic("chaos_blade")) dmg = Math.round(dmg * 1.40);
        if (hasRelic("mermaid_tear") && saberData.element === "ice") dmg = Math.round(dmg * 1.25);
        if (isCrit) dmg = Math.round(dmg * 2.5);
        // Execute effect: 2x dmg below threshold
        if (eff?.type === "execute" && w.hp / w.maxHp <= eff.threshold) {
          dmg = Math.round(dmg * eff.multiplier);
          spawnDmgPopup(w.id, `EGZEKUCJA ${dmg}`, "#cc2020");
        } else if (isCrit) {
          spawnDmgPopup(w.id, `KRYTYCZNY! ${dmg}`, "#ff4040");
          sfxCriticalHit();
        } else {
          spawnDmgPopup(w.id, `${dmg}`, saberData.color);
        }
        // Convert NPC coords to pixel space for visual effects
        const px = isoModeRef.current ? (d.x / ISO_CONFIG.MAP_COLS) * GAME_W : (d.x / 100) * GAME_W;
        const py = isoModeRef.current ? (d.y / ISO_CONFIG.MAP_ROWS) * GAME_H : (d.y / 100) * GAME_H;
        const slashDir = isoModeRef.current ? (d.x > ISO_CONFIG.MAP_COLS / 2 ? 1 : -1) : (d.x > 50 ? 1 : -1);
        // Blood effect on every saber hit
        if (pixiRef.current) {
          if (isCrit) {
            pixiRef.current.spawnCritSlash(px, py, slashDir);
          } else {
            pixiRef.current.spawnSlashBlood(px, py, slashDir, 0.8);
          }
          pixiRef.current.spawnMeleeSparks(px, py, slashDir);
        }
        // Saber effect: ice slow + freeze
        if (eff?.type === "slow" && d) {
          if (!d._origSpeed) d._origSpeed = d.speed;
          d.speed = d._origSpeed * eff.value;
          d._slowedUntil = Date.now() + eff.duration;
          // Brief freeze (complete stop) for 0.8s on each hit
          d._frozenUntil = Date.now() + 800;
          d.speed = 0;
          // Frost visual effect
          if (pixiRef.current) {
            pixiRef.current.spawnIceShards(px, py, slashDir);
          }
          spawnDmgPopup(w.id, `❄ Mróz!`, "#80d0ff", "ice");
        }
        // Saber effect: knockback
        if (eff?.type === "knockback" && d) {
          const kbCenter = isoModeRef.current ? ISO_CONFIG.MAP_COLS / 2 : 50;
          const kbDir = d.x > kbCenter ? 1 : -1;
          const kbForce = isoModeRef.current ? eff.force * 1 : eff.force * 3;
          const kbMin = isoModeRef.current ? 1 : 5;
          const kbMax = isoModeRef.current ? ISO_CONFIG.MAP_COLS - 1 : 95;
          d.x = Math.max(kbMin, Math.min(kbMax, d.x + kbDir * kbForce));
          if (physicsRef.current) physicsRef.current.applyHit(w.id, "melee", kbDir);
        }
        // Saber effect: gold bonus
        if (eff?.type === "gold_bonus") {
          addMoneyFn({ copper: eff.copperPerHit });
        }
        // Saber effect: cursed self-damage
        if (eff?.type === "cursed" && Math.random() < eff.selfDamageChance) {
          setCaravanHp(prev => Math.max(1, prev - eff.selfDamage));
          showMessage("Klątwa! Statek traci HP!", "#cc44cc");
        }
        // Saber effect: chain lightning
        if (eff?.type === "chain_lightning" && Math.random() < eff.chance) {
          const nearby = walkersRef.current.filter(ww => ww.alive && !ww.dying && !ww.friendly && ww.id !== w.id);
          for (const target of nearby) {
            const td = wd[target.id];
            if (!td) continue;
            const cdx = td.x - d.x, cdy = td.y - d.y;
            if (cdx * cdx + cdy * cdy < eff.chainRadius * eff.chainRadius) {
              spawnDmgPopup(target.id, `⚡${eff.chainDamage}`, "#ffee00", "lightning");
              // Visual lightning bolt between hit enemy and chain target
              if (pixiRef.current) {
                const _isI = isoModeRef.current;
                const srcPx = _isI ? (d.x / ISO_CONFIG.MAP_COLS) * GAME_W : (d.x / 100) * GAME_W;
                const srcPy = _isI ? (d.y / ISO_CONFIG.MAP_ROWS) * GAME_H : (d.y / 100) * GAME_H;
                const tgtPx = _isI ? (td.x / ISO_CONFIG.MAP_COLS) * GAME_W : (td.x / 100) * GAME_W;
                const tgtPy = _isI ? (td.y / ISO_CONFIG.MAP_ROWS) * GAME_H : (td.y / 100) * GAME_H;
                pixiRef.current.spawnChainLightning(srcPx, srcPy, tgtPx, tgtPy);
              }
              setWalkers(prev2 => prev2.map(ww2 => {
                if (ww2.id !== target.id || !ww2.alive || ww2.dying) return ww2;
                const nh2 = Math.max(0, ww2.hp - eff.chainDamage);
                if (nh2 <= 0) {
                  sfxNpcDeath();
                  if (walkDataRef.current[target.id]) walkDataRef.current[target.id].alive = false;
                  addMoneyFn(ww2.npcData.loot); setKills(k => k + 1);
                  setTimeout(() => setWalkers(pp => pp.filter(www => www.id !== target.id)), 2500);
                  return { ...ww2, hp: 0, dying: true, dyingAt: Date.now() };
                }
                return { ...ww2, hp: nh2 };
              }));
              break; // chain to one target
            }
          }
        }
        const newHp = Math.max(0, w.hp - dmg);
        // Meteor boulder wave check
        if (w.isMeteorBoulder) checkMeteorWaveThreshold(w.id, w.hp, newHp);
        // Saber effect: lifesteal
        if (eff?.type === "lifesteal") {
          const healAmt = Math.round(dmg * eff.value);
          if (healAmt > 0) setCaravanHp(prev => Math.min(CARAVAN_LEVELS[caravanLevelRef.current].hp, prev + healAmt));
        }
        // Saber effect: burn DOT
        if (eff?.type === "burn" && d) {
          d._burnDps = eff.dps; d._burnUntil = Date.now() + eff.duration; d._burnTarget = w.id;
        }
        // Saber effect: poison DOT
        if (eff?.type === "poison" && d) {
          d._poisonDps = eff.dps; d._poisonUntil = Date.now() + eff.duration; d._poisonTarget = w.id;
        }
        setWalkers(prev => prev.map(ww => {
          if (ww.id !== w.id || !ww.alive || ww.dying) return ww;
          if (newHp <= 0) {
            sfxNpcDeath();
            if (walkDataRef.current[w.id]) walkDataRef.current[w.id].alive = false;
            if (physicsRef.current) physicsRef.current.triggerRagdoll(w.id, isCrit ? "saber_crit" : "saber", d.x > (isoModeRef.current ? ISO_CONFIG.MAP_COLS / 2 : 50) ? 1 : -1);
            // Meteor boulder destruction: ground loot
            if (ww.isMeteorBoulder && meteorWaveRef.current) {
              spawnMeteorGroundLoot(meteorWaveRef.current.x, meteorWaveRef.current.y);
              meteorWaveRef.current = null;
              setMeteorite(null);
            } else {
              addMoneyFn(ww.npcData.loot || {});
            }
            setKills(k => k + 1);
            handleCardDrop(ww.npcData);
            { const _wd = walkDataRef.current[w.id]; rollAmmoDrop(_wd?.wx ?? _wd?.x, _wd?.wy ?? _wd?.y); rollSaberDrop(_wd?.wx ?? _wd?.x, _wd?.wy ?? _wd?.y); }
            grantXp(ww.isBoss ? 100 : ww.isElite ? 50 : 10 + roomRef.current * 2);
            processKillStreak();
            // Shadow saber: summon skeleton on kill
            if (eff?.type === "summon_skeleton") {
              setTimeout(() => {
                const nid = ++walkerIdCounter;
                const _iso = isoModeRef.current;
                const sx = d.x;
                const _sy = d.y ?? (_iso ? ISO_CONFIG.MAP_ROWS / 2 : 50);
                const nHp = 40;
                const nDmg = 8;
                const nd = { icon: "skull", name: "Szkielet", hp: nHp, resist: null, loot: {}, bodyColor: "#c0b8a0", armorColor: "#8a7a60", bodyType: "humanoid", weapon: "sword" };
                setWalkers(pr => [...pr, { id: nid, npcData: nd, alive: true, dying: false, hp: nHp, maxHp: nHp, friendly: true }]);
                walkDataRef.current[nid] = { x: sx, y: _sy, dir: 1, yDir: 1, speed: _iso ? 0.06 : 0.3, ySpeed: 0.01, minX: _iso ? 1 : 5, maxX: _iso ? ISO_CONFIG.MAP_COLS - 1 : 90, minY: _iso ? 1 : 25, maxY: _iso ? ISO_CONFIG.MAP_ROWS - 1 : 90, bouncePhase: 0, alive: true, friendly: true, damage: nDmg, attackCd: 2000, lungeFrames: 0, lungeOffset: 0, combatStyle: "melee", mercType: "skeleton", range: 35 };
                if (physicsRef.current) physicsRef.current.spawnNpc(nid, _toPhysPct(sx, _iso, ISO_CONFIG.MAP_COLS), nd, true, _toPhysPct(_sy, _iso, ISO_CONFIG.MAP_ROWS));
                showMessage("Szkielet przywołany!", "#8844cc");
                setTimeout(() => {
                  if (walkDataRef.current[nid]) walkDataRef.current[nid].alive = false;
                  if (physicsRef.current) physicsRef.current.removeNpc(nid);
                  setWalkers(pr => pr.filter(ww2 => ww2.id !== nid));
                }, eff.duration);
              }, 300);
            }
            setTimeout(() => setWalkers(pp => pp.filter(www => www.id !== w.id)), 2500);
            return { ...ww, hp: 0, dying: true, dyingAt: Date.now() };
          }
          return { ...ww, hp: newHp };
        }));
      }
    }
  }, [spawnDmgPopup, addMoneyFn, showMessage]);

  // ─── OBSTACLE DAMAGE (with Advanced Destruction System) ───
  const damageObstacle = useCallback((obsId, damage, element) => {
    setObstacles(prev => prev.map(obs => {
      if (obs.id !== obsId || !obs.destructible || obs.destroying || obs.hp <= 0) return obs;
      const matDef = OBSTACLE_MATERIALS[obs.material] || OBSTACLE_MATERIALS.wood;
      let dmg = damage;
      // Element weakness: 2x damage
      if (matDef.weakTo && matDef.weakTo === element) dmg = Math.round(dmg * WEAKNESS_MULT);
      // Element resistance: 0.25x damage
      if (matDef.resistTo && matDef.resistTo === element) dmg = Math.round(dmg * OBS_RESIST_MULT);

      // Apply destruction combo bonus damage
      const comboInfo = destructionComboRef.current.getComboInfo();
      if (comboInfo.level > 0) {
        dmg = Math.round(dmg * comboInfo.damageMult);
      }

      const newHp = Math.max(0, obs.hp - dmg);
      const px = isoModeRef.current ? (obs.x / ISO_CONFIG.MAP_COLS) * GAME_W : (obs.x / 100) * GAME_W;
      const py = isoModeRef.current ? (obs.y / ISO_CONFIG.MAP_ROWS) * GAME_H : GAME_H - (obs.y / 100) * GAME_H;

      // Structural collapse: check for stage transition
      if (hasStructuralCollapse(obs.type) && newHp > 0) {
        const structDef = getStructuralDef(obs.type);
        const prevStage = getCollapseStage(obs.hp / obs.maxHp, structDef.stages);
        const newStage = getCollapseStage(newHp / obs.maxHp, structDef.stages);
        if (newStage > prevStage) {
          // Stage transition — spawn fragments and collapse event
          const event = createCollapseEvent(obs, structDef, prevStage, newStage, element);
          collapseEventsRef.current.push(event);
          collapseFragIdRef.current++;
          const frags = generateFragments(obs, structDef, newStage, collapseFragIdRef.current);
          // Queue fragment spawning with delay
          for (const frag of frags) {
            setTimeout(() => {
              setObstacles(p => {
                const fragDef = OBSTACLE_DEFS[frag.type];
                if (!fragDef) return p;
                return [...p, {
                  id: frag.id,
                  type: frag.type,
                  x: frag.x,
                  y: frag.y,
                  hp: Math.round(fragDef.hp * frag.hpMult),
                  maxHp: Math.round(fragDef.hp * frag.hpMult),
                  material: fragDef.material,
                  destructible: true,
                  loot: (() => {
                    const l = {};
                    for (const [k, v] of Object.entries(fragDef.loot || {})) l[k] = Math.max(1, Math.round(v * frag.lootMult));
                    return l;
                  })(),
                  biomeId: obs.biomeId,
                  hitAnim: null,
                  destroying: false,
                  isFragment: true,
                }];
              });
            }, frag.spawnDelay);
          }
          // Dust particles + screen shake for stage transition
          if (pixiRef.current) {
            pixiRef.current.screenShake(COLLAPSE_CONFIG.screenShakePerStage);
            pixiRef.current.spawnDustBurst(px, py);
          }
          showMessage(`Struktura pęka! (faza ${newStage}/${structDef.stages})`, "#ff8844");
        }
      }

      // Hit spark effect on every hit
      if (pixiRef.current) {
        pixiRef.current.spawnObstacleHitSpark(px, py, matDef.color);
        pixiRef.current.addGroundMark(px, py, element, dmg);
      }
      if (newHp <= 0) {
        // ─── DESTRUCTION ───

        // Register with destruction combo tracker
        const comboResult = destructionComboRef.current.registerDestruction(element);

        if (pixiRef.current) {
          // Spawn material-specific destruction particles
          switch (matDef.particle) {
            case "splinter": pixiRef.current.spawnWoodSplinters(px, py); break;
            case "rubble":   pixiRef.current.spawnStoneRubble(px, py); break;
            case "shard":
              if (obs.material === "ice") pixiRef.current.spawnIceShatter(px, py);
              else pixiRef.current.spawnCrystalShatter(px, py);
              break;
            case "leaf":     pixiRef.current.spawnLeafBurst(px, py); break;
            case "spark":    pixiRef.current.spawnMetalSparks(px, py); break;
            case "dust":     pixiRef.current.spawnDustBurst(px, py); break;
            default:         pixiRef.current.spawnWoodSplinters(px, py); break;
          }
          const shakeIntensity = (matDef.shakeIntensity || 3) + (comboResult.level > 3 ? 2 : 0);
          pixiRef.current.screenShake(shakeIntensity);
          // Persistent debris fragments
          pixiRef.current.spawnDebris(obs.material, px, py);

          // Explosive debris: high-velocity fragments that can damage NPCs
          if (obs.explosive || comboResult.level >= 3) {
            const explosiveDebris = createExplosiveDebris(obs.material, px, py, obs.explosive ? 1.2 : 0.6);
            for (const d of explosiveDebris) {
              pixiRef.current._debris.push(d);
            }
          }
        }

        // Spawn shockwave for explosive obstacles or high combo
        if (obs.explosive || comboResult.level >= 5) {
          const swElement = obs.explosive ? (obs.element || "explosion") : element || "explosion";
          const swIntensity = obs.explosive ? 1.0 : 0.6;
          const sw = createShockwave(px, py, swElement, swIntensity, 10);
          shockwavesRef.current.push(sw);
        }

        // Explosive obstacle: deal blast damage to enemies in radius
        if (obs.explosive && obs.explosionDmg) {
          const blastRadius = obs.explosionRadius || 16;
          const blastDmg = obs.explosionDmg;
          const blastEl = obs.explosionElement || "fire";
          sfxMeteorImpact();
          if (animatorRef.current) animatorRef.current.playMeteorImpact(px, py);
          showMessage("Eksplozja!", blastEl === "poison" ? "#44ff44" : blastEl === "ice" ? "#4488ff" : "#ff6020");
          const curWalkers = walkersRef.current;
          curWalkers.forEach(w => {
            if (!w.alive || w.dying) return;
            const wd = walkDataRef.current[w.id];
            if (!wd) return;
            const ddx = wd.x - obs.x;
            const ddy = ((wd.y || 50) - (isoModeRef.current ? obs.y : (100 - obs.y))) * 0.5;
            const dist = Math.sqrt(ddx * ddx + ddy * ddy);
            if (dist < blastRadius) {
              const falloff = 1 - (dist / blastRadius) * 0.5;
              const bDmg = Math.round(blastDmg * falloff + Math.random() * 10);
              const wId = w.id;
              spawnDmgPopup(wId, `${bDmg}`, blastEl === "poison" ? "#44ff44" : "#ff6020");
              setWalkers(ppp => ppp.map(ww => {
                if (ww.id !== wId || !ww.alive || ww.dying) return ww;
                const newWHp = Math.max(0, ww.hp - bDmg);
                if (newWHp <= 0) {
                  sfxNpcDeath();
                  if (walkDataRef.current[ww.id]) walkDataRef.current[ww.id].alive = false;
                  if (physicsRef.current) physicsRef.current.triggerRagdoll(ww.id, blastEl, Math.sign(ddx) || 1);
                  addMoneyFn(ww.npcData.loot || {});
                  setKills(k => k + 1);
                  processKillStreak();
                  showMessage(`${ww.npcData.name} pokonany eksplozją!`, "#ff6020");
                  setTimeout(() => setWalkers(pp2 => pp2.map(www => www.id === ww.id ? { ...www, alive: false } : www)), 2500);
                  return { ...ww, hp: 0, dying: true, dyingAt: Date.now() };
                }
                if (physicsRef.current) physicsRef.current.applyHit(ww.id, blastEl, Math.sign(ddx) || 1);
                return { ...ww, hp: newWHp };
              }));
            }
          });
        }

        // Environmental hazards from destruction
        const hazard = envHazardsRef.current.spawnFromDestruction(obs, element);
        if (hazard) {
          showMessage(`${HAZARD_TYPES[hazard.type]?.name || "Zagrożenie"}!`, "#ff6644");
        }
        // Direct hazard override from obstacle definition
        if (obs.hazardOnDestroy) {
          envHazardsRef.current._createHazard(obs.hazardOnDestroy, obs.x, obs.y, 1.0);
        }

        // Drop loot on ground (with combo bonus)
        if (obs.loot && Object.keys(obs.loot).length > 0) {
          const boostedLoot = destructionComboRef.current.applyLootBonus(obs.loot);
          // Biome modifier: bonus_loot
          const bMod = biomeModifierRef.current;
          if (bMod?.effect?.type === "bonus_loot" && Math.random() < (bMod.effect.bonusLootChance || 0)) {
            for (const [k, v] of Object.entries(bMod.effect.bonusLoot || obs.loot)) {
              boostedLoot[k] = (boostedLoot[k] || 0) + (v || 0);
            }
            showMessage(`${bMod.name}: bonus łup!`, "#e0c040");
          }
          spawnObstacleLoot({ ...obs, loot: boostedLoot });
        }

        // Display combo messages
        const comboMsgs = destructionComboRef.current.flushMessages();
        for (const msg of comboMsgs) {
          showMessage(msg.text, msg.color);
        }

        // Chain reactions — enhanced with depth tracking and synergies
        if (element) {
          const chainSequence = buildChainSequence(element, obs.x, obs.y, damage, prev, obsId, comboResult.elements);
          for (const chainEvent of chainSequence) {
            const totalDelay = chainEvent.delay;
            setTimeout(() => {
              let chainDmg = chainEvent.damage;
              // Apply synergy bonus if applicable
              if (chainEvent.synergy) {
                chainDmg = chainEvent.synergyDamage;
                showMessage(`${chainEvent.synergy.desc}!`, "#ffaa00");
                // Synergy shockwave
                const sPx = isoModeRef.current ? (chainEvent.targetX / ISO_CONFIG.MAP_COLS) * GAME_W : (chainEvent.targetX / 100) * GAME_W;
                const sPy = isoModeRef.current ? (chainEvent.targetY / ISO_CONFIG.MAP_ROWS) * GAME_H : GAME_H - (chainEvent.targetY / 100) * GAME_H;
                const synSw = createShockwave(sPx, sPy, element, 0.5, 5);
                shockwavesRef.current.push(synSw);
              }
              damageObstacle(chainEvent.targetId, chainDmg, chainEvent.element);
            }, totalDelay);
          }
        }

        // Element interaction with existing environmental hazards
        envHazardsRef.current.applyElementToHazards(obs.x, obs.y, 20, element);

        // Mark as destroying for fade-out animation, then remove after delay
        setTimeout(() => {
          setObstacles(p => p.filter(o => o.id !== obsId));
        }, 400);
        return { ...obs, hp: 0, destroying: true, hitAnim: Date.now() };
      }
      return { ...obs, hp: newHp, hitAnim: Date.now() };
    }));
  }, [addMoneyFn, showMessage]);

  // ─── COMPOSITE STRUCTURE DAMAGE ───
  const damageStructureSegment = useCallback((structId, segId, damage, element) => {
    setStructures(prev => prev.map(struct => {
      if (struct.id !== structId) return struct;
      const newSegs = struct.segments.map(seg => {
        if (seg.id !== segId || !seg.alive || seg.destroying) return seg;
        const matDef = OBSTACLE_MATERIALS[seg.material] || OBSTACLE_MATERIALS.wood;
        let dmg = damage;
        if (matDef.weakTo && matDef.weakTo === element) dmg = Math.round(dmg * WEAKNESS_MULT);
        if (matDef.resistTo && matDef.resistTo === element) dmg = Math.round(dmg * OBS_RESIST_MULT);
        // Combo bonus
        const comboInfo = destructionComboRef.current.getComboInfo();
        if (comboInfo.level > 0) dmg = Math.round(dmg * comboInfo.damageMult);

        const newHp = Math.max(0, seg.hp - dmg);
        const px = isoModeRef.current ? (struct.x / ISO_CONFIG.MAP_COLS) * GAME_W : (struct.x / 100) * GAME_W;
        const py = isoModeRef.current ? (struct.y / ISO_CONFIG.MAP_ROWS) * GAME_H : GAME_H - (struct.y / 100) * GAME_H;
        // Offset by segment position within structure
        const segPxX = px + seg.x + seg.w / 2 - struct.width / 2;
        const segPxY = py - seg.y - seg.h / 2;

        if (pixiRef.current) {
          pixiRef.current.spawnObstacleHitSpark(segPxX, segPxY, matDef.color);
          pixiRef.current.addGroundMark(segPxX, segPxY, element, dmg);
        }

        if (newHp <= 0) {
          // Segment destroyed
          const comboResult = destructionComboRef.current.registerDestruction(element);
          sfxStructureCollapse();
          if (pixiRef.current) {
            switch (matDef.particle) {
              case "splinter": pixiRef.current.spawnWoodSplinters(segPxX, segPxY); break;
              case "rubble":   pixiRef.current.spawnStoneRubble(segPxX, segPxY); break;
              case "shard":
                if (seg.material === "ice") pixiRef.current.spawnIceShatter(segPxX, segPxY);
                else pixiRef.current.spawnCrystalShatter(segPxX, segPxY);
                break;
              case "leaf":     pixiRef.current.spawnLeafBurst(segPxX, segPxY); break;
              case "spark":    pixiRef.current.spawnMetalSparks(segPxX, segPxY); break;
              case "dust":     pixiRef.current.spawnDustBurst(segPxX, segPxY); break;
              default:         pixiRef.current.spawnWoodSplinters(segPxX, segPxY); break;
            }
            const shakeAmt = (seg.onDestroy?.screenShake || matDef.shakeIntensity || 3);
            pixiRef.current.screenShake(shakeAmt);
            pixiRef.current.spawnDebris(seg.material, segPxX, segPxY);
          }
          // Shockwave
          if (seg.onDestroy?.shockwave || seg.explosive) {
            const swInt = seg.explosive ? 1.0 : 0.7;
            const sw = createShockwave(segPxX, segPxY, seg.explosionElement || element || "explosion", swInt, 10);
            shockwavesRef.current.push(sw);
          }
          // Explosive segment: blast damage to NPCs
          if (seg.explosive && seg.explosionDmg) {
            const blastR = seg.explosionRadius || 16;
            const blastDmg = seg.explosionDmg;
            const blastEl = seg.explosionElement || "fire";
            sfxMeteorImpact();
            if (animatorRef.current) animatorRef.current.playMeteorImpact(segPxX, segPxY);
            showMessage(`${seg.name} eksploduje!`, blastEl === "ice" ? "#4488ff" : blastEl === "shadow" ? "#8844cc" : "#ff6020");
            walkersRef.current.forEach(w => {
              if (!w.alive || w.dying) return;
              const wd = walkDataRef.current[w.id];
              if (!wd) return;
              const ddx = wd.x - struct.x;
              const ddy = ((wd.y || 50) - (isoModeRef.current ? struct.y : (100 - struct.y))) * 0.5;
              const dist = Math.sqrt(ddx * ddx + ddy * ddy);
              if (dist < blastR) {
                const falloff = 1 - (dist / blastR) * 0.5;
                const bDmg = Math.round(blastDmg * falloff + Math.random() * 10);
                spawnDmgPopup(w.id, `${bDmg}`, blastEl === "ice" ? "#4488ff" : "#ff6020");
                setWalkers(ppp => ppp.map(ww => {
                  if (ww.id !== w.id || !ww.alive || ww.dying) return ww;
                  const newWHp = Math.max(0, ww.hp - bDmg);
                  if (newWHp <= 0) {
                    sfxNpcDeath();
                    if (walkDataRef.current[ww.id]) walkDataRef.current[ww.id].alive = false;
                    if (physicsRef.current) physicsRef.current.triggerRagdoll(ww.id, blastEl, Math.sign(ddx) || 1);
                    addMoneyFn(ww.npcData.loot || {});
                    setKills(k => k + 1);
                    processKillStreak();
                    showMessage(`${ww.npcData.name} pokonany!`, "#ff6020");
                    setTimeout(() => setWalkers(pp2 => pp2.map(www => www.id === ww.id ? { ...www, alive: false } : www)), 2500);
                    return { ...ww, hp: 0, dying: true, dyingAt: Date.now() };
                  }
                  if (physicsRef.current) physicsRef.current.applyHit(ww.id, blastEl, Math.sign(ddx) || 1);
                  return { ...ww, hp: newWHp };
                }));
              }
            });
          }
          // Environmental hazard from segment
          if (seg.onDestroy?.hazard) {
            envHazardsRef.current._createHazard(seg.onDestroy.hazard, struct.x, struct.y, 1.0);
          }
          // Drop loot
          if (seg.loot && Object.keys(seg.loot).length > 0) {
            const boostedLoot = destructionComboRef.current.applyLootBonus(seg.loot);
            addMoneyFn(boostedLoot);
            if (pixiRef.current) pixiRef.current.spawnGoldCoins(segPxX, segPxY, 0.4);
          }
          showMessage(`${seg.name} zniszczony!`, "#ff8844");
          // Combo messages
          const comboMsgs = destructionComboRef.current.flushMessages();
          for (const msg of comboMsgs) showMessage(msg.text, msg.color);

          return { ...seg, hp: 0, alive: false, destroying: true, hitAnim: Date.now() };
        }
        return { ...seg, hp: newHp, hitAnim: Date.now() };
      });

      // Check cascade collapse
      const updatedStruct = { ...struct, segments: newSegs };
      const cascadeTargets = checkCascadeCollapse(updatedStruct, segId);
      for (const target of cascadeTargets) {
        setTimeout(() => {
          damageStructureSegment(structId, target.segId, 99999, element);
        }, target.delay);
      }

      // Check if all segments destroyed
      const allDead = newSegs.every(s => !s.alive);
      if (allDead && !struct.allDestroyed) {
        sfxStructureFullDestroy();
        if (struct.fullDestroyBonus) {
          if (struct.fullDestroyBonus.gold) addMoneyFn({ gold: struct.fullDestroyBonus.gold });
          if (struct.fullDestroyBonus.silver) addMoneyFn({ silver: struct.fullDestroyBonus.silver });
          showMessage(struct.fullDestroyBonus.message || "Budowla zniszczona!", "#ffd700");
        }
        const px = isoModeRef.current ? (struct.x / ISO_CONFIG.MAP_COLS) * GAME_W : (struct.x / 100) * GAME_W;
        const py = isoModeRef.current ? (struct.y / ISO_CONFIG.MAP_ROWS) * GAME_H : GAME_H - (struct.y / 100) * GAME_H;
        if (pixiRef.current) {
          pixiRef.current.screenShake(8);
          pixiRef.current.spawnDustBurst(px, py);
          pixiRef.current.spawnGoldCoins(px, py, 1.0);
        }
        return { ...updatedStruct, allDestroyed: true };
      }
      return updatedStruct;
    }));
  }, [addMoneyFn, showMessage, spawnDmgPopup]);

  // Check obstacle hits during saber swipe
  const saberCheckObstacleHits = useCallback((x, y) => {
    const saberData = getEquippedSaberData();
    const hitRadius = isoModeRef.current ? 3 : 7; // tiles in iso, percent in panoramic
    for (const obs of obstaclesRef.current) {
      if (!obs.destructible || obs.hp <= 0 || obs.destroying) continue;
      if (saberHitIdsRef.current.has(`obs_${obs.id}`)) continue;
      let dx, dy;
      if (isoModeRef.current) {
        dx = obs.x - x;
        dy = obs.y - y;
      } else {
        dx = obs.x - x;
        dy = (100 - obs.y - 3.5) - y;
      }
      if (dx * dx + dy * dy < hitRadius * hitRadius) {
        saberHitIdsRef.current.add(`obs_${obs.id}`);
        const saberEff = saberData.effect;
        let dmg = saberData.damage;
        const isCrit = Math.random() < 0.20;
        if (isCrit) dmg = Math.round(dmg * 2.5);
        const element = saberEff?.element || null;
        damageObstacle(obs.id, dmg, element);
        sfxMeleeHit();
        // Sparks on saber hit
        const px = isoModeRef.current ? (obs.x / ISO_CONFIG.MAP_COLS) * GAME_W : (obs.x / 100) * GAME_W;
        const py = isoModeRef.current ? (obs.y / ISO_CONFIG.MAP_ROWS) * GAME_H : GAME_H - (obs.y / 100) * GAME_H;
        if (pixiRef.current) pixiRef.current.spawnMeleeSparks(px, py, x > obs.x ? 1 : -1);
      }
    }
  }, [damageObstacle]);

  // Check structure hits during saber swipe
  const saberCheckStructureHits = useCallback((x, y) => {
    const saberData = getEquippedSaberData();
    const hitRadius = isoModeRef.current ? 4 : 9;
    for (const struct of structuresRef.current) {
      if (struct.allDestroyed) continue;
      const dx = struct.x - x, dy = struct.y - (isoModeRef.current ? y : (100 - y));
      if (dx * dx + dy * dy > hitRadius * hitRadius * 4) continue; // broad phase
      for (const seg of struct.segments) {
        if (!seg.alive || seg.destroying) continue;
        const segKey = `struct_${struct.id}_${seg.id}`;
        if (saberHitIdsRef.current.has(segKey)) continue;
        // Hit check against segment
        // Saber coordinates are in game units (% or tiles), approximate segment center
        const segOffX = ((seg.x + seg.w / 2) / struct.width - 0.5) * (isoModeRef.current ? 3 : 6);
        const segOffY = (seg.y + seg.h / 2) / struct.height * (isoModeRef.current ? 3 : 6);
        const segCx = struct.x + segOffX;
        const segCy = struct.y - segOffY;
        const sdx = segCx - x, sdy = segCy - (isoModeRef.current ? y : (100 - y));
        if (sdx * sdx + sdy * sdy < hitRadius * hitRadius) {
          saberHitIdsRef.current.add(segKey);
          let dmg = saberData.damage;
          const isCrit = Math.random() < 0.20;
          if (isCrit) dmg = Math.round(dmg * 2.5);
          damageStructureSegment(struct.id, seg.id, dmg, saberData.effect?.element || null);
          sfxMeleeHit();
          break; // one segment per swipe per structure
        }
      }
    }
  }, [damageStructureSegment]);

  // Check interactable hits during saber swipe
  const saberCheckInteractableHits = useCallback((x, y) => {
    for (let i = 0; i < interactablesRef.current.length; i++) {
      const item = interactablesRef.current[i];
      if (item.used || item.action !== "saber" || (isoModeRef.current && item._fogHidden)) continue;
      const dx = item.x - x, dy = (100 - item.y) - y;
      if (dx * dx + dy * dy < 64) { // ~8% radius
        setInteractables(prev => prev.map((it, idx) => idx === i ? { ...it, used: true } : it));
        showMessage(`${item.name}: Aktywowano!`, "#ffd740");
        if (item.reward.type === "loot") addMoneyFn({ copper: item.reward.copper });
        else if (item.reward.type === "heal") setCaravanHp(prev => Math.min(prev + item.reward.amount, CARAVAN_LEVELS[caravanLevelRef.current].hp));
        else if (item.reward.type === "aoe_damage" && pixiRef.current) {
          const px = (item.x / 100) * GAME_W, py = GAME_H - (item.y / 100) * GAME_H;
          pixiRef.current.spawnGoreExplosion(px, py);
        }
        sfxMeleeHit();
        break;
      }
    }
  }, [showMessage, addMoneyFn]);

  const handleSaberDown = useCallback((e) => {
    if (!isSaberMode) return;
    if (Date.now() < saberCdRef.current) return;
    e.preventDefault();
    const pos = saberGetGamePos(e);
    if (!pos) return;
    saberSwipingRef.current = true;
    saberHitIdsRef.current = new Set();
    saberPointsRef.current = [{ x: pos.x, y: pos.y, time: Date.now() }];
    setSaberTrail([{ x: pos.px, y: pos.py }]);
    sfxSaberSwipe();
    saberCheckHits(pos.x, pos.y);
    saberCheckObstacleHits(pos.x, pos.y);
    saberCheckStructureHits(pos.x, pos.y);
    saberCheckInteractableHits(pos.x, pos.y);
  }, [isSaberMode, saberGetGamePos, saberCheckHits, saberCheckObstacleHits, saberCheckStructureHits, saberCheckInteractableHits]);

  const handleSaberMove = useCallback((e) => {
    if (!saberSwipingRef.current) return;
    e.preventDefault();
    const pos = saberGetGamePos(e);
    if (!pos) return;
    saberPointsRef.current.push({ x: pos.x, y: pos.y, time: Date.now() });
    setSaberTrail(prev => [...prev, { x: pos.px, y: pos.py }].slice(-30));
    saberCheckHits(pos.x, pos.y);
    saberCheckObstacleHits(pos.x, pos.y);
    saberCheckStructureHits(pos.x, pos.y);
    saberCheckInteractableHits(pos.x, pos.y);
  }, [saberGetGamePos, saberCheckHits, saberCheckObstacleHits, saberCheckStructureHits, saberCheckInteractableHits]);

  const handleSaberUp = useCallback(() => {
    if (!saberSwipingRef.current) return;
    saberSwipingRef.current = false;
    saberPointsRef.current = [];
    saberHitIdsRef.current = new Set();
    // Short cooldown after swipe
    const spell = SPELLS.find(s => s.id === "saber");
    saberCdRef.current = Date.now() + (spell ? spell.cooldown : 300);
    // Fade out trail
    setTimeout(() => setSaberTrail([]), 150);
  }, []);

  // ─── DEFENSE TRAP: Place a player trap during setup phase ───
  const placeDefenseTrap = useCallback((trapCfg, clickX, clickY) => {
    // Check max count
    const existing = playerTrapsRef.current.filter(t => t.trapType === trapCfg.id);
    if (existing.length >= trapCfg.maxCount) {
      showMessage(`Max ${trapCfg.maxCount} ${trapCfg.name}!`, "#c08040");
      return;
    }
    if (playerTrapsRef.current.length >= MAX_PLAYER_TRAPS) {
      showMessage(`Max ${MAX_PLAYER_TRAPS} pułapek!`, "#c08040");
      return;
    }
    // Convert click position to game coords
    let xPct, yPct;
    if (isoModeRef.current) {
      const cam = isoCameraRef.current;
      const iw = _isoScreenToWorld(clickX, clickY, cam.x, cam.y);
      xPct = iw.x; yPct = iw.y; // tile coords for iso
    } else {
      xPct = (clickX / GAME_W) * 100;
      yPct = (clickY / GAME_H) * 100;
    }
    const newTrap = {
      id: Date.now() + Math.random(),
      trapType: trapCfg.id,
      x: xPct,
      y: yPct,
      active: true,
      armed: true,
      config: trapCfg,
      ...(trapCfg.hp ? { currentHp: trapCfg.hp } : {}),
    };
    setPlayerTraps(prev => [...prev, newTrap]);
    showMessage(`${trapCfg.name} postawiona!`, "#40c0a0");
    setPlacingTrap(null);
  }, [showMessage]);

  // Handle click for trap placement mode
  const handleTrapPlaceClick = useCallback((e) => {
    if (!placingTrap || !gameContainerRef.current) return;
    const gr = gameContainerRef.current.getBoundingClientRect();
    const clickX = (e.clientX - gr.left) / gameScale;
    const clickY = (e.clientY - gr.top) / gameScale;
    placeDefenseTrap(placingTrap, clickX, clickY);
  }, [placingTrap, gameScale, placeDefenseTrap]);

  // ─── CARAVAN SHIELD: Activate shield to block one hit ───
  const activateCaravanShield = useCallback(() => {
    const now = Date.now();
    if (caravanShieldRef.current.active) { showMessage("Tarcza już aktywna!", "#4080cc"); return; }
    if (caravanShieldRef.current.cooldown > now) {
      const rem = Math.ceil((caravanShieldRef.current.cooldown - now) / 1000);
      showMessage(`Tarcza za ${rem}s!`, "#888");
      return;
    }
    setCaravanShield({ active: true, cooldown: now + 10000 });
    showMessage("Tarcza aktywowana!", "#40a0ff");
    // Shield lasts 2.5 seconds
    setTimeout(() => {
      setCaravanShield(prev => ({ ...prev, active: false }));
    }, 2500);
  }, [showMessage]);

  const castSpellOnTarget = useCallback((spell, walker) => {
    if (!canCastSpell(spell)) {
      if (spell.ammoCost && (ammoRef.current[spell.ammoCost.type] || 0) < spell.ammoCost.amount) {
        const ammoNames = { dynamite: "dynamitu", harpoon: "harpunów", cannonball: "kul armatnich", rum: "rumu", chain: "łańcuchów" };
        showMessage(`Brak ${ammoNames[spell.ammoCost.type] || "amunicji"}!`, "#c04040");
      } else if (manaRef.current < getSpellManaCost(spell)) showMessage("Za mało prochu!", "#c0a060");
      else showMessage("Akcja jeszcze nie gotowa!", "#cc8040");
      return;
    }

    // Engage combat on first player attack
    if (!combatEngagedRef.current) combatEngagedRef.current = true;

    // Spend mana & set cooldown (chaos_blade: +25% mana cost)
    const manaCost = getSpellManaCost(spell);
    manaRef.current -= manaCost;
    setMana(m => Math.max(0, m - manaCost));
    // Compute upgrade stats once for both ammo cost and cooldown
    const _spellUps = spellUpgradesRef.current[spell.id] || [];
    const _uStats = getUpgradedSpellStats(spell, _spellUps);
    // Ammo cost with upgrade reduction
    if (spell.ammoCost) {
      const ammoCost = Math.max(1, spell.ammoCost.amount - _uStats.ammoCostReduction);
      setAmmo(prev => ({ ...prev, [spell.ammoCost.type]: (prev[spell.ammoCost.type] || 0) - ammoCost }));
    }
    // Cooldown with upgrades + perk
    {
      const uStats = _uStats;
      const finalCd = Math.round(uStats.cooldown * perkCooldownMult * artifactCooldownMultRef.current);
      setCooldowns(prev => ({ ...prev, [spell.id]: Date.now() + finalCd }));
    }

    const sfxFn = SPELL_SFX[spell.id];
    if (sfxFn) sfxFn();

    // Get target pixel position for canvas animation (convert screen coords to game coords)
    let tx = GAME_W * 0.7, ty = GAME_H * 0.25;
    const el = npcElsRef.current[walker.id];
    if (el && gameContainerRef.current) {
      const gr = gameContainerRef.current.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      tx = ((r.left + r.width / 2) - gr.left) / gameScale;
      ty = ((r.top + r.height / 2) - gr.top) / gameScale;
    }

    if (animatorRef.current) {
      animatorRef.current.playSpell(spell.id, tx, ty, spell.color, spell.colorLight);
    }

    const deathDelay = spell.id === "lightning" ? 200 : 450;
    const wid = walker.id;
    const npcData = walker.npcData;

    setTimeout(() => {
      const resistant = npcData.resist && npcData.resist === spell.element;
      // Spell upgrade: use upgraded damage
      const spellUps = spellUpgradesRef.current[spell.id] || [];
      const upgradedStats = getUpgradedSpellStats(spell, spellUps);
      let damage = Math.round(upgradedStats.damage * (resistant ? RESIST_MULT : 1));
      damage = applyWeatherDamage(damage, spell.element, weatherRef.current);
      damage = applyModifierDamage(damage, spell.element, biomeModifierRef.current);
      // chaos_blade: +40% spell damage
      if (hasRelic("chaos_blade")) damage = Math.round(damage * 1.40);
      if (hasRelic("mermaid_tear") && spell.element === "ice") damage = Math.round(damage * 1.25);
      // Knowledge bonus: extra damage for discovered NPCs + milestone bonus + bestiary kill bonus
      damage = Math.round(damage * getKnowledgeBonus(npcData.id) * getKnowledgeMilestoneBonus() * getBestiaryKillBonus(npcData.name));
      // Perk: spell damage multiplier
      damage = Math.round(damage * perkSpellDmgMult);
      // Risk event: player double damage
      if (playerDoubleDmgRoomsRef.current > 0) damage = Math.round(damage * 2);
      if (secretPermDmgBuffRef.current > 0) damage = Math.round(damage * (1 + secretPermDmgBuffRef.current));
      if (secretSpellBuffRoomsRef.current > 0 && secretSpellBuffMultRef.current > 0) damage = Math.round(damage * (1 + secretSpellBuffMultRef.current));
      if (artifactDmgMultRef.current !== 1) damage = Math.round(damage * artifactDmgMultRef.current);
      // Element combo system (uses imported COMBOS from combos.js)
      let comboText = null;
      const prevDebuff = elementDebuffs.current[wid];
      if (prevDebuff && spell.element && prevDebuff.element !== spell.element && Date.now() - prevDebuff.timestamp < 5000) {
        const comboKey = [prevDebuff.element, spell.element].sort().join("+");
        const combo = COMBOS[comboKey];
        if (combo) {
          // Combo streak bonus: +5% per consecutive combo (cap 25%)
          const streakBonus = Math.min(COMBO_STREAK_CAP, comboCounterRef.current * COMBO_STREAK_BONUS);
          damage = Math.round(damage * (combo.mult + streakBonus));
          comboText = combo;
          // Update combo visual state
          setComboCounter(prev => { const nc = prev + 1; updateComboLevel(nc); return nc; });
          setActiveCombo(combo);
          if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
          comboTimerRef.current = setTimeout(() => { setComboCounter(0); setActiveCombo(null); updateComboLevel(0); }, COMBO_STREAK_TIMEOUT);
        }
      }
      if (spell.element) elementDebuffs.current[wid] = { element: spell.element, timestamp: Date.now() };
      const wd = walkDataRef.current[wid];
      const spellDirX = wd ? (wd.x > (isoModeRef.current ? ISO_CONFIG.MAP_COLS / 2 : 50) ? 1 : -1) : 1;

      if (resistant) {
        const resistLabel = RESIST_NAMES[npcData.resist] || npcData.resist;
        showMessage(`${npcData.name} odporny na ${resistLabel}! (-70% obrażeń)`, "#6688aa");
      }
      if (comboText) {
        showMessage(`COMBO: ${comboText.name}! (x${(comboText.mult).toFixed(1)})`, comboText.color);
      }

      // Show damage popup (with combo label)
      const dmgLabel = comboText ? `COMBO x${comboCounterRef.current + 1}! ${damage}` : resistant ? `${damage} BLOK` : `${damage}`;
      spawnDmgPopup(wid, dmgLabel, resistant ? "#6688aa" : comboText ? comboText.color : spell.color);

      // blood_weapon: heal random friendly for 15% of damage dealt
      if (hasRelic("blood_weapon")) {
        const friendlies = walkersRef.current.filter(w => w.alive && !w.dying && w.friendly && w.hp < w.maxHp);
        if (friendlies.length > 0) {
          const target = friendlies[Math.floor(Math.random() * friendlies.length)];
          // desperacka_krew synergy: double heal when target below 30% HP
          const healMult = hasSynergy("desperacka_krew") && target.hp / target.maxHp < 0.30 ? 0.30 : 0.15;
          const healAmt = Math.round(damage * healMult);
          setWalkers(prev => prev.map(w => w.id === target.id ? { ...w, hp: Math.min(w.maxHp, w.hp + healAmt) } : w));
          spawnDmgPopup(target.id, `+${healAmt}`, "#40e060");
        }
      }

      // storm_echo: lightning chain to second enemy (burzowy_szal synergy: 50% chance)
      const chainChance = hasSynergy("burzowy_szal") ? 0.50 : 0.30;
      if (hasRelic("storm_echo") && spell.element === "lightning" && Math.random() < chainChance) {
        const otherEnemies = walkersRef.current.filter(w => w.alive && !w.dying && !w.friendly && w.id !== wid);
        if (otherEnemies.length > 0) {
          const chain = otherEnemies[Math.floor(Math.random() * otherEnemies.length)];
          const chainDmg = Math.round(damage * 0.60);
          spawnDmgPopup(chain.id, `${chainDmg}`, "#60c0ff");
          setWalkers(prev => prev.map(w => {
            if (w.id !== chain.id) return w;
            const nhp = Math.max(0, w.hp - chainDmg);
            if (nhp <= 0) {
              sfxNpcDeath();
              if (walkDataRef.current[w.id]) walkDataRef.current[w.id].alive = false;
              addMoneyFn(w.npcData.loot || {});
              if (hasRelic("golden_reaper")) addMoneyFn(w.npcData.loot || {});
              setKills(k => k + 1);
              setTimeout(() => setWalkers(pr => pr.filter(ww => ww.id !== w.id)), 2500);
              return { ...w, hp: 0, dying: true, dyingAt: Date.now() };
            }
            return { ...w, hp: nhp };
          }));
        }
      }

      // Drain: heal mana proportional to damage
      if (spell.id === "drain") {
        const healAmount = Math.round(damage * 0.5);
        setMana(m => Math.min(MAX_MANA, m + healAmount));
        showMessage(`Zrabowano ${healAmount} prochu!`, "#c02060");
      }

      setWalkers(prev => prev.map(w => {
        if (w.id !== wid) return w;
        const newHp = Math.max(0, w.hp - damage);
        if (newHp <= 0) {
          sfxNpcDeath();
          if (walkDataRef.current[wid]) walkDataRef.current[wid].alive = false;
          if (physicsRef.current) physicsRef.current.triggerRagdoll(wid, getDeathElement(spell), spellDirX);
          addMoneyFn(npcData.loot);
          // golden_reaper: double loot
          if (hasRelic("golden_reaper")) addMoneyFn(npcData.loot);
          // piracki_monopol synergy: 20% chance bonus treasure on kill
          if (hasSynergy("piracki_monopol") && Math.random() < 0.20) {
            const bt = pickTreasure(roomRef.current);
            bt.biome = "Monopol"; bt.room = roomRef.current;
            setInventory(prev => [...prev, bt]);
            showMessage("Piracki Monopol! Bonus skarb!", "#d4a030");
          }
          // Perk: loot value multiplier
          if (perkLootMult > 1 && npcData.loot) {
            const bonusCu = Math.round((npcData.loot.copper || 0) * (perkLootMult - 1));
            if (bonusCu > 0) addMoneyFn({ copper: bonusCu });
          }
          setKills(k => k + 1);
          handleCardDrop(npcData);
          { const _wd = walkDataRef.current[w.id]; rollAmmoDrop(_wd?.wx ?? _wd?.x, _wd?.wy ?? _wd?.y); rollSaberDrop(_wd?.wx ?? _wd?.x, _wd?.wy ?? _wd?.y); }
          // XP grant on kill
          const xpAmt = w.isBoss ? 100 : w.isElite ? 50 : 10 + roomRef.current * 2;
          grantXp(xpAmt);
          // Kill streak
          processKillStreak();
          // Biome modifier: kill_heal (blue_lagoon — heal caravan on kills in zone)
          const killMod2 = biomeModifierRef.current?.effect;
          if (killMod2?.type === "kill_heal") {
            const kwd = walkDataRef.current[wid];
            const inZone = !killMod2.zoneRequired || (killMod2.zoneRequired === "bottom" && kwd && kwd.y > (100 - (killMod2.zoneSize || 40)));
            if (inZone) {
              setCaravanHp(prev2 => Math.min(CARAVAN_LEVELS[caravanLevelRef.current].hp, prev2 + killMod2.healPerKill));
              showMessage(`${biomeModifierRef.current.name}: +${killMod2.healPerKill} HP!`, "#40e0e0");
            }
          }
          // Biome modifier: zombie_respawn (underworld — 15% respawn as weakened zombie)
          if (killMod2?.type === "zombie_respawn" && Math.random() < (killMod2.respawnChance || 0) && !w.isZombie) {
            const zwd = walkDataRef.current[wid];
            setTimeout(() => {
              const zid = ++walkerIdCounter;
              const zx = zwd?.x || 50;
              const zy = zwd?.y || 50;
              const zNpc = { ...npcData, name: `Zombie ${npcData.name}`, hp: Math.round(npcData.hp * (killMod2.respawnHpMult || 0.4)), loot: {}, isIllusion: false };
              zNpc.hp = Math.max(1, zNpc.hp);
              setWalkers(pr => [...pr, { id: zid, npcData: zNpc, alive: true, dying: false, hp: zNpc.hp, maxHp: zNpc.hp, isZombie: true }]);
              walkDataRef.current[zid] = { x: zx, y: zy, dir: Math.random() < 0.5 ? -1 : 1, yDir: 1, speed: 0.008, ySpeed: 0.008, minX: 5, maxX: 98, minY: 25, maxY: 92, bouncePhase: 0, alive: true, friendly: false, damage: Math.ceil(zNpc.hp / 6 * (killMod2.respawnDmgMult || 0.5)), lungeFrames: 0, lungeOffset: 0, ability: null, attackCd: 3500 };
              if (physicsRef.current) physicsRef.current.spawnNpc(zid, zx, zNpc, false, zy);
              showMessage("Zombie odrodzony!", "#8040c0");
            }, killMod2.respawnDelay || 8000);
          }
          // necromancer: 10% chance to spawn temp friendly
          if (hasRelic("necromancer") && Math.random() < 0.10) {
            const mt = MERCENARY_TYPES[Math.floor(Math.random() * MERCENARY_TYPES.length)];
            setTimeout(() => {
              const nid = ++walkerIdCounter;
              const _iso = isoModeRef.current;
              const sx = walkDataRef.current[wid]?.x || (_iso ? ISO_CONFIG.MAP_COLS / 2 : 50);
              const _sy = walkDataRef.current[wid]?.y || (_iso ? ISO_CONFIG.MAP_ROWS / 2 : 50);
              const nHp = Math.round(mt.hp * 0.7);
              const nDmg = Math.round(mt.damage * 0.7);
              const nd = { icon: mt.icon, name: `${mt.name}`, hp: nHp, resist: null, loot: {}, bodyColor: mt.bodyColor, armorColor: mt.armorColor, weapon: mt.weapon };
              setWalkers(pr => [...pr, { id: nid, npcData: nd, alive: true, dying: false, hp: nHp, maxHp: nHp, friendly: true }]);
              walkDataRef.current[nid] = { x: sx, y: _sy, dir: 1, yDir: 1, speed: mt.speed, ySpeed: 0.01, minX: _iso ? 1 : 5, maxX: _iso ? ISO_CONFIG.MAP_COLS - 1 : 90, minY: _iso ? 1 : 25, maxY: _iso ? ISO_CONFIG.MAP_ROWS - 1 : 90, bouncePhase: 0, alive: true, friendly: true, damage: nDmg, attackCd: mt.attackCd || 2500, lungeFrames: 0, lungeOffset: 0, combatStyle: mt.combatStyle || "melee", mercType: mt.id, range: mt.range || 35 };
              if (physicsRef.current) physicsRef.current.spawnNpc(nid, _toPhysPct(sx, _iso, ISO_CONFIG.MAP_COLS), nd, true, _toPhysPct(_sy, _iso, ISO_CONFIG.MAP_ROWS));
              showMessage(`Nekromancja! ${mt.name} przywołany!`, "#a050e0");
              setTimeout(() => {
                if (walkDataRef.current[nid]) walkDataRef.current[nid].alive = false;
                if (physicsRef.current) physicsRef.current.removeNpc(nid);
                setWalkers(pr => pr.filter(ww => ww.id !== nid));
              }, 15000);
            }, 300);
          }
          if (npcData.biomeId === "meteor" && Math.random() < 0.08 && !ownedSabersRef.current.includes("moonblade")) {
            setOwnedSabers(prev => prev.includes("moonblade") ? prev : [...prev, "moonblade"]);
            showMessage("Zdobyto: Miecz Pełni Księżyca! Załóż w ekwipunku.", "#d4a030");
          }
          if (!resistant) showMessage(`${npcData.name} pokonany! +${formatLootText(npcData.loot)}`, "#e05040");
          else setTimeout(() => showMessage(`${npcData.name} pokonany! +${formatLootText(npcData.loot)}`, "#e05040"), 800);
          setTimeout(() => {
            setWalkers(pr => pr.map(ww => ww.id === wid ? { ...ww, alive: false } : ww));
          }, 2500);
          return { ...w, hp: 0, dying: true, dyingAt: Date.now() };
        }
        if (physicsRef.current) physicsRef.current.applyHit(wid, spell.element, spellDirX);
        return { ...w, hp: newHp };
      }));
    }, deathDelay);

    setSelectedSpell(null);
    setDragHighlight(null);
  }, [mana, cooldowns, addMoneyFn, showMessage, spawnDmgPopup]);

  // ─── AoE SPELL (hits all enemies) ───
  const castAoeSpell = useCallback((spell) => {
    if (!canCastSpell(spell)) {
      if (spell.ammoCost && (ammoRef.current[spell.ammoCost.type] || 0) < spell.ammoCost.amount) {
        const ammoNames = { dynamite: "dynamitu", harpoon: "harpunów", cannonball: "kul armatnich", rum: "rumu", chain: "łańcuchów" };
        showMessage(`Brak ${ammoNames[spell.ammoCost.type] || "amunicji"}!`, "#c04040");
      } else if (manaRef.current < getSpellManaCost(spell)) showMessage("Za mało prochu!", "#c0a060");
      else showMessage("Akcja jeszcze nie gotowa!", "#cc8040");
      return;
    }

    const manaCost = getSpellManaCost(spell);
    manaRef.current -= manaCost;
    setMana(m => Math.max(0, m - manaCost));
    if (spell.ammoCost) {
      const spellUps = spellUpgradesRef.current[spell.id] || [];
      const uStats = getUpgradedSpellStats(spell, spellUps);
      const ammoCost = Math.max(1, spell.ammoCost.amount - uStats.ammoCostReduction);
      setAmmo(prev => ({ ...prev, [spell.ammoCost.type]: (prev[spell.ammoCost.type] || 0) - ammoCost }));
    }
    {
      const spellUps = spellUpgradesRef.current[spell.id] || [];
      const uStats = getUpgradedSpellStats(spell, spellUps);
      const finalCd = Math.round(uStats.cooldown * perkCooldownMult * artifactCooldownMultRef.current);
      setCooldowns(prev => ({ ...prev, [spell.id]: Date.now() + finalCd }));
    }

    const sfxFn = SPELL_SFX[spell.id];
    if (sfxFn) sfxFn();

    // Play AoE visual effect on canvas
    if (animatorRef.current) {
      // Collect enemy positions for chain lightning
      const enemyPositions = [];
      const curWalkers = walkersRef.current || [];
      curWalkers.forEach(w => {
        if (w.friendly || !w.alive || w.dying) return;
        const el = npcElsRef.current[w.id];
        if (el && gameContainerRef.current) {
          const gr = gameContainerRef.current.getBoundingClientRect();
          const r = el.getBoundingClientRect();
          enemyPositions.push({
            x: ((r.left + r.width / 2) - gr.left) / gameScale,
            y: ((r.top + r.height / 2) - gr.top) / gameScale,
          });
        }
      });
      animatorRef.current.playAoeSpell(spell.id, spell.color, spell.colorLight, enemyPositions);
    }

    // Screen shake for earthquake and meteor
    if (spell.id === "earthquake" || spell.id === "meteor") {
      setScreenShake(true);
      setTimeout(() => setScreenShake(false), spell.id === "earthquake" ? 250 : 200);
    }

    // Apply damage to all alive enemies after delay
    const deathDelay = spell.id === "earthquake" ? 300 : spell.id === "chainlightning" ? 200 : 500;

    setTimeout(() => {
      setWalkers(prev => prev.map(w => {
        if (w.friendly || !w.alive || w.dying) return w;
        const npcData = w.npcData;
        const resistant = npcData.resist && npcData.resist === spell.element;
        const aoeSpellUps = spellUpgradesRef.current[spell.id] || [];
        const aoeUpgradedStats = getUpgradedSpellStats(spell, aoeSpellUps);
        let damage = Math.round(aoeUpgradedStats.damage * (resistant ? RESIST_MULT : 1));
        damage = applyWeatherDamage(damage, spell.element, weatherRef.current);
        damage = applyModifierDamage(damage, spell.element, biomeModifierRef.current);
        if (hasRelic("chaos_blade")) damage = Math.round(damage * 1.40);
      if (hasRelic("mermaid_tear") && spell.element === "ice") damage = Math.round(damage * 1.25);
        damage = Math.round(damage * getKnowledgeBonus(npcData.id) * getKnowledgeMilestoneBonus() * getBestiaryKillBonus(npcData.name));
        damage = Math.round(damage * perkSpellDmgMult);
        if (playerDoubleDmgRoomsRef.current > 0) damage = Math.round(damage * 2);
        if (secretPermDmgBuffRef.current > 0) damage = Math.round(damage * (1 + secretPermDmgBuffRef.current));
        if (secretSpellBuffRoomsRef.current > 0 && secretSpellBuffMultRef.current > 0) damage = Math.round(damage * (1 + secretSpellBuffMultRef.current));
        if (artifactDmgMultRef.current !== 1) damage = Math.round(damage * artifactDmgMultRef.current);
        // Element combo for AoE (uses imported COMBOS)
        const prevDebuff = elementDebuffs.current[w.id];
        let comboText = null;
        if (prevDebuff && spell.element && prevDebuff.element !== spell.element && Date.now() - prevDebuff.timestamp < 5000) {
          const comboKey = [prevDebuff.element, spell.element].sort().join("+");
          const combo = COMBOS[comboKey];
          if (combo) {
            const streakBonus = Math.min(COMBO_STREAK_CAP, comboCounterRef.current * COMBO_STREAK_BONUS);
            damage = Math.round(damage * (combo.mult + streakBonus));
            comboText = combo;
            setComboCounter(prev => { const nc = prev + 1; updateComboLevel(nc); return nc; });
            setActiveCombo(combo);
            if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
            comboTimerRef.current = setTimeout(() => { setComboCounter(0); setActiveCombo(null); updateComboLevel(0); }, COMBO_STREAK_TIMEOUT);
          }
        }
        if (spell.element) elementDebuffs.current[w.id] = { element: spell.element, timestamp: Date.now() };
        const wd = walkDataRef.current[w.id];
        const spellDirX = wd ? (wd.x > (isoModeRef.current ? ISO_CONFIG.MAP_COLS / 2 : 50) ? 1 : -1) : 1;

        if (resistant) {
          const resistLabel = RESIST_NAMES[npcData.resist] || npcData.resist;
          showMessage(`${npcData.name} odporny na ${resistLabel}!`, "#6688aa");
        }

        const dmgLabel = comboText ? `COMBO x${comboCounterRef.current + 1}! ${damage}` : resistant ? `${damage} BLOK` : `${damage}`;
        spawnDmgPopup(w.id, dmgLabel, resistant ? "#6688aa" : comboText ? comboText.color : spell.color);

        // blood_weapon: heal random friendly for 15% of damage
        if (hasRelic("blood_weapon")) {
          const friendlies = prev.filter(ww => ww.alive && !ww.dying && ww.friendly && ww.hp < ww.maxHp);
          if (friendlies.length > 0) {
            const target = friendlies[Math.floor(Math.random() * friendlies.length)];
            const healMult = hasSynergy("desperacka_krew") && target.hp / target.maxHp < 0.30 ? 0.30 : 0.15;
            const healAmt = Math.round(damage * healMult);
            setTimeout(() => {
              setWalkers(pr => pr.map(ww => ww.id === target.id ? { ...ww, hp: Math.min(ww.maxHp, ww.hp + healAmt) } : ww));
              spawnDmgPopup(target.id, `+${healAmt}`, "#40e060");
            }, 50);
          }
        }

        const newHp = Math.max(0, w.hp - damage);
        if (newHp <= 0) {
          sfxNpcDeath();
          if (walkDataRef.current[w.id]) walkDataRef.current[w.id].alive = false;
          if (physicsRef.current) physicsRef.current.triggerRagdoll(w.id, getDeathElement(spell), spellDirX);
          addMoneyFn(npcData.loot);
          if (hasRelic("golden_reaper")) addMoneyFn(npcData.loot);
          if (hasSynergy("piracki_monopol") && Math.random() < 0.20) {
            const bt = pickTreasure(roomRef.current);
            bt.biome = "Monopol"; bt.room = roomRef.current;
            setInventory(prev2 => [...prev2, bt]);
          }
          if (perkLootMult > 1 && npcData.loot) {
            const bonusCu = Math.round((npcData.loot.copper || 0) * (perkLootMult - 1));
            if (bonusCu > 0) addMoneyFn({ copper: bonusCu });
          }
          setKills(k => k + 1);
          handleCardDrop(npcData);
          { const _wd = walkDataRef.current[w.id]; rollAmmoDrop(_wd?.wx ?? _wd?.x, _wd?.wy ?? _wd?.y); rollSaberDrop(_wd?.wx ?? _wd?.x, _wd?.wy ?? _wd?.y); }
          const xpAmt = w.isBoss ? 100 : w.isElite ? 50 : 10 + roomRef.current * 2;
          grantXp(xpAmt);
          processKillStreak();
          // Biome modifier: kill_heal (blue_lagoon)
          const killMod3 = biomeModifierRef.current?.effect;
          if (killMod3?.type === "kill_heal") {
            const kwd3 = walkDataRef.current[w.id];
            const inZone3 = !killMod3.zoneRequired || (killMod3.zoneRequired === "bottom" && kwd3 && kwd3.y > (100 - (killMod3.zoneSize || 40)));
            if (inZone3) {
              setCaravanHp(prev2 => Math.min(CARAVAN_LEVELS[caravanLevelRef.current].hp, prev2 + killMod3.healPerKill));
              showMessage(`${biomeModifierRef.current.name}: +${killMod3.healPerKill} HP!`, "#40e0e0");
            }
          }
          // Biome modifier: zombie_respawn (underworld)
          if (killMod3?.type === "zombie_respawn" && Math.random() < (killMod3.respawnChance || 0) && !w.isZombie) {
            const zwd3 = walkDataRef.current[w.id];
            setTimeout(() => {
              const zid3 = ++walkerIdCounter;
              const zx3 = zwd3?.x || (isoModeRef.current ? ISO_CONFIG.MAP_COLS / 2 : 50);
              const zy3 = zwd3?.y || (isoModeRef.current ? ISO_CONFIG.MAP_ROWS / 2 : 50);
              const zNpc3 = { ...npcData, name: `Zombie ${npcData.name}`, hp: Math.round(npcData.hp * (killMod3.respawnHpMult || 0.4)), loot: {}, isIllusion: false };
              zNpc3.hp = Math.max(1, zNpc3.hp);
              setWalkers(pr => [...pr, { id: zid3, npcData: zNpc3, alive: true, dying: false, hp: zNpc3.hp, maxHp: zNpc3.hp, isZombie: true }]);
              walkDataRef.current[zid3] = { x: zx3, y: zy3, dir: Math.random() < 0.5 ? -1 : 1, yDir: 1, speed: 0.008, ySpeed: 0.008, minX: 5, maxX: 98, minY: 25, maxY: 92, bouncePhase: 0, alive: true, friendly: false, damage: Math.ceil(zNpc3.hp / 6 * (killMod3.respawnDmgMult || 0.5)), lungeFrames: 0, lungeOffset: 0, ability: null, attackCd: 3500 };
              if (physicsRef.current) physicsRef.current.spawnNpc(zid3, zx3, zNpc3, false, zy3);
              showMessage("Zombie odrodzony!", "#8040c0");
            }, killMod3.respawnDelay || 8000);
          }
          // necromancer: 10% chance to spawn temp friendly
          if (hasRelic("necromancer") && Math.random() < 0.10) {
            const mt = MERCENARY_TYPES[Math.floor(Math.random() * MERCENARY_TYPES.length)];
            setTimeout(() => {
              const nid = ++walkerIdCounter;
              const sx = walkDataRef.current[w.id]?.x || 50;
              const nHp = Math.round(mt.hp * 0.7);
              const nDmg = Math.round(mt.damage * 0.7);
              const nd = { icon: mt.icon, name: `${mt.name}`, hp: nHp, resist: null, loot: {}, bodyColor: mt.bodyColor, armorColor: mt.armorColor, weapon: mt.weapon };
              setWalkers(pr => [...pr, { id: nid, npcData: nd, alive: true, dying: false, hp: nHp, maxHp: nHp, friendly: true }]);
              walkDataRef.current[nid] = { x: sx, y: 25 + Math.random() * 65, dir: 1, yDir: 1, speed: mt.speed, ySpeed: 0.01, minX: 5, maxX: 90, minY: 25, maxY: 90, bouncePhase: 0, alive: true, friendly: true, damage: nDmg, attackCd: mt.attackCd || 2500, lungeFrames: 0, lungeOffset: 0, combatStyle: mt.combatStyle || "melee", mercType: mt.id, range: mt.range || 35 };
              if (physicsRef.current) physicsRef.current.spawnNpc(nid, sx, nd, true);
              showMessage(`Nekromancja! ${mt.name} przywołany!`, "#a050e0");
              setTimeout(() => {
                if (walkDataRef.current[nid]) walkDataRef.current[nid].alive = false;
                if (physicsRef.current) physicsRef.current.removeNpc(nid);
                setWalkers(pr => pr.filter(ww => ww.id !== nid));
              }, 15000);
            }, 300);
          }
          showMessage(`${npcData.name} pokonany! +${formatLootText(npcData.loot)}`, "#e05040");
          setTimeout(() => {
            setWalkers(pr => pr.map(ww => ww.id === w.id ? { ...ww, alive: false } : ww));
          }, 2500);
          return { ...w, hp: 0, dying: true, dyingAt: Date.now() };
        }
        if (physicsRef.current) physicsRef.current.applyHit(w.id, spell.element, spellDirX);
        return { ...w, hp: newHp };
      }));

      // (tower AoE damage removed)
    }, deathDelay);

    setSelectedSpell(null);
    setDragHighlight(null);
  }, [mana, cooldowns, addMoneyFn, showMessage, spawnDmgPopup]);

  const handleSpellDrop = (e, walker) => {
    e.preventDefault();
    setDragHighlight(null);
    if (walker.friendly) return;
    const spellId = e.dataTransfer.getData("text/plain");
    if (spellId === "summon") return;
    const spell = SPELLS.find(s => s.id === spellId);
    if (!spell) return;
    if (spell.aoe) { castAoeSpell(spell); return; }
    // AoE upgrade: redirect single-target to AoE
    const spUps = spellUpgradesRef.current[spell.id] || [];
    if (spUps.includes("aoe")) { castAoeSpell(spell); return; }
    castSpellOnTarget(spell, walker);
  };

  const handleNpcClick = (walker) => {
    if (walker.friendly) return;
    if (!selectedSpell) {
      // Inspect NPC – show info in bottom-left
      setInspectedNpc({
        icon: walker.npcData.icon,
        name: walker.npcData.name,
        hp: walker.hp,
        maxHp: walker.maxHp,
        resist: walker.npcData.resist,
        rarity: walker.npcData.rarity,
        biomeIcon: biome?.icon || "",
        biomeName: biome?.name || "",
      });
      setTimeout(() => setInspectedNpc(null), 4000);
      return;
    }
    const spell = SPELLS.find(s => s.id === selectedSpell);
    if (!spell) return;

    // Skillshot spells: clicking on NPC fires a skillshot aimed at the NPC's position
    if (spell.skillshot) {
      const el = npcElsRef.current[walker.id];
      if (el && gameContainerRef.current) {
        const gr = gameContainerRef.current.getBoundingClientRect();
        const r = el.getBoundingClientRect();
        const screenX = ((r.left + r.width / 2) - gr.left) / gameScale;
        const screenY = ((r.top + r.height / 2) - gr.top) / gameScale;
        if (isoModeRef.current) {
          // Convert screen-space to ISO world tile coords, then to physics pixels
          const cam = isoCameraRef.current;
          const isoWorld = _isoScreenToWorld(screenX, screenY, cam.x, cam.y);
          const targetPx = (isoWorld.x / ISO_CONFIG.MAP_COLS) * GAME_W;
          const targetPy = (isoWorld.y / ISO_CONFIG.MAP_ROWS) * GAME_H;
          castSkillshot(spell, targetPx, targetPy);
        } else {
          // Panoramic: convert screen x to world x by adding pan offset
          const worldX = _screenToWorld(screenX, panOffsetRef.current, GAME_W);
          castSkillshot(spell, worldX, screenY);
        }
      }
      return;
    }

    if (spell.aoe) { castAoeSpell(spell); return; }
    // AoE upgrade redirect
    const spUps = spellUpgradesRef.current[spell.id] || [];
    if (spUps.includes("aoe")) { castAoeSpell(spell); return; }

    // Cast spell on target (legacy non-skillshot)
    castSpellOnTarget(spell, walker);
  };

  const handleSelectSpell = (spellId) => {
    if (spellId === "summon") {
      setSummonPicker(prev => !prev);
      setSelectedSpell(null);
      setSkillshotMode(false);
      setSkillshotSpell(null);
      return;
    }
    setSummonPicker(false);

    const spell = SPELLS.find(s => s.id === spellId);

    // Skillshot spells: select and enter aiming mode (even AoE ones)
    if (spell && spell.skillshot) {
      if (selectedSpell === spellId) {
        // Deselect
        setSelectedSpell(null);
        setSkillshotMode(false);
        setSkillshotSpell(null);
      } else {
        setSelectedSpell(spellId);
        setSkillshotMode(true);
        setSkillshotSpell(spell);
      }
      return;
    }

    // Wand: select/deselect wand mode (activates on press-and-hold in game area)
    if (spell && spell.isWand) {
      setSelectedSpell(prev => prev === spellId ? null : spellId);
      setSkillshotMode(prev => prev ? prev : true);
      return;
    }

    // Non-skillshot AoE spells cast immediately (legacy support)
    if (spell && spell.aoe && !spell.skillshot) {
      castAoeSpell(spell);
      return;
    }
    setSelectedSpell(prev => prev === spellId ? null : spellId);
  };

  // ─── KEYBOARD HOTKEYS ───
  const handleSelectSpellRef = useRef(handleSelectSpell);
  handleSelectSpellRef.current = handleSelectSpell;

  useEffect(() => {
    const handleKey = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      // Number keys 1-5 to select spells
      const num = parseInt(e.key);
      if (num >= 1 && num <= SPELLS.length) {
        e.preventDefault();
        const spell = SPELLS[num - 1];
        if (spell) handleSelectSpellRef.current(spell.id);
        return;
      }
      // Escape to cancel selection + skillshot mode + trap placement + secret room
      if (e.key === "Escape") {
        if (secretRoomRef.current) { setSecretRoom(null); return; }
        setSelectedSpell(null);
        setSkillshotMode(false);
        setSkillshotSpell(null);
        setPlacingTrap(null);
        return;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [showMessage]);

  // (tower attack function removed)

  // ─── SHOP ───

  const sellItem = (idx) => {
    const it = inventory[idx]; if (!it) return;
    sfxSell(); addMoneyFn(it.value);
    setInventory(prev => prev.filter((_, i) => i !== idx)); setSelectedInv(-1);
    showMessage(`Sprzedano ${it.name}!`, "#b87333");
  };

  const sellAll = () => {
    if (inventory.length === 0) return;
    let totalVal = 0;
    inventory.forEach(it => { totalVal += totalCopper(it.value); });
    setMoney(prev => copperToMoney(totalCopper(prev) + totalVal));
    sfxSell();
    showMessage(`Sprzedano ${inventory.length} przedmiotów! +${totalVal} Cu`, "#d4a030");
    setInventory([]);
    setSelectedInv(-1);
  };

  const storeAll = () => {
    const hlvl = HIDEOUT_LEVELS[hideoutLevel];
    const available = hlvl.slots - hideoutItems.length;
    if (available <= 0 || inventory.length === 0) return;
    const toStore = inventory.slice(0, available);
    sfxStore();
    setHideoutItems(prev => [...prev, ...toStore]);
    setInventory(prev => prev.slice(available));
    setSelectedInv(-1);
    showMessage(`Przeniesiono ${toStore.length} przedmiotów do bazy!`, "#40a8b8");
  };

  const buyTool = (toolId) => {
    if (ownedTools.includes(toolId)) return;
    const tool = SHOP_TOOLS.find(t => t.id === toolId); if (!tool) return;
    const tc = totalCopper(money); const need = totalCopper(tool.cost);
    if (tc < need) { showMessage("Za mało monet!", "#b83030"); return; }
    sfxBuy(); setMoney(copperToMoney(tc - need));
    setOwnedTools(prev => [...prev, toolId]); showMessage(`Kupiono ${tool.name}!`, "#50a850");
  };

  const buyMana = (potionId) => {
    const potion = MANA_POTIONS.find(p => p.id === potionId);
    if (!potion) return;
    if (mana >= MAX_MANA) { showMessage("Proch pełny!", "#c0a060"); return; }
    const tc = totalCopper(money); const need = totalCopper(potion.cost);
    if (tc < need) { showMessage("Za mało monet!", "#b83030"); return; }
    sfxDrinkMana(); setMoney(copperToMoney(tc - need));
    setMana(prev => Math.min(MAX_MANA, prev + potion.mana));
    showMessage(`+${potion.mana} prochu!`, "#c0a060");
  };

  const buyAmmo = (itemId) => {
    const item = AMMO_ITEMS.find(a => a.id === itemId);
    if (!item) return;
    const tc = totalCopper(money); const need = totalCopper(item.cost);
    if (tc < need) { showMessage("Za mało monet!", "#b83030"); return; }
    sfxBuy(); setMoney(copperToMoney(tc - need));
    setAmmo(prev => ({ ...prev, [item.ammoType]: (prev[item.ammoType] || 0) + item.amount }));
    showMessage(`+${item.amount} ${item.name}!`, "#e0a040");
  };

  const buySaber = (saberId) => {
    if (ownedSabersRef.current.includes(saberId)) { showMessage("Już posiadasz tę szablę!", "#c0a060"); return; }
    const saber = SABERS.find(s => s.id === saberId); if (!saber) return;
    const tc = totalCopper(money); const need = saber.price * 100; // price in silver
    if (tc < need) { showMessage("Za mało monet!", "#b83030"); return; }
    sfxBuy(); setMoney(copperToMoney(tc - need));
    setOwnedSabers(prev => prev.includes(saberId) ? prev : [...prev, saberId]);
    setEquippedSaber(saberId);
    showMessage(`Zdobyto: ${saber.name}!`, saber.color);
  };

  // ─── BAZAAR SPECIALS: Buy unique / biome items ───
  const buySpecialItem = (item) => {
    const cost = shopDiscount !== 0 ? applyDiscount(item.cost, shopDiscount) : item.cost;
    const tc = totalCopper(money); const need = totalCopper(cost);
    if (tc < need) { showMessage("Za mało monet!", "#b83030"); return; }
    sfxBuy(); setMoney(copperToMoney(tc - need));
    setBoughtSpecials(prev => [...prev, item.id]);
    // Remove from current shop stock
    setShopStock(prev => {
      if (!prev) return prev;
      return {
        specials: prev.specials.filter(s => s.id !== item.id),
        biomeItems: prev.biomeItems.filter(s => s.id !== item.id),
      };
    });
    // Apply immediate effects
    const eff = item.effect;
    if (eff.type === "heal") {
      setCaravanHp(prev => Math.min(prev + eff.amount, CARAVAN_LEVELS[caravanLevel].hp));
      showMessage(`+${eff.amount} HP karawany!`, "#40c040");
    } else if (eff.type === "restore") {
      if (eff.hp) setCaravanHp(prev => Math.min(prev + eff.hp, CARAVAN_LEVELS[caravanLevel].hp));
      if (eff.mana) setMana(prev => Math.min(prev + eff.mana, MAX_MANA));
      showMessage(`Przywrócono ${eff.hp || 0} HP i ${eff.mana || 0} prochu!`, "#40c0c0");
    } else if (eff.type === "full_mana") {
      setMana(MAX_MANA);
      showMessage("Proch w pełni przywrócony!", "#80d0ff");
    } else if (eff.type === "perm_armor") {
      // Permanent armor stored as buff with duration -1
      setActiveBuffs(prev => [...prev, { id: item.id, name: item.name, effect: eff, roomsLeft: -1, color: item.color }]);
      showMessage(`+${eff.armor} pancerza permanentnie!`, item.color);
    } else if (eff.type === "perm_max_hp") {
      setCaravanHp(prev => prev + eff.amount);
      showMessage(`+${eff.amount} max HP karawany!`, item.color);
    } else if (eff.type === "instant_level") {
      setPlayerXp(prev => prev); // trigger level up logic
      setPlayerLevel(prev => prev + 1);
      showMessage("Poziom w górę! (Nektar Bogów)", item.color);
    } else if (eff.type === "trade_value") {
      setInventory(prev => [...prev, { id: Date.now(), icon: item.icon, name: item.name, rarity: item.rarity, value: eff.value }]);
      showMessage(`${item.name} dodano do ekwipunku!`, item.color);
    } else if (eff.type === "random_buff") {
      const chosen = eff.options[Math.floor(Math.random() * eff.options.length)];
      setActiveBuffs(prev => [...prev, { id: chosen.id, name: chosen.name, effect: chosen.buff, roomsLeft: eff.duration, color: chosen.color }]);
      showMessage(`${chosen.name}: ${chosen.desc} (${eff.duration} pokoje)`, chosen.color);
    } else {
      // Duration-based buffs
      const duration = eff.duration || eff.charges || 3;
      setActiveBuffs(prev => [...prev, { id: item.id, name: item.name, effect: eff, roomsLeft: duration, color: item.color }]);
      showMessage(`${item.name} aktywowany! (${duration > 0 ? duration + " pokoje" : "permanentnie"})`, item.color);
    }
  };

  const doBargain = () => {
    if (bargainUsed) { showMessage("Już się targowałeś!", "#c0a060"); return; }
    setBargainUsed(true);
    const relicIds = activeRelics.map(r => r.id);
    const result = attemptBargain(money, relicIds);
    setShopDiscount(result.discount);
    if (result.success) {
      showMessage(`Udane targowanie! (${result.roll}/${result.threshold}) — ${Math.round(result.discount * 100)}% zniżki!`, "#50e050");
    } else {
      showMessage(`Nieudane targowanie... (${result.roll}/${result.threshold}) — ceny wzrosły o ${Math.round(Math.abs(result.discount) * 100)}%!`, "#e05050");
    }
  };

  const equipSaber = (saberId) => {
    if (!ownedSabers.includes(saberId)) return;
    setEquippedSaber(saberId);
    const saber = SABERS.find(s => s.id === saberId);
    // Moonblade: roll random bonuses on equip
    if (saberId === "moonblade") {
      const dmgBonus = Math.round(Math.random() * 60) / 100; // 0.00 - 0.60
      const spellBonus = Math.round(Math.random() * 60) / 100;
      setMoonbladeBonus({ dmgBonus, spellBonus });
      showMessage(`Miecz Pełni Księżyca! +${Math.round(dmgBonus * 100)}% obrażenia, +${Math.round(spellBonus * 100)}% moc umiejętności`, "#d4a030");
    } else {
      showMessage(`Wyposażono: ${saber?.name || saberId}`, saber?.color || "#c0c0c0");
    }
  };

  const rollAmmoDrop = (killWx, killWy) => {
    const ammoIcons = { dynamite: "dynamite", harpoon: "harpoon", cannonball: "cannon", rum: "pirateRaid", chain: "ricochet" };
    const ammoLabels = { dynamite: "Dynamit", harpoon: "Harpun", cannonball: "Kula", rum: "Rum", chain: "Łańcuch" };
    // 8% chance to drop a health elixir
    if (Math.random() < 0.08) {
      if (killWx != null && killWy != null) {
        const scatter = (r) => (Math.random() - 0.5) * r;
        setGroundLoot(prev => [...prev, {
          id: `gl_potion_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
          type: "health_potion",
          x: killWx + scatter(2), y: killWy + scatter(1.5),
          icon: "flask", label: "Eliksir życia",
          collected: false, spawnTime: Date.now(),
        }]);
      } else {
        const maxHp = CARAVAN_LEVELS[caravanLevelRef.current].hp;
        setCaravanHp(prev => Math.min(maxHp, prev + Math.round(maxHp * 0.25)));
        showMessage("+25% HP! Eliksir życia!", "#44ff88");
      }
      return;
    }
    for (const drop of AMMO_DROP_TABLE) {
      if (Math.random() < drop.chance) {
        if (killWx != null && killWy != null) {
          const scatter = (r) => (Math.random() - 0.5) * r;
          setGroundLoot(prev => [...prev, {
            id: `gl_ammo_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
            type: "ammo", value: { [drop.type]: drop.amount },
            x: killWx + scatter(2.5), y: killWy + scatter(1.5),
            icon: ammoIcons[drop.type] || "dynamite",
            label: `${ammoLabels[drop.type]} x${drop.amount}`,
            collected: false, spawnTime: Date.now(),
          }]);
        } else {
          setAmmo(prev => ({ ...prev, [drop.type]: (prev[drop.type] || 0) + drop.amount }));
          showMessage(`+${drop.amount} ${ammoLabels[drop.type]}!`, "#e0a040");
        }
        return;
      }
    }
  };

  // 8% chance to drop a saber on the ground from monster kills
  const rollSaberDrop = (killWx, killWy) => {
    if (Math.random() > 0.08) return;
    const unowned = SABERS.filter(s => !s.starter && !s.dropOnly && !ownedSabersRef.current.includes(s.id));
    if (unowned.length === 0) return;
    const saber = unowned[Math.floor(Math.random() * unowned.length)];
    if (killWx != null && killWy != null) {
      const scatter = (r) => (Math.random() - 0.5) * r;
      setGroundLoot(prev => [...prev, {
        id: `gl_saber_${Date.now()}_${saber.id}`,
        type: "saber_drop", saberId: saber.id,
        x: killWx + scatter(2), y: killWy + scatter(1),
        icon: saber.icon || "swords", label: saber.name,
        collected: false, spawnTime: Date.now(),
        rarity: saber.rarity || "common",
      }]);
    } else {
      setOwnedSabers(prev => prev.includes(saber.id) ? prev : [...prev, saber.id]);
      showMessage(`Zdobyto szablę: ${saber.name}!`, saber.color);
    }
  };

  const storeItem = (idx) => {
    const hlvl = HIDEOUT_LEVELS[hideoutLevel];
    if (hideoutItems.length >= hlvl.slots) { showMessage("Baza pełna!", "#b83030"); return; }
    sfxStore(); const it = inventory[idx];
    setInventory(prev => prev.filter((_, i) => i !== idx));
    setHideoutItems(prev => [...prev, it]); setSelectedInv(-1);
    showMessage(`${it.name} → Baza`, "#40a8b8");
  };

  const retrieveItem = (idx) => {
    sfxRetrieve(); const it = hideoutItems[idx];
    setHideoutItems(prev => prev.filter((_, i) => i !== idx));
    setInventory(prev => [...prev, it]); showMessage(`${it.name} ← z Bazy`, "#50a850");
  };

  const upgradeHideout = () => {
    if (hideoutLevel >= HIDEOUT_LEVELS.length - 1) return;
    const next = HIDEOUT_LEVELS[hideoutLevel + 1];
    const tc = totalCopper(money); const need = totalCopper(next.cost);
    if (tc < need) { showMessage("Za mało monet!", "#b83030"); return; }
    sfxUpgrade(); setMoney(copperToMoney(tc - need));
    setHideoutLevel(l => l + 1);
    showMessage(`Baza → ${HIDEOUT_LEVELS[hideoutLevel + 1].name}`, "#d4a030");
  };

  const purchaseHideoutUpgrade = (upgradeId) => {
    const upg = HIDEOUT_UPGRADES.find(u => u.id === upgradeId);
    if (!upg) return;
    const currentLvl = hideoutUpgrades[upgradeId] || 0;
    if (currentLvl >= upg.maxLevel) { showMessage("Już na max!", "#888"); return; }
    const cost = upg.costs[currentLvl];
    const tc = totalCopper(money); const need = totalCopper(cost);
    if (tc < need) { showMessage("Za mało monet!", "#b83030"); return; }
    sfxUpgrade(); setMoney(copperToMoney(tc - need));
    setHideoutUpgrades(prev => ({ ...prev, [upgradeId]: currentLvl + 1 }));
    showMessage(`${upg.name} → Poz. ${currentLvl + 1}!`, "#d4a030");
  };

  const upgradeKnight = () => {
    if (knightLevel >= KNIGHT_LEVELS.length - 1) return;
    const next = KNIGHT_LEVELS[knightLevel + 1];
    const tc = totalCopper(money);
    const need = totalCopper(next.cost);
    if (tc < need) { showMessage("Za mało monet!", "#b83030"); return; }
    sfxUpgrade();
    setMoney(copperToMoney(tc - need));
    setKnightLevel(l => l + 1);
    showMessage(`Najemnicy ulepszeni: ${next.name}! (x${next.mult})`, "#40e060");
  };

  const upgradeCaravan = () => {
    if (caravanLevel >= CARAVAN_LEVELS.length - 1) return;
    const next = CARAVAN_LEVELS[caravanLevel + 1];
    const tc = totalCopper(money);
    const need = totalCopper(next.cost);
    if (tc < need) { showMessage("Za mało monet!", "#b83030"); return; }
    sfxUpgrade();
    setMoney(copperToMoney(tc - need));
    setCaravanLevel(l => l + 1);
    setCaravanHp(next.hp);
    showMessage(`Statek → ${next.name}! (HP:${next.hp}, Armor:${next.armor})`, "#d4a030");
  };

  const buyKnowledgeUpgrade = (upgradeId) => {
    const COSTS = { manaPool: [30, 60, 100], spellPower: [20, 40, 60, 80, 100], manaRegen: [25, 50, 80] };
    const currentLevel = knowledgeUpgrades[upgradeId] || 0;
    const costs = COSTS[upgradeId];
    if (!costs || currentLevel >= costs.length) return;
    const cost = costs[currentLevel];
    if (knowledge < cost) { showMessage("Za mało wiedzy!", "#b83030"); return; }
    setKnowledge(k => k - cost);
    setKnowledgeUpgrades(prev => ({ ...prev, [upgradeId]: currentLevel + 1 }));
    sfxUpgrade();
    const names = { manaPool: "Zapas Prochu", spellPower: "Siła Strzału", manaRegen: "Regeneracja Prochu" };
    showMessage(`Ulepszono ${names[upgradeId]}!`, "#60a0ff");
  };

  const togglePanel = (p) => {
    setPanel(prev => {
      const next = prev === p ? null : p;
      // Generate shop stock when opening shop panel
      if (next === "shop" && !shopStock) {
        const lastBiomeId = biome?.id || "city";
        setShopStock(generateShopStock(lastBiomeId, boughtSpecials, room));
        setBargainUsed(false);
        setShopDiscount(0);
      }
      return next;
    });
  };
  const hlvl = HIDEOUT_LEVELS[hideoutLevel];
  const canStoreMore = hideoutItems.length < hlvl.slots;
  const nextLevel = hideoutLevel < HIDEOUT_LEVELS.length - 1 ? HIDEOUT_LEVELS[hideoutLevel + 1] : null;
  const canAffordUpgrade = nextLevel ? totalCopper(money) >= totalCopper(nextLevel.cost) : false;

  // INTRO
  if (screen === "intro") {
    return (
      <div style={{ ...appStyle, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={scanlinesStyle} /><div style={vignetteStyle} />
        <div style={{ color: "#3a2a1a", letterSpacing: 8, marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><Icon name="star" size={20} /> ─── <Icon name="star" size={20} /> ─── <Icon name="star" size={20} /></div>
        <div style={{ fontSize: 60, marginBottom: 16, filter: "drop-shadow(0 0 16px rgba(212,160,48,0.25))", display: "flex", gap: 8, justifyContent: "center" }}><Icon name="skull" size={60} /><Icon name="anchor" size={60} /><Icon name="skull" size={60} /></div>
        <h1 style={{ fontSize: 32, fontWeight: "bold", color: "#d4a030", textShadow: "3px 3px 0 #000, 0 0 25px rgba(212,160,48,0.25)", marginBottom: 8, textAlign: "center" }}>Szlak Fortuny</h1>
        <p style={{ fontSize: 18, color: "#6a5a4a", marginBottom: 36 }}>Prowadź statek • Pokonaj bandytów • Zdobądź skarby</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
          <button onClick={startGame} style={{
            fontWeight: "bold", fontSize: 20, background: "none", border: "3px solid #d4a030", color: "#d4a030",
            padding: "12px 36px", cursor: "pointer", textShadow: "1px 1px 0 #000", animation: "pulse 2s infinite",
          }}><Icon name="star" size={16} /> Nowa Gra <Icon name="star" size={16} /></button>
          {hasSaveGame() && (
            <button onClick={loadGame} style={{
              fontWeight: "bold", fontSize: 16, background: "none", border: "2px solid #4080cc", color: "#60a0ff",
              padding: "8px 28px", cursor: "pointer", textShadow: "1px 1px 0 #000",
            }}><Icon name="save" size={14} /> Kontynuuj</button>
          )}
        </div>
        <style>{`@keyframes pulse{0%,100%{box-shadow:0 0 8px rgba(212,160,48,0.2)}50%{box-shadow:0 0 22px rgba(212,160,48,0.45)}}`}</style>
      </div>
    );
  }

  // GAME OVER
  if (screen === "gameover" && gameOverStats) {
    const s = gameOverStats;
    return (
      <div style={{ ...appStyle, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={scanlinesStyle} /><div style={vignetteStyle} />

        <div style={{
          background: "linear-gradient(180deg, #1a0808, #0a0406)", border: "3px solid #8c2020",
          padding: isMobile ? "20px 18px" : "30px 50px", maxWidth: isMobile ? "92vw" : 460, width: "100%",
          textAlign: "center",
          boxShadow: "inset 0 0 30px rgba(140,20,20,0.3), 0 0 40px rgba(140,20,20,0.2)",
          animation: "fadeIn 0.6s ease-out",
        }}>
          <div style={{ fontSize: isMobile ? 36 : 48, marginBottom: 8, filter: "drop-shadow(0 0 12px rgba(200,40,40,0.4))" }}>
            <Icon name="skull" size={isMobile ? 36 : 48} />
          </div>
          <div style={{ fontSize: isMobile ? 11 : 13, color: "#8c4040", letterSpacing: 3, marginBottom: 4, fontWeight: "bold" }}>
            STATEK ZNISZCZONY
          </div>
          <h2 style={{
            fontSize: isMobile ? 22 : 28, fontWeight: "bold", color: "#cc3030",
            textShadow: "2px 2px 0 #000, 0 0 20px rgba(200,40,40,0.3)",
            marginBottom: 20,
          }}>Koniec Podróży</h2>

          <div style={{
            background: "rgba(0,0,0,0.4)", border: "1px solid #3a2020", padding: isMobile ? "12px 10px" : "16px 20px",
            marginBottom: 20, textAlign: "left",
          }}>
            <div style={{ fontSize: isMobile ? 11 : 13, color: "#666", letterSpacing: 2, marginBottom: 10, textAlign: "center", fontWeight: "bold" }}>
              PODSUMOWANIE
            </div>
            {[
              ["doors", "Komnaty", s.room],
              ["skull", "Pokonani wrogowie", s.kills],
              ["skull", "Pokonani bossowie", s.bossesDefeated],
              ["doors", "Otwarte wrota", s.doors],
              ["scroll", "Lista Gończa", `${s.bestiary} wrogów`],
              ["star", "Relikty", s.relics],
              ["convoy", "Poziom statku", CARAVAN_LEVELS[s.caravanLevel]?.name || `Lv.${s.caravanLevel}`],
            ].map(([iconName, label, val], i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "5px 0", borderBottom: i < 6 ? "1px solid #1a1010" : "none",
                fontSize: isMobile ? 12 : 14,
              }}>
                <span style={{ color: "#998877" }}><Icon name={iconName} size={14} /> {label}</span>
                <span style={{ color: "#d4a030", fontWeight: "bold" }}>{val}</span>
              </div>
            ))}
            <div style={{
              marginTop: 10, padding: "8px 0", borderTop: "1px solid #3a2020",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              fontSize: isMobile ? 13 : 15,
            }}>
              <span style={{ color: "#d4a030", fontWeight: "bold" }}>Bogactwo końcowe</span>
              <span style={{ color: "#ffd700", fontWeight: "bold" }}>
                {s.money.gold > 0 && `${s.money.gold}g `}{s.money.silver > 0 && `${s.money.silver}s `}{s.money.copper}c
              </span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
            <button onClick={restartGame} style={{
              fontWeight: "bold", fontSize: isMobile ? 16 : 18, background: "none",
              border: "3px solid #d4a030", color: "#d4a030",
              padding: isMobile ? "10px 28px" : "12px 36px", cursor: "pointer",
              textShadow: "1px 1px 0 #000", animation: "pulse 2s infinite",
              fontFamily: "'Segoe UI', monospace",
            }}>Nowa Gra</button>
            <button onClick={goToIntro} style={{
              fontWeight: "bold", fontSize: isMobile ? 13 : 14, background: "none",
              border: "2px solid #4a3a2a", color: "#8a7a6a",
              padding: isMobile ? "6px 20px" : "8px 24px", cursor: "pointer",
              textShadow: "1px 1px 0 #000",
              fontFamily: "'Segoe UI', monospace",
            }}>Ekran Główny</button>
          </div>
        </div>

        <style>{`
          @keyframes fadeIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
          @keyframes pulse{0%,100%{box-shadow:0 0 8px rgba(212,160,48,0.2)}50%{box-shadow:0 0 22px rgba(212,160,48,0.45)}}
          @keyframes caravanSelectPulse{0%,100%{opacity:0.5;transform:translateX(-50%) scale(1)}50%{opacity:1;transform:translateX(-50%) scale(1.15)}}
        `}</style>
      </div>
    );
  }

  // GAME
  return (
    <div style={{ ...appStyle, alignItems: isMobile ? "flex-start" : "center" }} className="game-no-select">
      <div style={scanlinesStyle} /><div style={vignetteStyle} />

      {/* Desktop: TopBar fixed at top, outside game container */}
      {!isMobile && (
        <TopBar doors={doors} initiative={initiative} treasures={inventory.length} money={money} mana={mana} maxMana={MAX_MANA}
          onInv={() => togglePanel("inv")} onShop={() => togglePanel("shop")} onHideout={() => togglePanel("hideout")}
          onBestiary={() => togglePanel("bestiary")} knowledge={knowledge}
          musicOn={musicOn} onToggleMusic={handleToggleMusic} onSave={saveGame} isMobile={false}
          playerLevel={playerLevel} playerXp={playerXp} xpNeeded={xpForLevel(playerLevel)}
          onCrew={() => togglePanel("crew")} onFactions={() => togglePanel("factions")}
          onJournal={() => togglePanel("journal")} onShip={() => togglePanel("ship")}
          onFortifications={defenseMode ? null : () => togglePanel("fortifications")} />
      )}

      {/* Scaled game container – fills entire screen on mobile */}
      <div ref={gameContainerRef}
        onClick={placingFort ? handleFortPlaceClick : placingTrap ? handleTrapPlaceClick : (skillshotMode && !isSaberMode && !isRapidFireMode && !isWandMode && !isSalvaMode) ? handleSkillshotClick : (e) => { handleCaravanMoveClick(e); }}
        onContextMenu={handleCaravanRightClick}
        onMouseDown={isSaberMode ? handleSaberDown : isRapidFireMode ? startRapidFire : isWandMode ? startWand : isSalvaMode ? startSalva : canPanScroll ? handlePanStart : undefined}
        onMouseMove={(e) => { if (panRef.current.dragging) { handlePanMove(e); return; } if (isSaberMode) handleSaberMove(e); else if (isRapidFireMode) moveRapidFire(e); if (salvaRef.current.active) moveSalva(e); if (wandOrbsRef.current.active && gameContainerRef.current) { const gr = gameContainerRef.current.getBoundingClientRect(); const cx = e.clientX; const cy = e.clientY; const _wsx = (cx - gr.left) / gameScale; const _wsy = (cy - gr.top) / gameScale; wandOrbsRef.current.screenX = _wsx; wandOrbsRef.current.screenY = _wsy; if (isoModeRef.current) { const cam = isoCameraRef.current; const iw = _isoScreenToWorld(_wsx, _wsy, cam.x, cam.y); wandOrbsRef.current.cursorX = iw.x; wandOrbsRef.current.cursorY = iw.y; } else { wandOrbsRef.current.cursorX = (_wsx / GAME_W) * 100; wandOrbsRef.current.cursorY = (_wsy / GAME_H) * 100; } } }}
        onMouseUp={(e) => { if (panRef.current.dragging) { handlePanEnd(); return; } if (isSaberMode) handleSaberUp(e); else if (isRapidFireMode) stopRapidFire(e); else if (isWandMode) stopWand(e); else if (isSalvaMode) stopSalva(e); }}
        onMouseLeave={(e) => { handlePanEnd(); if (isSaberMode) handleSaberUp(e); else if (isRapidFireMode) stopRapidFire(e); else if (isWandMode) stopWand(e); else if (isSalvaMode) stopSalva(e); }}
        onTouchStart={isSaberMode ? handleSaberDown : isRapidFireMode ? startRapidFire : isWandMode ? startWand : isSalvaMode ? startSalva : canPanScroll ? handlePanStart : undefined}
        onTouchMove={(e) => { if (panRef.current.dragging) { handlePanMove(e); return; } if (isSaberMode) handleSaberMove(e); else if (isRapidFireMode) moveRapidFire(e); if (salvaRef.current.active && e.touches[0]) moveSalva(e); if (wandOrbsRef.current.active && gameContainerRef.current && e.touches[0]) { const gr = gameContainerRef.current.getBoundingClientRect(); const cx = e.touches[0].clientX; const cy = e.touches[0].clientY; const _wsx = (cx - gr.left) / gameScale; const _wsy = (cy - gr.top) / gameScale; wandOrbsRef.current.screenX = _wsx; wandOrbsRef.current.screenY = _wsy; if (isoModeRef.current) { const cam = isoCameraRef.current; const iw = _isoScreenToWorld(_wsx, _wsy, cam.x, cam.y); wandOrbsRef.current.cursorX = iw.x; wandOrbsRef.current.cursorY = iw.y; } else { wandOrbsRef.current.cursorX = (_wsx / GAME_W) * 100; wandOrbsRef.current.cursorY = (_wsy / GAME_H) * 100; } } }}
        onTouchEnd={(e) => { if (panRef.current.dragging) { handlePanEnd(); return; } if (isSaberMode) handleSaberUp(e); else if (isRapidFireMode) stopRapidFire(e); else if (isWandMode) stopWand(e); else if (isSalvaMode) stopSalva(e); }}
        style={{
        width: GAME_W, height: GAME_H,
        transform: `scale(${gameScale})`,
        transformOrigin: isMobile ? "top left" : "center center",
        position: isMobile ? "absolute" : "relative",
        top: isMobile ? 0 : undefined,
        left: isMobile ? 0 : undefined,
        overflow: "hidden",
        cursor: placingTrap ? "crosshair" : isSaberMode ? "none" : isWandMode ? "crosshair" : skillshotMode ? "crosshair" : canPanScroll ? (panRef.current.dragging ? "grabbing" : "grab") : "default",
        animation: slowMotion
          ? "slowMoFlash 1s ease-out forwards"
          : screenShake ? "screenShake 0.08s infinite alternate" : "none",
        touchAction: "manipulation",
        WebkitTouchCallout: "none",
      }}>

      {/* Mobile: TopBar INSIDE game container at top */}
      {isMobile && (
        <TopBar doors={doors} initiative={initiative} treasures={inventory.length} money={money} mana={mana} maxMana={MAX_MANA}
          onInv={() => togglePanel("inv")} onShop={() => togglePanel("shop")} onHideout={() => togglePanel("hideout")}
          onBestiary={() => togglePanel("bestiary")} knowledge={knowledge}
          musicOn={musicOn} onToggleMusic={handleToggleMusic} onSave={saveGame} isMobile={true} gameW={GAME_W}
          playerLevel={playerLevel} playerXp={playerXp} xpNeeded={xpForLevel(playerLevel)}
          onCrew={() => togglePanel("crew")} onFactions={() => togglePanel("factions")}
          onJournal={() => togglePanel("journal")} onShip={() => togglePanel("ship")}
          onFortifications={defenseMode ? null : () => togglePanel("fortifications")} />
      )}
      <canvas ref={canvasRef} width={GAME_W} height={GAME_H} style={{ position: "absolute", top: 0, left: 0, width: GAME_W, height: GAME_H, zIndex: 1 }} />
      <canvas ref={animCanvasRef} width={GAME_W} height={GAME_H} style={{ position: "absolute", top: 0, left: 0, width: GAME_W, height: GAME_H, pointerEvents: "none", zIndex: 2 }} />
      {/* PixiJS canvas is dynamically inserted by PixiRenderer into gameContainerRef */}

      {/* Panoramic scroll indicator */}
      {canPanScroll && biome && (
        <div style={{ position: "absolute", bottom: isMobile ? 90 : 72, left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 8, pointerEvents: "none", opacity: panOffset === 0 ? 0.6 : 0.35, transition: "opacity 0.3s" }}>
          <span style={{ color: "#fff", fontSize: 10, fontFamily: "monospace", textShadow: "0 1px 3px #000", letterSpacing: 1 }}>◄ ROZEJRZYJ SIĘ ►</span>
        </div>
      )}

      {/* Room & biome label – top center below TopBar */}
      {biome && (
        <div style={{
          position: "absolute", top: isMobile ? 38 : 56, left: "50%", transform: "translateX(-50%)",
          fontWeight: "bold", fontSize: isMobile ? 10 : 14, padding: isMobile ? "2px 8px" : "4px 16px", zIndex: 20, textShadow: "2px 2px 0 #000",
          color: "#ccc", background: "rgba(26,14,18,0.85)", border: isMobile ? "1px solid #5a4030" : "2px solid #5a4030",
          boxShadow: "inset 0 0 10px rgba(0,0,0,0.4)", whiteSpace: "nowrap",
          opacity: transitioning ? 0 : 1, transition: "opacity 0.5s",
        }}>
          Etap #{room} — <Icon name={biome.icon} size={14} /> {biome.name}{isNight ? <>{" "}<Icon name="moon" size={14} /></> : ""}{weather ? <>{" "}<Icon name={weather.icon} size={14} /></> : ""}{biomeModifier ? <>{" "}<Icon name={biomeModifier.icon} size={14} /></> : ""}{defenseMode ? <>{" "}<Icon name="swords" size={14} /> OBRONA</> : ""}{ghostShipActive ? <>{" "}<Icon name="ghost" size={14} /> WIDMOWY STATEK</> : ""}
        </div>
      )}

      {/* Morale indicator */}
      {room > 0 && (() => {
        const mt = getMoraleThreshold(morale);
        return (
          <div style={{
            position: "absolute", top: isMobile ? 54 : 76, right: 8, zIndex: 20,
            background: "rgba(26,14,18,0.85)", border: `1px solid ${mt.color}`,
            padding: "2px 8px", fontSize: 9, color: mt.color,
            textShadow: "1px 1px 0 #000", whiteSpace: "nowrap",
          }}>
            Morala: {mt.name} ({morale})
            <div style={{ width: 60, height: 3, background: "rgba(0,0,0,0.5)", marginTop: 2, borderRadius: 2 }}>
              <div style={{ width: `${morale}%`, height: "100%", background: mt.color, borderRadius: 2, transition: "width 0.3s" }} />
            </div>
          </div>
        );
      })()}

      {/* Ghost Ship overlay */}
      {ghostShipActive && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1,
          background: "radial-gradient(ellipse at center, rgba(80,80,160,0.1), rgba(40,40,100,0.25) 100%)",
          pointerEvents: "none",
        }} />
      )}

      {/* Mutation warning */}
      {activeMutations.length > 0 && (
        <div style={{
          position: "absolute", top: isMobile ? 54 : 76, left: 8, zIndex: 20,
          background: "rgba(26,14,18,0.85)", border: "1px solid #cc60cc",
          padding: "2px 6px", fontSize: 8, color: "#cc60cc",
          textShadow: "1px 1px 0 #000",
        }}>
          {activeMutations.map((m, i) => (
            <div key={i}>{m.npcName}: {m.mutation.name}</div>
          ))}
        </div>
      )}

      {/* Fortification Menu — shown after clicking defense POI */}
      {showFortMenu && defensePoi && (
        <FortificationMenu
          unlockedFortifications={unlockedFortifications}
          onPlace={handlePlaceFort}
          onAutoPlace={handleAutoPlaceForts}
          onReady={startDefenseFromMenu}
          placedCount={fortPlacedCount}
          maxCount={FORTIFICATION_PHASE.maxFortifications}
          roomNumber={defensePoi.roomNumber}
          isBossRoom={!!getBossForRoom(defensePoi.roomNumber)}
          bossName={getBossForRoom(defensePoi.roomNumber)?.name}
          defensePoi={defensePoi}
        />
      )}
      <WaveOverlay defense={defenseMode} onDismiss={dismissDefense} onRetreat={retreatFromDefense}
        caravanHp={caravanHp} caravanMaxHp={CARAVAN_LEVELS[caravanLevel].hp}
        relicChoices={relicChoices} boss={activeBoss}
        killStreak={killStreak} powerSpikeWarning={powerSpikeWarning} />
      {activeBoss && activeBoss.phase !== "complete" && (
        <BossHpBar
          key={activeBoss.id || activeBoss.name}
          boss={activeBoss}
          currentHp={activeBoss.currentHp}
          maxHp={activeBoss.maxHp}
          phase={activeBoss.phase}
          manaShieldHp={activeBoss.manaShieldHp || 0}
          manaShieldMaxHp={activeBoss.manaShieldMaxHp || 0}
        />
      )}
      <ComboOverlay combo={activeCombo} comboCounter={comboCounter} />

      {/* Room Challenge Banner */}
      {roomChallenge && !roomChallenge.completed && !roomChallenge.failed && (
        <div style={{
          position: "absolute", top: isMobile ? 50 : 76, left: 8, zIndex: 22,
          background: "rgba(14,8,10,0.9)", border: "1px solid #ffa040",
          padding: "3px 10px", borderRadius: 6, fontSize: isMobile ? 9 : 11,
          color: "#ffa040", pointerEvents: "none",
          boxShadow: "0 0 8px rgba(255,160,60,0.2)",
        }}>
          <Icon name={roomChallenge.icon} size={11} /> {roomChallenge.desc}
          {roomChallenge.type === "counter" && (
            <span style={{ color: "#fff", marginLeft: 6 }}>{roomChallenge.progress}/{roomChallenge.target}</span>
          )}
          {roomChallenge.type === "timer" && (
            <span style={{ color: "#fff", marginLeft: 6 }}>{Math.max(0, Math.ceil((roomChallenge.timer - (Date.now() - roomChallenge.startTime)) / 1000))}s</span>
          )}
          <span style={{ color: "#888", marginLeft: 6 }}>{roomChallenge.rewardLabel}</span>
        </div>
      )}
      {roomChallenge?.completed && (
        <div style={{
          position: "absolute", top: isMobile ? 50 : 76, left: 8, zIndex: 22,
          background: "rgba(14,8,10,0.9)", border: "1px solid #40e060",
          padding: "3px 10px", borderRadius: 6, fontSize: isMobile ? 9 : 11,
          color: "#40e060", pointerEvents: "none",
        }}>
          <Icon name="star" size={11} /> {roomChallenge.name} — ukończone!
        </div>
      )}

      {/* Defense Trap Placement Panel — REMOVED: traps auto-deploy now */}

      {/* Trap placement mode indicator */}
      {placingTrap && (
        <div style={{
          position: "absolute", bottom: isMobile ? 70 : 100, left: "50%", transform: "translateX(-50%)",
          background: "rgba(0,0,0,0.85)", border: "2px solid #40c0a0",
          padding: "6px 20px", borderRadius: 8, zIndex: 30,
          color: "#40c0a0", fontWeight: "bold", fontSize: isMobile ? 11 : 14,
          textShadow: "0 0 8px rgba(60,180,140,0.4)",
          animation: "gemPulse 1.5s ease-in-out infinite",
        }}>
          <Icon name={placingTrap.icon} size={16} /> Kliknij aby postawić: {placingTrap.name}
          <span onClick={() => setPlacingTrap(null)} style={{ color: "#888", fontSize: 10, marginLeft: 8, cursor: "pointer" }}>[ESC]</span>
        </div>
      )}

      {/* Wand orbiting lightning balls — time-based smooth rotation */}
      {wandActive && (() => {
        const wo = wandOrbsRef.current;
        // Use screen-space cursor position for visual overlay
        const centerX = wo.screenX ?? GAME_W / 2;
        const centerY = wo.screenY ?? GAME_H / 2;
        const orbRadius = GAME_W * 0.08;
        const ySquash = 0.55;
        // Time-based angle matching physics calculation (elapsed / 600)
        const elapsed = Date.now() - wo.startTime;
        const baseAngle = elapsed / 600;
        // Compute each orb position from time, perfectly synced with hit detection
        const orbPos = [0, 1, 2].map(i => {
          const a = baseAngle + i * Math.PI * 2 / 3;
          return {
            x: centerX + Math.cos(a) * orbRadius,
            y: centerY + Math.sin(a) * orbRadius * ySquash,
          };
        });
        return (
          <>
            {orbPos.map((orb, i) => (
              <div key={i} style={{
                position: "absolute", left: orb.x - 14, top: orb.y - 14,
                width: 28, height: 28, pointerEvents: "none", zIndex: 30,
              }}>
                {/* Outer lightning glow */}
                <div style={{
                  position: "absolute", inset: -8, borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(60,140,255,0.4) 0%, rgba(30,80,220,0.15) 50%, transparent 70%)",
                  animation: "wandOrbPulse 0.3s ease-in-out infinite alternate",
                }} />
                {/* Core orb */}
                <div style={{
                  position: "absolute", inset: 4, borderRadius: "50%",
                  background: "radial-gradient(circle at 35% 35%, #e0f0ff, #60b0ff 30%, #2060ff 60%, #1040cc 90%)",
                  boxShadow: "0 0 8px rgba(80,160,255,1), 0 0 16px rgba(40,120,255,0.8), 0 0 32px rgba(30,80,255,0.5), 0 0 48px rgba(20,60,220,0.3), inset 0 0 6px rgba(200,230,255,0.8)",
                }} />
                {/* Lightning sparks */}
                <svg style={{ position: "absolute", left: -6, top: -6, width: 40, height: 40, pointerEvents: "none", overflow: "visible" }} viewBox="0 0 40 40">
                  {[0, 1, 2, 3].map(s => {
                    const sa = s * Math.PI / 2;
                    return (
                      <polyline key={s}
                        points={`20,20 ${20 + Math.cos(sa) * 6},${20 + Math.sin(sa) * 6} ${20 + Math.cos(sa) * 11},${20 + Math.sin(sa) * 11}`}
                        fill="none" stroke="#80c8ff" strokeWidth="1.5"
                        style={{
                          filter: "drop-shadow(0 0 2px #4090ff)",
                          animation: `wandSparkFlicker ${0.15 + s * 0.07}s ease-in-out infinite alternate`,
                        }}
                      />
                    );
                  })}
                </svg>
              </div>
            ))}
            {/* Lightning arcs between orbs */}
            <svg style={{ position: "absolute", left: 0, top: 0, width: GAME_W, height: GAME_H, overflow: "visible", pointerEvents: "none", zIndex: 30 }}>
              <defs>
                <filter id="wandArcGlow">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              {[0, 1, 2].map(i => {
                const o1 = orbPos[i], o2 = orbPos[(i + 1) % 3];
                const mx = (o1.x + o2.x) / 2 * 0.85 + centerX * 0.15;
                const my = (o1.y + o2.y) / 2 * 0.85 + centerY * 0.15;
                return (
                  <polyline key={i}
                    points={`${o1.x},${o1.y} ${mx},${my} ${o2.x},${o2.y}`}
                    fill="none" stroke="#60b0ff" strokeWidth="1"
                    filter="url(#wandArcGlow)"
                    style={{ opacity: 0.3 + Math.sin(elapsed * 0.003 + i * 2) * 0.25 }}
                  />
                );
              })}
            </svg>
            {/* Center orbit ring */}
            <div style={{
              position: "absolute",
              left: centerX - 25, top: centerY - 25,
              width: 50, height: 50, borderRadius: "50%", pointerEvents: "none", zIndex: 29,
              border: "1px solid rgba(60,140,255,0.25)",
              boxShadow: "inset 0 0 12px rgba(60,140,255,0.15), 0 0 8px rgba(40,100,255,0.1)",
            }} />
          </>
        );
      })()}

      {/* Salva Armatnia: red crosshair overlay (projectiles rendered by PixiJS) */}
      {salvaActive && (() => {
        const sv = salvaRef.current;
        // Use screen-space cursor position for crosshair (avoids iso coordinate confusion)
        const cx = sv.screenX ?? GAME_W / 2;
        const cy = sv.screenY ?? GAME_H / 2;
        const pulse = Math.sin(Date.now() * 0.012) * 0.3 + 0.7;
        return (
          <>
            {/* Flickering red crosshair */}
            <svg style={{ position: "absolute", left: 0, top: 0, width: GAME_W, height: GAME_H, pointerEvents: "none", zIndex: 30 }}>
              {/* Outer dashed circle */}
              <circle cx={cx} cy={cy} r="28" fill="none" stroke={`rgba(255,60,30,${pulse * 0.5})`} strokeWidth="1.5" strokeDasharray="6 4" />
              {/* Inner fill circle */}
              <circle cx={cx} cy={cy} r="12" fill={`rgba(255,40,20,${pulse * 0.12})`} stroke={`rgba(255,60,30,${pulse * 0.7})`} strokeWidth="1" />
              {/* Cross lines */}
              <line x1={cx - 20} y1={cy} x2={cx - 8} y2={cy} stroke={`rgba(255,60,30,${pulse * 0.8})`} strokeWidth="1.5" />
              <line x1={cx + 8} y1={cy} x2={cx + 20} y2={cy} stroke={`rgba(255,60,30,${pulse * 0.8})`} strokeWidth="1.5" />
              <line x1={cx} y1={cy - 20} x2={cx} y2={cy - 8} stroke={`rgba(255,60,30,${pulse * 0.8})`} strokeWidth="1.5" />
              <line x1={cx} y1={cy + 8} x2={cx} y2={cy + 20} stroke={`rgba(255,60,30,${pulse * 0.8})`} strokeWidth="1.5" />
              {/* Center dot */}
              <circle cx={cx} cy={cy} r="2" fill={`rgba(255,80,40,${pulse})`} />
            </svg>
          </>
        );
      })()}

      {/* Saber swipe trail */}
      {saberTrail.length > 1 && (() => {
        const sc = getEquippedSaberData().trailColor || "#c0c0c0";
        return (
        <svg style={{ position: "absolute", top: 0, left: 0, width: GAME_W, height: GAME_H, zIndex: 50, pointerEvents: "none" }}>
          <defs>
            <linearGradient id="saberGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={sc} stopOpacity="0" />
              <stop offset="40%" stopColor={sc} stopOpacity="0.6" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.95" />
            </linearGradient>
            <filter id="saberGlow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          {(() => {
            const pts = saberTrail;
            const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
            return (
              <>
                <path d={d} fill="none" stroke={sc + "25"} strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" filter="url(#saberGlow)" />
                <path d={d} fill="none" stroke="url(#saberGrad)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                <path d={d} fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
              </>
            );
          })()}
        </svg>
        );
      })()}

      {/* Player-placed defense trap visuals */}
      {playerTraps.map(pt => pt.active && (
        <div key={pt.id} ref={el => { if (el) trapElsRef.current[pt.id] = el; }} data-wx={pt.x} data-wy={pt.y} style={{
          position: "absolute", left: `${wrapPctToScreen(pt.x) ?? pt.x}%`, top: `${pt.y}%`,
          transform: "translate(-50%, -50%)", zIndex: 14,
          pointerEvents: "none",
        }}>
          <div style={{
            width: pt.trapType === "barricade" ? 36 : pt.trapType === "caltrops" ? 30 : 24,
            height: pt.trapType === "barricade" ? 28 : pt.trapType === "caltrops" ? 30 : 24,
            borderRadius: pt.trapType === "net_trap" ? "50%" : pt.trapType === "fire_pit" ? "50%" : 4,
            background: pt.trapType === "caltrops" ? "rgba(100,80,40,0.3)"
              : pt.trapType === "powder_barrel" ? "rgba(160,60,20,0.3)"
              : pt.trapType === "barricade" ? "rgba(120,90,50,0.5)"
              : pt.trapType === "fire_pit" ? "rgba(200,100,20,0.3)"
              : "rgba(40,120,160,0.3)",
            border: `1px solid ${pt.trapType === "caltrops" ? "#8a7040"
              : pt.trapType === "powder_barrel" ? "#cc4020"
              : pt.trapType === "barricade" ? "#a08040"
              : pt.trapType === "fire_pit" ? "#e08020"
              : "#40a0c0"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: pt.trapType === "powder_barrel" ? "0 0 8px rgba(200,60,20,0.3)"
              : pt.trapType === "fire_pit" ? "0 0 12px rgba(255,120,20,0.4)"
              : pt.trapType === "barricade" ? "0 0 6px rgba(160,120,60,0.3)"
              : "0 0 8px rgba(60,140,180,0.2)",
          }}>
            <Icon name={pt.config.icon} size={pt.trapType === "barricade" ? 16 : 14} />
          </div>
          {/* Barricade HP bar */}
          {pt.trapType === "barricade" && pt.currentHp != null && (
            <div style={{
              position: "absolute", bottom: -6, left: "50%", transform: "translateX(-50%)",
              width: 32, height: 4, background: "rgba(0,0,0,0.6)", borderRadius: 2,
            }}>
              <div style={{
                width: `${Math.max(0, (pt.currentHp / pt.config.hp) * 100)}%`,
                height: "100%", borderRadius: 2,
                background: (pt.currentHp / pt.config.hp) > 0.5 ? "#a08040" : "#cc4020",
                transition: "width 0.2s",
              }} />
            </div>
          )}
          {/* Fire pit glow animation */}
          {pt.trapType === "fire_pit" && (
            <div style={{
              position: "absolute", inset: -4, borderRadius: "50%",
              background: "radial-gradient(circle, rgba(255,120,20,0.15) 0%, transparent 70%)",
              animation: "gemPulse 1.5s infinite",
            }} />
          )}
        </div>
      ))}

      {/* Caravan Shield Button */}
      {defenseMode && defenseMode.phase === "wave_active" && (
        <div onClick={activateCaravanShield} style={{
          position: "absolute", bottom: isMobile ? 130 : 30, right: isMobile ? 60 : 8,
          zIndex: 25, cursor: "pointer", pointerEvents: "auto",
          width: isMobile ? 44 : 48, height: isMobile ? 44 : 48,
          borderRadius: "50%",
          background: caravanShield.active ? "rgba(64,160,255,0.3)" : "rgba(14,8,10,0.85)",
          border: `2px solid ${caravanShield.active ? "#40a0ff" : caravanShield.cooldown > Date.now() ? "#444" : "#4080cc"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: caravanShield.active ? "0 0 16px rgba(64,160,255,0.5)" : "none",
          opacity: caravanShield.cooldown > Date.now() && !caravanShield.active ? 0.5 : 1,
          transition: "all 0.3s",
        }}>
          <Icon name="shield" size={isMobile ? 20 : 24} />
          {caravanShield.active && (
            <div style={{
              position: "absolute", top: -4, right: -4,
              width: 10, height: 10, borderRadius: "50%",
              background: "#40a0ff", animation: "gemPulse 0.5s infinite",
            }} />
          )}
        </div>
      )}

      {/* Weather Skillshot Effect Indicator */}
      {weather?.skillshotEffect && (
        <div style={{
          position: "absolute", bottom: isMobile ? 100 : 12, left: 8, zIndex: 20,
          background: "rgba(14,8,10,0.85)", border: "1px solid #80a0cc",
          padding: "2px 8px", borderRadius: 4, fontSize: isMobile ? 9 : 10,
          color: "#80a0cc", pointerEvents: "none",
        }}>
          <Icon name={weather.icon} size={10} />
          {weather.skillshotEffect === "wind_drift" && ` Wiatr ${weather.windDir > 0 ? "→" : "←"}`}
          {weather.skillshotEffect === "extra_gravity" && " Cięższe pociski"}
          {weather.skillshotEffect === "lightning_strikes" && " Pioruny!"}
          {weather.skillshotEffect === "reduced_range" && " Ograniczona widoczność"}
        </div>
      )}

      {/* Biome Modifier Indicator */}
      {biomeModifier && (
        <div style={{
          position: "absolute", bottom: isMobile ? 100 : (weather?.skillshotEffect ? 30 : 12), left: 8, zIndex: 20,
          background: "rgba(14,8,10,0.85)", border: "1px solid #c0a0ff",
          padding: "2px 8px", borderRadius: 4, fontSize: isMobile ? 9 : 10,
          color: "#c0a0ff", pointerEvents: "none", maxWidth: 200,
        }}>
          <Icon name={biomeModifier.icon} size={10} /> {biomeModifier.name}
        </div>
      )}

      {/* Skillshot Mode Indicator — click to dismiss */}
      {/* Skillshot tooltip removed — spell selection is clear from the SpellBar glow */}
      {/* Saber mode indicator removed — spell bar glow is sufficient */}

      {/* Accuracy Display */}
      {(accuracy.hits > 0 || accuracy.misses > 0) && (
        <div style={{
          position: "absolute", top: isMobile ? 42 : 60, right: 8,
          background: "rgba(0,0,0,0.75)", border: "1px solid #555",
          padding: "3px 8px", borderRadius: 4, zIndex: 20,
          fontSize: isMobile ? 9 : 11, color: "#ccc",
          pointerEvents: "none",
        }}>
          <span style={{ color: "#40c040" }}>{accuracy.hits}</span>
          <span style={{ color: "#666" }}>/</span>
          <span style={{ color: "#c04040" }}>{accuracy.misses}</span>
          {" "}
          <span style={{ color: accuracy.hits / (accuracy.hits + accuracy.misses) > 0.7 ? "#ffd700" : "#888" }}>
            {accuracy.hits + accuracy.misses > 0 ? Math.round(accuracy.hits / (accuracy.hits + accuracy.misses) * 100) : 0}%
          </span>
          {accuracy.headshots > 0 && (
            <span style={{ color: "#ff4040", marginLeft: 4 }}>HS:{accuracy.headshots}</span>
          )}
          {accuracyStreak >= ACCURACY_COMBO_THRESHOLD && (
            <span style={{ color: "#ffd700", marginLeft: 4, animation: "gemPulse 1s infinite" }}>x{accuracyStreak}</span>
          )}
        </div>
      )}

      {/* Slow Motion Effect Overlay */}
      {slowMotion && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          background: "radial-gradient(ellipse at center, rgba(255,220,100,0.1) 0%, rgba(0,0,0,0.2) 100%)",
          pointerEvents: "none", zIndex: 16,
          animation: "slowMoFlash 1s ease-out forwards",
        }} />
      )}

      {!defenseMode && <PowerSpikeWarning show={powerSpikeWarning} />}
      <RelicPicker choices={relicChoices} onSelect={selectRelic} isMobile={isMobile} />
      <SpellUpgradePicker choices={upgradeChoices} onSelect={selectUpgrade} isMobile={isMobile} />
      <LevelUpPicker choices={levelUpChoices} onSelect={selectPerk} playerLevel={playerLevel} isMobile={isMobile} />
      {showCraftingPanel && (
        <CraftingPanel
          biome={biome}
          resources={craftingResources}
          consumables={craftedConsumables}
          recipes={biome ? getAvailableRecipes(biome.id) : []}
          onCraft={craftItem}
          onUseConsumable={useCraftedConsumable}
          onClose={() => setShowCraftingPanel(false)}
          isMobile={isMobile}
        />
      )}
      <WeatherOverlay weather={weather} />

      {/* Iso minimap */}
      {isoModeRef.current && (
        <IsoMinimap
          walkers={walkers}
          walkData={walkDataRef.current}
          caravanPos={caravanPosRef.current}
          cameraX={isoCameraRef.current.x}
          cameraY={isoCameraRef.current.y}
          biome={biome}
          isMobile={isMobile}
        />
      )}

      {/* Dungeon HUD */}
      <DungeonHUD
        dungeonState={dungeonState}
        onShowCrossSection={() => setShowCrossSection(true)}
      />

      {/* Dungeon stairs/exit — persistent visible markers on the ISO map */}
      {dungeonState && isoModeRef.current && (() => {
        const dState = dungeonState;
        const lvl = dState.levels[dState.currentLevel];
        const markers = [];
        // Stairs down marker
        if (lvl?.stairs?.down) {
          const sd = lvl.stairs.down;
          const sdLeft = poiLeft(sd.col, sd.row);
          const sdTop = poiTop(sd.col, sd.row);
          if (sdLeft !== null) {
            markers.push(
              <div key="stairs-down" onClick={() => { stairsDismissedRef.current = false; setStairsPrompt({ type: "descend", targetLevel: dState.currentLevel + 1, position: sd }); }}
                style={{ position: "absolute", left: sdLeft, top: sdTop, transform: "translate(-50%, -100%)", zIndex: poiZIndex(sd.col, sd.row) + 5, cursor: "pointer", userSelect: "none", pointerEvents: "all" }}>
                <div style={{ fontSize: 26, filter: "drop-shadow(0 0 8px #60a0ff)", animation: "doorGlow 1.5s ease-in-out infinite", textAlign: "center", lineHeight: 1 }}>🪜</div>
                <div style={{ fontSize: 8, color: "#88bbff", textAlign: "center", textShadow: "0 1px 3px #000", fontWeight: "bold", whiteSpace: "nowrap" }}>Schody niżej</div>
              </div>
            );
          }
        }
        // Stairs up marker (if not on top level)
        if (lvl?.stairs?.up && dState.currentLevel > 0) {
          const su = lvl.stairs.up;
          const suLeft = poiLeft(su.col, su.row);
          const suTop = poiTop(su.col, su.row);
          if (suLeft !== null) {
            markers.push(
              <div key="stairs-up" onClick={() => { stairsDismissedRef.current = false; setStairsPrompt({ type: "ascend", targetLevel: dState.currentLevel - 1, position: su }); }}
                style={{ position: "absolute", left: suLeft, top: suTop, transform: "translate(-50%, -100%)", zIndex: poiZIndex(su.col, su.row) + 5, cursor: "pointer", userSelect: "none", pointerEvents: "all" }}>
                <div style={{ fontSize: 26, filter: "drop-shadow(0 0 8px #ffd700)", animation: "doorGlow 1.8s ease-in-out infinite", textAlign: "center", lineHeight: 1 }}>🪜</div>
                <div style={{ fontSize: 8, color: "#ffd700", textAlign: "center", textShadow: "0 1px 3px #000", fontWeight: "bold", whiteSpace: "nowrap" }}>Schody wyżej</div>
              </div>
            );
          }
        }
        // Exit marker
        const exitP = lvl?.exitPos || (dState.currentLevel === 0 ? (dState.levels[0]?.exitPos) : null);
        if (exitP) {
          const exLeft = poiLeft(exitP.col, exitP.row);
          const exTop = poiTop(exitP.col, exitP.row);
          if (exLeft !== null) {
            markers.push(
              <div key="dungeon-exit" onClick={() => { stairsDismissedRef.current = false; setStairsPrompt({ type: "exit_dungeon", position: exitP }); }}
                style={{ position: "absolute", left: exLeft, top: exTop, transform: "translate(-50%, -100%)", zIndex: poiZIndex(exitP.col, exitP.row) + 5, cursor: "pointer", userSelect: "none", pointerEvents: "all" }}>
                <div style={{ fontSize: 28, filter: "drop-shadow(0 0 10px #44ff88)", animation: "doorGlow 1.3s ease-in-out infinite", textAlign: "center", lineHeight: 1 }}>🚪</div>
                <div style={{ fontSize: 8, color: "#44ff88", textAlign: "center", textShadow: "0 1px 3px #000", fontWeight: "bold", whiteSpace: "nowrap" }}>Wyjście</div>
              </div>
            );
          }
        }
        return markers;
      })()}

      {/* Map secrets — discovered but not yet collected */}
      {isoModeRef.current && mapSecrets.filter(s => s.discovered && !s.collected).map(s => {
        const left = poiLeft(s.wx, s.wy);
        const top = poiTop(s.wx, s.wy);
        if (left === null || top === null) return null;
        return (
          <div key={s.id} onClick={() => collectMapSecret(s.id)}
               style={{ position: "absolute", left, top, transform: "translate(-50%, -100%)",
                        zIndex: poiZIndex(s.wx, s.wy) + 3, cursor: "pointer", userSelect: "none",
                        pointerEvents: "all", animation: "secretPulse 2s ease-in-out infinite" }}>
            <div style={{ fontSize: 22, textAlign: "center", lineHeight: 1,
                          filter: "drop-shadow(0 0 8px #ffd700)" }}>{s.icon}</div>
            <div style={{ fontSize: 8, color: "#ffd700", textAlign: "center",
                          textShadow: "0 1px 3px #000", fontWeight: "bold",
                          whiteSpace: "nowrap" }}>{s.label}</div>
          </div>
        );
      })}

      {/* Dungeon stairs interaction prompt */}
      <StairsPrompt
        interaction={stairsPrompt}
        dungeonState={dungeonState}
        onConfirm={() => {
          if (!stairsPrompt) return;
          if (stairsPrompt.type === "exit_dungeon") {
            exitDungeon();
          } else {
            changeDungeonLevel(stairsPrompt.targetLevel);
          }
        }}
        onCancel={() => { stairsDismissedRef.current = true; setStairsPrompt(null); }}
      />

      {/* Dungeon cross-section overlay */}
      {showCrossSection && (
        <DungeonCrossSection
          dungeonState={dungeonState}
          onSelectLevel={(level) => {
            if (dungeonState && dungeonState.levels[level]?.discovered) {
              changeDungeonLevel(level);
              setShowCrossSection(false);
            }
          }}
          onClose={() => setShowCrossSection(false)}
        />
      )}

      {/* Dungeon level transition overlay */}
      {dungeonTransitioning && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.9)", zIndex: 9500,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#c0a060", fontSize: 16, fontWeight: "bold",
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>⛏</div>
            <div>Zmiana poziomu...</div>
          </div>
        </div>
      )}

      {/* Caravan HP & Travel integrated into SpellBar icons */}

      {showChest && (() => {
        if (isoModeRef.current) {
          // In iso mode, chest is wrapped in a div positioned by RAF loop
          return (
            <div ref={chestElRef} style={{ position: "absolute", left: 0, top: 0, zIndex: 15, transform: "translateX(-50%) translateY(-100%)" }}>
              <Chest pos={{ x: 50, y: 50 }} onClick={openChest} clicks={chestClicks} maxClicks={CLICKS_TO_OPEN} style={{ position: "relative", left: 0, top: 0 }} />
            </div>
          );
        }
        const cx = wrapPctToScreen(chestPos?.x ?? 50);
        return cx !== null ? <Chest pos={{ ...chestPos, x: cx }} onClick={openChest} clicks={chestClicks} maxClicks={CLICKS_TO_OPEN} /> : null;
      })()}

      {/* Fortification placement indicator */}
      {placingFort && isoModeRef.current && (
        <div style={{
          position: "absolute", left: 0, top: 0, right: 0, bottom: 0,
          pointerEvents: "none", zIndex: 8,
        }}>
          <div style={{
            position: "absolute", left: "50%", top: "10px", transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.75)", color: "#ffd700", padding: "6px 16px",
            borderRadius: 8, fontSize: 13, fontWeight: "bold", zIndex: 20,
            border: "1px solid rgba(192,128,48,0.5)",
            textShadow: "0 1px 3px #000",
          }}>
            🏗️ Stawianie: {placingFort.name} — kliknij blisko karawany
            <span onClick={() => setPlacingFort(null)} style={{
              marginLeft: 12, cursor: "pointer", color: "#c04040", pointerEvents: "auto",
            }}>✕ Anuluj</span>
          </div>
        </div>
      )}

      {/* Caravan on iso map */}
      {isoModeRef.current && (() => {
        const cam = isoCameraRef.current;
        const cp = caravanPosRef.current;
        const screen = _isoWorldToScreen(cp.x, cp.y, cam.x, cam.y);
        if (screen.x < -100 || screen.x > GAME_W + 100) return null;
        const hpPct = caravanHpRef.current / CARAVAN_LEVELS[caravanLevelRef.current].hp * 100;
        const hpColor = hpPct > 50 ? "#40e060" : hpPct > 25 ? "#e0c040" : "#e04040";
        return (
          <div ref={caravanElRef} onClick={handleCaravanClick} style={{
            position: "absolute",
            left: screen.x, top: screen.y,
            transform: "translate(-50%, -100%)",
            zIndex: 10 + Math.round((cp.x + cp.y) * 1.2),
            pointerEvents: "auto",
            textAlign: "center",
            cursor: "pointer",
          }}>
            {/* HP bar above caravan */}
            <div style={{
              width: 60, height: 6, background: "rgba(0,0,0,0.7)",
              border: `1px solid ${hpColor}66`, borderRadius: 3,
              margin: "0 auto 2px", overflow: "hidden",
            }}>
              <div style={{
                width: `${hpPct}%`, height: "100%",
                background: `linear-gradient(180deg, ${hpColor}, ${hpColor}aa)`,
                transition: "width 0.3s",
              }} />
            </div>
            {/* Ship icon */}
            <div style={{
              fontSize: 36, lineHeight: 1,
              filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.8))",
              animation: hpPct < 30 ? "caravanDmgFlash 0.6s ease-in-out infinite" : "none",
            }}>
              <Icon name="ship" size={36} />
            </div>
            <div style={{
              fontSize: 9, color: caravanSelected ? "#60ff80" : "#d4a030", fontWeight: "bold",
              textShadow: "0 1px 3px rgba(0,0,0,0.9)",
            }}>{caravanSelected ? "Wybierz cel" : "Karawana"}</div>
            {/* Terrain speed indicator (shows when moving) */}
            {caravanMoveRef.current.active && (() => {
              const _tMod = terrainDataRef.current ? applyTerrainMovement(cp, terrainDataRef.current) : 1;
              const _tColor = _tMod > 1.1 ? "#60ff80" : _tMod < 0.7 ? "#ff6040" : "#d4a030";
              const _tLabel = _tMod > 1.1 ? "Droga" : _tMod < 0.7 ? "Trudny teren" : null;
              if (!_tLabel) return null;
              return <div style={{ fontSize: 7, color: _tColor, textShadow: "0 1px 2px #000" }}>{_tLabel}</div>;
            })()}
            {/* Selection ring */}
            {caravanSelected && (
              <div style={{
                position: "absolute", left: "50%", bottom: 0,
                transform: "translateX(-50%)",
                width: 50, height: 16,
                border: "2px solid #60ff80",
                borderRadius: "50%",
                animation: "caravanSelectPulse 1s ease-in-out infinite",
                pointerEvents: "none",
              }} />
            )}
            {/* Resource gathering progress bar */}
            {mapResourcesRef.current.gatheringId && mapResourcesRef.current.gatherProgress > 0 && (() => {
              const gp = mapResourcesRef.current.gatherProgress;
              const gRes = mapResourcesRef.current.resources.find(r => r.id === mapResourcesRef.current.gatheringId);
              if (!gRes) return null;
              return (
                <div style={{ marginTop: 2 }}>
                  <div style={{ fontSize: 7, color: gRes.color || "#ffd700", textShadow: "0 1px 2px #000", marginBottom: 1 }}>
                    Zbieranie: {gRes.name}
                  </div>
                  <div style={{ width: 50, height: 3, background: "rgba(0,0,0,0.7)", borderRadius: 2, margin: "0 auto" }}>
                    <div style={{ width: `${gp * 100}%`, height: "100%", background: gRes.color || "#ffd700", borderRadius: 2, transition: "width 0.3s" }} />
                  </div>
                </div>
              );
            })()}
          </div>
        );
      })()}

      {/* Caravan movement destination marker */}
      {isoModeRef.current && caravanMoveRef.current.active && (() => {
        const mv = caravanMoveRef.current;
        const cam = isoCameraRef.current;
        const tgt = _isoWorldToScreen(mv.targetX, mv.targetY, cam.x, cam.y);
        const src = _isoWorldToScreen(caravanPosRef.current.x, caravanPosRef.current.y, cam.x, cam.y);
        const pulse = Math.sin(Date.now() * 0.006) * 0.3 + 0.7;
        return (
          <svg style={{ position: "absolute", left: 0, top: 0, width: GAME_W, height: GAME_H, pointerEvents: "none", zIndex: 9 }}>
            {/* Path line */}
            <line x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
              stroke={`rgba(212,160,48,${pulse * 0.4})`} strokeWidth="1.5" strokeDasharray="6 4" />
            {/* Destination diamond */}
            <polygon
              points={`${tgt.x},${tgt.y - 10} ${tgt.x + 8},${tgt.y} ${tgt.x},${tgt.y + 10} ${tgt.x - 8},${tgt.y}`}
              fill={`rgba(212,160,48,${pulse * 0.25})`}
              stroke={`rgba(255,200,60,${pulse * 0.7})`} strokeWidth="1.5"
            />
            {/* Destination flag icon */}
            <text x={tgt.x} y={tgt.y - 14} textAnchor="middle" fontSize="14" fill={`rgba(255,200,60,${pulse})`}>⚑</text>
          </svg>
        );
      })()}

      {/* Meteorite event – falling from sky */}
      {meteorite && meteorite.phase === "falling" && (
        <div ref={meteoriteElRef} style={{
          position: "absolute", left: `${wrapPctToScreen(meteorite.x) ?? meteorite.x}%`, top: 0, zIndex: 18,
          fontSize: 48, userSelect: "none", pointerEvents: "none",
          animation: `meteorFall 1s ease-in forwards`,
          "--meteor-land-y": `${(meteorite.y / 100) * GAME_H}px`,
        }}>
          <div style={{
            filter: "drop-shadow(0 0 24px rgba(255,80,0,0.9)) drop-shadow(0 0 48px rgba(255,40,0,0.6))",
          }}><Icon name="meteor" size={48} /></div>
          {/* Fire trail behind meteor */}
          <div style={{
            position: "absolute", left: "50%", top: "100%",
            width: 4, height: 80, transform: "translateX(-50%)",
            background: "linear-gradient(180deg, rgba(255,100,20,0.8), rgba(255,60,0,0.4), transparent)",
            filter: "blur(3px)",
            pointerEvents: "none",
          }} />
        </div>
      )}

      {/* Screen flash during screen shake (meteor impact) */}
      {screenShake && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 17,
          background: "radial-gradient(ellipse at center, rgba(255,100,0,0.12), transparent 70%)",
          pointerEvents: "none",
          animation: "meteorFlash 0.5s ease-out forwards",
        }} />
      )}

      {/* Enemy attack slash overlay — claw/blade swipe across screen when caravan is hit */}
      {attackSlash && (
        <div key={attackSlash.id} style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 18,
          pointerEvents: "none", overflow: "hidden",
          animation: "slashFlash 0.5s ease-out forwards",
        }}>
          {/* Red damage vignette */}
          <div style={{
            position: "absolute", inset: 0,
            background: "radial-gradient(ellipse at center, transparent 30%, rgba(200,20,20,0.35) 100%)",
            animation: "slashFlash 0.5s ease-out forwards",
          }} />
          {/* Slash marks — 3 diagonal claw lines */}
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              position: "absolute",
              top: `${15 + i * 18}%`,
              left: attackSlash.fromX === 0 ? "-10%" : "110%",
              width: "120%", height: 3 + (i === 1 ? 2 : 0),
              background: `linear-gradient(${attackSlash.fromX === 0 ? "135deg" : "-135deg"}, transparent 5%, rgba(255,60,30,0.9) 30%, rgba(255,200,100,1) 50%, rgba(255,60,30,0.9) 70%, transparent 95%)`,
              transform: `rotate(${attackSlash.fromX === 0 ? 25 - i * 5 : -25 + i * 5}deg)`,
              animation: `slashSwipe${attackSlash.fromX === 0 ? "L" : "R"} 0.3s ease-out forwards`,
              animationDelay: `${i * 0.04}s`,
              filter: "blur(1px) drop-shadow(0 0 8px rgba(255,60,20,0.8))",
              opacity: 0,
            }} />
          ))}
          {/* Damage number at center */}
          <div style={{
            position: "absolute", top: "40%", left: "50%", transform: "translate(-50%,-50%)",
            fontSize: 36, fontWeight: "bold", color: "#ff3020",
            textShadow: "0 0 12px rgba(255,40,20,0.8), 2px 2px 0 #000",
            animation: "slashDmgFloat 0.6s ease-out forwards",
          }}>-{attackSlash.dmg}</div>
        </div>
      )}

      {/* Meteor boulder HP bar — shows above the destructible meteor NPC */}
      {meteorite && meteorite.phase === "active" && (() => {
        const mBoulder = walkers.find(w => w.isMeteorBoulder && w.alive && !w.dying);
        if (!mBoulder) return null;
        const hpPct = mBoulder.hp / mBoulder.maxHp;
        const hpColor = hpPct > 0.5 ? "#ff6020" : hpPct > 0.25 ? "#ff4020" : "#cc2020";
        return (
          <div ref={meteorBoulderElRef} style={{
            position: "absolute", left: `${wrapPctToScreen(meteorite.x) ?? meteorite.x}%`, top: `${meteorite.y - 3}%`,
            transform: "translateX(-50%)", zIndex: 16, pointerEvents: "none",
            textAlign: "center",
          }}>
            <div style={{ color: "#ffd700", fontSize: 10, fontWeight: "bold", textShadow: "0 1px 3px #000", marginBottom: 2 }}>
              Płonący Meteoryt
            </div>
            <div style={{
              width: 64, height: 6, background: "rgba(0,0,0,0.6)", borderRadius: 3,
              border: "1px solid rgba(255,100,20,0.4)", overflow: "hidden", margin: "0 auto",
            }}>
              <div style={{
                width: `${hpPct * 100}%`, height: "100%", background: hpColor,
                borderRadius: 2, transition: "width 0.2s",
                boxShadow: `0 0 6px ${hpColor}`,
              }} />
            </div>
            <div style={{ color: "#ddd", fontSize: 9, textShadow: "0 1px 2px #000", marginTop: 1 }}>
              {mBoulder.hp}/{mBoulder.maxHp}
            </div>
          </div>
        );
      })()}

      {/* Ground loot — clickable coins and items dropped by meteor */}
      {groundLoot.filter(i => !i.collected).map(item => {
        const isRare = item.type === "treasure" || item.type === "moonblade_saber" || item.type === "saber_drop" || item.type === "relic_drop";
        const isPotion = item.type === "health_potion";
        const rarityColors = { common: "#888", uncommon: "#40a060", rare: "#40a8b8", epic: "#a050e0", legendary: "#ffd700" };
        const glowColor = isPotion ? "#44ff88" : isRare ? (rarityColors[item.rarity] || "#ffd700") : "rgba(255,180,0,0.5)";
        const itemSize = isRare ? 30 : isPotion ? 26 : (item.type === "ammo" ? 22 : 18);
        return (
          <div key={item.id} ref={el => { if (el) groundLootElsRef.current[item.id] = el; }} data-wx={item.x} data-wy={item.y} onClick={() => collectGroundLoot(item.id)} style={{
            position: "absolute", left: `${wrapPctToScreen(item.x) ?? item.x}%`, top: `${item.y}%`, zIndex: 15,
            cursor: "pointer", userSelect: "none",
            animation: isRare ? "doorGlow 1.5s ease-in-out infinite" : isPotion ? "doorGlow 1.2s ease-in-out infinite" : "meteorPulse 2s ease-in-out infinite",
            transform: "translate(-50%, -50%)",
          }}>
            <div style={{
              width: itemSize, height: itemSize,
              filter: `drop-shadow(0 0 ${isRare || isPotion ? 10 : 4}px ${glowColor})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: isRare || isPotion ? `radial-gradient(circle, ${glowColor}20, transparent)` : "none",
              borderRadius: isRare || isPotion ? "50%" : "0",
            }}>
              <Icon name={item.icon} size={isRare ? 24 : isPotion ? 20 : (item.type === "ammo" ? 18 : 14)} />
            </div>
            <div style={{
              fontSize: isRare || isPotion ? 9 : 7,
              color: isRare || isPotion ? glowColor : "#e0c080",
              textAlign: "center", textShadow: "0 1px 3px #000",
              marginTop: -1, fontWeight: isRare || isPotion ? "bold" : "normal",
              maxWidth: 60, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {item.label}
            </div>
          </div>
        );
      })}

      {/* Resource node – hold to mine */}
      {showResource && resourceNode && (() => {
        const crackStage = Math.min(3, Math.floor(miningProgress * 4));
        const isMining = miningProgress > 0;
        const res = resourceNode.resource;
        const mineTimeSec = MINE_TIMES[res?.rarity] || 2;
        return (
          <div ref={resourceElRef}
            onMouseDown={startMining}
            onMouseUp={stopMining}
            onMouseLeave={stopMining}
            onTouchStart={startMining}
            onTouchEnd={stopMining}
            style={{
              position: "absolute", left: poiLeft(resourceNode.pos.x, resourceNode.pos.y) ?? `${resourceNode.pos.x}%`,
              ...(isoModeRef.current ? { top: poiTop(resourceNode.pos.x, resourceNode.pos.y) } : { top: `${resourceNode.pos.y}%` }),
              zIndex: 15,
              cursor: "pointer", userSelect: "none",
            }}
          >
            <div style={{
              fontSize: 34, position: "relative",
              filter: "drop-shadow(0 0 8px rgba(160,200,100,0.5))",
              animation: isMining
                ? `mineShake ${Math.max(0.06, 0.14 - miningProgress * 0.06)}s infinite alternate`
                : "resNode 2.5s ease-in-out infinite",
            }}>
              <Icon name={resourceNode.terrain === "forest" ? "wood" : "pickaxe"} size={34} />
              {/* Crack overlay */}
              {isMining && (
                <div style={{
                  position: "absolute", inset: -2, pointerEvents: "none", borderRadius: 4, overflow: "hidden",
                }}>
                  {/* Dark overlay increasing with progress */}
                  <div style={{ position: "absolute", inset: 0, background: `rgba(0,0,0,${miningProgress * 0.45})`, borderRadius: 4 }} />
                  {/* Crack lines */}
                  {crackStage >= 0 && <div style={{ position: "absolute", top: "30%", left: "15%", width: "65%", height: 2, background: `rgba(40,20,0,${0.4 + miningProgress * 0.4})`, transform: "rotate(22deg)" }} />}
                  {crackStage >= 1 && <>
                    <div style={{ position: "absolute", top: "55%", left: "10%", width: "55%", height: 2, background: "rgba(40,20,0,0.7)", transform: "rotate(-18deg)" }} />
                    <div style={{ position: "absolute", top: "20%", left: "45%", width: "45%", height: 2, background: "rgba(40,20,0,0.6)", transform: "rotate(50deg)" }} />
                  </>}
                  {crackStage >= 2 && <>
                    <div style={{ position: "absolute", top: "65%", left: "25%", width: "60%", height: 2, background: "rgba(30,15,0,0.8)", transform: "rotate(8deg)" }} />
                    <div style={{ position: "absolute", top: "42%", left: "5%", width: "35%", height: 2, background: "rgba(30,15,0,0.7)", transform: "rotate(-40deg)" }} />
                  </>}
                  {crackStage >= 3 && <>
                    <div style={{ position: "absolute", top: "75%", left: "5%", width: "90%", height: 2, background: "rgba(20,10,0,0.9)" }} />
                    <div style={{ position: "absolute", top: "12%", left: "35%", width: "55%", height: 2, background: "rgba(20,10,0,0.8)", transform: "rotate(-28deg)" }} />
                    <div style={{ position: "absolute", top: "48%", left: "50%", width: "45%", height: 2, background: "rgba(20,10,0,0.7)", transform: "rotate(65deg)" }} />
                  </>}
                </div>
              )}
            </div>
            {/* Mining progress bar */}
            {isMining && (
              <div style={{
                width: 42, height: 5, background: "rgba(0,0,0,0.75)",
                border: "1px solid #555", borderRadius: 2, margin: "3px auto 0", overflow: "hidden",
              }}>
                <div style={{
                  height: "100%", width: `${miningProgress * 100}%`,
                  background: miningProgress > 0.75 ? "#40c040" : miningProgress > 0.5 ? "#c0c040" : "#c08040",
                  transition: "width 0.05s linear",
                  borderRadius: 1,
                }} />
              </div>
            )}
            {/* Resource name & time hint */}
            {!isMining && res && (
              <div style={{
                fontSize: 9, color: "#aaa", textAlign: "center", marginTop: 1,
                textShadow: "1px 1px 0 #000", whiteSpace: "nowrap",
              }}>{mineTimeSec}s</div>
            )}
          </div>
        );
      })()}

      {/* ─── FRUIT TREE (biome variant) ─── */}
      {fruitTree && (
        <div ref={fruitTreeElRef} style={{
          position: "absolute", left: poiLeft(fruitTree.x, fruitTree.y) ?? `${fruitTree.x}%`,
          ...(isoModeRef.current ? { top: poiTop(fruitTree.x, fruitTree.y) } : { bottom: "12%" }),
          zIndex: poiZIndex(fruitTree.x, fruitTree.y), transform: isoModeRef.current ? "translateX(-50%) translateY(-100%)" : "translateX(-50%)", userSelect: "none",
        }}>
          {/* Trunk */}
          <div style={{
            width: 14, height: 70, margin: "0 auto",
            background: `linear-gradient(90deg,${fruitTree.trunk},${fruitTree.trunk}88,${fruitTree.trunk})`,
            borderRadius: "3px 3px 5px 5px",
            boxShadow: "inset -3px 0 6px rgba(0,0,0,0.3)",
          }} />
          {/* Crown */}
          <div style={{
            position: "absolute", top: -20, left: "50%", transform: "translateX(-50%)",
            width: 80, height: 60,
            background: `radial-gradient(ellipse,${fruitTree.crown[0]} 0%,${fruitTree.crown[1]} 60%,${fruitTree.crown[2]} 100%)`,
            borderRadius: "50%",
            boxShadow: "0 4px 16px rgba(0,0,0,0.4), inset 0 -8px 16px rgba(0,0,0,0.2)",
          }}>
            {fruitTree.biomeId === "winter" && (
              <div style={{
                position: "absolute", top: -4, left: "10%", right: "10%", height: 12,
                background: "radial-gradient(ellipse,rgba(230,240,255,0.7),transparent)",
                borderRadius: "50%",
              }} />
            )}
            {fruitTree.fruits.map(f => !f.picked && (
              <div key={f.id} onClick={() => pickFruit(f.id)} style={{
                position: "absolute", left: `${wrapPctToScreen(f.x) ?? f.x}%`, top: `${f.y}%`,
                fontSize: 16, cursor: "pointer",
                filter: "drop-shadow(0 0 4px rgba(255,200,60,0.5))",
                animation: "keyF 2.5s ease-in-out infinite",
                animationDelay: `${f.id * 0.3}s`,
              }}><Icon name={f.icon} size={16} /></div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 2, fontSize: 9, color: "#8a8", textShadow: "1px 1px 0 #000" }}>
            <Icon name="leaf" size={9} /> {fruitTree.label}
          </div>
        </div>
      )}

      {/* ─── MINE (biome variant rock formation) ─── */}
      {mineNugget && (
        <div ref={mineNuggetElRef} style={{
          position: "absolute", left: poiLeft(mineNugget.x, mineNugget.y) ?? `${mineNugget.x}%`,
          ...(isoModeRef.current ? { top: poiTop(mineNugget.x, mineNugget.y) } : { bottom: "12%" }),
          zIndex: poiZIndex(mineNugget.x, mineNugget.y), transform: isoModeRef.current ? "translateX(-50%) translateY(-100%)" : "translateX(-50%)", userSelect: "none",
        }}>
          {/* Rock body */}
          <div style={{
            width: 60, height: 55, position: "relative",
            background: `linear-gradient(180deg,${mineNugget.rockCol[0]},${mineNugget.rockCol[1]},${mineNugget.rockCol[2]})`,
            borderRadius: "30% 40% 8% 8%",
            boxShadow: "inset -4px 0 8px rgba(0,0,0,0.4), 0 3px 10px rgba(0,0,0,0.5)",
          }}>
            {/* Stone texture */}
            <div style={{ position: "absolute", top: 10, left: 8, width: 16, height: 3, background: "rgba(0,0,0,0.15)", borderRadius: 2, transform: "rotate(-8deg)" }} />
            <div style={{ position: "absolute", top: 25, left: 20, width: 22, height: 2, background: "rgba(0,0,0,0.12)", borderRadius: 2, transform: "rotate(5deg)" }} />
            <div style={{ position: "absolute", top: 38, left: 6, width: 18, height: 2, background: "rgba(0,0,0,0.1)", borderRadius: 2, transform: "rotate(-3deg)" }} />
            {/* Ore veins — click to collect */}
            {mineNugget.nuggets.map(n => !n.dug && (
              <div key={n.id}
                onClick={() => pickNugget(n.id)}
                style={{
                  position: "absolute", left: `${wrapPctToScreen(n.x) ?? n.x}%`, top: `${n.y}%`,
                  fontSize: 14, cursor: "pointer",
                  filter: "drop-shadow(0 0 6px rgba(212,160,48,0.6))",
                  animation: "resNode 3s ease-in-out infinite",
                  animationDelay: `${n.id * 0.4}s`,
                }}><Icon name={mineNugget.oreIcon} size={16} /></div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 2, fontSize: 9, color: "#8a8", textShadow: "1px 1px 0 #000" }}>
            <Icon name="pickaxe" size={9} /> {mineNugget.label}
          </div>
        </div>
      )}

      {/* ─── WATERFALL (biome variant) ─── */}
      {waterfall && (() => {
        const [wr,wg,wb] = waterfall.rgb;
        return (
        <div ref={waterfallElRef} style={{
          position: "absolute", left: poiLeft(waterfall.x, waterfall.y) ?? `${waterfall.x}%`,
          ...(isoModeRef.current ? { top: poiTop(waterfall.x, waterfall.y) } : { bottom: "12%" }),
          zIndex: poiZIndex(waterfall.x, waterfall.y),
          transform: "translateX(-50%)", userSelect: "none",
        }}>
          <div style={{
            width: 50, height: 90, position: "relative",
            background: waterfall.frozen
              ? "linear-gradient(180deg,#6a7a8a,#5a6a7a,#4a5a6a)"
              : "linear-gradient(180deg,#4a4a4a,#3a3a3a,#2a2a2a)",
            borderRadius: "16px 16px 4px 4px",
            boxShadow: "inset -4px 0 8px rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.5)",
          }}>
            {waterfall.frozen ? (
              <>
                {/* Frozen ice column */}
                <div style={{
                  position: "absolute", top: 6, left: "50%", transform: "translateX(-50%)",
                  width: 16, height: 84,
                  background: `linear-gradient(180deg,rgba(${wr},${wg},${wb},0.5),rgba(${wr},${wg},${wb},0.8),rgba(${wr},${wg},${wb},0.5))`,
                  borderRadius: "3px 3px 6px 6px",
                  boxShadow: `0 0 12px rgba(${wr},${wg},${wb},0.3)`,
                }} />
                {/* Icicles */}
                {[15,30,45,60,75].map(p => (
                  <div key={p} style={{
                    position: "absolute", top: 4 + (p % 3) * 3, left: `${p - 4}%`,
                    width: 3, height: 10 + (p % 5) * 2,
                    background: `rgba(${wr},${wg},${wb},0.6)`,
                    borderRadius: "1px 1px 50% 50%",
                  }} />
                ))}
              </>
            ) : (
              <>
                {/* Flowing water stream */}
                <div style={{
                  position: "absolute", top: 6, left: "50%", transform: "translateX(-50%)",
                  width: 14, height: 84,
                  background: `repeating-linear-gradient(180deg,rgba(${wr},${wg},${wb},0.7) 0px,rgba(${wr},${wg},${wb},0.4) 10px,rgba(${wr},${wg},${wb},0.7) 20px)`,
                  backgroundSize: "100% 20px",
                  borderRadius: "3px 3px 6px 6px",
                  animation: "waterFlow 0.8s linear infinite",
                  boxShadow: `0 0 10px rgba(${wr},${wg},${wb},0.3)`,
                }} />
                {/* Splash */}
                <div style={{
                  position: "absolute", bottom: -5, left: "50%", transform: "translateX(-50%)",
                  width: 34, height: 10,
                  background: `radial-gradient(ellipse,rgba(${wr},${wg},${wb},0.5),transparent)`,
                  borderRadius: "50%",
                }} />
              </>
            )}
          </div>
          {!waterfall.opened ? (
            <div onClick={openWaterfall} style={{
              textAlign: "center", marginTop: 3, fontSize: 10,
              color: waterfall.frozen ? "#a0c0e0" : "#60a0ff",
              cursor: "pointer", fontWeight: "bold",
              textShadow: "1px 1px 0 #000",
              animation: "doorGlow 2s ease-in-out infinite",
            }}>
              {waterfall.frozen ? <><Icon name="ice" size={10} /> Rozbij lód</> : <><Icon name="water" size={10} /> Sprawdź</>}
            </div>
          ) : (
            <div style={{ textAlign: "center", marginTop: 3, fontSize: 9, color: "#666", textShadow: "1px 1px 0 #000" }}>
              ✓ Skarb
            </div>
          )}
        </div>
        );
      })()}

      {/* ─── MERCENARY CAMP ─── */}
      {mercCamp && (
        <div ref={mercCampElRef} style={{
          position: "absolute", left: poiLeft(mercCamp.x, mercCamp.y) ?? `${mercCamp.x}%`,
          ...(isoModeRef.current ? { top: poiTop(mercCamp.x, mercCamp.y) } : { bottom: "12%" }),
          zIndex: poiZIndex(mercCamp.x, mercCamp.y),
          transform: "translateX(-50%)", userSelect: "none",
        }}>
          {/* Tent */}
          <div style={{ position: "relative", width: 70, height: 55 }}>
            {/* Tent fabric */}
            <div style={{
              width: 0, height: 0,
              borderLeft: "35px solid transparent", borderRight: "35px solid transparent",
              borderBottom: "40px solid #6a4020",
              position: "absolute", top: 0, left: 0,
            }} />
            <div style={{
              position: "absolute", top: 40, left: 3, right: 3, height: 15,
              background: "linear-gradient(180deg,#6a4020,#4a3018)",
              borderRadius: "0 0 3px 3px",
            }} />
            {/* Tent opening */}
            <div style={{
              position: "absolute", top: 30, left: "50%", transform: "translateX(-50%)",
              width: 16, height: 24,
              background: "linear-gradient(180deg,#1a0e08,#0a0604)",
              borderRadius: "6px 6px 0 0",
            }} />
            {/* Tent pole */}
            <div style={{
              position: "absolute", top: -5, left: "50%", transform: "translateX(-50%)",
              width: 3, height: 8, background: "#5a4020", borderRadius: 1,
            }} />
            {/* Flag */}
            <div style={{
              position: "absolute", top: -8, left: "50%", marginLeft: 2,
              width: 12, height: 8,
              background: "#c03030",
              borderRadius: "0 2px 2px 0",
              boxShadow: "1px 1px 2px rgba(0,0,0,0.3)",
            }} />
            {/* Campfire */}
            <div style={{
              position: "absolute", bottom: -2, left: -10,
              fontSize: 14, animation: "resNode 1.5s ease-in-out infinite",
            }}><Icon name="fire" size={14} /></div>
            {/* Weapon rack */}
            <div style={{
              position: "absolute", bottom: 0, right: -8, fontSize: 12,
            }}><Icon name="swords" size={12} /></div>
          </div>
          {/* Recruit buttons */}
          <div style={{ display: "flex", gap: 3, justifyContent: "center", marginTop: 3 }}>
            {MERCENARY_TYPES.map(m => {
              const cost = Math.round(totalCopper(m.cost) * (KNIGHT_LEVELS[knightLevel]?.mult || 1));
              const canAfford = totalCopper(money) >= cost;
              return (
                <div key={m.id} onClick={() => canAfford && recruitFromCamp(m)}
                  title={`${m.name} – ${cost} Cu`}
                  style={{
                    fontSize: 14, cursor: canAfford ? "pointer" : "not-allowed",
                    opacity: canAfford ? 1 : 0.4,
                    filter: canAfford ? "drop-shadow(0 0 4px rgba(212,160,48,0.5))" : "none",
                    animation: canAfford ? "keyF 2.5s ease-in-out infinite" : "none",
                    animationDelay: `${MERCENARY_TYPES.indexOf(m) * 0.2}s`,
                  }}><Icon name={m.icon} size={20} /></div>
              );
            })}
          </div>
          <div style={{ textAlign: "center", marginTop: 1, fontSize: 9, color: "#d4a030", textShadow: "1px 1px 0 #000" }}>
            <Icon name="recruit" size={9} /> Obóz Najemników
          </div>
        </div>
      )}

      {/* ─── PORT CITY BUILDINGS (shop + hideout) ─── */}
      {biome?.id === "city" && (() => {
        const _shopX = isoModeRef.current ? 10 : 20;
        const _shopY = isoModeRef.current ? 15 : undefined;
        const _hideX = isoModeRef.current ? 30 : 78;
        const _hideY = isoModeRef.current ? 25 : undefined;
        const shopScreenX = poiLeft(_shopX, _shopY);
        const hideoutScreenX = poiLeft(_hideX, _hideY);
        return (
        <>
          {/* Merchant building */}
          {shopScreenX !== null && (
          <div ref={shopElRef}
            onClick={() => togglePanel("shop")}
            style={{
              position: "absolute", left: shopScreenX,
              ...(isoModeRef.current ? { top: poiTop(_shopX, _shopY) } : { bottom: "10%" }),
              zIndex: poiZIndex(_shopX, _shopY),
              transform: "translateX(-50%)", userSelect: "none", cursor: "pointer",
            }}
          >
            <div style={{ position: "relative", width: 80, height: 72 }}>
              {/* Walls */}
              <div style={{
                position: "absolute", bottom: 0, left: 4, right: 4, height: 48,
                background: "linear-gradient(180deg,#5a4a30,#3a2a18)",
                border: "2px solid #6a5a3a", borderRadius: "3px 3px 0 0",
              }} />
              {/* Roof */}
              <div style={{
                width: 0, height: 0,
                borderLeft: "44px solid transparent", borderRight: "44px solid transparent",
                borderBottom: "28px solid #8a3020",
                position: "absolute", top: 0, left: -4,
              }} />
              {/* Door */}
              <div style={{
                position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)",
                width: 18, height: 26,
                background: "linear-gradient(180deg,#2a1a0a,#1a0e06)",
                borderRadius: "8px 8px 0 0", border: "1px solid #4a3a20",
              }} />
              {/* Sign */}
              <div style={{
                position: "absolute", top: 30, right: -2,
                background: "#3a2818", border: "1px solid #6a5020",
                padding: "1px 4px", borderRadius: 2,
              }}>
                <Icon name="shop" size={14} />
              </div>
              {/* Lantern */}
              <div style={{
                position: "absolute", top: 24, left: 6,
                width: 6, height: 8, background: "radial-gradient(circle, #ffe080, #d4a030)",
                borderRadius: "50%",
                boxShadow: "0 0 10px rgba(255,224,128,0.6)",
                animation: "resNode 2s ease-in-out infinite",
              }} />
            </div>
            <div style={{
              textAlign: "center", marginTop: 2, fontSize: 10, color: "#d4a030",
              textShadow: "1px 1px 0 #000", fontWeight: "bold",
            }}>
              <Icon name="shop" size={10} /> Bazar
            </div>
          </div>
          )}

          {/* Hideout building */}
          {hideoutScreenX !== null && (
          <div ref={hideoutElRef}
            onClick={() => togglePanel("hideout")}
            style={{
              position: "absolute", left: hideoutScreenX,
              ...(isoModeRef.current ? { top: poiTop(_hideX, _hideY) } : { bottom: "10%" }),
              zIndex: poiZIndex(_hideX, _hideY),
              transform: "translateX(-50%)", userSelect: "none", cursor: "pointer",
            }}
          >
            <div style={{ position: "relative", width: 85, height: 76 }}>
              {/* Walls */}
              <div style={{
                position: "absolute", bottom: 0, left: 4, right: 4, height: 52,
                background: "linear-gradient(180deg,#3a3a40,#2a2a30)",
                border: "2px solid #5a5a60", borderRadius: "3px 3px 0 0",
              }} />
              {/* Roof */}
              <div style={{
                width: 0, height: 0,
                borderLeft: "46px solid transparent", borderRight: "46px solid transparent",
                borderBottom: "28px solid #4a4050",
                position: "absolute", top: 0, left: -3,
              }} />
              {/* Door */}
              <div style={{
                position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)",
                width: 20, height: 28,
                background: "linear-gradient(180deg,#1a1520,#0a0810)",
                borderRadius: "8px 8px 0 0", border: "1px solid #4a4050",
              }} />
              {/* Base icon */}
              <div style={{
                position: "absolute", top: 30, right: -2,
                background: "#2a2830", border: "1px solid #5a5060",
                padding: "1px 4px", borderRadius: 2,
              }}>
                <Icon name="base" size={14} />
              </div>
              {/* Chimney smoke */}
              <div style={{
                position: "absolute", top: -6, right: 14,
                width: 8, height: 12, background: "#4a3a30", borderRadius: 1,
              }} />
              <div style={{
                position: "absolute", top: -14, right: 14,
                width: 6, height: 6, background: "rgba(120,120,130,0.4)",
                borderRadius: "50%",
                animation: "dmgFloat 3s ease-out infinite",
              }} />
            </div>
            <div style={{
              textAlign: "center", marginTop: 2, fontSize: 10, color: "#a0a0b0",
              textShadow: "1px 1px 0 #000", fontWeight: "bold",
            }}>
              <Icon name="base" size={10} /> Kryjówka
            </div>
          </div>
          )}
        </>
        );
      })()}

      {/* ─── ARSENAL TENT POI ─── */}
      {wizardPoi && (() => {
        const ammoIcons = { dynamite: "dynamite", harpoon: "harpoon", cannonball: "cannon", rum: "rum", chain: "ricochet" };
        const ammoNames = { dynamite: "Dynamit", harpoon: "Harpuny", cannonball: "Kule armatnie", rum: "Rum", chain: "Łańcuchy" };
        const ammoIcon = ammoIcons[wizardPoi.ammoType] || "dynamite";
        return (
          <div ref={wizardElRef} style={{
            position: "absolute", left: poiLeft(wizardPoi.x, wizardPoi.y) ?? `${wizardPoi.x}%`,
            ...(isoModeRef.current ? { top: poiTop(wizardPoi.x, wizardPoi.y) } : { bottom: "12%" }),
            zIndex: poiZIndex(wizardPoi.x, wizardPoi.y),
            transform: isoModeRef.current ? "translateX(-50%) translateY(-100%)" : "translateX(-50%)", userSelect: "none", textAlign: "center",
          }}>
            {/* Arsenal tent */}
            <div style={{ position: "relative", width: 65, height: 55 }}>
              {/* Tent fabric – pointed top, brown leather */}
              <div style={{
                width: 0, height: 0,
                borderLeft: "32px solid transparent", borderRight: "32px solid transparent",
                borderBottom: "35px solid #6a4a20",
                position: "absolute", top: 0, left: 0,
              }} />
              <div style={{
                position: "absolute", top: 35, left: 2, right: 2, height: 18,
                background: "linear-gradient(180deg,#6a4a20,#4a3018)",
                borderRadius: "0 0 3px 3px",
              }} />
              {/* Weapon icons on tent */}
              <div style={{ position: "absolute", top: 18, left: 12, opacity: 0.8 }}><Icon name="swords" size={7} /></div>
              <div style={{ position: "absolute", top: 28, right: 14, opacity: 0.7 }}><Icon name="cannon" size={6} /></div>
              <div style={{ position: "absolute", top: 12, right: 20, opacity: 0.6 }}><Icon name="swords" size={5} /></div>
              {/* Tent opening */}
              <div style={{
                position: "absolute", top: 26, left: "50%", transform: "translateX(-50%)",
                width: 14, height: 26,
                background: "linear-gradient(180deg,#1a0e04,#0a0600)",
                borderRadius: "5px 5px 0 0",
              }} />
              {/* Pole top with lantern */}
              <div style={{
                position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)",
                width: 3, height: 10, background: "#5a3818", borderRadius: 1,
              }} />
              <div style={{
                position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)",
                width: 10, height: 10, borderRadius: "50%",
                background: "radial-gradient(circle,#e0a040,#8a602040)",
                boxShadow: "0 0 10px #e0a04080",
                animation: "resNode 2s ease-in-out infinite",
              }} />
              {/* Ammo crate at entrance */}
              <div style={{
                position: "absolute", bottom: -2, left: "50%", transform: "translateX(-50%)",
                fontSize: 12, animation: "keyF 3s ease-in-out infinite",
              }}><Icon name={ammoIcon} size={12} /></div>
            </div>
            {/* Ammo pickup – click to collect */}
            <div style={{ display: "flex", justifyContent: "center", marginTop: 4 }}>
              <div onClick={() => collectArsenalAmmo()}
                title={`${ammoNames[wizardPoi.ammoType]} ×${wizardPoi.ammoAmount}`}
                style={{
                  fontSize: 20, cursor: "pointer",
                  filter: "drop-shadow(0 0 6px #e0a040)",
                  animation: "keyF 2.5s ease-in-out infinite",
                }}>
                <Icon name={ammoIcon} size={20} />
              </div>
            </div>
            <div style={{ fontSize: 9, color: "#e0a040", fontWeight: "bold", marginTop: 1 }}>
              +{wizardPoi.ammoAmount} {ammoNames[wizardPoi.ammoType]}
            </div>
            <div style={{ fontSize: 9, color: "#c0a060", textShadow: "1px 1px 0 #000", marginTop: 1 }}>
              <Icon name="swords" size={9} /> Arsenał
            </div>
          </div>
        );
      })()}

      {/* ─── BIOME-SPECIFIC POI ─── */}
      {biomePoi && !biomePoi.used && (() => {
        const _bpLeft = poiLeft(biomePoi.x, biomePoi.y);
        if (_bpLeft === null) return null;
        const poiColors = {
          healing_spring: "#40e060", shipwreck_cache: "#ffd700", oasis: "#40c0ff",
          ice_crystal: "#80c0ff", black_market: "#c0a060", fire_shrine: "#ff6020",
          camp_rest: "#e0c060", mushroom_circle: "#a060c0", fairy_well: "#e0c0ff",
          spore_cloud: "#44ff44", witch_hut: "#8a4090", treasure_map: "#ffd700",
          zen_shrine: "#80e0a0", pearl_oyster: "#c0c0e0",
          dungeon_entrance: "#c08040",
        };
        const col = poiColors[biomePoi.type] || "#c0a060";
        const isDungeonEntrance = biomePoi.type === "dungeon_entrance";
        const dungeonTypeColors = {
          mine: { stone: "#6a5a3a", dark: "#2a1a08", accent: "#c08040", frame: "#8a7040" },
          crypt: { stone: "#4a3a50", dark: "#1a0a20", accent: "#9060b0", frame: "#6a4a7a" },
          cave: { stone: "#3a5a4a", dark: "#0a2a1a", accent: "#40b090", frame: "#2a6a4a" },
          ruins: { stone: "#5a5040", dark: "#1a1808", accent: "#c0a060", frame: "#7a6a4a" },
        };
        const dColors = isDungeonEntrance ? (dungeonTypeColors[biomePoi.dungeonType] || dungeonTypeColors.mine) : null;
        return (
          <div ref={biomePoiElRef} style={{
            position: "absolute", left: _bpLeft,
            ...(isoModeRef.current ? { top: poiTop(biomePoi.x, biomePoi.y) } : { bottom: "12%" }),
            zIndex: poiZIndex(biomePoi.x, biomePoi.y),
            transform: isoModeRef.current ? "translateX(-50%) translateY(-100%)" : "translateX(-50%)", userSelect: "none", textAlign: "center",
          }}>
            {isDungeonEntrance ? (
              /* ─── Dungeon Entrance: stone archway with dark opening ─── */
              <div onClick={activateBiomePoi} style={{
                width: 56, height: 64, cursor: "pointer", position: "relative",
              }}>
                {/* Stone frame / archway */}
                <div style={{
                  position: "absolute", inset: 0,
                  background: `linear-gradient(180deg, ${dColors.frame}, ${dColors.stone}, ${dColors.frame})`,
                  borderRadius: "16px 16px 4px 4px",
                  boxShadow: `0 4px 12px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.15), 0 0 16px ${dColors.accent}30`,
                  border: `2px solid ${dColors.stone}`,
                }}>
                  {/* Stone texture lines */}
                  <div style={{ position: "absolute", inset: 0, borderRadius: "16px 16px 4px 4px", overflow: "hidden", pointerEvents: "none" }}>
                    <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(0deg,transparent,transparent 8px,rgba(0,0,0,0.08) 8px,rgba(0,0,0,0.08) 9px)" }} />
                    <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(90deg,transparent,transparent 12px,rgba(0,0,0,0.05) 12px,rgba(0,0,0,0.05) 13px)" }} />
                  </div>
                </div>
                {/* Dark opening (cave/mine/crypt hole) */}
                <div style={{
                  position: "absolute", left: 8, right: 8, top: 8, bottom: 6,
                  background: `radial-gradient(ellipse at 50% 30%, ${dColors.dark}, #000)`,
                  borderRadius: "12px 12px 2px 2px",
                  boxShadow: `inset 0 0 12px rgba(0,0,0,0.9), inset 0 -3px 8px ${dColors.accent}20`,
                }}>
                  {/* Accent glow from inside */}
                  <div style={{
                    position: "absolute", bottom: 4, left: "50%", transform: "translateX(-50%)",
                    width: 24, height: 12,
                    background: `radial-gradient(ellipse, ${dColors.accent}50, ${dColors.accent}15, transparent)`,
                    borderRadius: "50%",
                    animation: "resNode 2.5s ease-in-out infinite",
                  }} />
                  {/* Icon centered in the darkness */}
                  <div style={{
                    position: "absolute", top: "40%", left: "50%", transform: "translate(-50%,-50%)",
                    opacity: 0.9,
                  }}>
                    <Icon name={biomePoi.icon || "skull"} size={18} />
                  </div>
                </div>
                {/* Keystone at top of arch */}
                <div style={{
                  position: "absolute", top: -3, left: "50%", transform: "translateX(-50%)",
                  width: 12, height: 8,
                  background: `linear-gradient(180deg, ${dColors.frame}, ${dColors.stone})`,
                  borderRadius: "3px 3px 1px 1px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.5)",
                }} />
                {/* Side torch left */}
                <div style={{
                  position: "absolute", left: -6, top: 12, width: 5, height: 14,
                  background: `linear-gradient(180deg, ${dColors.accent}cc, ${dColors.stone})`,
                  borderRadius: "1px",
                  boxShadow: `0 0 8px ${dColors.accent}40`,
                }}>
                  <div style={{
                    position: "absolute", top: -4, left: "50%", transform: "translateX(-50%)",
                    width: 6, height: 6,
                    background: `radial-gradient(circle, #ffe080, ${dColors.accent}, transparent)`,
                    borderRadius: "50%",
                    animation: "resNode 0.8s ease-in-out infinite alternate",
                  }} />
                </div>
                {/* Side torch right */}
                <div style={{
                  position: "absolute", right: -6, top: 12, width: 5, height: 14,
                  background: `linear-gradient(180deg, ${dColors.accent}cc, ${dColors.stone})`,
                  borderRadius: "1px",
                  boxShadow: `0 0 8px ${dColors.accent}40`,
                }}>
                  <div style={{
                    position: "absolute", top: -4, left: "50%", transform: "translateX(-50%)",
                    width: 6, height: 6,
                    background: `radial-gradient(circle, #ffe080, ${dColors.accent}, transparent)`,
                    borderRadius: "50%",
                    animation: "resNode 0.8s ease-in-out infinite alternate",
                  }} />
                </div>
                {/* Ground rubble */}
                <div style={{
                  position: "absolute", bottom: -4, left: -4, right: -4, height: 8,
                  background: `radial-gradient(ellipse, ${dColors.stone}80, ${dColors.stone}30, transparent)`,
                  borderRadius: "50%",
                  pointerEvents: "none",
                }} />
              </div>
            ) : (
              <div onClick={activateBiomePoi} style={{
                width: 44, height: 44, borderRadius: "50%",
                background: `radial-gradient(circle, ${col}40, ${col}15)`,
                border: `2px solid ${col}80`,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", position: "relative",
                boxShadow: `0 0 12px ${col}40, inset 0 0 8px ${col}20`,
                animation: "doorGlow 2.5s ease-in-out infinite",
              }}>
                <Icon name={biomePoi.icon || "sparkle"} size={20} />
              </div>
            )}
            <div style={{
              fontSize: 9, color: isDungeonEntrance ? dColors.accent : col, fontWeight: "bold", marginTop: isDungeonEntrance ? 6 : 3,
              textShadow: "1px 1px 0 #000, 0 0 4px rgba(0,0,0,0.8)", whiteSpace: "nowrap",
            }}>
              {biomePoi.label}
            </div>
            <div style={{
              fontSize: 8, color: "#aaa", marginTop: 1,
              textShadow: "1px 1px 0 #000", whiteSpace: "nowrap",
            }}>
              {biomePoi.desc}
            </div>
          </div>
        );
      })()}


      {/* ─── ENVIRONMENTAL HAZARD ZONES ─── */}
      {envHazardsRef.current.hazards.map(h => {
        const hDef = HAZARD_TYPES[h.type];
        if (!hDef) return null;
        const hLeft = poiLeft(h.x, h.y);
        if (hLeft === null) return null;
        const fadeAlpha = h.lifeRatio < 0.2 ? h.lifeRatio / 0.2 : 1;
        return (
          <div key={h.id} style={{
            position: "absolute",
            left: hLeft,
            ...(isoModeRef.current ? { top: poiTop(h.x, h.y), transform: "translateX(-50%) translateY(-50%)" }
              : { bottom: `${h.y}%`, transform: "translateX(-50%)" }),
            width: h.radius * 2,
            height: h.radius * 1.2,
            borderRadius: "50%",
            background: hDef.color,
            opacity: fadeAlpha * 0.6,
            pointerEvents: "none",
            zIndex: 12,
            transition: "opacity 0.3s",
          }} />
        );
      })}

      {/* ─── DESTRUCTIBLE OBSTACLES ─── */}
      {obstacles.map(obs => {
        // Fog of war: hide undiscovered obstacles in iso mode
        if (isoModeRef.current && !obs._fogDiscovered) return null;
        const obsStyles = {
          fallen_log: { w: 50, h: 14, bg: "linear-gradient(90deg,#5a3a18,#6a4a20,#4a3010)", radius: "4px", shadow: "0 2px 6px rgba(0,0,0,0.5)" },
          vine_wall: { w: 30, h: 40, bg: "linear-gradient(180deg,#2a6a10,#1a4a08,#0e3004)", radius: "6px 6px 2px 2px", shadow: "0 2px 8px rgba(0,0,0,0.4)" },
          ancient_totem: { w: 16, h: 44, bg: "linear-gradient(180deg,#6a5030,#5a4020,#4a3018)", radius: "4px 4px 2px 2px", shadow: "0 2px 8px rgba(0,0,0,0.5)" },
          moss_boulder: { w: 36, h: 28, bg: "radial-gradient(ellipse,#5a6a30,#4a5a20,#3a4a18)", radius: "40%", shadow: "inset -3px 0 6px rgba(0,0,0,0.3), 0 3px 8px rgba(0,0,0,0.5)" },
          shipwreck: { w: 55, h: 30, bg: "linear-gradient(180deg,#6a5030,#4a3818,#3a2810)", radius: "8px 20px 4px 4px", shadow: "0 3px 10px rgba(0,0,0,0.5)" },
          driftwood: { w: 44, h: 10, bg: "linear-gradient(90deg,#7a6a50,#8a7a60,#6a5a40)", radius: "3px", shadow: "0 2px 4px rgba(0,0,0,0.4)" },
          tide_pool: { w: 32, h: 16, bg: "radial-gradient(ellipse,rgba(80,180,220,0.6),rgba(40,120,180,0.3))", radius: "50%", shadow: "0 0 8px rgba(60,160,220,0.3)" },
          anchor_post: { w: 12, h: 38, bg: "linear-gradient(180deg,#5a5a5a,#4a4a4a,#3a3a3a)", radius: "2px", shadow: "0 2px 6px rgba(0,0,0,0.5)" },
          cactus_cluster: { w: 20, h: 36, bg: "linear-gradient(180deg,#3a8a22,#2a7a18,#1a6a10,#1a5a10)", radius: "10px 10px 3px 3px", shadow: "0 2px 6px rgba(0,0,0,0.4), inset 2px 0 4px rgba(255,255,255,0.1)" },
          wagon_wreck: { w: 48, h: 28, bg: "linear-gradient(180deg,#6a4a20,#5a3a18,#3a2808)", radius: "4px", shadow: "0 3px 8px rgba(0,0,0,0.5)" },
          sun_bleached_skull: { w: 22, h: 18, bg: "radial-gradient(ellipse,#d8c8a0,#c0b080,#a09060)", radius: "40%", shadow: "0 2px 4px rgba(0,0,0,0.4)" },
          tumbleweed: { w: 24, h: 22, bg: "radial-gradient(circle,#8a7a50,#6a6040,#5a5030)", radius: "50%", shadow: "0 1px 3px rgba(0,0,0,0.3)" },
          ice_pillar: { w: 14, h: 42, bg: "linear-gradient(180deg,#b0d0f0,#90b8e0,#70a0d0)", radius: "4px 4px 2px 2px", shadow: "0 0 10px rgba(160,200,255,0.3), 0 3px 8px rgba(0,0,0,0.4)" },
          frozen_barrel: { w: 24, h: 28, bg: "linear-gradient(180deg,#8090a0,#607080,#405060)", radius: "4px", shadow: "0 2px 6px rgba(0,0,0,0.5)" },
          snowdrift: { w: 40, h: 16, bg: "radial-gradient(ellipse,#e8f0ff,#d0e0f0,#b0c8e0)", radius: "40%", shadow: "0 2px 4px rgba(0,0,0,0.2)" },
          icicle_rock: { w: 30, h: 32, bg: "linear-gradient(180deg,#90b0d0,#7090b0,#506a8a)", radius: "20%", shadow: "inset -2px 0 6px rgba(0,0,0,0.2), 0 3px 8px rgba(0,0,0,0.4)" },
          small_house: { w: 44, h: 48, bg: "linear-gradient(180deg,#7a3a18 0%,#7a3a18 20%,#8a7a60 20%,#7a6a50 50%,#6a5a40 100%)", radius: "6px 6px 3px 3px", shadow: "0 3px 10px rgba(0,0,0,0.5), inset 0 20px 0 -14px rgba(100,50,20,0.4)" },
          market_stall: { w: 42, h: 36, bg: "linear-gradient(180deg,#8a4020 0%,#6a3018 30%,#7a5a3a 30%,#6a4a2a 100%)", radius: "2px 2px 4px 4px", shadow: "0 3px 8px rgba(0,0,0,0.5), inset 0 -8px 0 rgba(0,0,0,0.15)" },
          broken_wagon: { w: 50, h: 28, bg: "linear-gradient(180deg,#5a4030 0%,#4a3020 60%,#3a2818 100%)", radius: "4px 4px 2px 2px", shadow: "0 3px 8px rgba(0,0,0,0.5)" },
          lamp_post: { w: 8, h: 48, bg: "linear-gradient(180deg,#4a4a4a,#3a3a3a,#2a2a2a)", radius: "2px", shadow: "0 2px 4px rgba(0,0,0,0.5), 0 -8px 16px rgba(255,160,40,0.15)" },
          sandbag_wall: { w: 44, h: 20, bg: "linear-gradient(180deg,#8a7a60,#7a6a50,#6a5a40)", radius: "4px", shadow: "0 2px 6px rgba(0,0,0,0.4)" },
          lava_pool: { w: 34, h: 14, bg: "radial-gradient(ellipse,rgba(255,100,20,0.7),rgba(200,60,10,0.4),rgba(120,30,0,0.2))", radius: "50%", shadow: "0 0 12px rgba(255,80,20,0.5)" },
          obsidian_pillar: { w: 14, h: 40, bg: "linear-gradient(180deg,#2a2030,#1a1020,#0a0810)", radius: "3px", shadow: "0 0 6px rgba(60,20,80,0.3), 0 3px 8px rgba(0,0,0,0.5)" },
          steam_vent: { w: 18, h: 12, bg: "radial-gradient(ellipse,rgba(200,200,200,0.5),rgba(160,160,160,0.2))", radius: "50%", shadow: "0 0 10px rgba(200,200,200,0.3)" },
          ash_mound: { w: 32, h: 16, bg: "radial-gradient(ellipse,#4a4040,#3a3030,#2a2020)", radius: "40%", shadow: "0 2px 4px rgba(0,0,0,0.4)" },
          haystack: { w: 30, h: 28, bg: "radial-gradient(ellipse,#c0a040,#a08830,#806820)", radius: "30%", shadow: "0 2px 6px rgba(0,0,0,0.4)" },
          windmill: { w: 20, h: 50, bg: "linear-gradient(180deg,#7a6a50,#6a5a40,#5a4a30)", radius: "3px", shadow: "0 3px 8px rgba(0,0,0,0.5)" },
          scarecrow: { w: 18, h: 44, bg: "linear-gradient(180deg,#8a7a50,#6a5a30,#5a4a20)", radius: "3px 3px 1px 1px", shadow: "0 2px 6px rgba(0,0,0,0.4)" },
          wooden_fence: { w: 46, h: 22, bg: "linear-gradient(180deg,#7a5a30,#6a4a20,#5a3a18)", radius: "2px", shadow: "0 2px 4px rgba(0,0,0,0.4)" },
          log_pile: { w: 38, h: 20, bg: "linear-gradient(180deg,#6a4a20,#5a3a18,#4a3010)", radius: "4px", shadow: "0 2px 6px rgba(0,0,0,0.5)" },
          hunting_stand: { w: 22, h: 46, bg: "linear-gradient(180deg,#6a5a30,#5a4a20,#4a3a18)", radius: "2px", shadow: "0 3px 8px rgba(0,0,0,0.5)" },
          mushroom_ring: { w: 36, h: 14, bg: "radial-gradient(ellipse,#8060a0,#604080,#402060)", radius: "50%", shadow: "0 0 8px rgba(120,60,160,0.3)" },
          fallen_tree: { w: 55, h: 16, bg: "linear-gradient(90deg,#5a4020,#6a5030,#4a3018)", radius: "4px", shadow: "0 2px 6px rgba(0,0,0,0.5)" },
          flower_patch: { w: 34, h: 12, bg: "radial-gradient(ellipse,#60c040,#40a028,#308018)", radius: "50%", shadow: "0 0 6px rgba(60,160,40,0.3)" },
          beehive: { w: 18, h: 24, bg: "radial-gradient(ellipse,#c0a040,#a08830,#806820)", radius: "30%", shadow: "0 2px 6px rgba(0,0,0,0.4)" },
          stone_bridge: { w: 50, h: 14, bg: "linear-gradient(180deg,#7a7a7a,#6a6a6a,#5a5a5a)", radius: "4px", shadow: "0 2px 6px rgba(0,0,0,0.5)" },
          well: { w: 22, h: 26, bg: "linear-gradient(180deg,#6a6a6a,#5a5a5a,#4a4a4a)", radius: "4px 4px 50% 50%", shadow: "0 2px 8px rgba(0,0,0,0.5)" },
          crystal_cluster: { w: 24, h: 30, bg: "linear-gradient(180deg,#a060e0,#8040c0,#6030a0)", radius: "4px 8px 2px 2px", shadow: "0 0 10px rgba(160,80,240,0.4)" },
          giant_mushroom: { w: 28, h: 38, bg: "radial-gradient(ellipse at top,#8060a0 40%,#5a3a18 40%)", radius: "50% 50% 4px 4px", shadow: "0 0 8px rgba(120,60,160,0.3)" },
          web_wall: { w: 40, h: 34, bg: "radial-gradient(circle,rgba(200,200,200,0.2),rgba(160,160,160,0.08))", radius: "4px", shadow: "none" },
          stalactite: { w: 12, h: 36, bg: "linear-gradient(180deg,#5a5a5a,#4a4a4a,#3a3a3a)", radius: "2px 2px 50% 50%", shadow: "0 2px 6px rgba(0,0,0,0.4)" },
          quicksand: { w: 36, h: 12, bg: "radial-gradient(ellipse,rgba(100,80,40,0.6),rgba(80,60,30,0.3))", radius: "50%", shadow: "0 0 6px rgba(100,80,40,0.3)" },
          dead_tree: { w: 18, h: 44, bg: "linear-gradient(180deg,#4a3a28,#3a2a18,#2a1a10)", radius: "3px", shadow: "0 2px 6px rgba(0,0,0,0.5)" },
          fog_pool: { w: 38, h: 12, bg: "radial-gradient(ellipse,rgba(100,140,100,0.4),rgba(60,100,60,0.15))", radius: "50%", shadow: "0 0 10px rgba(80,120,80,0.3)" },
          lily_pad: { w: 22, h: 10, bg: "radial-gradient(ellipse,#408040,#306030,#205020)", radius: "50%", shadow: "0 1px 3px rgba(0,0,0,0.3)" },
          crystal_geode: { w: 26, h: 24, bg: "radial-gradient(ellipse,#c080ff,#9050d0,#6030a0)", radius: "30%", shadow: "0 0 12px rgba(180,100,255,0.4), 0 2px 6px rgba(0,0,0,0.4)" },
          barrel_stack: { w: 30, h: 26, bg: "linear-gradient(180deg,#7a5a30,#6a4a20,#5a3a18)", radius: "4px", shadow: "0 2px 6px rgba(0,0,0,0.5)" },
          cannon_wreck: { w: 44, h: 22, bg: "linear-gradient(180deg,#5a5a5a,#3a3a3a,#2a2a2a)", radius: "4px 12px 4px 4px", shadow: "0 3px 8px rgba(0,0,0,0.5)" },
          treasure_pile: { w: 32, h: 20, bg: "radial-gradient(ellipse,#ffd700,#c0a020,#8a7010)", radius: "30%", shadow: "0 0 10px rgba(255,215,0,0.3), 0 2px 6px rgba(0,0,0,0.4)" },
          coral_reef: { w: 36, h: 18, bg: "radial-gradient(ellipse,#e06080,#c04060,#802040)", radius: "40%", shadow: "0 0 8px rgba(200,60,100,0.3)" },
          fishing_net: { w: 42, h: 10, bg: "linear-gradient(90deg,rgba(140,130,100,0.4),rgba(160,150,120,0.5),rgba(140,130,100,0.4))", radius: "2px", shadow: "none" },
          rope_coil: { w: 20, h: 18, bg: "radial-gradient(ellipse,#a09060,#806840,#604830)", radius: "50%", shadow: "0 1px 4px rgba(0,0,0,0.4)" },
          barnacle_rock: { w: 30, h: 26, bg: "radial-gradient(ellipse,#6a7a7a,#4a5a5a,#3a4a4a)", radius: "35%", shadow: "0 2px 6px rgba(0,0,0,0.5)" },
          rusted_cage: { w: 28, h: 32, bg: "linear-gradient(180deg,#8a6040,#6a4a30,#4a3020)", radius: "3px", shadow: "0 2px 6px rgba(0,0,0,0.5)" },
          mast_fragment: { w: 14, h: 48, bg: "linear-gradient(180deg,#8a7050,#6a5030,#5a4020)", radius: "3px", shadow: "0 3px 8px rgba(0,0,0,0.5)" },
          powder_keg: { w: 20, h: 22, bg: "radial-gradient(ellipse,#5a3a18,#4a2a10,#3a1a08)", radius: "20%", shadow: "0 0 6px rgba(255,100,20,0.2), 0 2px 6px rgba(0,0,0,0.5)" },
          whirlpool: { w: 34, h: 14, bg: "radial-gradient(ellipse,rgba(60,140,200,0.5),rgba(30,80,140,0.3),rgba(10,40,80,0.1))", radius: "50%", shadow: "0 0 10px rgba(60,140,200,0.3)" },
          seaweed_patch: { w: 36, h: 14, bg: "radial-gradient(ellipse,rgba(40,120,60,0.5),rgba(20,80,40,0.3))", radius: "50%", shadow: "0 0 6px rgba(40,120,60,0.2)" },
          // ─── STRUCTURAL OBSTACLES ───
          watchtower: { w: 24, h: 52, bg: "linear-gradient(180deg,#7a3a18 0%,#6a3018 15%,#8a6a40 15%,#7a5a30 60%,#6a4a20 100%)", radius: "4px 4px 2px 2px", shadow: "0 4px 12px rgba(0,0,0,0.6)" },
          stone_wall: { w: 50, h: 24, bg: "linear-gradient(180deg,#7a7a7a,#6a6a6a,#5a5a5a)", radius: "3px", shadow: "0 3px 8px rgba(0,0,0,0.5)" },
          wooden_bridge: { w: 48, h: 14, bg: "linear-gradient(180deg,#7a5a30,#6a4a20,#5a3a18)", radius: "3px", shadow: "0 2px 6px rgba(0,0,0,0.5)" },
          bell_tower: { w: 22, h: 54, bg: "linear-gradient(180deg,#6a6a6a 0%,#5a5a5a 10%,#8a7a60 10%,#7a6a50 100%)", radius: "6px 6px 3px 3px", shadow: "0 4px 12px rgba(0,0,0,0.6)" },
          crane: { w: 20, h: 50, bg: "linear-gradient(180deg,#6a6a6a,#5a5a5a,#4a4a4a)", radius: "2px", shadow: "0 3px 8px rgba(0,0,0,0.5)" },
          // ─── HAZARDOUS OBSTACLES ───
          acid_barrel: { w: 22, h: 26, bg: "linear-gradient(180deg,#3a4a2a,#2a3a1a,#1a2a0a)", radius: "4px", shadow: "0 0 6px rgba(60,200,40,0.25), 0 2px 6px rgba(0,0,0,0.5)" },
          shadow_crystal: { w: 20, h: 28, bg: "linear-gradient(180deg,#6030a0,#4020a0,#2010a0)", radius: "4px 8px 2px 2px", shadow: "0 0 12px rgba(100,40,200,0.5)" },
          oil_lamp: { w: 10, h: 32, bg: "linear-gradient(180deg,#5a5a5a,#3a3a3a,#2a2a2a)", radius: "2px", shadow: "0 -6px 12px rgba(255,160,40,0.25), 0 2px 4px rgba(0,0,0,0.5)" },
          cracked_pillar: { w: 14, h: 40, bg: "linear-gradient(180deg,#6a6a6a,#5a5a5a,#4a4a4a)", radius: "3px", shadow: "0 2px 8px rgba(0,0,0,0.5)" },
          // ─── EXPLOSIVE OBSTACLES ───
          oil_barrel: { w: 22, h: 26, bg: "linear-gradient(180deg,#4a3a2a,#3a2a1a,#2a1a0a)", radius: "4px", shadow: "0 0 6px rgba(200,80,20,0.25), 0 2px 6px rgba(0,0,0,0.5)" },
          dynamite_crate: { w: 26, h: 22, bg: "linear-gradient(180deg,#7a4020,#5a3018,#4a2010)", radius: "3px", shadow: "0 0 8px rgba(255,80,20,0.3), 0 2px 6px rgba(0,0,0,0.5)" },
          gas_mushroom: { w: 22, h: 28, bg: "radial-gradient(ellipse at top,#60a040 40%,#3a5a18 40%)", radius: "50% 50% 4px 4px", shadow: "0 0 8px rgba(80,200,40,0.3)" },
          volatile_crystal: { w: 20, h: 28, bg: "linear-gradient(180deg,#c080ff,#a050e0,#7030b0)", radius: "4px 8px 2px 2px", shadow: "0 0 12px rgba(200,100,255,0.4)" },
          magma_rock: { w: 28, h: 22, bg: "radial-gradient(ellipse,#8a3010,#6a2008,#4a1004)", radius: "30%", shadow: "0 0 10px rgba(255,80,20,0.4), 0 2px 6px rgba(0,0,0,0.5)" },
          frozen_gas_vent: { w: 20, h: 16, bg: "radial-gradient(ellipse,rgba(140,200,255,0.6),rgba(80,140,200,0.3))", radius: "50%", shadow: "0 0 10px rgba(120,180,255,0.4)" },
          swamp_gas_pod: { w: 20, h: 20, bg: "radial-gradient(ellipse,#506030,#3a4820,#2a3810)", radius: "50%", shadow: "0 0 8px rgba(80,140,40,0.3)" },
        };
        const s = obsStyles[obs.type] || obsStyles.moss_boulder;
        const isHit = obs.hitAnim > 0 && (Date.now() - obs.hitAnim) < 300;
        const hitAge = isHit ? (Date.now() - obs.hitAnim) : 300;
        const shakeX = isHit ? Math.sin(hitAge * 0.06) * (3 - hitAge * 0.01) : 0;
        const hpPct = obs.maxHp > 0 ? obs.hp / obs.maxHp : 1;
        const damaged = obs.destructible && hpPct < 1;
        const isDestroying = obs.destroying;
        // Progressive damage visuals (material-aware)
        const dmgVis = getDamageVisuals(hpPct, obs.material);
        const crackIntensity = dmgVis.crackOpacity;
        // Structural collapse visuals (tilt, scale, crumble)
        const collapseVis = getCollapseVisuals(obs.type, hpPct);
        const collapseTilt = collapseVis ? collapseVis.tilt : 0;
        const collapseScaleX = collapseVis ? collapseVis.scaleX : 1;
        const collapseScaleY = collapseVis ? collapseVis.scaleY : 1;
        const collapseOffY = collapseVis ? collapseVis.crumbleOffset : 0;
        // HP bar color: green → yellow → red
        const hpColor = hpPct > 0.5 ? `rgb(${Math.round(255 * (1 - hpPct) * 2)},200,40)` : `rgb(255,${Math.round(200 * hpPct * 2)},40)`;

        const _obsLeft = poiLeft(obs.x, obs.y);
        if (_obsLeft === null) return null;
        const isCactus = obs.type === "cactus_cluster";
        const _isI = isoModeRef.current;
        return (
          <div key={`obs-${obs.id}`} ref={el => { if (el) obsElsRef.current[obs.id] = el; }} style={{
            position: "absolute",
            left: _obsLeft,
            ...(_isI ? { top: poiTop(obs.x, obs.y), transform: `translateX(-50%) translateY(-100%) translateX(${shakeX}px) rotate(${collapseTilt}deg) scaleX(${collapseScaleX}) scaleY(${collapseScaleY}) translateY(${collapseOffY}px)` }
              : { bottom: `${obs.y}%`, transform: `translateX(-50%) translateX(${shakeX}px) scale(${scaleAtDepth(depthFromY(100 - obs.y))}) rotate(${collapseTilt}deg) scaleX(${collapseScaleX}) scaleY(${collapseScaleY})` }),
            zIndex: _isI ? poiZIndex(obs.x, obs.y) : 14 + zIndexAtDepth(depthFromY(100 - obs.y)),
            transition: isDestroying ? "opacity 0.35s ease-out, transform 0.35s ease-out" : "none",
            opacity: isDestroying ? 0 : 1,
            pointerEvents: isCactus ? "auto" : "none",
            cursor: isCactus ? "pointer" : "default",
          }}
          onClick={isCactus ? (e) => {
            e.stopPropagation();
            const cactusDmg = 5;
            setCaravanHp(prev => Math.max(0, prev - cactusDmg));
            showMessage("Kolce kaktusa! -5 HP", "#c04040");
            // Trigger hit animation on the cactus
            setObstacles(prev => prev.map(o => o.id === obs.id ? { ...o, hitAnim: Date.now() } : o));
          } : undefined}>
            {/* Main obstacle body */}
            <div style={{
              width: Math.max(s.w, 18),
              height: Math.max(s.h, 14),
              background: s.bg,
              borderRadius: s.radius,
              boxShadow: isHit
                ? `${s.shadow}, 0 0 8px rgba(255,200,100,0.6), 0 0 12px rgba(255,255,255,0.3)`
                : `${s.shadow}, 0 0 6px rgba(255,255,255,0.15)`,
              position: "relative",
              overflow: "hidden",
              transform: isDestroying ? "scale(1.3)" : "none",
              transition: isDestroying ? "transform 0.35s ease-out" : "none",
              opacity: damaged ? 0.7 + hpPct * 0.3 : 1,
              border: obs.destructible && !isDestroying
                ? `2px solid rgba(255,255,255,${damaged ? 0.35 + crackIntensity * 0.15 : 0.35})`
                : "2px solid rgba(255,255,255,0.2)",
            }}>
              {/* Progressive damage: crack overlay (material-specific pattern) */}
              {crackIntensity > 0 && (
                <div style={{
                  position: "absolute", inset: 0,
                  background: dmgVis.crackPattern === "shatter"
                    ? `repeating-conic-gradient(from ${crackIntensity * 60}deg, transparent 0deg, transparent ${10 - crackIntensity * 4}deg, rgba(0,0,0,${0.15 + crackIntensity * 0.3}) ${10 - crackIntensity * 4}deg, transparent ${11 - crackIntensity * 4}deg)`
                    : dmgVis.crackPattern === "splinter"
                    ? `repeating-linear-gradient(${80 + crackIntensity * 20}deg, transparent, transparent ${5 - crackIntensity * 2}px, rgba(40,20,0,${0.2 + crackIntensity * 0.3}) ${5 - crackIntensity * 2}px, transparent ${6 - crackIntensity * 2}px)`
                    : dmgVis.crackPattern === "dent"
                    ? `radial-gradient(circle at ${30 + crackIntensity * 20}% ${40 + crackIntensity * 10}%, rgba(0,0,0,${crackIntensity * 0.4}) 0%, transparent ${20 + crackIntensity * 15}%)`
                    : dmgVis.crackPattern === "wilt"
                    ? `repeating-linear-gradient(${90 + crackIntensity * 45}deg, transparent, transparent ${8 - crackIntensity * 3}px, rgba(60,40,0,${0.1 + crackIntensity * 0.2}) ${8 - crackIntensity * 3}px, transparent ${9 - crackIntensity * 3}px)`
                    : `repeating-linear-gradient(${45 + crackIntensity * 30}deg, transparent, transparent ${6 - crackIntensity * 3}px, rgba(0,0,0,${0.15 + crackIntensity * 0.25}) ${6 - crackIntensity * 3}px, transparent ${7 - crackIntensity * 3}px)`,
                  borderRadius: s.radius,
                  pointerEvents: "none",
                }} />
              )}
              {/* Progressive damage: darkening overlay */}
              {dmgVis.darkenAmount > 0.1 && (
                <div style={{
                  position: "absolute", inset: 0,
                  background: `rgba(0,0,0,${dmgVis.darkenAmount * 0.5})`,
                  borderRadius: s.radius,
                  pointerEvents: "none",
                }} />
              )}
              {/* Hit flash overlay */}
              {isHit && hitAge < 100 && (
                <div style={{
                  position: "absolute", inset: 0,
                  background: "rgba(255,220,150,0.4)",
                  borderRadius: s.radius,
                  pointerEvents: "none",
                }} />
              )}
              {/* Explosive warning indicator */}
              {obs.explosive && !isDestroying && (
                <div style={{
                  position: "absolute", top: "50%", left: "50%",
                  transform: "translate(-50%,-50%)",
                  fontSize: 10, fontWeight: "bold",
                  color: obs.explosionElement === "poison" ? "#44ff44" : obs.explosionElement === "ice" ? "#80c0ff" : obs.explosionElement === "lightning" ? "#ffee00" : "#ff4020",
                  textShadow: "0 0 4px rgba(0,0,0,0.8)",
                  animation: "resNode 1.5s ease-in-out infinite",
                  pointerEvents: "none",
                }}>!</div>
              )}
            </div>
            {/* HP bar - only shown when damaged and destructible */}
            {damaged && !isDestroying && (
              <div style={{
                position: "absolute",
                bottom: -5,
                left: "50%",
                transform: "translateX(-50%)",
                width: Math.max(s.w * 0.8, 20),
                height: 3,
                background: "rgba(0,0,0,0.6)",
                borderRadius: 2,
                overflow: "hidden",
              }}>
                <div style={{
                  width: `${hpPct * 100}%`,
                  height: "100%",
                  background: hpColor,
                  borderRadius: 2,
                  transition: "width 0.15s ease-out",
                }} />
              </div>
            )}
          </div>
        );
      })}

      {/* (Mine traps removed — explosive obstacles are part of biome obstacles now) */}

      {/* ─── COMPOSITE STRUCTURES (advanced visual models) ─── */}
      {structures.map(struct => {
        if (struct.allDestroyed && struct.segments.every(s => s.destroying && Date.now() - s.hitAnim > 800)) return null;
        const _isI = isoModeRef.current;
        // Structures always visible (no fog dependency — they're large landmarks)
        const fogHidden = false;
        const structLeft = poiLeft(struct.x, struct.y);
        // Always render div (even if off-screen/fog-hidden) so ref is set for DOM sync
        const structDef = STRUCTURE_DEFS[struct.defId];
        const decorations = structDef?.decorations || [];
        const _now = Date.now();
        return (
          <div key={`struct-${struct.id}`} ref={el => { if (el) structElsRef.current[struct.id] = el; }} style={{
            position: "absolute",
            left: structLeft || "0px",
            display: structLeft === null && !_isI ? "none" : "",
            visibility: fogHidden ? "hidden" : "visible",
            ...(_isI ? { top: poiTop(struct.x, struct.y), transform: "translateX(-50%) translateY(-100%)" }
              : { bottom: `${struct.y}%`, transform: `translateX(-50%) scale(${scaleAtDepth(depthFromY(100 - struct.y))})` }),
            zIndex: _isI ? poiZIndex(struct.x, struct.y) : 14 + zIndexAtDepth(depthFromY(100 - struct.y)),
            width: `${struct.width}px`,
            height: `${struct.height}px`,
            pointerEvents: "none",
          }}>
            {/* Decorations layer (behind segments for some, in front for others) */}
            {!struct.allDestroyed && decorations.map((dec, di) => {
              const animStyle = {};
              if (dec.anim === "pulse") {
                animStyle.animation = "resNode 2.5s ease-in-out infinite";
              } else if (dec.anim === "flicker") {
                animStyle.animation = "resNode 0.8s ease-in-out infinite alternate";
              } else if (dec.anim === "sway") {
                animStyle.animation = "resNode 3s ease-in-out infinite alternate";
                animStyle.transformOrigin = "top center";
              } else if (dec.anim === "float") {
                animStyle.animation = `resNode ${2 + di * 0.3}s ease-in-out infinite alternate`;
              } else if (dec.anim === "glow") {
                animStyle.animation = "resNode 2s ease-in-out infinite";
              } else if (dec.anim === "rise") {
                animStyle.animation = `resNode ${3 + di * 0.5}s ease-in-out infinite`;
              } else if (dec.anim === "shimmer") {
                animStyle.animation = "resNode 1.8s ease-in-out infinite alternate";
              } else if (dec.anim === "drip") {
                animStyle.animation = `resNode ${1.5 + di * 0.4}s ease-in infinite`;
              } else if (dec.anim === "rotate_slow") {
                const angle = ((_now / 60000) * 360) % 360;
                animStyle.transform = `rotate(${angle}deg)`;
                animStyle.transformOrigin = "bottom center";
              } else if (dec.anim === "rotate_fast") {
                const angle = ((_now / 3600) * 360) % 360;
                animStyle.transform = `rotate(${angle}deg)`;
                animStyle.transformOrigin = "bottom center";
              }
              return (
                <div key={`dec-${di}`} style={{
                  position: "absolute",
                  left: `${dec.x}px`,
                  bottom: `${dec.y}px`,
                  width: `${dec.w}px`,
                  height: `${dec.h}px`,
                  background: dec.bg,
                  borderRadius: dec.radius || "2px",
                  boxShadow: dec.shadow || "none",
                  pointerEvents: "none",
                  ...animStyle,
                }} />
              );
            })}
            {struct.segments.map(seg => {
              if (!seg.alive && !seg.destroying) return null;
              const segStyle = struct.style?.[seg.id] || { bg: "linear-gradient(180deg,#666,#444)", radius: "3px", shadow: "0 2px 6px rgba(0,0,0,0.4)" };
              const isSegHit = seg.hitAnim > 0 && (_now - seg.hitAnim) < 300;
              const hitAge = isSegHit ? (_now - seg.hitAnim) : 300;
              const shakeX = isSegHit ? Math.sin(hitAge * 0.06) * (3 - hitAge * 0.01) : 0;
              const hpPct = seg.maxHp > 0 ? seg.hp / seg.maxHp : 1;
              const damaged = seg.alive && hpPct < 1;
              const dmgVis = getDamageVisuals(hpPct, seg.material);
              const crackIntensity = dmgVis.crackOpacity;
              const hpColor = hpPct > 0.5 ? `rgb(${Math.round(255 * (1 - hpPct) * 2)},200,40)` : `rgb(255,${Math.round(200 * hpPct * 2)},40)`;
              const isDestroying = seg.destroying;
              // Animation style for segments with anim property
              const segAnim = {};
              if (segStyle.anim === "glow") {
                segAnim.animation = "resNode 2s ease-in-out infinite";
              } else if (segStyle.anim === "shimmer") {
                segAnim.animation = "resNode 1.5s ease-in-out infinite alternate";
              } else if (segStyle.anim === "rotate_slow") {
                segAnim.animation = "spin 20s linear infinite";
              } else if (segStyle.anim === "float") {
                segAnim.animation = "resNode 3s ease-in-out infinite alternate";
              } else if (segStyle.anim === "pulse") {
                segAnim.animation = "resNode 2.5s ease-in-out infinite";
              }
              return (
                <div key={`seg-${seg.id}`} style={{
                  position: "absolute",
                  left: `${seg.x}px`,
                  bottom: `${seg.y}px`,
                  width: `${seg.w}px`,
                  height: `${seg.h}px`,
                  transform: `translateX(${shakeX}px)${isDestroying ? " scale(1.2) translateY(10px)" : ""}`,
                  transition: isDestroying ? "opacity 0.4s ease-out, transform 0.4s ease-out" : "none",
                  opacity: isDestroying ? 0 : 1,
                  ...segAnim,
                }}>
                  <div style={{
                    width: "100%",
                    height: "100%",
                    background: segStyle.bg,
                    borderRadius: segStyle.radius,
                    boxShadow: isSegHit
                      ? `${segStyle.shadow}, 0 0 12px rgba(255,200,100,0.7)`
                      : segStyle.shadow,
                    position: "relative",
                    overflow: "hidden",
                    opacity: damaged ? 0.7 + hpPct * 0.3 : 1,
                    border: `2px solid rgba(255,255,255,${damaged ? 0.35 + crackIntensity * 0.15 : 0.35})`,
                  }}>
                    {/* Texture overlay for materials */}
                    {segStyle.texture && (
                      <div style={{
                        position: "absolute", inset: 0,
                        background: segStyle.texture,
                        borderRadius: segStyle.radius,
                        pointerEvents: "none",
                        opacity: 0.7,
                      }} />
                    )}
                    {/* Highlight edge (top light) */}
                    <div style={{
                      position: "absolute", top: 0, left: 0, right: 0, height: "30%",
                      background: "linear-gradient(180deg,rgba(255,255,255,0.08),transparent)",
                      borderRadius: segStyle.radius,
                      pointerEvents: "none",
                    }} />
                    {crackIntensity > 0 && (
                      <div style={{
                        position: "absolute", inset: 0,
                        background: `repeating-linear-gradient(${45 + crackIntensity * 30}deg, transparent, transparent ${6 - crackIntensity * 3}px, rgba(0,0,0,${0.15 + crackIntensity * 0.25}) ${6 - crackIntensity * 3}px, transparent ${7 - crackIntensity * 3}px)`,
                        borderRadius: segStyle.radius,
                        pointerEvents: "none",
                      }} />
                    )}
                    {/* Secondary crack pattern for heavy damage */}
                    {crackIntensity > 0.5 && (
                      <div style={{
                        position: "absolute", inset: 0,
                        background: `repeating-linear-gradient(${135 - crackIntensity * 20}deg, transparent, transparent ${8 - crackIntensity * 2}px, rgba(40,20,0,${crackIntensity * 0.2}) ${8 - crackIntensity * 2}px, transparent ${9 - crackIntensity * 2}px)`,
                        borderRadius: segStyle.radius,
                        pointerEvents: "none",
                      }} />
                    )}
                    {dmgVis.darkenAmount > 0.1 && (
                      <div style={{
                        position: "absolute", inset: 0,
                        background: `rgba(0,0,0,${dmgVis.darkenAmount * 0.5})`,
                        borderRadius: segStyle.radius,
                        pointerEvents: "none",
                      }} />
                    )}
                    {/* Ember/smoke from damaged segments */}
                    {damaged && hpPct < 0.4 && !isDestroying && (
                      <div style={{
                        position: "absolute", top: -8, left: "30%", width: "40%", height: 12,
                        background: seg.material === "wood"
                          ? "radial-gradient(ellipse,rgba(255,120,40,0.4),rgba(200,80,20,0.15),transparent)"
                          : "radial-gradient(ellipse,rgba(100,100,100,0.3),rgba(80,80,80,0.1),transparent)",
                        borderRadius: "50%",
                        pointerEvents: "none",
                        animation: "resNode 1.5s ease-in-out infinite",
                      }} />
                    )}
                    {isSegHit && hitAge < 100 && (
                      <div style={{
                        position: "absolute", inset: 0,
                        background: "rgba(255,220,150,0.45)",
                        borderRadius: segStyle.radius,
                        pointerEvents: "none",
                      }} />
                    )}
                    {seg.explosive && !isDestroying && (
                      <div style={{
                        position: "absolute", top: "50%", left: "50%",
                        transform: "translate(-50%,-50%)",
                        fontSize: 10, fontWeight: "bold",
                        color: seg.explosionElement === "ice" ? "#80c0ff" : seg.explosionElement === "shadow" ? "#aa66ff" : "#ff4020",
                        textShadow: "0 0 6px rgba(0,0,0,0.9)",
                        animation: "resNode 1.5s ease-in-out infinite",
                        pointerEvents: "none",
                      }}>!</div>
                    )}
                    {/* Material-specific bottom shadow */}
                    <div style={{
                      position: "absolute", bottom: 0, left: 0, right: 0, height: "25%",
                      background: "linear-gradient(0deg,rgba(0,0,0,0.12),transparent)",
                      borderRadius: segStyle.radius,
                      pointerEvents: "none",
                    }} />
                  </div>
                  {damaged && !isDestroying && (
                    <div style={{
                      position: "absolute", bottom: -6, left: "50%", transform: "translateX(-50%)",
                      width: Math.max(seg.w * 0.8, 16), height: 4,
                      background: "rgba(0,0,0,0.7)", borderRadius: 2, overflow: "hidden",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
                    }}>
                      <div style={{
                        width: `${hpPct * 100}%`, height: "100%",
                        background: `linear-gradient(90deg,${hpColor},${hpColor})`,
                        borderRadius: 2, transition: "width 0.15s ease-out",
                        boxShadow: `0 0 4px ${hpColor}40`,
                      }} />
                    </div>
                  )}
                  {/* Segment name label on hover/damage */}
                  {damaged && !isDestroying && (
                    <div style={{
                      position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)",
                      fontSize: 8, color: "#fff", whiteSpace: "nowrap",
                      textShadow: "0 1px 3px rgba(0,0,0,0.8)", pointerEvents: "none",
                    }}>{seg.name}</div>
                  )}
                </div>
              );
            })}
            {/* Structure name label */}
            {!struct.allDestroyed && (
              <div style={{
                position: "absolute", top: -22, left: "50%", transform: "translateX(-50%)",
                fontSize: 11, fontWeight: "bold", color: "#ffd700", whiteSpace: "nowrap",
                textShadow: "0 1px 4px rgba(0,0,0,0.9), 0 0 8px rgba(255,200,60,0.3)", pointerEvents: "none",
                letterSpacing: "0.5px",
              }}>{struct.name}</div>
            )}
          </div>
        );
      })}

      {/* ─── BIOME INTERACTABLE ELEMENTS ─── */}
      {interactables.map((item, idx) => {
        if (item.used) return null;
        // In iso mode, hide interactables until fog of war reveals them
        if (isoModeRef.current && item._fogHidden) return null;
        const screenX = wrapPctToScreen(item.x);
        if (screenX === null) return null;
        const actionColors = { shoot: "#ff6040", click: "#40c0ff", saber: "#ffd740", proximity: "#80ff80" };
        const actionLabels = { shoot: "Strzel", click: "Kliknij", saber: "Tnij", proximity: "Podejdź" };
        return (
          <div key={`inter_${item.id}_${idx}`} ref={el => { if (el) interactableElsRef.current[item.id || idx] = el; }} data-wx={item.x} data-wy={item.y} style={{
            position: "absolute", left: `${screenX}%`, bottom: `${item.y}%`,
            transform: "translateX(-50%)", zIndex: 14, cursor: item.action === "click" || item.action === "proximity" ? "pointer" : "default",
            userSelect: "none", textAlign: "center",
          }}
          onClick={() => {
            if (item.used || (item.action !== "click" && item.action !== "proximity")) return;
            setInteractables(prev => prev.map((it, i) => i === idx ? { ...it, used: true } : it));
            showMessage(`${item.name}: ${item.reward.type === "heal" ? `+${item.reward.amount} HP` : item.reward.type === "loot" ? `+${item.reward.copper} miedzi!` : "Aktywowano!"}`, actionColors[item.action]);
            // Apply reward
            if (item.reward.type === "heal") setCaravanHp(prev => Math.min(prev + item.reward.amount, CARAVAN_LEVELS[caravanLevelRef.current].hp));
            else if (item.reward.type === "loot") addMoneyFn({ copper: item.reward.copper });
            else if (item.reward.type === "heal_and_mana") {
              setCaravanHp(prev => Math.min(prev + item.reward.heal, CARAVAN_LEVELS[caravanLevelRef.current].hp));
              setMana(prev => prev + item.reward.mana);
            }
          }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: `radial-gradient(circle, ${actionColors[item.action]}40, ${actionColors[item.action]}15)`,
              border: `2px solid ${actionColors[item.action]}80`,
              display: "flex", alignItems: "center", justifyContent: "center",
              animation: "pulse 2s ease-in-out infinite",
              boxShadow: `0 0 8px ${actionColors[item.action]}40`,
            }}>
              <Icon name={item.icon} size={16} />
            </div>
            <div style={{
              fontSize: 8, color: actionColors[item.action], marginTop: 2,
              textShadow: "1px 1px 0 #000, -1px -1px 0 #000",
              fontWeight: "bold", whiteSpace: "nowrap",
            }}>
              {actionLabels[item.action]}
            </div>
          </div>
        );
      })}

      {/* ─── DEFENSE POI (bandit camp / encounter trigger) ─── */}
      {defensePoi && !defensePoi.activated && !defenseMode && (
        (() => {
          const _dpLeft = poiLeft(defensePoi.x, defensePoi.y);
          if (_dpLeft === null) return null;
          return (
            <div ref={defensePoiElRef}
              key="defense-poi"
              onClick={handleDefensePoiClick}
              style={{
                position: "absolute", left: _dpLeft,
                ...(isoModeRef.current ? { top: poiTop(defensePoi.x, defensePoi.y) } : { bottom: `${defensePoi.y}%` }),
                transform: isoModeRef.current ? "translateX(-50%) translateY(-100%)" : "translateX(-50%)", zIndex: 16, cursor: "pointer",
                userSelect: "none", textAlign: "center",
                animation: "gemPulse 2s ease-in-out infinite",
              }}
            >
              <div style={{
                width: 56, height: 56, borderRadius: "50%",
                background: "radial-gradient(circle, rgba(200,60,20,0.6) 0%, rgba(100,30,10,0.3) 60%, transparent 100%)",
                border: "2px solid #cc6020",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 0 20px rgba(200,80,20,0.5), 0 0 40px rgba(200,80,20,0.2)",
              }}>
                <img src={getIconUrl(defensePoi.icon, 28)} width={28} height={28} alt="" />
              </div>
              <div style={{
                fontSize: 10, color: "#ff8040", fontWeight: "bold", marginTop: 2,
                textShadow: "1px 1px 0 #000, -1px -1px 0 #000, 0 0 8px rgba(200,80,20,0.5)",
                whiteSpace: "nowrap",
              }}>
                {defensePoi.name}
              </div>
              <div style={{
                fontSize: 8, color: "#cc8060",
                textShadow: "1px 1px 0 #000",
                maxWidth: 120,
              }}>
                Kliknij aby zbadać
              </div>
            </div>
          );
        })()
      )}

      {/* ─── WALKING NPCs (DOM hitboxes – visual rendering on physics canvas) ─── */}
      {walkers.map(w => {
        if (!w.alive && !w.dying) return null;
        const isFriendly = w.friendly;
        const isBossWalker = w.isBoss;
        const bossScale = isBossWalker ? 1.6 : 1;
        // Terrain fog of war: hide enemies in undiscovered areas (once discovered, stay visible)
        if (isoModeRef.current && !isFriendly && terrainDataRef.current?.fogGrid) {
          const wd_pos = walkDataRef.current[w.id];
          if (wd_pos) {
            const ncol = Math.floor(wd_pos.x), nrow = Math.floor(wd_pos.y ?? ISO_CONFIG.MAP_ROWS / 2);
            if (ncol >= 0 && ncol < ISO_CONFIG.MAP_COLS && nrow >= 0 && nrow < ISO_CONFIG.MAP_ROWS) {
              const npcFogVal = terrainDataRef.current.fogGrid[nrow * ISO_CONFIG.MAP_COLS + ncol];
              if (npcFogVal > 0.01) { w._fogDiscovered = true; }
              if (!w._fogDiscovered) return null; // hidden in fog
            }
          }
        }
        // Fog: reduce enemy DOM div opacity based on walkData position
        let fogAlpha = 1;
        if (weather?.fogVisibility && !isFriendly) {
          const wd = walkDataRef.current[w.id];
          if (wd) {
            const distPct = Math.abs(wd.x - 20) / 100; // player at ~20%
            fogAlpha = Math.max(0.3, distPct < weather.fogVisibility ? 1.0
              : distPct < weather.fogVisibility * 2 ? 1.0 - ((distPct - weather.fogVisibility) / weather.fogVisibility)
              : 0.15);
          }
        }
        return (
          <div
            key={w.id}
            ref={el => { if (el) npcElsRef.current[w.id] = el; }}
            style={{
              position: "absolute",
              left: "50%",
              top: "calc(25% - 75px)",
              zIndex: isBossWalker ? 15 : 14,
              display: "flex", flexDirection: "column", alignItems: "center",
              cursor: !isFriendly && selectedSpell ? "crosshair" : isFriendly ? "default" : "pointer",
              userSelect: "none",
              opacity: w.dying ? 0 : fogAlpha,
              transition: "opacity 0.5s",
              transform: `translateX(-50%) scale(${bossScale})`,
            }}
            onDragOver={isFriendly ? undefined : e => { e.preventDefault(); setDragHighlight(`npc-${w.id}`); }}
            onDragLeave={isFriendly ? undefined : () => setDragHighlight(null)}
            onDrop={isFriendly ? undefined : e => handleSpellDrop(e, w)}
            onClick={isFriendly ? undefined : () => handleNpcClick(w)}
          >
            {/* Elite enemy aura indicator */}
            {w.alive && !w.dying && w.isElite && w.eliteMod && (
              <div style={{
                position: "absolute", top: -4, left: "50%", transform: "translateX(-50%)",
                width: 56, height: 56, borderRadius: "50%",
                background: `radial-gradient(circle, ${w.eliteMod.color}44 0%, transparent 70%)`,
                boxShadow: `0 0 12px ${w.eliteMod.color}88, 0 0 24px ${w.eliteMod.color}44`,
                animation: "gemPulse 2s ease-in-out infinite",
                pointerEvents: "none", zIndex: -1,
              }} />
            )}
            {/* Elite label */}
            {w.alive && !w.dying && w.isElite && w.eliteMod && (
              <div style={{
                fontSize: 9, fontWeight: "bold",
                color: w.eliteMod.color,
                textShadow: `0 0 6px ${w.eliteMod.color}88, 1px 1px 0 #000`,
                letterSpacing: 1, textTransform: "uppercase",
                pointerEvents: "none",
              }}>ELITE</div>
            )}
            {/* Attack telegraph – shows when enemy is lunging */}
            {w.alive && !w.dying && !isFriendly && walkDataRef.current[w.id]?.lungeFrames > 0 && (
              <div style={{
                fontSize: 14, animation: "dmgFloat 0.5s ease-out",
                color: "#ff4040", fontWeight: "bold", pointerEvents: "none",
              }}><Icon name="skull" size={14} /></div>
            )}
            {/* HP Bar — skip for boss (uses BossHpBar at top) */}
            {w.alive && !w.dying && !isBossWalker && (
              <div style={{
                width: 52, height: 6,
                background: "rgba(0,0,0,0.7)",
                border: `1px solid ${isFriendly ? "#2a6a2a" : w.isElite && w.eliteMod ? w.eliteMod.color : "#555"}`,
                marginBottom: 2,
                borderRadius: 2,
                overflow: "hidden",
              }}>
                <div style={{
                  height: "100%",
                  width: `${(w.hp / w.maxHp) * 100}%`,
                  background: isFriendly ? "#40c040"
                    : w.hp > w.maxHp * 0.5 ? "#40c040"
                    : w.hp > w.maxHp * 0.25 ? "#c0c040" : "#c04040",
                  transition: "width 0.3s, background 0.3s",
                  borderRadius: 1,
                }} />
              </div>
            )}
            {/* Mana bar for mage mercenary */}
            {w.alive && !w.dying && isFriendly && walkDataRef.current[w.id]?.mercType === "mage" && (
              <div style={{
                width: 40, height: 3,
                background: "rgba(0,0,50,0.7)",
                borderRadius: 2,
                marginTop: 1,
                overflow: "hidden",
              }}>
                <div style={{
                  height: "100%",
                  width: `${((walkDataRef.current[w.id].currentMana || 0) / (walkDataRef.current[w.id].maxMana || 1)) * 100}%`,
                  background: "#4060ff",
                  borderRadius: 2,
                  transition: "width 0.2s",
                }} />
              </div>
            )}
            {/* Frozen slow aura indicator on affected mercs */}
            {w.alive && !w.dying && isFriendly && walkDataRef.current[w.id]?._slowedUntil && (
              <div style={{
                fontSize: 10, color: "#80d0ff", pointerEvents: "none",
                textShadow: "0 0 4px #80d0ff88",
                animation: "gemPulse 1.5s ease-in-out infinite",
              }}><Icon name="anchor" size={10} /> spowolniony</div>
            )}
            {/* Status effect indicators on enemies */}
            {w.alive && !w.dying && !isFriendly && walkDataRef.current[w.id]?._stunnedUntil && (
              <div style={{
                fontSize: 10, color: "#80d0ff", pointerEvents: "none", fontWeight: "bold",
                textShadow: "0 0 6px #80d0ff, 0 0 12px #4060ff88",
                animation: "gemPulse 0.5s ease-in-out infinite",
              }}><Icon name="ice" size={10} /> OGŁUSZONY</div>
            )}
            {w.alive && !w.dying && !isFriendly && walkDataRef.current[w.id]?._burnUntil && (
              <div style={{
                fontSize: 10, color: "#ff6020", pointerEvents: "none", fontWeight: "bold",
                textShadow: "0 0 6px #ff602088, 0 0 10px #ff400044",
                animation: "gemPulse 0.4s ease-in-out infinite",
              }}><Icon name="fire" size={10} /> PŁONIE</div>
            )}
            {w.alive && !w.dying && !isFriendly && walkDataRef.current[w.id]?._frozenUntil && (
              <div style={{
                fontSize: 10, color: "#80d0ff", pointerEvents: "none", fontWeight: "bold",
                textShadow: "0 0 6px #80d0ff, 0 0 12px #4060ff88",
                animation: "gemPulse 0.5s ease-in-out infinite",
              }}><Icon name="ice" size={10} /> ZAMROŻONY</div>
            )}
            {w.alive && !w.dying && !isFriendly && !walkDataRef.current[w.id]?._frozenUntil && walkDataRef.current[w.id]?._slowedUntil && (
              <div style={{
                fontSize: 10, color: "#60bbff", pointerEvents: "none", fontWeight: "bold",
                textShadow: "0 0 4px #60bbff88",
                animation: "gemPulse 1s ease-in-out infinite",
              }}><Icon name="ice" size={10} /> SPOWOLNIONY</div>
            )}
            {w.alive && !w.dying && !isFriendly && walkDataRef.current[w.id]?._fearUntil && (
              <div style={{
                fontSize: 10, color: "#a040a0", pointerEvents: "none", fontWeight: "bold",
                textShadow: "0 0 6px #a040a088, 0 0 10px #8020a044",
                animation: "gemPulse 0.6s ease-in-out infinite",
              }}><Icon name="moon" size={10} /> STRACH</div>
            )}
            {/* Resist icon */}
            {w.alive && !w.dying && !isFriendly && w.npcData.resist && (
              <div style={{
                fontSize: 10, marginBottom: -2, pointerEvents: "none",
                opacity: 0.7,
              }}>
                <Icon name={w.npcData.resist === "fire" ? "fire" : w.npcData.resist === "shadow" ? "skull" : "ice"} size={10} />
              </div>
            )}
            {/* Invisible click area (stick figure rendered on physics canvas) */}
            <div style={{ width: isMobile ? 56 : 40, height: isMobile ? 76 : 60 }} />
            {w.alive && !w.dying && (
              <div style={{
                fontSize: isBossWalker ? 13 : 11, fontWeight: "bold",
                color: isBossWalker ? "#ff4040" : isFriendly ? "#40e060" : "#e05040",
                textShadow: "1px 1px 0 #000, -1px -1px 0 #000",
                whiteSpace: "nowrap", pointerEvents: "none",
              }}>
                {w.npcData.name}
                {!isBossWalker && <span style={{ color: "#aaa", fontSize: 10 }}> {w.hp}/{w.maxHp}</span>}
              </div>
            )}
          </div>
        );
      })}

      {/* Floating damage popups */}
      {dmgPopups.map(p => (
        <div key={p.id} style={{
          position: "absolute",
          left: `${wrapPctToScreen(p.x) ?? p.x}%`,
          top: `calc(${p.y || 65}% - 80px)`,
          zIndex: 50,
          fontWeight: "bold",
          fontSize: 18,
          color: p.color,
          textShadow: "2px 2px 0 #000, -1px -1px 0 #000",
          pointerEvents: "none",
          animation: "dmgFloat 1s ease-out forwards",
          transform: "translateX(-50%)",
        }}>
          -{p.text}
        </div>
      ))}

      {/* Scout Preview – next room info (requires spyglass tool) */}
      {nextRoomPreview && ownedTools.includes("spyglass") && (
        <div style={{
          position: "absolute", top: isMobile ? 50 : 80, right: isMobile ? 4 : 10, zIndex: 20,
          background: "rgba(20,14,10,0.9)", border: isMobile ? "1px solid #5a4030" : "2px solid #5a4030",
          padding: isMobile ? "3px 6px" : "6px 10px", fontSize: isMobile ? 8 : 11, color: "#aaa",
          boxShadow: "inset 0 0 8px rgba(0,0,0,0.4)",
          opacity: transitioning ? 0 : 0.85,
          transition: "opacity 0.5s",
        }}>
          <div style={{ fontWeight: "bold", color: "#d4a030", marginBottom: 2, fontSize: isMobile ? 9 : 12 }}><Icon name="spyglass" size={isMobile ? 9 : 12} /> Zwiad</div>
          <div>Etap #{nextRoomPreview.room}: <Icon name={nextRoomPreview.biome.icon} size={12} /> {nextRoomPreview.biome.name}</div>
          {nextRoomPreview.isDefense && <div style={{ color: "#e05040", fontWeight: "bold" }}><Icon name="swords" size={11} /> Obrona statku!</div>}
          {nextRoomPreview.isBoss && <div style={{ color: "#ff4040", fontWeight: "bold" }}><Icon name="skull" size={11} /> Boss!</div>}
          {nextRoomPreview.isRiver && <div style={{ color: "#4080c0", fontWeight: "bold" }}><Icon name="anchor" size={11} /> Przeprawa morska!</div>}
        </div>
      )}

      {/* Kill counter */}
      {kills > 0 && (
        <div style={{ position: "absolute", top: isMobile ? 38 : 58, left: isMobile ? 4 : 12, fontSize: isMobile ? 10 : 13, color: "#e05040", fontWeight: "bold", zIndex: 20, textShadow: "1px 1px 0 #000" }}>
          <Icon name="skull" size={isMobile ? 10 : 13} /> {kills}
        </div>
      )}

      {/* Tool indicators – left side, below kill counter */}
      {ownedTools.length > 0 && (
        <div style={{ position: "absolute", top: isMobile ? 50 : 78, left: isMobile ? 4 : 12, display: "flex", gap: isMobile ? 2 : 4, zIndex: 20 }}>
          {ownedTools.map(tid => {
            const tool = SHOP_TOOLS.find(t => t.id === tid);
            return tool ? <span key={tid} title={tool.name} style={{ opacity: 0.7 }}><Icon name={tool.icon} size={isMobile ? 12 : 18} /></span> : null;
          })}
        </div>
      )}

      {/* Active Relics HUD – bottom-left, above spell bar on mobile */}
      {activeRelics.length > 0 && (
        <div style={{ position: "absolute", bottom: isMobile ? 8 : 10, left: isMobile ? 4 : 10, zIndex: 50, display: "flex", gap: isMobile ? 3 : 6 }}>
          {activeRelics.map(r => (
            <div key={r.id} title={`${r.name}: ${r.desc}`} style={{ fontSize: isMobile ? 14 : 22, filter: "drop-shadow(0 0 6px rgba(160,80,220,0.5))" }}>
              <Icon name={r.icon} size={isMobile ? 14 : 22} />
            </div>
          ))}
        </div>
      )}

      {/* NPC Info Card – bottom-left on click */}
      {inspectedNpc && (
        <div style={{
          position: "absolute", bottom: isMobile ? 20 : 100, left: isMobile ? 4 : 12, zIndex: 25,
          background: "rgba(20,10,8,0.92)", border: "2px solid #5a4030",
          padding: "10px 14px", minWidth: 180,
          boxShadow: "inset 0 0 10px rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.6)",
          animation: "fadeIn 0.3s ease-out",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 32 }}><NpcIcon bodyType={inspectedNpc.bodyType} bodyColor={inspectedNpc.bodyColor} armorColor={inspectedNpc.armorColor} size={32} /></span>
            <div>
              <div style={{ fontWeight: "bold", fontSize: 14, color: "#e05040" }}>{inspectedNpc.name}</div>
              <div style={{ fontSize: 11, color: "#888" }}><Icon name={inspectedNpc.biomeIcon} size={11} /> {inspectedNpc.biomeName}</div>
            </div>
            {inspectedNpc.rarity && (
              <span style={{ fontSize: 10, fontWeight: "bold", color: RARITY_C[inspectedNpc.rarity], border: `1px solid ${RARITY_C[inspectedNpc.rarity]}40`, padding: "1px 5px" }}>
                {RARITY_L[inspectedNpc.rarity]}
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: "#aaa" }}>
            HP: <span style={{ color: "#40c040" }}>{inspectedNpc.hp}/{inspectedNpc.maxHp}</span>
          </div>
          {inspectedNpc.resist && (
            <div style={{ fontSize: 12, color: "#6688aa", marginTop: 2 }}>
              Odporność: {inspectedNpc.resist === "fire" ? <><Icon name="fire" size={12} /> Ogień</> : <><Icon name="ice" size={12} /> Lód</>}
            </div>
          )}
        </div>
      )}

      {msg && (
        <div style={{
          position: "absolute", top: "45%", left: "50%", transform: "translate(-50%,0)",
          fontWeight: "bold", fontSize: 15, color: msg.color, zIndex: 30, textShadow: "2px 2px 0 #000", whiteSpace: "nowrap",
        }}>{msg.text}</div>
      )}

      {/* Mercenary picker popup */}
      {summonPicker && (
        <div style={{
          position: "absolute",
          bottom: isMobile ? 8 : 80, left: "50%", transform: "translateX(-50%)",
          zIndex: 102, display: "flex", flexWrap: isMobile ? "wrap" : "nowrap", justifyContent: "center",
          gap: isMobile ? 4 : 8, padding: isMobile ? "6px 8px" : "10px 14px",
          background: "rgba(14,8,10,0.95)", border: "2px solid #3a6a3a",
          borderRadius: 8, boxShadow: "0 -4px 20px rgba(0,0,0,0.6), 0 0 20px rgba(60,180,80,0.15)",
          maxWidth: isMobile ? "95%" : "none",
        }}>
          {MERCENARY_TYPES.map(merc => {
            const lvl = KNIGHT_LEVELS[knightLevel];
            const mult = lvl.mult || 1;
            const finalHp = Math.round(merc.hp * mult);
            const finalDmg = Math.round(merc.damage * mult);
            const canAfford = totalCopper(money) >= totalCopper(merc.cost);
            const cdEnd = cooldowns["summon"] || 0;
            const onCooldown = Date.now() < cdEnd;
            const canSummon = canAfford && !onCooldown;
            return (
              <div key={merc.id}
                onClick={() => canSummon && castSummon(merc)}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  padding: isMobile ? "6px 6px" : "8px 10px", minWidth: isMobile ? 60 : 80,
                  border: `2px solid ${canSummon ? merc.color + "80" : "#333"}`,
                  background: canSummon ? `${merc.color}10` : "rgba(0,0,0,0.3)",
                  cursor: canSummon ? "pointer" : "not-allowed",
                  borderRadius: 6, transition: "border-color 0.15s, background 0.15s",
                  WebkitTapHighlightColor: "transparent",
                }}
                onMouseEnter={!isMobile ? (e => { if (canSummon) { e.currentTarget.style.borderColor = merc.color; e.currentTarget.style.background = `${merc.color}20`; } }) : undefined}
                onMouseLeave={!isMobile ? (e => { e.currentTarget.style.borderColor = canSummon ? merc.color + "80" : "#333"; e.currentTarget.style.background = canSummon ? `${merc.color}10` : "rgba(0,0,0,0.3)"; }) : undefined}
              >
                <span style={{ opacity: canSummon ? 1 : 0.35 }}><Icon name={merc.icon} size={isMobile ? 22 : 28} /></span>
                <div style={{ fontSize: isMobile ? 9 : 11, fontWeight: "bold", color: canSummon ? merc.color : "#555", whiteSpace: "nowrap" }}>{merc.name}</div>
                <div style={{ fontSize: isMobile ? 8 : 9, color: "#888", whiteSpace: "nowrap" }}>HP:{finalHp} ATK:{finalDmg}</div>
                <div style={{ fontSize: isMobile ? 8 : 9, color: canAfford ? "#6a9a6a" : "#804040" }}>
                  <Icon name="coin" size={9} />{merc.cost.silver ? `${merc.cost.silver}Ag` : `${merc.cost.copper}Cu`}
                </div>
              </div>
            );
          })}
          <div style={{ position: "absolute", top: -18, left: "50%", transform: "translateX(-50%)", fontSize: isMobile ? 8 : 10, color: "#6a9a6a", whiteSpace: "nowrap", fontWeight: "bold" }}>
            <Icon name={KNIGHT_LEVELS[knightLevel].icon} size={10} /> {KNIGHT_LEVELS[knightLevel].name} — {KNIGHT_LEVELS[knightLevel].desc}
          </div>
        </div>
      )}


      </div>{/* end game container */}

      {/* Crafting button — floating top-right, only during game */}
      {screen === "game" && (
        <div style={{
          position: "fixed", top: isMobile ? 46 : 58, right: 8, zIndex: 150,
          display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end",
        }}>
          <button
            onClick={() => setShowCraftingPanel(p => !p)}
            title="Kuźnia — crafting surowców"
            style={{
              background: showCraftingPanel ? "rgba(60,120,60,0.9)" : "rgba(20,12,6,0.85)",
              border: `1px solid ${showCraftingPanel ? "#5ab05a" : "#8b6030"}`,
              color: showCraftingPanel ? "#c0ffc0" : "#d4a030",
              borderRadius: 7, padding: isMobile ? "4px 8px" : "5px 10px",
              cursor: "pointer", fontSize: isMobile ? 11 : 12, fontWeight: "bold",
              letterSpacing: 1,
              boxShadow: Object.values(craftingResources).some(v => v > 0) ? "0 0 8px #8b603088" : "none",
            }}
          >
            ⚗ {isMobile ? "" : "Kuźnia"}
            {Object.values(craftingResources).reduce((a, b) => a + b, 0) > 0 && (
              <span style={{ marginLeft: 4, fontSize: 9, color: "#44cc88" }}>
                ×{Object.values(craftingResources).reduce((a, b) => a + b, 0)}
              </span>
            )}
          </button>
          {/* Crafted consumables as quick-use icons */}
          {craftedConsumables.map(c => (
            <button
              key={c.id}
              onClick={() => useCraftedConsumable(c.id)}
              title={`${c.name}: ${c.desc}`}
              style={{
                background: "rgba(20,40,20,0.9)", border: "1px solid #44884488",
                borderRadius: 6, padding: isMobile ? "3px 6px" : "4px 8px",
                cursor: "pointer", fontSize: isMobile ? 10 : 11, color: "#80ff80",
                display: "flex", alignItems: "center", gap: 4,
              }}
            >
              🧪 {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Bottom bar: Spell Bar with integrated HP & Travel icons – fixed to viewport bottom, OUTSIDE game container */}
      <div style={{
        position: "fixed", bottom: 0, left: isMobile ? 0 : "50%",
        right: isMobile ? 0 : "auto",
        transform: isMobile ? "none" : "translateX(-50%)",
        zIndex: 200, display: "flex", flexDirection: "column",
      }}>
        <SpellBar
          mana={mana}
          ammo={ammo}
          selectedSpell={selectedSpell}
          cooldowns={cooldowns}
          learnedSpells={learnedSpells}
          onSelect={handleSelectSpell}
          onDragStart={() => {}}
          isMobile={isMobile}
          gameW={GAME_W}
          gameH={GAME_H}
          spellUpgrades={spellUpgrades}
          equippedSaber={getEquippedSaberData()}
          caravanHp={caravanHp}
          caravanMaxHp={CARAVAN_LEVELS[caravanLevel].hp}
          showCaravanHp={room > 0}
          initiative={initiative}
          maxInitiative={MAX_INITIATIVE}
          caravanCost={CARAVAN_COST}
          canTravel={initiative >= CARAVAN_COST && (!defenseMode || defenseMode.phase === "complete") && !activeBoss && !riverSegment && !worldMap && !riverMapOpen}
          onTravel={travelCaravan}
        />
      </div>

      {/* Tutorial overlay – shows on first few rooms */}
      {showTutorial && room <= 1 && tutorialStep >= 0 && tutorialStep < 5 && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 400,
          background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center",
        }} onClick={() => { if (tutorialStep < 4) setTutorialStep(s => s + 1); else { setTutorialStep(-1); setShowTutorial(false); } }}>
          <div style={{
            background: "linear-gradient(180deg,#1a1210,#140a08)", border: "3px solid #5a4030",
            padding: "24px 32px", maxWidth: 500, textAlign: "center",
            boxShadow: "0 0 30px rgba(0,0,0,0.8), inset 0 0 15px rgba(0,0,0,0.5)",
            animation: "fadeIn 0.3s ease-out",
          }}>
            <div style={{ fontSize: 13, color: "#888", marginBottom: 8, letterSpacing: 2 }}>PRZEWODNIK ({tutorialStep + 1}/5)</div>
            {tutorialStep === 0 && <>
              <div style={{ marginBottom: 8 }}><Icon name="convoy" size={32} /></div>
              <div style={{ fontSize: 16, fontWeight: "bold", color: "#d4a030", marginBottom: 8 }}>Statek</div>
              <div style={{ fontSize: 13, color: "#aaa", lineHeight: 1.6 }}>Kliknij statek aby podróżować do następnego etapu. Potrzebujesz inicjatywy (regeneruje się z czasem). Chroń statek przed bandytami!</div>
            </>}
            {tutorialStep === 1 && <>
              <div style={{ marginBottom: 8 }}><Icon name="gunpowder" size={32} /></div>
              <div style={{ fontSize: 16, fontWeight: "bold", color: "#c0a060", marginBottom: 8 }}>Akcje i Walka</div>
              <div style={{ fontSize: 13, color: "#aaa", lineHeight: 1.6 }}>{isMobile ? "Wybierz akcję z paska na dole, a potem dotknij wroga. Akcje kosztują proch i mają czas odnowienia. Łącz typy (dynamit+harpun, harpun+strzał) dla bonusów COMBO!" : "Wybierz akcję z paska na dole, a potem kliknij na wroga. Możesz też przeciągnąć akcję na cel. Akcje kosztują proch i mają czas odnowienia. Łącz typy (dynamit+harpun, harpun+strzał) dla bonusów COMBO!"}</div>
            </>}
            {tutorialStep === 2 && <>
              <div style={{ marginBottom: 8 }}><Icon name="recruit" size={32} /></div>
              <div style={{ fontSize: 16, fontWeight: "bold", color: "#40e060", marginBottom: 8 }}>Najemnicy</div>
              <div style={{ fontSize: 13, color: "#aaa", lineHeight: 1.6 }}>Werbuj najemników akcją Werbowanie. Szeryf jest wytrzymały, Pirat szybki z ciosami krytycznymi, Alchemik rzuca bomby, Strzelec strzela z karabinu. Ulepszaj ich w Bazie!</div>
            </>}
            {tutorialStep === 3 && <>
              <div style={{ marginBottom: 8 }}><Icon name="scroll" size={32} /></div>
              <div style={{ fontSize: 16, fontWeight: "bold", color: "#e0c040", marginBottom: 8 }}>Lista Gończa i Sława</div>
              <div style={{ fontSize: 13, color: "#aaa", lineHeight: 1.6 }}>Pokonani wrogowie mogą upuścić karty do Listy Gończej. Odkryci wrogowie dają +5% obrażeń przeciwko nim. Zbieraj Sławę na bonusy kamieni milowych!</div>
            </>}
            {tutorialStep === 4 && <>
              <div style={{ marginBottom: 8, display: "flex", gap: 4, justifyContent: "center" }}><Icon name="shop" size={32} /><Icon name="base" size={32} /></div>
              <div style={{ fontSize: 16, fontWeight: "bold", color: "#d4a030", marginBottom: 8 }}>Bazar i Baza</div>
              <div style={{ fontSize: 13, color: "#aaa", lineHeight: 1.6 }}>Na Bazarze Portowym kupuj narzędzia i zapasy prochu. W Bazie ulepszaj statek, najemników i przechowuj skarby. Co 5 etapów czeka obrona statku, co 10 - boss!</div>
            </>}
            <div style={{ marginTop: 12, fontSize: 11, color: "#666" }}>Kliknij aby kontynuować →</div>
          </div>
        </div>
      )}

      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "#000", zIndex: 500,
        opacity: transitioning ? 1 : 0, pointerEvents: transitioning ? "all" : "none", transition: "opacity 0.4s",
      }} />

      <EventModal event={randomEvent} money={money} onResolve={resolveRandomEvent} />

      <LootPopup loot={loot} onClose={() => setLoot(null)} />

      {/* Card Drop Popup */}
      {/* Card drop side log */}
      {cardLog.length > 0 && (
        <div style={{ position: "fixed", top: isMobile ? 60 : 80, right: 8, zIndex: 210, display: "flex", flexDirection: "column", gap: 4, pointerEvents: "none" }}>
          {cardLog.map(c => (
            <div key={c.id} style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "rgba(14,8,6,0.9)", border: `1px solid ${c.rarityColor}50`,
              padding: "3px 10px", borderRadius: 4,
              animation: "cardLogSlide 0.3s ease-out",
              fontSize: isMobile ? 10 : 12,
            }}>
              <Icon name="scroll" size={11} />
              <span style={{ color: c.rarityColor, fontWeight: "bold" }}>{c.name}</span>
              <span style={{ color: "#666", fontSize: 10 }}>{c.rarityLabel}</span>
              <span style={{ color: "#60a0ff", fontSize: 10 }}>+{c.knowledge}</span>
            </div>
          ))}
        </div>
      )}

      {/* INVENTORY PANEL */}
      <SidePanel open={panel === "inv"} side="right" width={400} onClose={() => { setPanel(null); setSelectedInv(-1); }} title="Ekwipunek" isMobile={isMobile}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 6 }}>
          {[...Array(Math.max(20, Math.ceil(inventory.length / 5) * 5 + 5))].map((_, i) => (
            <ItemSlot key={i} item={inventory[i]} selected={i === selectedInv} onClick={() => setSelectedInv(i)} />
          ))}
        </div>
        {selectedInv >= 0 && selectedInv < inventory.length && (
          <ItemDetail item={inventory[selectedInv]} canStore={canStoreMore}
            onSell={() => sellItem(selectedInv)} onStore={() => storeItem(selectedInv)} />
        )}
        {/* Saber equipment section */}
        <h3 style={{ fontWeight: "bold", fontSize: 15, color: "#c0c0c0", marginTop: 14, marginBottom: 8, borderBottom: "1px solid #3a2a18", paddingBottom: 4 }}><Icon name="swords" size={15} /> Szable ({ownedSabers.length})</h3>
        <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>Aktywna: <span style={{ color: getEquippedSaberData().color, fontWeight: "bold" }}>{getEquippedSaberData().name}</span></div>
        {ownedSabers.map(sid => {
          const saber = SABERS.find(s => s.id === sid);
          if (!saber) return null;
          const isEquipped = equippedSaber === sid;
          const r = saber.rarity;
          const shimmerBg = r === "legendary" ? `linear-gradient(110deg, transparent 20%, rgba(255,215,0,0.15) 40%, rgba(255,255,180,0.25) 50%, rgba(255,215,0,0.15) 60%, transparent 80%)` : r === "epic" ? `linear-gradient(110deg, transparent 20%, ${saber.color}18 40%, ${saber.color}30 50%, ${saber.color}18 60%, transparent 80%)` : r === "rare" ? `linear-gradient(110deg, transparent 30%, ${saber.color}10 45%, ${saber.color}20 50%, ${saber.color}10 55%, transparent 70%)` : "none";
          const shimmerAnim = r === "legendary" ? "saberShimmerLegendary 3s ease infinite" : r === "epic" ? "saberShimmerEpic 4s ease infinite" : r === "rare" ? "saberShimmerRare 5s ease infinite" : "none";
          const boxGlow = r === "legendary" ? `0 0 12px ${saber.color}40, inset 0 0 12px ${saber.color}15` : r === "epic" ? `0 0 8px ${saber.color}30, inset 0 0 8px ${saber.color}10` : r === "rare" ? `0 0 4px ${saber.color}20` : "none";
          const borderCol = isEquipped ? saber.color + "80" : r === "legendary" ? "#ffd70060" : r === "epic" ? saber.color + "50" : r === "rare" ? saber.color + "30" : "#2a2a2a";
          return (
            <div key={sid} style={{ position: "relative", overflow: "hidden", display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", marginBottom: 4, border: `1px solid ${borderCol}`, background: isEquipped ? `${saber.color}10` : "transparent", boxShadow: boxGlow, backgroundImage: shimmerBg, backgroundSize: "200% 100%", animation: shimmerAnim }}>
              <span style={{ filter: isEquipped || r === "epic" || r === "legendary" ? `drop-shadow(0 0 ${r === "legendary" ? 6 : 4}px ${saber.color}${r === "legendary" ? "aa" : "66"})` : "none" }}><Icon name={saber.icon} size={22} /></span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "bold", fontSize: 13, color: SABER_RARITY_COLOR[saber.rarity] || "#888", textShadow: r === "legendary" ? `0 0 6px ${saber.color}60` : r === "epic" ? `0 0 4px ${saber.color}40` : "none" }}>{saber.name}</div>
                <div style={{ fontSize: 10, color: "#666" }}>{saber.desc}</div>
                <div style={{ fontSize: 11, color: "#888" }}>Dmg: <span style={{ color: saber.color }}>{saber.damage}</span></div>
              </div>
              {isEquipped ? (
                <span style={{ color: saber.color, fontWeight: "bold", fontSize: 11 }}>Aktywna</span>
              ) : (
                <button onClick={() => equipSaber(sid)} style={{ background: "none", border: `1px solid ${saber.color}`, color: saber.color, fontSize: 11, padding: "2px 8px", cursor: "pointer", fontWeight: "bold" }}>Za\u0142\u00f3\u017c</button>
              )}
            </div>
          );
        })}
        {/* Wand section */}
        {hasWand && (
          <>
            <h3 style={{ fontWeight: "bold", fontSize: 15, color: "#ffd700", marginTop: 14, marginBottom: 8, borderBottom: "1px solid #5a4a18", paddingBottom: 4 }}><Icon name="lightning" size={15} /> Różdżka <span style={{ fontSize: 10, color: "#ffd700", fontWeight: "normal" }}>LEGENDARNA</span></h3>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", marginBottom: 4, border: "2px solid #ffd700", background: "rgba(255,215,0,0.05)", backgroundImage: "linear-gradient(110deg, transparent 20%, rgba(255,215,0,0.08) 40%, rgba(255,215,0,0.18) 50%, rgba(255,215,0,0.08) 60%, transparent 80%)", backgroundSize: "200% 100%", animation: "saberShimmerEpic 4s ease infinite", boxShadow: "0 0 8px rgba(255,215,0,0.3), inset 0 0 6px rgba(255,215,0,0.05)", overflow: "hidden", position: "relative" }}>
              <span style={{ filter: "drop-shadow(0 0 5px rgba(255,215,0,0.7))" }}><Icon name="lightning" size={22} /></span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "bold", fontSize: 13, color: "#ffd700", textShadow: "0 0 4px rgba(255,215,0,0.4)" }}>Różdżka Burzy</div>
                <div style={{ fontSize: 10, color: "#b8a050" }}>Trzymaj aby kule piorunów krążyły wokół kursora (10 dmg) | +1 proch/s</div>
              </div>
              <span style={{ color: "#ffd700", fontWeight: "bold", fontSize: 11 }}>Wyposażona</span>
            </div>
          </>
        )}
      </SidePanel>

      {/* SHOP PANEL */}
      <SidePanel open={panel === "shop"} side="left" width={430} onClose={() => setPanel(null)} title="Bazar Portowy" isMobile={isMobile}>
        <h3 style={{ fontWeight: "bold", fontSize: 15, color: "#c0a060", marginBottom: 8, borderBottom: "1px solid #3a2a18", paddingBottom: 4 }}><Icon name="gunpowder" size={15} /> Zapasy Prochu</h3>
        {MANA_POTIONS.map(potion => {
          const canAfford = totalCopper(money) >= totalCopper(potion.cost);
          return (
            <div key={potion.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", border: "2px solid #1a2a3a", marginBottom: 6, background: "rgba(60,100,200,0.04)" }}>
              <span><Icon name={potion.icon} size={28} /></span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "bold", fontSize: 14, color: "#80b0ff" }}>{potion.name}</div>
                <div style={{ fontSize: 12, color: "#5577aa" }}>{potion.desc}</div>
                <div style={{ fontSize: 13, color: "#888" }}><Icon name="coin" size={13} /> {formatValHTML(potion.cost)}</div>
              </div>
              <button onClick={() => buyMana(potion.id)} disabled={!canAfford}
                style={{ background: "none", border: `2px solid ${canAfford ? "#4080cc" : "#333"}`, color: canAfford ? "#60a0ff" : "#555", fontSize: 14, padding: "3px 12px", cursor: canAfford ? "pointer" : "not-allowed", fontWeight: "bold" }}>Kup</button>
            </div>
          );
        })}

        <h3 style={{ fontWeight: "bold", fontSize: 15, color: "#e0a040", marginTop: 14, marginBottom: 8, borderBottom: "1px solid #3a2a18", paddingBottom: 4 }}><Icon name="dynamite" size={15} /> Amunicja</h3>
        <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>Posiadasz: <Icon name="dynamite" size={12} /> {ammo.dynamite} | <Icon name="harpoon" size={12} /> {ammo.harpoon} | <Icon name="cannon" size={12} /> {ammo.cannonball} | <Icon name="rum" size={12} /> {ammo.rum} | <Icon name="ricochet" size={12} /> {ammo.chain}</div>
        {AMMO_ITEMS.map(item => {
          const canAfford = totalCopper(money) >= totalCopper(item.cost);
          return (
            <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", border: "2px solid #2a1e14", marginBottom: 6, background: "rgba(224,160,64,0.04)" }}>
              <span><Icon name={item.icon} size={28} /></span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "bold", fontSize: 14, color: "#e0a040" }}>{item.name}</div>
                <div style={{ fontSize: 12, color: "#8a7040" }}>{item.desc}</div>
                <div style={{ fontSize: 13, color: "#888" }}><Icon name="coin" size={13} /> {formatValHTML(item.cost)}</div>
              </div>
              <button onClick={() => buyAmmo(item.id)} disabled={!canAfford}
                style={{ background: "none", border: `2px solid ${canAfford ? "#e0a040" : "#333"}`, color: canAfford ? "#e0a040" : "#555", fontSize: 14, padding: "3px 12px", cursor: canAfford ? "pointer" : "not-allowed", fontWeight: "bold" }}>Kup</button>
            </div>
          );
        })}

        <h3 style={{ fontWeight: "bold", fontSize: 15, color: "#d4a030", marginTop: 14, marginBottom: 8, borderBottom: "1px solid #2a2018", paddingBottom: 4 }}><Icon name="pickaxe" size={15} /> Narzędzia do kupienia</h3>
        {SHOP_TOOLS.map(tool => {
          const owned = ownedTools.includes(tool.id);
          const canAfford = totalCopper(money) >= totalCopper(tool.cost);
          return (
            <div key={tool.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", border: `2px solid ${owned ? "#2a3a1a" : "#2a1e14"}`, marginBottom: 6, background: owned ? "rgba(40,80,20,0.08)" : "rgba(255,255,255,0.02)" }}>
              <span><Icon name={tool.icon} size={28} /></span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "bold", fontSize: 14, color: owned ? "#50a850" : "#d8c8a8" }}>{tool.name}</div>
                <div style={{ fontSize: 12, color: "#777" }}>{tool.desc}</div>
                <div style={{ fontSize: 13, color: "#888" }}><Icon name="coin" size={13} /> {formatValHTML(tool.cost)}</div>
              </div>
              {owned ? (
                <span style={{ color: "#50a850", fontWeight: "bold", fontSize: 13 }}>Posiadasz</span>
              ) : (
                <button onClick={() => buyTool(tool.id)} disabled={!canAfford}
                  style={{ background: "none", border: `2px solid ${canAfford ? "#50a850" : "#333"}`, color: canAfford ? "#50a850" : "#555", fontSize: 14, padding: "3px 12px", cursor: canAfford ? "pointer" : "not-allowed", fontWeight: "bold" }}>Kup</button>
              )}
            </div>
          );
        })}
        <h3 style={{ fontWeight: "bold", fontSize: 15, color: "#c0c0c0", marginTop: 14, marginBottom: 8, borderBottom: "1px solid #3a2a18", paddingBottom: 4 }}><Icon name="swords" size={15} /> Szable</h3>
        <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>Wyposażona: <span style={{ color: getEquippedSaberData().color, fontWeight: "bold" }}>{getEquippedSaberData().name}</span></div>
        {SABERS.filter(s => !s.starter && s.price > 0).map(saber => {
          const owned = ownedSabers.includes(saber.id);
          const equipped = equippedSaber === saber.id;
          const priceCopper = saber.price * 100;
          const canAfford = totalCopper(money) >= priceCopper;
          const sr = saber.rarity;
          const shopShimmer = sr === "legendary" ? `linear-gradient(110deg, transparent 20%, rgba(255,215,0,0.12) 40%, rgba(255,255,180,0.2) 50%, rgba(255,215,0,0.12) 60%, transparent 80%)` : sr === "epic" ? `linear-gradient(110deg, transparent 20%, ${saber.color}14 40%, ${saber.color}25 50%, ${saber.color}14 60%, transparent 80%)` : sr === "rare" ? `linear-gradient(110deg, transparent 30%, ${saber.color}0a 45%, ${saber.color}18 50%, ${saber.color}0a 55%, transparent 70%)` : "none";
          const shopAnim = sr === "legendary" ? "saberShimmerLegendary 3s ease infinite" : sr === "epic" ? "saberShimmerEpic 4s ease infinite" : sr === "rare" ? "saberShimmerRare 5s ease infinite" : "none";
          const shopGlow = sr === "legendary" ? `0 0 10px ${saber.color}35` : sr === "epic" ? `0 0 6px ${saber.color}25` : "none";
          return (
            <div key={saber.id} style={{ position: "relative", overflow: "hidden", display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", border: `2px solid ${owned ? (equipped ? saber.color + "60" : "#2a3a1a") : "#2a1e14"}`, marginBottom: 6, background: equipped ? `${saber.color}10` : owned ? "rgba(40,80,20,0.08)" : "rgba(255,255,255,0.02)", backgroundImage: shopShimmer, backgroundSize: "200% 100%", animation: shopAnim, boxShadow: shopGlow }}>
              <span style={{ filter: `drop-shadow(0 0 ${sr === "legendary" ? 6 : 4}px ${saber.color}${sr === "legendary" ? "aa" : "66"})` }}><Icon name={saber.icon} size={28} /></span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "bold", fontSize: 14, color: SABER_RARITY_COLOR[saber.rarity] || "#888" }}>{saber.name}</div>
                <div style={{ fontSize: 11, color: "#777" }}>{saber.desc}</div>
                <div style={{ fontSize: 12, color: "#888" }}>Obrażenia: <span style={{ color: saber.color }}>{saber.damage}</span> | <Icon name="silver" size={12} /> {saber.price}</div>
              </div>
              {equipped ? (
                <span style={{ color: saber.color, fontWeight: "bold", fontSize: 12 }}>Aktywna</span>
              ) : owned ? (
                <button onClick={() => equipSaber(saber.id)} style={{ background: "none", border: `2px solid ${saber.color}`, color: saber.color, fontSize: 13, padding: "3px 10px", cursor: "pointer", fontWeight: "bold" }}>Załóż</button>
              ) : (
                <button onClick={() => buySaber(saber.id)} disabled={!canAfford} style={{ background: "none", border: `2px solid ${canAfford ? saber.color : "#333"}`, color: canAfford ? saber.color : "#555", fontSize: 13, padding: "3px 10px", cursor: canAfford ? "pointer" : "not-allowed", fontWeight: "bold" }}>Kup</button>
              )}
            </div>
          );
        })}

        {/* Magic Wand - Legendary */}
        <h3 style={{ fontWeight: "bold", fontSize: 15, color: "#ffd700", marginTop: 14, marginBottom: 8, borderBottom: "1px solid #5a4a18", paddingBottom: 4 }}><Icon name="lightning" size={15} /> Legendarne Przedmioty</h3>
        {(() => {
          const wandPrice = { gold: 2 };
          const canAffordWand = totalCopper(money) >= totalCopper(wandPrice);
          return (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", border: `2px solid ${hasWand ? "#8a7a30" : "#ffd700"}`, marginBottom: 6, background: hasWand ? "rgba(255,215,0,0.05)" : "rgba(255,215,0,0.03)", backgroundImage: "linear-gradient(110deg, transparent 20%, rgba(255,215,0,0.08) 40%, rgba(255,215,0,0.18) 50%, rgba(255,215,0,0.08) 60%, transparent 80%)", backgroundSize: "200% 100%", animation: "saberShimmerEpic 4s ease infinite", boxShadow: hasWand ? "0 0 4px rgba(255,215,0,0.15)" : "0 0 8px rgba(255,215,0,0.3), 0 0 16px rgba(255,215,0,0.1)" }}>
              <span style={{ filter: "drop-shadow(0 0 6px rgba(255,215,0,0.7))" }}><Icon name="lightning" size={28} /></span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "bold", fontSize: 14, color: "#ffd700", textShadow: "0 0 6px rgba(255,215,0,0.3)" }}>Różdżka Burzy <span style={{ fontSize: 9, color: "#ffd700", background: "rgba(255,215,0,0.15)", padding: "1px 4px", borderRadius: 3, border: "1px solid rgba(255,215,0,0.3)" }}>LEGENDARNA</span></div>
                <div style={{ fontSize: 11, color: "#b8a050" }}>Trzymaj aby kule piorunów krążyły wokół kursora (10 dmg) | +1 proch/s</div>
                <div style={{ fontSize: 12, color: "#ffd700" }}><Icon name="gold" size={12} /> 2</div>
              </div>
              {hasWand ? (
                <span style={{ color: "#ffd700", fontWeight: "bold", fontSize: 12 }}>Posiadasz</span>
              ) : (
                <button onClick={() => { if (!canAffordWand) return; sfxBuy(); setMoney(copperToMoney(totalCopper(money) - totalCopper(wandPrice))); setHasWand(true); setLearnedSpells(prev => prev.includes("wand") ? prev : [...prev, "wand"]); showMessage("Kupiono Różdżkę Burzy! Legendarny przedmiot!", "#ffd700"); }} disabled={!canAffordWand} style={{ background: "none", border: `2px solid ${canAffordWand ? "#ffd700" : "#333"}`, color: canAffordWand ? "#ffd700" : "#555", fontSize: 13, padding: "3px 10px", cursor: canAffordWand ? "pointer" : "not-allowed", fontWeight: "bold", textShadow: canAffordWand ? "0 0 4px rgba(255,215,0,0.3)" : "none" }}>Kup</button>
              )}
            </div>
          );
        })()}

        {/* ─── BARGAIN BUTTON ─── */}
        <div style={{ marginTop: 14, marginBottom: 10, padding: "8px 12px", background: "rgba(100,80,30,0.15)", border: "2px solid #5a4a18", textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "#c0a060", marginBottom: 6 }}>
            <Icon name="dice" size={14} /> Targowanie{shopDiscount > 0 ? ` (${Math.round(shopDiscount * 100)}% zniżki!)` : shopDiscount < 0 ? ` (+${Math.round(Math.abs(shopDiscount) * 100)}% drożej!)` : ""}
          </div>
          {activeBuffs.length > 0 && (
            <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>
              Aktywne buffy: {activeBuffs.map(b => <span key={b.id} style={{ color: b.color, marginRight: 6 }}>{b.name}{b.roomsLeft > 0 ? ` (${b.roomsLeft})` : ""}</span>)}
            </div>
          )}
          <button onClick={doBargain} disabled={bargainUsed}
            style={{ background: bargainUsed ? "#1a1510" : "linear-gradient(180deg, #4a3a18, #2a1a08)", border: `2px solid ${bargainUsed ? "#333" : "#c0a060"}`, color: bargainUsed ? "#555" : "#ffd700", fontSize: 14, padding: "6px 20px", cursor: bargainUsed ? "not-allowed" : "pointer", fontWeight: "bold" }}>
            {bargainUsed ? (shopDiscount > 0 ? "Udane!" : shopDiscount < 0 ? "Nieudane..." : "Użyto") : "Spróbuj się targować"}
          </button>
        </div>

        {/* ─── UNIQUE SPECIALS ─── */}
        {shopStock && shopStock.specials.length > 0 && (<>
          <h3 style={{ fontWeight: "bold", fontSize: 15, color: "#e040e0", marginTop: 14, marginBottom: 8, borderBottom: "1px solid #4a1a4a", paddingBottom: 4 }}><Icon name="star" size={15} /> Unikalne Przedmioty</h3>
          <div style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>Ograniczona ilość — znikają po zakupie!</div>
          {shopStock.specials.map(item => {
            const cost = shopDiscount !== 0 ? applyDiscount(item.cost, shopDiscount) : item.cost;
            const canAfford = totalCopper(money) >= totalCopper(cost);
            const SPECIAL_RARITY_COLOR = { uncommon: "#40a040", rare: "#4080ff", epic: "#a040e0", legendary: "#ffd700" };
            return (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", border: `2px solid ${item.color}30`, marginBottom: 6, background: `${item.color}08`, backgroundImage: item.rarity === "legendary" ? "linear-gradient(110deg, transparent 20%, rgba(255,215,0,0.08) 50%, transparent 80%)" : item.rarity === "epic" ? `linear-gradient(110deg, transparent 20%, ${item.color}10 50%, transparent 80%)` : "none", backgroundSize: "200% 100%", animation: item.rarity === "legendary" ? "saberShimmerLegendary 3s ease infinite" : item.rarity === "epic" ? "saberShimmerEpic 4s ease infinite" : "none" }}>
                <span style={{ filter: `drop-shadow(0 0 4px ${item.color}66)` }}><Icon name={item.icon} size={28} /></span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: "bold", fontSize: 14, color: SPECIAL_RARITY_COLOR[item.rarity] || "#ccc" }}>{item.name} <span style={{ fontSize: 9, color: item.color, background: `${item.color}20`, padding: "1px 4px", borderRadius: 3 }}>{item.rarity === "legendary" ? "LEGENDARNY" : item.rarity === "epic" ? "EPICKI" : item.rarity === "rare" ? "RZADKI" : "NIEPOSPOLITY"}</span></div>
                  <div style={{ fontSize: 11, color: "#999" }}>{item.desc}</div>
                  <div style={{ fontSize: 12, color: "#888" }}><Icon name="coin" size={12} /> {formatValHTML(cost)}{shopDiscount > 0 && <span style={{ color: "#50e050", fontSize: 10, marginLeft: 4 }}>-{Math.round(shopDiscount*100)}%</span>}{shopDiscount < 0 && <span style={{ color: "#e05050", fontSize: 10, marginLeft: 4 }}>+{Math.round(Math.abs(shopDiscount)*100)}%</span>}</div>
                </div>
                <button onClick={() => buySpecialItem(item)} disabled={!canAfford}
                  style={{ background: "none", border: `2px solid ${canAfford ? item.color : "#333"}`, color: canAfford ? item.color : "#555", fontSize: 13, padding: "3px 10px", cursor: canAfford ? "pointer" : "not-allowed", fontWeight: "bold" }}>Kup</button>
              </div>
            );
          })}
        </>)}

        {/* ─── BIOME-THEMED ITEMS ─── */}
        {shopStock && shopStock.biomeItems.length > 0 && (<>
          <h3 style={{ fontWeight: "bold", fontSize: 15, color: "#40c8c8", marginTop: 14, marginBottom: 8, borderBottom: "1px solid #1a3a3a", paddingBottom: 4 }}><Icon name="compass" size={15} /> Towary z {biome?.name || "Wyprawy"}</h3>
          <div style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>Tematyczne przedmioty z ostatniego biomu</div>
          {shopStock.biomeItems.filter(item => !boughtSpecials.includes(item.id)).map(item => {
            const cost = shopDiscount !== 0 ? applyDiscount(item.cost, shopDiscount) : item.cost;
            const canAfford = totalCopper(money) >= totalCopper(cost);
            return (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", border: `2px solid ${item.color}30`, marginBottom: 6, background: `${item.color}06` }}>
                <span style={{ filter: `drop-shadow(0 0 3px ${item.color}44)` }}><Icon name={item.icon} size={28} /></span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: "bold", fontSize: 14, color: item.color }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: "#999" }}>{item.desc}</div>
                  <div style={{ fontSize: 12, color: "#888" }}><Icon name="coin" size={12} /> {formatValHTML(cost)}{shopDiscount > 0 && <span style={{ color: "#50e050", fontSize: 10, marginLeft: 4 }}>-{Math.round(shopDiscount*100)}%</span>}{shopDiscount < 0 && <span style={{ color: "#e05050", fontSize: 10, marginLeft: 4 }}>+{Math.round(Math.abs(shopDiscount)*100)}%</span>}</div>
                </div>
                <button onClick={() => buySpecialItem(item)} disabled={!canAfford}
                  style={{ background: "none", border: `2px solid ${canAfford ? item.color : "#333"}`, color: canAfford ? item.color : "#555", fontSize: 13, padding: "3px 10px", cursor: canAfford ? "pointer" : "not-allowed", fontWeight: "bold" }}>Kup</button>
              </div>
            );
          })}
        </>)}

        <h3 style={{ fontWeight: "bold", fontSize: 15, color: "#ffd700", marginTop: 14, marginBottom: 8, borderBottom: "1px solid #5a4a18", paddingBottom: 4 }}><Icon name="star" size={15} /> Piracki Bandit</h3>
        <SlotMachine
          money={money}
          totalCopper={totalCopper}
          copperToMoney={copperToMoney}
          onWin={(copperAmount) => { addMoneyFn(copperToMoney(copperAmount)); showMessage(`Wygrana na automacie! +${copperAmount >= 100 ? Math.floor(copperAmount/100) + " Ag" : copperAmount + " Cu"}`, "#ffd700"); }}
          onLose={(copperAmount) => { const tc = totalCopper(money); if (tc >= copperAmount) setMoney(copperToMoney(tc - copperAmount)); }}
        />

        <h3 style={{ fontWeight: "bold", fontSize: 15, color: "#d4a030", marginTop: 14, marginBottom: 8, borderBottom: "1px solid #2a2018", paddingBottom: 4 }}><Icon name="coin" size={15} /> Sprzedaż skarbów</h3>
        {inventory.length > 0 && (
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            <button onClick={sellAll} style={{ flex: 1, background: "none", border: "2px solid #8a6018", color: "#d4a030", fontSize: 13, fontWeight: "bold", padding: "6px 12px", cursor: "pointer" }}>
              <Icon name="coin" size={13} /> Sprzedaj wszystko ({inventory.length})
            </button>
            <button onClick={storeAll} disabled={hideoutItems.length >= HIDEOUT_LEVELS[hideoutLevel].slots} style={{ flex: 1, background: "none", border: "2px solid #2a6a6a", color: "#40a8b8", fontSize: 13, fontWeight: "bold", padding: "6px 12px", cursor: hideoutItems.length >= HIDEOUT_LEVELS[hideoutLevel].slots ? "not-allowed" : "pointer", opacity: hideoutItems.length >= HIDEOUT_LEVELS[hideoutLevel].slots ? 0.4 : 1 }}>
              <Icon name="treasure" size={13} /> Schowaj wszystko
            </button>
          </div>
        )}
        {inventory.length === 0 ? (
          <div style={{ color: "#444", fontSize: 16, textAlign: "center", marginTop: 30 }}>Brak przedmiotów do sprzedaży.<br/>Otwieraj skrzynie!</div>
        ) : inventory.map((it, idx) => (
          <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", border: "2px solid #2a1e14", marginBottom: 6, background: "rgba(255,255,255,0.02)" }}>
            <span><Icon name={it.icon} size={28} /></span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: "bold", fontSize: 14, color: RARITY_C[it.rarity] }}>{it.name}</div>
              <div style={{ fontSize: 12, color: RARITY_C[it.rarity] }}>{RARITY_L[it.rarity]}</div>
              <div style={{ fontSize: 13, color: "#888" }}><Icon name="coin" size={13} /> {formatValHTML(it.value)}</div>
            </div>
            <button onClick={() => sellItem(idx)} style={{ background: "none", border: "2px solid #4a3a28", color: "#d8c8a8", fontSize: 15, padding: "3px 12px", cursor: "pointer", fontWeight: "bold" }}>Sprzedaj</button>
          </div>
        ))}
      </SidePanel>

      {/* HIDEOUT PANEL */}
      <SidePanel open={panel === "hideout"} side="right" width={460} onClose={() => setPanel(null)} title="Moja Baza" isMobile={isMobile}>
        <h3 style={{ fontWeight: "bold", fontSize: 16, color: "#d4a030", marginBottom: 8, borderBottom: "1px solid #2a2018", paddingBottom: 4 }}><Icon name="coin" size={16} /> Skarbiec</h3>
        <canvas ref={vaultRef} width={420} height={200} style={{ width: "100%", height: 200, border: "2px solid #3a2818", background: "#0a0604", marginBottom: 12, display: "block" }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 8, background: "rgba(0,0,0,0.3)", border: "1px solid #2a2018", marginBottom: 10 }}>
          <span style={{ fontWeight: "bold", fontSize: 15, color: "#d4a030" }}>Poz. {hideoutLevel + 1} — {hlvl.name}</span>
          <span style={{ fontSize: 14, color: "#888" }}>Miejsca: {hideoutItems.length}/{hlvl.slots}</span>
        </div>

        <button onClick={upgradeHideout} disabled={!canAffordUpgrade || !nextLevel}
          style={{
            background: "none", border: `2px solid ${canAffordUpgrade ? "#8a6018" : "#333"}`,
            color: canAffordUpgrade ? "#d4a030" : "#555", fontWeight: "bold", fontSize: 14, padding: "6px 16px",
            cursor: canAffordUpgrade ? "pointer" : "not-allowed", display: "block", width: "100%", textAlign: "center", marginBottom: 12,
          }}>
          {nextLevel ? <>⬆ {nextLevel.name} ({nextLevel.slots} miejsc) — {formatValHTML(nextLevel.cost)}</> : "⬆ Maksymalny poziom!"}
        </button>

        {/* Mercenary upgrade section */}
        <h3 style={{ fontWeight: "bold", fontSize: 16, color: "#40e060", marginBottom: 8, borderBottom: "1px solid #1a3a1a", paddingBottom: 4 }}><Icon name="swords" size={16} /> Najemnicy</h3>
        {(() => {
          const kn = KNIGHT_LEVELS[knightLevel];
          const nextKn = knightLevel < KNIGHT_LEVELS.length - 1 ? KNIGHT_LEVELS[knightLevel + 1] : null;
          const canAffordKnight = nextKn ? totalCopper(money) >= totalCopper(nextKn.cost) : false;
          return (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "rgba(40,120,40,0.08)", border: "2px solid #1a3a1a", marginBottom: 6 }}>
                <span><Icon name={kn.icon} size={36} /></span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: "bold", fontSize: 15, color: "#40e060" }}>Poz. {kn.level} — {kn.name}</div>
                  <div style={{ fontSize: 12, color: "#6a9a6a" }}>{kn.desc} (x{kn.mult} HP/ATK)</div>
                </div>
              </div>
              {/* Mercenary types preview */}
              <div style={{ display: "flex", gap: 4, marginBottom: 6, justifyContent: "center" }}>
                {MERCENARY_TYPES.map(m => (
                  <div key={m.id} style={{ textAlign: "center", padding: "3px 6px", border: `1px solid ${m.color}30`, borderRadius: 4 }}>
                    <div><Icon name={m.icon} size={20} /></div>
                    <div style={{ fontSize: 9, color: m.color }}>{m.name}</div>
                    <div style={{ fontSize: 8, color: "#666" }}>HP:{Math.round(m.hp * kn.mult)} ATK:{Math.round(m.damage * kn.mult)}</div>
                  </div>
                ))}
              </div>
              {/* Level icons preview */}
              <div style={{ display: "flex", gap: 4, marginBottom: 6, justifyContent: "center" }}>
                {KNIGHT_LEVELS.map((kl, i) => (
                  <span key={i} style={{
                    fontSize: 22, opacity: i <= knightLevel ? 1 : 0.3,
                    filter: i === knightLevel ? "drop-shadow(0 0 6px rgba(60,220,80,0.8))" : "none",
                  }}><Icon name={kl.icon} size={16} /></span>
                ))}
              </div>
              <button onClick={upgradeKnight} disabled={!canAffordKnight || !nextKn}
                style={{
                  background: "none", border: `2px solid ${canAffordKnight ? "#2a6a2a" : "#333"}`,
                  color: canAffordKnight ? "#40e060" : "#555", fontWeight: "bold", fontSize: 14, padding: "6px 16px",
                  cursor: canAffordKnight ? "pointer" : "not-allowed", display: "block", width: "100%", textAlign: "center",
                }}>
                {nextKn ? <><Icon name="star" size={12} /> <Icon name={nextKn.icon} size={12} /> {nextKn.name} (x{nextKn.mult}) — {formatValHTML(nextKn.cost)}</> : "Maksymalny poziom!"}
              </button>
            </div>
          );
        })()}

        {/* Mercenary recruitment */}
        <h3 style={{ fontWeight: "bold", fontSize: 16, color: "#c0a060", marginBottom: 8, borderBottom: "1px solid #2a2018", paddingBottom: 4 }}><Icon name="recruit" size={16} /> Werbuj Najemników</h3>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          {MERCENARY_TYPES.map(m => {
            const cost = totalCopper(m.cost);
            const canAfford = totalCopper(money) >= cost;
            const lvl = KNIGHT_LEVELS[knightLevel];
            const mult = lvl.mult || 1;
            return (
              <button key={m.id} onClick={() => { recruitFromCamp(m, 50); setPanel(null); }}
                disabled={!canAfford}
                style={{
                  flex: "1 1 45%", display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 10px", background: canAfford ? "rgba(40,80,40,0.12)" : "rgba(0,0,0,0.2)",
                  border: `2px solid ${canAfford ? m.color + "60" : "#333"}`,
                  cursor: canAfford ? "pointer" : "not-allowed",
                  opacity: canAfford ? 1 : 0.5, borderRadius: 4,
                  fontFamily: "monospace", color: "#d8c8a8", fontSize: 12,
                  textAlign: "left",
                }}>
                <Icon name={m.icon} size={24} />
                <div>
                  <div style={{ fontWeight: "bold", color: m.color }}>{m.name}</div>
                  <div style={{ fontSize: 10, color: "#888" }}>HP:{Math.round(m.hp * mult)} ATK:{Math.round(m.damage * mult)}</div>
                  <div style={{ fontSize: 10, color: canAfford ? "#d4a030" : "#555" }}>{cost} Cu</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Caravan upgrade section */}
        <h3 style={{ fontWeight: "bold", fontSize: 16, color: "#d4a030", marginBottom: 8, borderBottom: "1px solid #2a2018", paddingBottom: 4 }}><Icon name="anchor" size={16} /> Statek</h3>
        {(() => {
          const cl = CARAVAN_LEVELS[caravanLevel];
          const nextCl = caravanLevel < CARAVAN_LEVELS.length - 1 ? CARAVAN_LEVELS[caravanLevel + 1] : null;
          const canAffordCaravan = nextCl ? totalCopper(money) >= totalCopper(nextCl.cost) : false;
          return (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "rgba(160,120,40,0.08)", border: "2px solid #3a2a18", marginBottom: 6 }}>
                <span><Icon name="convoy" size={36} /></span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: "bold", fontSize: 15, color: "#d4a030" }}>Poz. {caravanLevel + 1} — {cl.name}</div>
                  <div style={{ fontSize: 12, color: "#a08a60" }}>
                    HP: {cl.hp} | Armor: {cl.armor}
                    {cl.barricade && <> | <Icon name="wood" size={12} /> Barykada ({cl.barricade.hp} HP)</>}
                    {cl.thornArmor && <> | <Icon name="lightning" size={12} /> Kolce ({cl.thornArmor.damage} dmg)</>}
                    {cl.warDrums && <> | <Icon name="fame" size={12} /> Bębny (+{cl.warDrums.bonus}%)</>}
                    {cl.dog && <> | <Icon name="dog" size={12} /> Ogar</>}
                  </div>
                </div>
              </div>
              <button onClick={upgradeCaravan} disabled={!canAffordCaravan || !nextCl}
                style={{
                  background: "none", border: `2px solid ${canAffordCaravan ? "#8a6018" : "#333"}`,
                  color: canAffordCaravan ? "#d4a030" : "#555", fontWeight: "bold", fontSize: 14, padding: "6px 16px",
                  cursor: canAffordCaravan ? "pointer" : "not-allowed", display: "block", width: "100%", textAlign: "center", marginBottom: 12,
                }}>
                {nextCl ? <>{nextCl.name} (HP:{nextCl.hp}, Armor:{nextCl.armor}{nextCl.barricade && !cl.barricade ? ", +Barykada" : ""}{nextCl.thornArmor && !cl.thornArmor ? ", +Kolce" : ""}{nextCl.warDrums && !cl.warDrums ? ", +Bębny Wojenne" : ""}{nextCl.dog && !cl.dog ? ", +Ogar" : ""}) — {formatValHTML(nextCl.cost)}</> : "Maksymalny poziom!"}
              </button>
            </div>
          );
        })()}

        {/* Permanent Upgrades */}
        <h3 style={{ fontWeight: "bold", fontSize: 16, color: "#d4a030", marginBottom: 8, marginTop: 14, borderBottom: "1px solid #2a2018", paddingBottom: 4 }}><Icon name="swords" size={16} /> Ulepszenia Permanentne</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
          {HIDEOUT_UPGRADES.map(upg => {
            const lvl = hideoutUpgrades[upg.id] || 0;
            const maxed = lvl >= upg.maxLevel;
            const cost = maxed ? null : upg.costs[lvl];
            const canAfford = cost ? totalCopper(money) >= totalCopper(cost) : false;
            return (
              <div key={upg.id} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "6px 8px",
                background: maxed ? "rgba(60,180,60,0.06)" : "rgba(0,0,0,0.25)",
                border: `1px solid ${maxed ? "#2a5a2a" : "#2a2018"}`, borderRadius: 4,
              }}>
                <Icon name={upg.icon} size={18} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: "bold", fontSize: 12, color: maxed ? "#60c060" : "#d4a030" }}>{upg.name} <span style={{ fontSize: 10, color: "#888" }}>Poz. {lvl}/{upg.maxLevel}</span></div>
                  <div style={{ fontSize: 10, color: "#999" }}>{upg.desc}</div>
                </div>
                {maxed ? (
                  <span style={{ fontSize: 10, color: "#60c060", fontWeight: "bold" }}>MAX</span>
                ) : (
                  <button onClick={() => purchaseHideoutUpgrade(upg.id)} disabled={!canAfford}
                    style={{
                      background: "none", border: `1px solid ${canAfford ? "#8a6018" : "#333"}`,
                      color: canAfford ? "#d4a030" : "#555", fontWeight: "bold", fontSize: 11,
                      padding: "3px 8px", cursor: canAfford ? "pointer" : "not-allowed", borderRadius: 3, whiteSpace: "nowrap",
                    }}>
                    {formatValHTML(cost)}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <h3 style={{ fontWeight: "bold", fontSize: 16, color: "#d4a030", marginBottom: 8, borderBottom: "1px solid #2a2018", paddingBottom: 4 }}><Icon name="treasure" size={16} /> Schowek <span style={{ color: "#888", fontSize: 13 }}>(kliknij by zabrać)</span></h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 6 }}>
          {[...Array(hlvl.slots)].map((_, i) => (
            <ItemSlot key={i} item={hideoutItems[i]} onClick={() => retrieveItem(i)} size={48} />
          ))}
        </div>
      </SidePanel>

      {/* BESTIARY PANEL */}
      <SidePanel open={panel === "bestiary"} side="left" width={460} onClose={() => setPanel(null)} title="Lista Gończa" isMobile={isMobile}>
        <div style={{ fontSize: 14, color: "#e0c040", marginBottom: 8, fontWeight: "bold" }}>
          <Icon name="star" size={14} /> Sława: {knowledge} | Odkryto: {Object.keys(bestiary).length}/{ALL_NPCS.length}
        </div>
        <div style={{ fontSize: 12, color: "#aaa", marginBottom: 12, padding: "6px 8px", background: "rgba(200,160,60,0.06)", border: "1px solid #3a2a18" }}>
          <div style={{ color: "#e0c040", fontWeight: "bold", marginBottom: 4 }}>Bonusy Sławy:</div>
          <div><Icon name="scroll" size={12} /> Odkryty wróg: <span style={{ color: "#40c040" }}>+5% obrażeń</span> przeciwko niemu</div>
          <div style={{ opacity: knowledge >= 50 ? 1 : 0.4 }}><Icon name="star" size={12} /> 50 Sławy: <span style={{ color: knowledge >= 50 ? "#40c040" : "#666" }}>+5% do wszystkich obrażeń</span> {knowledge >= 50 ? "✓" : `(${knowledge}/50)`}</div>
          <div style={{ opacity: knowledge >= 100 ? 1 : 0.4 }}><Icon name="star" size={12} /> 100 Sławy: <span style={{ color: knowledge >= 100 ? "#40c040" : "#666" }}>+10% do wszystkich obrażeń</span> {knowledge >= 100 ? "✓" : `(${knowledge}/100)`}</div>
          <div style={{ opacity: knowledge >= 200 ? 1 : 0.4 }}><Icon name="star" size={12} /> 200 Sławy: <span style={{ color: knowledge >= 200 ? "#40c040" : "#666" }}>+15% do wszystkich obrażeń</span> {knowledge >= 200 ? "✓" : `(${knowledge}/200)`}</div>
          <div style={{ marginTop: 6, borderTop: "1px solid #2a2018", paddingTop: 6, color: "#c0a040", fontWeight: "bold" }}>Bonusy Łowcy:</div>
          <div style={{ color: "#aaa" }}><span style={{ color: "#60c040" }}>☠ 5 zabić</span> → +10% DMG | <span style={{ color: "#60c040" }}>20 zabić</span> → +20% | <span style={{ color: "#60c040" }}>50 zabić</span> → +30%</div>
          <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>Bonus działa wyłącznie na dany typ wroga.</div>
        </div>

        {/* Knowledge Shop */}
        <div style={{ marginBottom: 12, padding: "8px", background: "rgba(200,160,60,0.04)", border: "1px solid #3a2a18" }}>
          <div style={{ color: "#d4a030", fontWeight: "bold", marginBottom: 6, fontSize: 13 }}><Icon name="fame" size={13} /> Sklep Sławy <span style={{ color: "#e0c040", fontSize: 11 }}>(<Icon name="star" size={11} /> {knowledge})</span></div>
          {[
            { id: "manaPool", name: "Zapas Prochu", desc: "+10 max prochu", icon: "gunpowder", maxLvl: 3, costs: [30, 60, 100] },
            { id: "spellPower", name: "Siła Strzału", desc: "+5% obrażeń akcji", icon: "lightning", maxLvl: 5, costs: [20, 40, 60, 80, 100] },
            { id: "manaRegen", name: "Regeneracja Prochu", desc: "+0.5 prochu/sek", icon: "gunpowder", maxLvl: 3, costs: [25, 50, 80] },
          ].map(upg => {
            const lvl = knowledgeUpgrades[upg.id] || 0;
            const maxed = lvl >= upg.maxLvl;
            const cost = maxed ? 0 : upg.costs[lvl];
            const canAfford = knowledge >= cost;
            return (
              <div key={upg.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 6px", marginBottom: 4, border: `1px solid ${maxed ? "#2a6a2a" : "#1a1a2a"}` }}>
                <span><Icon name={upg.icon} size={20} /></span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: "bold", fontSize: 12, color: maxed ? "#40c040" : "#aaa" }}>{upg.name} (Poz. {lvl}/{upg.maxLvl})</div>
                  <div style={{ fontSize: 10, color: "#666" }}>{upg.desc}</div>
                </div>
                {maxed ? (
                  <span style={{ color: "#40c040", fontSize: 11, fontWeight: "bold" }}>MAX</span>
                ) : (
                  <button onClick={() => buyKnowledgeUpgrade(upg.id)} disabled={!canAfford}
                    style={{ background: "none", border: `1px solid ${canAfford ? "#4060cc" : "#333"}`, color: canAfford ? "#60a0ff" : "#555", fontSize: 11, padding: "2px 8px", cursor: canAfford ? "pointer" : "not-allowed", fontWeight: "bold" }}>
                    <Icon name="scroll" size={11} /> {cost}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {Object.entries(
          ALL_NPCS.reduce((acc, npc) => {
            if (!acc[npc.biomeId]) acc[npc.biomeId] = [];
            acc[npc.biomeId].push(npc);
            return acc;
          }, {})
        ).map(([biomeId, npcs]) => (
          <div key={biomeId} style={{ marginBottom: 16 }}>
            <h3 style={{
              fontWeight: "bold", fontSize: 14, color: "#d4a030",
              borderBottom: "1px solid #2a2018", paddingBottom: 4, marginBottom: 8,
            }}>
              {BIOME_NAMES[biomeId] || biomeId}
            </h3>
            {npcs.map(npc => {
              const entry = bestiary[npc.id];
              const discovered = entry?.discovered;
              const npcKills = killsByType[npc.name] || 0;
              const tiers = [5, 20, 50];
              const unlockedTiers = tiers.filter(t => npcKills >= t).length;
              const nextTier = tiers.find(t => npcKills < t);
              const killBonusPct = unlockedTiers * 10;
              return (
                <div key={npc.id} style={{
                  display: "flex", alignItems: "flex-start", gap: 10,
                  padding: "8px 10px", marginBottom: 4,
                  border: `2px solid ${unlockedTiers > 0 ? "#3a4818" : discovered ? "#3a2818" : "#1a1210"}`,
                  background: unlockedTiers > 0 ? "rgba(80,160,40,0.05)" : discovered ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.3)",
                  opacity: discovered ? 1 : 0.4,
                  filter: discovered ? "none" : "grayscale(100%)",
                }}>
                  <span style={{ flexShrink: 0, marginTop: 2 }}>{discovered ? <NpcIcon bodyType={npc.bodyType} bodyColor={npc.bodyColor} armorColor={npc.armorColor} size={28} /> : <Icon name="question" size={28} />}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: "bold", fontSize: 13, color: discovered ? "#d8c8a8" : "#444" }}>
                        {discovered ? npc.name : "???"}
                      </span>
                      <span style={{
                        fontSize: 10, fontWeight: "bold",
                        color: discovered ? RARITY_C[npc.rarity] : "#444",
                        border: `1px solid ${discovered ? RARITY_C[npc.rarity] + "40" : "#222"}`,
                        padding: "1px 5px",
                      }}>
                        {discovered ? RARITY_L[npc.rarity] : "???"}
                      </span>
                      {discovered && npcKills > 0 && (
                        <span style={{ fontSize: 10, color: "#aaa" }}>☠ {npcKills}</span>
                      )}
                    </div>
                    {discovered && (
                      <div style={{ fontSize: 10, color: "#666", marginTop: 1 }}>
                        HP: {npc.hp}
                        {npc.resist && <> | <Icon name={npc.resist === "fire" ? "fire" : "ice"} size={10} /></>}
                        {npc.loot && <> | {formatLootText(npc.loot)}</>}
                      </div>
                    )}
                    {/* Kill tiers progress */}
                    {discovered && (
                      <div style={{ marginTop: 5, display: "flex", alignItems: "center", gap: 4 }}>
                        {tiers.map((t, i) => {
                          const done = npcKills >= t;
                          return (
                            <div key={t} title={`${t} zabić → +${(i+1)*10}% DMG`} style={{
                              display: "flex", alignItems: "center", gap: 2,
                              padding: "1px 5px", fontSize: 10, fontWeight: "bold",
                              border: `1px solid ${done ? "#40a030" : "#2a2a2a"}`,
                              background: done ? "rgba(64,160,48,0.15)" : "rgba(0,0,0,0.2)",
                              color: done ? "#60c040" : "#444",
                            }}>
                              {done ? "✓" : t}
                            </div>
                          );
                        })}
                        {killBonusPct > 0 && (
                          <span style={{ fontSize: 10, color: "#60c040", fontWeight: "bold", marginLeft: 2 }}>
                            +{killBonusPct}% DMG
                          </span>
                        )}
                        {nextTier && npcKills > 0 && (
                          <div style={{ flex: 1, marginLeft: 2 }}>
                            <div style={{ height: 3, background: "#1a1a1a", borderRadius: 2, overflow: "hidden" }}>
                              <div style={{
                                height: "100%", borderRadius: 2,
                                background: "#40a030",
                                width: `${Math.min(100, (npcKills / nextTier) * 100)}%`,
                                transition: "width 0.3s ease",
                              }} />
                            </div>
                            <div style={{ fontSize: 9, color: "#555", marginTop: 1 }}>{npcKills}/{nextTier}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </SidePanel>

      {/* CREW PANEL */}
      <SidePanel open={panel === "crew"} side="right" width={460} onClose={() => setPanel(null)} title="Załoga" isMobile={isMobile}>
        <div style={{ fontSize: 12, color: "#aaa", marginBottom: 10 }}>
          Zarządzaj członkami załogi. Każdy daje pasywne bonusy.
        </div>
        {crew.length === 0 && (
          <div style={{ color: "#666", fontSize: 13, padding: 16, textAlign: "center" }}>
            Brak członków załogi. Szukaj ich podczas podróży!
          </div>
        )}
        {crew.map(member => {
          const role = CREW_ROLES.find(r => r.id === member.role);
          if (!role) return null;
          const loyaltyLvl = getLoyaltyLevel(member.loyalty);
          const skill = role.skills[Math.min(member.skillLevel, role.skills.length - 1)];
          const canUpgrade = member.skillLevel < role.skills.length - 1;
          const upgradeCost = (member.skillLevel + 1) * 3;
          return (
            <div key={member.id} style={{ padding: "8px 10px", marginBottom: 8, border: `1px solid ${loyaltyLvl.color}33`, background: "rgba(255,255,255,0.02)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <Icon name={role.icon} size={20} />
                <span style={{ fontWeight: "bold", fontSize: 14, color: "#d8c8a8" }}>{role.name}</span>
                <span style={{ fontSize: 11, color: loyaltyLvl.color, marginLeft: "auto" }}>{loyaltyLvl.label} ({member.loyalty})</span>
              </div>
              <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>{role.desc}</div>
              <div style={{ fontSize: 11, color: "#40c040", marginBottom: 4 }}>
                Umiejętność (Poz. {member.skillLevel + 1}): {skill.name} — {skill.desc}
              </div>
              <div style={{ width: "100%", height: 4, background: "#1a1a2a", borderRadius: 2 }}>
                <div style={{ width: `${member.loyalty}%`, height: "100%", background: loyaltyLvl.color, borderRadius: 2 }} />
              </div>
              {canUpgrade && (
                <button onClick={() => {
                  if (totalCopper(money) < upgradeCost * 100) { showMessage("Za mało pieniędzy!", "#cc4040"); return; }
                  setMoney(prev => copperToMoney(totalCopper(prev) - upgradeCost * 100));
                  setCrew(prev => prev.map(m => m.id === member.id ? { ...m, skillLevel: m.skillLevel + 1 } : m));
                  showMessage(`${role.name} awansował!`, "#40e060");
                }} style={{ marginTop: 4, background: "none", border: "1px solid #4060cc", color: "#60a0ff", fontSize: 11, padding: "2px 8px", cursor: "pointer" }}>
                  Ulepsz ({upgradeCost} Ag)
                </button>
              )}
            </div>
          );
        })}
        {/* Available recruits */}
        {CREW_ROLES.filter(r => !crew.find(m => m.role === r.id)).length > 0 && (
          <div style={{ marginTop: 12, borderTop: "1px solid #2a2018", paddingTop: 8 }}>
            <div style={{ fontSize: 13, fontWeight: "bold", color: "#d4a030", marginBottom: 6 }}>Rekrutuj nowego członka:</div>
            {CREW_ROLES.filter(r => !crew.find(m => m.role === r.id)).map(role => {
              const canAfford = totalCopper(money) >= totalCopper(role.cost);
              return (
                <div key={role.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 6px", marginBottom: 4, border: "1px solid #1a1a2a" }}>
                  <Icon name={role.icon} size={18} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "bold", fontSize: 12, color: "#aaa" }}>{role.name}</div>
                    <div style={{ fontSize: 10, color: "#666" }}>{role.passive.desc}</div>
                  </div>
                  <button onClick={() => {
                    if (!canAfford) { showMessage("Za mało pieniędzy!", "#cc4040"); return; }
                    setMoney(prev => copperToMoney(totalCopper(prev) - totalCopper(role.cost)));
                    addCrewMember(role.id);
                  }} disabled={!canAfford} style={{ background: "none", border: `1px solid ${canAfford ? "#4060cc" : "#333"}`, color: canAfford ? "#60a0ff" : "#555", fontSize: 11, padding: "2px 8px", cursor: canAfford ? "pointer" : "not-allowed" }}>
                    {role.cost.silver || 0} Ag
                  </button>
                </div>
              );
            })}
          </div>
        )}
        {/* Crew relations */}
        {crew.length >= 2 && (
          <div style={{ marginTop: 12, borderTop: "1px solid #2a2018", paddingTop: 8 }}>
            <div style={{ fontSize: 13, fontWeight: "bold", color: "#d4a030", marginBottom: 6 }}>Relacje:</div>
            {CREW_RELATIONS.filter(rel => crew.find(m => m.role === rel.pair[0]) && crew.find(m => m.role === rel.pair[1])).map(rel => (
              <div key={rel.name} style={{ fontSize: 11, padding: "3px 6px", marginBottom: 2, color: rel.type === "synergy" ? "#40c040" : "#cc6040", border: `1px solid ${rel.type === "synergy" ? "#2a4a2a" : "#4a2a2a"}` }}>
                {rel.type === "synergy" ? "+" : "-"} {rel.name}: {rel.desc}
              </div>
            ))}
          </div>
        )}
      </SidePanel>

      {/* FACTIONS PANEL */}
      <SidePanel open={panel === "factions"} side="left" width={460} onClose={() => setPanel(null)} title="Frakcje" isMobile={isMobile}>
        {FACTIONS.map(faction => {
          const rep = factionRep[faction.id] || 0;
          const hostility = getFactionHostility(faction.id, rep);
          const bonus = getFactionBonus(faction.id, rep);
          return (
            <div key={faction.id} style={{ padding: "10px", marginBottom: 10, border: `1px solid ${faction.color}44`, background: faction.bgColor }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <Icon name={faction.icon} size={20} />
                <span style={{ fontWeight: "bold", fontSize: 14, color: faction.color }}>{faction.name}</span>
                <span style={{ fontSize: 11, color: hostility === "hostile" ? "#cc3030" : hostility === "friendly" ? "#40c040" : "#888", marginLeft: "auto" }}>
                  {hostility === "hostile" ? "Wrogi" : hostility === "unfriendly" ? "Nieufny" : hostility === "neutral" ? "Neutralny" : "Przyjazny"} ({rep})
                </span>
              </div>
              <div style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>{faction.desc}</div>
              <div style={{ width: "100%", height: 4, background: "#1a1a2a", borderRadius: 2, marginBottom: 6 }}>
                <div style={{ width: `${Math.max(0, Math.min(100, rep))}%`, height: "100%", background: faction.color, borderRadius: 2 }} />
              </div>
              {bonus && (
                <div style={{ fontSize: 11, color: "#40c040", padding: "3px 6px", border: "1px solid #2a4a2a" }}>
                  Aktywny bonus: {bonus.desc}
                </div>
              )}
              {faction.bonuses.map((b, i) => (
                <div key={i} style={{ fontSize: 10, color: rep >= b.minRep ? "#40c040" : "#555", padding: "1px 6px" }}>
                  {rep >= b.minRep ? "✓" : "○"} {b.minRep} rep: {b.desc}
                </div>
              ))}
              {hostility !== "hostile" && (
                <button onClick={() => {
                  if (totalCopper(money) < 100) { showMessage("Za mało pieniędzy!", "#cc4040"); return; }
                  setMoney(prev => copperToMoney(totalCopper(prev) - 100));
                  changeFactionRep(faction.id, 5);
                }} style={{ marginTop: 4, background: "none", border: "1px solid #4060cc", color: "#60a0ff", fontSize: 10, padding: "2px 6px", cursor: "pointer" }}>
                  Dotacja (1 Ag → +5 rep)
                </button>
              )}
            </div>
          );
        })}
      </SidePanel>

      {/* JOURNAL / DISCOVERY PANEL */}
      <SidePanel open={panel === "journal"} side="right" width={460} onClose={() => setPanel(null)} title="Dziennik Podróży" isMobile={isMobile}>
        <div style={{ fontSize: 12, color: "#e0c040", marginBottom: 8 }}>
          <Icon name="compass" size={14} /> Odkrycia: {totalDiscoveries} | Milestone: {getDiscoveryMilestone(totalDiscoveries)?.name || "—"}
        </div>
        {/* Artifact sets */}
        <div style={{ marginBottom: 12, borderBottom: "1px solid #2a2018", paddingBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: "bold", color: "#d4a030", marginBottom: 6 }}>Kolekcja Artefaktów</div>
          {ARTIFACT_SETS.map(set => {
            const owned = set.pieces.filter(p => ownedArtifacts.includes(p.id));
            const complete = owned.length === set.pieces.length;
            return (
              <div key={set.id} style={{ padding: "6px 8px", marginBottom: 6, border: `1px solid ${complete ? set.color : "#1a1a2a"}44`, background: complete ? `${set.color}11` : "transparent" }}>
                <div style={{ fontWeight: "bold", fontSize: 12, color: set.color }}><Icon name={set.icon} size={14} /> {set.name} ({owned.length}/{set.pieces.length})</div>
                <div style={{ fontSize: 10, color: "#666", marginBottom: 4 }}>{set.desc}</div>
                {set.pieces.map(p => (
                  <div key={p.id} style={{ fontSize: 10, color: ownedArtifacts.includes(p.id) ? "#40c040" : "#555", padding: "1px 4px" }}>
                    {ownedArtifacts.includes(p.id) ? "✓" : "○"} <Icon name={p.icon} size={10} /> {p.name}
                    {ownedArtifacts.includes(p.id) && <span style={{ color: "#888", fontSize: 9, marginLeft: 6 }}>— {p.lore.slice(0, 60)}...</span>}
                  </div>
                ))}
                {complete && <div style={{ fontSize: 10, color: "#40c040", fontWeight: "bold", marginTop: 2 }}>KOMPLET: {set.setBonus.desc}</div>}
              </div>
            );
          })}
        </div>
        {/* Journal categories */}
        {JOURNAL_CATEGORIES.map(cat => (
          <div key={cat.id} style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: "bold", color: "#d4a030" }}>
              <Icon name={cat.icon} size={12} /> {cat.name}: {(journal[cat.id] || []).length}
            </div>
            {(journal[cat.id] || []).slice(0, 5).map((entry, i) => (
              <div key={i} style={{ fontSize: 10, color: "#888", padding: "1px 8px" }}>• {entry.name}</div>
            ))}
            {(journal[cat.id] || []).length > 5 && <div style={{ fontSize: 10, color: "#555", padding: "1px 8px" }}>...i {(journal[cat.id] || []).length - 5} więcej</div>}
          </div>
        ))}
        {/* Discovery milestones */}
        <div style={{ marginTop: 12, borderTop: "1px solid #2a2018", paddingTop: 8 }}>
          <div style={{ fontSize: 13, fontWeight: "bold", color: "#d4a030", marginBottom: 6 }}>Milestony Odkryć</div>
          {DISCOVERY_MILESTONES.map(m => (
            <div key={m.threshold} style={{ fontSize: 10, color: totalDiscoveries >= m.threshold ? "#40c040" : "#555", padding: "1px 6px" }}>
              {totalDiscoveries >= m.threshold ? "✓" : "○"} {m.threshold} odkryć: {m.name} — {m.desc}
            </div>
          ))}
        </div>
      </SidePanel>

      {/* SHIP / SAILING PANEL */}
      <SidePanel open={panel === "ship"} side="left" width={460} onClose={() => setPanel(null)} title="Statek" isMobile={isMobile}>
        <div style={{ fontSize: 12, color: "#aaa", marginBottom: 10 }}>
          Ulepszaj statek, by bezpieczniej podróżować między biomami.
        </div>
        {["hull", "sails", "cannons", "special"].map(category => (
          <div key={category} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: "bold", color: "#d4a030", marginBottom: 4, textTransform: "capitalize" }}>
              {category === "hull" ? "Kadłub" : category === "sails" ? "Żagle" : category === "cannons" ? "Działa" : "Specjalne"}
            </div>
            {SHIP_UPGRADES.filter(u => u.category === category).map(upg => {
              const owned = shipUpgrades.includes(upg.id);
              const reqMet = !upg.requires || shipUpgrades.includes(upg.requires);
              const canAfford = totalCopper(money) >= totalCopper(upg.cost);
              return (
                <div key={upg.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 6px", marginBottom: 4, border: `1px solid ${owned ? "#2a6a2a" : "#1a1a2a"}`, opacity: reqMet ? 1 : 0.4 }}>
                  <Icon name={upg.icon} size={18} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "bold", fontSize: 12, color: owned ? "#40c040" : "#aaa" }}>{upg.name}</div>
                    <div style={{ fontSize: 10, color: "#666" }}>{upg.desc}</div>
                  </div>
                  {owned ? (
                    <span style={{ color: "#40c040", fontSize: 11, fontWeight: "bold" }}>✓</span>
                  ) : reqMet ? (
                    <button onClick={() => {
                      if (!canAfford) { showMessage("Za mało pieniędzy!", "#cc4040"); return; }
                      setMoney(prev => copperToMoney(totalCopper(prev) - totalCopper(upg.cost)));
                      setShipUpgrades(prev => [...prev, upg.id]);
                      showMessage(`${upg.name} zainstalowane!`, "#40e060");
                    }} disabled={!canAfford} style={{ background: "none", border: `1px solid ${canAfford ? "#4060cc" : "#333"}`, color: canAfford ? "#60a0ff" : "#555", fontSize: 11, padding: "2px 8px", cursor: canAfford ? "pointer" : "not-allowed" }}>
                      {upg.cost.silver || 0} Ag
                    </button>
                  ) : (
                    <span style={{ fontSize: 10, color: "#555" }}>Wymaga: {SHIP_UPGRADES.find(u => u.id === upg.requires)?.name}</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
        {discoveredIslands.length > 0 && (
          <div style={{ marginTop: 12, borderTop: "1px solid #2a2018", paddingTop: 8 }}>
            <div style={{ fontSize: 13, fontWeight: "bold", color: "#d4a030", marginBottom: 6 }}>Odkryte Wyspy</div>
            {discoveredIslands.map((island, i) => (
              <div key={i} style={{ fontSize: 11, color: "#888", padding: "2px 6px" }}>
                <Icon name={island.icon} size={12} /> {island.name} — {island.desc}
              </div>
            ))}
          </div>
        )}
      </SidePanel>

      {/* FORTIFICATIONS PANEL */}
      <SidePanel open={panel === "fortifications"} side="right" width={460} onClose={() => setPanel(null)} title="Fortyfikacje" isMobile={isMobile}>
        <div style={{ fontSize: 12, color: "#aaa", marginBottom: 10 }}>
          Buduj zaawansowane pułapki i fortyfikacje. Wyższe tiery wymagają odblokowania.
        </div>
        {[1, 2, 3].map(tier => (
          <div key={tier} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: "bold", color: tier === 1 ? "#888" : tier === 2 ? "#40a8b8" : "#d4a030", marginBottom: 4 }}>
              Tier {tier} {tier === 1 ? "(Podstawowe)" : tier === 2 ? "(Zaawansowane)" : "(Mistrzowskie)"}
            </div>
            {FORTIFICATION_TREE.filter(f => f.tier === tier).map(fort => {
              const unlocked = unlockedFortifications.includes(fort.id);
              const reqMet = !fort.requires || unlockedFortifications.includes(fort.requires);
              const canAfford = totalCopper(money) >= totalCopper(fort.cost);
              return (
                <div key={fort.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", marginBottom: 4, border: `1px solid ${unlocked ? "#2a6a2a" : "#1a1a2a"}`, opacity: reqMet ? 1 : 0.4 }}>
                  <Icon name={fort.icon} size={18} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "bold", fontSize: 12, color: unlocked ? "#40c040" : "#aaa" }}>{fort.name}</div>
                    <div style={{ fontSize: 10, color: "#666" }}>{fort.desc}</div>
                    <div style={{ fontSize: 9, color: "#555" }}>Typ: {fort.type} | Max: {fort.maxCount}</div>
                  </div>
                  {unlocked ? (
                    <span style={{ color: "#40c040", fontSize: 11, fontWeight: "bold" }}>✓</span>
                  ) : reqMet ? (
                    <button onClick={() => {
                      if (!canAfford) { showMessage("Za mało pieniędzy!", "#cc4040"); return; }
                      setMoney(prev => copperToMoney(totalCopper(prev) - totalCopper(fort.cost)));
                      setUnlockedFortifications(prev => [...prev, fort.id]);
                      showMessage(`${fort.name} odblokowane!`, "#40e060");
                    }} disabled={!canAfford} style={{ background: "none", border: `1px solid ${canAfford ? "#4060cc" : "#333"}`, color: canAfford ? "#60a0ff" : "#555", fontSize: 11, padding: "2px 8px", cursor: canAfford ? "pointer" : "not-allowed" }}>
                      {fort.cost.silver ? `${fort.cost.silver} Ag` : `${fort.cost.copper} Cu`}
                    </button>
                  ) : (
                    <span style={{ fontSize: 10, color: "#555" }}>Wymaga: {FORTIFICATION_TREE.find(f => f.id === fort.requires)?.name}</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
        {/* Trap Combos info */}
        <div style={{ marginTop: 12, borderTop: "1px solid #2a2018", paddingTop: 8 }}>
          <div style={{ fontSize: 13, fontWeight: "bold", color: "#d4a030", marginBottom: 6 }}>Elementalne Kombo Pułapek</div>
          {TRAP_COMBOS.map((tc, i) => (
            <div key={i} style={{ fontSize: 10, color: "#888", padding: "2px 6px", marginBottom: 2 }}>
              <span style={{ color: "#e0c040" }}>{tc.name}</span>: {tc.desc}
            </div>
          ))}
        </div>
      </SidePanel>

      {/* STORY EVENT MODAL */}
      {storyEvent && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 1200, background: "#1a1210", border: "2px solid #d4a030", padding: 20, minWidth: 320, maxWidth: 400, animation: "eventAppear 0.3s ease" }}>
          <div style={{ fontWeight: "bold", fontSize: 16, color: "#d4a030", marginBottom: 8 }}>
            <Icon name={storyEvent.icon} size={18} /> {STORY_ARCS.find(a => a.id === storyEvent.arcId)?.name || "Przygoda"}
          </div>
          <div style={{ fontSize: 13, color: "#d8c8a8", marginBottom: 12 }}>{storyEvent.desc}</div>
          {storyEvent.choices ? (
            storyEvent.choices.map((choice, i) => (
              <button key={i} onClick={() => {
                if (choice.reward) {
                  if (choice.reward.copper) addMoneyFn({ copper: choice.reward.copper });
                  if (choice.reward.silver) addMoneyFn({ silver: choice.reward.silver });
                  if (choice.reward.gold) addMoneyFn({ gold: choice.reward.gold });
                  showMessage(choice.desc, "#40c040");
                }
                if (choice.penalty?.enemyBuff) setEnemyBuffRooms(prev => prev + choice.penalty.enemyBuff);
                setActiveStory(prev => prev ? { ...prev, currentStep: prev.currentStep + 1 } : null);
                setStoryEvent(null);
                addDiscovery("events", { id: `${storyEvent.arcId}_${storyEvent.stepIndex}`, name: storyEvent.desc.slice(0, 40) });
              }} style={{ display: "block", width: "100%", marginBottom: 6, padding: "8px 12px", background: "none", border: "1px solid #4060cc", color: "#60a0ff", fontSize: 12, cursor: "pointer", textAlign: "left" }}>
                <Icon name={choice.icon} size={14} /> <strong>{choice.label}</strong> — {choice.desc}
              </button>
            ))
          ) : (
            <button onClick={() => {
              if (storyEvent.reward) {
                if (storyEvent.reward.copper) addMoneyFn({ copper: storyEvent.reward.copper });
                if (storyEvent.reward.silver) addMoneyFn({ silver: storyEvent.reward.silver });
                if (storyEvent.reward.gold) addMoneyFn({ gold: storyEvent.reward.gold });
                if (storyEvent.reward.mana) setMana(prev => Math.min(prev + storyEvent.reward.mana, MAX_MANA));
                if (storyEvent.reward.dynamite) setAmmo(prev => ({ ...prev, dynamite: prev.dynamite + storyEvent.reward.dynamite }));
                if (storyEvent.reward.harpoon) setAmmo(prev => ({ ...prev, harpoon: prev.harpoon + storyEvent.reward.harpoon }));
              }
              setActiveStory(prev => {
                if (!prev) return null;
                const next = prev.currentStep + 1;
                const arc = STORY_ARCS.find(a => a.id === prev.id);
                if (arc && next >= arc.totalSteps) {
                  setCompletedStories(cs => [...cs, prev.id]);
                  showMessage(`Przygoda "${arc.name}" ukończona!`, arc.themeColor);
                  return null;
                }
                return { ...prev, currentStep: next };
              });
              setStoryEvent(null);
              addDiscovery("events", { id: `${storyEvent.arcId}_${storyEvent.stepIndex}`, name: storyEvent.desc.slice(0, 40) });
            }} style={{ padding: "8px 16px", background: "none", border: "1px solid #d4a030", color: "#d4a030", fontSize: 13, cursor: "pointer" }}>
              Kontynuuj
            </button>
          )}
        </div>
      )}

      {/* MORAL DILEMMA MODAL */}
      {moralDilemma && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 1200, background: "#1a1210", border: "2px solid #e0c040", padding: 20, minWidth: 320, maxWidth: 420, animation: "eventAppear 0.3s ease" }}>
          <div style={{ fontWeight: "bold", fontSize: 16, color: moralDilemma.themeColor, marginBottom: 8 }}>
            <Icon name={moralDilemma.icon} size={18} /> {moralDilemma.name}
          </div>
          <div style={{ fontSize: 13, color: "#d8c8a8", marginBottom: 12 }}>{moralDilemma.question}</div>
          {moralDilemma.choices.map((choice, i) => (
            <button key={i} onClick={() => {
              if (choice.reward) {
                if (choice.reward.copper) addMoneyFn({ copper: choice.reward.copper });
                if (choice.reward.silver) addMoneyFn({ silver: choice.reward.silver });
                if (choice.reward.shopDiscount) showMessage(`Zniżka w sklepie: ${choice.reward.shopDiscount * 100}%!`, "#40c040");
              }
              if (choice.penalty?.loyaltyLoss) updateCrewLoyalty(-choice.penalty.loyaltyLoss);
              if (choice.penalty?.shopPriceMult) showMessage("Kupcy podnoszą ceny...", "#cc6040");
              setMoralDilemma(null);
              addDiscovery("events", { id: moralDilemma.id, name: moralDilemma.name });
            }} style={{ display: "block", width: "100%", marginBottom: 6, padding: "8px 12px", background: "none", border: `1px solid ${moralDilemma.themeColor}88`, color: "#d8c8a8", fontSize: 12, cursor: "pointer", textAlign: "left" }}>
              <Icon name={choice.icon} size={14} /> <strong>{choice.label}</strong> — {choice.desc}
            </button>
          ))}
        </div>
      )}

      {/* SECRET ROOM MODAL */}
      {secretRoom && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 1200, background: "#1a1210", border: "2px solid #c0a0ff", padding: 20, minWidth: 320, maxWidth: 400, animation: "eventAppear 0.3s ease" }}>
          <div style={{ fontWeight: "bold", fontSize: 16, color: secretRoom.themeColor, marginBottom: 8 }}>
            <Icon name={secretRoom.icon} size={18} /> {secretRoom.name}
          </div>
          <div style={{ fontSize: 13, color: "#d8c8a8", marginBottom: 8 }}>{secretRoom.desc}</div>
          <div style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>{secretRoom.puzzle.desc}</div>
          {/* ─── Helper: apply secret room reward ─── */}
          {(() => {
            const applyReward = (reward) => {
              if (reward.permDmgBuff) {
                setSecretPermDmgBuff(prev => prev + reward.permDmgBuff);
                showMessage(`Permanentny bonus: +${Math.round(reward.permDmgBuff * 100)}% obrażeń!`, "#a050e0");
              }
              if ((reward.spellDmgBuff || reward.shadowDmgBuff) && reward.duration) {
                const mult = reward.spellDmgBuff || reward.shadowDmgBuff;
                setSecretSpellBuffMult(mult);
                setSecretSpellBuffRooms(reward.duration);
                showMessage(`+${Math.round(mult * 100)}% mocy na ${reward.duration} pokoi!`, "#a050e0");
              }
              if (reward.copper) addMoneyFn({ copper: reward.copper });
              if (reward.gold) addMoneyFn({ gold: reward.gold });
              if (reward.silver) addMoneyFn({ silver: reward.silver });
              if (reward.knowledge) setKnowledge(prev => prev + reward.knowledge);
              if (reward.initiative) setInitiative(prev => Math.min(MAX_INITIATIVE, prev + reward.initiative));
              if (reward.fullHeal) setCaravanHp(CARAVAN_LEVELS[caravanLevelRef.current].hp);
              if (reward.fullMana) setMana(MAX_MANA);
              if (reward.permMaxMana) showMessage(`+${reward.permMaxMana} max prochu permanentnie!`, "#4080ff");
              if (reward.ammo) {
                setAmmo(prev => {
                  const next = { ...prev };
                  for (const [k, v] of Object.entries(reward.ammo)) next[k] = (next[k] || 0) + v;
                  return next;
                });
                showMessage("Otrzymano amunicję!", "#d4a030");
              }
              if (reward.mercRevive || reward.tempMercs || reward.ghostMerc) {
                const count = reward.tempMercs || 1;
                for (let mi = 0; mi < count; mi++) {
                  const mt = MERCENARY_TYPES[Math.floor(Math.random() * MERCENARY_TYPES.length)];
                  setTimeout(() => spawnFreeMerc(mt, 1), 600 + mi * 300);
                }
                showMessage(count > 1 ? `${count} najemników dołącza!` : "Nowy najemnik dołącza!", "#40c040");
              }
              if (reward.randomRelic) {
                const owned = activeRelicsRef.current.map(r => r.id);
                const pool = RELICS.filter(r => !owned.includes(r.id));
                if (pool.length > 0) {
                  const relic = pool[Math.floor(Math.random() * pool.length)];
                  setActiveRelics(prev => [...prev, relic]);
                  showMessage(`Relikt: ${relic.name}!`, "#d4a030");
                }
              }
              if (reward.treasure) {
                const t = pickTreasure(room + 5);
                setInventory(prev => [...prev, t]);
                showMessage(`Skarb: ${t.name}!`, "#d4a030");
              }
              if (reward.artifact) {
                setOwnedArtifacts(prev => {
                  const allPieces = ARTIFACT_SETS.flatMap(s => s.pieces).filter(p => !prev.includes(p.id));
                  if (allPieces.length === 0) return prev;
                  const piece = allPieces[Math.floor(Math.random() * allPieces.length)];
                  addDiscovery("artifacts", { id: piece.id, name: piece.name });
                  showMessage(`Artefakt: ${piece.name}!`, "#d4a030");
                  return [...prev, piece.id];
                });
              }
            };

            const applyPenalty = (pen) => {
              if (!pen) return;
              if (pen.caravanDmg) setCaravanHp(prev => Math.max(1, prev - pen.caravanDmg));
              if (pen.manaLoss) setMana(prev => Math.max(0, prev - pen.manaLoss));
              if (pen.copperLoss) setMoney(prev => copperToMoney(Math.max(0, totalCopper(prev) - pen.copperLoss)));
              if (pen.mercDeath) showMessage("Najemnik zginął!", "#cc4040");
              if (pen.enemyBuff) setEnemyBuffRooms(prev => prev + pen.enemyBuff);
            };

            const canAffordTrade = (cost) => {
              if (cost.copper && totalCopper(money) < cost.copper) return false;
              if (cost.silver && totalCopper(money) < cost.silver * 100) return false;
              if (cost.gold && totalCopper(money) < cost.gold * 10000) return false;
              if (cost.mana && mana < cost.mana) return false;
              if (cost.caravanHp && caravanHp <= cost.caravanHp) return false;
              return true;
            };

            const applyTradeCost = (cost) => {
              if (cost.caravanHp) setCaravanHp(prev => Math.max(1, prev - cost.caravanHp));
              if (cost.mana) setMana(prev => Math.max(0, prev - cost.mana));
              if (cost.copper) setMoney(prev => copperToMoney(Math.max(0, totalCopper(prev) - cost.copper)));
              if (cost.silver) setMoney(prev => copperToMoney(Math.max(0, totalCopper(prev) - cost.silver * 100)));
              if (cost.gold) setMoney(prev => copperToMoney(Math.max(0, totalCopper(prev) - cost.gold * 10000)));
              if (cost.initLoss) setInitiative(prev => Math.max(0, prev - cost.initLoss));
              if (cost.mercSacrifice) {
                setWalkers(prev => {
                  const friendlies = prev.filter(w => w.friendly && w.alive);
                  if (friendlies.length === 0) return prev;
                  const victim = friendlies[Math.floor(Math.random() * friendlies.length)];
                  return prev.map(w => w.id === victim.id ? { ...w, alive: false, hp: 0 } : w);
                });
                showMessage("Najemnik poświęcony!", "#cc4040");
              }
            };

            const btnStyle = { display: "block", width: "100%", marginBottom: 6, padding: "12px 14px", minHeight: 44, background: "none", border: `1px solid ${secretRoom.themeColor}66`, color: secretRoom.themeColor, fontSize: 12, cursor: "pointer", textAlign: "left" };
            const btnDisabled = { ...btnStyle, opacity: 0.4, cursor: "not-allowed", color: "#666" };
            const pType = secretRoom.puzzle.type;

            // ─── Trade puzzle ───
            if (pType === "trade") return secretRoom.puzzle.trades.map((trade, i) => {
              const affordable = canAffordTrade(trade.cost);
              return <button key={i} disabled={!affordable} onClick={() => {
                if (!affordable) return;
                applyTradeCost(trade.cost);
                applyReward(trade.reward);
                setSecretRoom(null);
              }} style={affordable ? btnStyle : btnDisabled}>
                Ofiaruj {trade.offer} → {trade.rewardDesc}
              </button>;
            });

            // ─── Pact puzzle (Ghost Captain) ───
            if (pType === "pact") return secretRoom.puzzle.pacts.map((pact, i) => (
              <button key={i} onClick={() => {
                if (pact.cost.maxHpReduction) {
                  setCaravanHp(prev => Math.max(1, prev - pact.cost.maxHpReduction));
                  showMessage(`-${pact.cost.maxHpReduction} max HP karawany`, "#cc4040");
                }
                if (pact.cost.mercSacrifice) applyTradeCost({ mercSacrifice: pact.cost.mercSacrifice });
                applyReward(pact.reward);
                setSecretRoom(null);
              }} style={btnStyle}>
                {pact.name}: {pact.rewardDesc}
              </button>
            ));

            // ─── Choose puzzle (Ancient Armory) ───
            if (pType === "choose") return secretRoom.puzzle.choices.map((choice, i) => (
              <button key={i} onClick={() => {
                applyReward(choice.reward);
                showMessage(`Wybrano: ${choice.name}!`, secretRoom.themeColor);
                setSecretRoom(null);
              }} style={btnStyle}>
                <Icon name={choice.icon} size={14} /> {choice.name} — {choice.desc}
              </button>
            ));

            // ─── Gamble puzzle (Time Rift) ───
            if (pType === "gamble") return secretRoom.puzzle.options.map((opt, i) => (
              <button key={i} onClick={() => {
                const won = Math.random() < opt.chance;
                if (won) {
                  applyReward(opt.success);
                  showMessage(opt.successDesc, "#40c040");
                } else {
                  applyPenalty(opt.fail);
                  showMessage(opt.failDesc, "#cc4040");
                }
                setSecretRoom(null);
              }} style={btnStyle}>
                {opt.name} (szansa: {Math.round(opt.chance * 100)}%)
              </button>
            ));

            // ─── Risk puzzle (Cursed Throne) ───
            if (pType === "risk") return secretRoom.puzzle.tiers.map((tier, i) => (
              <button key={i} onClick={() => {
                const failed = Math.random() < tier.risk;
                if (!failed) {
                  applyReward(tier.reward);
                  showMessage(tier.rewardDesc, "#40c040");
                } else {
                  applyPenalty(tier.penalty);
                  showMessage(tier.penaltyDesc, "#cc4040");
                }
                setSecretRoom(null);
              }} style={btnStyle}>
                {tier.name} (ryzyko: {Math.round(tier.risk * 100)}%) → {tier.rewardDesc}
              </button>
            ));

            // ─── Default: difficulty-based puzzle (sequence, riddle, timing, multi_key) ───
            return <button onClick={() => {
              const success = Math.random() < (1 / secretRoom.puzzle.difficulty);
              if (success) {
                applyReward(secretRoom.puzzle.reward);
                showMessage("Zagadka rozwiązana!", "#40c040");
              } else {
                applyPenalty(secretRoom.puzzle.failPenalty);
                showMessage("Nie udało się...", "#cc4040");
              }
              setSecretRoom(null);
            }} style={{ padding: "12px 16px", minHeight: 44, background: "none", border: `1px solid ${secretRoom.themeColor}`, color: secretRoom.themeColor, fontSize: 13, cursor: "pointer" }}>
              Spróbuj rozwiązać! (szansa: {Math.round(100 / secretRoom.puzzle.difficulty)}%)
            </button>;
          })()}
          <button onClick={() => setSecretRoom(null)} style={{ marginTop: 8, padding: "10px 14px", minHeight: 44, background: "none", border: "1px solid #555", color: "#888", fontSize: 11, cursor: "pointer" }}>
            Odejdź
          </button>
        </div>
      )}

      {/* WORLD MAP — full ship navigation overlay */}
      {worldMap && (
        <WorldMap
          onDock={handleWorldMapDock}
          shipPos={shipMapPos}
          isMobile={isMobile}
          roomNumber={room}
        />
      )}

      {/* RIVER MAP — choose route before sailing */}
      {riverMapOpen && (
        <RiverMap
          roomNumber={room}
          onConfirm={handleRiverMapConfirm}
          onCancel={handleRiverMapCancel}
          onSkip={handleRiverSkip}
          isMobile={isMobile}
          shipUpgrades={shipUpgrades}
        />
      )}

      {/* RIVER SHIP SEGMENT — mini-game overlay (fixed, above all UI including Caravan zIndex:9000) */}
      {riverSegment && (
        <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "#000" }}>
          <RiverShipSegment
            roomNumber={room}
            onComplete={handleRiverComplete}
            isMobile={isMobile}
            shipUpgrades={shipUpgrades}
            destBiome={riverSegment.destBiome}
            riverPath={riverPath}
          />
        </div>
      )}

      {/* SEA EVENT MODAL */}
      {seaEvent && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 1200, background: "#0a1020", border: "2px solid #4080c0", padding: 20, minWidth: 320, maxWidth: 420, animation: "eventAppear 0.3s ease" }}>
          <div style={{ fontWeight: "bold", fontSize: 16, color: seaEvent.themeColor, marginBottom: 8 }}>
            <Icon name={seaEvent.icon} size={18} /> {seaEvent.name}
          </div>
          <div style={{ fontSize: 13, color: "#d8c8a8", marginBottom: 12 }}>{seaEvent.desc}</div>
          {seaEvent.choices ? (
            seaEvent.choices.map((choice, i) => (
              <button key={i} onClick={() => {
                if (choice.reward?.copper) addMoneyFn({ copper: choice.reward.copper });
                if (choice.reward?.silver) addMoneyFn({ silver: choice.reward.silver });
                if (choice.penalty?.caravanDmg) setCaravanHp(prev => Math.max(1, prev - choice.penalty.caravanDmg));
                if (choice.reward?.gamble) {
                  if (Math.random() < 0.5) {
                    addMoneyFn({ gold: 1, silver: 5 });
                    showMessage("Legendarne skarby znalezione!", "#d4a030");
                  } else {
                    setCaravanHp(prev => Math.max(1, prev - 30));
                    showMessage("Pułapka! Statek uszkodzony!", "#cc4040");
                  }
                }
                if (choice.risk?.caravanDmg && choice.reward?.legendaryTreasure) {
                  setCaravanHp(prev => Math.max(1, prev - choice.risk.caravanDmg));
                  addMoneyFn({ gold: 3 });
                  showMessage("Pokonałeś morskie bestie! Legendarny łup!", "#d4a030");
                }
                setSeaEvent(null);
                // Resume travel after sea event — use pending biome from world map
                setTimeout(() => { try { enterRoom(room + 1, ownedTools, pendingDestBiomeRef.current); pendingDestBiomeRef.current = null; } catch (e) { console.error("enterRoom failed:", e); } setTimeout(() => setTransitioning(false), 150); }, 300);
              }} style={{ display: "block", width: "100%", marginBottom: 6, padding: "8px 12px", background: "none", border: `1px solid ${seaEvent.themeColor}88`, color: "#d8c8a8", fontSize: 12, cursor: "pointer", textAlign: "left" }}>
                <Icon name={choice.icon} size={14} /> <strong>{choice.label}</strong> — {choice.desc}
              </button>
            ))
          ) : (
            <button onClick={() => {
              const eff = seaEvent.effect;
              if (eff.type === "heal") setCaravanHp(prev => Math.min(CARAVAN_LEVELS[caravanLevelRef.current].hp, prev + eff.value));
              if (eff.type === "damage") {
                const dmg = seaEvent.dodgeable ? Math.round(eff.value * seaEvent.dodgeReduction) : eff.value;
                setCaravanHp(prev => Math.max(1, prev - dmg));
              }
              if (eff.type === "loot") {
                const lootAmt = 40 + Math.floor(Math.random() * 40);
                const ghostBonus = hasRelic("ghost_lantern") ? 2 : 1;
                addMoneyFn({ copper: lootAmt * ghostBonus });
              }
              if (eff.type === "buff") {
                if (eff.manaRestore) setMana(prev => Math.min(prev + eff.manaRestore, MAX_MANA));
                if (eff.initiativeBoost) setInitiative(prev => Math.min(MAX_INITIATIVE, prev + eff.initiativeBoost));
              }
              showMessage(seaEvent.resultText, seaEvent.themeColor);
              setSeaEvent(null);
              // Resume travel after sea event — use pending biome from world map
              setTimeout(() => { try { enterRoom(room + 1, ownedTools, pendingDestBiomeRef.current); pendingDestBiomeRef.current = null; } catch (e) { console.error("enterRoom failed:", e); } setTimeout(() => setTransitioning(false), 150); }, 300);
            }} style={{ padding: "8px 16px", background: "none", border: `1px solid ${seaEvent.themeColor}`, color: seaEvent.themeColor, fontSize: 13, cursor: "pointer" }}>
              Kontynuuj Rejs
            </button>
          )}
        </div>
      )}

      {/* FACTION EVENT MODAL */}
      {factionEvent && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 1200, background: "#1a1210", border: `2px solid ${factionEvent.factionColor}`, padding: 20, minWidth: 300, maxWidth: 380, animation: "eventAppear 0.3s ease" }}>
          <div style={{ fontWeight: "bold", fontSize: 16, color: factionEvent.factionColor, marginBottom: 8 }}>
            <Icon name={factionEvent.factionIcon} size={18} /> {factionEvent.factionName}
          </div>
          <div style={{ fontSize: 13, color: "#d8c8a8", marginBottom: 12 }}>
            {factionEvent.type === "trade"
              ? `Handlarz z ${factionEvent.factionName} oferuje swoje towary.`
              : `${factionEvent.factionName} potrzebuje twojej pomocy.`
            }
          </div>
          <button onClick={() => {
            changeFactionRep(factionEvent.factionId, factionEvent.type === "trade" ? 3 : 10);
            if (factionEvent.type === "trade") addMoneyFn({ copper: 20 });
            setFactionEvent(null);
            addDiscovery("factions", { id: factionEvent.factionId, name: factionEvent.factionName });
          }} style={{ padding: "8px 16px", background: "none", border: `1px solid ${factionEvent.factionColor}`, color: factionEvent.factionColor, fontSize: 13, cursor: "pointer", marginRight: 8 }}>
            {factionEvent.type === "trade" ? "Handluj" : "Pomóż"}
          </button>
          <button onClick={() => setFactionEvent(null)} style={{ padding: "8px 16px", background: "none", border: "1px solid #555", color: "#888", fontSize: 13, cursor: "pointer" }}>
            Ignoruj
          </button>
        </div>
      )}

      <style>{`
        @keyframes lockP{0%,100%{opacity:1;transform:translateX(-50%) scale(1)}50%{opacity:.6;transform:translateX(-50%) scale(1.1)}}
        @keyframes keyF{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes chestG{0%,100%{filter:drop-shadow(0 0 5px rgba(140,110,50,0.3))}50%{filter:drop-shadow(0 0 12px rgba(160,128,60,0.5))}}
        @keyframes chestHint{0%,100%{opacity:0.6;transform:translateX(-50%) translateY(0)}50%{opacity:1;transform:translateX(-50%) translateY(-4px)}}
        @keyframes resNode{0%,100%{transform:scale(1) translateY(0)}50%{transform:scale(1.08) translateY(-4px)}}
        @keyframes waterFlow{0%{background-position:0 0}100%{background-position:0 20px}}
        @keyframes npcDie{0%{transform:scale(1) rotate(0);opacity:1;filter:drop-shadow(0 0 8px rgba(200,60,60,0.5))}
          30%{transform:scale(1.2) rotate(10deg);opacity:0.8;filter:drop-shadow(0 0 20px rgba(255,80,20,0.8))}
          100%{transform:scale(0) rotate(360deg) translateY(-30px);opacity:0;filter:drop-shadow(0 0 0 transparent)}}
        @keyframes dmgFloat{0%{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}
          30%{opacity:1;transform:translateX(-50%) translateY(-20px) scale(1.3)}
          100%{opacity:0;transform:translateX(-50%) translateY(-60px) scale(0.8)}}
        @keyframes doorGlow{0%,100%{text-shadow:1px 1px 0 #000,0 0 6px rgba(212,160,48,0.3)}50%{text-shadow:1px 1px 0 #000,0 0 16px rgba(212,160,48,0.8)}}
        @keyframes secretPulse{0%,100%{transform:translate(-50%,-100%) scale(1);filter:drop-shadow(0 0 6px rgba(255,215,0,0.4))}50%{transform:translate(-50%,-100%) scale(1.12);filter:drop-shadow(0 0 14px rgba(255,215,0,0.9))}}
        @keyframes mineShake{0%{transform:translate(-1px,-1px) rotate(-1deg)}100%{transform:translate(1px,1px) rotate(1deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes meteorPulse{0%,100%{transform:scale(1);filter:drop-shadow(0 0 14px rgba(255,100,20,0.7))}50%{transform:scale(1.15);filter:drop-shadow(0 0 24px rgba(255,60,0,0.9))}}
        @keyframes meteorFall{0%{transform:translateY(-72px) rotate(-30deg);opacity:0}10%{opacity:1}100%{transform:translateY(var(--meteor-land-y)) rotate(15deg);opacity:1}}
        @keyframes screenShake{0%{transform:translate(-1px,-0.5px)}25%{transform:translate(1px,0.5px)}50%{transform:translate(-0.5px,1px)}75%{transform:translate(0.5px,-1px)}100%{transform:translate(-0.5px,0.5px)}}
        @keyframes meteorFlash{0%{opacity:1}100%{opacity:0}}
        @keyframes slashFlash{0%{opacity:1}60%{opacity:0.8}100%{opacity:0}}
        @keyframes slashSwipeL{0%{opacity:0;transform:translateX(-100%) rotate(25deg)}20%{opacity:1}100%{opacity:0;transform:translateX(20%) rotate(25deg)}}
        @keyframes slashSwipeR{0%{opacity:0;transform:translateX(100%) rotate(-25deg)}20%{opacity:1}100%{opacity:0;transform:translateX(-20%) rotate(-25deg)}}
        @keyframes slashDmgFloat{0%{opacity:0;transform:translate(-50%,-50%) scale(2)}15%{opacity:1;transform:translate(-50%,-50%) scale(1.2)}50%{opacity:1;transform:translate(-50%,-60%) scale(1)}100%{opacity:0;transform:translate(-50%,-80%) scale(0.8)}}
        @keyframes cardLogSlide{0%{opacity:0;transform:translateX(40px)}100%{opacity:1;transform:translateX(0)}}
        @keyframes saberShimmerRare{0%{background-position:200% 50%}100%{background-position:-200% 50%}}
        @keyframes saberShimmerEpic{0%{background-position:200% 50%;filter:brightness(1)}50%{filter:brightness(1.15)}100%{background-position:-200% 50%;filter:brightness(1)}}
        @keyframes saberShimmerLegendary{0%{background-position:200% 50%;filter:brightness(1) drop-shadow(0 0 3px rgba(255,215,0,0.4))}25%{filter:brightness(1.2) drop-shadow(0 0 8px rgba(255,215,0,0.7))}50%{background-position:0% 50%;filter:brightness(1.1) drop-shadow(0 0 5px rgba(255,215,0,0.5))}100%{background-position:-200% 50%;filter:brightness(1) drop-shadow(0 0 3px rgba(255,215,0,0.4))}}
        @keyframes saberSparkle{0%,100%{opacity:0;transform:scale(0)}50%{opacity:1;transform:scale(1)}}
        @keyframes eventAppear{0%{opacity:0;transform:scale(0.85) translateY(20px)}100%{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes comboFlash{0%{opacity:0.5}100%{opacity:0}}
        @keyframes comboAppear{0%{opacity:0;transform:translateX(-50%) scale(0.7) translateY(20px)}40%{opacity:1;transform:translateX(-50%) scale(1.05) translateY(0)}100%{opacity:1;transform:translateX(-50%) scale(1) translateY(0)}}
        @keyframes xpFill{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes streakPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}
        @keyframes bossWarningPulse{0%,100%{opacity:0.6;transform:translateX(-50%) scale(1)}50%{opacity:1;transform:translateX(-50%) scale(1.05)}}
        @keyframes slowMoFlash{0%{filter:saturate(1.5) brightness(1.2)}50%{filter:saturate(0.7) brightness(0.9)}100%{filter:saturate(1) brightness(1)}}
      `}</style>
    </div>
  );
}

function formatLootText(loot) {
  if (!loot) return "";
  const parts = [];
  if (loot.gold) parts.push(`${loot.gold} Au`);
  if (loot.silver) parts.push(`${loot.silver} Ag`);
  if (loot.copper) parts.push(`${loot.copper} Cu`);
  return parts.join(", ");
}
