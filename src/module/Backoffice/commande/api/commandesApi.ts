import { buildPrestashopXml, requestPrestashopXml } from "../../../../utils/prestashopClient";
import { textFromUnknown, numFromUnknown, boolFromUnknown, asArray, getFirstLanguageText, toPrestashopBool, languageField, validateUnsignedId, validatePrice, validateFloat, } from "../../../../utils/helper";
import { getClient } from "../../client/api/clientApi";
import { getCart } from "../../panier/api/panierApi";
import { PAYMENT_METHODS } from "../../paiement/api/PaiementApi";
import { CART_PENDING_STATE_ID, CART_PENDING_STATE_LABEL, ORDER_STATES, validateRequiredFields, type CartListResponse, type OrderCreateForm, type OrderForm, type OrderGetResponse, type OrderListItem, type OrderListResponse, type OrderResource, type RequiredFieldRule } from "./ObjetOrder";

export { DEFAULT_ORDER_FORM } from "./ObjetOrder";


/**
 * Règles de validation pour la création de commande
 * Basées sur les colonnes Required=✔️ de l'API PrestaShop
 * IMPORTANT: Les adresses de livraison et facturation DOIVENT être choisies (jamais 0)
 */
const CREATE_ORDER_RULES: Array<RequiredFieldRule<OrderForm>> = [
  { key: "id_customer", message: "id_customer doit être > 0", validator: (v) => validateUnsignedId(v) },
  { key: "id_address_delivery", message: "Veuillez choisir une adresse de livraison (ne doit pas être 0)", validator: (v) => validateUnsignedId(v) },
  { key: "id_address_invoice", message: "Veuillez choisir une adresse de facturation (ne doit pas être 0)", validator: (v) => validateUnsignedId(v) },
  { key: "id_cart", message: "id_cart doit être > 0", validator: (v) => validateUnsignedId(v) },
  { key: "id_currency", message: "id_currency doit être > 0", validator: (v) => validateUnsignedId(v) },
  { key: "id_lang", message: "id_lang doit être > 0", validator: (v) => validateUnsignedId(v) },
  { key: "id_carrier", message: "id_carrier doit être > 0", validator: (v) => validateUnsignedId(v) },
  { key: "payment", message: "payment requis", validator: (v) => typeof v === "string" && v.trim().length > 0 },
  { key: "total_paid", message: "total_paid doit être >= 0", validator: (v) => validatePrice(v) },
  { key: "total_paid_real", message: "total_paid_real doit être >= 0", validator: (v) => validatePrice(v) },
  { key: "total_paid_tax_incl", message: "total_paid_tax_incl doit être >= 0", validator: (v) => validatePrice(v) },
  { key: "total_products", message: "total_products doit être >= 0", validator: (v) => validatePrice(v) },
  { key: "total_products_wt", message: "total_products_wt doit être >= 0", validator: (v) => validatePrice(v) },
  { key: "conversion_rate", message: "conversion_rate doit être > 0", validator: (v) => validateFloat(v) },
];


export function getPaymentMethod(code: string) {
  return PAYMENT_METHODS.find((p) => p.code === code);
}

function extractOrderResource(orderXml: Record<string, unknown>): OrderResource {
  const noteValue = orderXml.note;
  const noteText = getFirstLanguageText(noteValue as any) || "";

  const giftMsgValue = orderXml.gift_message;
  const giftMsg = getFirstLanguageText(giftMsgValue as any) || "";

  return {
    id: numFromUnknown(orderXml.id),
    reference: textFromUnknown(orderXml.reference).trim(),
    id_customer: numFromUnknown(orderXml.id_customer),
    id_address_delivery: numFromUnknown(orderXml.id_address_delivery),
    id_address_invoice: numFromUnknown(orderXml.id_address_invoice),
    id_cart: numFromUnknown(orderXml.id_cart),
    id_currency: numFromUnknown(orderXml.id_currency),
    id_lang: numFromUnknown(orderXml.id_lang) || 1,
    id_carrier: numFromUnknown(orderXml.id_carrier),
    current_state: numFromUnknown(orderXml.current_state) || 1,
    payment: textFromUnknown(orderXml.payment).trim(),
    module: textFromUnknown(orderXml.module).trim(),
    total_paid: numFromUnknown(orderXml.total_paid),
    total_paid_real: numFromUnknown(orderXml.total_paid_real),
    total_products: numFromUnknown(orderXml.total_products),
    total_products_wt: numFromUnknown(orderXml.total_products_wt),
    conversion_rate: numFromUnknown(orderXml.conversion_rate) || 1,
    total_discounts: numFromUnknown(orderXml.total_discounts),
    total_discounts_tax_incl: numFromUnknown(orderXml.total_discounts_tax_incl),
    total_discounts_tax_excl: numFromUnknown(orderXml.total_discounts_tax_excl),
    total_paid_tax_incl: numFromUnknown(orderXml.total_paid_tax_incl),
    total_paid_tax_excl: numFromUnknown(orderXml.total_paid_tax_excl),
    total_shipping: numFromUnknown(orderXml.total_shipping),
    total_shipping_tax_incl: numFromUnknown(orderXml.total_shipping_tax_incl),
    total_shipping_tax_excl: numFromUnknown(orderXml.total_shipping_tax_excl),
    carrier_tax_rate: numFromUnknown(orderXml.carrier_tax_rate),
    total_wrapping: numFromUnknown(orderXml.total_wrapping),
    total_wrapping_tax_incl: numFromUnknown(orderXml.total_wrapping_tax_incl),
    total_wrapping_tax_excl: numFromUnknown(orderXml.total_wrapping_tax_excl),
    round_mode: numFromUnknown(orderXml.round_mode),
    round_type: numFromUnknown(orderXml.round_type),
    invoice_number: textFromUnknown(orderXml.invoice_number).trim(),
    invoice_date: textFromUnknown(orderXml.invoice_date).split(" ")[0],
    delivery_number: textFromUnknown(orderXml.delivery_number).trim(),
    delivery_date: textFromUnknown(orderXml.delivery_date).split(" ")[0],
    valid: boolFromUnknown(orderXml.valid),
    recyclable: boolFromUnknown(orderXml.recyclable),
    gift: boolFromUnknown(orderXml.gift),
    mobile_theme: boolFromUnknown(orderXml.mobile_theme),
    secure_key: textFromUnknown(orderXml.secure_key).trim(),
    id_shop_group: numFromUnknown(orderXml.id_shop_group) || 1,
    id_shop: numFromUnknown(orderXml.id_shop) || 1,
    note: noteText,
    gift_message: giftMsg,
    shipping_number: textFromUnknown(orderXml.shipping_number).trim(),
    date_add: textFromUnknown(orderXml.date_add),
    date_upd: textFromUnknown(orderXml.date_upd),
  };
}

/**
 * Extrait un OrderListItem à partir d'une entrée de liste XML
 */
function extractOrderListItem(orderXml: Record<string, unknown>): OrderListItem {
  return {
    id: numFromUnknown(orderXml.id),
    reference: textFromUnknown(orderXml.reference).trim(),
    id_customer: numFromUnknown(orderXml.id_customer),
    payment: textFromUnknown(orderXml.payment).trim(),
    total_paid_tax_incl: numFromUnknown(orderXml.total_paid_tax_incl),
    current_state: numFromUnknown(orderXml.current_state) || 1,
    date_add: textFromUnknown(orderXml.date_add).split(" ")[0],
  };
}

// extractCartAsOrderListItem removed: we now enrich carts using getCart()
/**
 *  READ: Récupère la liste allégée des commandes
 * Format filtrable: reference, id_customer, payment, total_paid, current_state
 */
export async function listOrders(
  params?: Partial<{
    reference: string;
    id_customer: number;
    payment: string;
    minAmount: number;
    maxAmount: number;
    state: number;
    limit: number;
    offset: number;
    declencher?: number  // declencheur pour vrai commande
  }>
): Promise<OrderListItem[]> {
  const query: Record<string, string | number | boolean> = {
    display: "full",
    limit: params?.limit ?? 200,
    offset: params?.offset ?? 0,
  };

  // Ajouter les filtres si présents
  if (params?.reference) query.reference = params.reference;
  if (params?.id_customer) query.id_customer = params.id_customer;
  if (params?.payment) query.payment = params.payment;
  if (params?.state) query.current_state = params.state;

  const response = await requestPrestashopXml<OrderListResponse>("/orders", {
    query,
  });

  const ordersRaw = asArray(response?.prestashop?.orders?.order as any);
  const orders = ordersRaw.map(extractOrderListItem);

  let pendingCartsAsOrders: OrderListItem[] = [];

  // SI 'declencher' EST PRÉSENT, ON SUTE TOUTE LA LOGIQUE DES PANIERS
  if (!params?.declencher) {
    // Collecte des id_cart déjà présents dans les commandes réelles
    const linkedCartIds = new Set<number>(
      ordersRaw
        .map((o: any) => numFromUnknown(o.id_cart))
        .filter((id: number) => validateUnsignedId(id)),
    );

    // Ajouter les paniers actifs (quantité > 0) comme commandes en attente.
    try {
      const cartsResponse = await requestPrestashopXml<CartListResponse>("/carts", {
        query: {
          display: "full",
          limit: params?.limit ?? 200,
          offset: params?.offset ?? 0,
        },
      });

      const carts = asArray(cartsResponse?.prestashop?.carts?.cart as any);

      // Enrichir chaque panier via getCart() pour obtenir des prix et quantités fiables
      const enriched = await Promise.all(
        carts.map(async (cart) => {
          const cartId = numFromUnknown((cart as any).id ?? (cart as any)["@_id"]);
          if (!validateUnsignedId(cartId)) return null;

          // Ne pas dupliquer les paniers déjà liés à une commande
          const linkedOrder = numFromUnknown((cart as any).id_order);
          if (validateUnsignedId(linkedOrder)) return null;
          if (linkedCartIds.has(cartId)) return null;

          const detail = await getCart(cartId).catch(() => null);
          if (!detail) return null;

          // Exclure les paniers avec quantité totale 0
          const totalQty = (detail.items || []).reduce((s, it) => s + (Number(it.quantity) || 0), 0);
          if (totalQty <= 0) return null;

          return {
            id: -cartId,
            reference: `PANIER-${cartId}`,
            id_customer: detail.id_customer,
            payment: "Panier en cours",
            total_paid_tax_incl: Number(detail.total) || 0,
            current_state: CART_PENDING_STATE_ID,
            date_add: detail.date_add || textFromUnknown((cart as any).date_add).split(" ")[0],
          } as OrderListItem;
        }),
      );

      pendingCartsAsOrders = enriched.filter((it): it is OrderListItem => it !== null);
    } catch {
      // Certains WS n'exposent pas /carts en lecture; on retourne au moins les vraies commandes.
      pendingCartsAsOrders = [];
    }
  }

  const merged = [...orders, ...pendingCartsAsOrders];

  return merged.filter((order) => {
    // Post-filter sur les montants
    if (params?.minAmount && order.total_paid_tax_incl < params.minAmount) return false;
    if (params?.maxAmount && order.total_paid_tax_incl > params.maxAmount) return false;

    // Réappliquer les filtres pour les paniers fusionnés
    if (params?.reference && !order.reference.toLowerCase().includes(params.reference.toLowerCase())) return false;
    if (params?.id_customer && order.id_customer !== params.id_customer) return false;
    if (params?.payment && !order.payment.toLowerCase().includes(params.payment.toLowerCase())) return false;
    if (params?.state && order.current_state !== params.state) return false;

    return true;
  });
}

export const listOrdersLight = listOrders;

/**
 * READ: Récupère une commande complète par ID
 */
export async function getOrder(id: number): Promise<OrderResource> {
  if (!validateUnsignedId(id)) {
    throw new Error(`ID commande invalide: ${id}`);
  }

  const response = await requestPrestashopXml<OrderGetResponse>(`/orders/${id}`, 
  {
    query: { 
      display: "full",
      // "filter[email]": `[${gmail}]`,
    },
  });

  if (!response?.prestashop?.order) {
    throw new Error(`Commande #${id} non trouvée`);
  }

  return extractOrderResource(response.prestashop.order);
}

/**
 *CREATE: Crée une nouvelle commande
 * Valide les champs obligatoires et applique les règles PrestaShop
 * NOTE: id_shop et id_shop_group sont omis lors de la création - PrestaShop les définit automatiquement
 */
export async function createOrder(form: OrderCreateForm): Promise<number> {
  // Validation des champs requis
  validateRequiredFields("Commande", form, CREATE_ORDER_RULES);

  // Récupère la clé sécurisée du client
  let secureKey = form.secure_key;
  if (!secureKey) {
    try {
      const customer = await getClient(form.id_customer);
      secureKey = customer?.secure_key || "";
      console.log(`Clé récupérée pour le client ${form.id_customer} :`, secureKey);
    } catch (err) {
      console.error(`Échec de la récupération du client ${form.id_customer} :`, err);
      secureKey = "";
    }
  }

  // Valide la méthode de paiement
  const paymentMethod = getPaymentMethod(form.payment_code || "cash");
  if (!paymentMethod?.module) {
    throw new Error(`Méthode de paiement invalide: ${form.payment_code}`);
  }

  // Prépare le formulaire sécurisé (SANS id_shop/id_shop_group)
  const safeForm: OrderForm = {
    ...form,
    module: paymentMethod.module,
    payment: paymentMethod.label,
    secure_key: form.secure_key || secureKey,
  };

  // Envoie la création
  const xml = buildOrderXmlForCreation(safeForm);
  const response = await requestPrestashopXml<{
    prestashop: { order: { id: number } };
  }>("/orders", {
    method: "POST",
    bodyXml: xml,
  });

  const orderId = numFromUnknown(response?.prestashop?.order?.id);
  if (!validateUnsignedId(orderId)) {
    throw new Error("Échec création commande PrestaShop (ID invalide)");
  }

  return orderId;
}


export const createCommande = createOrder;

/**
 * UPDATE: Met à jour une commande existante
 */
export async function updateOrder(id: number, form: OrderForm): Promise<void> {
  if (!validateUnsignedId(id)) {
    throw new Error(`ID commande invalide: ${id}`);
  }

  // Valide les champs critiques
  validateRequiredFields("Commande", form, CREATE_ORDER_RULES);

  const xml = buildOrderXmlForUpdate({ ...form, id });
  await requestPrestashopXml(`/orders/${id}`, {
    method: "PUT",
    bodyXml: xml,
  });
}

/**
 * UPDATE: Change l'état d'une commande
 * Appelle le module personnalisé shiporder pour changer l'état
 * Endpoint: /module/mon_module/shiporder?id_order=X&action=delivered
 */
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
    const normalizedDate = date.includes("T")
      ? date.replace("T", " ").replace("Z", "").slice(0, 19)
      : date.slice(0, 19);

    const xml = buildPrestashopXml({
      prestashop: {
        order_state_update: {
          id_order: id,
          id_order_state: newState,
          date_add: normalizedDate,
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
    console.log(response);
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

export const updateEtatCommande = updateOrderState;

/**
 * DELETE: Supprime une commande
 * Attention: Opération irréversible
 */
export async function deleteOrder(id: number): Promise<void> {
  if (!validateUnsignedId(id)) {
    throw new Error(`ID commande invalide: ${id}`);
  }

  try {
    await requestPrestashopXml(`/orders/${id}`, { method: "DELETE" });
  } catch (err: any) {
    const msg = err?.responseText || err?.message || String(err);
    console.warn(`Impossible de supprimer la commande #${id} via l'API PrestaShop:`, msg);
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const key = "erp_orphaned_deletes";
        const existing = JSON.parse(localStorage.getItem(key) || "[]");
        existing.push({ resource: "order", id, message: msg, date: new Date().toISOString() });
        localStorage.setItem(key, JSON.stringify(existing));
      }
    } catch (storeErr) {
      console.warn("Echec enregistrement orphan delete:", storeErr);
    }

    return;
  }
}
export async function InitOrder(): Promise<void> {
  // const confirmed = window.confirm("Vous etes sur de supprimer tous les clients ?");
  // if (!confirmed) return;
  try {
    const orders = await listOrders();
    const deletableOrders = orders.filter((order) => Number(order.id) > 0);
    const ignoredVirtualOrders = orders.length - deletableOrders.length;
    if (ignoredVirtualOrders > 0) {
      console.log(`${ignoredVirtualOrders} panier(s) en attente ignoré(s) pendant l'initialisation des commandes.`);
    }

    const deletePromises = deletableOrders.map((order) => deleteOrder(order.id));
    await Promise.all(deletePromises);
    // alert("Toutes les commandes ont été supprimées. Vous pouvez maintenant importer de nouvelles commandes.");
  }
  catch (err) {
    console.error("Erreur lors de l'initialisation des commandes:", err);
    throw new Error(`Erreur lors de l'initialisation: ${err}`);
  }
}

/**
 * Alias pour compatibilité
 */
export const deleteCommande = deleteOrder;

/**
 * BATCH: Import en masse de commandes
 */
export async function importOrders(items: OrderListItem[]): Promise<void> {
  // const confirmed = window.confirm(`Êtes-vous sûr de vouloir supprimer ${items.length} commande(s)?`);
  // if (!confirmed) return;

  try {
    const deletePromises = items.map((item) => deleteOrder(item.id));
    await Promise.all(deletePromises);
  } catch (err) {
    console.error("Erreur lors du traitement des commandes:", err);
    throw new Error(`Erreur lors de l'initialisation: ${err}`);
  }
}
/**
 * Construit le XML minimal pour la création d'une commande
 * Exclut les champs générés automatiquement par PrestaShop
 */
function buildOrderXmlForCreation(form: OrderForm): string {
  return buildOrderXmlForCreationWithRows(form);
}

function buildOrderXmlForCreationWithRows(form: OrderForm): string {
  // PrestaShop exige les montants principaux à la création.
  // On garde des valeurs cohérentes TTC: total_paid = total_paid_tax_incl.

  // VALIDATION: Les adresses doivent être choisies (jamais 0)
  if (!validateUnsignedId(form.id_address_delivery) || form.id_address_delivery === 0) {
    throw new Error("Erreur interne: id_address_delivery invalide ou 0 - une adresse de livraison doit être choisie");
  }
  if (!validateUnsignedId(form.id_address_invoice) || form.id_address_invoice === 0) {
    throw new Error("Erreur interne: id_address_invoice invalide ou 0 - une adresse de facturation doit être choisie");
  }

  const order = {
    id_cart: form.id_cart,
    id_customer: form.id_customer,
    id_address_delivery: form.id_address_delivery,
    id_address_invoice: form.id_address_invoice,
    id_currency: form.id_currency,
    id_lang: form.id_lang || 1,
    id_carrier: form.id_carrier,
    // Fix: Forcer l'état initial de la commande à '1' lors de la création
    current_state: 1,
    // Champs multi-shop requis par certains environnements PrestaShop
    id_shop: form.id_shop ?? 1,
    id_shop_group: form.id_shop_group ?? 1,
    module: form.module,
    payment: form.payment,
    secure_key: form.secure_key || "",
    total_paid: form.total_paid_tax_incl ?? form.total_paid ?? 0,
    total_paid_tax_incl: form.total_paid_tax_incl ?? form.total_paid ?? 0,
    total_paid_tax_excl: form.total_paid_tax_excl ?? form.total_paid ?? 0,
    total_paid_real: form.total_paid_real ?? form.total_paid_tax_incl ?? form.total_paid ?? 0,
    total_products: form.total_products ?? 0,
    total_products_wt: form.total_products_wt ?? form.total_products ?? 0,
    total_shipping: form.total_shipping ?? 0,
    conversion_rate: form.conversion_rate || 1,
  };

  // if (orderRows && orderRows.length > 0) {
  //   (order as any).associations = {
  //     order_rows: {
  //       order_row: orderRows.map((row) => ({
  //         id: 0,
  //         product_id: row.product_id,
  //         product_attribute_id: row.id_product_attribute ?? 0,
  //         product_quantity: row.quantity,
  //         product_name: row.name,
  //         product_reference: row.reference || "",
  //         product_ean13: "",
  //         product_isbn: "",
  //         product_upc: "",
  //         product_price: row.unit_price,
  //         id_customization: 0,
  //         unit_price_tax_incl: row.unit_price,
  //         unit_price_tax_excl: row.unit_price,
  //       })),
  //     },
  //   };
  // }

  // Ajoute les champs multilingues si présents
  if (form.note) {
    (order as any).note = languageField(form.note);
  }

  // Associations (lignes de commande) si transmises par le frontend
  const orderRows = (form as any)?.order_rows || (form as any)?.orderRows || [];
  if (Array.isArray(orderRows) && orderRows.length > 0) {
    (order as any).associations = {
      order_rows: {
        order_row: orderRows.map((row: any) => ({
          product_id: row.product_id,
          product_quantity: row.product_quantity,
        })),
      },
    };
  }

  // Inclure l'attribut xmlns:xlink attendu par PrestaShop
  return buildPrestashopXml({ prestashop: { "@_xmlns:xlink": "http://www.w3.org/1999/xlink", order } });
}

/**
 * Construit le XML complet pour la mise à jour d'une commande
 */
function buildOrderXmlForUpdate(form: OrderForm & { id: number }): string {
  const order: Record<string, unknown> = {
    id: form.id,
    id_cart: form.id_cart,
    id_customer: form.id_customer,
    id_address_delivery: form.id_address_delivery,
    id_address_invoice: form.id_address_invoice,
    id_currency: form.id_currency,
    id_lang: form.id_lang || 1,
    id_carrier: form.id_carrier,
    current_state: form.current_state || 1,
    module: form.module,
    payment: form.payment,
    secure_key: form.secure_key || "",
    reference: form.reference || "", // champ additionnel

    // Montants
    total_paid: form.total_paid || 0,
    total_paid_tax_incl: form.total_paid_tax_incl ?? form.total_paid ?? 0,
    total_paid_tax_excl: form.total_paid_tax_excl ?? form.total_paid ?? 0,
    total_paid_real: form.total_paid_real || form.total_paid || 0,
    total_products: form.total_products || 0,
    total_products_wt: form.total_products_wt || form.total_products || 0,
    total_shipping: form.total_shipping || 0,
    total_shipping_tax_incl: form.total_shipping_tax_incl ?? form.total_shipping ?? 0,
    total_shipping_tax_excl: form.total_shipping_tax_excl ?? form.total_shipping ?? 0,
    total_discounts: form.total_discounts ?? 0,
    total_discounts_tax_incl: form.total_discounts_tax_incl ?? 0,
    total_discounts_tax_excl: form.total_discounts_tax_excl ?? 0,
    carrier_tax_rate: form.carrier_tax_rate ?? 0,
    total_wrapping: form.total_wrapping ?? 0,
    total_wrapping_tax_incl: form.total_wrapping_tax_incl ?? 0,
    total_wrapping_tax_excl: form.total_wrapping_tax_excl ?? 0,
    conversion_rate: form.conversion_rate || 1,

    // Techniques
    round_mode: form.round_mode ?? 0,
    round_type: form.round_type ?? 0,
    valid: toPrestashopBool(form.valid || false),
    recyclable: toPrestashopBool(form.recyclable || false),
    gift: toPrestashopBool(form.gift || false),
    mobile_theme: toPrestashopBool(form.mobile_theme || false),

    // Documents
    invoice_number: form.invoice_number || "",
    invoice_date: form.invoice_date || "",
    delivery_number: form.delivery_number || "",
    delivery_date: form.delivery_date || "",
    shipping_number: form.shipping_number || "", // ✅ Champ additionnel
  };

  // Champs multilingues
  if (form.note) {
    order.note = languageField(form.note);
  }
  if (form.gift_message) {
    order.gift_message = languageField(form.gift_message);
  }

  return buildPrestashopXml({ prestashop: { order } });
}

// ============================================================
// UTILITIES & FORMATTERS
// ============================================================

/**
 * Retourne le libellé d'un état de commande
 */
export function getOrderStateLabel(stateId: number): string {
  if (stateId === CART_PENDING_STATE_ID) {
    return CART_PENDING_STATE_LABEL;
  }

  const state = ORDER_STATES.find((s) => s.id === stateId);
  return state?.label || `État #${stateId}`;
}

/**
 * Formate un montant en devise EUR
 */
export function formatCurrencyEur(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Alias pour compatibilité
 */
export const formatCurrency = formatCurrencyEur;

/**
 * Initialise l'import en masse (supprime toutes les commandes)
 * Opération destructrice
 */
export async function initCommande(items: OrderListItem[]): Promise<void> {
  // const confirmed = window.confirm(
  //   `Êtes-vous sûr de vouloir supprimer tous les ${items.length} commandes?`,
  // );
  // if (!confirmed) return;

  try {
    const deletePromises = items.map((item) => deleteOrder(item.id));
    await Promise.all(deletePromises);
  } catch (err) {
    console.error("Erreur lors de la suppression des commandes:", err);
    throw new Error(`Erreur lors de l'initialisation: ${err}`);
  }
}