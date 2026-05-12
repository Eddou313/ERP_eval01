# Module Produits - Documentation

## Vue d'ensemble

Le module Produits gère l'inventaire et l'affichage des produits dans PrestaShop 8.2.6.

### Structure du projet

```
src/module/
├── FrontOffice/produits/
│   ├── api/              # (vide: utilise Backoffice API)
│   └── pages/
│       ├── ProduitsList.tsx    # Page liste produits
│       ├── ProduitDetail.tsx   # Page détail produit
│       └── produits.css        # Styles
│
└── Backoffice/produit/
    └── api/
        └── productsApi.ts      # API CRUD + helpers
```

---

## API Produits (`productsApi.ts`)

### Types principaux

```typescript
interface ProductListItem {
  id: number;
  name?: string;
  reference?: string;
  price?: number;
  active?: boolean;
  quantity?: number;
  id_category_default?: number;
  id_manufacturer?: number;
  id_supplier?: number;
  type?: string; // "simple", "pack", "virtual"
  on_sale?: boolean;
  link_rewrite?: string;
  description_short?: string;
}

interface ProductForm {
  id_category_default: number;
  name: string;
  price: number;
  reference?: string;
  description?: string;
  // ... autres champs
}
```

### Fonctions CRUD disponibles

#### **Lecture (Queries)**

```typescript
// Récupérer tous les IDs de produits
listProductIds(limit?: number): Promise<number[]>

// Recevoir un produit simple
getProduct(id: number): Promise<ProductListItem>

// Recevoir un produit avec détails complets
getProductDetail(id: number): Promise<ProductListItem & {...}>

// Lister les produits avec pagination
listProductsLight(limit?: number): Promise<ProductListItem[]>

// Récupérer produits par catégorie
getProductsByCategory(categoryId: number): Promise<ProductListItem[]>

// Rechercher un produit par nom
searchProducts(query: string): Promise<ProductListItem[]>

// Récupérer les images d'un produit
getProductImages(productId: number): Promise<ProductImage[]>

// Récupérer les variantes/attributs
getProductAttributes(productId: number): Promise<ProductAttribute[]>
```

#### **Écriture (Mutations)**

```typescript
// Créer un nouveau produit
createProduct(data: ProductCreateForm): Promise<{ id: number }>

// Modifier un produit
updateProduct(id: number, data: ProductUpdateForm): Promise<void>

// Supprimer un produit
deleteProduct(id: number): Promise<void>

// Réinitialiser les produits
InitProducts(data: ProductListItem[]): Promise<void>
```

---

## Utilisation dans les pages React

### Exemple: Page Liste Produits

```typescript
import { listProductsLight, type ProductListItem } from "../api/productsApi";

export function ProduitsList() {
  const [products, setProducts] = useState<ProductListItem[]>([]);
  
  useEffect(() => {
    const loadProducts = async () => {
      const data = await listProductsLight(20);
      setProducts(data);
    };
    loadProducts();
  }, []);

  return (
    <div className="productsGrid">
      {products.map(product => (
        <div key={product.id}>
          <h3>{product.name}</h3>
          <p>€{product.price}</p>
        </div>
      ))}
    </div>
  );
}
```

### Exemple: Page Détail Produit

```typescript
import { getProductDetail } from "../api/productsApi";

export function ProduitDetail() {
  const { product } = useLocation().state;
  const [details, setDetails] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      const data = await getProductDetail(product.id);
      setDetails(data);
    };
    load();
  }, [product.id]);

  return (
    <div>
      <h1>{details?.name}</h1>
      <p>{details?.description}</p>
      <p>€{details?.price}</p>
    </div>
  );
}
```

---

## Tables PrestaShop utilisées

| Table | Utilité |
|---|---|
| `ps_product` | Données produit principales |
| `ps_product_lang` | Traductions (nom, description, etc) |
| `ps_product_attribute` | Variantes/déclinaisons |
| `ps_stock_available` | Stock réel |
| `ps_image` | Images produits |
| `ps_category_product` | Catégories du produit |
| `ps_product_supplier` | Fournisseurs |

---

## Configuration

### Connexion à PrestaShop

L'API utilise le client PrestaShop XML défini dans `utils/prestashopClient.ts`

**Variables d'environnement nécessaires:**

```bash
VITE_PRESTASHOP_URL=http://localhost:8000  # URL PrestaShop
VITE_PRESTASHOP_KEY=YOUR_API_KEY            # Clé API
```

### Helpers utilisés

```typescript
import {
  asArray,                    // Convertir en array
  boolFromPrestashop,        // Bool from "0"/"1"
  numFromPrestashop,          // Number from string
  stringFromPrestashop,       // String trim
  keywordsFromPrestashop,     // Split keywords
  getFirstLanguageText,       // Prendre la 1ère langue
} from "utils/helper";
```

---

## Visibilité des produits

| Valeur | Frontend | Recherche | Usage |
|---|---|---|---|
| `both` | ✅ | ✅ | Produit normal |
| `catalog` | ✅ | ❌ | Navigation seulement |
| `search` | ❌ | ✅ | Recherche seulement |
| `none` | ❌ | ❌ | Caché |

---

## Types de produits

| Type | Description | Stock |
|---|---|---|
| `simple` | Produit simple | ps_stock_available |
| `pack` | Bundle/ensemble | Calculé automatiquement |
| `virtual` | Téléchargeable | Illimité |

---

## Erreurs courantes

### "Produit non trouvé"
- Le produit n'existe pas dans PrestaShop
- Vérifiez `id_product` dans la BD

### "Impossible de charger les produits"
- Connexion PrestaShop échouée
- Vérifiez les variables d'environnement
- Vérifiez la clé API PrestaShop

### "Aucun produit disponible"
- La catégorie n'a pas de produits
- Les produits ne sont pas actifs (`active=0`)
- Vérifiez la visibilité

---

## Améliorations possibles

- [ ] Pagination avancée
- [ ] Cache des produits
- [ ] Filtres par attributs
- [ ] Tri (prix, popularité, etc)
- [ ] Gestion des promotions
- [ ] Wishlist persistante
- [ ] Système d'avis

---

## Liens utiles

- [PrestaShop 8 API Docs](/docs/docs_technique/03-endpoints.md)
- [Schéma Produits](/docs/docs_modules/produits_schema.md)
- [Tables SQL](/docs/docs_modules/produits.md)

---
