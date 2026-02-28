import Matter from "matter-js";
import {
  createHumanoidBody, getWalkingOffsets,
  createQuadrupedBody, getQuadrupedOffsets,
  createFloatingBody, getFloatingOffsets,
  createScorpionBody, getScorpionOffsets,
  createSpiderBody, getSpiderOffsets,
  createFrogBody, getFrogOffsets,
  createSerpentBody, getSerpentOffsets,
  createBarricadeBody, createTowerBody,
  genericSetRagdoll, genericDeathImpulse, genericKnockback,
  FIGURE_HALF_HEIGHT, QUAD_HALF_HEIGHT, FLOAT_HALF_HEIGHT,
  SCORP_HALF_HEIGHT, SPIDER_HALF_HEIGHT, FROG_HALF_HEIGHT, SERPENT_HALF_HEIGHT,
  BARRICADE_HALF_HEIGHT, TOWER_HALF_HEIGHT,
  HEAD_RADIUS, QUAD_HEAD_RADIUS,
} from "./npcBody";
import { CombatEffects } from "./combatEffects";

const { Engine, World, Bodies, Body } = Matter;

const BODY_FACTORIES = {
  humanoid: createHumanoidBody,
  quadruped: createQuadrupedBody,
  floating: createFloatingBody,
  scorpion: createScorpionBody,
  spider: createSpiderBody,
  frog: createFrogBody,
  serpent: createSerpentBody,
  barricade: createBarricadeBody,
  tower: createTowerBody,
};

const HALF_HEIGHTS = {
  humanoid: FIGURE_HALF_HEIGHT,
  quadruped: QUAD_HALF_HEIGHT,
  floating: FLOAT_HALF_HEIGHT,
  scorpion: SCORP_HALF_HEIGHT,
  spider: SPIDER_HALF_HEIGHT,
  frog: FROG_HALF_HEIGHT,
  serpent: SERPENT_HALF_HEIGHT,
  barricade: BARRICADE_HALF_HEIGHT,
  tower: TOWER_HALF_HEIGHT,
};

export class PhysicsWorld {
  constructor() {
    this.engine = Engine.create({ gravity: { x: 0, y: 1.8, scale: 0.001 } });
    this.ground = null;
    this.wallL = null;
    this.wallR = null;
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
    this._createBoundaries();
  }

  _createBoundaries() {
    if (this.ground) World.remove(this.engine.world, this.ground);
    if (this.wallL) World.remove(this.engine.world, this.wallL);
    if (this.wallR) World.remove(this.engine.world, this.wallR);
    this.ground = Bodies.rectangle(this.W / 2, this.GY + 25, this.W + 200, 50, { isStatic: true, label: "ground", collisionFilter: { category: 0x0001 }, render: { visible: false } });
    this.wallL = Bodies.rectangle(-25, this.H / 2, 50, this.H * 2, { isStatic: true, label: "wallL", collisionFilter: { category: 0x0001 }, render: { visible: false } });
    this.wallR = Bodies.rectangle(this.W + 25, this.H / 2, 50, this.H * 2, { isStatic: true, label: "wallR", collisionFilter: { category: 0x0001 }, render: { visible: false } });
    World.add(this.engine.world, [this.ground, this.wallL, this.wallR]);
  }

  resize(w, h) {
    const scaleX = w / (this.W || w);
    this.W = w; this.H = h; this.GY = h * 0.25;
    this._createBoundaries();
    for (const entry of Object.values(this.bodies)) {
      if (entry.ragdoll) continue;
      const px = entry.parts.torso.position.x * scaleX;
      this._positionAlive(entry, px);
    }
  }

  clear() {
    for (const id of Object.keys(this.bodies)) this.removeNpc(parseInt(id));
    this.bodies = {};
    this.projectiles = [];
  }

  _halfH(bt) { return HALF_HEIGHTS[bt] || FIGURE_HALF_HEIGHT; }

  spawnNpc(walkerId, xPct, npcData, friendly = false) {
    const px = (xPct / 100) * this.W;
    const bt = npcData.bodyType || "humanoid";
    const factory = BODY_FACTORIES[bt] || createHumanoidBody;
    const { parts, constraints } = factory(px, this.GY, npcData);

    World.add(this.engine.world, Object.values(parts));
    World.add(this.engine.world, constraints);

    this.bodies[walkerId] = {
      parts, constraints,
      alive: true, ragdoll: false,
      fadeAlpha: 1, fadeTimer: 0,
      npcData, friendly,
      hitFlash: 0, frozenTimer: 0,
      bodyType: bt,
      attackAnim: 0,
      _dir: 1,
    };
  }

  removeNpc(walkerId) {
    const entry = this.bodies[walkerId];
    if (!entry) return;
    World.remove(this.engine.world, Object.values(entry.parts));
    World.remove(this.engine.world, entry.constraints);
    delete this.bodies[walkerId];
  }

  // ─── GENERIC POSITIONING ───

  _positionAlive(entry, px) {
    const cy = this.GY - this._halfH(entry.bodyType);
    Body.setPosition(entry.parts.torso, { x: px, y: cy });
    Body.setPosition(entry.parts.head, { x: px, y: cy - 14 });
    // Let constraints handle the rest
  }

  // ─── PATROL UPDATE DISPATCH ───

  updatePatrol(walkerId, xPct, dir, bouncePhase, yPct) {
    const entry = this.bodies[walkerId];
    if (!entry || entry.ragdoll) return;
    entry._dir = dir;

    const px = (xPct / 100) * this.W;
    // Use yPct if provided, otherwise default groundY
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

  _nudgeLimbs(parts, targets) {
    for (const [key, target] of Object.entries(targets)) {
      const part = parts[key];
      if (!part) continue;
      Body.setVelocity(part, { x: (target.x - part.position.x) * 0.3, y: (target.y - part.position.y) * 0.3 });
    }
  }

  _updateHumanoid(entry, px, dir, phase, groundY) {
    const cy = (groundY || this.GY) - FIGURE_HALF_HEIGHT;
    const o = getWalkingOffsets(phase);
    Body.setPosition(entry.parts.torso, { x: px, y: cy });
    Body.setPosition(entry.parts.head, { x: px, y: cy - 11 - HEAD_RADIUS });
    this._nudgeLimbs(entry.parts, {
      lUpperArm: { x: px - 8 + o.lArmX, y: cy - 4 },
      rUpperArm: { x: px + 8 + o.rArmX, y: cy - 4 },
      lLowerArm: { x: px - 8 + o.lArmX * 1.2, y: cy + 8 },
      rLowerArm: { x: px + 8 + o.rArmX * 1.2, y: cy + 8 },
      lUpperLeg: { x: px - 4 + o.lLegX, y: cy + 17 },
      rUpperLeg: { x: px + 4 + o.rLegX, y: cy + 17 },
      lLowerLeg: { x: px - 4 + o.lLegX * 1.3, y: cy + 30 - o.lLegY },
      rLowerLeg: { x: px + 4 + o.rLegX * 1.3, y: cy + 30 - o.rLegY },
    });
  }

  _updateQuadruped(entry, px, dir, phase, groundY) {
    const cy = (groundY || this.GY) - QUAD_HALF_HEIGHT;
    const o = getQuadrupedOffsets(phase);
    Body.setPosition(entry.parts.torso, { x: px, y: cy });
    Body.setPosition(entry.parts.head, { x: px + dir * 14, y: cy - 6 });
    this._nudgeLimbs(entry.parts, {
      fl: { x: px + dir * 8 + o.flX * dir, y: cy + 16 - o.flY },
      fr: { x: px + dir * 8 + o.frX * dir, y: cy + 16 - o.frY },
      bl: { x: px - dir * 8 + o.blX * dir, y: cy + 16 - o.blY },
      br: { x: px - dir * 8 + o.brX * dir, y: cy + 16 - o.brY },
    });
    if (entry.parts.tail) {
      const tx = px - dir * 16 + Math.sin(o.tailPhase * 2) * 4;
      const ty = cy - 2 + Math.sin(o.tailPhase * 3) * 2;
      Body.setVelocity(entry.parts.tail, { x: (tx - entry.parts.tail.position.x) * 0.2, y: (ty - entry.parts.tail.position.y) * 0.2 });
    }
  }

  _updateFloating(entry, px, dir, phase, groundY) {
    const cy = (groundY || this.GY) - FLOAT_HALF_HEIGHT - 10;
    const o = getFloatingOffsets(phase);
    Body.setPosition(entry.parts.torso, { x: px, y: cy + o.bobY });
    Body.setPosition(entry.parts.head, { x: px, y: cy - 16 + o.bobY });
    this._nudgeLimbs(entry.parts, {
      lArm: { x: px - 12 + o.armSway * dir, y: cy - 4 + o.bobY },
      rArm: { x: px + 12 - o.armSway * dir, y: cy - 4 + o.bobY },
      trail: { x: px + o.trailSway, y: cy + 18 + o.bobY + 2 },
    });
  }

  _updateScorpion(entry, px, dir, phase, groundY) {
    const cy = (groundY || this.GY) - SCORP_HALF_HEIGHT;
    const o = getScorpionOffsets(phase);
    Body.setPosition(entry.parts.torso, { x: px, y: cy });
    Body.setPosition(entry.parts.head, { x: px + dir * 16, y: cy - 2 });
    this._nudgeLimbs(entry.parts, {
      l1: { x: px + dir * 6 + o.l1X * dir, y: cy + 10 }, l2: { x: px + o.l2X * dir, y: cy + 10 }, l3: { x: px - dir * 6 + o.l3X * dir, y: cy + 10 },
      r1: { x: px + dir * 6 + o.r1X * dir, y: cy + 10 }, r2: { x: px + o.r2X * dir, y: cy + 10 }, r3: { x: px - dir * 6 + o.r3X * dir, y: cy + 10 },
      lPincer: { x: px + dir * 20, y: cy - 6 - o.pincerOpen },
      rPincer: { x: px + dir * 20, y: cy + 4 + o.pincerOpen },
      tail1: { x: px - dir * 14 + o.tailSway, y: cy - 4 },
      tail2: { x: px - dir * 18 + o.tailSway * 1.5, y: cy - 14 },
      stinger: { x: px - dir * 16 + o.tailSway * 2, y: cy - 22 },
    });
  }

  _updateSpider(entry, px, dir, phase, groundY) {
    const cy = (groundY || this.GY) - SPIDER_HALF_HEIGHT;
    const o = getSpiderOffsets(phase);
    Body.setPosition(entry.parts.torso, { x: px, y: cy });
    Body.setPosition(entry.parts.head, { x: px + dir * 10, y: cy - 3 });
    const targets = {};
    if (entry.parts.abdomen) targets.abdomen = { x: px - dir * 10, y: cy + 2 };
    for (let i = 0; i < 4; i++) {
      const ox = 6 - i * 4;
      targets[`ll${i}`] = { x: px + ox * dir - 8 + (o[`ll${i}X`] || 0), y: cy + 8 - (o[`ll${i}Y`] || 0) };
      targets[`rl${i}`] = { x: px + ox * dir + 8 + (o[`rl${i}X`] || 0), y: cy + 8 - (o[`rl${i}Y`] || 0) };
    }
    this._nudgeLimbs(entry.parts, targets);
  }

  _updateFrog(entry, px, dir, phase, groundY) {
    const cy = (groundY || this.GY) - FROG_HALF_HEIGHT;
    const o = getFrogOffsets(phase);
    const y = cy - o.jumpY;
    Body.setPosition(entry.parts.torso, { x: px, y: y + o.crouch });
    Body.setPosition(entry.parts.head, { x: px + dir * 8, y: y - 6 });
    this._nudgeLimbs(entry.parts, {
      lHind: { x: px - 6 - o.hindSpread, y: y + 8 + o.crouch },
      rHind: { x: px + 6 + o.hindSpread, y: y + 8 + o.crouch },
      lFront: { x: px - 4, y: y + 6 },
      rFront: { x: px + 4, y: y + 6 },
    });
  }

  _updateSerpent(entry, px, dir, phase, groundY) {
    const cy = (groundY || this.GY) - SERPENT_HALF_HEIGHT;
    const o = getSerpentOffsets(phase);
    Body.setPosition(entry.parts.torso, { x: px, y: cy });
    Body.setPosition(entry.parts.head, { x: px + dir * 18, y: cy - 4 });
    this._nudgeLimbs(entry.parts, {
      seg2: { x: px - dir * 6 + o.seg2X, y: cy + 2 + o.seg2Y },
      seg3: { x: px - dir * 16 + o.seg3X, y: cy + 3 + o.seg3Y },
      tailTip: { x: px - dir * 26 + o.tailX, y: cy + 4 + o.tailY },
      lFin: { x: px - dir * 2, y: cy + 8 + Math.sin(o.finPhase) * 2 },
      rFin: { x: px + dir * 2, y: cy + 8 - Math.sin(o.finPhase) * 2 },
    });
  }

  _updateBarricade(entry, px, groundY) {
    const cy = (groundY || this.GY) - BARRICADE_HALF_HEIGHT;
    Body.setPosition(entry.parts.torso, { x: px, y: cy });
    Body.setPosition(entry.parts.head, { x: px, y: cy - 26 });
    this._nudgeLimbs(entry.parts, {
      plankL: { x: px - 14, y: cy + 4 },
      plankR: { x: px + 14, y: cy + 4 },
      crossbar: { x: px, y: cy - 6 },
    });
  }

  _updateTower(entry, px, groundY) {
    const cy = (groundY || this.GY) - TOWER_HALF_HEIGHT;
    Body.setPosition(entry.parts.torso, { x: px, y: cy + 8 });
    Body.setPosition(entry.parts.head, { x: px, y: cy - 22 });
    this._nudgeLimbs(entry.parts, {
      roofL: { x: px - 12, y: cy - 28 },
      roofR: { x: px + 12, y: cy - 28 },
      baseL: { x: px - 13, y: cy + 30 },
      baseR: { x: px + 13, y: cy + 30 },
    });
  }

  // ─── COMBAT ───

  applyHit(walkerId, element, dirX) {
    const entry = this.bodies[walkerId];
    if (!entry || entry.ragdoll) return;
    entry.hitFlash = 8;
    genericKnockback(entry, element, dirX);

    const tx = entry.parts.torso.position.x;
    const ty = entry.parts.torso.position.y;
    this.combatEffects.spawnBlood(tx, ty, dirX, 0.5);
    switch (element) {
      case "fire": this.combatEffects.spawnFire(tx, ty); break;
      case "ice": this.combatEffects.spawnIceShards(tx, ty, dirX); break;
      case "shadow": this.combatEffects.spawnShadowMist(tx, ty); break;
      case "holy": this.combatEffects.spawnHolyLight(tx, ty); break;
      case "lightning": this.combatEffects.spawnMeleeSparks(tx, ty, dirX); break;
    }
  }

  triggerRagdoll(walkerId, element, dirX) {
    const entry = this.bodies[walkerId];
    if (!entry || entry.ragdoll) return;
    entry.ragdoll = true;
    entry.alive = false;
    entry.fadeTimer = 0;

    genericSetRagdoll(entry);
    genericDeathImpulse(entry, element, dirX);

    const tx = entry.parts.torso.position.x;
    const ty = entry.parts.torso.position.y;
    this.combatEffects.spawnBlood(tx, ty, dirX, 1.5);
    switch (element) {
      case "fire": this.combatEffects.spawnFire(tx, ty); this.combatEffects.spawnFire(tx, ty); break;
      case "ice": this.combatEffects.spawnIceShards(tx, ty, dirX); entry.frozenTimer = 20; break;
      case "shadow": this.combatEffects.spawnShadowMist(tx, ty); this.combatEffects.spawnShadowMist(tx, ty); break;
      case "holy": this.combatEffects.spawnHolyLight(tx, ty); break;
      case "lightning": this.combatEffects.spawnMeleeSparks(tx, ty, dirX); this.combatEffects.spawnMeleeSparks(tx, ty, -dirX); break;
      default: this.combatEffects.spawnMeleeSparks(tx, ty, dirX); break;
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
    const sx = entry.parts.torso.position.x;
    const sy = entry.parts.torso.position.y;
    const tx = (targetXPct / 100) * this.W;
    // Use target body Y if available, otherwise estimate from source
    const targetEntry = targetId != null ? this.bodies[targetId] : null;
    const ty = targetEntry ? targetEntry.parts.torso.position.y : (this.GY - this._halfH(entry.bodyType));
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
        homing: 0.03, speed, // light homing for arrows
      });
    } else {
      // Mage spells and NPC projectiles: homing if targetId provided
      const isMageSpell = type === "mageSpell";
      const speed = isMageSpell ? 5 : 4;
      this.projectiles.push({
        x: sx, y: sy, vx: (dx / dist) * speed, vy: (dy / dist) * speed,
        gravity: 0, speed,
        type, damage, sourceId, element, age: 0, maxAge: 120, onHit: onHit || null,
        homing: isMageSpell ? 0.06 : 0, // turn rate per frame
        targetId: targetId != null ? targetId : null,
      });
    }
  }

  // Spawn projectile from a fixed % position (for towers/traps)
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

      // Homing: gently steer toward target
      if (proj.homing && proj.targetId != null) {
        const te = this.bodies[proj.targetId];
        if (te && te.alive && !te.ragdoll) {
          const tx = te.parts.torso.position.x, ty = te.parts.torso.position.y;
          const dx = tx - proj.x, dy = ty - proj.y;
          if (proj.gravity) {
            // Arrows: only adjust X to track target, let gravity handle arc
            const desiredVx = Math.sign(dx) * Math.abs(proj.vx);
            proj.vx += (desiredVx - proj.vx) * proj.homing;
          } else {
            // Spells: full 2D homing
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

      proj.x += proj.vx;
      proj.y += proj.vy;
      if (proj.gravity) proj.vy += proj.gravity;
      // Gale weather: deflect projectiles sideways
      if (this.windDeflection) {
        proj.vx += this.windDeflection * (0.5 + Math.sin(proj.age * 0.15) * 0.5);
        proj.vy += this.windDeflection * Math.sin(proj.age * 0.2) * 0.15;
      }

      if (proj.type === "arrow" && proj.age % 3 === 0) this.combatEffects.spawnArrowTrail(proj.x, proj.y, proj.vx, proj.vy);
      if ((proj.type === "fireball_npc" || proj.type === "mageSpell") && proj.age % 2 === 0) this.combatEffects.spawnFire(proj.x, proj.y);

      let hit = false;

      // Check hit against a fixed target position (towers/traps)
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
          if (!entry.friendly) continue; // tower arrows only hit friendlies
        } else {
          const sourceEntry = this.bodies[proj.sourceId];
          if (sourceEntry && sourceEntry.friendly === entry.friendly) continue;
        }
        const ex = entry.parts.torso.position.x, ey = entry.parts.torso.position.y;
        const ddx = proj.x - ex, ddy = proj.y - ey;
        const hitR = proj.type === "mageSpell" ? 400 : 256; // mage spells: larger hit radius
        if (ddx * ddx + ddy * ddy < hitR) {
          hit = true;
          this.combatEffects.spawnBlood(ex, ey, Math.sign(proj.vx) || 1, 0.4);
          if (proj.element === "fire") this.combatEffects.spawnFire(ex, ey);
          else if (proj.element === "ice") this.combatEffects.spawnIceShards(ex, ey, Math.sign(proj.vx));
          else if (proj.element === "shadow") this.combatEffects.spawnPoisonCloud(ex, ey);
          else this.combatEffects.spawnMeleeSparks(ex, ey, Math.sign(proj.vx));
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
        if (entry.frozenTimer > 0) {
          for (const p of Object.values(entry.parts)) Body.setVelocity(p, { x: 0, y: 0 });
        }
      }
      if (entry.attackAnim > 0) entry.attackAnim--;
    }
    this._updateProjectiles();
    Engine.update(this.engine, 1000 / 60);
    this.render();
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

      this._drawSymbol(ctx, entry);

      if (entry.friendly && entry.npcData.weapon && entry.bodyType === "humanoid") {
        this._drawWeapon(ctx, entry);
      }
    }

    this._drawProjectiles(ctx);
    this.combatEffects.update(ctx, GY);
  }

  // ─── HELPER DRAW UTILS ───

  static BODY_SYMBOLS = {
    humanoid:  { char: "@", size: 42 },
    quadruped: { char: "W", size: 36 },
    floating:  { char: "~", size: 38 },
    scorpion:  { char: "}", size: 34 },
    spider:    { char: "X", size: 32 },
    frog:      { char: "&", size: 30 },
    serpent:   { char: "S", size: 36 },
    barricade: { char: "#", size: 44 },
    tower:     { char: "T", size: 48 },
  };

  _colors(entry) {
    const { npcData, friendly, hitFlash, fadeAlpha } = entry;
    let alpha = fadeAlpha;
    if (this.fogVisibility && !friendly && !entry.ragdoll) {
      const tx = entry.parts.torso.position.x;
      const playerX = this.W * 0.2;
      const distPct = Math.abs(tx - playerX) / this.W;
      const fogAlpha = distPct < this.fogVisibility ? 1.0
        : distPct < this.fogVisibility * 2 ? 1.0 - ((distPct - this.fogVisibility) / this.fogVisibility)
        : 0.05;
      alpha *= fogAlpha;
    }
    return {
      body: friendly ? "#40c060" : (npcData.bodyColor || "#8a6a50"),
      armor: friendly ? "#2a6a2a" : (npcData.armorColor || "#5a4a3a"),
      flash: hitFlash > 0 ? `rgba(255,40,40,${hitFlash / 8 * 0.6})` : null,
      alpha,
    };
  }

  _drawSymbol(ctx, entry) {
    const { parts, npcData, friendly, ragdoll } = entry;
    const c = this._colors(entry);
    const sym = PhysicsWorld.BODY_SYMBOLS[entry.bodyType] || PhysicsWorld.BODY_SYMBOLS.humanoid;
    const halfH = entry.bodyType === "quadruped" ? 22 : entry.bodyType === "floating" ? 30 : 35;

    ctx.save();
    ctx.globalAlpha = c.alpha;

    const tx = parts.torso.position.x;
    const ty = parts.torso.position.y;

    // Ground shadow
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath();
    ctx.ellipse(tx, ty + halfH + 2, 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ground aura
    if (!ragdoll) {
      const auraColor = friendly ? [60, 220, 80] : [200, 60, 60];
      const pulse = 0.6 + Math.sin(Date.now() * 0.003) * 0.2;
      ctx.save();
      ctx.globalAlpha *= pulse * 0.4;
      const auraGrad = ctx.createRadialGradient(tx, ty + halfH + 4, 4, tx, ty + halfH + 4, 20);
      auraGrad.addColorStop(0, `rgba(${auraColor.join(",")},0.15)`);
      auraGrad.addColorStop(1, "transparent");
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.ellipse(tx, ty + halfH + 4, 20, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Ragdoll tilt
    if (ragdoll) {
      ctx.translate(tx, ty);
      const rotAngle = (1 - c.alpha) * (Math.PI / 2);
      ctx.rotate(rotAngle);
      this._renderSymbolText(ctx, 0, 0, sym, c, entry);
    } else {
      this._renderSymbolText(ctx, tx, ty, sym, c, entry);
    }

    // Small emoji above
    if (parts.head) {
      const hx = parts.head.position.x, hy = parts.head.position.y;
      ctx.font = "14px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(npcData.emoji, hx, hy - 12);
      ctx.textAlign = "start";
    }

    // Glow ring
    if (!ragdoll) {
      const pulse = 0.7 + Math.sin(Date.now() * 0.004) * 0.3;
      const glowColor = friendly ? "rgba(60,220,80," : "rgba(200,60,60,";
      const glowAlpha = friendly ? 0.35 * pulse : 0.25 * pulse;
      const r = sym.size * 0.45;
      ctx.shadowColor = glowColor + (friendly ? `${0.5 * pulse})` : `${0.3 * pulse})`);
      ctx.shadowBlur = 10 * pulse;
      ctx.strokeStyle = glowColor + `${glowAlpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(tx, ty, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }

  _renderSymbolText(ctx, x, y, sym, c, entry) {
    ctx.font = `bold ${sym.size}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // Outline
    ctx.strokeStyle = c.flash || c.armor;
    ctx.lineWidth = 3;
    ctx.strokeText(sym.char, x, y);
    // Fill
    ctx.fillStyle = c.flash || (entry.friendly ? "#40c060" : c.body);
    ctx.fillText(sym.char, x, y);
    ctx.textAlign = "start";
  }

  // Old body-specific renderers removed — using unified _drawSymbol

  // ─── DRAW WEAPON ───

  _drawWeapon(ctx, entry) {
    const { parts, npcData, attackAnim } = entry;
    const dir = entry._dir || 1;
    const weapon = npcData.weapon;
    if (!weapon || !parts.rLowerArm) return;

    ctx.save();
    ctx.globalAlpha = entry.fadeAlpha;
    const rHand = parts.rLowerArm.position;
    const lHand = parts.lLowerArm.position;
    const animT = attackAnim / 10;

    switch (weapon) {
      case "sword": {
        const angle = dir > 0 ? 0.3 - animT * 1.5 : Math.PI - 0.3 + animT * 1.5;
        const len = 18;
        const endX = rHand.x + Math.cos(angle) * len;
        const endY = rHand.y + 5 + Math.sin(angle) * len;
        ctx.strokeStyle = "#c0c8d0";
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(rHand.x, rHand.y + 5);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.strokeStyle = "#8a7040";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(rHand.x - 3, rHand.y + 4);
        ctx.lineTo(rHand.x + 3, rHand.y + 6);
        ctx.stroke();
        if (animT > 0) {
          ctx.strokeStyle = `rgba(255,255,255,${animT * 0.6})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(rHand.x, rHand.y + 5);
          ctx.lineTo(endX, endY);
          ctx.stroke();
        }
        break;
      }
      case "dagger": {
        for (const hand of [rHand, lHand]) {
          const offsetX = animT > 0 ? dir * animT * 8 : 0;
          ctx.strokeStyle = "#a0a8b0";
          ctx.lineWidth = 1.5;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(hand.x, hand.y + 5);
          ctx.lineTo(hand.x + dir * 10 + offsetX, hand.y + 3);
          ctx.stroke();
        }
        break;
      }
      case "staff": {
        const shoulder = parts.lUpperArm.position;
        const staffTopX = shoulder.x - dir * 3;
        const staffTopY = shoulder.y - 18;
        ctx.strokeStyle = "#6a4a2a";
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(shoulder.x - dir * 1, this.GY - 2);
        ctx.lineTo(staffTopX, staffTopY);
        ctx.stroke();
        const orbGlow = animT > 0 ? 0.8 : 0.3;
        ctx.fillStyle = `rgba(120,60,200,${orbGlow})`;
        ctx.beginPath();
        ctx.arc(staffTopX, staffTopY - 4, 4, 0, Math.PI * 2);
        ctx.fill();
        const cg = ctx.createRadialGradient(staffTopX, staffTopY - 4, 0, staffTopX, staffTopY - 4, 10);
        cg.addColorStop(0, `rgba(140,80,220,${orbGlow * 0.5})`);
        cg.addColorStop(1, "transparent");
        ctx.fillStyle = cg;
        ctx.fillRect(staffTopX - 10, staffTopY - 14, 20, 20);
        break;
      }
      case "bow": {
        const bowX = lHand.x - dir * 2, bowY = lHand.y;
        ctx.strokeStyle = "#7a5a30";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bowX, bowY - 12);
        ctx.quadraticCurveTo(bowX - dir * 10, bowY, bowX, bowY + 12);
        ctx.stroke();
        const stringPull = animT > 0 ? animT * 6 : 0;
        ctx.strokeStyle = "#b0a080";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(bowX, bowY - 12);
        ctx.quadraticCurveTo(bowX + dir * stringPull, bowY, bowX, bowY + 12);
        ctx.stroke();
        if (animT <= 0) {
          ctx.strokeStyle = "#8a6a40";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(bowX, bowY);
          ctx.lineTo(bowX + dir * 12, bowY);
          ctx.stroke();
          ctx.fillStyle = "#a0a8b0";
          ctx.beginPath();
          ctx.moveTo(bowX + dir * 12, bowY);
          ctx.lineTo(bowX + dir * 10, bowY - 2);
          ctx.lineTo(bowX + dir * 10, bowY + 2);
          ctx.closePath();
          ctx.fill();
        }
        break;
      }
    }
    ctx.restore();
  }

  // ─── DRAW PROJECTILES ───

  _drawProjectiles(ctx) {
    for (const proj of this.projectiles) {
      ctx.save();
      const angle = Math.atan2(proj.vy, proj.vx);
      switch (proj.type) {
        case "arrow": {
          ctx.translate(proj.x, proj.y);
          ctx.rotate(angle);
          ctx.strokeStyle = "#8a6a40";
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(6, 0); ctx.stroke();
          ctx.fillStyle = "#a0a8b0";
          ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(4, -3); ctx.lineTo(4, 3); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = "#c0a060"; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-12, -3); ctx.moveTo(-10, 0); ctx.lineTo(-12, 3); ctx.stroke();
          break;
        }
        case "fireball_npc": {
          const r = 5 + Math.sin(proj.age * 0.5) * 1.5;
          const glow = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, r * 2);
          glow.addColorStop(0, "rgba(255,140,40,0.7)"); glow.addColorStop(1, "transparent");
          ctx.fillStyle = glow; ctx.fillRect(proj.x - r * 2, proj.y - r * 2, r * 4, r * 4);
          ctx.fillStyle = "rgba(255,180,60,0.9)"; ctx.beginPath(); ctx.arc(proj.x, proj.y, r, 0, Math.PI * 2); ctx.fill();
          break;
        }
        case "iceShard_npc": {
          ctx.translate(proj.x, proj.y); ctx.rotate(angle + proj.age * 0.2);
          ctx.fillStyle = "rgba(140,220,255,0.8)"; ctx.fillRect(-2, -6, 4, 12);
          break;
        }
        case "poisonSpit": {
          const pg = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, 8);
          pg.addColorStop(0, "rgba(60,180,40,0.7)"); pg.addColorStop(1, "transparent");
          ctx.fillStyle = pg; ctx.fillRect(proj.x - 8, proj.y - 8, 16, 16);
          ctx.fillStyle = "rgba(80,200,60,0.8)"; ctx.beginPath(); ctx.arc(proj.x, proj.y, 4, 0, Math.PI * 2); ctx.fill();
          break;
        }
        case "shadowBolt_npc": {
          const sg = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, 12);
          sg.addColorStop(0, "rgba(100,30,180,0.6)"); sg.addColorStop(1, "transparent");
          ctx.fillStyle = sg; ctx.fillRect(proj.x - 12, proj.y - 12, 24, 24);
          ctx.fillStyle = "rgba(130,50,200,0.8)"; ctx.beginPath(); ctx.arc(proj.x, proj.y, 4, 0, Math.PI * 2); ctx.fill();
          break;
        }
        case "mageSpell": {
          const r = 5 + Math.sin(proj.age * 0.4) * 1.5;
          const mg = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, r * 2.5);
          mg.addColorStop(0, "rgba(140,80,220,0.7)"); mg.addColorStop(1, "transparent");
          ctx.fillStyle = mg; ctx.fillRect(proj.x - r * 2.5, proj.y - r * 2.5, r * 5, r * 5);
          ctx.fillStyle = "rgba(160,100,240,0.9)"; ctx.beginPath(); ctx.arc(proj.x, proj.y, r, 0, Math.PI * 2); ctx.fill();
          break;
        }
      }
      ctx.restore();
    }
  }

  // ─── UTIL ───

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}
