import { slugify, textFromUnknown } from "../../utils/helper";
import { buildPrestashopXml, requestPrestashopXml } from "../../utils/prestashopClient";
const DEFAULT_LANGUAGE_ID = 1;
const ROOT_CATEGORY_ID = 2;

export type CreatedCategory = {
  id: number;
  name: string;
};

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
