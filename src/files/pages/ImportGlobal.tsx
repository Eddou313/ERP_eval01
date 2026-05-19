import { useState, type ChangeEvent, type FormEvent } from 'react';
import JSZip from 'jszip';
import './import.css';
// import { parseCSVFile, importDataToPrestashop, InitialisationGLobal } from "../api/importAPI"
import { parseCSVFile, InitialisationGLobal } from "../api/Initialisation&export"
import { importProduitCsv } from "../api/importCSV1";
import { importProduitAttributStockCsv } from "../api/importCSV2";
import { importProduitCommandeCsv } from "../api/importCSV3";
import { COMMANDE_CLIENT_PRODUIT_COLUMNS, COMMANDE_CLIENT_PRODUIT_DATE_COLUMNS, PRODUIT_ATTRIBUT_STOCK_IMPORT_COLUMNS, PRODUIT_ATTRIBUT_STOCK_POSITIVE_NUMBER_COLUMNS, PRODUIT_IMPORT_COLUMNS, PRODUIT_IMPORT_DATE_COLUMNS, PRODUIT_IMPORT_POSITIVE_NUMBER_COLUMNS, type colonneCSV } from "../api/object"
import { formatDate, transformToObjects, normalizeText } from "../../utils/helper"

import { ZipFile } from "./ZipFile"
import { SupprimerStocksEtMouvements } from '../../module/Backoffice/stock/api/Suppression';

type ImportProgress = {
    label: string;
    processed: number;
    total: number;
    imported: number;
    failed: number;
    current?: string;
    status: "idle" | "running" | "done" | "error";
};

export function ImportGlobal() {

    const [mes, setMes] = useState<string>("");
    // Produit pour le fichier
    const [file, setFile] = useState<File | null>(null);
    const [Produit, setProduit] = useState<colonneCSV["produitImport"][]>([]);

    const [file2, setFile2] = useState<File | null>(null);
    const [Produit_Attribut_Stock, setProduit_Attribut_Stock] = useState<colonneCSV["produit_Attribut_StockImport"][]>([]);

    const [file3, setFile3] = useState<File | null>(null);
    const [Commande_client_produit, setCommande_client_produit] = useState<colonneCSV["Commande_client_produit"][]>([]);
    const [zipFile, setZipFile] = useState<File | null>(null);
    const [importProgress, setImportProgress] = useState<Record<"products" | "attributes" | "orders", ImportProgress | null>>({
        products: null,
        attributes: null,
        orders: null,
    });

    // État pour les paramètres d'importation
    const [config, setConfig] = useState({
        separator: ',',
        encoding: 'UTF-8',
        skipHeader: true
    });

    const handleFile1Change = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
    };

    const handleFile2Change = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile2(e.target.files[0]);
        }
    };

    const handleFile3Change = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile3(e.target.files[0]);
        }
    };

    const handleConfigChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

        setConfig(prev => ({
            ...prev,
            [name]: val
        }));
    };

    const parseFile = <T,>(
        fileToParse: File,
        separator: string,
        expectedColumns?: (keyof any)[],
        expectedDateColumns?: string[],
        expectedPositiveNumberColumns?: string[]
    ): Promise<T[]> => {
        return parseCSVFile<T>(fileToParse, separator, expectedColumns, expectedDateColumns, expectedPositiveNumberColumns);
    };

    const updateProgress = (key: keyof typeof importProgress, patch: Partial<ImportProgress>) => {
        setImportProgress((previous) => ({
            ...previous,
            [key]: {
                label: previous[key]?.label ?? patch.label ?? "Import",
                processed: patch.processed ?? previous[key]?.processed ?? 0,
                total: patch.total ?? previous[key]?.total ?? 0,
                imported: patch.imported ?? previous[key]?.imported ?? 0,
                failed: patch.failed ?? previous[key]?.failed ?? 0,
                current: patch.current ?? previous[key]?.current,
                status: patch.status ?? previous[key]?.status ?? "idle",
            },
        }));
    };

    const resetProgress = () => {
        setImportProgress({
            products: null,
            attributes: null,
            orders: null,
        });
    };

    const normalizeImageKey = (fileName: string) => {
        const baseName = fileName.split(/[\\/]/).pop() || fileName;
        const stem = baseName.replace(/\.[^.]+$/, "");
        return normalizeText(stem);
    };

    const buildImageMapFromZip = async (file: File) => {
        const imageMap = new Map<string, { blob: Blob; fileName: string }>();
        const zip = new JSZip();
        const contents = await zip.loadAsync(file);

        const imageExtensions = new Set(["jpg", "jpeg", "png", "webp", "gif", "bmp"]);
        for (const entry of Object.values(contents.files)) {
            if (entry.dir) continue;

            const entryName = entry.name || "";
            const extension = entryName.split(".").pop()?.toLowerCase() || "";
            if (!imageExtensions.has(extension)) continue;

            const fileName = entryName.split(/[\\/]/).pop() || entryName;
            const key = normalizeImageKey(fileName);
            if (!key || imageMap.has(key)) continue;

            const blob = await entry.async("blob");
            imageMap.set(key, { blob, fileName });
        }

        return imageMap;
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!file && !file2 && !file3) {
            setMes("Inserer au moins un fichier csv valide !");
            return;
        }
        try {
            resetProgress();
            const imageMap = zipFile ? await buildImageMapFromZip(zipFile) : new Map<string, { blob: Blob; fileName: string }>();

            setMes("Validation des colonnes CSV en cours...");

            const [parsedProducts, parsedAttributes, parsedOrders] = await Promise.all([
                file ? parseFile<colonneCSV["produitImport"]>(file, config.separator, PRODUIT_IMPORT_COLUMNS as unknown as (keyof any)[], [...PRODUIT_IMPORT_DATE_COLUMNS], [...PRODUIT_IMPORT_POSITIVE_NUMBER_COLUMNS]) : Promise.resolve([]),
                file2 ? parseFile<colonneCSV["produit_Attribut_StockImport"]>(file2, config.separator, PRODUIT_ATTRIBUT_STOCK_IMPORT_COLUMNS as unknown as (keyof any)[], [], [...PRODUIT_ATTRIBUT_STOCK_POSITIVE_NUMBER_COLUMNS]) : Promise.resolve([]),
                file3 ? parseFile<colonneCSV["Commande_client_produit"]>(file3, config.separator, COMMANDE_CLIENT_PRODUIT_COLUMNS as unknown as (keyof any)[], [...COMMANDE_CLIENT_PRODUIT_DATE_COLUMNS]) : Promise.resolve([]),
            ]);

            const summaryMessages: string[] = [];

            if (file) {
                // console.log("Fichier 1 parsé:", parsedProducts);
                // setProduit(parsedProducts);
                // updateProgress("products", { label: "Produits", total: parsedProducts.length, processed: 0, imported: 0, failed: 0, status: "running", current: "Démarrage" });
                // const result = await importProduitCsv(parsedProducts, {
                    // imageMap,
                    // onProgress: (progress) => updateProgress("products", { ...progress, label: "Produits", status: progress.processed >= progress.total ? "done" : "running" }),
                // });
                // updateProgress("products", { label: "Produits", total: parsedProducts.length, processed: parsedProducts.length, imported: result.imported, failed: result.failed, status: "done", current: "Terminé" });
                // summaryMessages.push(`Produits: ${result.imported} importés, ${result.failed} en échec`);
            }
            if (file2) {
                // console.log("Fichier 2 parsé:", parsedAttributes);
                // setProduit_Attribut_Stock(parsedAttributes);
                // updateProgress("attributes", { label: "Déclinaisons", total: parsedAttributes.length, processed: 0, imported: 0, failed: 0, status: "running", current: "Démarrage" });
                // const result = await importProduitAttributStockCsv(parsedAttributes, {
                    // onProgress: (progress) => updateProgress("attributes", { ...progress, label: "Déclinaisons", status: progress.processed >= progress.total ? "done" : "running" }),
                // });
                // updateProgress("attributes", { label: "Déclinaisons", total: parsedAttributes.length, processed: parsedAttributes.length, imported: result.imported, failed: result.failed, status: "done", current: "Terminé" });
                // summaryMessages.push(`Déclinaisons: ${result.imported} importées, ${result.failed} en échec`);
        // await SupprimerStocksEtMouvements({ deleteStocks: true, deleteMovements: false });
                
            }
            if (file3) {
                console.log("Fichier 3 parsé:", parsedOrders);
                setCommande_client_produit(parsedOrders);
                updateProgress("orders", { label: "Commandes", total: parsedOrders.length, processed: 0, imported: 0, failed: 0, status: "running", current: "Démarrage" });
                const result = await importProduitCommandeCsv(parsedOrders, {
                    onProgress: (progress) => updateProgress("orders", { ...progress, label: "Commandes", status: progress.processed >= progress.total ? "done" : "running" }),
                });
                updateProgress("orders", { label: "Commandes", total: parsedOrders.length, processed: parsedOrders.length, imported: result.ordersCreated, failed: result.failed, status: "done", current: "Terminé" });
                summaryMessages.push(`Commandes: ${result.customersCreated} clients, ${result.cartsCreated} paniers, ${result.ordersCreated} commandes, ${result.failed} en échec`);
            }
            setMes(summaryMessages.length > 0 ? summaryMessages.join(" | ") : "Fichiers importés avec succès !");
            setTimeout(() => setMes(""), 3000);
        }
        catch (error) {
            console.error(error);
            const errorMsg = error instanceof Error ? error.message : "Erreur lors de l'import des données !";
            setMes(errorMsg);
            window.alert(errorMsg);
        }
    };

    const renderProgressCard = (progress: ImportProgress | null) => {
        if (!progress) return null;

        const percent = progress.total > 0 ? Math.min(100, Math.round((progress.processed / progress.total) * 100)) : 0;
        return (
            <div style={{ border: '1px solid #d0d7de', borderRadius: '12px', padding: '0.9rem 1rem', background: '#fff', marginTop: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.4rem' }}>
                    <strong>{progress.label}</strong>
                    <span>{percent}%</span>
                </div>
                <div style={{ height: '10px', background: '#edf2f7', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ width: `${percent}%`, height: '100%', background: progress.status === 'error' ? '#e11d48' : progress.status === 'done' ? '#16a34a' : '#2563eb', transition: 'width 180ms linear' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginTop: '0.45rem', fontSize: '0.9rem', color: '#475569' }}>
                    <span>{progress.processed}/{progress.total} lignes</span>
                    <span>{progress.imported} importées, {progress.failed} en échec</span>
                </div>
                {progress.current && <div style={{ marginTop: '0.3rem', fontSize: '0.85rem', color: '#64748b' }}>{progress.current}</div>}
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
        <div className="import-page-wrapper">
            <h1>Import Global</h1>
            {mes && <div className="message" style={{ color: mes.includes('Erreur') ? 'red' : 'green', marginBottom: '1rem' }}>{mes}</div>}
            <button onClick={InitialiserAllDonner} className="submit-button">Initialiser les donner +</button>
            <section className="import-section" style={{ marginTop: '1rem' }}>
                <h2 className="section-title"></h2>
                {renderProgressCard(importProgress.products)}
                {renderProgressCard(importProgress.attributes)}
                {renderProgressCard(importProgress.orders)}
            </section>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>

                {/* Section 1 : Chargement du fichier */}
                <section className="import-section">
                    <h2 className="section-title">1. Fichier Source</h2>
                    <div className="form-group">
                        <label className="form-label" htmlFor="csv-file1">Fichier 1 (Produits)</label>
                        <input
                            id="csv-file1"
                            type="file"
                            accept=".csv"
                            onChange={handleFile1Change}
                            className="file-input"
                        />
                        {file && <span style={{ fontSize: '0.9em', color: 'green' }}>✓ {file.name}</span>}
                        <br />

                        <label className="form-label" htmlFor="csv-file2">Fichier 2 (Produits - Attributs et Stock)</label>
                        <input
                            id="csv-file2"
                            type="file"
                            accept=".csv"
                            onChange={handleFile2Change}
                            className="file-input"
                        />
                        {file2 && <span style={{ fontSize: '0.9em', color: 'green' }}>✓ {file2.name}</span>}
                        <br />

                        <label className="form-label" htmlFor="csv-file3">Fichier 3 (Commandes et Clients)</label>
                        <input
                            id="csv-file3"
                            type="file"
                            accept=".csv"
                            onChange={handleFile3Change}
                            className="file-input"
                        />
                        <br />
                        {file3 && <span style={{ fontSize: '0.9em', color: 'green' }}>✓ {file3.name}</span>}
                        <label className="form-label" >Fichier 4 (Image)</label>
                        <ZipFile onZipSelected={setZipFile} />
                    </div>
                </section>

                {/* Section 2 : Paramètres de l'import */}
                <section className="import-section" style={{ marginTop: '1rem' }}>
                    <h2 className="section-title">2. Paramètres de Configuration</h2>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label className="form-label">Séparateur de colonnes</label>
                            <select name="separator" onChange={handleConfigChange} id="">
                                <option value=",">,</option>
                                <option value=";">;</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Encodage</label>
                            <select
                                name="encoding"
                                className="text-input"
                                value={config.encoding}
                                onChange={handleConfigChange}
                            >
                                <option value="UTF-8">UTF-8</option>
                                <option value="ISO-8859-1">ISO-8859-1 (Windows)</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <input
                            name="skipHeader"
                            type="checkbox"
                            id="skipHeader"
                            checked={config.skipHeader}
                            onChange={handleConfigChange}
                        />
                        <label htmlFor="skipHeader" className="form-label">Ignorer la première ligne (En-têtes)</label>
                    </div>
                </section>

                <button type="submit" className="submit-button" disabled={!file && !file2 && !file3} style={{ marginTop: '1rem' }}>
                    Démarrer l'importation
                </button>

                {(Produit.length > 0 || Produit_Attribut_Stock.length > 0 || Commande_client_produit.length > 0) && (
                    <div style={{ marginTop: '2rem' }}>
                        <h2>Aperçu des données importées</h2>

                        {Produit.length > 0 && (
                            <section style={{ marginBottom: '2rem' }}>
                                <h3>📦 Fichier 1 - Produits ({Produit.length} lignes)</h3>
                                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#f0f0f0' }}>
                                            <th style={{ border: '1px solid #ccc', padding: '0.5rem' }}>date_availability_produit</th>
                                            <th style={{ border: '1px solid #ccc', padding: '0.5rem' }}>Nom</th>
                                            <th style={{ border: '1px solid #ccc', padding: '0.5rem' }}>Référence</th>
                                            <th style={{ border: '1px solid #ccc', padding: '0.5rem' }}>Catégorie</th>
                                            <th style={{ border: '1px solid #ccc', padding: '0.5rem' }}>Prix TTC</th>
                                            <th style={{ border: '1px solid #ccc', padding: '0.5rem' }}>Prix Achat</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Produit.map((item, index) => (
                                            <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                                                <td style={{ border: '1px solid #ccc', padding: '0.5rem' }}>{formatDate(item.date_availability_produit)}</td>
                                                <td style={{ border: '1px solid #ccc', padding: '0.5rem' }}>{item.nom}</td>
                                                <td style={{ border: '1px solid #ccc', padding: '0.5rem' }}>{item.reference}</td>
                                                <td style={{ border: '1px solid #ccc', padding: '0.5rem' }}>{item.categorie}</td>
                                                <td style={{ border: '1px solid #ccc', padding: '0.5rem' }}>{item.prix_ttc}</td>
                                                <td style={{ border: '1px solid #ccc', padding: '0.5rem' }}>{item.prix_achat}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </section>
                        )}

                        {Produit_Attribut_Stock.length > 0 && (
                            <section style={{ marginBottom: '2rem' }}>
                                <h3>📊 Fichier 2 - Produits Attributs & Stock ({Produit_Attribut_Stock.length} lignes)</h3>
                                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#f0f0f0' }}>
                                            <th style={{ border: '1px solid #ccc', padding: '0.5rem' }}>Référence</th>
                                            <th style={{ border: '1px solid #ccc', padding: '0.5rem' }}>Spécificité</th>
                                            <th style={{ border: '1px solid #ccc', padding: '0.5rem' }}>Variante</th>
                                            <th style={{ border: '1px solid #ccc', padding: '0.5rem' }}>Stock Initial</th>
                                            <th style={{ border: '1px solid #ccc', padding: '0.5rem' }}>Prix Vente TTC</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Produit_Attribut_Stock.map((item, index) => (
                                            <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                                                <td style={{ border: '1px solid #ccc', padding: '0.5rem' }}>{item.reference}</td>
                                                <td style={{ border: '1px solid #ccc', padding: '0.5rem' }}>{item.specificité || '-'}</td>
                                                <td style={{ border: '1px solid #ccc', padding: '0.5rem' }}>{item.karazany || '-'}</td>
                                                <td style={{ border: '1px solid #ccc', padding: '0.5rem' }}>{item.stock_initial}</td>
                                                <td style={{ border: '1px solid #ccc', padding: '0.5rem' }}>{item.prix_vente_ttc || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </section>
                        )}

                        {Commande_client_produit.length > 0 && (
                            <section>
                                <h3>🛒 Fichier 3 - Commandes & Clients ({Commande_client_produit.length} lignes)</h3>
                                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#f0f0f0' }}>
                                            <th style={{ border: '1px solid #ccc', padding: '0.5rem' }}>Nom</th>
                                            <th style={{ border: '1px solid #ccc', padding: '0.5rem' }}>Email</th>
                                            <th style={{ border: '1px solid #ccc', padding: '0.5rem' }}>Adresse</th>
                                            <th style={{ border: '1px solid #ccc', padding: '0.5rem' }}>Achat</th>
                                            <th style={{ border: '1px solid #ccc', padding: '0.5rem' }}>État</th>
                                            <th style={{ border: '1px solid #ccc', padding: '0.5rem' }}>pwd</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Commande_client_produit.map((item, index) => (
                                            <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                                                <td style={{ border: '1px solid #ccc', padding: '0.5rem' }}>{item.nom}</td>
                                                <td style={{ border: '1px solid #ccc', padding: '0.5rem' }}>{item.email}</td>
                                                <td style={{ border: '1px solid #ccc', padding: '0.5rem' }}>{item.adresse}</td>
                                                <td style={{ border: '1px solid #ccc', padding: '0.5rem' }}>
                                                    {transformToObjects(item.achat).map((prod, index) => (
                                                        <div key={index} style={{ fontSize: '0.85rem', marginBottom: '4px' }}>
                                                            <strong>{prod.reference_produit}</strong> {prod.quantity} <small>{prod.attribut}</small>
                                                        </div>
                                                    ))}
                                                </td>
                                                <td style={{ border: '1px solid #ccc', padding: '0.5rem' }}>{item.etat || "dans le panier"}</td>
                                                <td style={{ border: '1px solid #ccc', padding: '0.5rem' }}>{item.pwd}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </section>
                        )}
                    </div>
                )}

            </form>
        </div>
    );
}


export default ImportGlobal;