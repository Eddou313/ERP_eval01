import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  deleteOrder,
  formatCurrency,
  listOrdersLight,
  updateOrder,
  updateOrderState,
  type OrderListItem
} from "../api/commandesApi";
import "./Commandes.css";
import {listOrderStates, type OrderStateListItem} from "../api/EtatCommande";

type OrderFilters = {
  reference: string;
  idCustomer: string;
  payment: string;
  minAmount: string;
  maxAmount: string;
  state: "all" | number;
};

const DEFAULT_FILTERS: OrderFilters = {
  reference: "",
  idCustomer: "",
  payment: "",
  minAmount: "",
  maxAmount: "",
  state: "all",
};

// 👉 états PrestaShop (à adapter selon ton shop)
const ORDER_STATES = [
  { id: 2, label: "Paiement accepté" },
  { id: 6, label: "Annulé" },
];

export default function CommandesListPage() {
  const [items, setItems] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [draftFilters, setDraftFilters] = useState<OrderFilters>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<OrderFilters>(DEFAULT_FILTERS);
  const [orderStates, setOrderStates] = useState<OrderStateListItem[]>([]);

  // MODAL
  const [editingOrder, setEditingOrder] = useState<OrderListItem | null>(null);
  const [newState, setNewState] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    setLoading(true);
    setError(null);

    try {
      const orders = await listOrdersLight();
      setItems(orders);
      setSelectedIds([]);
    } catch (e: any) {
      setError(e?.message ?? "Erreur chargement commandes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    listOrderStates().then((states) => setOrderStates(states));
  }, []);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (appliedFilters.reference && !item.reference.toLowerCase().includes(appliedFilters.reference.toLowerCase())) return false;
      if (appliedFilters.idCustomer && item.id_customer !== Number(appliedFilters.idCustomer)) return false;
      if (appliedFilters.payment && !item.payment.toLowerCase().includes(appliedFilters.payment.toLowerCase())) return false;
      if (appliedFilters.minAmount && item.total_paid < Number(appliedFilters.minAmount)) return false;
      if (appliedFilters.maxAmount && item.total_paid > Number(appliedFilters.maxAmount)) return false;
      if (appliedFilters.state !== "all" && item.current_state !== appliedFilters.state) return false;
      return true;
    });
  }, [items, appliedFilters]);

  async function handleSaveState() {
    if (!editingOrder) return;

    try {
      setSaving(true);
      await updateOrderState(editingOrder.id, newState);
      setEditingOrder(null);
      await refresh();
    } catch (e: any) {
      alert("Erreur update: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="commandesPage">
      <div className="header">
        <h2>Commandes</h2>
        <Link to="/commandes/new">+ Nouvelle commande</Link>
      </div>

      {error && <p className="error">{error}</p>}

      {/* TABLE */}
      <table className="table">
        <thead>
          <tr>
            <th>Réf</th>
            <th>Client</th>
            <th>Paiement</th>
            <th>Total</th>
            <th>État</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {filtered.map((order) => (
            <tr key={order.id}>
              <td>{order.reference}</td>
              <td>{order.id_customer}</td>
              <td>{order.payment}</td>
              <td>{formatCurrency(order.total_paid)}</td>
              <td>{orderStates.find((state) => state.id === order.current_state)?.name || "État inconnu"}</td>
              <td>
                <button
                  className="btn-edit"
                  onClick={() => {
                    setEditingOrder(order);
                    setNewState(order.current_state);
                  }}
                >
                  Modifier
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ================= MODAL ================= */}
      {editingOrder && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Modifier état commande</h3>

            <p><b>Commande:</b> {editingOrder.reference}</p>

            <select
              value={newState}
              onChange={(e) => setNewState(Number(e.target.value))}
            >
              {ORDER_STATES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>

            <div className="modal-actions">
              <button
                className="btn-save"
                disabled={saving}
                onClick={handleSaveState}
              >
                {saving ? "Sauvegarde..." : "Valider"}
              </button>

              <button
                className="btn-cancel"
                onClick={() => setEditingOrder(null)}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}