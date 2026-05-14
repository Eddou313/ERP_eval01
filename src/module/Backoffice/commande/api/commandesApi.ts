import { buildPrestashopXml, requestPrestashopXml } from "../../../../utils/prestashopClient";
import {
  textFromUnknown,
  numFromUnknown,
  boolFromUnknown,
  asArray,
  getFirstLanguageText,
  toPrestashopBool,
  languageField,
  validateUnsignedId,
  validatePrice,
  validateFloat,
} from "../../../../utils/helper";
import { getClient } from "../../client/api/clientApi";
import { PAYMENT_METHODS } from "../../paiement/api/PaiementApi";

type OrderGetResponse = {
  prestashop: {
    order: Record<string, unknown>;
  };
};

type OrderListResponse = {
  prestashop: {
    orders: {
      order: Array<Record<string, unknown>>;
    };
  };
};

export type OrderListItem = {
  id: number;
  reference: string;
  id_customer: number;
  payment: string;
  total_paid_tax_incl: number;
  current_state: number;
  date_add: string;
};

export type OrderResource = {
  id?: number;
  id_address_delivery: number;
  id_address_invoice: number;
  id_cart: number;
  id_currency: number;
  id_lang: number;
  id_customer: number;
  id_carrier: number;
  current_state: number;
  module: string;
  payment: string;

  total_paid: number;
  total_paid_real: number;
  total_products: number;
  total_products_wt: number;
  conversion_rate: number;

  total_discounts?: number;
  total_discounts_tax_incl?: number;
  total_discounts_tax_excl?: number;
  total_paid_tax_incl?: number;
  total_paid_tax_excl?: number;
  total_shipping?: number;
  total_shipping_tax_incl?: number;
  total_shipping_tax_excl?: number;
  carrier_tax_rate?: number;
  total_wrapping?: number;
  total_wrapping_tax_incl?: number;
  total_wrapping_tax_excl?: number;

  invoice_number?: string;
  invoice_date?: string;
  delivery_number?: string;
  delivery_date?: string;

  valid?: boolean;
  recyclable?: boolean;
  gift?: boolean;
  mobile_theme?: boolean;

  note?: string;
  gift_message?: string;
  secure_key?: string;

  round_mode?: number;
  round_type?: number;

  // Champs multi-shop
  id_shop_group?: number;
  id_shop?: number;

  // Champs audit
  date_add?: string;
  date_upd?: string;

  // Champs additionnels
  reference?: string;
  shipping_number?: string;
};

export type OrderForm = OrderResource;

export type OrderCreateForm = OrderForm & {
  payment_code: string;
};

export type OrderImport = OrderResource;

export const ORDER_STATES = [
  { id: 1, label: "En attente" },
  { id: 2, label: "Paiement accepté" },
  { id: 3, label: "Préparation en cours" },
  { id: 4, label: "Expédié" },
  { id: 5, label: "Livré" },
  { id: 6, label: "Annulé" },
  { id: 7, label: "Remboursé" },
  { id: 8, label: "Retour accepté" },
  { id: 9, label: "En attente de paiement" },
];

export const DEFAULT_ORDER_FORM: OrderForm = {
  id_customer: 0,
  id_address_delivery: 0,
  id_address_invoice: 0,
  id_cart: 0,
  id_currency: 1,
  id_lang: 1,
  id_carrier: 0,
  payment: "Virement bancaire",
  module: "",
  current_state: 1,
  total_paid: 0,
  total_paid_real: 0,
  total_products: 0,
  total_products_wt: 0,
  total_shipping: 0,
  conversion_rate: 1,
  valid: false,
  invoice_number: "",
  invoice_date: new Date().toISOString().split("T")[0],
  delivery_date: new Date().toISOString().split("T")[0],
  delivery_number: "",
  note: "",
  gift: false,
  gift_message: "",
  recyclable: false,
  mobile_theme: false,
  total_discounts: 0,
  total_discounts_tax_incl: 0,
  total_discounts_tax_excl: 0,
  total_paid_tax_incl: 0,
  total_paid_tax_excl: 0,
  total_shipping_tax_incl: 0,
  total_shipping_tax_excl: 0,
  carrier_tax_rate: 0,
  total_wrapping: 0,
  total_wrapping_tax_incl: 0,
  total_wrapping_tax_excl: 0,
  round_mode: 0,
  round_type: 0,
  secure_key: "",
};
/**
 * Validateur pour les champs requis
 */
type RequiredFieldRule<T> = {
  key: keyof T;
  message: string;
  validator?: (value: unknown) => boolean;
};

/**
 * Vérifie que les champs requis sont valides
 * Jette une erreur avec la liste des champs manquants
 */
function validateRequiredFields<T extends Record<string, unknown>>(
  resourceName: string,
  form: T,
  rules: Array<RequiredFieldRule<T>>,
): void {
  const errors = rules
    .filter((rule) => {
      const value = form[rule.key];
      if (rule.validator) return !rule.validator(value);

      // Validation par défaut
      if (typeof value === "number") return value <= 0;
      if (typeof value === "string") return value.trim().length === 0;
      return value === undefined || value === null;
    })
    .map((rule) => rule.message);

  if (errors.length > 0) {
    throw new Error(`${resourceName}: ${errors.join(", ")}`);
  }
}

/**
 * Règles de validation pour la création de commande
 * Basées sur les colonnes Required=✔️ de l'API PrestaShop
 */
const CREATE_ORDER_RULES: Array<RequiredFieldRule<OrderForm>> = [
  { key: "id_customer", message: "id_customer doit être > 0", validator: (v) => validateUnsignedId(v) },
  { key: "id_address_delivery", message: "id_address_delivery doit être > 0", validator: (v) => validateUnsignedId(v) },
  { key: "id_address_invoice", message: "id_address_invoice doit être > 0", validator: (v) => validateUnsignedId(v) },
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
  }>,
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

  if (!response?.prestashop?.orders?.order) {
    return [];
  }

  const orders = asArray(response.prestashop.orders.order);
  return orders.map(extractOrderListItem).filter((order) => {
    // Post-filter sur les montants
    if (params?.minAmount && order.total_paid_tax_incl < params.minAmount) return false;
    if (params?.maxAmount && order.total_paid_tax_incl > params.maxAmount) return false;
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

  const response = await requestPrestashopXml<OrderGetResponse>(`/orders/${id}`, {
    query: { display: "full" },
  });

  if (!response?.prestashop?.order) {
    throw new Error(`Commande #${id} non trouvée`);
  }

  return extractOrderResource(response.prestashop.order);
}

/**
 *CREATE: Crée une nouvelle commande
 * Valide les champs obligatoires et applique les règles PrestaShop
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
    } catch {
      secureKey = "";
    }
  }

  // Valide la méthode de paiement
  const paymentMethod = getPaymentMethod(form.payment_code || "cash");
  if (!paymentMethod?.module) {
    throw new Error(`Méthode de paiement invalide: ${form.payment_code}`);
  }

  // Prépare le formulaire sécurisé
  const safeForm: OrderForm = {
    ...form,
    module: paymentMethod.module,
    payment: paymentMethod.label,
    secure_key: secureKey,
    id_shop: form.id_shop ?? 1,
    id_shop_group: form.id_shop_group ?? 1,
  };

  // Envoie la création
  const xml = buildOrderXmlForCreation(safeForm);
  const response = await requestPrestashopXml<{
    prestashop: { order: { id: unknown } };
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
 * Utilise le workflow cohérent de PrestaShop
 * Envoie uniquement l'état + les champs obligatoires requis par PrestaShop
 */
export async function updateOrderState(id: number, newState: number): Promise<void> {
  if (!validateUnsignedId(id)) {
    throw new Error(`ID commande invalide: ${id}`);
  }

  if (!validateUnsignedId(newState)) {
    throw new Error(`État invalide: ${newState}`);
  }

  // Changer l'état via la ressource `order_history` évite d'altérer la commande
  const xml = buildPrestashopXml({
    prestashop: {
      order_history: {
        id_order: id,
        id_order_state: newState,
        // Certains shops exigent un employee; essayer avec 1 par défaut
        id_employee: 1,
      },
    },
  });

  await requestPrestashopXml(`/order_histories`, {
    method: "POST",
    bodyXml: xml,
  });

  // Vérifier que PrestaShop a bien appliqué le nouvel état
  try {
    const updated = await getOrder(id);
    if (Number(updated.current_state) !== Number(newState)) {
      throw new Error(`Échec du changement d'état (current_state=${updated.current_state})`);
    }
  } catch (err) {
    // Relever l'erreur mais ne pas masquer l'appel original
    throw new Error(`Erreur vérification changement d'état: ${err instanceof Error ? err.message : String(err)}`);
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

  await requestPrestashopXml(`/orders/${id}`, { method: "DELETE" });
}

/**
 * Alias pour compatibilité
 */
export const deleteCommande = deleteOrder;

/**
 * BATCH: Import en masse de commandes
 */
export async function importOrders(items: OrderListItem[]): Promise<void> {
  const confirmed = window.confirm(`Êtes-vous sûr de vouloir supprimer ${items.length} commande(s)?`);
  if (!confirmed) return;

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
  const order = {
    id_cart: form.id_cart,
    id_customer: form.id_customer,
    id_address_delivery: form.id_address_delivery,
    id_address_invoice: form.id_address_invoice,
    id_currency: form.id_currency,
    id_lang: form.id_lang || 1,
    id_carrier: form.id_carrier,
    module: form.module,
    payment: form.payment,
    secure_key: form.secure_key || "",
    total_paid: form.total_paid || 0,
    total_paid_tax_incl: form.total_paid_tax_incl ?? form.total_paid ?? 0,
    total_paid_tax_excl: form.total_paid_tax_excl ?? form.total_paid ?? 0,
    total_paid_real: form.total_paid_real || form.total_paid || 0,
    total_products: form.total_products || 0,
    total_products_wt: form.total_products_wt || form.total_products || 0,
    total_shipping: form.total_shipping || 0,
    conversion_rate: form.conversion_rate || 1,
  };

  // Ajoute les champs multilingues si présents
  if (form.note) {
    (order as any).note = languageField(form.note);
  }

  return buildPrestashopXml({ prestashop: { order } });
}

/**
 * Construit le XML complet pour la mise à jour d'une commande
 */
function buildOrderXmlForUpdate(form: OrderForm & { id: number }): string {
  const order: Record<string, unknown> = {
    id: form.id,
    id_shop: form.id_shop || 1,
    id_shop_group: form.id_shop_group || 1,
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
  const confirmed = window.confirm(
    `Êtes-vous sûr de vouloir supprimer tous les ${items.length} commandes?`,
  );
  if (!confirmed) return;

  try {
    const deletePromises = items.map((item) => deleteOrder(item.id));
    await Promise.all(deletePromises);
  } catch (err) {
    console.error("Erreur lors de la suppression des commandes:", err);
    throw new Error(`Erreur lors de l'initialisation: ${err}`);
  }
}