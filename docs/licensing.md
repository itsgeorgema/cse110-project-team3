# Licensing

This project is released under the [MIT License](../LICENSE). This page
explains why we chose it and lists the third-party software the game uses.

## Why MIT

- **It works with everything we depend on.** Our dependencies use MIT or
  Apache-2.0 (see the table below). Both are permissive, so we can ship them
  under MIT as long as we keep their notices. None of them requires a
  copyleft license such as GPL.
- **It suits code written with a lot of AI help.** Much of this code was
  written with generative AI tools, which the course allows for the team
  project. In the US, text an AI generates without enough human authorship
  may not be protected by copyright at all, so a license that relies on
  strong copyright control (like GPL's share-alike rule) might not hold for
  those parts. MIT asks for very little: keep the notice. That works the
  same whether a given line is copyrighted or not.
- **It disclaims warranty.** MIT's "as is" clause protects the team if
  someone reuses the code, including parts nobody reviewed line by line.
- **It is short and widely known.** Anyone, including future CSE 110
  students and recruiters looking at our portfolios, can see right away what
  they may do with the code.

We looked at other options. **Apache-2.0** adds a patent grant and a NOTICE
file, which matter little for a class game and add process. **GPL-3.0** would
force anyone who reuses the code to release theirs under GPL too, and that
rule rests on copyright that may not cover the AI-written parts. **Public
domain dedications** (Unlicense, CC0) drop the warranty disclaimer, or are not
meant for software.

A license does not make copied code legal. If an AI tool reproduces
someone else's licensed code, our MIT notice does not cover it.

Students hold copyright to their own work under UC San Diego policy. Each
contributor keeps their copyright and licenses their contributions under MIT.

## Third-party software

Shipped with the game (runtime dependencies):

| Package                                          | License | Use              |
| ------------------------------------------------ | ------- | ---------------- |
| [konva](https://github.com/konvajs/konva)        | MIT     | Canvas rendering |
| [matter-js](https://github.com/liabru/matter-js) | MIT     | 2D physics       |

Development only (not shipped): Vite, Vitest, @vitest/coverage-v8, ESLint,
@eslint/js, typescript-eslint, Prettier, and the `@types/*` packages are MIT.
TypeScript and Playwright are Apache-2.0.

Fonts: [DM Sans](https://fonts.google.com/specimen/DM+Sans) and
[Libre Caslon Display](https://fonts.google.com/specimen/Libre+Caslon+Display)
are under the SIL Open Font License 1.1. `src/style.css` loads them from Google
Fonts, so we do not redistribute the font files.

The repository has no third-party images, audio, or copied code snippets. If
you add any, add a row here.

To check a dependency's license, read the `license` field in
`node_modules/<package>/package.json`.
