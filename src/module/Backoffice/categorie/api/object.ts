import type { PrestashopLanguageField } from "../../../../utils/helper";

// category-lang
export type CategoryForm = {
  id_parent: number;
  active: boolean;
  name: string;
  link_rewrite: string;
  description: string;
  meta_title: string;
  meta_description: string;
  meta_keywords: string[];
};

export type CategoryCreateForm = CategoryForm;

export type CategoryImportRow = {
  id_parent?: number | string;
  active?: boolean | number | string;
  name: string;
  link_rewrite?: string;
  description?: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string[] | string;
  position?: number | string;
};

export type CategoryImportPayload = {
  items: CategoryImportRow[];
};

export type CategoryListItem = {
  id: number;
  name?: string;
  active?: boolean;
  id_parent?: number;
  description?: string;
  position?: number;
  nb_products?: number;
  id_shop_default?: number;
  is_root_category?: boolean;
  level_depth?: number;
  nleft?: number;
  nright?: number;
  date_add?: string;
  date_upd?: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string[];
  nb_products_recursive?: number;
  link_rewrite?: string;
};

export type CategoryGetResponse = {
  prestashop: {
    category: {
      id?: any;
      id_parent?: any;
      active?: any;
      id_shop_default?: any;
      is_root_category?: any;
      level_depth?: any;
      nleft?: any;
      nright?: any;
      position?: any;
      date_add?: any;
      date_upd?: any;
      // sur /categorie-lang/
      nb_products_recursive?: any;
      name?: PrestashopLanguageField;
      link_rewrite?: PrestashopLanguageField;
      description?: PrestashopLanguageField;
      meta_title?: PrestashopLanguageField;
      meta_description?: PrestashopLanguageField;
      meta_keywords?: PrestashopLanguageField;
    };
  };
};

// category-group
export type CategoryGroup = {
  parentId: number;
  parentLabel: string;
  categories: CategoryListItem[];
};
