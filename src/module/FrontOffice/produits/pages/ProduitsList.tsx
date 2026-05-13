import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import FrontOfficeHeader from "../../include/FrontOfficeHeader";
import { listProductsLight, type ProductListItem } from "../../../Backoffice/produit/api/productsApi";
import { getProductImageUrl } from "../../../../utils/helper";
import "../pages/produits.css";

export function ProduitsList() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        // Récupérer les produits depuis l'API PrestaShop
        const productsData = await listProductsLight(20); // Limiter à 20 produits
        setProducts(productsData);
      } catch (err) {
        console.error("Erreur lors du chargement des produits:", err);
        setError("Impossible de charger les produits. Vérifiez votre connexion à PrestaShop.");
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

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
          <div className="productsGrid">
            {products.map((product) => (
              <div
                key={product.id}
                className="productCard"
                onClick={() => handleProductClick(product)}
                style={{ cursor: "pointer" }}
              >
                <div className="productImageWrap">
                  {product.id_default_image && (
                    <img
                      src={getProductImageUrl(product.id, product.id_default_image)}
                      alt={product.name}
                      className="productImage"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://via.placeholder.com/250x250?text=No+Image";
                      }}
                    />
                  )}
                  {!product.id_default_image && (
                    <img
                      src="https://via.placeholder.com/250x250?text=No+Image"
                      alt={product.name}
                      className="productImage"
                    />
                  )}
                  {product.on_sale && (
                    <div className="badgesStack">
                      <span className="discountBadge">-20%</span>
                    </div>
                  )}
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
        )}
      </div>
    </div>
  );
}

export default ProduitsList;