# cse110-project-team3

CSE 110 Group 3's physics game: a clown escaping the circus, one physics problem at a time.
TypeScript, Vite, and Konva, with no framework.

## Setup

Requires Node 22 or newer (`.nvmrc` pins 22).

```sh
npm install
npm run dev        # http://localhost:5173
```

Other scripts:

- `npm run typecheck`: TypeScript check, no output files
- `npm run build`: typecheck, then a production build in `dist/`
- `npm run preview`: serve the production build

## Layout

`src/` mirrors the layers in our architecture doc's static view. Each folder's README lists the
classes that live there.

- `src/view/`: what the player sees and touches
- `src/controller/`: level and attempt lifecycle
- `src/model/`: logic and records, no rendering
- `src/data/`: level definitions and saved progress
- `src/main.ts`: builds the objects and wires them together

## Work

Sprint 1 issues: https://github.com/itsgeorgema/cse110-project-team3/issues?q=label%3A%22sprint+1%22
