import assert from "node:assert/strict";
import fs from "node:fs";
import {
  ALL_BRICKS, BRICKS, TILES, CELLS, PARTS, STEPS, TOTAL_PIECES,
  WANTED_XML, AUDIT, LAST_STEP, COLORS,
} from "./model.js";

const sum = (xs) => xs.reduce((n, x) => n + x, 0);

assert.equal(TOTAL_PIECES, 285, "total piece count");
assert.equal(sum(PARTS.map((p) => p.qty)), 285, "parts list sums to total");
assert.equal(sum(STEPS.map((s) => s.bricks.length)), 285, "all bricks appear in steps");
assert.equal(LAST_STEP.z, 31, "last step is the ear cap");
assert.equal(AUDIT.components, 1, "stored component count");
assert.equal(AUDIT.heightMm, 300.8, "nominal height");

// Every step's callout sums to the bricks placed on that step.
for (const s of STEPS) {
  assert.equal(sum(s.parts.map((p) => p.qty)), s.bricks.length, `step ${s.index} callout`);
}

// Every brick is inside the grid and carries a known design and colour.
const seen = new Map();
for (const b of ALL_BRICKS) {
  assert.ok(b.x >= 0 && b.y >= 0 && b.z >= 0, `brick origin ${b.id}`);
  assert.ok(b.x + b.w <= 14 && b.y + b.d <= 26 && b.z <= 31, `brick bounds ${b.id}`);
  assert.notEqual(b.design.id, "?", `known design ${b.id}`);
  assert.ok(COLORS[b.colorKey], `known colour ${b.colorKey}`);
  if (b.tile) continue;
  for (let x = b.x; x < b.x + b.w; x++) {
    for (let y = b.y; y < b.y + b.d; y++) {
      const k = `${x},${y},${b.z}`;
      assert.ok(!seen.has(k), `overlap at ${k}: ${seen.get(k)} and ${b.id}`);
      seen.set(k, b.id);
    }
  }
}

// Every non-tile cell in CELLS is covered exactly once by a brick.
const brickCells = CELLS.filter(([, , , , tile]) => !tile);
assert.equal(seen.size, brickCells.length, "brick coverage equals cell count");
for (const [x, y, z] of brickCells) {
  assert.ok(seen.has(`${x},${y},${z}`), `uncovered cell ${x},${y},${z}`);
}

// Recompute the brick graph instead of trusting the stored count. Every brick
// must connect to the assembly through a stud overlap with an adjacent layer.
const adj = ALL_BRICKS.map(() => []);
for (let i = 0; i < ALL_BRICKS.length; i++) {
  for (let j = 0; j < ALL_BRICKS.length; j++) {
    const a = ALL_BRICKS[i], b = ALL_BRICKS[j];
    if (Math.abs(a.z - b.z) !== 1) continue;
    let overlap = false;
    for (let x = a.x; x < a.x + a.w && !overlap; x++) {
      for (let y = a.y; y < a.y + a.d; y++) {
        if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.d) { overlap = true; break; }
      }
    }
    if (overlap) { adj[i].push(j); adj[j].push(i); }
  }
}
const seenGraph = new Set();
let components = 0;
for (let i = 0; i < ALL_BRICKS.length; i++) {
  if (seenGraph.has(i)) continue;
  components++;
  const stack = [i];
  seenGraph.add(i);
  while (stack.length) {
    const u = stack.pop();
    for (const v of adj[u]) if (!seenGraph.has(v)) { seenGraph.add(v); stack.push(v); }
  }
}
assert.equal(components, 1, "recomputed connected brick graph");
assert.equal(components, AUDIT.components, "stored component count matches recomputation");

// The static XML and the in-page XML agree.
const xml = fs.readFileSync(new URL("./wallaby-parts.xml", import.meta.url), "utf8");
assert.equal(xml, WANTED_XML, "static XML matches generated XML");
const entries = [...WANTED_XML.matchAll(/<ITEMID>([\w]+)<\/ITEMID>\s*<COLOR>(\d+)<\/COLOR>\s*<MINQTY>(\d+)<\/MINQTY>/g)];
assert.equal(entries.length, PARTS.length, "XML item count");
for (const [, id, color, qty] of entries) {
  const p = PARTS.find((p) => p.design.id === id && p.color.bricklink === Number(color));
  assert.ok(p, `XML part ${id}/${color} in parts list`);
  assert.equal(Number(qty), p.qty, `XML qty ${id}/${color}`);
}

console.log(JSON.stringify({
  pieces: TOTAL_PIECES,
  bricks: BRICKS.length,
  tiles: TILES.length,
  steps: STEPS.length,
  partTypes: PARTS.length,
  colours: Object.keys(COLORS).length,
  components,
  heightMm: AUDIT.heightMm,
}, null, 2));
