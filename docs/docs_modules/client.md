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

