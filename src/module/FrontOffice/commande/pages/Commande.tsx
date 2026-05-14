import { useEffect, useState } from "react";
import FrontOfficeHeader from "../../include/FrontOfficeHeader";
import { getStoredClientSession } from "../../client/api/clientAPI";
import {listOrdersLight,getOrder,getOrderStateLabel,type OrderListItem} from "../../../Backoffice/commande/api/commandesApi";
import { Link } from "react-router-dom";
import "./Commande.css";

export function Commande() {
    const [orders, setOrders] = useState<Array<OrderListItem & { note?: string }>>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const session = getStoredClientSession();
        if (!session) return;

        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const all = await listOrdersLight();
                const userId = Number(session.id);
                const mine = all.filter((o) => o.id_customer === userId);

                const enriched = await Promise.all(
                    mine.map(async (o) => {
                        try {
                            const detail = await getOrder(o.id);
                            return { ...o, note: detail.note || "" };
                        } catch (e) {
                            return { ...o, note: "" };
                        }
                    })
                );

                setOrders(enriched);
            } catch (e: any) {
                setError(e?.message || "Erreur lors du chargement des commandes");
            } finally {
                setLoading(false);
            }
        };

        load();
    }, []);

    const session = getStoredClientSession();
    if (!session) {
        return (
            <div>
                <FrontOfficeHeader />
                <main style={{ padding: 20 }}>
                    <h2>Mes commandes</h2>
                    <p>Vous devez être connecté pour voir vos commandes.</p>
                    <p>
                        <Link to="/login">Se connecter</Link> ou <Link to="/register">Créer un compte</Link>
                    </p>
                </main>
            </div>
        );
    }

    return (
        <div>
            <FrontOfficeHeader />
            <main className="commande-page">
                <div className="commande-card">
                    <div className="commande-header">
                        <div className="commande-title">Mes commandes</div>
                    </div>

                    {loading && <p>Chargement des commandes...</p>}
                    {error && <p style={{ color: "red" }}>{error}</p>}

                    {!loading && orders.length === 0 && <p>Aucune commande trouvée pour cet utilisateur.</p>}

                    {orders.length > 0 && (
                        <table className="commande-table" role="table">
                            <thead>
                                <tr>
                                    <th>Référence</th>
                                    <th>Date</th>
                                    <th style={{ textAlign: "right" }}>Total</th>
                                    <th>Paiement</th>
                                    <th>État</th>
                                    {/* <th>Description</th> */}
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map((o) => (
                                    <tr key={o.id}>
                                        <td>{o.reference}</td>
                                        <td>{o.date_add}</td>
                                        <td className="commande-total">{o.total_paid_tax_incl.toFixed(2)}</td>
                                        <td>{o.payment}</td>
                                        <td>
                                            {getOrderStateLabel(o.current_state)}
                                        </td>
                                        {/* <td className="commande-note">{o.note || "-"}</td> */}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </main>
        </div>
    );
}

export default Commande;