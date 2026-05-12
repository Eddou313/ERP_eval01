# PrestaShop 8.2.5 - Tables Customer (Schema)

Ce document regroupe les tables liées aux clients dans PrestaShop 8.2.5 ainsi que leurs colonnes principales.

---

# 1. ps_customer (table principale)

Table centrale des clients.

## Colonnes

* id_customer
* id_shop_group
* id_shop
* id_gender
* id_default_group
* id_lang
* id_risk
* company
* siret
* ape
* firstname
* lastname
* email
* passwd
* last_passwd_gen
* birthday
* newsletter
* ip_registration_newsletter
* newsletter_date_add
* optin
* website
* outstanding_allow_amount
* show_public_prices
* max_payment_days
* secure_key
* note
* active
* is_guest
* deleted
* date_add
* date_upd
* reset_password_token
* reset_password_validity

---

# 2. ps_customer_group

Table de relation entre clients et groupes.

## Colonnes

* id_customer
* id_group

---

# 3. ps_customer_message

Messages envoyés par les clients (support / SAV).

## Colonnes

* id_customer_message
* id_customer_thread
* id_employee
* message
* file_name
* ip_address
* user_agent
* private
* date_add
* date_upd

---

# 4. ps_customer_message_sync_imap

Synchronisation des emails IMAP vers messages clients.

## Colonnes

* id_customer_message_sync_imap
* server
* port
* username
* password
* encryption
* active

---

# 5. ps_customer_session

Sessions des clients connectés.

## Colonnes (variables selon version)

* id_customer_session
* id_customer
* token
* ip_address
* user_agent
* date_add
* date_upd

---

# 6. ps_customer_thread

Threads de discussion support client.

## Colonnes

* id_customer_thread
* id_shop
* id_lang
* id_contact
* id_customer
* id_order
* id_product
* status
* email
* token
* date_add
* date_upd

---

# 7. ps_mailalert_customer_oos

Alertes de rupture de stock.

## Colonnes

* id_customer
* customer_email
* id_product
* id_product_attribute
* id_shop

---

# 8. ps_pscheckout_customer

Table liée au module de paiement (checkout).

## Colonnes (dépend du module installé)

* id_pscheckout_customer
* id_customer
* payment_method
* payment_data
* date_add
* date_upd

---

# Remarque

Les colonnes peuvent varier légèrement selon :

* modules installés
* overrides
* configuration du shop

Pour une application API, la table la plus importante reste :

👉 ps_customer

---

# 9. Tables liées aux produits

## 9.1 ps_product (table principale produit)

### Colonnes

* id_product
* id_supplier
* id_manufacturer
* id_category_default
* id_shop_default
* id_tax_rules_group
* on_sale
* online_only
* ean13
* isbn
* upc
* mpn
* ecotax
* quantity
* minimal_quantity
* low_stock_threshold
* low_stock_alert
* price
* wholesale_price
* unity
* unit_price_ratio
* additional_shipping_cost
* reference
* supplier_reference
* location
* width
* height
* depth
* weight
* out_of_stock
* customizable
* uploadable_files
* text_fields
* active
* redirect_type
* id_type_redirected
* available_for_order
* available_date
* show_condition
* condition
* show_price
* indexed
* visibility
* cache_is_pack
* cache_has_attachments
* is_virtual
* cache_default_attribute
* date_add
* date_upd

---

## 9.2 ps_product_lang (traductions produit)

### Colonnes

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

## 9.3 ps_product_shop (configuration produit par boutique)

### Colonnes

* id_product
* id_shop
* id_category_default
* id_tax_rules_group
* on_sale
* online_only
* ecotax
* minimal_quantity
* low_stock_threshold
* low_stock_alert
* price
* wholesale_price
* unity
* unit_price_ratio
* additional_shipping_cost
* customizable
* uploadable_files
* text_fields
* active
* redirect_type
* id_type_redirected
* available_for_order
* available_date
* show_condition
* condition
* show_price
* indexed
* visibility
* cache_default_attribute

---

## 9.4 ps_category_product (relation produit ↔ catégorie)

### Colonnes

* id_category
* id_product
* position

---

## 9.5 ps_stock_available (stock produit)

### Colonnes

* id_stock_available
* id_product
* id_product_attribute
* id_shop
* id_shop_group
* quantity
* physical_quantity
* reserved_quantity
* depends_on_stock
* out_of_stock
* location

---

## 9.6 ps_image (images produit)

### Colonnes

* id_image
* id_product
* position
* cover

---

## 9.7 ps_image_lang (traduction image)

### Colonnes

* id_image
* id_lang
* legend

---

## 9.8 ps_feature (caractéristiques produit)

### Colonnes

* id_feature
* position

---

## 9.9 ps_feature_product (relation feature ↔ produit)

### Colonnes

* id_feature
* id_product
* id_feature_value

---

## 9.10 ps_attribute (attributs produit)

### Colonnes

* id_attribute
* id_attribute_group
* color
* position

---

## 9.11 ps_product_attribute (combinaisons produit)

### Colonnes

* id_product_attribute
* id_product
* reference
* supplier_reference
* location
* ean13
* isbn
* upc
* wholesale_price
* price
* ecotax
* quantity
* weight
* unit_price_impact
* default_on
* minimal_quantity
* low_stock_threshold
* low_stock_alert

---

## 9.12 ps_product_attribute_combination

### Colonnes

* id_attribute
* id_product_attribute

---

# 10. Tables utiles pour le panier (Cart)

## 10.1 ps_cart

Table principale des paniers.

### Colonnes

* id_cart
* id_shop_group
* id_shop
* id_carrier
* delivery_option
* id_lang
* id_address_delivery
* id_address_invoice
* id_currency
* id_customer
* id_guest
* secure_key
* recyclable
* gift
* gift_message
* mobile_theme
* allow_seperated_package
* date_add
* date_upd
* checkout_session_data

---

## 10.2 ps_cart_product

Produits présents dans le panier.

### Colonnes

* id_cart
* id_product
* id_address_delivery
* id_shop
* id_product_attribute
* quantity
* date_add

---

## 10.3 ps_cart_rule

Règles de panier / coupons / promotions.

### Colonnes importantes

* id_cart_rule
* id_customer
* date_from
* date_to
* description
* quantity
* quantity_per_user
* priority
* partial_use
* code
* minimum_amount
* reduction_percent
* reduction_amount
* reduction_tax
* reduction_currency
* reduction_product
* free_shipping
* active
* date_add
* date_upd

---

## 10.4 ps_cart_cart_rule

Relation entre panier et règles de panier.

### Colonnes

* id_cart
* id_cart_rule

---

## 10.5 ps_cart_rule_carrier

Transporteurs autorisés pour une règle panier.

### Colonnes

* id_cart_rule
* id_carrier

---

## 10.6 ps_cart_rule_country

Pays autorisés pour une règle panier.

### Colonnes

* id_cart_rule
* id_country

---

## 10.7 ps_cart_rule_group

Groupes clients autorisés.

### Colonnes

* id_cart_rule
* id_group

---

## 10.8 ps_cart_rule_lang

Traductions des règles panier.

### Colonnes

* id_cart_rule
* id_lang
* name

---

## 10.9 ps_cart_rule_combination

Combinaisons de règles panier.

### Colonnes

* id_cart_rule_1
* id_cart_rule_2

---

## 10.10 ps_cart_rule_product_rule

Règles produit pour promotions.

### Colonnes

* id_product_rule
* id_product_rule_group
* type

---

## 10.11 ps_cart_rule_product_rule_group

Groupes de règles produit.

### Colonnes

* id_product_rule_group
* id_cart_rule
* quantity

---

## 10.12 ps_cart_rule_product_rule_value

Valeurs des règles produit.

### Colonnes

* id_product_rule
* id_item

---

## 10.13 ps_cart_rule_shop

Association règles panier ↔ boutique.

### Colonnes

* id_cart_rule
* id_shop

---

## 10.14 ps_order_cart_rule

Règles panier appliquées à une commande.

### Colonnes

* id_order_cart_rule
* id_order
* id_cart_rule
* id_order_invoice
* name
* value
* value_tax_excl
* free_shipping

---

## 10.15 ps_pscheckout_cart

Table liée au module PrestaShop Checkout.

### Colonnes (variables selon module)

* id_pscheckout_cart
* id_cart
* payment_data
* status
* date_add
* date_upd

---

# Relations principales du panier

```text
ps_cart
   |
   +---- ps_cart_product ---- ps_product
   |
   +---- ps_cart_cart_rule ---- ps_cart_rule
   |
   +---- ps_customer
```

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
