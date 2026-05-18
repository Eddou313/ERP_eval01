import React, { useEffect, useState, type JSX } from "react";
import { listStockItems } from "../../stock/api/stockApi";
import { getProduct } from "../../produit/api/productsApi";
import { numFromUnknown, textFromUnknown } from "../../../../utils/helper";
import { requestPrestashopXml } from "../../../../utils/prestashopClient";

type CategoryRow = {
  categoryId: number;
  categoryName: string;
  qtePhysique: number;
  qteReservee: number;
  qteDisponible: number;
};

export function StockDashboard(): JSX.Element {
  const [rows, setRows] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  // États calculés pour les cartes KPI globales
  const [totals, setTotals] = useState({ physique: 0, reservee: 0, disponible: 0 });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const items = await listStockItems();

        const productCategoryCache = new Map<number, number>();
        const categoryNameCache = new Map<number, string>();
        const agg = new Map<number, CategoryRow>();

        for (const item of items) {
          const productId = numFromUnknown(item.id_product);
          let categoryId = productCategoryCache.get(productId);

          if (categoryId === undefined) {
            try {
              const prod = await getProduct(productId).catch(() => null);
              categoryId = prod?.id_category_default ?? 0;
            } catch {
              categoryId = 0;
            }
            productCategoryCache.set(productId, categoryId);
          }

          const existing = agg.get(categoryId) ?? { categoryId, categoryName: "", qtePhysique: 0, qteReservee: 0, qteDisponible: 0 };
          existing.qtePhysique += Number(item.physicalQuantity || 0);
          existing.qteReservee += Number(item.reservedQuantity || 0);
          existing.qteDisponible += Number(item.availableQuantity || 0);
          agg.set(categoryId, existing);
        }

        // Resolve category names
        for (const [catId, row] of agg.entries()) {
          if (catId === 0) {
            row.categoryName = "Sans catégorie";
            continue;
          }
          let name = categoryNameCache.get(catId);
          if (!name) {
            try {
              const resp = await requestPrestashopXml<any>(`/categories/${catId}`);
              name = textFromUnknown(resp?.prestashop?.category?.name) || `Catégorie ${catId}`;
            } catch {
              name = `Catégorie ${catId}`;
            }
            categoryNameCache.set(catId, name);
          }
          row.categoryName = name;
        }

        const result = Array.from(agg.values()).sort((a, b) => b.qteDisponible - a.qteDisponible);
        
        if (mounted) {
          setRows(result);
          
          // Calcul des totaux généraux
          const globalTotals = result.reduce(
            (acc, curr) => {
              acc.physique += curr.qtePhysique;
              acc.reservee += curr.qteReservee;
              acc.disponible += curr.qteDisponible;
              return acc;
            },
            { physique: 0, reservee: 0, disponible: 0 }
          );
          setTotals(globalTotals);
        }
      } catch (err) {
        console.error("Erreur récupération état du stock:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div style={styles.loading}>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <div style={styles.spinner}></div>
        <p>Chargement de l'état du stock...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.mainTitle}>État du stock</h2>

      {/* section des KPI Cards */}
      <div style={styles.kpiGrid}>
        <div style={styles.card}>
          <span style={styles.cardLabel}>Quantité Physique Totale</span>
          <span style={{ ...styles.cardValue, color: "#475569" }}>
            {totals.physique.toLocaleString("fr-FR")}
          </span>
        </div>
        
        <div style={styles.card}>
          <span style={styles.cardLabel}>Quantité Réservée</span>
          <span style={{ ...styles.cardValue, color: "#f59e0b" }}>
            {totals.reservee.toLocaleString("fr-FR")}
          </span>
        </div>

        <div style={styles.card}>
          <span style={styles.cardLabel}>Quantité Disponible</span>
          <span style={{ ...styles.cardValue, color: "#10b981" }}>
            {totals.disponible.toLocaleString("fr-FR")}
          </span>
        </div>
      </div>

      <h3 style={styles.sectionTitle}>Détail par catégorie</h3>
      
      {/* Section Tableau */}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, textAlign: "left" }}>Catégorie</th>
              <th style={styles.th}>Qté physique</th>
              <th style={styles.th}>Qté réservée</th>
              <th style={styles.th}>Qté disponible</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((item, index) => (
              <tr 
                key={item.categoryId} 
                style={index % 2 === 0 ? styles.trEven : styles.trOdd}
              >
                <td style={{ ...styles.td, textAlign: "left", fontWeight: 500 }}>
                  {item.categoryName}
                </td>
                <td style={styles.td}>{item.qtePhysique.toLocaleString("fr-FR")}</td>
                <td style={{ ...styles.td, color: item.qteReservee > 0 ? "#f59e0b" : "#334155" }}>
                  {item.qteReservee.toLocaleString("fr-FR")}
                </td>
                <td style={{ 
                  ...styles.td, 
                  fontWeight: "bold", 
                  color: item.qteDisponible > 5 ? "#10b981" : item.qteDisponible > 0 ? "#f59e0b" : "#ef4444"
                }}>
                  {item.qteDisponible.toLocaleString("fr-FR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Design system unifié
const styles = {
  container: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    padding: "24px",
    backgroundColor: "transparent",
    marginRight: "20px",
    minHeight: "100vh",
    color: "#1e293b",
  },
  mainTitle: {
    fontSize: "28px",
    fontWeight: 700,
    marginBottom: "24px",
    color: "#0f172a",
  },
  sectionTitle: {
    fontSize: "20px",
    fontWeight: 600,
    marginTop: "32px",
    marginBottom: "16px",
    color: "#334155",
  },
  kpiGrid: {
    display: "flex",
    gap: "16px",
    flexWrap: "wrap" as const,
    marginBottom: "24px",
  },
  card: {
    flex: "1 1 200px",
    backgroundColor: "#ffffff",
    padding: "20px",
    borderRadius: "12px",
    boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)",
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
  },
  cardLabel: {
    fontSize: "14px",
    color: "#64748b",
    fontWeight: 500,
  },
  cardValue: {
    fontSize: "26px",
    fontWeight: 700,
  },
  tableWrapper: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)",
    overflow: "hidden",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: "15px",
  },
  th: {
    backgroundColor: "#f1f5f9",
    padding: "14px 16px",
    fontWeight: 600,
    color: "#475569",
    textAlign: "right" as const,
    borderBottom: "1px solid #e2e8f0",
  },
  td: {
    padding: "14px 16px",
    textAlign: "right" as const,
    borderBottom: "1px solid #f1f5f9",
    color: "#334155",
  },
  trEven: {
    backgroundColor: "#ffffff",
  },
  trOdd: {
    backgroundColor: "#f8fafc",
  },
  loading: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    minHeight: "400px",
    fontFamily: "sans-serif",
    color: "#64748b",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "4px solid #e2e8f0",
    borderTop: "4px solid #3b82f6",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    marginBottom: "16px",
  }
};