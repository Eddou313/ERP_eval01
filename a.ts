import type { colonneCSV } from "./colonne";
import { buildPrestashopXml, requestPrestashopXml } from "../../utils/prestashopClient";
import { updateStockWithMovement } from "./stock";
import { findProductByReference } from "./produit";
import { getCombinationId } from "./attribut";
import { addProductsToCart } from "./addProductsToCart";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export type Commande = colonneCSV["Commande_client_produit"];

export type ProduitAchat = {
  reference: string;
  quantite: number;
  karazany: string;
};

// ✅ Utiliser le type de retour de findProductByReference directement
// évite l'erreur "ProductLight introuvable"
type ProductCache = Map<string, Awaited<ReturnType<typeof findProductByReference>>>;

type EtatCommande = "panier" | "paiement accepté" | "livré" | "annulé";

const ETAT_TO_ORDER_STATE: Record<string, number> = {
  "paiement accepté": 2,
  "livré":            5,
  "annulé":           6,
};

// ─────────────────────────────────────────────
// IMPORT PRINCIPAL
// ─────────────────────────────────────────────

export async function importProduitCommandeCsv(
  rows: Commande[]
): Promise<{
  customersCreated: number;
  cartsCreated: number;
  ordersCreated: number;
  failed: number;
}> {
  rows = regrouperCommandes(rows);

  const productsCache: ProductCache = new Map();

  let customersCreated = 0;
  let cartsCreated     = 0;
  let ordersCreated    = 0;
  let failed           = 0;

  for (const cmd of rows) {
    try {
      const produits = parseAchat(cmd.achat);
      const etat     = normaliserEtat(cmd.etat);

      // ── 1. Créer ou récupérer le client ──
      const customerId = await getOrCreateCustomer(cmd);
      if (!customerId) throw new Error(`Impossible de créer le client "${cmd.email}"`);
      customersCreated++;

      // ── 2. Créer le panier ──
      const cartId = await createCart(customerId, cmd.adresse);
      if (!cartId) throw new Error(`Impossible de créer le panier`);
      cartsCreated++;

      // ── 3. Ajouter TOUS les produits en un seul PUT ──
      await addProductsToCart(cartId, produits, cmd.date);

      // ── 4. Etat vide → panier uniquement ──
      if (etat === "panier") continue;

      // ── 5. Créer la commande depuis le panier ──
      const orderId = await createOrderFromCart(
        cartId,
        customerId,
        ETAT_TO_ORDER_STATE[etat] ?? 2,
        cmd.date
      );
      if (!orderId) throw new Error(`Impossible de créer la commande`);
      ordersCreated++;

      // ── 6. Gérer le stock selon l'état ──
      if (etat === "paiement accepté" || etat === "livré") {
        await deduireStockPourCommande(produits, productsCache);
      }
      // "annulé" → aucune action stock

    } catch (err: any) {
      console.error(`[commande] Erreur pour ${cmd.email}:`, err?.message);
      failed++;
    }
  }

  return { customersCreated, cartsCreated, ordersCreated, failed };
}

// ─────────────────────────────────────────────
// 1. CLIENT
// ─────────────────────────────────────────────

async function getOrCreateCustomer(cmd: Commande): Promise<number> {
  const res = await requestPrestashopXml<any>("/customers", {
    query: {
      display: "[id,email]",
      "filter[email]": `[${cmd.email}]`,
      limit: "1",
    },
  });

  const existing = res?.prestashop?.customers?.customer;
  if (existing) {
    const list = Array.isArray(existing) ? existing : [existing];
    if (list[0]?.id) return Number(list[0].id);
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
  return newId;
}

// ─────────────────────────────────────────────
// 2. ADRESSE
// ─────────────────────────────────────────────

async function getOrCreateAddress(customerId: number, adresseText: string): Promise<number> {
  const res = await requestPrestashopXml<any>("/addresses", {
    query: {
      display: "[id,id_customer]",
      "filter[id_customer]": `[${customerId}]`,
      limit: "1",
    },
  });

  const existing = res?.prestashop?.addresses?.address;
  if (existing) {
    const list = Array.isArray(existing) ? existing : [existing];
    if (list[0]?.id) return Number(list[0].id);
  }

  const created = await requestPrestashopXml<any>("/addresses", {
    method: "POST",
    bodyXml: buildPrestashopXml({
      prestashop: {
        address: {
          id_customer: customerId,
          id_country:  64,
          id_state:    0,
          alias:       "Principale",
          lastname:    "Client",
          firstname:   "Client",
          address1:    adresseText,
          address2:    "",
          postcode:    "000",
          city:        adresseText,
          phone:       "",
          active:      1,
          deleted:     0,
        },
      },
    }),
  });

  const newId = Number(created?.prestashop?.address?.id);
  if (!newId) throw new Error(`Création adresse échouée`);
  return newId;
}

// ─────────────────────────────────────────────
// 3. PANIER
// ─────────────────────────────────────────────

async function createCart(customerId: number, adresse: string): Promise<number> {
  const adresseId = await getOrCreateAddress(customerId, adresse);

  const created = await requestPrestashopXml<any>("/carts", {
    method: "POST",
    bodyXml: buildPrestashopXml({
      prestashop: {
        cart: {
          id_currency:             1,
          id_lang:                 1,
          id_customer:             customerId,
          id_carrier:              0,
          id_address_delivery:     adresseId,
          id_address_invoice:      adresseId,
          recyclable:              0,
          gift:                    0,
          gift_message:            "",
          mobile_theme:            0,
          delivery_option:         "",
          secure_key:              generateSecureKey(),
          allow_seperated_package: 0,
          associations: { cart_rows: [] },
        },
      },
    }),
  });

  const cartId = Number(created?.prestashop?.cart?.id);
  if (!cartId) throw new Error(`Création panier échouée`);
  return cartId;
}

// ─────────────────────────────────────────────
// 4. COMMANDE
// ─────────────────────────────────────────────

async function createOrderFromCart(
  cartId: number,
  customerId: number,
  orderStateId: number,
  dateStr: string
): Promise<number> {
  const [day, month, year] = dateStr.split("/");
  const dateAdd = `${year}-${month}-${day} 00:00:00`;

  const created = await requestPrestashopXml<any>("/orders", {
    method: "POST",
    bodyXml: buildPrestashopXml({
      prestashop: {
        order: {
          id_address_delivery:      0,
          id_address_invoice:       0,
          id_cart:                  cartId,
          id_currency:              1,
          id_lang:                  1,
          id_customer:              customerId,
          id_carrier:               0,
          id_order_state:           orderStateId,
          module:                   "ps_checkpayment",
          payment:                  "Import CSV",
          recyclable:               0,
          gift:                     0,
          gift_message:             "",
          mobile_theme:             0,
          total_discounts:          0,
          total_discounts_tax_incl: 0,
          total_discounts_tax_excl: 0,
          total_paid:               0,
          total_paid_tax_incl:      0,
          total_paid_tax_excl:      0,
          total_paid_real:          0,
          total_products:           0,
          total_products_wt:        0,
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
          date_add:                 dateAdd,
          date_upd:                 dateAdd,
          current_state:            orderStateId,
          associations: { order_rows: [] },
        },
      },
    }),
  });

  const orderId = Number(created?.prestashop?.order?.id);
  if (!orderId) throw new Error(`Création commande échouée depuis panier ${cartId}`);
  return orderId;
}

// ─────────────────────────────────────────────
// 5. DÉDUCTION STOCK
// ─────────────────────────────────────────────

async function deduireStockPourCommande(
  produits: ProduitAchat[],
  productsCache: ProductCache
): Promise<void> {
  for (const produit of produits) {
    const productReel = await findProductByReference(produit.reference, productsCache);
    if (!productReel) {
      console.warn(`[stock] Produit introuvable pour déduction : ${produit.reference}`);
      continue;
    }

    const productId = Number(productReel.id);
    const combinationId =
      produit.karazany.trim() !== ""
        ? await getCombinationId(productId, produit.karazany)
        : 0;

    await updateStockWithMovement(productId, produit.quantite, combinationId, -1);

    console.log(
      `[stock] Déduction — ${produit.reference}${produit.karazany ? `(${produit.karazany})` : ""} : -${produit.quantite}`
    );
  }
}

// ─────────────────────────────────────────────
// UTILITAIRES
// ─────────────────────────────────────────────

function normaliserEtat(etat: string): EtatCommande {
  const e = etat?.trim().toLowerCase();
  if (!e) return "panier";
  if (e.includes("paiement")) return "paiement accepté";
  if (e.includes("livr"))     return "livré";
  if (e.includes("annul"))    return "annulé";
  return "panier";
}

function generateSecureKey(): string {
  return Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
}

export function parseAchat(achat: string): ProduitAchat[] {
  if (!achat) return [];
  const regex = /\("([^"]*)"\s*;\s*(\d+)\s*;\s*"([^"]*)"\)/g;
  const produits: ProduitAchat[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(achat)) !== null) {
    produits.push({
      reference: match[1],
      quantite:  Number(match[2]),
      karazany:  match[3],
    });
  }
  return produits;
}

// ─────────────────────────────────────────────
// REGROUPEMENT
// ─────────────────────────────────────────────

export function regrouperCommandes(commandes: Commande[]): Commande[] {
  const map = new Map<string, Commande & { produits: ProduitAchat[] }>();

  for (const cmd of commandes) {
    const key = [cmd.date, cmd.nom, cmd.email, cmd.pwd, cmd.adresse, cmd.etat].join("|");
    const produits = parseAchat(cmd.achat);

    if (!map.has(key)) {
      map.set(key, { ...cmd, produits: [...produits] });
      continue;
    }

    const existing = map.get(key)!;
    for (const produit of produits) {
      const exist = existing.produits.find(
        (p) => p.reference === produit.reference && p.karazany === produit.karazany
      );
      if (exist) {
        exist.quantite += produit.quantite;
      } else {
        existing.produits.push({ ...produit });
      }
    }
  }

  return Array.from(map.values()).map((cmd) => ({
    date:    cmd.date,
    nom:     cmd.nom,
    email:   cmd.email,
    pwd:     cmd.pwd,
    adresse: cmd.adresse,
    etat:    cmd.etat,
    achat:   buildAchat(cmd.produits),
  }));
}

function buildAchat(produits: ProduitAchat[]): string {
  return (
    "[" +
    produits.map((p) => `("${p.reference}";${p.quantite};"${p.karazany}")`).join(",") +
    "]"
  );
}