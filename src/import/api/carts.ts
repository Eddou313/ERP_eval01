import { getAllModeLivraison } from "../../module/Backoffice/Livraison/api/LivraisonApi";
import { validateUnsignedId } from "../../utils/helper";
import { buildPrestashopXml, requestPrestashopXml } from "../../utils/prestashopClient";
import { getCombinationId } from "./attribut";
import { getOrCreateAddress } from "./customers";
import { generateSecureKey, type ProduitAchat } from "./importCSV3";
import { findProductByReference } from "./produit";

export async function createCart(
    customerId: number,
    secure_key: string,
    adresse: string
): Promise<{ cartId: number; addressId: number; secure_key: string }> {
    const addressId = await getOrCreateAddress(customerId, adresse);

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
    if (!cartId) throw new Error(`Création panier échouée`);
    return { cartId, addressId, secure_key };
}

export async function addProductsToCart(
    cartId: number,
    produits: ProduitAchat[],
    date: string,
    customerId: number,
    addressId: number
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

    for (const produit of produits) {
        const productReel = await findProductByReference(produit.reference, new Map());
        if (!productReel) {
            console.warn(`[cart] Produit introuvable : ${produit.reference}`);
            continue;
        }

        const productId = Number(productReel.id);
        const combinationId = produit.karazany.trim() !== ""
            ? await getCombinationId(productId, produit.karazany)
            : 0;

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

    await requestPrestashopXml<any>(`/carts/${cartId}`, {
        method: "PUT",
        bodyXml: buildPrestashopXml({
            prestashop: {
                cart: {
                    id: cartId,
                    id_currency: Number(cart.id_currency) || 1,
                    id_lang: Number(cart.id_lang) || 1,
                    id_customer: customerId,
                    id_carrier: Number(cart.id_carrier) || 0,
                    id_address_delivery: addressId,
                    id_address_invoice: addressId,
                    recyclable: 0,
                    gift: 0,
                    gift_message: "",
                    mobile_theme: 0,
                    delivery_option: "",
                    secure_key: secureKey,
                    allow_seperated_package: 0,
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
    const fallback = {
        total_products: 1,
        total_products_wt: 1,
        total_paid: 1,
        total_paid_real: 0,
    };

    try {
        const res = await requestPrestashopXml<any>(`/carts/${cartId}`, {
            query: { display: "full" },
        });

        const rawRows = res?.prestashop?.cart?.associations?.cart_rows?.cart_row;
        if (!rawRows) return fallback;

        const list = Array.isArray(rawRows) ? rawRows : [rawRows];
        let totalHt = 0;
        let totalTtc = 0;

        for (const row of list) {
            // ✅ extractId gère les objets xlink { "#text": "104", ... }
            const productId = extractId(row.id_product);
            const combinationId = extractId(row.id_product_attribute);
            const qty = extractId(row.quantity) || Number(row.quantity) || 1;

            if (!productId) {
                console.warn(`[cart totals] id_product invalide — panier ${cartId}:`, row.id_product);
                continue;
            }

            let priceHt = 0;
            let taxRate = 20;

            try {
                const prodRes = await requestPrestashopXml<any>(`/products/${productId}`, {
                    query: { display: "[price,tax_rate]" },
                });
                priceHt = Number(prodRes?.prestashop?.product?.price) || 0;
                taxRate = Number(prodRes?.prestashop?.product?.tax_rate) || 20;
            } catch {
                console.warn(`[cart totals] Produit ${productId} introuvable`);
            }

            let impactHt = 0;
            if (combinationId > 0) {
                try {
                    const combRes = await requestPrestashopXml<any>(`/combinations/${combinationId}`, {
                        query: { display: "[price]" },
                    });
                    impactHt = Number(combRes?.prestashop?.combination?.price) || 0;
                } catch {
                    console.warn(`[cart totals] Combination ${combinationId} introuvable`);
                }
            }

            const unitHt = priceHt + impactHt;
            const unitTtc = unitHt * (1 + taxRate / 100);

            totalHt += unitHt * qty;
            totalTtc += unitTtc * qty;
        }

        const totalHtR = Math.round(totalHt * 100) / 100 || 1;
        const totalTtcR = Math.round(totalTtc * 100) / 100 || 1;

        return {
            total_products: totalHtR,
            total_products_wt: totalTtcR,
            total_paid: totalTtcR,
            total_paid_real: 0,
        };
    } catch {
        return fallback;
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