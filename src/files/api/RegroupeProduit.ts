import type { colonneCSV } from "./object";

type Produit = colonneCSV["produit_Attribut_StockImport"];

export function regrouperStocks(produits: Produit[]): Produit[] {
    const map = new Map<string, Produit>();

    for (const produit of produits) {
        // clé unique basée sur reference + specificité + karazany
        const key = `${produit.reference}__${produit.specificité}__${produit.karazany}`;

        if (map.has(key)) {
            // addition du stock
            const existant = map.get(key)!;
            existant.stock_initial += produit.stock_initial;
        } else {
            // copie du produit
            map.set(key, { ...produit });
        }
    }

    return Array.from(map.values());
}