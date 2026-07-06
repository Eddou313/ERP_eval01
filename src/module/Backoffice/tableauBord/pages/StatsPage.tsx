import { useEffect, useMemo, useState, type JSX } from "react";
import { getDashboardStats, type CategoryStat } from "../api/dashboardApi";

export default function StatsPage(): JSX.Element {
  const [loading, setLoading] = useState(true);
  const [totalSalesHT, setTotalSalesHT] = useState(0);
  const [totalSalesTTC, setTotalSalesTTC] = useState(0);
  const [totalPurchasesHT, setTotalPurchasesHT] = useState(0);
  const [totalPurchases, setTotalPurchases] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [totalProfitHT, setTotalProfitHT] = useState(0);
  const [byCategory, setByCategory] = useState<CategoryStat[]>([]);
  const [canceledByCategory, setCanceledByCategory] = useState<CategoryStat[]>([]);
  const [canceledTotals, setCanceledTotals] = useState({ sales: 0, purchases: 0, profit: 0 });

  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    []
  );
  const formatCurrency = (value: number) => currencyFormatter.format(value);

  const categoryTotals = useMemo(() => {
    return byCategory.reduce(
      (acc, row) => {
        acc.salesHT += row.salesHT;
        acc.sales += row.sales;
        acc.purchasesHT += row.purchasesHT;
        acc.profitHT += row.profitHT;
        acc.profit += row.profit;
        return acc;
      },
      { salesHT: 0, sales: 0, purchasesHT: 0, profitHT: 0, profit: 0 }
    );
  }, [byCategory]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await getDashboardStats();
        if (!mounted) return;
        setTotalSalesHT(res.totalSalesHT || 0);
        setTotalSalesTTC(res.totalSalesTTC || 0);
        setTotalPurchasesHT(res.totalPurchasesHT || 0);
        setTotalPurchases(res.totalPurchases || 0);
        setTotalProfit(res.totalProfit || 0);
        setTotalProfitHT((res.totalSalesHT || 0) - (res.totalPurchasesHT || 0));
        setCanceledByCategory(res.canceledByCategory || []);
        setCanceledTotals(res.canceledTotals || { sales: 0, purchases: 0, profit: 0 });
        setByCategory(res.profitByCategory || []);
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
          <span style={styles.cardLabel}>Ventes totales estimées (HT)</span>
          <span style={{ ...styles.cardValue, color: "#059669" }}>
            {totalSalesHT.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </span>
        </div>

        <div style={styles.card}>
          <span style={styles.cardLabel}>Ventes totales estimées (TTC)</span>
          <span style={{ ...styles.cardValue, color: "#10b981" }}>
            {totalSalesTTC.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </span>
        </div>

        <div style={styles.card}>
          <span style={styles.cardLabel}>Achats estimés (HT)</span>
          <span style={{ ...styles.cardValue, color: "#dc2626" }}>
            {totalPurchasesHT.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </span>
        </div>

        <div style={styles.card}>
          <span style={styles.cardLabel}>Achats estimés (TTC)</span>
          <span style={{ ...styles.cardValue, color: "#ef4444" }}>
            {totalPurchases.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </span>
        </div>

        <div style={styles.card}>
          <span style={styles.cardLabel}>Bénéfice estimé (HT)</span>
          <span style={{ ...styles.cardValue, color: "#1d4ed8" }}>
            {totalProfitHT.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </span>
        </div>

        <div style={styles.card}>
          <span style={styles.cardLabel}>Bénéfice estimé (TTC)</span>
          <span style={{ ...styles.cardValue, color: "#1e3a8a" }}>
            {totalProfit.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
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
              <th style={styles.th}>Ventes estimées (HT)</th>
              <th style={styles.th}>Ventes estimées (TTC)</th>
              <th style={styles.th}>Achats estimés (HT)</th>
              <th style={styles.th}>Bénéfice estimé (HT)</th>
              <th style={styles.th}>Bénéfice estimé (TTC)</th>
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
                  <td style={styles.td}>{formatCurrency(c.salesHT)} €</td>
                  <td style={styles.td}>{formatCurrency(c.sales)} €</td>
                  <td style={styles.td}>{formatCurrency(c.purchasesHT)} €</td>
                  <td style={{
                    ...styles.td, 
                    fontWeight: "bold", 
                    color: c.profitHT >= 0 ? "#10b981" : "#ef4444" 
                  }}>
                    {formatCurrency(c.profitHT)} €
                  </td>
                  <td style={{ 
                    ...styles.td, 
                    fontWeight: "bold", 
                    color: isPositive ? "#10b981" : "#ef4444" 
                  }}>
                    {formatCurrency(c.profit)} €
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td style={{ ...styles.td, ...styles.totalCellLabel, textAlign: "left" }}>Total</td>
              <td style={{ ...styles.td, ...styles.totalCell }}>
                {formatCurrency(categoryTotals.salesHT)} €
              </td>
              <td style={{ ...styles.td, ...styles.totalCell }}>
                {formatCurrency(categoryTotals.sales)} €
              </td>
              <td style={{ ...styles.td, ...styles.totalCell }}>
                {formatCurrency(categoryTotals.purchasesHT)} €
              </td>
              <td style={{ ...styles.td, ...styles.totalCell, color: categoryTotals.profitHT >= 0 ? "#10b981" : "#ef4444" }}>
                {formatCurrency(categoryTotals.profitHT)} €
              </td>
              <td style={{ ...styles.td, ...styles.totalCell, color: categoryTotals.profit >= 0 ? "#10b981" : "#ef4444" }}>
                {formatCurrency(categoryTotals.profit)} €
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <h3 style={styles.sectionTitle}>Commandes annulées par catégorie (hors totaux globaux)</h3>
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, textAlign: "left" }}>Catégorie</th>
              <th style={styles.th}>Ventes estimées (TTC)</th>
              <th style={styles.th}>Achat estimé</th>
              <th style={styles.th}>Bénéfice estimé</th>
            </tr>
          </thead>
          <tbody>
            {canceledByCategory.length === 0 ? (
              <tr>
                <td style={{ ...styles.td, textAlign: "left" }} colSpan={4}>Aucune commande annulée.</td>
              </tr>
            ) : canceledByCategory.map((row, index) => (
              <tr key={row.categoryId} style={index % 2 === 0 ? styles.trEven : styles.trOdd}>
                <td style={{ ...styles.td, textAlign: "left", fontWeight: 500 }}>{row.categoryName}</td>
                <td style={styles.td}>{row.sales.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
                <td style={styles.td}>{row.purchases.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
                <td style={{ ...styles.td, fontWeight: "bold", color: row.profit >= 0 ? "#10b981" : "#ef4444" }}>
                  {row.profit.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td style={{ ...styles.td, ...styles.totalCellLabel, textAlign: "left" }}>Total annulées</td>
              <td style={{ ...styles.td, ...styles.totalCell }}>{canceledTotals.sales.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
              <td style={{ ...styles.td, ...styles.totalCell }}>{canceledTotals.purchases.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
              <td style={{ ...styles.td, ...styles.totalCell, color: canceledTotals.profit >= 0 ? "#10b981" : "#ef4444" }}>
                {canceledTotals.profit.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </td>
            </tr>
          </tfoot>
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
  totalCellLabel: {
    fontWeight: 700,
    backgroundColor: "#f8fafc",
  },
  totalCell: {
    fontWeight: 700,
    backgroundColor: "#f8fafc",
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