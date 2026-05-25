import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {formatCurrency,listOrdersLight,updateOrderState} from "../api/commandesApi";
import "./Commandes.css";
import {listOrderStates} from "../api/EtatCommande";
import { IconSettings } from "@tabler/icons-react";
import { CART_PENDING_STATE_LABEL, type OrderListItem } from "../api/ObjetOrder";
import { ALLOWED_STATES, type OrderStateListItem } from "../api/ObjetEtat";

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

// États autorisés pour modification




export default function CommandesListPage() {
  const [items, setItems] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [draftFilters, setDraftFilters] = useState<OrderFilters>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<OrderFilters>(DEFAULT_FILTERS);
  const [orderStates, setOrderStates] = useState<OrderStateListItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const pageSize = 10;

  // MODAL
  const [editingOrder, setEditingOrder] = useState<OrderListItem | null>(null);
  const [newState, setNewState] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  const navigate = useNavigate();

  async function refresh(currentPage = page) {
    setLoading(true);
    setError(null);

    try {
      const offset = Math.max(0, (currentPage - 1) * pageSize);
      const orders = await listOrdersLight({ limit: pageSize, offset });
      setItems(orders);
      setSelectedIds([]);
      setHasNextPage(orders.length === pageSize);
    } catch (e: any) {
      setError(e?.message ?? "Erreur chargement commandes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh(page);
    listOrderStates().then((states) => setOrderStates(states));
  }, [page]);

  const filtered = useMemo(() => 
  {
    return items.filter((item) => {
      if (appliedFilters.reference && !item.reference.toLowerCase().includes(appliedFilters.reference.toLowerCase())) return false;
      if (appliedFilters.idCustomer && item.id_customer !== Number(appliedFilters.idCustomer)) return false;
      if (appliedFilters.payment && !item.payment.toLowerCase().includes(appliedFilters.payment.toLowerCase())) return false;
      if (appliedFilters.minAmount && item.total_paid_tax_incl < Number(appliedFilters.minAmount)) return false;
      if (appliedFilters.maxAmount && item.total_paid_tax_incl > Number(appliedFilters.maxAmount)) return false;
      if (appliedFilters.state !== "all" && item.current_state !== appliedFilters.state) return false;
      return true;
    });
  }, [items, appliedFilters]);

  async function handleSaveState() {
    if (!editingOrder) return;

    if (newState === editingOrder.current_state) {
      setEditingOrder(null);
      return;
    }

    try {
      setSaving(true);
      await updateOrderState(editingOrder.id, newState, new Date().toISOString());
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
        {/* <Link to="/commandes/new">+ Nouvelle commande</Link> */}
        <IconSettings size={20} stroke={1.8} onClick={()=>navigate("/commandes/etat")}/>
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
              <td>{formatCurrency(order.total_paid_tax_incl)}</td>
              <td>{order.id < 0 ? CART_PENDING_STATE_LABEL : (orderStates.find((state) => state.id === order.current_state)?.name || "État inconnu")}</td>
              <td>
                {order.id > 0 ? (
                  <button
                    className="btn-edit"
                    onClick={() => {
                      setEditingOrder(order);
                      const isAllowedCurrentState = ALLOWED_STATES.some((state) => state.id === order.current_state);
                      setNewState(isAllowedCurrentState ? order.current_state : ALLOWED_STATES[0].id);
                    }}
                  >
                    Modifier
                  </button>
                ) : (
                  <span>Panier non valide</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pagination">
        <button
          className="btn"
          onClick={() => setPage((current) => Math.max(1, current - 1))}
          disabled={page === 1 || loading}
        >
          Précédent
        </button>
        <span className="page-info">Page {page}</span>
        <button
          className="btn"
          onClick={() => setPage((current) => current + 1)}
          disabled={loading || !hasNextPage}
        >
          Suivant
        </button>
      </div>

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
              {ALLOWED_STATES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
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