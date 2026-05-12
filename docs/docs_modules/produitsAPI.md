# PrestaShop 8.2.6 - API Products

Ce document explique l’API des produits dans PrestaShop 8.2.6.

---

# 1. API Products

## Endpoint principal

```bash
/api/products
```

---

# Description

The products.

Cette API permet de gérer les produits de la boutique.

Elle permet :

* créer un produit
* modifier un produit
* supprimer un produit
* récupérer les produits
* gérer les catégories
* gérer les prix
* gérer les variantes
* gérer les images
* gérer les stocks

---

# 2. Méthodes HTTP disponibles

| Méthode | Description            |
| ------- | ---------------------- |
| GET     | récupérer les produits |
| POST    | créer un produit       |
| PUT     | modifier un produit    |
| PATCH   | modifier partiellement |
| DELETE  | supprimer              |
| HEAD    | vérifier disponibilité |

---

# 3. Schémas disponibles

## Schéma vide

```bash
/api/products?schema=blank
```

---

## Schéma synopsis

```bash
/api/products?schema=synopsis
```

Retourne :

* les champs
* les types
* les validations
* les tailles maximales

---

# 4. Table SQL principale

## ps_product

Table principale des produits.

### Colonnes importantes

* id_product
* id_supplier
* id_manufacturer
* id_category_default
* id_shop_default
* reference
* supplier_reference
* location
* width
* height
* depth
* weight
* quantity_discount
* ean13
* isbn
* upc
* mpn
* cache_default_attribute
* price
* wholesale_price
* unity
* unit_price_ratio
* additional_shipping_cost
* active
* available_for_order
* show_price
* visibility
* indexed
* state
* date_add
* date_upd

---

# 5. Traductions produits

## ps_product_lang

Contient les traductions des produits.

### Colonnes importantes

* id_product
* id_shop
* id_lang
* description
* description_short
* link_rewrite
* meta_description
* meta_keywords
* meta_title
* name
* available_now
* available_later

---

# 6. Produits ↔ Catégories

## ps_category_product

Relation entre produits et catégories.

### Colonnes importantes

* id_category
* id_product
* position

---

# 7. Variantes produit

## ps_product_attribute

Variantes / déclinaisons produit.

### Colonnes importantes

* id_product_attribute
* id_product
* reference
* supplier_reference
* location
* wholesale_price
* price
* ecotax
* weight
* default_on

---

## ps_product_attribute_combination

Relation variantes ↔ attributs.

### Colonnes importantes

* id_attribute
* id_product_attribute

---

# 8. Images produit

## ps_image

Images des produits.

### Colonnes importantes

* id_image
* id_product
* position
* cover

---

## ps_image_lang

Légendes des images.

### Colonnes importantes

* id_image
* id_lang
* legend

---

## ps_image_shop

Association image ↔ boutique.

### Colonnes importantes

* id_image
* id_shop
* cover

---

# 9. Stock produit

## ps_stock_available

Stock des produits.

### Colonnes importantes

* id_stock_available
* id_product
* id_product_attribute
* quantity
* physical_quantity
* reserved_quantity
* out_of_stock

---

# 10. Fournisseurs produit

## ps_product_supplier

Relation produit ↔ fournisseur.

### Colonnes importantes

* id_product_supplier
* id_product
* id_product_attribute
* id_supplier
* product_supplier_reference
* id_currency
* product_supplier_price_te

---

# 11. Relations principales

```text
ps_product
    |
    +---- ps_product_lang
    |
    +---- ps_category_product ---- ps_category
    |
    +---- ps_product_attribute
    |             |
    |             +---- ps_product_attribute_combination
    |
    +---- ps_image
    |
    +---- ps_stock_available
    |
    +---- ps_product_supplier
```

---

# 12. Fonctionnement général

Dans PrestaShop :

* un produit peut avoir plusieurs catégories
* un produit peut avoir plusieurs variantes
* un produit peut avoir plusieurs images
* un produit peut avoir plusieurs fournisseurs
* le stock est géré séparément

---

# 13. Exemple XML produit

```xml
<prestashop>
  <product>
    <id_manufacturer>1</id_manufacturer>
    <id_supplier>1</id_supplier>
    <id_category_default>2</id_category_default>
    <price>150.00</price>
    <active>1</active>

    <name>
      <language id="1"><![CDATA[Ordinateur Portable]]></language>
    </name>

    <link_rewrite>
      <language id="1"><![CDATA[ordinateur-portable]]></language>
    </link_rewrite>
  </product>
</prestashop>
```

---

# 14. Exemples API

## Récupérer les produits

```bash
GET /api/products
```

---

## Récupérer un produit

```bash
GET /api/products/1
```

---

## Créer un produit

```bash
POST /api/products
```

---

## Modifier un produit

```bash
PUT /api/products/1
```

---

## Supprimer un produit

```bash
DELETE /api/products/1
```

---

# 15. Table la plus importante

👉 ps_product

Car elle contient les informations principales des produits.

---

# 16. Résumé

| API           | Table principale     |
| ------------- | -------------------- |
| /api/products | ps_product           |
| Traductions   | ps_product_lang      |
| Variantes     | ps_product_attribute |
| Catégories    | ps_category_product  |
| Images        | ps_image             |
| Stock         | ps_stock_available   |
| Fournisseurs  | ps_product_supplier  |
