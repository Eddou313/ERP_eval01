import { useEffect, useState } from "react";
// import FrontOfficeHeader from "../../include/FrontOfficeHeader";
import { listClientsLight, type ClientListItem } from "../../../Backoffice/client/api/clientApi";
import { useNavigate } from "react-router-dom";
import {createSession} from "../../../Backoffice/client/api/clientApi"
import { logoutClient } from "../api/clientAPI";
import "./ClientListe.css";
export function ClientListe() {
    const navigate = useNavigate();
    const [clients, setClients] = useState<ClientListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const list = await listClientsLight(50);
                setClients(list);
            } catch (err: any) {
                console.error("Erreur chargement clients:", err);
                setError("Impossible de charger la liste des utilisateurs");
            } finally {
                setLoading(false);
            }
        };

        load();
    }, []);

    const handleChooseClient = async (email: string, id: number) => {
        // navigate("/login", { state: { email } });
        const chec =  await createSession(id);
        if(chec) navigate("/produits");
        else console.error(`erreur lors de la login`);
    };

    // const handleAnonymous = () => {
    //     try { logoutClient(); } catch { }
    //     navigate("/produits");
    // };

    return (
        <div className="clientListPage">
            <main style={{ padding: 20 }}>
                <h1>Choisissez un utilisateur</h1>
                {loading && <p>Chargement...</p>}
                {error && <p className="error">{error}</p>}

                {!loading && !error && (
                    <div style={{ display: "grid", gap: 12 }}>
                        {clients.map((c) => {
                            if (c.id === 1) {
                                return (
                                    <div style={{ margin: "12px 0" }}>
                                        <button onClick={() => handleChooseClient(c.email, c.id)} className="btn">continuer en tant qu'utilisateur anonyme</button>
                                    </div>
                                );
                            }
                            else {
                                return (
                                    <div key={c.id} style={{ border: "1px solid #eee", padding: 12, borderRadius: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{c.fullName || c.email}</div>
                                            <div style={{ fontSize: 12, color: "#666" }}>{c.email}</div>
                                        </div>
                                        <div>
                                            <button onClick={() => handleChooseClient(c.email, c.id)} className="btn">Se connecter</button>
                                        </div>
                                    </div>
                                );
                            }
                        }
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}

export default ClientListe;