# Writing a page for Runfold

A self-contained brief. Hand it to a person or a model with a subject ("set up a VPS to host a Next.js site behind nginx with TLS") and you get back the files a page is made of. Nothing else is needed to write; the site's test suite then checks the result.

## 1. What the reader gets, and why it shapes the writing

A page is one tutorial. The reader fills in **their context once** — hostnames, ports, paths, and a few **choices** of stack (Debian or RHEL, nginx or Apache, TLS from Let's Encrypt or self-signed) — and every command on the page is rewritten with their values. Sections that do not apply to their choices disappear.

The reader also picks a **reading level**, once for the whole site:

| Level | EN / FR | What it shows |
|---|---|---|
| Run | Run / Automatique | Only the `<Run>` block: a script that does the whole page. "Too lazy to read? Run it." |
| Quick | Quick / Express | The plain paragraphs and the commands. "It worked? Fine." |
| Guided | Guided / Détaillé | Quick + the `<Guided>` explanations: why, and how, for someone who has never done it. |
| Deep | Deep / Exhaustif | Everything, plus `<Deep>`: mechanism, alternatives, gotchas, what happens under the hood. |

So a page is **written once, in layers**, not four times. Every paragraph you write belongs to a layer. Plain text is Quick; wrap the rest.

Each page also carries a **gist**: a small diagram at the top (boxes, containers, arrows, no coordinates) that follows the reader's choices and level. And each page exists in **English and French**, each with its own file, same structure.

## 2. The files

```
content/<series>/series.yaml                 what all pages of the series share (title, order, shared variables/choices)
content/<series>/<page>/tuto.yaml            this page's contract: metadata, its own variables/choices
content/<series>/<page>/page-en.mdx          the prose, English
content/<series>/<page>/page-fr.mdx          the prose, French (same heading skeleton)
content/<series>/<page>/diagram.yaml         the gist (optional but expected)
```

Slugs are kebab-case (`secure-ssh-on-a-fresh-server`). Variable and choice keys are `UPPER_SNAKE_CASE`.

A page **inherits** the series' groups, variables and choices and may add its own; it must **never redeclare** a key the series declares. Two different pages may declare the same key (the reader's value is shared across the series).

Deliver every file in full, each in its own fenced block with the path as title.

## 3. `series.yaml` (only when creating a series)

```yaml
title:   { en: NetBox, fr: NetBox }
summary:
  en: >-
    One or two sentences: what the series takes the reader from and to.
  fr: >-
    Une ou deux phrases : d'où part la série et où elle mène.
order: [install-from-scratch, configure-for-your-team]   # page slugs, reading order

groups:                        # sections of the "Your values" panel
  - id: host
    label: { en: Server, fr: Serveur }
    desc:  { en: Where it runs and how it is reached., fr: Où ça tourne et comment on l'atteint. }
  - id: auth
    label: { en: Directory, fr: Annuaire }
    when:  { flag: LDAP }      # the whole group disappears when the choice is off

vars:                          # same shape as in tuto.yaml, see below
  - key: NETBOX_HOST
    kind: hostname
    group: host
    default: netbox.example.com
    label:  { en: NetBox hostname, fr: Nom d'hôte de NetBox }
    hint:   { en: …, fr: … }
    impact: { en: …, fr: … }

choices:
  - key: OS
    type: select
    label: { en: Distribution, fr: Distribution }
    default: ubuntu
    options:
      - { value: ubuntu, label: { en: Ubuntu 24.04, fr: Ubuntu 24.04 } }
      - { value: rhel,   label: { en: RHEL 9 / Rocky / Alma, fr: RHEL 9 / Rocky / Alma } }
  - key: LDAP
    type: boolean
    label: { en: Authenticate against LDAP, fr: Authentifier via LDAP }
    default: false
```

## 4. `tuto.yaml`

```yaml
# Inherits from ../series.yaml: <list the inherited keys here as a comment>.
title:   { en: Secure SSH on a fresh server, fr: Sécuriser l'accès SSH d'un serveur neuf }
summary:
  en: >-
    Two or three lines. What the reader has at the end. Concrete.
  fr: >-
    Deux ou trois lignes. Ce que le lecteur a à la fin. Concret.
difficulty: beginner           # beginner | intermediate | advanced
tags: [ssh, linux, security]   # lowercase, used by search filters
authors: [thudal]
created: 2026-09-26            # YYYY-MM-DD
minutes: 10                    # hands-on time
validated: Debian 12 · Rocky 9 # upstream version / platform it was written for

groups:
  - id: access
    label: { en: Access, fr: Accès }

vars:
  - key: SSH_PORT
    kind: port                 # text | ip | cidr | port | hostname | domain | user | email | secret | path | url
    group: access
    default: "2222"            # always a string; "" for none (secrets)
    label: { en: SSH port, fr: Port SSH }
    hint:                      # what it is, one or two sentences — shown in the ? tip
      en: The port SSH listens on after hardening. Anything but 22 removes most automated noise.
      fr: Le port sur lequel SSH écoutera après durcissement. Tout sauf 22 supprime l'essentiel du bruit automatisé.
    impact:                    # consequences of getting it wrong, where it is reused — also in the tip
      en: Reused by the firewall and fail2ban. Open it in the firewall before restarting SSH, or you lock yourself out.
      fr: Réutilisé par le pare-feu et fail2ban. Ouvre-le dans le pare-feu avant de redémarrer SSH, sinon tu te verrouilles dehors.
    when: { flag: FAIL2BAN }   # optional: only relevant when a choice holds

choices:
  - key: FAIL2BAN
    type: boolean
    label: { en: Ban brute-force attempts (fail2ban), fr: Bannir le brute force (fail2ban) }
    hint:  { en: Recommended on any server reachable from the internet., fr: Recommandé sur tout serveur joignable depuis internet. }
    default: true
```

Rules:
- `kind: secret` for passwords and tokens: masked in the panel, never printed in the print view, never carried by share links. `default: ""`.
- Every value a reader could reasonably change is a variable. Hard-code only true constants (a well-known port of a protocol, a package name).
- `hint` and `impact` are the **whole explanation** of a variable; the page prose should not repeat them.
- Conditions (`when`, and `<When>` in prose): `{ flag: KEY }`, `{ notFlag: KEY }`, `{ is: KEY, equals: value }`, `{ is: KEY, oneOf: [a, b] }`. They may only reference choices.

## 5. `page-en.mdx` / `page-fr.mdx`

### Skeleton

```mdx
{/* First pass — to be validated against <official docs URL> before publishing. */}

One paragraph (Quick): what this page does, in what order, for whom.

<Run>

One sentence saying what the script does, on which machine, as which user, and what must be in place first.

```bash
#!/usr/bin/env bash
set -euo pipefail
# <Title> — ${MAIN_VAR}
… the whole page as a script, using ${VARS} …
```

</Run>

## Before you start

<Guided>What you need on hand: accounts, access, prerequisites, and where the commands run.</Guided>

<Check cmd="…" expect="…" />

## First step

Plain sentence saying what to do.

```bash
command with ${VARS}
```

<Guided>Why this step, what the command does, what to look at.</Guided>

<Deep>The mechanism, the alternative, the gotcha, the thing that bites in production.</Deep>

<Check cmd="…" expect="…" />

## Second step
…

## Done

What the reader now has. What the next page of the series does.
```

The **French file has the same headings, in the same order, the same count** (the test checks it). It is written in natural French with "tu" (tutoiement), not a word-for-word translation.

### The syntax

| Syntax | Meaning |
|---|---|
| `${SSH_PORT}` inside a code fence | replaced by the reader's value; the copy button copies the filled command |
| `<V name="SSH_PORT" />` | the same, inline in prose |
| plain markdown | visible from **Quick** |
| `<Guided>…</Guided>` | visible from **Guided** |
| `<Deep>…</Deep>` | visible at **Deep** only |
| `<Note>…</Note>` | an aside, from Guided |
| `<Warn>…</Warn>` | always visible: anything that can lock you out, lose data or cost money |
| `<When is="OS" equals="debian">…</When>` | conditional on a select choice; also `oneOf="a,b"` |
| `<When flag="FAIL2BAN">…</When>` / `<When notFlag="…">` | conditional on a boolean choice |
| `<Run>…</Run>` | the only thing shown at Run: a script or a single file that does the whole page |
| `<Check cmd="…" expect="…" />` | a verification with a checkbox, tracked per page. Also `id="…"` to name it. |
| `<Details summary="If it fails">…</Details>` | collapsible, closed by default |
| `<Tabs group="x"><Tab label="/etc/a.conf">…</Tab><Tab label="/etc/b.conf">…</Tab></Tabs>` | several files of one feature, side by side |
| ` ```ini title="/etc/x.conf" {1,3-5} ` | file name as caption, highlighted lines |
| `<Annotated>` + `# (1)` markers at line ends + a numbered list after the fence | annotations: stripped at Quick, badges at Guided, inline at Deep |
| `## Heading` | a step: numbered automatically, listed in the outline. `###` for sub-steps. |

Details that matter:
- A `<Check>` is a real command whose expected output is **stable**: a version line, `active (running)`, an HTTP `200`. Two to six per page. `expect` may contain `${VARS}` but never a secret. If the command mixes `'` and `"`, write `cmd={"…"}`.
- Fences: ` ```bash ` for shell (a `$` prompt is drawn in front of what the reader types, not in front of comments or continuation lines), ` ```yaml `, ` ```python `, ` ```ini `, ` ```nginx `. One fence per command group; keep them short enough to read.
- Inside `<Run>`, the script must work with the variables and the choices: branch it with `<When>` blocks around separate fences when the stack differs. It runs unattended, so `set -euo pipefail`, no prompts, no `sudo` password expectations that the intro does not state.
- Do not put MDX components inside a fence, and do not put `\"` inside a component attribute (use `cmd={"…"}`).
- Blank line before and after every component, and around fences inside components.
- A component whose content spans several paragraphs or holds a list must be written as a block: the opening tag alone on its line, a blank line, the content, a blank line, the closing tag alone on its line. `<Guided>One line.</Guided>` is fine; `<Guided>Intro:\n\n1. item</Guided>` does not compile.
- New pages carry `status: draft` in `tuto.yaml` until their author has run them end to end.

### Voice

Direct, concrete, an experienced engineer talking to a colleague. Short sentences. No marketing, no "simply", no "just". Say what a command does before showing it when it is not obvious. Say when a step is dangerous before the reader runs it (`<Warn>`). Name the file being edited. When a fact is from memory and must be confirmed, keep the common well-known form and add a `<Note>` saying where to confirm it.

Length: 200–400 lines per language file. Accuracy over volume.

## 6. `diagram.yaml` — the gist

```yaml
title:   { en: "One server, four pieces", fr: "Un serveur, quatre briques" }
caption:
  en: "One or two sentences read under the drawing."
  fr: "Une ou deux phrases lues sous le schéma."

groups:                                       # dashed containers
  - id: server
    label: { en: "Your server", fr: "Ton serveur" }
    desc:  { en: "…", fr: "…" }               # shown on hover

nodes:
  - id: users                                 # kebab-case
    kind: user                                # user | client | server | service | store | file | net | cloud (the icon)
    label: { en: "Your team", fr: "Ton équipe" }
    sub: "https://${NETBOX_HOST}"             # second line, may use ${VARS}
    desc:  { en: "What this piece does.", fr: "Ce que fait cette brique." }
  - id: nginx
    kind: net
    label: { en: "nginx", fr: "nginx" }
    sub: "443 → 8001"
    in: server                                # container
    when: { is: WEB, equals: nginx }          # follows the reader's choices
    desc:  { en: "…", fr: "…" }
    guided: { sub: ":443 → 127.0.0.1:8001" }  # overrides from Guided up
    deep:   { sub: "TLS ends here · :443 → 127.0.0.1:8001 · HTTP/1.1" }
  - id: firewall
    kind: net
    label: { en: "Firewall", fr: "Pare-feu" }
    in: server
    level: guided                             # appears from Guided up (level: deep for Deep only)
    desc:  { en: "…", fr: "…" }
  - id: netbox
    kind: server
    label: { en: "NetBox", fr: "NetBox" }
    in: server
    focus: true                               # the thing the page is about, drawn in the accent
    desc:  { en: "…", fr: "…" }

edges:
  - { from: users, to: nginx, label: "HTTPS", max: quick, desc: { en: "…", fr: "…" } }          # a simplification replaced from Guided
  - { from: users, to: firewall, label: "HTTPS · TCP 443", level: guided, deep: { label: "L7 HTTPS · L4 TCP 443 · L3 IP" }, desc: { en: "…", fr: "…" } }
  - { from: firewall, to: nginx, level: guided, desc: { en: "…", fr: "…" } }
  - { from: nginx, to: netbox, desc: { en: "…", fr: "…" } }
  - { from: netbox, to: ldap, label: "bind", dashed: true, when: { flag: LDAP }, desc: { en: "…", fr: "…" } }   # dashed = secondary relation
```

Rules:
- Solid arrows lay the boxes out left to right; dashed arrows are secondary and do not move anything. No coordinates ever.
- Quick shows 4–7 boxes; Guided adds the pieces a first-timer should know exist; Deep shows every layer (DNS, TLS, ports, sockets, units, log files).
- `desc` on every node, edge and group, both languages; it is what the reader gets on hover.
- Only reference variables and choices declared for the page (series + page).

## 7. Checklist before delivering

- [ ] Every user-facing string exists in `en` and `fr`.
- [ ] Every `${VAR}` and `<V name>` in the prose is declared (series or page); every `<When>` references a declared choice.
- [ ] No key redeclared that the series already declares.
- [ ] Same `##`/`###` headings, same order, same count, in both language files.
- [ ] A `<Run>` block that does the whole page with the variables.
- [ ] 2–6 `<Check>`s with stable expected output; no secret in `expect`.
- [ ] `<Warn>` before anything that locks out, deletes or costs.
- [ ] The first-pass comment at the top of each `.mdx`, naming the docs to validate against.
- [ ] `diagram.yaml` with `desc` everywhere, `focus` on one node, levels used.
- [ ] Every file delivered in full, path as the fence title.

## 8. A worked request

> Write the page `host-a-nextjs-site` for a new series `vps` (title "A VPS from scratch"): from a freshly delivered Debian 12 VPS to a Next.js site served by nginx with a Let's Encrypt certificate, the app run by systemd, deployed by `git pull` + `npm run build`. Series variables: SERVER_IP (ip), USERNAME (user, the deploy user), DOMAIN (domain). Page variables: APP_DIR (path, default /srv/site), REPO_URL (url), NODE_MAJOR (text, default "22"), APP_PORT (port, default "3000"). Choices: TLS (select letsencrypt | selfsigned, default letsencrypt), PM (select systemd | pm2, default systemd). Deliver series.yaml, tuto.yaml, page-en.mdx, page-fr.mdx, diagram.yaml.

The answer is five fenced blocks, complete, following sections 3–6 and passing the checklist in 7.
