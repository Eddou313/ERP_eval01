import { useEffect, useMemo, useState } from "react";
import { listOrdersLight, formatCurrency, type OrderListItem } from "../../commande/api/commandesApi";
import "./DashboardPage.css";

type DayMetric = {
  date: string;
  orderCount: number;
  totalAmount: number;
};

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

export function DashboardPage() {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listOrdersLight();
        setOrders(data);
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
  const totalAmount = orders.reduce((sum, o) => sum + (Number(o.total_paid_tax_incl) || 0), 0);
  const latestDay = metrics[0];
  const topDays = metrics.slice(0, 8);
  const avgOrder = totalOrders > 0 ? totalAmount / totalOrders : 0;

  return (
    <main className="db-page">

      {/* ── En-tête ─────────────────────────────────────────── */}
      <header className="db-header">
        <div>
          <h1 className="db-title">Tableau de bord</h1>
        </div>
        <p className="db-subtitle">
          Dernière journée enregistrée :{" "}
          <strong>{latestDay ? formatDayLabel(latestDay.date) : "—"}</strong>
        </p>
      </header>

      {/* ── KPIs ────────────────────────────────────────────── */}
      <section className="db-kpis">
        <div className="db-kpi">
          <span className="db-kpi-label">Commandes totales</span>
          <span className="db-kpi-value">{totalOrders}</span>
        </div>
        <div className="db-kpi">
          <span className="db-kpi-label">Chiffre d'affaires</span>
          <span className="db-kpi-value">{formatCurrency(totalAmount)}</span>
        </div>
        <div className="db-kpi">
          <span className="db-kpi-label">Panier moyen</span>
          <span className="db-kpi-value">{formatCurrency(avgOrder)}</span>
        </div>
        <div className="db-kpi">
          <span className="db-kpi-label">Jours actifs</span>
          <span className="db-kpi-value">{metrics.length}</span>
        </div>
      </section>

      {/* ── États ───────────────────────────────────────────── */}
      {loading && <p className="db-state">Chargement…</p>}
      {error   && <p className="db-state db-state--error">{error}</p>}

      {/* ── Tableau ─────────────────────────────────────────── */}
      {!loading && !error && (
        <section className="db-table-section">
          <h2 className="db-section-title">Commandes par jour <span>(8 derniers)</span></h2>

          {topDays.length === 0 ? (
            <p className="db-empty">Aucune commande trouvée.</p>
          ) : (
            <div className="db-table-wrap">
              <table className="db-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Commandes</th>
                    <th>Montant TTC</th>
                    <th>Moy. / commande</th>
                  </tr>
                </thead>
                <tbody>
                  {topDays.map((day) => (
                    <tr key={day.date}>
                      <td>{formatDayLabel(day.date)}</td>
                      <td className="db-num">{day.orderCount}</td>
                      <td className="db-num">{formatCurrency(day.totalAmount)}</td>
                      <td className="db-num">
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
    </main>
  );
}

export default DashboardPage;