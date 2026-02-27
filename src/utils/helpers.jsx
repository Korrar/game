import { TREASURES, RARITY_W } from "../data/treasures";

export function seedRng(s) {
  s = s * 9301 + 49297;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

export function formatValHTML(v) {
  const p = [];
  if (v.gold) p.push(<span key="g" style={{ color: "#d4a030" }}>{v.gold} złota</span>);
  if (v.silver) p.push(<span key="s" style={{ color: "#a8a8b0" }}>{p.length > 0 ? ", " : ""}{v.silver} srebra</span>);
  if (v.copper) p.push(<span key="c" style={{ color: "#b87333" }}>{p.length > 0 ? ", " : ""}{v.copper} miedzi</span>);
  return p.length ? p : <span style={{ color: "#b87333" }}>0 miedzi</span>;
}

export function totalCopper(money) {
  return (money.copper || 0) + (money.silver || 0) * 100 + (money.gold || 0) * 10000;
}

export function copperToMoney(tc) {
  const gold = Math.floor(tc / 10000); tc %= 10000;
  const silver = Math.floor(tc / 100); tc %= 100;
  return { copper: tc, silver, gold };
}

export function pickTreasure(roomNum = 0) {
  const r = Math.min(roomNum, 40);
  const weights = {
    common:    Math.max(20, 45 - r * 0.6),
    uncommon:  28,
    rare:      Math.min(25, 18 + r * 0.18),
    epic:      Math.min(8, 4 + r * 0.1),
    legendary: Math.min(3, 1.5 + r * 0.04),
  };
  const tot = Object.values(weights).reduce((a, b) => a + b, 0);
  let roll = Math.random() * tot, sel = "common";
  for (const [rar, w] of Object.entries(weights)) { roll -= w; if (roll <= 0) { sel = rar; break; } }
  const pool = TREASURES.filter(t => t.rarity === sel);
  return { ...pool[Math.floor(Math.random() * pool.length)], id: Date.now() + Math.random() };
}
