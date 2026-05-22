import type { colonneCSV } from "./colonne";
import { regrouperCommandes } from "./regroupCommandes";

export type Commande = colonneCSV["Commande_client_produit"];

export async function importProduitCommandeCsv(rows: Commande[]): Promise<{ customersCreated: number; cartsCreated: number; ordersCreated: number; failed: number }> {
    rows = regrouperCommandes(rows);
    let customersCreated = 0;
    let cartsCreated = 0;
    let ordersCreated = 0;
    let failed = 0;
    console.log(rows);
    return { customersCreated, cartsCreated, ordersCreated, failed }; 
}

