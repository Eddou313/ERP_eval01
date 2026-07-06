import { buildPrestashopXml, requestPrestashopXml } from "../../../../utils/prestashopClient";
import { asArray, boolFromPrestashop, getFirstLanguageText, keywordsFromPrestashop, numFromPrestashop, slugify, stringFromPrestashop, textFromUnknown } from "../../../../utils/helper";
import type { CategoryGetResponse, CategoryGroup, CategoryListItem } from "./object";
import { getProductAttributes, getProductsByCategory } from "../../produit/api/productsApi";
import { applyStockModification, applyStockModificationAugmentation } from "../../stock/api/stockMovementService";
import type { ProductListItem } from "../../produit/api/object";
import { getStockByProductId } from "../../stock/api/stockApi";

const DEFAULT_LANGUAGE_ID = 1;
const ROOT_CATEGORY_ID = 2;

type CreatedCategory = {
  id: number;
  name: string;
};

// Export local helpers for backward compatibility with pages
export const localboolFromPrestashop = boolFromPrestashop;
export const localnumFromPrestashop = numFromPrestashop;
export const localstringFromPrestashop = stringFromPrestashop;
export const localkeywordsFromPrestashop = keywordsFromPrestashop;


// --- CRUD FUNCTIONS ---

export async function listCategoryIds(): Promise<number[]> {
  const json = await requestPrestashopXml<any>("/categories", {
    query: { display: "[id]" },
  });

  const categoriesRaw = json?.prestashop?.categories?.category;
  if (!categoriesRaw) return [];

  return asArray(categoriesRaw)
    .map((c: any) => Number(c["@_id"] || c.id))
    .filter((id) => !isNaN(id) && Number.isFinite(id));
}

export async function getCategory(id: number): Promise<CategoryListItem & { link_rewrite?: string }> {
  const json = await requestPrestashopXml<CategoryGetResponse>(`/categories/${id}`);
  const c = json.prestashop.category;

  return {
    id: numFromPrestashop(c.id),
    id_parent: numFromPrestashop(c.id_parent),
    active: boolFromPrestashop(c.active),
    id_shop_default: numFromPrestashop(c.id_shop_default),
    is_root_category: boolFromPrestashop(c.is_root_category),
    level_depth: numFromPrestashop(c.level_depth),
    nleft: numFromPrestashop(c.nleft),
    nright: numFromPrestashop(c.nright),
    name: getFirstLanguageText(c.name),
    link_rewrite: getFirstLanguageText(c.link_rewrite),
    description: getFirstLanguageText(c.description),
    meta_title: getFirstLanguageText(c.meta_title),
    meta_description: getFirstLanguageText(c.meta_description),
    meta_keywords: keywordsFromPrestashop(c.meta_keywords),
    position: numFromPrestashop(c.position),
    date_add: stringFromPrestashop(c.date_add),
    date_upd: stringFromPrestashop(c.date_upd),
    nb_products: numFromPrestashop(c.nb_products_recursive),
  };
}

export async function listCategoriesLight(limit?: number): Promise<CategoryListItem[]> {
  const ids = await listCategoryIds();
  const slice = typeof limit === "number" ? ids.slice(0, limit) : ids;

  const results = await Promise.all(slice.map((id) => getCategory(id)));
  return results;
}

export async function listCategoriesSimple(): Promise<CreatedCategory[]> {
  try {
    const categories = await listCategoriesLight();
    return categories
      .map((category) => ({
        id: category.id,
        name: category.name ?? "",
      }))
      .filter((category) => category.id > 0);
  } catch {
    return [];
  }
}

export async function createCategory(name: string, parentId = ROOT_CATEGORY_ID): Promise<number> {
  const response = await requestPrestashopXml<{ prestashop: { category: { id: unknown } } }>("/categories", {
    method: "POST",
    bodyXml: buildPrestashopXml({
      prestashop: {
        category: {
          id_parent: parentId,
          active: 1,
          id_shop_default: 1,
          name: {
            language: {
              "@_id": DEFAULT_LANGUAGE_ID,
              "#text": name,
            },
          },
          link_rewrite: {
            language: {
              "@_id": DEFAULT_LANGUAGE_ID,
              "#text": slugify(name),
            },
          },
          description: {
            language: {
              "@_id": DEFAULT_LANGUAGE_ID,
              "#text": name,
            },
          },
          meta_title: {
            language: {
              "@_id": DEFAULT_LANGUAGE_ID,
              "#text": name,
            },
          },
          meta_description: {
            language: {
              "@_id": DEFAULT_LANGUAGE_ID,
              "#text": name,
            },
          },
        },
      },
    }),
  });

  const createdId = Number(response?.prestashop?.category?.id);
  if (!Number.isFinite(createdId) || createdId <= 0) {
    throw new Error(`Impossible de créer la catégorie ${name}`);
  }

  return createdId;
}

export async function ensureCategoryExists(
  categoryName: string,
  cache: Map<string, number>,
  categories: CreatedCategory[],
): Promise<number> {
  const normalizedName = textFromUnknown(categoryName).trim();
  if (!normalizedName) {
    throw new Error("Le nom de catégorie est vide");
  }

  const cacheKey = normalizedName.toLowerCase();
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  let category = categories.find((item) => item.name.trim().toLowerCase() === cacheKey);
  if (!category) {
    const categoryId = await createCategory(normalizedName);
    category = { id: categoryId, name: normalizedName };
    categories.push(category);
  }

  cache.set(cacheKey, category.id);
  return category.id;
}

export function groupCategoriesByParent(categories: CategoryListItem[]): CategoryGroup[] {
  const nameById = new Map(categories.map((category) => [category.id, category.name ?? `Catégorie ${category.id}`]));
  const grouped = new Map<number, CategoryListItem[]>();

  for (const category of categories) {
    const parentId = category.id_parent ?? 0;
    const current = grouped.get(parentId) ?? [];
    current.push(category);
    grouped.set(parentId, current);
  }

  return Array.from(grouped.entries())
    .sort(([left], [right]) => left - right)
    .map(([parentId, items]) => ({
      parentId,
      parentLabel: parentId === 0 ? "Racine" : nameById.get(parentId) ?? `Parent #${parentId}`,
      categories: items.sort((left, right) => {
        const positionDiff = (left.position ?? 0) - (right.position ?? 0);
        if (positionDiff !== 0) return positionDiff;
        return (left.name ?? "").localeCompare(right.name ?? "");
      }),
    }));
}
export async function deleteCategory(id: number): Promise<void> {
  await requestPrestashopXml(`/categories/${id}`, {
    method: "DELETE",
  });
}

export async function InitCategory(): Promise<void> {
  // const confirmed = window.confirm("Vous etes sur de supprimer tous les categories ?");
  // if (!confirmed) return;

  const data = await listCategoriesLight();
  // Sort by nright in descending order to delete children before parents
  const sortedData = [...data].sort((a, b) => (b.nright ?? 0) - (a.nright ?? 0));

  for (const donner of sortedData) {
    if (donner.id > 2) {
      try {
        await deleteCategory(donner.id);
      } catch (error) {
        console.error(`Erreur lors de la suppression de la catégorie ${donner.id}:`, error);
      }
    }
  }
  console.log("Toutes les catégories ont été supprimées.");
}

export type StockReductionLine = {
  productId: number;
  productName: string;
  reference: string;
  quantityBefore: number;
  requestedReduction: number;
  appliedReduction: number;
  quantityAfter: number;
  success: boolean;
  message?: string;
};

export type StockReductionSummary = {
  categoryId: number;
  requestedReduction: number;
  totalBefore: number;
  totalApplied: number;
  totalAfter: number;
  remainingRequested: number;
  lines: StockReductionLine[];
};

function normalizeStockQuantity(value: unknown): number {
  const quantity = Number(value);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return 0;
  }

  return Math.floor(quantity);
}

type StockTarget = {
  productId: number;
  combinationId: number;
  productName: string;
  reference: string;
  quantityBefore: number;
};

async function buildCategoryStockTargets(product: ProductListItem): Promise<StockTarget[]> {
  const productName = product.name ?? `Produit ${product.id}`;
  const productReference = product.reference ?? "";
  const targets: StockTarget[] = [];

  const parentQuantity = await getStockByProductId(product.id);
  targets.push({
    productId: product.id,
    combinationId: 0,
    productName,
    reference: productReference,
    quantityBefore: normalizeStockQuantity(parentQuantity ?? product.quantity ?? 0),
  });

  const combinations = await getProductAttributes(product.id);
  for (const combination of combinations) {
    const combinationId = Number(combination.id_product_attribute ?? 0) || 0;
    if (combinationId <= 0) {
      continue;
    }

    targets.push({
      productId: product.id,
      combinationId,
      productName: `${productName} (combinaison ${combinationId})`,
      reference: combination.reference ?? productReference,
      quantityBefore: normalizeStockQuantity(combination.quantity ?? 0),
    });
  }

  return targets;
}

async function processCategoryStockOperation(
  idCategory: number,
  number: number,
  mode: "reduction" | "augmentation",
  limite = 0,
): Promise<StockReductionSummary> {
  const requestedReduction = Math.floor(Number(number) || 0);
  if (!Number.isFinite(idCategory) || idCategory <= 0) {
    throw new Error("Catégorie invalide");
  }
  if (!Number.isFinite(requestedReduction) || requestedReduction <= 0) {
    throw new Error("La valeur de réduction doit être supérieure à 0");
  }

  const effectiveLimit = limite > 0 ? limite : 30;
  const allProductMemeCategory = await getProductsByCategory(idCategory);
  const lines: StockReductionLine[] = [];
  let totalBefore = 0;
  let totalApplied = 0;

  for (const product of allProductMemeCategory) {
    const targets = await buildCategoryStockTargets(product);

    for (const target of targets) {
      const quantityBefore = normalizeStockQuantity(target.quantityBefore);
      const appliedAmount = requestedReduction;
      const quantityDelta = mode === "reduction" ? -Math.min(appliedAmount, quantityBefore) : appliedAmount;
      const quantityAfter = mode === "reduction"
        ? Math.max(0, quantityBefore + quantityDelta)
        : quantityBefore + quantityDelta;

      totalBefore += quantityBefore;

      if (quantityDelta > 0 || quantityDelta < 0) {
        const result = mode === "reduction"
          ? await applyStockModification(
            target.productId,
            quantityBefore,
            quantityDelta,
            target.combinationId > 0 ? target.combinationId : undefined,
            "adjustment",
            1,
          )
          : await applyStockModificationAugmentation(
            target.productId,
            quantityBefore,
            quantityDelta,
            target.combinationId > 0 ? target.combinationId : undefined,
            "adjustment",
            1,
            effectiveLimit,
          );

        const appliedValue = result.success
          ? Math.abs(Number(result.numberModifiable ?? quantityDelta) || 0)
          : 0;

        if (result.success) {
          totalApplied += appliedValue;
        }

        lines.push({
          productId: target.productId,
          productName: target.productName,
          reference: target.reference,
          quantityBefore,
          requestedReduction,
          appliedReduction: appliedValue,
          quantityAfter: result.success
            ? (mode === "reduction" ? Math.max(0, quantityBefore - appliedValue) : quantityBefore + appliedValue)
            : quantityBefore,
          success: result.success,
          message: result.message,
        });
        continue;
      }

      lines.push({
        productId: target.productId,
        productName: target.productName,
        reference: target.reference,
        quantityBefore,
        requestedReduction,
        appliedReduction: 0,
        quantityAfter,
        success: true,
        message: mode === "reduction" ? "Aucun stock à réduire" : "Aucun stock à augmenter",
      });
    }
  }

  const totalAfter = mode === "reduction"
    ? Math.max(0, totalBefore - totalApplied)
    : totalBefore + totalApplied;

  return {
    categoryId: idCategory,
    requestedReduction,
    totalBefore,
    totalApplied,
    totalAfter,
    remainingRequested: Math.max(0, requestedReduction - totalApplied),
    lines,
  };
}

export async function ReduireAllProductDansCategoryId(idCategory: number, number: number, idCategory2: number, number2: number): Promise<StockReductionSummary | null> {
  const summaries: StockReductionSummary[] = [];

  if (idCategory2 !== 0 && number2 !== 0) {
    summaries.push(await augment(idCategory2, number2, 0));
  }

  if (idCategory !== 0 && number !== 0) {
    summaries.push(await reduire(idCategory, number));
  }

  if (summaries.length === 0) {
    return null;
  }

  if (summaries.length === 1) {
    return summaries[0];
  }

  return {
    categoryId: summaries.every((summary) => summary.categoryId === summaries[0].categoryId)
      ? summaries[0].categoryId
      : 0,
    requestedReduction: summaries.reduce((sum, summary) => sum + summary.requestedReduction, 0),
    totalBefore: summaries.reduce((sum, summary) => sum + summary.totalBefore, 0),
    totalApplied: summaries.reduce((sum, summary) => sum + summary.totalApplied, 0),
    totalAfter: summaries.reduce((sum, summary) => sum + summary.totalAfter, 0),
    remainingRequested: summaries.reduce((sum, summary) => sum + summary.remainingRequested, 0),
    lines: summaries.flatMap((summary) => summary.lines),
  };
}

export async function reduire(idCategory: number, number: number): Promise<StockReductionSummary> {
  return processCategoryStockOperation(idCategory, number, "reduction");
}


export async function augment(idCategory: number, number: number, limite: number): Promise<StockReductionSummary> {
  return processCategoryStockOperation(idCategory, number, "augmentation", limite);
}