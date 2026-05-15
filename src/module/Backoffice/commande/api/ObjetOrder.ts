
export type OrderGetResponse = {
  prestashop: {
    order: Record<string, unknown>;
  };
};

export type OrderListResponse = {
  prestashop: {
    orders: {
      order: Array<Record<string, unknown>> | Record<string, unknown>;
    };
  };
};

export type CartListResponse = {
  prestashop: {
    carts: {
      cart: Array<Record<string, unknown>> | Record<string, unknown>;
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

export const CART_PENDING_STATE_ID = 0;
export const CART_PENDING_STATE_LABEL = "Dans panier";

export const ORDER_STATES = [
  { id: 1, label: "En attente du paiement par chèque" },
  { id: 2, label: "Paiement accepté" },
  { id: 3, label: "Préparation en cours" },
  { id: 4, label: "Expédié" },
  { id: 5, label: "Livré" },
  { id: 6, label: "Annulé" },
  { id: 7, label: "Remboursé" },
  { id: 8, label: "Retour accepté" },
];

export const DEFAULT_ORDER_FORM: OrderForm = {
  id_customer: 0,
  id_address_delivery: 0,
  id_address_invoice: 0,
  id_cart: 0,
  id_currency: 1,
  id_lang: 1,
  id_carrier: 0,
  payment: "Paiement à la livraison",
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
export type RequiredFieldRule<T> = {
  key: keyof T;
  message: string;
  validator?: (value: unknown) => boolean;
};

/**
 * Vérifie que les champs requis sont valides
 * Jette une erreur avec la liste des champs manquants
 */
export function validateRequiredFields<T extends Record<string, unknown>>(
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