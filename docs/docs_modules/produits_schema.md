# Schéma des Produits - PrestaShop 8.2.6

## API Resource: `/api/products`

### Champs disponibles

| Champ | Format | Requis | Modifiable | Max | Description |
|---|---|---|---|---|---|
| `id_product` | isUnsignedId | ❌ | ❌ | - | Identifiant unique |
| `id_manufacturer` | isUnsignedId | ❌ | ✅ | - | Fabricant/Marque |
| `id_supplier` | isUnsignedId | ❌ | ✅ | - | Fournisseur |
| `id_category_default` | isUnsignedId | ❌ | ✅ | - | Catégorie par défaut |
| `id_tax_rules_group` | isUnsignedId | ❌ | ✅ | - | Groupe de taxes |
| `reference` | isReference | ❌ | ✅ | 64 | Référence interne (SKU) |
| `supplier_reference` | isReference | ❌ | ✅ | 64 | Référence fournisseur |
| `location` | isString | ❌ | ✅ | 255 | Emplacement en stock |
| `price` | isPrice | ✅ | ✅ | - | Prix public TTC |
| `wholesale_price` | isPrice | ❌ | ✅ | - | Prix achat fournisseur |
| `ecotax` | isPrice | ❌ | ✅ | - | Taxe écologique |
| `weight` | isUnsignedFloat | ❌ | ✅ | - | Poids (kg) |
| `width` | isUnsignedFloat | ❌ | ✅ | - | Largeur (cm) |
| `height` | isUnsignedFloat | ❌ | ✅ | - | Hauteur (cm) |
| `depth` | isUnsignedFloat | ❌ | ✅ | - | Profondeur (cm) |
| `on_sale` | isBool | ❌ | ✅ | - | En promotion |
| `active` | isBool | ❌ | ✅ | - | Produit actif |
| `available_for_order` | isBool | ❌ | ✅ | - | Disponible à la commande |
| `show_price` | isBool | ❌ | ✅ | - | Afficher le prix |
| `visibility` | isProductVisibility | ❌ | ✅ | - | Visibilité (both/catalog/search/none) |
| `is_virtual` | isBool | ❌ | ✅ | - | Produit téléchargeable |
| `quantity` | INT | ❌ | ❌ | - | Quantité stock (lecture seule) |
| `ean13` | isEan13 | ❌ | ✅ | 13 | Code barre EAN13 |
| `isbn` | isIsbn | ❌ | ✅ | 32 | ISBN (livres) |
| `upc` | isUpc | ❌ | ✅ | 12 | Code UPC |
| `mpn` | isMpn | ❌ | ✅ | 40 | Manufacturer Part Number |
| `type` | isString | ❌ | ✅ | - | Type (simple/pack/virtual) |
| `state` | isUnsignedId | ❌ | ✅ | - | État produit |
| `condition` | isGenericName | ❌ | ✅ | - | État (new/used/refurbished) |
| `show_condition` | isBool | ❌ | ✅ | - | Afficher l'état |

### Champs multilingues (ps_product_lang)

| Champ | Format | Modifiable | Max | Description |
|---|---|---|---|---|
| `name` | isCatalogName | ✅ | 128 | Nom du produit |
| `description` | isCleanHtml | ✅ | - | Description HTML complète |
| `description_short` | isCleanHtml | ✅ | - | Description courte |
| `link_rewrite` | isLinkRewrite | ✅ | 128 | URL SEO (slug) |
| `meta_title` | isGenericName | ✅ | 255 | Titre SEO |
| `meta_description` | isGenericName | ✅ | 512 | Description SEO |
| `meta_keywords` | isGenericName | ✅ | 255 | Mots-clés SEO |
| `available_now` | isGenericName | ✅ | 255 | Texte "Disponible" |
| `available_later` | IsGenericName | ✅ | 255 | Texte "Précommande" |

---

## Exemple de réponse GET /api/products/1

```json
{
  "prestashop": {
    "product": {
      "id": "1",
      "id_manufacturer": "2",
      "id_supplier": "3",
      "id_category_default": "5",
      "id_tax_rules_group": "1",
      "type": "simple",
      "reference": "TSHIRT-001",
      "supplier_reference": "SUP-TSHIRT-001",
      "location": "A-10-5",
      "width": "20",
      "height": "30",
      "depth": "5",
      "weight": "0.5",
      "quantity_discount": "0",
      "ean13": "1234567890123",
      "isbn": "",
      "upc": "123456",
      "mpn": "MPN-12345",
      "cache_is_pack": "0",
      "cache_has_attachments": "0",
      "is_virtual": "0",
      "state": "0",
      "on_sale": "1",
      "online_only": "0",
      "ecotax": "0.00",
      "minimal_quantity": "1",
      "low_stock_threshold": "10",
      "low_stock_alert": "0",
      "price": "25.00",
      "wholesale_price": "12.50",
      "unity": "",
      "unit_price_ratio": "0",
      "additional_shipping_cost": "0.00",
      "active": "1",
      "redirect_type": "301",
      "id_type_redirected": "0",
      "available_for_order": "1",
      "available_date": "2026-05-12",
      "show_condition": "0",
      "condition": "new",
      "show_price": "1",
      "indexed": "1",
      "visibility": "both",
      "advanced_stock_management": "0",
      "date_add": "2026-01-01 10:00:00",
      "date_upd": "2026-05-12 15:30:00",
      "pack_stock_type": "0",
      "meta_description": "T-Shirt de qualité supérieure",
      "meta_keywords": "t-shirt,coton,imprimé",
      "meta_title": "T-Shirt Premium",
      "link_rewrite": "t-shirt-premium",
      "name": {
        "language": {
          "@id": "1",
          "#text": "T-Shirt Imprimé Colibri"
        }
      },
      "description": {
        "language": {
          "@id": "1",
          "#text": "<p>Description HTML complète du produit...</p>"
        }
      },
      "description_short": {
        "language": {
          "@id": "1",
          "#text": "Coupe classique, col rond, manches courtes"
        }
      },
      "available_now": {
        "language": {
          "@id": "1",
          "#text": "Disponible à la livraison"
        }
      },
      "available_later": {
        "language": {
          "@id": "1",
          "#text": "Pré-commande"
        }
      }
    }
  }
}
```

---

## Visibilité des produits

| Valeur | Frontend | Recherche | Description |
|---|---|---|---|
| `both` | ✅ Visible | ✅ Trouvable | Produit visible partout |
| `catalog` | ✅ Visible | ❌ Non trouvable | Seulement en navigation |
| `search` | ❌ Caché | ✅ Trouvable | Seulement en recherche |
| `none` | ❌ Caché | ❌ Non trouvable | Produit masqué aux clients |

---

## Types de produits

| Type | Description | Exemple |
|---|---|---|
| `simple` | Produit simple | T-shirt, livre |
| `pack` | Bundle/Ensemble | Ensemble cadeau |
| `virtual` | Téléchargeable | E-book, logiciel |

---

## Conditions

| Condition | Description |
|---|---|
| `new` | Produit neuf |
| `used` | Produit d'occasion |
| `refurbished` | Produit remis à neuf |

---

## Notes importantes

- **`quantity`** est lecture seule, géré via `ps_stock_available`
- **`price`** est TTC (toutes taxes comprises)
- **`link_rewrite`** doit être unique (URL slug)
- **Champs multilingues** nécessitent `id_lang` pour chaque langue
- Les **métadonnées SEO** sont importantes pour le référencement

---
