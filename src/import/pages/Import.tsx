import { useState, type FormEvent } from "react";
import { buildImageMapFromZip } from "../api/zip";
import type { colonneCSV } from "../api/colonne";
import { COMMANDE_CLIENT_PRODUIT_COLUMNS, COMMANDE_CLIENT_PRODUIT_DATE_COLUMNS, PRODUIT_ATTRIBUT_STOCK_IMPORT_COLUMNS, PRODUIT_ATTRIBUT_STOCK_POSITIVE_NUMBER_COLUMNS, PRODUIT_IMPORT_COLUMNS, PRODUIT_IMPORT_DATE_COLUMNS, PRODUIT_IMPORT_POSITIVE_NUMBER_COLUMNS } from "../api/colonne";
import { parseFile } from "../api/parse";
import { importProduitCsv } from "../api/importCSV1";
import { importCsv2ToPrestashop } from "../api/importCSV2";
import { importProduitCommandeCsv } from "../api/importCSV3";
export function Import() {

    const [config, setConfig] = useState({
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

    const Importer = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setMes("");

        if (!csv1 && !csv2 && !csv3) {
            setMes("Inserer au moins un fichier csv valide !");
            return;
        }

        try {
            let imageProduit;
            let mes = "";
            if (ver) {
                imageProduit = zipFile ? await buildImageMapFromZip(zipFile) : new Map<string, { blob: Blob; fileName: string }>();
                mes = `Traitement terminé. ${imageProduit.size} images trouvées dans le ZIP.`;
            }

            setMes(mes);
            const [parsedProducts, parsedAttributes, parsedOrders] = await Promise.all([
                csv1 ? parseFile<colonneCSV["produitImport"]>(csv1, config.separator, PRODUIT_IMPORT_COLUMNS as unknown as (keyof any)[], [...PRODUIT_IMPORT_DATE_COLUMNS], [...PRODUIT_IMPORT_POSITIVE_NUMBER_COLUMNS]) : Promise.resolve([]),
                csv2 ? parseFile<colonneCSV["produit_Attribut_StockImport"]>(csv2, config.separator, PRODUIT_ATTRIBUT_STOCK_IMPORT_COLUMNS as unknown as (keyof any)[], [], [...PRODUIT_ATTRIBUT_STOCK_POSITIVE_NUMBER_COLUMNS]) : Promise.resolve([]),
                csv3 ? parseFile<colonneCSV["Commande_client_produit"]>(csv3, config.separator, COMMANDE_CLIENT_PRODUIT_COLUMNS as unknown as (keyof any)[], [...COMMANDE_CLIENT_PRODUIT_DATE_COLUMNS], []) : Promise.resolve([]),
            ]);

            if (csv1) {
                console.log("Produit import :", parsedProducts);
                setMes(`Imporattion du fichier csv 1`);
                await importProduitCsv(parsedProducts,imageProduit);
            }

            if (csv2) {
                console.log("Attribut stock import :", parsedAttributes);
                setMes(`Imporattion du fichier csv 2`);
                await importCsv2ToPrestashop(parsedAttributes);
            }

            if (csv3) {
                console.log("Commande client produit import :", parsedOrders);
                await importProduitCommandeCsv(parsedOrders);
            }

        } catch (error: any) {
            setMes(`Erreur : ${error.message}`);
            console.error("Erreur lors de l'importation :", error);
        }
    };

    return (
        <div className="flex flex-col gap-4 p-4">
            <form onSubmit={Importer}>
                <h1 className="text-xl font-bold">Import</h1>

                <div>
                    <label htmlFor="file1">File 1 :</label>
                    <input
                        type="file"
                        id="file1"
                        name="file1"
                        className="border p-2 rounded w-full"
                        onChange={(e) =>
                            setCSV1(e.target.files?.[0] || null)
                        }
                    />
                </div>

                <br />

                <div>
                    <label htmlFor="file2">File 2 :</label>
                    <input
                        type="file"
                        id="file2"
                        name="file2"
                        className="border p-2 rounded w-full"
                        onChange={(e) =>
                            setCSV2(e.target.files?.[0] || null)
                        }
                    />
                </div>

                <br />

                <div>
                    <label htmlFor="file3">File 3 :</label>
                    <input
                        type="file"
                        id="file3"
                        name="file3"
                        className="border p-2 rounded w-full"
                        onChange={(e) =>
                            setCSV3(e.target.files?.[0] || null)
                        }
                    />
                </div>

                <br />

                <div>
                    <label htmlFor="zip1">ZIP 1 :</label>
                    <input
                        type="file"
                        id="zip1"
                        name="zip1"
                        accept=".zip"
                        className="border p-2 rounded w-full"
                        onChange={(e) =>
                            setZIP1(e.target.files?.[0] || null)
                        }
                    />
                </div>

                <br />

                <div>
                    <label htmlFor="checkBox">
                        Importer les images
                    </label>{" "}
                    <input
                        type="checkbox"
                        id="checkBox"
                        checked={ver}
                        onChange={(e) => setVer(e.target.checked)}
                    />
                </div>

                <br />

                <div>
                    <input
                        type="submit"
                        value="Importer"
                        className="border rounded p-2 cursor-pointer"
                    />
                </div>
            </form>

            {/* Affiche seulement si mes existe */}
            {mes && (
                <div className="border border-red-500 bg-red-100 text-red-700 p-3 rounded">
                    {mes}
                </div>
            )}
        </div>
    );
}

export default Import;

