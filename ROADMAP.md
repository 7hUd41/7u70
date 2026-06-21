# ROADMAP — Doc VPS adaptative (handoff)

Next.js 14 + Tailwind + MDX. Build vérifié : `npm install && npm run build`.

## Fichiers clés
- `src/components/doc-context.tsx` — variables (`FIELDS` : key/label/group/hint/impact), `GROUPS`, `CHOICES`, `LEVELS`, `DocState`, `fill()`
- `src/components/DocShell.tsx` — état global (présets, niveau, choix, édition inline), panneaux de config adaptatifs, toolbar (install.sh / playbook.yml), popover d'édition des variables
- `src/components/CodeBlock.tsx` + `Tokenized.tsx` — injection `${VAR}`, copie remplie, pastilles cliquables (prop `dark`)
- `src/components/Reading.tsx` — `<Detailed>`, `<Full>`, `<Note>`, `<Warn>`, `<When>`, `<Automatic>`, `<V>`
- `src/mdx-components.tsx` — mapping Markdown → composants (code fences → CodeBlock, etc.)
- `src/app/(doc)/page.mdx` — le tuto OVH ; `(doc)/layout.tsx` enveloppe dans `<DocShell>`
- `src/app/editor/page.tsx` + `src/components/CodeEditor.tsx` — éditeur in-browser (CodeMirror + compile MDX runtime)

## Fait
- Tuto OVH complet (accès/SSH, hostname + reverse DNS, maj, user sudo, durcissement SSH, UFW, fail2ban, Nginx + Certbot, sauvegardes, vérifs)
- Injection de variables `${VAR}` + copie remplie
- 4 niveaux : Automatique (Ansible) / Express / Détaillé / Exhaustif
- Contenu conditionnel `<When>` (toggles HAS_DOMAIN, OS)
- Présets multi-serveurs (créer/renommer/suppr/switch/export-import) — localStorage
- Niveau de lecture persisté — localStorage
- Tout copier / `install.sh` (respecte les toggles) + `playbook.yml`
- Éditeur `/editor` : aperçu live + download `.mdx`
- Éditeur : numéros de ligne, coloration syntaxe maison, pliage par blocs logiques, cheat-sheet ancré
- Panneau de config adaptatif par niveau + édition inline des variables (clic → s'applique partout)

- Checks par étape : `<Check cmd expect />` (vérif + retour attendu, injection de variables) + checkbox de progression persistée **par serveur** (localStorage `vps-doc-progress-v1`)

- Navigation multi-tutos : registre `src/lib/tutos.ts`, routing `(doc)/<slug>/page.mdx`, **nav de gauche** (groupée Serveur/Homelab), **TOC de droite** (sommaire de page + scrollspy), **fil d'Ariane**, **catalogue d'accueil** (route `/`)
- **Diagrammes d'architecture** stylés (`<Diagram name=...>`, SVG déclaratif, variables injectées) — un par tuto
- **Survol champ ↔ jetons** : surligne le champ de config et tous ses `${VAR}` dans la doc (bidirectionnel)
- **Barre de progression** globale (compte les `<Check>`) + bouton « reprendre où j'en étais », par (serveur, tuto)
- Nouveaux tutos état de l'art : Caddy (HTTPS auto), Docker + Compose v2, WireGuard, Proxmox VE 9, Pi-hole v6

## À faire (priorité)
1. **Mode plein écran de l'éditeur** (parké).
2. **Schéma d'archi par tuto** : enrichir `src/components/diagrams.tsx` (un `<Diagram name>` par nouveau tuto).
3. **Variables par tuto** : aujourd'hui le jeu de variables (`FIELDS`) est commun à tous les tutos ; prévoir des schémas par tuto (ex. passerelle/IP statique pour le homelab).

## Backlog polish
- Validation des champs (format IP / port 1-65535 / hostname)
- Garde-fou sur commandes destructrices (`rm`, `ufw enable`…)
- Recherche `⌘K` entre tutos
- Dark mode
- Bouton « explique-moi cette commande » via l'API Claude (niveau ∞ à la demande)
- Persistance de la visibilité du cheat-sheet de l'éditeur

## Conventions d'écriture MDX (rappel)
- Variables uniquement dans les blocs de code (` ```bash `) ou via `<V name="..." />` en prose
- Lignes vides autour du contenu Markdown à l'intérieur de `<When>` et `<Automatic>`
- `<Detailed>` = dès Détaillé, `<Full>` = Exhaustif seulement
- ` ```bash ` → prompt `$` ; ` ```ini/yaml ` → extrait de fichier (sans prompt)
