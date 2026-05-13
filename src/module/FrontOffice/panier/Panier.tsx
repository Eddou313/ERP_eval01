import FrontOfficeHeader from "../include/FrontOfficeHeader";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {getCart,getLatestCartForCustomerId,getOrCreateGuestCart,updateCartItems,type CartDetail} from "../../Backoffice/panier/api/panierApi";
import { getStoredClientSession } from "../client/api/clientAPI";
import { getProductImageUrl } from "../../../utils/helper";
import "./Panier.css";

export function Panier()
{
    const navigate = useNavigate();
    const [cart, setCart] = useState<CartDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [updatingLineKey, setUpdatingLineKey] = useState<string | null>(null);

    useEffect(() => {
        const loadCurrentCustomerCart = async () => {
            try {
                setLoading(true);
                setError(null);

                const session = getStoredClientSession();
                const customerId = Number(session?.id || 0);

                if (!Number.isFinite(customerId) || customerId <= 0) {
                    const guestCart = await getOrCreateGuestCart();
                    setCart(guestCart);
                    return;
                }

                const latestCart = await getLatestCartForCustomerId(customerId);
                setCart(latestCart);
            } catch (e) {
                console.error("Erreur chargement panier client:", e);
                setError("Impossible de charger votre panier.");
                setCart(null);
            } finally {
                setLoading(false);
            }
        };

        loadCurrentCustomerCart();
    }, []);

    const lines = useMemo(() => cart?.items ?? [], [cart]);
    const totalQuantity = useMemo(
        () => lines.reduce((sum, item) => sum + (item.quantity || 0), 0),
        [lines],
    );
    const total = useMemo(
        () => lines.reduce((sum, item) => sum + (item.total || 0), 0),
        [lines],
    );

    const formatEuro = (value: number) =>
        new Intl.NumberFormat("fr-FR", {
            style: "currency",
            currency: "EUR",
        }).format(value || 0);

    const extractNameParts = (label: string) => {
        const parts = String(label || "").split("\n");
        return {
            title: parts[0] || "Produit",
            reference: parts.find((p) => p.toLowerCase().includes("réf")) || "",
        };
    };

    const buildLineKey = (productId: number, productAttributeId?: number) =>
        `${productId}-${productAttributeId ?? 0}`;

    const updateQuantity = async (productId: number, productAttributeId: number | undefined, nextQuantity: number) => {
        if (!cart) return;

        const normalizedQty = Math.max(0, Number(nextQuantity) || 0);
        const lineKey = buildLineKey(productId, productAttributeId);

        try {
            setUpdatingLineKey(lineKey);

            const payloadItems = (cart.items ?? [])
                .map((line) => {
                    const sameLine =
                        line.product_id === productId &&
                        (line.id_product_attribute ?? 0) === (productAttributeId ?? 0);

                    return {
                        id_product: line.product_id,
                        id_product_attribute: line.id_product_attribute ?? 0,
                        quantity: sameLine ? normalizedQty : line.quantity,
                    };
                })
                .filter((line) => line.quantity > 0);

            await updateCartItems(cart.id, cart.id_customer, payloadItems);
            const refreshed = await getCart(cart.id);
            setCart(refreshed);
        } catch (e) {
            console.error("Erreur mise à jour quantité panier:", e);
            setError("Impossible de mettre à jour la quantité du panier.");
        } finally {
            setUpdatingLineKey(null);
        }
    };

    return (
        <div className="panier_group">
            <FrontOfficeHeader/>
            <div className="panier_page">
                <div className="panier_left">
                    <h1 className="panier_title">PANIER</h1>

                    {loading && <p className="panier_state">Chargement du panier...</p>}
                    {!loading && error && <p className="panier_state panier_error">{error}</p>}

                    {!loading && !error && lines.length === 0 && (
                        <p className="panier_state">Votre panier est actuellement vide.</p>
                    )}

                    {!loading && !error && lines.length > 0 && (
                        <div className="panier_lines">
                            {lines.map((item, index) => {
                                const itemData = extractNameParts(item.name);
                                const lineKey = buildLineKey(item.product_id, item.id_product_attribute);
                                const isUpdatingLine = updatingLineKey === lineKey;

                                return (
                                    <article key={`${item.product_id}-${index}`} className="panier_line">
                                        {item.image_id ? (
                                            <img
                                                className="panier_thumb_img"
                                                src={getProductImageUrl(item.product_id, item.image_id)}
                                                alt={itemData.title}
                                            />
                                        ) : (
                                            <div className="panier_thumb" aria-hidden="true" />
                                        )}

                                        <div className="panier_info">
                                            <h2>{itemData.title}</h2>
                                            {itemData.reference && (
                                                <p className="panier_reference">{itemData.reference}</p>
                                            )}
                                            {item.attributes_label && (
                                                <p className="panier_attributes">Attributs: {item.attributes_label}</p>
                                            )}
                                        </div>

                                        <div className="panier_qty_box panier_qty_editor">
                                            <button
                                                type="button"
                                                onClick={() => updateQuantity(item.product_id, item.id_product_attribute, item.quantity - 1)}
                                                disabled={isUpdatingLine || item.quantity <= 1}
                                            >
                                                −
                                            </button>
                                            <input
                                                type="number"
                                                min={1}
                                                value={item.quantity}
                                                disabled={isUpdatingLine}
                                                onChange={(e) =>
                                                    updateQuantity(
                                                        item.product_id,
                                                        item.id_product_attribute,
                                                        Math.max(1, Number(e.target.value) || 1),
                                                    )
                                                }
                                            />
                                            <button
                                                type="button"
                                                onClick={() => updateQuantity(item.product_id, item.id_product_attribute, item.quantity + 1)}
                                                disabled={isUpdatingLine}
                                            >
                                                +
                                            </button>
                                        </div>

                                        <div className="panier_line_total">
                                            {formatEuro(item.total)}
                                        </div>

                                        <button
                                            type="button"
                                            className="panier_delete"
                                            aria-label="Supprimer"
                                            onClick={() => updateQuantity(item.product_id, item.id_product_attribute, 0)}
                                            disabled={isUpdatingLine}
                                        >
                                            🗑
                                        </button>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </div>

                <aside className="panier_right">
                    <div className="panier_resume_row">
                        <span style={{fontSize:20}}>{totalQuantity} articles</span>
                        <strong style={{fontSize:30}}>{formatEuro(total)}</strong>
                    </div>
                    {/* <div className="panier_resume_row">
                        <span>Livraison</span>
                        <strong>gratuit</strong>
                    </div> */}

                    <hr className="panier_separator" />

                    <div className="panier_resume_row panier_total_row">
                        <span style={{fontSize:20}}>Total TTC</span>
                        <strong style={{fontSize:30}}>{formatEuro(total)}</strong>
                    </div>

                    <button type="button" onClick={() => navigate('/Commande')} className="panier_checkout_btn" disabled={lines.length === 0}>
                        COMMANDER
                    </button>
                </aside>
            </div>
        </div>
    );
}
export default Panier;