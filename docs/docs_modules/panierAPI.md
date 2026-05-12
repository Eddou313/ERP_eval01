# PrestaShop 8.2.6 - API Carts

Ce document explique les APIs liées aux paniers dans PrestaShop 8.2.6.

---

# 1. API Carts

## Endpoint principal

```bash
/api/carts
```

---

# Description

Customer's carts.

Cette API permet de gérer les paniers des clients.

Elle permet :

* créer un panier
* modifier un panier
* supprimer un panier
* récupérer les paniers
* ajouter des produits
* modifier les quantités

---

# Méthodes HTTP disponibles

| Méthode | Description            |
| ------- | ---------------------- |
| GET     | récupérer les paniers  |
| POST    | créer un panier        |
| PUT     | modifier un panier     |
| PATCH   | modifier partiellement |
| DELETE  | supprimer              |
| HEAD    | vérifier disponibilité |

---

# Schémas disponibles

```bash
/api/carts?schema=blank
/api/carts?schema=synopsis
```

---

# Table SQL principale

## ps_cart

### Colonnes importantes

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

# 2. Table Produits du panier

## ps_cart_product

Contient les produits présents dans les paniers.

### Colonnes importantes

* id_cart
* id_product
* id_product_attribute
* id_address_delivery
* id_shop
* quantity
* date_add

---

# 3. API Cart Rules

## Endpoint principal

```bash
/api/cart_rules
```

---

# Description

Cart rules management.

Cette API permet de gérer :

* coupons
* promotions
* réductions
* livraison gratuite
* règles panier

---

# Méthodes HTTP disponibles

| Méthode | Description                 |
| ------- | --------------------------- |
| GET     | récupérer les règles panier |
| POST    | créer une règle             |
| PUT     | modifier une règle          |
| PATCH   | modifier partiellement      |
| DELETE  | supprimer                   |
| HEAD    | vérifier disponibilité      |

---

# Schémas disponibles

```bash
/api/cart_rules?schema=blank
/api/cart_rules?schema=synopsis
```

---

# Table SQL principale

## ps_cart_rule

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
* free_shipping
* active
* date_add
* date_upd

---

# Tables liées aux règles panier

## ps_cart_cart_rule

Relation panier ↔ règle panier.

### Colonnes

* id_cart
* id_cart_rule

---

## ps_cart_rule_lang

Traductions des règles panier.

### Colonnes

* id_cart_rule
* id_lang
* name

---

## ps_cart_rule_shop

Association règle panier ↔ boutique.

### Colonnes

* id_cart_rule
* id_shop

---

## ps_cart_rule_country

Pays autorisés.

### Colonnes

* id_cart_rule
* id_country

---

## ps_cart_rule_group

Groupes clients autorisés.

### Colonnes

* id_cart_rule
* id_group

---

## ps_cart_rule_carrier

Transporteurs autorisés.

### Colonnes

* id_cart_rule
* id_carrier

---

# 4. API Order Cart Rules

## Endpoint principal

```bash
/api/order_cart_rules
```

---

# Description

The Order cart rules.

Cette API contient les règles panier appliquées à une commande.

---

# Table SQL liée

## ps_order_cart_rule

### Colonnes importantes

* id_order_cart_rule
* id_order
* id_cart_rule
* id_order_invoice
* name
* value
* value_tax_excl
* free_shipping

---

# 5. Relations principales

```text
ps_cart
    |
    +---- ps_cart_product ---- ps_product
    |
    +---- ps_cart_cart_rule ---- ps_cart_rule
    |
    +---- ps_customer

ps_orders
    |
    +---- ps_order_cart_rule
```

---

# 6. Fonctionnement général

Lorsqu’un client ajoute des produits :

* un panier est créé
* les produits sont enregistrés dans ps_cart_product
* les promotions peuvent être appliquées
* des règles panier peuvent être ajoutées

Quand la commande est validée :

* une commande est créée
* les promotions deviennent des order_cart_rules

---

# 7. Exemple XML panier

```xml
<prestashop>
  <cart>
    <id_currency>1</id_currency>
    <id_lang>1</id_lang>
    <id_customer>1</id_customer>

    <associations>
      <cart_rows>
        <cart_row>
          <id_product>2</id_product>
          <id_product_attribute>0</id_product_attribute>
          <quantity>3</quantity>
        </cart_row>
      </cart_rows>
    </associations>
  </cart>
</prestashop>
```

---

# 8. Exemples API

## Récupérer les paniers

```bash
GET /api/carts
```

---

## Créer un panier

```bash
POST /api/carts
```

---

## Modifier un panier

```bash
PUT /api/carts/1
```

---

## Récupérer les règles panier

```bash
GET /api/cart_rules
```

---

## Créer une règle panier

```bash
POST /api/cart_rules
```

---

# 9. Résumé

| API                   | Table principale   |
| --------------------- | ------------------ |
| /api/carts            | ps_cart            |
| /api/cart_rules       | ps_cart_rule       |
| /api/order_cart_rules | ps_order_cart_rule |
