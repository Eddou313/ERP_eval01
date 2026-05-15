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

// --- HELPERS ---

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
  const confirmed = window.confirm("Vous etes sur de supprimer tous les categories ?");
  if (!confirmed) return;

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
