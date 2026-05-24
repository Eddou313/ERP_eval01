import { getOrder } from "../../module/Backoffice/commande/api/commandesApi";
import { textFromUnknown, validateUnsignedId } from "../../utils/helper";
import { getAllModeLivraison } from "../../module/Backoffice/Livraison/api/LivraisonApi";
import { buildPrestashopXml, requestPrestashopXml } from "../../utils/prestashopClient";
import { generateSecureKey} from "./importCSV3";
import { computeCartTotals } from "./carts";

async function resolveCarrierId(carrierId: unknown): Promise<number> {
  const numericCarrierId = Number(carrierId);
  if (validateUnsignedId(numericCarrierId)) return numericCarrierId;

  const carriers = await getAllModeLivraison().catch(() => []);
  const firstActiveCarrierId = carriers[0]?.id;
  if (validateUnsignedId(firstActiveCarrierId)) return firstActiveCarrierId;

  return 1;
}

export async function createOrderFromCart(
  cartId: number,
  customer: { id: number; secureKey: string },
  orderStateId: number,
  dateStr: string,
  fallbackAddressId?: number
): Promise<number> {
  const [day, month, year] = dateStr.split("/");
  const dateTime = `${year}-${month}-${day} 00:00:00`;

  // ── Un seul GET /carts/:id ──
  const cartRes = await requestPrestashopXml<any>(`/carts/${cartId}`, {
    query: { display: "full" },
  });
  const cart = cartRes?.prestashop?.cart;
  if (!cart) throw new Error(`Panier ${cartId} introuvable`);

  const secureKey = customer.secureKey || cart.secure_key || generateSecureKey();
  const addrDelivery = Number(cart.id_address_delivery) || Number(fallbackAddressId) || 0;
  const addrInvoice = Number(cart.id_address_invoice) || addrDelivery;
  const carrierId = await resolveCarrierId(cart.id_carrier);

  if (!addrDelivery) throw new Error(`Adresse de livraison manquante — panier ${cartId}`);
  if (!validateUnsignedId(carrierId)) throw new Error(`Transporteur invalide — panier ${cartId}`);

  // ── 1. Créer la commande ──
  const orderId = await createOrderDirect({
    id_customer: customer.id,
    id_cart: cartId,
    id_address_delivery: addrDelivery,
    id_address_invoice: addrInvoice,
    id_currency: 1,
    id_lang: 1,
    id_shop: 1,
    id_carrier: carrierId,
    secure_key: secureKey,
    orderStateId: orderStateId || 2,
    dateTime,
  });

  // ── 2. Forcer la date via PUT ──
  try {
    const order = await getOrder(orderId);
    await requestPrestashopXml(`/orders/${orderId}`, {
      method: "PUT",
      bodyXml: buildPrestashopXml({
        prestashop: {
          order: {
            id: orderId,
            id_customer: customer.id,
            id_cart: cartId,
            id_address_delivery: addrDelivery,
            id_address_invoice: addrInvoice,
            id_currency: 1,
            id_lang: 1,
            id_carrier: carrierId,
            id_shop: 1,
            secure_key: secureKey,
            module: "ps_cashondelivery",
            payment: "Paiement à la livraison",
            current_state: orderStateId || 2,
            date_add: dateTime,
            date_upd: dateTime,
            conversion_rate: 1,
            total_paid: order.total_paid || 0,
            total_paid_real: order.total_paid_real || 0,
            total_products: order.total_products || 0,
            total_products_wt: order.total_products_wt || 0,
            total_paid_tax_incl: order.total_paid_tax_incl || 0,
          },
        },
      }),
    });
  } catch (error) {
    console.warn(`[orders] Impossible de forcer la date ${orderId}:`, error);
  }

  // ── 3. Mettre à jour l'état ──
  if (orderStateId) {
    await updateOrderState(orderId, orderStateId, dateTime);
  }

  return orderId;
}

export async function updateOrderState(id: number, newState: number, date: string): Promise<void> {
  try {
    const order = await getOrder(id);
    if (Number(order.current_state) === 5) {
      alert("une commande deja livreer ne peut etre modifier");
      return;
    }
  }
  catch (e: any) {
    // alert("le etat ne vas pas etre prend en compte" + e.message);
  }

  if (!validateUnsignedId(id)) {
    throw new Error(`ID commande invalide: ${id}`);
  }

  if (!validateUnsignedId(newState)) {
    throw new Error(`État invalide: ${newState}`);
  }

  try {
    const xml = buildPrestashopXml({
      prestashop: {
        order_state_update: {
          id_order: id,
          id_order_state: newState,
          date_add: date,
        },
      },
    });

    // Appel via requestPrestashopXml qui passe par le proxy Vite /api
    const response = await requestPrestashopXml<any>(
      "/order_state_update",
      {
        method: "POST",
        bodyXml: xml,
      }
    );

    const responseData =
      response?.prestashop?.response ||
      response?.prestashop?.order_state_update ||
      response?.prestashop?.order_state_updates?.order_state_update ||
      null;

    const successValue = responseData?.success;
    const success =
      successValue === undefined ||
      successValue === null ||
      successValue === "true" ||
      successValue === true ||
      responseData?.id_order === id ||
      responseData?.id_order_state === newState;
    const message = textFromUnknown(responseData?.message);

    if (!success) {
      throw new Error(`Erreur module shiporder: ${message || "Réponse invalide"}`);
    }

    console.log(`✓ État de la commande #${id} changé à ${newState}: ${message}`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`Impossible de changer l'état de la commande #${id}: ${errorMsg}`);
  }
}
export async function createOrderDirect(params: {
  id_customer: number;
  id_cart: number;
  id_address_delivery: number;
  id_address_invoice: number;
  id_currency: number;
  id_lang: number;
  id_shop: number;
  id_carrier: number;
  secure_key: string;
  orderStateId: number;
  dateTime: string;
}): Promise<number> {
  // computeCartTotals fait son propre GET /carts/:id
  // il est isolé dans carts.ts pour être réutilisable
  const totals = await computeCartTotals(params.id_cart);

  const created = await requestPrestashopXml<any>("/orders", {
    method: "POST",
    bodyXml: buildPrestashopXml({
      prestashop: {
        order: {
          id_address_delivery: params.id_address_delivery,
          id_address_invoice: params.id_address_invoice,
          id_cart: params.id_cart,
          id_currency: params.id_currency,
          id_lang: params.id_lang,
          id_customer: params.id_customer,
          id_carrier: params.id_carrier,
          id_shop: params.id_shop,
          secure_key: params.secure_key,
          module: "ps_cashondelivery",
          payment: "Paiement à la livraison",
          recyclable: 0,
          gift: 0,
          gift_message: "",
          mobile_theme: 0,
          total_discounts: 0,
          total_discounts_tax_incl: 0,
          total_discounts_tax_excl: 0,
          total_paid: totals.total_paid,
          total_paid_tax_incl: totals.total_paid,
          total_paid_tax_excl: totals.total_products,
          total_paid_real: totals.total_paid_real,
          total_products: totals.total_products,
          total_products_wt: totals.total_products_wt,
          total_shipping: 0,
          total_shipping_tax_incl: 0,
          total_shipping_tax_excl: 0,
          total_wrapping: 0,
          total_wrapping_tax_incl: 0,
          total_wrapping_tax_excl: 0,
          round_mode: 2,
          round_type: 1,
          conversion_rate: 1,
          reference: `IMP-${Date.now()}`,
          current_state: params.orderStateId,
          date_add: params.dateTime,
          date_upd: params.dateTime,
          associations: { order_rows: [] },
        },
      },
    }),
  });

  const orderId = Number(created?.prestashop?.order?.id);
  if (!orderId) throw new Error("Création commande échouée (ID invalide)");
  return orderId;
}