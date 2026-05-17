import { useEffect, useMemo, useState } from "react";
import { listProductIds, listProductsLight } from "../../../Backoffice/produit/api/productsApi";
import type { ProductListItem } from "../../../Backoffice/produit/api/object";
import { listCategoriesLight } from "../../../Backoffice/categorie/api/categoriesApi";
import type { CategoryListItem } from "../../../Backoffice/categorie/api/object";
import { filterProducts, getCategoryOptions, type ProductSearchCriteria } from "./productSearch";
import { getProductAttributeGroups } from "../../../Backoffice/attribue&Caracteristique/api/attributsCaracteristiquesApi";
import { getStockByProductId } from "../../../Backoffice/stock/api/stockApi";

export const DEFAULT_PRODUCT_SEARCH_CRITERIA: ProductSearchCriteria = {
  name: "",
  category: "",
  minPrice: "",
  maxPrice: "",
};

export function useProduitsList(pageSize = 8) {
  const [pageProducts, setPageProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [categoriesData, setCategoriesData] = useState<CategoryListItem[]>([]);
  const [criteria, setCriteria] = useState<ProductSearchCriteria>(DEFAULT_PRODUCT_SEARCH_CRITERIA);
  const [appliedCriteria, setAppliedCriteria] = useState<ProductSearchCriteria>(DEFAULT_PRODUCT_SEARCH_CRITERIA);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        const offset = (page - 1) * pageSize;
        const [productIds, loadedProducts, loadedCategories] = await Promise.all([
          listProductIds(),
          listProductsLight(pageSize, offset),
          listCategoriesLight(),
        ]);
        setTotalProducts(productIds.length);

        // Expand products with their single-attribute combinations (one CSV line = one declinaison)
        const expandedProducts: ProductListItem[] = [];
        const seen = new Set<string>();

        await Promise.all(
          loadedProducts.map(async (p) => {
            try {
              const groups = await getProductAttributeGroups(p.id);
              const combinations = Array.from(
                new Map(groups.flatMap((g) => g.combinations ?? []).map((c) => [c.id, c])).values(),
              );

              if (!combinations || combinations.length === 0) {
                // no attributes/combinations: keep base product
                const key = `${p.id}-0`;
                if (!seen.has(key)) {
                  seen.add(key);
                  expandedProducts.push(p);
                }
                return;
              }

              // otherwise only add combination entries (one per CSV declinaison)
              for (const comb of combinations) {
                const attrs = (comb.attributes || []) as { groupId: number; valueId: number }[];
                const labels = attrs
                  .map((a) => {
                    const group = groups.find((g) => g.group.id === a.groupId);
                    const value = group?.values?.find((v) => v.id === a.valueId);
                    return value?.name ?? String(a.valueId);
                  })
                  .filter(Boolean)
                  .join(" / ");

                const baseHt = Number(p.price_ht ?? p.base_price ?? p.price ?? 0) || 0;
                const impact = Number(comb.price || 0) || 0;
                const combPriceHt = Math.max(0, baseHt + impact);

                // fetch real stock for this combination (fallback to comb.quantity)
                let combQuantity = Number(comb.quantity) || 0;
                try {
                  const realStock = await getStockByProductId(p.id, Number(comb.id));
                  if (realStock !== null && realStock !== undefined) combQuantity = Number(realStock) || combQuantity;
                } catch (err) {
                  // ignore stock fetch errors, keep fallback
                }

                const comboEntry: ProductListItem & { combination_id?: number } = {
                  ...p,
                  name: `${p.name} — ${labels}`,
                  price: combPriceHt,
                  price_ht: combPriceHt,
                  combination_price_impact: impact,
                  quantity: combQuantity,
                  combination_id: Number(comb.id) || undefined,
                } as any;

                const key = `${p.id}-${comboEntry.combination_id ?? 0}`;
                if (!seen.has(key)) {
                  seen.add(key);
                  expandedProducts.push(comboEntry);
                }
              }
            } catch (err) {
              // on error, fall back to base product
              expandedProducts.push(p);
            }
          }),
        );

        setPageProducts(expandedProducts);
        setCategoriesData(loadedCategories);
      } catch (err) {
        console.error("Erreur lors du chargement des produits:", err);
        setError("Impossible de charger les produits. Vérifiez votre connexion à PrestaShop.");
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [page, pageSize, appliedCriteria]);

  useEffect(() => {
    setPage(1);
  }, [appliedCriteria]);

  const filteredProducts = useMemo(() => filterProducts(pageProducts, appliedCriteria), [pageProducts, appliedCriteria]);
  const categories = useMemo(() => getCategoryOptions(pageProducts, categoriesData), [pageProducts, categoriesData]);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalProducts / pageSize)), [totalProducts, pageSize]);

  const applyFilters = () => {
    setAppliedCriteria(criteria);
  };

  const resetFilters = () => {
    setCriteria(DEFAULT_PRODUCT_SEARCH_CRITERIA);
    setAppliedCriteria(DEFAULT_PRODUCT_SEARCH_CRITERIA);
  };

  return {
    loading,
    error,
    page,
    setPage,
    criteria,
    setCriteria,
    categories,
    filteredProducts,
    paginatedProducts: filteredProducts,
    totalPages,
    totalProducts,
    applyFilters,
    resetFilters,
  };
}