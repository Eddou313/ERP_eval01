import { useEffect, useState } from "react";
import FrontOfficeHeader from "../../include/FrontOfficeHeader";
import { getStoredClientSession } from "../../client/api/clientAPI";
import { listOrdersLight, getOrder } from "../../../Backoffice/commande/api/commandesApi";
import { requestPrestashopXml } from "../../../../utils/prestashopClient";
import { Link, useNavigate } from "react-router-dom";
import "./Commande.css";
import { listOrderStates } from "../../../Backoffice/commande/api/EtatCommande";
import { CART_PENDING_STATE_LABEL, type OrderListItem } from "../../../Backoffice/commande/api/ObjetOrder";
import type { OrderStateListItem } from "../../../Backoffice/commande/api/ObjetEtat";
export interface Reponse {
    liste: OrderListItem,
    id: number,
    valeur : number
}


export function Commande() {
    const [orders, setOrders] = useState<Array<OrderListItem & { note?: string }>>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [OrderStates, setOrderStates] = useState<OrderStateListItem[]>([]);

    const [number, setNumber] = useState<number[]>([]);

    useEffect(() => {
        const session = getStoredClientSession();
        if (!session) return;

        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const all = await listOrdersLight({declencher : 1});
                // const all = await listOrdersLight();
                const userId = Number(session.id);
                const mine = all.filter((o) => o.id_customer === userId);

                const enriched = await Promise.all(
                    mine.map(async (o) => {
                        try {
                            const detail = await getOrder(o.id);

                            // Récupère les lignes produits via l'API order_details
                            let products: Array<{ name: string; quantity: number }> = [];
                            try {
                                const odResp = await requestPrestashopXml<any>("/order_details", {
                                    query: { display: "full", ["filter[id_order]"]: `[${o.id}]` },
                                });
                                const raw = odResp?.prestashop?.order_details?.order_detail;
                                const rows = Array.isArray(raw) ? raw : raw ? [raw] : [];
                                products = rows.map((r: any) => ({
                                    name: (r.product_name && (r.product_name["#text"] || r.product_name)) || r.product_name || "",
                                    quantity: Number(r.product_quantity) || 0,
                                }));
                            } catch (err) {
                                // ignore failure to load order lines
                            }

                            return { ...o, note: detail.note || "", products };
                        } catch (e) {
                            return { ...o, note: "", products: [] };
                        }
                    })
                );
                setOrderStates(await listOrderStates());

                setOrders(enriched);
                // initialize quantity inputs for each order
                setNumber(new Array(enriched.length).fill(0));
            } catch (e: any) {
                setError(e?.message || "Erreur lors du chargement des commandes");
            } finally {
                setLoading(false);
            }
        };

        load();
    }, []);
    const navigate = useNavigate();



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
                                    <th>Produits</th>
                                    <th>Date</th>
                                    <th style={{ textAlign: "right" }}>Total</th>
                                    <th>Paiement</th>
                                    <th>État</th>
                                    <th>...</th>
                                    <th>Action</th>
                                    {/* <th>Description</th> */}
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map((o: any, idx) => (
                                    <tr key={o.id}>
                                        <td>{o.reference}</td>
                                        <td>
                                            {o.products && o.products.length > 0 ? (
                                                <ul style={{ margin: 0, paddingLeft: 12 }}>
                                                    {o.products.map((p: any, i: number) => (
                                                        <li key={i} style={{ listStyle: "disc" }}>
                                                            {p.name} x {p.quantity}
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <span>-</span>
                                            )}
                                        </td>
                                        <td>{o.date_add}</td>
                                        <td className="commande-total">{o.total_paid_tax_incl.toFixed(2)}</td>
                                        <td>{o.payment}</td>
                                        <td style={{ backgroundColor: o.id < 0 ? "#6c757d" : (OrderStates.find((state) => state.id === o.current_state)?.color || "transparent"), color: "#fff", fontWeight: "bold", textAlign: "center" }}>
                                            {o.id < 0 ? CART_PENDING_STATE_LABEL : (OrderStates.find((state) => state.id === o.current_state)?.name || "État inconnu")}
                                        </td>
                                        <td>
                                            x <input type="number" value={number[idx] ?? 0} onChange={(e) => { const v = Number(e.target.value || 0); setNumber(prev => { const copy = [...prev]; copy[idx] = v; return copy; }); }} />
                                        </td>
                                        <td>
                                            <button
                                                onClick={() =>{ if(number[idx] >= 0) navigate("/Traitement", { state: { Response: {liste: o, id : o.id ,valeur: number[idx]}}})
                                                                else window.alert("Veuillez entrer une valeur valide.")}}
                                            >
                                                Dupliquer
                                            </button>
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