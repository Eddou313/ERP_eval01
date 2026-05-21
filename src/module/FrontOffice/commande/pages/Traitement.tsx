import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import FrontOfficeHeader from "../../include/FrontOfficeHeader";
import { getOrder } from "../../../Backoffice/commande/api/commandesApi";
import { getCart } from "../../../Backoffice/panier/api/panierApi";
import type { CartDetail } from "../../../Backoffice/panier/api/object";
import type { OrderResource } from "../../../Backoffice/commande/api/ObjetOrder";
import { getStockByProductId } from "../../../Backoffice/stock/api/stockApi";
import { validerCommande } from "../api/validation";
import { type Reponse } from "./Commande";
import "./Traitement.css";

type CommandeState = {
    Response?: Reponse;
};

type LigneCommande = CartDetail["items"][number];

export function Traitement()
{
    const local = useLocation();
    const navigate = useNavigate();
    const state = (local.state ?? {}) as CommandeState;
    const object = state.Response;

    const id = object?.id ?? 0;
    const liste = object?.liste;
    const valeur = object?.valeur ?? 1;

    const [loading, setLoading] = useState(true);
    const [stockLoading, setStockLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [order, setOrder] = useState<OrderResource | null>(null);
    const [cart, setCart] = useState<CartDetail | null>(null);
    const [stockByLine, setStockByLine] = useState<Record<string, number | null>>({});

    useEffect(() => {
        if (!object) {
            setLoading(false);
            setError("Aucune commande à afficher.");
            return;
        }

        const load = async () => {
            setLoading(true);
            setError(null);

            try {
                if (liste?.id && liste.id > 0) {
                    const loadedOrder = await getOrder(liste.id);

                    setOrder(loadedOrder);
                    if (loadedOrder.id_cart) {
                        const loadedCart = await getCart(loadedOrder.id_cart);
                        setCart(loadedCart);
                    }
                } else if (liste?.id) {
                    const cartId = Math.abs(liste.id);
                    const loadedCart = await getCart(cartId);
                    setCart(loadedCart);
                }
            } catch (e: any) {
                setError(e?.message || "Impossible de charger le détail de la commande.");
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [object, liste?.id]);

    useEffect(() => {
        if (!cart || cart.items.length === 0) {
            setStockByLine({});
            setStockLoading(false);
            return;
        }

        const loadStocks = async () => {
            setStockLoading(true);

            try {
                const entries = await Promise.all(
                    cart.items.map(async (line) => {
                        const key = `${line.product_id}-${line.id_product_attribute ?? 0}`;
                        if (typeof line.stock === "number") {
                            return [key, line.stock] as const;
                        }

                        const stock = await getStockByProductId(line.product_id, line.id_product_attribute);
                        return [key, stock] as const;
                    }),
                );

                setStockByLine(Object.fromEntries(entries));
            } catch {
                setStockByLine({});
            } finally {
                setStockLoading(false);
            }
        };

        loadStocks();
    }, [cart]);

    const lines = cart?.items ?? [];
    const lineCount = lines.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0);
    const duplicationCount = Math.max(1, Number(valeur) || 1);
    const duplicatedLineCount = lineCount * duplicationCount;
    const duplicatedTotal = useMemo(() => {
        return lines.reduce((sum, line) => sum + (Number(line.total) || 0), 0) * duplicationCount;
    }, [lines, duplicationCount]);

    const lineChecks = lines.map((line) => {
        const key = `${line.product_id}-${line.id_product_attribute ?? 0}`;
        const realStock = typeof line.stock === "number" ? line.stock : stockByLine[key];
        const quantityAfterDuplication = Number(line.quantity || 0) * duplicationCount;
        const isStockKnown = typeof realStock === "number" && Number.isFinite(realStock);
        const accepted = isStockKnown && quantityAfterDuplication <= realStock;

        return {
            ...line,
            key,
            realStock: isStockKnown ? realStock : null,
            quantityAfterDuplication,
            accepted,
        };
    });

    const stockIssues = lineChecks.filter((line) => !line.accepted);
    const canValidate = Boolean(
        !loading &&
        !stockLoading &&
        !submitting &&
        !error &&
        order?.id &&
        order.id > 0 &&
        lines.length > 0 &&
        stockIssues.length === 0,
    );

    const stockMessage = useMemo(() => {
        if (loading) return "Chargement du détail...";
        if (error) return error;
        if (stockLoading) return "Vérification du stock réel en cours...";
        if (lines.length === 0) return "Aucun produit disponible pour cette commande.";
        if (!order?.id) return "Validation impossible : aucune commande source exploitable.";
        if (canValidate) return "accepter duplication";

        const details = stockIssues
            .map((line) => {
                if (line.realStock === null) {
                    return `${line.name} : stock réel indisponible`;
                }

                return `${line.name} : ${line.quantityAfterDuplication} demandé(s) après duplication, stock réel ${line.realStock}`;
            })
            .join(" | ");

        return `Duplication refusée : ${details}`;
    }, [canValidate, error, lineChecks, lines.length, loading, order?.id, stockLoading, stockIssues]);

    const handleValidate = () => {
        if (!canValidate || !order?.id || !order.id_customer) return;

        const runValidation = async () => {
            try {
                setSubmitting(true);
                const success = await validerCommande(order.id_customer, order.id);
                if (success) {
                    navigate("/Mescommande");
                    return;
                }
                setError("La validation de la commande a échoué.");
            } catch (e: any) {
                setError(e?.message || "La validation de la commande a échoué.");
            } finally {
                setSubmitting(false);
            }
        };

        runValidation();
    };

    return (
        <div className="traitement-page">
            <FrontOfficeHeader />
            <main className="traitement-shell">
                <section className="traitement-card traitement-summary">
                    <div className="traitement-title-row">
                        <div>
                            <p className="traitement-kicker">Détail de commande</p>
                            <h2>Commande {liste?.reference || `#${id}`}</h2>
                        </div>
                        <div className="traitement-state">{liste?.payment || order?.payment || "Commande"}</div>
                    </div>

                    <div className="traitement-grid">
                        <div className="traitement-stat">
                            <span>Référence</span>
                            <strong>{liste?.reference || order?.reference || "-"}</strong>
                        </div>
                        <div className="traitement-stat">
                            <span>Valeur</span>
                            <strong>x {duplicationCount}</strong>
                        </div>
                        <div className="traitement-stat">
                            <span>Lignes produits</span>
                            <strong>{lines.length}</strong>
                        </div>
                        <div className="traitement-stat">
                            <span>Quantités totales</span>
                            <strong>{lineCount}</strong>
                        </div>
                    </div>

                    <div className={`traitement-validation-message ${canValidate ? "is-accepted" : "is-rejected"}`}>
                        {stockMessage}
                    </div>
                </section>

                <section className="traitement-card">
                    <div className="traitement-section-header">
                        <h3>Produits dans la commande</h3>
                        <p>Chaque ligne affiche la quantité commandée et la quantité après duplication.</p>
                    </div>

                    {loading && <p className="traitement-message">Chargement du détail...</p>}
                    {error && <p className="traitement-error">{error}</p>}

                    {!loading && !error && lines.length === 0 && (
                        <p className="traitement-message">Aucun produit disponible pour cette commande.</p>
                    )}

                    {!loading && !error && lines.length > 0 && (
                        <div className="traitement-lines">
                            {lineChecks.map((line: LigneCommande & { key: string; realStock: number | null; quantityAfterDuplication: number; accepted: boolean }) => (
                                <article className={`traitement-line ${line.accepted ? "is-accepted-line" : "is-rejected-line"}`} key={line.key}>
                                    <div className="traitement-product-meta">
                                        <div className="traitement-product-name">{line.name}</div>
                                        {line.attributes_label ? <div className="traitement-product-attrs">{line.attributes_label}</div> : null}
                                        <div className="traitement-product-ref">Produit #{line.product_id}</div>
                                    </div>

                                    <div className="traitement-line-stats">
                                        <div>
                                            <span>Quantité</span>
                                            <strong>{line.quantity}</strong>
                                        </div>
                                        <div>
                                            <span>Après duplication</span>
                                            <strong>{line.quantityAfterDuplication}</strong>
                                        </div>
                                        <div>
                                            <span>Stock réel</span>
                                            <strong>{line.realStock === null ? "Indisponible" : line.realStock}</strong>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>

                <section className="traitement-card traitement-footer">
                    <div className="traitement-footer-left">
                        <div>
                            <span>Total dupliqué estimé</span>
                            <strong>{duplicatedTotal.toFixed(2)} €</strong>
                        </div>
                        <div>
                            <span>Nombre total de produits dupliqués</span>
                            <strong>{duplicatedLineCount}</strong>
                        </div>
                    </div>

                    <button className="traitement-validate-btn" onClick={handleValidate} disabled={!canValidate}>
                        {submitting ? "Validation..." : "Valider"}
                    </button>
                </section>
            </main>
        </div>
    )
}
export default Traitement;