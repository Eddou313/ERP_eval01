import { listProductsLight } from "../../module/Backoffice/produit/api/productsApi";
import { getProductAttributeGroups } from "../../module/Backoffice/attribue&Caracteristique/api/attributsCaracteristiquesApi";
import { normalizeText } from "../../utils/helper";
import type { colonneCSV } from "./object";
import { getClient, importClient } from "../../module/Backoffice/client/api/clientApi";
import { createClientAddress } from "../../module/Backoffice/client/api/clientAdresAPI";
import { createCart } from "../../module/Backoffice/panier/api/panierApi";
import { createOrder, updateOrderState } from "../../module/Backoffice/commande/api/commandesApi";
import { getAllModeLivraison } from "../../module/Backoffice/Livraison/api/LivraisonApi";
import { buildPrestashopXml, requestPrestashopXml } from "../../utils/prestashopClient";
import { asArray } from "../../utils/helper";
import { toPrestashopDate } from "./utils";
import { getStateId } from "../../module/Backoffice/commande/api/ObjetEtat";
import { regrouperCommandes } from "./RegroupeCommande";

export type OrderImportRow = colonneCSV["Commande_client_produit"];

type AchatItem = { reference: string; quantity: number; variant: string };
type PreparedOrderRow = {
    productId: number;
    productAttributeId: number;
    quantity: number;
    reference: string;
    variant: string;
};
type ProductLight = Awaited<ReturnType<typeof listProductsLight>>[number];
type ImportProgress = {
    processed: number;
    total: number;
    imported: number;
    failed: number;
    current?: string;
};

function resolveOrderStateId(etat: string): number {
    const value = String(etat ?? "").trim().toLowerCase();
    if (!value || value.includes("panier")) {
        return 0;
    }

    if (value.includes("attente")) return 1;
    if (value.includes("paiement") && value.includes("accept")) return 2;
    if (value.includes("prepar") || value.includes("prépar")) return 3;
    if (value.includes("expedi") || value.includes("expédi")) return 4;
    if (value.includes("livr")) return 5;
    if (value.includes("annul")) return 6;
    if (value.includes("rembours")) return 7;
    if (value.includes("retour")) return 8;

    return 2;
}

function normalizeProductReference(value: string): string {
    return normalizeText(String(value ?? "").trim());
}

function compactReference(value: string): string {
    return normalizeProductReference(value).replace(/[^a-z0-9]/g, "");
}

function normalizeSupplierReference(value: string): string {
    return normalizeText(String(value ?? "").trim()).replace(/[^a-z0-9]/g, "");
}

function buildCombinationReferenceCandidates(reference: string, variant: string): string[] {
    const baseReference = String(reference ?? "").trim();
    const variantText = String(variant ?? "").trim();
    if (!baseReference || !variantText) {
        return [];
    }

    return Array.from(
        new Set(
            [
                `${baseReference}${variantText}`,
                `${baseReference} ${variantText}`,
                `${baseReference}-${variantText}`,
                `${baseReference}_${variantText}`,
            ]
                .map((candidate) => normalizeSupplierReference(candidate))
                .filter(Boolean),
        ),
    );
}

/**
 * Parse le format "achat" : [("REF";qty;"variant"),("REF2";qty2;"")]
 * Retourne un tableau d'articles {reference, quantity, variant}
 */
export function parseAchatString(achatStr: string): AchatItem[] {
    if (!achatStr || !achatStr.trim()) return [];

    const trimmed = achatStr.trim();
    if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) return [];

    const content = trimmed.slice(1, -1);
    const itemPattern = /\("([^"]*)";\s*(\d+);\s*"([^"]*)"\)/g;
    const items: AchatItem[] = [];
    let match;

    while ((match = itemPattern.exec(content)) !== null) {
        items.push({
            reference: match[1],
            quantity: Number(match[2]) || 0,
            variant: match[3] || "",
        });
    }

    return items;
}

export function stringifyAchatItems(items: AchatItem[]): string {
    if (!items || items.length === 0) return "[]";

    // On transforme chaque objet en sa représentation textuelle '("REF";QTE;"VAR")'
    const itemsFormatted = items.map(item => {
        const reference = item.reference || "";
        const quantity = item.quantity || 0;
        const variant = item.variant || "";

        return `("${reference}";${quantity};"${variant}")`;
    });

    // On joint tous les éléments avec une virgule et on entoure de crochets
    return `[${itemsFormatted.join(",")}]`;
}

/**
 * Parse le nom complet en firstname/lastname
 */
export function parseCustomerName(fullName: string): { firstname: string; lastname: string } {
    const trimmed = (fullName || "").trim();
    if (!trimmed) return { firstname: "", lastname: "" };

    const parts = trimmed.split(/\s+/);
    if (parts.length === 0) return { firstname: "", lastname: "" };
    if (parts.length === 1) return { firstname: parts[0], lastname: "" };

    return {
        firstname: parts[0],
        lastname: parts.slice(1).join(" "),
    };
}

async function findProductByReference(reference: string, cache: Map<string, ProductLight | null>): Promise<ProductLight | null> {
    const normalizedReference = normalizeProductReference(reference);
    if (!normalizedReference) {
        return null;
    }

    if (cache.has(normalizedReference)) {
        return cache.get(normalizedReference) ?? null;
    }

    const products = await listProductsLight();
    const compactTarget = compactReference(reference);
    const match =
        products.find((product) => {
            const productReference = normalizeProductReference(product.reference ?? "");
            return productReference === normalizedReference || compactReference(productReference) === compactTarget;
        }) ?? null;

    if (match) {
        cache.set(normalizedReference, match);
        return match;
    }

    try {
        const response = await requestPrestashopXml<any>("/products", {
            query: {
                display: "full",
                "filter[reference]": `[${reference}]`,
            },
        });

        const productsRaw = response?.prestashop?.products?.product;
        const apiCandidates = Array.isArray(productsRaw) ? productsRaw : productsRaw ? [productsRaw] : [];
        const apiMatch = apiCandidates.find((product: any) => compactReference(String(product?.reference ?? product?.name ?? "")) === compactTarget) ?? null;

        if (apiMatch) {
            const product = (await listProductsLight()).find((item) => item.id === Number(apiMatch?.id ?? apiMatch?.["@_id"])) ?? null;
            if (product) {
                cache.set(normalizedReference, product);
                return product;
            }
        }
    } catch {
        // fallback below
    }

    cache.set(normalizedReference, match);
    return match;
}

async function findCombinationIdBySupplierReference(productId: number, reference: string, variant: string): Promise<number> {
    const targetCandidates = buildCombinationReferenceCandidates(reference, variant);
    if (targetCandidates.length === 0) {
        return 0;
    }

    try {
        const attrGroups = await getProductAttributeGroups(productId);
        const combinations = Array.from(
            new Map(attrGroups.flatMap((group) => group.combinations ?? []).map((combination) => [combination.id, combination])).values(),
        );

        const match = combinations.find((combination: any) => {
            const combinationReference = normalizeSupplierReference(combination?.reference ?? "");
            const supplierReference = normalizeSupplierReference(combination?.supplier_reference ?? "");
            if (!combinationReference && !supplierReference) {
                return false;
            }

            return targetCandidates.some((candidate: string) => candidate === combinationReference || candidate === supplierReference);
        });

        return Number(match?.id) || 0;
    } catch {
        return 0;
    }
}

async function findCustomerIdByEmail(email: string): Promise<number | null> {
    const trimmedEmail = String(email ?? "").trim();
    if (!trimmedEmail) {
        return null;
    }

    try {
        const search = await requestPrestashopXml<any>("/customers", {
            query: {
                display: "[id]",
                "filter[email]": `[${trimmedEmail}]`,
            },
        });

        const first = asArray(search?.prestashop?.customers?.customer ?? [])[0];
        const existingId = Number(first?.["@_id"] ?? first?.id);
        if (Number.isFinite(existingId) && existingId > 0) {
            return existingId;
        }
    } catch {
        // Ignore lookup failure and fallback to creation flow.
    }

    return null;
}

export async function importProduitCommandeCsv(rows: OrderImportRow[], options?: { onProgress?: (progress: ImportProgress) => void }): Promise<{ customersCreated: number; cartsCreated: number; ordersCreated: number; failed: number }> {
    rows = regrouperCommandes(rows);
    console.log("commande final : ",rows);

    const productsCache = new Map<string, ProductLight | null>();
    const carriers = await getAllModeLivraison().catch(() => []);
    const defaultCarrierId = carriers[0]?.id || 1;

    let customersCreated = 0;
    let cartsCreated = 0;
    let ordersCreated = 0;
    let failed = 0;
    let processed = 0;

    const reportProgress = (current?: string) => {
        options?.onProgress?.({ processed, total: rows.length, imported: ordersCreated, failed, current });
    };

    reportProgress("Préparation");

    for (const row of rows) {
        try {
            const { firstname, lastname } = parseCustomerName(row.nom);
            if (!firstname || !row.email || !row.pwd) {
                throw new Error("Données client insuffisantes (nom, email, pwd requis)");
            }

            const achatItems = parseAchatString(row.achat);
            if (achatItems.length === 0) {
                throw new Error("Achat vide ou invalide dans le CSV commande");
            }

            const resolvedRows: PreparedOrderRow[] = [];
            for (const achatItem of achatItems) {
                const product = await findProductByReference(achatItem.reference, productsCache);
                if (!product) {
                    console.warn(`Produit introuvable: ${achatItem.reference}, ignoré`);
                    continue;
                }

                const quantity = Math.max(0, Number(achatItem.quantity) || 0);
                if (!quantity) {
                    continue;
                }

                const productAttributeId = achatItem.variant
                    ? await findCombinationIdBySupplierReference(product.id, achatItem.reference, achatItem.variant)
                    : 0;

                if (achatItem.variant && !productAttributeId) {
                    console.warn(
                        `Combinaison introuvable via supplier_reference pour ${achatItem.reference} + ${achatItem.variant} (produit #${product.id})`,
                    );
                }

                resolvedRows.push({
                    productId: product.id,
                    productAttributeId,
                    quantity,
                    reference: achatItem.reference,
                    variant: achatItem.variant,
                });
            }

            if (resolvedRows.length === 0) {
                throw new Error("Aucune ligne valide à importer pour la commande");
            }

            const customerDateAdd = String(row.date ?? "").trim();
            const normalizedCustomerDate = customerDateAdd ? toPrestashopDate(customerDateAdd) : "";
            console.log(`Date client: "${customerDateAdd}" → "${normalizedCustomerDate}"`);
            if (customerDateAdd && !normalizedCustomerDate) {
                throw new Error(`Date client invalide: ${customerDateAdd}`);
            }

            let customerId = await findCustomerIdByEmail(row.email);
            if (!customerId) {
                customerId = await importClient({
                    firstname,
                    lastname: lastname || ".",
                    email: row.email,
                    passwd: row.pwd,
                    active: 1,
                    newsletter: 0,
                    optin: 0,
                    birthday: "",
                    website: "",
                    note: "",
                    is_guest: 0,
                    deleted: 0,
                    ...(normalizedCustomerDate ? { date_add: normalizedCustomerDate } : {}),
                });
                customersCreated += 1;
            }

            const customer = await getClient(customerId).catch(() => null);
            const customerSecureKey = customer?.secure_key || "";

            const addressParts = (row.adresse || "").split(/,|\n/);
            const addressLine1 = addressParts[0]?.trim() || "Adresse non spécifiée";
            const addressPostal = addressParts[1]?.trim() || "00000";
            const addressCity = addressParts[2]?.trim() || "Ville";

            const addressId = await createClientAddress(customerId, {
                firstname,
                lastname: lastname || ".",
                address1: addressLine1,
                postcode: addressPostal,
                city: addressCity,
                id_country: 8,
            });

            const cart = await createCart({
                id_customer: customerId,
                id_lang: 1,
                id_currency: 1,
                id_shop: 1,
                id_shop_group: 1,
                secure_key: customerSecureKey,
                id_address_delivery: addressId,
                id_address_invoice: addressId,
                id_carrier: defaultCarrierId,
                ...(normalizedCustomerDate ? { date_add: normalizedCustomerDate, date_upd: normalizedCustomerDate } : {}),
                items: resolvedRows.map((line) => ({
                    id_product: line.productId,
                    id_product_attribute: line.productAttributeId,
                    quantity: line.quantity,
                })),
            });
            const cartSecureKey = cart.secureKey || customerSecureKey;

            if (normalizedCustomerDate) {
                const dateTime = `${normalizedCustomerDate} 00:00:00`;
                try {
                    const cartXml = buildPrestashopXml({
                        prestashop: {
                            cart: {
                                id: cart.id,
                                id_customer: customerId,
                                id_lang: 1,
                                id_currency: 1,
                                id_shop: 1,
                                id_shop_group: 1,
                                secure_key: cartSecureKey,
                                id_address_delivery: addressId,
                                id_address_invoice: addressId,
                                id_carrier: defaultCarrierId,
                                date_add: dateTime,
                                date_upd: dateTime,
                            },
                        },
                    });
                    await requestPrestashopXml(`/carts/${cart.id}`, { method: "PUT", bodyXml: cartXml });
                } catch (error) {
                    console.warn(`Impossible de forcer la date du panier ${cart.id}:`, error);
                }
            }
            cartsCreated += 1;

            const etatLower = (row.etat || "").toLowerCase().trim();
            const isCartOnly = !etatLower || etatLower === "dans le panier" || etatLower.includes("panier");
            const orderStateId = resolveOrderStateId(etatLower);

            if (isCartOnly) {
                continue;
            }

            const orderId = await createOrder({
                id_customer: customerId,
                id_cart: cart.id,
                id_address_delivery: addressId,
                id_address_invoice: addressId,
                id_currency: 1,
                id_lang: 1,
                id_carrier: defaultCarrierId,
                secure_key: cartSecureKey,
                payment_code: "bankwire",
                module: "ps_wirepayment",
                payment: "Virement bancaire",
                current_state: orderStateId || 2,
                conversion_rate: 1,
            } as any);
            ordersCreated += 1;
            const dateTime = `${normalizedCustomerDate} 00:00:00`;

            if (normalizedCustomerDate) {
                const dateTime = `${normalizedCustomerDate} 00:00:00`;
                try {
                    const orderXml = buildPrestashopXml({
                        prestashop: {
                            order: {
                                id: orderId,
                                id_customer: customerId,
                                id_cart: cart.id,
                                id_address_delivery: addressId,
                                id_address_invoice: addressId,
                                id_currency: 1,
                                id_lang: 1,
                                id_carrier: defaultCarrierId,
                                secure_key: cartSecureKey,
                                payment_code: "bankwire",
                                module: "ps_wirepayment",
                                payment: "Virement bancaire",
                                current_state: orderStateId || 2,
                                date_add: dateTime,
                                date_upd: dateTime,
                                total_paid : 0,
                                total_paid_real : 0,
                                total_products : 0,
                                total_products_wt : 0,
                                conversion_rate : 1,
                            },
                        },
                    });
                    await requestPrestashopXml(`/orders/${orderId}`, { method: "PUT", bodyXml: orderXml });
                } catch (error) {
                    console.warn(`Impossible de forcer la date de la commande ${orderId}:`, error);
                }
            }

            const finalStateId = getStateId(etatLower) || orderStateId;
            if (finalStateId) {
                await updateOrderState(orderId, finalStateId, dateTime);
            }

            reportProgress(`Commande ${orderId}`);
        } catch (error: any) {
            failed += 1;
            console.error("Erreur lors de l'import du CSV commande:", row, error);
            console.log("--- Détails de l'erreur brute PrestaShop ---");
            console.log("Message :", error?.message);
            console.log("Statut :", error?.status || error?.statusCode);
            if (error?.responseText) {
                console.error("ResponseText trouvé :", error.responseText);
            } else if (error?.response?.data) {
                console.error("Données de réponse trouvées :", error.response.data);
            }
            console.log("--------------------------------------------");
        } finally {
            processed += 1;
            reportProgress(row.email || row.nom || "Ligne commande");
        }
    }

    reportProgress("Terminé");

    return { customersCreated, cartsCreated, ordersCreated, failed };
}