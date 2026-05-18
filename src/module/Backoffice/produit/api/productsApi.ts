import { buildPrestashopXml, requestPrestashopXml } from "../../../../utils/prestashopClient";
import { xmlToJson } from "../../../../utils/xml";
import {asArray,boolFromPrestashop,numFromPrestashop,stringFromPrestashop,keywordsFromPrestashop,getFirstLanguageText,} from "../../../../utils/helper";
import { getStockByProductId } from "../../stock/api/stockApi";
import type { PriceWorkflowBreakdown, ProductAttribute, ProductCreateForm, ProductGetResponse, ProductImage, ProductListItem, ProductListResponse, ProductUpdateForm } from "./object";

function roundMoney(value: number): number {
  return Number((Number(value) || 0).toFixed(2));
}

async function resolveDefaultCombinationId(product: any, productId: number): Promise<number> {
  const cacheDefault = numFromPrestashop(product?.cache_default_attribute);
  if (cacheDefault > 0) {
    return cacheDefault;
  }

  try {
    const response = await requestPrestashopXml<any>("/combinations", {
      query: {
        display: "full",
        "filter[id_product]": `[${productId}]`,
      },
    });

    const combinationsRaw = response?.prestashop?.combinations?.combination;
    const combinations = asArray(combinationsRaw);
    const first = combinations[0];
    return numFromPrestashop(first?.id ?? first?.["@_id"]);
  } catch {
    return 0;
  }
}

async function resolveCombinationPriceImpact(productId: number, combinationId: number): Promise<number> {
  if (!combinationId) return 0;

  try {
    const response = await requestPrestashopXml<any>("/combinations", {
      query: {
        display: "full",
        "filter[id_product]": `[${productId}]`,
      },
    });

    const combinations = asArray(response?.prestashop?.combinations?.combination);
    const found = combinations.find((combination: any) => {
      const currentId = numFromPrestashop(combination?.id ?? combination?.["@_id"]);
      return currentId === combinationId;
    });

    if (!found) return 0;

    const rawImpact = found.price ?? found.price_impact ?? found.price_te ?? 0;
    return Number(rawImpact) || 0;
  } catch {
    return 0;
  }
}

async function resolveReductionAmount(product: any, productId: number, priceAfterCombination: number, combinationId: number): Promise<number> {
  try {
    const response = await requestPrestashopXml<any>("/specific_prices", {
      query: {
        display: "full",
        "filter[id_product]": `[${productId}]`,
      },
    });

    const specificPrices = asArray(response?.prestashop?.specific_prices?.specific_price);
    const matched = specificPrices.find((entry: any) => {
      const entryCombinationId = numFromPrestashop(entry?.id_product_attribute);
      return !combinationId || entryCombinationId === 0 || entryCombinationId === combinationId;
    }) ?? specificPrices[0];

    if (matched) {
      const reductionType = String(matched.reduction_type || matched.reductionType || "").toLowerCase();
      const reductionValue = Number(matched.reduction) || 0;

      if (reductionType === "percentage") {
        const percent = reductionValue > 1 ? reductionValue / 100 : reductionValue;
        return roundMoney(priceAfterCombination * percent);
      }

      if (reductionType === "amount") {
        return roundMoney(reductionValue);
      }

      if (reductionValue > 0) {
        return roundMoney(reductionValue);
      }
    }
  } catch {
    // fallback below
  }

  if (product?.on_sale) {
    // Heuristique cohérente avec le badge promotionnel déjà affiché dans l'UI.
    return roundMoney(priceAfterCombination * 0.2);
  }

  return 0;
}

async function resolveTaxRate(product: any): Promise<number> {
  const taxRuleGroupId = numFromPrestashop(product?.id_tax_rules_group);
  if (!taxRuleGroupId) return 0;

  try {
    const response = await requestPrestashopXml<any>("/tax_rules", {
      query: {
        display: "full",
        "filter[id_tax_rules_group]": `[${taxRuleGroupId}]`,
      },
    });

    const taxRules = asArray(response?.prestashop?.tax_rules?.tax_rule);
    const matchedRule = taxRules[0];

    if (matchedRule) {
      const directRate = Number(matchedRule.rate) || 0;
      if (directRate > 0) return directRate;

      const taxId = numFromPrestashop(matchedRule.id_tax);
      if (taxId > 0) {
        const taxResponse = await requestPrestashopXml<any>(`/taxes/${taxId}`, {
          query: { display: "full" },
        });
        const taxRate = Number(taxResponse?.prestashop?.tax?.rate) || Number(taxResponse?.prestashop?.tax?.value) || 0;
        if (taxRate > 0) return taxRate;
      }
    }
  } catch {
    // fallback below
  }

  return 20;
}

export async function resolveProductPriceWorkflow(product: any, productId: number, combinationId?: number): Promise<PriceWorkflowBreakdown> {
  const basePrice = Number(product?.price) || 0;
  const defaultCombinationId = await resolveDefaultCombinationId(product, productId);
  const targetCombinationId = Number(combinationId || defaultCombinationId || 0);
  const combinationPriceImpact = await resolveCombinationPriceImpact(productId, targetCombinationId);
  const priceAfterCombination = basePrice + combinationPriceImpact;
  const reductionAmount = await resolveReductionAmount(product, productId, priceAfterCombination, targetCombinationId);
  const priceHt = Math.max(0, priceAfterCombination - reductionAmount);
  const taxRate = await resolveTaxRate(product);
  const taxAmount = priceHt * (taxRate / 100);
  const finalPrice = roundMoney(priceHt + taxAmount);

  return {
    basePrice: Number(basePrice.toFixed(6)),
    combinationPriceImpact: Number(combinationPriceImpact.toFixed(6)),
    reductionAmount: roundMoney(reductionAmount),
    taxRate: roundMoney(taxRate),
    taxAmount: roundMoney(taxAmount),
    priceHt: Number(priceHt.toFixed(6)),
    finalPrice,
    defaultCombinationId: targetCombinationId || defaultCombinationId,
  };
}

function mapProductFromApi(product: any, stock: number | undefined, pricing: PriceWorkflowBreakdown): ProductListItem {
  return {
    id: numFromPrestashop(product.id),
    name: getFirstLanguageText(product.name),
    reference: stringFromPrestashop(product.reference),
    price: pricing.finalPrice,
    base_price: pricing.basePrice,
    price_ht: pricing.priceHt,
    combination_price_impact: pricing.combinationPriceImpact,
    reduction_amount: pricing.reductionAmount,
    tax_rate: pricing.taxRate,
    tax_amount: pricing.taxAmount,
    final_price: pricing.finalPrice,
    active: boolFromPrestashop(product.active),
    state: numFromPrestashop(product.state),
    quantity: stock ?? 0,
    id_category_default: numFromPrestashop(product.id_category_default),
    id_manufacturer: numFromPrestashop(product.id_manufacturer),
    id_supplier: numFromPrestashop(product.id_supplier),
    type: stringFromPrestashop(product.type),
    on_sale: boolFromPrestashop(product.on_sale),
    date_add: stringFromPrestashop(product.date_add),
    date_upd: stringFromPrestashop(product.date_upd),
    available_date: stringFromPrestashop(product.available_date),
    id_default_image: numFromPrestashop(product.id_default_image),
    link_rewrite: getFirstLanguageText(product.link_rewrite),
    description_short: getFirstLanguageText(product.description_short),
    default_combination_id: pricing.defaultCombinationId,
  };
}

// --- CRUD FUNCTIONS ---

/**
 * List all product IDs
 */
export async function listProductIds(limit?: number): Promise<number[]> {
  const queryParams: any = { display: "[id]" };
  if (limit) queryParams.limit = limit;

  const json = await requestPrestashopXml<any>("/products", {
    query: queryParams,
  });

  const productsRaw = json?.prestashop?.products?.product;
  if (!productsRaw) return [];

  return asArray(productsRaw)
    .map((p: any) => Number(p["@_id"] || p.id))
    .filter((id) => !isNaN(id) && Number.isFinite(id));
}

export async function listProductIdsPaginated(limit = 8, offset = 0): Promise<number[]> {
  const queryParams: any = {
    display: "[id]",
    limit: `${offset},${limit}`,
    "filter[active]": 1,
  };
  const json = await requestPrestashopXml<any>("/products", {
    query: queryParams,
  });

  const productsRaw = json?.prestashop?.products?.product;
  if (!productsRaw) return [];

  return asArray(productsRaw)
    .map((p: any) => Number(p["@_id"] || p.id))
    .filter((id) => !isNaN(id) && Number.isFinite(id));
}

/**
 * Get a single product by ID
 */
export async function getProduct(id: number): Promise<ProductListItem> {
  const json = await requestPrestashopXml<ProductGetResponse>(`/products/${id}`);
  const p = json.prestashop.product;

  const stock = await getStockByProductId(id);
  const pricing = await resolveProductPriceWorkflow(p, id);

  return mapProductFromApi(p, stock ?? 0, pricing);
}

/**
 * Get product details with full information
 */
export async function getProductDetail(id: number): Promise<ProductListItem & {
  description?: string;
  description_short?: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string[];
  wholesale_price?: number;
  weight?: number;
  width?: number;
  height?: number;
  depth?: number;
  ean13?: string;
}> {
  const json = await requestPrestashopXml<ProductGetResponse>(`/products/${id}`);
  const p = json.prestashop.product;
  const stock = await getStockByProductId(id);
  const pricing = await resolveProductPriceWorkflow(p, id);
  const base = mapProductFromApi(p, stock ?? 0, pricing);

  return {
    ...base,
    description: getFirstLanguageText(p.description),
    description_short: getFirstLanguageText(p.description_short),
    meta_title: getFirstLanguageText(p.meta_title),
    meta_description: getFirstLanguageText(p.meta_description),
    meta_keywords: keywordsFromPrestashop(p.meta_keywords),
    state: 1,
    wholesale_price: numFromPrestashop(p.wholesale_price),
    weight: numFromPrestashop(p.weight),
    width: numFromPrestashop(p.width),
    height: numFromPrestashop(p.height),
    depth: numFromPrestashop(p.depth),
    ean13: stringFromPrestashop(p.ean13),
  };
}

/**
 * List products, optionally using Prestashop pagination.
 */
export async function listProductsLight(limit?: number, offset = 0): Promise<ProductListItem[]> {
  const ids = limit === undefined ? await listProductIds() : await listProductIdsPaginated(limit, offset);
  const results = await Promise.all(ids.map((id) => getProduct(id)));
  return limit === undefined ? results : results.sort((a, b) => b.id - a.id);
}

export async function listProductsLightPaginated(
  limit = 8,
  offset = 0
): Promise<ProductListItem[]> {
  const ids = await listProductIdsPaginated(limit, offset);

  const results = await Promise.all(ids.map((id) => getProduct(id)));

  // return results.sort((a, b) => {
  //   const dateA = a.date_add ? new Date(a.date_add).getTime() : 0;
  //   const dateB = b.date_add ? new Date(b.date_add).getTime() : 0;

  //   return dateA - dateB;
  // });
  // return results.sort((a, b) => (b.id) - (a.id));
  return results.sort((a, b) => b.id - a.id);
}

/**
 * Get products by category
 */
export async function getProductsByCategory(categoryId: number): Promise<ProductListItem[]> {
  try {
    const json = await requestPrestashopXml<ProductListResponse>("/products", {
      query: { limit: 100 },
    });

    const productsRaw = json?.prestashop?.products?.product;
    if (!productsRaw) return [];

    const allProducts = asArray(productsRaw)
      .map((p: any) => Number(p["@_id"] || p.id))
      .filter((id) => !isNaN(id));

    // Filter by category
    const results: ProductListItem[] = [];
    for (const id of allProducts) {
      const product = await getProduct(id);
      if (product.id_category_default === categoryId) {
        results.push(product);
      }
    }
    return results;
  } catch (error) {
    console.error("Erreur getProductsByCategory:", error);
    return [];
  }
}

/**
 * Search products by name
 */
export async function searchProducts(query: string): Promise<ProductListItem[]> {
  try {
    const json = await requestPrestashopXml<ProductListResponse>("/products", {
      query: { limit: 100 },
    });

    const productsRaw = json?.prestashop?.products?.product;
    if (!productsRaw) return [];

    const allIds = asArray(productsRaw)
      .map((p: any) => Number(p["@_id"] || p.id))
      .filter((id) => !isNaN(id));

    // Filter by name
    const results: ProductListItem[] = [];
    const lowerQuery = query.toLowerCase();
    for (const id of allIds) {
      const product = await getProduct(id);
      if (product.name && product.name.toLowerCase().includes(lowerQuery)) {
        results.push(product);
      }
    }
    return results;
  } catch (error) {
    console.error("Erreur searchProducts:", error);
    return [];
  }
}

/**
 * Create a new product
 */
export async function createProduct(data: ProductCreateForm): Promise<{ id: number }> {
  const payload = {
    prestashop: {
      product: {
        id_manufacturer: data.id_manufacturer || 0,
        id_supplier: data.id_supplier || 0,
        id_category_default: data.id_category_default,
        id_tax_rules_group: data.id_tax_rules_group || 0,
        id_default_image: data.id_default_image || 0,
        type: data.type || "standard",
        reference: data.reference || "",
        supplier_reference: data.supplier_reference || "",
        price: data.price,
        wholesale_price: data.wholesale_price || 0,
        on_sale: data.on_sale ? "1" : "0",
        active: data.active !== false ? "1" : "0",
        visibility: data.visibility || "both",
        weight: data.weight || 0,
        width: data.width || 0,
        state: 1,
        height: data.height || 0,
        depth: data.depth || 0,
        available_for_order: data.available_for_order !== false ? "1" : "0",
        show_price: data.show_price !== false ? "1" : "0",
        available_date: data.available_date || "",
        name: {
          language: {
            "@_id": "1",
            "#text": data.name,
          },
        },
        description: {
          language: {
            "@_id": "1",
            "#text": data.description || "",
          },
        },
        description_short: {
          language: {
            "@_id": "1",
            "#text": data.description_short || "",
          },
        },
        link_rewrite: {
          language: {
            "@_id": "1",
            "#text": data.link_rewrite || data.name.toLowerCase().replace(/\s+/g, "-"),
          },
        },
        meta_title: {
          language: {
            "@_id": "1",
            "#text": data.meta_title || data.name,
          },
        },
        meta_description: {
          language: {
            "@_id": "1",
            "#text": data.meta_description || "",
          },
        },
        meta_keywords: {
          language: {
            "@_id": "1",
            "#text": Array.isArray(data.meta_keywords) ? data.meta_keywords.join(",") : "",
          },
        },
        associations: {
          categories: {
            category: [
              {
                id: data.id_category_default,
              },
            ],
          },
        },
      },
    },
  };

  const response = await requestPrestashopXml<any>("/products", {
    method: "POST",
    bodyXml: buildPrestashopXml(payload),
  });

  const productId = numFromPrestashop(response?.prestashop?.product?.id);
  if (!productId) throw new Error("Failed to create product: no ID returned");

  return { id: productId };
}

/**
 * Update a product
 */
export async function updateProduct(id: number, data: ProductUpdateForm): Promise<void> {
  const existing = await getProductDetail(id);
  const existingAny = existing as any;

  const payload = {
    prestashop: {
      product: {
        id: id,
        id_manufacturer: data.id_manufacturer ?? existing.id_manufacturer,
        id_supplier: data.id_supplier ?? existing.id_supplier,
        id_category_default: data.id_category_default ?? existing.id_category_default,
        id_tax_rules_group: data.id_tax_rules_group ?? existingAny.id_tax_rules_group ?? 0,
        id_default_image: data.id_default_image ?? existing.id_default_image,
        state: data.state ?? existing.state ?? 1,
        reference: data.reference ?? existing.reference ?? "",
        supplier_reference: data.supplier_reference ?? "",
        price: data.price ?? existing.price,
        wholesale_price: data.wholesale_price ?? existingAny.wholesale_price ?? 0,
        on_sale: data.on_sale !== undefined ? (data.on_sale ? "1" : "0") : (existing.on_sale ? "1" : "0"),
        active: data.active !== undefined ? (data.active ? "1" : "0") : (existing.active ? "1" : "0"),
        visibility: data.visibility ?? existing.type ?? "both",
        available_for_order: data.available_for_order !== undefined ? (data.available_for_order ? "1" : "0") : (existingAny.available_for_order ? "1" : "0"),
        show_price: data.show_price !== undefined ? (data.show_price ? "1" : "0") : (existingAny.show_price ? "1" : "0"),
        available_date: data.available_date ?? existing.available_date ?? "",
        name: {
          language: {
            "@_id": "1",
            "#text": data.name ?? existing.name,
          },
        },
        description: {
          language: {
            "@_id": "1",
            "#text": data.description ?? existing.description,
          },
        },
        description_short: {
          language: {
            "@_id": "1",
            "#text": data.description_short ?? existing.description_short,
          },
        },
      },
    },
  };

  await requestPrestashopXml(`/products/${id}`, {
    method: "PUT",
    bodyXml: buildPrestashopXml(payload),
  });
}

/**
 * Upload an image for a product and return the created image ID.
 */
export async function uploadProductImage(productId: number, file: Blob, fileName: string): Promise<number> {
  const formData = new FormData();
  formData.append("image", file, fileName);

  const response = await fetch(`/api/images/products/${productId}`, {
    method: "POST",
    body: formData,
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Erreur upload image produit (${response.status})`);
  }

  const parsed = xmlToJson<any>(text);
  const imageId = Number(
    parsed?.prestashop?.image?.id ??
    parsed?.prestashop?.image?.id_image ??
    parsed?.image?.id ??
    parsed?.image?.id_image,
  );

  if (Number.isFinite(imageId) && imageId > 0) {
    return imageId;
  }

  throw new Error("Impossible de récupérer l'ID de l'image uploadée");
}

/**
 * Supprime une image produit.
 */
export async function deleteProductImage(productId: number, imageId?: number): Promise<void> {
  const path = imageId ? `/images/products/${productId}/${imageId}` : `/images/products/${productId}`;
  await requestPrestashopXml(path, {
    method: "DELETE",
  });
}

/**
 * Supprime toutes les images d'un produit.
 */
export async function deleteAllProductImages(productId: number): Promise<void> {
  const images = await getProductImages(productId);
  if (images.length === 0) {
    return;
  }

  await Promise.allSettled(
    images.map((image) => deleteProductImage(productId, image.id_image)),
  );
}

/**
 * Supprime toutes les images de tous les produits.
 */
export async function InitProductImages(): Promise<void> {
  try {
    const data = await listProductsLight();
    for (const product of data) {
      if (product.id > 0) {
        await deleteAllProductImages(product.id);
      }
    }
    console.log("Toutes les images produits ont été supprimées.");
  } catch (caught: any) {
    console.error("Erreur lors de l'initialisation des images produits :", caught);
  }
}

/**
 * Delete a product
 */
export async function deleteProduct(id: number): Promise<void> {
  try {
    await requestPrestashopXml(`/products/${id}`, {
      method: "DELETE",
    });
  } catch (error: any) {
    const status = Number(error?.status ?? 0);
    if (status === 404 || status === 405) {
      console.warn(`Suppression produit id=${id} non supportée ou produit introuvable, on continue.`);
      return;
    }

    throw error;
  }
}

/**
 * Get product images
 */
export async function getProductImages(productId: number): Promise<ProductImage[]> {
  try {
    const json = await requestPrestashopXml<any>(`/products/${productId}/images`);
    const imagesRaw = json?.prestashop?.images?.image;
    if (!imagesRaw) return [];

    return asArray(imagesRaw).map((img: any) => ({
      id_image: numFromPrestashop(img.id),
      id_product: numFromPrestashop(img.id_product),
      position: numFromPrestashop(img.position),
      cover: boolFromPrestashop(img.cover),
      legend: stringFromPrestashop(img.legend),
    }));
  } catch {
    return [];
  }
}

/**
 * Get product attributes (combinations)
 */
export async function getProductAttributes(productId: number): Promise<ProductAttribute[]> {
  try {
    const json = await requestPrestashopXml<any>(`/products/${productId}/combinations`);
    const attrRaw = json?.prestashop?.combinations?.combination;
    if (!attrRaw) return [];

    return asArray(attrRaw).map((attr: any) => ({
      id_product_attribute: numFromPrestashop(attr.id),
      id_product: productId,
      reference: stringFromPrestashop(attr.reference),
      supplier_reference: stringFromPrestashop(attr.supplier_reference),
      price: numFromPrestashop(attr.price),
      weight: numFromPrestashop(attr.weight),
      quantity: numFromPrestashop(attr.quantity),
      ean13: stringFromPrestashop(attr.ean13),
    }));
  } catch {
    return [];
  }
}

/**
 * Delete all products except core ones
 */
export async function InitProducts(): Promise<void> {
  // const confirmed = window.confirm("Vous etes sur de supprimer tous les produits ?");
  // if (!confirmed) return;
  try{
    const ids = await listProductIds();
    const sortedIds = [...ids].sort((a, b) => b - a);

    for (const productId of sortedIds) {
      if (productId > 0) {
          await deleteProduct(productId);
      }
    }
  }
  catch (caught: any) {
    console.error("Erreur lors de l'initialisation des produits :", caught);
  }
  console.log("Tous les produits ont été supprimés.");
}

// workflow prix
// Produit chargé
//       ↓
// Prix de base
//       ↓
// Utilisateur choisit attributs
//       ↓
// Trouver combinaison
//       ↓
// Appliquer impact prix
//       ↓
// Appliquer réductions
//       ↓
// Appliquer taxes
//       ↓
// Afficher prix final