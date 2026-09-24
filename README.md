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
    series.yaml                title, summary, reading order
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

`tuto.yaml` declares what the reader can change. Prose may only use what is declared; the test suite enforces it.

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
| `## Heading` | a step: numbered automatically, listed in the outline |

Shell fences (` ```bash `) get a prompt, a copy button and feed the "Download install.sh" export. Other languages (` ```python `, ` ```yaml `) render as file excerpts.

## Stack

Next.js 16 (App Router), React 19, MDX 3, Tailwind 4 (tokens only, no preset palette), Zod, Vitest. Fonts self-hosted: Fira Code (ligatures on), Libertinus (the maintained Linux Libertine).

## Roadmap

- In-place editor: edit a page in the browser, every save is a git commit, history visible in the UI.
- Profiles: several contexts per tutorial (lab, staging, prod), export/import.
- NetBox series: configure, maintain, automate.
- Kubernetes series, NetDevOps lab series.
