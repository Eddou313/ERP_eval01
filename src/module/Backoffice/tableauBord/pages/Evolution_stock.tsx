import { useEffect, useMemo, useState } from "react";
import { listStockMovements, listStockItems } from "../../stock/api/stockApi";
import { type StockMovement, type StockItem } from "../../stock/api/object";
import "./Evolution_stock.css";

type StockDayMetric = {
  date: string;
  movementCount: number;
  totalQuantity: number;
  movements: StockMovement[];
};

const ITEMS_PER_PAGE = 10;

function formatDayLabel(dateString: string): string {
  const parsed = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateString;
  return parsed.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function buildStockMetrics(movements: StockMovement[]): StockDayMetric[] {
  const grouped = new Map<string, StockDayMetric>();
  for (const movement of movements) {
    const date = String(movement.date || "").split(" ")[0] || "Inconnue";
    const quantity = Number(movement.quantity) || 0;

    // Determine sign: prefer explicit sign, otherwise infer from movementType, fallback to +1
    let sign = 1;
    if (typeof movement.sign === "number" && movement.sign !== 0) {
      sign = movement.sign > 0 ? 1 : -1;
    } else if (movement.movementType === "sale") {
      sign = -1;
    } else {
      sign = 1;
    }

    const signedQuantity = quantity * sign;
    
    const current = grouped.get(date) || { date, movementCount: 0, totalQuantity: 0, movements: [] };
    current.movementCount += 1;
    current.totalQuantity += signedQuantity;
    current.movements.push(movement);
    grouped.set(date, current);
  }
  return Array.from(grouped.values()).sort((a, b) => {
    const ta = new Date(a.date).getTime() || 0;
    const tb = new Date(b.date).getTime() || 0;
    return tb - ta;
  });
}

export function EvolutionStockPage() {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [itemsData, movementsData] = await Promise.all([
          listStockItems(),
          listStockMovements(),
        ]);
        setStockItems(itemsData);
        setStockMovements(movementsData);
        
        if (itemsData.length > 0) {
          setSelectedProductId(itemsData[0].id_product);
        }
        setCurrentPage(1);
      } catch (e: any) {
        setError(e?.message || "Erreur lors du chargement des données de stock");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const selectedProductMovements = useMemo(() => {
    if (!selectedProductId) return [];
    return stockMovements.filter(m => m.id_product === selectedProductId);
  }, [stockMovements, selectedProductId]);

  const stockMetrics = useMemo(
    () => buildStockMetrics(selectedProductMovements),
    [selectedProductMovements]
  );

  const selectedProduct = useMemo(
    () => stockItems.find(item => item.id_product === selectedProductId),
    [stockItems, selectedProductId]
  );

  // Pagination
  const totalPages = Math.ceil(stockMetrics.length / ITEMS_PER_PAGE);
  const paginatedMetrics = useMemo(() => {
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    return stockMetrics.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  }, [stockMetrics, currentPage]);

  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedProductId(Number(e.target.value));
    setCurrentPage(1);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  return (
    <main className="ev-page">
      {/* ── En-tête ─────────────────────────────────────────── */}
      {/* <header className="ev-header">
        <h1 className="ev-title">Évolution du stock journalier</h1>
        <p className="ev-subtitle">
          Consultez les mouvements de stock par produit et par jour
        </p>
      </header> */}

      {/* ── États de chargement et erreur ────────────────────── */}
      {loading && <p className="ev-state">Chargement des données…</p>}
      {error && <p className="ev-state ev-state--error">{error}</p>}

      {/* ── Contenu ─────────────────────────────────────────── */}
      {!loading && !error && (
        <>
          {/* ── Sélecteur de produit ────────────────────────── */}
          {stockItems.length === 0 ? (
            <p className="ev-empty">Aucun produit trouvé.</p>
          ) : (
            <>
              <section className="ev-selector-section">
                <div className="ev-selector-group">
                  <label htmlFor="product-select" className="ev-label">
                    Sélectionner un produit :
                  </label>
                  <select
                    id="product-select"
                    value={selectedProductId || ""}
                    onChange={handleProductChange}
                    className="ev-select"
                  >
                    {stockItems.map((item) => (
                      <option key={item.id_product} value={item.id_product}>
                        {item.productName} {item.reference ? `(${item.reference})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* ── Info produit ────────────────────────────── */}
                {selectedProduct && (
                  <div className="ev-product-info">
                    <div className="ev-info-item">
                      <span className="ev-info-label">Produit :</span>
                      <span className="ev-info-value">{selectedProduct.productName}</span>
                    </div>
                    <div className="ev-info-item">
                      <span className="ev-info-label">Référence :</span>
                      <span className="ev-info-value">{selectedProduct.reference || "—"}</span>
                    </div>
                    <div className="ev-info-item">
                      <span className="ev-info-label">Stock actuel :</span>
                      <span className="ev-info-value ev-stock-current">
                        {selectedProduct.availableQuantity}
                      </span>
                    </div>
                    <div className="ev-info-item">
                      <span className="ev-info-label">Statut :</span>
                      <span
                        className={`ev-badge ev-badge--${selectedProduct.status}`}
                      >
                        {selectedProduct.status === "in_stock"
                          ? "En stock"
                          : selectedProduct.status === "low_stock"
                          ? "Stock faible"
                          : "Rupture de stock"}
                      </span>
                    </div>
                  </div>
                )}
              </section>

              {/* ── Tableau ─────────────────────────────────── */}
              <section className="ev-table-section">
                <h2 className="ev-section-title">
                  Mouvements de stock
                  {stockMetrics.length > 0 && (
                    <span className="ev-count">({stockMetrics.length} jours)</span>
                  )}
                </h2>

                {stockMetrics.length === 0 ? (
                  <p className="ev-empty">Aucun mouvement de stock pour ce produit.</p>
                ) : (
                  <>
                    <div className="ev-table-wrap">
                      <table className="ev-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Mouvements</th>
                            <th>Quantité nette</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedMetrics.map((day) => (
                            <tr key={day.date}>
                              <td className="ev-date">{formatDayLabel(day.date)}</td>
                              <td className="ev-num ev-movements">{day.movementCount}</td>
                              <td
                                className={`ev-num ev-quantity ${
                                  day.totalQuantity >= 0
                                    ? "ev-quantity--positive"
                                    : "ev-quantity--negative"
                                }`}
                              >
                                {day.totalQuantity >= 0 ? "+" : ""}
                                {day.totalQuantity}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* ── Pagination ──────────────────────────── */}
                    {totalPages > 1 && (
                      <div className="ev-pagination">
                        <button
                          onClick={handlePreviousPage}
                          disabled={currentPage === 1}
                          className="ev-pagination-btn"
                        >
                          ← Précédent
                        </button>

                        <div className="ev-pagination-info">
                          Page <span className="ev-page-current">{currentPage}</span> sur{" "}
                          <span className="ev-page-total">{totalPages}</span>
                        </div>

                        <button
                          onClick={handleNextPage}
                          disabled={currentPage === totalPages}
                          className="ev-pagination-btn"
                        >
                          Suivant →
                        </button>
                      </div>
                    )}
                  </>
                )}
              </section>
            </>
          )}
        </>
      )}
    </main>
  );
}

export default EvolutionStockPage;
