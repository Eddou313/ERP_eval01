import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { deleteOrder, formatCurrency, listOrdersLight, type OrderListItem } from "../api/commandesApi";
// import { exportCsv } from "../../../../utils/exportCsv";
import "./Commandes.css";

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


export default function CommandesListPage() {
  const [items, setItems] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [draftFilters, setDraftFilters] = useState<OrderFilters>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<OrderFilters>(DEFAULT_FILTERS);
  
  async function refresh() {
    setLoading(true);
    setError(null);

    try {
      const orders = await listOrdersLight();
      setItems(orders);
      setSelectedIds([]);
    } catch (caught: any) {
      setError(caught?.message ?? "Erreur lors du chargement des commandes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (appliedFilters.reference && !item.reference.toLowerCase().includes(appliedFilters.reference.toLowerCase())) {
        return false;
      }
      if (appliedFilters.idCustomer && item.id_customer !== Number(appliedFilters.idCustomer)) {
        return false;
      }
      if (appliedFilters.payment && !item.payment.toLowerCase().includes(appliedFilters.payment.toLowerCase())) {
        return false;
      }
      if (appliedFilters.minAmount && item.total_paid < Number(appliedFilters.minAmount)) {
        return false;
      }
      if (appliedFilters.maxAmount && item.total_paid > Number(appliedFilters.maxAmount)) {
        return false;
      }
      if (appliedFilters.state !== "all" && item.current_state !== appliedFilters.state) {
        return false;
      }
      return true;
    });
  }, [items, appliedFilters]);

  async function handleDeleteSelection() {
    if (selectedIds.length === 0) {
      alert("Aucune commande sélectionnée");
      return;
    }

    const confirmed = window.confirm(`Supprimer ${selectedIds.length} commande(s) ?`);
    if (!confirmed) return;

    setLoading(true);
    setError(null);

    try {
      for (const id of selectedIds) {
        await deleteOrder(id);
      }
      await refresh();
    } catch (caught: any) {
      setError(caught?.message ?? "Erreur lors de la suppression");
    } finally {
      setLoading(false);
    }
  }

  function handleSelectAll() {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((o) => o.id));
    }
  }

  function handleSelectOne(id: number) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }
  // function onExportCsv() {
  //   exportCsv({
  //     items: filtered,
  //     fileNamePrefix: "commandes",
  //     columns: [
  //       { header: "id_order", value: (order) => order.id },
  //       { header: "reference", value: (order) => order.reference },
  //       { header: "id_customer", value: (order) => order.id_customer },
  //       { header: "payment", value: (order) => order.payment },
  //       { header: "total_paid", value: (order) => order.total_paid },
  //       { header: "current_state", value: (order) => order.current_state },
  //       { header: "date_add", value: (order) => order.date_add },
  //     ],
  //   });
  // }

  return (
    <div className="commandesPage" style={pageStyle}>
      <div style={headerStyle}>
        <h2 style={{ margin: 0 }}>Commandes</h2>
          {/* <button type="button" onClick={onExportCsv} disabled={loading || items.length === 0}>
            Exporter CSV
          </button> */}
        {/* <Link to="/commandes/etat">+ les etats commande</Link> */}
        <Link to="/commandes/new">+ Nouvelle commande</Link>
      </div>

      {error && <p style={errorStyle}>{error}</p>}

      <div style={filtersStyle}>
        <div style={filterRowStyle}>
          <label>
            Référence:
            <input
              type="text"
              value={draftFilters.reference}
              onChange={(e) => setDraftFilters({ ...draftFilters, reference: e.target.value })}
              placeholder="Ex: XKJFH2..."
            />
          </label>
          <label>
            Client (ID):
            <input
              type="number"
              value={draftFilters.idCustomer}
              onChange={(e) => setDraftFilters({ ...draftFilters, idCustomer: e.target.value })}
              placeholder="Ex: 5"
            />
          </label>
          <label>
            Paiement:
            <input
              type="text"
              value={draftFilters.payment}
              onChange={(e) => setDraftFilters({ ...draftFilters, payment: e.target.value })}
              placeholder="Ex: PayPal"
            />
          </label>
        </div>

        <div style={filterRowStyle}>
          <label>
            Montant min:
            <input
              type="number"
              value={draftFilters.minAmount}
              onChange={(e) => setDraftFilters({ ...draftFilters, minAmount: e.target.value })}
              placeholder="0"
            />
          </label>
          <label>
            Montant max:
            <input
              type="number"
              value={draftFilters.maxAmount}
              onChange={(e) => setDraftFilters({ ...draftFilters, maxAmount: e.target.value })}
              placeholder="999999"
            />
          </label>
          <label>
            État:
            <select value={appliedFilters.state} onChange={(e) => setDraftFilters({ ...draftFilters, state: e.target.value === "all" ? "all" : Number(e.target.value) })}>
              <option value="all">Tous les états</option>
              <option value="1">En attente</option>
              <option value="2">Paiement accepté</option>
              <option value="3">Préparation</option>
              <option value="4">Expédié</option>
              <option value="5">Livré</option>
            </select>
          </label>
        </div>

        <div style={filterActionStyle}>
          <button onClick={() => setAppliedFilters(draftFilters)}>Appliquer</button>
          <button onClick={() => { setDraftFilters(DEFAULT_FILTERS); setAppliedFilters(DEFAULT_FILTERS); }}>Réinitialiser</button>
        </div>
      </div>

      <div style={toolbarStyle}>
        <span>{filtered.length} commande(s) <Link to="/commandes/etat" style={{textDecoration: "none",color: "inherit"}}>⚙️</Link></span>
        {selectedIds.length > 0 && (
          <button onClick={handleDeleteSelection} style={deleteButtonStyle}>
            Supprimer ({selectedIds.length})
          </button>
        )}
      </div>

      {loading && <p>Chargement...</p>}

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={{ ...cellStyle, width: "40px" }}>
              <input type="checkbox" checked={selectedIds.length === filtered.length && filtered.length > 0} onChange={handleSelectAll} />
            </th>
            <th style={cellStyle}>Référence</th>
            <th style={cellStyle}>Client (ID)</th>
            <th style={cellStyle}>Paiement</th>
            <th style={cellStyle}>Montant</th>
            <th style={cellStyle}>État id</th>
            <th style={cellStyle}>Date</th>
            <th style={cellStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((order) => (
            <tr key={order.id}>
              <td style={cellStyle}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(order.id)}
                  onChange={() => handleSelectOne(order.id)}
                />
              </td>
              <td style={cellStyle}>
                <Link to={`/commandes/${order.id}`}>{order.reference}</Link>
              </td>
              <td style={cellStyle}>{order.id_customer}</td>
              <td style={cellStyle}>{order.payment}</td>
              <td style={cellStyle}>{formatCurrency(order.total_paid)}</td>
              <td style={cellStyle}>{order.current_state}</td>
              <td style={cellStyle}>{order.date_add}</td>
              <td style={cellStyle}>
                <Link to={`/commandes/${order.id}/edit`}>Modifier</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {filtered.length === 0 && !loading && <p>Aucune commande trouvée</p>}
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  display: "grid",
  gap: 16,
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
};

const filtersStyle: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 4,
  padding: 12,
  backgroundColor: "#f9f9f9",
  display: "grid",
  gap: 12,
};

const filterRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: 12,
};

const filterActionStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
};

const toolbarStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  border: "1px solid #ddd",
};

const cellStyle: React.CSSProperties = {
  padding: 8,
  borderRight: "1px solid #ddd",
  borderBottom: "1px solid #ddd",
  textAlign: "left",
};

const errorStyle: React.CSSProperties = {
  color: "crimson",
  padding: 8,
  backgroundColor: "#fee",
  borderRadius: 4,
};

const deleteButtonStyle: React.CSSProperties = {
  backgroundColor: "crimson",
  color: "white",
  padding: "6px 12px",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
};
