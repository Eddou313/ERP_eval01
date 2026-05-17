import { useLocation, useNavigate } from "react-router-dom";
import FrontOfficeHeader from "../../include/FrontOfficeHeader";
import { getProductDetail } from "../../../Backoffice/produit/api/productsApi";
import { type ProductListItem } from "../../../Backoffice/produit/api/object";
import { getProductAttributeGroups } from "../../../Backoffice/attribue&Caracteristique/api/attributsCaracteristiquesApi";
import {  type ProductAttributeGroupSelection } from "../../../Backoffice/attribue&Caracteristique/api/Objet";
import { getStockByProductId } from "../../../Backoffice/stock/api/stockApi";
import { addProductToCart, createCartForConnectedCustomer, getLatestCartForCustomerId, getOrCreateGuestCart } from "../../../Backoffice/panier/api/panierApi";
import { getStoredClientSession } from "../../client/api/clientAPI";
import { getProductImageUrl } from "../../../../utils/helper";
import "../pages/produits.css";
import { useState, useEffect, useMemo } from "react";

export function ProduitDetail() {
  const location = useLocation();
  const initialProduct = location.state?.product as ProductListItem;
  const navigate = useNavigate();

  const [product, setProduct] = useState<any>(initialProduct || null);
  const [attributeGroups, setAttributeGroups] = useState<ProductAttributeGroupSelection[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [selectedAttributeValues, setSelectedAttributeValues] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [availableStock, setAvailableStock] = useState<number>(0);

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

        // If navigation provided a combination_id, preselect its attribute values
        const navComboId = (location.state as any)?.combination_id ?? (initialProduct as any)?.combination_id;

        if (navComboId) {
          // find the combination object in the loaded attribute groups
          const allCombinations = attrs.flatMap((g) => g.combinations || []);
          const found = allCombinations.find((c) => Number((c as any).id) === Number(navComboId));
          if (found && (found as any).attributes && (found as any).attributes.length > 0) {
            const mapping = (found as any).attributes.reduce((acc: Record<number, string>, a: any) => {
              acc[a.groupId] = String(a.valueId);
              return acc;
            }, {} as Record<number, string>);
            setSelectedAttributeValues(mapping);
            // verify stock for this combination immediately
            setTimeout(() => verifyStockForAttributes(mapping), 0);
          } else {
            setSelectedAttributeValues(
              attrs.reduce((accumulator, group) => {
                accumulator[group.group.id] = String(group.selectedValueId || "");
                return accumulator;
              }, {} as Record<number, string>)
            );
          }
        } else {
          setSelectedAttributeValues(
            attrs.reduce((accumulator, group) => {
              accumulator[group.group.id] = String(group.selectedValueId || "");
              return accumulator;
            }, {} as Record<number, string>)
          );
        }
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
      if (!product?.id) return 0;

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
        const fallback = Number((match as any).quantity) || 0;
        const finalStock = stock ?? fallback;
        setAvailableStock(finalStock);
        console.log(`Stock vérifié pour combinaison ${comboId}:`, stock, "fallback:", fallback);
        return finalStock;
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

  const priceBreakdown = useMemo(() => {
    const match = findMatchingCombination(selectedAttributeValues) as any;
    const basePrice = Number(product?.base_price ?? product?.price ?? 0);
    const comboImpact = Number(match?.price ?? 0);
    const priceAfterCombination = Math.max(0, basePrice + comboImpact);

    const reductionAmount = Number(product?.reduction_amount ?? 0) || (product?.on_sale ? priceAfterCombination * 0.2 : 0);
    const priceHt = Math.max(0, priceAfterCombination - reductionAmount);
    const taxRate = Number(product?.tax_rate ?? 20) || 0;
    const taxAmount = priceHt * (taxRate / 100);
    const finalPrice = priceHt + taxAmount;

    console.log(
      "Formule prix produit:",
      `(${basePrice.toFixed(2)} + ${comboImpact.toFixed(2)} - ${reductionAmount.toFixed(2)}) + taxe(${taxRate.toFixed(2)}%) = ${finalPrice.toFixed(2)}`,
      {
        basePrice,
        comboImpact,
        priceAfterCombination,
        reductionAmount,
        priceHt,
        taxRate,
        taxAmount,
        finalPrice,
        selectedAttributeValues,
      },
    );

    return {
      basePrice,
      comboImpact,
      reductionAmount,
      taxRate,
      taxAmount,
      priceHt,
      finalPrice,
    };
  }, [product, selectedAttributeValues, attributeGroups]);

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
        // alert(`${quantity}x "${product.name}" ajouté au panier`);
        navigate("/panier");
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
                // <div className="discountBadgeLarge">-20%</div>
                <div></div>
              )}
              {/* Availability badge in detail */}
              {(() => {
                const dateStr = product.available_date || product.date_add || "";
                if (!dateStr) return null;
                const d = new Date(dateStr);
                if (isNaN(d.getTime())) return null;
                const diffMs = Date.now() - d.getTime();
                const diffDays = diffMs / (1000 * 60 * 60 * 24);

                if (diffDays <= 1) {
                  return <div className="badgeLarge hotBadgeLarge">HOT</div>;
                }

                if (diffDays <= 7) {
                  return <div className="badgeLarge newBadgeLarge">NEW</div>;
                }

                return null;
              })()}
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
                  <span className="detailCurrentPrice">€{priceBreakdown.finalPrice.toFixed(2)}</span>
                  {product.on_sale && (
                    <span className="savingBadge">PROMOTION</span>
                  )}
                </div>
              </div>
              {/* <div className="priceBreakdown">
                <div className="priceBreakdownRow">
                  <span>Prix réel produit</span>
                  <strong>€{priceBreakdown.basePrice.toFixed(2)}</strong>
                </div>
                <div className="priceBreakdownRow">
                  <span>Impact prix combinaison</span>
                  <strong>{priceBreakdown.comboImpact >= 0 ? "+" : ""}€{priceBreakdown.comboImpact.toFixed(2)}</strong>
                </div>
                <div className="priceBreakdownRow">
                  <span>Réduction appliquée</span>
                  <strong>-€{priceBreakdown.reductionAmount.toFixed(2)}</strong>
                </div>
                <div className="priceBreakdownRow">
                  <span>Taxe appliquée ({priceBreakdown.taxRate.toFixed(2)}%)</span>
                  <strong>€{priceBreakdown.taxAmount.toFixed(2)}</strong>
                </div>
              </div> */}
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
            <button
              className="addToCartBtn"
              onClick={handleAddToCart}
              disabled={
                isAddingToCart ||
                availableStock <= 0 ||
                quantity > availableStock
              }
            >
              {isAddingToCart
                ? "AJOUT AU PANIER..."
                : availableStock <= 0
                  ? "RUPTURE DE STOCK"
                  : "🛒 AJOUTER AU PANIER"}
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