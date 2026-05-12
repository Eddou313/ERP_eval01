# Tables SAV, Messages et Retours Produits - PrestaShop

Dans PrestaShop, les fonctionnalités de Service Après-Vente (SAV), messages et retours produits sont réparties dans plusieurs tables.

---

## 🛠️ 1. SAV (Service Après-Vente)

### Tables principales

- `ps_customer_thread`  
  → représente une conversation (ticket SAV lié à un client ou une commande)

- `ps_customer_message`  
  → messages échangés dans un ticket SAV

- `ps_contact`  
  → sujets de contact (support, service client, etc.)

---

## 💬 2. Messages prédéfinis

- `ps_mail_template`  
  → modèles d’emails utilisés pour les notifications automatiques

- `ps_lang`  
  → contient les traductions des contenus des messages

📌 Remarque : les messages prédéfinis sont surtout des **templates d’email**, pas une messagerie interne.

---

## 🔁 3. Retours produits (RMA)

- `ps_order_return`  
  → demande de retour produit

- `ps_order_return_detail`  
  → détails des produits retournés

---

## 💳 4. Remboursements (avoirs)

- `ps_order_slip`  
  → document de remboursement (avoir)

- `ps_order_slip_detail`  
  → détail des produits remboursés

---

## 📊 Schéma relationnel (Mermaid)

```mermaid
erDiagram

    ps_customer_thread {
        int id_customer_thread
        int id_customer
        int id_order
        int id_product
        string email
        string status
    }

    ps_customer_message {
        int id_customer_message
        int id_customer_thread
        text message
        datetime date_add
        boolean private
    }

    ps_contact {
        int id_contact
        string email
        string name
    }

    ps_mail_template {
        int id_mail_template
        string name
        string subject
        text content
    }

    ps_order_return {
        int id_order_return
        int id_order
        int state
        datetime date_add
    }

    ps_order_return_detail {
        int id_order_return_detail
        int id_order_return
        int id_order_detail
        int quantity
    }

    ps_order_slip {
        int id_order_slip
        int id_order
        float total_products_tax_incl
        datetime date_add
    }

    ps_order_slip_detail {
        int id_order_slip_detail
        int id_order_slip
        int id_order_detail
        int quantity
    }

    ps_customer_thread ||--o{ ps_customer_message : contains
    ps_order_return ||--o{ ps_order_return_detail : has
    ps_order_slip ||--o{ ps_order_slip_detail : has