# PrestaShop 8.2.6 - API Orders

Ce document explique les APIs liées aux commandes dans PrestaShop 8.2.6.

---

# 1. API Orders

## Endpoint principal

```bash
/api/orders
```

---

# Description

The Customers orders.

Cette API permet de gérer les commandes clients.

---

# Méthodes HTTP disponibles

| Méthode | Description             |
| ------- | ----------------------- |
| GET     | récupérer les commandes |
| POST    | créer une commande      |
| PUT     | modifier une commande   |
| PATCH   | modifier partiellement  |
| DELETE  | supprimer               |
| HEAD    | vérifier disponibilité  |

---

# Schémas disponibles

```bash
/api/orders?schema=blank
/api/orders?schema=synopsis
```

---

# Table SQL principale

## ps_orders

### Colonnes importantes

* id_order
* reference
* id_shop_group
* id_shop
* id_carrier
* id_lang
* id_customer
* id_cart
* id_currency
* id_address_delivery
* id_address_invoice
* current_state
* payment
* total_paid
* total_products
* total_shipping
* conversion_rate
* module
* invoice_number
* delivery_number
* valid
* date_add
* date_upd

---

# 2. API Order Details

## Endpoint

```bash
/api/order_details
```

---

# Description

Details of an order.

Cette API contient les lignes produits des commandes.

---

# Table SQL liée

## ps_order_detail

### Colonnes importantes

* id_order_detail
* id_order
* product_id
* product_attribute_id
* product_name
* product_quantity
* product_price
* total_price_tax_incl
* total_price_tax_excl

---

# 3. API Order Histories

## Endpoint

```bash
/api/order_histories
```

---

# Description

The Order histories.

Historique des changements de statut des commandes.

---

# Table SQL liée

## ps_order_history

### Colonnes importantes

* id_order_history
* id_employee
* id_order
* id_order_state
* date_add

---

# 4. API Order States

## Endpoint

```bash
/api/order_states
```

---

# Description

The Order statuses.

Gestion des statuts de commande.

---

# Tables SQL liées

## ps_order_state

### Colonnes importantes

* id_order_state
* invoice
* send_email
* module_name
* color
* hidden
* delivery
* shipped
* paid
* deleted

---

## ps_order_state_lang

### Colonnes importantes

* id_order_state
* id_lang
* name
* template

---

# 5. API Order Payments

## Endpoint

```bash
/api/order_payments
```

---

# Description

The Order payments.

Gestion des paiements des commandes.

---

# Table SQL liée

## ps_order_payment

### Colonnes importantes

* id_order_payment
* order_reference
* id_currency
* amount
* payment_method
* transaction_id
* card_number
* card_brand
* card_expiration
* card_holder
* date_add

---

# 6. API Order Invoices

## Endpoint

```bash
/api/order_invoices
```

---

# Description

The Order invoices.

Gestion des factures des commandes.

---

# Table SQL liée

## ps_order_invoice

### Colonnes importantes

* id_order_invoice
* id_order
* number
* delivery_number
* total_paid_tax_incl
* total_paid_tax_excl
* total_products
* total_shipping_tax_incl
* total_shipping_tax_excl
* date_add

---

# 7. API Order Carriers

## Endpoint

```bash
/api/order_carriers
```

---

# Description

The Order carriers.

Transporteurs utilisés pour les commandes.

---

# Table SQL liée

## ps_order_carrier

### Colonnes importantes

* id_order_carrier
* id_order
* id_carrier
* id_order_invoice
* weight
* shipping_cost_tax_excl
* shipping_cost_tax_incl
* tracking_number
* date_add

---

# 8. API Order Cart Rules

## Endpoint

```bash
/api/order_cart_rules
```

---

# Description

The Order cart rules.

Coupons et promotions appliqués à une commande.

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

# 9. API Order Slip

## Endpoint

```bash
/api/order_slip
```

---

# Description

The Order slips.

Gestion des avoirs et remboursements.

---

# Tables SQL liées

## ps_order_slip

### Colonnes importantes

* id_order_slip
* id_customer
* id_order
* amount
* total_products_tax_incl
* total_products_tax_excl
* date_add

---

## ps_order_slip_detail

### Colonnes importantes

* id_order_slip
* id_order_detail
* product_quantity
* amount_tax_excl
* amount_tax_incl

---

# 10. Relations principales

```text
ps_orders
    |
    +---- ps_order_detail
    |
    +---- ps_order_history
    |
    +---- ps_order_invoice
    |
    +---- ps_order_payment
    |
    +---- ps_order_carrier
    |
    +---- ps_order_cart_rule
    |
    +---- ps_order_slip
```

---

# 11. Fonctionnement général

Lorsqu’un client valide son panier :

* une commande est créée
* les lignes produits sont enregistrées
* un statut est appliqué
* un paiement est enregistré
* une facture peut être générée
* un transporteur est associé
* des promotions peuvent être appliquées
* un avoir peut être créé

---

# 12. Résumé

| API                   | Table principale   |
| --------------------- | ------------------ |
| /api/orders           | ps_orders          |
| /api/order_details    | ps_order_detail    |
| /api/order_histories  | ps_order_history   |
| /api/order_states     | ps_order_state     |
| /api/order_payments   | ps_order_payment   |
| /api/order_invoices   | ps_order_invoice   |
| /api/order_carriers   | ps_order_carrier   |
| /api/order_cart_rules | ps_order_cart_rule |
| /api/order_slip       | ps_order_slip      |
