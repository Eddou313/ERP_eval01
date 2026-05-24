import { getOrder } from "../../module/Backoffice/commande/api/commandesApi";
import { textFromUnknown, validateUnsignedId } from "../../utils/helper";
import { getAllModeLivraison } from "../../module/Backoffice/Livraison/api/LivraisonApi";
import { buildPrestashopXml, requestPrestashopXml } from "../../utils/prestashopClient";
import { generateSecureKey, type Commande } from "./importCSV3";

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

// ─────────────────────────────────────────────
// CALCUL TOTAUX DEPUIS LE PANIER
// ─────────────────────────────────────────────

async function computeCartTotals(cartId: number): Promise<{
  total_products:    number;
  total_products_wt: number;
  total_paid:        number;
  total_paid_real:   number;
}> {
  try {
    const res = await requestPrestashopXml<any>(`/carts/${cartId}`, {
      query: { display: "full" },
    });

    const rows = res?.prestashop?.cart?.associations?.cart_rows?.cart_row;
    if (!rows) return { total_products: 1, total_products_wt: 1, total_paid: 1, total_paid_real: 0 };

    const list = Array.isArray(rows) ? rows : [rows];
    let totalHt  = 0;
    let totalTtc = 0;

    for (const row of list) {
      const productId     = Number(row.id_product);
      const combinationId = Number(row.id_product_attribute) || 0;
      const qty           = Number(row.quantity) || 1;

      const prodRes = await requestPrestashopXml<any>(`/products/${productId}`, {
        query: { display: "[price,tax_rate]" },
      });
      const product  = prodRes?.prestashop?.product;
      const priceHt  = Number(product?.price) || 0;
      const taxRate  = Number(product?.tax_rate) || 20;

      let impactHt = 0;
      if (combinationId > 0) {
        const combRes = await requestPrestashopXml<any>(`/combinations/${combinationId}`, {
          query: { display: "[price]" },
        });
        impactHt = Number(combRes?.prestashop?.combination?.price) || 0;
      }

      const unitHt  = priceHt + impactHt;
      const unitTtc = unitHt * (1 + taxRate / 100);

      totalHt  += unitHt  * qty;
      totalTtc += unitTtc * qty;
    }

    const totalHtR  = Math.round(totalHt  * 100) / 100 || 1;
    const totalTtcR = Math.round(totalTtc * 100) / 100 || 1;

    return {
      total_products:    totalHtR,
      total_products_wt: totalTtcR,
      total_paid:        totalTtcR,
      total_paid_real:   0,
    };
  } catch {
    return { total_products: 1, total_products_wt: 1, total_paid: 1, total_paid_real: 0 };
  }
}

// ─────────────────────────────────────────────
// CRÉATION COMMANDE DIRECTE
// ─────────────────────────────────────────────

async function createOrderDirect(params: {
  id_customer:         number;
  id_cart:             number;
  id_address_delivery: number;
  id_address_invoice:  number;
  id_currency:         number;
  id_lang:             number;
  id_shop:             number;
  id_carrier:          number;
  secure_key:          string;
  orderStateId:        number;
  dateTime:            string;
}): Promise<number> {
  const totals = await computeCartTotals(params.id_cart);

  const created = await requestPrestashopXml<any>("/orders", {
    method: "POST",
    bodyXml: buildPrestashopXml({
      prestashop: {
        order: {
          id_address_delivery:      params.id_address_delivery,
          id_address_invoice:       params.id_address_invoice,
          id_cart:                  params.id_cart,
          id_currency:              params.id_currency,
          id_lang:                  params.id_lang,
          id_customer:              params.id_customer,
          id_carrier:               params.id_carrier,
          id_shop:                  params.id_shop,
          secure_key:               params.secure_key,
          module:                   "ps_cashondelivery",
          payment:                  "Paiement à la livraison",
          recyclable:               0,
          gift:                     0,
          gift_message:             "",
          mobile_theme:             0,
          total_discounts:          0,
          total_discounts_tax_incl: 0,
          total_discounts_tax_excl: 0,
          total_paid:               totals.total_paid,          // ✅ > 0
          total_paid_tax_incl:      totals.total_paid,
          total_paid_tax_excl:      totals.total_products,
          total_paid_real:          totals.total_paid_real,
          total_products:           totals.total_products,      // ✅ > 0
          total_products_wt:        totals.total_products_wt,   // ✅ > 0
          total_shipping:           0,
          total_shipping_tax_incl:  0,
          total_shipping_tax_excl:  0,
          total_wrapping:           0,
          total_wrapping_tax_incl:  0,
          total_wrapping_tax_excl:  0,
          round_mode:               2,
          round_type:               1,
          conversion_rate:          1,
          reference:                `IMP-${Date.now()}`,
          current_state:            params.orderStateId,
          date_add:                 params.dateTime,
          date_upd:                 params.dateTime,
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
// CLIENT
// ─────────────────────────────────────────────

export async function getOrCreateCustomer(
  cmd: Commande
): Promise<{ id: number; secureKey: string }> {
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
        id:        Number(list[0].id),
        secureKey: list[0].secure_key || generateSecureKey(),
      };
    }
  }

  const [prenom, ...restNom] = cmd.nom.trim().split(" ");
  const nom = restNom.join(" ") || prenom;

  const created = await requestPrestashopXml<any>("/customers", {
    method: "POST",
    bodyXml: buildPrestashopXml({
      prestashop: {
        customer: {
          firstname:        prenom,
          lastname:         nom,
          email:            cmd.email,
          passwd:           cmd.pwd,
          id_default_group: 3,
          active:           1,
          deleted:          0,
        },
      },
    }),
  });

  const newId = Number(created?.prestashop?.customer?.id);
  if (!newId) throw new Error(`Création client échouée pour ${cmd.email}`);

  return {
    id:        newId,
    secureKey: created?.prestashop?.customer?.secure_key || generateSecureKey(),
  };
}

// ─────────────────────────────────────────────
// COMMANDE DEPUIS PANIER
// ─────────────────────────────────────────────

export async function createOrderFromCart(
  cartId: number,
  customer: { id: number; secureKey: string },
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

  const secureKey    = customer.secureKey || cart.secure_key || generateSecureKey();
  const addrDelivery = Number(cart.id_address_delivery) || Number(fallbackAddressId) || 0;
  const addrInvoice  = Number(cart.id_address_invoice)  || addrDelivery;
  const carrierId    = await resolveCarrierId(cart.id_carrier);

  if (!addrDelivery) throw new Error(`Adresse de livraison manquante pour le panier ${cartId}`);

  // ── 1. Créer la commande ──
  const orderId = await createOrderDirect({
    id_customer:         customer.id,
    id_cart:             cartId,
    id_address_delivery: addrDelivery,
    id_address_invoice:  addrInvoice,
    id_currency:         1,
    id_lang:             1,
    id_shop:             1,
    id_carrier:          carrierId,
    secure_key:          secureKey,
    orderStateId:        orderStateId || 2,
    dateTime,
  });

  if (!orderId) throw new Error(`Création commande échouée depuis panier ${cartId}`);

  // ── 2. Forcer la date via PUT ──
  try {
    const order = await getOrder(orderId);
    await requestPrestashopXml(`/orders/${orderId}`, {
      method: "PUT",
      bodyXml: buildPrestashopXml({
        prestashop: {
          order: {
            id:                  orderId,
            id_customer:         customer.id,
            id_cart:             cartId,
            id_address_delivery: addrDelivery,
            id_address_invoice:  addrInvoice,
            id_currency:         1,
            id_lang:             1,
            id_carrier:          carrierId,
            id_shop:             1,
            secure_key:          secureKey,
            module:              "ps_cashondelivery",
            payment:             "Paiement à la livraison",
            current_state:       orderStateId || 2,
            date_add:            dateTime,
            date_upd:            dateTime,
            conversion_rate:     1,
            total_paid:          order.total_paid          || 0,
            total_paid_real:     order.total_paid_real     || 0,
            total_products:      order.total_products      || 0,
            total_products_wt:   order.total_products_wt   || 0,
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
// MISE À JOUR ÉTAT
// ─────────────────────────────────────────────

export async function updateOrderState(
  id: number,
  newState: number,
  date: string
): Promise<void> {
  try {
    const order = await getOrder(id);
    if (Number(order.current_state) === 5) {
      alert("Une commande déjà livrée ne peut être modifiée");
      return;
    }
  } catch {
    // Commande non trouvée → on continue
  }

  if (!validateUnsignedId(id))       throw new Error(`ID commande invalide: ${id}`);
  if (!validateUnsignedId(newState)) throw new Error(`État invalide: ${newState}`);

  const xml = buildPrestashopXml({
    prestashop: {
      order_state_update: {
        id_order:       id,
        id_order_state: newState,
        date_add:       date,
      },
    },
  });

  const response = await requestPrestashopXml<any>("/order_state_update", {
    method: "POST",
    bodyXml: xml,
  });

  const responseData =
    response?.prestashop?.response                                ||
    response?.prestashop?.order_state_update                      ||
    response?.prestashop?.order_state_updates?.order_state_update ||
    null;

  const successValue = responseData?.success;
  const success =
    successValue === undefined ||
    successValue === null      ||
    successValue === "true"    ||
    successValue === true      ||
    responseData?.id_order       === id       ||
    responseData?.id_order_state === newState;

  if (!success) {
    throw new Error(
      `Erreur module shiporder: ${textFromUnknown(responseData?.message) || "Réponse invalide"}`
    );
  }

  console.log(`✓ État commande #${id} → ${newState}`);
}


















// import type { colonneCSV } from "./colonne";
// import { buildPrestashopXml, requestPrestashopXml } from "../../utils/prestashopClient";
// import { updateStockWithMovement } from "./stock";
// import { findProductByReference } from "./produit";
// import { getCombinationId } from "./attribut";
// import { addProductsToCart } from "./addProductsToCart";

// // ─────────────────────────────────────────────
// // TYPES
// // ─────────────────────────────────────────────

// export type Commande = colonneCSV["Commande_client_produit"];

// export type ProduitAchat = {
//   reference: string;
//   quantite: number;
//   karazany: string;
// };

// // ✅ Utiliser le type de retour de findProductByReference directement
// // évite l'erreur "ProductLight introuvable"
// type ProductCache = Map<string, Awaited<ReturnType<typeof findProductByReference>>>;

// type EtatCommande = "panier" | "paiement accepté" | "livré" | "annulé";

// const ETAT_TO_ORDER_STATE: Record<string, number> = {
//   "paiement accepté": 2,
//   "livré":            5,
//   "annulé":           6,
// };

// // ─────────────────────────────────────────────
// // IMPORT PRINCIPAL
// // ─────────────────────────────────────────────

// export async function importProduitCommandeCsv(
//   rows: Commande[]
// ): Promise<{
//   customersCreated: number;
//   cartsCreated: number;
//   ordersCreated: number;
//   failed: number;
// }> {
//   rows = regrouperCommandes(rows);

//   const productsCache: ProductCache = new Map();

//   let customersCreated = 0;
//   let cartsCreated     = 0;
//   let ordersCreated    = 0;
//   let failed           = 0;

//   for (const cmd of rows) {
//     try {
//       const produits = parseAchat(cmd.achat);
//       const etat     = normaliserEtat(cmd.etat);

//       // ── 1. Créer ou récupérer le client ──
//       const customerId = await getOrCreateCustomer(cmd);
//       if (!customerId) throw new Error(`Impossible de créer le client "${cmd.email}"`);
//       customersCreated++;

//       // ── 2. Créer le panier ──
//       const cartId = await createCart(customerId, cmd.adresse);
//       if (!cartId) throw new Error(`Impossible de créer le panier`);
//       cartsCreated++;

//       // ── 3. Ajouter TOUS les produits en un seul PUT ──
//       await addProductsToCart(cartId, produits, cmd.date);

//       // ── 4. Etat vide → panier uniquement ──
//       if (etat === "panier") continue;

//       // ── 5. Créer la commande depuis le panier ──
//       const orderId = await createOrderFromCart(
//         cartId,
//         customerId,
//         ETAT_TO_ORDER_STATE[etat] ?? 2,
//         cmd.date
//       );
//       if (!orderId) throw new Error(`Impossible de créer la commande`);
//       ordersCreated++;

//       // ── 6. Gérer le stock selon l'état ──
//       if (etat === "paiement accepté" || etat === "livré") {
//         await deduireStockPourCommande(produits, productsCache);
//       }
//       // "annulé" → aucune action stock

//     } catch (err: any) {
//       console.error(`[commande] Erreur pour ${cmd.email}:`, err?.message);
//       failed++;
//     }
//   }

//   return { customersCreated, cartsCreated, ordersCreated, failed };
// }

// // ─────────────────────────────────────────────
// // 1. CLIENT
// // ─────────────────────────────────────────────

// async function getOrCreateCustomer(cmd: Commande): Promise<number> {
//   const res = await requestPrestashopXml<any>("/customers", {
//     query: {
//       display: "[id,email]",
//       "filter[email]": `[${cmd.email}]`,
//       limit: "1",
//     },
//   });

//   const existing = res?.prestashop?.customers?.customer;
//   if (existing) {
//     const list = Array.isArray(existing) ? existing : [existing];
//     if (list[0]?.id) return Number(list[0].id);
//   }

//   const [prenom, ...restNom] = cmd.nom.trim().split(" ");
//   const nom = restNom.join(" ") || prenom;

//   const created = await requestPrestashopXml<any>("/customers", {
//     method: "POST",
//     bodyXml: buildPrestashopXml({
//       prestashop: {
//         customer: {
//           firstname:        prenom,
//           lastname:         nom,
//           email:            cmd.email,
//           passwd:           cmd.pwd,
//           id_default_group: 3,
//           active:           1,
//           deleted:          0,
//         },
//       },
//     }),
//   });

//   const newId = Number(created?.prestashop?.customer?.id);
//   if (!newId) throw new Error(`Création client échouée pour ${cmd.email}`);
//   return newId;
// }

// // ─────────────────────────────────────────────
// // 2. ADRESSE
// // ─────────────────────────────────────────────

// async function getOrCreateAddress(customerId: number, adresseText: string): Promise<number> {
//   const res = await requestPrestashopXml<any>("/addresses", {
//     query: {
//       display: "[id,id_customer]",
//       "filter[id_customer]": `[${customerId}]`,
//       limit: "1",
//     },
//   });

//   const existing = res?.prestashop?.addresses?.address;
//   if (existing) {
//     const list = Array.isArray(existing) ? existing : [existing];
//     if (list[0]?.id) return Number(list[0].id);
//   }

//   const created = await requestPrestashopXml<any>("/addresses", {
//     method: "POST",
//     bodyXml: buildPrestashopXml({
//       prestashop: {
//         address: {
//           id_customer: customerId,
//           id_country:  64,
//           id_state:    0,
//           alias:       "Principale",
//           lastname:    "Client",
//           firstname:   "Client",
//           address1:    adresseText,
//           address2:    "",
//           postcode:    "000",
//           city:        adresseText,
//           phone:       "",
//           active:      1,
//           deleted:     0,
//         },
//       },
//     }),
//   });

//   const newId = Number(created?.prestashop?.address?.id);
//   if (!newId) throw new Error(`Création adresse échouée`);
//   return newId;
// }

// // ─────────────────────────────────────────────
// // 3. PANIER
// // ─────────────────────────────────────────────

// async function createCart(customerId: number, adresse: string): Promise<number> {
//   const adresseId = await getOrCreateAddress(customerId, adresse);

//   const created = await requestPrestashopXml<any>("/carts", {
//     method: "POST",
//     bodyXml: buildPrestashopXml({
//       prestashop: {
//         cart: {
//           id_currency:             1,
//           id_lang:                 1,
//           id_customer:             customerId,
//           id_carrier:              0,
//           id_address_delivery:     adresseId,
//           id_address_invoice:      adresseId,
//           recyclable:              0,
//           gift:                    0,
//           gift_message:            "",
//           mobile_theme:            0,
//           delivery_option:         "",
//           secure_key:              generateSecureKey(),
//           allow_seperated_package: 0,
//           associations: { cart_rows: [] },
//         },
//       },
//     }),
//   });

//   const cartId = Number(created?.prestashop?.cart?.id);
//   if (!cartId) throw new Error(`Création panier échouée`);
//   return cartId;
// }

// // ─────────────────────────────────────────────
// // 4. COMMANDE
// // ─────────────────────────────────────────────

// async function createOrderFromCart(
//   cartId: number,
//   customerId: number,
//   orderStateId: number,
//   dateStr: string
// ): Promise<number> {
//   const [day, month, year] = dateStr.split("/");
//   const dateAdd = `${year}-${month}-${day} 00:00:00`;

//   const created = await requestPrestashopXml<any>("/orders", {
//     method: "POST",
//     bodyXml: buildPrestashopXml({
//       prestashop: {
//         order: {
//           id_address_delivery:      0,
//           id_address_invoice:       0,
//           id_cart:                  cartId,
//           id_currency:              1,
//           id_lang:                  1,
//           id_customer:              customerId,
//           id_carrier:               0,
//           id_order_state:           orderStateId,
//           module:                   "ps_checkpayment",
//           payment:                  "Import CSV",
//           recyclable:               0,
//           gift:                     0,
//           gift_message:             "",
//           mobile_theme:             0,
//           total_discounts:          0,
//           total_discounts_tax_incl: 0,
//           total_discounts_tax_excl: 0,
//           total_paid:               0,
//           total_paid_tax_incl:      0,
//           total_paid_tax_excl:      0,
//           total_paid_real:          0,
//           total_products:           0,
//           total_products_wt:        0,
//           total_shipping:           0,
//           total_shipping_tax_incl:  0,
//           total_shipping_tax_excl:  0,
//           total_wrapping:           0,
//           total_wrapping_tax_incl:  0,
//           total_wrapping_tax_excl:  0,
//           round_mode:               2,
//           round_type:               1,
//           conversion_rate:          1,
//           reference:                `IMP-${Date.now()}`,
//           date_add:                 dateAdd,
//           date_upd:                 dateAdd,
//           current_state:            orderStateId,
//           associations: { order_rows: [] },
//         },
//       },
//     }),
//   });

//   const orderId = Number(created?.prestashop?.order?.id);
//   if (!orderId) throw new Error(`Création commande échouée depuis panier ${cartId}`);
//   return orderId;
// }

// // ─────────────────────────────────────────────
// // 5. DÉDUCTION STOCK
// // ─────────────────────────────────────────────

// async function deduireStockPourCommande(
//   produits: ProduitAchat[],
//   productsCache: ProductCache
// ): Promise<void> {
//   for (const produit of produits) {
//     const productReel = await findProductByReference(produit.reference, productsCache);
//     if (!productReel) {
//       console.warn(`[stock] Produit introuvable pour déduction : ${produit.reference}`);
//       continue;
//     }

//     const productId = Number(productReel.id);
//     const combinationId =
//       produit.karazany.trim() !== ""
//         ? await getCombinationId(productId, produit.karazany)
//         : 0;

//     await updateStockWithMovement(productId, produit.quantite, combinationId, -1);

//     console.log(
//       `[stock] Déduction — ${produit.reference}${produit.karazany ? `(${produit.karazany})` : ""} : -${produit.quantite}`
//     );
//   }
// }

// // ─────────────────────────────────────────────
// // UTILITAIRES
// // ─────────────────────────────────────────────

// function normaliserEtat(etat: string): EtatCommande {
//   const e = etat?.trim().toLowerCase();
//   if (!e) return "panier";
//   if (e.includes("paiement")) return "paiement accepté";
//   if (e.includes("livr"))     return "livré";
//   if (e.includes("annul"))    return "annulé";
//   return "panier";
// }

// function generateSecureKey(): string {
//   return Array.from({ length: 32 }, () =>
//     Math.floor(Math.random() * 16).toString(16)
//   ).join("");
// }

// export function parseAchat(achat: string): ProduitAchat[] {
//   if (!achat) return [];
//   const regex = /\("([^"]*)"\s*;\s*(\d+)\s*;\s*"([^"]*)"\)/g;
//   const produits: ProduitAchat[] = [];
//   let match: RegExpExecArray | null;
//   while ((match = regex.exec(achat)) !== null) {
//     produits.push({
//       reference: match[1],
//       quantite:  Number(match[2]),
//       karazany:  match[3],
//     });
//   }
//   return produits;
// }

// // ─────────────────────────────────────────────
// // REGROUPEMENT
// // ─────────────────────────────────────────────

// export function regrouperCommandes(commandes: Commande[]): Commande[] {
//   const map = new Map<string, Commande & { produits: ProduitAchat[] }>();

//   for (const cmd of commandes) {
//     const key = [cmd.date, cmd.nom, cmd.email, cmd.pwd, cmd.adresse, cmd.etat].join("|");
//     const produits = parseAchat(cmd.achat);

//     if (!map.has(key)) {
//       map.set(key, { ...cmd, produits: [...produits] });
//       continue;
//     }

//     const existing = map.get(key)!;
//     for (const produit of produits) {
//       const exist = existing.produits.find(
//         (p) => p.reference === produit.reference && p.karazany === produit.karazany
//       );
//       if (exist) {
//         exist.quantite += produit.quantite;
//       } else {
//         existing.produits.push({ ...produit });
//       }
//     }
//   }

//   return Array.from(map.values()).map((cmd) => ({
//     date:    cmd.date,
//     nom:     cmd.nom,
//     email:   cmd.email,
//     pwd:     cmd.pwd,
//     adresse: cmd.adresse,
//     etat:    cmd.etat,
//     achat:   buildAchat(cmd.produits),
//   }));
// }

// function buildAchat(produits: ProduitAchat[]): string {
//   return (
//     "[" +
//     produits.map((p) => `("${p.reference}";${p.quantite};"${p.karazany}")`).join(",") +
//     "]"
//   );
// }