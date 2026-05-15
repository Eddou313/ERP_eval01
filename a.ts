Lire CSV
    ↓
Créer Customer
    ↓
Récupérer id_customer
    ↓
Créer Address
    ↓
Créer panier avec id_customer
    ↓
Récupérer id_cart
    ↓
Si etat est vide ou "dans le panier" ou comporte une mot "panier" alors s arrete ici car c est une ajout panier
    ↓
si etat est non vide =>Créer Order lié à id_customer et id_cart
    ↓
Update panier avec quantiter 0 apres creation 
    ↓
Récupérer id_order
    ↓
Créer Order Detail lié à id_order et au produit (id_product) avec la quantité du CSV