# PrestaShop 8.2.6 - API Manufacturers and Suppliers

Ce document explique les APIs liées aux marques et fournisseurs dans PrestaShop 8.2.6.

---

# 1. API Manufacturers

## Endpoint principal

```bash
/api/manufacturers
```

---

# Description

The product brands.

Cette API permet de gérer les marques des produits.

Elle permet :

* créer une marque
* modifier une marque
* supprimer une marque
* récupérer les marques

---

# Méthodes HTTP disponibles

| Méthode | Description            |
| ------- | ---------------------- |
| GET     | récupérer les marques  |
| POST    | créer une marque       |
| PUT     | modifier une marque    |
| PATCH   | modifier partiellement |
| DELETE  | supprimer              |
| HEAD    | vérifier disponibilité |

---

# Schémas disponibles

```bash
/api/manufacturers?schema=blank
/api/manufacturers?schema=synopsis
```

---

# Tables SQL liées

## ps_manufacturer

Table principale des marques.

### Colonnes importantes

* id_manufacturer
* name
* date_add
* date_upd
* active

---

## ps_manufacturer_lang

Traductions des marques.

### Colonnes importantes

* id_manufacturer
* id_lang
* description
* short_description
* meta_title
* meta_keywords
* meta_description

---

## ps_manufacturer_shop

Association marque ↔ boutique.

### Colonnes importantes

* id_manufacturer
* id_shop

---

# 2. API Suppliers

## Endpoint principal

```bash
/api/suppliers
```

---

# Description

The product suppliers.

Cette API permet de gérer les fournisseurs des produits.

Elle permet :

* créer un fournisseur
* modifier un fournisseur
* supprimer un fournisseur
* récupérer les fournisseurs

---

# Méthodes HTTP disponibles

| Méthode | Description                |
| ------- | -------------------------- |
| GET     | récupérer les fournisseurs |
| POST    | créer un fournisseur       |
| PUT     | modifier un fournisseur    |
| PATCH   | modifier partiellement     |
| DELETE  | supprimer                  |
| HEAD    | vérifier disponibilité     |

---

# Schémas disponibles

```bash
/api/suppliers?schema=blank
/api/suppliers?schema=synopsis
```

---

# Tables SQL liées

## ps_supplier

Table principale des fournisseurs.

### Colonnes importantes

* id_supplier
* name
* active
* date_add
* date_upd

---

## ps_supplier_lang

Traductions des fournisseurs.

### Colonnes importantes

* id_supplier
* id_lang
* description
* meta_title
* meta_keywords
* meta_description

---

## ps_supplier_shop

Association fournisseur ↔ boutique.

### Colonnes importantes

* id_supplier
* id_shop

---

# 3. API Product Suppliers

## Endpoint principal

```bash
/api/product_suppliers
```

---

# Description

Product Suppliers.

Cette API permet de gérer la relation entre les produits et les fournisseurs.

---

# Méthodes HTTP disponibles

| Méthode | Description                                   |
| ------- | --------------------------------------------- |
| GET     | récupérer les relations produit ↔ fournisseur |
| POST    | créer une relation                            |
| PUT     | modifier une relation                         |
| PATCH   | modifier partiellement                        |
| DELETE  | supprimer                                     |
| HEAD    | vérifier disponibilité                        |

---

# Schémas disponibles

```bash
/api/product_suppliers?schema=blank
/api/product_suppliers?schema=synopsis
```

---

# Table SQL liée

## ps_product_supplier

### Colonnes importantes

* id_product_supplier
* id_product
* id_product_attribute
* id_supplier
* product_supplier_reference
* id_currency
* product_supplier_price_te

---

# 4. Relations principales

```text
ps_manufacturer
      |
      +---- ps_product

ps_supplier
      |
      +---- ps_product_supplier ---- ps_product
```

---

# 5. Fonctionnement général

## Marques

Les marques servent à :

* classifier les produits
* afficher les marques produit
* filtrer les produits
* créer des pages marques

Exemples :

* Apple
* Samsung
* Nike

---

## Fournisseurs

Les fournisseurs servent à :

* gérer les achats produits
* stocker les références fournisseur
* stocker les prix fournisseur
* relier les produits aux fournisseurs

---

# 6. Exemples API

## Récupérer toutes les marques

```bash
GET /api/manufacturers
```

---

## Récupérer tous les fournisseurs

```bash
GET /api/suppliers
```

---

## Récupérer les relations produit ↔ fournisseur

```bash
GET /api/product_suppliers
```

---

## Créer une marque

```bash
POST /api/manufacturers
```

---

## Créer un fournisseur

```bash
POST /api/suppliers
```

---

# 7. Résumé

| API                    | Table principale    |
| ---------------------- | ------------------- |
| /api/manufacturers     | ps_manufacturer     |
| /api/suppliers         | ps_supplier         |
| /api/product_suppliers | ps_product_supplier |
