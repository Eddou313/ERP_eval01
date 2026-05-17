import { useEffect, useState } from "react";
import "./Stock.css";
import { listStockItemsPaged } from "../api/stockApi";
import { applyStockModification } from "../api/stockMovementService";
import { IconSettings } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { getProductImageUrlWithFallback } from "../../../../utils/helper";
import {Test} from "./Test"

export function Stock() {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Modal
    const [modalOpen, setModalOpen] = useState(false);
    const [selected, setSelected] = useState<any | null>(null);
    const [delta, setDelta] = useState<number>(0);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const [page, setPage] = useState<number>(1);
    const pageSize = 10;

    async function fetchProducts(p = page) {
        setLoading(true);
        try {
            const items = await listStockItemsPaged(p, pageSize);
            setProducts(items || []);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchProducts(page);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);

    function openAddModal(p: any) {
        setSelected(p);
        setDelta(0);
        setModalOpen(true);
    }

    function closeModal() {
        setModalOpen(false);
        setSelected(null);
        setDelta(0);
    }

    async function confirmAdd() {
        if (!selected) return;
        const add = Number(delta) || 0;
        
        // Vérifier que la quantité n'est pas 0
        if (add === 0) {
            setMessage({ type: "error", text: "La quantité doit être différente de 0" });
            setTimeout(() => setMessage(null), 3000);
            return;
        }

        setSaving(true);
        try {
            // Appliquer la modification de stock avec enregistrement du mouvement
            const result = await applyStockModification(
                selected.id_product,
                selected.availableQuantity || 0,
                add,
                selected.id_product_attribute || 0,
                "adjustment"
            );

            if (result.success) {
                setMessage({ type: "success", text: result.message });
                // Rafraîchir la liste
                await fetchProducts();
                setTimeout(() => {
                    closeModal();
                    setMessage(null);
                }, 1500);
            } else {
                setMessage({ type: "error", text: result.message });
                setTimeout(() => setMessage(null), 3000);
            }
        } catch (error) {
            console.error("Erreur:", error);
            setMessage({ type: "error", text: "Erreur lors de la modification du stock" });
            setTimeout(() => setMessage(null), 3000);
        } finally {
            setSaving(false);
        }
    }
    const navigate = useNavigate();

    return (
        <div className="stock-page">
            <Test />
            {message && (
                <div className={`message message-${message.type}`}>
                    {message.text}
                </div>
            )}
            <h1>Stock <IconSettings size={20} stroke={1.8} onClick={()=>navigate("/stock/etat")}/></h1>
            <div className="stock-table-wrap">
                <table className="stock-table">
                    <thead>
                        <tr>
                            <th>Photo</th>
                            <th>Référence</th>
                            <th>Produit</th>
                            <th>Quantité</th>
                            <th>Réservé</th>
                            <th>Emplacement</th>
                            <th>Disponibilité</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={8}>Chargement…</td></tr>
                        ) : products.length === 0 ? (
                            <tr><td colSpan={8}>Aucun produit en stock</td></tr>
                        ) : (
                            products.map((p) => (
                                <tr key={p.id} className={p.availableQuantity - (p.reservedQuantity || 0) <= 0 ? "out-of-stock" : ""}>
                                    <td className="col-photo">
                                        <img
                                            src={getProductImageUrlWithFallback(p.id_product, p.id_default_image, "https://via.placeholder.com/80")}
                                            alt={p.productName || ""}
                                        />
                                    </td>
                                    <td>{p.reference}</td>
                                    <td className="col-name">
                                        <div className="product-main">{p.productName}</div>
                                        {p.combinationLabel ? (
                                            <div className="product-combination">{p.combinationLabel}</div>
                                        ) : (p.id_product_attribute ?? 0) > 0 ? (
                                            <div className="product-combination">Combinaison #{p.id_product_attribute}</div>
                                        ) : null}
                                    </td>
                                    <td>{p.availableQuantity}</td>
                                    <td>{p.reservedQuantity ?? 0}</td>
                                    <td>{p.location ?? "-"}</td>
                                    <td>{Math.max(0, (p.availableQuantity || 0) - (p.reservedQuantity || 0))}</td>
                                    <td>
                                        <div className="actions">
                                            <button className="btn btn-adjust" onClick={() => openAddModal(p)}>Ajouter quantité</button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {modalOpen && selected && (
                <div className="modal-backdrop">
                    <div className="modal">
                        <h3>Ajouter quantité — {selected.productName}</h3>
                        <p>Quantité actuelle: <strong>{selected.availableQuantity}</strong></p>
                        <div className="modal-row">
                            <label>quantiter</label>
                            <input type="number" value={delta} onChange={(e) => setDelta(Number(e.target.value))} />
                        </div>
                        <div className="modal-actions">
                            <button className="btn" onClick={closeModal} disabled={saving}>Annuler</button>
                            <button className="btn btn-adjust" onClick={confirmAdd} disabled={saving}>Confirmer</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="pagination">
                <button className="btn" onClick={() => setPage((s) => Math.max(1, s - 1))} disabled={page === 1 || loading}>
                    Précédent
                </button>
                <span className="page-info">Page {page}</span>
                <button
                    className="btn"
                    onClick={() => setPage((s) => s + 1)}
                    disabled={loading || products.length < pageSize}
                >
                    Suivant
                </button>
            </div>
        </div>
    );
}

export default Stock;