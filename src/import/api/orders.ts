import { createOrder, getOrder } from "../../module/Backoffice/commande/api/commandesApi";
import { textFromUnknown, validateUnsignedId } from "../../utils/helper";
import { getAllModeLivraison } from "../../module/Backoffice/Livraison/api/LivraisonApi";
import { getCart } from "../../module/Backoffice/panier/api/panierApi";
import { buildPrestashopXml, requestPrestashopXml } from "../../utils/prestashopClient";
import { generateSecureKey, type Commande } from "./importCSV3";

async function resolveCarrierId(carrierId: unknown): Promise<number> {
  const numericCarrierId = Number(carrierId);
  if (validateUnsignedId(numericCarrierId)) return numericCarrierId;

  const carriers = await getAllModeLivraison().catch(() => []);
  const firstActiveCarrierId = carriers[0]?.id;
  if (validateUnsignedId(firstActiveCarrierId)) return firstActiveCarrierId;

  return 1;
}

export async function getOrCreateCustomer(cmd: Commande): Promise<{ id: number; secureKey: string }> {
  // Chercher si le client existe déjà par email
  const res = await requestPrestashopXml<any>("/customers", {
    query: {
      display: "[id,email,secure_key]",
      "filter[email]": `[${cmd.email}]`,
      limit: "1",
    },
  });

  const existing = res?.prestashop?.customers?.customer;
  if (existing) {
    const list = Array.isArray(existing) ? existing : [existing];
    if (list[0]?.id) {
      return {
        id: Number(list[0].id),
        secureKey: list[0].secure_key || generateSecureKey(),
      };
    }
  }

  // Créer le client
  const [prenom, ...restNom] = cmd.nom.trim().split(" ");
  const nom = restNom.join(" ") || prenom;

  const created = await requestPrestashopXml<any>("/customers", {
    method: "POST",
    bodyXml: buildPrestashopXml({
      prestashop: {
        customer: {
          firstname: prenom,
          lastname: nom,
          email: cmd.email,
          passwd: cmd.pwd,
          id_default_group: 3,  // groupe "Clients"
          active: 1,
          deleted: 0,
        },
      },
    }),
  });

  const newId = Number(created?.prestashop?.customer?.id);
  if (!newId) throw new Error(`Création client échouée pour ${cmd.email}`);
  return {
    id: newId,
    secureKey: created?.prestashop?.customer?.secure_key || generateSecureKey(),
  };
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

  // ── Récupérer le panier ──
  const cartDetail = await getCart(cartId).catch(() => null);
  const cartRes = await requestPrestashopXml<any>(`/carts/${cartId}`, {
    query: { display: "full" },
  });
  const cart = cartRes?.prestashop?.cart;
  if (!cart) throw new Error(`Panier ${cartId} introuvable`);

  const secureKey = customer.secureKey || cart.secure_key || generateSecureKey();
  const addrDelivery = Number(cart.id_address_delivery) || Number(fallbackAddressId) || 0;
  const addrInvoice = Number(cart.id_address_invoice) || addrDelivery;
  const carrierId = await resolveCarrierId(cart.id_carrier);
  const totalProducts = Number(cartDetail?.total_products ?? cartDetail?.total ?? 0);
  const rawRows = cart.associations?.cart_rows?.cart_row;
  const orderRows = (cartDetail?.items?.length
    ? cartDetail.items
    : Array.isArray(rawRows)
      ? rawRows
      : rawRows
        ? [rawRows]
        : []
  ).map((row: any) => ({
    product_id: Number(row.product_id ?? row.id_product) || 0,
    product_quantity: Number(row.quantity ?? row.product_quantity) || 0,
  }));

  if (!addrDelivery) throw new Error(`Adresse de livraison manquante pour le panier ${cartId}`);
  if (!addrInvoice) throw new Error(`Adresse de facturation manquante pour le panier ${cartId}`);
  if (!validateUnsignedId(carrierId)) throw new Error(`Transporteur invalide pour le panier ${cartId}`);
  if (orderRows.length === 0) throw new Error(`Panier ${cartId} vide ou lignes introuvables`);

  // ── 1. Créer la commande directement via /orders ──
  const orderId = await createOrderDirect({
    id_customer: customer.id,
    id_cart: cartId,
    id_address_delivery: addrDelivery,
    id_address_invoice: addrInvoice,
    id_currency: 1,
    id_lang: 1,
    id_shop: 1,
    id_shop_group: 1,
    id_carrier: carrierId,
    secure_key: secureKey,
    payment_code: "cash",
    module: "ps_cashondelivery",
    payment: "Paiement à la livraison",
    total_paid: totalProducts,
    total_paid_tax_incl: totalProducts,
    total_paid_tax_excl: totalProducts,
    total_paid_real: totalProducts,
    total_products: totalProducts,
    total_products_wt: totalProducts,
    total_shipping: 0,
    total_shipping_tax_incl: 0,
    total_shipping_tax_excl: 0,
    conversion_rate: 1,
    date_add: dateTime,
    date_upd: dateTime,
    order_rows: orderRows,
  });

  // ── 2. Forcer la date via PUT (PS remet souvent la date courante) ──
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
    console.warn(`[orders] Impossible de forcer la date de la commande ${orderId}:`, error);
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

async function createOrderDirect(params: {
  id_customer: number;
  id_cart: number;
  id_address_delivery: number;
  id_address_invoice: number;
  id_currency: number;
  id_lang: number;
  id_shop: number;
  id_shop_group?: number;
  id_carrier: number;
  secure_key: string;
  payment_code: string;
  module: string,
  payment: string,
  total_paid: number;
  total_paid_tax_incl: number;
  total_paid_tax_excl: number;
  total_paid_real: number;
  total_products: number;
  total_products_wt: number;
  total_shipping: number;
  total_shipping_tax_incl: number;
  total_shipping_tax_excl: number;
  conversion_rate: number;
  date_add: string;
  date_upd: string;
  order_rows: Array<{ product_id: number; product_quantity: number }>;
}): Promise<number> {
  const orderId = await createOrder({
    id_customer: params.id_customer,
    id_cart: params.id_cart,
    id_address_delivery: params.id_address_delivery,
    id_address_invoice: params.id_address_invoice,
    id_currency: params.id_currency,
    id_lang: params.id_lang,
    id_carrier: params.id_carrier,
    id_shop: params.id_shop,
    id_shop_group: params.id_shop_group ?? 1,
    secure_key: params.secure_key,
    payment_code: params.payment_code,
    total_paid: params.total_paid,
    total_paid_tax_incl: params.total_paid_tax_incl,
    total_paid_tax_excl: params.total_paid_tax_excl,
    total_paid_real: params.total_paid_real,
    total_products: params.total_products,
    total_products_wt: params.total_products_wt,
    total_shipping: params.total_shipping,
    total_shipping_tax_incl: params.total_shipping_tax_incl,
    total_shipping_tax_excl: params.total_shipping_tax_excl,
    conversion_rate: params.conversion_rate,
    date_add: params.date_add,
    module: params.module,
    payment: params.payment,
    date_upd: params.date_upd,
    order_rows: params.order_rows,
  } as any);

  if (!orderId) throw new Error("Création commande échouée (ID invalide)");
  return orderId;
}