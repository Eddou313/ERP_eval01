# 📦 Documentation Base de Données PrestaShop

## 🔥 1. Cœur du e-commerce

### 🛍️ Produits
- ps_product → produit principal  
- ps_product_lang → nom, description (multi-langue)  
- ps_product_shop → infos par boutique  
- ps_category → catégories  
- ps_category_product → liaison produit ↔ catégorie  

Relation :
product (1) → (N) product_lang  
product (1) → (N) product_shop  
product (N) ↔ (N) category (via category_product)  

---

### 👤 Clients
- ps_customer → client  
- ps_address → adresses  
- ps_customer_group → groupes  

Relation :
customer (1) → (N) address  
customer (N) ↔ (N) group  

---

### 🛒 Panier
- ps_cart → panier  
- ps_cart_product → produits dans le panier  

Relation :
cart (1) → (N) cart_product  
cart_product (N) → (1) product  

---

### 📦 Commandes
- ps_orders → commande  
- ps_order_detail → produits commandés  
- ps_order_history → historique  
- ps_order_state → état (livré, en cours…)  

Relation :
orders (1) → (N) order_detail  
orders (1) → (N) order_history  
order_detail (N) → (1) product  

---

## 💰 2. Paiement / Livraison

- ps_order_invoice → facture  
- ps_order_payment → paiement  
- ps_order_carrier → livraison  
- ps_carrier → transporteur  

Relation :
orders (1) → (1) invoice  
orders (1) → (N) payment  
orders (1) → (1) carrier  

---

## 🎯 3. Promotions

- ps_cart_rule → règles de réduction  
- ps_cart_rule_product_rule → conditions  
- ps_specific_price → prix spécifique  

---

## 🧩 4. Attributs / Déclinaisons

- ps_attribute → attribut (ex: couleur)  
- ps_attribute_group → groupe (taille, couleur)  
- ps_product_attribute → déclinaison  

Relation :
product (1) → (N) product_attribute  
product_attribute (N) ↔ attribute  

---

## 🌍 5. Multi-langue / Multi-boutique

- *_lang → traduction  
- *_shop → multi-boutique  

Exemple :
product → product_lang → product_shop  

---

## ⚙️ 6. Configuration

- ps_configuration → paramètres  
- ps_employee → administrateurs  
- ps_profile → rôles  
- ps_access → permissions  

---

## 🔌 7. Modules

- ps_module → modules installés  
- ps_hook → hooks  
- ps_hook_module → liaison module ↔ hook  

---

## 📊 8. Statistiques

- ps_connections → visiteurs  
- ps_log → logs  
- ps_search_index → index de recherche  
- ps_search_word → mots recherchés  

---

## 🧠 9. CMS / SEO

- ps_cms → pages CMS  
- ps_meta → SEO  
- ps_image → images  

---

## 🧩 Vue globale

Customer  
↓  
Cart → Cart_Product → Product  
↓  
Order → Order_Detail → Product  
↓  
Invoice / Payment / Carrier  

---

## ⚠️ À retenir

- Relations principales :
  - 1 → N
  - N ↔ N (tables de liaison)
- Séparation :
  - données
  - langue
  - boutique  

---

## 🚀 Tables les plus importantes à maîtriser

- ps_product  
- ps_customer  
- ps_cart  
- ps_orders  