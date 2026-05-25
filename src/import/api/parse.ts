import Papa from "papaparse";

export const parseFile = <T>(
    file: File, // fichier CSV
    separator: string, // séparateur ";" ou ","
    expectedColumns?: (keyof any)[], // colonnes attendues
    expectedDateColumns?: string[], // colonnes contenant des dates
    expectedPositiveNumberColumns?: string[] // colonnes contenant des nombres positifs
): Promise<T[]> => {

    // Promise car Papa.parse fonctionne de manière asynchrone
    return new Promise<T[]>((resolve, reject) => {

        // Lecture du fichier CSV avec PapaParse
        Papa.parse(file, {

            // séparateur du CSV
            delimiter: separator,

            // transforme chaque ligne en objet
            // Exemple :
            // nom;prix
            // Riz;12
            //
            // devient :
            // { nom: "Riz", prix: "12" }
            header: true,

            // ignore les lignes vides
            skipEmptyLines: true,

            // appelé quand le parsing est terminé
            complete: (results) => {
                try {

                    // ===============================
                    // Récupération des noms de colonnes
                    // ===============================

                    // results.meta.fields contient les headers du CSV
                    const csvColumns = (results.meta?.fields || [])
                        .filter(Boolean) as string[];

                    // Validation des colonnes si demandé
                    if (expectedColumns && expectedColumns.length > 0) {
                        validateColumnNames(csvColumns, expectedColumns);
                    }

                    // ===============================
                    // Suppression des lignes totalement vides
                    // ===============================

                    const rows = (results.data as any[])
                        .filter(row =>
                            Object.values(row)
                                .some(v => v !== '' && v !== null && v !== undefined)
                        );

                    // ===============================
                    // Validation des dates
                    // ===============================

                    if (expectedDateColumns && expectedDateColumns.length > 0) {

                        // parcourir toutes les lignes
                        for (const row of rows) {

                            // parcourir toutes les colonnes date
                            for (const dateColumn of expectedDateColumns) {

                                // récupérer la valeur de la cellule
                                const rawValue = String(row?.[dateColumn] ?? "").trim();

                                // si la valeur existe et que le format est invalide
                                if (rawValue && !isValidCsvDate(rawValue)) {

                                    throw new Error(
                                        `Format de date différente de DD/MM/YYYY. Colonne "${dateColumn}", valeur "${rawValue}"`
                                    );
                                }
                            }
                        }
                    }

                    // ===============================
                    // Validation des nombres positifs
                    // ===============================

                    if (
                        expectedPositiveNumberColumns &&
                        expectedPositiveNumberColumns.length > 0
                    ) {

                        // parcourir toutes les lignes
                        for (const row of rows) {

                            // parcourir toutes les colonnes numériques
                            for (const numberColumn of expectedPositiveNumberColumns) {

                                // récupérer la valeur
                                const rawValue = row?.[numberColumn];

                                // vérifier si vide
                                if (
                                    rawValue === undefined ||
                                    rawValue === null ||
                                    String(rawValue).trim() === ""
                                ) {

                                    throw new Error(
                                        `Montant manquant ou invalide. Colonne "${numberColumn}"`
                                    );
                                }

                                // vérifier si nombre positif
                                if (!isPositiveCsvNumber(rawValue)) {

                                    throw new Error(
                                        `Montant positif obligatoire. Colonne "${numberColumn}", valeur "${rawValue}"`
                                    );
                                }
                            }
                        }
                    }

                    // ===============================
                    // Conversion des nombres français
                    // ===============================

                    // Exemple :
                    // "12,5" => 12.5
                    const cleanedData = rows
                        .map(row => convertFrenchNumbersInObject(row)) as T[];

                    // retourner les données propres
                    resolve(cleanedData);

                } catch (error: any) {

                    // erreur de validation
                    console.error("Erreur de validation:", error.message);

                    reject(
                        error instanceof Error
                            ? error
                            : new Error(String(error))
                    );
                }
            },

            // erreur de parsing CSV
            error: (error) => {

                console.error(
                    "Erreur lors du parsing CSV:",
                    error.message
                );

                reject(
                    new Error(
                        `Erreur lors du parsing CSV: ${error.message}`
                    )
                );
            }
        });
    });
};



// ===============================
// Vérifie les noms des colonnes
// ===============================

export function validateColumnNames(
    csvColumns: string[], // colonnes trouvées dans le CSV
    expectedColumns: (keyof any)[] // colonnes attendues
): void {

    // normaliser les colonnes du CSV
    const normalizedCsvColumns =
        csvColumns.map(normalizeColumnName);

    // normaliser les colonnes attendues
    const normalizedExpectedColumns =
        expectedColumns.map(col =>
            normalizeColumnName(String(col))
        );

    // transformer en Set pour comparaison rapide
    const csvSet = new Set(normalizedCsvColumns);
    const expectedSet = new Set(normalizedExpectedColumns);

    // ===============================
    // Vérifie colonnes manquantes
    // ===============================

    for (const expected of expectedSet) {

        if (!csvSet.has(expected)) {

            throw new Error(
                `Nom de colonne non conforme. Colonne manquante ou incorrecte: "${expected}"`
            );
        }
    }

    // ===============================
    // Vérifie colonnes supplémentaires
    // ===============================

    for (const csv of csvSet) {

        if (!expectedSet.has(csv)) {

            throw new Error(
                `Nom de colonne non conforme. Colonne non reconnue: "${csv}"`
            );
        }
    }
}



// ===============================
// Normalise les noms de colonnes
// ===============================

function normalizeColumnName(name: string): string {

    return (name || "")

        // enlève espaces début/fin
        .trim()

        // minuscule
        .toLowerCase()

        // séparation accents
        .normalize("NFD")

        // enlève accents
        .replace(/[\u0300-\u036f]/g, "")

        // espaces => underscore
        .replace(/\s+/g, "_");
}



// ===============================
// Vérifie une date DD/MM/YYYY
// ===============================

function isValidCsvDate(value: string): boolean {

    // transforme en string propre
    const trimmed = String(value ?? "").trim();

    // vérifie format DD/MM/YYYY
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
        return false;
    }

    // découpage
    const [day, month, year] =
        trimmed.split("/").map(Number);

    // création de date JS
    const date = new Date(year, month - 1, day);

    // vérifie vraie date
    return (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
    );
}



// ===============================
// Vérifie nombre positif
// ===============================

function isPositiveCsvNumber(value: unknown): boolean {

    // conversion :
    // "12,5" => 12.5
    const numericValue =
        typeof value === "number"
            ? value
            : Number(
                String(value ?? "")
                    .trim()
                    .replace(",", ".")
            );

    // vérifie nombre valide > 0
    return (
        Number.isFinite(numericValue) &&
        numericValue > 0
    );
}



// ===============================
// Convertit nombres français
// ===============================

const convertFrenchNumbersInObject = (obj: any): any => {

    // ===============================
    // Si tableau
    // ===============================

    if (Array.isArray(obj)) {

        return obj.map(item =>
            convertFrenchNumbersInObject(item)
        );
    }

    // ===============================
    // Si objet
    // ===============================

    if (obj !== null && typeof obj === 'object') {

        return Object.entries(obj).reduce(

            (acc, [key, value]) => {

                // ===============================
                // Si string
                // ===============================

                if (typeof value === 'string') {

                    // nettoie espaces
                    const trimmed = value.trim();

                    // remplace virgule par point
                    const converted =
                        trimmed.replace(',', '.');

                    // si c'est un nombre valide
                    if (
                        !isNaN(Number(converted)) &&
                        converted !== '' &&
                        converted.match(/^-?\d+\.?\d*$/)
                    ) {

                        // convertir en number
                        acc[key] = Number(converted);

                    } else {

                        // garder texte
                        acc[key] = value;
                    }

                }

                // ===============================
                // Si sous-objet
                // ===============================

                else if (typeof value === 'object') {

                    acc[key] =
                        convertFrenchNumbersInObject(value);
                }

                // ===============================
                // Sinon
                // ===============================

                else {

                    acc[key] = value;
                }

                return acc;

            },

            {} as any
        );
    }

    // retourne tel quel
    return obj;
};