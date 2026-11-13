# 🏎️ MEDRH 10ème Édition — « PIT STOP & GO ! »
**Atelier : Le Leadership inclusif au service de la performance collective**
- **Animation** : Meriam BEN TANFOUS
- **Visualisation** : Malak DERBEL
- **Événement** : MEDRH 10ème Édition (13 & 14 Novembre 2026 — Hammamet, Salle Kairouan)
- **Partenaire Officiel** : Tunisie Telecom (TT)

---

## 🚀 Fonctionnalités du Jeu (Host + Player en Temps Réel)

1. **Mode Animateur / Projecteur (`?mode=host`)** :
   - **Grille de Départ & QR Code dynamique** : génère automatiquement le QR Code pointant vers l'URL de déploiement Vercel (`?mode=player&room=MEDRH10`).
   - **Feux de Départ F1 & Effets Sonores (Web Audio API)** : séquence de 5 feux rouges + feu vert « PIT STOP... GO ! » synchronisée sur l'écran géant et tous les smartphones, bruit de pistolet pneumatique F1 à chaque idée envoyée, klaxon des stands lors des rotations, et fanfare finale.
   - **Chronomètre F1 configurable** : `5m`, `10m`, `12m`, `15m`, Play/Pause en direct.
   - **Étape 1 — Les 3 Tours & 3 Roues Interactives** :
     - **Stand 1 (Jaune)** : *Inclusion Intergénérationnelle* (3 questions)
     - **Stand 2 (Vert)** : *Expression et Participation à la Prise de Décision* (3 questions)
     - **Stand 3 (Rose)** : *Empowerment et Performance* (3 questions)
     - Vue « 3 Stands en Direct » ou « Zoom Roue Interactive à 3 Rayons » (avec bouton *Spin Pit-Wheel* et bascule vers les planches originales de Malak Derbel).
   - **Rotations Automatiques (Tour 1 → Tour 2 → Tour 3)** :
     - L'**Hôte de table** reste ancré à son Stand sur les 3 tours pour résumer les idées aux nouveaux arrivants et épingler les **Key Findings ⭐**.
     - Les **Voyageurs** sont automatiquement invités à rejoindre leur nouvelle table à chaque changement de tour.
   - **Étape 2 — Restitution Finale (« Share the Key Findings — Pitstop & Go ! »)** :
     - Fresque visuelle *Pitstop & Go !*, synthèse des Key Findings et idées les plus votées (⚡ Boosts), Podium des contributeurs, et **Export Synthèse `.md`** en 1 clic.

2. **Mode Joueur Mobile (`?mode=player`)** :
   - Inscription rapide (Nom, Entreprise, Rôle **Voyageur 🏎️** ou **Hôte de Table 🎙️**, et Stand de départ 1, 2 ou 3).
   - Sélection des 3 questions de la roue, envoi d'idées en direct (+10 pts), et vote **⚡ Boost** (+5 pts) sur les idées des tours précédents.
   - Mode spécial **Hôte de Table** permettant d'épingler directement les **Key Findings ⭐** depuis son smartphone.

3. **Mode Simulation Split-Screen (`?mode=split`)** :
   - Permet de tester simultanément l'écran Animateur à gauche et un smartphone Joueur à droite.

---

## 🛠️ Lancement Local & Déploiement Vercel

### 1. Lancer en local
```bash
npm install
npm run dev
```

### 2. Synchronisation Supabase
- Vos clés `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` sont déjà configurées dans `.env`.
- Le jeu fonctionne **immédiatement sans aucune configuration SQL obligatoire** grâce au moteur **Supabase Realtime Broadcast** intégré.
- Optionnellement, pour activer aussi la sauvegarde en tables PostgreSQL, copiez-collez le fichier [`supabase_schema.sql`](./supabase_schema.sql) dans le **SQL Editor** de votre tableau de bord Supabase.

### 3. Déployer sur Vercel
- Importez ce dossier sur Vercel (ou lancez `npx vercel --prod`).
- Ajoutez les 2 variables d'environnement dans Vercel :
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
