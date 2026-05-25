import { getOrder } from "../../module/Backoffice/commande/api/commandesApi";
import { textFromUnknown, validateUnsignedId } from "../../utils/helper";
import { getAllModeLivraison } from "../../module/Backoffice/Livraison/api/LivraisonApi";
import { buildPrestashopXml, requestPrestashopXml } from "../../utils/prestashopClient";
import { generateSecureKey } from "./importCSV3";
import { computeCartTotals } from "./carts";
import type { ClientForm } from "./customers";
import { updateStockWithMovement } from "./stock";

type StockMovementSign = 1 | -1;

// ─────────────────────────────────────────────
// ÉTATS ET STOCK
// ─────────────────────────────────────────────

export const STOCK_DECREMENT_STATES = new Set<number>([
  2, // paiement accepté
  5, // livré
]);

export const STOCK_INCREMENT_STATES = new Set<number>([
  6, // annulé
]);

function getStockMovementSignForTransition(
  previousState: number,
  nextState: number
): StockMovementSign | null {
  if (previousState === nextState) return null;

  // Une commande déjà livrée ne doit plus bouger de stock.
  if (previousState === 5) return null;

  // Paiement accepté : on réserve le stock une seule fois.
  if (nextState === 2) {
    return previousState === 2 ? null : -1;
  }

  // Livraison : si le stock a déjà été réservé en 2, on ne recommence pas.
  if (nextState === 5) {
    return previousState === 2 ? null : -1;
  }

  // Annulation : on rétablit le stock uniquement si la commande avait déjà réservé.
  if (nextState === 6) {
    return previousState === 2 ? 1 : null;
  }

  return null;
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

async function resolveCarrierId(carrierId: unknown): Promise<number> {
  const numericCarrierId = Number(carrierId);
  if (validateUnsignedId(numericCarrierId)) return numericCarrierId;

  const carriers = await getAllModeLivraison().catch(() => []);
  const firstActiveCarrierId = carriers[0]?.id;
  if (validateUnsignedId(firstActiveCarrierId)) return firstActiveCarrierId;

  return 1;
}

function extractId(val: unknown): number {
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

// ─────────────────────────────────────────────
// MOUVEMENT DE STOCK DEPUIS UNE COMMANDE
// Lit les lignes de la commande et agit selon le signe
// sign =  1 → incrément (annulation)
// sign = -1 → décrément (livraison)
// ─────────────────────────────────────────────

async function applyStockMovementFromOrder(
  orderId: number,
  sign: 1 | -1
): Promise<void> {
  try {
    const orderRes = await requestPrestashopXml<any>(`/orders/${orderId}`, {
      query: { display: "full" },
    });

    const rawRows =
      orderRes?.prestashop?.order?.associations?.order_rows?.order_row;
    if (!rawRows) {
      console.warn(`[stock] Aucune ligne trouvée pour la commande ${orderId}`);
      return;
    }

    const rows = Array.isArray(rawRows) ? rawRows : [rawRows];

    for (const row of rows) {
      const productId = extractId(row.product_id ?? row.id_product);
      const combinationId = extractId(row.product_attribute_id ?? row.id_product_attribute);
      const qty = extractId(row.product_quantity ?? row.quantity) || 1;

      if (!productId) continue;

      await updateStockWithMovement(productId, qty, combinationId, sign);

      console.log(
        `[stock] ${sign === -1 ? "Décrément" : "Incrément"} — produit ${productId}` +
        (combinationId ? `(comb. ${combinationId})` : "") +
        ` : ${sign > 0 ? "+" : ""}${sign * qty}`
      );
    }
  } catch (err: any) {
    console.warn(`[stock] Erreur mouvement commande ${orderId}:`, err?.message);
  }
}

// ─────────────────────────────────────────────
// CRÉATION COMMANDE DIRECTE
// Déclarée avant createOrderFromCart
// ─────────────────────────────────────────────

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
  current_state: number;
  dateTime: string;
  conversion_rate: number;
  module: string;
  payment: string;
}): Promise<number> {
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
          module: params.module,
          payment: params.payment,
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
          conversion_rate: params.conversion_rate,
          reference: `IMP-${Date.now()}`,
          current_state: params.current_state,  // ✅ supprimé orderStateId (doublon)
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

// ─────────────────────────────────────────────
// COMMANDE DEPUIS PANIER
// ─────────────────────────────────────────────

export async function createOrderFromCart(
  cartId: number,
  customer: ClientForm,
  orderStateId: number,
  dateStr: string,
  fallbackAddressId?: number
): Promise<number> {
  const [day, month, year] = dateStr.split("/");
  const dateTime = `${year}-${month}-${day} 00:00:00`;

  const cartRes = await requestPrestashopXml<any>(`/carts/${cartId}`, {
    query: { display: "full" },
  });
  const cart = cartRes?.prestashop?.cart;
  if (!cart) throw new Error(`Panier ${cartId} introuvable`);

  const secureKey = customer.secure_key || cart.secure_key || generateSecureKey();
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
    orderStateId: orderStateId,
    current_state: orderStateId,
    dateTime,
    conversion_rate: 1,
    module: "ps_cashondelivery",
    payment: "Paiement à la livraison",
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
            reference: order.reference || `IMP-${Date.now()}`,
            current_state: 11, // état initial (panier) pour éviter les mouvements de stock intempestifs
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

// ─────────────────────────────────────────────
// MISE À JOUR ÉTAT + MOUVEMENT DE STOCK
// ─────────────────────────────────────────────

export async function updateOrderState(
  id: number,
  newState: number,
  date: string
): Promise<void> {
  let previousState = 0;

  try {
    const order = await getOrder(id);
    previousState = Number(order.current_state) || 0;

    if (previousState === 5) {
      alert("Une commande déjà livrée ne peut être modifiée");
      return;
    }

    if (previousState === newState) {
      console.log(`✓ État commande #${id} déjà à ${newState}`);
      return;
    }
  } catch {
    // Commande non trouvée → on continue
  }

  if (!validateUnsignedId(id)) throw new Error(`ID commande invalide: ${id}`);
  if (!validateUnsignedId(newState)) throw new Error(`État invalide: ${newState}`);

  const xml = buildPrestashopXml({
    prestashop: {
      order_state_update: {
        id_order: id,
        id_order_state: newState,
        date_add: date,
      },
    },
  });

  const response = await requestPrestashopXml<any>("/order_state_update", {
    method: "POST",
    bodyXml: xml,
  });

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

  if (!success) {
    throw new Error(
      `Erreur module shiporder: ${textFromUnknown(responseData?.message) || "Réponse invalide"}`
    );
  }

  console.log(`✓ État commande #${id} → ${newState}`);

  // ── Mouvement de stock après changement d'état ──
  const stockMovementSign = getStockMovementSignForTransition(previousState, newState);
  if (stockMovementSign !== null) {
    await applyStockMovementFromOrder(id, stockMovementSign);
  }
}