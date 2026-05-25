import type { listProductsLight } from "../../module/Backoffice/produit/api/productsApi";
import { createCombination, getOrCreateAttributeGroup, getOrCreateAttributeValue } from "./attribut";
import { type colonneCSV } from "./colonne";
import { findProductByReference } from "./produit";
import { updateStockWithMovement } from "./stock";

export type Csv2Row = colonneCSV["produit_Attribut_StockImport"];
export interface ImportResult {
    reference: string;
    status: "success" | "error";
    message: string;
}

export type ImportProgress = {
    processed: number;
    total: number;
    imported: number;
    failed: number;
    current?: string;
};

type ProductLight = Awaited<ReturnType<typeof listProductsLight>>[number];
export async function importCsv2ToPrestashop(
    rows: Csv2Row[],
    options?: {
        onProgress?: (progress: ImportProgress) => void;
    },
): Promise<ImportResult[]> {
    rows = regrouperStocks(rows);
    const productsCache = new Map<string, ProductLight | null>();
    const results: ImportResult[] = [];
    // const total = rows.length;
    const firstCombinationByProduct = new Map<number, boolean>();
    const total = rows.length;
    let imported = 0;
    let failed = 0;

    options?.onProgress?.({ processed: 0, total, imported, failed, current: "Démarrage" });
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        let { reference, specificité, karazany, stock_initial, prix_vente_ttc } = row;
        let current = reference;

        console.log(`commencement de l import csv2 `);
        try {
            const productReel = await findProductByReference(row.reference, productsCache);
            const productId = productReel ? Number(productReel.id) : null;
            if (!productId) {
                failed += 1;
                results.push({
                    reference,
                    status: "error",
                    message: `Produit introuvable pour la référence "${reference}"`,
                });
                options?.onProgress?.({ processed: i + 1, total, imported, failed, current: `Produit introuvable: ${reference}` });
                continue;
            }
            current = reference;

            const hasAttribute = specificité?.trim() !== "" && karazany?.trim() !== "";
            stock_initial = Number(row.stock_initial) || 0;


            if (!hasAttribute) {
                // ── Produit standard : juste mettre à jour le stock ──
                await updateStockWithMovement(productId, stock_initial);
                imported += 1;
                results.push({
                    reference,
                    status: "success",
                    message: `Stock mis à jour (${stock_initial} unités)`,
                });
            } else {
                // ── Produit avec combinaison ──
                const groupId = await getOrCreateAttributeGroup(specificité.trim());
                const valueId = await getOrCreateAttributeValue(groupId, karazany.trim());
                const priceTtc = Number(prix_vente_ttc) || 0;
                const basePriceHt = Number(productReel?.price_ht ?? productReel?.base_price ?? productReel?.price ?? 0) || 0;
                const taxRate = Number(productReel?.tax_rate ?? 20) || 0;
                const priceHtRaw = priceTtc > 0 ? parseTtcToHt(priceTtc, taxRate) : basePriceHt;
                const priceHt = Math.ceil(priceHtRaw * 1000) / 1000;
                const priceImpactHt = priceTtc > 0 ? Number((priceHt - basePriceHt).toFixed(6)) : 0;

                const isFirst = !firstCombinationByProduct.has(productId);
                if (isFirst) firstCombinationByProduct.set(productId, true);
                
                await createCombination(productId, valueId, stock_initial, priceImpactHt,isFirst);
                imported += 1;
                results.push({
                    reference,
                    status: "success",
                    message: `Combinaison créée : ${specificité}="${karazany}", stock=${stock_initial}`,
                });
            }
        } catch (err: any) {
            failed += 1;
            results.push({
                reference,
                status: "error",
                message: err?.message ?? "Erreur inconnue",
            });
        } finally {
            options?.onProgress?.({
                processed: i + 1,
                total,
                imported,
                failed,
                current,
            });
        }
    }

    options?.onProgress?.({
        processed: total,
        total,
        imported,
        failed,
        current: "Terminé",
    });

    return results;
}

export function regrouperStocks(produits: Csv2Row[]): Csv2Row[] {
    const map = new Map<string, Csv2Row>();

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

function parseTtcToHt(priceTtc: number, taxRate: number): number {
    const rate = Number(taxRate) || 0;
    if (rate <= 0) {
        return Number((Number(priceTtc) || 0).toFixed(2));
    }

    const ht = priceTtc / (1 + rate / 100);
    return Number(ht.toFixed(6));
}