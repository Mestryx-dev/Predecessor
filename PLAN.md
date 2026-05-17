# Plan de travail – Prédecéssor DPS Calculator (Dokploy)

## 🎯 Objectif
Construire une application auto‑hébergée (Dokploy) permettant de :
1. Agréguer les matchs publics de Pred.gg → statistiques réelles (DPS moyen, win‑rate, utilisation des compétences).
2. Scraper les fiches héros publiques → stats de base, compétences, cooldowns, scaling, coûts.
3. Exposer ces données via une API Next.js (REST, évolutive vers GraphQL).
4. Offrir une page par héros où l’utilisateur simule un build (objets, niveau) et compare le DPS théorique au DPS réel observé.
5. Maintenir les données à jour grâce à un worker Dokploy (ou tâche planifiée) qui exécute périodiquement un script de mise à jour (fetch → normalize → save → git commit/push) déclenchant un redeploiement de l’app Next.js.

## 🛠️ Stack choisie
| Couche | Technologie | Pourquoi / Comment sur Dokploy |
|--------|-------------|--------------------------------|
| Frontend / API | Next.js 13 (App Router, TypeScript) | Dokploy accepte les apps Node.js via un Dockerfile ou un buildpack ; on déploie simplement le repo. |
| ORM / Base de données | Prisma + SQLite (dev) → migrable vers PostgreSQL/MySQL | Dokploy peut ajouter une base de données PostgreSQL/MySQL en tant que *service* lié à l’app ; on peut commencer en SQLite pour le dev puis basculer facilement. |
| Scraping / fetch | Axios + Cheerio (Node) | Léger, respecte le `robots.txt` (on ne touche qu’aux chemins `/heroes/*` et `/api/public/*`). |
| Orchestration de mise à jour | **Worker Dokploy** (service séparé) qui exécute un script shell périodiquement (ex. toutes les 6 h) via un petit processus `node-cron` ou un `while true; sleep …` loop. Dokploy permet de définir un *processus* (ou un *cron job* si la plateforme le propose) ; ainsi on n’a pas besoin de n8n. |
| Secrets | Infisical (ou les *Secrets* intégrés de Dokploy) | On stocke les clés éventuelles (ex. clé API privée) dans les *Environment Variables* de l’app Dokploy, qui peuvent être synchronisées depuis Infisical si besoin. |
| Extensibilité future | Couche API isolée → possibilité de remplacer le REST par un serveur GraphQL (Apollo Server) sans toucher au frontend. | Dokploy redeploie automatiquement à chaque push ; on peut ajouter un nouveau service GraphQL ou modifier l’existant. |

## 📂 Arborescence du dépôt
```
/predecéssor-dps
├── .gitignore
├── PLAN.md                ← ce fichier
├── README.md
├── package.json
├── tsconfig.json
├── next.config.js
├── prisma/
│   └── schema.prisma
├── app/
│   ├── layout.tsx
│   ├── page.tsx                # accueil
│   ├── api/
│   │   ├── heroes/route.ts     # héros de base
│   │   └── stats/route.ts      # stats agrégées des matchs
│   └── [hero]/                 # page dynamique par héros
│       └── page.tsx
├── data/
│   ├── static/                 # héros.json, items.json, skills.json (versionnés)
│   └── processed/              # match agrégats, heroStats.json
├── scripts/
│   ├── fetchMatches.ts
│   ├── aggregateMatches.ts
│   ├── saveHeroStats.ts
│   ├── fetchHeroes.ts
│   ├── normalizeHeroes.ts
│   ├── saveHeroes.ts
│   └── update-all.sh           # wrapper complet (fetch + normalize + save + git commit/push)
├── dokploy/
│   ├── Dockerfile              # pour construire l’image Next.js
│   └── dokploy.yaml            # déclaration de l’app et du worker (facultatif, sinon on utilise l’UI)
└── docs/
    └── (éventuelles notes complémentaires)
```

## ✅ Étapes détaillées (à valider avant de passer à la suivante)

| # | Action | Commande / Fichier | Vérification |
|---|--------|--------------------|--------------|
| **1** | **Initialiser le dépôt Git** | `cd /home/mestryx/Workspace-OpenClaw/repositories`<br>`mkdir -p predecéssor-dps && cd $_`<br>`git init`<br>`git config user.name "Mestryx"`<br>`git config user.email "mestryx@example.com"` | Dépot vierge visible avec `git status`. |
| **2** | **Créer la structure de base** | `mkdir -p app/api app/[hero] data/static data/processed scripts dokploy docs`<br>`touch .gitignore README.md package.json tsconfig.json next.config.js` | Arborescence créée (`ls -R`). |
| **3** | **Configurer `.gitignore`** | ```bash\ncat > .gitignore <<'EOF'\nnode_modules/\n.next/\ndata/raw/\n*.env\nEOF\n``` | `git check-ignore -v data/raw/test` retourne une ligne. |
| **4** | **Initialiser le projet Next.js (TypeScript)** | `npm init -y`<br>`npm i next react react-dom`<br>`npm i -D typescript @types/react @types/node`<br>`npx tsc --init` (ajuster `outDir`, `rootDir`)<br>`npm run dev` → doit démarrer sur `http://localhost:3000` | `npm run dev` démarre sans erreur ; page accessible. |
| **5** | **Ajouter Prisma + SQLite** | `npm i prisma @prisma/client`<br>`npx prisma init` → crée `prisma/schema.prisma` et `.env`<br>Éditer `.env` : `DATABASE_URL="file:./dev.db"`<br>Définir le schéma (voir étape 6).<br>`npx prisma migrate dev --name init` | `npx prisma studio` lance l’interface et montre les tables créées. |
| **6** | **Définir le schéma Prisma** (`prisma/schema.prisma`) | *(voir ci‑dessus – Hero, Skill, Item, Match, HeroStat)*<br>Puis : `npx prisma migrate dev --name add_models` | Vérifier dans Prisma Studio que les tables existent. |
| **7** | **Script de fetch des matchs publics** (`scripts/fetchMatches.ts`) | *(boucle sur `https://pred.gg/api/public/get-matches-since/<offset>` avec délai 300 ms)*<br>Rendre exécutable : `chmod +x scripts/fetchMatches.ts`. | Exécuter `npx ts-node scripts/fetchMatches.ts` → fichier `data/raw/matches_latest.json` contenant un tableau JSON valide. |
| **8** | **Script de normalisation / agrégation des matchs** (`scripts/aggregateMatches.ts`) | Lecture de `matches_latest.json`, calcul avgDps, win‑rate, GPM, utilisation des compétences → écriture dans `data/processed/heroStats_latest.json`. | `jq '.[0]' data/processed/heroStats_latest.json` montre un objet avec les champs attendus. |
| **9** | **Persister les stats agrégées dans SQLite via Prisma** (`scripts/saveHeroStats.ts`) | Utiliser le client Prisma pour `upsert` chaque `HeroStat` (recherche Hero par `slug` ou création si manquante). | Vérifier dans Prisma Studio que la table `HeroStat` contient autant de lignes que de héros uniques. |
| **10** | **API REST pour lire les stats agrégées** (`app/api/stats/route.ts`) | ```ts\nimport { NextResponse } from 'next/server';\nimport { prisma } from '@/lib/prisma';\nexport async function GET(request: Request) {\n  const { searchParams } = new URL(request.url);\n  const hero = searchParams.get('hero');\n  if (hero) {\n    const stat = await prisma.heroStat.findUnique({\n      where: { hero: { slug: hero } },\n      include: { hero: true }\n    });\n    return NextResponse.json(stat ?? {});\n  }\n  const all = await prisma.heroStat.findMany({ include: { hero: true } });\n  return NextResponse.json(all);\n}\n``` | `http://localhost:3000/api/stats?hero=boris` renvoie un JSON avec `avgDps`, `winRate`, etc. |
| **11** | **Scraper les fiches héros** (`scripts/fetchHeroes.ts`) – Axios + Cheerio | ```ts\nimport axios from 'axios';\nimport { load } from 'cheerio';\nimport { writeFileSync } from 'fs';\nconst slugs = ['boris','crunch']; // sera rempli dynamiquement depuis les matchs ou la table Hero\nconst heroes: any[] = [];\nfor (const s of slugs) {\n  const { data } = await axios.get(`https://pred.gg/heroes/${s}/hero`);\n  const $ = load(data);\n  const stats: Record<string,string> = {};\n  $('.stat-block').each((_, el) => {\n    const label = $(el).find('.label').text().trim().toLowerCase().replace(/\s+/g,' ');\n    const val   = $(el).find('.value').text().trim();\n    stats[label] = val;\n  });\n  heroes.push({ slug: s, name: stats['hero name'] || s, ...stats });\n}\nwriteFileSync('data/static/heroes.json', JSON.stringify(heroes, null, 2));\n```<br>Installer dépendances : `npm i axios cheerio`. | Exécuter le script sur 2‑3 héros ; `jq '.[] | {slug, \"Basic Attack Power\": .\"basic attack power\"}' data/static/heroes.json` montre des nombres. |
| **12** | **Normaliser les données héro** (`scripts/normalizeHeroes.ts`) – convertir les chaînes comme `"25.0/35.0/45.0/55.0/65.0"` en tableau de nombres, parser les pourcentages de scaling, etc. Écrire `data/static/heroes_norm.json` (ou écraser le fichier précédent). | Vérifier que `basicAttackPower` est un nombre, que `skillDamage` est un tableau `[25,35,45,55,65]` et que `skillDamagePercent` est un tableau `[44,48,52,56,60]`. |
| **13** | **Importer les données héro dans SQLite** (`scripts/saveHeroes.ts`) | Utiliser Prisma pour créer/mettre à jour les enregistrements `Hero` et leurs `Skill` associés à partir du JSON normalisé. | Prisma Studio montre les tables `Hero` et `Skill` remplies (ex. Hero « Boris » avec 4 compétences). |
| **14** | **API REST pour récupérer les données héro de base** (`app/api/heroes/route.ts`) | ```ts\nimport { NextResponse } from 'next/server';\nimport { prisma } from '@/lib/prisma';\nexport async function GET() {\n  const heroes = await prisma.hero.findMany({\n    select: {\n      id:true, slug:true, name:true,\n      baseAtk:true, baseAtkSpd:true, baseHp:true,\n      baseArmorP:true, baseArmorM:true,\n      baseHpRegen:true, baseManaRegen:true, baseMoveSpd:true,\n      skills:{ select:{ id:true, name:true, cooldown:true, cost:true, damage:true, damageType:true } }\n    }\n  });\n  return NextResponse.json(heroes);\n}\n``` | `http://localhost:3000/api/heroes` renvoie un tableau d’héros avec leurs compétences. |
| **15** | **Page dynamique par héros** (`app/[hero]/page.tsx`) | - Utiliser `generateStaticPaths` pour retourner tous les slugs depuis la DB (ou fallback `[]` en dev).<br>- Dans `props`, faire deux appels : `fetch('/api/heroes/[slug]')` (stats de base) et `fetch('/api/stats?hero=[slug]')` (stats réelles).<br>- Afficher un formulaire : sélection d’objets (liste depuis `/api/items` si vous décidez de scraper les objets plus tard), niveau du héros (1‑30).<br>- Quand le formulaire change, appeler une fonction pure `calcDps(baseStats, selectedItems, level)` qui applique :<br>  • `finalAtk = baseAtk + Σ objets.atk + niveau * atkPerLevel`<br>  • `finalAtkSpd = baseAtkSpd * (1 + Σ objets.atkSpd)`<br>  • `critChance = baseCrit + Σ objets.critChance` (supposer 0 si absent)<br>  • `dps = finalAtk * finalAtkSpd * (1 + critChance * critMultiplier) * (1 - armorReduction(enemyArmor, finalPenetration))`<br>  • Afficher le DPS théorique, le temps pour tuer une cible avec HP donné, et le DPS réel (`avgDps`) venant des matchs. | Visiter `/app/boris` → voir le formulaire, les valeurs de base et le résultat du calcul. Modifier les objets et vérifier que le DPS théorique change de façon cohérente. |
| **16** | **Worker Dokploy pour le rafraîchissement périodique** | Deux possibilités : <br>**A. Service worker dédié** : créez une deuxième app Dokploy (type *Worker* ou *Backend*) qui pointe vers le même repo, mais dont le `start command` est : `node scripts/update-all.sh` (ou un petit script Node qui boucle avec `setInterval`). Dokploy permet de définir plusieurs *processes* dans le même service ; on peut ajouter un *cron* interne. <br>**B. Utiliser la fonction « Scheduled Tasks » de Dokploy** (si disponible) : créer une tâche cron qui exécute `./scripts/update-all.sh` sur le système de fichiers monté du repo. <br>Dans les deux cas, le worker : <br>1️⃣ exécute `npm run fetch:matches` (ou le script wrapper) <br>2️⃣ commit & push si des changements existent (déclenche un redeploiement de l’app Next.js). | Après avoir créé le worker, vérifier dans l’interface Dokploy que le processus apparaît comme *Running* et que les logs montrent l’exécution du script sans erreur. |
| **17** | **Script wrapper de mise à jour complète** (`scripts/update-all.sh`) | ```bash\n#!/usr/bin/env bash\nset -e\ncd \"$(dirname \"$0\")/..\"\n# 1️⃣ Fetch matchs\nnpx ts-node scripts/fetchMatches.ts\n# 2️⃣ Agrégation matchs\nnpx ts-node scripts/aggregateMatches.ts\n# 3️⃣ Sauvegarde stats héros dans DB\nnpx ts-node scripts/saveHeroStats.ts\n# 4️⃣ Fetch héros (on fetche toujours pour garder l’exemple simple)\nnpx ts-node scripts/fetchHeroes.ts\nnpx ts-node scripts/normalizeHeroes.ts\nnpx ts-node scripts/saveHeroes.ts\n# 5️⃣ Commit & push (déclenche redeploiement de l’app Next.js)\ngit add data/static/heroes.json data/processed/heroStats_latest.json\nif ! git diff --cached --quiet; then\n  git commit -m \"data refresh $(date +'%Y-%m-%d %H:%M')\"\n  git push\nfi\n```<br>Rendre exécutable : `chmod +x scripts/update-all.sh`. | Lancer `./scripts/update-all.sh` → aucune erreur, un nouveau commit apparaît sur Gitea (si configuré). |
| **18** | **Tests d’intégration de base** | - Vérifier que `/api/stats?hero=boris` retourne des chiffres non nuls.<br>- Vérifier que `/app/boris` affiche le DPS théorique ≠ 0 lorsqu’on sélectionne au moins un objet.<br>- S’assurer que le worker Dokploy ne produit pas d’erreurs dans les logs Dokploy. | Tous les checks passent sans erreur. |
| **19** | **Documentation rapide** (`README.md`) | Décrire le projet, les étapes de mise en place (`npm i`, `npx prisma migrate dev`, `npm run dev`), comment ajouter un worker Dokploy, où sont les données, comment ajouter un nouveau héros ou objet. | Le README est lisible et utile pour un nouveau développeur. |
| **20** | **Rétroaction & amélioration continue** | Après chaque itération, valider la partie fonctionnelle avec l’utilisateur, puis mettre à jour la mémoire (outil `memory`) avec les décisions prises (ex. « On a choisi SQLite + Prisma pour la persistance légère », « Le scraper héros utilise axios+cheerio avec un délai de 300 ms entre requêtes », « Le worker Dokploy tourne toutes les 6 h »). | Mémoire contient les faits clés pour éviter de devoir redemander. |

## ❓ Points de décision à valider avec l’utilisateur
1. **Fréquence de rafraîchissement** – 6 h est un bon compromis ; voulez‑vous plus fréquent (ex. 1 h) ou moins ?  
2. **Gestion des objets** – Voulez‑vous aussi scraper la liste des objets (équipements, consommables) dès maintenant, ou attendre une étape ultérieure ?  
3. **Niveau de détail de la simulation** – Voulez‑vous inclure les effets d’on‑hit, de lifesteal, de réduction d’armure par pénétration, ou rester au DPS de base uniquement ?  
4. **Déploiement Dokploy** – Avez‑vous déjà une instance Dokploy prête à recevoir ce repo (créez‑y un projet ? ou faut‑il le créer maintenant) ?  
5. **Notifications** – Souhaitez‑vous recevoir un message (Discord/Telegram) quand le worker réussit ou échoue ? (on peut ajouter un appel `send_message` à la fin du script wrapper.)

## ✅ Bonnes pratiques
- Garder un **PLAN.md** à la racine du dépôt permet à tout sous‑agent (Cursor, CLI, etc.) de connaître immédiatement les objectifs et les étapes sans devoir fouiller l’historique de chat.  
- Séparer les données brutes (`data/raw/`) des données traitées (`data/static/` et `data/processed/`) et ignorer le répertoire brute dans `.gitignore` évite de gonfler le dépôt inutilement.  
- Utiliser des scripts indépendants (fetch, normalize, save) facilite le test unitaire et le remplacement éventuel d’une étape (ex. passer de Cheerio à Puppeteer).  
- Le wrapper `update-all.sh` garantit que chaque étape s’exécute dans l’ordre et que seules les modifications réelles déclenchent un commit/push, réduisant les builds inutiles sur Dokploy.  
- Documenter les décisions dans la mémoire persistante (`memory` tool) évite de devoir redemander les mêmes informations à chaque nouvelle session.

## Déploiement Dokploy (référence prod)

| Élément | Valeur |
|---------|--------|
| Image | `ghcr.io/mestryx-dev/predecessor:latest` (CI GitHub Actions) |
| Port conteneur | **3010** (`ENV PORT` + `EXPOSE` dans le Dockerfile) |
| Volume obligatoire | **`/data`** → SQLite `file:/data/prod.db` |
| Variables | `PORT=3010`, `DATABASE_URL=file:/data/prod.db`, `NODE_ENV=production`, `HOSTNAME=0.0.0.0` |
| Permissions | Entrypoint `chown nextjs:nodejs /data` à chaque démarrage (volume Docker souvent root) |

Ne pas committer `.env` prod. Utiliser Dokploy Environment + `application.reload` après changement.

---

**Prochaine action immédiate (à faire maintenant)**  
1. Cloner/initialiser le dépôt (étapes 1‑4 du tableau).  
2. Lancer `npm run dev` pour vérifier que Next.js démarre.  
3. Exécuter le script de fetch des matchs (`npx ts-node scripts/fetchMatches.ts`) afin d’obtenir un premier jeu de données.  
4. Valider que le fichier `data/raw/matches_latest.json` contient bien des matchs (ex. `jq '.[0].playerData[0].heroName'` renvoie un nom de héros).  

Dès que ces étapes seront réussies, je pourrai vous fournir les fichiers complets (scripts, schéma Prisma, routes API, page de simulation) et vous guider pour la mise en place du worker Dokploy.

---
*Plan rédigé directement dans le dépôt pour être visible par les sous‑agents Cursor et servir de référence permanente.*