import { addProductsToCart, createCart } from "./carts";
import type { colonneCSV } from "./colonne";
import { createOrderFromCart, getOrCreateCustomer } from "./orders";
import type { findProductByReference } from "./produit";
import { parseAchat, regrouperCommandes } from "./regroupCommandes";
import { deduireStockPourCommande } from "./stock";

export type Commande = colonneCSV["Commande_client_produit"];

export type ProduitAchat = {
    reference: string;
    quantite: number;
    karazany: string;
}
export type EtatCommande = "panier" | "paiement accepté" | "livré" | "annulé";

export interface ImportCommandeResult {
    email: string;
    status: "success" | "error";
    message: string;
}

export const ETAT_TO_ORDER_STATE: Record<string, number> = {
    "paiement accepté": 2,
    "livré": 5,
    "annulé": 6,
};
export type ProductCache = Map<string, Awaited<ReturnType<typeof findProductByReference>>>;



export async function importProduitCommandeCsv(
    rows: Commande[]
): Promise<{
    customersCreated: number;
    cartsCreated: number;
    ordersCreated: number;
    failed: number;
}> {
    rows = regrouperCommandes(rows);

    const productsCache: ProductCache = new Map();

    let customersCreated = 0;
    let cartsCreated = 0;
    let ordersCreated = 0;
    let failed = 0;

    for (const cmd of rows) {
        try {
            const produits = parseAchat(cmd.achat);
            const etat = normaliserEtat(cmd.etat);

            // ── 1. Créer ou récupérer le client ──
            const customerId = await getOrCreateCustomer(cmd);
            if (!customerId) throw new Error(`Impossible de créer le client "${cmd.email}"`);
            customersCreated++;

            const cartSecureKey = customerId.secureKey;
            console.log(`clef secure du client ${cmd.email} : ${cartSecureKey}`);

            // ── 2. Créer le panier ──
            const cart = await createCart(customerId, cmd.adresse);
            if (!cart?.cartId) throw new Error(`Impossible de créer le panier`);
            cartsCreated++;

            // ── 3. Ajouter TOUS les produits en un seul PUT ──
            await addProductsToCart({ cartId: cart.cartId, secureKey: cartSecureKey }, produits, cmd.date);

            // ── 4. Etat vide → panier uniquement ──
            if (etat === "panier") continue;

            // ── 5. Créer la commande depuis le panier ──
            const orderId = await createOrderFromCart(
                cart.cartId,
                customerId,
                ETAT_TO_ORDER_STATE[etat] ?? 2,
                cmd.date,
                cart.addressId
            );
            if (!orderId) throw new Error(`Impossible de créer la commande`);
            ordersCreated++;

            // const dateTime = `${cmd.date} 00:00:00`;

            // const finalStateId = getStateId(etat) || orderStateId;
            // if (finalStateId) {
            //     await updateOrderState(orderId, finalStateId, dateTime);
            // }

            // ── 6. Gérer le stock selon l'état ──
            if (etat === "paiement accepté" || etat === "livré") {
                await deduireStockPourCommande(produits, productsCache);
            }
            // "annulé" → aucune action stock

        } catch (err: any) {
            console.error(`[commande] Erreur pour ${cmd.email}:`, err?.message);
            failed++;
        }
    }

    return { customersCreated, cartsCreated, ordersCreated, failed };
}

// utils

export function normaliserEtat(etat: string): EtatCommande {
    const e = etat?.trim().toLowerCase();
    if (!e) return "panier";
    if (e.includes("paiement")) return "paiement accepté";
    if (e.includes("livr")) return "livré";
    if (e.includes("annul")) return "annulé";
    return "panier";
}

export function generateSecureKey(): string {
    return Array.from({ length: 32 }, () =>
        Math.floor(Math.random() * 16).toString(16)
    ).join("");
}
// -----

