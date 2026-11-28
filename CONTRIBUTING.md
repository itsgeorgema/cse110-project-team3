# Contributing

This project is MIT-licensed. By contributing, you agree that your
contribution is released under the [MIT License](LICENSE). The reasons for the
license choice are in [docs/licensing.md](docs/licensing.md).

The course treats license violations as academic integrity violations. Follow
these rules for anything that did not start in your own head.

## Code, assets, and text from outside sources

1. **Check the license before you copy.** Only use outside code, images,
   sounds, fonts, or text whose license lets us use it in an MIT project.
   - OK: MIT, BSD-2-Clause, BSD-3-Clause, ISC, Apache-2.0, Zlib, 0BSD,
     Unlicense, CC0, and for assets CC-BY or SIL OFL (with credit).
   - Ask the team first: MPL-2.0, LGPL, CC-BY-SA (this includes Stack
     Overflow posts).
   - Do not use: GPL, AGPL, anything marked non-commercial (CC-BY-NC) or
     no-derivatives (CC-BY-ND), or anything with **no license**. Public code
     with no license is still all rights reserved.
2. **Give credit.** Add a comment above copied code with the source URL and
   its license, for example
   `// Adapted from https://example.com/snippet (MIT, (c) Jane Doe)`.
   Keep any copyright notice the license requires.
3. **List it.** Add new dependencies, assets, and copied snippets to the
   third-party table in [docs/licensing.md](docs/licensing.md).
4. **Never use another team's code or artifacts**, whatever its license. The
   course forbids it.
5. **New npm dependency:** check its `license` field before you add it, and
   note it in the PR.

## AI-generated code

The course allows generative AI tools for the team project. You are still
responsible for everything you commit.

1. **Understand it.** Only commit code you can explain. Skills checks may ask.
2. **Watch for copied code.** AI tools sometimes reproduce code from their
   training data word for word, along with that code's license. Be careful
   when the output:
   - is a long, polished block that looks like a known library or tutorial,
   - has copyright headers, license text, or author names in comments,
   - names a specific project, or uses unusual names that suggest one.

   If you are unsure, search GitHub or the web for a distinctive line. If it
   matches licensed code, follow the outside-source rules above, or rewrite
   it in your own way. Turn on your tool's filter for suggestions that match
   public code if it has one (for example GitHub Copilot's "suggestions
   matching public code" setting).

3. **Do not ask an AI to recreate a specific project.** Prompts like "write
   the X library's Y function" or "copy this GPL file's logic" invite license
   problems.
4. **Review it like any other code.** AI-written code goes through the same
   tests and PR review as everything else.

## Pull requests

Use the PR template. If the PR adds outside code, assets, or a dependency,
say where it came from and what its license is.
