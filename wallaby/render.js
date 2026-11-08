import { COLORS, designOf } from "./model.js";

const C30 = Math.cos(Math.PI / 6);
const NS = 'vector-effect="non-scaling-stroke"';
const reduceMotion =
  typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.min(255, Math.round(c * k));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

function iso(p) {
  return [(p[0] - p[1]) * C30, (p[0] + p[1]) * 0.5 - p[2]];
}
function side(p) {
  return [p[1], -p[2]];
}

function poly(pts, fill, { stroke = "#2a1c13", width = 0.7, opacity = 1, extra = "" } = {}) {
  return `<polygon points="${pts.map((q) => q.map((v) => v.toFixed(1)).join(",")).join(" ")}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round" vector-effect="non-scaling-stroke" opacity="${opacity}" ${extra}/>`;
}

function brickCells(bricks) {
  const set = new Set();
  for (const b of bricks)
    for (let x = b.x; x < b.x + b.w; x++)
      for (let y = b.y; y < b.y + b.d; y++) set.add(`${x},${y},${b.z}`);
  return set;
}

function visibleFaces(b, proj) {
  const h = b.tile ? 0.333 : 1;
  const x0 = b.x, y0 = b.y, z0 = b.z, x1 = b.x + b.w, y1 = b.y + b.d, z1 = b.z + h;
  const face = (pts) => pts.map(proj);
  return {
    top: face([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]),
    front: face([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]),
    right: face([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]]),
  };
}

export function renderIso(bricks, opts = {}) {
  const upToZ = opts.upToZ ?? 99;
  const highlightZ = opts.highlightZ ?? null;
  const W = opts.width || 760;
  const H = opts.height || 470;
  const animate = opts.animate !== false && !reduceMotion && highlightZ !== null;
  const list = bricks.filter((b) => b.z <= upToZ);
  const allCells = brickCells(list);
  const sorted = list.slice().sort((a, b) => a.x + a.y + a.z - (b.x + b.y + b.z));

  let out = "";
  let glow = "";
  const highlighted = [];

  for (const b of sorted) {
    const color = b.color.hex;
    const f = visibleFaces(b, iso);
    const isNew = highlightZ !== null && b.z === highlightZ;
    const body =
      poly(f.top, shade(color, 1.0)) +
      poly(f.front, shade(color, 0.78)) +
      poly(f.right, shade(color, 0.62));

    if (isNew) {
      glow +=
        poly(f.top, "none", { stroke: "#ffcf00", width: 7, opacity: 0.75 }) +
        poly(f.front, "none", { stroke: "#ffcf00", width: 7, opacity: 0.75 }) +
        poly(f.right, "none", { stroke: "#ffcf00", width: 7, opacity: 0.75 });
    }

    let studs = "";
    if (!b.tile) {
      for (let x = b.x; x < b.x + b.w; x++) {
        for (let y = b.y; y < b.y + b.d; y++) {
          if (allCells.has(`${x},${y},${b.z + 1}`)) continue;
          const pts = [];
          for (let i = 0; i < 16; i++) {
            const t = (2 * Math.PI * i) / 16;
            pts.push(iso([x + 0.5 + Math.cos(t) * 0.22, y + 0.5 + Math.sin(t) * 0.22, b.z + (b.tile ? 1 : 1) + 0.16]));
          }
          studs += poly(pts, shade(color, 1.1), { stroke: "#2a1c13", width: 0.4 });
        }
      }
    }
    const content = body + studs;
    if (isNew) highlighted.push(`<g data-new-layer>${content}</g>`);
    else out += `<g>${content}</g>`;
  }

  let newLayer = highlighted.join("");
  if (animate && newLayer) {
    newLayer = `<g>${newLayer}<animateTransform attributeName="transform" type="translate" values="0 -30;0 0;0 0" dur="0.75s" begin="0.05s" fill="freeze" calcMode="spline" keySplines="0 0 1 1;0 0 1 1"/></g>`;
  }

  const corners = list.flatMap((b) => {
    const h = b.tile ? 0.333 : 1;
    return [
      iso([b.x, b.y, b.z]),
      iso([b.x + b.w, b.y + b.d, b.z + h]),
    ];
  });
  if (!corners.length) corners.push([0, 0], [1, 1]);
  const xs = corners.map((p) => p[0]);
  const ys = corners.map((p) => p[1]);
  const pad = 26;
  let x0 = Math.min(...xs) - pad, x1 = Math.max(...xs) + pad;
  let y0 = Math.min(...ys) - pad, y1 = Math.max(...ys) + pad;
  const bw = x1 - x0, bh = y1 - y0;
  if (bw / bh < W / H) {
    const nw = (bh * W) / H;
    x0 -= (nw - bw) / 2;
    x1 += (nw - bw) / 2;
  } else {
    const nh = (bw * H) / W;
    y0 -= (nh - bh) / 2;
    y1 += (nh - bh) / 2;
  }

  const ground = `<ellipse cx="${(x0 + x1) / 2}" cy="${y1 - pad * 0.7}" rx="${(x1 - x0) * 0.3}" ry="${(x1 - x0) * 0.05}" fill="#2c4a63" opacity=".08"/>`;

  return `<svg viewBox="${x0.toFixed(1)} ${y0.toFixed(1)} ${(x1 - x0).toFixed(1)} ${(y1 - y0).toFixed(1)}" role="img" aria-label="Wallaby assembly isometric view">${ground}${glow}${out}${newLayer}</svg>`;
}

export function cellColor(x, y, z, part, cellSet) {
  if (part === "nose" || part === "eye" || part === "claw") return "black";
  if (part === "snout") return "tan";
  if (part === "foot" || part === "paw") return "darkTan";
  if (part === "tail") return z < 4 ? "darkBrown" : "reddishBrown";
  if (part === "ear") return z >= 29 ? "darkBrown" : "reddishBrown";
  if (part === "earcap") return "darkBrown";
  if (part === "body" || part === "neck") {
    const cx = x + 0.5;
    if (cx >= 4.5 && cx <= 9.5 && z >= 8 && z <= 24 && !cellSet.has(`${x},${y + 1},${z}`)) return "tan";
  }
  return "reddishBrown";
}

export function renderCellsIso(cells, opts = {}) {
  const upToZ = opts.upToZ ?? 99;
  const highlightZ = opts.highlightZ ?? null;
  const W = opts.width || 760;
  const H = opts.height || 470;
  const animate = opts.animate !== false && !reduceMotion && highlightZ !== null;
  const list = cells.filter((c) => c[2] <= upToZ);
  const set = new Set(list.map(([x, y, z]) => `${x},${y},${z}`));
  const sorted = list.slice().sort((a, b) => (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]));
  let out = "";
  let glow = "";
  let newLayer = "";
  for (const [x, y, z, part, tile] of sorted) {
    const key = cellColor(x, y, z, part, set);
    const color = COLORS[key].hex;
    const h = tile ? 0.333 : 1;
    const x0 = x, y0 = y, z0 = z, x1 = x + 1, y1 = y + 1, z1 = z + h;
    const top = [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]].map(iso);
    const front = [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]].map(iso);
    const right = [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]].map(iso);
    const isNew = z === highlightZ;
    let body =
      poly(top, shade(color, 1.0)) +
      poly(front, shade(color, 0.78)) +
      poly(right, shade(color, 0.62));
    if (!tile && !set.has(`${x},${y},${z + 1}`)) {
      const pts = [];
      for (let i = 0; i < 14; i++) {
        const t = (2 * Math.PI * i) / 14;
        pts.push(iso([x + 0.5 + Math.cos(t) * 0.22, y + 0.5 + Math.sin(t) * 0.22, z1 + 0.16]));
      }
      body += poly(pts, shade(color, 1.1), { stroke: "#2a1c13", width: 0.45 });
    }
    if (isNew) {
      glow += poly(top, "none", { stroke: "#ffcf00", width: 6.5, opacity: 0.8 }) +
        poly(front, "none", { stroke: "#ffcf00", width: 6.5, opacity: 0.8 }) +
        poly(right, "none", { stroke: "#ffcf00", width: 6.5, opacity: 0.8 });
      newLayer += `<g>${body}</g>`;
    } else {
      out += `<g>${body}</g>`;
    }
  }
  if (animate && newLayer) {
    newLayer = `<g>${newLayer}<animateTransform attributeName="transform" type="translate" values="0 -28;0 0;0 0" dur="0.75s" begin="0.05s" fill="freeze" calcMode="spline" keySplines="0 0 1 1;0 0 1 1"/></g>`;
  }
  const corners = list.flatMap(([x, y, z, , tile]) => [iso([x, y, z]), iso([x + 1, y + 1, z + (tile ? 0.333 : 1)])]);
  if (!corners.length) corners.push([0, 0], [1, 1]);
  const xs = corners.map((p) => p[0]), ys = corners.map((p) => p[1]);
  const pad = 8;
  let x0 = Math.min(...xs) - pad, x1 = Math.max(...xs) + pad;
  let y0 = Math.min(...ys) - pad, y1 = Math.max(...ys) + pad;
  const bw = x1 - x0, bh = y1 - y0;
  if (bw / bh < W / H) {
    const nw = (bh * W) / H;
    x0 -= (nw - bw) / 2;
    x1 += (nw - bw) / 2;
  } else {
    const nh = (bw * H) / W;
    y0 -= (nh - bh) / 2;
    y1 += (nh - bh) / 2;
  }
  const groundYs = list.filter((c) => c[2] === 0).map((c) => iso([c[0] + 0.5, c[1] + 0.5, 0])[1]);
  const groundY = groundYs.length ? Math.max(...groundYs) + 3 : y1 - pad;
  const ground = `<ellipse cx="${(x0 + x1) / 2}" cy="${groundY}" rx="${(x1 - x0) * 0.22}" ry="${(x1 - x0) * 0.035}" fill="#2c4a63" opacity=".1"/>`;
  return `<svg viewBox="${x0.toFixed(1)} ${y0.toFixed(1)} ${(x1 - x0).toFixed(1)} ${(y1 - y0).toFixed(1)}" role="img" aria-label="Wallaby assembly isometric view">${ground}${glow}${out}${newLayer}</svg>`;
}

export function renderCellsSide(cells, opts = {}) {
  const upToZ = opts.upToZ ?? 99;
  const highlightZ = opts.highlightZ ?? null;
  const W = opts.width || 420;
  const H = opts.height || 520;
  const list = cells.filter((c) => c[2] <= upToZ);
  const set = new Set(list.map(([x, y, z]) => `${x},${y},${z}`));
  const sorted = list.slice().sort((a, b) => a[0] - b[0] || a[2] - b[2] || a[1] - b[1]);
  let out = "";
  for (const [x, y, z, part, tile] of sorted) {
    const key = cellColor(x, y, z, part, set);
    const color = shade(COLORS[key].hex, 0.92 + Math.min(x, 8) * 0.012);
    const isNew = z === highlightZ;
    out += `<rect x="${y}" y="${-(z + (tile ? 0.333 : 1))}" width="1" height="${tile ? 0.333 : 1}" fill="${color}" stroke="${isNew ? "#ffcf00" : "#2a1c13"}" stroke-width="${isNew ? 1.6 : 0.35}"/>`;
  }
  const xs = list.map((c) => c[1]);
  const ys = list.map((c) => -(c[2] + 1));
  const pad = 2.5;
  const x0 = Math.min(...xs, 0) - pad;
  const x1 = Math.max(...xs, 1) + 1 + pad;
  const y0 = Math.min(...ys, -1) - pad;
  const y1 = pad;
  const bw = x1 - x0, bh = y1 - y0;
  const scale = Math.min(W / bw, H / bh);
  const vw = W / scale, vh = H / scale;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  return `<svg viewBox="${(cx - vw / 2).toFixed(1)} ${(cy - vh / 2).toFixed(1)} ${vw.toFixed(1)} ${vh.toFixed(1)}" role="img" aria-label="Wallaby side profile">${out}</svg>`;
}

export function renderSide(bricks, opts = {}) {
  const upToZ = opts.upToZ ?? 99;
  const highlightZ = opts.highlightZ ?? null;
  const W = opts.width || 460;
  const H = opts.height || 560;
  const list = bricks.filter((b) => b.z <= upToZ);
  const sorted = list.slice().sort((a, b) => a.x - b.x || a.z - b.z || a.y - b.y);
  let out = "";
  for (const b of sorted) {
    const h = b.tile ? 0.333 : 1;
    const x0 = b.y, x1 = b.y + b.d, y0 = -(b.z + h), y1 = -b.z;
    const isNew = highlightZ !== null && b.z === highlightZ;
    const color = shade(b.color.hex, 0.96 + Math.min(b.x, 8) * 0.012);
    out += `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="${color}" stroke="${isNew ? "#ffcf00" : "#2a1c13"}" stroke-width="${isNew ? 2 : 0.7}"/>`;
  }
  const pad = 2.5;
  const x0 = Math.min(...list.map((b) => b.y), 0) - pad;
  const x1 = Math.max(...list.map((b) => b.y + b.d), 1) + pad;
  const y0 = Math.min(...list.map((b) => -(b.z + 1)), -1) - pad;
  const y1 = 0 + pad;
  const bw = x1 - x0, bh = y1 - y0;
  const scale = Math.min(W / bw, H / bh);
  const vw = W / scale, vh = H / scale;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  return `<svg viewBox="${(cx - vw / 2).toFixed(1)} ${(cy - vh / 2).toFixed(1)} ${vw.toFixed(1)} ${vh.toFixed(1)}" role="img" aria-label="Wallaby side profile">${out}</svg>`;
}

export function renderLayerMap(layerBricks, belowCells = [], opts = {}) {
  const cell = opts.cell || 13;
  const W = 14, D = 26;
  const pad = 18;
  const gridW = W * cell, gridH = D * cell;
  const below = new Set(belowCells.map(([x, y]) => `${x},${y}`));
  let out = "";
  for (let y = 0; y < D; y++) {
    for (let x = 0; x < W; x++) {
      const k = `${x},${y}`;
      if (!below.has(k)) continue;
      out += `<rect x="${x * cell}" y="${y * cell}" width="${cell}" height="${cell}" fill="#e6ddd0" stroke="#f6f1e7" stroke-width="0.5"/>`;
    }
  }
  for (const b of layerBricks) {
    const w = b.w * cell, d = b.d * cell;
    const label = b.w * b.d >= 2 ? `${b.w}×${b.d}` : "";
    out += `<g><rect x="${b.x * cell + 0.7}" y="${b.y * cell + 0.7}" width="${w - 1.4}" height="${d - 1.4}" rx="2" fill="${b.color.hex}" stroke="#2a1c13" stroke-width="1"/>`;
    if (label && cell >= 11) {
      out += `<text x="${b.x * cell + w / 2}" y="${b.y * cell + d / 2 + 3.2}" text-anchor="middle" font-size="${Math.min(8.5, cell * 0.55)}" font-weight="800" fill="${b.colorKey === "tan" ? "#3a2b1b" : "#fff"}" opacity=".85">${label}</text>`;
    }
    out += `</g>`;
  }
  out += `<text x="${gridW / 2}" y="${gridH + 14}" text-anchor="middle" font-size="9" font-weight="800" fill="#7d6c58">FRONT ↓</text>`;
  out += `<text x="-7" y="${gridH / 2}" text-anchor="middle" font-size="9" font-weight="800" fill="#7d6c58" transform="rotate(-90 -7 ${gridH / 2})">BACK</text>`;
  return `<svg viewBox="${-pad} ${-pad} ${gridW + pad * 2} ${gridH + pad * 2}" role="img" aria-label="Top-down layer map">${out}</svg>`;
}

export function brickIcon(brick, opts = {}) {
  const size = opts.size || 58;
  const proj = (pts) => pts.map(iso);
  const h = brick.tile ? 0.333 : 1;
  const pts = [];
  for (const b of [brick]) {
    const x0 = 0, y0 = 0, x1 = b.w, y1 = b.d, z0 = 0, z1 = h;
    const faces = {
      top: proj([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]),
      front: proj([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]),
      right: proj([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]]),
    };
    pts.push(faces);
  }
  const all = pts.flatMap((f) => [...f.top, ...f.right, ...f.front]);
  const xs = all.map((p) => p[0]), ys = all.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const color = brick.color.hex;
  const pad = 0.8;
  let out = "";
  for (const f of pts) {
    out += poly(f.top, shade(color, 1.0), { width: 0.8 });
    out += poly(f.front, shade(color, 0.78), { width: 0.8 });
    out += poly(f.right, shade(color, 0.62), { width: 0.8 });
    if (!brick.tile) {
      for (let x = 0; x < brick.w; x++) {
        for (let y = 0; y < brick.d; y++) {
          const stud = [];
          for (let i = 0; i < 12; i++) {
            const t = (2 * Math.PI * i) / 12;
            stud.push(iso([x + 0.5 + Math.cos(t) * 0.22, y + 0.5 + Math.sin(t) * 0.22, h + 0.16]));
          }
          out += poly(stud, shade(color, 1.1), { width: 0.5 });
        }
      }
    }
  }
  const bw = x1 - x0, bh = y1 - y0;
  const scale = Math.min((size - 8) / bw, (size - 8) / bh);
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  return `<svg viewBox="${(cx - size / scale / 2).toFixed(2)} ${(cy - size / scale / 2).toFixed(2)} ${(size / scale).toFixed(2)} ${(size / scale).toFixed(2)}" width="${size}" height="${size}" aria-hidden="true">${out}</svg>`;
}

export { COLORS, designOf };
