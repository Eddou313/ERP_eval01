import { Suspense, lazy, useEffect, useMemo, useState, type JSX } from "react";
import { listOrdersLight, formatCurrency } from "../../commande/api/commandesApi";
import { type OrderListItem, CART_PENDING_STATE_ID } from "../../commande/api/ObjetOrder";

const StatsPage = lazy(() => import("./StatsPage"));
const StockDashboard = lazy(() => import("./StockDashboard").then((module) => ({ default: module.StockDashboard })));
const EvolutionStockPage = lazy(() => import("./Evolution_stock").then((module) => ({ default: module.EvolutionStockPage })));

type DayMetric = {
  date: string;
  orderCount: number;
  totalAmount: number;
};
export const ALLOWED_STATES = [
  { id: 5, name: "Livrer" },
  { id: 6, name: "Annulé" },
];

type TabId = "orders" | "stats" | "stock" | "evolution";

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

function buildMetrics(orders: OrderListItem[]): DayMetric[] {
  const grouped = new Map<string, DayMetric>();
  for (const order of orders) {
    const date = String(order.date_add || "").split(" ")[0] || "Inconnue";
    const amount = Number(order.total_paid_tax_incl) || 0;
    const current = grouped.get(date) || { date, orderCount: 0, totalAmount: 0 };
    current.orderCount += 1;
    current.totalAmount += amount;
    grouped.set(date, current);
  }
  return Array.from(grouped.values()).sort((a, b) => b.date.localeCompare(a.date));
}

function sumTtc(orders: OrderListItem[], predicate?: (order: OrderListItem) => boolean): number {
  return orders
    .filter((order) => (predicate ? predicate(order) : true))
    .reduce((sum, order) => sum + (Number(order.total_paid_tax_incl) || 0), 0);
}

function sumHt(orders: OrderListItem[], predicate?: (order: OrderListItem) => boolean): number {
  return orders
    .filter((order) => (predicate ? predicate(order) : true))
    .reduce((sum, order) => sum + (Number(order.total_paid_tax_excl) || 0), 0);
}

export function DashboardPage(): JSX.Element {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Gestion de l'onglet actif
  const [activeTab, setActiveTab] = useState<TabId>("orders");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listOrdersLight();
        // const data = await listOrdersLight({ declencher: 1 });
        const filteredData = data.filter((order) => Number(order.current_state) !== 6);
        setOrders(filteredData);
      } catch (e: any) {
        setError(e?.message || "Erreur lors du chargement du tableau de bord");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const metrics = useMemo(() => buildMetrics(orders), [orders]);
  const totalOrders = orders.length;
  const totalAmountTtc = sumTtc(orders);
  const totalAmountHt = sumHt(orders);
  const latestDay = metrics[0];
  const topDays = metrics.slice(0, 8);
  const avgOrder = orders.filter((order) => order.current_state === 0).length;
  // Chiffres d'affaires séparés: commandes réelles vs paniers
  const caPaniersTtc = sumTtc(orders, (order) => Number(order.current_state) === CART_PENDING_STATE_ID);
  const caPaniersHt = sumHt(orders, (order) => Number(order.current_state) === CART_PENDING_STATE_ID);

  const caCommandesSansPanierTtc = sumTtc(orders, (order) => Number(order.current_state) !== CART_PENDING_STATE_ID);
  const caCommandesSansPanierHt = sumHt(orders, (order) => Number(order.current_state) !== CART_PENDING_STATE_ID);

  return (
    <main style={styles.container}>
      {/* ── En-tête ─────────────────────────────────────────── */}
      <header style={styles.header}>
        <div>
          <h1 style={styles.mainTitle}>Tableau de bord général</h1>
          <p style={styles.subtitle}>
            Dernière journée enregistrée :{" "}
            <strong style={{ color: "#0f172a" }}>{latestDay ? formatDayLabel(latestDay.date) : "—"}</strong>
          </p>
        </div>
        <div>
          {/* <button
            onClick={() => navigate("/stock/evolution")}
            style={styles.navButton}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1d4ed8")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#2563eb")}
          >
            Évolution du stock ↗
          </button> */}
        </div>
      </header>

      {/* ── Onglets de Navigation ───────────────────────────── */}
      <nav style={styles.tabNav}>
        <button 
          style={{ ...styles.tabButton, ...(activeTab === "orders" ? styles.activeTabButton : {}) }}
          onClick={() => setActiveTab("orders")}
        >
          Commandes ({totalOrders})
        </button>
        <button 
          style={{ ...styles.tabButton, ...(activeTab === "stats" ? styles.activeTabButton : {}) }}
          onClick={() => setActiveTab("stats")}
        >
          Stats Financières
        </button>
        <button 
          style={{ ...styles.tabButton, ...(activeTab === "stock" ? styles.activeTabButton : {}) }}
          onClick={() => setActiveTab("stock")}
        >
          État des Stocks
        </button>
        <button 
          style={{ ...styles.tabButton, ...(activeTab === "evolution" ? styles.activeTabButton : {}) }}
          onClick={() => setActiveTab("evolution")}
        >
          Évolution des Stocks
        </button>
      </nav>

      {/* ── Contenu dynamique selon l'onglet actif ──────────── */}
      
      {activeTab === "orders" && (
        <>
          {/* KPIs Commandes */}
          <section style={styles.kpiGrid}>
            <div style={styles.card}>
              <span style={styles.cardLabel}>Commandes totales</span>
              <span style={{ ...styles.cardValue, color: "#3b82f6" }}>{totalOrders}</span>
            </div>
            <div style={styles.card}>
              <span style={styles.cardLabel}>Chiffre d'affaires</span>
              <span style={{ ...styles.cardValue, color: "#10b981" }}>{formatCurrency(totalAmountTtc)}</span>
            </div>
            <div style={styles.card}>
              <span style={styles.cardLabel}>CA commandes (sans panier)</span>
              <span style={{ ...styles.cardValue, color: "#0ea5a4" }}>{formatCurrency(caCommandesSansPanierTtc)}</span>
            </div>
            <div style={styles.card}>
              <span style={styles.cardLabel}>CA paniers</span>
              <span style={{ ...styles.cardValue, color: "#f59e0b" }}>{formatCurrency(caPaniersTtc)}</span>
            </div>
            <div style={styles.card}>
              <span style={styles.cardLabel}>Panier</span>
              <span style={{ ...styles.cardValue, color: "#6366f1" }}>{avgOrder}</span>
            </div>
            <div style={styles.card}>
              <span style={styles.cardLabel}>Jours actifs</span>
              <span style={{ ...styles.cardValue, color: "#64748b" }}>{metrics.length}</span>
            </div>
            <div style={styles.card}>
              <span style={styles.cardLabel}>CA total HT</span>
              <span style={{ ...styles.cardValue, color: "#0f766e" }}>{formatCurrency(totalAmountHt)}</span>
            </div>
            <div style={styles.card}>
              <span style={styles.cardLabel}>CA commandes HT</span>
              <span style={{ ...styles.cardValue, color: "#14b8a6" }}>{formatCurrency(caCommandesSansPanierHt)}</span>
            </div>
            <div style={styles.card}>
              <span style={styles.cardLabel}>CA paniers HT</span>
              <span style={{ ...styles.cardValue, color: "#d97706" }}>{formatCurrency(caPaniersHt)}</span>
            </div>
          </section>

          {/* États de chargement / erreur */}
          {loading && <p style={styles.stateMessage}>Chargement des commandes...</p>}
          {error && <p style={{ ...styles.stateMessage, color: "#ef4444" }}>{error}</p>}

          {/* Tableau des commandes du jour */}
          {!loading && !error && (
            <section style={{ marginTop: "16px" }}>
              <h3 style={styles.sectionTitle}>
                Commandes par jour <span style={styles.sectionTitleBadge}>(8 derniers jours)</span>
              </h3>

              {topDays.length === 0 ? (
                <div style={styles.emptyState}>Aucune commande trouvée.</div>
              ) : (
                <div style={styles.tableWrapper}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={{ ...styles.th, textAlign: "left" }}>Date</th>
                        <th style={styles.th}>Commandes</th>
                        <th style={styles.th}>Montant TTC</th>
                        <th style={styles.th}>Moy. / commande</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topDays.map((day, index) => (
                        <tr 
                          key={day.date}
                          style={index % 2 === 0 ? styles.trEven : styles.trOdd}
                        >
                          <td style={{ ...styles.td, textAlign: "left", fontWeight: 500 }}>
                            {formatDayLabel(day.date)}
                          </td>
                          <td style={styles.td}>{day.orderCount}</td>
                          <td style={{ ...styles.td, fontWeight: 600, color: "#10b981" }}>
                            {formatCurrency(day.totalAmount)}
                          </td>
                          <td style={styles.td}>
                            {formatCurrency(day.totalAmount / day.orderCount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </>
      )}

      <Suspense fallback={<p style={styles.stateMessage}>Chargement de l’onglet...</p>}>
        {activeTab === "stats" && <StatsPage />}

        {activeTab === "stock" && <StockDashboard />}

        {activeTab === "evolution" && <EvolutionStockPage />}
      </Suspense>
    </main>
  );
}

// Design System global partagé
const styles = {
  container: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    padding: "24px",
    backgroundColor: "transparent",
    marginRight: "40px",
    minHeight: "100vh",
    color: "#1e293b",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    flexWrap: "wrap" as const,
    marginBottom: "24px",
  },
  mainTitle: {
    fontSize: "28px",
    fontWeight: 700,
    margin: 0,
    color: "#0f172a",
  },
  subtitle: {
    fontSize: "14px",
    color: "#64748b",
    marginTop: "6px",
    marginBottom: 0,
  },
  navButton: {
    padding: "10px 20px",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 600,
    boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    transition: "background-color 0.2s",
  },
  tabNav: {
    display: "flex",
    gap: "8px",
    borderBottom: "2px solid #e2e8f0",
    marginBottom: "24px",
    paddingBottom: "1px",
  },
  tabButton: {
    padding: "12px 20px",
    backgroundColor: "transparent",
    border: "none",
    borderBottom: "2px solid transparent",
    cursor: "pointer",
    fontSize: "15px",
    fontWeight: 600,
    color: "#64748b",
    marginBottom: "-2px",
    transition: "all 0.2s",
  },
  activeTabButton: {
    color: "#2563eb",
    borderBottom: "2px solid #2563eb",
  },
  sectionTitle: {
    fontSize: "20px",
    fontWeight: 600,
    marginBottom: "16px",
    color: "#334155",
  },
  sectionTitleBadge: {
    fontSize: "14px",
    fontWeight: 400,
    color: "#94a3b8",
  },
  kpiGrid: {
    display: "flex",
    gap: "16px",
    flexWrap: "wrap" as const,
    marginBottom: "24px",
  },
  card: {
    flex: "1 1 220px",
    backgroundColor: "#ffffff",
    padding: "20px",
    borderRadius: "12px",
    boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)",
    display: "flex",
    flexDirection: "column" as const,
    gap: "6px",
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
  stateMessage: {
    padding: "20px",
    textAlign: "center" as const,
    color: "#64748b",
    fontWeight: 500,
  },
  emptyState: {
    padding: "32px",
    textAlign: "center" as const,
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    color: "#94a3b8",
    border: "1px dashed #cbd5e1",
  }
};

export default DashboardPage;