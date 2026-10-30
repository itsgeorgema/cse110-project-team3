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

## Deployment

GitHub Actions deploys the site to GitHub Pages on every push to `main`. The
workflow installs locked dependencies, audits for critical vulnerabilities, runs
tests, and typechecks/builds the app before deploying `dist/` to the
`github-pages` environment. Failed checks prevent deployment.

The site will be available at https://itsgeorgema.github.io/cse110-project-team3/.
The workflow's deployment environment also links to the published URL. To redeploy,
open **Actions → Deploy to GitHub Pages → Run workflow** and select `main`.
Deployments are restricted to `main` and run one at a time.

The build uses the base path supplied by GitHub Pages so bundled assets load
correctly under the repository URL. Local development keeps Vite's default base.
To check a Pages-style build locally:

```sh
npm run build -- --base /cse110-project-team3/
npm run preview -- --base /cse110-project-team3/
```

Open http://localhost:4173/cse110-project-team3/.

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
