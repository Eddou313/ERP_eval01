import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listOrderStates, type OrderStateListItem } from "../api/EtatCommande";
import "./EtatCommande.css";

export function EtatCommande() {
  const [states, setStates] = useState<OrderStateListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    loadStates();
  }, []);

  const loadStates = async () => {
    try {
      const data = await listOrderStates();
      const sortedData = data.sort((a, b) => a.id - b.id);
      setStates(sortedData);
      setInitialized(data.length > 0);
    } catch (e: any) {
      setError(e?.message ?? "Erreur lors du chargement des états");
    }
  };

//   const handleInitialize = async () => {
//     try {
//       setLoading(true);
//       await loadStates();
//     } catch (e: any) {
//       setError(e?.message ?? "Erreur lors de l'initialisation");
//     } finally {
//       setLoading(false);
//     }
//   };

  if (error) return <p style={{ color: "crimson" }}>{error}</p>;

  return (
    <div className="EtatCommandePage">
      <div className="EtatCommandeHeader">
        <h2 className="EtatCommandeTitle">États de Commande</h2>
        <Link to="/commandes/list">voir commandes</Link>
        {/* <button 
          className="EtatCommandeButton"
          onClick={handleInitialize}
          disabled={loading}
        >
          {loading ? "Chargement..." : "Initialiser les données"}
        </button> */}
      </div>

      {!initialized && states.length === 0 && (
        <div className="EtatCommandeEmpty">
          <p>Aucun état de commande trouvé.</p>
          <p>Cliquez sur "Initialiser les données" pour charger les états.</p>
        </div>
      )}

      {states.length > 0 && (
        <div className="EtatCommandeContainer">
          <p className="EtatCommandeMuted">{states.length} état(s) disponible(s)</p>
          
          <table className="EtatCommandeTable">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nom</th>
                <th>Modèle</th>
                <th>Couleur</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              {states.map((state) => (
                <tr key={state.id}>
                  <td>{state.id}</td>
                  <td>
                    <span className="EtatCommandeName">
                      {state.name}
                      {state.unremovable }
                    </span>
                  </td>
                  <td>{state.template || "-"}</td>
                  <td>
                    <div className="EtatCommandeColorCell">
                      <span 
                        className="EtatCommandeColorBox"
                        style={{ backgroundColor: state.color || "#ccc" }}
                      />
                      <span>{state.color || "Non définie"}</span>
                    </div>
                  </td>
                  <td>
                    {state.unremovable ? (
                      <span className="EtatCommandeType">Système</span>
                    ) : (
                      <span className="EtatCommandeType">Personnalisé</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
export default EtatCommande;
