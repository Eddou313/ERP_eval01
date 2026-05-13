import { requestPrestashopXml } from "../../../../utils/prestashopClient";
import {
  asArray,
  boolFromPrestashop,
  numFromPrestashop,
  stringFromPrestashop,
  keywordsFromPrestashop,
  getFirstLanguageText,
  type PrestashopLanguageField,
} from "../../../../utils/helper";
import { getStockByProductId } from "../../stock/api/stockApi";

// Product types based on PrestaShop 8.2.6 API schema

export type ProductForm = {
  id_manufacturer?: number;
  id_supplier?: number;
  id_category_default: number;
  id_tax_rules_group?: number;
  type?: string; // "simple", "pack", "virtual"
  reference?: string;
  supplier_reference?: string;
  name: string;
  description?: string;
  description_short?: string;
  price: number;
  wholesale_price?: number;
  on_sale?: boolean;
  active?: boolean;
  visibility?: string; // "both", "catalog", "search", "none"
  quantity?: number;
  ean13?: string;
  isbn?: string;
  upc?: string;
  mpn?: string;
  weight?: number;
  width?: number;
  height?: number;
  depth?: number;
  location?: string;
  link_rewrite?: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string[];
  available_for_order?: boolean;
  show_price?: boolean;
  available_date?: string;
};

export type ProductCreateForm = ProductForm;

export type ProductUpdateForm = Partial<ProductForm> & { id?: number };

export type ProductListItem = {
  id: number;
  name?: string;
  reference?: string;
  price?: number;
  active?: boolean;
  quantity?: number;
  id_category_default?: number;
  id_manufacturer?: number;
  id_supplier?: number;
  type?: string;
  on_sale?: boolean;
  date_add?: string;
  date_upd?: string;
  id_default_image?: number;
  link_rewrite?: string;
  description_short?: string;
};

export type ProductGetResponse = {
  prestashop: {
    product: {
      id?: any;
      id_manufacturer?: any;
      id_supplier?: any;
      id_category_default?: any;
      id_tax_rules_group?: any;
      type?: any;
      cache_default_attribute?: any;
      id_default_image?: any;
      reference?: any;
      supplier_reference?: any;
      location?: any;
      width?: any;
      height?: any;
      depth?: any;
      weight?: any;
      quantity_discount?: any;
      ean13?: any;
      isbn?: any;
      upc?: any;
      mpn?: any;
      cache_is_pack?: any;
      cache_has_attachments?: any;
      is_virtual?: any;
      state?: any;
      on_sale?: any;
      online_only?: any;
      ecotax?: any;
      minimal_quantity?: any;
      low_stock_threshold?: any;
      low_stock_alert?: any;
      price?: any;
      wholesale_price?: any;
      unity?: any;
      unit_price_ratio?: any;
      additional_shipping_cost?: any;
      active?: any;
      redirect_type?: any;
      id_type_redirected?: any;
      available_for_order?: any;
      available_date?: any;
      show_condition?: any;
      condition?: any;
      show_price?: any;
      indexed?: any;
      visibility?: any;
      advanced_stock_management?: any;
      date_add?: any;
      date_upd?: any;
      pack_stock_type?: any;
      // language fields
      name?: PrestashopLanguageField;
      description?: PrestashopLanguageField;
      description_short?: PrestashopLanguageField;
      link_rewrite?: PrestashopLanguageField;
      meta_title?: PrestashopLanguageField;
      meta_description?: PrestashopLanguageField;
      meta_keywords?: PrestashopLanguageField;
      available_now?: PrestashopLanguageField;
      available_later?: PrestashopLanguageField;
    };
  };
};

export type ProductListResponse = {
  prestashop: {
    products: {
      product: any[];
    };
  };
};

// Attribute & Combination types
export type ProductAttribute = {
  id_product_attribute?: number;
  id_product?: number;
  reference?: string;
  supplier_reference?: string;
  price?: number;
  weight?: number;
  ecotax?: number;
  quantity?: number;
  ean13?: string;
  isbn?: string;
  upc?: string;
  mpn?: string;
};

export type ProductAttributeCombination = {
  id_attribute?: number;
  id_attribute_group?: number;
};

export type ProductImage = {
  id_image?: number;
  id_product?: number;
  position?: number;
  cover?: boolean;
  legend?: string;
};

// --- HELPERS ---

export const localboolFromPrestashop = boolFromPrestashop;
export const localnumFromPrestashop = numFromPrestashop;
export const localstringFromPrestashop = stringFromPrestashop;
export const localkeywordsFromPrestashop = keywordsFromPrestashop;

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

/**
 * Get a single product by ID
 */
export async function getProduct(id: number): Promise<ProductListItem> {
  const json = await requestPrestashopXml<ProductGetResponse>(`/products/${id}`);
  const p = json.prestashop.product;

  const stock = await getStockByProductId(id);

  return {
    id: numFromPrestashop(p.id),
    name: getFirstLanguageText(p.name),
    reference: stringFromPrestashop(p.reference),
    price: numFromPrestashop(p.price),
    active: boolFromPrestashop(p.active),
    quantity: stock ?? 0, // Note: quantity is often in stock_available
    id_category_default: numFromPrestashop(p.id_category_default),
    id_manufacturer: numFromPrestashop(p.id_manufacturer),
    id_supplier: numFromPrestashop(p.id_supplier),
    type: stringFromPrestashop(p.type),
    on_sale: boolFromPrestashop(p.on_sale),
    date_add: stringFromPrestashop(p.date_add),
    date_upd: stringFromPrestashop(p.date_upd),
    id_default_image: numFromPrestashop(p.id_default_image),
    link_rewrite: getFirstLanguageText(p.link_rewrite),
    description_short: getFirstLanguageText(p.description_short),
  };
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

  const base = await getProduct(id);

  return {
    ...base,
    description: getFirstLanguageText(p.description),
    description_short: getFirstLanguageText(p.description_short),
    meta_title: getFirstLanguageText(p.meta_title),
    meta_description: getFirstLanguageText(p.meta_description),
    meta_keywords: keywordsFromPrestashop(p.meta_keywords),
    wholesale_price: numFromPrestashop(p.wholesale_price),
    weight: numFromPrestashop(p.weight),
    width: numFromPrestashop(p.width),
    height: numFromPrestashop(p.height),
    depth: numFromPrestashop(p.depth),
    ean13: stringFromPrestashop(p.ean13),
  };
}

/**
 * List products with pagination
 */
export async function listProductsLight(limit?: number): Promise<ProductListItem[]> {
  const ids = await listProductIds(limit);
  const results = await Promise.all(ids.map((id) => getProduct(id)));
  return results;
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
        type: data.type || "simple",
        reference: data.reference || "",
        supplier_reference: data.supplier_reference || "",
        price: data.price,
        wholesale_price: data.wholesale_price || 0,
        on_sale: data.on_sale ? "1" : "0",
        active: data.active !== false ? "1" : "0",
        visibility: data.visibility || "both",
        weight: data.weight || 0,
        width: data.width || 0,
        height: data.height || 0,
        depth: data.depth || 0,
        available_for_order: data.available_for_order !== false ? "1" : "0",
        show_price: data.show_price !== false ? "1" : "0",
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
      },
    },
  };

  const response = await requestPrestashopXml<any>("/products", {
    method: "POST",
    bodyXml: JSON.stringify(payload),
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

  const payload = {
    prestashop: {
      product: {
        id: id,
        id_manufacturer: data.id_manufacturer ?? existing.id_manufacturer,
        id_supplier: data.id_supplier ?? existing.id_supplier,
        id_category_default: data.id_category_default ?? existing.id_category_default,
        price: data.price ?? existing.price,
        on_sale: data.on_sale !== undefined ? (data.on_sale ? "1" : "0") : (existing.on_sale ? "1" : "0"),
        active: data.active !== undefined ? (data.active ? "1" : "0") : (existing.active ? "1" : "0"),
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
    bodyXml: JSON.stringify(payload),
  });
}

/**
 * Delete a product
 */
export async function deleteProduct(id: number): Promise<void> {
  await requestPrestashopXml(`/products/${id}`, {
    method: "DELETE",
  });
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
export async function InitProducts(data: ProductListItem[]): Promise<void> {
  const sortedData = [...data].sort((a, b) => (b.id || 0) - (a.id || 0));

  for (const product of sortedData) {
    if (product.id > 0) {
      try {
        await deleteProduct(product.id);
      } catch (error) {
        console.error(`Erreur lors de la suppression du produit ${product.id}:`, error);
      }
    }
  }
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