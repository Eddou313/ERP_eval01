import { InitAttributesAndCharacteristics } from "../../module/Backoffice/attribue&Caracteristique/api/attributsCaracteristiquesApi";
import { InitCategory } from "../../module/Backoffice/categorie/api/categoriesApi";
import { InitAdresse } from "../../module/Backoffice/client/api/clientAdresAPI";
import { initClients } from "../../module/Backoffice/client/api/clientApi";
import { InitOrder } from "../../module/Backoffice/commande/api/commandesApi";
import { initPanier } from "../../module/Backoffice/panier/api/panierApi";
import { InitProductImages, InitProducts } from "../../module/Backoffice/produit/api/productsApi";
import { InitTaxes } from "../../module/Backoffice/taxes/taxes";
import Papa from 'papaparse';
import { SupprimerStocksEtMouvements } from "../../module/Backoffice/stock/api/Suppression";

/**
 * Normalise un nom de colonne: enlève les accents et espaces superflus
 */
function normalizeColumnName(name: string): string {
  return (name || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Enlève les accents
    .replace(/\s+/g, "_"); // Remplace espaces par underscore
}

function isValidCsvDate(value: string): boolean {
  const trimmed = String(value ?? "").trim();
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    return false;
  }

  const [day, month, year] = trimmed.split("/").map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function isPositiveCsvNumber(value: unknown): boolean {
  const numericValue = typeof value === "number" ? value : Number(String(value ?? "").trim().replace(",", "."));
  return Number.isFinite(numericValue) && numericValue > 0;
}

/**
 * Valide que les colonnes du CSV correspondent aux colonnes attendues
 * @throws Error si les colonnes ne correspondent pas
 */
export function validateColumnNames(
  csvColumns: string[],
  expectedColumns: (keyof any)[]
): void {
  const normalizedCsvColumns = csvColumns.map(normalizeColumnName);
  const normalizedExpectedColumns = expectedColumns.map(col => normalizeColumnName(String(col)));
  const csvSet = new Set(normalizedCsvColumns);
  const expectedSet = new Set(normalizedExpectedColumns);

  // Vérifier que toutes les colonnes attendues sont présentes
  for (const expected of expectedSet) {
    if (!csvSet.has(expected)) {
      throw new Error(
        `Nom de colonne non conforme. Colonne manquante ou incorrecte: "${expected}"`
      );
    }
  }

  // Vérifier qu'il n'y a pas de colonnes supplémentaires non attendues
  for (const csv of csvSet) {
    if (!expectedSet.has(csv)) {
      throw new Error(
        `Nom de colonne non conforme. Colonne non reconnue: "${csv}"`
      );
    }
  }
}
/**
 * @param file Le fichier récupéré depuis l'input
 * @param separator Le caractère délimiteur (ex: , ou ;)
 * @param onComplete Callback appelé avec les données castées dans le bon type
 */
// Convertir les nombres français (virgule) en nombres JavaScript (point)
const convertFrenchNumbersInObject = (obj: any): any => {
    if (Array.isArray(obj)) {
        return obj.map(item => convertFrenchNumbersInObject(item));
    }
    if (obj !== null && typeof obj === 'object') {
        return Object.entries(obj).reduce((acc, [key, value]) => {
            if (typeof value === 'string') {
                // Convertir "12,5" en 12.5 si c'est un nombre
                const trimmed = value.trim();
                const converted = trimmed.replace(',', '.');
                // Vérifier si c'est un nombre valide
                if (!isNaN(Number(converted)) && converted !== '' && converted.match(/^-?\d+\.?\d*$/)) {
                    acc[key] = Number(converted);
                } else {
                    acc[key] = value;
                }
            } else if (typeof value === 'object') {
                acc[key] = convertFrenchNumbersInObject(value);
            } else {
                acc[key] = value;
            }
            return acc;
        }, {} as any);
    }
    return obj;
};

export const parseCSVFile = <T>(
    file: File, 
    separator: string, 
    expectedColumns?: (keyof any)[],
  expectedDateColumns?: string[],
  expectedPositiveNumberColumns?: string[]
): Promise<T[]> => {
  return new Promise<T[]>((resolve, reject) => {
    Papa.parse(file, {
      delimiter: separator,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          console.log("Données CSV brutes:", results.data);

          const csvColumns = (results.meta?.fields || []).filter(Boolean) as string[];
          if (expectedColumns && expectedColumns.length > 0) {
            validateColumnNames(csvColumns, expectedColumns);
          }

          const rows = (results.data as any[])
            .filter(row => Object.values(row).some(v => v !== '' && v !== null && v !== undefined));

          if (expectedDateColumns && expectedDateColumns.length > 0) {
            for (const row of rows) {
              for (const dateColumn of expectedDateColumns) {
                const rawValue = String(row?.[dateColumn] ?? "").trim();
                if (rawValue && !isValidCsvDate(rawValue)) {
                  throw new Error(
                    `Format de date différente de DD/MM/YYYY. Colonne "${dateColumn}", valeur "${rawValue}"`
                  );
                }
              }
            }
          }

          if (expectedPositiveNumberColumns && expectedPositiveNumberColumns.length > 0) {
            for (const row of rows) {
              for (const numberColumn of expectedPositiveNumberColumns) {
                const rawValue = row?.[numberColumn];
                if (rawValue === undefined || rawValue === null || String(rawValue).trim() === "") {
                  throw new Error(
                    `Montant manquant ou invalide. Colonne "${numberColumn}"`
                  );
                }

                if (!isPositiveCsvNumber(rawValue)) {
                  throw new Error(
                    `Montant positif obligatoire. Colonne "${numberColumn}", valeur "${rawValue}"`
                  );
                }
              }
            }
          }

          const cleanedData = rows
            .map(row => convertFrenchNumbersInObject(row)) as T[];
          console.log("Données nettoyées et converties:", cleanedData);
          resolve(cleanedData);
        } catch (error: any) {
          console.error("Erreur de validation:", error.message);
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      },
      error: (error) => {
        console.error("Erreur lors du parsing CSV:", error.message);
        reject(new Error(`Erreur lors du parsing CSV: ${error.message}`));
      }
    });
  });
};

// Initialiser toutes les données globales
export async function InitialisationGLobal(): Promise<void> {
  try {
    console.log("Initialisation globale en cours...");
        console.log("Suppression des commandes...");
        await InitOrder();

        console.log("Suppression des paniers...");
        await initPanier();

        console.log("Suppression des adresses...");
        await InitAdresse();

        console.log("Suppression des clients...");
        await initClients();

        console.log("Suppression des valeurs d'attributs...");
        await InitAttributesAndCharacteristics();

        console.log("Suppression des images produits...");
        await InitProductImages();

        console.log("Suppression des produits...");
        await InitProducts();

        console.log("Suppression des catégories...");
        await InitCategory();

        console.log("Suppression des taxes...");
        await InitTaxes();

        console.log("Suppression des stocks et mouvements de stock...");
        // await SupprimerStocksEtMouvements({ deleteStocks: true, deleteMovements: true });

        console.log("Initialisation globale réussie !");
  } catch (error: any) {
    console.error("Erreur lors de l'initialisation globale:", error);
    throw new Error(`Erreur lors de l'initialisation global: ${error?.message ?? String(error)}`);
  }
}
