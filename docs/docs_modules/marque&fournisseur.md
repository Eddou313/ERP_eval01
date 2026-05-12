#  Tables Marques et Fournisseurs

## 11.1 ps_manufacturer

Table principale des marques.

### Colonnes

* id_manufacturer
* name
* date_add
* date_upd
* active

---

## 11.2 ps_manufacturer_lang

Traductions des marques.

### Colonnes

* id_manufacturer
* id_lang
* description
* short_description
* meta_title
* meta_keywords
* meta_description

---

## 11.3 ps_manufacturer_shop

Association marque ↔ boutique.

### Colonnes

* id_manufacturer
* id_shop

---

# Fournisseurs

## 11.4 ps_product_supplier

Relation produit ↔ fournisseur.

### Colonnes

* id_product_supplier
* id_product
* id_product_attribute
* id_supplier
* product_supplier_reference
* id_currency
* product_supplier_price_te

---

# Relations

```text
ps_manufacturer
      |
      +---- ps_product

ps_product
      |
      +---- ps_product_supplier
```

---

# Utilisation

## Marques

Les marques servent à :

* classifier les produits
* afficher la marque produit
* filtrer les produits
* créer des pages marque

---

## Fournisseurs

Les fournisseurs servent à :

* stocker les références fournisseur
* stocker le prix fournisseur
* gérer les variantes fournisseur
* relier les produits aux fournisseurs

---

# Résumé

Les tables principales produit dans PrestaShop 8.2.5 sont :

* ps_product
* ps_product_lang
* ps_product_shop
* ps_category_product
* ps_stock_available
* ps_image
* ps_feature
* ps_attribute
* ps_product_attribute

Ces tables sont essentielles pour gérer :

* catalogue produit
* stock
* variantes
* images
* catégories
* caractéristiques
