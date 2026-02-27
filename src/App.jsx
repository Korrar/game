import { useState, useRef, useEffect, useCallback } from "react";
import { BIOMES } from "./data/biomes";
import { RARITY_C, RARITY_L } from "./data/treasures";
import { rollCardDrop, ALL_NPCS, BIOME_NAMES } from "./data/bestiary";
import { HIDEOUT_LEVELS } from "./data/hideout";
import { CARAVAN_LEVELS } from "./data/caravanLevels";
import { KNIGHT_LEVELS } from "./data/knightLevels";
import { MERCENARY_TYPES } from "./data/mercenaries";
import { SHOP_TOOLS, MANA_POTIONS, pickResource, MINE_TIMES } from "./data/shopItems";
import { pickNpc, SPELLS, RESIST_NAMES } from "./data/npcs";
import { totalCopper, copperToMoney, pickTreasure, formatValHTML } from "./utils/helpers";
import { rollRandomEvent } from "./data/randomEvents";
import { rollWeather, applyWeatherDamage } from "./data/weather";
import { renderBiome } from "./renderers/biomeRenderers";
import { renderVault } from "./renderers/vaultRenderer";
import { BiomeAnimator } from "./renderers/biomeAnimator";
import { PhysicsWorld } from "./physics/PhysicsWorld";
import {
  startMusic, toggleMusic, changeBiomeMusic, sfxDoor, sfxChest, sfxSell,
  sfxStore, sfxRetrieve, sfxUpgrade, sfxGather, sfxBuy,
  sfxFireball, sfxLightning, sfxIceLance, sfxShadowBolt, sfxHolyBeam,
  sfxNpcDeath, sfxDrinkMana, sfxSummon, sfxRecruit, sfxMeleeHit, sfxMeteorFall, sfxMeteorImpact,
  sfxEventAppear, sfxMerchant, sfxAmbush, sfxRiddle, sfxAltar, sfxEventSuccess, sfxEventFail,
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
import WaveOverlay from "./components/WaveOverlay";
import WeatherOverlay from "./components/WeatherOverlay";
import Chest from "./components/Chest";
import RelicPicker from "./components/RelicPicker";
import { RELICS } from "./data/relics";
import { getBossForRoom } from "./data/bosses";
import BossHpBar from "./components/BossHpBar";

const appStyle = { background: "#12080a", color: "#d8c8a8", fontFamily: "'Segoe UI', monospace", width: "100vw", height: "100vh", overflow: "hidden", position: "relative", display: "flex", justifyContent: "center", alignItems: "center" };
const scanlinesStyle = { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.04) 3px,rgba(0,0,0,0.04) 6px)", pointerEvents: "none", zIndex: 9999 };
const vignetteStyle = { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "radial-gradient(ellipse at center,transparent 55%,rgba(0,0,0,0.6) 100%)", pointerEvents: "none", zIndex: 9998 };

const SPELL_SFX = {
  fireball: sfxFireball, lightning: sfxLightning, icelance: sfxIceLance,
  shadowbolt: sfxShadowBolt, holybeam: sfxHolyBeam,
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
let walkerIdCounter = 0;
let dmgPopupIdCounter = 0;

// Mobile detection helper
const isTouchDevice = () => "ontouchstart" in window || navigator.maxTouchPoints > 0;
const isMobileScreen = () => isTouchDevice() && window.innerWidth < 900;

// Compute mobile portrait game dimensions to fill screen
function getMobileDimensions() {
  const sw = window.innerWidth;
  const sh = window.innerHeight;
  // Use full screen width, fit height to aspect ratio
  // Internal resolution scaled up for quality but matching screen aspect
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

export default function App() {
  const [screen, setScreen] = useState("intro");
  const [room, setRoom] = useState(0);
  const [biome, setBiome] = useState(null);
  const [doors, setDoors] = useState(0);
  const [initiative, setInitiative] = useState(MAX_INITIATIVE);
  const [inventory, setInventory] = useState([]);
  const [hideoutItems, setHideoutItems] = useState([]);
  const [money, setMoney] = useState({ copper: 0, silver: 0, gold: 100 });
  const [totalGoldEarned, setTotalGoldEarned] = useState(0);
  const [hideoutLevel, setHideoutLevel] = useState(0);
  const [chestPos, setChestPos] = useState(null);
  const [showChest, setShowChest] = useState(false);
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

  // POIs: fruit tree, mine nuggets, waterfall, merc camp, wizard
  const [fruitTree, setFruitTree] = useState(null);     // { x, fruits, biomeId, crown, trunk, label }
  const [mineNugget, setMineNugget] = useState(null);   // { x, nuggets, progress, activeId, biomeId, rockCol, oreEmoji }
  const [waterfall, setWaterfall] = useState(null);      // { x, opened, biomeId, rgb, frozen, label }
  const [mercCamp, setMercCamp] = useState(null);        // { x, biomeId }
  const [wizardPoi, setWizardPoi] = useState(null);      // { x, spellId, cost }
  const nuggetRef = useRef({ active: false, intervalId: null });

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

  // Knight upgrade level (index into KNIGHT_LEVELS, 0 = Giermek)
  const [knightLevel, setKnightLevel] = useState(0);

  // Mana & spell system
  const [mana, setMana] = useState(20);
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
  const [cardDrop, setCardDrop] = useState(null);
  // Knowledge shop: permanent upgrades bought with knowledge
  const [knowledgeUpgrades, setKnowledgeUpgrades] = useState({
    manaPool: 0,     // +10 max mana per level (max 3)
    spellPower: 0,   // +5% spell damage per level (max 5)
    manaRegen: 0,    // +0.5 mana/sec per level (max 3)
  });
  // MAX_MANA computed from base + knowledge upgrades
  const MAX_MANA = BASE_MAX_MANA + (knowledgeUpgrades.manaPool || 0) * 10;

  // Meteorite event: phases: pending → falling → landed → opened
  const [meteorite, setMeteorite] = useState(null);
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
    bonus += (knowledgeUpgrades.spellPower || 0) * 0.05;
    return bonus;
  };
  const [activeBoss, setActiveBoss] = useState(null);
  const activeBossRef = useRef(null);
  const [gameScale, setGameScale] = useState(1);
  const [isMobile, setIsMobile] = useState(() => isMobileScreen());
  const [gameDims, setGameDims] = useState(() => getGameDimensions());
  const meteorTimerRef = useRef(null);

  // Dynamic game dimensions
  const GAME_W = gameDims.w;
  const GAME_H = gameDims.h;

  const canvasRef = useRef(null);
  const animCanvasRef = useRef(null);
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
      setGameScale(Math.min(window.innerWidth / dims.w, window.innerHeight / dims.h));
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
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

  const showMessage = useCallback((text, color) => {
    setMsg({ text, color });
    setTimeout(() => setMsg(null), 1500);
  }, []);

  const addMoneyFn = useCallback((val) => {
    setMoney(prev => {
      let tc = totalCopper(prev) + totalCopper(val);
      return copperToMoney(tc);
    });
    setTotalGoldEarned(prev => prev + (val.gold || 0) + (val.silver || 0) / 100 + (val.copper || 0) / 10000);
  }, []);

  // Spawn a floating damage popup at walker's current position
  const spawnDmgPopup = useCallback((wid, text, color) => {
    const wd = walkDataRef.current[wid];
    const xPct = wd ? wd.x : 50;
    const yPct = wd && wd.y != null ? wd.y : 65;
    const pid = ++dmgPopupIdCounter;
    setDmgPopups(prev => [...prev, { id: pid, x: xPct, y: yPct, text, color }]);
    setTimeout(() => setDmgPopups(prev => prev.filter(p => p.id !== pid)), 1100);
  }, []);

  // Card drop handler – called on every NPC kill
  const handleCardDrop = useCallback((npcData) => {
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
    setCardDrop({
      emoji: npcData.emoji,
      name: npcData.name,
      rarity: card.rarity,
      rarityLabel: card.rarityLabel,
      rarityColor: card.rarityColor,
      knowledge: card.knowledge,
    });
    setTimeout(() => setCardDrop(null), 3000);
  }, []);

  // Summon auto-attack handler (called from RAF loop via ref)
  summonAttackRef.current = (friendlyId, enemyId, damage) => {
    sfxMeleeHit();
    spawnDmgPopup(enemyId, `${damage}`, "#40e060");
    // Lunge on the friendly walker
    const fw = walkDataRef.current[friendlyId];
    if (fw) { fw.lungeFrames = 8; fw.lungeOffset = 12; }
    const ew = walkDataRef.current[enemyId];
    const meleeDirX = (fw && ew) ? Math.sign(ew.x - fw.x) || 1 : 1;
    // Clash effect at enemy position
    if (ew && animatorRef.current) {
      const ex = npcElsRef.current[enemyId];
      if (ex && gameContainerRef.current) {
        const gr = gameContainerRef.current.getBoundingClientRect();
        const r = ex.getBoundingClientRect();
        animatorRef.current.playMeleeClash(((r.left + r.width / 2) - gr.left) / gameScale, ((r.top + r.height / 2) - gr.top) / gameScale);
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
        if (absorbed > 0) spawnDmgPopup(enemyId, `${absorbed} 🛡️`, "#4060ff");
        setActiveBoss(prev => prev ? { ...prev, manaShieldHp: activeBossRef.current.manaShieldHp } : null);
      }
    }
    setWalkers(prev => prev.map(w => {
      if (w.id !== enemyId || !w.alive || w.friendly) return w;
      const newHp = Math.max(0, w.hp - actualDamage);
      if (newHp <= 0) {
        sfxNpcDeath();
        if (walkDataRef.current[enemyId]) walkDataRef.current[enemyId].alive = false;
        if (physicsRef.current) physicsRef.current.triggerRagdoll(enemyId, "melee", meleeDirX);
        addMoneyFn(w.npcData.loot || {});
        // golden_reaper: double loot
        if (hasRelic("golden_reaper")) addMoneyFn(w.npcData.loot || {});
        setKills(k => k + 1);
        handleCardDrop(w.npcData);
        // necromancer: 10% chance to spawn temp friendly
        if (hasRelic("necromancer") && Math.random() < 0.10) {
          const mt = MERCENARY_TYPES[Math.floor(Math.random() * MERCENARY_TYPES.length)];
          setTimeout(() => {
            const nid = ++walkerIdCounter;
            const sx = walkDataRef.current[enemyId]?.x || 50;
            const nHp = Math.round(mt.hp * 0.7);
            const nDmg = Math.round(mt.damage * 0.7);
            const nd = { emoji: mt.emoji, name: `${mt.name} 💀`, hp: nHp, resist: null, loot: {}, bodyColor: mt.bodyColor, armorColor: mt.armorColor, weapon: mt.weapon };
            setWalkers(pr => [...pr, { id: nid, npcData: nd, alive: true, dying: false, hp: nHp, maxHp: nHp, friendly: true }]);
            walkDataRef.current[nid] = { x: sx, y: 65 + Math.random() * 18, dir: 1, yDir: 1, speed: mt.speed, ySpeed: 0.01, minX: 5, maxX: 90, minY: 65, maxY: 83, bouncePhase: 0, alive: true, friendly: true, damage: nDmg, attackCd: mt.attackCd || 2500, lungeFrames: 0, lungeOffset: 0, combatStyle: mt.combatStyle || "melee", mercType: mt.id, range: mt.range || 35 };
            if (physicsRef.current) physicsRef.current.spawnNpc(nid, sx, nd, true);
            showMessage(`💀 Nekromancja! ${mt.name} przywołany!`, "#a050e0");
            setTimeout(() => {
              if (walkDataRef.current[nid]) walkDataRef.current[nid].alive = false;
              if (physicsRef.current) physicsRef.current.removeNpc(nid);
              setWalkers(pr => pr.filter(ww => ww.id !== nid));
            }, 15000);
          }, 300);
        }
        if (w.npcData.biomeId === "meteor" && Math.random() < 0.08) {
          const sword = { icon: "🌙", name: "Miecz Pełni Księżyca", desc: "Legendarny miecz wykuty w blasku pełni księżyca", rarity: "legendary", value: { gold: 15 }, id: Date.now() + Math.random(), biome: "Meteoryt", room };
          setInventory(prev => [...prev, sword]);
          setLoot(sword);
          showMessage("🌙 Miecz Pełni Księżyca!", "#d4a030");
        }
        const friendlyW = prev.find(ww => ww.id === friendlyId);
        const mercName = friendlyW ? friendlyW.npcData.name : "najemnik";
        showMessage(`💀 ${w.npcData.name} pokonany przez ${mercName}! +${formatLootText(w.npcData.loot)}`, "#40e060");
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
        showMessage(`💀 ${w.npcData.name} poległ w walce!`, "#cc4040");
        setTimeout(() => setWalkers(pr => pr.map(ww => ww.id === friendlyId ? { ...ww, alive: false } : ww)), 2500);
        return { ...w, hp: 0, dying: true, dyingAt: Date.now() };
      }
      if (physicsRef.current) physicsRef.current.applyHit(friendlyId, "melee", meleeDirX);
      return { ...w, hp: newHp };
    }));
  };

  // Enemy attacks caravan (called from RAF loop via ref)
  attackCaravanRef.current = (enemyId, damage) => {
    // ice_core: 25% chance to fully block
    if (hasRelic("ice_core") && Math.random() < 0.25) {
      spawnDmgPopup(enemyId, "BLOK! 🧊", "#40a8b8");
      const ew = walkDataRef.current[enemyId];
      if (ew) { ew.lungeFrames = 8; ew.lungeOffset = 12; }
      return;
    }
    let armor = CARAVAN_LEVELS[caravanLevelRef.current].armor;
    // faith_shield: +3 armor
    if (hasRelic("faith_shield")) armor += 3;
    const actualDmg = Math.max(1, damage - armor);
    sfxCaravanHit();
    setCaravanHp(prev => Math.max(0, prev - actualDmg));
    // Screen shake on caravan hit
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 150);
    // Lunge anim on the enemy
    const ew = walkDataRef.current[enemyId];
    if (ew) { ew.lungeFrames = 8; ew.lungeOffset = 12; }
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
        showMessage(`💀 ${w.npcData.name} poległ w walce!`, "#cc4040");
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
    const loop = () => {
      walkRafRef.current = requestAnimationFrame(loop);
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1); // delta seconds, capped at 100ms
      lastTime = now;
      const wd = walkDataRef.current;
      for (const id of Object.keys(wd)) {
        const w = wd[id];
        if (!w || !w.alive) continue;

        if (w.friendly) {
          // Friendly AI: move toward nearest enemy (using X+Y distance)
          let nearX = null, nearY = null, nearDist = Infinity, nearId = null;
          for (const eid of Object.keys(wd)) {
            const e = wd[eid];
            if (!e || !e.alive || e.friendly) continue;
            const dx = e.x - w.x;
            const dy = ((e.y || 65) - (w.y || 65)) * 0.5; // Y weighted less
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < nearDist) { nearDist = dist; nearX = e.x; nearY = e.y || 65; nearId = eid; }
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
                const now = Date.now();
                const projCd = w.projectileCd || w.attackCd || 2000;
                if (!atkCds[id] || now - atkCds[id] > projCd) {
                  atkCds[id] = now;
                  if (physicsRef.current) {
                    physicsRef.current.triggerAttackAnim(parseInt(id));
                    const targetWd = wd[nearId];
                    const targetXPct = targetWd ? targetWd.x : nearX;
                    physicsRef.current.spawnProjectile(
                      parseInt(id), targetXPct, "arrow", w.projectileDamage || w.damage || 8, null,
                      (hitId, dmg) => { if (summonAttackRef.current) summonAttackRef.current(parseInt(id), hitId, dmg); },
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
                const now = Date.now();
                if (w.mercType === "mage") {
                  // Mage ranged spell
                  const spellCd = w.spellCd || 3500;
                  const spellCost = w.spellCost || 15;
                  if ((w.currentMana || 0) >= spellCost && (!atkCds[id] || now - atkCds[id] > spellCd)) {
                    w.currentMana -= spellCost;
                    atkCds[id] = now;
                    if (physicsRef.current) {
                      physicsRef.current.triggerAttackAnim(parseInt(id));
                      const targetWd = wd[nearId];
                      const targetXPct = targetWd ? targetWd.x : nearX;
                      physicsRef.current.spawnProjectile(
                        parseInt(id), targetXPct, "mageSpell", w.spellDamage || 14, w.spellElement || "fire",
                        (hitId, dmg) => { if (summonAttackRef.current) summonAttackRef.current(parseInt(id), hitId, dmg); },
                        parseInt(nearId)
                      );
                    }
                  } else if ((w.currentMana || 0) < (w.spellCost || 15) && nearDist < 8) {
                    // Fallback melee when out of mana
                    const meleeCd = 2000;
                    const cdKey = "m" + id;
                    if (!atkCds[cdKey] || now - atkCds[cdKey] > meleeCd) {
                      atkCds[cdKey] = now;
                      if (summonAttackRef.current) summonAttackRef.current(parseInt(id), parseInt(nearId), w.meleeDamage || 3);
                    }
                  }
                } else if (w.mercType === "archer") {
                  // Archer ranged attack
                  const projCd = w.projectileCd || 1800;
                  if (!atkCds[id] || now - atkCds[id] > projCd) {
                    atkCds[id] = now;
                    if (physicsRef.current) {
                      physicsRef.current.triggerAttackAnim(parseInt(id));
                      const targetWd = wd[nearId];
                      let targetXPct = targetWd ? targetWd.x : nearX;
                      // Storm: arrows have 30% chance to miss (offset target)
                      const ww = weatherRef.current;
                      if (ww?.accuracyMult?.arrow && Math.random() > ww.accuracyMult.arrow)
                        targetXPct += (Math.random() - 0.5) * 30;
                      physicsRef.current.spawnProjectile(
                        parseInt(id), targetXPct, "arrow", w.projectileDamage || 6, null,
                        (hitId, dmg) => { if (summonAttackRef.current) summonAttackRef.current(parseInt(id), hitId, dmg); },
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
                const now = Date.now();
                const atkCdMs = w.attackCd || 2500;
                if (!atkCds[id] || now - atkCds[id] > atkCdMs) {
                  atkCds[id] = now;
                  let knightDmg = w.damage || 5;
                  // Rogue crit: chance for double damage
                  if (w.mercType === "rogue" && Math.random() < (w.critChance || 0.25)) {
                    knightDmg = Math.round(knightDmg * (w.critMult || 2.0));
                    spawnDmgPopup(parseInt(nearId), `KRYT! ${knightDmg}`, "#ff8020");
                  }
                  // berserker: merc <30% HP → 2x damage
                  if (hasRelic("berserker")) {
                    const wState = walkersRef.current.find(ww => ww.id === parseInt(id));
                    if (wState && wState.hp / wState.maxHp < 0.30) knightDmg *= 2;
                  }
                  if (physicsRef.current) physicsRef.current.triggerAttackAnim(parseInt(id));
                  if (summonAttackRef.current) summonAttackRef.current(parseInt(id), parseInt(nearId), knightDmg);
                  w.combatState = Math.random() < 0.5 ? "retreat" : "circle";
                  w.combatTimer = 20 + Math.floor(Math.random() * 30);
                  w.strafeDir = Math.random() < 0.5 ? 1 : -1;
                }
              }
            }
          } else {
            // No enemy walkers – look for towers to attack
            w.combatState = null;
            w.combatTimer = 0;
            const towers = trapsRef.current.filter(t => t.type === "tower" && t.active);
            let nearTower = null, nearTowerDist = Infinity;
            for (const t of towers) {
              const td = Math.abs(t.x - w.x);
              if (td < nearTowerDist) { nearTowerDist = td; nearTower = t; }
            }
            const towerRange = isRanged ? (w.range || 35) : 7;
            const towerApproach = isRanged ? 15 : 6;
            if (nearTower && nearTowerDist < 40) {
              w.dir = nearTower.x > w.x ? 1 : -1;
              if (nearTowerDist > towerApproach) {
                w.x += w.speed * w.dir;
              } else if (!isRanged && nearTowerDist < 3) {
                w.x -= w.speed * w.dir * 0.5;
              }
              if (nearTowerDist < towerRange) {
                const now = Date.now();
                const cdKey = "tw" + id;
                if (isRanged) {
                  // Ranged tower attack – spawn visible projectile
                  const projCd = w.mercType === "mage" ? (w.spellCd || 3500) : (w.projectileCd || 1800);
                  const canShoot = w.mercType === "mage"
                    ? (w.currentMana || 0) >= (w.spellCost || 15)
                    : true;
                  if (canShoot && (!atkCds[cdKey] || now - atkCds[cdKey] > projCd)) {
                    atkCds[cdKey] = now;
                    if (w.mercType === "mage") w.currentMana -= (w.spellCost || 15);
                    const dmg = w.mercType === "mage" ? (w.spellDamage || 14) : (w.projectileDamage || 6);
                    const projType = w.mercType === "mage" ? "mageSpell" : "arrow";
                    if (physicsRef.current) {
                      physicsRef.current.triggerAttackAnim(parseInt(id));
                      const tId = nearTower.id;
                      const towerPx = (nearTower.x / 100) * GAME_W;
                      const towerPy = GAME_H * 0.58;
                      physicsRef.current.spawnProjectile(
                        parseInt(id), nearTower.x, projType, dmg, w.spellElement || null,
                        (hitId, hitDmg) => {
                          setTraps(prev => prev.map(t => {
                            if (t.id !== tId || !t.active) return t;
                            const newHp = t.hp - hitDmg;
                            if (newHp <= 0) {
                              sfxNpcDeath();
                              showMessage("🏗️ Wieża zniszczona!", "#e0a040");
                              return { ...t, hp: 0, active: false };
                            }
                            return { ...t, hp: newHp };
                          }));
                          const pid = ++dmgPopupIdCounter;
                          setDmgPopups(prev => [...prev, { id: pid, x: nearTower.x, y: 60, text: `${hitDmg}`, color: "#40e060" }]);
                          setTimeout(() => setDmgPopups(prev => prev.filter(p => p.id !== pid)), 1100);
                        }
                      );
                      // Set targetPos on the last added projectile so it hits the tower
                      const projs = physicsRef.current.projectiles;
                      if (projs.length > 0) {
                        projs[projs.length - 1].targetPos = { x: towerPx, y: towerPy };
                      }
                    }
                  }
                } else {
                  // Melee tower attack
                  const atkCdMs = w.attackCd || 2500;
                  if (!atkCds[cdKey] || now - atkCds[cdKey] > atkCdMs) {
                    atkCds[cdKey] = now;
                    const dmg = w.damage || 5;
                    if (physicsRef.current) physicsRef.current.triggerAttackAnim(parseInt(id));
                    sfxMeleeHit();
                    const tId = nearTower.id;
                    setTraps(prev => prev.map(t => {
                      if (t.id !== tId || !t.active) return t;
                      const newHp = t.hp - dmg;
                      if (newHp <= 0) {
                        sfxNpcDeath();
                        showMessage("🏗️ Wieża zniszczona!", "#e0a040");
                        return { ...t, hp: 0, active: false };
                      }
                      return { ...t, hp: newHp };
                    }));
                    const pid = ++dmgPopupIdCounter;
                    setDmgPopups(prev => [...prev, { id: pid, x: nearTower.x, y: 60, text: `${dmg}`, color: "#40e060" }]);
                    setTimeout(() => setDmgPopups(prev => prev.filter(p => p.id !== pid)), 1100);
                  }
                }
              }
            } else {
              // No towers either – normal patrol
              w.x += w.speed * w.dir;
              if (w.x > w.maxX) { w.x = w.maxX; w.dir = -1; }
              if (w.x < w.minX) { w.x = w.minX; w.dir = 1; }
            }
          }
          } // end !stationary else
        } else {
          // Enemy AI: look for friendly walkers to attack
          let friendX = null, friendY = null, friendDist = Infinity, friendId = null;
          for (const fid of Object.keys(wd)) {
            const f = wd[fid];
            if (!f || !f.alive || !f.friendly) continue;
            const dx = f.x - w.x;
            const dy = ((f.y || 65) - (w.y || 65)) * 0.5;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < friendDist) { friendDist = dist; friendX = f.x; friendY = f.y || 65; friendId = fid; }
          }

          // NPC ability usage
          if (w.ability && friendX !== null) {
            const ability = w.ability;
            const abCdKey = "ab" + id;
            const now = Date.now();
            if (friendDist < ability.range && (!atkCds[abCdKey] || now - atkCds[abCdKey] > ability.cooldown)) {
              atkCds[abCdKey] = now;
              const dirX = friendX > w.x ? 1 : -1;
              switch (ability.type) {
                case "fireBreath":
                  if (physicsRef.current) {
                    const tx = (w.x / 100) * GAME_W;
                    const ty = GAME_H * 0.65 - 30;
                    physicsRef.current.combatEffects.spawnFireBreath(tx, ty, dirX);
                  }
                  if (enemyAbilityRef.current) enemyAbilityRef.current(parseInt(id), parseInt(friendId), ability.damage, ability.element);
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
                      parseInt(id), targetXPct, projType, ability.damage, ability.element,
                      (hitId, dmg, elem) => { if (enemyAbilityRef.current) enemyAbilityRef.current(parseInt(id), hitId, dmg, elem); },
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
                  if (enemyAbilityRef.current) enemyAbilityRef.current(parseInt(id), parseInt(friendId), ability.damage, "melee");
                  break;
                }
                case "drain": {
                  // Like shadowBolt but heals boss for 50% of damage dealt
                  if (physicsRef.current) {
                    const targetWd = wd[friendId];
                    const targetXPct = targetWd ? targetWd.x : friendX;
                    physicsRef.current.spawnProjectile(
                      parseInt(id), targetXPct, "shadowBolt_npc", ability.damage, "shadow",
                      (hitId, dmg, elem) => {
                        if (enemyAbilityRef.current) enemyAbilityRef.current(parseInt(id), hitId, dmg, elem);
                        // Heal boss for 50% of damage dealt
                        const bossWd = wd[id];
                        if (bossWd && bossWd.isBoss) {
                          const healAmt = Math.floor(dmg * 0.5);
                          setWalkers(prev => prev.map(ww => {
                            if (ww.id !== parseInt(id) || !ww.isBoss) return ww;
                            const newHp = Math.min(ww.maxHp, ww.hp + healAmt);
                            return { ...ww, hp: newHp };
                          }));
                          spawnDmgPopup(parseInt(id), `+${healAmt}`, "#40c040");
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

          // Boss phase tracking
          if (w.isBoss && activeBossRef.current) {
            const boss = activeBossRef.current;
            const hpRatio = w.hp / w.maxHp;

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
              boss.phase = 2;
              if (boss.phase2.manaShield) {
                const shieldHp = Math.round(boss.phase2.shieldHp * (boss.roomScale || 1));
                boss.manaShieldHp = shieldHp;
                boss.manaShieldMaxHp = shieldHp;
              }
              setActiveBoss({ ...boss });
              spawnDmgPopup(parseInt(id), "FAZA 2!", "#ff6020");
            }
            // Phase 2 → Phase 3 (Cosmic Titan)
            if (boss.phase === 2 && boss.phase3 && hpRatio <= boss.phase3.hpThreshold) {
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
              boss.phase = 3;
              setActiveBoss({ ...boss });
              spawnDmgPopup(parseInt(id), "FAZA 3!", "#e040e0");
            }

            // Sync HP to state for BossHpBar
            if (w.hp !== boss.currentHp) {
              boss.currentHp = w.hp;
              setActiveBoss({ ...boss });
            }
          }

          if (friendX !== null && friendDist < 25) {
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
              const now = Date.now();
              const cdKey = "e" + id;
              if (!atkCds[cdKey] || now - atkCds[cdKey] > 3000) {
                atkCds[cdKey] = now;
                const eDmg = w.damage || 5;
                if (enemyAttackFriendlyRef.current) enemyAttackFriendlyRef.current(parseInt(id), parseInt(friendId), eDmg);
                w.combatState = Math.random() < 0.6 ? "retreat" : "circle";
                w.combatTimer = 25 + Math.floor(Math.random() * 35);
                w.strafeDir = Math.random() < 0.5 ? 1 : -1;
              }
            }
          } else if (defenseModeRef.current?.phase === "wave_active") {
            // No friendly target – attack the caravan
            w.combatState = null;
            w.dir = -1; // move toward caravan (left side)
            w.x += w.speed * w.dir;
            if (w.x < 12) {
              w.x = 12;
              const now = Date.now();
              const cdKey = "ec" + id;
              if (!atkCds[cdKey] || now - atkCds[cdKey] > 3000) {
                atkCds[cdKey] = now;
                if (attackCaravanRef.current) attackCaravanRef.current(parseInt(id), w.damage || 5);
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
          if (w.y > (w.maxY || 83)) { w.y = w.maxY || 83; w.yDir = -1; }
          if (w.y < (w.minY || 65)) { w.y = w.minY || 65; w.yDir = 1; }
          // Random Y direction change
          if (Math.random() < 0.003) w.yDir *= -1;
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
          const yPos = w.y != null ? w.y : 65;
          el.style.left = `${w.x}%`;
          el.style.top = `calc(${yPos}% - 75px)`;
          el.style.transform = `translateX(-50%) translateY(${-bounceY}px) translateX(${lungeX * w.dir}px)`;
        }
        // Update physics body to match walker position
        if (physicsRef.current) {
          const yPctForPhysics = w.y != null ? w.y : null;
          physicsRef.current.updatePatrol(parseInt(id), w.x, w.dir, w.bouncePhase, yPctForPhysics);
        }
      }
      // ─── TRAP COLLISION CHECK ───
      const trapNow = Date.now();
      const curTraps = trapsRef.current;
      for (const trap of curTraps) {
        if (!trap.active) continue;

        if (trap.type === "spikes") {
          // Spikes activate periodically (every 3s, active for 1s)
          const cycle = (trapNow % 4000);
          const spikesUp = cycle < 1200;
          trap._spikesUp = spikesUp; // for rendering
          if (!spikesUp) continue;
          // Damage any friendly walker stepping on spikes
          for (const id of Object.keys(wd)) {
            const w = wd[id];
            if (!w || !w.alive || !w.friendly) continue;
            if (Math.abs(w.x - trap.x) < 4) {
              const cdKey = `spike_${trap.id}_${id}`;
              if (!atkCds[cdKey] || trapNow - atkCds[cdKey] > 1500) {
                atkCds[cdKey] = trapNow;
                const dmg = 8 + Math.floor(Math.random() * 6);
                if (enemyAttackFriendlyRef.current) {
                  // Use a fake enemy ID (negative) for trap damage
                  spawnDmgPopup(parseInt(id), `${dmg} 🔺`, "#cc4040");
                  setWalkers(prev => prev.map(ww => {
                    if (ww.id !== parseInt(id) || !ww.alive || !ww.friendly) return ww;
                    const newHp = Math.max(0, ww.hp - dmg);
                    if (newHp <= 0) {
                      if (walkDataRef.current[ww.id]) walkDataRef.current[ww.id].alive = false;
                      if (physicsRef.current) physicsRef.current.triggerRagdoll(ww.id, "melee", 1);
                      showMessage(`💀 ${ww.npcData.name} zginął na kolcach!`, "#cc4040");
                      return { ...ww, hp: 0, dying: true, dyingAt: trapNow };
                    }
                    if (physicsRef.current) physicsRef.current.applyHit(parseInt(id), "melee", Math.sign(w.x - trap.x) || 1);
                    return { ...ww, hp: newHp };
                  }));
                }
              }
            }
          }
        }

        if (trap.type === "mine" && !trap.triggered) {
          for (const id of Object.keys(wd)) {
            const w = wd[id];
            if (!w || !w.alive || !w.friendly) continue;
            if (Math.abs(w.x - trap.x) < 3.5) {
              trap.triggered = true;
              trap._explodeAt = trapNow;
              const dmg = 15 + Math.floor(Math.random() * 10);
              sfxMeteorImpact();
              spawnDmgPopup(parseInt(id), `${dmg} 💥`, "#ff6020");
              showMessage("💥 Mina eksplodowała!", "#ff6020");
              if (animatorRef.current) {
                const ex = npcElsRef.current[id];
                let px = GAME_W * (trap.x / 100), py = GAME_H * 0.65;
                if (ex && gameContainerRef.current) {
                  const gr = gameContainerRef.current.getBoundingClientRect();
                  const r = ex.getBoundingClientRect();
                  px = ((r.left + r.width / 2) - gr.left) / gameScale;
                  py = ((r.top + r.height / 2) - gr.top) / gameScale;
                }
                animatorRef.current.playMeteorImpact(px, py);
              }
              // Damage all friendlies within range
              setWalkers(prev => prev.map(ww => {
                if (!ww.alive || !ww.friendly) return ww;
                const wwd = walkDataRef.current[ww.id];
                if (!wwd || Math.abs(wwd.x - trap.x) > 8) return ww;
                const actualDmg = ww.id === parseInt(id) ? dmg : Math.floor(dmg * 0.5);
                const newHp = Math.max(0, ww.hp - actualDmg);
                if (newHp <= 0) {
                  if (walkDataRef.current[ww.id]) walkDataRef.current[ww.id].alive = false;
                  if (physicsRef.current) physicsRef.current.triggerRagdoll(ww.id, "fire", Math.sign(wwd.x - trap.x) || 1);
                  showMessage(`💀 ${ww.npcData.name} zginął od wybuchu!`, "#cc4040");
                  return { ...ww, hp: 0, dying: true, dyingAt: trapNow };
                }
                if (physicsRef.current) physicsRef.current.applyHit(ww.id, "fire", Math.sign(wwd.x - trap.x) || 1);
                spawnDmgPopup(ww.id, `${actualDmg}`, "#ff6020");
                return { ...ww, hp: newHp };
              }));
              // Deactivate mine after 1.5s
              setTimeout(() => setTraps(prev => prev.map(t => t.id === trap.id ? { ...t, active: false } : t)), 1500);
              break;
            }
          }
        }

        if (trap.type === "tower") {
          // Tower shoots nearest friendly every 2.5s
          if (trapNow - (trap.lastShot || 0) < 2500) continue;
          let nearId = null, nearDist = Infinity;
          for (const id of Object.keys(wd)) {
            const w = wd[id];
            if (!w || !w.alive || !w.friendly) continue;
            const dist = Math.abs(w.x - trap.x);
            if (dist < nearDist && dist < 35) { nearDist = dist; nearId = id; }
          }
          if (nearId !== null) {
            trap.lastShot = trapNow;
            const dmg = 6 + Math.floor(Math.random() * 5);
            if (physicsRef.current) {
              physicsRef.current.spawnProjectileFrom(
                trap.x, 55, wd[nearId].x, "arrow", dmg, null,
                (hitId, hitDmg) => {
                  if (enemyAttackFriendlyRef.current) enemyAttackFriendlyRef.current(-trap.id, hitId, hitDmg);
                }
              );
            }
          }
        }
      }
      // Update trapsRef for render
      trapsRef.current = curTraps;

      // Step physics simulation
      if (physicsRef.current) physicsRef.current.step();
    };
    walkRafRef.current = requestAnimationFrame(loop);
    return () => { if (walkRafRef.current) cancelAnimationFrame(walkRafRef.current); };
  }, []);

  const enterRoom = useCallback((newRoom, tools) => {
    const b = BIOMES[Math.floor(Math.random() * BIOMES.length)];
    setBiome(b);
    // Generate next room preview for spyglass
    const nextB = BIOMES[Math.floor(Math.random() * BIOMES.length)];
    const nextIsDefense = (newRoom + 1) > 0 && (newRoom + 1) % 5 === 0;
    const nextIsBoss = (newRoom + 1) > 0 && (newRoom + 1) % 10 === 0;
    setNextRoomPreview({ biome: nextB, isDefense: nextIsDefense, isBoss: nextIsBoss, room: newRoom + 1 });
    setRoom(newRoom);
    const isDefenseRoom = newRoom > 0 && newRoom % 5 === 0;

    // Reset caravan HP in defense rooms
    if (isDefenseRoom) setCaravanHp(CARAVAN_LEVELS[caravanLevelRef.current].hp);

    // Night mode (30% chance)
    const night = Math.random() < 0.3;
    setIsNight(night);
    // Weather (40% chance, biome-filtered)
    const roomWeather = isDefenseRoom ? null : rollWeather(b.id);
    setWeather(roomWeather);
    if (roomWeather) { sfxWeather(roomWeather.id); showMessage(`${roomWeather.emoji} ${roomWeather.name}!`, "#80a0cc"); }
    // Stop any active mining
    if (miningRef.current.intervalId) clearInterval(miningRef.current.intervalId);
    miningRef.current = { active: false, intervalId: null };
    setMiningProgress(0);

    const chestRate = hasRelic("fortune_magnet") ? 0.15 : 0.08;
    if (!isDefenseRoom && Math.random() < chestRate) {
      const cx = 10 + Math.random() * 72, cy = 65 + Math.random() * 18;
      setChestPos({ x: cx, y: cy });
      setShowChest(true);
    } else {
      setShowChest(false); setChestPos(null);
    }

    const currentTools = tools || [];
    if (isDefenseRoom) {
      // Defense rooms: clear all POIs, no new NPCs/traps
      setShowChest(false); setChestPos(null); setResourceNode(null); setShowResource(false);
      setFruitTree(null); setMineNugget(null); setWaterfall(null);
      setMercCamp(null); setWizardPoi(null); setTraps([]);
    }

    const terrain = b.terrain;
    const hasTool = (terrain === "forest" && currentTools.includes("axe")) ||
                    (terrain === "mine" && currentTools.includes("pickaxe"));
    if (!isDefenseRoom && hasTool && Math.random() < 0.45) {
      const rx = 10 + Math.random() * 72, ry = 58 + Math.random() * 24;
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
      jungle:   { crown: ["#1a6a0a","#0e4a04","#063002"], trunk: "#5a3a18", fruits: ["🥥","🍌","🥭","🍍"], label: "Dżunglowe Drzewo" },
      island:   { crown: ["#1a7a10","#0e5a08","#064004"], trunk: "#7a5a30", fruits: ["🥥","🍌","🍊"], label: "Palma" },
      winter:   { crown: ["#506880","#3a5060","#2a3a48"], trunk: "#4a3a2a", fruits: [], label: "Ośnieżone Drzewo" },
      summer:   { crown: ["#2a8a1a","#1a6a10","#0e4a06"], trunk: "#6a4a20", fruits: ["🍎","🍐","🍒","🫐","🍑"], label: "Owocowe Drzewo" },
      autumn:   { crown: ["#a06020","#c07030","#804010"], trunk: "#5a3a18", fruits: ["🍎","🍐","🌰"], label: "Jesienny Dąb" },
      spring:   { crown: ["#30a020","#20801a","#106010"], trunk: "#6a4a22", fruits: ["🍒","🍓","🫐","🍑"], label: "Kwitnące Drzewo" },
      mushroom: { crown: ["#6040a0","#4a3080","#302060"], trunk: "#6a5a40", fruits: ["🍄","🍄","🍄"], label: "Grzyborost" },
      swamp:    { crown: ["#2a5a1a","#1a4010","#0e3008"], trunk: "#3a3018", fruits: ["🫐","🍐"], label: "Bagienny Dąb" },
    };
    const MINE_VARIANTS = {
      desert:  { rockCol: ["#8a7a60","#6a6050","#5a5040"], oreEmoji: "💎", label: "Piaskowa Skała" },
      city:    { rockCol: ["#5a5550","#4a4540","#3a3530"], oreEmoji: "⚙️", label: "Ruiny Kopalni" },
      volcano: { rockCol: ["#4a2a1a","#3a2010","#2a1808"], oreEmoji: "🔥", label: "Wulkaniczna Żyła" },
    };
    const WATER_VARIANTS = {
      jungle:  { rgb: [40,180,100], label: "Leśny Wodospad", frozen: false },
      winter:  { rgb: [160,200,255], label: "Zamrożony Wodospad", frozen: true },
      swamp:   { rgb: [60,100,40], label: "Bagienny Spływ", frozen: false },
      default: { rgb: [80,160,255], label: "Wodospad", frozen: false },
    };

    const bid = b.id;
    const MAX_POIS = 3;
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
      const tx = pickX(20, 75);
      if (tx !== null) {
        const tv = TREE_VARIANTS[bid] || TREE_VARIANTS.summer;
        const fruits = [];
        if (tv.fruits.length > 0) {
          const count = 2 + Math.floor(Math.random() * 3);
          for (let i = 0; i < count; i++) {
            fruits.push({ id: i, emoji: tv.fruits[Math.floor(Math.random() * tv.fruits.length)], x: 15 + Math.random() * 70, y: 10 + Math.random() * 40, picked: false });
          }
        }
        newTree = { x: tx, fruits, biomeId: bid, crown: tv.crown, trunk: tv.trunk, label: tv.label };
      }
    }

    if (poiCount() < MAX_POIS && terrain === "mine" && currentTools.includes("pickaxe") && Math.random() < 0.30) {
      const nx = pickX(15, 75);
      if (nx !== null) {
        const mv = MINE_VARIANTS[bid] || MINE_VARIANTS.desert;
        const nuggetCount = 2 + Math.floor(Math.random() * 3);
        const nuggets = [];
        for (let i = 0; i < nuggetCount; i++) {
          nuggets.push({ id: i, x: 10 + Math.random() * 70, y: 15 + Math.random() * 50, dug: false });
        }
        newMine = { x: nx, nuggets, progress: 0, activeId: null, biomeId: bid, rockCol: mv.rockCol, oreEmoji: mv.oreEmoji, label: mv.label };
      }
    }

    if (poiCount() < MAX_POIS && Math.random() < 0.10) {
      const wx = pickX(40, 85);
      if (wx !== null) {
        const wv = WATER_VARIANTS[bid] || WATER_VARIANTS.default;
        newWater = { x: wx, opened: false, biomeId: bid, rgb: wv.rgb, label: wv.label, frozen: wv.frozen };
      }
    }

    if (poiCount() < MAX_POIS && Math.random() < 0.20) {
      const cx = pickX(25, 70);
      if (cx !== null) newCamp = { x: cx, biomeId: bid };
    }

    const unlearned = SPELLS.filter(s => !s.learned && !learnedSpellsRef.current.includes(s.id));
    if (poiCount() < MAX_POIS && unlearned.length > 0 && Math.random() < 0.15) {
      const wizX = pickX(30, 75);
      if (wizX !== null) {
        const spell = unlearned[Math.floor(Math.random() * unlearned.length)];
        const wizCost = 30 + Math.floor(spell.manaCost * 2);
        newWizard = { x: wizX, spellId: spell.id, cost: wizCost };
      }
    }

    } // end !isDefenseRoom POIs
    setFruitTree(newTree);
    setMineNugget(newMine);
    setWaterfall(newWater);
    setMercCamp(newCamp);
    setWizardPoi(newWizard);

    // ─── TRAPS ───
    const newTraps = [];
    let trapId = Date.now();
    const roomDifficulty = Math.min(newRoom / 10, 1); // scales 0→1 over 10 rooms
    if (!isDefenseRoom) {
    // Ground spikes (30% chance, up to 2)
    if (Math.random() < 0.30 + roomDifficulty * 0.15) {
      const count = Math.random() < 0.4 ? 2 : 1;
      for (let i = 0; i < count; i++) {
        const tx = 15 + Math.random() * 65;
        newTraps.push({ id: ++trapId, type: "spikes", x: tx, active: true, triggered: false, cooldown: 0 });
      }
    }
    // Mines (20% chance, 1-2)
    if (Math.random() < 0.20 + roomDifficulty * 0.1) {
      const count = Math.random() < 0.3 ? 2 : 1;
      for (let i = 0; i < count; i++) {
        const tx = 15 + Math.random() * 65;
        newTraps.push({ id: ++trapId, type: "mine", x: tx, active: true, triggered: false });
      }
    }
    // Towers (25% chance, 1)
    if (Math.random() < 0.25 + roomDifficulty * 0.1) {
      const towerHp = 30 + Math.floor(roomDifficulty * 40);
      const tx = 25 + Math.random() * 50;
      newTraps.push({ id: ++trapId, type: "tower", x: tx, active: true, hp: towerHp, maxHp: towerHp, lastShot: 0 });
    }
    } // end !isDefenseRoom traps
    setTraps(newTraps);

    // Walking NPCs – 70% chance, 1-2 NPCs
    const newWalkers = [];
    const newWalkData = {};
    if (!isDefenseRoom && Math.random() < 0.70) {
      const count = Math.random() < 0.55 ? 1 : 2;
      for (let i = 0; i < count; i++) {
        const npcData = pickNpc(b.id);
        if (!npcData) continue;
        const roomScale = 1 + Math.min(newRoom / 25, 1.5);
        npcData.hp = Math.round(npcData.hp * roomScale);
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
        const spawnY = 65 + Math.random() * 18; // 65-83% (on ground)
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
          minY: 65, maxY: 83,
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
    // Preserve alive friendly mercenaries across rooms (skip barricade/tower – defense only)
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
    const keptWalkerState = walkersRef.current.filter(pw => pw.alive && !pw.dying && pw.friendly && !pw.isBarricade && !pw.isTower && preservedData[pw.id]);
    setWalkers([...keptWalkerState, ...newWalkers]);
    walkDataRef.current = { ...preservedData, ...newWalkData };
    npcElsRef.current = {};
    setSelectedSpell(null);
    setDragHighlight(null);
    setDmgPopups([]);
    setInspectedNpc(null);
    setSummonPicker(false);

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
        enemiesRemaining: 0, enemiesSpawned: 0, timer: 10, roomNumber: newRoom, isBossRoom: !!bossData });
      setMeteorite(null);
      sfxWaveHorn();

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
        showMessage(`⚔️ ${bossData.emoji} ${bossData.name} nadchodzi!`, "#ff2020");
      } else {
        setActiveBoss(null);
        showMessage("⚔️ Komnata Obronna!", "#ff6020");
      }

      // Spawn caravan defenses: barricade, tower, dog
      const cl = CARAVAN_LEVELS[caravanLevelRef.current];
      if (cl.barricade) {
        const bId = ++walkerIdCounter;
        const bHp = cl.barricade.hp;
        const bNpc = { emoji: "🪵", name: "Barykada", hp: bHp, resist: null, loot: {}, bodyColor: "#6a4a20", armorColor: "#4a3010", bodyType: "barricade" };
        setWalkers(prev => [...prev, { id: bId, npcData: bNpc, alive: true, dying: false, hp: bHp, maxHp: bHp, friendly: true, isBarricade: true }]);
        walkDataRef.current[bId] = {
          x: 18, y: 74, dir: 1, yDir: 0, speed: 0, ySpeed: 0,
          minX: 18, maxX: 18, minY: 65, maxY: 83,
          bouncePhase: 0, alive: true, friendly: true,
          damage: 0, lungeFrames: 0, lungeOffset: 0,
          stationary: true, combatStyle: "none", attackCd: 99999,
        };
        if (physicsRef.current) physicsRef.current.spawnNpc(bId, 18, bNpc, true);
      }
      if (cl.tower) {
        const tId = ++walkerIdCounter;
        const towerHp = cl.tower.hp || 200;
        const tNpc = { emoji: "🗼", name: "Wieża karawany", hp: towerHp, resist: null, loot: {}, bodyColor: "#5a5a5a", armorColor: "#3a3a3a", bodyType: "tower" };
        setWalkers(prev => [...prev, { id: tId, npcData: tNpc, alive: true, dying: false, hp: towerHp, maxHp: towerHp, friendly: true, isTower: true }]);
        walkDataRef.current[tId] = {
          x: 10, y: 72, dir: 1, yDir: 0, speed: 0, ySpeed: 0,
          minX: 10, maxX: 10, minY: 65, maxY: 83,
          bouncePhase: 0, alive: true, friendly: true,
          damage: cl.tower.damage, projectileDamage: cl.tower.damage,
          lungeFrames: 0, lungeOffset: 0,
          stationary: true, combatStyle: "ranged",
          attackCd: cl.tower.attackCd, projectileCd: cl.tower.attackCd,
          range: cl.tower.range,
        };
        if (physicsRef.current) physicsRef.current.spawnNpc(tId, 10, tNpc, true);
      }
      if (cl.dog) {
        // Check if dog already exists among preserved friendlies
        const existingDog = keptWalkerState.find(w => w.isDog);
        if (!existingDog) {
          const dId = ++walkerIdCounter;
          const dNpc = { emoji: "🐕", name: "Ogar bojowy", hp: 80, resist: null, loot: {}, bodyColor: "#8a6030", armorColor: "#5a4020", bodyType: "quadruped" };
          setWalkers(prev => [...prev, { id: dId, npcData: dNpc, alive: true, dying: false, hp: 80, maxHp: 80, friendly: true, isDog: true }]);
          walkDataRef.current[dId] = {
            x: 12, y: 72, dir: 1, yDir: Math.random() < 0.5 ? 1 : -1,
            speed: 0.06, ySpeed: 0.01,
            minX: 5, maxX: 28, minY: 65, maxY: 83,
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

    // Meteorite event – 12% chance, delayed fall after 1s
    if (meteorTimerRef.current) { clearTimeout(meteorTimerRef.current); meteorTimerRef.current = null; }
    if (Math.random() < 0.12) {
      const mx = 15 + Math.random() * 65;
      const landY = 58 + Math.random() * 5; // land at ground level (~58-63%, NPC line is 65%)
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
        // After 1s fall, land with impact
        setTimeout(() => {
          setMeteorite(prev => prev ? { ...prev, phase: "landed" } : null);
          sfxMeteorImpact();
          setScreenShake(true);
          setTimeout(() => setScreenShake(false), 500);
          if (animatorRef.current) {
            const px = GAME_W * mx / 100;
            const py = GAME_H * landY / 100;
            animatorRef.current.playMeteorImpact(px, py);
          }
        }, 1000);
      }, 1000);
    } else {
      setMeteorite(null);
    }
  }, []);

  // Render static biome
  useEffect(() => {
    if (!biome || !canvasRef.current) return;
    const c = canvasRef.current;
    c.width = GAME_W; c.height = GAME_H;
    const ctx = c.getContext("2d");
    renderBiome(ctx, biome, room, c.width, c.height, isNight);
  }, [biome, room, isNight, GAME_W, GAME_H]);

  // Animate biome overlay
  useEffect(() => {
    if (!biome || !animCanvasRef.current) return;
    const c = animCanvasRef.current;
    c.width = GAME_W; c.height = GAME_H;
    if (!animatorRef.current) animatorRef.current = new BiomeAnimator();
    animatorRef.current.start(c, biome, isNight, weather);
    return () => { if (animatorRef.current) animatorRef.current.stop(); };
  }, [biome, isNight, weather, GAME_W, GAME_H]);

  // Physics canvas
  useEffect(() => {
    if (!biome || !physicsCanvasRef.current) return;
    const c = physicsCanvasRef.current;
    c.width = GAME_W; c.height = GAME_H;
    if (!physicsRef.current) physicsRef.current = new PhysicsWorld();
    physicsRef.current.init(c);
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

  // Biome-adaptive music
  useEffect(() => {
    if (biome) changeBiomeMusic(biome.id, isNight);
  }, [biome, isNight]);

  // Initiative regen
  useEffect(() => {
    const iv = setInterval(() => {
      setInitiative(prev => Math.min(MAX_INITIATIVE, prev + INITIATIVE_REGEN));
    }, 1000);
    return () => clearInterval(iv);
  }, []);

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
        emoji: boss.emoji, name: boss.name, hp: boss.maxHp,
        resist: null, loot: {}, bodyColor: "#8a2020", armorColor: "#4a1010",
        bodyType: boss.bodyType, ability: bossAbilityObj,
      };
      const wid = ++walkerIdCounter;
      const spawnX = 95;
      const spawnY = 72;
      setWalkers(prev => [...prev, {
        id: wid, npcData: bossNpc, alive: true, dying: false,
        hp: boss.maxHp, maxHp: boss.maxHp, isBoss: true, friendly: false,
      }]);
      walkDataRef.current[wid] = {
        x: spawnX, y: spawnY, dir: -1,
        yDir: Math.random() < 0.5 ? 1 : -1,
        speed: boss.speed, ySpeed: 0.005,
        minX: 5, maxX: 98, minY: 65, maxY: 83,
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
    const dmgMult = 1 + roomDiff * 0.7 + waveDiff * 0.5;
    const biomeId = biome?.id || "summer";

    setDefenseMode(prev => prev ? { ...prev, enemiesRemaining: enemyCount, enemiesSpawned: enemyCount } : null);

    const timers = [];
    for (let i = 0; i < enemyCount; i++) {
      const delay = i * (800 + Math.random() * 400);
      const tid = setTimeout(() => {
        const npcData = pickNpc(biomeId);
        if (!npcData) return;
        npcData.hp = Math.round(npcData.hp * hpMult);
        const wid = ++walkerIdCounter;
        const spawnX = 92 + Math.random() * 6;
        const spawnY = 65 + Math.random() * 18;
        setWalkers(prev => [...prev, {
          id: wid, npcData, alive: true, dying: false, hp: npcData.hp, maxHp: npcData.hp,
        }]);
        walkDataRef.current[wid] = {
          x: spawnX, y: spawnY, dir: -1,
          yDir: Math.random() < 0.5 ? 1 : -1,
          speed: 0.02 + Math.random() * 0.03,
          ySpeed: 0.005 + Math.random() * 0.015,
          minX: 5, maxX: 98, minY: 65, maxY: 83,
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
          emoji: m.emoji || "👹", name: m.type, hp: minionHp,
          resist: null, loot: { copper: 2 },
          bodyColor: "#6a3030", armorColor: "#3a1818", bodyType: m.bodyType || "humanoid",
        };
        const wid = ++walkerIdCounter;
        const spawnX = 90 + i * 3;
        const spawnY = 65 + Math.random() * 18;
        setWalkers(prev => [...prev, {
          id: wid, npcData: minionNpc, alive: true, dying: false,
          hp: minionHp, maxHp: minionHp, isMinion: true,
        }]);
        walkDataRef.current[wid] = {
          x: spawnX, y: spawnY, dir: -1,
          yDir: Math.random() < 0.5 ? 1 : -1,
          speed: m.speed || 0.04,
          ySpeed: 0.005 + Math.random() * 0.015,
          minX: 5, maxX: 98, minY: 65, maxY: 83,
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
          sfxVictoryFanfare();
          setDefenseMode(prev => prev ? { ...prev, phase: "complete" } : null);
          return;
        }
      } else {
        // All enemies dead (regular defense)
        if (aliveEnemies.length === 0 && dm.enemiesSpawned > 0) {
          clearInterval(iv);
          if (dm.currentWave >= dm.totalWaves) {
            sfxVictoryFanfare();
            setDefenseMode(prev => prev ? { ...prev, phase: "complete" } : null);
          } else {
            sfxWaveComplete();
            showMessage(`Fala ${dm.currentWave} pokonana!`, "#40e060");
            // Heal all surviving mercs
            setWalkers(prev => prev.map(w =>
              w.alive && !w.dying && w.friendly ? { ...w, hp: w.maxHp } : w
            ));
            setDefenseMode(prev => prev ? {
              ...prev, phase: "inter_wave", currentWave: prev.currentWave + 1,
              timer: 8, enemiesRemaining: 0, enemiesSpawned: 0,
            } : null);
          }
          return;
        }
      }

      // Caravan destroyed (failure)
      if (caravanHpRef.current <= 0) {
        clearInterval(iv);
        sfxEventFail();
        if (activeBossRef.current) setActiveBoss(null);
        setDefenseMode(prev => prev ? { ...prev, phase: "failed" } : null);
        showMessage("Karawana zniszczona! Obrona przegrana...", "#cc4040");
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
    }
    if (defenseMode.phase === "failed" && defenseMode.roomNumber > 0) {
      const partial = { copper: 10 + Math.floor(defenseMode.roomNumber * 2) };
      addMoneyFn(partial);
    }
  }, [defenseMode?.phase]);

  const dismissDefense = useCallback(() => {
    setRelicChoices(null);
    setActiveBoss(null);
    // Clean up remaining enemies + barricade/tower (not dog — dog persists)
    for (const [id, w] of Object.entries(walkDataRef.current)) {
      if (!w.friendly || w.stationary) {
        if (physicsRef.current) physicsRef.current.removeNpc(parseInt(id));
        delete walkDataRef.current[id];
      }
    }
    setWalkers(prev => prev.filter(w => w.friendly && !w.isBarricade && !w.isTower));
    setDefenseMode(null);
  }, []);

  const selectRelic = useCallback((relic) => {
    setActiveRelics(prev => [...prev, relic]);
    setRelicChoices(null);
    showMessage(`${relic.emoji} ${relic.name} aktywowany!`, "#a050e0");
  }, [showMessage]);

  const handleToggleMusic = () => { setMusicOn(toggleMusic()); };
  const startGame = () => { setScreen("game"); enterRoom(1, []); startMusic(); };

  // Save/Load system
  const saveGame = () => {
    const saveData = {
      room, money, mana, kills, doors, initiative, inventory, hideoutItems,
      ownedTools, hideoutLevel, knightLevel, caravanLevel, caravanHp,
      bestiary, knowledge, learnedSpells, activeRelics: activeRelics.map(r => r.id),
      knowledgeUpgrades,
      savedAt: Date.now(),
    };
    try {
      localStorage.setItem("wrota_save", JSON.stringify(saveData));
      showMessage("💾 Gra zapisana!", "#40c040");
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
      setMana(s.mana || 20);
      setScreen("game");
      enterRoom(s.room || 1, s.ownedTools || []);
      startMusic();
      showMessage("💾 Gra wczytana!", "#40c040");
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
        room, money, mana, kills, doors, initiative, inventory, hideoutItems,
        ownedTools, hideoutLevel, knightLevel, caravanLevel, caravanHp,
        bestiary, knowledge, learnedSpells, activeRelics: activeRelics.map(r => r.id),
        knowledgeUpgrades,
        savedAt: Date.now(),
      };
      try { localStorage.setItem("wrota_save", JSON.stringify(saveData)); } catch {}
    }, 60000);
    return () => clearInterval(iv);
  }, [screen, room, money, mana, kills, doors, initiative, inventory, hideoutItems, ownedTools, hideoutLevel, knightLevel, caravanLevel, caravanHp, bestiary, knowledge, learnedSpells, activeRelics, knowledgeUpgrades]);

  const travelCaravan = () => {
    if (defenseMode && defenseMode.phase !== "complete" && defenseMode.phase !== "failed") {
      showMessage("Nie możesz podróżować podczas obrony!", "#cc4040"); return;
    }
    if (initiative < CARAVAN_COST) {
      showMessage("⏳ Za mało inicjatywy!", "#cc8040");
      return;
    }
    setInitiative(prev => prev - CARAVAN_COST);
    sfxDoor(); setTransitioning(true); setDoors(d => d + 1);
    const event = rollRandomEvent(room + 1);
    if (event) {
      setTimeout(() => {
        const sfxMap = { merchant: sfxMerchant, ambush: sfxAmbush, riddle: sfxRiddle, altar: sfxAltar, wounded: sfxEventAppear };
        (sfxMap[event.id] || sfxEventAppear)();
        setRandomEvent(event);
      }, 450);
    } else {
      setTimeout(() => { enterRoom(room + 1, ownedTools); setTimeout(() => setTransitioning(false), 150); }, 450);
    }
  };

  const spawnFreeMerc = useCallback((mercType, hpFraction = 1) => {
    const wid = ++walkerIdCounter;
    const spawnX = 5 + Math.random() * 8;
    const lvl = KNIGHT_LEVELS[knightLevel];
    const mult = lvl.mult || 1;
    const stoneBonus = hasRelic("stone_skin") ? 30 : 0;
    const finalHp = Math.round(mercType.hp * mult * hpFraction) + stoneBonus;
    const maxHp = Math.round(mercType.hp * mult) + stoneBonus;
    const finalDmg = Math.round(mercType.damage * mult);
    const npcData = {
      emoji: mercType.emoji, name: mercType.name,
      hp: maxHp, resist: null, loot: {},
      bodyColor: mercType.bodyColor, armorColor: mercType.armorColor,
      weapon: mercType.weapon,
    };
    setWalkers(prev => [...prev, {
      id: wid, npcData, alive: true, dying: false, hp: finalHp, maxHp, friendly: true,
    }]);
    walkDataRef.current[wid] = {
      x: spawnX, y: 65 + Math.random() * 18, dir: 1,
      yDir: Math.random() < 0.5 ? 1 : -1, speed: mercType.speed, ySpeed: 0.008 + Math.random() * 0.012,
      minX: 5, maxX: 90, minY: 65, maxY: 83, bouncePhase: 0, alive: true, friendly: true,
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
        if (item.effect === "fullMana") { setMana(MAX_MANA); showMessage(`${item.icon} ${item.name} – Pełna mana!`, "#60a0ff"); }
        else if (item.effect === "initiative") { setInitiative(prev => Math.min(MAX_INITIATIVE, prev + item.value)); showMessage(`${item.icon} ${item.name} – +${item.value} inicjatywy!`, "#d4a030"); }
        else if (item.effect === "moneyBack") { addMoneyFn(item.value); showMessage(`${item.icon} ${item.name}!`, "#d4a030"); }
        else if (item.effect === "soulstone") { setMana(MAX_MANA); addMoneyFn({ copper: item.value }); showMessage(`${item.icon} ${item.name} – Mana + monety!`, "#a050e0"); }
        else if (item.effect === "dmgBuff" || item.effect === "hpBuff") { showMessage(`${item.icon} ${item.name}!`, "#40e060"); }
        break;
      }
      case "merchantSkip": break;
      case "ambushWin":
        sfxEventSuccess();
        addMoneyFn(outcome.reward);
        showMessage(`Bandyci pokonani! +${outcome.reward.copper} 🪙`, "#40e060");
        break;
      case "ambushLose": {
        sfxEventFail();
        const loss = totalCopper(outcome.loss);
        const current = totalCopper(money);
        const actual = Math.min(loss, current);
        setMoney(copperToMoney(current - actual));
        showMessage(`Bandyci okradli cię! -${actual} 🪙`, "#cc3030");
        break;
      }
      case "riddleCorrect":
        sfxEventSuccess();
        addMoneyFn(outcome.reward);
        showMessage(`Poprawna odpowiedź! +${outcome.reward.copper} 🪙`, "#40e060");
        break;
      case "riddleWrong": {
        sfxEventFail();
        const pen = totalCopper(outcome.penalty);
        const cur = totalCopper(money);
        const actual = Math.min(pen, cur);
        setMoney(copperToMoney(cur - actual));
        showMessage(`Błędna odpowiedź! -${actual} 🪙`, "#cc3030");
        break;
      }
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
        showMessage(`${eff.emoji} ${eff.text}`, eff.type === "buff" ? "#40e060" : "#cc3030");
        break;
      }
      case "altarSkip": break;
      case "woundedRecruit": {
        sfxRecruit();
        const mt = MERCENARY_TYPES[outcome.mercIndex] || MERCENARY_TYPES[0];
        // Spawn with 50% HP after room loads
        setTimeout(() => spawnFreeMerc(mt, 0.5), 600);
        showMessage(`${mt.emoji} ${mt.name} dołączył do drużyny!`, "#40e060");
        break;
      }
      case "woundedSkip": break;
    }
    // Complete the room transition
    setRandomEvent(null);
    enterRoom(room + 1, ownedTools);
    setTimeout(() => setTransitioning(false), 150);
  }, [money, room, ownedTools, addMoneyFn, showMessage, spawnFreeMerc]);

  const openChest = () => {
    setShowChest(false); sfxChest();
    const t = pickTreasure(room); t.biome = biome.name; t.room = room;
    // greedy_merchant: x1.5 treasure value (nerfed from x2)
    if (hasRelic("greedy_merchant") && t.value) {
      if (t.value.copper) t.value.copper = Math.round(t.value.copper * 1.5);
      if (t.value.silver) t.value.silver = Math.round(t.value.silver * 1.5);
      if (t.value.gold) t.value.gold = Math.round(t.value.gold * 1.5);
    }
    setInventory(prev => [...prev, t]); setLoot(t);
  };

  const openMeteorite = () => {
    if (!meteorite || meteorite.phase !== "landed") return;
    sfxMeteorImpact();
    if (animatorRef.current) {
      const mx = GAME_W * meteorite.x / 100;
      const my = GAME_H * meteorite.y / 100;
      animatorRef.current.playMeteorImpact(mx, my);
    }
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 400);
    setMeteorite(prev => ({ ...prev, phase: "opened" }));
    showMessage("☄️ Meteoryt się otwiera!", "#ff6020");
    // Spawn 2-3 meteor monsters after short delay
    setTimeout(() => {
      const count = 2 + (Math.random() < 0.4 ? 1 : 0);
      const newWalkers = [];
      for (let i = 0; i < count; i++) {
        const npcData = pickNpc("meteor");
        if (!npcData) continue;
        const wid = ++walkerIdCounter;
        const spawnX = (meteorite.x - 10) + Math.random() * 20;
        const walkRange = 15 + Math.random() * 10;
        const speed = 0.02 + Math.random() * 0.03;
        newWalkers.push({
          id: wid, npcData, alive: true, dying: false,
          hp: npcData.hp, maxHp: npcData.hp,
        });
        const spawnY = 65 + Math.random() * 18;
        walkDataRef.current[wid] = {
          x: spawnX, y: spawnY, dir: Math.random() < 0.5 ? 1 : -1,
          yDir: Math.random() < 0.5 ? 1 : -1, speed, ySpeed: 0.005 + Math.random() * 0.015,
          minX: Math.max(5, spawnX - walkRange),
          maxX: Math.min(90, spawnX + walkRange),
          minY: 65, maxY: 83,
          bouncePhase: Math.random() * Math.PI * 2,
          alive: true, friendly: false,
          damage: Math.ceil(npcData.hp / 8),
          lungeFrames: 0, lungeOffset: 0,
          ability: npcData.ability || null,
        };
      }
      setWalkers(prev => [...prev, ...newWalkers]);
      // Spawn physics bodies for meteor NPCs
      for (const nw of newWalkers) {
        if (physicsRef.current) physicsRef.current.spawnNpc(nw.id, walkDataRef.current[nw.id].x, nw.npcData, false);
      }
    }, 600);
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
    showMessage(`${fruit.emoji} +${value} Cu`, "#40c040");
    setFruitTree(prev => prev ? { ...prev, fruits: prev.fruits.map(f => f.id === fruitId ? { ...f, picked: true } : f) } : null);
  };

  const startDigNugget = (nuggetId) => {
    if (!mineNugget || nuggetRef.current.active) return;
    if (!ownedTools.includes("pickaxe")) { showMessage("Potrzebujesz kilofa!", "#b83030"); return; }
    const duration = 3000;
    const startTime = Date.now();
    nuggetRef.current = { active: true, intervalId: null };
    setMineNugget(prev => prev ? { ...prev, activeId: nuggetId } : null);
    const id = setInterval(() => {
      const progress = Math.min(1, (Date.now() - startTime) / duration);
      setMineNugget(prev => prev ? { ...prev, progress } : null);
      if (progress >= 1) {
        clearInterval(id);
        nuggetRef.current = { active: false, intervalId: null };
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
        showMessage(`⛏️ ${reward.name}! +${nv} Cu`, "#d4a030");
        // Mark this nugget as dug, check if all dug
        setMineNugget(prev => {
          if (!prev) return null;
          const updated = prev.nuggets.map(n => n.id === nuggetId ? { ...n, dug: true } : n);
          if (updated.every(n => n.dug)) return null; // all mined
          return { ...prev, nuggets: updated, progress: 0, activeId: null };
        });
      }
    }, 50);
    nuggetRef.current.intervalId = id;
  };

  const stopDigNugget = () => {
    if (nuggetRef.current.intervalId) clearInterval(nuggetRef.current.intervalId);
    nuggetRef.current = { active: false, intervalId: null };
    setMineNugget(prev => prev ? { ...prev, progress: 0, activeId: null } : null);
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
    showMessage(`🌊 ${text}`, "#40a0ff");
  };

  const recruitFromCamp = (mercType) => {
    if (!mercCamp) return;
    const tc = totalCopper(money);
    const need = totalCopper(mercType.cost);
    if (tc < need) { showMessage("Za mało monet!", "#b83030"); return; }
    setMoney(copperToMoney(tc - need));
    sfxRecruit();
    const wid = ++walkerIdCounter;
    const spawnX = (mercCamp.x / 100) * 100; // percentage, near camp
    const lvl = KNIGHT_LEVELS[knightLevel];
    const mult = lvl.mult || 1;
    const stoneBonus = hasRelic("stone_skin") ? 30 : 0;
    const finalHp = Math.round(mercType.hp * mult) + stoneBonus;
    const finalDmg = Math.round(mercType.damage * mult);
    const npcData = {
      emoji: mercType.emoji, name: mercType.name,
      hp: finalHp, resist: null, loot: {},
      bodyColor: mercType.bodyColor, armorColor: mercType.armorColor,
      weapon: mercType.weapon,
    };
    setWalkers(prev => [...prev, {
      id: wid, npcData, alive: true, dying: false, hp: finalHp, maxHp: finalHp, friendly: true,
    }]);
    walkDataRef.current[wid] = {
      x: spawnX, y: 65 + Math.random() * 18, dir: Math.random() < 0.5 ? 1 : -1,
      yDir: Math.random() < 0.5 ? 1 : -1, speed: mercType.speed, ySpeed: 0.008 + Math.random() * 0.012,
      minX: 5, maxX: 90, minY: 65, maxY: 83, bouncePhase: 0, alive: true, friendly: true,
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
    showMessage(`${mercType.emoji} ${mercType.name} zrekrutowany! (${lvl.name})`, "#40e060");
    setMercCamp(null); // camp disappears after recruiting
  };

  const learnSpellFromWizard = () => {
    if (!wizardPoi) return;
    const spell = SPELLS.find(s => s.id === wizardPoi.spellId);
    if (!spell) return;
    const tc = totalCopper(money);
    if (tc < wizardPoi.cost) { showMessage("Za mało monet na naukę czaru!", "#b83030"); return; }
    setMoney(copperToMoney(tc - wizardPoi.cost));
    setLearnedSpells(prev => [...prev, wizardPoi.spellId]);
    sfxChest();
    showMessage(`📖 Nauczono się: ${spell.icon} ${spell.name}!`, spell.color);
    setWizardPoi(null);
  };

  // ─── SPELL CASTING WITH HP & RESISTANCE ───

  const getSpellManaCost = (spell) => {
    let cost = spell.manaCost;
    if (hasRelic("chaos_blade")) cost = Math.ceil(cost * 1.25);
    return cost;
  };

  const canCastSpell = (spell) => {
    if (!spell) return false;
    if (mana < getSpellManaCost(spell)) return false;
    const cdEnd = cooldowns[spell.id] || 0;
    if (Date.now() < cdEnd) return false;
    return true;
  };

  const castSummon = useCallback((mercType) => {
    const spell = SPELLS.find(s => s.id === "summon");
    if (!spell) return;
    setSummonPicker(false);
    // Check cooldown
    const cdEnd = cooldowns[spell.id] || 0;
    if (Date.now() < cdEnd) { showMessage("Czar jeszcze nie gotowy!", "#cc8040"); return; }
    // Check money cost
    const tc = totalCopper(money);
    const need = totalCopper(mercType.cost);
    if (tc < need) { showMessage("Za mało monet na przywołanie!", "#b83030"); return; }
    setMoney(copperToMoney(tc - need));
    setCooldowns(prev => ({ ...prev, [spell.id]: Date.now() + spell.cooldown }));
    sfxRecruit();
    if (animatorRef.current) {
      animatorRef.current.playSpell("summon", GAME_W * 0.5, GAME_H * 0.65, mercType.color || spell.color, spell.colorLight);
    }
    setTimeout(() => {
      const wid = ++walkerIdCounter;
      const spawnX = 5 + Math.random() * 8; // spawn near caravan (left side)
      const lvl = KNIGHT_LEVELS[knightLevel];
      const mult = lvl.mult || 1;
      const stoneBonus = hasRelic("stone_skin") ? 30 : 0;
      const finalHp = Math.round(mercType.hp * mult) + stoneBonus;
      const finalDmg = Math.round(mercType.damage * mult);
      const npcData = {
        emoji: mercType.emoji, name: mercType.name,
        hp: finalHp, resist: null, loot: {},
        bodyColor: mercType.bodyColor, armorColor: mercType.armorColor,
        weapon: mercType.weapon,
      };
      setWalkers(prev => [...prev, {
        id: wid, npcData, alive: true, dying: false, hp: finalHp, maxHp: finalHp, friendly: true,
      }]);
      walkDataRef.current[wid] = {
        x: spawnX, y: 65 + Math.random() * 18, dir: Math.random() < 0.5 ? 1 : -1,
        yDir: Math.random() < 0.5 ? 1 : -1, speed: mercType.speed, ySpeed: 0.008 + Math.random() * 0.012,
        minX: 5, maxX: 90, minY: 65, maxY: 83, bouncePhase: 0, alive: true, friendly: true,
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
      showMessage(`${mercType.emoji} ${mercType.name} przyzwany! (${lvl.name})`, "#40e060");
    }, 500);
  }, [money, cooldowns, knightLevel, showMessage]);

  const castSpellOnTarget = useCallback((spell, walker) => {
    if (!canCastSpell(spell)) {
      if (mana < spell.manaCost) showMessage("Za mało many!", "#4060cc");
      else showMessage("Czar jeszcze nie gotowy!", "#cc8040");
      return;
    }

    // Spend mana & set cooldown (chaos_blade: +25% mana cost)
    setMana(m => m - getSpellManaCost(spell));
    setCooldowns(prev => ({ ...prev, [spell.id]: Date.now() + spell.cooldown }));

    const sfxFn = SPELL_SFX[spell.id];
    if (sfxFn) sfxFn();

    // Get target pixel position for canvas animation (convert screen coords to game coords)
    let tx = GAME_W * 0.7, ty = GAME_H * 0.65;
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
      let damage = Math.round(spell.damage * (resistant ? RESIST_MULT : 1));
      damage = applyWeatherDamage(damage, spell.element, weatherRef.current);
      // chaos_blade: +40% spell damage
      if (hasRelic("chaos_blade")) damage = Math.round(damage * 1.40);
      // Knowledge bonus: extra damage for discovered NPCs + milestone bonus
      damage = Math.round(damage * getKnowledgeBonus(npcData.id) * getKnowledgeMilestoneBonus());
      // Element combo system
      let comboText = null;
      const prevDebuff = elementDebuffs.current[wid];
      if (prevDebuff && spell.element && prevDebuff.element !== spell.element && Date.now() - prevDebuff.timestamp < 5000) {
        const comboKey = [prevDebuff.element, spell.element].sort().join("+");
        const COMBOS = { "fire+ice": { name: "Parowy Wybuch", mult: 1.5, color: "#e0e0e0" }, "fire+lightning": { name: "Przeładowanie", mult: 1.4, color: "#ffaa20" }, "ice+lightning": { name: "Roztrzaskanie", mult: 1.6, color: "#80d0ff" }, "fire+shadow": { name: "Mroczny Płomień", mult: 1.35, color: "#a040a0" }, "ice+shadow": { name: "Lodowe Przekleństwo", mult: 1.45, color: "#6040a0" } };
        const combo = COMBOS[comboKey];
        if (combo) {
          damage = Math.round(damage * combo.mult);
          comboText = combo;
        }
      }
      if (spell.element) elementDebuffs.current[wid] = { element: spell.element, timestamp: Date.now() };
      const wd = walkDataRef.current[wid];
      const spellDirX = wd ? (wd.x > 50 ? 1 : -1) : 1;

      const weatherBoosted = weatherRef.current?.damageMult?.[spell.element] > 1;
      const weatherNerfed = weatherRef.current?.damageMult?.[spell.element] < 1;

      if (resistant) {
        const resistLabel = RESIST_NAMES[npcData.resist] || npcData.resist;
        showMessage(`🛡️ ${npcData.name} odporny na ${resistLabel}! (-70% obrażeń)`, "#6688aa");
      }
      if (comboText) {
        showMessage(`✨ COMBO: ${comboText.name}! (x${(comboText.mult).toFixed(1)})`, comboText.color);
      }

      // Show damage popup
      const dmgLabel = comboText ? `${damage} ✨` : weatherBoosted ? `${damage} ⛈️` : weatherNerfed ? `${damage} 🌧️` : resistant ? `${damage} 🛡️` : `${damage}`;
      spawnDmgPopup(wid, dmgLabel, resistant ? "#6688aa" : spell.color);

      // blood_weapon: heal random friendly for 15% of damage dealt
      if (hasRelic("blood_weapon")) {
        const friendlies = walkersRef.current.filter(w => w.alive && !w.dying && w.friendly && w.hp < w.maxHp);
        if (friendlies.length > 0) {
          const target = friendlies[Math.floor(Math.random() * friendlies.length)];
          const healAmt = Math.round(damage * 0.15);
          setWalkers(prev => prev.map(w => w.id === target.id ? { ...w, hp: Math.min(w.maxHp, w.hp + healAmt) } : w));
          spawnDmgPopup(target.id, `+${healAmt} 🩸`, "#40e060");
        }
      }

      // storm_echo: lightning 30% chain to second enemy (60% dmg)
      if (hasRelic("storm_echo") && spell.element === "lightning" && Math.random() < 0.30) {
        const otherEnemies = walkersRef.current.filter(w => w.alive && !w.dying && !w.friendly && w.id !== wid);
        if (otherEnemies.length > 0) {
          const chain = otherEnemies[Math.floor(Math.random() * otherEnemies.length)];
          const chainDmg = Math.round(damage * 0.60);
          spawnDmgPopup(chain.id, `${chainDmg} ⚡`, "#60c0ff");
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
        showMessage(`🩸 Wyssano ${healAmount} many!`, "#c02060");
      }

      setWalkers(prev => prev.map(w => {
        if (w.id !== wid) return w;
        const newHp = Math.max(0, w.hp - damage);
        if (newHp <= 0) {
          sfxNpcDeath();
          if (walkDataRef.current[wid]) walkDataRef.current[wid].alive = false;
          if (physicsRef.current) physicsRef.current.triggerRagdoll(wid, spell.element, spellDirX);
          addMoneyFn(npcData.loot);
          // golden_reaper: double loot
          if (hasRelic("golden_reaper")) addMoneyFn(npcData.loot);
          setKills(k => k + 1);
          handleCardDrop(npcData);
          // necromancer: 10% chance to spawn temp friendly
          if (hasRelic("necromancer") && Math.random() < 0.10) {
            const mt = MERCENARY_TYPES[Math.floor(Math.random() * MERCENARY_TYPES.length)];
            setTimeout(() => {
              const nid = ++walkerIdCounter;
              const sx = walkDataRef.current[wid]?.x || 50;
              const nHp = Math.round(mt.hp * 0.7);
              const nDmg = Math.round(mt.damage * 0.7);
              const nd = { emoji: mt.emoji, name: `${mt.name} 💀`, hp: nHp, resist: null, loot: {}, bodyColor: mt.bodyColor, armorColor: mt.armorColor, weapon: mt.weapon };
              setWalkers(pr => [...pr, { id: nid, npcData: nd, alive: true, dying: false, hp: nHp, maxHp: nHp, friendly: true }]);
              walkDataRef.current[nid] = { x: sx, y: 65 + Math.random() * 18, dir: 1, yDir: 1, speed: mt.speed, ySpeed: 0.01, minX: 5, maxX: 90, minY: 65, maxY: 83, bouncePhase: 0, alive: true, friendly: true, damage: nDmg, attackCd: mt.attackCd || 2500, lungeFrames: 0, lungeOffset: 0, combatStyle: mt.combatStyle || "melee", mercType: mt.id, range: mt.range || 35 };
              if (physicsRef.current) physicsRef.current.spawnNpc(nid, sx, nd, true);
              showMessage(`💀 Nekromancja! ${mt.name} przywołany!`, "#a050e0");
              setTimeout(() => {
                if (walkDataRef.current[nid]) walkDataRef.current[nid].alive = false;
                if (physicsRef.current) physicsRef.current.removeNpc(nid);
                setWalkers(pr => pr.filter(ww => ww.id !== nid));
              }, 15000);
            }, 300);
          }
          if (npcData.biomeId === "meteor" && Math.random() < 0.08) {
            const sword = { icon: "🌙", name: "Miecz Pełni Księżyca", desc: "Legendarny miecz wykuty w blasku pełni księżyca", rarity: "legendary", value: { gold: 15 }, id: Date.now() + Math.random(), biome: "Meteoryt", room };
            setInventory(prev => [...prev, sword]);
            setLoot(sword);
            showMessage("🌙 Miecz Pełni Księżyca!", "#d4a030");
          }
          if (!resistant) showMessage(`💀 ${npcData.name} pokonany! +${formatLootText(npcData.loot)}`, "#e05040");
          else setTimeout(() => showMessage(`💀 ${npcData.name} pokonany! +${formatLootText(npcData.loot)}`, "#e05040"), 800);
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
      if (mana < spell.manaCost) showMessage("Za mało many!", "#4060cc");
      else showMessage("Czar jeszcze nie gotowy!", "#cc8040");
      return;
    }

    setMana(m => m - getSpellManaCost(spell));
    setCooldowns(prev => ({ ...prev, [spell.id]: Date.now() + spell.cooldown }));

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
      setTimeout(() => setScreenShake(false), spell.id === "earthquake" ? 800 : 600);
    }

    // Apply damage to all alive enemies after delay
    const deathDelay = spell.id === "earthquake" ? 300 : spell.id === "chainlightning" ? 200 : 500;

    setTimeout(() => {
      setWalkers(prev => prev.map(w => {
        if (w.friendly || !w.alive || w.dying) return w;
        const npcData = w.npcData;
        const resistant = npcData.resist && npcData.resist === spell.element;
        let damage = Math.round(spell.damage * (resistant ? RESIST_MULT : 1));
        damage = applyWeatherDamage(damage, spell.element, weatherRef.current);
        // chaos_blade: +40% spell damage
        if (hasRelic("chaos_blade")) damage = Math.round(damage * 1.40);
        // Knowledge bonus
        damage = Math.round(damage * getKnowledgeBonus(npcData.id) * getKnowledgeMilestoneBonus());
        // Element combo for AoE
        const prevDebuff = elementDebuffs.current[w.id];
        let comboText = null;
        if (prevDebuff && spell.element && prevDebuff.element !== spell.element && Date.now() - prevDebuff.timestamp < 5000) {
          const comboKey = [prevDebuff.element, spell.element].sort().join("+");
          const COMBOS = { "fire+ice": { name: "Parowy Wybuch", mult: 1.5 }, "fire+lightning": { name: "Przeładowanie", mult: 1.4 }, "ice+lightning": { name: "Roztrzaskanie", mult: 1.6 }, "fire+shadow": { name: "Mroczny Płomień", mult: 1.35 }, "ice+shadow": { name: "Lodowe Przekleństwo", mult: 1.45 } };
          const combo = COMBOS[comboKey];
          if (combo) { damage = Math.round(damage * combo.mult); comboText = combo; }
        }
        if (spell.element) elementDebuffs.current[w.id] = { element: spell.element, timestamp: Date.now() };
        const wd = walkDataRef.current[w.id];
        const spellDirX = wd ? (wd.x > 50 ? 1 : -1) : 1;

        const weatherBoosted = weatherRef.current?.damageMult?.[spell.element] > 1;
        const weatherNerfed = weatherRef.current?.damageMult?.[spell.element] < 1;

        if (resistant) {
          const resistLabel = RESIST_NAMES[npcData.resist] || npcData.resist;
          showMessage(`🛡️ ${npcData.name} odporny na ${resistLabel}!`, "#6688aa");
        }

        const dmgLabel = comboText ? `${damage} ✨` : weatherBoosted ? `${damage} ⛈️` : weatherNerfed ? `${damage} 🌧️` : resistant ? `${damage} 🛡️` : `${damage}`;
        spawnDmgPopup(w.id, dmgLabel, resistant ? "#6688aa" : spell.color);

        // blood_weapon: heal random friendly for 15% of damage
        if (hasRelic("blood_weapon")) {
          const friendlies = prev.filter(ww => ww.alive && !ww.dying && ww.friendly && ww.hp < ww.maxHp);
          if (friendlies.length > 0) {
            const target = friendlies[Math.floor(Math.random() * friendlies.length)];
            const healAmt = Math.round(damage * 0.15);
            // Apply heal in a separate setState to avoid conflicts
            setTimeout(() => {
              setWalkers(pr => pr.map(ww => ww.id === target.id ? { ...ww, hp: Math.min(ww.maxHp, ww.hp + healAmt) } : ww));
              spawnDmgPopup(target.id, `+${healAmt} 🩸`, "#40e060");
            }, 50);
          }
        }

        const newHp = Math.max(0, w.hp - damage);
        if (newHp <= 0) {
          sfxNpcDeath();
          if (walkDataRef.current[w.id]) walkDataRef.current[w.id].alive = false;
          if (physicsRef.current) physicsRef.current.triggerRagdoll(w.id, spell.element, spellDirX);
          addMoneyFn(npcData.loot);
          // golden_reaper: double loot
          if (hasRelic("golden_reaper")) addMoneyFn(npcData.loot);
          setKills(k => k + 1);
          handleCardDrop(npcData);
          // necromancer: 10% chance to spawn temp friendly
          if (hasRelic("necromancer") && Math.random() < 0.10) {
            const mt = MERCENARY_TYPES[Math.floor(Math.random() * MERCENARY_TYPES.length)];
            setTimeout(() => {
              const nid = ++walkerIdCounter;
              const sx = walkDataRef.current[w.id]?.x || 50;
              const nHp = Math.round(mt.hp * 0.7);
              const nDmg = Math.round(mt.damage * 0.7);
              const nd = { emoji: mt.emoji, name: `${mt.name} 💀`, hp: nHp, resist: null, loot: {}, bodyColor: mt.bodyColor, armorColor: mt.armorColor, weapon: mt.weapon };
              setWalkers(pr => [...pr, { id: nid, npcData: nd, alive: true, dying: false, hp: nHp, maxHp: nHp, friendly: true }]);
              walkDataRef.current[nid] = { x: sx, y: 65 + Math.random() * 18, dir: 1, yDir: 1, speed: mt.speed, ySpeed: 0.01, minX: 5, maxX: 90, minY: 65, maxY: 83, bouncePhase: 0, alive: true, friendly: true, damage: nDmg, attackCd: mt.attackCd || 2500, lungeFrames: 0, lungeOffset: 0, combatStyle: mt.combatStyle || "melee", mercType: mt.id, range: mt.range || 35 };
              if (physicsRef.current) physicsRef.current.spawnNpc(nid, sx, nd, true);
              showMessage(`💀 Nekromancja! ${mt.name} przywołany!`, "#a050e0");
              setTimeout(() => {
                if (walkDataRef.current[nid]) walkDataRef.current[nid].alive = false;
                if (physicsRef.current) physicsRef.current.removeNpc(nid);
                setWalkers(pr => pr.filter(ww => ww.id !== nid));
              }, 15000);
            }, 300);
          }
          showMessage(`💀 ${npcData.name} pokonany! +${formatLootText(npcData.loot)}`, "#e05040");
          setTimeout(() => {
            setWalkers(pr => pr.map(ww => ww.id === w.id ? { ...ww, alive: false } : ww));
          }, 2500);
          return { ...w, hp: 0, dying: true, dyingAt: Date.now() };
        }
        if (physicsRef.current) physicsRef.current.applyHit(w.id, spell.element, spellDirX);
        return { ...w, hp: newHp };
      }));

      // AoE also damages towers
      setTraps(prev => prev.map(t => {
        if (t.type !== "tower" || !t.active) return t;
        const newHp = t.hp - spell.damage;
        if (newHp <= 0) {
          sfxNpcDeath();
          showMessage("🏗️ Wieża zniszczona!", "#e0a040");
          return { ...t, hp: 0, active: false };
        }
        return { ...t, hp: newHp };
      }));
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
    castSpellOnTarget(spell, walker);
  };

  const handleNpcClick = (walker) => {
    if (walker.friendly) return;
    if (!selectedSpell) {
      // Inspect NPC – show info in bottom-left
      setInspectedNpc({
        emoji: walker.npcData.emoji,
        name: walker.npcData.name,
        hp: walker.hp,
        maxHp: walker.maxHp,
        resist: walker.npcData.resist,
        rarity: walker.npcData.rarity,
        biomeEmoji: biome?.emoji || "",
        biomeName: biome?.name || "",
      });
      setTimeout(() => setInspectedNpc(null), 4000);
      return;
    }
    const spell = SPELLS.find(s => s.id === selectedSpell);
    if (!spell) return;
    if (spell.aoe) { castAoeSpell(spell); return; }
    castSpellOnTarget(spell, walker);
  };

  const handleSelectSpell = (spellId) => {
    if (spellId === "summon") {
      setSummonPicker(prev => !prev);
      setSelectedSpell(null);
      return;
    }
    setSummonPicker(false);
    // AoE spells cast immediately on selection (no target needed)
    const spell = SPELLS.find(s => s.id === spellId);
    if (spell && spell.aoe) {
      castAoeSpell(spell);
      return;
    }
    setSelectedSpell(prev => prev === spellId ? null : spellId);
  };

  // ─── TOWER ATTACK (cast spell on tower) ───
  const attackTower = (trapId) => {
    if (!selectedSpell) return;
    const spell = SPELLS.find(s => s.id === selectedSpell);
    if (!spell || spell.id === "summon") return;
    if (!canCastSpell(spell)) {
      if (mana < spell.manaCost) showMessage("Za mało many!", "#4060cc");
      else showMessage("Czar jeszcze nie gotowy!", "#cc8040");
      return;
    }
    setMana(m => m - spell.manaCost);
    setCooldowns(prev => ({ ...prev, [spell.id]: Date.now() + spell.cooldown }));
    const sfxFn = SPELL_SFX[spell.id];
    if (sfxFn) sfxFn();

    const trap = traps.find(t => t.id === trapId);
    if (!trap) return;

    // Play spell animation toward tower position
    if (animatorRef.current) {
      const tx = GAME_W * (trap.x / 100);
      const ty = GAME_H * 0.58;
      animatorRef.current.playSpell(spell.id, tx, ty, spell.color, spell.colorLight);
    }

    setTimeout(() => {
      setTraps(prev => prev.map(t => {
        if (t.id !== trapId || !t.active) return t;
        const newHp = t.hp - spell.damage;
        if (newHp <= 0) {
          sfxNpcDeath();
          showMessage("🏗️ Wieża zniszczona!", "#e0a040");
          return { ...t, hp: 0, active: false };
        }
        showMessage(`🏗️ Wieża: ${newHp}/${t.maxHp} HP`, "#cc8040");
        return { ...t, hp: newHp };
      }));
    }, 450);

    setSelectedSpell(null);
  };

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
    showMessage(`Przeniesiono ${toStore.length} przedmiotów do kryjówki!`, "#40a8b8");
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
    if (mana >= MAX_MANA) { showMessage("Mana pełna!", "#60a0ff"); return; }
    const tc = totalCopper(money); const need = totalCopper(potion.cost);
    if (tc < need) { showMessage("Za mało monet!", "#b83030"); return; }
    sfxDrinkMana(); setMoney(copperToMoney(tc - need));
    setMana(prev => Math.min(MAX_MANA, prev + potion.mana));
    showMessage(`+${potion.mana} many! 🔮`, "#60a0ff");
  };

  const storeItem = (idx) => {
    const hlvl = HIDEOUT_LEVELS[hideoutLevel];
    if (hideoutItems.length >= hlvl.slots) { showMessage("Kryjówka pełna!", "#b83030"); return; }
    sfxStore(); const it = inventory[idx];
    setInventory(prev => prev.filter((_, i) => i !== idx));
    setHideoutItems(prev => [...prev, it]); setSelectedInv(-1);
    showMessage(`${it.name} → Kryjówka`, "#40a8b8");
  };

  const retrieveItem = (idx) => {
    sfxRetrieve(); const it = hideoutItems[idx];
    setHideoutItems(prev => prev.filter((_, i) => i !== idx));
    setInventory(prev => [...prev, it]); showMessage(`${it.name} ← z Kryjówki`, "#50a850");
  };

  const upgradeHideout = () => {
    if (hideoutLevel >= HIDEOUT_LEVELS.length - 1) return;
    const next = HIDEOUT_LEVELS[hideoutLevel + 1];
    const tc = totalCopper(money); const need = totalCopper(next.cost);
    if (tc < need) { showMessage("Za mało monet!", "#b83030"); return; }
    sfxUpgrade(); setMoney(copperToMoney(tc - need));
    setHideoutLevel(l => l + 1);
    showMessage(`Kryjówka → ${HIDEOUT_LEVELS[hideoutLevel + 1].name}`, "#d4a030");
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
    showMessage(`${next.emoji} Najemnicy ulepszeni: ${next.name}! (x${next.mult})`, "#40e060");
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
    showMessage(`🐴 Karawana → ${next.name}! (HP:${next.hp}, Armor:${next.armor})`, "#d4a030");
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
    const names = { manaPool: "Pula Many", spellPower: "Moc Czarów", manaRegen: "Regeneracja Many" };
    showMessage(`📖 Ulepszono ${names[upgradeId]}!`, "#60a0ff");
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
        <div style={{ color: "#3a2a1a", fontSize: 26, letterSpacing: 8, marginBottom: 10 }}>⚜ ─── ⚜ ─── ⚜</div>
        <div style={{ fontSize: 60, marginBottom: 16, filter: "drop-shadow(0 0 16px rgba(212,160,48,0.25))" }}>⚔️🚪⚔️</div>
        <h1 style={{ fontSize: 32, fontWeight: "bold", color: "#d4a030", textShadow: "3px 3px 0 #000, 0 0 25px rgba(212,160,48,0.25)", marginBottom: 8, textAlign: "center" }}>Wrota Przeznaczenia</h1>
        <p style={{ fontSize: 18, color: "#6a5a4a", marginBottom: 36 }}>Znajdź klucz • Otwórz wrota • Zdobądź skarby</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
          <button onClick={startGame} style={{
            fontWeight: "bold", fontSize: 20, background: "none", border: "3px solid #d4a030", color: "#d4a030",
            padding: "12px 36px", cursor: "pointer", textShadow: "1px 1px 0 #000", animation: "pulse 2s infinite",
          }}>❖ Nowa Gra ❖</button>
          {hasSaveGame() && (
            <button onClick={loadGame} style={{
              fontWeight: "bold", fontSize: 16, background: "none", border: "2px solid #4080cc", color: "#60a0ff",
              padding: "8px 28px", cursor: "pointer", textShadow: "1px 1px 0 #000",
            }}>💾 Kontynuuj</button>
          )}
        </div>
        <style>{`@keyframes pulse{0%,100%{box-shadow:0 0 8px rgba(212,160,48,0.2)}50%{box-shadow:0 0 22px rgba(212,160,48,0.45)}}`}</style>
      </div>
    );
  }

  // GAME
  return (
    <div style={appStyle} className="game-no-select">
      <div style={scanlinesStyle} /><div style={vignetteStyle} />

      {/* Desktop: TopBar fixed at top, outside game container */}
      {!isMobile && (
        <TopBar doors={doors} initiative={initiative} treasures={inventory.length} money={money} mana={mana} maxMana={MAX_MANA}
          onInv={() => togglePanel("inv")} onShop={() => togglePanel("shop")} onHideout={() => togglePanel("hideout")}
          onBestiary={() => togglePanel("bestiary")} knowledge={knowledge}
          musicOn={musicOn} onToggleMusic={handleToggleMusic} onSave={saveGame} isMobile={false} />
      )}

      {/* Scaled game container – fills entire screen on mobile */}
      <div ref={gameContainerRef} style={{
        width: GAME_W, height: GAME_H,
        transform: `scale(${gameScale})`,
        transformOrigin: "center center",
        position: "relative",
        overflow: "hidden",
        animation: screenShake ? "screenShake 0.08s infinite alternate" : "none",
        touchAction: "manipulation",
        WebkitTouchCallout: "none",
      }}>

      {/* Mobile: TopBar INSIDE game container at top */}
      {isMobile && (
        <TopBar doors={doors} initiative={initiative} treasures={inventory.length} money={money} mana={mana} maxMana={MAX_MANA}
          onInv={() => togglePanel("inv")} onShop={() => togglePanel("shop")} onHideout={() => togglePanel("hideout")}
          onBestiary={() => togglePanel("bestiary")} knowledge={knowledge}
          musicOn={musicOn} onToggleMusic={handleToggleMusic} onSave={saveGame} isMobile={true} gameW={GAME_W} />
      )}
      <canvas ref={canvasRef} style={{ position: "absolute", top: 0, left: 0, width: GAME_W, height: GAME_H }} />
      <canvas ref={animCanvasRef} style={{ position: "absolute", top: 0, left: 0, width: GAME_W, height: GAME_H, pointerEvents: "none" }} />
      <canvas ref={physicsCanvasRef} style={{ position: "absolute", top: 0, left: 0, width: GAME_W, height: GAME_H, pointerEvents: "none", zIndex: 12 }} />

      {/* Room & biome label – top center below TopBar */}
      {biome && (
        <div style={{
          position: "absolute", top: isMobile ? 38 : 56, left: "50%", transform: "translateX(-50%)",
          fontWeight: "bold", fontSize: isMobile ? 10 : 14, padding: isMobile ? "2px 8px" : "4px 16px", zIndex: 20, textShadow: "2px 2px 0 #000",
          color: "#ccc", background: "rgba(26,14,18,0.85)", border: isMobile ? "1px solid #5a4030" : "2px solid #5a4030",
          boxShadow: "inset 0 0 10px rgba(0,0,0,0.4)", whiteSpace: "nowrap",
          opacity: transitioning ? 0 : 1, transition: "opacity 0.5s",
        }}>
          Komnata #{room} — {biome.emoji} {biome.name}{isNight ? " 🌙" : ""}{weather ? ` ${weather.emoji}` : ""}{defenseMode ? " ⚔️ OBRONA" : ""}
        </div>
      )}

      <WaveOverlay defense={defenseMode} onDismiss={dismissDefense}
        caravanHp={caravanHp} caravanMaxHp={CARAVAN_LEVELS[caravanLevel].hp}
        relicChoices={relicChoices} boss={activeBoss} />
      {activeBoss && (
        <BossHpBar
          boss={activeBoss}
          currentHp={activeBoss.currentHp}
          maxHp={activeBoss.maxHp}
          phase={activeBoss.phase}
          manaShieldHp={activeBoss.manaShieldHp || 0}
          manaShieldMaxHp={activeBoss.manaShieldMaxHp || 0}
        />
      )}
      <RelicPicker choices={relicChoices} onSelect={selectRelic} />
      <WeatherOverlay weather={weather} />

      <Caravan
        initiative={initiative}
        maxInitiative={MAX_INITIATIVE}
        cost={CARAVAN_COST}
        canTravel={initiative >= CARAVAN_COST && (!defenseMode || defenseMode.phase === "complete" || defenseMode.phase === "failed")}
        onClick={travelCaravan}
        hp={caravanHp}
        maxHp={CARAVAN_LEVELS[caravanLevel].hp}
        showHp={caravanHp < CARAVAN_LEVELS[caravanLevel].hp || (!!defenseMode && defenseMode.phase !== "complete" && defenseMode.phase !== "failed")}
      />

      {showChest && <Chest pos={chestPos} onClick={openChest} />}

      {/* Meteorite event – falling from sky */}
      {meteorite && meteorite.phase === "falling" && (
        <div style={{
          position: "absolute", left: `${meteorite.x}%`, top: 0, zIndex: 18,
          fontSize: 48, userSelect: "none", pointerEvents: "none",
          animation: `meteorFall 1s ease-in forwards`,
          "--meteor-land-y": `${(meteorite.y / 100) * GAME_H}px`,
        }}>
          <div style={{
            filter: "drop-shadow(0 0 24px rgba(255,80,0,0.9)) drop-shadow(0 0 48px rgba(255,40,0,0.6))",
          }}>☄️</div>
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
          background: "radial-gradient(ellipse at center, rgba(255,100,0,0.35), transparent 70%)",
          pointerEvents: "none",
          animation: "meteorFlash 0.5s ease-out forwards",
        }} />
      )}

      {/* Meteorite landed – clickable, looks like a glowing rock */}
      {meteorite && meteorite.phase === "landed" && (
        <div onClick={openMeteorite} style={{
          position: "absolute", left: `${meteorite.x}%`, top: `${meteorite.y}%`, zIndex: 15,
          cursor: "pointer", userSelect: "none",
          animation: "meteorPulse 1.5s ease-in-out infinite",
        }}>
          <div style={{
            width: 48, height: 36, borderRadius: "40% 50% 45% 38%",
            background: "radial-gradient(ellipse at 35% 30%, #6a5040, #3a2a1e 50%, #1e140e 90%)",
            border: "2px solid #2a1a10",
            boxShadow: "inset -4px -4px 8px rgba(0,0,0,0.6), inset 2px 2px 4px rgba(140,100,60,0.3), 0 0 18px rgba(255,80,0,0.5), 0 0 40px rgba(255,60,0,0.25)",
            position: "relative", overflow: "hidden",
          }}>
            {/* Glowing cracks */}
            <div style={{ position: "absolute", top: "30%", left: "10%", width: "70%", height: 2, background: "rgba(255,100,20,0.7)", transform: "rotate(15deg)", borderRadius: 1, filter: "blur(0.5px)", boxShadow: "0 0 6px rgba(255,80,0,0.6)" }} />
            <div style={{ position: "absolute", top: "55%", left: "20%", width: "55%", height: 2, background: "rgba(255,80,0,0.6)", transform: "rotate(-20deg)", borderRadius: 1, filter: "blur(0.5px)", boxShadow: "0 0 5px rgba(255,60,0,0.5)" }} />
            <div style={{ position: "absolute", top: "40%", left: "45%", width: "40%", height: 2, background: "rgba(255,120,40,0.5)", transform: "rotate(50deg)", borderRadius: 1, filter: "blur(0.5px)", boxShadow: "0 0 4px rgba(255,80,0,0.4)" }} />
            {/* Hot spot glow */}
            <div style={{ position: "absolute", top: "20%", left: "25%", width: 12, height: 10, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,140,40,0.4), transparent)", filter: "blur(2px)" }} />
          </div>
          {/* Ground glow */}
          <div style={{
            position: "absolute", left: "50%", bottom: -10, transform: "translateX(-50%)",
            width: 90, height: 20,
            background: "radial-gradient(ellipse at center, rgba(255,80,0,0.35) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />
        </div>
      )}

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
              position: "absolute", left: `${resourceNode.pos.x}%`, top: `${resourceNode.pos.y}%`, zIndex: 15,
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
              {resourceNode.terrain === "forest" ? "🪵" : "⛏️"}
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
          position: "absolute", left: `${fruitTree.x}%`, bottom: "28%", zIndex: 14,
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
                position: "absolute", left: `${f.x}%`, top: `${f.y}%`,
                fontSize: 16, cursor: "pointer",
                filter: "drop-shadow(0 0 4px rgba(255,200,60,0.5))",
                animation: "keyF 2.5s ease-in-out infinite",
                animationDelay: `${f.id * 0.3}s`,
              }}>{f.emoji}</div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 2, fontSize: 9, color: "#8a8", textShadow: "1px 1px 0 #000" }}>
            🌳 {fruitTree.label}
          </div>
        </div>
      )}

      {/* ─── MINE (biome variant rock formation) ─── */}
      {mineNugget && (
        <div style={{
          position: "absolute", left: `${mineNugget.x}%`, bottom: "28%", zIndex: 14,
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
            {/* Ore veins */}
            {mineNugget.nuggets.map(n => !n.dug && (
              <div key={n.id}
                onMouseDown={() => startDigNugget(n.id)}
                onMouseUp={stopDigNugget}
                onMouseLeave={stopDigNugget}
                onTouchStart={() => startDigNugget(n.id)}
                onTouchEnd={stopDigNugget}
                style={{
                  position: "absolute", left: `${n.x}%`, top: `${n.y}%`,
                  fontSize: 14, cursor: "pointer",
                  filter: "drop-shadow(0 0 6px rgba(212,160,48,0.6))",
                  animation: mineNugget.activeId === n.id
                    ? `mineShake ${Math.max(0.06, 0.12 - mineNugget.progress * 0.06)}s infinite alternate`
                    : "resNode 3s ease-in-out infinite",
                  animationDelay: `${n.id * 0.4}s`,
                }}>{mineNugget.oreEmoji}</div>
            ))}
          </div>
          {mineNugget.progress > 0 && (
            <div style={{
              width: 42, height: 5, background: "rgba(0,0,0,0.75)",
              border: "1px solid #555", borderRadius: 2, margin: "3px auto 0", overflow: "hidden",
            }}>
              <div style={{
                height: "100%", width: `${mineNugget.progress * 100}%`,
                background: mineNugget.progress > 0.75 ? "#d4a030" : "#a08040",
                transition: "width 0.05s linear", borderRadius: 1,
              }} />
            </div>
          )}
          <div style={{ textAlign: "center", marginTop: 2, fontSize: 9, color: "#8a8", textShadow: "1px 1px 0 #000" }}>
            ⛏️ {mineNugget.label}
          </div>
        </div>
      )}

      {/* ─── WATERFALL (biome variant) ─── */}
      {waterfall && (() => {
        const [wr,wg,wb] = waterfall.rgb;
        return (
        <div style={{
          position: "absolute", left: `${waterfall.x}%`, bottom: "28%", zIndex: 13,
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
              {waterfall.frozen ? "🧊 Rozbij lód" : "🌊 Sprawdź"}
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
          position: "absolute", left: `${mercCamp.x}%`, bottom: "28%", zIndex: 14,
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
            }}>🔥</div>
            {/* Weapon rack */}
            <div style={{
              position: "absolute", bottom: 0, right: -8, fontSize: 12,
            }}>⚔️</div>
          </div>
          {/* Recruit buttons */}
          <div style={{ display: "flex", gap: 3, justifyContent: "center", marginTop: 3 }}>
            {MERCENARY_TYPES.map(m => {
              const cost = totalCopper(m.cost);
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
                  }}>{m.emoji}</div>
              );
            })}
          </div>
          <div style={{ textAlign: "center", marginTop: 1, fontSize: 9, color: "#d4a030", textShadow: "1px 1px 0 #000" }}>
            ⛺ Obóz Najemników
          </div>
        </div>
      )}

      {/* ─── WIZARD TENT POI ─── */}
      {wizardPoi && (() => {
        const spell = SPELLS.find(s => s.id === wizardPoi.spellId);
        if (!spell) return null;
        const canAfford = totalCopper(money) >= wizardPoi.cost;
        return (
          <div style={{
            position: "absolute", left: `${wizardPoi.x}%`, bottom: "22%", zIndex: 14,
            transform: "translateX(-50%)", userSelect: "none", textAlign: "center",
          }}>
            {/* Wizard tent */}
            <div style={{ position: "relative", width: 65, height: 55 }}>
              {/* Tent fabric – pointed top, mystical purple */}
              <div style={{
                width: 0, height: 0,
                borderLeft: "32px solid transparent", borderRight: "32px solid transparent",
                borderBottom: "35px solid #302060",
                position: "absolute", top: 0, left: 0,
              }} />
              <div style={{
                position: "absolute", top: 35, left: 2, right: 2, height: 18,
                background: "linear-gradient(180deg,#302060,#201848)",
                borderRadius: "0 0 3px 3px",
              }} />
              {/* Stars on tent */}
              <div style={{ position: "absolute", top: 18, left: 12, fontSize: 7, opacity: 0.8 }}>✨</div>
              <div style={{ position: "absolute", top: 28, right: 14, fontSize: 6, opacity: 0.7 }}>⭐</div>
              <div style={{ position: "absolute", top: 12, right: 20, fontSize: 5, opacity: 0.6 }}>✨</div>
              {/* Tent opening */}
              <div style={{
                position: "absolute", top: 26, left: "50%", transform: "translateX(-50%)",
                width: 14, height: 26,
                background: "linear-gradient(180deg,#0a0620,#060410)",
                borderRadius: "5px 5px 0 0",
              }} />
              {/* Pole top with glowing orb */}
              <div style={{
                position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)",
                width: 3, height: 10, background: "#4a3060", borderRadius: 1,
              }} />
              <div style={{
                position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)",
                width: 10, height: 10, borderRadius: "50%",
                background: `radial-gradient(circle,${spell.color},${spell.color}40)`,
                boxShadow: `0 0 10px ${spell.color}`,
                animation: "resNode 2s ease-in-out infinite",
              }} />
              {/* Crystal ball at entrance */}
              <div style={{
                position: "absolute", bottom: -2, left: "50%", transform: "translateX(-50%)",
                fontSize: 12, animation: "keyF 3s ease-in-out infinite",
              }}>🔮</div>
            </div>
            {/* Spell offer – icon button like merc camp */}
            <div style={{ display: "flex", justifyContent: "center", marginTop: 4 }}>
              <div onClick={() => canAfford && learnSpellFromWizard()}
                title={`${spell.name} – ${wizardPoi.cost} Cu`}
                style={{
                  fontSize: 20, cursor: canAfford ? "pointer" : "not-allowed",
                  opacity: canAfford ? 1 : 0.4,
                  filter: canAfford ? `drop-shadow(0 0 6px ${spell.color})` : "none",
                  animation: canAfford ? "keyF 2.5s ease-in-out infinite" : "none",
                }}>
                {spell.icon}
              </div>
            </div>
            <div style={{ fontSize: 8, color: canAfford ? "#d4a030" : "#666", marginTop: 1 }}>
              💰 {wizardPoi.cost} Cu
            </div>
            <div style={{ fontSize: 9, color: "#8080c0", textShadow: "1px 1px 0 #000", marginTop: 1 }}>
              🔮 Namiot Czarownika
            </div>
          </div>
        );
      })()}

      {/* ─── TRAPS ─── */}
      {traps.map(trap => {
        if (!trap.active && trap.type !== "mine") return null; // mines show explosion briefly
        if (trap.type === "mine" && !trap.active && Date.now() - (trap._explodeAt || 0) > 1500) return null;

        if (trap.type === "spikes") {
          const cycle = Date.now() % 4000;
          const spikesUp = cycle < 1200;
          const spikeH = spikesUp ? 18 : 3;
          return (
            <div key={trap.id} style={{
              position: "absolute", left: `${trap.x}%`, bottom: "22%", zIndex: 13,
              transform: "translateX(-50%)", pointerEvents: "none",
            }}>
              {/* Base plate */}
              <div style={{
                width: 40, height: 6, background: "linear-gradient(180deg,#5a4a3a,#3a2a1a)",
                borderRadius: 2, position: "relative",
              }}>
                {/* Spikes */}
                {[0, 8, 16, 24, 32].map((sx, i) => (
                  <div key={i} style={{
                    position: "absolute", bottom: 5, left: sx,
                    width: 0, height: 0,
                    borderLeft: "4px solid transparent", borderRight: "4px solid transparent",
                    borderBottom: `${spikeH}px solid #8a8a8a`,
                    transition: "border-bottom-width 0.15s ease-out",
                    filter: spikesUp ? "drop-shadow(0 -2px 3px rgba(200,50,50,0.4))" : "none",
                  }} />
                ))}
              </div>
              {spikesUp && (
                <div style={{ fontSize: 8, color: "#cc4040", textAlign: "center", marginTop: 1, textShadow: "1px 1px 0 #000" }}>
                  ⚠️ Kolce!
                </div>
              )}
            </div>
          );
        }

        if (trap.type === "mine") {
          if (trap.triggered) {
            // Explosion visual
            return (
              <div key={trap.id} style={{
                position: "absolute", left: `${trap.x}%`, bottom: "23%", zIndex: 13,
                transform: "translateX(-50%)", pointerEvents: "none",
                fontSize: 28, animation: "dmgFloat 1.5s ease-out forwards",
              }}>💥</div>
            );
          }
          return (
            <div key={trap.id} style={{
              position: "absolute", left: `${trap.x}%`, bottom: "22.5%", zIndex: 10,
              transform: "translateX(-50%)", pointerEvents: "none",
            }}>
              {/* Partially buried mine */}
              <div style={{
                width: 14, height: 8,
                background: "radial-gradient(ellipse, #5a5a5a, #3a3020)",
                borderRadius: "50%",
                border: "1px solid #6a6050",
                boxShadow: "0 1px 3px rgba(0,0,0,0.5)",
              }} />
              <div style={{
                position: "absolute", top: -3, left: "50%", transform: "translateX(-50%)",
                width: 4, height: 4, borderRadius: "50%",
                background: "radial-gradient(circle, #ff4020, #aa2010)",
                animation: "resNode 1.5s ease-in-out infinite",
              }} />
            </div>
          );
        }

        if (trap.type === "tower" && trap.active) {
          const hpPct = trap.hp / trap.maxHp;
          return (
            <div key={trap.id} style={{
              position: "absolute", left: `${trap.x}%`, bottom: "22%", zIndex: 15,
              transform: "translateX(-50%)", userSelect: "none", textAlign: "center",
              cursor: selectedSpell ? "crosshair" : "pointer",
            }}
              onClick={() => attackTower(trap.id)}
            >
              {/* Tower structure */}
              <div style={{ position: "relative", width: 30, height: 65 }}>
                {/* Tower base */}
                <div style={{
                  position: "absolute", bottom: 0, left: 1, right: 1, height: 40,
                  background: "linear-gradient(180deg,#5a5050,#3a3030,#2a2020)",
                  borderRadius: "2px 2px 0 0",
                  border: "1px solid #4a4040",
                }} />
                {/* Tower top / battlements */}
                <div style={{
                  position: "absolute", bottom: 40, left: -3, right: -3, height: 10,
                  background: "#4a4040",
                  borderRadius: "2px 2px 0 0",
                }}>
                  {/* Crenellations */}
                  {[-3, 5, 13, 21, 29].map((cx, i) => (
                    <div key={i} style={{
                      position: "absolute", top: -6, left: cx,
                      width: 6, height: 6,
                      background: "#5a5050",
                      border: "1px solid #6a6060",
                    }} />
                  ))}
                </div>
                {/* Arrow slit */}
                <div style={{
                  position: "absolute", bottom: 18, left: "50%", transform: "translateX(-50%)",
                  width: 3, height: 12,
                  background: "#0a0808",
                  boxShadow: "inset 0 0 3px rgba(255,100,0,0.3)",
                }} />
                {/* Crossbow / weapon on top */}
                <div style={{
                  position: "absolute", bottom: 50, left: "50%", transform: "translateX(-50%)",
                  fontSize: 14,
                }}>🏹</div>
                {/* Damage glow when low HP */}
                {hpPct < 0.5 && (
                  <div style={{
                    position: "absolute", bottom: 5, left: 3, right: 3, height: 15,
                    background: "rgba(255,60,20,0.15)",
                    animation: "resNode 1s ease-in-out infinite",
                  }} />
                )}
              </div>
              {/* HP bar */}
              <div style={{
                width: 34, height: 4, background: "rgba(0,0,0,0.7)",
                border: "1px solid #555", marginTop: 2, marginLeft: "auto", marginRight: "auto",
              }}>
                <div style={{
                  width: `${hpPct * 100}%`, height: "100%",
                  background: hpPct > 0.5 ? "#cc4040" : "#ff3020",
                  transition: "width 0.2s",
                }} />
              </div>
              <div style={{ fontSize: 8, color: "#aa6040", textShadow: "1px 1px 0 #000", marginTop: 1 }}>
                🏗️ Wieża
              </div>
            </div>
          );
        }

        // Destroyed tower
        if (trap.type === "tower" && !trap.active) {
          return (
            <div key={trap.id} style={{
              position: "absolute", left: `${trap.x}%`, bottom: "22%", zIndex: 10,
              transform: "translateX(-50%)", pointerEvents: "none", opacity: 0.4,
            }}>
              <div style={{ position: "relative", width: 30, height: 25 }}>
                <div style={{
                  position: "absolute", bottom: 0, left: 3, right: 3, height: 20,
                  background: "linear-gradient(180deg,#4a4040,#2a2020)",
                  borderRadius: "2px 2px 0 0",
                  clipPath: "polygon(0 40%, 30% 0, 60% 20%, 100% 0, 100% 100%, 0 100%)",
                }} />
              </div>
              <div style={{ fontSize: 8, color: "#666", textAlign: "center", marginTop: 1 }}>ruiny</div>
            </div>
          );
        }

        return null;
      })}

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
              top: "calc(60% - 75px)",
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
            {/* Attack telegraph – shows when enemy is lunging */}
            {w.alive && !w.dying && !isFriendly && walkDataRef.current[w.id]?.lungeFrames > 0 && (
              <div style={{
                fontSize: 14, animation: "dmgFloat 0.5s ease-out",
                color: "#ff4040", fontWeight: "bold", pointerEvents: "none",
              }}>⚠️</div>
            )}
            {/* HP Bar — skip for boss (uses BossHpBar at top) */}
            {w.alive && !w.dying && !isBossWalker && (
              <div style={{
                width: 52, height: 6,
                background: "rgba(0,0,0,0.7)",
                border: `1px solid ${isFriendly ? "#2a6a2a" : "#555"}`,
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
            {/* Resist icon */}
            {w.alive && !w.dying && !isFriendly && w.npcData.resist && (
              <div style={{
                fontSize: 10, marginBottom: -2, pointerEvents: "none",
                opacity: 0.7,
              }}>
                {w.npcData.resist === "fire" ? "🔥" : "🧊"}
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
          left: `${p.x}%`,
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
          <div style={{ fontWeight: "bold", color: "#d4a030", marginBottom: 2, fontSize: isMobile ? 9 : 12 }}>🔭 Zwiad</div>
          <div>Komnata #{nextRoomPreview.room}: {nextRoomPreview.biome.emoji} {nextRoomPreview.biome.name}</div>
          {nextRoomPreview.isDefense && <div style={{ color: "#e05040", fontWeight: "bold" }}>⚔️ Obrona karawany!</div>}
          {nextRoomPreview.isBoss && <div style={{ color: "#ff4040", fontWeight: "bold" }}>💀 Boss!</div>}
        </div>
      )}

      {/* Kill counter */}
      {kills > 0 && (
        <div style={{ position: "absolute", top: isMobile ? 38 : 58, left: isMobile ? 4 : 12, fontSize: isMobile ? 10 : 13, color: "#e05040", fontWeight: "bold", zIndex: 20, textShadow: "1px 1px 0 #000" }}>
          💀 {kills}
        </div>
      )}

      {/* Tool indicators – left side, below kill counter */}
      {ownedTools.length > 0 && (
        <div style={{ position: "absolute", top: isMobile ? 50 : 78, left: isMobile ? 4 : 12, display: "flex", gap: isMobile ? 2 : 4, zIndex: 20 }}>
          {ownedTools.map(tid => {
            const tool = SHOP_TOOLS.find(t => t.id === tid);
            return tool ? <span key={tid} title={tool.name} style={{ fontSize: isMobile ? 12 : 18, opacity: 0.7 }}>{tool.icon}</span> : null;
          })}
        </div>
      )}

      {/* Active Relics HUD – bottom-left, above spell bar on mobile */}
      {activeRelics.length > 0 && (
        <div style={{ position: "absolute", bottom: isMobile ? 68 : 10, left: isMobile ? 4 : 10, zIndex: 50, display: "flex", gap: isMobile ? 3 : 6 }}>
          {activeRelics.map(r => (
            <div key={r.id} title={`${r.name}: ${r.desc}`} style={{ fontSize: isMobile ? 14 : 22, filter: "drop-shadow(0 0 6px rgba(160,80,220,0.5))" }}>
              {r.emoji}
            </div>
          ))}
        </div>
      )}

      {/* NPC Info Card – bottom-left on click */}
      {inspectedNpc && (
        <div style={{
          position: "absolute", bottom: isMobile ? 80 : 100, left: isMobile ? 4 : 12, zIndex: 25,
          background: "rgba(20,10,8,0.92)", border: "2px solid #5a4030",
          padding: "10px 14px", minWidth: 180,
          boxShadow: "inset 0 0 10px rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.6)",
          animation: "fadeIn 0.3s ease-out",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 32 }}>{inspectedNpc.emoji}</span>
            <div>
              <div style={{ fontWeight: "bold", fontSize: 14, color: "#e05040" }}>{inspectedNpc.name}</div>
              <div style={{ fontSize: 11, color: "#888" }}>{inspectedNpc.biomeEmoji} {inspectedNpc.biomeName}</div>
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
              Odporność: {inspectedNpc.resist === "fire" ? "🔥 Ogień" : "🧊 Lód"}
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
          bottom: isMobile ? 68 : 80, left: "50%", transform: "translateX(-50%)",
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
                <span style={{ fontSize: isMobile ? 22 : 28, opacity: canSummon ? 1 : 0.35 }}>{merc.emoji}</span>
                <div style={{ fontSize: isMobile ? 9 : 11, fontWeight: "bold", color: canSummon ? merc.color : "#555", whiteSpace: "nowrap" }}>{merc.name}</div>
                <div style={{ fontSize: isMobile ? 8 : 9, color: "#888", whiteSpace: "nowrap" }}>HP:{finalHp} ATK:{finalDmg}</div>
                <div style={{ fontSize: isMobile ? 8 : 9, color: canAfford ? "#6a9a6a" : "#804040" }}>
                  💰{merc.cost.silver ? `${merc.cost.silver}Ag` : `${merc.cost.copper}Cu`}
                </div>
              </div>
            );
          })}
          <div style={{ position: "absolute", top: -18, left: "50%", transform: "translateX(-50%)", fontSize: isMobile ? 8 : 10, color: "#6a9a6a", whiteSpace: "nowrap", fontWeight: "bold" }}>
            {KNIGHT_LEVELS[knightLevel].emoji} {KNIGHT_LEVELS[knightLevel].name} — {KNIGHT_LEVELS[knightLevel].desc}
          </div>
        </div>
      )}

      {/* Spell Bar – always visible at bottom */}
      <SpellBar
        mana={mana}
        selectedSpell={selectedSpell}
        cooldowns={cooldowns}
        learnedSpells={learnedSpells}
        onSelect={handleSelectSpell}
        onDragStart={() => {}}
        isMobile={isMobile}
        gameW={GAME_W}
        gameH={GAME_H}
      />

      {/* Selected spell indicator */}
      {selectedSpell && (
        <div style={{
          position: "absolute",
          bottom: isMobile ? 68 : 90, left: "50%", transform: "translateX(-50%)",
          fontSize: isMobile ? 11 : 12, color: "#cc9040", fontWeight: "bold", zIndex: 101,
          background: "rgba(0,0,0,0.85)", padding: isMobile ? "4px 10px" : "3px 12px", border: "1px solid #5a4030",
          whiteSpace: "nowrap", borderRadius: 6,
        }}>
          {isMobile ? "Dotknij wroga" : "Kliknij na cel, by rzucić czar (lub przeciągnij)"}
        </div>
      )}

      </div>{/* end game container */}

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
              <div style={{ fontSize: 32, marginBottom: 8 }}>🐴</div>
              <div style={{ fontSize: 16, fontWeight: "bold", color: "#d4a030", marginBottom: 8 }}>Karawana</div>
              <div style={{ fontSize: 13, color: "#aaa", lineHeight: 1.6 }}>Kliknij karawanę aby podróżować do następnej komnaty. Potrzebujesz ⏳ inicjatywy (regeneruje się z czasem). Chroń karawanę przed wrogami!</div>
            </>}
            {tutorialStep === 1 && <>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🔮</div>
              <div style={{ fontSize: 16, fontWeight: "bold", color: "#60a0ff", marginBottom: 8 }}>Czary i Walka</div>
              <div style={{ fontSize: 13, color: "#aaa", lineHeight: 1.6 }}>{isMobile ? "Wybierz czar z paska na dole, a potem dotknij wroga. Czary kosztują manę 🔮 i mają czas odnowienia. Łącz żywioły (ogień+lód, lód+piorun) dla bonusów COMBO!" : "Wybierz czar z paska na dole, a potem kliknij na wroga. Możesz też przeciągnąć czar na cel. Czary kosztują manę 🔮 i mają czas odnowienia. Łącz żywioły (ogień+lód, lód+piorun) dla bonusów COMBO!"}</div>
            </>}
            {tutorialStep === 2 && <>
              <div style={{ fontSize: 32, marginBottom: 8 }}>⚔️</div>
              <div style={{ fontSize: 16, fontWeight: "bold", color: "#40e060", marginBottom: 8 }}>Najemnicy</div>
              <div style={{ fontSize: 13, color: "#aaa", lineHeight: 1.6 }}>Przyzywaj najemników czarem ⚔️ Przywołanie. Rycerz jest wytrzymały, Łotrzyk szybki z ciosami krytycznymi, Mag rzuca zaklęcia, Łucznik strzela z dystansu. Ulepszaj ich w Kryjówce 🏰!</div>
            </>}
            {tutorialStep === 3 && <>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📖</div>
              <div style={{ fontSize: 16, fontWeight: "bold", color: "#60a0ff", marginBottom: 8 }}>Bestiariusz i Wiedza</div>
              <div style={{ fontSize: 13, color: "#aaa", lineHeight: 1.6 }}>Pokonani wrogowie mogą upuścić karty do Bestiariusza. Odkryte stworzenia dają +5% obrażeń przeciwko nim. Zbieraj Wiedzę 📖 na bonusy kamieni milowych!</div>
            </>}
            {tutorialStep === 4 && <>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🏪🏰</div>
              <div style={{ fontSize: 16, fontWeight: "bold", color: "#d4a030", marginBottom: 8 }}>Targ i Kryjówka</div>
              <div style={{ fontSize: 13, color: "#aaa", lineHeight: 1.6 }}>Na Targu 🏪 kupuj narzędzia i mikstury. W Kryjówce 🏰 ulepszaj karawanę, najemników i przechowuj skarby. Co 5 pokoi czeka obrona karawany, co 10 - boss!</div>
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
      {cardDrop && (
        <div style={{
          position: "fixed", top: "30%", left: "50%", transform: "translate(-50%, -50%)",
          zIndex: 210, textAlign: "center",
          background: "rgba(20,10,8,0.95)", border: `3px solid ${cardDrop.rarityColor}`,
          padding: "20px 30px", minWidth: 260,
          boxShadow: `inset 0 0 20px rgba(0,0,0,0.5), 0 0 30px ${cardDrop.rarityColor}40`,
          animation: "cardDrop 0.5s ease-out",
        }}>
          <div style={{ fontSize: 11, color: "#888", marginBottom: 4, letterSpacing: 2 }}>KARTA POTWORA</div>
          <div style={{ fontSize: 52 }}>{cardDrop.emoji}</div>
          <div style={{ fontWeight: "bold", fontSize: 17, color: cardDrop.rarityColor, marginBottom: 4 }}>
            {cardDrop.name}
          </div>
          <div style={{ fontSize: 14, color: cardDrop.rarityColor }}>
            {cardDrop.rarityLabel}
          </div>
          <div style={{ fontSize: 13, color: "#60a0ff", marginTop: 6 }}>
            📖 +{cardDrop.knowledge} Wiedza
          </div>
        </div>
      )}

      {/* INVENTORY PANEL */}
      <SidePanel open={panel === "inv"} side="right" width={400} onClose={() => { setPanel(null); setSelectedInv(-1); }} title="📜 Ekwipunek" isMobile={isMobile}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 6 }}>
          {[...Array(Math.max(20, Math.ceil(inventory.length / 5) * 5 + 5))].map((_, i) => (
            <ItemSlot key={i} item={inventory[i]} selected={i === selectedInv} onClick={() => setSelectedInv(i)} />
          ))}
        </div>
        {selectedInv >= 0 && selectedInv < inventory.length && (
          <ItemDetail item={inventory[selectedInv]} canStore={canStoreMore}
            onSell={() => sellItem(selectedInv)} onStore={() => storeItem(selectedInv)} />
        )}
      </SidePanel>

      {/* SHOP PANEL */}
      <SidePanel open={panel === "shop"} side="left" width={430} onClose={() => setPanel(null)} title="🏪 Targ" isMobile={isMobile}>
        <h3 style={{ fontWeight: "bold", fontSize: 15, color: "#60a0ff", marginBottom: 8, borderBottom: "1px solid #1a2a3a", paddingBottom: 4 }}>🔮 Mikstury Many</h3>
        {MANA_POTIONS.map(potion => {
          const canAfford = totalCopper(money) >= totalCopper(potion.cost);
          return (
            <div key={potion.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", border: "2px solid #1a2a3a", marginBottom: 6, background: "rgba(60,100,200,0.04)" }}>
              <span style={{ fontSize: 28 }}>{potion.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "bold", fontSize: 14, color: "#80b0ff" }}>{potion.name}</div>
                <div style={{ fontSize: 12, color: "#5577aa" }}>{potion.desc}</div>
                <div style={{ fontSize: 13, color: "#888" }}>💰 {formatValHTML(potion.cost)}</div>
              </div>
              <button onClick={() => buyMana(potion.id)} disabled={!canAfford}
                style={{ background: "none", border: `2px solid ${canAfford ? "#4080cc" : "#333"}`, color: canAfford ? "#60a0ff" : "#555", fontSize: 14, padding: "3px 12px", cursor: canAfford ? "pointer" : "not-allowed", fontWeight: "bold" }}>Kup</button>
            </div>
          );
        })}

        <h3 style={{ fontWeight: "bold", fontSize: 15, color: "#d4a030", marginTop: 14, marginBottom: 8, borderBottom: "1px solid #2a2018", paddingBottom: 4 }}>🛠️ Narzędzia do kupienia</h3>
        {SHOP_TOOLS.map(tool => {
          const owned = ownedTools.includes(tool.id);
          const canAfford = totalCopper(money) >= totalCopper(tool.cost);
          return (
            <div key={tool.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", border: `2px solid ${owned ? "#2a3a1a" : "#2a1e14"}`, marginBottom: 6, background: owned ? "rgba(40,80,20,0.08)" : "rgba(255,255,255,0.02)" }}>
              <span style={{ fontSize: 28 }}>{tool.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "bold", fontSize: 14, color: owned ? "#50a850" : "#d8c8a8" }}>{tool.name}</div>
                <div style={{ fontSize: 12, color: "#777" }}>{tool.desc}</div>
                <div style={{ fontSize: 13, color: "#888" }}>💰 {formatValHTML(tool.cost)}</div>
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
        <h3 style={{ fontWeight: "bold", fontSize: 15, color: "#d4a030", marginTop: 14, marginBottom: 8, borderBottom: "1px solid #2a2018", paddingBottom: 4 }}>💰 Sprzedaż skarbów</h3>
        {inventory.length > 0 && (
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            <button onClick={sellAll} style={{ flex: 1, background: "none", border: "2px solid #8a6018", color: "#d4a030", fontSize: 13, fontWeight: "bold", padding: "6px 12px", cursor: "pointer" }}>
              💰 Sprzedaj wszystko ({inventory.length})
            </button>
            <button onClick={storeAll} disabled={hideoutItems.length >= HIDEOUT_LEVELS[hideoutLevel].slots} style={{ flex: 1, background: "none", border: "2px solid #2a6a6a", color: "#40a8b8", fontSize: 13, fontWeight: "bold", padding: "6px 12px", cursor: hideoutItems.length >= HIDEOUT_LEVELS[hideoutLevel].slots ? "not-allowed" : "pointer", opacity: hideoutItems.length >= HIDEOUT_LEVELS[hideoutLevel].slots ? 0.4 : 1 }}>
              📦 Schowaj wszystko
            </button>
          </div>
        )}
        {inventory.length === 0 ? (
          <div style={{ color: "#444", fontSize: 16, textAlign: "center", marginTop: 30 }}>Brak przedmiotów do sprzedaży.<br/>Otwieraj skrzynie!</div>
        ) : inventory.map((it, idx) => (
          <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", border: "2px solid #2a1e14", marginBottom: 6, background: "rgba(255,255,255,0.02)" }}>
            <span style={{ fontSize: 28 }}>{it.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: "bold", fontSize: 14, color: RARITY_C[it.rarity] }}>{it.name}</div>
              <div style={{ fontSize: 12, color: RARITY_C[it.rarity] }}>{RARITY_L[it.rarity]}</div>
              <div style={{ fontSize: 13, color: "#888" }}>💰 {formatValHTML(it.value)}</div>
            </div>
            <button onClick={() => sellItem(idx)} style={{ background: "none", border: "2px solid #4a3a28", color: "#d8c8a8", fontSize: 15, padding: "3px 12px", cursor: "pointer", fontWeight: "bold" }}>Sprzedaj</button>
          </div>
        ))}
      </SidePanel>

      {/* HIDEOUT PANEL */}
      <SidePanel open={panel === "hideout"} side="right" width={460} onClose={() => setPanel(null)} title="🏰 Moja Kryjówka" isMobile={isMobile}>
        <h3 style={{ fontWeight: "bold", fontSize: 16, color: "#d4a030", marginBottom: 8, borderBottom: "1px solid #2a2018", paddingBottom: 4 }}>💰 Skarbiec</h3>
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
        <h3 style={{ fontWeight: "bold", fontSize: 16, color: "#40e060", marginBottom: 8, borderBottom: "1px solid #1a3a1a", paddingBottom: 4 }}>⚔️ Najemnicy</h3>
        {(() => {
          const kn = KNIGHT_LEVELS[knightLevel];
          const nextKn = knightLevel < KNIGHT_LEVELS.length - 1 ? KNIGHT_LEVELS[knightLevel + 1] : null;
          const canAffordKnight = nextKn ? totalCopper(money) >= totalCopper(nextKn.cost) : false;
          return (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "rgba(40,120,40,0.08)", border: "2px solid #1a3a1a", marginBottom: 6 }}>
                <span style={{ fontSize: 36 }}>{kn.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: "bold", fontSize: 15, color: "#40e060" }}>Poz. {kn.level} — {kn.name}</div>
                  <div style={{ fontSize: 12, color: "#6a9a6a" }}>{kn.desc} (x{kn.mult} HP/ATK)</div>
                </div>
              </div>
              {/* Mercenary types preview */}
              <div style={{ display: "flex", gap: 4, marginBottom: 6, justifyContent: "center" }}>
                {MERCENARY_TYPES.map(m => (
                  <div key={m.id} style={{ textAlign: "center", padding: "3px 6px", border: `1px solid ${m.color}30`, borderRadius: 4 }}>
                    <div style={{ fontSize: 20 }}>{m.emoji}</div>
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
                  }}>{kl.emoji}</span>
                ))}
              </div>
              <button onClick={upgradeKnight} disabled={!canAffordKnight || !nextKn}
                style={{
                  background: "none", border: `2px solid ${canAffordKnight ? "#2a6a2a" : "#333"}`,
                  color: canAffordKnight ? "#40e060" : "#555", fontWeight: "bold", fontSize: 14, padding: "6px 16px",
                  cursor: canAffordKnight ? "pointer" : "not-allowed", display: "block", width: "100%", textAlign: "center",
                }}>
                {nextKn ? <>⬆ {nextKn.emoji} {nextKn.name} (x{nextKn.mult}) — {formatValHTML(nextKn.cost)}</> : "⬆ Maksymalny poziom!"}
              </button>
            </div>
          );
        })()}

        {/* Caravan upgrade section */}
        <h3 style={{ fontWeight: "bold", fontSize: 16, color: "#d4a030", marginBottom: 8, borderBottom: "1px solid #2a2018", paddingBottom: 4 }}>🐴 Karawana</h3>
        {(() => {
          const cl = CARAVAN_LEVELS[caravanLevel];
          const nextCl = caravanLevel < CARAVAN_LEVELS.length - 1 ? CARAVAN_LEVELS[caravanLevel + 1] : null;
          const canAffordCaravan = nextCl ? totalCopper(money) >= totalCopper(nextCl.cost) : false;
          return (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "rgba(160,120,40,0.08)", border: "2px solid #3a2a18", marginBottom: 6 }}>
                <span style={{ fontSize: 36 }}>🐴</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: "bold", fontSize: 15, color: "#d4a030" }}>Poz. {caravanLevel + 1} — {cl.name}</div>
                  <div style={{ fontSize: 12, color: "#a08a60" }}>
                    HP: {cl.hp} | Armor: {cl.armor}
                    {cl.barricade && <> | 🪵 Barykada ({cl.barricade.hp} HP)</>}
                    {cl.tower && <> | 🗼 Wieża ({cl.tower.damage} dmg)</>}
                    {cl.dog && <> | 🐕 Ogar</>}
                  </div>
                </div>
              </div>
              <button onClick={upgradeCaravan} disabled={!canAffordCaravan || !nextCl}
                style={{
                  background: "none", border: `2px solid ${canAffordCaravan ? "#8a6018" : "#333"}`,
                  color: canAffordCaravan ? "#d4a030" : "#555", fontWeight: "bold", fontSize: 14, padding: "6px 16px",
                  cursor: canAffordCaravan ? "pointer" : "not-allowed", display: "block", width: "100%", textAlign: "center", marginBottom: 12,
                }}>
                {nextCl ? <>⬆ {nextCl.name} (HP:{nextCl.hp}, Armor:{nextCl.armor}{nextCl.barricade && !cl.barricade ? ", +🪵" : ""}{nextCl.tower && !cl.tower ? ", +🗼" : ""}{nextCl.dog && !cl.dog ? ", +🐕" : ""}) — {formatValHTML(nextCl.cost)}</> : "⬆ Maksymalny poziom!"}
              </button>
            </div>
          );
        })()}

        <h3 style={{ fontWeight: "bold", fontSize: 16, color: "#d4a030", marginBottom: 8, borderBottom: "1px solid #2a2018", paddingBottom: 4 }}>📦 Schowek <span style={{ color: "#888", fontSize: 13 }}>(kliknij by zabrać)</span></h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 6 }}>
          {[...Array(hlvl.slots)].map((_, i) => (
            <ItemSlot key={i} item={hideoutItems[i]} onClick={() => retrieveItem(i)} size={48} />
          ))}
        </div>
      </SidePanel>

      {/* BESTIARY PANEL */}
      <SidePanel open={panel === "bestiary"} side="left" width={460} onClose={() => setPanel(null)} title="📖 Bestiariusz" isMobile={isMobile}>
        <div style={{ fontSize: 14, color: "#60a0ff", marginBottom: 8, fontWeight: "bold" }}>
          📖 Wiedza: {knowledge} | Odkryto: {Object.keys(bestiary).length}/{ALL_NPCS.length}
        </div>
        <div style={{ fontSize: 12, color: "#aaa", marginBottom: 12, padding: "6px 8px", background: "rgba(60,100,200,0.08)", border: "1px solid #1a2a3a" }}>
          <div style={{ color: "#60a0ff", fontWeight: "bold", marginBottom: 4 }}>Bonusy Wiedzy:</div>
          <div>📖 Odkryty NPC: <span style={{ color: "#40c040" }}>+5% obrażeń</span> przeciwko niemu</div>
          <div style={{ opacity: knowledge >= 50 ? 1 : 0.4 }}>📚 50 Wiedzy: <span style={{ color: knowledge >= 50 ? "#40c040" : "#666" }}>+5% do wszystkich obrażeń</span> {knowledge >= 50 ? "✓" : `(${knowledge}/50)`}</div>
          <div style={{ opacity: knowledge >= 100 ? 1 : 0.4 }}>📚 100 Wiedzy: <span style={{ color: knowledge >= 100 ? "#40c040" : "#666" }}>+10% do wszystkich obrażeń</span> {knowledge >= 100 ? "✓" : `(${knowledge}/100)`}</div>
          <div style={{ opacity: knowledge >= 200 ? 1 : 0.4 }}>📚 200 Wiedzy: <span style={{ color: knowledge >= 200 ? "#40c040" : "#666" }}>+15% do wszystkich obrażeń</span> {knowledge >= 200 ? "✓" : `(${knowledge}/200)`}</div>
        </div>

        {/* Knowledge Shop */}
        <div style={{ marginBottom: 12, padding: "8px", background: "rgba(60,100,200,0.05)", border: "1px solid #1a2a3a" }}>
          <div style={{ color: "#d4a030", fontWeight: "bold", marginBottom: 6, fontSize: 13 }}>🏛️ Sklep Wiedzy <span style={{ color: "#60a0ff", fontSize: 11 }}>(📖 {knowledge})</span></div>
          {[
            { id: "manaPool", name: "Pula Many", desc: "+10 max many", icon: "🔮", maxLvl: 3, costs: [30, 60, 100] },
            { id: "spellPower", name: "Moc Czarów", desc: "+5% obrażeń czarów", icon: "⚡", maxLvl: 5, costs: [20, 40, 60, 80, 100] },
            { id: "manaRegen", name: "Regeneracja Many", desc: "+0.5 many/sek", icon: "💧", maxLvl: 3, costs: [25, 50, 80] },
          ].map(upg => {
            const lvl = knowledgeUpgrades[upg.id] || 0;
            const maxed = lvl >= upg.maxLvl;
            const cost = maxed ? 0 : upg.costs[lvl];
            const canAfford = knowledge >= cost;
            return (
              <div key={upg.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 6px", marginBottom: 4, border: `1px solid ${maxed ? "#2a6a2a" : "#1a1a2a"}` }}>
                <span style={{ fontSize: 20 }}>{upg.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: "bold", fontSize: 12, color: maxed ? "#40c040" : "#aaa" }}>{upg.name} (Poz. {lvl}/{upg.maxLvl})</div>
                  <div style={{ fontSize: 10, color: "#666" }}>{upg.desc}</div>
                </div>
                {maxed ? (
                  <span style={{ color: "#40c040", fontSize: 11, fontWeight: "bold" }}>MAX</span>
                ) : (
                  <button onClick={() => buyKnowledgeUpgrade(upg.id)} disabled={!canAfford}
                    style={{ background: "none", border: `1px solid ${canAfford ? "#4060cc" : "#333"}`, color: canAfford ? "#60a0ff" : "#555", fontSize: 11, padding: "2px 8px", cursor: canAfford ? "pointer" : "not-allowed", fontWeight: "bold" }}>
                    📖 {cost}
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
                  <span style={{ fontSize: 28 }}>{discovered ? npc.emoji : "❓"}</span>
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
                        {npc.resist && <> | Odporność: {npc.resist === "fire" ? "🔥" : "🧊"}</>}
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

      <style>{`
        @keyframes lockP{0%,100%{opacity:1;transform:translateX(-50%) scale(1)}50%{opacity:.6;transform:translateX(-50%) scale(1.1)}}
        @keyframes keyF{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes chestG{0%,100%{filter:drop-shadow(0 0 8px rgba(160,120,40,0.4))}50%{filter:drop-shadow(0 0 18px rgba(212,160,48,0.7))}}
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
        @keyframes screenShake{0%{transform:translate(-3px,-2px)}25%{transform:translate(3px,1px)}50%{transform:translate(-2px,3px)}75%{transform:translate(2px,-3px)}100%{transform:translate(-1px,2px)}}
        @keyframes meteorFlash{0%{opacity:1}100%{opacity:0}}
        @keyframes cardDrop{0%{opacity:0;transform:translate(-50%,-50%) scale(0.5) rotateY(90deg)}50%{transform:translate(-50%,-50%) scale(1.1) rotateY(0)}100%{opacity:1;transform:translate(-50%,-50%) scale(1) rotateY(0)}}
        @keyframes eventAppear{0%{opacity:0;transform:scale(0.85) translateY(20px)}100%{opacity:1;transform:scale(1) translateY(0)}}
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
