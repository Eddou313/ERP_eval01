# Documentation: Fichier Helper.ts
## Fonctions disponibles

### 🔍 Extraction et conversion XML

#### `textFromUnknown(value: unknown): string`
**Quoi**: Extrait du texte à partir d'une valeur inconnue
**Utilité**: Gère les formats XML convertis en JSON (#text, __cdata, arrays, etc.)
**Retour**: String (vide "" si valeur null/undefined)

```typescript
// Format standard PrestaShop (liste)
textFromUnknown({ "#text": "Mon Nom" })           // "Mon Nom"

// Format détail PrestaShop (__cdata)
textFromUnknown({ "__cdata": "Description" })    // "Description"

// Format multilingue (array)
textFromUnknown([{ "#text": "Français" }, ...])   // "Français"

// Valeur simple
textFromUnknown("Simple texte")                   // "Simple texte"

// Null/undefined
textFromUnknown(null)                             // ""
```

#### `numFromUnknown(value: unknown): number`
**Quoi**: Convertit une valeur en nombre
**Utilité**: Utile pour les IDs, quantités, prix
**Retour**: Number (0 si conversion impossible)

```typescript
numFromUnknown("123")                  // 123
numFromUnknown({ "#text": "456" })     // 456
numFromUnknown(789)                    // 789
numFromUnknown("abc")                  // 0 (conversion échouée)
numFromUnknown(null)                   // 0
```

#### `boolFromUnknown(value: unknown): boolean`
**Quoi**: Convertit une valeur en booléen
**Utilité**: PrestaShop utilise "1" pour true, "0" pour false
**Retour**: Boolean

```typescript
boolFromUnknown("1")                   // true
boolFromUnknown("0")                   // false
boolFromUnknown({ "#text": "1" })      // true
boolFromUnknown(1)                     // true
boolFromUnknown(0)                     // false
```

#### `asArray<T>(value: T | T[]): T[]`
**Quoi**: Normalise une valeur en tableau
**Utilité**: PrestaShop retourne une valeur ou un array selon le nb d'items
**Retour**: Toujours un tableau

```typescript
asArray([1, 2, 3])                     // [1, 2, 3]
asArray(42)                            // [42]
asArray(null)                          // []
asArray(undefined)                     // []

// Cas réel: produits PrestaShop
const products = json.prestashop.products.product;
const items = asArray(products);       // Fonctionne si 1 ou N produits
```

---

### 🌍 Champs multilingues PrestaShop

#### `getFirstLanguageText(field?: PrestashopLanguageField): string`
**Quoi**: Extrait le texte de la première langue d'un champ multilingue
**Utilité**: PrestaShop stocke les textes dans un format multilingue
**Retour**: String (première langue trouvée)

```typescript
// Format standard
const field = {
  language: [
    { "@_id": 1, "#text": "Français" },
    { "@_id": 2, "#text": "English" }
  ]
};
getFirstLanguageText(field)            // "Français"

// Usage réel dans API
const productName = getFirstLanguageText(product.name);
const description = getFirstLanguageText(product.description);
```

#### `keywordsFromField(field?: PrestashopLanguageField): string[]`
**Quoi**: Extrait les mots-clés d'un champ multilingue
**Utilité**: Divise les mots-clés séparés par virgules, retours à la ligne, etc.
**Retour**: String[] (tableau de mots-clés)

```typescript
const field = {
  language: [{ "@_id": 1, "#text": "seo, keywords,important" }]
};
keywordsFromField(field)               
// ["seo", "keywords", "important"]

// Accepte plusieurs séparateurs
const field2 = {
  language: [{ "@_id": 1, "#text": "tag1\ntag2,tag3;tag4" }]
};
keywordsFromField(field2)              
// ["tag1", "tag2", "tag3", "tag4"]
```

#### `languageField(value: string, languageId?: number): object`
**Quoi**: Construit un champ de langue PrestaShop standard
**Utilité**: Utiliser lors de la création/mise à jour de ressources
**Retour**: Objet au format PrestaShop

```typescript
const field = languageField("Mon Produit");
// Retour:
// {
//   language: {
//     "@_id": 1,
//     "#text": "Mon Produit"
//   }
// }

// Avec langue spécifique
const fieldEn = languageField("My Product", 2);
```

---

### 📅 Formatage et conversion

#### `formatDate(value?: string): string`
**Quoi**: Formate une date en français lisible
**Utilité**: Afficher les dates de manière lisible (UI)
**Retour**: String au format "10/05/2026 14:30" ou "-"

```typescript
formatDate("2026-05-10 14:30:00")      // "10/05/2026 14:30"
formatDate("2026-05-10")               // "10/05/2026 00:00"
formatDate("")                         // "-"
formatDate(null)                       // "-"

// Usage réel dans page
<td>{formatDate(product.date_add)}</td>
```

#### `formatCurrency(value: number, currency?: string): string`
**Quoi**: Formate un nombre en devise
**Utilité**: Afficher les prix de manière lisible
**Retour**: String avec devise (défaut: "Ar" = Ariary)

```typescript
formatCurrency(1500.50)                // "1 500,50 Ar"
formatCurrency(150)                    // "150,00 Ar"
formatCurrency(1500.50, "€")           // "1 500,50 €"
formatCurrency(1500.50, "USD")         // "1 500,50 USD"

// Usage réel
<td>{formatCurrency(product.price_ttc)}</td>
```

#### `formatCurrencyEur(value: number): string`
**Quoi**: Formate un nombre en EUR avec symbole €
**Utilité**: Alternative pour les prix en euros
**Retour**: String avec symbole EUR

```typescript
formatCurrencyEur(15.50)               // "15,50 €"
formatCurrencyEur(1500)                // "1 500,00 €"
```

#### `toCsvCell(value: unknown): string`
**Quoi**: Échappe une valeur pour le format CSV
**Utilité**: Utilisé lors des exports CSV
**Retour**: String entouré de guillemets et échappé

```typescript
toCsvCell("Nom Simple")                // "\"Nom Simple\""
toCsvCell('Nom avec "guillemets"')     // "\"Nom avec \"\"guillemets\"\"\""
toCsvCell(1500.50)                     // "\"1500.50\""
```

---

### 💰 Calculs de prix

#### `withTax(priceHt: number, taxRate?: number): number`
**Quoi**: Calcule le prix TTC à partir du prix HT
**Utilité**: Ajouter la TVA au prix
**Retour**: Number (prix TTC)

```typescript
withTax(100)                           // 120 (100 HT + 20% TVA)
withTax(100, 20)                       // 120 (explicite)
withTax(100, 5.5)                      // 105.5 (5.5% TVA)
withTax(50, 10)                        // 55 (10% TVA)
```

#### `computeTtc(priceHt: number, taxRate?: number): number`
**Quoi**: Alias de `withTax` (même fonction)
**Utilité**: Alternative de nommage
**Retour**: Number (prix TTC)

```typescript
computeTtc(100)                        // 120 (idem withTax)
```

---

### 📝 Transformations de texte

#### `slugify(input: string): string`
**Quoi**: Convertit une phrase en slug URL-friendly
**Utilité**: Générer des URL-friendly ou identifiants
**Retour**: String en minuscules, sans accents ni caractères spéciaux

```typescript
slugify("Mon Produit")                 // "mon-produit"
slugify("Café Français")               // "cafe-francais"
slugify("Prix € 100!")                 // "prix-100"
slugify("  Espaces   multiples  ")     // "espaces-multiples"
```

---

### 🔄 Conversions de types

#### `toPrestashopBool(value: boolean | number): number`
**Quoi**: Convertit booléen ou nombre au format PrestaShop (0 ou 1)
**Utilité**: Préparer les données pour PUT/POST requests
**Retour**: 1 si true, 0 si false

```typescript
toPrestashopBool(true)                 // 1
toPrestashopBool(false)                // 0
toPrestashopBool(1)                    // 1
toPrestashopBool(0)                    // 0
```

---

### ⏰ Horodatage

#### `dateStamp(): string`
**Quoi**: Génère une date au format YYYY-MM-DD
**Utilité**: Créer des noms de fichiers avec date
**Retour**: String format "2026-05-10"

```typescript
dateStamp()                            // "2026-05-10" (date du jour)

// Usage réel: noms de fichiers
const filename = `produits-${dateStamp()}.csv`;  // "produits-2026-05-10.csv"
```

---

### 🔗 Aliases (compatibilité)

Ces fonctions sont des **alias** pour maintenir la compatibilité avec différents modules:

```typescript
// Tous équivalents à textFromUnknown
stringFromPrestashop(value)            // === textFromUnknown(value)

// Tous équivalents à numFromUnknown
numFromPrestashop(value)               // === numFromUnknown(value)

// Tous équivalents à boolFromUnknown
boolFromPrestashop(value)              // === boolFromUnknown(value)

// Tous équivalents à keywordsFromField
keywordsFromPrestashop(field)          // === keywordsFromField(field)
```

---

## Exemples pratiques

### 📦 Cas d'utilisation: Parser une réponse PrestaShop API

```typescript
import {
  textFromUnknown,
  numFromUnknown,
  boolFromUnknown,
  asArray,
  getFirstLanguageText,
  formatDate,
} from "../../../utils/helper";

// Réponse brute PrestaShop
const response = {
  prestashop: {
    products: {
      product: [
        {
          "@_id": "1",
          id: "1",
          name: { language: [{ "@_id": "1", "#text": "Produit A" }] },
          active: "1",
          date_add: "2026-05-10 14:30:00",
          quantity: "100",
        },
      ],
    },
  },
};

// ✅ Parser avec helper
const products = asArray(response.prestashop.products.product);
const product = products[0];

const parsed = {
  id: numFromUnknown(product.id),                  // 1
  name: getFirstLanguageText(product.name),        // "Produit A"
  active: boolFromUnknown(product.active),         // true
  date: formatDate(product.date_add),              // "10/05/2026 14:30"
  quantity: numFromUnknown(product.quantity),      // 100
};

console.log(parsed);
// {
//   id: 1,
//   name: "Produit A",
//   active: true,
//   date: "10/05/2026 14:30",
//   quantity: 100
// }
```

### 💾 Cas d'utilisation: Construire un champ pour PUT/POST

```typescript
import {
  languageField,
  toPrestashopBool,
  withTax,
} from "../../../utils/helper";

// Données du formulaire
const form = {
  name: "Nouveau Produit",
  description: "Une description courte",
  active: true,
  price_ht: 100,
  tax_rate: 20,
};

// ✅ Construire le payload PrestaShop
const payload = {
  product: {
    name: languageField(form.name),                // Format multilingue
    description: languageField(form.description),
    active: toPrestashopBool(form.active),         // 0 ou 1
    price: form.price_ht,
    price_wt: withTax(form.price_ht, form.tax_rate), // 120
  },
};

// Envoyer au serveur...
```

### 📊 Cas d'utilisation: Exporter en CSV

```typescript
import {
  formatCurrency,
  formatDate,
  toCsvCell,
  dateStamp,
} from "../../../utils/helper";

// Données à exporter
const products = [
  {
    id: 1,
    name: "Produit A",
    price: 1500.50,
    date_add: "2026-05-10 14:30:00",
  },
  {
    id: 2,
    name: "Produit B",
    price: 2500.75,
    date_add: "2026-05-11 10:15:00",
  },
];

// ✅ Créer l'export
function exportProducts() {
  const headers = ["ID", "Nom", "Prix", "Date"];
  const rows = products.map((p) => [
    toCsvCell(p.id),
    toCsvCell(p.name),
    toCsvCell(formatCurrency(p.price)),
    toCsvCell(formatDate(p.date_add)),
  ]);

  const csv = [headers, ...rows].map((row) => row.join(";")).join("\n");
  const filename = `produits-${dateStamp()}.csv`;

  // Télécharger fichier...
}
```

### 🔄 Cas d'utilisation: Normaliser data multilingue

```typescript
import {
  getFirstLanguageText,
  keywordsFromField,
  asArray,
} from "../../../utils/helper";

// Réponse avec champs multilingues
const category = {
  name: {
    language: [
      { "@_id": "1", "#text": "Électronique" },
      { "@_id": "2", "#text": "Electronics" },
    ],
  },
  meta_keywords: {
    language: [
      { "@_id": "1", "#text": "électronique, gadgets, tech" },
    ],
  },
  products: {
    product: [
      { "@_id": "1", id: "1" },
      { "@_id": "2", id: "2" },
      { "@_id": "3", id: "3" },
    ],
  },
};

// ✅ Normaliser
const normalized = {
  name: getFirstLanguageText(category.name),        // "Électronique"
  keywords: keywordsFromField(category.meta_keywords), // ["électronique", "gadgets", "tech"]
  productCount: asArray(category.products.product).length, // 3
};
```

---

## 📌 Bonnes pratiques

### ✅ À FAIRE

```typescript
// 1. Importer depuis helper
import { textFromUnknown, numFromUnknown } from "../../../utils/helper";

// 2. Utiliser les fonctions
const name = textFromUnknown(data.name);
const id = numFromUnknown(data.id);

// 3. Importer seulement ce qu'on utilise
import { formatDate, formatCurrency } from "../../../utils/helper";
```

### ❌ À NE PAS FAIRE

```typescript
// 1. Ne pas reimplémenter locally
function textFromUnknown(value) {  // ❌ NON!
  return String(value).trim();
}

// 2. Ne pas importer si pas utilisé
import { slugify, dateStamp } from "..."; // inutile si pas utilisé

// 3. Ne pas créer des dupliqués
// Même si tu dois adapter une fonction, utilise un wrapper
const myCustomFormat = (value) => {
  const basic = formatCurrency(value);
  return `PRIX: ${basic}`;
};
```

---

## 🔗 Intégration avec modules

Tous les modules utilisent `helper.ts`:

| Module | Fonctions utilisées |
|--------|---------------------|
| **produit** | asArray, textFromUnknown, numFromUnknown, getFirstLanguageText, languageField, withTax |
| **categorie** | asArray, getFirstLanguageText, boolFromPrestashop, numFromPrestashop |
| **client** | asArray, textFromUnknown, numFromUnknown, toPrestashopBool |
| **panier** | asArray, textFromUnknown, numFromUnknown |
| **commande** | textFromUnknown, numFromUnknown, formatCurrency |
| **stock** | asArray, textFromUnknown, numFromUnknown |
| **exportCsv** | toCsvCell, dateStamp |

---

## 📚 Ressources supplémentaires

- **Voir aussi**: `/src/utils/exportCsv.ts` (utilise helper pour exports)
- **Documentation API**: Voir `docs/docs_technique/03-endpoints.md`
- **Question?**: Cherchez les usages de helper dans les API files

---

**Dernière mise à jour**: Mai 2026
