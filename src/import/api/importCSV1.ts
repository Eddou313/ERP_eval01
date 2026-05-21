import { isValidDate, toPrestashopDate } from "../../files/api/utils";
import { ensureTaxExists, ensureTaxRuleExists, ensureTaxRuleGroupExists, listTaxRuleGroupsLight, type CreatedTax } from "../../module/Backoffice/taxes/taxes";
import { slugify } from "../../utils/helper";
import { ensureCategoryExists, type CreatedCategory } from "./category";
import type { colonneCSV } from "./colonne";
import { createProductSimple, uploadProductImage } from "./produit";
import { normalizeText } from "./zip";
type ZipImageAsset = { blob: Blob; fileName: string };
export type ProductImportRow = colonneCSV["produitImport"];

type ProductImportContext = {
    categoryIdByKey: Map<string, number>;
    taxRuleGroupIdByRateKey: Map<string, number>;
};

async function prepareProductImportContext(rows: ProductImportRow[]): Promise<ProductImportContext> {
    const categories: CreatedCategory[] = [];
    const taxes: CreatedTax[] = [];
    const taxRuleGroups = await listTaxRuleGroupsLight();

    const categoryCache = new Map<string, number>();
    const taxCache = new Map<string, number>();
    const taxRuleGroupCache = new Map<string, number>();
    const taxRuleCache = new Map<string, number>();
    const taxRuleGroupIdByRateKey = new Map<string, number>();

    const uniqueCategories = new Map<string, string>();
    const uniqueTaxRates = new Set<number>();

    for (const row of rows) {
        const categoryName = String(row.categorie ?? "").trim();
        if (categoryName) {
            uniqueCategories.set(normalizeLookupKey(categoryName), categoryName);
        }

        uniqueTaxRates.add(parseTaxRate(row.Taxe));
    }

    for (const categoryName of uniqueCategories.values()) {
        await ensureCategoryExists(categoryName, categoryCache, categories);
    }

    for (const taxRate of uniqueTaxRates) {
        const taxLabel = formatTaxLabel(taxRate);
        const taxId = await ensureTaxExists(taxRate, taxCache, taxes);
        const taxRuleGroupId = await ensureTaxRuleGroupExists(taxLabel, taxRuleGroupCache, taxRuleGroups);
        await ensureTaxRuleExists(taxRuleGroupId, taxId, taxRate, taxRuleCache, taxLabel, 8);

        taxRuleGroupIdByRateKey.set(taxRateKey(taxRate), taxRuleGroupId);
    }

    return {
        categoryIdByKey: categoryCache,
        taxRuleGroupIdByRateKey,
    };
}
function formatTaxLabel(rate: number): string {
    const formattedRate = Number.isInteger(rate)
        ? rate.toFixed(0)
        : rate.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
    return `TVA ${formattedRate}%`;
}
function parseTaxRate(value: string): number {
    const raw = String(value ?? "").trim().replace(",", ".");
    const numericMatch = raw.match(/\d+(?:\.\d+)?/);
    if (!numericMatch) {
        return 20;
    }

    const parsed = Number(numericMatch[0]);
    if (!Number.isFinite(parsed) || parsed < 0) {
        return 20;
    }

    return parsed;
}

function normalizeLookupKey(value: string): string {
    return normalizeText(String(value ?? "").trim());
}

function taxRateKey(rate: number): string {
    return Number(rate || 0).toFixed(4);
}

function roundMoney(value: number): number {
    return Number((Number(value) || 0).toFixed(6));
}
function parseTtcToHt(priceTtc: number, taxRate: number): number {
    const rate = Number(taxRate) || 0;
    if (rate <= 0) {
        return roundMoney(priceTtc);
    }
    return Number((priceTtc / (1 + rate / 100)).toFixed(6));
}

export async function importProduitCsv(rows: ProductImportRow[], imageMap?: Map<string, ZipImageAsset>): Promise<{ imported: number; failed: number }> {
    const importContext = await prepareProductImportContext(rows);

    let imported = 0;
    let failed = 0;

    console.info(`Demarage de l import csv1`);
    for (const row of rows) {
        try {
            const taxRate = parseTaxRate(row.Taxe);
            const categoryName = String(row.categorie ?? "").trim();
            if (!categoryName) {
                throw new Error("Catégorie vide dans le CSV produit");
            }

            const categoryId = importContext.categoryIdByKey.get(normalizeLookupKey(categoryName));
            if (!categoryId) {
                throw new Error(`Catégorie introuvable: ${categoryName}`);
            }

            const taxRuleGroupId = importContext.taxRuleGroupIdByRateKey.get(taxRateKey(taxRate));
            if (!taxRuleGroupId) {
                throw new Error(`Contexte TVA introuvable pour le taux ${taxRate}`);
            }

            const rawAvailableDate = String(row.date_availability_produit ?? "").trim();
            let availableDate = "";
            if (rawAvailableDate) {
                if (!isValidDate(rawAvailableDate) && !/^\d{4}-\d{2}-\d{2}$/.test(rawAvailableDate)) {
                    const confirmed = window.confirm(
                        `La date "${rawAvailableDate}" n'est pas au format DD/MM/YYYY. Voulez-vous la convertir avant l'import ?`,
                    );
                    if (!confirmed) {
                        throw new Error(`Import arrêté par l'utilisateur pour la date ${rawAvailableDate}`);
                        return { imported, failed }
                    }
                }

                const normalizedDate = toPrestashopDate(rawAvailableDate);
                if (!normalizedDate) {
                    throw new Error(`Date invalide: ${rawAvailableDate}`);
                }
                availableDate = normalizedDate;
            }

            const priceTtc = Number(row.prix_ttc) || 0;
            const priceHt = parseTtcToHt(priceTtc, taxRate);

            const product = await createProductSimple({
                id_category_default: categoryId,
                id_tax_rules_group: taxRuleGroupId,
                name: row.nom,
                reference: row.reference,
                price: priceHt,
                wholesale_price: Number(row.prix_achat) || 0,
                available_date: availableDate,
                // ...(availableDate ? { available_date: availableDate } : {}),
                description: `Produit importé depuis CSV: ${row.nom}`,
                description_short: `Import CSV - ${row.reference}`,
                link_rewrite: slugify(row.nom),
            });

            const imageAsset = imageMap?.get(normalizeImageReference(row.reference));
            if (imageAsset) {
                try {
                    await uploadProductImage(product.id, imageAsset.blob, imageAsset.fileName);
                } catch (imageError) {
                    console.warn(`Impossible d'upload l'image du produit ${row.reference}:`, imageError);
                }
            }

            imported += 1;
        } catch (error) {
            failed += 1;
            console.error("Erreur lors de l'import du produit CSV:", row, error);
        }
    }
    console.info(`Import CSV1 terminer`);
    return { imported, failed };
}
function normalizeImageReference(value: string): string {
    return normalizeText(String(value ?? "").replace(/\.[^.]+$/, ""));
}
