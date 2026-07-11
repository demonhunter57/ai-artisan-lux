# AI-Artisan Lux — Guide de démarrage

## Prérequis
- Node.js 18+ installé
- Une clé API Anthropic (Claude)

## Installation

### 1. Installer les dépendances
```bash
cd "devis facturation ia"
npm install
```

### 2. Configurer la clé API
```bash
# Copier le fichier exemple
cp .env.local.example .env.local

# Éditer .env.local et remplacer par votre vraie clé
# ANTHROPIC_API_KEY=sk-ant-api03-VOTRE_VRAIE_CLE
```

Obtenez votre clé sur : https://console.anthropic.com/

### 3. Lancer l'application
```bash
npm run dev
```

Ouvrir : http://localhost:3000

---

## Profil artisan fictif (tests)
Le profil **Weber Constructions S.à r.l.** est pré-configuré dans `data/artisan-profile.json`.

Pour utiliser votre propre profil, modifiez ce fichier.

---

## Structure du projet
```
├── app/
│   ├── page.tsx              # Page principale (chat)
│   ├── layout.tsx            # Layout racine
│   └── api/
│       ├── chat/route.ts     # API Claude (traitement des messages)
│       └── pdf/route.ts      # API génération PDF
├── components/
│   ├── ChatInterface.tsx     # Interface de chat
│   ├── DevisPreview.tsx      # Panneau aperçu du devis
│   └── PdfDocument.tsx       # Template PDF Luxembourg
├── lib/
│   ├── types.ts              # Types TypeScript
│   └── i18n.ts               # Traductions FR/EN/LB
└── data/
    └── artisan-profile.json  # Profil artisan (à personnaliser)
```

---

## Exemple d'utilisation (chat)
```
"Pour le client Müller Jean, 15 Rue des Roses L-3456 Dudelange,
 pose de 25m² de carrelage à 48€/m² et 6 heures de main d'oeuvre
 à 55€/h. Il s'agit de la rénovation de sa cuisine."
```

L'IA va :
1. Extraire le client, les articles et les prix
2. Demander si c'est un logement principal (taux 3%)
3. Afficher l'aperçu du devis
4. Générer le PDF sur demande

---

## TVA Luxembourg
| Taux | Application |
|------|-------------|
| 17%  | Taux normal — travaux neufs, services standard |
| 14%  | Taux intermédiaire |
| 8%   | Taux réduit |
| **3%** | **Rénovation logement habitation principale** |
