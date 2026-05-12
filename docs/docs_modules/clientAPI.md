# PrestaShop 8.2.6 - API Customers

Ce document explique les APIs liées aux clients dans PrestaShop 8.2.6.

---

# 1. API Customers

## Endpoint principal

```bash
/api/customers
```

---

# Description

The e-shop's customers.

Cette API permet de gérer les clients de la boutique.

Elle permet :

* créer un client
* modifier un client
* supprimer un client
* récupérer les clients
* gérer les informations du compte client

---

# 2. Méthodes HTTP disponibles

| Méthode | Description                       |
| ------- | --------------------------------- |
| GET     | récupérer un ou plusieurs clients |
| POST    | créer un client                   |
| PUT     | modifier complètement un client   |
| PATCH   | modifier partiellement un client  |
| DELETE  | supprimer un client               |
| HEAD    | vérifier la disponibilité         |

---

# 3. Schémas disponibles

## Schéma vide

```bash
/api/customers?schema=blank
```

---

## Schéma synopsis

```bash
/api/customers?schema=synopsis
```

---

# 4. Table SQL principale

## ps_customer

Table principale des clients.

### Colonnes importantes

* id_customer
* id_shop_group
* id_shop
* id_gender
* id_default_group
* id_lang
* firstname
* lastname
* email
* passwd
* birthday
* newsletter
* optin
* secure_key
* active
* is_guest
* deleted
* date_add
* date_upd
* reset_password_token
* reset_password_validity

---

# 5. API Customer Threads

## Endpoint

```bash
/api/customer_threads
```

---

# Description

Customer services threads.

Cette API permet de gérer les discussions SAV des clients.

---

# Méthodes HTTP disponibles

| Méthode | Description               |
| ------- | ------------------------- |
| GET     | récupérer les discussions |
| POST    | créer une discussion      |
| PUT     | modifier une discussion   |
| PATCH   | modifier partiellement    |
| DELETE  | supprimer                 |
| HEAD    | vérifier disponibilité    |

---

# Schémas disponibles

```bash
/api/customer_threads?schema=blank
/api/customer_threads?schema=synopsis
```

---

# Table SQL liée

## ps_customer_thread

### Colonnes importantes

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

# 6. API Customer Messages

## Endpoint

```bash
/api/customer_messages
```

---

# Description

Customer services messages.

Cette API permet de gérer les messages SAV des clients.

---

# Méthodes HTTP disponibles

| Méthode | Description            |
| ------- | ---------------------- |
| GET     | récupérer les messages |
| POST    | créer un message       |
| PUT     | modifier un message    |
| PATCH   | modifier partiellement |
| DELETE  | supprimer              |
| HEAD    | vérifier disponibilité |

---

# Schémas disponibles

```bash
/api/customer_messages?schema=blank
/api/customer_messages?schema=synopsis
```

---

# Table SQL liée

## ps_customer_message

### Colonnes importantes

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

# 7. Relations principales

```text
ps_customer
      |
      +---- ps_customer_thread
                    |
                    +---- ps_customer_message
```

---

# 8. Exemple XML Customer

## Création client

```xml
<prestashop>
  <customer>
    <firstname><![CDATA[Jean]]></firstname>
    <lastname><![CDATA[Rakoto]]></lastname>
    <email><![CDATA[jean@test.com]]></email>
    <passwd><![CDATA[hashed_password]]></passwd>
    <active>1</active>
  </customer>
</prestashop>
```

---

# 9. Exemples API

## Récupérer tous les clients

```bash
GET /api/customers
```

---

## Récupérer un client

```bash
GET /api/customers/1
```

---

## Créer un client

```bash
POST /api/customers
```

---

## Modifier un client

```bash
PUT /api/customers/1
```

---

## Supprimer un client

```bash
DELETE /api/customers/1
```

---

# 10. Résumé

| API                    | Table principale    |
| ---------------------- | ------------------- |
| /api/customers         | ps_customer         |
| /api/customer_threads  | ps_customer_thread  |
| /api/customer_messages | ps_customer_message |
