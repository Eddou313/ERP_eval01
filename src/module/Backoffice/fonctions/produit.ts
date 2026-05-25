import { getRealProductStock, resolveProductPriceWorkflow } from "../produit/api/productsApi";
import type { ProductGetResponse, ProductListItem } from "../produit/api/object";

export type ProductVariantKind = "standard" | "declinaison";

export type ProductDetailSummary = {
  id: number;
  name: string;
  reference: string;
  kind: ProductVariantKind;
  productId: number;
  combinationId: number;
  stockReal: number | null;
  priceHt: number;
  priceTtc: number;
  taxRate: number;
  combinationPriceImpact: number;
  reductionAmount: number;
};

type DeclinationProbe = {
  cache_default_attribute?: unknown;
  type?: unknown;
  name?: unknown;
  reference?: unknown;
};

// Détecte si un produit possède au moins une déclinaison active.
export function isProductWithDeclination(product: DeclinationProbe): boolean {
  const cacheDefaultAttribute = Number(product?.cache_default_attribute) || 0;
  const productType = String(product?.type ?? "").trim().toLowerCase();

  if (cacheDefaultAttribute > 0) {
    return true;
  }

  return productType === "combinations" || productType === "variant";
}

// Retourne une étiquette métier simple: standard ou déclinaison.
export function getProductVariantKind(product: DeclinationProbe): ProductVariantKind {
  return isProductWithDeclination(product as any) ? "declinaison" : "standard";
}

// Vérifie si le produit est un produit standard sans déclinaison.
export function isStandardProduct(product: DeclinationProbe): boolean {
  return getProductVariantKind(product) === "standard";
}

// Construit un libellé lisible pour l'interface à partir du nom et de la référence.
export function getProductDisplayLabel(product: DeclinationProbe, fallback = "Produit"): string {
  const name = String(product?.name ?? "").trim();
  const reference = String(product?.reference ?? "").trim();

  if (name && reference) return `${name} (${reference})`;
  if (name) return name;
  if (reference) return `${fallback} ${reference}`;
  return fallback;
}

// Décrit le type de produit pour les écrans de stock et de vente.
export function getProductVariantLabel(product: DeclinationProbe): string {
  return isProductWithDeclination(product) ? "Produit avec déclinaison" : "Produit standard";
}

// Retourne un résumé rapide du prix HT/TTC d'un produit.
export function formatProductPriceSummary(priceHt: number, priceTtc: number): string {
  const ht = Number.isFinite(priceHt) ? priceHt.toFixed(2) : "0.00";
  const ttc = Number.isFinite(priceTtc) ? priceTtc.toFixed(2) : "0.00";
  return `HT: ${ht} | TTC: ${ttc}`;
}

// Regroupe les données utiles d'un produit pour une fiche détail.
export async function buildProductDetailSummary(
  product: ProductListItem | ProductGetResponse["prestashop"]["product"],
  productId: number,
  combinationId = 0,
): Promise<ProductDetailSummary> {
  const pricing = await resolveProductPriceWorkflow(product as any, productId, combinationId || undefined);
  const stockReal = await getRealProductStock(product as any, productId, pricing.defaultCombinationId);

  return {
    id: Number((product as any)?.id) || productId,
    name: String((product as any)?.name ?? "").trim(),
    reference: String((product as any)?.reference ?? "").trim(),
    kind: pricing.defaultCombinationId > 0 ? "declinaison" : "standard",
    productId,
    combinationId: pricing.defaultCombinationId || 0,
    stockReal,
    priceHt: pricing.priceHt,
    priceTtc: pricing.finalPrice,
    taxRate: pricing.taxRate,
    combinationPriceImpact: pricing.combinationPriceImpact,
    reductionAmount: pricing.reductionAmount,
  };
}
