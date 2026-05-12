# PrestaShop 8.2.6 - API Categories

Ce document explique l’API des catégories dans PrestaShop 8.2.6.

---

# 1. API Categories

## Endpoint principal

```bash
/api/categories
```

---

# Description

The product categories.

Cette API permet de gérer les catégories des produits dans PrestaShop.

Elle permet :

* créer une catégorie
* modifier une catégorie
* supprimer une catégorie
* récupérer les catégories
* organiser l’arborescence des catégories

---

# 2. Méthodes HTTP disponibles

| Méthode | Description                           |
| ------- | ------------------------------------- |
| GET     | récupérer une ou plusieurs catégories |
| POST    | créer une catégorie                   |
| PUT     | modifier complètement une catégorie   |
| PATCH   | modifier partiellement une catégorie  |
| DELETE  | supprimer une catégorie               |
| HEAD    | vérifier la disponibilité             |

---

# 3. Schémas disponibles

## Schéma vide

```bash
/api/categories?schema=blank
```

Retourne la structure XML vide.

---

## Schéma synopsis

```bash
/api/categories?schema=synopsis
```

Retourne :

* les champs
* les types
* les validations
* les tailles maximales

---

# 4. Table SQL principale

## ps_category

Table principale des catégories.

### Colonnes importantes

* id_category
* id_parent
* id_shop_default
* level_depth
* nleft
* nright
* active
* date_add
* date_upd
* position
* is_root_category

---

# 5. Table traduction

## ps_category_lang

Contient les traductions des catégories.

### Colonnes importantes

* id_category
* id_shop
* id_lang
* name
* description
* link_rewrite
* meta_title
* meta_keywords
* meta_description

---

# 6. Table relation produit ↔ catégorie

## ps_category_product

Relation entre produits et catégories.

### Colonnes

* id_category
* id_product
* position

---

# 7. Relations principales

```text
ps_category
      |
      +---- ps_category_lang
      |
      +---- ps_category_product ---- ps_product
```

---

# 8. Fonctionnement des catégories

Dans PrestaShop :

* une catégorie peut avoir une catégorie parent
* une catégorie peut contenir plusieurs produits
* un produit peut appartenir à plusieurs catégories

---

# 9. Exemple XML catégorie

## Création catégorie

```xml
<prestashop>
  <category>
    <id_parent>2</id_parent>
    <active>1</active>

    <name>
      <language id="1">Informatique</language>
    </name>

    <link_rewrite>
      <language id="1">informatique</language>
    </link_rewrite>
  </category>
</prestashop>
```

---

# 10. Exemples API

## Récupérer toutes les catégories

```bash
GET /api/categories
```

---

## Récupérer une catégorie

```bash
GET /api/categories/3
```

---

## Créer une catégorie

```bash
POST /api/categories
```

---

## Modifier une catégorie

```bash
PUT /api/categories/3
```

---

## Supprimer une catégorie

```bash
DELETE /api/categories/3
```

---

# 11. Colonnes importantes expliquées

| Colonne          | Description                |
| ---------------- | -------------------------- |
| id_parent        | catégorie parent           |
| level_depth      | profondeur dans l’arbre    |
| nleft / nright   | structure arbre catégories |
| active           | catégorie active           |
| position         | ordre affichage            |
| is_root_category | catégorie racine           |

---

# 12. Table la plus importante

👉 ps_category

Car elle contient toute la structure hiérarchique des catégories.

---

# Résumé

| API                 | Table principale    |
| ------------------- | ------------------- |
| /api/categories     | ps_category         |
| Traductions         | ps_category_lang    |
| Produit ↔ catégorie | ps_category_product |
