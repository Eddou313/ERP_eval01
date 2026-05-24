import { useEffect, useMemo, useState } from "react";
import { listProductIds, listProductsLightPaginated } from "../../../Backoffice/produit/api/productsApi";
import type { ProductListItem } from "../../../Backoffice/produit/api/object";
import { listCategoriesLight } from "../../../Backoffice/categorie/api/categoriesApi";
import type { CategoryListItem } from "../../../Backoffice/categorie/api/object";
import { filterProducts, getCategoryOptions, type ProductSearchCriteria } from "./productSearch";

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
    const loadStaticData = async () => {
      try {
        const [productIds, loadedCategories] = await Promise.all([listProductIds(), listCategoriesLight()]);
        setTotalProducts(productIds.length);
        setCategoriesData(loadedCategories);
      } catch (err) {
        console.error("Erreur lors du chargement des données statiques produits:", err);
        setError("Impossible de charger les catégories ou le total des produits.");
      }
    };

    loadStaticData();
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        const offset = (page - 1) * pageSize;
        const loadedProducts = await listProductsLightPaginated(pageSize, offset);

        const normalizedProducts: ProductListItem[] = loadedProducts.map((product) => ({
          ...product,
          combination_id: product.default_combination_id || undefined,
          id_product_attribute: product.default_combination_id || undefined,
        } as ProductListItem & { combination_id?: number; id_product_attribute?: number }));

        setPageProducts(normalizedProducts);
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