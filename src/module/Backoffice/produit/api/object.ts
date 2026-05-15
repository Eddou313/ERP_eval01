import { boolFromPrestashop, stringFromPrestashop,numFromPrestashop, keywordsFromPrestashop, type PrestashopLanguageField } from "../../../../utils/helper";

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
  base_price?: number;
  price_ht?: number;
  combination_price_impact?: number;
  reduction_amount?: number;
  tax_rate?: number;
  tax_amount?: number;
  final_price?: number;
  default_combination_id?: number;
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
  available_date?: string;
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

export type PriceWorkflowBreakdown = {
  basePrice: number;
  combinationPriceImpact: number;
  reductionAmount: number;
  taxRate: number;
  taxAmount: number;
  priceHt: number;
  finalPrice: number;
  defaultCombinationId: number;
};
