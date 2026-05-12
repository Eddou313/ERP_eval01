# 📦 Tables des Commandes dans PrestaShop

# 1. ps_orders
Table principale des commandes.

Contient :
- id_order
- id_customer
- id_cart
- id_currency
- current_state
- total_paid
- payment
- date_add

Utilité :
- stocker les commandes clients

Exemple :
| id_order | id_customer | total_paid |
|----------|-------------|------------|
| 1 | 5 | 250000 |

Relation :
order (1) → (N) order_detail  
order (1) → (N) order_history  

---

# 2. ps_order_detail
Détails des produits commandés.

Contient :
- id_order
- id_product
- product_name
- product_quantity
- unit_price_tax_incl

Utilité :
- stocker les produits d’une commande

Exemple :
| id_order | id_product | quantity |
|----------|------------|----------|
| 1 | 15 | 2 |

Relation :
order (1) → (N) order_detail  
product (1) → (N) order_detail  

---

# 3. ps_order_history
Historique des états des commandes.

Contient :
- id_order
- id_order_state
- date_add

Utilité :
- suivre les changements d’état

Exemple :
- Paiement accepté
- En préparation
- Expédié
- Livré

Relation :
order (1) → (N) order_history

---

# 4. ps_order_state
États possibles des commandes.

Contient :
- id_order_state
- color
- paid
- shipped
- delivery

Utilité :
- définir les statuts

Exemple :
| id_order_state | nom |
|----------------|-----|
| 1 | En attente |
| 2 | Paiement accepté |
| 3 | Livré |

Relation :
order_state (1) → (N) order_history

---

# 5. ps_order_state_lang
Traductions des états.

Utilité :
- afficher les états dans plusieurs langues

Exemple :
- Delivered
- Livré

---

# 6. ps_order_invoice
Factures des commandes.

Contient :
- id_order_invoice
- id_order
- total_paid_tax_incl
- number

Utilité :
- générer les factures

Relation :
order (1) → (N) order_invoice

---

# 7. ps_order_invoice_payment
Liaison facture ↔ paiement.

Contient :
- id_order_invoice
- order_reference

Utilité :
- associer les paiements aux factures

---

# 8. ps_order_invoice_tax
Taxes des factures.

Utilité :
- stocker TVA et taxes

Exemple :
TVA 20%

---

# 9. ps_order_payment
Paiements des commandes.

Contient :
- order_reference
- amount
- payment_method
- transaction_id

Utilité :
- stocker les paiements

Exemple :
- PayPal
- Carte bancaire
- Virement

Relation :
order (1) → (N) payment

---

# 10. ps_order_carrier
Livraison des commandes.

Contient :
- id_order
- id_carrier
- tracking_number

Utilité :
- suivre la livraison

Exemple :
- DHL
- FedEx
- Colissimo

Relation :
order (1) → (N) order_carrier

---

# 11. ps_order_cart_rule
Réductions appliquées à la commande.

Contient :
- id_order
- id_cart_rule

Utilité :
- stocker les coupons utilisés

Exemple :
- PROMO10
- BLACKFRIDAY

Relation :
order (N) ↔ (N) cart_rule

---

# 12. ps_order_message
Messages prédéfinis.

Exemple :
- Votre commande est expédiée
- Retard livraison

Utilité :
- communication client

---

# 13. ps_order_message_lang
Traductions des messages.

---

# 14. ps_order_return
Retours produits.

Contient :
- id_order_return
- id_order
- state

Utilité :
- gérer les retours SAV

Exemple :
Produit défectueux

---

# 15. ps_order_return_detail
Produits retournés.

Contient :
- id_order_return
- id_order_detail
- product_quantity

Utilité :
- détails des retours

---

# 16. ps_order_return_state
États des retours.

Exemple :
- Retour accepté
- Retour refusé
- En attente

---

# 17. ps_order_return_state_lang
Traductions des états de retour.

---

# 18. ps_order_slip
Avoirs / remboursements.

Utilité :
- générer un remboursement

Exemple :
- remboursement partiel
- remboursement total

---

# 19. ps_order_slip_detail
Détails des avoirs.

Contient :
- produits remboursés
- quantités

---

# 20. ps_order_detail_tax
Taxes des produits commandés.

Utilité :
- stocker TVA par ligne produit

---

# 21. ps_pscheckout_order
Table du module PayPal Checkout.

Utilité :
- informations commandes PayPal

---

# 22. ps_pscheckout_order_matrice
Table interne du module PayPal Checkout.

Utilité :
- mapping technique PayPal

---

# 🧩 Vue globale

ps_orders
    ↓
    ├── ps_order_detail
    │       └── ps_order_detail_tax
    │
    ├── ps_order_history
    │       └── ps_order_state
    │               └── ps_order_state_lang
    │
    ├── ps_order_invoice
    │       ├── ps_order_invoice_payment
    │       └── ps_order_invoice_tax
    │
    ├── ps_order_payment
    ├── ps_order_carrier
    ├── ps_order_cart_rule
    ├── ps_order_return
    │       ├── ps_order_return_detail
    │       └── ps_order_return_state
    │               └── ps_order_return_state_lang
    │
    ├── ps_order_slip
    │       └── ps_order_slip_detail
    │
    └── ps_order_message
            └── ps_order_message_lang

---

# 🔥 Résumé rapide

| Table | Utilité |
|---|---|
| ps_orders | commande principale |
| ps_order_detail | produits commandés |
| ps_order_history | historique |
| ps_order_state | statuts |
| ps_order_invoice | facture |
| ps_order_payment | paiement |
| ps_order_carrier | livraison |
| ps_order_return | retours |
| ps_order_slip | avoirs/remboursements |
| ps_order_cart_rule | coupons/réductions |

## colonne utile pour new app poour chaque table qui concerne les commande 
# 📦 Colonnes Utiles de ps_orders (PrestaShop)

# 🔥 Colonnes les PLUS importantes

| Colonne | Utilité |
|---|---|
| id_order | identifiant commande |
| reference | référence visible de commande |
| id_customer | client ayant commandé |
| id_cart | panier utilisé |
| current_state | état actuel de la commande |
| payment | méthode de paiement |
| module | module de paiement utilisé |
| total_paid | total payé |
| total_products | total produits HT |
| total_products_wt | total produits TTC |
| total_shipping | frais livraison |
| valid | commande valide ou non |
| date_add | date création |
| date_upd | date modification |

---

# 👤 Colonnes Client / Adresse

| Colonne | Utilité |
|---|---|
| id_customer | client |
| id_address_delivery | adresse livraison |
| id_address_invoice | adresse facturation |
| secure_key | sécurité client/session |

---

# 💰 Colonnes Prix / Totaux

| Colonne | Utilité |
|---|---|
| total_discounts | réductions HT |
| total_discounts_tax_incl | réductions TTC |
| total_discounts_tax_excl | réductions HT |
| total_paid | montant payé |
| total_paid_tax_incl | total TTC |
| total_paid_tax_excl | total HT |
| total_paid_real | montant réellement payé |
| total_products | total produits HT |
| total_products_wt | total produits TTC |
| total_shipping | frais livraison |
| total_shipping_tax_incl | livraison TTC |
| total_shipping_tax_excl | livraison HT |

---

# 🚚 Colonnes Livraison

| Colonne | Utilité |
|---|---|
| id_carrier | transporteur |
| carrier_tax_rate | taxe livraison |
| delivery_number | numéro livraison |
| delivery_date | date livraison |

---

# 🧾 Colonnes Facture

| Colonne | Utilité |
|---|---|
| invoice_number | numéro facture |
| invoice_date | date facture |

---

# 🎁 Colonnes Cadeau / Emballage

| Colonne | Utilité |
|---|---|
| gift | commande cadeau |
| gift_message | message cadeau |
| recyclable | emballage recyclable |
| total_wrapping | coût emballage |

---

# 🌍 Multi-boutique / Langue / Devise

| Colonne | Utilité |
|---|---|
| id_shop | boutique |
| id_shop_group | groupe boutique |
| id_lang | langue |
| id_currency | devise |
| conversion_rate | taux conversion devise |

---

# ⚙️ Colonnes Techniques

| Colonne | Utilité |
|---|---|
| round_mode | mode arrondi |
| round_type | type arrondi |
| mobile_theme | ancien thème mobile |
| note | note admin |
| module | module paiement |

---

# ✅ Colonnes indispensables pour un CRUD commandes

## 📋 Liste commandes
- id_order
- reference
- id_customer
- payment
- total_paid
- current_state
- valid
- date_add

---

## 📄 Détail commande
- id_order
- reference
- payment
- total_paid
- total_shipping
- total_products_wt
- current_state
- id_address_delivery
- id_address_invoice
- invoice_number
- invoice_date
- delivery_date
- note

---

# 🚀 Colonnes souvent utilisées en SQL

## Commandes récentes
```sql
SELECT id_order, reference, total_paid, date_add
FROM ps_orders
ORDER BY date_add DESC;