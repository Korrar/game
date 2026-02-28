// RapierPhysicsWorld — drop-in replacement for the old Matter.js PhysicsWorld
// Phase 1: Rapier for ragdoll death physics only; living NPCs are still kinematic
// Keeps exact same public API so App.jsx needs only an import swap

import { getRapier } from "./rapierInit.js";
import { CombatEffects } from "./combatEffects.js";
import {
  HALF_HEIGHTS, FIGURE_HALF_HEIGHT,
  HEAD_RADIUS, QUAD_HEAD_RADIUS,
} from "./bodies/constants.js";
import {
  getWalkingOffsets, getQuadrupedOffsets, getFloatingOffsets,
  getScorpionOffsets, getSpiderOffsets, getFrogOffsets, getSerpentOffsets,
} from "./bodies/animOffsets.js";
import {
  getColors, drawBody, drawWeapon, drawProjectile,
} from "./bodies/bodyRenderers.js";
import { SKILLSHOT_TYPES, HEADSHOT_RADIUS_MULT, ENEMY_DODGE_REACT_DIST, ENEMY_DODGE_SPEED } from "../data/skillshots.js";

// ─── Rapier body/limb builders per body type ───

function _buildLimbs(RAPIER, world, bt, px, groundY) {
  // All limbs are dynamic RigidBodies with a single cuboid/ball collider
  // During alive state we set positions kinematically; on death we unlock them
  const hh = HALF_HEIGHTS[bt] || FIGURE_HALF_HEIGHT;
  const cy = groundY - hh;

  const bodies = {};

  function addBox(name, x, y, hw, hh2) {
    const rbDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x, y);
    const rb = world.createRigidBody(rbDesc);
    const cDesc = RAPIER.ColliderDesc.cuboid(hw, hh2).setDensity(1.0).setFriction(0.6);
    world.createCollider(cDesc, rb);
    bodies[name] = rb;
  }

  function addBall(name, x, y, r) {
    const rbDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x, y);
    const rb = world.createRigidBody(rbDesc);
    const cDesc = RAPIER.ColliderDesc.ball(r).setDensity(1.0).setFriction(0.6);
    world.createCollider(cDesc, rb);
    bodies[name] = rb;
  }

  switch (bt) {
    case "humanoid":
    default: {
      addBall("head", px, cy - 21, 10);
      addBox("torso", px, cy, 5, 11);
      addBox("lUpperArm", px - 10, cy - 6, 2, 7);
      addBox("rUpperArm", px + 10, cy - 6, 2, 7);
      addBox("lLowerArm", px - 10, cy + 6, 1.5, 6);
      addBox("rLowerArm", px + 10, cy + 6, 1.5, 6);
      addBox("lUpperLeg", px - 5, cy + 17, 2.5, 7);
      addBox("rUpperLeg", px + 5, cy + 17, 2.5, 7);
      addBox("lLowerLeg", px - 5, cy + 30, 2, 6.5);
      addBox("rLowerLeg", px + 5, cy + 30, 2, 6.5);
      break;
    }
    case "quadruped": {
      addBall("head", px + 14, cy - 6, 8);
      addBox("torso", px, cy, 12, 5);
      addBox("fl", px + 8, cy + 16, 2, 7);
      addBox("fr", px + 8, cy + 16, 2, 7);
      addBox("bl", px - 8, cy + 16, 2, 7);
      addBox("br", px - 8, cy + 16, 2, 7);
      addBox("tail", px - 16, cy - 2, 1.5, 5);
      break;
    }
    case "floating": {
      const fcy = cy - 10;
      addBall("head", px, fcy - 16, 10);
      addBox("torso", px, fcy, 6, 13);
      addBox("lArm", px - 12, fcy - 4, 1.5, 8);
      addBox("rArm", px + 12, fcy - 4, 1.5, 8);
      addBox("trail", px, fcy + 18, 2, 5);
      break;
    }
    case "scorpion": {
      addBall("head", px + 16, cy - 2, 6);
      addBox("torso", px, cy, 14, 6);
      addBox("l1", px + 6, cy + 10, 1.5, 5);
      addBox("l2", px, cy + 10, 1.5, 5);
      addBox("l3", px - 6, cy + 10, 1.5, 5);
      addBox("r1", px + 6, cy + 10, 1.5, 5);
      addBox("r2", px, cy + 10, 1.5, 5);
      addBox("r3", px - 6, cy + 10, 1.5, 5);
      addBox("lPincer", px + 18, cy - 6, 2, 5);
      addBox("rPincer", px + 18, cy + 4, 2, 5);
      addBox("tail1", px - 14, cy - 4, 2, 4);
      addBox("tail2", px - 18, cy - 14, 2, 4);
      addBall("stinger", px - 16, cy - 22, 3);
      break;
    }
    case "spider": {
      addBall("head", px + 10, cy - 3, 6);
      addBox("torso", px, cy, 8, 5);
      addBall("abdomen", px - 10, cy + 2, 8);
      for (let i = 0; i < 4; i++) {
        const ox = 6 - i * 4;
        addBox(`ll${i}`, px + ox - 8, cy + 8, 1, 6);
        addBox(`rl${i}`, px + ox + 8, cy + 8, 1, 6);
      }
      break;
    }
    case "frog": {
      addBall("head", px + 8, cy - 6, 8);
      addBox("torso", px, cy, 7, 5);
      addBox("lHind", px - 6, cy + 8, 2.5, 6);
      addBox("rHind", px + 6, cy + 8, 2.5, 6);
      addBox("lFront", px - 4, cy + 6, 1.5, 4);
      addBox("rFront", px + 4, cy + 6, 1.5, 4);
      break;
    }
    case "serpent": {
      addBall("head", px + 18, cy - 4, 9);
      addBox("torso", px + 6, cy, 7, 5);
      addBox("seg2", px - 6, cy + 2, 6, 4.5);
      addBox("seg3", px - 16, cy + 3, 5, 4);
      addBox("tailTip", px - 26, cy + 4, 3, 3);
      addBox("lFin", px + 4, cy + 8, 1.5, 4);
      addBox("rFin", px + 8, cy + 8, 1.5, 4);
      break;
    }
    case "barricade": {
      addBox("torso", px, cy, 15, 22);
      addBox("head", px, cy - 26, 4, 4);
      addBox("plankL", px - 14, cy + 4, 2.5, 18);
      addBox("plankR", px + 14, cy + 4, 2.5, 18);
      addBox("crossbar", px, cy - 6, 17, 2.5);
      break;
    }
    case "tower": {
      addBox("torso", px, cy + 8, 11, 25);
      addBox("head", px, cy - 22, 6, 6);
      addBox("roofL", px - 12, cy - 28, 3, 2);
      addBox("roofR", px + 12, cy - 28, 3, 2);
      addBox("baseL", px - 13, cy + 30, 3, 5);
      addBox("baseR", px + 13, cy + 30, 3, 5);
      break;
    }
  }

  return bodies;
}

// Build Rapier joints (spring-like) between limbs for ragdoll effect
function _buildJoints(RAPIER, world, bt, limbBodies) {
  const joints = [];
  const stiffness = 200.0;
  const damping = 20.0;

  function joint(a, b, anchorA, anchorB) {
    const ba = limbBodies[a], bb = limbBodies[b];
    if (!ba || !bb) return;
    const params = RAPIER.JointData.spring(
      0.0, // rest length
      stiffness, damping,
      { x: anchorA[0], y: anchorA[1] },
      { x: anchorB[0], y: anchorB[1] }
    );
    const j = world.createImpulseJoint(params, ba, bb, true);
    joints.push(j);
  }

  switch (bt) {
    case "humanoid":
    default: {
      joint("head", "torso", [0, 10], [0, -11]);
      joint("torso", "lUpperArm", [-5, -7], [0, -7]);
      joint("torso", "rUpperArm", [5, -7], [0, -7]);
      joint("lUpperArm", "lLowerArm", [0, 7], [0, -6]);
      joint("rUpperArm", "rLowerArm", [0, 7], [0, -6]);
      joint("torso", "lUpperLeg", [-3, 11], [0, -7]);
      joint("torso", "rUpperLeg", [3, 11], [0, -7]);
      joint("lUpperLeg", "lLowerLeg", [0, 7], [0, -6.5]);
      joint("rUpperLeg", "rLowerLeg", [0, 7], [0, -6.5]);
      break;
    }
    case "quadruped": {
      joint("torso", "head", [12, -5], [0, 8]);
      joint("torso", "fl", [8, 5], [0, -7]);
      joint("torso", "fr", [8, 5], [0, -7]);
      joint("torso", "bl", [-8, 5], [0, -7]);
      joint("torso", "br", [-8, 5], [0, -7]);
      joint("torso", "tail", [-12, -2], [0, -5]);
      break;
    }
    case "floating": {
      joint("head", "torso", [0, 10], [0, -13]);
      joint("torso", "lArm", [-6, -8], [0, -8]);
      joint("torso", "rArm", [6, -8], [0, -8]);
      joint("torso", "trail", [0, 13], [0, -5]);
      break;
    }
    case "scorpion": {
      joint("torso", "head", [14, -2], [0, 6]);
      for (let i = 1; i <= 3; i++) {
        const ox = 6 - (i - 1) * 6;
        joint("torso", `l${i}`, [ox, 6], [0, -5]);
        joint("torso", `r${i}`, [ox, 6], [0, -5]);
      }
      joint("head", "lPincer", [4, -4], [0, 5]);
      joint("head", "rPincer", [4, 4], [0, 5]);
      joint("torso", "tail1", [-14, -4], [0, 4]);
      joint("tail1", "tail2", [0, -4], [0, 4]);
      joint("tail2", "stinger", [0, -4], [0, 3]);
      break;
    }
    case "spider": {
      joint("torso", "head", [8, -3], [0, 6]);
      joint("torso", "abdomen", [-8, 2], [8, 0]);
      for (let i = 0; i < 4; i++) {
        const ox = 6 - i * 4;
        joint("torso", `ll${i}`, [ox, 5], [1, -6]);
        joint("torso", `rl${i}`, [ox, 5], [-1, -6]);
      }
      break;
    }
    case "frog": {
      joint("torso", "head", [7, -5], [0, 8]);
      joint("torso", "lHind", [-5, 5], [0, -6]);
      joint("torso", "rHind", [5, 5], [0, -6]);
      joint("torso", "lFront", [-3, 4], [0, -4]);
      joint("torso", "rFront", [3, 4], [0, -4]);
      break;
    }
    case "serpent": {
      joint("torso", "head", [7, -3], [0, 9]);
      joint("torso", "seg2", [-7, 1], [6, 0]);
      joint("seg2", "seg3", [-6, 1], [5, 0]);
      joint("seg3", "tailTip", [-5, 1], [3, 0]);
      joint("torso", "lFin", [-2, 5], [0, -4]);
      joint("torso", "rFin", [2, 5], [0, -4]);
      break;
    }
    case "barricade": {
      joint("torso", "head", [0, -22], [0, 4]);
      joint("torso", "plankL", [-14, 0], [0, 0]);
      joint("torso", "plankR", [14, 0], [0, 0]);
      joint("torso", "crossbar", [0, -6], [0, 0]);
      break;
    }
    case "tower": {
      joint("torso", "head", [0, -25], [0, 6]);
      joint("head", "roofL", [-6, -6], [3, 0]);
      joint("head", "roofR", [6, -6], [-3, 0]);
      joint("torso", "baseL", [-11, 22], [0, -5]);
      joint("torso", "baseR", [11, 22], [0, -5]);
      break;
    }
  }

  return joints;
}

// ─── DEATH IMPULSE ───

function _applyDeathImpulse(limbBodies, element, dirX) {
  const dir = dirX || 1;
  const k = 80; // force scale for Rapier (much higher than Matter)
  const allParts = Object.values(limbBodies);
  const torso = limbBodies.torso;
  const head = limbBodies.head;

  switch (element) {
    case "fire":
      if (torso) torso.applyImpulse({ x: dir * 8 * k, y: -12 * k }, true);
      if (head) head.applyImpulse({ x: dir * 6 * k, y: -15 * k }, true);
      for (const p of allParts) {
        if (p === torso || p === head) continue;
        p.applyImpulse({ x: dir * 2 * k, y: -6 * k }, true);
      }
      break;
    case "ice":
      if (torso) torso.applyImpulse({ x: dir * 4 * k, y: -3 * k }, true);
      break;
    case "lightning":
      for (const p of allParts) {
        p.applyImpulse({
          x: (Math.random() - 0.5) * 6 * k,
          y: (Math.random() - 0.5) * 6 * k - 4 * k,
        }, true);
      }
      break;
    case "shadow":
      for (const p of allParts) {
        p.applyImpulse({ x: (Math.random() - 0.5) * 2 * k, y: -6 * k }, true);
        p.setLinearDamping(4.0);
      }
      break;
    case "holy": {
      const cx = torso ? torso.translation().x : 0;
      for (const p of allParts) {
        const dx = p.translation().x - cx;
        p.applyImpulse({ x: Math.sign(dx || 1) * 5 * k, y: -7 * k }, true);
      }
      break;
    }
    default:
      if (torso) torso.applyImpulse({ x: dir * 6 * k, y: -5 * k }, true);
      if (head) head.applyImpulse({ x: dir * 4 * k, y: -8 * k }, true);
      break;
  }
}

function _applyKnockback(limbBodies, element, dirX) {
  const dir = dirX || 1;
  const k = 15;
  const limbs = Object.entries(limbBodies).filter(([n]) => n !== "torso" && n !== "head").map(([, b]) => b);
  if (limbs.length === 0) return;

  switch (element) {
    case "fire":
      for (const p of limbs) p.applyImpulse({ x: dir * k, y: -k }, true);
      break;
    case "ice":
      for (const p of limbs) p.applyImpulse({ x: dir * k * 0.8, y: 0 }, true);
      break;
    case "lightning":
      for (const p of limbs) p.applyImpulse({
        x: (Math.random() - 0.5) * 2.5 * k,
        y: (Math.random() - 0.5) * 2.5 * k,
      }, true);
      break;
    default:
      for (const p of limbs) p.applyImpulse({ x: dir * k, y: -k * 0.6 }, true);
      break;
  }
}

// ─── MAIN CLASS ───

export class PhysicsWorld {
  constructor() {
    this.rapier = null;
    this.world = null;
    this.bodies = {};
    this.projectiles = [];
    this.playerSkillshots = []; // Player-aimed skillshot projectiles
    this.mines = [];            // Placed mines (earthquake spell)
    this.areaIndicators = [];   // Area target indicators (meteor/blizzard)
    this.combatEffects = new CombatEffects();
    this.canvas = null;
    this.ctx = null;
    this.W = 0;
    this.H = 0;
    this.GY = 0;
    this.windDeflection = 0;
    this.fogVisibility = 0;
    this._groundCollider = null;
    this._wallLCollider = null;
    this._wallRCollider = null;
    this.pixiRenderer = null; // PixiJS renderer reference
  }

  setWeather(w) {
    this.windDeflection = w?.windDeflection || 0;
    this.fogVisibility = w?.fogVisibility || 0;
  }

  setPixiRenderer(renderer) {
    this.pixiRenderer = renderer;
  }

  // Proxy for combat effects — routes to PixiRenderer or Canvas CombatEffects
  get fx() {
    return this.pixiRenderer || this.combatEffects;
  }

  init(canvas) {
    // Clean up any existing bodies/world before reinitializing
    if (this.world) {
      this.clear();
      try { this.world.free(); } catch { /* already freed */ }
      this.world = null;
    }

    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.W = canvas.width;
    this.H = canvas.height;
    this.GY = this.H * 0.25;

    this.rapier = getRapier();
    if (!this.rapier) {
      console.error("Rapier WASM not initialized! Call initRapier() before creating PhysicsWorld.");
      return;
    }

    const gravity = { x: 0.0, y: 300.0 }; // Rapier uses real units; tune to look good
    this.world = new this.rapier.World(gravity);
    this._createBoundaries();
  }

  // Update canvas reference and resize without recreating the Rapier world
  updateCanvas(canvas, w, h) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    if (w !== this.W || h !== this.H) {
      this.resize(w, h);
    }
  }

  _createBoundaries() {
    if (!this.world || !this.rapier) return;
    const RAPIER = this.rapier;

    // Remove old colliders
    if (this._groundBody) { this.world.removeRigidBody(this._groundBody); this._groundBody = null; }
    if (this._wallLBody) { this.world.removeRigidBody(this._wallLBody); this._wallLBody = null; }
    if (this._wallRBody) { this.world.removeRigidBody(this._wallRBody); this._wallRBody = null; }

    // Ground
    const gDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(this.W / 2, this.GY + 25);
    this._groundBody = this.world.createRigidBody(gDesc);
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(this.W / 2 + 100, 25), this._groundBody);

    // Walls
    const wlDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(-25, this.H / 2);
    this._wallLBody = this.world.createRigidBody(wlDesc);
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(25, this.H), this._wallLBody);

    const wrDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(this.W + 25, this.H / 2);
    this._wallRBody = this.world.createRigidBody(wrDesc);
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(25, this.H), this._wallRBody);
  }

  resize(w, h) {
    const scaleX = w / (this.W || w);
    this.W = w; this.H = h; this.GY = h * 0.25;
    this._createBoundaries();
    for (const entry of Object.values(this.bodies)) {
      if (entry.ragdoll) continue;
      const pos = entry.limbBodies.torso.translation();
      this._positionAlive(entry, pos.x * scaleX);
    }
  }

  clear() {
    for (const id of Object.keys(this.bodies)) this.removeNpc(parseInt(id));
    this.bodies = {};
    this.projectiles = [];
    this.playerSkillshots = [];
    this.mines = [];
    this.areaIndicators = [];
  }

  _halfH(bt) { return HALF_HEIGHTS[bt] || FIGURE_HALF_HEIGHT; }

  spawnNpc(walkerId, xPct, npcData, friendly = false) {
    if (!this.world || !this.rapier) return;
    const px = (xPct / 100) * this.W;
    const bt = npcData.bodyType || "humanoid";

    const limbBodies = _buildLimbs(this.rapier, this.world, bt, px, this.GY);
    const joints = _buildJoints(this.rapier, this.world, bt, limbBodies);

    this.bodies[walkerId] = {
      limbBodies, joints,
      alive: true, ragdoll: false,
      fadeAlpha: 1, fadeTimer: 0,
      npcData, friendly,
      hitFlash: 0, frozenTimer: 0,
      bodyType: bt,
      attackAnim: 0,
      _dir: 1,
      _px: px,
    };
  }

  removeNpc(walkerId) {
    const entry = this.bodies[walkerId];
    if (!entry || !this.world) return;
    // Remove joints first
    for (const j of entry.joints) {
      try { this.world.removeImpulseJoint(j, true); } catch { /* already removed */ }
    }
    // Remove rigid bodies
    for (const rb of Object.values(entry.limbBodies)) {
      try { this.world.removeRigidBody(rb); } catch { /* already removed */ }
    }
    delete this.bodies[walkerId];
  }

  // ─── POSITIONING (kinematic) ───

  _positionAlive(entry, px) {
    const bt = entry.bodyType;
    const cy = this.GY - this._halfH(bt);
    const torso = entry.limbBodies.torso;
    const head = entry.limbBodies.head;
    if (torso) torso.setNextKinematicTranslation({ x: px, y: cy });
    if (head) head.setNextKinematicTranslation({ x: px, y: cy - 14 });
  }

  // ─── PATROL UPDATE ───

  updatePatrol(walkerId, xPct, dir, bouncePhase, yPct) {
    const entry = this.bodies[walkerId];
    if (!entry || entry.ragdoll) return;
    entry._dir = dir;

    const px = (xPct / 100) * this.W;
    entry._px = px;
    const groundY = yPct != null ? (yPct / 100) * this.H : this.GY;
    const bt = entry.bodyType;

    switch (bt) {
      case "humanoid": this._updateHumanoid(entry, px, dir, bouncePhase, groundY); break;
      case "quadruped": this._updateQuadruped(entry, px, dir, bouncePhase, groundY); break;
      case "floating": this._updateFloating(entry, px, dir, bouncePhase, groundY); break;
      case "scorpion": this._updateScorpion(entry, px, dir, bouncePhase, groundY); break;
      case "spider": this._updateSpider(entry, px, dir, bouncePhase, groundY); break;
      case "frog": this._updateFrog(entry, px, dir, bouncePhase, groundY); break;
      case "serpent": this._updateSerpent(entry, px, dir, bouncePhase, groundY); break;
      case "barricade": this._updateBarricade(entry, px, groundY); break;
      case "tower": this._updateTower(entry, px, groundY); break;
      default: this._updateHumanoid(entry, px, dir, bouncePhase, groundY); break;
    }
  }

  _setKin(rb, x, y) {
    if (rb) rb.setNextKinematicTranslation({ x, y });
  }

  _updateHumanoid(entry, px, dir, phase, groundY) {
    const cy = (groundY || this.GY) - FIGURE_HALF_HEIGHT;
    const o = getWalkingOffsets(phase);
    const lb = entry.limbBodies;
    this._setKin(lb.torso, px, cy);
    this._setKin(lb.head, px, cy - 11 - HEAD_RADIUS);
    this._setKin(lb.lUpperArm, px - 8 + o.lArmX, cy - 4);
    this._setKin(lb.rUpperArm, px + 8 + o.rArmX, cy - 4);
    this._setKin(lb.lLowerArm, px - 8 + o.lArmX * 1.2, cy + 8);
    this._setKin(lb.rLowerArm, px + 8 + o.rArmX * 1.2, cy + 8);
    this._setKin(lb.lUpperLeg, px - 4 + o.lLegX, cy + 17);
    this._setKin(lb.rUpperLeg, px + 4 + o.rLegX, cy + 17);
    this._setKin(lb.lLowerLeg, px - 4 + o.lLegX * 1.3, cy + 30 - o.lLegY);
    this._setKin(lb.rLowerLeg, px + 4 + o.rLegX * 1.3, cy + 30 - o.rLegY);
  }

  _updateQuadruped(entry, px, dir, phase, groundY) {
    const cy = (groundY || this.GY) - HALF_HEIGHTS.quadruped;
    const o = getQuadrupedOffsets(phase);
    const lb = entry.limbBodies;
    this._setKin(lb.torso, px, cy);
    this._setKin(lb.head, px + dir * 14, cy - 6);
    this._setKin(lb.fl, px + dir * 8 + o.flX * dir, cy + 16 - o.flY);
    this._setKin(lb.fr, px + dir * 8 + o.frX * dir, cy + 16 - o.frY);
    this._setKin(lb.bl, px - dir * 8 + o.blX * dir, cy + 16 - o.blY);
    this._setKin(lb.br, px - dir * 8 + o.brX * dir, cy + 16 - o.brY);
    if (lb.tail) {
      const tx = px - dir * 16 + Math.sin(o.tailPhase * 2) * 4;
      const ty = cy - 2 + Math.sin(o.tailPhase * 3) * 2;
      this._setKin(lb.tail, tx, ty);
    }
  }

  _updateFloating(entry, px, dir, phase, groundY) {
    const cy = (groundY || this.GY) - HALF_HEIGHTS.floating - 10;
    const o = getFloatingOffsets(phase);
    const lb = entry.limbBodies;
    this._setKin(lb.torso, px, cy + o.bobY);
    this._setKin(lb.head, px, cy - 16 + o.bobY);
    this._setKin(lb.lArm, px - 12 + o.armSway * dir, cy - 4 + o.bobY);
    this._setKin(lb.rArm, px + 12 - o.armSway * dir, cy - 4 + o.bobY);
    if (lb.trail) this._setKin(lb.trail, px + o.trailSway, cy + 18 + o.bobY + 2);
  }

  _updateScorpion(entry, px, dir, phase, groundY) {
    const cy = (groundY || this.GY) - HALF_HEIGHTS.scorpion;
    const o = getScorpionOffsets(phase);
    const lb = entry.limbBodies;
    this._setKin(lb.torso, px, cy);
    this._setKin(lb.head, px + dir * 16, cy - 2);
    this._setKin(lb.l1, px + dir * 6 + o.l1X * dir, cy + 10);
    this._setKin(lb.l2, px + o.l2X * dir, cy + 10);
    this._setKin(lb.l3, px - dir * 6 + o.l3X * dir, cy + 10);
    this._setKin(lb.r1, px + dir * 6 + o.r1X * dir, cy + 10);
    this._setKin(lb.r2, px + o.r2X * dir, cy + 10);
    this._setKin(lb.r3, px - dir * 6 + o.r3X * dir, cy + 10);
    this._setKin(lb.lPincer, px + dir * 20, cy - 6 - o.pincerOpen);
    this._setKin(lb.rPincer, px + dir * 20, cy + 4 + o.pincerOpen);
    this._setKin(lb.tail1, px - dir * 14 + o.tailSway, cy - 4);
    this._setKin(lb.tail2, px - dir * 18 + o.tailSway * 1.5, cy - 14);
    if (lb.stinger) this._setKin(lb.stinger, px - dir * 16 + o.tailSway * 2, cy - 22);
  }

  _updateSpider(entry, px, dir, phase, groundY) {
    const cy = (groundY || this.GY) - HALF_HEIGHTS.spider;
    const o = getSpiderOffsets(phase);
    const lb = entry.limbBodies;
    this._setKin(lb.torso, px, cy);
    this._setKin(lb.head, px + dir * 10, cy - 3);
    if (lb.abdomen) this._setKin(lb.abdomen, px - dir * 10, cy + 2);
    for (let i = 0; i < 4; i++) {
      const ox = 6 - i * 4;
      if (lb[`ll${i}`]) this._setKin(lb[`ll${i}`], px + ox * dir - 8 + (o[`ll${i}X`] || 0), cy + 8 - (o[`ll${i}Y`] || 0));
      if (lb[`rl${i}`]) this._setKin(lb[`rl${i}`], px + ox * dir + 8 + (o[`rl${i}X`] || 0), cy + 8 - (o[`rl${i}Y`] || 0));
    }
  }

  _updateFrog(entry, px, dir, phase, groundY) {
    const cy = (groundY || this.GY) - HALF_HEIGHTS.frog;
    const o = getFrogOffsets(phase);
    const y = cy - o.jumpY;
    const lb = entry.limbBodies;
    this._setKin(lb.torso, px, y + o.crouch);
    this._setKin(lb.head, px + dir * 8, y - 6);
    this._setKin(lb.lHind, px - 6 - o.hindSpread, y + 8 + o.crouch);
    this._setKin(lb.rHind, px + 6 + o.hindSpread, y + 8 + o.crouch);
    this._setKin(lb.lFront, px - 4, y + 6);
    this._setKin(lb.rFront, px + 4, y + 6);
  }

  _updateSerpent(entry, px, dir, phase, groundY) {
    const cy = (groundY || this.GY) - HALF_HEIGHTS.serpent;
    const o = getSerpentOffsets(phase);
    const lb = entry.limbBodies;
    this._setKin(lb.torso, px, cy);
    this._setKin(lb.head, px + dir * 18, cy - 4);
    if (lb.seg2) this._setKin(lb.seg2, px - dir * 6 + o.seg2X, cy + 2 + o.seg2Y);
    if (lb.seg3) this._setKin(lb.seg3, px - dir * 16 + o.seg3X, cy + 3 + o.seg3Y);
    if (lb.tailTip) this._setKin(lb.tailTip, px - dir * 26 + o.tailX, cy + 4 + o.tailY);
    if (lb.lFin) this._setKin(lb.lFin, px - dir * 2, cy + 8 + Math.sin(o.finPhase) * 2);
    if (lb.rFin) this._setKin(lb.rFin, px + dir * 2, cy + 8 - Math.sin(o.finPhase) * 2);
  }

  _updateBarricade(entry, px, groundY) {
    const cy = (groundY || this.GY) - HALF_HEIGHTS.barricade;
    const lb = entry.limbBodies;
    this._setKin(lb.torso, px, cy);
    this._setKin(lb.head, px, cy - 26);
    this._setKin(lb.plankL, px - 14, cy + 4);
    this._setKin(lb.plankR, px + 14, cy + 4);
    this._setKin(lb.crossbar, px, cy - 6);
  }

  _updateTower(entry, px, groundY) {
    const cy = (groundY || this.GY) - HALF_HEIGHTS.tower;
    const lb = entry.limbBodies;
    this._setKin(lb.torso, px, cy + 8);
    this._setKin(lb.head, px, cy - 22);
    this._setKin(lb.roofL, px - 12, cy - 28);
    this._setKin(lb.roofR, px + 12, cy - 28);
    this._setKin(lb.baseL, px - 13, cy + 30);
    this._setKin(lb.baseR, px + 13, cy + 30);
  }

  // ─── COMBAT ───

  applyHit(walkerId, element, dirX) {
    const entry = this.bodies[walkerId];
    if (!entry || entry.ragdoll) return;
    entry.hitFlash = 8;

    // Light knockback on limbs (keep them kinematic though, just visual)
    // The knockback is purely visual via hitFlash; real physics knockback only on ragdoll

    const pos = entry.limbBodies.torso ? entry.limbBodies.torso.translation() : { x: 0, y: 0 };
    this.combatEffects.spawnBlood(pos.x, pos.y, dirX, 0.5);
    switch (element) {
      case "fire": this.combatEffects.spawnFire(pos.x, pos.y); break;
      case "ice": this.combatEffects.spawnIceShards(pos.x, pos.y, dirX); break;
      case "shadow": this.combatEffects.spawnShadowMist(pos.x, pos.y); break;
      case "holy": this.combatEffects.spawnHolyLight(pos.x, pos.y); break;
      case "lightning": this.combatEffects.spawnMeleeSparks(pos.x, pos.y, dirX); break;
    }
  }

  triggerRagdoll(walkerId, element, dirX) {
    const entry = this.bodies[walkerId];
    if (!entry || entry.ragdoll) return;
    entry.ragdoll = true;
    entry.alive = false;
    entry.fadeTimer = 0;

    // Switch all limbs from kinematic to dynamic
    for (const rb of Object.values(entry.limbBodies)) {
      rb.setBodyType(this.rapier.RigidBodyType.Dynamic);
      rb.setLinearDamping(0.5);
      rb.setAngularDamping(0.3);
    }

    _applyDeathImpulse(entry.limbBodies, element, dirX);

    const pos = entry.limbBodies.torso ? entry.limbBodies.torso.translation() : { x: 0, y: 0 };
    this.combatEffects.spawnBlood(pos.x, pos.y, dirX, 1.5);
    switch (element) {
      case "fire": this.combatEffects.spawnFire(pos.x, pos.y); this.combatEffects.spawnFire(pos.x, pos.y); break;
      case "ice": this.combatEffects.spawnIceShards(pos.x, pos.y, dirX); entry.frozenTimer = 20; break;
      case "shadow": this.combatEffects.spawnShadowMist(pos.x, pos.y); this.combatEffects.spawnShadowMist(pos.x, pos.y); break;
      case "holy": this.combatEffects.spawnHolyLight(pos.x, pos.y); break;
      case "lightning": this.combatEffects.spawnMeleeSparks(pos.x, pos.y, dirX); this.combatEffects.spawnMeleeSparks(pos.x, pos.y, -dirX); break;
      default: this.combatEffects.spawnMeleeSparks(pos.x, pos.y, dirX); break;
    }
  }

  triggerAttackAnim(walkerId) {
    const entry = this.bodies[walkerId];
    if (entry) entry.attackAnim = 10;
  }

  // ─── PROJECTILE SYSTEM ───

  spawnProjectile(sourceId, targetXPct, type, damage, element, onHit, targetId) {
    const entry = this.bodies[sourceId];
    if (!entry) return;
    const sPos = entry.limbBodies.torso ? entry.limbBodies.torso.translation() : { x: 0, y: 0 };
    const sx = sPos.x, sy = sPos.y;
    const tx = (targetXPct / 100) * this.W;
    const targetEntry = targetId != null ? this.bodies[targetId] : null;
    const tPos = targetEntry?.limbBodies?.torso?.translation();
    const ty = tPos ? tPos.y : (this.GY - this._halfH(entry.bodyType));
    const dx = tx - sx, dy = ty - sy;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    if (type === "arrow") {
      const speed = 7;
      const vx = (dx / dist) * speed;
      const tFlight = Math.abs(dx / vx) || 20;
      const gravity = 0.12;
      const vy = (dy / tFlight) - 0.5 * gravity * tFlight;
      this.projectiles.push({
        x: sx, y: sy, vx, vy, gravity,
        type, damage, sourceId, element, age: 0, maxAge: 150, onHit: onHit || null,
        targetId: targetId != null ? targetId : null,
        homing: 0.03, speed,
      });
    } else {
      const isMageSpell = type === "mageSpell";
      const speed = isMageSpell ? 5 : 4;
      this.projectiles.push({
        x: sx, y: sy, vx: (dx / dist) * speed, vy: (dy / dist) * speed,
        gravity: 0, speed,
        type, damage, sourceId, element, age: 0, maxAge: 120, onHit: onHit || null,
        homing: isMageSpell ? 0.06 : 0,
        targetId: targetId != null ? targetId : null,
      });
    }
  }

  spawnProjectileFrom(fromXPct, fromYPct, targetXPct, type, damage, element, onHit) {
    const sx = (fromXPct / 100) * this.W;
    const sy = (fromYPct / 100) * this.H;
    const tx = (targetXPct / 100) * this.W;
    const ty = this.GY;
    const dx = tx - sx, dy = ty - sy;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    if (type === "arrow") {
      const speed = 6;
      const vx = (dx / dist) * speed;
      const tFlight = Math.abs(dx / vx) || 20;
      const gravity = 0.12;
      const vy = (dy / tFlight) - 0.5 * gravity * tFlight;
      this.projectiles.push({
        x: sx, y: sy, vx, vy, gravity,
        type, damage, sourceId: -1, element, age: 0, maxAge: 150, onHit: onHit || null,
        hitFriendlyOnly: true,
      });
    } else {
      const speed = 4;
      this.projectiles.push({
        x: sx, y: sy, vx: (dx / dist) * speed, vy: (dy / dist) * speed,
        gravity: 0,
        type, damage, sourceId: -1, element, age: 0, maxAge: 120, onHit: onHit || null,
        hitFriendlyOnly: true,
      });
    }
  }

  // ─── PLAYER SKILLSHOT SYSTEM ───

  // Spawn a player-aimed skillshot projectile toward target pixel coordinates
  spawnPlayerSkillshot(spellId, targetPx, targetPy, damage, element, onHit, onMiss, onHeadshot) {
    const cfg = SKILLSHOT_TYPES[spellId];
    if (!cfg) return;

    // Player fires from left side of screen (caravan position ~10%)
    const sx = this.W * 0.10;
    // Start projectile ABOVE ground line (NPC torso height) so it doesn't
    // immediately trigger ground-explosion checks
    const sy = this.GY - FIGURE_HALF_HEIGHT;

    if (cfg.type === "mine") {
      // Place mine at target location
      this.mines.push({
        x: targetPx, y: targetPy,
        damage, element, spellId,
        triggerRadius: cfg.triggerRadius,
        splashRadius: cfg.splashRadius,
        armDelay: cfg.armDelay,
        placedAt: Date.now(),
        armed: false,
        triggered: false,
        onHit,
      });
      return;
    }

    if (cfg.type === "area") {
      // Area targeting: show indicator, then impact after delay
      this.areaIndicators.push({
        x: targetPx, y: targetPy,
        radius: cfg.splashRadius,
        color: cfg.indicatorColor,
        spellId, damage, element,
        createdAt: Date.now(),
        delay: cfg.delay,
        onHit,
      });
      return;
    }

    // Linear or arc projectile
    const dx = targetPx - sx, dy = targetPy - sy;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    // Total flight time = distance / speed (in frames)
    const tFlight = Math.max(15, dist / cfg.speed);

    let vx, vy;
    if (cfg.type === "arc") {
      // Arc: calculate vx/vy so projectile arrives at target in tFlight frames
      // accounting for gravity: y(t) = sy + vy*t + 0.5*g*t^2 = targetPy
      // vy = (dy - 0.5*g*t^2) / t
      vx = dx / tFlight;
      vy = (dy - 0.5 * cfg.gravity * tFlight * tFlight) / tFlight;
    } else {
      // Linear: aim directly, gravity (if any) is compensated by arc-like formula
      if (cfg.gravity > 0) {
        // Heavy projectile with gravity — use arc formula so it actually reaches target
        vx = dx / tFlight;
        vy = (dy - 0.5 * cfg.gravity * tFlight * tFlight) / tFlight;
      } else {
        // Pure linear — direct aim
        vx = (dx / dist) * cfg.speed;
        vy = (dy / dist) * cfg.speed;
      }
    }

    this.playerSkillshots.push({
      x: sx, y: sy, vx, vy,
      gravity: cfg.gravity || 0,
      speed: cfg.speed,
      size: cfg.size,
      hitRadius: cfg.hitRadius,
      splashRadius: cfg.splashRadius || 0,
      splashDamageMult: cfg.splashDamageMult || 0,
      trail: cfg.trail,
      pierce: cfg.pierce || false,
      maxPierce: cfg.maxPierce || 0,
      pierceCount: 0,
      chainOnHit: cfg.chainOnHit || false,
      maxChains: cfg.maxChains || 0,
      chainDamageMult: cfg.chainDamageMult || 0.6,
      explodeOnGround: cfg.explodeOnGround || false,
      type: cfg.type,
      spellId, damage, element,
      age: 0, maxAge: 200,
      onHit, onMiss, onHeadshot,
      hitIds: [], // track pierced enemies
    });
  }

  // Check if a point is near a body's head (for headshot detection)
  _isHeadshot(entry, px, py) {
    const head = entry.limbBodies.head;
    if (!head) return false;
    const hPos = head.translation();
    const headR = entry.bodyType === "quadruped" ? QUAD_HEAD_RADIUS : HEAD_RADIUS;
    const dx = px - hPos.x, dy = py - hPos.y;
    return (dx * dx + dy * dy) < (headR * headR * 4); // generous headshot zone
  }

  // Update player skillshot projectiles
  _updatePlayerSkillshots() {
    const fx = this.pixiRenderer || this.combatEffects;

    for (let i = this.playerSkillshots.length - 1; i >= 0; i--) {
      const proj = this.playerSkillshots[i];
      proj.age++;

      // Apply physics
      proj.x += proj.vx;
      proj.y += proj.vy;
      if (proj.gravity) proj.vy += proj.gravity;
      if (this.windDeflection) {
        proj.vx += this.windDeflection * 0.3;
      }

      // Trail effects
      if (proj.trail === "fire" && proj.age % 2 === 0) fx.spawnFire(proj.x, proj.y);
      if (proj.trail === "ice" && proj.age % 3 === 0) fx.spawnIceShards(proj.x, proj.y, Math.sign(proj.vx));
      if (proj.trail === "spark" && proj.age % 2 === 0) fx.spawnMeleeSparks(proj.x, proj.y, Math.sign(proj.vx));
      if (proj.trail === "shadow" && proj.age % 3 === 0) fx.spawnPoisonCloud(proj.x, proj.y);

      let hit = false;
      let hitAnybody = false;

      // Check collision with enemy bodies
      for (const [id, entry] of Object.entries(this.bodies)) {
        if (entry.ragdoll || !entry.alive || entry.friendly) continue;
        if (proj.hitIds.includes(parseInt(id))) continue; // already pierced

        const torso = entry.limbBodies.torso;
        if (!torso) continue;
        const ePos = torso.translation();
        const ddx = proj.x - ePos.x, ddy = proj.y - ePos.y;
        const hitR = proj.hitRadius * proj.hitRadius;

        if (ddx * ddx + ddy * ddy < hitR) {
          hitAnybody = true;
          const isHeadshot = this._isHeadshot(entry, proj.x, proj.y);

          // Spawn hit effects
          fx.spawnBlood(ePos.x, ePos.y, Math.sign(proj.vx) || 1, isHeadshot ? 1.2 : 0.6);
          if (proj.element === "fire") fx.spawnFire(ePos.x, ePos.y);
          else if (proj.element === "ice") fx.spawnIceShards(ePos.x, ePos.y, Math.sign(proj.vx));
          else if (proj.element === "shadow") fx.spawnPoisonCloud(ePos.x, ePos.y);
          else fx.spawnMeleeSparks(ePos.x, ePos.y, Math.sign(proj.vx));

          // Screen shake proportional to damage
          if (this.pixiRenderer) {
            const shakeIntensity = isHeadshot ? 8 : (proj.splashRadius > 0 ? 10 : 5);
            this.pixiRenderer.screenShake(shakeIntensity);
          }

          // Notify hit callback
          if (isHeadshot && proj.onHeadshot) {
            proj.onHeadshot(parseInt(id), proj.damage, proj.element);
          } else if (proj.onHit) {
            proj.onHit(parseInt(id), proj.damage, proj.element, isHeadshot);
          }

          // Handle splash damage
          if (proj.splashRadius > 0) {
            this._applySplashDamage(proj, ePos.x, ePos.y, parseInt(id));
          }

          // Handle chain on hit (rykoszet)
          if (proj.chainOnHit && proj.pierceCount < proj.maxChains) {
            proj.hitIds.push(parseInt(id));
            proj.pierceCount++;
            proj.damage = Math.round(proj.damage * proj.chainDamageMult);
            // Retarget to nearest unhit enemy
            let nearId = null, nearDist = Infinity;
            for (const [eid, ee] of Object.entries(this.bodies)) {
              if (ee.ragdoll || !ee.alive || ee.friendly || proj.hitIds.includes(parseInt(eid))) continue;
              const ep = ee.limbBodies.torso?.translation();
              if (!ep) continue;
              const d = Math.sqrt((ep.x - proj.x) ** 2 + (ep.y - proj.y) ** 2);
              if (d < nearDist) { nearDist = d; nearId = eid; }
            }
            if (nearId && nearDist < 300) {
              const ne = this.bodies[nearId].limbBodies.torso.translation();
              const nd = Math.sqrt((ne.x - proj.x) ** 2 + (ne.y - proj.y) ** 2) || 1;
              proj.vx = ((ne.x - proj.x) / nd) * proj.speed;
              proj.vy = ((ne.y - proj.y) / nd) * proj.speed;
              continue; // Don't remove — continues to next target
            }
            hit = true; // No more targets, remove
          } else if (proj.pierce && proj.pierceCount < proj.maxPierce) {
            // Pierce: pass through enemy
            proj.hitIds.push(parseInt(id));
            proj.pierceCount++;
            continue;
          } else {
            hit = true;
          }
          break;
        }
      }

      // Check if hit ground (for arc/heavy projectiles)
      // Only trigger when: 1) projectile is descending (vy > 0), 2) past initial launch phase (age > 10),
      // 3) projectile is at or below the NPC ground line
      if (!hit && proj.explodeOnGround && proj.age > 10 && proj.vy > 0 && proj.y >= this.GY) {
        hit = true;
        // Ground explosion
        fx.spawnFire(proj.x, proj.y);
        fx.spawnFire(proj.x - 10, proj.y);
        fx.spawnFire(proj.x + 10, proj.y);
        if (this.pixiRenderer) this.pixiRenderer.screenShake(8);
        // Splash damage at ground point
        if (proj.splashRadius > 0) {
          this._applySplashDamage(proj, proj.x, proj.y, -1);
        }
        if (!hitAnybody && proj.onMiss) proj.onMiss();
      }

      // Remove if hit, expired, or off-screen
      if (hit || proj.age > proj.maxAge || proj.x < -50 || proj.x > this.W + 50 || proj.y > this.H + 30) {
        if (!hitAnybody && !hit && proj.onMiss) proj.onMiss();
        this.playerSkillshots.splice(i, 1);
      }
    }
  }

  // Apply splash/AoE damage to nearby enemies
  _applySplashDamage(proj, cx, cy, directHitId) {
    for (const [id, entry] of Object.entries(this.bodies)) {
      if (entry.ragdoll || !entry.alive || entry.friendly) continue;
      if (parseInt(id) === directHitId) continue; // already hit directly
      const torso = entry.limbBodies.torso;
      if (!torso) continue;
      const ePos = torso.translation();
      const dx = cx - ePos.x, dy = cy - ePos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < proj.splashRadius) {
        const splashDmg = Math.round(proj.damage * (proj.splashDamageMult || 0.5));
        const fx = this.pixiRenderer || this.combatEffects;
        fx.spawnBlood(ePos.x, ePos.y, Math.sign(proj.vx) || 1, 0.3);
        if (proj.onHit) proj.onHit(parseInt(id), splashDmg, proj.element, false);
      }
    }
  }

  // Update mines
  _updateMines() {
    const now = Date.now();
    const fx = this.pixiRenderer || this.combatEffects;

    for (let i = this.mines.length - 1; i >= 0; i--) {
      const mine = this.mines[i];

      // Arm delay
      if (!mine.armed && now - mine.placedAt >= mine.armDelay) {
        mine.armed = true;
      }

      if (!mine.armed || mine.triggered) continue;

      // Check if any enemy steps on it
      for (const [id, entry] of Object.entries(this.bodies)) {
        if (entry.ragdoll || !entry.alive || entry.friendly) continue;
        const torso = entry.limbBodies.torso;
        if (!torso) continue;
        const ePos = torso.translation();
        const dx = mine.x - ePos.x, dy = mine.y - ePos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < mine.triggerRadius) {
          mine.triggered = true;
          // Explosion effects
          fx.spawnFire(mine.x, mine.y);
          fx.spawnFire(mine.x - 15, mine.y);
          fx.spawnFire(mine.x + 15, mine.y);
          if (this.pixiRenderer) this.pixiRenderer.screenShake(12);

          // Damage all enemies in splash radius
          for (const [eid, ee] of Object.entries(this.bodies)) {
            if (ee.ragdoll || !ee.alive || ee.friendly) continue;
            const et = ee.limbBodies.torso;
            if (!et) continue;
            const ep = et.translation();
            const ed = Math.sqrt((mine.x - ep.x) ** 2 + (mine.y - ep.y) ** 2);
            if (ed < mine.splashRadius) {
              const dmgMult = parseInt(eid) === parseInt(id) ? 1.0 : 0.6;
              const dmg = Math.round(mine.damage * dmgMult);
              fx.spawnBlood(ep.x, ep.y, Math.sign(ep.x - mine.x) || 1, 0.5);
              if (mine.onHit) mine.onHit(parseInt(eid), dmg, mine.element, false);
            }
          }

          // Remove mine after explosion
          setTimeout(() => {
            const idx = this.mines.indexOf(mine);
            if (idx >= 0) this.mines.splice(idx, 1);
          }, 100);
          break;
        }
      }
    }
  }

  // Update area indicators (meteor/blizzard)
  _updateAreaIndicators() {
    const now = Date.now();
    const fx = this.pixiRenderer || this.combatEffects;

    for (let i = this.areaIndicators.length - 1; i >= 0; i--) {
      const ind = this.areaIndicators[i];
      if (now - ind.createdAt >= ind.delay) {
        // Impact! Damage all enemies in radius
        fx.spawnFire(ind.x, ind.y);
        fx.spawnFire(ind.x - 20, ind.y - 10);
        fx.spawnFire(ind.x + 20, ind.y + 10);
        if (this.pixiRenderer) this.pixiRenderer.screenShake(12);

        for (const [id, entry] of Object.entries(this.bodies)) {
          if (entry.ragdoll || !entry.alive || entry.friendly) continue;
          const torso = entry.limbBodies.torso;
          if (!torso) continue;
          const ePos = torso.translation();
          const dx = ind.x - ePos.x, dy = ind.y - ePos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < ind.radius) {
            const distMult = 1 - (dist / ind.radius) * 0.4; // closer = more damage
            const dmg = Math.round(ind.damage * distMult);
            fx.spawnBlood(ePos.x, ePos.y, Math.sign(ePos.x - ind.x) || 1, 0.5);
            if (ind.onHit) ind.onHit(parseInt(id), dmg, ind.element, false);
          }
        }

        this.areaIndicators.splice(i, 1);
      }
    }
  }

  // Enemy dodge: check if any enemy should dodge an incoming skillshot
  _checkEnemyDodge() {
    for (const proj of this.playerSkillshots) {
      for (const [id, entry] of Object.entries(this.bodies)) {
        if (entry.ragdoll || !entry.alive || entry.friendly) continue;
        if (entry._dodgeCooldown && Date.now() < entry._dodgeCooldown) continue;

        const torso = entry.limbBodies.torso;
        if (!torso) continue;
        const ePos = torso.translation();

        // Predict projectile path
        const dx = ePos.x - proj.x, dy = ePos.y - proj.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < ENEMY_DODGE_REACT_DIST && dist > 20) {
          // Check if projectile is heading toward this enemy
          const dotProduct = (dx * proj.vx + dy * proj.vy) / (dist * Math.sqrt(proj.vx * proj.vx + proj.vy * proj.vy) || 1);
          if (dotProduct > 0.7) { // heading roughly toward enemy
            // Some enemies dodge (fast ones)
            const npcData = entry.npcData;
            const isQuick = npcData?.bodyType === "quadruped" || npcData?.bodyType === "floating" ||
                           npcData?.rarity === "rare" || npcData?.rarity === "epic" || npcData?.rarity === "legendary";
            if (isQuick && Math.random() < 0.20) {
              // Dodge sideways
              entry._dodgeOffset = (Math.random() < 0.5 ? 1 : -1) * ENEMY_DODGE_SPEED;
              entry._dodgeFrames = 15;
              entry._dodgeCooldown = Date.now() + 3000;
            }
          }
        }
      }
    }

    // Apply dodge movement
    for (const [, entry] of Object.entries(this.bodies)) {
      if (entry._dodgeFrames > 0) {
        entry._dodgeFrames--;
        // Move the entry's walkData Y position (handled in App.jsx via a flag)
        entry._dodging = true;
        entry._dodgeDir = entry._dodgeOffset > 0 ? 1 : -1;
      } else {
        entry._dodging = false;
      }
    }
  }

  // Get positions of all active mines (for UI rendering)
  getMines() { return this.mines; }

  // Get positions of all active area indicators (for UI rendering)
  getAreaIndicators() { return this.areaIndicators; }

  // Get player skillshots (for rendering)
  getPlayerSkillshots() { return this.playerSkillshots; }

  _updateProjectiles() {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.age++;

      // Homing
      if (proj.homing && proj.targetId != null) {
        const te = this.bodies[proj.targetId];
        if (te && te.alive && !te.ragdoll) {
          const tPos = te.limbBodies.torso ? te.limbBodies.torso.translation() : null;
          if (tPos) {
            const dx = tPos.x - proj.x, dy = tPos.y - proj.y;
            if (proj.gravity) {
              const desiredVx = Math.sign(dx) * Math.abs(proj.vx);
              proj.vx += (desiredVx - proj.vx) * proj.homing;
              // Also adjust vy to track target's Y position
              const dist = Math.sqrt(dx * dx + dy * dy) || 1;
              const desiredVy = (dy / dist) * Math.abs(proj.vx);
              proj.vy += (desiredVy - proj.vy) * proj.homing * 0.5;
            } else {
              const dist = Math.sqrt(dx * dx + dy * dy) || 1;
              const desiredVx = (dx / dist) * proj.speed;
              const desiredVy = (dy / dist) * proj.speed;
              proj.vx += (desiredVx - proj.vx) * proj.homing;
              proj.vy += (desiredVy - proj.vy) * proj.homing;
              const curSpd = Math.sqrt(proj.vx * proj.vx + proj.vy * proj.vy) || 1;
              proj.vx = (proj.vx / curSpd) * proj.speed;
              proj.vy = (proj.vy / curSpd) * proj.speed;
            }
          }
        }
      }

      proj.x += proj.vx;
      proj.y += proj.vy;
      if (proj.gravity) proj.vy += proj.gravity;
      if (this.windDeflection) {
        proj.vx += this.windDeflection * (0.5 + Math.sin(proj.age * 0.15) * 0.5);
        proj.vy += this.windDeflection * Math.sin(proj.age * 0.2) * 0.15;
      }

      const fx = this.pixiRenderer || this.combatEffects;
      if (proj.type === "arrow" && proj.age % 3 === 0) fx.spawnArrowTrail(proj.x, proj.y, proj.vx, proj.vy);
      if ((proj.type === "fireball_npc" || proj.type === "mageSpell") && proj.age % 2 === 0) fx.spawnFire(proj.x, proj.y);

      let hit = false;

      if (proj.targetPos) {
        const ddx = proj.x - proj.targetPos.x, ddy = proj.y - proj.targetPos.y;
        if (ddx * ddx + ddy * ddy < 600) {
          hit = true;
          fx.spawnMeleeSparks(proj.targetPos.x, proj.targetPos.y, Math.sign(proj.vx) || 1);
          if (proj.onHit) proj.onHit(null, proj.damage, proj.element);
        }
      }

      for (const [id, entry] of Object.entries(this.bodies)) {
        if (parseInt(id) === proj.sourceId || entry.ragdoll || !entry.alive) continue;
        if (proj.hitFriendlyOnly) {
          if (!entry.friendly) continue;
        } else {
          const sourceEntry = this.bodies[proj.sourceId];
          if (sourceEntry && sourceEntry.friendly === entry.friendly) continue;
        }
        const ePos = entry.limbBodies.torso ? entry.limbBodies.torso.translation() : null;
        if (!ePos) continue;
        const ddx = proj.x - ePos.x, ddy = proj.y - ePos.y;
        const hitR = 400;
        if (ddx * ddx + ddy * ddy < hitR) {
          hit = true;
          fx.spawnBlood(ePos.x, ePos.y, Math.sign(proj.vx) || 1, 0.4);
          if (proj.element === "fire") fx.spawnFire(ePos.x, ePos.y);
          else if (proj.element === "ice") fx.spawnIceShards(ePos.x, ePos.y, Math.sign(proj.vx));
          else if (proj.element === "shadow") fx.spawnPoisonCloud(ePos.x, ePos.y);
          else fx.spawnMeleeSparks(ePos.x, ePos.y, Math.sign(proj.vx));
          if (proj.onHit) proj.onHit(parseInt(id), proj.damage, proj.element);
          // Screen shake on hit
          if (this.pixiRenderer) this.pixiRenderer.screenShake(4);
          break;
        }
      }
      if (hit || proj.age > proj.maxAge || proj.x < -50 || proj.x > this.W + 50 || proj.y > this.H + 30) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  // ─── STEP & RENDER ───

  step() {
    for (const entry of Object.values(this.bodies)) {
      if (entry.frozenTimer > 0) {
        entry.frozenTimer--;
        if (entry.frozenTimer > 0 && entry.ragdoll) {
          // Freeze ragdoll bodies
          for (const rb of Object.values(entry.limbBodies)) {
            rb.setLinvel({ x: 0, y: 0 }, true);
            rb.setAngvel(0, true);
          }
        }
      }
      if (entry.attackAnim > 0) entry.attackAnim--;
    }
    this._updateProjectiles();
    this._updatePlayerSkillshots();
    this._updateMines();
    this._updateAreaIndicators();
    this._checkEnemyDodge();

    if (this.world) {
      this.world.step();
    }

    this.render();
  }

  // Extract limb positions from Rapier bodies → simple {x,y} map for renderers
  _getLimbPositions(entry) {
    const result = {};
    for (const [name, rb] of Object.entries(entry.limbBodies)) {
      const t = rb.translation();
      result[name] = { x: t.x, y: t.y };
    }
    return result;
  }

  render() {
    // PixiJS rendering mode
    if (this.pixiRenderer) {
      // Remove bodies flagged for cleanup
      for (const [id, entry] of Object.entries(this.bodies)) {
        if (entry._removeFlag) {
          this.removeNpc(parseInt(id));
        }
      }
      this.pixiRenderer.render(this.bodies, this.projectiles, this.fogVisibility,
        this.playerSkillshots, this.mines, this.areaIndicators);
      return;
    }

    // Fallback: Canvas2D rendering
    const { ctx, W, H, GY } = this;
    if (!ctx || !W) return;
    ctx.clearRect(0, 0, W, H);

    for (const [id, entry] of Object.entries(this.bodies)) {
      if (entry.ragdoll) {
        entry.fadeTimer++;
        entry.fadeAlpha = Math.max(0, 1 - (entry.fadeTimer - 60) / 90);
        if (entry.fadeAlpha <= 0) { this.removeNpc(parseInt(id)); continue; }
      }
      if (entry.hitFlash > 0) entry.hitFlash--;

      const limbs = this._getLimbPositions(entry);
      const colors = getColors(entry, this.fogVisibility, W);

      drawBody(ctx, entry.bodyType, limbs, colors, entry._dir || 1, entry);

      if (entry.friendly && entry.npcData.weapon && entry.bodyType === "humanoid") {
        drawWeapon(ctx, limbs, entry, GY);
      }
    }

    // Projectiles
    for (const proj of this.projectiles) {
      drawProjectile(ctx, proj);
    }

    this.combatEffects.update(ctx, GY);
  }
}
