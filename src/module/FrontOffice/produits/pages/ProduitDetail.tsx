import {  useLocation, useNavigate } from "react-router-dom";
import FrontOfficeHeader from "../../include/FrontOfficeHeader";
import { getProductDetail, type ProductListItem } from "../../../Backoffice/produit/api/productsApi";
import { getProductAttributeGroups, type ProductAttributeGroupSelection } from "../../../Backoffice/attribue&Caracteristique/api/attributsCaracteristiquesApi";
import { getStockByProductId } from "../../../Backoffice/stock/api/stockApi";
import { addProductToCart, createCartForConnectedCustomer, getLatestCartForCustomerId, getOrCreateGuestCart } from "../../../Backoffice/panier/api/panierApi";
import { getStoredClientSession } from "../../client/api/clientAPI";
import { getProductImageUrl } from "../../../../utils/helper";
import "../pages/produits.css";
import { useState, useEffect } from "react";

export function ProduitDetail() {
  const location = useLocation();
  const initialProduct = location.state?.product as ProductListItem;
  const navigate = useNavigate();

  const [product, setProduct] = useState<any>(initialProduct || null);
  const [attributeGroups, setAttributeGroups] = useState<ProductAttributeGroupSelection[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [selectedAttributeValues, setSelectedAttributeValues] = useState<Record<number, string>>({});
  const [availableStock, setAvailableStock] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

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

  // Fonction utilitaire: vérifie le stock pour un mapping d'attributs donné
  const findMatchingCombination = (attributes: Record<number, string>) => {
    const combinations = attributeGroups.flatMap((g) => g.combinations || []);
    const uniqueCombinations = Array.from(
      new Map(combinations.map((comb) => [Number((comb as any).id), comb])).values()
    );

    if (attributeGroups.length > 0 && uniqueCombinations.length === 0) {
      return null;
    }

    if (attributeGroups.length === 0 && uniqueCombinations.length === 0) {
      return { id: 0, attributes: [] as Array<{ groupId: number; valueId: number }> };
    }

    return uniqueCombinations.find((comb: any) => {
      if (!comb.attributes || comb.attributes.length === 0) {
        return false;
      }

      if (comb.attributes.length !== Object.keys(attributes).length) {
        return false;
      }

      return Object.entries(attributes).every(([gId, val]) => {
        const gid = Number(gId);
        const vid = Number(val);
        return comb.attributes?.some((a: any) => Number(a.groupId) === gid && Number(a.valueId) === vid);
      });
    }) || null;
  };

  const verifyStockForAttributes = async (attributes: Record<number, string>) => {
    try {
      if (!product?.id) return null;

      const match = findMatchingCombination(attributes);

      // Produit avec attributs mais combinaisons absentes => ne pas retomber sur stock total
      if (attributeGroups.length > 0 && !match) {
        setAvailableStock(0);
        return 0;
      }

      // Produit simple: id_product_attribute = 0
      if (attributeGroups.length === 0 && (!match || Number((match as any).id) === 0)) {
        const simpleStock = await getStockByProductId(product.id);
        setAvailableStock(simpleStock ?? 0);
        return simpleStock;
      }

      if (match && match.id) {
        const comboId = Number(match.id);
        const stock = await getStockByProductId(product.id, comboId);
        setAvailableStock(stock ?? 0);
        console.log(`Stock vérifié pour combinaison ${comboId}:`, stock);
        return stock;
      }

      // Produit à déclinaisons mais combinaison non trouvée => stock 0
      setAvailableStock(0);
      console.log("Aucune combinaison correspondante trouvée pour", attributes);
      return 0;
    } catch (err) {
      console.error("Erreur vérification stock:", err);
      setAvailableStock(0);
      return null;
    }
  };

  // Vérifier automatiquement le stock réel à chaque changement d'attributs
  useEffect(() => {
    if (!product?.id) {
      return;
    }

    // Attendre que les sélections par défaut soient disponibles
    if (attributeGroups.length > 0 && Object.keys(selectedAttributeValues).length === 0) {
      return;
    }

    verifyStockForAttributes(selectedAttributeValues);
  }, [product?.id, attributeGroups, selectedAttributeValues]);

  const handleAddToCart = async () => {
    try {
      if (!product?.id) return;

      const match = findMatchingCombination(selectedAttributeValues);
      const comboId = match && Number(match.id) > 0 ? Number(match.id) : 0;

      if (attributeGroups.length > 0 && comboId === 0) {
        alert("Veuillez choisir une combinaison valide.");
        return;
      }

      if (availableStock !== null && availableStock > 0 && quantity > availableStock) {
        alert(`Stock insuffisant. Disponible: ${availableStock}`);
        return;
      }

      setIsAddingToCart(true);

      const session = getStoredClientSession();
      const customerId = Number(session?.id || 0);

      if (customerId > 0) {
        const latestCart = await getLatestCartForCustomerId(customerId);
        const targetCart = latestCart ?? (await createCartForConnectedCustomer(customerId));

        if (!targetCart) {
          throw new Error("Impossible de récupérer le panier client");
        }

        const updatedCart = await addProductToCart({
          cartId: typeof targetCart === "number" ? targetCart : targetCart.id,
          customerId,
          id_product: product.id,
          id_product_attribute: comboId,
          quantity,
        });

        console.log("Panier client mis à jour:", updatedCart);
        alert(`${quantity}x "${product.name}" ajouté au panier`);
        return;
      }

      const guestCart = await getOrCreateGuestCart();
      if (!guestCart) {
        throw new Error("Impossible de créer le panier invité");
      }

      const updatedCart = await addProductToCart({
        cartId: guestCart.id,
        customerId: 0,
        id_product: product.id,
        id_product_attribute: comboId,
        quantity,
      });

      console.log("Panier invité mis à jour:", updatedCart);
      navigate("/panier");
      // alert(`${quantity}x "${product.name}" ajouté au panier`);
    } catch (err) {
      console.error("Erreur ajout panier:", err);
      alert("Impossible d'ajouter le produit au panier.");
    } finally {
      setIsAddingToCart(false);
    }
  };

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
            <button className="addToCartBtn" onClick={handleAddToCart} disabled={isAddingToCart}>
              {isAddingToCart ? "AJOUT AU PANIER..." : "🛒 AJOUTER AU PANIER"}
            </button>

            {/* Stock Status */}
            <div className="stockStatus">
              {availableStock !== null ? (
                availableStock > 0 ? (
                  <p className="inStock">✅ En stock ({availableStock} unités)</p>
                ) : (
                  <p className="outOfStock">❌ Rupture de stock</p>
                )
              ) : product.quantity && product.quantity > 0 ? (
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