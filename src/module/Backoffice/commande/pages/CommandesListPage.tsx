import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate} from "react-router-dom";
import {formatCurrency,listOrdersLight,updateOrderState} from "../api/commandesApi";
import "./Commandes.css";
import {listOrderStates} from "../api/EtatCommande";
import { IconSettings } from "@tabler/icons-react";
import { CART_PENDING_STATE_LABEL, type OrderListItem } from "../api/ObjetOrder";
import type { OrderStateListItem } from "../api/ObjetEtat";

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
const ALLOWED_STATES = [
  { id: 2, name: "Paiement accepter" },
  { id: 6, name: "Annulé" },
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

  const navigate = useNavigate();

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