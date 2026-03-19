import { useState, useRef, useEffect, useCallback } from "react";
import { wrapPctToScreen as _wrapPct } from "./utils/panoramaWrap.js";
import { BIOMES } from "./data/biomes";
import { RARITY_C, RARITY_L } from "./data/treasures";
import { rollCardDrop, ALL_NPCS, BIOME_NAMES } from "./data/bestiary";
import { HIDEOUT_LEVELS, HIDEOUT_UPGRADES } from "./data/hideout";
import { CARAVAN_LEVELS } from "./data/caravanLevels";
import { KNIGHT_LEVELS } from "./data/knightLevels";
import { MERCENARY_TYPES } from "./data/mercenaries";
import { SHOP_TOOLS, MANA_POTIONS, AMMO_ITEMS, pickResource, MINE_TIMES } from "./data/shopItems";
import { pickNpc, SPELLS, RESIST_NAMES } from "./data/npcs";
import { SKILLSHOT_TYPES, ACCURACY_COMBO_THRESHOLD, ACCURACY_COMBO_BONUS, HEADSHOT_BONUS, DEFENSE_TRAPS, MAX_PLAYER_TRAPS } from "./data/skillshots";
import { totalCopper, copperToMoney, pickTreasure, formatValHTML } from "./utils/helpers";
import { rollRandomEvent } from "./data/randomEvents";
import { rollWeather, applyWeatherDamage } from "./data/weather";
import { OBSTACLE_DEFS, OBSTACLE_MATERIALS, WEAKNESS_MULT, RESIST_MULT as OBS_RESIST_MULT } from "./data/obstacles";
import { renderBiome } from "./renderers/biomeRenderers";
import { renderVault } from "./renderers/vaultRenderer";
import { BiomeAnimator } from "./renderers/biomeAnimator";
import { PhysicsWorld } from "./physics/RapierPhysicsWorld";
import { initRapier } from "./physics/rapierInit";
import { PixiRenderer } from "./rendering/PixiRenderer";
import { depthFromY, scaleAtDepth, zIndexAtDepth } from "./rendering/DepthSystem";
import { findChainTargets, getChainDamage, getChainDelay } from "./systems/ChainReactions";
import { getLeakParticles, getDamageVisuals } from "./systems/ProgressiveDamage";
import {
  startMusic, toggleMusic, changeBiomeMusic, setMusicCombatIntensity, startRiverAmbience, stopRiverAmbience, sfxDoor, sfxChest, sfxSell,
  sfxStore, sfxRetrieve, sfxUpgrade, sfxGather, sfxBuy,
  sfxFireball, sfxLightning, sfxIceLance, sfxShadowBolt, sfxHolyBeam,
  sfxNpcDeath, sfxDrinkMana, sfxSummon, sfxRecruit, sfxMeleeHit, sfxSaberSwipe, sfxSaberHit, sfxMeteorFall, sfxMeteorImpact,
  sfxEventAppear, sfxMerchant, sfxAmbush, sfxAltar, sfxEventSuccess, sfxEventFail,
  sfxWaveHorn, sfxWaveComplete, sfxVictoryFanfare, sfxWeather, sfxCaravanHit,
} from "./audio/soundEngine";
import TopBar from "./components/TopBar";
import SidePanel from "./components/SidePanel";
import ItemSlot from "./components/ItemSlot";
import ItemDetail from "./components/ItemDetail";
import LootPopup from "./components/LootPopup";
import SpellBar from "./components/SpellBar";
import Caravan from "./components/Caravan";
import EventModal from "./components/EventModal";
import WaveOverlay, { PowerSpikeWarning } from "./components/WaveOverlay";
import WeatherOverlay from "./components/WeatherOverlay";
import Chest, { CLICKS_TO_OPEN } from "./components/Chest";
import RelicPicker from "./components/RelicPicker";
import SlotMachine from "./components/SlotMachine";
import { RELICS, RELIC_SYNERGIES } from "./data/relics";
import { getBossForRoom } from "./data/bosses";
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
import { FORTIFICATION_TREE, TRAP_COMBOS } from "./data/advancedTraps";
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
  holybeam: sfxHolyBeam,
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
  const [chestClicks, setChestClicks] = useState(0);
  const [panel, setPanel] = useState(null);
  const [selectedInv, setSelectedInv] = useState(-1);
  const [loot, setLoot] = useState(null);
  const [msg, setMsg] = useState(null);
  const [transitioning, setTransitioning] = useState(false);
  const [musicOn, setMusicOn] = useState(true);

  // Tools & resources
  const [ownedTools, setOwnedTools] = useState([]);
  const [resourceNode, setResourceNode] = useState(null);
  const [showResource, setShowResource] = useState(false);
  const [isNight, setIsNight] = useState(false);
  const [weather, setWeather] = useState(null);
  const weatherRef = useRef(null);
  weatherRef.current = weather;
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
  const nuggetRef = useRef({ active: false, intervalId: null });
  // Destructible obstacles per room
  const [obstacles, setObstacles] = useState([]);        // [{id, type, x, y, biomeId, hp, maxHp, destructible, material, hitAnim, destroying}]
  const obstaclesRef = useRef(obstacles);
  obstaclesRef.current = obstacles;

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
  const walkRafRef = useRef(null);
  const summonAttackRef = useRef(null);
  const enemyAttackFriendlyRef = useRef(null);
  const enemyAbilityRef = useRef(null);
  const attackCaravanRef = useRef(null);

  // Caravan HP system
  const [caravanLevel, setCaravanLevel] = useState(0);
  const [caravanHp, setCaravanHp] = useState(CARAVAN_LEVELS[0].hp);
  const caravanHpRef = useRef(CARAVAN_LEVELS[0].hp);
  caravanHpRef.current = caravanHp;
  const caravanLevelRef = useRef(0);
  caravanLevelRef.current = caravanLevel;

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
  const [selectedSpell, setSelectedSpell] = useState(null);
  const [dragHighlight, setDragHighlight] = useState(null);

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
  // Ground loot dropped by destroyed meteor — clickable items
  const [groundLoot, setGroundLoot] = useState([]);
  // Track meteor wave spawn thresholds: { walkerId, nextThreshold, waveCount }
  const meteorWaveRef = useRef(null);
  const [screenShake, setScreenShake] = useState(false);
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
  const [activeRelics, setActiveRelics] = useState([]);
  const activeRelicsRef = useRef([]);
  activeRelicsRef.current = activeRelics;
  const [relicChoices, setRelicChoices] = useState(null);
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
  const [wandTick, setWandTick] = useState(0);

  // ─── FEATURE: Salwa Armatnia (hold-to-cast cannon barrage) ───
  const [salvaActive, setSalvaActive] = useState(false);
  const salvaActiveRef = useRef(false);
  salvaActiveRef.current = salvaActive;
  const salvaRef = useRef({ active: false, cursorX: 50, cursorY: 50, lastShotTime: 0 });
  const [salvaTick, setSalvaTick] = useState(0);

  // ─── FEATURE: Combo Visual Feedback ───
  const [comboCounter, setComboCounter] = useState(0);
  const comboCounterRef = useRef(0);
  comboCounterRef.current = comboCounter;
  const [activeCombo, setActiveCombo] = useState(null);
  const comboTimerRef = useRef(null);

  // ─── FEATURE: Skillshot Aiming System ───
  const [skillshotMode, setSkillshotMode] = useState(false); // true when player is aiming
  const [skillshotSpell, setSkillshotSpell] = useState(null); // spell being aimed
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
  const perkMercCritBonus = getPerkCount("merc_crit") * 0.10;

  // MAX_MANA computed from base + knowledge upgrades + perks
  const MAX_MANA = BASE_MAX_MANA + (knowledgeUpgrades.manaPool || 0) * 10 + perkMaxMana;

  // ─── FEATURE: Spell Upgrades ───
  const [spellUpgrades, setSpellUpgrades] = useState({});
  const [upgradeChoices, setUpgradeChoices] = useState(null);
  const upgradeChoicesRef = useRef(null);
  upgradeChoicesRef.current = upgradeChoices;
  const spellUpgradesRef = useRef({});
  spellUpgradesRef.current = spellUpgrades;

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

  // ─── FEATURE: Crew Management ───
  const [crew, setCrew] = useState([]);           // [{role, loyalty, skillLevel, id}]
  const crewRef = useRef([]);
  crewRef.current = crew;
  const [crewRecruitOffer, setCrewRecruitOffer] = useState(null);

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

  // ─── FEATURE: Sailing / Naval ───
  const [shipUpgrades, setShipUpgrades] = useState([]);     // IDs of bought upgrades
  const [seaEvent, setSeaEvent] = useState(null);           // current sea event
  const [discoveredIslands, setDiscoveredIslands] = useState([]);
  const [riverSegment, setRiverSegment] = useState(false);   // true when river ship mini-game is active
  const [worldMap, setWorldMap] = useState(false);           // true when world map navigation is active
  const [riverMapOpen, setRiverMapOpen] = useState(false);   // true when river path map is shown
  const [riverPath, setRiverPath] = useState(null);          // chosen path from river map
  const [shipMapPos, setShipMapPos] = useState({ x: 640, y: 360 }); // ship position on world map
  const pendingDestBiomeRef = useRef(null); // chosen biome from world map, persists through events

  // ─── FEATURE: Advanced Traps & Fortifications ───
  const [unlockedFortifications, setUnlockedFortifications] = useState(["wooden_wall", "alarm_bell"]);
  const [activeFortifications, setActiveFortifications] = useState([]); // placed this room
  const [fortificationPhase, setFortificationPhase] = useState(false);

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

  // ─── FEATURE: Discovery & Collecting ───
  const [journal, setJournal] = useState({ biomes: [], enemies: [], bosses: [], treasures: [], events: [], secrets: [], artifacts: [], factions: [] });
  const [ownedArtifacts, setOwnedArtifacts] = useState([]);
  const [totalDiscoveries, setTotalDiscoveries] = useState(0);
  const [secretRoom, setSecretRoom] = useState(null);
  const [showJournal, setShowJournal] = useState(false);

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

  const showMessage = useCallback((text, color) => {
    setMsg({ text, color });
    setTimeout(() => setMsg(null), 1500);
  }, []);

  const addMoneyFn = useCallback((val) => {
    // Ghost Ship: triple loot
    const mult = ghostShipActiveRef.current ? GHOST_SHIP_CONFIG.lootMultiplier : 1;
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
    setJournal(prev => {
      const cat = prev[category] || [];
      if (cat.find(e => e.id === entry.id)) return prev;
      return { ...prev, [category]: [...cat, entry] };
    });
    setTotalDiscoveries(prev => prev + 1);
  }, []);

  // ─── Computed faction bonuses ───
  const getAllFactionBonuses = () => {
    const bonuses = {};
    for (const faction of FACTIONS) {
      const rep = factionRepRef.current[faction.id] || 0;
      const bonus = getFactionBonus(faction.id, rep);
      if (bonus) bonuses[faction.id] = bonus;
    }
    return bonuses;
  };

  // ─── Computed discovery bonuses ───
  const getArtifactSetBonuses = () => getCompletedSetBonuses(ownedArtifacts);

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
  const EXPLOSIVE_SPELLS = new Set(["fireball", "holybeam", "earthquake"]);
  const getDeathElement = (spell) => {
    if (!spell) return "melee";
    if (EXPLOSIVE_SPELLS.has(spell.id)) return "explosion";
    if (spell.id === "lightning" || spell.id === "chainlightning") return "shot";
    return spell.element || "melee";
  };

  const canvasRef = useRef(null);
  const animCanvasRef = useRef(null);
  // Panoramic scrolling
  const [panOffset, setPanOffset] = useState(0);
  const panRef = useRef({ dragging: false, startX: 0, startOffset: 0 });
  const panOffsetRef = useRef(0);
  panOffsetRef.current = panOffset;
  const physicsCanvasRef = useRef(null);
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
    if (fw) { fw.lungeFrames = 8; fw.lungeOffset = 12; }
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
          addMoneyFn(w.npcData.loot || {});
          // golden_reaper: double loot
          if (hasRelic("golden_reaper")) addMoneyFn(w.npcData.loot || {});
        }
        // piracki_monopol synergy
        if (hasSynergy("piracki_monopol") && Math.random() < 0.20) {
          const bt = pickTreasure(roomRef.current);
          bt.biome = "Monopol"; bt.room = roomRef.current;
          setInventory(prev2 => [...prev2, bt]);
          showMessage("Piracki Monopol! Bonus skarb!", "#d4a030");
        }
        setKills(k => k + 1);
        handleCardDrop(w.npcData);
        rollAmmoDrop(); rollSaberDrop();
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
    if (ew) { ew.lungeFrames = 8; ew.lungeOffset = 12; }
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
      if (ew) { ew.lungeFrames = 8; ew.lungeOffset = 12; }
      return;
    }
    let armor = CARAVAN_LEVELS[caravanLevelRef.current].armor;
    // faith_shield: +3 armor
    if (hasRelic("faith_shield")) armor += 3;
    // twierdza synergy: +2 armor
    if (hasSynergy("twierdza")) armor += 2;
    // Perk: caravan armor
    armor += perkCaravanArmor;
    const actualDmg = Math.max(1, damage - armor);
    // Challenge: no_caravan_dmg fails on caravan damage
    if (roomChallengeRef.current?.id === "no_caravan_dmg" && !roomChallengeRef.current.completed && !roomChallengeRef.current.failed) {
      setRoomChallenge(prev => prev ? { ...prev, failed: true } : prev);
    }
    // Kill streak reset on caravan damage
    setKillStreak(0);
    sfxCaravanHit();
    setCaravanHp(prev => Math.max(0, prev - actualDmg));
    changeMorale("caravan_hit");
    // Screen shake on caravan hit
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 150);
    // Lunge anim on the enemy
    const ew = walkDataRef.current[enemyId];
    if (ew) { ew.lungeFrames = 8; ew.lungeOffset = 12; }
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
      // Pause game when upgrade/level-up picker is open
      if (levelUpChoicesRef.current || upgradeChoicesRef.current) {
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
          for (let ei = 0; ei < enemyList.length; ei++) {
            const e = enemyList[ei].w;
            const dx = e.x - w.x;
            const dy = ((e.y || 65) - (w.y || 65)) * 0.5;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < nearDist) { nearDist = dist; nearX = e.x; nearY = e.y || 65; nearId = enemyList[ei].id; }
          }

          // Mage mana regen (uses dt for frame-rate independence)
          if (w.mercType === "mage" && w.maxMana) {
            w.currentMana = Math.min(w.maxMana, (w.currentMana || 0) + (w.manaRegen || 2) * dt);
          }

          // Stationary walkers: no movement, but ranged can still shoot
          if (w.stationary) {
            if (w.combatStyle === "ranged" && nearId !== null) {
              const range = w.range || 40;
              if (nearDist < range) {
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
                      parseInt(nearId)
                    );
                  }
                }
              }
            }
          } else {

          const isRanged = w.combatStyle === "ranged";

          if (nearX !== null) {
            if (isRanged) {
              // Ranged AI: keep distance 15-35%, strafe while shooting
              if (!w.strafeDir) w.strafeDir = Math.random() < 0.5 ? 1 : -1;
              if (nearDist < 15) {
                w.dir = nearX > w.x ? -1 : 1; // retreat
                w.x += w.speed * w.dir;
              } else if (nearDist > 35) {
                w.dir = nearX > w.x ? 1 : -1; // approach
                w.x += w.speed * w.dir;
              }
              w.dir = nearX > w.x ? 1 : -1; // face enemy
              // Strafe in Y while in combat range
              if (w.y != null) {
                if (nearDist < 35 && nearDist > 12) {
                  // Active strafe while at ideal range
                  w.y += w.strafeDir * (w.ySpeed || 0.01) * 1.2;
                  if (Math.random() < 0.008) w.strafeDir *= -1;
                } else if (nearY != null) {
                  // Drift toward enemy Y when not in ideal range
                  const yd = nearY - w.y;
                  if (Math.abs(yd) > 3) w.y += Math.sign(yd) * (w.ySpeed || 0.01) * 0.5;
                }
              }

              const range = w.range || 35;
              if (nearDist < range) {
                // Sheriff aura: use cached knight positions instead of O(n) scan
                const rangedAuraBonus = _hasKnightAura(w.x, w.y || 50) ? 1.15 : 1;

                if (w.mercType === "mage") {
                  // Mage ranged spell
                  const spellCd = w.spellCd || 3500;
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
                        parseInt(nearId)
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
                  // Archer ranged attack
                  const projCd = w.projectileCd || 1800;
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
                        parseInt(nearId)
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

              // Push back if too close
              if (nearDist < 3) {
                w.x -= w.speed * w.dir * 0.6;
              } else if (w.combatState === "retreat") {
                w.x -= w.speed * w.dir * 0.8;
                if (w.y != null) w.y += w.strafeDir * (w.ySpeed || 0.01) * 0.5;
                w.combatTimer--;
                if (w.combatTimer <= 0) {
                  w.combatState = Math.random() < 0.6 ? "circle" : "approach";
                  w.combatTimer = 30 + Math.floor(Math.random() * 40);
                }
              } else if (w.combatState === "circle") {
                if (w.y != null) w.y += w.strafeDir * (w.ySpeed || 0.01) * 1.5;
                if (nearDist > 10) w.x += w.speed * w.dir * 0.4;
                else if (nearDist < 5) w.x -= w.speed * w.dir * 0.3;
                w.combatTimer--;
                if (w.combatTimer <= 0 || nearDist > 14) {
                  w.combatState = "approach";
                  w.combatTimer = 0;
                  w.strafeDir *= -1;
                }
              } else {
                // Approach: stop at engagement distance
                if (nearDist > 6) {
                  w.x += w.speed * w.dir;
                  if (w.y != null && nearY != null) {
                    const yd = nearY - w.y;
                    if (Math.abs(yd) > 2) w.y += Math.sign(yd) * (w.ySpeed || 0.01) * 0.8;
                  }
                }
              }
              // Attack when in melee range
              if (nearDist < 10) {
                const atkCdMs = w.attackCd || 2500;
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
            w.x += w.speed * w.dir;
            if (w.x > w.maxX) { w.x = w.maxX; w.dir = -1; }
            if (w.x < w.minX) { w.x = w.minX; w.dir = 1; }
          }
          } // end !stationary else
        } else {
          // Enemy AI: find nearest friendly from pre-computed list
          let friendX = null, friendY = null, friendDist = Infinity, friendId = null;
          for (let fi = 0; fi < friendlyList.length; fi++) {
            const f = friendlyList[fi].w;
            const dx = f.x - w.x;
            const dy = ((f.y || 50) - (w.y || 50)) * 0.5;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < friendDist) { friendDist = dist; friendX = f.x; friendY = f.y || 50; friendId = friendlyList[fi].id; }
          }

          // NPC ability usage
          if (w.ability && friendX !== null) {
            const ability = w.ability;
            const abCdKey = "ab" + id;
            if (friendDist < ability.range && (!atkCds[abCdKey] || dateNow - atkCds[abCdKey] > ability.cooldown)) {
              atkCds[abCdKey] = dateNow;
              const dirX = friendX > w.x ? 1 : -1;
              const _idNum = idNum; // capture for closures
              switch (ability.type) {
                case "fireBreath":
                  if (physicsRef.current) {
                    const tx = (w.x / 100) * GAME_W;
                    const ty = GAME_H * 0.25 - 30;
                    physicsRef.current.fx.spawnFireBreath(tx, ty, dirX);
                  }
                  if (enemyAbilityRef.current) enemyAbilityRef.current(idNum, parseInt(friendId), ability.damage, ability.element);
                  break;
                case "poisonSpit":
                case "iceShot":
                case "shadowBolt": {
                  const projType = ability.type === "poisonSpit" ? "poisonSpit"
                    : ability.type === "iceShot" ? "iceShard_npc" : "shadowBolt_npc";
                  if (physicsRef.current) {
                    const targetWd = wd[friendId];
                    const targetXPct = targetWd ? targetWd.x : friendX;
                    physicsRef.current.spawnProjectile(
                      idNum, targetXPct, projType, ability.damage, ability.element,
                      (hitId, dmg, elem) => { if (enemyAbilityRef.current) enemyAbilityRef.current(_idNum, hitId, dmg, elem); },
                      parseInt(friendId)
                    );
                  }
                  break;
                }
                case "charge": {
                  // Temporary speed boost + big melee damage
                  const origSpeed = w.speed;
                  w.speed = origSpeed * 3;
                  w.dir = friendX > w.x ? 1 : -1;
                  setTimeout(() => { if (wd[id]) wd[id].speed = origSpeed; }, 800);
                  if (enemyAbilityRef.current) enemyAbilityRef.current(idNum, parseInt(friendId), ability.damage, "melee");
                  break;
                }
                case "drain": {
                  // Like shadowBolt but heals boss for 50% of damage dealt
                  if (physicsRef.current) {
                    const targetWd = wd[friendId];
                    const targetXPct = targetWd ? targetWd.x : friendX;
                    physicsRef.current.spawnProjectile(
                      idNum, targetXPct, "shadowBolt_npc", ability.damage, "shadow",
                      (hitId, dmg, elem) => {
                        if (enemyAbilityRef.current) enemyAbilityRef.current(_idNum, hitId, dmg, elem);
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
                      parseInt(friendId)
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
            for (let bi = 0; bi < pTrapsCheck.length; bi++) {
              const bt = pTrapsCheck[bi];
              if (!bt.active || bt.trapType !== "barricade") continue;
              const bdx = bt.x - w.x;
              const bdy = ((bt.y || 50) - (w.y || 50)) * 0.5;
              const bdistSq = bdx * bdx + bdy * bdy;
              const blockR = bt.config.blockRadius || 5;
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

            // Push back if too close
            if (friendDist < 3) {
              w.x -= w.speed * w.dir * 0.5;
            } else if (w.combatState === "retreat") {
              w.x -= w.speed * w.dir * 0.6;
              if (w.y != null) w.y += w.strafeDir * (w.ySpeed || 0.01) * 0.4;
              w.combatTimer--;
              if (w.combatTimer <= 0) {
                w.combatState = Math.random() < 0.5 ? "circle" : "approach";
                w.combatTimer = 40 + Math.floor(Math.random() * 50);
              }
            } else if (w.combatState === "circle") {
              if (w.y != null) w.y += w.strafeDir * (w.ySpeed || 0.01) * 1.2;
              if (friendDist > 10) w.x += w.speed * w.dir * 0.3;
              else if (friendDist < 5) w.x -= w.speed * w.dir * 0.2;
              w.combatTimer--;
              if (w.combatTimer <= 0 || friendDist > 15) {
                w.combatState = "approach";
                w.combatTimer = 0;
                w.strafeDir *= -1;
              }
            } else {
              // Approach: stop at engagement distance
              if (friendDist > 6) {
                w.x += w.speed * w.dir;
                if (w.y != null && friendY != null) {
                  const yd = friendY - w.y;
                  if (Math.abs(yd) > 2) w.y += Math.sign(yd) * (w.ySpeed || 0.01) * 0.6;
                }
              }
            }
            // Attack when in melee range
            if (friendDist < 10) {
              const cdKey = "e" + id;
              if (!atkCds[cdKey] || dateNow - atkCds[cdKey] > 3000) {
                atkCds[cdKey] = dateNow;
                const eDmg = w.damage || 5;
                if (enemyAttackFriendlyRef.current) enemyAttackFriendlyRef.current(idNum, parseInt(friendId), eDmg);
                w.combatState = Math.random() < 0.6 ? "retreat" : "circle";
                w.combatTimer = 25 + Math.floor(Math.random() * 35);
                w.strafeDir = Math.random() < 0.5 ? 1 : -1;
              }
            }
            } // end !barricadeBlock
          } else if (defenseModeRef.current?.phase === "wave_active") {
            // No friendly target – check for player barricades first
            w.combatState = null;
            let blockedByBarricade = false;
            const pTrapsForBlock = playerTrapsRef.current;
            for (let bi = 0; bi < pTrapsForBlock.length; bi++) {
              const bt = pTrapsForBlock[bi];
              if (!bt.active || bt.trapType !== "barricade") continue;
              const bdx = bt.x - w.x;
              const bdy = ((bt.y || 50) - (w.y || 50)) * 0.5;
              const bdistSq = bdx * bdx + bdy * bdy;
              const blockR2 = bt.config.blockRadius || 5;
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
              // March toward caravan (center-bottom)
              const caravanX = 50, caravanY = 92;
              const dxC = caravanX - w.x;
              const dyC = caravanY - (w.y || 50);
              if (Math.abs(dxC) > 2) w.x += Math.sign(dxC) * w.speed * 0.6;
              if (w.y != null && Math.abs(dyC) > 2) w.y += Math.sign(dyC) * (w.ySpeed || 0.015) * 2.5;
              w.dir = dxC > 0 ? 1 : -1;
              // Attack when close enough to caravan (use squared distance: 15*15=225)
              const distToCaravanSq = dxC * dxC + dyC * dyC;
              if (distToCaravanSq < 225) {
                const cdKey = "ec" + id;
                if (!atkCds[cdKey] || dateNow - atkCds[cdKey] > 3000) {
                  atkCds[cdKey] = dateNow;
                  if (attackCaravanRef.current) attackCaravanRef.current(idNum, w.damage || 5);
                }
              }
            }
          } else {
            // Reset combat state when no target
            w.combatState = null;
            w.combatTimer = 0;
            // Normal patrol
            w.x += w.speed * w.dir;
            if (w.x > w.maxX) { w.x = w.maxX; w.dir = -1; }
            if (w.x < w.minX) { w.x = w.minX; w.dir = 1; }
          }
        }

        // Hard clamp to screen edges
        if (w.x < 2) { w.x = 2; w.dir = 1; }
        if (w.x > 98) { w.x = 98; w.dir = -1; }

        // Y movement – gentle wandering up and down
        if (w.y != null) {
          w.y += w.ySpeed * w.yDir;
          if (w.y > (w.maxY || 90)) { w.y = w.maxY || 90; w.yDir = -1; }
          if (w.y < (w.minY || 25)) { w.y = w.minY || 25; w.yDir = 1; }
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
          for (let fi = 0; fi < friendlyList.length; fi++) {
            const f = friendlyList[fi].w;
            const dx = f.x - w.x;
            const dy = ((f.y || 50) - (w.y || 50)) * 0.5;
            // Use squared distance: 30*30 = 900
            const distSq = dx * dx + dy * dy;
            if (distSq < 900) {
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
          w.x = Math.max(w.minX || 2, Math.min(w.maxX || 98, w.x));
        } else if (w._fearUntil) {
          if (w._origSpeed) { w.speed = w._origSpeed; delete w._origSpeed; }
          delete w._fearUntil; delete w._fearDir;
        }

        // Lunge animation decay
        if (w.lungeFrames > 0) {
          w.lungeFrames--;
          w.lungeOffset *= 0.75;
        } else {
          w.lungeOffset = 0;
        }

        if (!w.stationary) w.bouncePhase += 0.12;
        const el = npcElsRef.current[id];
        if (el) {
          const bounceY = w.stationary ? 0 : Math.abs(Math.sin(w.bouncePhase)) * 4;
          const lungeX = w.lungeOffset || 0;
          const yPos = w.y != null ? w.y : 25;
          // 2.5D: depth-based scaling and z-ordering for DOM walker elements
          const walkerDepth = depthFromY(yPos);
          const walkerScale = scaleAtDepth(walkerDepth);
          const walkerZ = 10 + zIndexAtDepth(walkerDepth); // base 10 to stay above backgrounds
          // Panoramic wrapping: position walker HTML overlay at wrapped screen X
          const wrappedX = _wrapPct(w.x, panOffsetRef.current, GAME_W);
          if (wrappedX === null) {
            el.style.display = "none";
            continue;
          }
          el.style.display = "";
          el.style.left = `${wrappedX}%`;
          el.style.top = `calc(${yPos}% - 75px)`;
          el.style.zIndex = walkerZ;
          el.style.transform = `translateX(-50%) translateY(${-bounceY}px) translateX(${lungeX * w.dir}px) scale(${walkerScale})`;
        }
        // Update physics body to match walker position
        if (physicsRef.current) {
          const yPctForPhysics = w.y != null ? w.y : null;
          physicsRef.current.updatePatrol(idNum, w.x, w.dir, w.bouncePhase, yPctForPhysics);
        }
      }
      // ─── OBSTACLE LEAK PARTICLES (low HP obstacles emit material particles) ───
      if (pixiRef.current) {
        for (const obs of obstaclesRef.current) {
          if (!obs.destructible || obs.destroying || obs.hp <= 0) continue;
          const hpR = obs.maxHp > 0 ? obs.hp / obs.maxHp : 1;
          const leak = getLeakParticles(hpR, obs.material);
          if (leak && Math.random() < leak.rate) {
            const lpx = (obs.x / 100) * GAME_W;
            const lpy = GAME_H - (obs.y / 100) * GAME_H;
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
              e._caltropUntil = trapNow + 500;
            } else if (e._caltropUntil && trapNow > e._caltropUntil && e._caltropOrig) {
              e.speed = e._caltropOrig;
              delete e._caltropOrig;
              delete e._caltropUntil;
            }
          }

          if (pt.trapType === "fire_pit" && dist < (pt.config.radius || 6)) {
            // DPS — apply damage every ~1s (every 20 frames at 60fps → check every 3rd = ~18 frames)
            const cdKey = `fire_${pt.id}_${eid}`;
            if (!atkCds[cdKey] || trapNow - atkCds[cdKey] > 1000) {
              atkCds[cdKey] = trapNow;
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
            e._stunnedUntil = trapNow + stunDur;
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

          // barricade is handled in enemy AI movement, not here
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
        const orbRadius = 8; // % of screen
        const hitRadius = 5; // % of screen for damage
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
                pixiRef.current.spawnMeleeSparks((d.x / 100) * GAME_W, (d.y / 100) * GAME_H, Math.sign(d.x - 50) || 1);
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
                  if (physicsRef.current) physicsRef.current.triggerRagdoll(w.id, "lightning", Math.sign(d.x - 50) || 1);
                  if (ww.isMeteorBoulder && meteorWaveRef.current) {
                    spawnMeteorGroundLoot(meteorWaveRef.current.x, meteorWaveRef.current.y);
                    meteorWaveRef.current = null;
                    setMeteorite(null);
                  } else {
                    addMoneyFn(ww.npcData.loot || {});
                  }
                  setKills(k => k + 1);
                  handleCardDrop(ww.npcData);
                  rollAmmoDrop(); rollSaberDrop();
                  grantXp(ww.isBoss ? 100 : ww.isElite ? 50 : 10 + roomRef.current * 2);
                  processKillStreak();
                  setTimeout(() => setWalkers(pr => pr.filter(www => www.id !== w.id)), 2500);
                  return { ...ww, hp: 0, dying: true, dyingAt: Date.now() };
                }
                if (physicsRef.current) physicsRef.current.applyHit(w.id, "lightning", Math.sign(d.x - 50) || 1);
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
            const offX = (Math.random() - 0.5) * 40;
            const offY = (Math.random() - 0.5) * 30;
            const tgtPx = (sv.cursorX / 100) * GAME_W + offX;
            const tgtPy = (sv.cursorY / 100) * GAME_H + offY;
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
                }
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
            market_stall:{w:40,h:32},broken_wagon:{w:50,h:24},lamp_post:{w:8,h:48},sandbag_wall:{w:44,h:20},
            lava_pool:{w:34,h:14},obsidian_pillar:{w:14,h:40},steam_vent:{w:18,h:12},ash_mound:{w:32,h:16},
            haystack:{w:30,h:28},windmill:{w:20,h:50},scarecrow:{w:18,h:44},wooden_fence:{w:46,h:22},
            log_pile:{w:38,h:20},hunting_stand:{w:22,h:46},mushroom_ring:{w:36,h:14},fallen_tree:{w:55,h:16},
            flower_patch:{w:34,h:12},beehive:{w:18,h:24},stone_bridge:{w:50,h:14},well:{w:22,h:26},
            crystal_cluster:{w:24,h:30},giant_mushroom:{w:28,h:38},web_wall:{w:40,h:34},stalactite:{w:12,h:36},
            quicksand:{w:36,h:12},dead_tree:{w:18,h:44},fog_pool:{w:38,h:12},lily_pad:{w:22,h:10},
            crystal_geode:{w:26,h:24},barrel_stack:{w:30,h:26},cannon_wreck:{w:44,h:22},treasure_pile:{w:32,h:20},
            coral_reef:{w:36,h:18},fishing_net:{w:42,h:10},rope_coil:{w:20,h:18},barnacle_rock:{w:30,h:26},
            rusted_cage:{w:28,h:32},mast_fragment:{w:14,h:48},powder_keg:{w:20,h:22},whirlpool:{w:34,h:14},seaweed_patch:{w:36,h:14},
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

              // AABB collision: obstacle center in pixel coords
              const sz = _obsSizes[o.type] || _defaultSize;
              const ocx = (o.x / 100) * GAME_W;
              const ocy = GAME_H - (o.y / 100) * GAME_H;
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

              // ─── DAMAGE: apply to destructible obstacles ───
              // Explosive projectiles deal extra damage from splash
              const obsDmgMult = isExplosive ? 1.5 : 1;
              if (o.destructible) {
                const spellDmg = Math.round((proj.damage || 20) * obsDmgMult);
                const spellEl = proj.element || null;
                const _oid = o.id, _dmg = spellDmg, _el = spellEl;
                setTimeout(() => {
                  setObstacles(prev => {
                    const target = prev.find(ob => ob.id === _oid);
                    if (!target || !target.destructible || target.hp <= 0 || target.destroying) return prev;
                    const matDef = OBSTACLE_MATERIALS[target.material] || OBSTACLE_MATERIALS.wood;
                    let dmg = _dmg;
                    if (matDef.weakTo && matDef.weakTo === _el) dmg = Math.round(dmg * WEAKNESS_MULT);
                    if (matDef.resistTo && matDef.resistTo === _el) dmg = Math.round(dmg * OBS_RESIST_MULT);
                    const newHp = Math.max(0, target.hp - dmg);
                    const px = (target.x / 100) * GAME_W;
                    const py = GAME_H - (target.y / 100) * GAME_H;
                    if (pixiRef.current) {
                      pixiRef.current.spawnObstacleHitSpark(px, py, matDef.color);
                    }
                    if (newHp <= 0) {
                      if (pixiRef.current) {
                        switch (matDef.particle) {
                          case "splinter": pixiRef.current.spawnWoodSplinters(px, py); break;
                          case "rubble":   pixiRef.current.spawnStoneRubble(px, py); break;
                          case "shard":
                            if (target.material === "ice") pixiRef.current.spawnIceShatter(px, py);
                            else pixiRef.current.spawnCrystalShatter(px, py);
                            break;
                          case "leaf":     pixiRef.current.spawnLeafBurst(px, py); break;
                          case "spark":    pixiRef.current.spawnMetalSparks(px, py); break;
                          case "dust":     pixiRef.current.spawnDustBurst(px, py); break;
                          default:         pixiRef.current.spawnWoodSplinters(px, py); break;
                        }
                        pixiRef.current.screenShake(matDef.shakeIntensity || 3);
                        if (target.loot && Object.keys(target.loot).length > 0) {
                          pixiRef.current.spawnGoldCoins(px, py, 0.4);
                        }
                      }
                      if (target.loot && Object.keys(target.loot).length > 0) addMoneyFn(target.loot);
                      // ─── EXPLOSIVE OBSTACLE: damage all enemies in blast radius ───
                      if (target.explosive && target.explosionDmg) {
                        const radius = target.explosionRadius || 16;
                        const blastDmg = target.explosionDmg;
                        const blastEl = target.explosionElement || "fire";
                        sfxMeteorImpact();
                        if (animatorRef.current) animatorRef.current.playMeteorImpact(px, py);
                        if (pixiRef.current) pixiRef.current.screenShake(8);
                        showMessage("Eksplozja!", blastEl === "poison" ? "#44ff44" : blastEl === "ice" ? "#4488ff" : "#ff6020");
                        const curWalkers = walkersRef.current;
                        curWalkers.forEach(w => {
                          if (!w.alive || w.dying) return;
                          const wd = walkDataRef.current[w.id];
                          if (!wd) return;
                          const ddx = wd.x - target.x;
                          const ddy = ((wd.y || 50) - (100 - target.y)) * 0.5;
                          const dist = Math.sqrt(ddx * ddx + ddy * ddy);
                          if (dist < radius) {
                            const falloff = 1 - (dist / radius) * 0.5;
                            const dmg = Math.round(blastDmg * falloff + Math.random() * 10);
                            const wId = w.id;
                            spawnDmgPopup(wId, `${dmg}`, blastEl === "poison" ? "#44ff44" : "#ff6020");
                            setWalkers(ppp => ppp.map(ww => {
                              if (ww.id !== wId || !ww.alive || ww.dying) return ww;
                              const newWHp = Math.max(0, ww.hp - dmg);
                              if (newWHp <= 0) {
                                sfxNpcDeath();
                                if (walkDataRef.current[ww.id]) walkDataRef.current[ww.id].alive = false;
                                if (physicsRef.current) physicsRef.current.triggerRagdoll(ww.id, blastEl, Math.sign(ddx) || 1);
                                addMoneyFn(ww.npcData.loot);
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
                      setTimeout(() => setObstacles(p => p.filter(ob => ob.id !== _oid)), 400);
                      return prev.map(ob => ob.id === _oid ? { ...ob, hp: 0, destroying: true, hitAnim: Date.now() } : ob);
                    }
                    return prev.map(ob => ob.id === _oid ? { ...ob, hp: newHp, hitAnim: Date.now() } : ob);
                  });
                }, 0);
              }
              break; // one obstacle collision per projectile per frame
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
    if (pixiRef.current) pixiRef.current.setPanOffset(0);
    const isDefenseRoom = newRoom > 0 && newRoom % 5 === 0;

    // Reset caravan HP in defense rooms
    if (isDefenseRoom) setCaravanHp(CARAVAN_LEVELS[caravanLevelRef.current].hp);

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
    // Reset per-room merchant buffs (active for 1 room after purchase)
    if (eventMercDmgBuffRef.current > 0) { setEventMercDmgBuff(0); eventMercDmgBuffRef.current = 0; }
    if (eventMercHpBuffRef.current > 0) { setEventMercHpBuff(0); eventMercHpBuffRef.current = 0; }

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
      const cx = 10 + Math.random() * 72, cy = 25 + Math.random() * 65;
      setChestPos({ x: cx, y: cy });
      setShowChest(true);
      setChestClicks(0);
    } else {
      setShowChest(false); setChestPos(null); setChestClicks(0);
    }

    const currentTools = tools || [];
    if (isDefenseRoom) {
      // Defense rooms: clear all POIs, no new NPCs/traps
      setShowChest(false); setChestPos(null); setChestClicks(0); setResourceNode(null); setShowResource(false);
      setFruitTree(null); setMineNugget(null); setWaterfall(null); setBiomePoi(null);
      setMercCamp(null); setWizardPoi(null); setTraps([]); setObstacles([]);
    }

    const terrain = b.terrain;
    const hasTool = (terrain === "forest" && currentTools.includes("axe")) ||
                    (terrain === "mine" && currentTools.includes("pickaxe"));
    if (!isDefenseRoom && hasTool && Math.random() < 0.45) {
      const rx = 10 + Math.random() * 280, ry = 58 + Math.random() * 24;
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
    };
    const MINE_VARIANTS = {
      desert:  { rockCol: ["#8a7a60","#6a6050","#5a5040"], oreIcon: "gem", label: "Piaskowa Skała" },
      city:    { rockCol: ["#5a5550","#4a4540","#3a3530"], oreIcon: "rock", label: "Ruiny Kopalni" },
      volcano: { rockCol: ["#4a2a1a","#3a2010","#2a1808"], oreIcon: "fire", label: "Wulkaniczna Żyła" },
    };
    const WATER_VARIANTS = {
      jungle:  { rgb: [40,180,100], label: "Leśny Wodospad", frozen: false },
      winter:  { rgb: [160,200,255], label: "Zamrożony Wodospad", frozen: true },
      swamp:   { rgb: [60,100,40], label: "Bagienny Spływ", frozen: false },
      default: { rgb: [80,160,255], label: "Wodospad", frozen: false },
    };

    const bid = b.id;
    const MAX_POIS = 6; // more POIs for the 360° panoramic world
    const poiSlots = []; // { x } – tracks used positions to avoid overlap (min 12% apart)
    const poiCount = () => poiSlots.length;
    const pickX = (min, max) => {
      for (let tries = 0; tries < 20; tries++) {
        const x = min + Math.random() * (max - min);
        if (poiSlots.every(s => Math.abs(s.x - x) >= 12)) { poiSlots.push({ x }); return x; }
      }
      return null; // couldn't find non-overlapping position
    };

    // Build list of candidate POIs, roll each, then cap at MAX_POIS
    let newTree = null, newMine = null, newWater = null, newCamp = null, newWizard = null;
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
        newTree = { x: tx, fruits, biomeId: bid, crown: tv.crown, trunk: tv.trunk, label: tv.label };
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
        newMine = { x: nx, nuggets, progress: 0, activeId: null, biomeId: bid, rockCol: mv.rockCol, oreIcon: mv.oreIcon, label: mv.label };
      }
    }

    if (poiCount() < MAX_POIS && Math.random() < 0.10) {
      const wx = pickX(40, 260);
      if (wx !== null) {
        const wv = WATER_VARIANTS[bid] || WATER_VARIANTS.default;
        newWater = { x: wx, opened: false, biomeId: bid, rgb: wv.rgb, label: wv.label, frozen: wv.frozen };
      }
    }

    if (poiCount() < MAX_POIS && Math.random() < 0.20) {
      const cx = pickX(25, 270);
      if (cx !== null) newCamp = { x: cx, biomeId: bid };
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
        newWizard = { x: wizX, ammoType: pick.type, ammoAmount: amount };
      }
    }

    // ─── BIOME-SPECIFIC POI (unique interaction per biome) ───
    let newBiomePoi = null;
    if (poiCount() < MAX_POIS && Math.random() < 0.30) {
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
        const poiDef = BIOME_POIS[bid] || BIOME_POIS.summer;
        newBiomePoi = { ...poiDef, x: bpx, biomeId: bid, used: false };
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
    // Explosive obstacles (small chance) per biome
    const EXPLOSIVE_VARIANTS = {
      jungle:   "gas_mushroom",     island:   "powder_keg",       desert:   "oil_barrel",
      winter:   "frozen_gas_vent",  city:     "dynamite_crate",   volcano:  "magma_rock",
      summer:   "oil_barrel",       autumn:   "gas_mushroom",     spring:   "gas_mushroom",
      mushroom: "gas_mushroom",     swamp:    "swamp_gas_pod",    sunset_beach: "powder_keg",
      bamboo_falls: "gas_mushroom", blue_lagoon: "powder_keg",
    };
    const OBSTACLE_VARIANTS = {
      jungle:   ["fallen_log", "vine_wall", "ancient_totem", "moss_boulder", "giant_mushroom", "coral_reef", "rope_coil", "fallen_tree"],
      island:   ["shipwreck", "driftwood", "tide_pool", "anchor_post", "barrel_stack", "cannon_wreck", "fishing_net", "barnacle_rock"],
      desert:   ["cactus_cluster", "wagon_wreck", "sun_bleached_skull", "tumbleweed", "sandbag_wall", "rope_coil", "rusted_cage", "dead_tree"],
      winter:   ["ice_pillar", "frozen_barrel", "snowdrift", "icicle_rock", "barnacle_rock", "mast_fragment", "crystal_geode", "moss_boulder"],
      city:     ["market_stall", "broken_wagon", "lamp_post", "sandbag_wall", "barrel_stack", "rusted_cage", "rope_coil", "volatile_crystal"],
      volcano:  ["lava_pool", "obsidian_pillar", "steam_vent", "ash_mound", "crystal_cluster", "crystal_geode", "barnacle_rock", "rusted_cage"],
      summer:   ["haystack", "windmill", "scarecrow", "wooden_fence", "flower_patch", "beehive", "log_pile", "well"],
      autumn:   ["log_pile", "hunting_stand", "mushroom_ring", "fallen_tree", "dead_tree", "moss_boulder", "haystack", "wooden_fence"],
      spring:   ["flower_patch", "beehive", "stone_bridge", "well", "vine_wall", "lily_pad", "fallen_log", "giant_mushroom"],
      mushroom: ["crystal_cluster", "giant_mushroom", "web_wall", "stalactite", "crystal_geode", "fog_pool", "vine_wall", "mushroom_ring"],
      swamp:    ["quicksand", "dead_tree", "fog_pool", "lily_pad", "vine_wall", "fishing_net", "coral_reef", "seaweed_patch"],
      sunset_beach: ["driftwood", "tide_pool", "shipwreck", "anchor_post", "barrel_stack", "coral_reef", "fishing_net", "barnacle_rock"],
      bamboo_falls: ["moss_boulder", "fallen_log", "vine_wall", "flower_patch", "coral_reef", "rope_coil", "giant_mushroom", "lily_pad"],
      blue_lagoon:  ["driftwood", "tide_pool", "anchor_post", "flower_patch", "coral_reef", "seaweed_patch", "fishing_net", "barnacle_rock"],
    };
    const biomeObstacles = OBSTACLE_VARIANTS[bid] || OBSTACLE_VARIANTS.desert;
    const biomeExplosive = EXPLOSIVE_VARIANTS[bid] || "powder_keg";
    const newObstacles = [];
    if (!isDefenseRoom) {
      // Spawn 5-9 obstacles spread across the 360° panoramic world
      const obsCount = 5 + Math.floor(Math.random() * 5);
      for (let i = 0; i < obsCount; i++) {
        // Distribute across full panoramic world (0–290% = 3× viewport minus margin)
        const ox = 5 + Math.random() * 285;
        const oy = 10 + Math.random() * 55;
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
        });
      }
    }
    setObstacles(newObstacles);

    // ─── TRAPS ───
    // (enemy mines removed — explosive obstacles are part of biome obstacles now)
    setTraps([]);

    // ─── NEW: Crew passive — cook heals caravan each room ───
    const cookHeal = getCrewBonus("healPerRoom");
    if (cookHeal > 0) {
      setCaravanHp(prev => Math.min(CARAVAN_LEVELS[caravanLevelRef.current].hp, prev + cookHeal));
      showMessage(`Kucharz serwuje posiłek! +${Math.round(cookHeal)} HP`, "#40e060");
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

    // Walking NPCs – 70% chance, 1-2 NPCs
    const newWalkers = [];
    const newWalkData = {};
    if (!isDefenseRoom && Math.random() < 0.70) {
      const count = Math.random() < 0.55 ? 1 : 2;
      for (let i = 0; i < count; i++) {
        let npcData = pickNpc(b.id);
        if (!npcData) continue;
        const roomScale = 1 + Math.min(newRoom / 25, 1.5);
        npcData = { ...npcData, hp: Math.round(npcData.hp * roomScale) };
        const wid = ++walkerIdCounter;
        const spawnX = 20 + Math.random() * 55;
        const walkRange = 12 + Math.random() * 10;
        const speed = 0.02 + Math.random() * 0.03;
        newWalkers.push({
          id: wid,
          npcData,
          alive: true,
          dying: false,
          hp: npcData.hp,
          maxHp: npcData.hp,
        });
        const spawnY = 25 + Math.random() * 65; // 65-83% (on ground)
        const dmgScale = 1 + Math.min(newRoom / 20, 2.0); // damage scales 1x→3x over 40 rooms
        newWalkData[wid] = {
          x: spawnX,
          y: spawnY,
          dir: Math.random() < 0.5 ? 1 : -1,
          yDir: Math.random() < 0.5 ? 1 : -1,
          speed,
          ySpeed: 0.005 + Math.random() * 0.015,
          minX: Math.max(5, spawnX - walkRange),
          maxX: Math.min(90, spawnX + walkRange),
          minY: 25, maxY: 90,
          bouncePhase: Math.random() * Math.PI * 2,
          alive: true,
          friendly: false,
          damage: Math.ceil((npcData.hp / 8) * dmgScale),
          lungeFrames: 0,
          lungeOffset: 0,
          ability: npcData.ability || null,
        };
      }
    }
    // Preserve alive friendly mercenaries across rooms (skip barricade – defense only)
    const preservedData = {};
    for (const [id, w] of Object.entries(walkDataRef.current)) {
      if (w && w.alive && w.friendly && !w.stationary) {
        w.x = 5 + Math.random() * 8; // respawn near caravan
        w.minX = 5; w.maxX = w.maxX <= 28 ? 28 : 90; // dog keeps limited range
        if (w.y == null) w.y = 65 + Math.random() * 18;
        if (w.y < 65) w.y = 65; // clamp to ground
        if (w.yDir == null) w.yDir = Math.random() < 0.5 ? 1 : -1;
        if (w.ySpeed == null) w.ySpeed = 0.005 + Math.random() * 0.015;
        w.minY = 65; w.maxY = 83;
        preservedData[id] = w;
      }
    }
    // Collect preserved walker React state via ref (avoids stale closure + batching issues)
    const keptWalkerState = walkersRef.current.filter(pw => pw.alive && !pw.dying && pw.friendly && !pw.isBarricade && preservedData[pw.id]);
    setWalkers([...keptWalkerState, ...newWalkers]);
    walkDataRef.current = { ...preservedData, ...newWalkData };
    npcElsRef.current = {};
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
        physicsRef.current.spawnNpc(w.id, newWalkData[w.id].x, w.npcData, false);
      }
      // Re-spawn preserved friendly mercenaries
      for (const w of keptWalkerState) {
        if (preservedData[w.id]) {
          physicsRef.current.spawnNpc(w.id, preservedData[w.id].x, w.npcData, true);
        }
      }
    }

    // Defense room – initialize wave mode
    const bossData = getBossForRoom(newRoom);
    if (isDefenseRoom) {
      const totalWaves = bossData ? 1 : (newRoom <= 15 ? 3 : newRoom <= 30 ? 4 : 5);
      setDefenseMode({ phase: "setup", currentWave: 1, totalWaves,
        enemiesRemaining: 0, enemiesSpawned: 0, timer: 3, roomNumber: newRoom, isBossRoom: !!bossData });
      setMeteorite(null);
      setGroundLoot([]);
      meteorWaveRef.current = null;
      sfxWaveHorn();
      setMusicCombatIntensity(0.7); // ramp up music intensity for combat
      // Auto-deploy all trap types randomly for free
      {
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
        showMessage("Pułapki rozstawione!", "#40c0a0");
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
        showMessage("Etap Obronny!", "#ff6020");
      }

      // Spawn caravan defenses: barricade, dog
      const cl = CARAVAN_LEVELS[caravanLevelRef.current];
      if (cl.barricade) {
        const bId = ++walkerIdCounter;
        const bHp = cl.barricade.hp;
        const bNpc = { icon: "wood", name: "Barykada", hp: bHp, resist: null, loot: {}, bodyColor: "#6a4a20", armorColor: "#4a3010", bodyType: "barricade" };
        setWalkers(prev => [...prev, { id: bId, npcData: bNpc, alive: true, dying: false, hp: bHp, maxHp: bHp, friendly: true, isBarricade: true }]);
        walkDataRef.current[bId] = {
          x: 50, y: 75, dir: 1, yDir: 0, speed: 0, ySpeed: 0,
          minX: 50, maxX: 50, minY: 25, maxY: 90,
          bouncePhase: 0, alive: true, friendly: true,
          damage: 0, lungeFrames: 0, lungeOffset: 0,
          stationary: true, combatStyle: "none", attackCd: 99999,
        };
        if (physicsRef.current) physicsRef.current.spawnNpc(bId, 50, bNpc, true);
      }
      // Tower removed — replaced by thornArmor (passive reflect) and warDrums (merc aura)
      if (cl.dog) {
        // Check if dog already exists among preserved friendlies
        const existingDog = keptWalkerState.find(w => w.isDog);
        if (!existingDog) {
          const dId = ++walkerIdCounter;
          const dNpc = { icon: "dog", name: "Ogar bojowy", hp: 80, resist: null, loot: {}, bodyColor: "#8a6030", armorColor: "#5a4020", bodyType: "quadruped" };
          setWalkers(prev => [...prev, { id: dId, npcData: dNpc, alive: true, dying: false, hp: 80, maxHp: 80, friendly: true, isDog: true }]);
          walkDataRef.current[dId] = {
            x: 45, y: 85, dir: 1, yDir: Math.random() < 0.5 ? 1 : -1,
            speed: 0.06, ySpeed: 0.01,
            minX: 30, maxX: 70, minY: 75, maxY: 92,
            bouncePhase: 0, alive: true, friendly: true,
            damage: 10, lungeFrames: 0, lungeOffset: 0,
            combatStyle: "melee", attackCd: 1800,
          };
          if (physicsRef.current) physicsRef.current.spawnNpc(dId, 12, dNpc, true);
        }
      }

      return;
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

  // Render static biome — re-renders on biome/room/night change
  // NOTE: panOffset is NOT a dependency — panning re-renders directly in handlePanMove
  // to avoid expensive re-render cycles that cause black screen on biome transitions
  useEffect(() => {
    if (!biome || !canvasRef.current) return;
    const c = canvasRef.current;
    c.width = GAME_W; c.height = GAME_H;
    const ctx = c.getContext("2d");
    try {
      renderBiome(ctx, biome, room, c.width, c.height, isNight, panOffsetRef.current);
    } catch (e) {
      console.error("renderBiome crashed:", e, { biomeId: biome?.id, room, panOffset: panOffsetRef.current });
      ctx.fillStyle = "#200000";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.fillStyle = "#ff4040";
      ctx.font = "14px monospace";
      ctx.fillText(`Biome render error: ${e.message}`, 20, 30);
    }
  }, [biome, room, isNight, GAME_W, GAME_H]); // panOffset intentionally excluded

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
            physicsRef.current.spawnNpc(w.id, walkData.x, w.npcData, !!w.friendly);
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
        const px = (wd.x / 100) * GAME_W;
        const py = GAME_H * 0.25;
        animatorRef.current.playMeleeSparks?.(px, py);
      }
    }, interval);
    return () => clearInterval(iv);
  }, [weather?.id, defenseMode?.phase]);

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

  // ─── DEFENSE WAVE SYSTEM ───
  // Phase timer: countdown during setup and inter_wave
  useEffect(() => {
    if (!defenseMode || (defenseMode.phase !== "setup" && defenseMode.phase !== "inter_wave")) return;
    const iv = setInterval(() => {
      setDefenseMode(prev => {
        if (!prev) return null;
        const t = prev.timer - 1;
        if (t <= 0) return { ...prev, phase: "wave_active", timer: 0 };
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
      const spawnX = 50; // boss spawns center-top
      const spawnY = 5;  // behind horizon
      setWalkers(prev => [...prev, {
        id: wid, npcData: bossNpc, alive: true, dying: false,
        hp: boss.maxHp, maxHp: boss.maxHp, isBoss: true, friendly: false,
      }]);
      walkDataRef.current[wid] = {
        x: spawnX, y: spawnY, dir: Math.random() < 0.5 ? -1 : 1,
        yDir: 1, // start moving downward
        speed: boss.speed, ySpeed: 0.008,
        minX: 5, maxX: 98, minY: 25, maxY: 92,
        bouncePhase: 0, alive: true, friendly: false,
        damage: boss.damage,
        lungeFrames: 0, lungeOffset: 0,
        ability: bossAbilityObj,
        attackCd: boss.attackCd,
        combatStyle: boss.combatStyle,
        isBoss: true,
        range: boss.combatStyle === "ranged" ? 50 : 35,
      };
      if (physicsRef.current) physicsRef.current.spawnNpc(wid, spawnX, bossNpc, false);
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
    // greedy_merchant: enemies +30% HP (nerfed from +20%)
    if (hasRelic("greedy_merchant")) hpMult *= 1.30;
    // Risk event: enemy buff rooms
    if (enemyBuffRoomsRef.current > 0) hpMult *= 1.50;
    const dmgMult = 1 + roomDiff * 0.7 + waveDiff * 0.5;
    const biomeId = biome?.id || "summer";

    // Elite room check
    const isElite = isEliteRoom(roomNum);
    const eliteMod = isElite ? rollEliteModifier() : null;

    setDefenseMode(prev => prev ? { ...prev, enemiesRemaining: enemyCount + (isElite ? 1 : 0), enemiesSpawned: enemyCount + (isElite ? 1 : 0) } : null);

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
        const spawnX = 50;
        const spawnY = 8;
        setWalkers(prev => [...prev, {
          id: wid, npcData, alive: true, dying: false, hp: npcData.hp, maxHp: npcData.hp, isElite: true, eliteMod: eliteMod,
        }]);
        walkDataRef.current[wid] = {
          x: spawnX, y: spawnY, dir: Math.random() < 0.5 ? -1 : 1,
          yDir: 1, speed: 0.015, ySpeed: 0.012,
          minX: 5, maxX: 98, minY: 25, maxY: 92,
          bouncePhase: 0, alive: true, friendly: false,
          damage: Math.ceil(npcData.hp / 6 * dmgMult * (eliteMod.damageMult || 1)),
          lungeFrames: 0, lungeOffset: 0,
          ability: npcData.ability || null,
          attackCd: Math.round(3000 * (eliteMod.attackSpeedMult || 1)),
          isElite: true,
          eliteMod: eliteMod,
        };
        if (physicsRef.current) physicsRef.current.spawnNpc(wid, spawnX, npcData, false);
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
        // Apply active mutations if this enemy type matches
        const mut = activeMutationsRef.current.find(m => m.npcName === npcData.name);
        if (mut && mut.mutation) mut.mutation.apply(npcData);
        const wid = ++walkerIdCounter;
        const spawnX = 10 + Math.random() * 80; // spread across width
        const spawnY = 8 + Math.random() * 10;  // spawn behind horizon (8-18%)
        setWalkers(prev => [...prev, {
          id: wid, npcData, alive: true, dying: false, hp: npcData.hp, maxHp: npcData.hp,
        }]);
        walkDataRef.current[wid] = {
          x: spawnX, y: spawnY, dir: Math.random() < 0.5 ? -1 : 1,
          yDir: 1, // always start moving downward
          speed: 0.01 + Math.random() * 0.02,
          ySpeed: 0.015 + Math.random() * 0.015, // faster downward movement
          minX: 5, maxX: 98, minY: 25, maxY: 92,
          bouncePhase: Math.random() * Math.PI * 2,
          alive: true, friendly: false,
          damage: Math.ceil(npcData.hp / 8 * dmgMult),
          lungeFrames: 0, lungeOffset: 0,
          ability: npcData.ability || null,
          attackCd: 3000,
        };
        if (physicsRef.current) physicsRef.current.spawnNpc(wid, spawnX, npcData, false);
      }, delay);
      timers.push(tid);
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

      // Boss room: wave completes when boss is dead (minions get cleaned up)
      if (dm.isBossRoom) {
        const bossAlive = walkersRef.current.some(w => w.isBoss && w.alive && !w.dying);
        if (!bossAlive && dm.enemiesSpawned > 0) {
          clearInterval(iv);
          setActiveBoss(null);
          setBossesDefeated(b => b + 1);
          sfxVictoryFanfare();
          changeMorale("boss_kill");
          setMusicCombatIntensity(0); // calm down music after boss victory
          setDefenseMode(prev => prev ? { ...prev, phase: "complete" } : null);
          return;
        }
      } else {
        // All enemies dead (regular defense)
        if (aliveEnemies.length === 0 && dm.enemiesSpawned > 0) {
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

  // Defense rewards
  useEffect(() => {
    if (!defenseMode) return;
    if (defenseMode.phase === "complete" && defenseMode.roomNumber > 0) {
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
    walkDataRef.current = {};
    if (pixiRef.current) { pixiRef.current.clearNpcs(); pixiRef.current.clearDestruction(); }
    if (physicsRef.current) physicsRef.current.clear();
    setGameOverStats(null);
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
    } catch (e) {
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
      // Load new gameplay systems
      setCrew(s.crew || []);
      setActiveStory(s.activeStory || null);
      setCompletedStories(s.completedStories || []);
      setShipUpgrades(s.shipUpgrades || []);
      setDiscoveredIslands(s.discoveredIslands || []);
      if (s.shipMapPos) setShipMapPos(s.shipMapPos);
      setUnlockedFortifications((s.unlockedFortifications || ["wooden_wall", "alarm_bell"]).filter(f => f !== "spike_pit"));
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
    } catch (e) {
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
        crew, activeStory, completedStories,
        shipUpgrades, discoveredIslands,
        unlockedFortifications, factionRep,
        journal, ownedArtifacts, totalDiscoveries,
        ownedSabers, equippedSaber, moonbladeBonus,
        morale, activeMutations, killsByType,
        savedAt: Date.now(),
      };
      try { localStorage.setItem("wrota_save", JSON.stringify(saveData)); } catch {}
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

  // World map dock handler — player chose a biome island
  const handleWorldMapDock = useCallback((chosenBiome, newShipPos) => {
    setWorldMap(false);
    setShipMapPos(newShipPos);
    setTransitioning(true);
    pendingDestBiomeRef.current = chosenBiome; // persist chosen biome through events
    // Show river path map for player to choose route
    setTimeout(() => { setRiverMapOpen(true); setTransitioning(false); }, 400);
  }, [room]);

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
        setTimeout(() => { setSeaEvent(seaEvt); sfxEventAppear(); }, 300);
        const island = rollIslandDiscovery();
        if (island) {
          setDiscoveredIslands(prev => [...prev, island]);
          addDiscovery("secrets", { id: island.id, name: island.name });
        }
        return;
      }
    }
    const event = rollRandomEvent(nextRoom);
    if (event) {
      setTimeout(() => {
        const sfxMap = { merchant: sfxMerchant, altar: sfxAltar, wounded: sfxEventAppear };
        (sfxMap[event.id] || sfxEventAppear)();
        setRandomEvent(event);
      }, 450);
    } else {
      setTimeout(() => {
        enterRoom(room + 1, ownedTools, pendingDestBiomeRef.current);
        pendingDestBiomeRef.current = null;
        setTimeout(() => setTransitioning(false), 150);
      }, 300);
    }
  }, [room, ownedTools, addMoneyFn, showMessage]);

  // River ship segment completion handler
  const handleRiverComplete = useCallback((result) => {
    const destBiome = riverSegment?.destBiome || null;
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
        enterRoom(room + 1, ownedTools, pendingDestBiomeRef.current);
        pendingDestBiomeRef.current = null;
        setTimeout(() => setTransitioning(false), 150);
      }, 300);
    }
  }, [room, ownedTools, addMoneyFn, showMessage, riverSegment]);

  const spawnFreeMerc = useCallback((mercType, hpFraction = 1) => {
    const wid = ++walkerIdCounter;
    const inDefense = !!defenseModeRef.current;
    const spawnX = inDefense ? 35 + Math.random() * 30 : 5 + Math.random() * 8;
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
      x: spawnX, y: inDefense ? 75 + Math.random() * 15 : 25 + Math.random() * 65, dir: inDefense ? -1 : 1,
      yDir: Math.random() < 0.5 ? 1 : -1, speed: mercType.speed, ySpeed: 0.008 + Math.random() * 0.012,
      minX: 5, maxX: 90, minY: 25, maxY: 92, bouncePhase: 0, alive: true, friendly: true,
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
    }
    // Complete the room transition — use pending biome from world map
    setRandomEvent(null);
    enterRoom(room + 1, ownedTools, pendingDestBiomeRef.current);
    pendingDestBiomeRef.current = null;
    setTimeout(() => setTransitioning(false), 150);
  }, [money, room, ownedTools, addMoneyFn, showMessage, spawnFreeMerc]);

  const openChest = () => {
    if (!chestPos) return;
    sfxChest();
    const newClicks = chestClicks + 1;
    setChestClicks(newClicks);

    // Spawn gold coin particles at chest position
    if (pixiRef.current) {
      const px = (chestPos.x / 100) * GAME_W;
      const py = (chestPos.y / 100) * GAME_H;
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

  // Collect a ground loot item
  const collectGroundLoot = (itemId) => {
    const item = groundLoot.find(i => i.id === itemId && !i.collected);
    if (!item) return;
    setGroundLoot(prev => prev.map(i => i.id === itemId ? { ...i, collected: true } : i));
    if (item.type === "coin") {
      addMoneyFn(item.value);
      const text = item.value.silver ? `+${item.value.silver} Ag` : `+${item.value.copper} Cu`;
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
      showMessage("Zdobyto: Miecz Pełni Księżyca! Załóż w ekwipunku.", "#d4a030");
    }
    // Small coin particle on pickup
    if (pixiRef.current) {
      const px = GAME_W * item.x / 100;
      const py = GAME_H * item.y / 100;
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
    const spawnX = spawnXOverride != null ? spawnXOverride : (mercCamp ? (mercCamp.x / 100) * 100 : 50);
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
      x: spawnX, y: 25 + Math.random() * 65, dir: Math.random() < 0.5 ? 1 : -1,
      yDir: Math.random() < 0.5 ? 1 : -1, speed: mercType.speed, ySpeed: 0.008 + Math.random() * 0.012,
      minX: 5, maxX: 90, minY: 25, maxY: 90, bouncePhase: 0, alive: true, friendly: true,
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
    }
    setBiomePoi(prev => prev ? { ...prev, used: true } : null);
  }, [biomePoi, addMoneyFn, showMessage, sfxChest]);

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
    const cdEnd = cooldowns[spell.id] || 0;
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
      if (hasRelic("chaos_blade")) dmg = Math.round(dmg * 1.40);
      dmg = Math.round(dmg * getKnowledgeBonus(npcData.id) * getKnowledgeMilestoneBonus());
      dmg = Math.round(dmg * perkSpellDmgMult);
      // Moonblade: bonus spell/skill damage (0-60%)
      if (equippedSaberRef.current === "moonblade" && moonbladeBonusRef.current) {
        dmg = Math.round(dmg * (1 + moonbladeBonusRef.current.spellBonus));
      }
      if (playerDoubleDmgRoomsRef.current > 0) dmg = Math.round(dmg * 2);

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
          setComboCounter(prev => prev + 1);
          setActiveCombo(combo);
          if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
          comboTimerRef.current = setTimeout(() => { setComboCounter(0); setActiveCombo(null); }, COMBO_STREAK_TIMEOUT);
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
      const spellDirX = wd ? (wd.x > 50 ? 1 : -1) : 1;

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
          wd._fearDir = wd.x > 50 ? 1 : -1; // flee away from center
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
      if (isHeadshot) { dmgLabel = `HEADSHOT! ${dmg}`; dmgColor = "#ff4040"; }
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
                addMoneyFn(ww.npcData.loot);
                if (hasRelic("golden_reaper")) addMoneyFn(ww.npcData.loot);
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
        rollAmmoDrop(); rollSaberDrop();
        const xpAmt = w.isBoss ? 100 : w.isElite ? 50 : 10 + roomRef.current * 2;
        grantXp(xpAmt);
        processKillStreak();

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
      const ammoCost = Math.max(1, spell.ammoCost.amount - _skStats.ammoCostReduction);
      setAmmo(prev => ({ ...prev, [spell.ammoCost.type]: (prev[spell.ammoCost.type] || 0) - ammoCost }));
    }
    {
      const finalCd = Math.round(_skStats.cooldown * perkCooldownMult);
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
        }
      );
    }

    // Projectile visuals are handled by ProjectileRenderer (PixiJS) —
    // no need for duplicate biomeAnimator canvas effects

    // Keep spell selected for repeated shots (don't deselect)
    // setSelectedSpell(null); -- removed: keep spell active for continuous skillshots
  }, [mana, cooldowns, showMessage, processSkillshotHit, spawnDmgPopup]);

  // ─── PANORAMIC SCROLLING: Drag to look around when no action selected ───
  const canPanScroll = !skillshotMode && !placingTrap && (!defenseMode || defenseMode.phase === "complete" || defenseMode.phase === "setup");

  // Convenience: wrap percentage position using current pan offset
  const wrapPctToScreen = useCallback(
    (pct) => _wrapPct(pct, panOffsetRef.current, GAME_W),
    [GAME_W]
  );

  const handlePanStart = useCallback((e) => {
    if (!canPanScroll) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    panRef.current = { dragging: true, startX: clientX, startOffset: panOffsetRef.current };
  }, [canPanScroll]);

  const handlePanMove = useCallback((e) => {
    if (!panRef.current.dragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const dx = (panRef.current.startX - clientX) / gameScale;
    const newOffset = panRef.current.startOffset + dx;
    panOffsetRef.current = newOffset;
    // Update PixiJS stage offset for NPCs/projectiles
    if (pixiRef.current) pixiRef.current.setPanOffset(newOffset);
    // Directly re-render canvas for smooth dragging (bypass React state)
    if (canvasRef.current && biome) {
      const c = canvasRef.current;
      const ctx = c.getContext("2d");
      renderBiome(ctx, biome, room, c.width, c.height, isNight, newOffset);
    }
  }, [gameScale, biome, room, isNight]);

  const handlePanEnd = useCallback(() => {
    panRef.current.dragging = false;
    // Sync React state with final offset
    setPanOffset(panOffsetRef.current);
    if (pixiRef.current) pixiRef.current.setPanOffset(panOffsetRef.current);
  }, []);

  // ─── SKILLSHOT: Canvas click handler for aiming ───
  const handleSkillshotClick = useCallback((e) => {
    if (!selectedSpell || !gameContainerRef.current) return;
    const spell = SPELLS.find(s => s.id === selectedSpell);
    if (!spell || !spell.skillshot) return;
    if (spell.id === "summon") return;

    // Get click position in game coordinates
    const gr = gameContainerRef.current.getBoundingClientRect();
    const clickX = (e.clientX - gr.left) / gameScale;
    const clickY = (e.clientY - gr.top) / gameScale;

    // Convert to physics pixel coordinates
    // The physics uses GAME_W/GAME_H coordinates
    castSkillshot(spell, clickX, clickY);
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
      return { x: (cx - gr.left) / gameScale, y: (cy - gr.top) / gameScale };
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
    rapidFireRef.current.lastPos = { x: (cx - gr.left) / gameScale, y: (cy - gr.top) / gameScale };
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
    const cursorX = ((cx - gr.left) / gameScale / GAME_W) * 100;
    const cursorY = ((cy - gr.top) / gameScale / GAME_H) * 100;
    setWandActive(true);
    wandOrbsRef.current = { active: true, startTime: Date.now(), cursorX, cursorY, hitCooldowns: {}, lastDrainTime: Date.now() };
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
    const cursorX = ((cx - gr.left) / gameScale / GAME_W) * 100;
    const cursorY = ((cy - gr.top) / gameScale / GAME_H) * 100;
    // Check initial resources
    if ((ammoRef.current.cannonball || 0) < 1) { showMessage("Brak kul armatnich!", "#c04040"); return; }
    if (manaRef.current < 5) { showMessage("Za mało prochu!", "#c0a060"); return; }
    setSalvaActive(true);
    salvaRef.current = { active: true, cursorX, cursorY, lastShotTime: 0 };
  }, [isSalvaMode, gameScale]);

  const moveSalva = useCallback((e) => {
    if (!salvaRef.current.active) return;
    const gr = gameContainerRef.current?.getBoundingClientRect();
    if (!gr) return;
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    salvaRef.current.cursorX = ((cx - gr.left) / gameScale / GAME_W) * 100;
    salvaRef.current.cursorY = ((cy - gr.top) / gameScale / GAME_H) * 100;
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
    const gx = (clientX - gr.left) / gameScale;
    const gy = (clientY - gr.top) / gameScale;
    return { x: (gx / GAME_W) * 100, y: (gy / GAME_H) * 100, px: gx, py: gy };
  }, [gameScale]);

  const saberCheckHits = useCallback((x, y) => {
    const spell = SPELLS.find(s => s.id === "saber");
    if (!spell) return;
    const saberData = getEquippedSaberData();
    const eff = saberData.effect;
    const hitRadius = 6; // % of screen
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
        if (hasRelic("chaos_blade")) dmg = Math.round(dmg * 1.40);
        if (isCrit) dmg = Math.round(dmg * 2.5);
        // Execute effect: 2x dmg below threshold
        if (eff?.type === "execute" && w.hp / w.maxHp <= eff.threshold) {
          dmg = Math.round(dmg * eff.multiplier);
          spawnDmgPopup(w.id, `EGZEKUCJA ${dmg}`, "#cc2020");
        } else if (isCrit) {
          spawnDmgPopup(w.id, `KRYTYCZNY! ${dmg}`, "#ff4040");
        } else {
          spawnDmgPopup(w.id, `${dmg}`, saberData.color);
        }
        const px = (d.x / 100) * GAME_W, py = (d.y / 100) * GAME_H;
        const slashDir = d.x > 50 ? 1 : -1;
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
          const kbDir = d.x > 50 ? 1 : -1;
          d.x = Math.max(5, Math.min(95, d.x + kbDir * eff.force * 3));
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
                const srcPx = (d.x / 100) * GAME_W, srcPy = (d.y / 100) * GAME_H;
                const tgtPx = (td.x / 100) * GAME_W, tgtPy = (td.y / 100) * GAME_H;
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
            if (physicsRef.current) physicsRef.current.triggerRagdoll(w.id, isCrit ? "saber_crit" : "saber", d.x > 50 ? 1 : -1);
            // Meteor boulder destruction: ground loot
            if (ww.isMeteorBoulder && meteorWaveRef.current) {
              spawnMeteorGroundLoot(meteorWaveRef.current.x, meteorWaveRef.current.y);
              meteorWaveRef.current = null;
              setMeteorite(null);
            } else {
              addMoneyFn(ww.npcData.loot);
            }
            setKills(k => k + 1);
            handleCardDrop(ww.npcData);
            rollAmmoDrop(); rollSaberDrop();
            grantXp(ww.isBoss ? 100 : ww.isElite ? 50 : 10 + roomRef.current * 2);
            processKillStreak();
            // Shadow saber: summon skeleton on kill
            if (eff?.type === "summon_skeleton") {
              setTimeout(() => {
                const nid = ++walkerIdCounter;
                const sx = d.x;
                const nHp = 40;
                const nDmg = 8;
                const nd = { icon: "skull", name: "Szkielet", hp: nHp, resist: null, loot: {}, bodyColor: "#c0b8a0", armorColor: "#8a7a60", bodyType: "humanoid", weapon: "sword" };
                setWalkers(pr => [...pr, { id: nid, npcData: nd, alive: true, dying: false, hp: nHp, maxHp: nHp, friendly: true }]);
                walkDataRef.current[nid] = { x: sx, y: 25 + Math.random() * 65, dir: 1, yDir: 1, speed: 0.3, ySpeed: 0.01, minX: 5, maxX: 90, minY: 25, maxY: 90, bouncePhase: 0, alive: true, friendly: true, damage: nDmg, attackCd: 2000, lungeFrames: 0, lungeOffset: 0, combatStyle: "melee", mercType: "skeleton", range: 35 };
                if (physicsRef.current) physicsRef.current.spawnNpc(nid, sx, nd, true);
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

  // ─── OBSTACLE DAMAGE ───
  const damageObstacle = useCallback((obsId, damage, element) => {
    setObstacles(prev => prev.map(obs => {
      if (obs.id !== obsId || !obs.destructible || obs.destroying || obs.hp <= 0) return obs;
      const matDef = OBSTACLE_MATERIALS[obs.material] || OBSTACLE_MATERIALS.wood;
      let dmg = damage;
      // Element weakness: 2x damage
      if (matDef.weakTo && matDef.weakTo === element) dmg = Math.round(dmg * WEAKNESS_MULT);
      // Element resistance: 0.25x damage
      if (matDef.resistTo && matDef.resistTo === element) dmg = Math.round(dmg * OBS_RESIST_MULT);
      const newHp = Math.max(0, obs.hp - dmg);
      const px = (obs.x / 100) * GAME_W;
      const py = GAME_H - (obs.y / 100) * GAME_H;
      // Hit spark effect on every hit
      if (pixiRef.current) {
        pixiRef.current.spawnObstacleHitSpark(px, py, matDef.color);
        // Ground mark at impact point
        pixiRef.current.addGroundMark(px, py, element, dmg);
      }
      if (newHp <= 0) {
        // ─── DESTRUCTION ───
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
          pixiRef.current.screenShake(matDef.shakeIntensity || 3);
          // Persistent debris fragments
          pixiRef.current.spawnDebris(obs.material, px, py);
        }
        // Drop loot
        if (obs.loot && Object.keys(obs.loot).length > 0) {
          addMoneyFn(obs.loot);
          if (pixiRef.current) pixiRef.current.spawnGoldCoins(px, py, 0.4);
        }
        // Chain reactions — fire spreads to wood, lightning chains to metal, etc.
        if (element) {
          const chainTargets = findChainTargets(element, obs.x, obs.y, prev, obsId);
          const chainDmg = getChainDamage(element, damage);
          const chainDelay = getChainDelay(element);
          if (chainTargets.length > 0 && chainDmg > 0) {
            setTimeout(() => {
              for (const target of chainTargets) {
                damageObstacle(target.id, chainDmg, element);
              }
            }, chainDelay);
          }
        }
        // Mark as destroying for fade-out animation, then remove after delay
        setTimeout(() => {
          setObstacles(p => p.filter(o => o.id !== obsId));
        }, 400);
        return { ...obs, hp: 0, destroying: true, hitAnim: Date.now() };
      }
      return { ...obs, hp: newHp, hitAnim: Date.now() };
    }));
  }, [addMoneyFn]);

  // Check obstacle hits during saber swipe
  const saberCheckObstacleHits = useCallback((x, y) => {
    const saberData = getEquippedSaberData();
    const hitRadius = 7; // slightly larger than NPC hit radius
    for (const obs of obstaclesRef.current) {
      if (!obs.destructible || obs.hp <= 0 || obs.destroying) continue;
      if (saberHitIdsRef.current.has(`obs_${obs.id}`)) continue;
      const dx = obs.x - x, dy = (100 - obs.y) - y; // convert bottom% to top%
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
        const px = (obs.x / 100) * GAME_W;
        const py = GAME_H - (obs.y / 100) * GAME_H;
        if (pixiRef.current) pixiRef.current.spawnMeleeSparks(px, py, x > obs.x ? 1 : -1);
      }
    }
  }, [damageObstacle]);

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
  }, [isSaberMode, saberGetGamePos, saberCheckHits, saberCheckObstacleHits]);

  const handleSaberMove = useCallback((e) => {
    if (!saberSwipingRef.current) return;
    e.preventDefault();
    const pos = saberGetGamePos(e);
    if (!pos) return;
    saberPointsRef.current.push({ x: pos.x, y: pos.y, time: Date.now() });
    setSaberTrail(prev => [...prev, { x: pos.px, y: pos.py }].slice(-30));
    saberCheckHits(pos.x, pos.y);
    saberCheckObstacleHits(pos.x, pos.y);
  }, [saberGetGamePos, saberCheckHits, saberCheckObstacleHits]);

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
    // Convert click position to percentage
    const xPct = (clickX / GAME_W) * 100;
    const yPct = (clickY / GAME_H) * 100;
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
      const finalCd = Math.round(uStats.cooldown * perkCooldownMult);
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
      // chaos_blade: +40% spell damage
      if (hasRelic("chaos_blade")) damage = Math.round(damage * 1.40);
      // Knowledge bonus: extra damage for discovered NPCs + milestone bonus
      damage = Math.round(damage * getKnowledgeBonus(npcData.id) * getKnowledgeMilestoneBonus());
      // Perk: spell damage multiplier
      damage = Math.round(damage * perkSpellDmgMult);
      // Risk event: player double damage
      if (playerDoubleDmgRoomsRef.current > 0) damage = Math.round(damage * 2);
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
          setComboCounter(prev => prev + 1);
          setActiveCombo(combo);
          if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
          comboTimerRef.current = setTimeout(() => { setComboCounter(0); setActiveCombo(null); }, COMBO_STREAK_TIMEOUT);
        }
      }
      if (spell.element) elementDebuffs.current[wid] = { element: spell.element, timestamp: Date.now() };
      const wd = walkDataRef.current[wid];
      const spellDirX = wd ? (wd.x > 50 ? 1 : -1) : 1;

      const weatherBoosted = weatherRef.current?.damageMult?.[spell.element] > 1;
      const weatherNerfed = weatherRef.current?.damageMult?.[spell.element] < 1;

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
              addMoneyFn(w.npcData.loot);
              if (hasRelic("golden_reaper")) addMoneyFn(w.npcData.loot);
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
          rollAmmoDrop(); rollSaberDrop();
          // XP grant on kill
          const xpAmt = w.isBoss ? 100 : w.isElite ? 50 : 10 + roomRef.current * 2;
          grantXp(xpAmt);
          // Kill streak
          processKillStreak();
          // necromancer: 10% chance to spawn temp friendly
          if (hasRelic("necromancer") && Math.random() < 0.10) {
            const mt = MERCENARY_TYPES[Math.floor(Math.random() * MERCENARY_TYPES.length)];
            setTimeout(() => {
              const nid = ++walkerIdCounter;
              const sx = walkDataRef.current[wid]?.x || 50;
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
      const finalCd = Math.round(uStats.cooldown * perkCooldownMult);
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
        if (hasRelic("chaos_blade")) damage = Math.round(damage * 1.40);
        damage = Math.round(damage * getKnowledgeBonus(npcData.id) * getKnowledgeMilestoneBonus());
        damage = Math.round(damage * perkSpellDmgMult);
        if (playerDoubleDmgRoomsRef.current > 0) damage = Math.round(damage * 2);
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
            setComboCounter(prev => prev + 1);
            setActiveCombo(combo);
            if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
            comboTimerRef.current = setTimeout(() => { setComboCounter(0); setActiveCombo(null); }, COMBO_STREAK_TIMEOUT);
          }
        }
        if (spell.element) elementDebuffs.current[w.id] = { element: spell.element, timestamp: Date.now() };
        const wd = walkDataRef.current[w.id];
        const spellDirX = wd ? (wd.x > 50 ? 1 : -1) : 1;

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
          rollAmmoDrop(); rollSaberDrop();
          const xpAmt = w.isBoss ? 100 : w.isElite ? 50 : 10 + roomRef.current * 2;
          grantXp(xpAmt);
          processKillStreak();
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
        const tx = ((r.left + r.width / 2) - gr.left) / gameScale;
        const ty = ((r.top + r.height / 2) - gr.top) / gameScale;
        castSkillshot(spell, tx, ty);
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
      // Escape to cancel selection + skillshot mode + trap placement
      if (e.key === "Escape") {
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

  const rollAmmoDrop = () => {
    for (const drop of AMMO_DROP_TABLE) {
      if (Math.random() < drop.chance) {
        setAmmo(prev => ({ ...prev, [drop.type]: (prev[drop.type] || 0) + drop.amount }));
        const ammoLabels = { dynamite: "Dynamit", harpoon: "Harpun", cannonball: "Kula armatnia", rum: "Rum", chain: "Łańcuch" };
        showMessage(`+${drop.amount} ${ammoLabels[drop.type]}!`, "#e0a040");
        return;
      }
    }
  };

  // 8% chance to drop a saber from monster kills
  const rollSaberDrop = () => {
    if (Math.random() > 0.08) return;
    const unowned = SABERS.filter(s => !s.starter && !s.dropOnly && !ownedSabersRef.current.includes(s.id));
    if (unowned.length === 0) return;
    const saber = unowned[Math.floor(Math.random() * unowned.length)];
    setOwnedSabers(prev => {
      if (prev.includes(saber.id)) return prev;
      return [...prev, saber.id];
    });
    showMessage(`Zdobyto szabl\u0119: ${saber.name}! Załóż w ekwipunku.`, saber.color);
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

  const togglePanel = (p) => setPanel(prev => prev === p ? null : p);
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
    const totalGold = s.totalGoldEarned;
    const tc = totalCopper(s.money);
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
        onClick={placingTrap ? handleTrapPlaceClick : (skillshotMode && !isSaberMode && !isRapidFireMode && !isWandMode && !isSalvaMode) ? handleSkillshotClick : undefined}
        onMouseDown={isSaberMode ? handleSaberDown : isRapidFireMode ? startRapidFire : isWandMode ? startWand : isSalvaMode ? startSalva : canPanScroll ? handlePanStart : undefined}
        onMouseMove={(e) => { if (panRef.current.dragging) { handlePanMove(e); return; } if (isSaberMode) handleSaberMove(e); else if (isRapidFireMode) moveRapidFire(e); if (salvaRef.current.active) moveSalva(e); if (wandOrbsRef.current.active && gameContainerRef.current) { const gr = gameContainerRef.current.getBoundingClientRect(); const cx = e.clientX; const cy = e.clientY; wandOrbsRef.current.cursorX = ((cx - gr.left) / gameScale / GAME_W) * 100; wandOrbsRef.current.cursorY = ((cy - gr.top) / gameScale / GAME_H) * 100; } }}
        onMouseUp={panRef.current.dragging ? handlePanEnd : isSaberMode ? handleSaberUp : isRapidFireMode ? stopRapidFire : isWandMode ? stopWand : isSalvaMode ? stopSalva : undefined}
        onMouseLeave={(e) => { handlePanEnd(); if (isSaberMode) handleSaberUp(e); else if (isRapidFireMode) stopRapidFire(e); else if (isWandMode) stopWand(e); else if (isSalvaMode) stopSalva(e); }}
        onTouchStart={isSaberMode ? handleSaberDown : isRapidFireMode ? startRapidFire : isWandMode ? startWand : isSalvaMode ? startSalva : canPanScroll ? handlePanStart : undefined}
        onTouchMove={(e) => { if (panRef.current.dragging) { handlePanMove(e); return; } if (isSaberMode) handleSaberMove(e); else if (isRapidFireMode) moveRapidFire(e); if (salvaRef.current.active && e.touches[0]) moveSalva(e); if (wandOrbsRef.current.active && gameContainerRef.current && e.touches[0]) { const gr = gameContainerRef.current.getBoundingClientRect(); const cx = e.touches[0].clientX; const cy = e.touches[0].clientY; wandOrbsRef.current.cursorX = ((cx - gr.left) / gameScale / GAME_W) * 100; wandOrbsRef.current.cursorY = ((cy - gr.top) / gameScale / GAME_H) * 100; } }}
        onTouchEnd={panRef.current.dragging ? handlePanEnd : isSaberMode ? handleSaberUp : isRapidFireMode ? stopRapidFire : isWandMode ? stopWand : isSalvaMode ? stopSalva : undefined}
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
      <canvas ref={canvasRef} style={{ position: "absolute", top: 0, left: 0, width: GAME_W, height: GAME_H }} />
      <canvas ref={animCanvasRef} style={{ position: "absolute", top: 0, left: 0, width: GAME_W, height: GAME_H, pointerEvents: "none" }} />
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
          Etap #{room} — <Icon name={biome.icon} size={14} /> {biome.name}{isNight ? <>{" "}<Icon name="moon" size={14} /></> : ""}{weather ? <>{" "}<Icon name={weather.icon} size={14} /></> : ""}{defenseMode ? <>{" "}<Icon name="swords" size={14} /> OBRONA</> : ""}{ghostShipActive ? <>{" "}<Icon name="ghost" size={14} /> WIDMOWY STATEK</> : ""}
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
        const centerX = (wo.cursorX / 100) * GAME_W;
        const centerY = (wo.cursorY / 100) * GAME_H;
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
        const cx = (sv.cursorX / 100) * GAME_W;
        const cy = (sv.cursorY / 100) * GAME_H;
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
        <div key={pt.id} style={{
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
      <WeatherOverlay weather={weather} />

      {/* Caravan moved to bottom bar above SpellBar */}

      {showChest && (() => {
        const cx = wrapPctToScreen(chestPos?.x ?? 50);
        return cx !== null ? <Chest pos={{ ...chestPos, x: cx }} onClick={openChest} clicks={chestClicks} maxClicks={CLICKS_TO_OPEN} /> : null;
      })()}

      {/* Meteorite event – falling from sky */}
      {meteorite && meteorite.phase === "falling" && (
        <div style={{
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

      {/* Meteor boulder HP bar — shows above the destructible meteor NPC */}
      {meteorite && meteorite.phase === "active" && (() => {
        const mBoulder = walkers.find(w => w.isMeteorBoulder && w.alive && !w.dying);
        if (!mBoulder) return null;
        const hpPct = mBoulder.hp / mBoulder.maxHp;
        const hpColor = hpPct > 0.5 ? "#ff6020" : hpPct > 0.25 ? "#ff4020" : "#cc2020";
        return (
          <div style={{
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
      {groundLoot.filter(i => !i.collected).map(item => (
        <div key={item.id} onClick={() => collectGroundLoot(item.id)} style={{
          position: "absolute", left: `${wrapPctToScreen(item.x) ?? item.x}%`, top: `${item.y}%`, zIndex: 15,
          cursor: "pointer", userSelect: "none",
          animation: "meteorPulse 2s ease-in-out infinite",
          transform: "translate(-50%, -50%)",
        }}>
          <div style={{
            width: (item.type === "treasure" || item.type === "moonblade_saber") ? 32 : 24,
            height: (item.type === "treasure" || item.type === "moonblade_saber") ? 32 : 24,
            filter: (item.type === "treasure" || item.type === "moonblade_saber")
              ? "drop-shadow(0 0 8px rgba(255,200,0,0.8))"
              : "drop-shadow(0 0 4px rgba(255,180,0,0.5))",
          }}>
            <Icon name={item.icon} size={(item.type === "treasure" || item.type === "moonblade_saber") ? 28 : 20} />
          </div>
          <div style={{
            fontSize: 8, color: (item.type === "treasure" || item.type === "moonblade_saber") ? "#ffd700" : "#e0c080",
            textAlign: "center", textShadow: "0 1px 2px #000",
            marginTop: -2,
          }}>
            {item.label}
          </div>
        </div>
      ))}

      {/* Resource node – hold to mine */}
      {showResource && resourceNode && (() => {
        const crackStage = Math.min(3, Math.floor(miningProgress * 4));
        const isMining = miningProgress > 0;
        const res = resourceNode.resource;
        const mineTimeSec = MINE_TIMES[res?.rarity] || 2;
        return (
          <div
            onMouseDown={startMining}
            onMouseUp={stopMining}
            onMouseLeave={stopMining}
            onTouchStart={startMining}
            onTouchEnd={stopMining}
            style={{
              position: "absolute", left: `${wrapPctToScreen(resourceNode.pos.x) ?? resourceNode.pos.x}%`, top: `${resourceNode.pos.y}%`, zIndex: 15,
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
        <div style={{
          position: "absolute", left: `${wrapPctToScreen(fruitTree.x) ?? fruitTree.x}%`, bottom: "12%", zIndex: 14,
          transform: "translateX(-50%)", userSelect: "none",
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
        <div style={{
          position: "absolute", left: `${wrapPctToScreen(mineNugget.x) ?? mineNugget.x}%`, bottom: "12%", zIndex: 14,
          transform: "translateX(-50%)", userSelect: "none",
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
        <div style={{
          position: "absolute", left: `${wrapPctToScreen(waterfall.x) ?? waterfall.x}%`, bottom: "12%", zIndex: 13,
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
        <div style={{
          position: "absolute", left: `${wrapPctToScreen(mercCamp.x) ?? mercCamp.x}%`, bottom: "12%", zIndex: 14,
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
      {biome?.id === "city" && (
        <>
          {/* Merchant building */}
          <div
            onClick={() => togglePanel("shop")}
            style={{
              position: "absolute", left: "20%", bottom: "10%", zIndex: 14,
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

          {/* Hideout building */}
          <div
            onClick={() => togglePanel("hideout")}
            style={{
              position: "absolute", left: "78%", bottom: "10%", zIndex: 14,
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
        </>
      )}

      {/* ─── ARSENAL TENT POI ─── */}
      {wizardPoi && (() => {
        const ammoIcons = { dynamite: "dynamite", harpoon: "harpoon", cannonball: "cannon", rum: "rum", chain: "ricochet" };
        const ammoNames = { dynamite: "Dynamit", harpoon: "Harpuny", cannonball: "Kule armatnie", rum: "Rum", chain: "Łańcuchy" };
        const ammoIcon = ammoIcons[wizardPoi.ammoType] || "dynamite";
        return (
          <div style={{
            position: "absolute", left: `${wrapPctToScreen(wizardPoi.x) ?? wizardPoi.x}%`, bottom: "12%", zIndex: 14,
            transform: "translateX(-50%)", userSelect: "none", textAlign: "center",
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
        const bpx = wrapPctToScreen(biomePoi.x);
        if (bpx === null) return null;
        const poiColors = {
          healing_spring: "#40e060", shipwreck_cache: "#ffd700", oasis: "#40c0ff",
          ice_crystal: "#80c0ff", black_market: "#c0a060", fire_shrine: "#ff6020",
          camp_rest: "#e0c060", mushroom_circle: "#a060c0", fairy_well: "#e0c0ff",
          spore_cloud: "#44ff44", witch_hut: "#8a4090", treasure_map: "#ffd700",
          zen_shrine: "#80e0a0", pearl_oyster: "#c0c0e0",
        };
        const col = poiColors[biomePoi.type] || "#c0a060";
        return (
          <div style={{
            position: "absolute", left: `${bpx}%`, bottom: "12%", zIndex: 14,
            transform: "translateX(-50%)", userSelect: "none", textAlign: "center",
          }}>
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
            <div style={{
              fontSize: 9, color: col, fontWeight: "bold", marginTop: 3,
              textShadow: "1px 1px 0 #000", whiteSpace: "nowrap",
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

      {/* ─── DESTRUCTIBLE OBSTACLES ─── */}
      {obstacles.map(obs => {
        const obsStyles = {
          fallen_log: { w: 50, h: 14, bg: "linear-gradient(90deg,#5a3a18,#6a4a20,#4a3010)", radius: "4px", shadow: "0 2px 6px rgba(0,0,0,0.5)" },
          vine_wall: { w: 30, h: 40, bg: "linear-gradient(180deg,#2a6a10,#1a4a08,#0e3004)", radius: "6px 6px 2px 2px", shadow: "0 2px 8px rgba(0,0,0,0.4)" },
          ancient_totem: { w: 16, h: 44, bg: "linear-gradient(180deg,#6a5030,#5a4020,#4a3018)", radius: "4px 4px 2px 2px", shadow: "0 2px 8px rgba(0,0,0,0.5)" },
          moss_boulder: { w: 36, h: 28, bg: "radial-gradient(ellipse,#5a6a30,#4a5a20,#3a4a18)", radius: "40%", shadow: "inset -3px 0 6px rgba(0,0,0,0.3), 0 3px 8px rgba(0,0,0,0.5)" },
          shipwreck: { w: 55, h: 30, bg: "linear-gradient(180deg,#6a5030,#4a3818,#3a2810)", radius: "8px 20px 4px 4px", shadow: "0 3px 10px rgba(0,0,0,0.5)" },
          driftwood: { w: 44, h: 10, bg: "linear-gradient(90deg,#7a6a50,#8a7a60,#6a5a40)", radius: "3px", shadow: "0 2px 4px rgba(0,0,0,0.4)" },
          tide_pool: { w: 32, h: 16, bg: "radial-gradient(ellipse,rgba(80,180,220,0.6),rgba(40,120,180,0.3))", radius: "50%", shadow: "0 0 8px rgba(60,160,220,0.3)" },
          anchor_post: { w: 12, h: 38, bg: "linear-gradient(180deg,#5a5a5a,#4a4a4a,#3a3a3a)", radius: "2px", shadow: "0 2px 6px rgba(0,0,0,0.5)" },
          cactus_cluster: { w: 20, h: 36, bg: "linear-gradient(180deg,#3a7a20,#2a6a18,#1a5a10)", radius: "8px 8px 2px 2px", shadow: "0 2px 6px rgba(0,0,0,0.4)" },
          wagon_wreck: { w: 48, h: 28, bg: "linear-gradient(180deg,#6a4a20,#5a3a18,#3a2808)", radius: "4px", shadow: "0 3px 8px rgba(0,0,0,0.5)" },
          sun_bleached_skull: { w: 22, h: 18, bg: "radial-gradient(ellipse,#d8c8a0,#c0b080,#a09060)", radius: "40%", shadow: "0 2px 4px rgba(0,0,0,0.4)" },
          tumbleweed: { w: 24, h: 22, bg: "radial-gradient(circle,#8a7a50,#6a6040,#5a5030)", radius: "50%", shadow: "0 1px 3px rgba(0,0,0,0.3)" },
          ice_pillar: { w: 14, h: 42, bg: "linear-gradient(180deg,#b0d0f0,#90b8e0,#70a0d0)", radius: "4px 4px 2px 2px", shadow: "0 0 10px rgba(160,200,255,0.3), 0 3px 8px rgba(0,0,0,0.4)" },
          frozen_barrel: { w: 24, h: 28, bg: "linear-gradient(180deg,#8090a0,#607080,#405060)", radius: "4px", shadow: "0 2px 6px rgba(0,0,0,0.5)" },
          snowdrift: { w: 40, h: 16, bg: "radial-gradient(ellipse,#e8f0ff,#d0e0f0,#b0c8e0)", radius: "40%", shadow: "0 2px 4px rgba(0,0,0,0.2)" },
          icicle_rock: { w: 30, h: 32, bg: "linear-gradient(180deg,#90b0d0,#7090b0,#506a8a)", radius: "20%", shadow: "inset -2px 0 6px rgba(0,0,0,0.2), 0 3px 8px rgba(0,0,0,0.4)" },
          market_stall: { w: 40, h: 32, bg: "linear-gradient(180deg,#8a4020,#6a3018,#4a2010)", radius: "4px", shadow: "0 3px 8px rgba(0,0,0,0.5)" },
          broken_wagon: { w: 50, h: 24, bg: "linear-gradient(180deg,#5a4030,#4a3020,#3a2018)", radius: "4px", shadow: "0 3px 8px rgba(0,0,0,0.5)" },
          lamp_post: { w: 8, h: 48, bg: "linear-gradient(180deg,#4a4a4a,#3a3a3a,#2a2a2a)", radius: "2px", shadow: "0 2px 4px rgba(0,0,0,0.5)" },
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
        // HP bar color: green → yellow → red
        const hpColor = hpPct > 0.5 ? `rgb(${Math.round(255 * (1 - hpPct) * 2)},200,40)` : `rgb(255,${Math.round(200 * hpPct * 2)},40)`;

        const screenX = wrapPctToScreen(obs.x);
        if (screenX === null) return null;
        return (
          <div key={`obs-${obs.id}`} style={{
            position: "absolute",
            left: `${screenX}%`,
            bottom: `${obs.y}%`,
            zIndex: 10 + zIndexAtDepth(depthFromY(100 - obs.y)),
            transform: `translateX(-50%) translateX(${shakeX}px) scale(${scaleAtDepth(depthFromY(100 - obs.y))})`,
            transition: isDestroying ? "opacity 0.35s ease-out, transform 0.35s ease-out" : "none",
            opacity: isDestroying ? 0 : 1,
            pointerEvents: "none",
          }}>
            {/* Main obstacle body */}
            <div style={{
              width: s.w,
              height: s.h,
              background: s.bg,
              borderRadius: s.radius,
              boxShadow: isHit
                ? `${s.shadow}, 0 0 8px rgba(255,200,100,0.6)`
                : s.shadow,
              position: "relative",
              overflow: "hidden",
              transform: isDestroying ? "scale(1.3)" : "none",
              transition: isDestroying ? "transform 0.35s ease-out" : "none",
              opacity: damaged ? 0.6 + hpPct * 0.35 : 0.85,
              border: obs.destructible && !isDestroying
                ? `1.5px solid rgba(255,255,255,${damaged ? 0.3 + crackIntensity * 0.15 : 0.18})`
                : "none",
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

      {/* (Barrels removed — explosive obstacles are part of biome obstacles now) */}

      {/* ─── WALKING NPCs (DOM hitboxes – visual rendering on physics canvas) ─── */}
      {walkers.map(w => {
        if (!w.alive && !w.dying) return null;
        const isFriendly = w.friendly;
        const isBossWalker = w.isBoss;
        const bossScale = isBossWalker ? 1.6 : 1;
        // Fog: reduce enemy DOM div opacity based on walkData position
        let fogAlpha = 1;
        if (weather?.fogVisibility && !isFriendly) {
          const wd = walkDataRef.current[w.id];
          if (wd) {
            const distPct = Math.abs(wd.x - 20) / 100; // player at ~20%
            fogAlpha = distPct < weather.fogVisibility ? 1.0
              : distPct < weather.fogVisibility * 2 ? 1.0 - ((distPct - weather.fogVisibility) / weather.fogVisibility)
              : 0.05;
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
              zIndex: isBossWalker ? 12 : 11,
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

      {/* Bottom bar: Caravan + Spell Bar – fixed to viewport bottom, OUTSIDE game container */}
      <div style={{
        position: "fixed", bottom: 0, left: isMobile ? 0 : "50%",
        right: isMobile ? 0 : "auto",
        transform: isMobile ? "none" : "translateX(-50%)",
        zIndex: 9000, display: "flex", flexDirection: "column",
      }}>
        <Caravan
          initiative={initiative}
          maxInitiative={MAX_INITIATIVE}
          cost={CARAVAN_COST}
          canTravel={initiative >= CARAVAN_COST && (!defenseMode || defenseMode.phase === "complete") && !activeBoss && !walkers.some(w => !w.friendly && w.alive && !w.dying) && !riverSegment && !worldMap && !riverMapOpen}
          onClick={travelCaravan}
          hp={caravanHp}
          maxHp={CARAVAN_LEVELS[caravanLevel].hp}
          showHp={caravanHp < CARAVAN_LEVELS[caravanLevel].hp || (!!defenseMode && defenseMode.phase !== "complete")}
          caravanName={CARAVAN_LEVELS[caravanLevel].name}
          caravanLevel={caravanLevel}
          thornArmor={CARAVAN_LEVELS[caravanLevel].thornArmor}
          warDrums={CARAVAN_LEVELS[caravanLevel].warDrums}
          isMobile={isMobile}
        />
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
              return (
                <div key={npc.id} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 10px", marginBottom: 4,
                  border: `2px solid ${discovered ? "#3a2818" : "#1a1210"}`,
                  background: discovered ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.3)",
                  opacity: discovered ? 1 : 0.4,
                  filter: discovered ? "none" : "grayscale(100%)",
                }}>
                  <span>{discovered ? <NpcIcon bodyType={npc.bodyType} bodyColor={npc.bodyColor} armorColor={npc.armorColor} size={28} /> : <Icon name="question" size={28} />}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontWeight: "bold", fontSize: 14,
                      color: discovered ? "#d8c8a8" : "#444",
                    }}>
                      {discovered ? npc.name : "???"}
                    </div>
                    {discovered && (
                      <div style={{ fontSize: 11, color: "#888" }}>
                        HP: {npc.hp}
                        {npc.resist && <> | Odporność: <Icon name={npc.resist === "fire" ? "fire" : "ice"} size={11} /></>}
                        {npc.loot && <> | Łup: {formatLootText(npc.loot)}</>}
                      </div>
                    )}
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: "bold",
                    color: discovered ? RARITY_C[npc.rarity] : "#444",
                    border: `1px solid ${discovered ? RARITY_C[npc.rarity] + "40" : "#222"}`,
                    padding: "2px 6px",
                  }}>
                    {discovered ? RARITY_L[npc.rarity] : "???"}
                  </span>
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
          {secretRoom.puzzle.type === "trade" ? (
            secretRoom.puzzle.trades.map((trade, i) => (
              <button key={i} onClick={() => {
                if (trade.cost.caravanHp) setCaravanHp(prev => Math.max(1, prev - trade.cost.caravanHp));
                if (trade.cost.mana) setMana(prev => Math.max(0, prev - trade.cost.mana));
                if (trade.cost.silver) setMoney(prev => copperToMoney(Math.max(0, totalCopper(prev) - trade.cost.silver * 100)));
                if (trade.reward.permDmgBuff) showMessage(`Permanentny bonus: +${trade.reward.permDmgBuff * 100}% obrażeń!`, "#a050e0");
                if (trade.reward.artifact) {
                  const allPieces = ARTIFACT_SETS.flatMap(s => s.pieces).filter(p => !ownedArtifacts.includes(p.id));
                  if (allPieces.length > 0) {
                    const piece = allPieces[Math.floor(Math.random() * allPieces.length)];
                    setOwnedArtifacts(prev => [...prev, piece.id]);
                    addDiscovery("artifacts", { id: piece.id, name: piece.name });
                    showMessage(`Znaleziono artefakt: ${piece.name}!`, "#d4a030");
                  }
                }
                setSecretRoom(null);
              }} style={{ display: "block", width: "100%", marginBottom: 6, padding: "8px 12px", background: "none", border: "1px solid #6040a0", color: "#c0a0ff", fontSize: 12, cursor: "pointer", textAlign: "left" }}>
                Ofiaruj {trade.offer} → {trade.rewardDesc}
              </button>
            ))
          ) : (
            <button onClick={() => {
              const success = Math.random() < (1 / secretRoom.puzzle.difficulty);
              if (success) {
                const r = secretRoom.puzzle.reward;
                if (r.copper) addMoneyFn({ copper: r.copper });
                if (r.gold) addMoneyFn({ gold: r.gold });
                if (r.silver) addMoneyFn({ silver: r.silver });
                if (r.knowledge) { setKnowledge(prev => prev + r.knowledge); }
                if (r.artifact) {
                  const allPieces = ARTIFACT_SETS.flatMap(s => s.pieces).filter(p => !ownedArtifacts.includes(p.id));
                  if (allPieces.length > 0) {
                    const piece = allPieces[Math.floor(Math.random() * allPieces.length)];
                    setOwnedArtifacts(prev => [...prev, piece.id]);
                    addDiscovery("artifacts", { id: piece.id, name: piece.name });
                    showMessage(`Artefakt: ${piece.name}!`, "#d4a030");
                  }
                }
                showMessage("Zagadka rozwiązana!", "#40c040");
              } else {
                const pen = secretRoom.puzzle.failPenalty;
                if (pen.caravanDmg) setCaravanHp(prev => Math.max(1, prev - pen.caravanDmg));
                if (pen.manaLoss) setMana(prev => Math.max(0, prev - pen.manaLoss));
                if (pen.copperLoss) setMoney(prev => copperToMoney(Math.max(0, totalCopper(prev) - pen.copperLoss)));
                showMessage("Nie udało się...", "#cc4040");
              }
              setSecretRoom(null);
            }} style={{ padding: "8px 16px", background: "none", border: "1px solid #c0a0ff", color: "#c0a0ff", fontSize: 13, cursor: "pointer" }}>
              Spróbuj rozwiązać! (szansa: {Math.round(100 / secretRoom.puzzle.difficulty)}%)
            </button>
          )}
          <button onClick={() => setSecretRoom(null)} style={{ marginTop: 8, padding: "6px 12px", background: "none", border: "1px solid #555", color: "#888", fontSize: 11, cursor: "pointer" }}>
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
                setTimeout(() => { enterRoom(room + 1, ownedTools, pendingDestBiomeRef.current); pendingDestBiomeRef.current = null; setTimeout(() => setTransitioning(false), 150); }, 300);
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
              if (eff.type === "loot") addMoneyFn({ copper: 40 + Math.floor(Math.random() * 40) });
              if (eff.type === "buff") {
                if (eff.manaRestore) setMana(prev => Math.min(prev + eff.manaRestore, MAX_MANA));
                if (eff.initiativeBoost) setInitiative(prev => Math.min(MAX_INITIATIVE, prev + eff.initiativeBoost));
              }
              showMessage(seaEvent.resultText, seaEvent.themeColor);
              setSeaEvent(null);
              // Resume travel after sea event — use pending biome from world map
              setTimeout(() => { enterRoom(room + 1, ownedTools, pendingDestBiomeRef.current); pendingDestBiomeRef.current = null; setTimeout(() => setTransitioning(false), 150); }, 300);
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
        @keyframes mineShake{0%{transform:translate(-1px,-1px) rotate(-1deg)}100%{transform:translate(1px,1px) rotate(1deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes meteorPulse{0%,100%{transform:scale(1);filter:drop-shadow(0 0 14px rgba(255,100,20,0.7))}50%{transform:scale(1.15);filter:drop-shadow(0 0 24px rgba(255,60,0,0.9))}}
        @keyframes meteorFall{0%{transform:translateY(-72px) rotate(-30deg);opacity:0}10%{opacity:1}100%{transform:translateY(var(--meteor-land-y)) rotate(15deg);opacity:1}}
        @keyframes screenShake{0%{transform:translate(-1px,-0.5px)}25%{transform:translate(1px,0.5px)}50%{transform:translate(-0.5px,1px)}75%{transform:translate(0.5px,-1px)}100%{transform:translate(-0.5px,0.5px)}}
        @keyframes meteorFlash{0%{opacity:1}100%{opacity:0}}
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
