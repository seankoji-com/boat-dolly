# Wallaby: 30 cm brick build

A step-by-step booklet for a standing wallaby built from real LEGO bricks. It is
the second instruction set in this repository; the first is the
[Boat Dolly](../README.md).

**Open it:** https://cart.seankoji.com/wallaby/

- 285 pieces (283 bricks + 2 tiles), 24 part/colour combinations.
- 30.1 cm to the ear tips: 31 brick layers plus a 2×2 tile on each ear.
- 32 step pages, a top-down layer map on every step, a side view for the tail and
  head, a parts page, and a BrickLink wanted list.
- Reddish Brown body, Dark Brown tail/ear tips, Tan belly and snout, Dark Tan
  feet, Black eyes and nose.

## Run it locally

The page uses ES modules, so open it through a small static server rather than
`file://`:

```sh
# from the repository root
python3 -m http.server 8000
# then open http://127.0.0.1:8000/wallaby/
```

The boat dolly page is still at the repository root (`index.html`).

## Files

| File | Purpose |
| --- | --- |
| `index.html` | The booklet: cover, 32 steps, finished page, parts, notes. |
| `data.js` | The validated brick layout and cell map. |
| `model.js` | Colours, part list, steps, BrickLink XML. |
| `render.js` | Isometric, side and layer-map SVG renderers. |
| `wallaby-parts.xml` | BrickLink wanted list. |
| `test.mjs` | Data, coverage, step-total and XML checks. |

## Validate

```sh
node wallaby/test.mjs
```

It checks 285 pieces, 32 steps, no overlapping bricks, one connected brick
graph, no single-brick module detachment, the 300.8 mm nominal height, and that
the static XML matches the generated wanted list.

## Print

Use the **Print** button in the top bar. It renders the whole booklet, one step
per A4 page, and opens the browser print dialog. Turn off the browser's
"Headers and footers" option for a clean page.

## Honest limits

- The model is a digital design. It has not been physically built, dropped or
  load-tested. The brick graph is connected and the centre of mass projects
  inside the feet-plus-tail support triangle, but clutch power varies between
  bricks. It is a display model, not a hand toy.
- Prices, colours and availability change. The XML uses BrickLink design and
  colour IDs; check live listings before ordering.
- This is an original fan build, not an official LEGO set. It is not endorsed by
  or affiliated with the LEGO Group. LEGO is a trademark of the LEGO Group.
