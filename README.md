# Doc VPS adaptative (Next.js + MDX)

Une doc technique où chaque commande se remplit avec la config de l'utilisateur,
avec 3 niveaux de lecture (Express / Détaillé / Exhaustif).

## Lancer

```bash
npm install
npm run dev
```

Puis http://localhost:3000

## Écrire un tuto

Les tutos sont des fichiers MDX dans `src/app/`. `src/app/page.mdx` est la page d'accueil.
Pour une nouvelle page (ex. `/docker`), crée `src/app/docker/page.mdx`.

### Variables injectables

Dans un **bloc de commande**, écris `${SERVER_IP}`, `${SSH_PORT}`, etc. :

    ```bash
    ssh -p ${SSH_PORT} ${USERNAME}@${SERVER_IP}
    ```

Les valeurs viennent du panneau de config. Le bouton « Copier » copie la commande
déjà remplie. Pour citer une variable **dans une phrase**, utilise `<V name="DOMAIN" />`.

Pour ajouter/renommer une variable : édite `FIELDS` et `DEFAULTS` dans
`src/components/doc-context.tsx`.

### Niveaux de lecture

- texte normal en Markdown → toujours visible
- `<Detailed>...</Detailed>` → visible à partir du niveau « Détaillé »
- `<Full>...</Full>` → visible seulement au niveau « Exhaustif »
- `<Note>...</Note>` → encadré info (dès « Détaillé »)
- `<Warn>...</Warn>` → avertissement (toujours visible)

### Langages de bloc

- ` ```bash ` → affiche le prompt `$` (commande shell)
- ` ```ini `, ` ```nginx `, etc. → pas de prompt, montre un extrait de fichier

## Structure

- `src/app/layout.tsx` — enrobe les pages dans `<DocShell>`
- `src/components/DocShell.tsx` — état (variables + niveau) + en-tête + panneau config
- `src/components/CodeBlock.tsx` — bloc copiable + injection de variables
- `src/components/Reading.tsx` — `<Detailed>`, `<Full>`, `<Note>`, `<Warn>`, `<V>`
- `src/components/doc-context.tsx` — définition des variables et niveaux
- `src/mdx-components.tsx` — mappe le Markdown vers ces composants

## Nouveautés

### Contenu conditionnel
Montre/cache des sections selon les choix de l'utilisateur (panneau « Ta stack ») :

    <When flag="HAS_DOMAIN">  ... </When>      <!-- si le toggle est ON -->
    <When notFlag="HAS_DOMAIN"> ... </When>    <!-- si OFF -->
    <When is="OS" equals="debian"> ... </When> <!-- si le select = debian -->

Les choix se définissent dans `CHOICES` (`src/components/doc-context.tsx`).
Mets des **lignes vides** autour du contenu Markdown à l'intérieur de `<When>`.

### Mode Automatique (Ansible)
Le niveau « Automatique » (avant Express) n'affiche que le bloc `<Automatic>...</Automatic>`,
qui contient le playbook Ansible (avec injection de variables) + la commande pour le lancer.
Le reste du tuto est masqué. Bouton « playbook.yml » pour le télécharger rempli.

### Présets de serveurs
Le panneau permet de créer/renommer/supprimer plusieurs configs (prod, staging, client…),
de switcher, et d'exporter/importer en JSON. Tout est persisté en `localStorage`.

### Tout copier / install.sh
La barre d'outils assemble toutes les commandes shell **visibles** (donc en respectant
tes toggles `<When>`) en un script `install.sh` téléchargeable, ou les copie d'un coup.

### Éditeur dans la page (/editor)
Va sur `/editor` (ou le bouton « Éditeur » en haut de la doc). Aperçu live à gauche,
code MDX à droite. Le MDX est compilé **dans le navigateur** : l'aperçu est interactif
(variables, toggles, niveaux fonctionnent). Le bouton « Télécharger .mdx » sort le fichier
à déposer dans `src/app/(doc)/` (ou un sous-dossier `src/app/<slug>/page.mdx` pour une route).

Structure des routes :
- `src/app/(doc)/` — la doc (enveloppée dans `<DocShell>`), `/` = page d'accueil
- `src/app/editor/` — l'éditeur (hors DocShell)

### Éditeur — confort d'écriture (CodeMirror)
Le volet code utilise CodeMirror 6 :
- numéros de ligne
- coloration de la syntaxe maison (variables ambre, composants violet, attributs vert, code cyan)
- pliage par blocs logiques via la gouttière : titres `##`, composants `<When>`/`<Automatic>`, blocs ```` ``` ````
- bouton « Syntaxe » : aide-mémoire ancré sous l'éditeur, couleurs alignées sur la coloration

L'éditeur (`src/components/CodeEditor.tsx`) est chargé en client-only (`next/dynamic`, `ssr:false`).
Le tokenizer maison et les règles de pliage sont définis dans ce même fichier.

### Panneau de config adaptatif (par niveau de lecture)
- **Automatique** : panneau latéral brut (champs + playbook).
- **Express** : panneau latéral + une ligne d'aide (`hint`) sous chaque champ.
- **Détaillé** : le panneau passe en haut de page, découpé en blocs d'architecture (`GROUPS`).
- **Exhaustif** : mêmes blocs + l'impact précis de chaque variable (`impact`).

Les `hint`, `impact` et `group` de chaque variable se définissent dans `FIELDS`
(`src/components/doc-context.tsx`) ; les blocs dans `GROUPS`.

### Édition inline des variables
Cliquer une valeur surlignée n'importe où dans le tuto ouvre un mini-éditeur qui
modifie la variable **partout** dans le document. Pratique pour corriger une coquille
sans remonter au panneau. Le rendu sombre/clair des pastilles est géré par la prop
`dark` de `Tokenized`.
