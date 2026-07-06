import { numFromUnknown, textFromUnknown } from "../../../utils/helper";
import { requestPrestashopXml } from "../../../utils/prestashopClient";
import type { StockItem } from "../stock/api/object";

export type ReservedProductSummary = {
  productId: number;
  combinationId: number;
  reservedQuantity: number;
};

// Normalise la quantité réservée d'une ligne de stock.
export function getReservedQuantityForStockItem(item: Pick<StockItem, "reservedQuantity">): number {
  return Math.max(0, Number(item.reservedQuantity) || 0);
}

// Calcule la quantité encore disponible après réservation.
export function getAvailableQuantityAfterReservation(item: Pick<StockItem, "availableQuantity" | "reservedQuantity">): number {
  return Math.max(0, (Number(item.availableQuantity) || 0) - getReservedQuantityForStockItem(item));
}

// Retourne le libellé métier d'un statut de stock.
export function getStockStatusLabel(status: StockItem["status"]): string {
  if (status === "in_stock") return "En stock";
  if (status === "low_stock") return "Stock faible";
  return "Rupture";
}

// Indique si une ligne de stock est déjà critique.
export function isStockCritical(item: Pick<StockItem, "status">): boolean {
  return item.status === "low_stock" || item.status === "out_of_stock";
}

// Construit un pourcentage de disponibilité pour l'affichage des tableaux.
export function getStockAvailabilityRate(item: Pick<StockItem, "physicalQuantity" | "availableQuantity">): number {
  const physical = Number(item.physicalQuantity) || 0;
  if (physical <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, ((Number(item.availableQuantity) || 0) / physical) * 100));
}

// Résume une ligne de stock avec son état, sa quantité réservée et sa disponibilité.
export function buildStockSummaryLabel(item: Pick<StockItem, "status" | "reservedQuantity" | "availableQuantity">): string {
  return `${getStockStatusLabel(item.status)} | Réservé: ${getReservedQuantityForStockItem(item)} | Disponible: ${getAvailableQuantityAfterReservation(item)}`;
}

// Récupère le total réservé sur un produit précis.
export async function getReservedQuantityByProductId(productId: number): Promise<number> {
  if (!Number.isFinite(productId) || productId <= 0) {
    return 0;
  }

  try {
    const response = await requestPrestashopXml<any>("/stock_availables", {
      query: {
        display: "[reserved_quantity]",
        "filter[id_product]": `[${productId}]`,
      },
    });

    const entries = response?.prestashop?.stock_availables?.stock_available;
    if (!entries) return 0;

    const items = Array.isArray(entries) ? entries : [entries];
    return items.reduce((sum: number, entry: any) => sum + (numFromUnknown(entry?.reserved_quantity) || 0), 0);
  } catch {
    return 0;
  }
}

// Récupère le total réservé sur une déclinaison donnée.
export async function getReservedQuantityByCombinationId(productId: number, combinationId: number): Promise<number> {
  if (!Number.isFinite(productId) || productId <= 0 || !Number.isFinite(combinationId) || combinationId <= 0) {
    return 0;
  }

  try {
    const response = await requestPrestashopXml<any>("/stock_availables", {
      query: {
        display: "[reserved_quantity,id_product_attribute]",
        "filter[id_product]": `[${productId}]`,
        "filter[id_product_attribute]": `[${combinationId}]`,
      },
    });

    const entry = Array.isArray(response?.prestashop?.stock_availables?.stock_available)
      ? response.prestashop.stock_availables.stock_available[0]
      : response?.prestashop?.stock_availables?.stock_available;

    return numFromUnknown(entry?.reserved_quantity) || 0;
  } catch {
    return 0;
  }
}

// Retourne le total des réservations tous produits confondus.
export async function getTotalReservedProducts(): Promise<number> {
  try {
    const response = await requestPrestashopXml<any>("/stock_availables", {
      query: { display: "[reserved_quantity]", limit: "999" },
    });

    const items = response?.prestashop?.stock_availables?.stock_available;
    if (!items) return 0;

    const list = Array.isArray(items) ? items : [items];
    return list.reduce((sum: number, item: any) => sum + (numFromUnknown(item?.reserved_quantity) || 0), 0);
  } catch {
    return 0;
  }
}

// Retourne le détail des réservations pour préparer des tableaux de synthèse.
export async function getReservedProductsBreakdown(): Promise<ReservedProductSummary[]> {
  try {
    const response = await requestPrestashopXml<any>("/stock_availables", {
      query: { display: "[id_product,id_product_attribute,reserved_quantity]", limit: "999" },
    });

    const items = response?.prestashop?.stock_availables?.stock_available;
    if (!items) return [];

    const list = Array.isArray(items) ? items : [items];
    return list
      .map((item: any) => ({
        productId: numFromUnknown(item?.id_product),
        combinationId: numFromUnknown(item?.id_product_attribute),
        reservedQuantity: numFromUnknown(item?.reserved_quantity),
      }))
      .filter((item: ReservedProductSummary) => item.productId > 0 && item.reservedQuantity > 0);
  } catch {
    return [];
  }
}

// Construit un libellé stock lisible pour les écrans backoffice.
export function formatStockLabel(productName: string, combinationLabel?: string, reference?: string): string {
  const baseName = String(productName ?? "").trim() || "Produit";
  const combo = String(combinationLabel ?? "").trim();
  const ref = String(reference ?? "").trim();

  if (combo && ref) return `${baseName} - ${combo} (${ref})`;
  if (combo) return `${baseName} - ${combo}`;
  if (ref) return `${baseName} (${ref})`;
  return baseName;
}

// Nettoie un texte provenant de PrestaShop avant affichage.
export function normalizeProductText(value: unknown): string {
  return textFromUnknown(value).trim();
}
