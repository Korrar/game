import Matter from "matter-js";

const { Bodies, Body, Constraint } = Matter;

// ─── SHARED CONSTANTS ───
const ALIVE_STIFFNESS = 0.7;
const RAGDOLL_STIFFNESS = 0.04;
const COLLISION_GROUP = -1;

function partOpts(label) {
  return {
    label,
    collisionFilter: { group: COLLISION_GROUP },
    frictionAir: 0.08,
    restitution: 0.2,
    friction: 0.6,
    render: { visible: false },
  };
}

// ─── GENERIC RAGDOLL + FORCES (works with ANY body type) ───

export function genericSetRagdoll(entry) {
  const { parts, constraints } = entry;
  for (const p of Object.values(parts)) {
    Body.setStatic(p, false);
    p.frictionAir = 0.03;
    p.collisionFilter.group = 0;
    p.collisionFilter.category = 0x0002;
    p.collisionFilter.mask = 0x0001;
  }
  for (const c of constraints) c.stiffness = RAGDOLL_STIFFNESS;
}

export function genericDeathImpulse(entry, element, dirX) {
  const { parts } = entry;
  const dir = dirX || 1;
  const allParts = Object.values(parts);

  const k = 0.55; // global death impulse scale
  switch (element) {
    case "fire":
      Body.applyForce(parts.torso, parts.torso.position, { x: dir * 0.08 * k, y: -0.12 * k });
      Body.applyForce(parts.head, parts.head.position, { x: dir * 0.06 * k, y: -0.15 * k });
      for (const p of allParts) {
        if (p === parts.torso || p === parts.head) continue;
        const dx = p.position.x - parts.torso.position.x;
        Body.applyForce(p, p.position, { x: (Math.sign(dx) * 0.04 + dir * 0.02) * k, y: -0.06 * k });
      }
      break;
    case "ice":
      Body.applyForce(parts.torso, parts.torso.position, { x: dir * 0.04 * k, y: -0.03 * k });
      break;
    case "lightning":
      for (const p of allParts) {
        Body.applyForce(p, p.position, {
          x: (Math.random() - 0.5) * 0.06 * k,
          y: (Math.random() - 0.5) * 0.06 * k - 0.04 * k,
        });
      }
      break;
    case "shadow":
      for (const p of allParts) {
        Body.applyForce(p, p.position, { x: (Math.random() - 0.5) * 0.02 * k, y: -0.06 * k });
        p.frictionAir = 0.12;
      }
      break;
    case "holy": {
      const cx = parts.torso.position.x;
      for (const p of allParts) {
        const dx = p.position.x - cx;
        Body.applyForce(p, p.position, { x: Math.sign(dx || 1) * 0.05 * k, y: -0.07 * k });
      }
      break;
    }
    default:
      Body.applyForce(parts.torso, parts.torso.position, { x: dir * 0.06 * k, y: -0.05 * k });
      Body.applyForce(parts.head, parts.head.position, { x: dir * 0.04 * k, y: -0.08 * k });
      break;
  }
}

export function genericKnockback(entry, element, dirX) {
  const { parts } = entry;
  const dir = dirX || 1;
  // Apply light forces to all non-static limb parts
  const limbs = Object.values(parts).filter(p => p !== parts.torso && p !== parts.head);
  if (limbs.length === 0) return;

  const force = 0.015;
  switch (element) {
    case "fire":
      for (const p of limbs) Body.applyForce(p, p.position, { x: dir * force, y: -force });
      break;
    case "ice":
      for (const p of limbs) Body.applyForce(p, p.position, { x: dir * force * 0.8, y: 0 });
      break;
    case "lightning":
      for (const p of limbs) {
        Body.applyForce(p, p.position, {
          x: (Math.random() - 0.5) * 0.025,
          y: (Math.random() - 0.5) * 0.025,
        });
      }
      break;
    default:
      for (const p of limbs) Body.applyForce(p, p.position, { x: dir * force, y: -force * 0.6 });
      break;
  }
}

// ───────────────────────────────────────────
// HUMANOID: standard bipedal stick figure
// ───────────────────────────────────────────
const HEAD_R = 10;
const TORSO_W = 10, TORSO_H = 22;
const UPPER_ARM_H = 14, LOWER_ARM_H = 12;
const UPPER_LEG_H = 14, LOWER_LEG_H = 13;
const FIGURE_HALF_H = 35;

export function createHumanoidBody(x, groundY) {
  const cy = groundY - FIGURE_HALF_H;
  const head = Bodies.circle(x, cy - TORSO_H / 2 - HEAD_R, HEAD_R, { ...partOpts("head"), frictionAir: 0.1 });
  const torso = Bodies.rectangle(x, cy, TORSO_W, TORSO_H, partOpts("torso"));
  const lUpperArm = Bodies.rectangle(x - 10, cy - 6, 4, UPPER_ARM_H, partOpts("lUpperArm"));
  const rUpperArm = Bodies.rectangle(x + 10, cy - 6, 4, UPPER_ARM_H, partOpts("rUpperArm"));
  const lLowerArm = Bodies.rectangle(x - 10, cy + 6, 3, LOWER_ARM_H, partOpts("lLowerArm"));
  const rLowerArm = Bodies.rectangle(x + 10, cy + 6, 3, LOWER_ARM_H, partOpts("rLowerArm"));
  const lUpperLeg = Bodies.rectangle(x - 5, cy + TORSO_H / 2 + 6, 5, UPPER_LEG_H, partOpts("lUpperLeg"));
  const rUpperLeg = Bodies.rectangle(x + 5, cy + TORSO_H / 2 + 6, 5, UPPER_LEG_H, partOpts("rUpperLeg"));
  const lLowerLeg = Bodies.rectangle(x - 5, cy + TORSO_H / 2 + 20, 4, LOWER_LEG_H, partOpts("lLowerLeg"));
  const rLowerLeg = Bodies.rectangle(x + 5, cy + TORSO_H / 2 + 20, 4, LOWER_LEG_H, partOpts("rLowerLeg"));

  const parts = { head, torso, lUpperArm, rUpperArm, lLowerArm, rLowerArm, lUpperLeg, rUpperLeg, lLowerLeg, rLowerLeg };
  Body.setStatic(torso, true);
  Body.setStatic(head, true);

  const s = ALIVE_STIFFNESS;
  const constraints = [
    Constraint.create({ bodyA: head, bodyB: torso, pointA: { x: 0, y: HEAD_R }, pointB: { x: 0, y: -TORSO_H / 2 }, stiffness: s, length: 2, render: { visible: false } }),
    Constraint.create({ bodyA: torso, bodyB: lUpperArm, pointA: { x: -TORSO_W / 2, y: -TORSO_H / 2 + 4 }, pointB: { x: 0, y: -UPPER_ARM_H / 2 }, stiffness: s, length: 2, render: { visible: false } }),
    Constraint.create({ bodyA: torso, bodyB: rUpperArm, pointA: { x: TORSO_W / 2, y: -TORSO_H / 2 + 4 }, pointB: { x: 0, y: -UPPER_ARM_H / 2 }, stiffness: s, length: 2, render: { visible: false } }),
    Constraint.create({ bodyA: lUpperArm, bodyB: lLowerArm, pointA: { x: 0, y: UPPER_ARM_H / 2 }, pointB: { x: 0, y: -LOWER_ARM_H / 2 }, stiffness: s, length: 1, render: { visible: false } }),
    Constraint.create({ bodyA: rUpperArm, bodyB: rLowerArm, pointA: { x: 0, y: UPPER_ARM_H / 2 }, pointB: { x: 0, y: -LOWER_ARM_H / 2 }, stiffness: s, length: 1, render: { visible: false } }),
    Constraint.create({ bodyA: torso, bodyB: lUpperLeg, pointA: { x: -3, y: TORSO_H / 2 }, pointB: { x: 0, y: -UPPER_LEG_H / 2 }, stiffness: s, length: 1, render: { visible: false } }),
    Constraint.create({ bodyA: torso, bodyB: rUpperLeg, pointA: { x: 3, y: TORSO_H / 2 }, pointB: { x: 0, y: -UPPER_LEG_H / 2 }, stiffness: s, length: 1, render: { visible: false } }),
    Constraint.create({ bodyA: lUpperLeg, bodyB: lLowerLeg, pointA: { x: 0, y: UPPER_LEG_H / 2 }, pointB: { x: 0, y: -LOWER_LEG_H / 2 }, stiffness: s, length: 1, render: { visible: false } }),
    Constraint.create({ bodyA: rUpperLeg, bodyB: rLowerLeg, pointA: { x: 0, y: UPPER_LEG_H / 2 }, pointB: { x: 0, y: -LOWER_LEG_H / 2 }, stiffness: s, length: 1, render: { visible: false } }),
  ];
  return { parts, constraints };
}
// Keep old name as alias
export const createNpcBody = createHumanoidBody;

export function getWalkingOffsets(phase) {
  const s = Math.sin(phase);
  const c = Math.cos(phase);
  return { lLegX: s * 6, rLegX: -s * 6, lArmX: -s * 4, rArmX: s * 4, lLegY: Math.abs(c) * 3, rLegY: Math.abs(s) * 3 };
}

// ───────────────────────────────────────────
// QUADRUPED: 4-legged animal (wolf, rat, monkey, crocodile)
// ───────────────────────────────────────────
const QUAD_TORSO_W = 24, QUAD_TORSO_H = 10;
const QUAD_HEAD_R = 8;
const QUAD_LEG_H = 14;
const QUAD_HALF_H = 22;

export function createQuadrupedBody(x, groundY) {
  const cy = groundY - QUAD_HALF_H;
  const torso = Bodies.rectangle(x, cy, QUAD_TORSO_W, QUAD_TORSO_H, partOpts("torso"));
  const head = Bodies.circle(x + 14, cy - 6, QUAD_HEAD_R, { ...partOpts("head"), frictionAir: 0.1 });
  const fl = Bodies.rectangle(x + 8, cy + QUAD_TORSO_H / 2 + 6, 4, QUAD_LEG_H, partOpts("fl"));
  const fr = Bodies.rectangle(x + 8, cy + QUAD_TORSO_H / 2 + 6, 4, QUAD_LEG_H, partOpts("fr"));
  const bl = Bodies.rectangle(x - 8, cy + QUAD_TORSO_H / 2 + 6, 4, QUAD_LEG_H, partOpts("bl"));
  const br = Bodies.rectangle(x - 8, cy + QUAD_TORSO_H / 2 + 6, 4, QUAD_LEG_H, partOpts("br"));
  const tail = Bodies.rectangle(x - 16, cy - 2, 3, 10, partOpts("tail"));
  const parts = { head, torso, fl, fr, bl, br, tail };
  Body.setStatic(torso, true);
  Body.setStatic(head, true);

  const s = ALIVE_STIFFNESS;
  const constraints = [
    Constraint.create({ bodyA: torso, bodyB: head, pointA: { x: QUAD_TORSO_W / 2, y: -QUAD_TORSO_H / 2 }, pointB: { x: 0, y: QUAD_HEAD_R }, stiffness: s, length: 4, render: { visible: false } }),
    Constraint.create({ bodyA: torso, bodyB: fl, pointA: { x: 8, y: QUAD_TORSO_H / 2 }, pointB: { x: 0, y: -QUAD_LEG_H / 2 }, stiffness: s, length: 1, render: { visible: false } }),
    Constraint.create({ bodyA: torso, bodyB: fr, pointA: { x: 8, y: QUAD_TORSO_H / 2 }, pointB: { x: 0, y: -QUAD_LEG_H / 2 }, stiffness: s, length: 1, render: { visible: false } }),
    Constraint.create({ bodyA: torso, bodyB: bl, pointA: { x: -8, y: QUAD_TORSO_H / 2 }, pointB: { x: 0, y: -QUAD_LEG_H / 2 }, stiffness: s, length: 1, render: { visible: false } }),
    Constraint.create({ bodyA: torso, bodyB: br, pointA: { x: -8, y: QUAD_TORSO_H / 2 }, pointB: { x: 0, y: -QUAD_LEG_H / 2 }, stiffness: s, length: 1, render: { visible: false } }),
    Constraint.create({ bodyA: torso, bodyB: tail, pointA: { x: -QUAD_TORSO_W / 2, y: -2 }, pointB: { x: 0, y: -5 }, stiffness: s * 0.5, length: 4, render: { visible: false } }),
  ];
  return { parts, constraints };
}

export function getQuadrupedOffsets(phase) {
  const s = Math.sin(phase), c = Math.cos(phase);
  return { flX: s * 5, frX: -s * 5, blX: -s * 5, brX: s * 5, flY: Math.abs(c) * 3, frY: Math.abs(s) * 3, blY: Math.abs(s) * 3, brY: Math.abs(c) * 3, tailPhase: phase };
}

// ───────────────────────────────────────────
// FLOATING: djinn, fairy, void guardian, siren
// Triangular torso, no legs, hovers above ground, 2 arms
// ───────────────────────────────────────────
const FLOAT_HEAD_R = 10;
const FLOAT_HALF_H = 30;

export function createFloatingBody(x, groundY) {
  const cy = groundY - FLOAT_HALF_H - 10; // hover 10px above normal
  const head = Bodies.circle(x, cy - 16, FLOAT_HEAD_R, { ...partOpts("head"), frictionAir: 0.1 });
  const torso = Bodies.rectangle(x, cy, 12, 26, partOpts("torso")); // tall triangle drawn in render
  const lArm = Bodies.rectangle(x - 12, cy - 4, 3, 16, partOpts("lArm"));
  const rArm = Bodies.rectangle(x + 12, cy - 4, 3, 16, partOpts("rArm"));
  // Wispy tail/bottom
  const trail = Bodies.rectangle(x, cy + 18, 4, 10, partOpts("trail"));

  const parts = { head, torso, lArm, rArm, trail };
  Body.setStatic(torso, true);
  Body.setStatic(head, true);

  const s = ALIVE_STIFFNESS;
  const constraints = [
    Constraint.create({ bodyA: head, bodyB: torso, pointA: { x: 0, y: FLOAT_HEAD_R }, pointB: { x: 0, y: -13 }, stiffness: s, length: 2, render: { visible: false } }),
    Constraint.create({ bodyA: torso, bodyB: lArm, pointA: { x: -6, y: -8 }, pointB: { x: 0, y: -8 }, stiffness: s, length: 2, render: { visible: false } }),
    Constraint.create({ bodyA: torso, bodyB: rArm, pointA: { x: 6, y: -8 }, pointB: { x: 0, y: -8 }, stiffness: s, length: 2, render: { visible: false } }),
    Constraint.create({ bodyA: torso, bodyB: trail, pointA: { x: 0, y: 13 }, pointB: { x: 0, y: -5 }, stiffness: s * 0.3, length: 3, render: { visible: false } }),
  ];
  return { parts, constraints };
}

export function getFloatingOffsets(phase) {
  return { bobY: Math.sin(phase * 0.7) * 5, armSway: Math.sin(phase) * 6, trailSway: Math.sin(phase * 1.3) * 4 };
}

// ───────────────────────────────────────────
// SCORPION: wide body, 6 legs, 2 pincers, curving overhead tail+stinger
// ───────────────────────────────────────────
const SCORP_HALF_H = 18;

export function createScorpionBody(x, groundY) {
  const cy = groundY - SCORP_HALF_H;
  const torso = Bodies.rectangle(x, cy, 28, 12, partOpts("torso")); // wide flat body
  const head = Bodies.circle(x + 16, cy - 2, 6, { ...partOpts("head"), frictionAir: 0.1 });
  // 6 legs (3 per side)
  const l1 = Bodies.rectangle(x + 6, cy + 10, 3, 10, partOpts("l1"));
  const l2 = Bodies.rectangle(x, cy + 10, 3, 10, partOpts("l2"));
  const l3 = Bodies.rectangle(x - 6, cy + 10, 3, 10, partOpts("l3"));
  const r1 = Bodies.rectangle(x + 6, cy + 10, 3, 10, partOpts("r1"));
  const r2 = Bodies.rectangle(x, cy + 10, 3, 10, partOpts("r2"));
  const r3 = Bodies.rectangle(x - 6, cy + 10, 3, 10, partOpts("r3"));
  // Pincers
  const lPincer = Bodies.rectangle(x + 18, cy - 6, 4, 10, partOpts("lPincer"));
  const rPincer = Bodies.rectangle(x + 18, cy + 4, 4, 10, partOpts("rPincer"));
  // Tail segments (curves over head)
  const tail1 = Bodies.rectangle(x - 14, cy - 4, 4, 8, partOpts("tail1"));
  const tail2 = Bodies.rectangle(x - 18, cy - 14, 4, 8, partOpts("tail2"));
  const stinger = Bodies.circle(x - 16, cy - 22, 3, partOpts("stinger"));

  const parts = { head, torso, l1, l2, l3, r1, r2, r3, lPincer, rPincer, tail1, tail2, stinger };
  Body.setStatic(torso, true);
  Body.setStatic(head, true);

  const s = ALIVE_STIFFNESS;
  const constraints = [
    Constraint.create({ bodyA: torso, bodyB: head, pointA: { x: 14, y: -2 }, pointB: { x: 0, y: 6 }, stiffness: s, length: 2, render: { visible: false } }),
    // Legs
    ...["l1", "l2", "l3"].map((k, i) => Constraint.create({ bodyA: torso, bodyB: parts[k], pointA: { x: 6 - i * 6, y: 6 }, pointB: { x: 0, y: -5 }, stiffness: s, length: 1, render: { visible: false } })),
    ...["r1", "r2", "r3"].map((k, i) => Constraint.create({ bodyA: torso, bodyB: parts[k], pointA: { x: 6 - i * 6, y: 6 }, pointB: { x: 0, y: -5 }, stiffness: s, length: 1, render: { visible: false } })),
    // Pincers
    Constraint.create({ bodyA: head, bodyB: lPincer, pointA: { x: 4, y: -4 }, pointB: { x: 0, y: 5 }, stiffness: s, length: 3, render: { visible: false } }),
    Constraint.create({ bodyA: head, bodyB: rPincer, pointA: { x: 4, y: 4 }, pointB: { x: 0, y: 5 }, stiffness: s, length: 3, render: { visible: false } }),
    // Tail chain
    Constraint.create({ bodyA: torso, bodyB: tail1, pointA: { x: -14, y: -4 }, pointB: { x: 0, y: 4 }, stiffness: s * 0.6, length: 2, render: { visible: false } }),
    Constraint.create({ bodyA: tail1, bodyB: tail2, pointA: { x: 0, y: -4 }, pointB: { x: 0, y: 4 }, stiffness: s * 0.5, length: 2, render: { visible: false } }),
    Constraint.create({ bodyA: tail2, bodyB: stinger, pointA: { x: 0, y: -4 }, pointB: { x: 0, y: 3 }, stiffness: s * 0.4, length: 2, render: { visible: false } }),
  ];
  return { parts, constraints };
}

export function getScorpionOffsets(phase) {
  const s = Math.sin(phase);
  return {
    legPhase: phase,
    l1X: s * 3, l2X: -s * 3, l3X: s * 3,
    r1X: -s * 3, r2X: s * 3, r3X: -s * 3,
    pincerOpen: Math.abs(Math.sin(phase * 0.5)) * 4,
    tailSway: Math.sin(phase * 0.8) * 3,
  };
}

// ───────────────────────────────────────────
// SPIDER: wide flat body, 8 legs spread out
// ───────────────────────────────────────────
const SPIDER_HALF_H = 16;

export function createSpiderBody(x, groundY) {
  const cy = groundY - SPIDER_HALF_H;
  const torso = Bodies.rectangle(x, cy, 16, 10, partOpts("torso"));
  const head = Bodies.circle(x + 10, cy - 3, 6, { ...partOpts("head"), frictionAir: 0.1 });
  // Abdomen (big round back)
  const abdomen = Bodies.circle(x - 10, cy + 2, 8, partOpts("abdomen"));
  // 8 legs (4 per side)
  const legs = {};
  for (let i = 0; i < 4; i++) {
    const ox = 6 - i * 4;
    legs[`ll${i}`] = Bodies.rectangle(x + ox - 8, cy + 8, 2, 12, partOpts(`ll${i}`));
    legs[`rl${i}`] = Bodies.rectangle(x + ox + 8, cy + 8, 2, 12, partOpts(`rl${i}`));
  }

  const parts = { head, torso, abdomen, ...legs };
  Body.setStatic(torso, true);
  Body.setStatic(head, true);

  const s = ALIVE_STIFFNESS;
  const constraints = [
    Constraint.create({ bodyA: torso, bodyB: head, pointA: { x: 8, y: -3 }, pointB: { x: 0, y: 6 }, stiffness: s, length: 2, render: { visible: false } }),
    Constraint.create({ bodyA: torso, bodyB: abdomen, pointA: { x: -8, y: 2 }, pointB: { x: 8, y: 0 }, stiffness: s * 0.6, length: 2, render: { visible: false } }),
  ];
  for (let i = 0; i < 4; i++) {
    const ox = 6 - i * 4;
    constraints.push(
      Constraint.create({ bodyA: torso, bodyB: legs[`ll${i}`], pointA: { x: ox, y: 5 }, pointB: { x: 8, y: -6 }, stiffness: s, length: 2, render: { visible: false } }),
      Constraint.create({ bodyA: torso, bodyB: legs[`rl${i}`], pointA: { x: ox, y: 5 }, pointB: { x: -8, y: -6 }, stiffness: s, length: 2, render: { visible: false } }),
    );
  }
  return { parts, constraints };
}

export function getSpiderOffsets(phase) {
  const offsets = {};
  for (let i = 0; i < 4; i++) {
    const p = phase + i * Math.PI / 4;
    offsets[`ll${i}X`] = Math.sin(p) * 4;
    offsets[`rl${i}X`] = -Math.sin(p) * 4;
    offsets[`ll${i}Y`] = Math.abs(Math.cos(p)) * 2;
    offsets[`rl${i}Y`] = Math.abs(Math.cos(p + Math.PI / 2)) * 2;
  }
  return offsets;
}

// ───────────────────────────────────────────
// FROG: squatty body, big eyes/head, powerful hind legs, JUMPS
// ───────────────────────────────────────────
const FROG_HALF_H = 16;

export function createFrogBody(x, groundY) {
  const cy = groundY - FROG_HALF_H;
  const torso = Bodies.rectangle(x, cy, 14, 10, partOpts("torso"));
  const head = Bodies.circle(x + 8, cy - 6, 8, { ...partOpts("head"), frictionAir: 0.1 });
  // Big hind legs (folded)
  const lHind = Bodies.rectangle(x - 6, cy + 8, 5, 12, partOpts("lHind"));
  const rHind = Bodies.rectangle(x + 6, cy + 8, 5, 12, partOpts("rHind"));
  // Small front legs
  const lFront = Bodies.rectangle(x - 4, cy + 6, 3, 8, partOpts("lFront"));
  const rFront = Bodies.rectangle(x + 4, cy + 6, 3, 8, partOpts("rFront"));

  const parts = { head, torso, lHind, rHind, lFront, rFront };
  Body.setStatic(torso, true);
  Body.setStatic(head, true);

  const s = ALIVE_STIFFNESS;
  const constraints = [
    Constraint.create({ bodyA: torso, bodyB: head, pointA: { x: 7, y: -5 }, pointB: { x: 0, y: 8 }, stiffness: s, length: 2, render: { visible: false } }),
    Constraint.create({ bodyA: torso, bodyB: lHind, pointA: { x: -5, y: 5 }, pointB: { x: 0, y: -6 }, stiffness: s, length: 1, render: { visible: false } }),
    Constraint.create({ bodyA: torso, bodyB: rHind, pointA: { x: 5, y: 5 }, pointB: { x: 0, y: -6 }, stiffness: s, length: 1, render: { visible: false } }),
    Constraint.create({ bodyA: torso, bodyB: lFront, pointA: { x: -3, y: 4 }, pointB: { x: 0, y: -4 }, stiffness: s, length: 1, render: { visible: false } }),
    Constraint.create({ bodyA: torso, bodyB: rFront, pointA: { x: 3, y: 4 }, pointB: { x: 0, y: -4 }, stiffness: s, length: 1, render: { visible: false } }),
  ];
  return { parts, constraints };
}

// Frog uses jump animation: crouch → leap → land
export function getFrogOffsets(phase) {
  // Jump cycle: 0-PI crouch+push, PI-2PI airborne+land
  const t = (phase % (Math.PI * 2)) / (Math.PI * 2); // 0..1
  const jumpHeight = t < 0.3 ? 0 : t < 0.6 ? Math.sin((t - 0.3) / 0.3 * Math.PI) * 18 : 0;
  const crouch = t < 0.3 ? Math.sin(t / 0.3 * Math.PI) * 4 : 0;
  const hindSpread = t < 0.3 ? 6 : t < 0.6 ? -4 : 0; // crouch = spread, leap = tuck
  return { jumpY: jumpHeight, crouch, hindSpread, phase: t };
}

// ───────────────────────────────────────────
// SERPENT: elongated multi-segment body (dragon, kraken, snake)
// ───────────────────────────────────────────
const SERPENT_HALF_H = 20;

export function createSerpentBody(x, groundY) {
  const cy = groundY - SERPENT_HALF_H;
  const head = Bodies.circle(x + 18, cy - 4, 9, { ...partOpts("head"), frictionAir: 0.1 });
  const seg1 = Bodies.rectangle(x + 6, cy, 14, 10, partOpts("torso")); // use "torso" label for seg1
  const seg2 = Bodies.rectangle(x - 6, cy + 2, 12, 9, partOpts("seg2"));
  const seg3 = Bodies.rectangle(x - 16, cy + 3, 10, 8, partOpts("seg3"));
  const tailTip = Bodies.rectangle(x - 26, cy + 4, 6, 6, partOpts("tailTip"));
  // Small legs/fins (optional visual, 2 front)
  const lFin = Bodies.rectangle(x + 4, cy + 8, 3, 8, partOpts("lFin"));
  const rFin = Bodies.rectangle(x + 8, cy + 8, 3, 8, partOpts("rFin"));

  // Map seg1 as torso for consistent access
  const parts = { head, torso: seg1, seg2, seg3, tailTip, lFin, rFin };
  Body.setStatic(seg1, true);
  Body.setStatic(head, true);

  const s = ALIVE_STIFFNESS;
  const constraints = [
    Constraint.create({ bodyA: seg1, bodyB: head, pointA: { x: 7, y: -3 }, pointB: { x: 0, y: 9 }, stiffness: s, length: 3, render: { visible: false } }),
    Constraint.create({ bodyA: seg1, bodyB: seg2, pointA: { x: -7, y: 1 }, pointB: { x: 6, y: 0 }, stiffness: s * 0.6, length: 2, render: { visible: false } }),
    Constraint.create({ bodyA: seg2, bodyB: seg3, pointA: { x: -6, y: 1 }, pointB: { x: 5, y: 0 }, stiffness: s * 0.5, length: 2, render: { visible: false } }),
    Constraint.create({ bodyA: seg3, bodyB: tailTip, pointA: { x: -5, y: 1 }, pointB: { x: 3, y: 0 }, stiffness: s * 0.4, length: 2, render: { visible: false } }),
    Constraint.create({ bodyA: seg1, bodyB: lFin, pointA: { x: -2, y: 5 }, pointB: { x: 0, y: -4 }, stiffness: s, length: 1, render: { visible: false } }),
    Constraint.create({ bodyA: seg1, bodyB: rFin, pointA: { x: 2, y: 5 }, pointB: { x: 0, y: -4 }, stiffness: s, length: 1, render: { visible: false } }),
  ];
  return { parts, constraints };
}

export function getSerpentOffsets(phase) {
  return {
    seg2X: Math.sin(phase) * 3,
    seg2Y: Math.sin(phase * 0.5) * 2,
    seg3X: Math.sin(phase + 1) * 4,
    seg3Y: Math.sin(phase * 0.5 + 1) * 2,
    tailX: Math.sin(phase + 2) * 5,
    tailY: Math.sin(phase * 0.5 + 2) * 2,
    finPhase: phase,
  };
}

// ─── HALF-HEIGHT EXPORTS ───
// ───────────────────────────────────────────
// BARRICADE: static wooden wall
// ───────────────────────────────────────────
const BARRICADE_HALF_H = 28;

export function createBarricadeBody(x, groundY) {
  const cy = groundY - BARRICADE_HALF_H;
  const torso = Bodies.rectangle(x, cy, 30, 44, partOpts("torso"));
  const head = Bodies.rectangle(x, cy - 26, 8, 8, partOpts("head"));
  const plankL = Bodies.rectangle(x - 14, cy + 4, 5, 36, partOpts("plankL"));
  const plankR = Bodies.rectangle(x + 14, cy + 4, 5, 36, partOpts("plankR"));
  const crossbar = Bodies.rectangle(x, cy - 6, 34, 5, partOpts("crossbar"));

  const parts = { torso, head, plankL, plankR, crossbar };
  Body.setStatic(torso, true);
  Body.setStatic(head, true);

  const s = 0.9;
  const constraints = [
    Constraint.create({ bodyA: torso, bodyB: head, pointA: { x: 0, y: -22 }, pointB: { x: 0, y: 4 }, stiffness: s, length: 0, render: { visible: false } }),
    Constraint.create({ bodyA: torso, bodyB: plankL, pointA: { x: -14, y: 0 }, pointB: { x: 0, y: 0 }, stiffness: s, length: 0, render: { visible: false } }),
    Constraint.create({ bodyA: torso, bodyB: plankR, pointA: { x: 14, y: 0 }, pointB: { x: 0, y: 0 }, stiffness: s, length: 0, render: { visible: false } }),
    Constraint.create({ bodyA: torso, bodyB: crossbar, pointA: { x: 0, y: -6 }, pointB: { x: 0, y: 0 }, stiffness: s, length: 0, render: { visible: false } }),
  ];
  return { parts, constraints };
}

// ───────────────────────────────────────────
// TOWER: stone watchtower
// ───────────────────────────────────────────
const TOWER_HALF_H = 40;

export function createTowerBody(x, groundY) {
  const cy = groundY - TOWER_HALF_H;
  const torso = Bodies.rectangle(x, cy + 8, 22, 50, partOpts("torso"));
  const head = Bodies.rectangle(x, cy - 22, 12, 12, partOpts("head"));
  const roofL = Bodies.rectangle(x - 12, cy - 28, 6, 4, partOpts("roofL"));
  const roofR = Bodies.rectangle(x + 12, cy - 28, 6, 4, partOpts("roofR"));
  const baseL = Bodies.rectangle(x - 13, cy + 30, 6, 10, partOpts("baseL"));
  const baseR = Bodies.rectangle(x + 13, cy + 30, 6, 10, partOpts("baseR"));

  const parts = { torso, head, roofL, roofR, baseL, baseR };
  Body.setStatic(torso, true);
  Body.setStatic(head, true);

  const s = 0.9;
  const constraints = [
    Constraint.create({ bodyA: torso, bodyB: head, pointA: { x: 0, y: -25 }, pointB: { x: 0, y: 6 }, stiffness: s, length: 0, render: { visible: false } }),
    Constraint.create({ bodyA: head, bodyB: roofL, pointA: { x: -6, y: -6 }, pointB: { x: 3, y: 0 }, stiffness: s, length: 0, render: { visible: false } }),
    Constraint.create({ bodyA: head, bodyB: roofR, pointA: { x: 6, y: -6 }, pointB: { x: -3, y: 0 }, stiffness: s, length: 0, render: { visible: false } }),
    Constraint.create({ bodyA: torso, bodyB: baseL, pointA: { x: -11, y: 22 }, pointB: { x: 0, y: -5 }, stiffness: s, length: 0, render: { visible: false } }),
    Constraint.create({ bodyA: torso, bodyB: baseR, pointA: { x: 11, y: 22 }, pointB: { x: 0, y: -5 }, stiffness: s, length: 0, render: { visible: false } }),
  ];
  return { parts, constraints };
}

export const FIGURE_HALF_HEIGHT = FIGURE_HALF_H;
export const QUAD_HALF_HEIGHT = QUAD_HALF_H;
export const FLOAT_HALF_HEIGHT = FLOAT_HALF_H;
export const SCORP_HALF_HEIGHT = SCORP_HALF_H;
export const SPIDER_HALF_HEIGHT = SPIDER_HALF_H;
export const FROG_HALF_HEIGHT = FROG_HALF_H;
export const SERPENT_HALF_HEIGHT = SERPENT_HALF_H;
export const BARRICADE_HALF_HEIGHT = BARRICADE_HALF_H;
export const TOWER_HALF_HEIGHT = TOWER_HALF_H;
export const HEAD_RADIUS = HEAD_R;
export const QUAD_HEAD_RADIUS = QUAD_HEAD_R;
