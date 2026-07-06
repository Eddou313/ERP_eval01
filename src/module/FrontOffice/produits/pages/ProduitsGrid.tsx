import { getProductImageUrl, formatCurrency } from "../../../../utils/helper";
import type { ProductListItem } from "../../../Backoffice/produit/api/object";
import { useEffect, useState } from "react";
import { AUTH_STATIC_EMAIL, loginEmployee } from "../../../Backoffice/auth/api/authAPI";
import { listCategoriesLight, ReduireAllProductDansCategoryId, type StockReductionSummary } from "../../../Backoffice/categorie/api/categoriesApi";
import type { CategoryListItem } from "../../../Backoffice/categorie/api/object";
import { useNavigate } from "react-router-dom";

type ProduitsGridProps = {
  products: ProductListItem[];
  onProductClick: (product: ProductListItem) => void;
};



function ProduitsGrid({ products, onProductClick }: ProduitsGridProps) {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [authPassword, setAuthPassword] = useState("randrianarison");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number>(0);
  const [reductionAmount, setReductionAmount] = useState<number>(0);
  const [category, setCategory] = useState<CategoryListItem[]>([]);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [reductionModalOpen, setReductionModalOpen] = useState(false);
  const [summary, setSummary] = useState<StockReductionSummary | null>(null);
  const [authError, setAuthError] = useState("");
  const [formError, setFormError] = useState("");

  const [selectedCategoryId2, setSelectedCategoryId2] = useState<number>(0);
  const [augmentationAmount, setAugmentationAmount] = useState<number>(0);

  function closeAllModals() {
    setAuthModalOpen(false);
    setReductionModalOpen(false);
    setSummary(null);
    setAuthError("");
    setFormError("");
    setAuthPassword("");
    setSelectedCategoryId(0);
    setReductionAmount(0);
    setSaving(false);
  }

  function openAuthModal() {
    setAuthError("");
    setFormError("");
    setSummary(null);
    setAuthPassword("");
    setAuthModalOpen(true);
    setReductionModalOpen(false);
  }

  async function confirmAuth() {
    setSaving(true);
    setAuthError("");

    try {
      await loginEmployee(AUTH_STATIC_EMAIL, authPassword);
      setAuthModalOpen(false);
      setReductionModalOpen(true);
      setFormError("");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Connexion impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmReduction() {
    if(!selectedCategoryId2 && !selectedCategoryId) {
      setFormError("Veuillez choisir une catégorie.");
      return;
    }

    // if (!Number.isFinite(reductionAmount) || reductionAmount <= 0 && !Number.isFinite(augmentationAmount) || augmentationAmount <= 0) {
      // setFormError("Veuillez saisir un nombre de réduction supérieur à 0.");
      // return;
    // }

    setSaving(true);
    setFormError("");

    try {
      const update = await ReduireAllProductDansCategoryId(selectedCategoryId, reductionAmount,selectedCategoryId2,augmentationAmount);
      console.log(selectedCategoryId,"-",reductionAmount,"//",selectedCategoryId2,"+",augmentationAmount);
      setSummary(update);
      setReductionModalOpen(false);
      navigate("/resultat/reduction", { state: { summary: update } });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Réduction impossible.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    const a = async () => {
      try {
        const allCaterory = await listCategoriesLight();
        setCategory(allCaterory);
      }
      catch (error: any) {
        console.log(error.message);
      }
    }
    a();
  }, []);

  return (
    <div className="productsGrid">
      {products.map((product) => (
        <div
          key={(product as any).combination_id ? `${product.id}-${(product as any).combination_id}` : product.id}
          className="productCard"
          onClick={() => onProductClick(product)}
          style={{ cursor: "pointer" }}
        >
          <div className="productImageWrap">
            {product.id_default_image ? (
              <img
                src={getProductImageUrl(product.id, product.id_default_image)}
                alt={product.name}
                className="productImage"
                onError={(event) => {
                  (event.target as HTMLImageElement).src =
                    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="250" height="250"%3E%3Crect fill="%23f0f0f0" width="250" height="250"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-size="14"%3ENo Image%3C/text%3E%3C/svg%3E';
                }}
              />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="250" height="250" viewBox="0 0 250 250" className="productImage">
                <rect fill="#f0f0f0" width="250" height="250" />
                <text x="50%" y="50%" textAnchor="middle" dy=".3em" fill="#999" fontSize="14">
                  No Image
                </text>
              </svg>
            )}
            {(() => {
              const dateStr = product.available_date || "";
              if (!dateStr) return null;

              const date = new Date(dateStr);
              if (Number.isNaN(date.getTime())) return null;

              const diffDays = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);

              if (diffDays <= 1) {
                return (
                  <div className="badgesStack">
                    <span className="hotBadge">HOT</span>
                  </div>
                );
              }

              if (diffDays <= 7) {
                return (
                  <div className="badgesStack" style={{ top: 4, left: 4 }}>
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
              {(() => {
                const taxRate = Number(product.tax_rate ?? 20) || 0;
                // Use `price_ht` when available (HT), otherwise fall back to `price`.
                // `price` from the API for simple products is already the final price (TTC),
                // while combination entries set `price` to HT earlier. Prioritize `price_ht` to avoid double-taxing.
                const priceHt = Number((product as any).price_ht ?? product.price ?? 0) || 0;
                // Calculate TTC and round to 2 decimals for proper display
                const priceTtc = Math.round(priceHt * (1 + taxRate / 100) * 100) / 100;
                return (
                  <>
                    <span className="currentPrice">{formatCurrency(priceTtc)}</span>
                    {(product as any).wholesale_price !== undefined && (product as any).wholesale_price !== null ? (
                      <span className="wholesalePrice">Achat: {formatCurrency(Number((product as any).wholesale_price) || 0)}</span>
                    ) : null}
                  </>
                );
              })()}
              <span className="currentPrice">date de disponibilité: {product.available_date}</span>
            </div>
            {product.quantity && product.quantity > 0 ? (
              <span className="inStock">
                En stock <span className="lowStockWarning"> {product.quantity}</span>
              </span>
            ) : (
              <span className="outOfStock">Rupture de stock</span>
            )}
          </div>
          <button
            type="button"
            className="reduceStockButton"
            onClick={(event) => {
              event.stopPropagation();
              openAuthModal();
            }}
          >
            Reduire stock
          </button>
        </div>
      ))}

      {authModalOpen && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Authentification admin</h3>
            <div className="modal-row">
              <label htmlFor="adminPassword">Mot de passe</label>
              <input
                id="adminPassword"
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="Mot de passe de l'administration"
              />
            </div>
            {authError ? <p className="modalError">{authError}</p> : null}
            <div className="modal-actions">
              <button type="button" className="btn" onClick={closeAllModals} disabled={saving}>Annuler</button>
              <button type="button" className="btn btn-adjust" onClick={confirmAuth} disabled={saving}>
                {saving ? "Vérification..." : "Valider"}
              </button>
            </div>
          </div>
        </div>
      )}

      {reductionModalOpen && (
        <div className="modal-backdrop">
          <div className="modal modalLarge">
            <h3>augment de stock par catégorie</h3>
            <div className="modal-row">
              <label htmlFor="category">Catégorie</label>
              <select
                name="category"
                id="category"
                value={selectedCategoryId2}
                onChange={(e) => setSelectedCategoryId2(Number(e.target.value))}
              >
                <option value={0}>Sélectionner une catégorie</option>
                {category.map((item) => (
                  <option key={item.id} value={item.id}>
                    id {item.id} - {item.name || "sans nom"}
                  </option>
                ))}
              </select>
            </div>
            <div className="modal-row">
              <label htmlFor="number">Augmentation par produit</label>
              <input
                type="number"
                id="number"
                min={1}
                step={1}
                value={augmentationAmount}
                onChange={(e) => setAugmentationAmount(Number(e.target.value))}
              />
            </div>

            <br></br>
            <h3>Réduction de stock par catégorie</h3>
            <div className="modal-row">
              <label htmlFor="category">Catégorie</label>
              <select
                name="category"
                id="category"
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(Number(e.target.value))}
              >
                <option value={0}>Sélectionner une catégorie</option>
                {category.map((item) => (
                  <option key={item.id} value={item.id}>
                    id {item.id} - {item.name || "sans nom"}
                  </option>
                ))}
              </select>
            </div>
            <div className="modal-row">
              <label htmlFor="number">Réduction par produit</label>
              <input
                type="number"
                id="number"
                min={1}
                step={1}
                value={reductionAmount}
                onChange={(e) => setReductionAmount(Number(e.target.value))}
              />
            </div>
            <p className="modalHint">
              La réduction appliquée à chaque produit est plafonnée à son stock actuel pour éviter toute valeur négative.
            </p>
            {formError ? <p className="modalError">{formError}</p> : null}
            <div className="modal-actions">
              <button type="button" className="btn" onClick={closeAllModals} disabled={saving}>Annuler</button>
              <button type="button" className="btn btn-adjust" onClick={confirmReduction} disabled={saving}>
                {saving ? "Application..." : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>

  );
}

export default ProduitsGrid;