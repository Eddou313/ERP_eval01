import { requestPrestashopXml } from "../../../../utils/prestashopClient";
import { createCart } from "../../../Backoffice/panier/api/panierApi";
import { getOrder, createCommande, updateOrderState } from "../../../Backoffice/commande/api/commandesApi";
import { getStoredClientSession } from "../../client/api/clientAPI";
import { getCart } from "../../../Backoffice/panier/api/panierApi";
import type { OrderResource } from "../../../Backoffice/commande/api/ObjetOrder";
import { PAYMENT_METHODS } from "../../../Backoffice/paiement/api/PaiementApi";

function resolvePaymentCode(order: OrderResource): string {
    const byModule = PAYMENT_METHODS.find((method) => method.module === order.module);
    if (byModule) {
        return byModule.code;
    }

    const byCode = PAYMENT_METHODS.find((method) => method.code === order.module);
    if (byCode) {
        return byCode.code;
    }

    return PAYMENT_METHODS[0]?.code || "cash";
}

export async function validerCommande(idClient: number, sourceOrderId?: number, multiply = 1): Promise<boolean> {
    try {
        const session = getStoredClientSession();
        if (!session || Number(session.id) !== Number(idClient)) {
            throw new Error("Session client invalide ou expirée");
        }

        // Récupère la première adresse du client (si elle existe)
        let clientAddressId = 0;
        try {
            const addressesResp = await requestPrestashopXml<any>("/addresses", {
                query: { display: "full", ["filter[id_customer]"]: `[${idClient}]` },
            });

            const raw = addressesResp?.prestashop?.addresses?.address;
            const first = Array.isArray(raw) ? raw[0] : raw;
            clientAddressId = Number(first?.["@_id"] ?? first?.id) || 0;
        } catch (e) {
            console.warn("Impossible de récupérer l'adresse du client:", e);
        }
        if (!sourceOrderId || sourceOrderId <= 0) {
            throw new Error("Aucune commande source fournie pour duplication");
        }

        const sourceOrder = await getOrder(sourceOrderId);
        const sourceCart = await getCart(sourceOrder.id_cart);

        const deliveryAddressId = sourceOrder.id_address_delivery || clientAddressId;
        const invoiceAddressId = sourceOrder.id_address_invoice || clientAddressId;
        if (!deliveryAddressId || !invoiceAddressId) {
            throw new Error("Impossible de déterminer les adresses de livraison et de facturation");
        }

        const duplicatedCart = await createCart({
            id_customer: idClient,
            id_address_delivery: deliveryAddressId,
            id_address_invoice: invoiceAddressId,
            id_currency: sourceOrder.id_currency || 1,
            id_lang: sourceOrder.id_lang || 1,
            id_carrier: sourceOrder.id_carrier || 1,
            id_shop: sourceOrder.id_shop || 1,
            id_shop_group: sourceOrder.id_shop_group || 1,
            secure_key: sourceOrder.secure_key || undefined,
            items: sourceCart.items.map((item) => ({
                id_product: item.product_id,
                id_product_attribute: item.id_product_attribute,
                quantity: Number(item.quantity || 0) * Number(multiply || 1),
            })),
        });

        const totalProducts = duplicatedCart.total_products || duplicatedCart.total || 0;
        const shippingTotal = Number(sourceOrder.total_shipping || sourceOrder.total_shipping_tax_incl || 0);
        const grandTotal = Number(duplicatedCart.total || totalProducts || 0) + shippingTotal;

        const orderRows = (duplicatedCart.items || []).map((it: any) => ({
            product_id: it.product_id,
            product_quantity: Number(it.quantity) || 0,
        }));

        const orderId = await createCommande({
            id_customer: idClient,
            id_address_delivery: deliveryAddressId,
            id_address_invoice: invoiceAddressId,
            id_cart: duplicatedCart.id,
            id_currency: sourceOrder.id_currency || 1,
            id_lang: sourceOrder.id_lang || 1,
            id_carrier: sourceOrder.id_carrier || 1,
            payment: sourceOrder.payment,
            module: sourceOrder.module,
            current_state: 1,
            total_paid: grandTotal,
            total_paid_real: grandTotal,
            total_paid_tax_incl: grandTotal,
            total_paid_tax_excl: grandTotal,
            total_products: totalProducts,
            total_products_wt: totalProducts,
            total_shipping: shippingTotal,
            total_shipping_tax_incl: shippingTotal,
            total_shipping_tax_excl: shippingTotal,
            conversion_rate: sourceOrder.conversion_rate || 1,
            valid: true,
            invoice_number: sourceOrder.invoice_number || "",
            invoice_date: sourceOrder.invoice_date || new Date().toISOString().split("T")[0],
            delivery_number: sourceOrder.delivery_number || "",
            delivery_date: sourceOrder.delivery_date || new Date().toISOString().split("T")[0],
            note: sourceOrder.note || "",
            gift: Boolean(sourceOrder.gift),
            gift_message: sourceOrder.gift_message || "",
            recyclable: Boolean(sourceOrder.recyclable),
            mobile_theme: Boolean(sourceOrder.mobile_theme),
            secure_key: sourceOrder.secure_key || "",
            round_mode: sourceOrder.round_mode || 0,
            round_type: sourceOrder.round_type || 0,
            id_shop_group: sourceOrder.id_shop_group || 1,
            id_shop: sourceOrder.id_shop || 1,
            payment_code: resolvePaymentCode(sourceOrder),
            order_rows: orderRows,
        } as any);

        await updateOrderState(orderId, 5, new Date().toISOString());

        return true;

    }
    catch (erreur: any) {
        console.log(`Erreur lors de la validation de la commande : ${erreur.message}`);
    }
    return false;
}
