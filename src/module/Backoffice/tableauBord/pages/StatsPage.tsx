import { useEffect, useState, type JSX } from "react";
import { getDashboardStats, type CategoryStat } from "../api/dashboardApi";
import { getCategory } from "../api/../../categorie/api/categoriesApi";

export default function StatsPage(): JSX.Element {
  const [loading, setLoading] = useState(true);
  const [totalSales, setTotalSales] = useState(0);
  const [totalPurchases, setTotalPurchases] = useState(0);
  const [byCategory, setByCategory] = useState<CategoryStat[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await getDashboardStats();
        if (!mounted) return;
        setTotalSales(res.totalSalesHT || 0);
        setTotalPurchases(res.totalPurchasesHT || 0);

        // Ensure categories have names: if a categoryName is missing,
        // fetch the category by id as a fallback.
        const enriched: CategoryStat[] = [];
        for (const c of (res.profitByCategory || [])) {
          if (c.categoryName && c.categoryName.trim()) {
            enriched.push(c);
            continue;
          }

          let name = c.categoryName || "(Inconnu)";
          try {
            if (typeof c.categoryId === "number" && c.categoryId > 0) {
              const cat = await getCategory(c.categoryId);
              name = cat?.name || name;
            }
          } catch (err) {
            console.debug("StatsPage: fallback category lookup failed", err);
          }
          enriched.push({ ...c, categoryName: name });
        }

        setByCategory(enriched);
      } catch (err) {
        console.error("Erreur chargement stats:", err);
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
        <div style={styles.spinner}></div>
        <p>Chargement des statistiques...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.mainTitle}>Tableau de bord financier</h2>
      
      {/* section des KPI Cards */}
      <div style={styles.kpiGrid}>
        <div style={styles.card}>
          <span style={styles.cardLabel}>Montant total des ventes (HT)</span>
          <span style={{ ...styles.cardValue, color: "#10b981" }}>
            {totalSales.toLocaleString("fr-FR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} €
          </span>
        </div>
        
        <div style={styles.card}>
          <span style={styles.cardLabel}>Montant total des achats (HT)</span>
          <span style={{ ...styles.cardValue, color: "#ef4444" }}>
            {totalPurchases.toLocaleString("fr-FR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} €
          </span>
        </div>

        <div style={styles.card}>
          <span style={styles.cardLabel}>Bénéfice global estimé(HT)</span>
          <span style={{ ...styles.cardValue, color: "#3b82f6" }}>
            {(totalSales - totalPurchases).toLocaleString("fr-FR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} €
          </span>
        </div>
      </div>

      {/* Section Tableau */}
      <h3 style={styles.sectionTitle}>Bénéfice par catégorie</h3>
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, textAlign: "left" }}>Catégorie</th>
              <th style={styles.th}>Ventes (HT)</th>
              <th style={styles.th}>Achats (HT)</th>
              <th style={styles.th}>Bénéfice (HT)</th>
            </tr>
          </thead>
          <tbody>
            {byCategory.map((c, index) => {
              const isPositive = c.profit >= 0;
              return (
                <tr 
                  key={c.categoryId} 
                  style={index % 2 === 0 ? styles.trEven : styles.trOdd}
                >
                  <td style={{ ...styles.td, textAlign: "left", fontWeight: 500 }}>{c.categoryName}</td>
                  <td style={styles.td}>{c.sales.toFixed(3)} €</td>
                  <td style={styles.td}>{c.purchases.toFixed(3)} €</td>
                  <td style={{ 
                    ...styles.td, 
                    fontWeight: "bold", 
                    color: isPositive ? "#10b981" : "#ef4444" 
                  }}>
                    {c.profit.toFixed(3)} €
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Objet contenant l'ensemble des styles
const styles = {
  container: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    padding: "24px",
    backgroundColor: "transparent",
    margin_right: "20px",
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
    flex: "1 1 250px",
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
    fontSize: "24px",
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