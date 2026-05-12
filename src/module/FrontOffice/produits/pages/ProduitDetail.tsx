import { useLocation } from "react-router-dom";
import FrontOfficeHeader from "../../include/FrontOfficeHeader";
import { getProductDetail, type ProductListItem } from "../../../Backoffice/produit/api/productsApi";
import { getProductAttributeGroups, type ProductAttributeGroupSelection } from "../../../Backoffice/attribue&Caracteristique/api/attributsCaracteristiquesApi";
import { getProductImageUrl } from "../../../../utils/helper";
import "../pages/produits.css";
import { useState, useEffect } from "react";

export function ProduitDetail() {
  const location = useLocation();
  const initialProduct = location.state?.product as ProductListItem;

  const [product, setProduct] = useState<any>(initialProduct || null);
  const [attributeGroups, setAttributeGroups] = useState<ProductAttributeGroupSelection[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [selectedAttributeValues, setSelectedAttributeValues] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialProduct) {
      setError("Produit non trouvé");
      return;
    }

    const loadProductDetails = async () => {
      try {
        setLoading(true);
        const details = await getProductDetail(initialProduct.id);
        setProduct(details);

        // Charger les attributs/variantes
        const attrs = await getProductAttributeGroups(initialProduct.id);
        console.log("ProduitDetail attributeGroups:", attrs);
        setAttributeGroups(attrs);

        setSelectedAttributeValues(
          attrs.reduce((accumulator, group) => {
            accumulator[group.group.id] = String(group.selectedValueId || "");
            return accumulator;
          }, {} as Record<number, string>)
        );
      } catch (err) {
        console.error("Erreur lors du chargement des détails:", err);
        setError("Impossible de charger les détails du produit");
      } finally {
        setLoading(false);
      }
    };

    loadProductDetails();
  }, [initialProduct]);

  if (error) {
    return (
      <div className="productsPage">
        <FrontOfficeHeader />
        <div className="productsShell">
          <p className="error">{error}</p>
        </div>
      </div>
    );
  }

  if (loading || !product) {
    return (
      <div className="productsPage">
        <FrontOfficeHeader />
        <div className="productsShell">
          <p className="loading">Chargement...</p>
        </div>
      </div>
    );
  }

  const handleAddToCart = () => {
    console.log("Ajouter au panier:", {
      productId: product.id,
      name: product.name,
      quantity,
      attributes: selectedAttributeValues,
      price: product.price,
    });
    alert(`${quantity}x "${product.name}" ajouté au panier!`);
  };

  return (
    <div className="productsPage">
      <FrontOfficeHeader />
      <div className="productDetailShell">
        
        <div className="detailContainer">
          {/* Image Section */}
          <div className="detailImageSection">
            <div className="detailImageWrapper">
              {product.id_default_image ? (
                <img
                  src={getProductImageUrl(product.id, product.id_default_image)}
                  alt={product.name}
                  className="detailImage"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://via.placeholder.com/500x500?text=Product";
                  }}
                />
              ) : (
                <img
                  src="https://via.placeholder.com/500x500?text=Product"
                  alt={product.name}
                  className="detailImage"
                />
              )}
              {product.on_sale && (
                <div className="discountBadgeLarge">-20%</div>
              )}
            </div>
          </div>

          {/* Info Section */}
          <div className="detailInfoSection">
            <h1 className="detailTitle">{product.name}</h1>

            <div className="detailBrand">
              <span className="brandLabel">Référence: {product.reference}</span>
            </div>

            {product.description_short && (
              <div className="detailDescription" dangerouslySetInnerHTML={{ __html: product.description_short }} >
              </div>
            )}

            {product.description && (
              <div className="detailFullDescription">
                <div dangerouslySetInnerHTML={{ __html: product.description }} />
              </div>
            )}

            {/* Pricing */}
            <div className="detailPricing">
              <div className="priceRow">
                <span className="priceLabel">Prix</span>
                <div className="prices">
                  <span className="detailCurrentPrice">€{(product.price || 0).toFixed(2)}</span>
                  {product.on_sale && (
                    <span className="savingBadge">PROMOTION</span>
                  )}
                </div>
              </div>
            </div>

            {/* Attributes Selection */}
            {attributeGroups.length > 0 && (
              <div className="detailAttributes">
                <h3 className="optionLabel">Attributs</h3>
                {attributeGroups.map((group) => (
                  <div key={group.group.id} className="detailOption">
                    <label className="optionLabel">{group.group.publicName || group.group.name}</label>
                    {group.group.isColorGroup ? (
                      <div className="colorGroup">
                        {group.values.map((value) => {
                          const isSelected = selectedAttributeValues[group.group.id] === String(value.id);
                          const swatchColor = value.color?.trim() || "#d8d8d8";

                          return (
                            <div key={value.id} className="colorSwatchItem">
                              <button
                                type="button"
                                className={`colorSwatch${isSelected ? " isSelected" : ""}`}
                                style={{ backgroundColor: swatchColor }}
                                title={value.name}
                                aria-label={`${group.group.publicName || group.group.name}: ${value.name}`}
                                onClick={() =>
                                  setSelectedAttributeValues((current) => ({
                                    ...current,
                                    [group.group.id]: String(value.id),
                                  }))
                                }
                              />
                              <span className="colorSwatchLabel">{value.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <select
                        value={selectedAttributeValues[group.group.id] ?? String(group.selectedValueId || "")}
                        onChange={(e) =>
                          setSelectedAttributeValues((current) => ({
                            ...current,
                            [group.group.id]: e.target.value,
                          }))
                        }
                        className="sizeSelect"
                      >
                        {group.values.map((value) => (
                          <option key={value.id} value={String(value.id)}>
                            {value.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}
              </div>
            )}
            {attributeGroups.length === 0 && (
              <p className="emptyState">Aucun attribut configuré pour ce produit.</p>
            )}

            {/* Quantity Selection */}
            <div className="detailOption">
              <label className="optionLabel">Quantité</label>
              <div className="quantityControl">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                />
                <button onClick={() => setQuantity(quantity + 1)}>+</button>
              </div>
            </div>

            {/* Add to Cart Button */}
            <button className="addToCartBtn" onClick={handleAddToCart}>
              🛒 AJOUTER AU PANIER
            </button>

            {/* Stock Status */}
            <div className="stockStatus">
              {product.quantity && product.quantity > 0 ? (
                <p className="inStock">✅ En stock ({product.quantity} unités)</p>
              ) : (
                <p className="outOfStock">❌ Rupture de stock</p>
              )}
            </div>

            {/* Wishlist Button */}
            {/* <button className="wishlistBtn">
              ♥ Ajouter à la sélection
            </button> */}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProduitDetail;