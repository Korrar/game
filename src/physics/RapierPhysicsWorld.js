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
  }

  setWeather(w) {
    this.windDeflection = w?.windDeflection || 0;
    this.fogVisibility = w?.fogVisibility || 0;
  }

  init(canvas) {
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

      if (proj.type === "arrow" && proj.age % 3 === 0) this.combatEffects.spawnArrowTrail(proj.x, proj.y, proj.vx, proj.vy);
      if ((proj.type === "fireball_npc" || proj.type === "mageSpell") && proj.age % 2 === 0) this.combatEffects.spawnFire(proj.x, proj.y);

      let hit = false;

      if (proj.targetPos) {
        const ddx = proj.x - proj.targetPos.x, ddy = proj.y - proj.targetPos.y;
        if (ddx * ddx + ddy * ddy < 600) {
          hit = true;
          this.combatEffects.spawnMeleeSparks(proj.targetPos.x, proj.targetPos.y, Math.sign(proj.vx) || 1);
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
        const hitR = proj.type === "mageSpell" ? 400 : 256;
        if (ddx * ddx + ddy * ddy < hitR) {
          hit = true;
          this.combatEffects.spawnBlood(ePos.x, ePos.y, Math.sign(proj.vx) || 1, 0.4);
          if (proj.element === "fire") this.combatEffects.spawnFire(ePos.x, ePos.y);
          else if (proj.element === "ice") this.combatEffects.spawnIceShards(ePos.x, ePos.y, Math.sign(proj.vx));
          else if (proj.element === "shadow") this.combatEffects.spawnPoisonCloud(ePos.x, ePos.y);
          else this.combatEffects.spawnMeleeSparks(ePos.x, ePos.y, Math.sign(proj.vx));
          if (proj.onHit) proj.onHit(parseInt(id), proj.damage, proj.element);
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
