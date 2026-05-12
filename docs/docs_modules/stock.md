# PrestaShop 8.2.6 - API et Tables Stock

Ce document regroupe les principales APIs et tables liées au stock dans PrestaShop 8.2.6.

---

# 1. API Stock

## 1.1 stock_availables

### Endpoint

```bash
/api/stock_availables
```

### Description

Available quantities.

### Méthodes disponibles

* GET
* POST
* PUT
* PATCH
* DELETE
* HEAD

### Schémas

```bash
/api/stock_availables?schema=blank
/api/stock_availables?schema=synopsis
```

---

## 1.2 stock_movement_reasons

### Endpoint

```bash
/api/stock_movement_reasons
```

### Description

Stock movement reason.

### Méthodes disponibles

* GET
* POST
* PUT
* PATCH
* DELETE
* HEAD

### Schémas

```bash
/api/stock_movement_reasons?schema=blank
/api/stock_movement_reasons?schema=synopsis
```

---

## 1.3 stock_movements

### Endpoint

```bash
/api/stock_movements
```

### Description

Stock movements.

### Méthodes disponibles

* GET
* POST
* PUT
* PATCH
* DELETE
* HEAD

### Schémas

```bash
/api/stock_movements?schema=blank
/api/stock_movements?schema=synopsis
```

---

## 1.4 stocks

### Endpoint

```bash
/api/stocks
```

### Description

Stocks.

### Méthodes disponibles

* GET
* POST
* PUT
* PATCH
* DELETE
* HEAD

### Schémas

```bash
/api/stocks?schema=blank
/api/stocks?schema=synopsis
```

---

# 2. Tables principales du stock

## 2.1 ps_stock_available

Table principale des quantités disponibles.

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

## 2.2 ps_stock

Table des stocks.

### Colonnes principales

* id_stock
* id_warehouse
* id_product
* id_product_attribute
* reference
* physical_quantity
* usable_quantity
* price_te

---

## 2.3 ps_stock_mvt

Historique des mouvements de stock.

### Colonnes

* id_stock_mvt
* id_stock
* id_order
* id_supply_order
* id_stock_mvt_reason
* employee_lastname
* employee_firstname
* physical_quantity
* date_add
* sign
* price_te

---

## 2.4 ps_stock_mvt_reason

Raisons des mouvements de stock.

### Colonnes

* id_stock_mvt_reason
* sign
* deleted
* date_add
* date_upd

---

# Relations principales

```text
ps_product
      |
      +---- ps_stock_available
      |
      +---- ps_stock
                 |
                 +---- ps_stock_mvt
                 |
                 +---- ps_stock_mvt_reason
```

---

# Table la plus importante

👉 ps_stock_available

Cette table contient :

* quantité disponible
* stock physique
* stock réservé
* disponibilité produit

---

# Résumé

| API                         | Table principale    |
| --------------------------- | ------------------- |
| /api/stock_availables       | ps_stock_available  |
| /api/stocks                 | ps_stock            |
| /api/stock_movements        | ps_stock_mvt        |
| /api/stock_movement_reasons | ps_stock_mvt_reason |
