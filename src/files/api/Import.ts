import { ensureCategoryExists, listCategoriesSimple } from "../../module/Backoffice/categorie/api/categoriesApi";
import { createProduct, listProductsLight, updateProduct, uploadProductImage } from "../../module/Backoffice/produit/api/productsApi";
import { createCombination, ensureAttributeGroupExists, ensureAttributeValueExists, getProductAttributeGroups, listAttributeGroupsLight, listAttributeValuesLight, updateCombination } from "../../module/Backoffice/attribue&Caracteristique/api/attributsCaracteristiquesApi";
import { ensureTaxExists, ensureTaxRuleExists, ensureTaxRuleGroupExists, listTaxesLight, listTaxRuleGroupsLight } from "../../module/Backoffice/taxes/taxes";
import { normalizeText, slugify } from "../../utils/helper";
import type { colonneCSV } from "./object";
import { importClient } from "../../module/Backoffice/client/api/clientApi";
import { createClientAddress } from "../../module/Backoffice/client/api/clientAdresAPI";
import { createCart } from "../../module/Backoffice/panier/api/panierApi";
import { createOrder, updateOrderState } from "../../module/Backoffice/commande/api/commandesApi";
import { getAllModeLivraison } from "../../module/Backoffice/Livraison/api/LivraisonApi";
import { buildPrestashopXml, requestPrestashopXml } from "../../utils/prestashopClient";
import { asArray, numFromUnknown } from "../../utils/helper";
import { isValidDate, toPrestashopDate } from "./utils";
import { upsertStockAvailable } from "../../module/Backoffice/stock/api/stockApi";

export type ProductImportRow = colonneCSV["produitImport"];
export type ProductAttributeStockImportRow = colonneCSV["produit_Attribut_StockImport"];
export type OrderImportRow = colonneCSV["Commande_client_produit"];

type AchatItem = { reference: string; quantity: number; variant: string };
type ZipImageAsset = { blob: Blob; fileName: string };
type PreparedOrderRow = {
    productId: number;
    productAttributeId: number;
    quantity: number;
    reference: string;
    variant: string;
    supplierReference: string;
};

function resolveOrderStateId(etat: string): number {
    const value = String(etat ?? "").trim().toLowerCase();
    if (!value || value.includes("panier")) {
        return 0;
    }

    if (value.includes("attente")) return 1;
    if (value.includes("paiement") && value.includes("accept")) return 2;
    if (value.includes("prepar") || value.includes("prépar")) return 3;
    if (value.includes("expedi") || value.includes("expédi")) return 4;
    if (value.includes("livr")) return 5;
    if (value.includes("annul")) return 6;
    if (value.includes("rembours")) return 7;
    if (value.includes("retour")) return 8;

    return 2;
}

function normalizeImageReference(value: string): string {
    return normalizeText(String(value ?? "").replace(/\.[^.]+$/, ""));
}

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

/**
 * Parse le format "achat" : [("REF";qty;"variant"),("REF2";qty2;"")]
 * Retourne un tableau d'articles {reference, quantity, variant}
 */
export function parseAchatString(achatStr: string): AchatItem[] {
    if (!achatStr || !achatStr.trim()) return [];

    const trimmed = achatStr.trim();
    if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) return [];

    const content = trimmed.slice(1, -1); // Remove [ ]
    const itemPattern = /\("([^"]*)";\s*(\d+);\s*"([^"]*)"\)/g;
    const items: AchatItem[] = [];
    let match;

    while ((match = itemPattern.exec(content)) !== null) {
        items.push({
            reference: match[1],
            quantity: Number(match[2]) || 0,
            variant: match[3] || "",
        });
    }

    return items;
}

/**
 * Parse le nom complet en firstname/lastname
 * Heuristique simple : split sur le premier espace
 * "Jean Dupont" → {firstname: "Jean", lastname: "Dupont"}
 * "Jean" → {firstname: "Jean", lastname: ""}
 */
export function parseCustomerName(fullName: string): { firstname: string; lastname: string } {
    const trimmed = (fullName || "").trim();
    if (!trimmed) return { firstname: "", lastname: "" };

    const parts = trimmed.split(/\s+/);
    if (parts.length === 0) return { firstname: "", lastname: "" };
    if (parts.length === 1) return { firstname: parts[0], lastname: "" };

    return {
        firstname: parts[0],
        lastname: parts.slice(1).join(" "),
    };
}

/**
 * Create an order detail entry via POST /order_details
 */
export async function createOrderDetail(
    orderId: number,
    productId: number,
    productAttributeId: number,
    quantity: number,
    unitPrice: number,
    shopId = 1,
    warehouseId = 1,
): Promise<number> {
    const payload = {
        prestashop: {
            order_detail: {
                id_order: orderId,
                id_product: productId,
                id_product_attribute: productAttributeId,
                id_shop: shopId,
                id_warehouse: warehouseId,
                quantity: quantity,
                price: unitPrice,
                product_quantity: quantity,
                product_price: unitPrice,
                unit_price_tax_incl: unitPrice,
                unit_price_tax_excl: unitPrice,
                product_name: `Produit ${productId} ${productAttributeId ? `(combinaison ${productAttributeId})` : ""}`,
            },
        },
    };

    const xml = buildPrestashopXml(payload);
    const response = await requestPrestashopXml<{ prestashop: { order_detail: { id: unknown } } }>("/order_details", {
        method: "POST",
        bodyXml: xml,
    });

    const detailId = numFromUnknown(response?.prestashop?.order_detail?.id);
    if (!Number.isFinite(detailId) || detailId <= 0) {
        throw new Error("Erreur lors de la création du détail de commande");
    }

    return detailId;
}

export function parseTaxRate(value: string): number {
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

export function roundMoney(value: number): number {
    return Number((Number(value) || 0).toFixed(2));
}

function parseTtcToHt(priceTtc: number, taxRate: number): number {
    const rate = Number(taxRate) || 0;
    if (rate <= 0) {
        return roundMoney(priceTtc);
    }

    // Keep higher precision when converting TTC -> HT to avoid
    // double-rounding issues when UI or PrestaShop re-applies taxes.
    // Use 6 decimals for the HT value and let display logic round to 2 decimals.
    const ht = priceTtc / (1 + rate / 100);
    return Number(ht.toFixed(6));
}

function normalizeLookupKey(value: string): string {
    return normalizeText(String(value ?? "").trim());
}

function taxRateKey(rate: number): string {
    return Number(rate || 0).toFixed(4);
}

function formatTaxLabel(rate: number): string {
    const formattedRate = Number.isInteger(rate)
        ? rate.toFixed(0)
        : rate.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
    return `TVA ${formattedRate}%`;
}

type PreparedProductImportContext = {
    categoryIdByKey: Map<string, number>;
    taxByRateKey: Map<string, { taxId: number; taxRuleGroupId: number; taxRate: number; taxLabel: string }>;
};

async function prepareProductImportContext(rows: ProductImportRow[]): Promise<PreparedProductImportContext> {
    const categories = await listCategoriesSimple();
    const taxes = await listTaxesLight();
    const taxRuleGroups = await listTaxRuleGroupsLight();

    const categoryCache = new Map<string, number>();
    const taxCache = new Map<string, number>();
    const taxRuleGroupCache = new Map<string, number>();
    const taxRuleCache = new Map<string, number>();

    for (const category of categories) {
        categoryCache.set(normalizeLookupKey(category.name ?? ""), category.id);
    }

    for (const tax of taxes) {
        taxCache.set(taxRateKey(tax.rate), tax.id);
    }

    for (const group of taxRuleGroups) {
        taxRuleGroupCache.set(normalizeLookupKey(group.name ?? ""), group.id);
    }

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

    const taxByRateKey = new Map<string, { taxId: number; taxRuleGroupId: number; taxRate: number; taxLabel: string }>();

    for (const taxRate of uniqueTaxRates) {
        const taxLabel = formatTaxLabel(taxRate);
        const taxId = await ensureTaxExists(taxRate, taxCache, taxes);
        const taxRuleGroupId = await ensureTaxRuleGroupExists(taxLabel, taxRuleGroupCache, taxRuleGroups);
        await ensureTaxRuleExists(taxRuleGroupId, taxId, taxRate, taxRuleCache, taxLabel, 8);

        taxByRateKey.set(taxRateKey(taxRate), {
            taxId,
            taxRuleGroupId,
            taxRate,
            taxLabel,
        });
    }

    return {
        categoryIdByKey: categoryCache,
        taxByRateKey,
    };
}

export async function importProduitCsv(rows: ProductImportRow[], options?: { imageMap?: Map<string, ZipImageAsset> }): Promise<{ imported: number; failed: number }> {
    const importContext = await prepareProductImportContext(rows);

    let imported = 0;
    let failed = 0;

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

            const taxContext = importContext.taxByRateKey.get(taxRateKey(taxRate));
            if (!taxContext) {
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

            const product = await createProduct({
                id_category_default: categoryId,
                id_tax_rules_group: taxContext.taxRuleGroupId,
                name: row.nom,
                reference: row.reference,
                price: priceHt,
                state: 1,
                wholesale_price: Number(row.prix_achat) || 0,
                active: false,
                available_for_order: false,
                show_price: false,
                visibility: "none",
                link_rewrite: slugify(row.nom),
                ...(availableDate ? { available_date: availableDate } : {}),
                description: `Produit importé depuis CSV: ${row.nom}`,
                description_short: `Import CSV - ${row.reference}`,
            });

            const imageAsset = options?.imageMap?.get(normalizeImageReference(row.reference));
            if (imageAsset) {
                try {
                    const imageId = await uploadProductImage(product.id, imageAsset.blob, imageAsset.fileName);
                    await updateProduct(product.id, { id_default_image: imageId } as any);
                } catch (imageError) {
                    console.warn(`Impossible d'upload l'image du produit ${row.reference}:`, imageError);
                }
            }

            await updateProduct(product.id, {
                id_category_default: categoryId,
                id_tax_rules_group: taxContext.taxRuleGroupId,
                active: true,
                available_for_order: true,
                show_price: true,
                visibility: "both",
                available_date: availableDate || undefined,
                reference: row.reference,
                name: row.nom,
                price: priceHt,
                wholesale_price: Number(row.prix_achat) || 0,
                description: `Produit importé depuis CSV: ${row.nom}`,
                description_short: `Import CSV - ${row.reference}`,
                link_rewrite: slugify(row.nom),
            } as any);

            imported += 1;
        } catch (error) {
            failed += 1;
            console.error("Erreur lors de l'import du produit CSV:", row, error);
        }
    }

    return { imported, failed };
}

type ProductLight = Awaited<ReturnType<typeof listProductsLight>>[number];

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
    const match = products.find((product) => {
        const productReference = normalizeProductReference(product.reference ?? "");
        if (productReference === normalizedReference) return true;
        return compactReference(productReference) === compactTarget;
    }) ?? null;

    if (match) {
        cache.set(normalizedReference, match);
        return match;
    }

    try {
        const response = await requestPrestashopXml<any>("/products", {
            query: {
                display: "full",
                "filter[reference]": `[${reference}]`,
            },
        });
        const productsRaw = response?.prestashop?.products?.product;
        const apiCandidates = Array.isArray(productsRaw) ? productsRaw : productsRaw ? [productsRaw] : [];
        const apiMatch = apiCandidates.find((product: any) => compactReference(String(product?.reference ?? product?.name ?? "")) === compactTarget) ?? null;
        if (apiMatch) {
            const product = (await listProductsLight()).find((item) => item.id === Number(apiMatch?.id ?? apiMatch?.["@_id"])) ?? null;
            if (product) {
                cache.set(normalizedReference, product);
                return product;
            }
        }
    } catch {
        // fallback below
    }

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

async function findCustomerIdByEmail(email: string): Promise<number | null> {
    const trimmedEmail = String(email ?? "").trim();
    if (!trimmedEmail) {
        return null;
    }

    try {
        const search = await requestPrestashopXml<any>("/customers", {
            query: {
                display: "[id]",
                "filter[email]": `[${trimmedEmail}]`,
            },
        });

        const first = asArray(search?.prestashop?.customers?.customer ?? [])[0];
        const existingId = Number(first?.["@_id"] ?? first?.id);
        if (Number.isFinite(existingId) && existingId > 0) {
            return existingId;
        }
    } catch {
        // Ignore lookup failure and fallback to creation flow.
    }

    return null;
}

async function findCombinationIdBySupplierReference(productId: number, reference: string, variant: string): Promise<number> {
    const targetCandidates = buildCombinationReferenceCandidates(reference, variant);
    if (targetCandidates.length === 0) {
        return 0;
    }

    try {
        const attrGroups = await getProductAttributeGroups(productId);
        const combinations = Array.from(
            new Map(attrGroups.flatMap((group) => group.combinations ?? []).map((combination) => [combination.id, combination])).values(),
        );

        const match = combinations.find((combination: any) => {
            const combinationReference = normalizeSupplierReference(combination?.reference ?? "");
            const supplierReference = normalizeSupplierReference(combination?.supplier_reference ?? "");
            if (!combinationReference && !supplierReference) {
                return false;
            }

            return targetCandidates.some((candidate) => candidate === combinationReference || candidate === supplierReference);
        });

        return Number(match?.id) || 0;
    } catch {
        return 0;
    }
}

export async function importProduitAttributStockCsv(rows: ProductAttributeStockImportRow[]): Promise<{ imported: number; failed: number }> {
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

    for (const row of rows) {
        try {
            const product = await findProductByReference(row.reference, productsCache);
            if (!product) {
                failed += 1;
                console.warn(`Produit parent introuvable pour la référence ${row.reference}`);
                continue;
            }

            // Chaque ligne CSV = une seule déclinaison simple avec un seul attribut
            const specName = String(row.specificité ?? "").trim();
            const valueName = String(row.karazany ?? "").trim();
            const quantity = Number(row.stock_initial) || 0;
            const priceTtc = Number(row.prix_vente_ttc) || 0;
            const taxRate = Number(product.tax_rate ?? 20) || 0;
            const priceHtRaw = parseTtcToHt(priceTtc, taxRate);
            // Utiliser Math.ceil pour la 3ème décimale afin que le TTC arrondi = TTC voulu
            const priceHt = Math.ceil(priceHtRaw * 1000) / 1000;

            // Cas 1: Pas d'attribut → produit simple (mise à jour stock principal)
            if (!specName) {
                if (Number.isFinite(priceTtc) && priceTtc > 0) {
                    try {
                        await updateProduct(product.id, { price: priceHt } as any);
                    } catch (err) {
                        console.warn(`Impossible de mettre à jour le prix du produit ${product.id}:`, err);
                    }
                }

                await upsertStockAvailable({
                    id_product: product.id,
                    id_product_attribute: 0,
                    id_shop: 1,
                    id_shop_group: 1,
                    quantity,
                    depends_on_stock: false,
                    out_of_stock: 2,
                });

                imported += 1;
                continue;
            }

            // Cas 2: Attribut fourni mais pas de valeur → erreur
            if (!valueName) {
                failed += 1;
                console.warn(`Ligne ignorée: valeur d'attribut vide pour la référence ${row.reference} (specificité=${specName})`);
                continue;
            }

            // Cas 3: créer/mettre à jour une déclinaison avec UN SEUL attribut
            const groupId = await ensureAttributeGroupExists(specName, attributeGroupCache, attributeGroups);
            const valueId = await ensureAttributeValueExists(groupId, valueName, attributeValueCache, attributeValues);

            const reference = `${product.reference ?? row.reference}-${slugify(valueName)}`;
            // Utiliser directement priceHt avec 3 décimales (éviter roundMoney qui arrondit à 2)
            const priceImpactHt = priceHt;

            // Créer ou mettre à jour la déclinaison (ps_product_attribute + association attribut)
            let combinationId = await findCombinationIdByValues(product.id, [valueId]);

            if (!combinationId) {
                combinationId = await createCombination(product.id, [valueId], priceImpactHt, quantity, reference);
            } else {
                await updateCombination(combinationId, product.id, [valueId], priceImpactHt, quantity, reference);
            }

            // Stock de la déclinaison
            await upsertStockAvailable({
                id_product: product.id,
                id_product_attribute: combinationId,
                id_shop: 1,
                id_shop_group: 1,
                quantity,
                depends_on_stock: false,
                out_of_stock: 2,
            });

            imported += 1;
        } catch (error) {
            failed += 1;
            console.error("Erreur lors de l'import du CSV attribut/stock:", row, error);
        }
    }

    return { imported, failed };
}

export async function importProduitCommandeCsv(rows: OrderImportRow[]): Promise<{ customersCreated: number; cartsCreated: number; ordersCreated: number; failed: number }> {
    const productsCache = new Map<string, ProductLight | null>();
    const countryIdFrance = 8; // France
    const carriers = await getAllModeLivraison().catch(() => []);
    const defaultCarrierId = carriers[0]?.id || 1;

    let customersCreated = 0;
    let cartsCreated = 0;
    let ordersCreated = 0;
    let failed = 0;

    for (const row of rows) {
        try {
            const { firstname, lastname } = parseCustomerName(row.nom);
            if (!firstname || !row.email || !row.pwd) {
                throw new Error("Données client insuffisantes (nom, email, pwd requis)");
            }

            const achatItems = parseAchatString(row.achat);
            if (achatItems.length === 0) {
                throw new Error("Achat vide ou invalide dans le CSV commande");
            }

            const resolvedRows: PreparedOrderRow[] = [];
            for (const achatItem of achatItems) {
                const product = await findProductByReference(achatItem.reference, productsCache);
                if (!product) {
                    console.warn(`Produit introuvable: ${achatItem.reference}, ignoré`);
                    continue;
                }

                const quantity = Math.max(0, Number(achatItem.quantity) || 0);
                if (!quantity) {
                    continue;
                }

                const productAttributeId = achatItem.variant
                    ? await findCombinationIdBySupplierReference(product.id, achatItem.reference, achatItem.variant)
                    : 0;

                if (achatItem.variant && !productAttributeId) {
                    console.warn(
                        `Combinaison introuvable via supplier_reference pour ${achatItem.reference} + ${achatItem.variant} (produit #${product.id})`,
                    );
                }

                resolvedRows.push({
                    productId: product.id,
                    productAttributeId,
                    quantity,
                    reference: achatItem.reference,
                    variant: achatItem.variant,
                    supplierReference: `${achatItem.reference}${achatItem.variant ? achatItem.variant : ""}`,
                });
            }

            if (resolvedRows.length === 0) {
                throw new Error("Aucune ligne valide à importer pour la commande");
            }

            console.log(
                "PrestaShop payload à insérer",
                JSON.stringify(
                    {
                        customer: {
                            firstname,
                            lastname: lastname || ".",
                            email: row.email,
                            hasPassword: Boolean(row.pwd),
                        },
                        achat: achatItems,
                        cart_rows: resolvedRows.map((line) => ({
                            id_product: line.productId,
                            id_product_attribute: line.productAttributeId,
                            quantity: line.quantity,
                        })),
                        order_rows: resolvedRows.map((line) => ({
                            id_product: line.productId,
                            id_product_attribute: line.productAttributeId,
                            quantity: line.quantity,
                        })),
                    },
                    null,
                    2,
                ),
            );

            const customerDateAdd = String(row.date ?? "").trim();
            const normalizedCustomerDate = customerDateAdd ? toPrestashopDate(customerDateAdd) : "";
            if (customerDateAdd && !normalizedCustomerDate) {
                throw new Error(`Date client invalide: ${customerDateAdd}`);
            }

            let customerId = await findCustomerIdByEmail(row.email);
            if (!customerId) {
                customerId = await importClient({
                    firstname,
                    lastname: lastname || ".",
                    email: row.email,
                    passwd: row.pwd,
                    active: 1,
                    newsletter: 0,
                    optin: 0,
                    birthday: "",
                    website: "",
                    note: "",
                    is_guest: 0,
                    deleted: 0,
                    ...(normalizedCustomerDate ? { date_add: normalizedCustomerDate } : {}),
                });
                customersCreated += 1;
            }

            const addressParts = (row.adresse || "").split(/,|\n/);
            const addressLine1 = addressParts[0]?.trim() || "Adresse non spécifiée";
            const addressPostal = addressParts[1]?.trim() || "00000";
            const addressCity = addressParts[2]?.trim() || "Ville";

            const addressId = await createClientAddress(customerId, {
                firstname,
                lastname: lastname || ".",
                address1: addressLine1,
                postcode: addressPostal,
                city: addressCity,
                id_country: countryIdFrance,
            });

            const cartId = await createCart({
                id_customer: customerId,
                id_lang: 1,
                id_currency: 1,
                id_shop: 1,
                id_shop_group: 1,
                id_address_delivery: addressId,
                id_address_invoice: addressId,
                id_carrier: defaultCarrierId,
                items: resolvedRows.map((line) => ({
                    id_product: line.productId,
                    id_product_attribute: line.productAttributeId,
                    quantity: line.quantity,
                })),
            });
            cartsCreated += 1;

            const etatLower = (row.etat || "").toLowerCase().trim();
            const isCartOnly = !etatLower || etatLower === "dans le panier" || etatLower.includes("panier");
            const orderStateId = resolveOrderStateId(etatLower);

            if (isCartOnly) {
                console.log(`Import client #${customerId}: panier créé #${cartId}`);
                continue;
            }

            const orderId = await createOrder({
                id_customer: customerId,
                id_cart: cartId,
                id_address_delivery: addressId,
                id_address_invoice: addressId,
                id_currency: 1,
                id_lang: 1,
                id_carrier: defaultCarrierId,
                payment_code: "cash",
                module: "cash",
                payment: "Paiement par virement",
                current_state: orderStateId || 2,
                conversion_rate: 1,
                total_paid_tax_incl: 0,
                total_paid_tax_excl: 0,
                total_paid: 0,
                total_paid_real: 0,
                total_products: 0,
                total_products_wt: 0,
                total_shipping: 0,
                order_rows: resolvedRows.map((line) => ({
                    product_id: line.productId,
                    product_quantity: line.quantity,
                })),
            } as any);
            ordersCreated += 1;

            for (const line of resolvedRows) {
                await createOrderDetail(orderId, line.productId, line.productAttributeId, line.quantity, 0, 1, 1);
            }

            if (orderStateId > 0) {
                await updateOrderState(orderId, orderStateId);
            }

            console.log(`Import client #${customerId}: commande créée #${orderId}`);
        } catch (error) {
            failed += 1;
            console.error("Erreur lors de l'import du CSV commande:", row, error);
        }
    }

    return { customersCreated, cartsCreated, ordersCreated, failed };
}
