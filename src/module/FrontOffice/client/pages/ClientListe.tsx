import { useEffect, useState } from "react";
// import FrontOfficeHeader from "../../include/FrontOfficeHeader";
import { listClientsLight, type ClientListItem } from "../../../Backoffice/client/api/clientApi";
import { useLocation, useNavigate } from "react-router-dom";
import { createSession } from "../../../Backoffice/client/api/clientApi"
import { logoutClient } from "../api/clientAPI";
import { deleteCart, getGuestCartCookiePayload, clearGuestCartCookie, getCart, getLatestCartForCustomerId, updateCartItems } from "../../../Backoffice/panier/api/panierApi";
import "./ClientListe.css";

export function ClientListe() {
    const navigate = useNavigate();
    const [clients, setClients] = useState<ClientListItem[]>([]);
    const [loading, setLoading] = useState(true);

    const location = useLocation();
    const [messageState] = useState<string | null>(location.state && (location.state as any).message ? (location.state as any).message : null);
    const redirectTo = (location.state as any)?.redirectTo as string | undefined;
    const [error, setError] = useState<string | null>(null);
    const [infoMessage, setInfoMessage] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);

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

    const handleChooseClient = async (id: number) => {
        if (processing) return;
        setProcessing(true);
        const chec = await createSession(id);
        if (chec) {
            // If there is a guest cart, merge it into the selected customer's active cart
            try {
                const guestPayload = getGuestCartCookiePayload();
                if (guestPayload?.id_cart) {
                    const guestCart = await getCart(guestPayload.id_cart).catch(() => null);
                    if (guestCart) {
                        const guestItems = (guestCart.items || []).map((it) => ({
                            id_product: it.product_id,
                            id_product_attribute: it.id_product_attribute ?? 0,
                            quantity: it.quantity || 0,
                        }));

                        const customerCart = await getLatestCartForCustomerId(id).catch(() => null);

                        if (customerCart && !customerCart.id_order) {
                            const mergedItems = [...(customerCart.items || [])];

                            for (const guestItem of guestItems) {
                                const existingItem = mergedItems.find(
                                    (line) =>
                                        line.product_id === guestItem.id_product &&
                                        (line.id_product_attribute ?? 0) === guestItem.id_product_attribute,
                                );

                                if (existingItem) {
                                    existingItem.quantity = (existingItem.quantity || 0) + guestItem.quantity;
                                } else {
                                    mergedItems.push({
                                        product_id: guestItem.id_product,
                                        id_product_attribute: guestItem.id_product_attribute,
                                        quantity: guestItem.quantity,
                                    } as any);
                                }
                            }

                            await updateCartItems(
                                customerCart.id,
                                id,
                                mergedItems.map((line) => ({
                                    id_product: line.product_id,
                                    id_product_attribute: line.id_product_attribute ?? 0,
                                    quantity: line.quantity || 0,
                                })),
                            ).catch(() => null);

                            await deleteCart(guestCart.id).catch(() => null);
                        } else {
                            // No active cart for the customer yet: reuse the guest cart as the customer cart
                            if (guestItems.length > 0 || guestCart.id_customer !== id) {
                                await updateCartItems(guestCart.id, id, guestItems).catch(() => null);
                            }
                        }

                        // Clear guest cookie so future guests get a fresh cart
                        clearGuestCartCookie();
                    }
                }
            } catch (err) {
                console.warn("Erreur migration panier invité -> client :", err);
            }

            // show info message then navigate shortly after so user sees confirmation
            setInfoMessage("Le panier invité a été fusionné avec le compte sélectionné.");
            setTimeout(() => {
                navigate(redirectTo || "/produits");
            }, 900);
            setProcessing(false);
        }
        else console.error(`erreur lors de la login`);
    };

    const handleAnonymous = () => {
        try { logoutClient(); } catch { }
        navigate(redirectTo || "/produits");
    };

    return (
        <div className="clientListPage">
            <main style={{ padding: 20 }}>
                {
                    messageState && (
                        <div style={{ backgroundColor: '#fff4cc', border: '1px solid #ffd27a', padding: '12px 16px', borderRadius: 6, marginBottom: 12 }}>
                            <strong style={{ display: 'block', marginBottom: 6 }}>Information</strong>
                            <div>{messageState}</div>
                        </div>
                    )
                }
                {
                    infoMessage && (
                        <div style={{ backgroundColor: '#e6ffef', border: '1px solid #9be6b8', padding: '12px 16px', borderRadius: 6, marginBottom: 12 }}>
                            <strong style={{ display: 'block', marginBottom: 6 }}>Succès</strong>
                            <div>{infoMessage}</div>
                        </div>
                    )
                }
                <h1>Choisissez un utilisateur</h1>
                {loading && <p>Chargement...</p>}
                {error && <p className="error">{error}</p>}

                {!loading && !error && (
                    <div style={{ display: "grid", gap: 12 }}>
                        <div style={{ margin: "12px 0" }}>
                            <button onClick={handleAnonymous} className="btn">continuer en tant qu'utilisateur anonyme</button>
                        </div>
                        {clients.map((c) => {
                            // if (c.id === 1) {
                            //     return (

                            //     );
                            // }
                            // else {
                            return (
                                <div key={c.id} style={{ border: "1px solid #eee", padding: 12, borderRadius: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{c.fullName || c.email}</div>
                                        <div style={{ fontSize: 12, color: "#666" }}>{c.email}</div>
                                    </div>
                                    <div>
                                                <button onClick={() => handleChooseClient(c.id)} className="btn" disabled={processing}>Se connecter</button>
                                    </div>
                                </div>
                            );
                        }
                            // }
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}

export default ClientListe;