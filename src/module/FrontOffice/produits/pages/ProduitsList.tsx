import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import FrontOfficeHeader from "../../include/FrontOfficeHeader";
import { listProductsLight } from "../../../Backoffice/produit/api/productsApi";
import {  type ProductListItem } from "../../../Backoffice/produit/api/object";
import { listCategoriesLight} from "../../../Backoffice/categorie/api/categoriesApi";
import {  type CategoryListItem } from "../../../Backoffice/categorie/api/object";
import { getProductImageUrl } from "../../../../utils/helper";
import { filterProducts, getCategoryOptions, type ProductSearchCriteria } from "./productSearch";
import "../pages/produits.css";
import { IconFilter } from '@tabler/icons-react';
import { getStockByProductId } from "../../../Backoffice/stock/api/stockApi";

export function ProduitsList() {
  const navigate = useNavigate();
  const [allProducts, setAllProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [categoriesData, setCategoriesData] = useState<CategoryListItem[]>([]);
  const [criteria, setCriteria] = useState<ProductSearchCriteria>({
    name: "",
    category: "",
    minPrice: "",
    maxPrice: "",
  });
  const [appliedCriteria, setAppliedCriteria] = useState<ProductSearchCriteria>(criteria);
  const pageSize = 8;

  const filteredProducts = useMemo(() => filterProducts(allProducts, appliedCriteria), [allProducts, appliedCriteria]);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredProducts.length / pageSize)), [filteredProducts.length]);
  const categories = useMemo(() => getCategoryOptions(allProducts, categoriesData), [allProducts, categoriesData]);
  
  const paginatedProducts = useMemo(() => {
    const offset = (page - 1) * pageSize;
    return filteredProducts.slice(offset, offset + pageSize);
  }, [filteredProducts, page]);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        const [loadedProducts, loadedCategories] = await Promise.all([listProductsLight(), listCategoriesLight()]);
        setAllProducts(loadedProducts);
        setCategoriesData(loadedCategories);
      } catch (err) {
        console.error("Erreur lors du chargement des produits:", err);
        setError("Impossible de charger les produits. Vérifiez votre connexion à PrestaShop.");
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [appliedCriteria]);

  const handleProductClick = (product: ProductListItem) => {
    navigate(`/produit/${product.id}`, { state: { product } });
  };

  const handleFilterSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAppliedCriteria(criteria);
  };

  const initialiser = () => {
    setCriteria({
      name: "",
      category: "",
      minPrice: "",
      maxPrice: "",
    });
  }

  return (
    <div className="productsPage">
      <FrontOfficeHeader />
      <div className="productsShell">
        <div className="productsIntro">
          <form className="productsSearchPanel" onSubmit={handleFilterSubmit}>
            <input
              type="text"
              className="searchInput"
              placeholder="Rechercher par nom"
              value={criteria.name}
              onChange={(event) => setCriteria((current) => ({ ...current, name: event.target.value }))}
            />
            <select
              className="searchInput"
              value={criteria.category}
              onChange={(event) => setCriteria((current) => ({ ...current, category: event.target.value }))}
            >
              <option value="">Toutes les categories</option>
              {categories.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
            <input
              type="number"
              className="searchInput"
              placeholder="Prix min"
              min={0}
              value={criteria.minPrice}
              onChange={(event) => setCriteria((current) => ({ ...current, minPrice: event.target.value }))}
            />
            <input
              type="number"
              className="searchInput"
              placeholder="Prix max"
              min={0}
              value={criteria.maxPrice}
              onChange={(event) => setCriteria((current) => ({ ...current, maxPrice: event.target.value }))}
            />

            <button type="submit" className="filterButton" style={{ alignItems: "center" }}>
              <IconFilter size={22} stroke={1.8} />
            </button>
            <button onClick={initialiser}>Initialiser</button>
          </form>
        </div>

        {loading && <p className="loading">Chargement des produits...</p>}

        {error && <p className="error">{error}</p>}

        {!loading && !error && allProducts.length === 0 && (
          <p className="noProducts">Aucun produit disponible pour le moment.</p>
        )}

        {!loading && !error && allProducts.length > 0 && filteredProducts.length === 0 && (
          <p className="noProducts">Aucun produit ne correspond aux filtres selectionnes.</p>
        )}

        {!loading && !error && paginatedProducts.length > 0 && (
          <>
            <div className="productsGrid">
              {paginatedProducts.map((product) => (
                <div
                  key={product.id}
                  className="productCard"
                  onClick={() => handleProductClick(product)}
                  style={{ cursor: "pointer" }}
                >
                  <div className="productImageWrap">
                      {product.id_default_image ? (
                      <img
                        src={getProductImageUrl(product.id, product.id_default_image)}
                        alt={product.name}
                        className="productImage"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="250" height="250"%3E%3Crect fill="%23f0f0f0" width="250" height="250"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-size="14"%3ENo Image%3C/text%3E%3C/svg%3E';
                        }}
                      />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="250" height="250" viewBox="0 0 250 250" className="productImage">
                        <rect fill="#f0f0f0" width="250" height="250"/>
                        <text x="50%" y="50%" textAnchor="middle" dy=".3em" fill="#999" fontSize="14">
                          No Image
                        </text>
                      </svg>
                    )}
                    {product.on_sale && (
                      <div className="badgesStack">
                        {/* <span className="discountBadge">-20%</span> */}
                      </div>
                    )}
                    {/* Availability badges */}
                    {(() => {
                      const dateStr = product.available_date || product.date_add || "";
                      if (!dateStr) return null;
                      const d = new Date(dateStr);
                      if (isNaN(d.getTime())) return null;
                      const diffMs = Date.now() - d.getTime();
                      const diffDays = diffMs / (1000 * 60 * 60 * 24);

                      if (diffDays <= 1) {
                        return (
                          <div className="badgesStack">
                            <span className="hotBadge">HOT</span>
                          </div>
                        );
                      }

                      if (diffDays <= 7) {
                        return (
                          <div className="badgesStack" style ={{ top: 4, left: 4 }}>
                            <span className="newBadge">NEW</span>
                          </div>
                        );
                      }

                      return null;
                    })()}
                  </div>
                  <div className="productCardContent">
                    <h3 className="productName">{product.name || "Produit sans nom"}</h3>
                    <p className="productReference">{product.reference}</p>
                    <div className="productPricing">
                      <span className="currentPrice">€{(product.price || 0).toFixed(2)}</span>
                    </div>
                    {product.quantity && product.quantity > 0 ? (
                      <span className="inStock">En stock 
                        
                          <span className="lowStockWarning"> {product.quantity}</span>
                        
                      </span>
                    ) : (
                      <span className="outOfStock">Rupture de stock</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="paginationControls">
              <button className="btnPagination" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1 || loading}>
                Précédent
              </button>
              <span>
                Page {page} / {totalPages}
              </span>
              <button className="btnPagination" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages || loading}>
                Suivant
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ProduitsList;