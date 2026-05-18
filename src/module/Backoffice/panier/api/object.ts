
export type PrestashopCartItem = {
  id?: unknown;
  id_customer?: unknown;
  id_guest?: unknown;
  id_order?: unknown;
  id_carrier?: unknown;
  date_add?: unknown;
  date_upd?: unknown;
  mobile_theme?: unknown;
  delivery_option?: unknown;
};

export type PrestashopGuestResponse = {
  prestashop: {
    guest: {
      id?: unknown;
      id_customer?: unknown;
      firstname?: unknown;
      lastname?: unknown;
      email?: unknown;
    };
  };
};

export type CartListItem = {
  id: number;
  id_order: number | null;
  id_customer: number;
  customerName: string;
  total: number;
  carrierId: number | null;
  date_add: string;
  online: boolean;
};

export type CartDetail = {
  id: number;
  id_order: number | null;
  id_customer: number;
  customerName: string;
  customerEmail: string;
  customerRegistrationDate: string;
  customerOrdersCount: number;
  customerSpentAmount: number;
  date_add: string;
  date_upd: string;
  items: Array<{
    product_id: number;
    id_product_attribute?: number;
    name: string;
    unit_price: number;
    quantity: number;
    stock?: number;
    total: number;
    image_id?: number;
    attributes_label?: string;
  }>;
  total_products: number;
  total: number;
};


export type CartCreate = {
  id_customer: number;
  id_address_delivery?: number;
  id_address_invoice?: number;
  id_currency?: number;
  id_lang?: number;
  id_carrier?: number;
  id_shop?: number;
  id_shop_group?: number;
  secure_key?: string;
  date_add?: string;
  date_upd?: string;
};

export type CartImport = CartCreate & {
  items: Array<{ id_product: number; id_product_attribute?: number; quantity: number }>;
};

export type CartCreateForm = CartCreate;

export type CartImportForm = CartImport;

export type GuestCartCookiePayload = {
  id_cart: number;
  id_guest: number;
  langue: number;
  devise: number;
  session: string;
};

export const GUEST_CART_COOKIE_KEYS = {
  idCart: "id_cart",
  idGuest: "id_guest",
  langue: "langue",
  devise: "devise",
  session: "session",
} as const;
