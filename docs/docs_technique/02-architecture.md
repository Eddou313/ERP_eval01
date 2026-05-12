# 02 — Architecture (dossiers, couches, FO/BO)

Ce document décrit l’architecture du projet PrestaShop 8.2.6 (édition Classic), en expliquant **le rôle de chaque dossier / fichier de la racine** et comment le **front** communique avec le **back**.

## 1) Vue d’ensemble (couches)

PrestaShop 8.x mélange deux mondes :

- **Legacy (historique)**
  - Routing via `Dispatcher`.
  - Contrôleurs legacy dans `controllers/`.
  - Domaine métier & services historiques dans `classes/`.
  - Rendu FO majoritairement en **Smarty**.

- **Symfony (moderne, Back-Office + API)**
  - Kernel Symfony dans `app/AppKernel.php`.
  - Code Symfony dans `src/` (bundle PrestaShop).
  - Routing Symfony défini dans `app/config/routing.yml` et `src/PrestaShopBundle/Resources/config/routing*.yml`.
  - Rendu BO majoritairement en **Twig**.

## 2) Racine : rôle des fichiers

- `.htaccess`
  - règles de rewrite FO et **rewrite `/api/...` vers `webservice/dispatcher.php`** (webservice historique).
- `.php-cs-fixer.dist.php`
  - configuration de formatage PHP.
- `autoload.php`
  - bootstrap d’autoload (complète Composer selon contexte PrestaShop).
- `composer.lock`
  - verrou des dépendances PHP (Composer).
- `documentation.md`, `INSTALL.txt`, `Install_PrestaShop.html`
  - documentation / installation.
- `error500.html`
  - page statique d’erreur.
- `index.php`
  - **point d’entrée Front-Office** (inclut `config/config.inc.php` puis `Dispatcher::dispatch()`).
- `init.php`
  - initialise un contrôleur FO dans certains contextes (ex: scripts inclus / legacy).
- `robots.txt`
  - directives robots.
- `Makefile`, `configure_git.sh`, `new_version.sh`
  - scripts utilitaires (développement / release).
- `phpstan.neon.dist`
  - configuration PHPStan.

## 3) Racine : rôle des dossiers

> Remarque : certains dossiers sont « cœur PrestaShop », d’autres sont « instance » (caches, uploads…).

- `admin*/`
  - **Back-Office**. Le nom est randomisé pour la sécurité.
  - Point d’entrée BO : `admin*/index.php`.
  - Contient aussi des scripts (cron, import/export) et des thèmes BO.

- `app/`
  - **Cœur Symfony** (Kernel, config Symfony, compat legacy).
  - `app/config/` contient `parameters.*` (selon installation) + YAML Symfony.

- `bin/`
  - outils CLI Symfony (ex: `bin/console`).

- `cache/` et `var/`
  - caches runtime (Smarty/Twig, container Symfony, etc.).
  - `var/cache/` contient notamment le container Symfony compilé.

- `classes/`
  - **classes cœur legacy** (ObjectModel, Cart, Order, Product, Context, Dispatcher…).

- `config/`
  - bootstrap PrestaShop : defines, autoload, initialisation shop, Smarty, etc.
  - fichier central : `config/config.inc.php`.

- `controllers/`
  - contrôleurs legacy (FO/BO) et endpoints legacy.

- `docs/`
  - documentation (souvent orientée dev/packaging).

- `download/`, `upload/`
  - fichiers téléversés / livrables (selon configuration et modules).

- `img/`, `js/`, `mails/`, `pdf/`, `translations/`
  - assets et ressources (images, JS, emails, PDF, traductions).

- `localization/`
  - données de localisation.

- `modules/`
  - **modules installés** (fonctionnalités additionnelles) : paiement, marketing, stats, etc.

- `override/`
  - surcharges (classes, controllers, modules). À utiliser avec prudence.

- `src/`
  - code Symfony/DDD (Back-Office, API, services modernes). Le bundle principal est `PrestaShopBundle`.

- `templates/`
  - templates partagés (selon versions / composants).

- `themes/`
  - **thèmes Front-Office** (ex: `classic`). Smarty + assets.

- `tools/`
  - outils divers (profiling, libs, scripts).

- `vendor/`
  - dépendances Composer.

- `webservice/`
  - **Webservice historique** (API `/api/...`).

## 4) Communication Frontend ↔ Backend

### Front-Office (FO)

- Le « frontend » FO est majoritairement **SSR** (Server-Side Rendering) : PHP + Smarty.
- Les pages FO appellent le backend via :
  - navigation (GET) vers des contrôleurs FO (legacy dispatcher),
  - AJAX vers des endpoints FO/Modules (selon modules / contrôleurs),
  - Webservice `/api/...` si un service externe est utilisé.

### Back-Office (BO)

- Le BO s’appuie sur **Symfony** pour une grande partie des pages.
- Certaines pages restent en legacy : si la route Symfony n’existe pas, le BO tombe sur `Dispatcher`.
- La « communication front/back » BO côté JS se fait via :
  - routes Symfony retournant du JSON,
  - routes « api-like » sous `/admin*/api/...`,
  - nouvelle API ApiPlatform sous `/admin*/new-api/...`.

## 5) Où sont les “vrais” contrôleurs ?

- FO legacy : `controllers/front/` + `classes/controller/FrontController.php` (héritage) + contrôleurs modules.
- Modules FO : `modules/<module>/controllers/front/`.
- BO legacy : `controllers/admin/` + `admin*/tabs/`.
- BO Symfony : `src/PrestaShopBundle/Controller/Admin/` (et autres sous `src/`).

## 6) Données / DB (résumé)

- Legacy : accès DB via la couche historique (ex: `Db` / ObjectModel).
- Symfony : une partie utilise Doctrine/DBAL (selon composants), mais beaucoup de logique reste « branchée » sur la couche legacy.

---

Ce document est volontairement orienté structure. Pour les URLs / endpoints, voir `03-endpoints.md`.
