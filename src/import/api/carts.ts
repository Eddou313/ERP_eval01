import { buildPrestashopXml, requestPrestashopXml } from "../../utils/prestashopClient";
import { getCombinationId } from "./attribut";
import { getOrCreateAddress } from "./customers";
import { generateSecureKey, type ProduitAchat } from "./importCSV3";
import { findProductByReference } from "./produit";

export async function createCart(customerId: { id: number; secureKey: string }, adresse: string): Promise<{ cartId: number; addressId: number }> {
    // Récupérer l'adresse du client
    const adresseId = await getOrCreateAddress(customerId.id, adresse);

    const created = await requestPrestashopXml<any>("/carts", {
        method: "POST",
        bodyXml: buildPrestashopXml({
            prestashop: {
                cart: {
                    id_currency: 1,
                    id_lang: 1,
                    id_customer: customerId.id,
                    id_carrier: 0,
                    id_address_delivery: adresseId,
                    id_address_invoice: adresseId,
                    recyclable: 0,
                    gift: 0,
                    gift_message: "",
                    mobile_theme: 0,
                    delivery_option: "",
                    secure_key: customerId.secureKey ?? generateSecureKey(),
                    allow_seperated_package: 0,
                    associations: { cart_rows: [] },
                },
            },
        }),
    });

    const cartId = Number(created?.prestashop?.cart?.id);
    if (!cartId) throw new Error(`Création panier échouée`);
    return { cartId, addressId: adresseId };
}

export async function addProductsToCart(
    cartId:{cartId: number;secureKey: string},
    produits: ProduitAchat[],
    date: string
): Promise<void> {
    const [day, month, year] = date.split("/");
    const dateAdd = `${year}-${month}-${day} 00:00:00`;

    // ── 1. Récupérer le panier existant ──
    const cartRes = await requestPrestashopXml<any>(`/carts/${cartId.cartId}`, {
        query: { display: "full" },
    });

    const cart = cartRes?.prestashop?.cart;
    if (!cart) throw new Error(`Panier ${cartId.cartId} introuvable`);

    const addressDelivery = Number(cart.id_address_delivery) || 0;

    const rawRows = cart.associations?.cart_rows?.cart_row;
    const existingRows: any[] = !rawRows
        ? []
        : Array.isArray(rawRows)
            ? rawRows
            : rawRows?.id   // objet unique valide
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
        const combinationId =
            produit.karazany.trim() !== ""
                ? await getCombinationId(productId, produit.karazany)
                : 0;

        const existing = existingRows.find(
            (r) =>
                Number(r.id_product) === productId &&
                Number(r.id_product_attribute) === combinationId
        );

        if (existing) {
            existing.quantity = Number(existing.quantity) + produit.quantite;
        } else {
            newRows.push({
                id_product: productId,
                id_product_attribute: combinationId,
                id_address_delivery: addressDelivery,
                quantity: produit.quantite,
            });
        }
    }

    const allRows = [...existingRows, ...newRows];


    await requestPrestashopXml<any>(`/carts/${cartId.cartId}`, {
        method: "PUT",
        bodyXml: buildPrestashopXml({
            prestashop: {
                cart: {
                    id: cartId.cartId,
                    id_currency: Number(cart.id_currency) || 1,
                    id_lang: Number(cart.id_lang) || 1,
                    id_customer: Number(cart.id_customer) || 0,
                    id_carrier: Number(cart.id_carrier) || 0,
                    id_address_delivery: addressDelivery,
                    id_address_invoice: Number(cart.id_address_invoice) || addressDelivery,
                    recyclable: 0,
                    gift: 0,
                    gift_message: "",
                    mobile_theme: 0,
                    delivery_option: "",
                    secure_key: cartId.secureKey,
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
