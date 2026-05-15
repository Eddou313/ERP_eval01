import { ensureCategoryExists, listCategoriesSimple } from "../../module/Backoffice/categorie/api/categoriesApi";
import { createProduct, listProductsLight } from "../../module/Backoffice/produit/api/productsApi";
import { createCombination, ensureAttributeGroupExists, ensureAttributeValueExists, getProductAttributeGroups, listAttributeGroupsLight, listAttributeValuesLight } from "../../module/Backoffice/attribue&Caracteristique/api/attributsCaracteristiquesApi";
import { upsertStockAvailable } from "../../module/Backoffice/stock/api/stockApi";
import { ensureTaxExists, ensureTaxRuleExists, ensureTaxRuleGroupExists, listTaxesLight, listTaxRuleGroupsLight } from "../../module/Backoffice/taxes/taxes";
import { normalizeText, slugify } from "../../utils/helper";
import type { colonneCSV } from "./object";
import { importClient } from "../../module/Backoffice/client/api/clientApi";
import { createClientAddress } from "../../module/Backoffice/client/api/clientAdresAPI";
import { createCart, addProductToCart, updateCartItems } from "../../module/Backoffice/panier/api/panierApi";
import { createOrder } from "../../module/Backoffice/commande/api/commandesApi";
import { buildPrestashopXml, requestPrestashopXml } from "../../utils/prestashopClient";
import { numFromUnknown } from "../../utils/helper";
import { isValidDate, toPrestashopDate } from "./utils";

export type ProductImportRow = colonneCSV["produitImport"];
export type ProductAttributeStockImportRow = colonneCSV["produit_Attribut_StockImport"];
export type OrderImportRow = colonneCSV["Commande_client_produit"];

type AchatItem = { reference: string; quantity: number; variant: string };

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
export async function createOrderDetail(orderId: number, productId: number, productAttributeId: number, quantity: number, unitPrice: number): Promise<number> {
    const payload = {
        prestashop: {
            order_detail: {
                id_order: orderId,
                id_product: productId,
                id_product_attribute: productAttributeId,
                product_quantity: quantity,
                product_price: unitPrice,
                unit_price_tax_incl: unitPrice,
                unit_price_tax_excl: unitPrice,
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

function getProductPriceHt(product: { price_ht?: number; base_price?: number; price?: number }): number {
    return Number(product.price_ht ?? product.base_price ?? product.price ?? 0) || 0;
}

function parseTtcToHt(priceTtc: number, taxRate: number): number {
    const rate = Number(taxRate) || 0;
    if (rate <= 0) {
        return roundMoney(priceTtc);
    }

    return roundMoney(priceTtc / (1 + rate / 100));
}

export async function importProduitCsv(rows: ProductImportRow[]): Promise<{ imported: number; failed: number }> {
    const categories = await listCategoriesSimple();
    const taxes = await listTaxesLight();
    const taxRuleGroups = await listTaxRuleGroupsLight();

    const categoryCache = new Map<string, number>();
    const taxCache = new Map<string, number>();
    const taxRuleGroupCache = new Map<string, number>();
    const taxRuleCache = new Map<string, number>();

    for (const category of categories) {
        categoryCache.set(normalizeText(category.name ?? ""), category.id);
    }

    for (const tax of taxes) {
        taxCache.set(tax.rate.toFixed(4), tax.id);
    }

    for (const group of taxRuleGroups) {
        taxRuleGroupCache.set(normalizeText(group.name ?? ""), group.id);
    }

    let imported = 0;
    let failed = 0;

    for (const row of rows) {
        try {
            const categoryId = await ensureCategoryExists(row.categorie, categoryCache, categories);
            const taxRate = parseTaxRate(row.Taxe);
            const taxLabel = `TVA ${Number.isInteger(taxRate) ? taxRate.toFixed(0) : taxRate.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}%`;
            const taxId = await ensureTaxExists(taxRate, taxCache, taxes);
            const taxRuleGroupId = await ensureTaxRuleGroupExists(taxLabel, taxRuleGroupCache, taxRuleGroups);
            await ensureTaxRuleExists(taxRuleGroupId, taxId, taxRate, taxRuleCache, taxLabel, 8);

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
            const priceHt = taxRate > 0 ? roundMoney(priceTtc / (1 + taxRate / 100)) : roundMoney(priceTtc);

            const product = await createProduct({
                id_category_default: categoryId,
                id_tax_rules_group: taxRuleGroupId,
                name: row.nom,
                reference: row.reference,
                price: priceHt,
                wholesale_price: Number(row.prix_achat) || 0,
                active: true,
                available_for_order: true,
                show_price: true,
                visibility: "both",
                link_rewrite: slugify(row.nom),
                ...(availableDate ? { available_date: availableDate } : {}),
                description: `Produit importé depuis CSV: ${row.nom}`,
                description_short: `Import CSV - ${row.reference}`,
            });

            await upsertStockAvailable({
                id_product: product.id,
                id_product_attribute: 0,
                id_shop: 1,
                id_shop_group: 1,
                quantity: 0,
                depends_on_stock: false,
                out_of_stock: 2,
            });

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
    const normalizedReference = normalizeText(String(reference ?? "").trim());
    if (!normalizedReference) {
        return null;
    }

    if (cache.has(normalizedReference)) {
        return cache.get(normalizedReference) ?? null;
    }

    const products = await listProductsLight();
    const match = products.find((product) => normalizeText(product.reference ?? "") === normalizedReference) ?? null;
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
                throw new Error(`Produit parent introuvable pour la référence ${row.reference}`);
            }

            const groupId = await ensureAttributeGroupExists(row.specificité, attributeGroupCache, attributeGroups);
            const valueId = await ensureAttributeValueExists(groupId, row.karazany, attributeValueCache, attributeValues);

            const taxRate = Number(product.tax_rate ?? 20) || 0;
            const basePriceHt = getProductPriceHt(product);
            const targetPriceHt = parseTtcToHt(Number(row.prix_vente_ttc) || 0, taxRate);
            const priceImpactHt = roundMoney(targetPriceHt - basePriceHt);
            const attributeValueIds = [valueId];

            let combinationId = await findCombinationIdByValues(product.id, attributeValueIds);
            if (!combinationId) {
                combinationId = await createCombination(
                    product.id,
                    attributeValueIds,
                    priceImpactHt,
                    Number(row.stock_initial) || 0,
                    `${product.reference ?? row.reference}-${slugify(row.karazany)}`,
                );
            }

            await upsertStockAvailable({
                id_product: product.id,
                id_product_attribute: combinationId,
                id_shop: 1,
                id_shop_group: 1,
                quantity: Number(row.stock_initial) || 0,
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

    let customersCreated = 0;
    let cartsCreated = 0;
    let ordersCreated = 0;
    let failed = 0;

    for (const row of rows) {
        try {
            // 1. Parse customer name
            const { firstname, lastname } = parseCustomerName(row.nom);
            if (!firstname || !row.email || !row.pwd) {
                throw new Error("Données client insuffisantes (nom, email, pwd requis)");
            }

            // 2. Create customer
            const customerId = await importClient({
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
            });
            customersCreated += 1;

            // 3. Create address
            // Parse adresse: simple format "rue, codepostal, ville" or just use default
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

            // 4. Create cart
            const cartId = await createCart({
                id_customer: customerId,
                id_lang: 1,
                id_currency: 1,
                id_shop: 1,
                id_shop_group: 1,
            });
            cartsCreated += 1;

            // 5. Parse etat field to determine if this is a cart-only or a full order
            const etatLower = (row.etat || "").toLowerCase().trim();
            const isCartOnly = !etatLower || etatLower === "dans le panier" || etatLower.includes("panier");

            // 6. Parse and add products to cart
            const achatItems = parseAchatString(row.achat);
            for (const achatItem of achatItems) {
                const product = await findProductByReference(achatItem.reference, productsCache);
                if (!product) {
                    console.warn(`Produit introuvable: ${achatItem.reference}, ignoré`);
                    continue;
                }

                // Find matching combination if variant specified
                let attributeId = 0;
                if (achatItem.variant && product.id) {
                    try {
                        const attrGroups = await getProductAttributeGroups(product.id);
                        const combinations = Array.from(new Map(
                            attrGroups.flatMap((g) => g.combinations ?? []).map((c) => [c.id, c])
                        ).values());
                        const match = combinations.find((c: any) =>
                            (c.attributes || []).some((attr: any) => normalizeText(attr.name ?? "") === normalizeText(achatItem.variant))
                        );
                        if (match) {
                            attributeId = Number(match.id) || 0;
                        }
                    } catch {
                        attributeId = 0;
                    }
                }

                // Add to cart
                await addProductToCart({
                    cartId,
                    customerId,
                    id_product: product.id,
                    id_product_attribute: attributeId,
                    quantity: achatItem.quantity,
                    idLang: 1,
                    idCurrency: 1,
                });
            }

            // 7. If etat indicates cart-only, stop here
            if (isCartOnly) {
                console.log(`Import client #${customerId}: Panier créé (mode ajout panier uniquement)`);
                continue;
            }

            // 8. Create order
            const orderForm = {
                id_customer: customerId,
                id_cart: cartId,
                id_address_delivery: addressId,
                id_address_invoice: addressId,
                id_currency: 1,
                id_lang: 1,
                id_carrier: 0,
                payment_code: "cash",
                total_paid_tax_incl: 0,
                total_paid_tax_excl: 0,
                total_paid: 0,
                total_paid_real: 0,
                total_products: 0,
                total_products_wt: 0,
                total_shipping: 0,
                conversion_rate: 1,
                current_state: 1,
                module: "cash",
                payment: "Paiement par virment",
            };

            const orderId = await createOrder(orderForm as any);
            ordersCreated += 1;

            // 9. Create order details for each product
            for (const achatItem of achatItems) {
                const product = await findProductByReference(achatItem.reference, productsCache);
                if (!product) continue;

                let attributeId = 0;
                if (achatItem.variant && product.id) {
                    try {
                        const attrGroups = await getProductAttributeGroups(product.id);
                        const combinations = Array.from(new Map(
                            attrGroups.flatMap((g) => g.combinations ?? []).map((c) => [c.id, c])
                        ).values());
                        const match = combinations.find((c: any) =>
                            (c.attributes || []).some((attr: any) => normalizeText(attr.name ?? "") === normalizeText(achatItem.variant))
                        );
                        if (match) {
                            attributeId = Number(match.id) || 0;
                        }
                    } catch {
                        attributeId = 0;
                    }
                }

                // Use product price as unit price (simplified; PrestaShop can recalculate)
                const unitPrice = Number(product.price_ht ?? product.price ?? 0) || 0;

                await createOrderDetail(orderId, product.id, attributeId, achatItem.quantity, unitPrice);
            }

            // 10. Clear cart (set quantities to 0)
            if (achatItems.length > 0) {
                await updateCartItems(
                    cartId,
                    customerId,
                    achatItems.map((_) => ({
                        id_product: 0,
                        id_product_attribute: 0,
                        quantity: 0,
                    }))
                );
            }

            console.log(`Import client #${customerId}: Commande créée #${orderId}`);
        } catch (error) {
            failed += 1;
            console.error("Erreur lors de l'import du CSV commande:", row, error);
        }
    }

    return { customersCreated, cartsCreated, ordersCreated, failed };
}
