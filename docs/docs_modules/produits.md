## les tables utiliiser
## product
``
- id_product 
- id_supplier
- id_manufacturer 
- id_category_default 
- id_shop_default
- id_tax_rules_group
- on_sale 
- online_only
- ean13
- isbn
- upc
- mpn
- ecotax
- quantity
- minimal_quantity 
- low_stock_threshold 
- low_stock_alert 
- price 
- wholesale_price 
- unity 
- unit_price 
- unit_price_ratio
- additional_shipping_cost
- reference 
- supplier_reference
- location
- width
- height
- depth
- weight
- out_of_stock 
- additional_delivery_times 
- quantity_discount
- customizable
- uploadable_files
- text_fields
- active 
- redirect_type
- id_type_redirected
- available_for_order 
- available_date 
- show_condition
- condition
- show_price 
- indexed
- visibility 
- cache_is_pack
- cache_has_attachments
- is_virtual
- cache_default_attribute
- date_add 
- date_upd 
- advanced_stock_management
- pack_stock_type
- state
- product_type 
``
## product- lang
``
- id_product
- id_shop
- id_lang
- description 
- description_short 
- link_rewrite 
- meta_description 
- meta_keywords 
- meta_title 
- name 
- available_now 
- available_later 
- delivery_in_stock
- delivery_out_stock
``
## produit <-> category 
``
- id_category
- id_product
- position

``


# Documentation des tables Produits dans PrestaShop 8.2.6

# 1. `ps_product`

Table principale des produits.

Chaque ligne représente un produit.

Exemple :
- T-shirt
- Téléphone
- Chaussure
- Ordinateur

---

## Colonnes importantes

| Colonne | Description |
|---|---|
| `id_product` | ID unique du produit |
| `id_supplier` | Fournisseur |
| `id_manufacturer` | Fabricant |
| `id_category_default` | Catégorie par défaut |
| `price` | Prix HT |
| `reference` | Référence produit |
| `quantity` | Stock |
| `active` | Produit actif |
| `date_add` | Date création |
| `date_upd` | Dernière modification |

---

# 2. `ps_product_lang`

Contient les traductions des produits.

Exemple :

| id_product | id_lang | name |
|---|---|---|
| 1 | 1 | Shoes |
| 1 | 2 | Chaussures |

---

## Colonnes importantes

| Colonne | Description |
|---|---|
| `name` | Nom du produit |
| `description` | Description complète HTML |
| `description_short` | Petite description |
| `link_rewrite` | URL SEO |
| `meta_title` | Titre SEO |
| `meta_description` | Description SEO |

---

# 3. `ps_product_shop`

Association produit ↔ boutique.

Utilisé pour le multiboutique.

Permet :
- prix différents
- activation différente
- visibilité différente

---

# 4. `ps_category_product`

Association produit ↔ catégorie.

Exemple :

| id_product | id_category |
|---|---|
| 10 | 2 |
| 10 | 5 |

Le produit appartient à plusieurs catégories.

---

# 5. `ps_product_attribute`

Table des déclinaisons produit.

Exemple :
- Taille S
- Taille M
- Couleur Rouge
- Couleur Bleu

Chaque combinaison est une déclinaison.

---

## Exemple

Produit :
- T-shirt

Déclinaisons :
- Rouge + M
- Rouge + L
- Bleu + M

---

## Colonnes importantes

| Colonne | Description |
|---|---|
| `id_product_attribute` | ID déclinaison |
| `id_product` | Produit lié |
| `reference` | Référence déclinaison |
| `price` | Impact prix |
| `weight` | Impact poids |

---

# 6. `ps_product_attribute_combination`

Association :
- déclinaison
↔ attributs

Exemple :

| id_product_attribute | id_attribute |
|---|---|
| 12 | Rouge |
| 12 | Taille M |

---

# 7. `ps_product_attribute_image`

Association :
- déclinaison
↔ images

Exemple :
- image rouge pour produit rouge
- image bleue pour produit bleu

---

# 8. `ps_product_attribute_lang`

Traductions des déclinaisons.

---

# 9. `ps_product_attribute_shop`

Association déclinaison ↔ boutique.

---

# 10. `ps_feature_product`

Association :
- produit
↔ caractéristiques

Exemple :
- RAM : 16Go
- CPU : i7
- Matière : Coton

---

# 11. `ps_product_supplier`

Association :
- produit
↔ fournisseur

Un produit peut avoir plusieurs fournisseurs.

---

# 12. `ps_product_attachment`

Fichiers joints du produit.

Exemple :
- PDF
- Notice
- Manuel utilisateur

---

# 13. `ps_product_download`

Utilisé pour les produits téléchargeables.

Exemple :
- ebook
- logiciel
- musique

Contient :
- chemin fichier
- nombre téléchargements
- date expiration

---

# 14. `ps_product_carrier`

Association :
- produit
↔ transporteur

Permet de limiter certains transporteurs.

Exemple :
- DHL uniquement
- UPS uniquement

---

# 15. `ps_product_country_tax`

Taxes par pays.

Permet :
- TVA différente selon pays

---

# 16. `ps_product_sale`

Statistiques de ventes.

Exemple :

| id_product | quantity |
|---|---|
| 10 | 250 |

Utilisé pour :
- meilleures ventes
- statistiques

---

# 17. `ps_product_group_reduction_cache`

Cache des réductions groupe client.

Exemple :
- VIP : -20%
- Revendeur : -30%

---

# 18. `ps_product_tag`

Tags des produits.

Exemple :
- sport
- gaming
- fashion

---

# 19. `ps_cart_product`

Produits présents dans les paniers.

Exemple :

| id_cart | id_product | quantity |
|---|---|---|
| 5 | 10 | 2 |

---

# 20. `ps_cart_rule_product_rule`

Règles panier liées aux produits.

Utilisé pour :
- promotions
- coupons
- restrictions

Exemple :
- réduction si produit X acheté

---

# 21. `ps_cart_rule_product_rule_group`

Groupes de règles panier.

Permet de combiner plusieurs règles.

---

# 22. `ps_cart_rule_product_rule_value`

Valeurs des règles panier.

Exemple :
- catégories autorisées
- produits concernés

---

# 23. `ps_layered_product_attribute`

Utilisé par :
- navigation à facettes
- filtres avancés

Exemple :
- filtre couleur
- filtre taille
- filtre marque

Très utilisé dans :
- `ps_facetedsearch`

---

# 24. `ps_product_comment`

Commentaires clients sur produits.

Exemple :
- avis
- note
- commentaire texte

---

# 25. `ps_product_comment_grade`

Notes données aux commentaires.

Exemple :
- utile
- pas utile

---

# 26. `ps_product_comment_report`

Signalements d’avis.

Exemple :
- spam
- contenu abusif

---

# 27. `ps_product_comment_usefulness`

Votes d’utilité sur commentaires.

Exemple :
- 👍 utile
- 👎 inutile

---

# 28. `ps_product_comment_criterion`

Critères de notation.

Exemple :
- Qualité
- Livraison
- Confort

---

# 29. `ps_product_comment_criterion_lang`

Traductions des critères.

---

# 30. `ps_product_comment_criterion_product`

Association :
- critères
↔ produits

---

# 31. `ps_product_comment_criterion_category`

Association :
- critères
↔ catégories

---

# Architecture globale produit

```text
ps_product
    ↓
ps_product_lang
    ↓
ps_category_product
    ↓
ps_category

ps_product_attribute
    ↓
ps_product_attribute_combination

ps_feature_product
ps_product_supplier
ps_product_shop
```

---

## Les colonnes important a retenir 
# Colonnes importantes de `ps_product` — PrestaShop 8.2.6

## Colonnes essentielles pour une API / Application externe

| Colonne | Description | Importance |
|---|---|---|
| `id_product` | ID unique du produit | ⭐⭐⭐⭐⭐ |
| `reference` | Référence / SKU produit | ⭐⭐⭐⭐⭐ |
| `price` | Prix HT | ⭐⭐⭐⭐⭐ |
| `quantity` | Quantité stock | ⭐⭐⭐⭐⭐ |
| `active` | Produit actif ou non | ⭐⭐⭐⭐⭐ |
| `visibility` | Visibilité catalogue/recherche | ⭐⭐⭐⭐⭐ |
| `product_type` | Type produit | ⭐⭐⭐⭐⭐ |
| `id_category_default` | Catégorie principale | ⭐⭐⭐⭐⭐ |
| `date_add` | Date création | ⭐⭐⭐ |
| `date_upd` | Date modification | ⭐⭐⭐ |

---

# Informations produit

| Colonne | Description |
|---|---|
| `id_supplier` | Fournisseur |
| `id_manufacturer` | Fabricant / marque |
| `id_shop_default` | Boutique par défaut |
| `reference` | Référence interne |
| `supplier_reference` | Référence fournisseur |
| `location` | Emplacement stockage |

---

# Prix et vente

| Colonne | Description |
|---|---|
| `price` | Prix HT |
| `wholesale_price` | Prix achat |
| `on_sale` | Produit en promotion |
| `unit_price` | Prix unitaire |
| `unit_price_ratio` | Ratio prix unitaire |
| `ecotax` | Taxe écologique |
| `additional_shipping_cost` | Coût livraison supplémentaire |

---

# Stock

| Colonne | Description |
|---|---|
| `quantity` | Quantité disponible |
| `minimal_quantity` | Quantité minimum achat |
| `out_of_stock` | Gestion rupture stock |
| `low_stock_threshold` | Seuil alerte stock |
| `low_stock_alert` | Alerte faible stock |

---

# Dimensions

| Colonne | Description |
|---|---|
| `width` | Largeur |
| `height` | Hauteur |
| `depth` | Profondeur |
| `weight` | Poids |

---

# Codes produit

| Colonne | Description |
|---|---|
| `ean13` | Code barre EAN13 |
| `isbn` | ISBN livres |
| `upc` | Code UPC |
| `mpn` | Manufacturer Part Number |

---

# Disponibilité

| Colonne | Description |
|---|---|
| `available_for_order` | Disponible à la commande |
| `available_date` | Date disponibilité |
| `online_only` | Vente uniquement en ligne |

---

# Affichage

| Colonne | Description |
|---|---|
| `active` | Produit visible |
| `visibility` | catalog / search / both / none |
| `show_price` | Afficher prix |
| `show_condition` | Afficher état |
| `condition` | new / used / refurbished |

---

# Produit virtuel

| Colonne | Description |
|---|---|
| `is_virtual` | Produit téléchargeable |
| `uploadable_files` | Nombre fichiers upload |
| `text_fields` | Champs texte personnalisés |

---

# SEO et redirection

| Colonne | Description |
|---|---|
| `redirect_type` | Type redirection |
| `id_type_redirected` | Produit redirigé |

---

# Techniques internes

| Colonne | Description |
|---|---|
| `indexed` | Index moteur recherche |
| `cache_is_pack` | Cache produit pack |
| `cache_has_attachments` | Cache pièces jointes |
| `cache_default_attribute` | Cache déclinaison défaut |
| `advanced_stock_management` | Gestion avancée stock |
| `pack_stock_type` | Gestion stock packs |
| `state` | État interne |

---

# Colonnes les PLUS importantes pour une App React / Mobile / API

```text
id_product
reference
price
quantity
active
visibility
product_type
id_category_default
date_upd
```

---

# Colonnes importantes dans `ps_product_lang`

| Colonne | Description |
|---|---|
| `name` | Nom produit |
| `description` | Description HTML |
| `description_short` | Petite description |
| `link_rewrite` | URL SEO |
| `meta_title` | SEO titre |
| `meta_description` | SEO description |

---

# Colonnes importantes dans `ps_stock_available`

| Colonne | Description |
|---|---|
| `id_product` | Produit |
| `quantity` | Stock réel |
| `physical_quantity` | Stock physique |
| `reserved_quantity` | Stock réservé |

---

# Recommandation API moderne

## Tables principales à utiliser

| Table | Utilité |
|---|---|
| `ps_product` | Données produit |
| `ps_product_lang` | Traductions |
| `ps_stock_available` | Stock réel |
| `ps_image` | Images |
| `ps_category_product` | Catégories |
| `ps_product_attribute` | Déclinaisons |
| `ps_specific_price` | Promotions |

---
