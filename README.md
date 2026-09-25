# Adaptive tutorials

> Too lazy to read? **Run** the script.
> It worked? Read **Quick** to see what it did.
> Didn't get it? Read **Guided**.
> Want to understand everything? Read **Deep**.

Technical guides that adapt to the reader. Fill in your context once (hostnames, paths, secrets, which OS, which web server) and every command on the page is rewritten for you. Pick how much you want to read. Export the result as a script.

Working name. English and French are first-class: every tutorial exists in both.

## Status

Foundation, work in progress. First series: **NetBox** (install from scratch). Next: Kubernetes (a real deployment), then a NetDevOps lab (containerlab + NetBox + Nornir + CI).

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # engine + content integrity
npm run typecheck
npm run lint
```

## How it works

```
content/                       tutorials, one folder per page
  <series>/
    series.yaml                title, summary, reading order, and the variables/choices
                               shared by every page (filled once for the series)
    <page>/
      tuto.yaml                contract: variables, choices, metadata (language-independent)
      page-en.mdx              prose, English
      page-fr.mdx              prose, French
src/
  engine/                      pure TypeScript, no React: injection, conditions, validation,
                               script assembly, danger detection, contract schema. Unit-tested.
  content/                     loads and validates content/, compiles MDX. Integrity-tested.
  reader/                      the reading UI: state, context panel, code blocks, levels.
  i18n/                        UI strings (en, fr).
  app/[locale]/                routes.
```

### Writing a page

`tuto.yaml` declares what the reader can change on this page; `series.yaml` declares what the whole series shares (hostnames, install paths, the OS…). A page inherits the series' declarations and may add its own, never redefine one. Prose may only use what is declared; the test suite enforces it. Groups and variables can carry a `when` so they disappear when a choice makes them irrelevant.

```yaml
vars:
  - key: NETBOX_HOST
    kind: hostname            # ip | cidr | port | hostname | domain | user | email | secret | path | url | text
    group: host
    default: netbox.example.com
    label: { en: NetBox hostname, fr: Nom d'hôte de NetBox }
    hint:  { en: …, fr: … }   # shown from Quick
    impact: { en: …, fr: … }  # shown at Deep
choices:
  - key: WEB
    type: select              # or boolean
    options: [{ value: nginx, label: {…} }, { value: apache, label: {…} }]
```

In `page-<locale>.mdx`:

| Syntax | Meaning |
|---|---|
| `${NETBOX_HOST}` inside a code fence | replaced by the reader's value, copy button copies the filled command |
| `<V name="NETBOX_HOST" />` | the same, inline in prose |
| plain markdown | visible from **Quick** |
| `<Guided>…</Guided>` | visible from **Guided** |
| `<Deep>…</Deep>` | visible at **Deep** only |
| `<Note>…</Note>` | aside, from Guided |
| `<Warn>…</Warn>` | always visible, safety first |
| `<When is="WEB" equals="nginx">…</When>` | conditional on a choice (`flag=`, `notFlag=`, `oneOf=` too) |
| `<Run>…</Run>` | the only thing shown at **Run**: a script or playbook |
| `<Check cmd="…" expect="…" />` | verification step with a checkbox, tracked per tutorial |
| `<Details summary="If it fails">…</Details>` | collapsible block, closed by default |
| `<Tabs group="x"><Tab label="a.conf">…</Tab></Tabs>` | several files of one feature side by side; only the active tab is on the page |
| ` ```ini title="/etc/x.conf" {1,3-5} ` | file name as caption, highlighted lines |
| `<Annotated>` + `# (1)` markers + a numbered list | code annotations: hidden at Quick, badges at Guided, inline at Deep |
| `## Heading` | a step: numbered automatically, listed in the outline |

### Human validation

A page is only as good as the last person who ran it. At the end of every page, "Did everything work?" lets a reader record that they followed it end to end on a real machine: the validation is dated and stores **their stack choices only** (never their values), under a pseudonym or an anonymous tag. The line under the title shows how many validations the page has, the last one, and how many on the reader's own path; `/…/validations` lists them all. Validations live in `validations.yaml` next to the page, append-only. Recording needs the server (author mode); the static copy links to the issue tracker instead.

### Reader shortcuts

`/` or ⌘K search · `1`–`4` reading depth · `[` `]` previous / next page · `t` fold the outline · `?` guided tour. The guided tour starts on the first visit of the Example series and can be replayed from the compass icon.

Shell fences (` ```bash `) get a prompt, a copy button and feed the "Download install.sh" export. Other languages (` ```python `, ` ```yaml `) render as file excerpts.

### Skins

The whole look is a set of CSS tokens (colours, radii, fonts) declared on `:root`; light and dark are variants of them. A *skin* re-declares the tokens and nothing else: components never change. Eight ship, each with a light and a dark variant: **Editorial** (default: paper, ink, Libertinus), **Parchment** (old paper, sepia, oil-lamp dark), **Transit pink**, **Transit green**, **Slate** (the neutral one: white, pearl cards, petrol accent, IBM Plex Sans), **Night** (blue-black, amber values, mono labels — best dark), **Headline** (newspaper: black, white, one red, Bricolage Grotesque) and **Atom** (One Light / One Dark pastels). The palette icon in the header opens the menu; add a skin by adding a `:root[data-skin="…"]` block in `globals.css` and a swatch in `controls.tsx`.

## Stack

Next.js 16 (App Router), React 19, MDX 3, Tailwind 4 (tokens only, no preset palette), Zod, Vitest. Fonts self-hosted: Fira Code (ligatures on), Libertinus (the maintained Linux Libertine).

## Roadmap

- In-place editor: edit a page in the browser, every save is a git commit, history visible in the UI.
- Profiles: several contexts per tutorial (lab, staging, prod), export/import.
- NetBox series: configure, maintain, automate.
- Kubernetes series, NetDevOps lab series.
