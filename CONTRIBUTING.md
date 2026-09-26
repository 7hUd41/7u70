# Contributing to Runfold

Thanks for helping. There are three ways in, from lightest to heaviest.

## 1. Say what broke

Every step of every page has a **Stuck here?** link (hover the step title). It opens an issue already filled with the page, the step, your reading level, your language and your stack choices — never your values. Add what you ran and what you saw. That is the most useful contribution there is: it is how a first-pass page becomes a page people can trust.

If you ran a page end to end and it worked, press **I tested it all, it works** at the bottom. It records your stack choices (never your values) and the date.

## 2. Write or fix a page

Pages live in `content/<series>/<page>/`. The whole format — files, variables, reading levels, components, the diagram — is in **[AUTHORING.md](AUTHORING.md)**, written so that a person or a model can follow it without anything else. The **Source .md** button on any page gives you its files plus that brief, ready to paste into a conversation.

Before opening a pull request:

```bash
npm test          # every page compiles in every language, variables and choices are declared, headings match across languages
```

New pages start with `status: draft` in `tuto.yaml`. Only mark a page `published` once someone has run it end to end on a real machine.

## 3. Change the code

```bash
npm install
npm run dev       # http://localhost:3000
npm run typecheck && npm run lint && npm test && npm run build
```

The layout of the code is described in the README (`src/engine` is pure TypeScript and unit-tested; `src/content` loads and checks the content; `src/reader` is the UI). Keep the engine free of React, keep every user-facing string in `src/i18n`, and add a test when you fix a bug.

## Sign your commits (DCO)

Runfold uses the [Developer Certificate of Origin](https://developercertificate.org/): by signing off, you state that you wrote the change or have the right to submit it under the project's license. Add the line with `-s`:

```bash
git commit -s -m "Fix the nginx check on RHEL"
```

which appends `Signed-off-by: Your Name <you@example.com>`.

## Style

- Commits: an imperative summary line, then why if it is not obvious.
- Prose in pages: direct, concrete, an engineer talking to a colleague. French pages use *tu*.
- Be kind in reviews. See the [Code of Conduct](CODE_OF_CONDUCT.md).
