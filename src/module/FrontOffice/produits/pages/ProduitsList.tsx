import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import FrontOfficeHeader from "../../include/FrontOfficeHeader";
import { listProductsLightPaginated, listProductIds, type ProductListItem } from "../../../Backoffice/produit/api/productsApi";
import { getProductImageUrl } from "../../../../utils/helper";
import "../pages/produits.css";

export function ProduitsList() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const pageSize = 8;

  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalProducts / pageSize)), [totalProducts]);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        const allIds = await listProductIds();
        setTotalProducts(allIds.length);
        const offset = (page - 1) * pageSize;
        // Récupérer les produits depuis l'API PrestaShop
        const productsData = await listProductsLightPaginated(pageSize, offset);
        setProducts(productsData);
      } catch (err) {
        console.error("Erreur lors du chargement des produits:", err);
        setError("Impossible de charger les produits. Vérifiez votre connexion à PrestaShop.");
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [page]);

  const handleProductClick = (product: ProductListItem) => {
    navigate(`/produit/${product.id}`, { state: { product } });
  };

  return (
    <div className="productsPage">
      <FrontOfficeHeader />
      <div className="productsShell">
        <div className="productsIntro">
          <h1>Nos Produits</h1>
          <p className="introText">Découvrez notre large gamme de produits de qualité avec des designs uniques et inspirants.</p>
        </div>

        {loading && <p className="loading">Chargement des produits...</p>}

        {error && <p className="error">{error}</p>}

        {!loading && !error && products.length === 0 && (
          <p className="noProducts">Aucun produit disponible pour le moment.</p>
        )}

        {!loading && !error && products.length > 0 && (
          <>
            <div className="productsGrid">
              {products.map((product) => (
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
                      <span className="inStock">En stock</span>
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