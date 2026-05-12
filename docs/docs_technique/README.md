# Docs technique — PrestaShop 8.2.6 (édition Classic)

Ce dossier regroupe une documentation technique « orientée projet » pour cette instance PrestaShop 8.2.6.

## Sommaire

- [01 — Déroulement (cycle d’une requête)](./01-deroulement.md)
- [02 — Architecture (dossiers, couches, FO/BO)](./02-architecture.md)
- [03 — Endpoints & routing (FO/BO/API/Webservice)](./03-endpoints.md)
- [04 — Modules (quoi de chaque module)](./04-modules.md)

## Conventions utilisées

- **FO (Front-Office)** : la boutique publique (catalogue, panier, commande…), rendue majoritairement via **Smarty** et les thèmes dans `themes/`.
- **BO (Back-Office)** : l’administration (gestion catalogue, commandes…), rendue via **Symfony + Twig** et des écrans legacy selon les pages.
- **Legacy** : l’architecture historique PrestaShop (Dispatcher, controllers legacy, classes Core).
- **Symfony** : la couche moderne (kernel, routing, services, controllers Symfony).

## Points d’entrée (high level)

- **Front-Office** : `index.php` → `config/config.inc.php` → `Dispatcher::dispatch()`.
- **Back-Office** : `admin*/index.php` → `AppKernel` (Symfony) puis fallback legacy si nécessaire.
- **Webservice (API historique)** : URL `/api/...` (rewrite) → `webservice/dispatcher.php`.
- **Nouvelle API (ApiPlatform, expérimental)** : sous `/admin*/new-api/...` (base path `'/new-api'`).
