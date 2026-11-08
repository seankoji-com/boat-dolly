import { BRICKS, TILES, CELLS, AUDIT } from "./data.js";

export const COLORS = {
  reddishBrown: { name: "Reddish Brown", hex: "#7a351c", bricklink: 88 },
  darkBrown: { name: "Dark Brown", hex: "#3b2415", bricklink: 120 },
  tan: { name: "Tan", hex: "#e4cd9e", bricklink: 2 },
  darkTan: { name: "Dark Tan", hex: "#9a8f78", bricklink: 69 },
  black: { name: "Black", hex: "#181818", bricklink: 11 },
};

const DESIGNS = {
  "1x1": { id: "3005", name: "Brick 1×1" },
  "1x2": { id: "3004", name: "Brick 1×2" },
  "1x3": { id: "3622", name: "Brick 1×3" },
  "1x4": { id: "3010", name: "Brick 1×4" },
  "1x6": { id: "3009", name: "Brick 1×6" },
  "1x8": { id: "3008", name: "Brick 1×8" },
  "2x2": { id: "3003", name: "Brick 2×2" },
  "2x3": { id: "3002", name: "Brick 2×3" },
  "2x4": { id: "3001", name: "Brick 2×4" },
  "2x6": { id: "2456", name: "Brick 2×6" },
  "2x8": { id: "3007", name: "Brick 2×8" },
  tile2x2: { id: "3068b", name: "Tile 2×2" },
};

const CELL = new Map();
for (const [x, y, z, part] of CELLS) CELL.set(`${x},${y},${z}`, part);
const has = (x, y, z) => CELL.has(`${x},${y},${z}`);

const BRICK_OBJ = BRICKS.map(([x, y, z, w, d, part], i) => ({
  id: i, x, y, z, w, d, part, tile: false,
}));
const TILE_OBJ = TILES.map(([x, y, z, w, d, part], i) => ({
  id: BRICK_OBJ.length + i, x, y, z, w, d, part, tile: true,
}));
export const ALL_BRICKS = [...BRICK_OBJ, ...TILE_OBJ];

export function designOf(brick) {
  if (brick.tile) return DESIGNS.tile2x2;
  const a = Math.min(brick.w, brick.d);
  const c = Math.max(brick.w, brick.d);
  return DESIGNS[`${a}x${c}`] || { id: "?", name: `${brick.w}×${brick.d}` };
}

function majorityPart(brick) {
  if (brick.part === "eye" || brick.part === "nose" || brick.part === "claw") return brick.part;
  const counts = {};
  for (let x = brick.x; x < brick.x + brick.w; x++) {
    for (let y = brick.y; y < brick.y + brick.d; y++) {
      const p = CELL.get(`${x},${y},${brick.z}`) || brick.part;
      counts[p] = (counts[p] || 0) + 1;
    }
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || brick.part;
}

export function colorKeyOf(brick) {
  const p = majorityPart(brick);
  if (p === "nose" || p === "eye" || p === "claw") return "black";
  if (p === "snout") return "tan";
  if (p === "foot" || p === "paw") return "darkTan";
  if (brick.tile || p === "earcap") return "darkBrown";
  if (p === "tail") return brick.z < 4 ? "darkBrown" : "reddishBrown";
  if (p === "ear") return brick.z >= 29 ? "darkBrown" : "reddishBrown";
  if (p === "body" || p === "neck") {
    let exposed = 0;
    let total = 0;
    for (let x = brick.x; x < brick.x + brick.w; x++) {
      for (let y = brick.y; y < brick.y + brick.d; y++) {
        total++;
        if (!has(x, y + 1, brick.z)) exposed++;
      }
    }
    const cx = brick.x + brick.w / 2;
    if (exposed / total > 0.5 && brick.z >= 8 && brick.z <= 24 && cx >= 4.5 && cx <= 9.5) {
      return "tan";
    }
  }
  return "reddishBrown";
}

for (const b of ALL_BRICKS) {
  b.colorKey = colorKeyOf(b);
  b.color = COLORS[b.colorKey];
  b.design = designOf(b);
}

export const CELL_COLORS = new Map();
for (const b of ALL_BRICKS) {
  for (let x = b.x; x < b.x + b.w; x++) {
    for (let y = b.y; y < b.y + b.d; y++) CELL_COLORS.set(`${x},${y},${b.z}`, b.colorKey);
  }
}

export const TOTAL_PIECES = ALL_BRICKS.length;

// ---- parts list -----------------------------------------------------------
const PART_MAP = new Map();
function addPart(brick, qty = 1) {
  const key = `${brick.design.id}|${brick.colorKey}`;
  let p = PART_MAP.get(key);
  if (!p) {
    p = { key, design: brick.design, colorKey: brick.colorKey, color: brick.color, qty: 0, w: brick.w, d: brick.d, tile: brick.tile };
    PART_MAP.set(key, p);
  }
  p.qty += qty;
  return p;
}
for (const b of ALL_BRICKS) addPart(b);

export const PARTS = [...PART_MAP.values()].sort((a, b) => {
  const ca = Object.keys(COLORS).indexOf(a.colorKey);
  const cb = Object.keys(COLORS).indexOf(b.colorKey);
  return ca - cb || a.design.name.localeCompare(b.design.name);
});

export const PARTS_BY_COLOR = Object.keys(COLORS).map((key) => ({
  key,
  color: COLORS[key],
  parts: PARTS.filter((p) => p.colorKey === key),
  count: PARTS.filter((p) => p.colorKey === key).reduce((n, p) => n + p.qty, 0),
})).filter((g) => g.parts.length);

// ---- steps ----------------------------------------------------------------
const STAGES = [
  [0, 2, "Feet & tail tip"],
  [3, 7, "Legs & tail"],
  [8, 12, "Haunches & tail base"],
  [13, 19, "Body & arms"],
  [20, 25, "Chest & neck"],
  [26, 29, "Head"],
  [30, 30, "Ears"],
  [31, 31, "Ear caps"],
];
export function stageFor(z) {
  return STAGES.find(([a, b]) => z >= a && z <= b)?.[2] || "Build";
}

const CAPTIONS = {
  0: "Start with the two long hind feet and the tip of the tail. The tail touches the ground here; it becomes the model's third foot.",
  1: "Cap each foot. Keep the front edges flush: these are the toes.",
  2: "These foot-top bricks tie each toe to its leg. Press them down firmly; they stop the toes from breaking off.",
  3: "The legs begin. Build both sides evenly so the wallaby stays level.",
  4: "Keep the back edge of each leg straight. The tail is growing behind them.",
  5: "The haunches start to swell. This is the widest part of the lower body.",
  6: "Add the next ring of haunch bricks. The tail is still free-standing at the back.",
  7: "The tail is now tall enough to lean against the rump in the next layers.",
  8: "The tail meets the body. Make sure the tail bricks sit tight against the rump; this joint carries the tail's weight.",
  9: "Fill the rump. Keep the cream belly bricks on the front face.",
  10: "Widen the haunches by one stud. The model should still stand on its feet and tail.",
  11: "The lower body is complete. Check that both sides match.",
  12: "The waist starts to narrow. Leave the tail alone from here; it is already attached.",
  13: "The torso rises. The cream patch is the belly.",
  14: "The arms attach at the shoulders. Each arm is a short 2-stud column.",
  15: "Keep the arm columns vertical and one stud proud of the chest.",
  16: "Add the chest ring. The arms should feel firmly attached.",
  17: "The chest is at its widest. Check the front is smooth.",
  18: "The shoulders begin to close over the arms.",
  19: "The chest closes over the arms. The cream chest patch should run up the front.",
  20: "The arms are complete. The chest narrows into the neck.",
  21: "Keep the neck centred. The head will sit on top.",
  22: "The neck is almost done.",
  23: "The last neck ring. Leave the top studs free for the head.",
  24: "The head starts. The snout points forward, over the chest.",
  25: "Build the jaw first; it supports the snout above.",
  26: "The head begins. The snout points forward over the chest.",
  27: "The snout and the black nose. The nose is the front-most brick.",
  28: "The top of the head. The two black eyes should face forward.",
  29: "The ears rise. Each ear has a 2×2 footprint.",
  30: "The last ear bricks. The model is 29.8 cm tall here.",
  31: "Press a 2×2 tile onto each ear. That finishes the wallaby at 30.1 cm.",
};

const TIPS = {
  0: "Sort the dark tan foot bricks first; they are easy to mix up with the tan belly bricks.",
  2: "Don't skip the foot-top bricks. Without them the outer toes are only held by one stud.",
  8: "The tail is a cantilever. Press the rump joint together before you let go.",
  14: "Build the left and right arms at the same time so the shoulders stay symmetrical.",
  24: "The head is the easiest part to knock off. Support the neck with one hand while you press.",
  31: "Tiles are smooth on top. If you want studs on the ears, use 2×2 plates instead.",
};

function partsFor(list) {
  const m = new Map();
  for (const b of list) {
    const key = `${b.design.id}|${b.colorKey}`;
    let p = m.get(key);
    if (!p) {
      p = { key, design: b.design, colorKey: b.colorKey, color: b.color, qty: 0, w: b.w, d: b.d, tile: b.tile };
      m.set(key, p);
    }
    p.qty++;
  }
  return [...m.values()].sort((a, b) => b.qty - a.qty || a.design.name.localeCompare(b.design.name));
}

export const STEPS = [];
for (let z = 0; z <= 31; z++) {
  const bricks = ALL_BRICKS.filter((b) => b.z === z);
  if (!bricks.length) continue;
  STEPS.push({
    z,
    index: STEPS.length + 1,
    stage: stageFor(z),
    caption: CAPTIONS[z] || `Add the bricks for layer ${z + 1}.`,
    tip: TIPS[z] || "",
    bricks,
    parts: partsFor(bricks),
    cells: CELLS.filter(([, , zz]) => zz === z),
  });
}
export const STEP_COUNT = STEPS.length;
export const LAST_STEP = STEPS[STEPS.length - 1];

// ---- wanted list ----------------------------------------------------------
export const WANTED_XML = (() => {
  const lines = ['<?xml version="1.0" encoding="UTF-8"?>', "<INVENTORY>"];
  for (const p of PARTS) {
    lines.push(
      "  <ITEM>",
      "    <ITEMTYPE>P</ITEMTYPE>",
      `    <ITEMID>${p.design.id}</ITEMID>`,
      `    <COLOR>${p.color.bricklink}</COLOR>`,
      `    <MINQTY>${p.qty}</MINQTY>`,
      "  </ITEM>"
    );
  }
  lines.push("</INVENTORY>", "");
  return lines.join("\n");
})();

export { BRICKS, TILES, CELLS, AUDIT };
