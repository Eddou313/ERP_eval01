import { useLocation, useNavigate } from "react-router-dom";
import type { StockReductionSummary } from "../../../Backoffice/categorie/api/categoriesApi";

type ResultatProps = {
    summary: StockReductionSummary | null;
    onClose?: () => void;
};

export function Resultat({ summary, onClose }: ResultatProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const routeSummary = summary ?? (location.state as { summary?: StockReductionSummary } | null)?.summary ?? null;

    return (
        <div className="productsPage">
            <div className="productsShell">
                <div className="productsIntro">
                    <div className="eyebrow">Résultat de traitement</div>
                    <h1>Récapitulatif de réduction</h1>
                    <p className="introText">
                        Voici le détail de la réduction appliquée à la catégorie sélectionnée.
                    </p>
                </div>

                {routeSummary ? (
                    <>
                        {/* <div className="summaryMeta"> */}
                            {/* <p>Catégorie ID: {routeSummary.categoryId}</p> */}
                            {/* <p>Réduction demandée: {routeSummary.requestedReduction}</p> */}
                            {/* <p>Total appliqué: {routeSummary.totalApplied}</p> */}
                            {/* <p>Stock total avant: {routeSummary.totalBefore}</p> */}
                            {/* <p>Stock total après: {routeSummary.totalAfter}</p> */}
                        {/* </div> */}
                        <div className="summaryTableWrap">
                            <table className="summaryTable">
                                <thead>
                                    <tr>
                                        <th>Produit</th>
                                        <th>Réf.</th>
                                        {/* <th>Avant</th> */}
                                        <th>Demandé</th>
                                        <th>Appliqué</th>
                                        <th>Après</th>
                                        <th>État</th>
                                    </tr>
                                </thead>
                                <tbody> 
                                    {routeSummary.lines.map((line) => (
                                        <tr key={line.productId}>
                                            <td>{line.productName}</td>
                                            <td>{line.reference || "-"}</td>
                                            {/* <td>{line.quantityBefore}</td> */}
                                            <td>{line.requestedReduction}</td>
                                            <td>{line.appliedReduction}</td>
                                            <td>{line.quantityAfter}</td>
                                            <td>{line.success ? "OK" : "Erreur"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <th colSpan={2}>Total</th>
                                        {/* <th>{routeSummary.totalBefore}</th> */}
                                        <th>{routeSummary.requestedReduction}</th>
                                        <th>{routeSummary.totalApplied}</th>
                                        <th>{routeSummary.totalAfter}</th>
                                        <th>{routeSummary.remainingRequested > 0 ? `Restant: ${routeSummary.remainingRequested}` : "Terminé"}</th>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </>
                ) : (
                    <p className="modalHint">Aucun résultat de réduction n’est disponible pour le moment.</p>
                )}

                <div className="modal-actions">
                    <button type="button" className="btn btn-adjust" onClick={() => navigate("/produits")}>Retour aux produits</button>
                    {onClose ? (
                        <button type="button" className="btn" onClick={onClose}>Fermer</button>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
export default Resultat;