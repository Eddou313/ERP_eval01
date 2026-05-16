import { useEffect, useState } from "react";
import "./StockMovements.css";
import { listStockMovementsPaged, formatDate } from "../api/stockApi";
import { getProductImageUrlWithFallback } from "../../../../utils/helper";
import { Link } from "react-router-dom";

export default function StockMovements() {
    const [moves, setMoves] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState<number>(1);
    const pageSize = 10;

    async function fetchMoves(p = page) {
        setLoading(true);
        try {
            const items = await listStockMovementsPaged(p, pageSize);
            setMoves(items || []);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchMoves(page);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);

    return (
        <div className="movements-page">
            <h1>Mouvements de stock</h1>
            <div className="movements-table-wrap">
                <table className="movements-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Type</th>
                            <th>Référence</th>
                            <th>Produit</th>
                            <th>Quantité</th>
                            {/* <th>Emplacement</th> */}
                            <th>Note</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={7}>Chargement…</td></tr>
                        ) : moves.length === 0 ? (
                            <tr><td colSpan={7}>Aucun mouvement</td></tr>
                        ) : (
                            moves.map((m) => (
                                <tr key={m.id} className={m.quantity < 0 ? "negative" : ""}>
                                    <td>{formatDate(m.date || "")}</td>
                                    <td>{m.movementType || "-"}</td>
                                    <td>{m.reference || "-"}</td>
                                    <td className="col-product">
                                        <img
                                            src={getProductImageUrlWithFallback(m.id_product, m.id_default_image, "https://via.placeholder.com/80")}
                                            alt={m.productName || ""}
                                        />
                                        <div>
                                            <div className="product-main">{m.productName || "-"}</div>
                                            {m.combinationLabel ? (
                                                <div className="product-combination">{m.combinationLabel}</div>
                                            ) : (m.id_product_attribute ?? 0) > 0 ? (
                                                <div className="product-combination">Combinaison #{m.id_product_attribute}</div>
                                            ) : null}
                                        </div>
                                    </td>
                                    <td className={`qty ${m.sign && m.sign > 0 ? "qty-positive" : "qty-negative"}`}>
                                        {m.sign && m.sign > 0 ? "+" : "-"}{m.quantity}
                                    </td>
                                    {/* <td>{m.location ?? "-"}</td> */}
                                    <td>{m.employeeName ?? m.note ?? ""}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            <div className="pagination">
                <button className="btn" onClick={() => setPage((s) => Math.max(1, s - 1))} disabled={page === 1 || loading}>
                    Précédent
                </button>
                <span className="page-info">Page {page}</span>
                <button
                    className="btn"
                    onClick={() => setPage((s) => s + 1)}
                    disabled={loading || moves.length < pageSize}
                >
                    Suivant
                </button>
            </div>
            <Link to="/catalogue/stock">voir stock</Link>
        </div>
    );
}
