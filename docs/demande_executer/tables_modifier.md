Les principales tables contenant les données de test sont :

Table	Contenu
ps_product	Produits (Tables principale produit)
ps_product_lang	Noms/descriptions produits (Tables multilange produit)
ps_category	Categories      (Structure des categorie)
ps_category_lang	Noms categories         (tables multilange categorie)
ps_customer	Clients         (tables information client)
ps_orders	Commandes       (tables commande)
ps_order_detail	Details commandes   (tables detail produit dans une commande)
ps_image	Images produits         (tables info des images des produits)
ps_stock_available	Stock       (tables de gestion stock disponible)
ps_manufacturer	Marques         (tables des marque de produit)
ps_supplier	Fournisseurs        (tables fournisseurs produit)
ps_feature	Caracteristiques      (tables des caracteristique)
ps_feature_value	Valeurs caracteristiques    (tables des valeur des caracteristique)
ps_product_feature	Liaison produit/caracteristique (tables liaison produit -> carcteristique -> valeur)
ps_attribute	Attributs (taille, couleur) (tables des attribue qui est selectionnable)
ps_attribute_group	Groupes attributs       (tables group attributs)
ps_product_attribute	Combinaisons produits   (tables qui represente le combinaison produit)
ps_cart	Paniers (tables panier par client)
ps_employee	Admins/employes (table administrateur backOffiche)
ps_configuration	Configuration Prestashop    (table configuration globale du boutique)

et 
| Table                              | Rôle                         |
| ---------------------------------- | ---------------------------- |
| `ps_product_shop`                  | données multi-boutiques      |
| `ps_category_product`              | liaison catégorie/produit    |
| `ps_cart_product`                  | produits dans panier         |
| `ps_product_attribute_combination` | liaison combinaison/attribut |
| `ps_image_lang`                    | légendes images              |
| `ps_order_history`                 | historique statuts           |
| `ps_address`                       | adresses clients             |
| `ps_currency`                      | devises                      |
| `ps_lang`                          | langues                      |
| `ps_tax`                           | taxes                        |
| `ps_specific_price`                | promotions/réductions        |


