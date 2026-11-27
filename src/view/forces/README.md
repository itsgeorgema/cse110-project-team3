# `src/view/forces/`

A reusable free body diagram for the net force game (#96). It draws a crate
and one labelled arrow per force into a Konva `Group`. The net force game's
`KonvaCrate` (`../animation/`, #140, #141) draws its crate with it, so the
arrows move with the crate. It can also be viewed on a dev-only demo page.

## Files

- [`ForceData.ts`](./ForceData.ts) defines the force input, checks it, and
  turns it into plain arrow layouts (`layoutForces`). It has no Konva or DOM
  dependency, so all layout logic is unit-tested in Node.
- [`ForceRenderer.ts`](./ForceRenderer.ts) draws those layouts with Konva. It
  makes no layout decisions of its own.
- [`sampleForces.ts`](./sampleForces.ts) holds example data (resting crate,
  pushed crate, capped-ratio crate) shared by the tests and the demo.
- [`demo.html`](./demo.html) and [`demoPage.ts`](./demoPage.ts) are the
  dev-only demo. Run `npm run dev` and open `/src/view/forces/demo.html`. It is
  not part of the production build.

## Usage

```ts
const group = new Konva.Group({ x: 80, y: 0 });
layer.add(group);
const diagram = new ForceRenderer(group, {
  crate: { x: 100, y: 100, width: 100, height: 100 },
  maxArrowLength: 80,
});
diagram.render(forces, "beforeAnswer"); // arrows equal, labels "F_g = ?"
diagram.render(forces, "afterAnswer"); // arrows scaled, labels "F_g = 98.1 N"
```

Arrows and labels are dark (`#162c34`) by default. On a dark stage, pass a
light color as the third argument: `new ForceRenderer(group, options, { color: "#f4efe6" })`.

Each force is
`{ label, size?, side, pointing, labelPosition }`:

| Field           | Values                            | Meaning                                             |
| --------------- | --------------------------------- | --------------------------------------------------- |
| `label`         | non-empty string                  | e.g. `"F_g"`                                        |
| `size`          | finite number > 0, in newtons     | optional before answering, required after           |
| `side`          | `top`, `bottom`, `left`, `right`  | side of the crate the arrow attaches to             |
| `pointing`      | `into`, `away`                    | into: the tip touches the side; away: the tail does |
| `labelPosition` | `above`, `below`, `left`, `right` | where the label sits relative to its arrow          |

The component does not know about force types such as gravity; callers pass
any labelled force. Coordinates are Konva's: origin top-left, y down.

## Behavior

- **Before answering**, every arrow is full length and labelled
  `label = ?`, so neither length nor text reveals a value. Sizes passed in are
  ignored for drawing.
- **After answering**, each arrow's length is its size ÷ the largest size, but
  never shorter than 1/3 of the longest (at most a 3× difference). Lengths show
  which force is bigger; they are not to scale beyond 3×. Labels show the size
  with up to 4 decimals, trailing zeros dropped; tiny sizes that would round
  to 0 use 4 significant figures instead.
- **Several forces on one side** are spaced evenly along it, in input order.
- **Labels** sit beside the arrow's midpoint. Above/below labels on horizontal
  arrows instead line up with the arrow's outer end and extend away from the
  crate, so a short arrow's label doesn't run onto it.
- **Refused input** throws before anything is cleared, so the previous drawing
  stays. The message names the force by index and label: an empty label; a
  size that is negative, zero, NaN or infinite; a missing size after
  answering; an unknown `side`, `pointing` or `labelPosition`; crate size or
  `maxArrowLength` that is not a finite number > 0.
- **Several diagrams** can share one Stage: each `ForceRenderer` clears and
  draws only its own `Group` and never touches the Stage.
- **Arrows only**: with `drawCrate: false` in the options, the crate box only
  places the arrows and nothing is drawn for it, for a body drawn elsewhere.
  The roller coaster's Level 2 (#144) hangs `F_gravity` and `F_Normal` from
  the upside-down cart at the top of the loop this way (`KonvaCoaster`).

## Limits (MVP)

- No screen-reader text; the canvas is visual only (see #96).
- Labels can overlap the crate or another arrow, and can extend outside the
  crate-plus-arrows area (for example, a long label on a short left arrow).
  Callers leave room, as the demo does with a margin.
- No friction or angled forces: four sides, a flat crate, arrows at right
  angles.
- Level configs don't describe their forces. `CrateAnimation` builds each net
  force level's list from the level's numbers and the typed answer (#103):

  | Level            | Before an answer     | After an answer                                 |
  | ---------------- | -------------------- | ----------------------------------------------- |
  | 1 (pushed crate) | `F_push = ?`         | `F_g` and `F_N` = mass × 9.81, `F_push` = typed |
  | 2 (at rest)      | `F_g = ?`, `F_N = ?` | the typed `F_g` and `F_N`; no net force arrow   |

  A typed force of 0 (or one that is not a finite number > 0) has no arrow.
  The diagram switches when `GameController` calls `showResult`, just before
  the answer plays, and back to "?" when the level is shown again.

## Tests

[`ForceData.test.ts`](./ForceData.test.ts) covers every refusal, arrow
geometry for each side and direction, label placement, spacing, lengths and the
3× cap, and that labels before answering contain no digits.
[`ForceRenderer.test.ts`](./ForceRenderer.test.ts) replaces Konva with
recording fakes (`vi.mock("konva")`), because Konva text needs a real canvas.
It checks what is drawn, redrawing between states, that refused input keeps
the old drawing, and that two diagrams stay independent.
