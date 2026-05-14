import { buildPrestashopXml, PrestashopWebserviceError, requestPrestashopXml } from "../../../../utils/prestashopClient";
import { getClient } from "../../client/api/clientApi";
import { getOrder } from "../../commande/api/commandesApi";
import { resolveProductPriceWorkflow } from "../../produit/api/productsApi";
import { asArray, textFromUnknown, numFromUnknown } from "../../../../utils/helper";

type PrestashopCartItem = {
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

type PrestashopGuestResponse = {
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

const GUEST_CART_COOKIE_KEYS = {
  idCart: "id_cart",
  idGuest: "id_guest",
  langue: "langue",
  devise: "devise",
  session: "session",
} as const;

function getCookieValue(name: string): string | null {
  if (typeof document === "undefined") return null;

  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|; )${escapedName}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookieValue(name: string, value: string, maxAgeSeconds = 60 * 60 * 24 * 7): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; samesite=lax`;
}

function buildGuestSessionToken(): string {
  return `guest_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getGuestCartCookiePayload(): GuestCartCookiePayload | null {
  const idCart = Number(getCookieValue(GUEST_CART_COOKIE_KEYS.idCart) || 0);
  const idGuest = Number(getCookieValue(GUEST_CART_COOKIE_KEYS.idGuest) || 0);
  const langue = Number(getCookieValue(GUEST_CART_COOKIE_KEYS.langue) || 1);
  const devise = Number(getCookieValue(GUEST_CART_COOKIE_KEYS.devise) || 1);
  const session = getCookieValue(GUEST_CART_COOKIE_KEYS.session) || "";

  if (!idCart || !session) return null;

  return {
    id_cart: idCart,
    id_guest: idGuest,
    langue,
    devise,
    session,
  };
}

export function saveGuestCartCookiePayload(payload: GuestCartCookiePayload): void {
  setCookieValue(GUEST_CART_COOKIE_KEYS.idCart, String(payload.id_cart));
  setCookieValue(GUEST_CART_COOKIE_KEYS.idGuest, String(payload.id_guest));
  setCookieValue(GUEST_CART_COOKIE_KEYS.langue, String(payload.langue));
  setCookieValue(GUEST_CART_COOKIE_KEYS.devise, String(payload.devise));
  setCookieValue(GUEST_CART_COOKIE_KEYS.session, payload.session || buildGuestSessionToken());
}

export function clearGuestCartCookie(): void {
  if (typeof document === "undefined") return;
  // expire cookies immediately
  document.cookie = `${GUEST_CART_COOKIE_KEYS.idCart}=; path=/; max-age=0`;
  document.cookie = `${GUEST_CART_COOKIE_KEYS.idGuest}=; path=/; max-age=0`;
  document.cookie = `${GUEST_CART_COOKIE_KEYS.langue}=; path=/; max-age=0`;
  document.cookie = `${GUEST_CART_COOKIE_KEYS.devise}=; path=/; max-age=0`;
  document.cookie = `${GUEST_CART_COOKIE_KEYS.session}=; path=/; max-age=0`;
}

async function getProductInfo(
  productId: number,
  attributeId?: number | null,
): Promise<{ name: string; reference: string; price: number; stock?: number; imageId?: number; attributesLabel?: string } | null> {
  if (!productId) return null;
  try {
    const response = await requestPrestashopXml<any>(`/products/${productId}`);
    const product = response?.prestashop?.product;
    if (!product) return null;
    const nameLang = (product.name && (Array.isArray(product.name.language) ? product.name.language[0] : product.name.language)) || null;
    const baseName = textFromUnknown(nameLang?.["#text"]) || "";
    const baseReference = textFromUnknown(product.reference) || "";
    const imageId = numFromUnknown(product.id_default_image) || undefined;

    // If attributeId provided, try to find combination info in the product's associations
    let comboReference = "";
    let attributesLabel = "";
    if (attributeId && product.associations && product.associations.combinations) {
      const combos = product.associations.combinations.combination;
      const arr = Array.isArray(combos) ? combos : [combos];
      const found = arr.find((cm: any) => Number(cm.id) === attributeId || Number(cm["@_id"]) === attributeId);
      if (found) {
        comboReference = textFromUnknown(found.reference) || "";
      }

      // Resolve selected option value names for display in cart
      try {
        const combinationResponse = await requestPrestashopXml<any>(`/combinations/${attributeId}`, {
          query: { display: "full" },
        });

        const optionValuesRaw = combinationResponse?.prestashop?.combination?.associations?.product_option_values?.product_option_value;
        const optionValues = asArray(optionValuesRaw);

        const names: string[] = [];
        for (const optionValue of optionValues) {
          const optionValueId = numFromUnknown((optionValue as any)?.id ?? (optionValue as any)?.["@_id"]);
          if (!optionValueId) continue;

          try {
            const optionValueResponse = await requestPrestashopXml<any>(`/product_option_values/${optionValueId}`, {
              query: { display: "full" },
            });
            const valueName = textFromUnknown(optionValueResponse?.prestashop?.product_option_value?.name);
            if (valueName) {
              names.push(valueName);
            }
          } catch {
            // Ignore one option value failure and keep others.
          }
        }

        attributesLabel = names.join(" / ");
      } catch {
        attributesLabel = "";
      }
    }

    const pricing = await resolveProductPriceWorkflow(product, productId, attributeId ?? undefined);

    const name = comboReference ? `${baseName}\nRéf. : ${baseReference} / ${comboReference}` : `${baseName}\nRéf. : ${baseReference}`;
    const reference = comboReference ? `${baseReference} / ${comboReference}` : baseReference;
    const price = pricing.finalPrice;

    // Try to fetch stock (best-effort). If attributeId provided, filter by it.
    let stock: number | undefined = undefined;
    try {
      const stockQuery = attributeId
        ? `/stock_availables?filter[id_product]=[${productId}]&filter[id_product_attribute]=[${attributeId}]&display=[quantity]`
        : `/stock_availables?filter[id_product]=[${productId}]&display=[quantity]`;
      const stockResp = await requestPrestashopXml<any>(stockQuery);
      const stockEntry = stockResp?.prestashop?.stock_availables?.stock_available;
      const first = Array.isArray(stockEntry) ? stockEntry[0] : stockEntry;
      stock = first ? Number(first.quantity || 0) : undefined;
    } catch {
      stock = undefined;
    }

    return { name, reference, price, stock, imageId, attributesLabel };
  } catch {
    return null;
  }
}

export async function listCartIds(): Promise<number[]> {
  const json = await requestPrestashopXml<any>(`/carts`, { query: { display: "[id]" } });
  const carts = json?.prestashop?.carts?.cart;
  return asArray<any>(carts)
    .map((c: any) => Number(c["@_id"] ?? c.id))
    .filter((id: number) => Number.isFinite(id) && id > 0);
}

export async function listCartIdsByCustomerId(customerId: number): Promise<number[]> {
  if (!Number.isFinite(customerId) || customerId <= 0) return [];

  const extractId = (entry: any): number => numFromUnknown(entry?.["@_id"] ?? entry?.id);
  const extractCustomerId = (entry: any): number => numFromUnknown(entry?.id_customer ?? entry?.["id_customer"]);

  try {
    const json = await requestPrestashopXml<any>(`/carts`, {
      query: {
        display: "[id,id_customer]",
        "filter[id_customer]": `[${customerId}]`,
      },
    });

    const carts = json?.prestashop?.carts?.cart;
    return asArray<any>(carts)
      .filter((c: any) => extractCustomerId(c) === customerId)
      .map((c: any) => extractId(c))
      .filter((id: number) => Number.isFinite(id) && id > 0)
      .sort((a, b) => b - a);
  } catch (error) {
    // Certaines versions PrestaShop renvoient 500 sur filter/sort malgré des champs valides.
    if (!(error instanceof PrestashopWebserviceError)) {
      throw error;
    }

    const fallback = await requestPrestashopXml<any>(`/carts`, {
      query: { display: "[id,id_customer]" },
    });

    const carts = fallback?.prestashop?.carts?.cart;
    const filteredByCustomer = asArray<any>(carts)
      .filter((c: any) => extractCustomerId(c) === customerId)
      .map((c: any) => extractId(c))
      .filter((id: number) => Number.isFinite(id) && id > 0)
      .sort((a, b) => b - a);

    if (filteredByCustomer.length > 0) {
      return filteredByCustomer;
    }

    // Dernier recours: certains serveurs ne renvoient pas id_customer en mode liste.
    const idsOnly = asArray<any>(carts)
      .map((c: any) => extractId(c))
      .filter((id: number) => Number.isFinite(id) && id > 0)
      .sort((a, b) => b - a);

    const resolvedIds: number[] = [];
    for (const id of idsOnly) {
      try {
        const detail = await getCart(id);
        if (detail.id_customer === customerId) {
          resolvedIds.push(id);
        }
      } catch {
        // ignorer les paniers non lisibles
      }
    }

    return resolvedIds;
  }
}

async function getOrderIdByCartId(cartId: number): Promise<number | null> {
  const response = await requestPrestashopXml<any>(`/orders`, {
    query: {
      display: "[id,id_cart]",
      "filter[id_cart]": `[${cartId}]`,
    },
  });

  const orders = response?.prestashop?.orders?.order;
  const firstOrder = asArray<any>(orders)[0];
  if (!firstOrder) return null;

  const id = Number(firstOrder["@_id"] ?? firstOrder.id);
  return Number.isFinite(id) && id > 0 ? id : null;
}

async function getCustomerStats(customerId: number): Promise<{ customerOrdersCount: number; customerSpentAmount: number }> {
  if (customerId <= 0) {
    return { customerOrdersCount: 0, customerSpentAmount: 0 };
  }

  try {
    const response = await requestPrestashopXml<any>(`/orders`, {
      query: {
        display: "[id,total_paid]",
        "filter[id_customer]": `[${customerId}]`,
      },
    });

    const orders = response?.prestashop?.orders?.order;
    if (!orders) {
      return { customerOrdersCount: 0, customerSpentAmount: 0 };
    }

    const ordersList = Array.isArray(orders) ? orders : [orders];
    const totalSpent = ordersList.reduce((sum, order) => {
      return sum + (Number(order.total_paid) || 0);
    }, 0);

    return {
      customerOrdersCount: ordersList.length,
      customerSpentAmount: totalSpent,
    };
  } catch {
    return { customerOrdersCount: 0, customerSpentAmount: 0 };
  }
}

async function resolveCustomerInfoByCustomerId(customerId: number): Promise<{
  idCustomer: number;
  customerName: string;
  customerEmail: string;
  customerRegistrationDate: string;
  customerOrdersCount: number;
  customerSpentAmount: number;
} | null> {
  if (customerId <= 0) return null;

  const client = await getClient(customerId).catch(() => null);
  if (!client) return null;

  const stats = await getCustomerStats(customerId);
  return {
    idCustomer: customerId,
    customerName: `${client.firstname} ${client.lastname}`.trim() || `Client #${customerId}`,
    customerEmail: client.email || "-",
    customerRegistrationDate: client.date_add || "-",
    customerOrdersCount: stats.customerOrdersCount,
    customerSpentAmount: stats.customerSpentAmount,
  };
}

async function getCustomerInfoForCart(
  cartId: number,
  cartCustomerId: number,
  orderId?: number | null,
  guestId?: number | null,
): Promise<{
  idCustomer: number;
  customerName: string;
  customerEmail: string;
  customerRegistrationDate: string;
  customerOrdersCount: number;
  customerSpentAmount: number;
}> {
  const directCustomer = await resolveCustomerInfoByCustomerId(cartCustomerId);
  if (directCustomer) {
    return directCustomer;
  }

  if (guestId && guestId > 0) {
    const guest = await requestPrestashopXml<PrestashopGuestResponse>(`/guests/${guestId}`).catch(() => null);
    const guestData = guest?.prestashop?.guest;

    const guestCustomerId = Number(guestData?.id_customer) || 0;
    if (guestCustomerId > 0) {
      const guestCustomer = await resolveCustomerInfoByCustomerId(guestCustomerId);
      if (guestCustomer) return guestCustomer;
    }

    const guestName = `${textFromUnknown(guestData?.firstname)} ${textFromUnknown(guestData?.lastname)}`.trim();
    if (guestName) {
      const stats = await getCustomerStats(guestCustomerId || cartCustomerId);
      return {
        idCustomer: guestCustomerId || cartCustomerId,
        customerName: guestName,
        customerEmail: textFromUnknown(guestData?.email) || "-",
        customerRegistrationDate: "-",
        customerOrdersCount: stats.customerOrdersCount,
        customerSpentAmount: stats.customerSpentAmount,
      };
    }
  }

  const resolvedOrderId = orderId ?? (await getOrderIdByCartId(cartId));
  if (resolvedOrderId) {
    const order = await getOrder(resolvedOrderId).catch(() => null);
    if (order?.id_customer) {
      const orderCustomer = await resolveCustomerInfoByCustomerId(order.id_customer);
      if (orderCustomer) return orderCustomer;

      const stats = await getCustomerStats(order.id_customer);
      return {
        idCustomer: order.id_customer,
        customerName: `Client #${order.id_customer}`,
        customerEmail: "-",
        customerRegistrationDate: "-",
        customerOrdersCount: stats.customerOrdersCount,
        customerSpentAmount: stats.customerSpentAmount,
      };
    }
  }

  return {
    idCustomer: cartCustomerId,
    customerName: "Invité",
    customerEmail: "-",
    customerRegistrationDate: "-",
    customerOrdersCount: 0,
    customerSpentAmount: 0,
  };
}

export async function getNom(id: number): Promise<string> {
  const detail = await getCart(id);
  if (!detail.customerName) {
    return "Aucun nom";
  }
  return detail.customerName;
}

export  async function getCart(id: number): Promise<CartDetail> {
  // Try to fetch full cart with products
  const json = await requestPrestashopXml<any>(`/carts/${id}?display=full`);
  const cart = json?.prestashop?.cart as PrestashopCartItem | undefined;
  if (!cart) throw new Error("Panier introuvable");

  const idCustomerRaw = numFromUnknown(cart.id_customer);
  const orderIdRaw = Number(cart.id_order) || null;
  const guestIdRaw = Number(cart.id_guest) || null;
  const customerInfo = await getCustomerInfoForCart(id, idCustomerRaw, orderIdRaw, guestIdRaw);

  // Build items if present (cart rows may be under cart.associations.cart_rows.cart_row)
  const rows = (json?.prestashop?.cart?.associations?.cart_rows?.cart_row) ?? [];
  const rawItems = asArray<any>(rows).map((r: any) => ({
    product_id: numFromUnknown(r.id_product),
    attribute_id: numFromUnknown(r.id_product_attribute),
    id_product_attribute: numFromUnknown(r.id_product_attribute),
    name: textFromUnknown(r.name),
    unit_price: Number(r.price) || 0,
    quantity: Number(r.quantity) || 0,
    stock: undefined as number | undefined,
    total: Number(r.price || 0) * Number(r.quantity || 0),
    image_id: undefined as number | undefined,
    attributes_label: "",
  }));

  const items = await Promise.all(
    rawItems.map(async (it) => {
      const prod = await getProductInfo(it.product_id, it.id_product_attribute).catch(() => null);
      if (!prod) return it;

      const composedName = prod.reference ? `${prod.name}\nRéf. : ${prod.reference}` : prod.name;
      const unitPrice = prod.price || it.unit_price || 0;
      const stock = it.stock ?? prod.stock;
      const total = unitPrice * (it.quantity || 0);

      return {
        ...it,
        name: it.name || composedName,
        unit_price: unitPrice,
        stock,
        total,
        image_id: prod.imageId,
        attributes_label: prod.attributesLabel || "",
      };
    }),
  );

  const totalProducts = items.reduce((s: number, it: { total: number }) => s + (it.total || 0), 0);

  return {
    id,
    id_order: orderIdRaw,
    id_customer: customerInfo.idCustomer,
    customerName: customerInfo.customerName,
    customerEmail: customerInfo.customerEmail,
    customerRegistrationDate: customerInfo.customerRegistrationDate,
    customerOrdersCount: customerInfo.customerOrdersCount,
    customerSpentAmount: customerInfo.customerSpentAmount,
    date_add: textFromUnknown(cart.date_add),
    date_upd: textFromUnknown(cart.date_upd),
    items,
    total_products: totalProducts,
    total: totalProducts,
  };
}

export async function listCartsLight(limit?: number): Promise<CartListItem[]> {
  const url = `/carts?display=full&limit=200`;
  const response = await requestPrestashopXml<any>(url);
  const raw = response?.prestashop?.carts?.cart;
  if (!raw) return [];

  const cartsArray = Array.isArray(raw) ? raw : [raw];

  const mapped = await Promise.all(
    cartsArray.map(async (c: any) => {
      const id = Number(c["@_id"] ?? c.id) || 0;
      const idOrder = Number(c.id_order) || (await getOrderIdByCartId(id));
      const idCustomer = Number(c.id_customer) || 0;
      const guestId = Number(c.id_guest) || null;
      const dateAdd = textFromUnknown(c.date_add);
      const carrierId = c.id_carrier ? Number(c.id_carrier) : null;
      const customerInfo = await getCustomerInfoForCart(id, idCustomer, idOrder, guestId);

      return {
        id,
        id_order: idOrder,
        id_customer: customerInfo.idCustomer,
        customerName: customerInfo.customerName,
        total: 0,
        carrierId,
        date_add: dateAdd,
        online: Boolean(c.mobile_theme === "1" || c.mobile_theme === 1),
      } as CartListItem;
    }),
  );

  return typeof limit === "number" ? mapped.slice(0, limit) : mapped;
}

export function buildCartXml(form: CartCreate | CartImport) {
  const payload: any = { cart: { id_customer: form.id_customer } };
  if (form.id_address_delivery) payload.cart.id_address_delivery = form.id_address_delivery;
  if (form.id_address_invoice) payload.cart.id_address_invoice = form.id_address_invoice;
  if (form.id_currency) payload.cart.id_currency = form.id_currency;
  if (form.id_lang) payload.cart.id_lang = form.id_lang;
  if (form.id_carrier) payload.cart.id_carrier = form.id_carrier;
  payload.cart.id_shop = form.id_shop || 1;
  payload.cart.id_shop_group = form.id_shop_group || 1;
  if ((form as CartCreate).secure_key) payload.cart.secure_key = (form as CartCreate).secure_key;

  if ("items" in form && Array.isArray(form.items) && form.items.length > 0) {
    payload.cart.associations = {
      cart_rows: {
        cart_row: form.items.map((item) => ({
          id_product: item.id_product,
          id_product_attribute: item.id_product_attribute ?? 0,
          id_address_delivery: form.id_address_delivery ?? 0,
          id_customization: 0,
          quantity: item.quantity,
        })),
      },
    };
  }

  return buildPrestashopXml({ prestashop: payload });
}

export async function createCart(form: CartCreate | CartImport): Promise<number> {
  const xml = buildCartXml(form);
  const res = await requestPrestashopXml<{ prestashop: { cart: { id: unknown } } }>(`/carts`, {
    method: "POST",
    bodyXml: xml,
  });
  const id = Number(res?.prestashop?.cart?.id);
  if (!Number.isFinite(id) || id <= 0) throw new Error("Erreur création panier");
  return id;
}

export async function importCart(form: CartImport): Promise<number> {
  return createCart(form);
}

export async function deleteCart(id: number): Promise<void> {
  try {
    // Pré-vérification: si le panier est associé à une commande, ne pas tenter la suppression
    // (PrestaShop refuse avec erreur 88)
    const cartDetail = await getCart(id).catch(() => null);
    if (cartDetail?.id_order && cartDetail.id_order > 0) {
      console.log(`Panier #${id} lié à la commande #${cartDetail.id_order} — suppression ignorée`);
      return;
    }

    await requestPrestashopXml(`/carts/${id}`, { method: "DELETE" });
  } catch (err: any) {
    // Gestion gracieuse des erreurs de suppression (ex: code 88 Id(s) wasn't deleted)
    const msg = err?.responseText || err?.message || String(err);
    console.warn(`Impossible de supprimer le panier #${id} via l'API PrestaShop:`, msg);
    // Marquer localement pour nettoyage ultérieur
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const key = "erp_orphaned_deletes";
        const existing = JSON.parse(localStorage.getItem(key) || "[]");
        existing.push({ resource: "cart", id, message: msg, date: new Date().toISOString() });
        localStorage.setItem(key, JSON.stringify(existing));
      }
    } catch (storeErr) {
      console.warn("Echec enregistrement orphan delete:", storeErr);
    }

    // Ne pas remonter l'erreur vers l'UI (comportement de fallback)
    return;
  }
}

export async function initPanier(items: CartListItem[]): Promise<void> {
  const confirmed = window.confirm("Vous etes sur de supprimer tous les paniers ?");
  if (!confirmed) return;
  try {
    await Promise.all(items.map((entry) => deleteCart(entry.id)));
  } catch (e: any) {
    alert(e?.message ?? "Erreur lors de l'initialisation des paniers");
  }
}

export async function getLatestCartForCustomerId(customerId: number): Promise<CartDetail | null> {
  const cartIds = await listCartIdsByCustomerId(customerId);
  if (cartIds.length === 0) return null;

  // Le tri date_upd_DESC est demandé ci-dessus; on prend le premier
  const latestCartId = cartIds[0];
  return getCart(latestCartId);
}

export async function getOrCreateGuestCart(defaultLang = 1, defaultCurrency = 1): Promise<CartDetail | null> {
  const cookiePayload = getGuestCartCookiePayload();

  // Réutiliser le panier invité existant si encore valide
  if (cookiePayload?.id_cart && cookiePayload.id_cart > 0) {
    try {
      return await getCart(cookiePayload.id_cart);
    } catch {
      // panier expiré/supprimé: on le recrée ci-dessous
    }
  }

  const sessionToken = cookiePayload?.session || buildGuestSessionToken();
  const lang = cookiePayload?.langue || defaultLang;
  const currency = cookiePayload?.devise || defaultCurrency;

  const newCartId = await createCart({
    id_customer: 0,
    id_lang: lang,
    id_currency: currency,
    id_shop: 1,
    id_shop_group: 1,
  });

  saveGuestCartCookiePayload({
    id_cart: newCartId,
    id_guest: cookiePayload?.id_guest || 0,
    langue: lang,
    devise: currency,
    session: sessionToken,
  });

  return getCart(newCartId).catch(() => null);
}

async function resolveDefaultCustomerAddressId(customerId: number): Promise<number | undefined> {
  if (!customerId || customerId <= 0) return undefined;

  try {
    const response = await requestPrestashopXml<any>("/addresses", {
      query: {
        display: "[id,id_customer,deleted]",
        "filter[id_customer]": `[${customerId}]`,
      },
    });

    const rows = asArray<any>(response?.prestashop?.addresses?.address)
      .filter((row: any) => numFromUnknown(row?.id_customer) === customerId)
      .filter((row: any) => numFromUnknown(row?.deleted) !== 1)
      .map((row: any) => numFromUnknown(row?.id ?? row?.["@_id"]))
      .filter((id: number) => id > 0);

    if (rows.length > 0) return rows[0];
  } catch {
    // Ignorer: certaines permissions WS n'autorisent pas addresses.
  }

  return undefined;
}

export async function createCartForConnectedCustomer(customerId: number): Promise<number> {
  if (!Number.isFinite(customerId) || customerId <= 0) {
    throw new Error("Customer ID invalide pour création panier connecté");
  }

  const client = await getClient(customerId);
  const addressId = await resolveDefaultCustomerAddressId(customerId);

  // prefer cookie values for language/currency when present
  const cookie = getGuestCartCookiePayload();
  const lang = cookie?.langue || client.id_lang || 1;
  const currency = cookie?.devise || 1;

  const newCartId = await createCart({
    id_customer: customerId,
    id_lang: lang,
    id_currency: currency,
    secure_key: client.secure_key || undefined,
    id_address_delivery: addressId,
    id_address_invoice: addressId,
    id_shop: 1,
    id_shop_group: 1,
  });

  // If there was a guest cart found in cookies, merge its items into the new customer cart
  if (cookie?.id_cart && cookie.id_cart > 0) {
    try {
      const guestCart = await getCart(cookie.id_cart).catch(() => null);
      if (guestCart && Array.isArray(guestCart.items) && guestCart.items.length > 0) {
        for (const line of guestCart.items) {
          try {
            await addProductToCart({
              cartId: newCartId,
              customerId,
              id_product: line.product_id,
              id_product_attribute: line.id_product_attribute ?? 0,
              quantity: line.quantity || 0,
              idLang: lang,
              idCurrency: currency,
            });
          } catch (e) {
            // ignore single-line failures and continue
            console.warn("Impossible de merger une ligne du panier invité", e);
          }
        }
      }
    } catch (e) {
      console.warn("Erreur lors du merge du panier invité:", e);
    }

    // clear guest cookies after merge
    clearGuestCartCookie();
  }

  return newCartId;
}

function buildCartUpdateXml(cartId: number, customerId: number, items: Array<{ id_product: number; id_product_attribute?: number; quantity: number }>, idLang = 1, idCurrency = 1) {
  const payload: any = {
    prestashop: {
      cart: {
        id: cartId,
        id_customer: customerId,
        id_lang: idLang,
        id_currency: idCurrency,
        id_shop: 1,
        id_shop_group: 1,
        associations: {
          cart_rows: {
            cart_row: items.map((item) => ({
              id_product: item.id_product,
              id_product_attribute: item.id_product_attribute ?? 0,
              id_address_delivery: 0,
              id_customization: 0,
              quantity: item.quantity,
            })),
          },
        },
      },
    },
  };

  return buildPrestashopXml(payload);
}

export async function updateCartItems(
  cartId: number,
  customerId: number,
  items: Array<{ id_product: number; id_product_attribute?: number; quantity: number }>,
  idLang = 1,
  idCurrency = 1,
): Promise<void> {
  if (!items || items.length === 0) {
    await deleteCart(cartId);
    return;
  }

  const xml = buildCartUpdateXml(cartId, customerId, items, idLang, idCurrency);
  await requestPrestashopXml(`/carts/${cartId}`, { method: "PUT", bodyXml: xml });
}

export async function addProductToCart(params: {cartId: number;customerId: number;id_product: number;id_product_attribute?: number;quantity: number;idLang?: number;idCurrency?: number;}): Promise<CartDetail> {
  const currentCart = await getCart(params.cartId);
  const existingItems = currentCart.items.map((item) => ({
    id_product: item.product_id,
    id_product_attribute: item.id_product_attribute ?? 0,
    quantity: item.quantity,
  }));

  const targetAttributeId = params.id_product_attribute ?? 0;
  const existingIndex = existingItems.findIndex(
    (item) => item.id_product === params.id_product && (item.id_product_attribute ?? 0) === targetAttributeId,
  );

  if (existingIndex >= 0) {
    existingItems[existingIndex] = {
      ...existingItems[existingIndex],
      quantity: existingItems[existingIndex].quantity + params.quantity,
    };
  } else {
    existingItems.push({
      id_product: params.id_product,
      id_product_attribute: targetAttributeId,
      quantity: params.quantity,
    });
  }

  await updateCartItems(
    params.cartId,
    params.customerId,
    existingItems,
    params.idLang ?? 1,
    params.idCurrency ?? 1,
  );

  return getCart(params.cartId);
}