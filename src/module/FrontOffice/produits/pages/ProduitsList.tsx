import { useNavigate } from "react-router-dom";
import FrontOfficeHeader from "../../include/FrontOfficeHeader";
import {  type ProductListItem } from "../../../Backoffice/produit/api/object";
import "../pages/produits.css";
import { IconFilter } from '@tabler/icons-react';
import ProduitsGrid from "./ProduitsGrid.tsx";
import { useProduitsList } from "./useProduitsList.ts";

export function ProduitsList() {
  const navigate = useNavigate();
  const {
    loading,
    error,
    page,
    setPage,
    criteria,
    setCriteria,
    categories,
    filteredProducts,
    paginatedProducts,
    totalPages,
    totalProducts,
    applyFilters,
    resetFilters,
  } = useProduitsList(8);

  const handleProductClick = (product: ProductListItem) => {
    navigate(`/produit/${product.id}`, { state: { product } });
  };

  const handleFilterSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    applyFilters();
  };

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
            <button type="button" onClick={resetFilters}>Initialiser</button>
          </form>
        </div>

        {loading && <p className="loading">Chargement des produits...</p>}

        {error && <p className="error">{error}</p>}

        {!loading && !error && totalProducts === 0 && (
          <p className="noProducts">Aucun produit disponible pour le moment.</p>
        )}

        {!loading && !error && totalProducts > 0 && filteredProducts.length === 0 && (
          <p className="noProducts">Aucun produit ne correspond aux filtres selectionnes.</p>
        )}

        {!loading && !error && paginatedProducts.length > 0 && (
          <>
            <ProduitsGrid products={paginatedProducts} onProductClick={handleProductClick} />

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