import { buildPrestashopXml, requestPrestashopXml } from "../../../../utils/prestashopClient";
import { textFromUnknown, numFromUnknown } from "../../../../utils/helper";
import { getClient } from "../../client/api/clientApi";
import { PAYMENT_METHODS } from "../../paiement/api/PaiementApi";


export function getPaymentMethod(code: string) {
  return PAYMENT_METHODS.find(p => p.code === code);
}

type PrestashopLanguageField = {
  language:
    | { "@_id": number; "#text"?: string }
    | Array<{ "@_id": number; "#text"?: string }>;
};

type OrderGetResponse = {
  prestashop: {
    order: {
      id?: unknown;
      reference?: unknown;
      id_customer?: unknown;
      id_cart?: unknown;
      id_currency?: unknown;
      current_state?: unknown;
      total_paid?: unknown;
      total_paid_tax_incl?: unknown;
      total_paid_tax_excl?: unknown;
      payment?: unknown;
      module?: unknown;
      valid?: unknown;
      date_add?: unknown;
      date_upd?: unknown;
      invoice_number?: unknown;
      invoice_date?: unknown;
      delivery_date?: unknown;
      id_address_delivery?: unknown;
      id_address_invoice?: unknown;
      delivery_number?: unknown;
      id_carrier?: unknown;
      total_paid_real?: unknown;
      total_products?: unknown;
      total_products_wt?: unknown;
      total_shipping?: unknown;
      total_shipping_tax_incl?: unknown;
      total_shipping_tax_excl?: unknown;
      total_discounts?: unknown;
      total_discounts_tax_incl?: unknown;
      total_discounts_tax_excl?: unknown;
      total_wrapping?: unknown;
      total_wrapping_tax_incl?: unknown;
      total_wrapping_tax_excl?: unknown;
      carrier_tax_rate?: unknown;
      round_mode?: unknown;
      round_type?: unknown;
      conversion_rate?: unknown;
      id_shop_group?: unknown;
      id_shop?: unknown;
      secure_key?: unknown;
      shipping_number?: unknown;
      recyclable?: unknown;
      mobile_theme?: unknown;
      note?: PrestashopLanguageField;
      gift?: unknown;
      gift_message?: unknown;
    };
  };
};

type OrderListResponse = {
  prestashop: {
    orders: {
      order: Array<{
        id: unknown;
        reference: unknown;
        id_customer: unknown;
        total_paid: unknown;
        payment: unknown;
        current_state: unknown;
        date_add: unknown;
      }>;
    };
  };
};

export type OrderListItem = {
  id: number;
  reference: string;
  id_customer: number;
  payment: string;
  total_paid: number;
  current_state: number;
  date_add: string;
};

export type OrderResource = {
  id_address_delivery: number;
  id_address_invoice: number;
  id_cart: number;
  id_currency: number;
  id_lang: number;
  id_customer: number;
  id_carrier: number;
  current_state: number;
  module: string;
  invoice_number?: string;
  invoice_date?: string;
  delivery_number?: string;
  delivery_date?: string;
  valid?: boolean;
  date_add?: string;
  date_upd?: string;
  shipping_number?: string;
  note?: string;
  id_shop_group?: number;
  id_shop?: number;
  secure_key?: string;
  payment: string;
  recyclable?: boolean;
  gift?: boolean;
  gift_message?: string;
  mobile_theme?: boolean;
  total_discounts?: number;
  total_discounts_tax_incl?: number;
  total_discounts_tax_excl?: number;
  total_paid: number;
  total_paid_tax_incl?: number;
  total_paid_tax_excl?: number;
  total_paid_real: number;
  total_products: number;
  total_products_wt: number;
  total_shipping?: number;
  total_shipping_tax_incl?: number;
  total_shipping_tax_excl?: number;
  carrier_tax_rate?: number;
  total_wrapping?: number;
  total_wrapping_tax_incl?: number;
  total_wrapping_tax_excl?: number;
  round_mode?: number;
  round_type?: number;
  conversion_rate: number;
  reference?: string;
};

type RequiredFieldRule<T> = {
  key: keyof T;
  message: string;
  isValid?: (value: unknown, form: T) => boolean;
};

function assertRequiredFields<T extends Record<string, unknown>>(
  resourceName: string,
  form: T,
  rules: Array<RequiredFieldRule<T>>,
): void {
  const missing = rules
    .filter((rule) => {
      const value = form[rule.key];
      if (rule.isValid) return !rule.isValid(value, form);
      if (typeof value === "string") return value.trim().length === 0;
      return value === undefined || value === null || value === "";
    })
    .map((rule) => rule.message);

  if (missing.length > 0) {
    throw new Error(`${resourceName}: champs requis manquants - ${missing.join(", ")}`);
  }
}


export type OrderImport = {
    id_order: number;
    reference: string;
    // id_shop_group: number;
    // id_shop: number;
    id_carrier: number;
    id_lang: number;
    id_customer: number;
    id_cart: number;
    id_currency: number;
    id_address_delivery: number;
    id_address_invoice: number;

    // État et Sécurité
    current_state: number;
    secure_key: string;
    payment: string;
    module: string;

    // Chiffres et Montants (Typés number pour les calculs)
    conversion_rate: number;
    total_discounts: number;
    total_discounts_tax_incl: number;
    total_discounts_tax_excl: number;
    total_paid: number;
    total_paid_tax_incl: number;
    total_paid_tax_excl: number;
    total_paid_real: number;
    total_products: number;
    total_products_wt: number; // wt = With Tax
    total_shipping: number;
    total_shipping_tax_incl: number;
    total_shipping_tax_excl: number;
    carrier_tax_rate: number;
    total_wrapping: number;
    total_wrapping_tax_incl: number;
    total_wrapping_tax_excl: number;

    // Configuration et Options (Souvent 0 ou 1 en base de données)
    recyclable: boolean | number;
    gift: boolean | number;
    gift_message?: string;
    mobile_theme: boolean | number;
    round_mode: number;
    round_type: number;

    // Documents et Validation
    invoice_number: number;
    delivery_number: number;
    invoice_date: string; // Format YYYY-MM-DD HH:mm:ss
    delivery_date: string;
    valid: boolean | number;

    // Dates et Notes
    date_add: string;
    date_upd: string;
    note?: string;
};

export type OrderForm = OrderResource;

export type OrderCreateForm = OrderForm & {
  payment_code: string;
};

export type OrderImportForm = OrderImport;

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
  // id_shop: 1,
  // id_shop_group: 1,
};

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


export async function listOrdersLight(): Promise<OrderListItem[]> {
  const url = `/orders?display=full&limit=200`;
  const response = await requestPrestashopXml<OrderListResponse>(url);

  if (!response?.prestashop?.orders?.order) {
    return [];
  }

  const orders = Array.isArray(response.prestashop.orders.order)
    ? response.prestashop.orders.order
    : [response.prestashop.orders.order];

  return orders.map((order) => {
      const customerId = numFromUnknown(order.id_customer);
      // const customer = getClient(customerId).then(c => c ? c.firstname + " " + c.lastname : `#${customerId}`).catch(() => `#${customerId}`);
      return {
      id: numFromUnknown(order.id) || 0,
      reference: textFromUnknown(order.reference).trim(),
      id_customer: customerId || 0,
      payment: textFromUnknown(order.payment).trim(),
      total_paid: Number(textFromUnknown(order.total_paid)) || 0,
      current_state: numFromUnknown(order.current_state) || 1,
      date_add: textFromUnknown(order.date_add).split(" ")[0],
    };
  });
}

export async function getOrder(id: number): Promise<OrderForm> {
  const url = `/orders/${id}?display=full`;
  const response = await requestPrestashopXml<OrderGetResponse>(url);

  if (!response?.prestashop?.order) {
    throw new Error("Commande non trouvée");
  }

  const order = response.prestashop.order;

  const noteValue = order.note;
  let noteText = "";
  if (noteValue) {
    if (typeof noteValue === "object" && "language" in noteValue) {
      const lang = Array.isArray(noteValue.language) ? noteValue.language[0] : noteValue.language;
      noteText = lang?.["#text"]?.trim() || "";
    }
  }

  const giftMsgValue = order.gift_message;
  let giftMsg = "";
  if (giftMsgValue) {
    if (typeof giftMsgValue === "object" && "language" in giftMsgValue) {
      const lang = Array.isArray(giftMsgValue.language) ? giftMsgValue.language[0] : giftMsgValue.language;
      giftMsg = lang?.["#text"]?.trim() || "";
    }
  }

  return {
    id_customer: numFromUnknown(order.id_customer) || 0,
    id_address_delivery: numFromUnknown(order.id_address_delivery) || 0,
    id_address_invoice: numFromUnknown(order.id_address_invoice) || 0,
    id_cart: numFromUnknown(order.id_cart) || 0,
    id_currency: numFromUnknown(order.id_currency) || 1,
    id_lang: 1,
    id_carrier: numFromUnknown(order.id_carrier) || 0,
    payment: textFromUnknown(order.payment || "").trim(),
    module: textFromUnknown(order.module || "").trim(),
    current_state: numFromUnknown(order.current_state) || 1,
    total_paid: numFromUnknown(order.total_paid) || 0,
    total_paid_real: numFromUnknown(order.total_paid_real) || numFromUnknown(order.total_paid) || 0,
    total_products: numFromUnknown(order.total_products) || 0,
    total_products_wt: numFromUnknown(order.total_products_wt) || numFromUnknown(order.total_products) || 0,
    total_shipping: numFromUnknown(order.total_shipping) || 0,
    total_shipping_tax_incl: numFromUnknown(order.total_shipping_tax_incl) || 0,
    total_shipping_tax_excl: numFromUnknown(order.total_shipping_tax_excl) || 0,
    total_discounts: numFromUnknown(order.total_discounts) || 0,
    total_discounts_tax_incl: numFromUnknown(order.total_discounts_tax_incl) || 0,
    total_discounts_tax_excl: numFromUnknown(order.total_discounts_tax_excl) || 0,
    total_paid_tax_incl: numFromUnknown(order.total_paid_tax_incl) || 0,
    total_paid_tax_excl: numFromUnknown(order.total_paid_tax_excl) || 0,
    total_wrapping: numFromUnknown(order.total_wrapping) || 0,
    total_wrapping_tax_incl: numFromUnknown(order.total_wrapping_tax_incl) || 0,
    total_wrapping_tax_excl: numFromUnknown(order.total_wrapping_tax_excl) || 0,
    carrier_tax_rate: numFromUnknown(order.carrier_tax_rate) || 0,
    round_mode: numFromUnknown(order.round_mode) || 0,
    round_type: numFromUnknown(order.round_type) || 0,
    conversion_rate: numFromUnknown(order.conversion_rate) || 1,
    id_shop_group: numFromUnknown(order.id_shop_group) || 1,
    id_shop: numFromUnknown(order.id_shop) || 1,
    secure_key: textFromUnknown(order.secure_key || "").trim(),
    valid: numFromUnknown(order.valid) === 1,
    invoice_number: textFromUnknown(order.invoice_number || "").trim(),
    invoice_date: textFromUnknown(order.invoice_date || "").split(" ")[0],
    delivery_date: textFromUnknown(order.delivery_date || "").split(" ")[0],
    delivery_number: textFromUnknown(order.delivery_number || "").trim(),
    shipping_number: textFromUnknown(order.shipping_number || "").trim(),
    note: noteText,
    gift: numFromUnknown(order.gift) === 1,
    gift_message: giftMsg,
    recyclable: numFromUnknown(order.recyclable) === 1,
    mobile_theme: numFromUnknown(order.mobile_theme) === 1,
  };
}

export async function createOrder(form: OrderCreateForm): Promise<number> {
  // 🔥 SAFE VALIDATION (only strict required fields)
  assertRequiredFields<OrderForm>("Commande", form, [
    { key: "id_customer", message: "id_customer", isValid: v => Number(v) > 0 },
    { key: "id_cart", message: "id_cart", isValid: v => Number(v) > 0 },
    { key: "id_address_delivery", message: "id_address_delivery", isValid: v => Number(v) > 0 },
    { key: "id_address_invoice", message: "id_address_invoice", isValid: v => Number(v) > 0 },
    { key: "id_currency", message: "id_currency", isValid: v => Number(v) > 0 },
    { key: "id_lang", message: "id_lang", isValid: v => Number(v) > 0 },
    { key: "id_carrier", message: "id_carrier", isValid: v => Number(v) > 0 },
  ]);

  // 🔥 GET CUSTOMER SECURE KEY SAFE
  let secureKey = form.secure_key;

  if (!secureKey) {
    try {
      const customer = await getClient(form.id_customer);
      secureKey = customer?.secure_key || "";
    } catch {
      secureKey = "";
    }
  }

  const method = getPaymentMethod(form.payment_code || "cash");

  if (!method?.module) {
    throw new Error(`Méthode de paiement invalide: ${form.payment_code}`);
  }

  const safeForm: OrderForm = {
    ...form,
    module: method.module,
    payment: method.label,
    secure_key: secureKey,
    id_shop: 1,
    id_shop_group: 1,
  };

  const xml = buildOrderXmlForCreation(safeForm);

  const response = await requestPrestashopXml<{
    prestashop: { order: { id: unknown } }
  }>(
    `/orders`,
    {
      method: "POST",
      bodyXml: xml,
    }
  );

  const id = Number(response?.prestashop?.order?.id);

  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Échec création commande PrestaShop (ID invalide)");
  }

  return id;
}

export async function updateOrder(id: number, form: OrderForm): Promise<void> {
  const xml = buildOrderXml(form);
  await requestPrestashopXml(`/orders/${id}`, { method: "PUT", bodyXml: xml });
}

export async function updateImportOrder(id: number, form: OrderImport): Promise<void> {
  const xml = buildOrderTXml(form);
  await requestPrestashopXml(`/orders/${id}`, { method: "PUT", bodyXml: xml });
}

export async function deleteOrder(id: number): Promise<void> {
  await requestPrestashopXml(`/orders/${id}`, { method: "DELETE" });
}

export const createCommande = createOrder;
export const updateEtatCommande = async (id: number, current_state: number): Promise<void> => {
  const order = await getOrder(id);
  await updateOrder(id, {
    ...order,
    current_state,
  });
};
export const deleteCommande = deleteOrder;

// conversion d'un OrderForm en XML pour Prestashop

/**
 * Build minimal XML for order CREATION
 * Excludes read-only fields that PrestaShop auto-generates (invoice_date, delivery_date, valid, etc.)
 */
function buildOrderXmlForCreation(form: OrderForm): string {
  const root = {
    prestashop: {
      order: {
        id_cart: form.id_cart,
        id_customer: form.id_customer,
        id_address_delivery: form.id_address_delivery,
        id_address_invoice: form.id_address_invoice,
        id_currency: form.id_currency,
        id_lang: form.id_lang,
        id_carrier: form.id_carrier,

        module: form.module,
        payment: form.payment,
        secure_key: form.secure_key || "",

        total_paid: form.total_paid || 0,
        total_paid_tax_incl: form.total_paid_tax_incl || form.total_paid || 0,
        total_paid_tax_excl: form.total_paid_tax_excl || form.total_paid || 0,
        total_paid_real: form.total_paid_real || form.total_paid || 0,
        total_products: form.total_products || 0,
        total_products_wt: form.total_products_wt || form.total_products || 0,
        total_shipping: form.total_shipping || 0,
        conversion_rate: form.conversion_rate || 1,
      },
    },
  };

  return buildPrestashopXml(root);
}

function buildOrderXml(form: OrderForm): string {
  const root = {
    prestashop: {
      order: {
      id_cart: form.id_cart,
      id_customer: form.id_customer,
      id_address_delivery: form.id_address_delivery,
      id_address_invoice: form.id_address_invoice,
      id_currency: form.id_currency,
      id_lang: form.id_lang,
      id_carrier: form.id_carrier,
      payment: form.payment,
      module: form.module,
      current_state: form.current_state,
      total_paid: form.total_paid,
      total_paid_tax_incl: form.total_paid_tax_incl ?? form.total_paid,
      total_paid_tax_excl: form.total_paid_tax_excl ?? form.total_paid,
      total_paid_real: form.total_paid_real,
      total_products: form.total_products,
      total_products_wt: form.total_products_wt,
      total_shipping: form.total_shipping,
      total_shipping_tax_incl: form.total_shipping_tax_incl ?? form.total_shipping,
      total_shipping_tax_excl: form.total_shipping_tax_excl ?? form.total_shipping,
      total_discounts: form.total_discounts ?? 0,
      total_discounts_tax_incl: form.total_discounts_tax_incl ?? 0,
      total_discounts_tax_excl: form.total_discounts_tax_excl ?? 0,
      carrier_tax_rate: form.carrier_tax_rate ?? 0,
      total_wrapping: form.total_wrapping ?? 0,
      total_wrapping_tax_incl: form.total_wrapping_tax_incl ?? 0,
      total_wrapping_tax_excl: form.total_wrapping_tax_excl ?? 0,
      round_mode: form.round_mode ?? 0,
      round_type: form.round_type ?? 0,
      conversion_rate: form.conversion_rate,
      secure_key: form.secure_key || "",
      valid: form.valid ? 1 : 0,
      invoice_number: form.invoice_number,
      invoice_date: form.invoice_date,
      delivery_date: form.delivery_date,
      delivery_number: form.delivery_number,
      gift: form.gift ? 1 : 0,
      recyclable: form.recyclable ? 1 : 0,
      mobile_theme: form.mobile_theme ? 1 : 0,
      },
    },
  };

  if (form.note) {
    (root.prestashop.order as any).note = {
      language: {
        "@_id": "1",
        "#text": form.note,
      },
    };
  }

  if (form.gift_message) {
    (root.prestashop.order as any).gift_message = {
      language: {
        "@_id": "1",
        "#text": form.gift_message,
      },
    };
  }

  return buildPrestashopXml(root);
}

function buildOrderTXml(form: OrderImport): string {
  const root = {
    prestashop: {
      order: {
        // id_shop_group: form.id_shop_group,
        // id_shop: form.id_shop,
        id_address_delivery: form.id_address_delivery,
        id_address_invoice: form.id_address_invoice,
        id_cart: form.id_cart,
        id_currency: form.id_currency,
        id_lang: form.id_lang || 1,
        id_customer: form.id_customer,
        id_carrier: form.id_carrier,
        current_state: form.current_state,
        module: form.module,
        payment: form.payment,
        total_paid: form.total_paid,
        total_paid_tax_incl: form.total_paid_tax_incl,
        total_paid_tax_excl: form.total_paid_tax_excl,
        total_products: form.total_products,
        total_products_wt: form.total_products_wt,
        total_paid_real: form.total_paid_real,
        conversion_rate: form.conversion_rate,
        secure_key: form.secure_key,
      },
    },
  };

  return buildPrestashopXml(root);
}

export function getOrderStateLabel(stateId: number): string {
  const state = ORDER_STATES.find((s) => s.id === stateId);
  return state?.label || `État #${stateId}`;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export async function initCommande(items: OrderListItem[]): Promise<void> {
  const confirmed = window.confirm("Vous etes sur de supprimer tous les clients ?");
  if (!confirmed) return;
  console.log("Initialisation des commandes...");
  try {
      const deletePromises = items.map(donner => deleteOrder(donner.id));
      await Promise.all(deletePromises);
  } catch (err) {
      console.error("Une ou plusieurs erreurs sont survenues lors de la suppression", err);
      alert("Une erreur est survenue lors de l'initialisation.");
  }
}