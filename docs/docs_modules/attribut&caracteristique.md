# Attribus
`
product_options
    ↓
product_option_values
    ↓
combinations
    ↓
products
`
# Caracteristique
`
product_features
    ↓
product_feature_values
    ↓
feature_product
    ↓
products
`
# Attributs, Caractéristiques et APIs Produits

---

# 1. Différence entre Attribut et Caractéristique

| Attribut | Caractéristique |
|---|---|
| Utilisé pour les déclinaisons | Utilisé pour les informations descriptives |
| Impacte le stock | N’impacte pas le stock |
| Peut modifier le prix | Ne modifie pas le prix |
| Choisi par le client | Affiché comme information |
| Exemple : Taille, Couleur | Exemple : Matière, Résolution |

---

# 2. Attributs Produits

Les attributs servent à créer des déclinaisons :
- Taille S / M / L
- Couleur Rouge / Bleu
- Capacité 64Go / 128Go

---

## 2.1 Tables des Attributs

| Table | Description |
|---|---|
| `ps_attribute_group` | Groupes d’attributs |
| `ps_attribute_group_lang` | Traductions des groupes |
| `ps_attribute` | Valeurs des attributs |
| `ps_attribute_lang` | Traductions des valeurs |
| `ps_product_attribute` | Déclinaisons produits |
| `ps_product_attribute_combination` | Liaison déclinaison ↔ attribut |
| `ps_product_attribute_shop` | Informations boutique |
| `ps_product_attribute_image` | Images des déclinaisons |
| `ps_stock_available` | Stock des déclinaisons |

---

## 2.2 Exemple Attribut

### Groupe d’attribut

Table : `ps_attribute_group`

| id_attribute_group | name |
|---|---|
| 1 | Taille |

---

### Valeurs

Table : `ps_attribute_lang`

| id_attribute | name |
|---|---|
| 1 | S |
| 2 | M |
| 3 | L |

---

### Déclinaison produit

Table : `ps_product_attribute`

| id_product_attribute | id_product |
|---|---|
| 10 | 25 |

---

### Liaison déclinaison ↔ attribut

Table : `ps_product_attribute_combination`

| id_product_attribute | id_attribute |
|---|---|
| 10 | 2 |

Cela signifie :
- le produit `25`
- possède une déclinaison
- avec la taille `M`

---

# 3. Caractéristiques Produits

Les caractéristiques servent à afficher des informations descriptives :
- Résolution
- Matière
- Poids
- Puissance

---

## 3.1 Tables des Caractéristiques

| Table | Description |
|---|---|
| `ps_feature` | Caractéristiques |
| `ps_feature_lang` | Traductions des caractéristiques |
| `ps_feature_value` | Valeurs des caractéristiques |
| `ps_feature_value_lang` | Traductions des valeurs |
| `ps_feature_product` | Liaison produit ↔ caractéristique |

---

## 3.2 Exemple Caractéristique

### Caractéristique

Table : `ps_feature_lang`

| id_feature | name |
|---|---|
| 1 | Résolution |

---

### Valeur

Table : `ps_feature_value_lang`

| id_feature_value | value |
|---|---|
| 5 | 1920x1080 |

---

### Liaison produit ↔ caractéristique

Table : `ps_feature_product`

| id_feature | id_product | id_feature_value |
|---|---|
| 1 | 20 | 5 |

Cela signifie :
- le produit `20`
- possède la caractéristique `Résolution`
- avec la valeur `1920x1080`

---

# 4. Produits

---

## 4.1 Tables Produits

| Table | Description |
|---|---|
| `ps_product` | Produits |
| `ps_product_lang` | Traductions produits |
| `ps_product_shop` | Informations boutique |
| `ps_category_product` | Liaison catégories ↔ produits |
| `ps_image` | Images produits |
| `ps_image_lang` | Traductions images |
| `ps_stock_available` | Stock produits |

---

# 5. APIs Webservice PrestaShop 8.2.6

## 5.2 API Product Options

Endpoint :

/api/product_options

Description :

Gestion des groupes d’attributs
Exemple :
- Taille
- Couleur
## 5.3 API Product Option Values

Endpoint :

/api/product_option_values

Description :

Gestion des valeurs d’attributs
Exemple :
- Rouge
- Bleu
- M
- L

## 5.4 API Product Features

Endpoint :

/api/product_features

Description :

Gestion des caractéristiques produits
Exemple :
- Résolution
- Matière
- Poids
## 5.5 API Product Feature Values

Endpoint :

/api/product_feature_values

Description :

Gestion des valeurs des caractéristiques
Exemple :
- 1920x1080
- Coton
- 2 Kg