import { getProduct, getProductAttributes, getProductDetail, getProductsByCategory, getRealProductStock, resolveProductPriceWorkflow } from "../produit/api/productsApi";
import { listStockItems, listStockMovements } from "../stock/api/stockApi";
import { buildStockSummaryLabel } from "./stock";
import type { ProductAttribute, ProductGetResponse, ProductListItem } from "../produit/api/object";
import type { StockItem, StockMovement } from "../stock/api/object";

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

export type ProductStockBundle = ProductDetailSummary & {
  product: ProductListItem | ProductGetResponse["prestashop"]["product"];
  stock: StockItem | null;
  stockReal: number | null;
  stockMovements: StockMovement[];
  combinations: ProductAttribute[];
  stockSummary: string;
  combinationCount: number;
  movementCount: number;
};

export type ProductCombinationStockBundle = ProductStockBundle & {
  combination: ProductAttribute;
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

function findStockItemForProduct(items: StockItem[], productId: number, combinationId = 0): StockItem | null {
  if (!Array.isArray(items) || productId <= 0) {
    return null;
  }

  const exactMatch = items.find((item) => item.id_product === productId && item.id_product_attribute === combinationId);
  if (exactMatch) {
    return exactMatch;
  }

  if (combinationId > 0) {
    return items.find((item) => item.id_product === productId && item.id_product_attribute === 0) ?? null;
  }

  return items.find((item) => item.id_product === productId && item.id_product_attribute === 0)
    ?? items.find((item) => item.id_product === productId)
    ?? null;
}

async function buildProductStockBundle(
  productId: number,
  combinationId = 0,
  options: {
    includeDetail?: boolean;
    includeStockDetail?: boolean;
    includeMovements?: boolean;
    includeCombinations?: boolean;
  } = {},
): Promise<ProductStockBundle | null> {
  if (!Number.isFinite(productId) || productId <= 0) {
    return null;
  }

  const product = options.includeDetail ? await getProductDetail(productId) : await getProduct(productId);
  const resolvedCombinationId = Number(combinationId || product.default_combination_id || 0);

  const stockPromise = options.includeStockDetail ? listStockItems() : Promise.resolve([] as StockItem[]);
  const movementsPromise = options.includeMovements ? listStockMovements() : Promise.resolve([] as StockMovement[]);
  const combinationsPromise = options.includeCombinations ? getProductAttributes(productId) : Promise.resolve([] as ProductAttribute[]);

  const [stockItems, stockMovements, combinations] = await Promise.all([stockPromise, movementsPromise, combinationsPromise]);
  const stock = options.includeStockDetail ? findStockItemForProduct(stockItems, productId, resolvedCombinationId) : null;
  const stockReal = await getRealProductStock(product as any, productId, resolvedCombinationId || undefined);
  const filteredMovements = stockMovements.filter((movement) => movement.id_product === productId);
  const stockSummary = stock ? buildStockSummaryLabel(stock) : "";

  return {
    id: Number((product as any)?.id) || productId,
    name: String((product as any)?.name ?? "").trim(),
    reference: String((product as any)?.reference ?? "").trim(),
    kind: resolvedCombinationId > 0 ? "declinaison" : "standard",
    productId,
    combinationId: resolvedCombinationId,
    stockReal,
    priceHt: Number((product as any)?.price_ht ?? (product as any)?.price ?? 0) || 0,
    priceTtc: Number((product as any)?.final_price ?? (product as any)?.price ?? 0) || 0,
    taxRate: Number((product as any)?.tax_rate ?? 0) || 0,
    combinationPriceImpact: Number((product as any)?.combination_price_impact ?? 0) || 0,
    reductionAmount: Number((product as any)?.reduction_amount ?? 0) || 0,
    product: product as ProductListItem | ProductGetResponse["prestashop"]["product"],
    stock,
    stockMovements: filteredMovements,
    combinations,
    stockSummary,
    combinationCount: combinations.length,
    movementCount: filteredMovements.length,
  };
}

// Retourne un produit enrichi avec son stock courant.
export async function getStockProduit(productId: number, combinationId = 0): Promise<ProductStockBundle | null> {
  return buildProductStockBundle(productId, combinationId, {
    includeStockDetail: true,
  });
}

// Alias tolérant à la faute de frappe demandée.
export async function getTockProduit(productId: number, combinationId = 0): Promise<ProductStockBundle | null> {
  return getStockProduit(productId, combinationId);
}

// Retourne un produit enrichi avec les détails de stock et le résumé de fiche.
export async function getDetailStock(productId: number, combinationId = 0): Promise<ProductStockBundle | null> {
  return buildProductStockBundle(productId, combinationId, {
    includeDetail: true,
    includeStockDetail: true,
    includeMovements: true,
    includeCombinations: true,
  });
}

// Retourne un produit enrichi avec sa quantité réelle calculée.
export async function getStockReelProduit(productId: number, combinationId = 0): Promise<ProductStockBundle | null> {
  return buildProductStockBundle(productId, combinationId, {
    includeStockDetail: true,
  });
}

// Retourne un produit enrichi avec son historique de mouvements de stock.
export async function getMOuvemnetStock(productId: number, combinationId = 0): Promise<ProductStockBundle | null> {
  return buildProductStockBundle(productId, combinationId, {
    includeStockDetail: true,
    includeMovements: true,
  });
}

// Alias orthographiquement normalisé.
export async function getMouvementStock(productId: number, combinationId = 0): Promise<ProductStockBundle | null> {
  return getMOuvemnetStock(productId, combinationId);
}

// Retourne toutes les combinaisons d'un produit dans un objet produit unifié.
export async function getAllCombinaisonProduit(productId: number): Promise<ProductStockBundle | null> {
  return buildProductStockBundle(productId, 0, {
    includeStockDetail: true,
    includeCombinations: true,
  });
}

// Alias court demandé dans la demande métier.
export async function getAllCombinaison(productId: number): Promise<ProductStockBundle | null> {
  return getAllCombinaisonProduit(productId);
}

// Retourne une ligne enrichie pour chaque combinaison d'un produit.
export async function getProduitAvecCombinaison(productId: number): Promise<ProductCombinationStockBundle[]> {
  if (!Number.isFinite(productId) || productId <= 0) {
    return [];
  }

  const product = await getProduct(productId);
  const combinations = await getProductAttributes(productId);

  if (combinations.length === 0) {
    const baseBundle = await buildProductStockBundle(productId, product.default_combination_id ?? 0, {
      includeStockDetail: true,
      includeMovements: false,
      includeCombinations: true,
    });

    return baseBundle
      ? [{ ...baseBundle, combination: { id_product_attribute: 0, id_product: productId, reference: product.reference ?? "", quantity: product.quantity ?? 0 } }]
      : [];
  }

  const bundles = await Promise.all(
    combinations.map(async (combination) => {
      const combinationId = Number(combination.id_product_attribute ?? 0) || 0;
      const bundle = await buildProductStockBundle(productId, combinationId, {
        includeDetail: true,
        includeStockDetail: true,
        includeMovements: false,
        includeCombinations: true,
      });

      if (!bundle) {
        return null;
      }

      return {
        ...bundle,
        combination,
      };
    }),
  );

  return bundles.filter((bundle): bundle is ProductCombinationStockBundle => bundle !== null);
}

// Alias explicite pour les écrans qui affichent les déclinaisons produit.
export async function getProduitCombinations(productId: number): Promise<ProductCombinationStockBundle[]> {
  return getProduitAvecCombinaison(productId);
}

// Retourne le stock de tous les produits d'une catégorie sous forme d'objets produit enrichis.
export async function getStockParCategory(categoryId: number): Promise<ProductStockBundle[]> {
  if (!Number.isFinite(categoryId) || categoryId <= 0) {
    return [];
  }

  const products = await getProductsByCategory(categoryId);
  const bundles = await Promise.all(products.map(async (product) => buildProductStockBundle(product.id, product.default_combination_id ?? 0, {
    includeStockDetail: true,
    includeMovements: false,
    includeCombinations: true,
  })));

  return bundles.filter((bundle): bundle is ProductStockBundle => bundle !== null);
}

// Alias FR/compatibilité.
export async function getStockParCategorie(categoryId: number): Promise<ProductStockBundle[]> {
  return getStockParCategory(categoryId);
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
