# 03 — Endpoints & routing (FO/BO/API/Webservice)

Ce document décrit **où se trouvent les routes** et à quoi ressemblent les **endpoints** principaux dans ce projet PrestaShop 8.2.6.

## 1) Front-Office (FO) — routing legacy (Dispatcher)

### Endpoints / URLs typiques

- Contrôleur FO legacy (avec query string) :
  - `index.php?controller=product&id_product=123`
  - `index.php?controller=category&id_category=12`

- Contrôleur FO d’un module :
  - `index.php?fc=module&module=<module>&controller=<controller>`

> En production, avec URL rewriting activé, ces URLs peuvent être “propres” (SEO friendly), mais elles se résolvent toujours vers des contrôleurs via le dispatcher.

### Où sont les contrôleurs

- Cœur FO : `controllers/front/`.
- Modules FO : `modules/<module>/controllers/front/`.
- Overrides modules FO : `override/modules/<module>/controllers/front/`.

## 2) Back-Office (BO) — Symfony d’abord, legacy en fallback

### Point d’entrée

- Toute requête BO passe par `admin*/index.php`.
- Le BO instancie `AppKernel` et essaye de résoudre la route via Symfony.
- En cas de 404 Symfony, le BO bascule sur `Dispatcher` (legacy).

### Routes Symfony BO

Le fichier `app/config/routing.yml` inclut `src/PrestaShopBundle/Resources/config/routing.yml` qui déclare :

- `admin.yml` : routes BO HTML principales.
- `api.yml` avec préfixe `/api` : routes « api-like » du BO.
- ApiPlatform (type `api_platform`) avec préfixe `%api_base_path%`.

**Attention aux chemins réels** :

- Le préfixe `/api` et `'/new-api'` sont **dans le contexte BO**.
  - Donc typiquement : `/admin*/api/...`
  - et `/admin*/new-api/...`

### Où trouver les routes

- Routing principal : `src/PrestaShopBundle/Resources/config/routing.yml`.
- Détails admin : `src/PrestaShopBundle/Resources/config/routing/admin.yml`.
- API-like BO : `src/PrestaShopBundle/Resources/config/routing/api.yml`.
- Modules (Symfony) : `modules/<module>/config/routing.yml` (chargé via `type: module`).

### Lister les routes (pratique)

Depuis la racine du projet :

- `php bin/console debug:router` (liste les routes Symfony)
- `php bin/console router:match "/admin-path"` (teste une URL)

> Selon l’instance, il peut être nécessaire d’avoir un `app/config/parameters.*` valide et les caches OK.

## 3) Webservice historique — `/api/...` (racine)

### Rewrite

Le `.htaccess` racine contient une règle du type :

- `^api/...` → `webservice/dispatcher.php?url=...`

### Endpoint

- Base URL : `/api` (à la racine, pas dans `admin*/`).
- Authentification : `ws_key` (Basic Auth ou paramètre GET).
- Formats : XML/JSON selon paramètres.

### Code

- Entrée : `webservice/dispatcher.php`.

## 4) Nouvelle API ApiPlatform — `/admin*/new-api/...`

- Base path : `PrestaShopBundle\Api\Api::API_BASE_PATH = '/new-api'`.
- Routing déclaré via ApiPlatform (voir `app/config/config.yml` + mapping `app/config/api_platform`).
- C’est une API “Symfony/ApiPlatform”, distincte du webservice `/api` historique.

## 5) Résumé rapide (ne pas confondre)

- `/api/...` **(racine)** → Webservice historique → `webservice/dispatcher.php`
- `/admin*/api/...` **(BO)** → routes Symfony “api-like”
- `/admin*/new-api/...` **(BO)** → ApiPlatform (nouvelle API)

---

Si tu veux une cartographie plus exhaustive (liste des routes Symfony + ressources ApiPlatform), je peux générer un export depuis `bin/console debug:router` et l’ajouter ici en annexe.
