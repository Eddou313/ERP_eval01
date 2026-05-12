# 01 — Déroulement (cycle d’une requête)

Ce document décrit le chemin « réel » d’une requête HTTP dans ce projet PrestaShop 8.2.6.

## 1) Déroulement d’une requête Front-Office (FO)

### Point d’entrée

1. Le serveur web arrive sur `index.php` (racine).
2. `index.php` inclut `config/config.inc.php`.
3. `Dispatcher::getInstance()->dispatch()` route la requête vers un contrôleur.

### Initialisation (dans `config/config.inc.php`)

L’inclusion de `config/config.inc.php` déclenche notamment :

- chargement des *defines* (`config/defines*.inc.php`) et du bootstrap (`config/bootstrap.php`),
- création du `Context` (shop, langue, cookie/session…),
- initialisation Smarty (`config/smarty.config.inc.php`),
- chargement des paramètres (`app/config/parameters.yml|php`) si l’instance est installée.

### Dispatch / exécution

Le `Dispatcher`:

- détermine un contrôleur courant (`controller`, routes réécrites, fallback `index`),
- exécute des hooks autour du dispatch (ex: `actionDispatcherBefore`, `actionDispatcher`, `actionDispatcherAfter`),
- instancie le contrôleur (hérite typiquement de `FrontController` ou d’un contrôleur module),
- appelle `run()` qui gère `init()`, `postProcess()`, `initContent()`, puis rendu.

### Rendu

- Le thème (par défaut `classic`) fournit les templates FO dans `themes/classic/`.
- Smarty compile et met en cache (dossiers de cache sous `var/` et `cache/` selon configuration).

## 2) Déroulement d’une requête FO « module »

Deux cas fréquents :

- **Module front controller** : route typique `index.php?fc=module&module=<module>&controller=<controller>`.
  - Le dispatcher charge `modules/<module>/controllers/front/<controller>.php`.
  - Les overrides éventuels sont dans `override/modules/<module>/controllers/front/`.

- **Hook de rendu** : le module injecte du contenu dans une page via un hook (ex: header, home, product…).
  - Exemple conceptuel : un module s’enregistre sur un hook, puis `Hook::exec()` appelle sa méthode.

## 3) Déroulement d’une requête Back-Office (BO)

### Point d’entrée

1. Le serveur web arrive sur `admin*/index.php` (dossier admin « randomisé »).
2. Ce fichier inclut `../config/config.inc.php` (initialisation legacy).
3. Symfony est démarré via `AppKernel` et traite la requête.

### Symfony d’abord, fallback legacy ensuite

- Le BO essaye de résoudre la route via Symfony.
- Si Symfony ne trouve pas la route (ex: `NotFoundHttpException`), alors le BO bascule sur le dispatcher legacy :
  - `Dispatcher::getInstance()->dispatch()`.

Cela explique pourquoi, dans PrestaShop 8.x, le BO est un mélange **Symfony** (écrans modernisés) + **legacy** (écrans historiques / compat).

### Spécificité « new-api »

- Le BO teste si l’URI contient la base path de la nouvelle API (constante `PrestaShopBundle\Api\Api::API_BASE_PATH`, valeur `'/new-api'`).
- En pratique, ça sert à ajuster la gestion des exceptions (`$catch`) lors du `handle()` Symfony.

## 4) Déroulement de l’API Webservice (API historique)

### Point d’entrée

- Le rewrite Apache de la racine redirige `^api/...` vers `webservice/dispatcher.php?url=...`.
- Le fichier `webservice/dispatcher.php` :
  - définit `_PS_API_IN_USE_`,
  - charge `config/config.inc.php`,
  - récupère la clé **ws_key** soit via Basic Auth (`PHP_AUTH_USER`), soit via `?ws_key=...`,
  - instancie `WebserviceRequest` (ou la classe associée à la clé),
  - exécute `fetch()` et renvoie le contenu (XML/JSON selon paramètres).

### Points importants

- Authentification par **clé Webservice**.
- Les routes webservice sont distinctes du BO Symfony : elles vivent à la racine sous `/api/...`.

## 5) Déroulement d’un cron / script admin

Certains scripts utilitaires existent dans `admin*/` (ex: cron devises, export, import…). Ils réutilisent souvent `config/config.inc.php` puis exécutent une logique spécialisée.

---

Si tu veux, je peux aussi ajouter un document « parcours fonctionnel » (ex: parcours commande : panier → checkout → paiement → confirmation) en me basant sur les contrôleurs FO principaux (`order`, `cart`, `product`, etc.).
