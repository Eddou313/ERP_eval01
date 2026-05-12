# Documentation des tables Category dans PrestaShop 8.2.6

## 1. `ps_category`

Table principale des catégories produits.

Elle contient la structure des catégories du catalogue :
- Accueil
- Vêtements
- Informatique
- Téléphones
- etc.

Chaque ligne représente une catégorie.

### Colonnes importantes

| Colonne | Description |
|---|---|
| `id_category` | ID unique de la catégorie |
| `id_parent` | ID de la catégorie parente |
| `id_shop_default` | Boutique par défaut associée |
| `level_depth` | Niveau de profondeur dans l’arbre |
| `nleft` | Valeur gauche pour l’arbre imbriqué (Nested Set) |
| `nright` | Valeur droite pour l’arbre imbriqué |
| `active` | Catégorie active ou non |
| `date_add` | Date de création |
| `date_upd` | Date de modification |
| `position` | Ordre d’affichage |
| `is_root_category` | Indique si c’est la catégorie racine |

---

# Explication détaillée des colonnes

## `id_category`

Identifiant unique de la catégorie.

Exemple :

| id_category | Nom |
|---|---|
| 1 | Accueil |
| 2 | Vêtements |
| 3 | Informatique |

---

## `id_parent`

Relation parent-enfant entre catégories.

Exemple :

| id_category | Nom | id_parent |
|---|---|---|
| 1 | Accueil | 0 |
| 2 | Vêtements | 1 |
| 3 | Homme | 2 |

Ici :
- `Accueil` est la racine
- `Vêtements` est enfant de `Accueil`
- `Homme` est enfant de `Vêtements`

---

## `id_shop_default`

Utilisé dans le mode multiboutique.

Indique la boutique principale associée à la catégorie.

Exemple :
- Boutique 1 = Magasin principal
- Boutique 2 = Boutique Europe

---

## `level_depth`

Profondeur dans l’arbre des catégories.

Exemple :

| Catégorie | level_depth |
|---|---|
| Accueil | 0 |
| Vêtements | 1 |
| Homme | 2 |
| Chaussures | 3 |

Très utilisé pour :
- les menus
- les arbres de navigation
- les breadcrumbs

---

## `nleft` et `nright`

Utilisés pour le système d’arbre hiérarchique appelé :

> Nested Set Model

Permet de récupérer rapidement :
- tous les enfants
- tous les parents
- toute une branche

Exemple :

| Catégorie | nleft | nright |
|---|---|---|
| Accueil | 1 | 10 |
| Vêtements | 2 | 7 |
| Homme | 3 | 4 |
| Femme | 5 | 6 |
| Informatique | 8 | 9 |

Cela permet de savoir :
- quels éléments sont inclus dans une branche
- sans faire beaucoup de requêtes SQL

---

## `active`

Indique si la catégorie est visible.

Valeurs :
- `1` = active
- `0` = désactivée

---

## `date_add`

Date de création.

Exemple :
```sql
2026-05-07 10:00:00

```

## Architecture :

    ps_category
        ↓
    ps_category_lang
        ↓
    ps_category_product
        ↓
    ps_product

    ps_category_group
    ps_category_shop

