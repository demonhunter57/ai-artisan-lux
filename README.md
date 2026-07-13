# AI-Artisan Lux

Application de génération de devis et factures par chat IA pour les artisans du bâtiment au Luxembourg.

## Fonctionnalités

- **Chat IA** — Décrivez vos travaux en langage naturel, l'IA extrait automatiquement le client, les articles, les quantités et les prix
- **TVA Luxembourg** — Gestion des taux 3%, 8%, 14%, 17% avec détection automatique du taux super-réduit pour la rénovation
- **PDF professionnel** — Génération de documents aux normes luxembourgeoises avec toutes les mentions légales obligatoires
- **Multilingue** — Interface en Français, Anglais et Lëtzebuergesch

## Mentions légales intégrées

Chaque document PDF inclut automatiquement :
- Numéro de TVA (format `LUXXXXXXXX`)
- Numéro de Matricule (11 chiffres)
- Numéro RCS
- Autorisation d'établissement
- Informations de paiement (IBAN / BIC)

## Stack technique

- **Next.js 14** — App Router + TypeScript
- **Claude (Anthropic)** — Traitement du langage naturel
- **@react-pdf/renderer** — Génération PDF côté serveur
- **Tailwind CSS** — Interface utilisateur

## Installation

```bash
# 1. Cloner le projet
git clone https://github.com/demonhunter57/ai-artisan-lux.git
cd ai-artisan-lux

# 2. Installer les dépendances
npm install

# 3. Configurer la clé API
cp .env.local.example .env.local
# Éditer .env.local et ajouter votre clé Anthropic

# 4. Lancer l'application
npm run dev
```

Ouvrir **http://localhost:3003**

## Configuration

Éditez `data/artisan-profile.json` pour configurer votre profil artisan :

```json
{
  "company": "Votre Entreprise S.à r.l.",
  "tvaNumber": "LUXXXXXXXX",
  "matricule": "XXXXXXXXXXX",
  "rcs": "B XXXXXX",
  "autorisation": "XXXXXXXX"
}
```

## Taux de TVA Luxembourg

| Taux | Application |
|------|-------------|
| 17% | Taux normal — travaux neufs, services standard |
| 14% | Taux intermédiaire |
| 8%  | Taux réduit |
| **3%** | **Rénovation logement habitation principale** |

## Exemple d'utilisation

```
"Pour le client Müller Jean, 15 Rue des Roses L-3456 Dudelange,
pose de 25m² de carrelage à 48€/m² et 6h de main d'œuvre à 55€/h"
```

L'IA extrait les données, demande le taux de TVA applicable et génère le PDF.

## Licence

MIT
