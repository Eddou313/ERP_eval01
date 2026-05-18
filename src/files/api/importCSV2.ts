import { listProductsLight, updateProduct } from "../../module/Backoffice/produit/api/productsApi";
import { createCombination, ensureAttributeGroupExists, ensureAttributeValueExists, getProductAttributeGroups, listAttributeGroupsLight, listAttributeValuesLight, updateCombination } from "../../module/Backoffice/attribue&Caracteristique/api/attributsCaracteristiquesApi";
import { normalizeText, slugify } from "../../utils/helper";
import type { colonneCSV } from "./object";
import { upsertStockAvailable } from "../../module/Backoffice/stock/api/stockApi";
import { SupprimerStocksEtMouvements } from "../../module/Backoffice/stock/api/Suppression";
import { applyStockModification } from "../../module/Backoffice/stock/api/stockMovementService";
import { requestPrestashopXml } from "../../utils/prestashopClient";
import { numFromUnknown } from "../../utils/helper";

export type ProductAttributeStockImportRow = colonneCSV["produit_Attribut_StockImport"];

type ProductLight = Awaited<ReturnType<typeof listProductsLight>>[number];
type ImportProgress = {
    processed: number;
    total: number;
    imported: number;
    failed: number;
    current?: string;
};

function normalizeProductReference(value: string): string {
    return normalizeText(String(value ?? "").trim());
}

function compactReference(value: string): string {
    return normalizeProductReference(value).replace(/[^a-z0-9]/g, "");
}

function normalizeSupplierReference(value: string): string {
    return normalizeText(String(value ?? "").trim()).replace(/[^a-z0-9]/g, "");
}

function buildCombinationReferenceCandidates(reference: string, variant: string): string[] {
    const baseReference = String(reference ?? "").trim();
    const variantText = String(variant ?? "").trim();
    if (!baseReference || !variantText) {
        return [];
    }

    return Array.from(
        new Set(
            [
                `${baseReference}${variantText}`,
                `${baseReference} ${variantText}`,
                `${baseReference}-${variantText}`,
                `${baseReference}_${variantText}`,
            ]
                .map((candidate) => normalizeSupplierReference(candidate))
                .filter(Boolean),
        ),
    );
}

function parseTtcToHt(priceTtc: number, taxRate: number): number {
    const rate = Number(taxRate) || 0;
    if (rate <= 0) {
        return Number((Number(priceTtc) || 0).toFixed(2));
    }

    const ht = priceTtc / (1 + rate / 100);
    return Number(ht.toFixed(6));
}

async function findProductByReference(reference: string, cache: Map<string, ProductLight | null>): Promise<ProductLight | null> {
    const normalizedReference = normalizeProductReference(reference);
    if (!normalizedReference) {
        return null;
    }

    if (cache.has(normalizedReference)) {
        return cache.get(normalizedReference) ?? null;
    }

    const products = await listProductsLight();
    const compactTarget = compactReference(reference);
    const match =
        products.find((product) => {
            const productReference = normalizeProductReference(product.reference ?? "");
            if (productReference === normalizedReference) return true;
            return compactReference(productReference) === compactTarget;
        }) ?? null;

    cache.set(normalizedReference, match);
    return match;
}

async function findCombinationIdByValues(productId: number, targetValueIds: number[]): Promise<number | null> {
    const targetKey = [...targetValueIds].sort((left, right) => left - right).join("-");
    if (!targetKey) {
        return null;
    }

    try {
        const attributeGroups = await getProductAttributeGroups(productId);
        const combinations = Array.from(new Map(attributeGroups.flatMap((group) => group.combinations ?? []).map((combination) => [combination.id, combination])).values());

        const match = combinations.find((combination) => {
            const valueKey = [...(combination.attributes ?? [])].map((attribute) => attribute.valueId).sort((left, right) => left - right).join("-");
            return valueKey === targetKey;
        });

        return match?.id ?? null;
    } catch {
        return null;
    }
}

async function findCombinationIdBySupplierReference(productId: number, reference: string, variant: string): Promise<number> {
    const targetCandidates = buildCombinationReferenceCandidates(reference, variant);
    if (targetCandidates.length === 0) {
        return 0;
    }

    try {
        const attrGroups = await getProductAttributeGroups(productId);
        const combinations = Array.from(new Map(attrGroups.flatMap((group) => group.combinations ?? []).map((combination) => [combination.id, combination])).values());

        const match = combinations.find((combination: any) => {
            const combinationReference = normalizeSupplierReference(combination?.reference ?? "");
            const supplierReference = normalizeSupplierReference(combination?.supplier_reference ?? "");
            if (!combinationReference && !supplierReference) {
                return false;
            }

            return targetCandidates.some((candidate: string) => candidate === combinationReference || candidate === supplierReference);
        });

        return Number(match?.id) || 0;
    } catch {
        return 0;
    }
}

export async function importProduitAttributStockCsv(rows: ProductAttributeStockImportRow[], options?: { onProgress?: (progress: ImportProgress) => void }): Promise<{ imported: number; failed: number }> {
    const productsCache = new Map<string, ProductLight | null>();
    const attributeGroups = await listAttributeGroupsLight();
    const attributeValues = await listAttributeValuesLight();

    const attributeGroupCache = new Map<string, number>();
    const attributeValueCache = new Map<string, number>();

    for (const group of attributeGroups) {
        attributeGroupCache.set(normalizeText(group.name ?? ""), group.id);
        attributeGroupCache.set(normalizeText(group.publicName ?? ""), group.id);
    }

    for (const value of attributeValues) {
        attributeValueCache.set(`${value.attributeGroupId}:${normalizeText(value.name ?? "")}`, value.id);
    }

    let imported = 0;
    let failed = 0;
    let processed = 0;
    const reportProgress = (current?: string) => {
		options?.onProgress?.({ processed, total: rows.length, imported, failed, current });
	};

	reportProgress("Préparation");

    for (const row of rows) {
        try {
            const product = await findProductByReference(row.reference, productsCache);
            if (!product) {
                failed += 1;
                console.warn(`Produit parent introuvable pour la référence ${row.reference}`);
                continue;
            }

            const specName = String(row.specificité ?? "").trim();
            const valueName = String(row.karazany ?? "").trim();
            const quantity = Number(row.stock_initial) || 0;
            const priceTtc = Number(row.prix_vente_ttc) || 0;
            const basePriceHt = Number(product.price_ht ?? product.base_price ?? product.price ?? 0) || 0;
            const taxRate = Number(product.tax_rate ?? 20) || 0;
            const priceHtRaw = priceTtc > 0 ? parseTtcToHt(priceTtc, taxRate) : basePriceHt;
            const priceHt = Math.ceil(priceHtRaw * 1000) / 1000;
            const priceImpactHt = priceTtc > 0 ? Number((priceHt - basePriceHt).toFixed(6)) : 0;

            if (!specName) {
                if (Number.isFinite(priceTtc) && priceTtc > 0) {
                    try {
                        await updateProduct(product.id, { price: priceHt } as any);
                    } catch (err) {
                        console.warn(`Impossible de mettre à jour le prix du produit ${product.id}:`, err);
                    }
                }

                // Gérer la mise à jour du stock en enregistrant un mouvement
                // Rechercher l'entrée stock_available existante
                const stockResponse = await requestPrestashopXml<any>("/stock_availables", {
                    query: {
                        display: "full",
                        "filter[id_product]": `[${product.id}]`,
                        "filter[id_product_attribute]": `[0]`,
                    },
                });

                const rawEntries = stockResponse?.prestashop?.stock_availables?.stock_available;
                const entries = Array.isArray(rawEntries) ? rawEntries : rawEntries ? [rawEntries] : [];
                const stockEntry = entries[0];

                if (!stockEntry) {
                    // Pas d'entrée existante: créer une entrée vide puis appliquer la modification
                    await upsertStockAvailable({
                        id_product: product.id,
                        id_product_attribute: 0,
                        id_shop: 1,
                        id_shop_group: 1,
                        quantity: 0,
                        depends_on_stock: false,
                        out_of_stock: 2,
                    });

                    // Appliquer la modification pour créer le mouvement (0 -> quantity)
                    const res = await applyStockModification(product.id, 0, quantity, 0, "import", 1);
                    if (!res.success) {
                        console.warn(`applyStockModification failed for product ${product.id}: ${res.message}`);
                    }
                } else {
                    const currentQuantity = numFromUnknown(stockEntry?.quantity);
                    const delta = quantity - currentQuantity;
                    if (delta !== 0) {
                        const res = await applyStockModification(product.id, currentQuantity, delta, 0, "import", 1);
                        if (!res.success) {
                            console.warn(`applyStockModification failed for product ${product.id}: ${res.message}`);
                        }
                    }
                }

                imported += 1;
                continue;
            }

            if (!valueName) {
                failed += 1;
                console.warn(`Ligne ignorée: valeur d'attribut vide pour la référence ${row.reference} (specificité=${specName})`);
                continue;
            }

            const groupId = await ensureAttributeGroupExists(specName, attributeGroupCache, attributeGroups);
            const valueId = await ensureAttributeValueExists(groupId, valueName, attributeValueCache, attributeValues);
            const reference = `${product.reference ?? row.reference}-${slugify(valueName)}`;
            let combinationId = await findCombinationIdByValues(product.id, [valueId]);


            if (!combinationId) {
                combinationId = await findCombinationIdBySupplierReference(product.id, row.reference, valueName);
            }

            if (!combinationId) {
                combinationId = await createCombination(product.id, [valueId], priceImpactHt, quantity, reference);
            } else {
                await updateCombination(combinationId, product.id, [valueId], priceImpactHt, quantity, reference);
            }

            // Pour les combinaisons, appliquer aussi la modification de stock via applyStockModification
            const stockResponseCombo = await requestPrestashopXml<any>("/stock_availables", {
                query: {
                    display: "full",
                    "filter[id_product]": `[${product.id}]`,
                    "filter[id_product_attribute]": `[${combinationId}]`,
                },
            });

            const rawEntriesCombo = stockResponseCombo?.prestashop?.stock_availables?.stock_available;
            const entriesCombo = Array.isArray(rawEntriesCombo) ? rawEntriesCombo : rawEntriesCombo ? [rawEntriesCombo] : [];
            const stockEntryCombo = entriesCombo[0];

            if (!stockEntryCombo) {
                await upsertStockAvailable({
                    id_product: product.id,
                    id_product_attribute: combinationId,
                    id_shop: 1,
                    id_shop_group: 1,
                    quantity: 0,
                    depends_on_stock: false,
                    out_of_stock: 2,
                });

                const res = await applyStockModification(product.id, 0, quantity, combinationId, "import", 1);
                if (!res.success) {
                    console.warn(`applyStockModification failed for product ${product.id} combo ${combinationId}: ${res.message}`);
                }
            } else {
                const currentQuantityCombo = numFromUnknown(stockEntryCombo?.quantity);
                const deltaCombo = quantity - currentQuantityCombo;
                if (deltaCombo !== 0) {
                    const res = await applyStockModification(product.id, currentQuantityCombo, deltaCombo, combinationId, "import", 1);
                    if (!res.success) {
                        console.warn(`applyStockModification failed for product ${product.id} combo ${combinationId}: ${res.message}`);
                    }
                }
            }

            imported += 1;
        } catch (error) {
            failed += 1;
            console.error("Erreur lors de l'import du CSV attribut/stock:", row, error);
        } finally {
            processed += 1;
            reportProgress(row.reference || "Ligne attribut/stock");
        }
    }

	reportProgress("Terminé");

    return { imported, failed };
}