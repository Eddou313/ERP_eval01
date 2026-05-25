import { useState, type FormEvent } from "react";
import { buildImageMapFromZip } from "../api/zip";
import type { colonneCSV } from "../api/colonne";
import { COMMANDE_CLIENT_PRODUIT_COLUMNS, COMMANDE_CLIENT_PRODUIT_DATE_COLUMNS, PRODUIT_ATTRIBUT_STOCK_IMPORT_COLUMNS, PRODUIT_ATTRIBUT_STOCK_POSITIVE_NUMBER_COLUMNS, PRODUIT_IMPORT_COLUMNS, PRODUIT_IMPORT_DATE_COLUMNS, PRODUIT_IMPORT_POSITIVE_NUMBER_COLUMNS } from "../api/colonne";
import { parseFile } from "../api/parse";
import { importProduitCsv } from "../api/importCSV1";
import { importCsv2ToPrestashop } from "../api/importCSV2";
import { importProduitCommandeCsv } from "../api/importCSV3";
import "./Import.css";
import { InitialisationGLobal } from "../../files/api/Initialisation&export";

type ImportStepKey = "zip" | "csv1" | "csv2" | "csv3";

type ImportProgress = {
    percent: number;
    label: string;
    detail: string;
    processed: number;
    total: number;
    imported: number;
    failed: number;
    status: "idle" | "running" | "done" | "error";
};

const createIdleProgress = (label: string, detail: string): ImportProgress => ({
    percent: 0,
    label,
    detail,
    processed: 0,
    total: 0,
    imported: 0,
    failed: 0,
    status: "idle",
});

export function Import() {

    const [config] = useState({
        separator: ',',
        encoding: 'UTF-8',
        skipHeader: true
    });

    const [csv1, setCSV1] = useState<File | null>(null);
    const [csv2, setCSV2] = useState<File | null>(null);
    const [csv3, setCSV3] = useState<File | null>(null);
    const [zipFile, setZIP1] = useState<File | null>(null);

    const [mes, setMes] = useState<string>("");
    const [ver, setVer] = useState<boolean>(false);
    const [importing, setImporting] = useState<boolean>(false);
    const [progress, setProgress] = useState<Record<ImportStepKey, ImportProgress>>({
        zip: createIdleProgress("ZIP", "Aucun ZIP sélectionné"),
        csv1: createIdleProgress("Fichier 1", "Aucun fichier sélectionné"),
        csv2: createIdleProgress("Fichier 2", "Aucun fichier sélectionné"),
        csv3: createIdleProgress("Fichier 3", "Aucun fichier sélectionné"),
    });

    const resetProgress = () => {
        setProgress({
            zip: createIdleProgress("ZIP", zipFile ? "ZIP prêt" : "Aucun ZIP sélectionné"),
            csv1: csv1 ? createIdleProgress("Fichier 1", `Fichier prêt: ${csv1.name}`) : createIdleProgress("Fichier 1", "Aucun fichier sélectionné"),
            csv2: csv2 ? createIdleProgress("Fichier 2", `Fichier prêt: ${csv2.name}`) : createIdleProgress("Fichier 2", "Aucun fichier sélectionné"),
            csv3: csv3 ? createIdleProgress("Fichier 3", `Fichier prêt: ${csv3.name}`) : createIdleProgress("Fichier 3", "Aucun fichier sélectionné"),
        });
    };

    const updateStepProgress = (key: ImportStepKey, patch: Partial<ImportProgress>) => {
        setProgress((current) => {
            const previous = current[key];
            const total = patch.total ?? previous.total;
            const processed = patch.processed ?? previous.processed;
            const percent = patch.percent ?? (total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : previous.percent);

            return {
                ...current,
                [key]: {
                    ...previous,
                    ...patch,
                    total,
                    processed,
                    percent,
                    label: patch.label ?? previous.label,
                    detail: patch.detail ?? previous.detail,
                    imported: patch.imported ?? previous.imported,
                    failed: patch.failed ?? previous.failed,
                    status: patch.status ?? previous.status,
                },
            };
        });
    };

    const Importer = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setMes("");
        setImporting(true);
        resetProgress();

        if (!csv1 && !csv2 && !csv3) {
            setMes("Inserer au moins un fichier csv valide !");
            setImporting(false);
            return;
        }

        try {
            let imageProduit;

            if (ver) {
                if (zipFile) {
                    updateStepProgress("zip", { label: "ZIP", detail: `Lecture de ${zipFile.name}...`, status: "running", percent: 0 });
                    imageProduit = await buildImageMapFromZip(zipFile, (step) => {
                        updateStepProgress("zip", {
                            label: step.label,
                            detail: step.detail,
                            processed: step.processed,
                            total: step.total,
                            status: "running",
                        });
                    });
                    updateStepProgress("zip", {
                        label: "ZIP",
                        detail: `${imageProduit.size} image(s) exploitée(s)`,
                        processed: progress.zip.total || imageProduit.size,
                        total: progress.zip.total || imageProduit.size,
                        percent: 100,
                        status: "done",
                    });
                } else {
                    updateStepProgress("zip", { label: "ZIP", detail: "Option images activée mais aucun ZIP fourni", status: "done", percent: 100 });
                    imageProduit = new Map<string, { blob: Blob; fileName: string }>();
                }
            } else {
                updateStepProgress("zip", { label: "ZIP", detail: "Import ZIP désactivé", status: "done", percent: 100 });
            }

            const [parsedProducts, parsedAttributes, parsedOrders] = await Promise.all([
                csv1 ? parseFile<colonneCSV["produitImport"]>(csv1, config.separator, PRODUIT_IMPORT_COLUMNS as unknown as (keyof any)[], [...PRODUIT_IMPORT_DATE_COLUMNS], [...PRODUIT_IMPORT_POSITIVE_NUMBER_COLUMNS]) : Promise.resolve([]),
                csv2 ? parseFile<colonneCSV["produit_Attribut_StockImport"]>(csv2, config.separator, PRODUIT_ATTRIBUT_STOCK_IMPORT_COLUMNS as unknown as (keyof any)[], [], [...PRODUIT_ATTRIBUT_STOCK_POSITIVE_NUMBER_COLUMNS]) : Promise.resolve([]),
                csv3 ? parseFile<colonneCSV["Commande_client_produit"]>(csv3, config.separator, COMMANDE_CLIENT_PRODUIT_COLUMNS as unknown as (keyof any)[], [...COMMANDE_CLIENT_PRODUIT_DATE_COLUMNS], []) : Promise.resolve([]),
            ]);

            if (csv1) {
                console.log("Produit import :", parsedProducts);
                updateStepProgress("csv1", { label: "Fichier 1", detail: `Import de ${parsedProducts.length} produit(s)...`, total: parsedProducts.length, processed: 0, imported: 0, failed: 0, status: "running", percent: 0 });
                await importProduitCsv(parsedProducts, imageProduit, {
                    onProgress: (step) => updateStepProgress("csv1", {
                        label: "Fichier 1",
                        detail: step.current ?? "Traitement en cours",
                        processed: step.processed,
                        total: step.total,
                        imported: step.imported,
                        failed: step.failed,
                        status: step.processed >= step.total ? "done" : "running",
                    }),
                });
                updateStepProgress("csv1", { label: "Fichier 1", detail: "Import terminé", percent: 100, status: "done" });
            } else {
                updateStepProgress("csv1", { label: "Fichier 1", detail: "Aucun fichier sélectionné", percent: 100, status: "done" });
            }

            if (csv2) {
                console.log("Attribut stock import :", parsedAttributes);
                updateStepProgress("csv2", { label: "Fichier 2", detail: `Import de ${parsedAttributes.length} ligne(s)...`, total: parsedAttributes.length, processed: 0, imported: 0, failed: 0, status: "running", percent: 0 });
                await importCsv2ToPrestashop(parsedAttributes, {
                    onProgress: (step) => updateStepProgress("csv2", {
                        label: "Fichier 2",
                        detail: step.current ?? "Traitement en cours",
                        processed: step.processed,
                        total: step.total,
                        imported: step.imported,
                        failed: step.failed,
                        status: step.processed >= step.total ? "done" : "running",
                    }),
                });
                updateStepProgress("csv2", { label: "Fichier 2", detail: "Import terminé", percent: 100, status: "done" });
            } else {
                updateStepProgress("csv2", { label: "Fichier 2", detail: "Aucun fichier sélectionné", percent: 100, status: "done" });
            }

            if (csv3) {
                console.log("Commande client produit import :", parsedOrders);
                updateStepProgress("csv3", { label: "Fichier 3", detail: `Import de ${parsedOrders.length} commande(s)...`, total: parsedOrders.length, processed: 0, imported: 0, failed: 0, status: "running", percent: 0 });
                await importProduitCommandeCsv(parsedOrders, {
                    onProgress: (step) => updateStepProgress("csv3", {
                        label: "Fichier 3",
                        detail: step.current ?? "Traitement en cours",
                        processed: step.processed,
                        total: step.total,
                        imported: step.imported,
                        failed: step.failed,
                        status: step.processed >= step.total ? "done" : "running",
                    }),
                });
                updateStepProgress("csv3", { label: "Fichier 3", detail: "Import terminé", percent: 100, status: "done" });
            } else {
                updateStepProgress("csv3", { label: "Fichier 3", detail: "Aucun fichier sélectionné", percent: 100, status: "done" });
            }

            setMes("Import terminé avec succès.");

        } catch (error: any) {
            setMes(`Erreur : ${error.message}`);
            console.error("Erreur lors de l'importation :", error);
            for (const key of ["zip", "csv1", "csv2", "csv3"] as ImportStepKey[]) {
                setProgress((current) => ({
                    ...current,
                    [key]: {
                        ...current[key],
                        status: "error",
                        detail: error?.message ?? "Une erreur inconnue est survenue.",
                    },
                }));
            }
        }
        finally {
            setImporting(false);
        }
    };

    const renderProgressCard = (key: ImportStepKey, title: string) => {
        const item = progress[key];
        return (
            <div className="import-progress-card">
                <div className="import-progress-card__header">
                    <strong>{title}</strong>
                    <span>{item.percent}%</span>
                </div>
                <div className="import-progress-bar" aria-label={`Progression ${title}`}>
                    <div
                        className={`import-progress-bar__fill import-progress-bar__fill--${item.status}`}
                        style={{ ["--progress" as string]: `${item.percent}%` }}
                    />
                </div>
                <div className="import-progress-meta">
                    <span>{item.detail}</span>
                    <span>{item.processed}/{item.total || "-"}</span>
                </div>
                <div className="import-progress-stats">
                    <span>{item.imported} importé(s)</span>
                    <span>{item.failed} en échec</span>
                </div>
            </div>
        );
    };

    async function InitialiserAllDonner() {
        const confirmed = window.confirm("Êtes-vous sûr de vouloir réinitialiser toutes les données ? Cette action est irréversible.");
        if (confirmed) {
            try {
                setMes("Initialisation en cours...");
                await InitialisationGLobal();
                setMes("Initialisation réussie !");
                setTimeout(() => setMes(""), 3000);
            } catch (error) {
                setMes("Erreur lors de l'initialisation");
                console.error(error);
            }
        }
    }

    return (
        <div className="import-page">
            <button onClick={InitialiserAllDonner} className="submit-button">Initialiser les donner +</button>
            <div className="import-shell">
                <div className="import-header">
                    <div>
                        <h1 className="import-title">Import</h1>
                        <p className="import-subtitle">
                            Chargez un ou plusieurs CSV, puis suivez l’avancement des étapes de traitement dans la barre de progression.
                        </p>
                    </div>
                    <div className="import-badge">{importing ? "Import en cours" : "Prêt"}</div>
                </div>

                <div className="import-grid">
                    <section className="import-card">
                        <h2 className="import-card-title">Fichiers source</h2>
                        <form onSubmit={Importer} className="import-form">
                            <div className="import-field">
                                <label className="import-label" htmlFor="file1">File 1</label>
                                <input
                                    type="file"
                                    id="file1"
                                    name="file1"
                                    className="import-file"
                                    disabled={importing}
                                    onChange={(e) => setCSV1(e.target.files?.[0] || null)}
                                />
                            </div>

                            <div className="import-field">
                                <label className="import-label" htmlFor="file2">File 2</label>
                                <input
                                    type="file"
                                    id="file2"
                                    name="file2"
                                    className="import-file"
                                    disabled={importing}
                                    onChange={(e) => setCSV2(e.target.files?.[0] || null)}
                                />
                            </div>

                            <div className="import-field">
                                <label className="import-label" htmlFor="file3">File 3</label>
                                <input
                                    type="file"
                                    id="file3"
                                    name="file3"
                                    className="import-file"
                                    disabled={importing}
                                    onChange={(e) => setCSV3(e.target.files?.[0] || null)}
                                />
                            </div>

                            <div className="import-field">
                                <label className="import-label" htmlFor="zip1">ZIP images</label>
                                <input
                                    type="file"
                                    id="zip1"
                                    name="zip1"
                                    accept=".zip"
                                    className="import-file"
                                    disabled={importing}
                                    onChange={(e) => setZIP1(e.target.files?.[0] || null)}
                                />
                            </div>

                            <label className="import-check" htmlFor="checkBox">
                                <input
                                    type="checkbox"
                                    id="checkBox"
                                    checked={ver}
                                    disabled={importing}
                                    onChange={(e) => setVer(e.target.checked)}
                                />
                                Importer les images
                            </label>

                            <div className="import-actions">
                                <button type="submit" className="import-button" disabled={importing}>
                                    {importing ? "Import en cours..." : "Importer"}
                                </button>
                            </div>
                        </form>

                        {mes && (
                            <div className={`import-message ${mes.startsWith("Erreur") ? "import-message--error" : "import-message--success"}`}>
                                {mes}
                            </div>
                        )}
                    </section>

                    <aside className="import-card import-card--accent">
                        <h2 className="import-card-title">Progression</h2>
                        <div className="import-progress-grid">
                            {renderProgressCard("zip", "ZIP")}
                            {renderProgressCard("csv1", "Fichier 1")}
                            {renderProgressCard("csv2", "Fichier 2")}
                            {renderProgressCard("csv3", "Fichier 3")}
                        </div>

                        <p className="import-hint">
                            Chaque carte suit l’état réel de son import, avec les compteurs mis à jour ligne par ligne.
                        </p>
                    </aside>
                </div>
            </div>
        </div>
    );
}

export default Import;

