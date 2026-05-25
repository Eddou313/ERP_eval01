import { getAllModeLivraison } from "../../module/Backoffice/Livraison/api/LivraisonApi";
import { validateUnsignedId } from "../../utils/helper";
import { buildPrestashopXml, requestPrestashopXml } from "../../utils/prestashopClient";
import { type ProduitAchat } from "./importCSV3";
import {
    findCombinationIdInContext,
    findImportedProductByReference,
    type ImportSessionContext,
} from "./importContext";

export async function createCart(
    customerId: number,
    secure_key: string,
    adresse: number
): Promise<{ cartId: number }> {
    const addressId = adresse;

    const created = await requestPrestashopXml<any>("/carts", {
        method: "POST",
        bodyXml: buildPrestashopXml({
            prestashop: {
                cart: {
                    id_currency: 1,
                    id_lang: 1,
                    id_customer: customerId,
                    id_carrier: 0,
                    id_address_delivery: addressId,
                    id_address_invoice: addressId,
                    recyclable: 0,
                    gift: 0,
                    gift_message: "",
                    mobile_theme: 0,
                    delivery_option: "",
                    secure_key: secure_key,
                    allow_seperated_package: 0,
                    associations: { cart_rows: [] },
                },
            },
        }),
    });

    const cartId = Number(created?.prestashop?.cart?.id);
    if (!cartId) {
        throw new Error(`Création panier échouée`);
        return { cartId: 0 };
    }
    return { cartId };
}

export async function addProductsToCart(
    cartId: number,
    produits: ProduitAchat[],
    date: string,
    customerId: number,
    addressId: number,
    context?: ImportSessionContext,
): Promise<void> {
    const [day, month, year] = date.split("/");
    const dateAdd = `${year}-${month}-${day} 00:00:00`;

    const cartRes = await requestPrestashopXml<any>(`/carts/${cartId}`, {
        query: { display: "full" },
    });
    const cart = cartRes?.prestashop?.cart;
    if (!cart) throw new Error(`Panier ${cartId} introuvable`);

    const secureKey = cart.secure_key ?? "";

    const rawRows = cart.associations?.cart_rows?.cart_row;
    const existingRows: any[] = !rawRows
        ? []
        : Array.isArray(rawRows)
            ? rawRows
            : rawRows?.id_product
                ? [rawRows]
                : [];

    const newRows: any[] = [];

    // ── Traiter les produits séquentiellement (évite ERR_NETWORK_CHANGED) ──
    for (const produit of produits) {
        const productReel = context ? findImportedProductByReference(context, produit.reference) : null;
        if (!productReel) {
            console.warn(`[cart] Produit introuvable : ${produit.reference}`);
            continue;
        }

        const productId = Number(productReel.id);
        const combinationId = context && produit.karazany.trim() !== ""
            ? findCombinationIdInContext(context, productId, produit.karazany)
            : 0;

        if (produit.karazany.trim() !== "" && !combinationId) {
            throw new Error(`Combinaison introuvable dans le contexte pour ${produit.reference} / ${produit.karazany}`);
        }

        console.log(combinationId);
        const existing = existingRows.find(
            (r) =>
                extractId(r.id_product) === productId &&
                extractId(r.id_product_attribute) === combinationId
        );

        if (existing) {
            existing.quantity = Number(existing.quantity) + produit.quantite;
        } else {
            newRows.push({
                id_product: productId,
                id_product_attribute: combinationId,
                id_address_delivery: addressId,
                quantity: produit.quantite,
            });
        }
    }

    const allRows = [...existingRows, ...newRows];

    // ✅ Supprimé : id_shop et id_shop_group → causes le 500
    await requestPrestashopXml<any>(`/carts/${cartId}`, {
        method: "PUT",
        bodyXml: buildPrestashopXml({
            prestashop: {
                cart: {
                    id: cartId,
                    // id_currency: Number(cart.id_currency) || 1,
                    // id_lang: Number(cart.id_lang) || 1,
                    id_currency: extractId(cart.id_currency) || 1,
                    id_lang: extractId(cart.id_lang) || 1,
                    id_customer: customerId,
                    id_carrier: extractId(cart.id_carrier) || 0,
                    // id_carrier: Number(cart.id_carrier) ,
                    id_address_delivery: addressId,
                    id_address_invoice: addressId,
                    recyclable: 0,
                    gift: 0,
                    // gift_message: "",
                    mobile_theme: 0,
                    // delivery_option: "",
                    secure_key: secureKey,
                    allow_seperated_package: 0,
                    id_shop: 1,
                    id_shop_group: 1,
                    date_add: dateAdd,
                    date_upd: dateAdd,
                    associations: {
                        cart_rows: allRows.length > 0
                            ? { cart_row: allRows }
                            : [],
                    },
                },
            },
        }),
    });
}
export async function resolveCarrierId(carrierId: unknown): Promise<number> {
    const numericCarrierId = Number(carrierId);
    if (validateUnsignedId(numericCarrierId)) return numericCarrierId;

    const carriers = await getAllModeLivraison().catch(() => []);
    const firstActiveCarrierId = carriers[0]?.id;
    if (validateUnsignedId(firstActiveCarrierId)) return firstActiveCarrierId;

    return 1;
}
export async function computeCartTotals(cartId: number): Promise<{
    total_products: number;
    total_products_wt: number;
    total_paid: number;
    total_paid_real: number;
}> {
    return computeCartTotalsInternal(cartId, undefined);
}

export async function computeCartTotalsFromContext(
    cartId: number,
    context: ImportSessionContext,
): Promise<{
    total_products: number;
    total_products_wt: number;
    total_paid: number;
    total_paid_real: number;
}> {
    return computeCartTotalsInternal(cartId, context);
}

async function computeCartTotalsInternal(
    cartId: number,
    context?: ImportSessionContext,
): Promise<{
    total_products: number;
    total_products_wt: number;
    total_paid: number;
    total_paid_real: number;
}> {
    const emptyTotals = {
        total_products: 0,
        total_products_wt: 0,
        total_paid: 0,
        total_paid_real: 0,
    };

    try {
        const res = await requestPrestashopXml<any>(`/carts/${cartId}`, {
            query: { display: "full" },
        });

        const rawRows = res?.prestashop?.cart?.associations?.cart_rows?.cart_row;
        if (!rawRows) return emptyTotals;

        const rows = Array.isArray(rawRows) ? rawRows : [rawRows];

        const grouped = new Map<string, { productId: number; combinationId: number; quantity: number }>();

        for (const row of rows) {
            const productId = extractId(row.id_product);
            const combinationId = extractId(row.id_product_attribute) || 0;
            const quantity = Number(row.quantity) || 0;

            if (!productId || quantity <= 0) continue;

            const key = `${productId}_${combinationId}`;
            if (!grouped.has(key)) {
                grouped.set(key, { productId, combinationId, quantity });
            } else {
                grouped.get(key)!.quantity += quantity;
            }
        }

        let totalHt = 0;
        let totalTtc = 0;

        if (context) {
            for (const item of grouped.values()) {
                const product = context.productsById.get(item.productId);
                if (!product) {
                    throw new Error(`[cart totals] Produit ${item.productId} absent du contexte d'import`);
                }

                const combination = item.combinationId > 0 ? context.combinationById.get(item.combinationId) : null;
                const unitHt = product.priceHt + Number(combination?.priceImpactHt ?? 0);
                const unitTtc = unitHt * (1 + product.taxRate / 100);

                totalHt += unitHt * item.quantity;
                totalTtc += unitTtc * item.quantity;
            }

            return {
                total_products: Math.round(totalHt * 100) / 100,
                total_products_wt: Math.round(totalTtc * 100) / 100,
                total_paid: Math.round(totalTtc * 100) / 100,
                total_paid_real: Math.round(totalTtc * 100) / 100,
            };
        }

        // ── Séquentiel pour éviter ERR_NETWORK_CHANGED ──
        for (const item of grouped.values()) {
            let basePriceHt = 0;
            let taxRate = 20;

            try {
                const productRes = await requestPrestashopXml<any>(`/products/${item.productId}`, {
                    query: { display: "[price,id_tax_rules_group]" },
                });
                const product = productRes?.prestashop?.product;
                basePriceHt = Number(product?.price) || 0;
                const taxGroupId = extractId(product?.id_tax_rules_group);

                if (taxGroupId > 0) {
                    try {
                        const taxGroupRes = await requestPrestashopXml<any>(`/tax_rule_groups/${taxGroupId}`, {
                            query: { display: "full" },
                        });
                        const rawTaxRule = taxGroupRes?.prestashop?.tax_rule_group?.associations?.tax_rules?.tax_rule;
                        const firstRule = Array.isArray(rawTaxRule) ? rawTaxRule[0] : rawTaxRule;
                        const taxId = extractId(firstRule?.id_tax);

                        if (taxId > 0) {
                            const taxRes = await requestPrestashopXml<any>(`/taxes/${taxId}`, {
                                query: { display: "[rate]" },
                            });
                            taxRate = Number(taxRes?.prestashop?.tax?.rate) || 20;
                        }
                    } catch {
                        console.warn(`[cart totals] Taxe introuvable pour groupe ${taxGroupId}`);
                    }
                }
            } catch {
                console.warn(`[cart totals] Produit ${item.productId} introuvable`);
                continue;
            }

            let combinationImpactHt = 0;
            if (item.combinationId > 0) {
                try {
                    const combRes = await requestPrestashopXml<any>(`/combinations/${item.combinationId}`, {
                        query: { display: "[price]" },
                    });
                    combinationImpactHt = Number(combRes?.prestashop?.combination?.price) || 0;
                } catch {
                    console.warn(`[cart totals] Combinaison ${item.combinationId} introuvable`);
                }
            }

            const unitHt = basePriceHt + combinationImpactHt;
            const unitTtc = unitHt * (1 + taxRate / 100);

            totalHt += unitHt * item.quantity;
            totalTtc += unitTtc * item.quantity;
        }

        return {
            total_products: Math.round(totalHt * 100) / 100,
            total_products_wt: Math.round(totalTtc * 100) / 100,
            total_paid: Math.round(totalTtc * 100) / 100,
            total_paid_real: Math.round(totalTtc * 100) / 100,
        };
    } catch (error) {
        console.error(`[cart totals] erreur panier ${cartId}`, error);
        return emptyTotals;
    }
}

export function extractId(val: unknown): number {
    if (val === null || val === undefined) return 0;
    if (typeof val === "number") return val;
    if (typeof val === "string") return Number(val) || 0;
    if (typeof val === "object") {
        const obj = val as Record<string, unknown>;
        const text = obj["#text"] ?? obj["_"] ?? obj["__text"] ?? obj["$t"] ?? null;
        if (text !== null) return Number(text) || 0;
    }
    return 0;
}