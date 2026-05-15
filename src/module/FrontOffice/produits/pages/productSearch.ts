import type { CategoryListItem } from "../../../Backoffice/categorie/api/object";
import type { ProductListItem } from "../../../Backoffice/produit/api/object";

export type ProductSearchCriteria = {
  name: string;
  category: string;
  minPrice: string;
  maxPrice: string;
};

export type ProductCategoryOption = {
  value: string;
  label: string;
};

function toNumber(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getCategoryOptions(products: ProductListItem[], categories: CategoryListItem[]): ProductCategoryOption[] {
  const categoryNameById = new Map(
    categories
      .filter((category) => Number.isFinite(category.id))
      .map((category) => [category.id, category.name?.trim() || `Categorie ${category.id}`]),
  );

  return Array.from(
    new Set(
      products
        .map((product) => product.id_category_default)
        .filter((categoryId): categoryId is number => Number.isFinite(categoryId)),
    ),
  )
    .sort((a, b) => a - b)
    .map((id) => ({
      value: String(id),
      label: categoryNameById.get(id) ?? `Categorie ${id}`,
    }));
}

export function filterProducts(products: ProductListItem[], criteria: ProductSearchCriteria): ProductListItem[] {
  const normalizedName = criteria.name.trim().toLowerCase();
  const minPrice = criteria.minPrice.trim() === "" ? null : toNumber(criteria.minPrice);
  const maxPrice = criteria.maxPrice.trim() === "" ? null : toNumber(criteria.maxPrice);

  return products.filter((product) => {
    if (normalizedName && !String(product.name || "").toLowerCase().includes(normalizedName)) {
      return false;
    }

    if (criteria.category && String(product.id_category_default ?? "") !== criteria.category) {
      return false;
    }

    const price = Number(product.price ?? 0);
    if (minPrice !== null && price < minPrice) {
      return false;
    }

    if (maxPrice !== null && price > maxPrice) {
      return false;
    }

    return true;
  });
}
